-- ==============================================================================
-- SCENTÉ — Migration 023: Phase 1 Security Hardening & Vulnerability Remediation
-- 
-- Fixes applied:
-- 1. PROMO PHONE NORMALIZATION:
--    - Enforces digit normalization (last 9 digits matching) in per-customer promo
--      code usage checks in create_cod_order and validate_promo_code.
--    - Prevents single-use voucher reuse via phone spacing/formatting variations.
-- 2. REMOVE PUBLIC PROMO ENUMERATION:
--    - Drops public SELECT RLS policy on public.promo_codes.
--    - Restricts direct table access to administrators only.
--    - Customer validation is mediated strictly through validate_promo_code RPC.
-- 3. CUSTOM BUILDER GROUP VALIDATION CONSISTENCY:
--    - Validates all submitted groups in custom_configuration against active builder groups.
--    - Rejects any rogue or unrecognized customization groups.
--    - Single-pass authoritative item pricing guarantees orders.subtotal matches
--      the sum of order_items.line_total without discrepancy.
-- 4. RESTORE DUPLICATE VARIANT ID GUARD:
--    - Re-introduces array guard in create_cod_order rejecting duplicate variant_id
--      entries within the order items payload.
-- 5. WEBHOOK & EDGE FUNCTION HARDENING:
--    - Hardens send_order_email_on_insert trigger function to dynamically pass
--      server-side webhook authentication secrets if configured in DB settings or Vault.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. REVOKE PUBLIC PROMO CODE ENUMERATION (RLS)
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public can view active promo codes" ON public.promo_codes;

-- Ensure administrator access policy is intact
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'promo_codes'
          AND policyname = 'Admins can do all on promo_codes'
    ) THEN
        CREATE POLICY "Admins can do all on promo_codes"
            ON public.promo_codes
            FOR ALL
            TO authenticated
            USING (public.is_admin())
            WITH CHECK (public.is_admin());
    END IF;
END $$;


-- ------------------------------------------------------------------------------
-- 2. HARDEN VALIDATE_PROMO_CODE RPC (PHONE NORMALIZATION)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.validate_promo_code(
    p_code TEXT,
    p_subtotal NUMERIC,
    p_customer_phone TEXT DEFAULT NULL,
    p_customer_email TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_clean_code TEXT;
    v_promo RECORD;
    v_customer_usage INTEGER := 0;
    v_discount NUMERIC := 0;
    v_final_total NUMERIC := 0;
    v_clean_phone TEXT;
BEGIN
    -- 1. Normalize code
    v_clean_code := UPPER(TRIM(COALESCE(p_code, '')));
    IF v_clean_code = '' THEN
        RETURN jsonb_build_object(
            'valid', false,
            'message', 'Please enter a promo code.'
        );
    END IF;

    -- 2. Query promo code
    SELECT * INTO v_promo
    FROM public.promo_codes
    WHERE UPPER(code) = v_clean_code;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'valid', false,
            'message', 'Invalid promo code. Please check and try again.'
        );
    END IF;

    -- 3. Check active status
    IF NOT v_promo.is_active THEN
        RETURN jsonb_build_object(
            'valid', false,
            'message', 'This promo code is currently inactive.'
        );
    END IF;

    -- 4. Check schedule & expiry dates
    IF v_promo.start_date IS NOT NULL AND NOW() < v_promo.start_date THEN
        RETURN jsonb_build_object(
            'valid', false,
            'message', 'This promotional offer has not started yet.'
        );
    END IF;

    IF v_promo.expiry_date IS NOT NULL AND NOW() > v_promo.expiry_date THEN
        RETURN jsonb_build_object(
            'valid', false,
            'message', 'This promo code has expired.'
        );
    END IF;

    -- 5. Check minimum order subtotal requirement
    IF v_promo.min_order_amount IS NOT NULL AND p_subtotal < v_promo.min_order_amount THEN
        RETURN jsonb_build_object(
            'valid', false,
            'message', FORMAT('This code requires a minimum order value of PKR %s.', TO_CHAR(v_promo.min_order_amount, 'FM999,999,999'))
        );
    END IF;

    -- 6. Check total usage limit
    IF v_promo.total_usage_limit IS NOT NULL AND v_promo.total_usage_limit > 0 THEN
        IF v_promo.usage_count >= v_promo.total_usage_limit THEN
            RETURN jsonb_build_object(
                'valid', false,
                'message', 'This promo code has reached its maximum usage limit.'
            );
        END IF;
    END IF;

    -- 7. Check per-customer usage limit with phone normalization
    IF v_promo.per_customer_limit IS NOT NULL AND v_promo.per_customer_limit > 0 THEN
        v_clean_phone := REGEXP_REPLACE(COALESCE(p_customer_phone, ''), '[^0-9]', '', 'g');

        IF LENGTH(v_clean_phone) >= 9 OR NULLIF(TRIM(COALESCE(p_customer_email, '')), '') IS NOT NULL THEN
            SELECT COUNT(*) INTO v_customer_usage
            FROM public.orders
            WHERE promo_code = v_promo.code
              AND status != 'cancelled'
              AND (
                  (
                      LENGTH(v_clean_phone) >= 9
                      AND (
                          REGEXP_REPLACE(customer_phone, '[^0-9]', '', 'g') = v_clean_phone
                          OR RIGHT(REGEXP_REPLACE(customer_phone, '[^0-9]', '', 'g'), 9) = RIGHT(v_clean_phone, 9)
                      )
                  )
                  OR (
                      p_customer_email IS NOT NULL
                      AND TRIM(p_customer_email) != ''
                      AND customer_email ILIKE TRIM(p_customer_email)
                  )
              );

            IF v_customer_usage >= v_promo.per_customer_limit THEN
                RETURN jsonb_build_object(
                    'valid', false,
                    'message', 'You have already utilized this promo code the maximum allowed times.'
                );
            END IF;
        END IF;
    END IF;

    -- 8. Compute discount amount
    IF v_promo.discount_type = 'percentage' THEN
        v_discount := ROUND((p_subtotal * v_promo.discount_value) / 100.0);
        IF v_promo.max_discount_amount IS NOT NULL AND v_promo.max_discount_amount > 0 THEN
            v_discount := LEAST(v_discount, v_promo.max_discount_amount);
        END IF;
    ELSIF v_promo.discount_type = 'fixed' THEN
        v_discount := LEAST(v_promo.discount_value, p_subtotal);
    END IF;

    -- Guard against negative payable amounts
    v_discount := GREATEST(0, LEAST(v_discount, p_subtotal));
    v_final_total := GREATEST(0, p_subtotal - v_discount);

    RETURN jsonb_build_object(
        'valid', true,
        'code', v_promo.code,
        'discount_type', v_promo.discount_type,
        'discount_value', v_promo.discount_value,
        'discount_amount', v_discount,
        'subtotal', p_subtotal,
        'final_total', v_final_total,
        'message', 'Promo code applied successfully.'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.validate_promo_code(TEXT, NUMERIC, TEXT, TEXT) TO anon, authenticated;


-- ------------------------------------------------------------------------------
-- 3. HARDEN CREATE_COD_ORDER RPC (PHASE 1 CONSOLIDATION)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_cod_order(
    p_customer_full_name TEXT,
    p_customer_phone TEXT,
    p_customer_email TEXT,
    p_shipping_address TEXT,
    p_city TEXT,
    p_province TEXT,
    p_postal_code TEXT,
    p_items JSONB, -- Array of items (standard catalog products or custom perfumes)
    p_promo_code TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_order_id UUID;
    v_reference TEXT;
    v_item JSONB;
    v_val_item JSONB;
    v_is_custom BOOLEAN;
    v_variant RECORD;
    v_product RECORD;
    v_variant_id UUID;
    v_builder_settings RECORD;
    v_qty INTEGER;
    v_unit_price INTEGER;
    v_line_total INTEGER;
    v_subtotal INTEGER := 0;
    v_delivery_fee INTEGER := 0;
    v_discount_amount INTEGER := 0;
    v_total INTEGER := 0;
    v_order_record RECORD;

    -- Promo validation records & placeholders
    v_promo RECORD;
    v_clean_promo TEXT;
    v_clean_phone TEXT;
    v_customer_usage INTEGER := 0;
    v_raw_discount NUMERIC := 0;
    v_applied_promo_code TEXT := NULL;
    v_applied_discount_type TEXT := NULL;
    v_applied_discount_value NUMERIC := NULL;

    -- Custom Builder validation variables
    v_custom_config JSONB;
    v_grp_elem JSONB;
    v_group RECORD;
    v_option RECORD;
    v_selected_opt_id_text TEXT;
    v_selected_opt_uuid UUID;
    v_group_sel_count INTEGER;
    v_option_adjustments_sum INTEGER;
    v_server_custom_unit_price INTEGER;
    v_stored_custom_config JSONB;
    v_validated_groups_json JSONB;
    v_group_selected_opts_json JSONB;
    v_formatted_price TEXT;

    -- Single-pass authoritative validated items accumulator
    v_validated_items JSONB := '[]'::jsonb;
BEGIN
    -- 1. Input Validation
    IF COALESCE(TRIM(p_customer_full_name), '') = '' THEN
        RAISE EXCEPTION 'Recipient name is required';
    END IF;

    IF COALESCE(TRIM(p_customer_phone), '') = '' THEN
        RAISE EXCEPTION 'Phone number is required';
    END IF;

    IF COALESCE(TRIM(p_shipping_address), '') = '' THEN
        RAISE EXCEPTION 'Shipping address is required';
    END IF;

    IF COALESCE(TRIM(p_city), '') = '' THEN
        RAISE EXCEPTION 'City is required';
    END IF;

    IF p_items IS NULL OR jsonb_typeof(p_items) != 'array' THEN
        RAISE EXCEPTION 'p_items must be a valid JSON array of order items';
    END IF;

    IF jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'Order must contain at least one item';
    END IF;

    -- Security Guard: Reject duplicate variant IDs for standard catalog items
    IF EXISTS (
        SELECT (elem->>'variant_id')
        FROM jsonb_array_elements(p_items) elem
        WHERE COALESCE((elem->>'is_custom')::BOOLEAN, false) = false
          AND (elem->>'variant_id') IS NOT NULL
          AND TRIM(elem->>'variant_id') != ''
        GROUP BY (elem->>'variant_id')
        HAVING COUNT(*) > 1
    ) THEN
        RAISE EXCEPTION 'Duplicate variant IDs are not allowed in order items';
    END IF;

    -- 2. Authoritative Single-Pass Item Validation & Subtotal Calculation
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_qty := (v_item->>'quantity')::INTEGER;
        IF v_qty IS NULL OR v_qty <= 0 THEN
            RAISE EXCEPTION 'Item quantity must be greater than zero';
        END IF;

        IF v_qty > 100 THEN
            RAISE EXCEPTION 'Item quantity exceeds maximum allowable threshold';
        END IF;

        v_is_custom := COALESCE((v_item->>'is_custom')::BOOLEAN, false);

        IF v_is_custom THEN
            -- A. Verify Builder Active Status
            SELECT * INTO v_builder_settings
            FROM public.custom_builder_settings
            WHERE id = 'primary_builder_settings';

            IF NOT FOUND OR NOT v_builder_settings.is_active THEN
                RAISE EXCEPTION 'The Custom Perfume Builder is currently inactive. Please review your bag.';
            END IF;

            v_custom_config := v_item->'custom_configuration';
            IF v_custom_config IS NULL OR jsonb_typeof(v_custom_config) != 'object' THEN
                RAISE EXCEPTION 'Custom perfume configuration is missing or malformed.';
            END IF;

            IF v_custom_config->'groups' IS NULL OR jsonb_typeof(v_custom_config->'groups') != 'array' THEN
                RAISE EXCEPTION 'Custom perfume configuration groups must be a valid array.';
            END IF;

            -- B. Strict Group Existence & Active Status Verification (Anti-Rogue Group Guard)
            FOR v_grp_elem IN SELECT * FROM jsonb_array_elements(v_custom_config->'groups')
            LOOP
                SELECT * INTO v_group
                FROM public.custom_builder_groups
                WHERE (
                    (v_grp_elem->>'group_id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' AND id = (v_grp_elem->>'group_id')::UUID)
                    OR (slug = TRIM(COALESCE(v_grp_elem->>'group_slug', '')))
                );

                IF NOT FOUND OR v_group IS NULL THEN
                    RAISE EXCEPTION 'Custom fragrance configuration contains an unrecognized customization group.';
                END IF;

                IF NOT v_group.is_active THEN
                    RAISE EXCEPTION 'Customization group "%" is currently inactive.', v_group.name;
                END IF;
            END LOOP;

            -- Check for duplicate submitted groups
            IF EXISTS (
                SELECT (grp_elem->>'group_id')
                FROM jsonb_array_elements(v_custom_config->'groups') grp_elem
                WHERE grp_elem->>'group_id' IS NOT NULL AND TRIM(grp_elem->>'group_id') != ''
                GROUP BY (grp_elem->>'group_id')
                HAVING COUNT(*) > 1
            ) THEN
                RAISE EXCEPTION 'Duplicate customization group detected in custom perfume configuration.';
            END IF;

            -- C. Validate options against all active database groups
            v_option_adjustments_sum := 0;
            v_validated_groups_json := '[]'::jsonb;

            FOR v_group IN
                SELECT * FROM public.custom_builder_groups
                WHERE is_active = true
                ORDER BY sort_order ASC
            LOOP
                v_group_sel_count := 0;
                v_group_selected_opts_json := '[]'::jsonb;

                FOR v_selected_opt_id_text IN
                    SELECT DISTINCT opt_elem->>'id'
                    FROM jsonb_array_elements(COALESCE(v_custom_config->'groups', '[]'::jsonb)) grp_elem,
                         jsonb_array_elements(COALESCE(grp_elem->'selected_options', '[]'::jsonb)) opt_elem
                    WHERE (grp_elem->>'group_id' = v_group.id::TEXT OR grp_elem->>'group_slug' = v_group.slug)
                      AND opt_elem->>'id' IS NOT NULL
                LOOP
                    -- Verify UUID syntax
                    IF v_selected_opt_id_text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
                        RAISE EXCEPTION 'Invalid option identifier format for group "%"', v_group.name;
                    END IF;

                    v_selected_opt_uuid := v_selected_opt_id_text::UUID;

                    -- Query option from database
                    SELECT * INTO v_option
                    FROM public.custom_builder_options
                    WHERE id = v_selected_opt_uuid;

                    IF NOT FOUND THEN
                        RAISE EXCEPTION 'Option does not exist for group "%"', v_group.name;
                    END IF;

                    IF NOT v_option.is_active THEN
                        RAISE EXCEPTION 'Option "%" is currently unavailable', v_option.name;
                    END IF;

                    IF v_option.group_id != v_group.id THEN
                        RAISE EXCEPTION 'Option "%" does not belong to group "%"', v_option.name, v_group.name;
                    END IF;

                    v_group_sel_count := v_group_sel_count + 1;
                    v_option_adjustments_sum := v_option_adjustments_sum + GREATEST(0, v_option.price_adjustment);

                    v_group_selected_opts_json := v_group_selected_opts_json || jsonb_build_array(
                        jsonb_build_object(
                            'id', v_option.id,
                            'name', v_option.name,
                            'slug', v_option.slug,
                            'category', v_option.category,
                            'price_adjustment', v_option.price_adjustment
                        )
                    );
                END LOOP;

                -- Enforce group constraints
                IF v_group.is_required AND v_group_sel_count = 0 THEN
                    RAISE EXCEPTION 'Please make a selection for "%"', v_group.name;
                END IF;

                IF v_group_sel_count > 0 AND v_group_sel_count < v_group.min_selections THEN
                    RAISE EXCEPTION 'Please select at least % option(s) for "%"', v_group.min_selections, v_group.name;
                END IF;

                IF v_group_sel_count > v_group.max_selections THEN
                    RAISE EXCEPTION 'You can select at most % option(s) for "%"', v_group.max_selections, v_group.name;
                END IF;

                IF v_group.selection_type = 'single' AND v_group_sel_count > 1 THEN
                    RAISE EXCEPTION 'Group "%" only permits a single selection', v_group.name;
                END IF;

                IF v_group_sel_count > 0 THEN
                    v_validated_groups_json := v_validated_groups_json || jsonb_build_array(
                        jsonb_build_object(
                            'group_id', v_group.id,
                            'group_slug', v_group.slug,
                            'group_name', v_group.name,
                            'selected_options', v_group_selected_opts_json
                        )
                    );
                END IF;
            END LOOP;

            -- D. Authoritative Pricing Calculation (Client unit_price is ignored)
            v_server_custom_unit_price := GREATEST(0, v_builder_settings.base_price + v_option_adjustments_sum);
            v_unit_price := v_server_custom_unit_price;
            v_line_total := v_unit_price * v_qty;
            v_subtotal := v_subtotal + v_line_total;

            v_formatted_price := 'PKR ' || TO_CHAR(v_server_custom_unit_price, 'FM999,999,999');
            v_stored_custom_config := jsonb_build_object(
                'base_price', v_builder_settings.base_price,
                'total_price', v_server_custom_unit_price,
                'formatted_total_price', v_formatted_price,
                'currency', v_builder_settings.currency,
                'summary', COALESCE(v_custom_config->>'summary', 'Bespoke Formulation'),
                'created_at', COALESCE(v_custom_config->>'created_at', NOW()::TEXT),
                'groups', v_validated_groups_json
            );

            -- Accumulate verified custom item
            v_validated_items := v_validated_items || jsonb_build_array(
                jsonb_build_object(
                    'is_custom', true,
                    'product_id', NULL,
                    'product_name', COALESCE(v_item->>'product_name', 'Custom SCENTÉ'),
                    'product_slug', 'custom-scente',
                    'size', COALESCE(v_item->>'size', 'Bespoke'),
                    'quantity', v_qty,
                    'unit_price', v_unit_price,
                    'line_total', v_line_total,
                    'variant_id', NULL,
                    'custom_configuration', v_stored_custom_config
                )
            );

        ELSE
            -- Standard catalog product validation
            v_variant_id := NULL;
            IF (v_item->>'variant_id') IS NOT NULL AND (v_item->>'variant_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
                v_variant_id := (v_item->>'variant_id')::UUID;
            END IF;

            IF v_variant_id IS NOT NULL THEN
                SELECT * INTO v_variant
                FROM public.product_variants
                WHERE id = v_variant_id
                FOR UPDATE;
            ELSE
                SELECT * INTO v_variant
                FROM public.product_variants
                WHERE product_id = (v_item->>'product_id') 
                  AND size = COALESCE(v_item->>'size', '50ml')
                LIMIT 1
                FOR UPDATE;
            END IF;

            IF NOT FOUND OR v_variant IS NULL THEN
                RAISE EXCEPTION 'Sorry, one or more items in your cart are no longer available in the catalog.';
            END IF;

            SELECT * INTO v_product
            FROM public.products
            WHERE id = v_variant.product_id;

            IF NOT FOUND OR NOT v_product.is_active THEN
                RAISE EXCEPTION 'Sorry, one or more items in your cart are no longer available.';
            END IF;

            IF NOT v_variant.is_active THEN
                RAISE EXCEPTION 'Sorry, "%" (%) is currently not available.', v_product.name, v_variant.size;
            END IF;

            IF v_variant.stock_quantity < v_qty THEN
                RAISE EXCEPTION 'Sorry, "%" (%) only has % item(s) left in stock (requested: %).', v_product.name, v_variant.size, v_variant.stock_quantity, v_qty;
            END IF;

            v_unit_price := COALESCE(v_variant.price, v_product.price);
            v_line_total := v_unit_price * v_qty;
            v_subtotal := v_subtotal + v_line_total;

            -- Accumulate verified catalog item
            v_validated_items := v_validated_items || jsonb_build_array(
                jsonb_build_object(
                    'is_custom', false,
                    'product_id', v_product.id,
                    'product_name', v_product.name,
                    'product_slug', v_product.slug,
                    'size', v_variant.size,
                    'quantity', v_qty,
                    'unit_price', v_unit_price,
                    'line_total', v_line_total,
                    'variant_id', v_variant.id,
                    'custom_configuration', NULL
                )
            );
        END IF;
    END LOOP;

    -- 3. Secure Promo Code Evaluation with Phone Normalization
    v_clean_promo := UPPER(TRIM(COALESCE(p_promo_code, '')));
    IF v_clean_promo != '' THEN
        SELECT * INTO v_promo
        FROM public.promo_codes
        WHERE UPPER(code) = v_clean_promo
        FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Invalid promo code provided.';
        END IF;

        IF NOT v_promo.is_active THEN
            RAISE EXCEPTION 'Promo code is inactive.';
        END IF;

        IF v_promo.start_date IS NOT NULL AND NOW() < v_promo.start_date THEN
            RAISE EXCEPTION 'Promo code offer has not started yet.';
        END IF;

        IF v_promo.expiry_date IS NOT NULL AND NOW() > v_promo.expiry_date THEN
            RAISE EXCEPTION 'Promo code has expired.';
        END IF;

        IF v_promo.min_order_amount IS NOT NULL AND v_subtotal < v_promo.min_order_amount THEN
            RAISE EXCEPTION 'Order subtotal does not meet the minimum requirement for promo code.';
        END IF;

        IF v_promo.total_usage_limit IS NOT NULL AND v_promo.usage_count >= v_promo.total_usage_limit THEN
            RAISE EXCEPTION 'Promo code maximum usage limit reached.';
        END IF;

        -- Hardened per-customer check with phone digit normalization
        IF v_promo.per_customer_limit IS NOT NULL AND v_promo.per_customer_limit > 0 THEN
            v_clean_phone := REGEXP_REPLACE(COALESCE(p_customer_phone, ''), '[^0-9]', '', 'g');

            SELECT COUNT(*) INTO v_customer_usage
            FROM public.orders
            WHERE promo_code = v_promo.code
              AND status != 'cancelled'
              AND (
                  (
                      LENGTH(v_clean_phone) >= 9
                      AND (
                          REGEXP_REPLACE(customer_phone, '[^0-9]', '', 'g') = v_clean_phone
                          OR RIGHT(REGEXP_REPLACE(customer_phone, '[^0-9]', '', 'g'), 9) = RIGHT(v_clean_phone, 9)
                      )
                  )
                  OR (
                      p_customer_email IS NOT NULL
                      AND TRIM(p_customer_email) != ''
                      AND customer_email ILIKE TRIM(p_customer_email)
                  )
              );

            IF v_customer_usage >= v_promo.per_customer_limit THEN
                RAISE EXCEPTION 'Per-customer usage limit exceeded for promo code.';
            END IF;
        END IF;

        IF v_promo.discount_type = 'percentage' THEN
            v_raw_discount := ROUND((v_subtotal * v_promo.discount_value) / 100.0);
            IF v_promo.max_discount_amount IS NOT NULL AND v_promo.max_discount_amount > 0 THEN
                v_raw_discount := LEAST(v_raw_discount, v_promo.max_discount_amount);
            END IF;
        ELSIF v_promo.discount_type = 'fixed' THEN
            v_raw_discount := LEAST(v_promo.discount_value, v_subtotal);
        END IF;

        v_discount_amount := GREATEST(0, LEAST(v_raw_discount::INTEGER, v_subtotal));

        UPDATE public.promo_codes
        SET usage_count = usage_count + 1,
            updated_at = NOW()
        WHERE id = v_promo.id;

        v_applied_promo_code := v_promo.code;
        v_applied_discount_type := v_promo.discount_type;
        v_applied_discount_value := v_promo.discount_value;
    END IF;

    -- Final order total
    v_total := GREATEST(0, v_subtotal - v_discount_amount) + v_delivery_fee;

    -- 4. Generate unique order reference (SC-XXXXXX)
    LOOP
        v_reference := 'SC-' || LPAD(FLOOR(RANDOM() * 900000 + 100000)::TEXT, 6, '0');
        EXIT WHEN NOT EXISTS (SELECT 1 FROM public.orders WHERE reference = v_reference);
    END LOOP;

    -- 5. Insert Order Record
    INSERT INTO public.orders (
        reference,
        customer_full_name,
        customer_phone,
        customer_email,
        shipping_address,
        city,
        province,
        postal_code,
        payment_method,
        subtotal,
        delivery_fee,
        discount_amount,
        promo_code,
        discount_type,
        discount_value,
        total,
        status
    ) VALUES (
        v_reference,
        p_customer_full_name,
        p_customer_phone,
        NULLIF(TRIM(p_customer_email), ''),
        p_shipping_address,
        p_city,
        p_province,
        NULLIF(TRIM(p_postal_code), ''),
        'cod',
        v_subtotal,
        v_delivery_fee,
        v_discount_amount,
        v_applied_promo_code,
        v_applied_discount_type,
        v_applied_discount_value,
        v_total,
        'pending'
    ) RETURNING * INTO v_order_record;

    v_order_id := v_order_record.id;

    -- 6. Insert Order Items from Validated Set & Deduct Stock
    -- Uses the single-pass authoritative item set created in Step 2; guarantees complete consistency.
    FOR v_val_item IN SELECT * FROM jsonb_array_elements(v_validated_items)
    LOOP
        INSERT INTO public.order_items (
            order_id,
            product_id,
            product_name,
            product_slug,
            size,
            quantity,
            unit_price,
            line_total,
            variant_id,
            is_custom,
            custom_configuration
        ) VALUES (
            v_order_id,
            v_val_item->>'product_id',
            v_val_item->>'product_name',
            v_val_item->>'product_slug',
            v_val_item->>'size',
            (v_val_item->>'quantity')::INTEGER,
            (v_val_item->>'unit_price')::INTEGER,
            (v_val_item->>'line_total')::INTEGER,
            NULLIF(v_val_item->>'variant_id', '')::UUID,
            (v_val_item->>'is_custom')::BOOLEAN,
            v_val_item->'custom_configuration'
        );

        -- Catalog products decrement stock; custom perfumes do not
        IF NOT (v_val_item->>'is_custom')::BOOLEAN THEN
            UPDATE public.product_variants
            SET stock_quantity = stock_quantity - (v_val_item->>'quantity')::INTEGER,
                updated_at = NOW()
            WHERE id = (v_val_item->>'variant_id')::UUID;

            PERFORM public.sync_product_inventory_from_variants(v_val_item->>'product_id');
        END IF;
    END LOOP;

    -- 7. Return Result Payload
    RETURN jsonb_build_object(
        'success', true,
        'order_id', v_order_id,
        'reference', v_reference,
        'subtotal', v_subtotal,
        'discount_amount', v_discount_amount,
        'promo_code', v_applied_promo_code,
        'delivery_fee', v_delivery_fee,
        'total', v_total,
        'status', 'pending'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.create_cod_order(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, TEXT) TO anon, authenticated;


-- ------------------------------------------------------------------------------
-- 4. HARDEN SEND_ORDER_EMAIL TRIGGER WITH OPTIONAL SERVER SECRET
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.send_order_email_on_insert()
RETURNS TRIGGER AS $$
DECLARE
    v_request_id BIGINT;
    v_payload JSONB;
    v_webhook_secret TEXT;
    v_headers JSONB;
BEGIN
    -- Only trigger for newly created orders that have not already had an email sent
    IF NEW.notification_sent_at IS NOT NULL THEN
        RETURN NEW;
    END IF;

    -- Dynamically check for server-configured secret from database settings or Vault
    v_webhook_secret := NULLIF(current_setting('app.settings.order_webhook_secret', true), '');
    IF v_webhook_secret IS NULL THEN
        BEGIN
            SELECT decrypted_secret INTO v_webhook_secret
            FROM vault.decrypted_secrets
            WHERE name = 'order_webhook_secret'
            LIMIT 1;
        EXCEPTION WHEN OTHERS THEN
            v_webhook_secret := NULL;
        END;
    END IF;

    v_headers := jsonb_build_object(
        'Content-Type', 'application/json'
    );

    IF v_webhook_secret IS NOT NULL THEN
        v_headers := v_headers || jsonb_build_object(
            'x-webhook-secret', v_webhook_secret,
            'Authorization', 'Bearer ' || v_webhook_secret
        );
    END IF;

    v_payload := jsonb_build_object(
        'type', 'INSERT',
        'table', 'orders',
        'schema', 'public',
        'record', row_to_json(NEW)
    );

    SELECT net.http_post(
        url := 'https://uungyqinfveuxtaxettk.supabase.co/functions/v1/send-order-email',
        headers := v_headers,
        body := v_payload
    ) INTO v_request_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions;

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';
