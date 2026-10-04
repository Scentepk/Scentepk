-- ==============================================================================
-- SCENTE — Migration 022: Harden Custom Order RPC Price Authority & Option Validation
-- Feature: Authoritative server-side price calculation and option validation in create_cod_order
-- ==============================================================================

-- Replaces create_cod_order to guarantee:
-- 1. Custom item unit prices are NEVER read from client payloads (p_items[].unit_price is ignored).
-- 2. Authoritative base price is read from public.custom_builder_settings.
-- 3. All selected options in custom_configuration are validated in PostgreSQL:
--    - Option UUID must exist and be active.
--    - Option must belong to its active parent group.
--    - Group constraints (is_required, min_selections, max_selections, selection_type) are strictly enforced.
-- 4. Server-calculated unit price = base_price + SUM(active selected options' price_adjustment).
-- 5. Server-calculated line total = server_unit_price * quantity.
-- 6. Updated custom_configuration snapshot is stored with the authoritative total_price.
-- 7. Standard catalog product flows remain completely unaffected.

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

    -- Promo validation records & safe scalar placeholders
    v_promo RECORD;
    v_clean_promo TEXT;
    v_customer_usage INTEGER := 0;
    v_raw_discount NUMERIC := 0;
    v_applied_promo_code TEXT := NULL;
    v_applied_discount_type TEXT := NULL;
    v_applied_discount_value NUMERIC := NULL;

    -- Custom Builder validation variables
    v_custom_config JSONB;
    v_group RECORD;
    v_option RECORD;
    v_selected_opt_id_text TEXT;
    v_selected_opt_uuid UUID;
    v_group_sel_count INTEGER;
    v_option_adjustments_sum INTEGER;
    v_server_custom_unit_price INTEGER;
    v_stored_custom_config JSONB;
    v_updated_groups_json JSONB;
    v_formatted_price TEXT;
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

    -- 2. Validate all items & calculate authoritative subtotal
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

            -- B. Validate every active group and selected options independently in PostgreSQL
            v_option_adjustments_sum := 0;

            FOR v_group IN
                SELECT * FROM public.custom_builder_groups
                WHERE is_active = true
                ORDER BY sort_order ASC
            LOOP
                -- Count unique valid selections provided for this group in custom_configuration
                v_group_sel_count := 0;

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

                    -- Query option from database to verify active state, price, and group ownership
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
                END LOOP;

                -- Enforce group selection constraints
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
            END LOOP;

            -- C. Authoritative Server-Side Price Calculation (IGNORING client unit_price)
            v_server_custom_unit_price := GREATEST(0, v_builder_settings.base_price + v_option_adjustments_sum);
            v_unit_price := v_server_custom_unit_price;
            v_line_total := v_unit_price * v_qty;
            v_subtotal := v_subtotal + v_line_total;

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
        END IF;
    END LOOP;

    -- 3. Secure Promo Code Evaluation (if supplied)
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

        IF v_promo.per_customer_limit IS NOT NULL AND v_promo.per_customer_limit > 0 THEN
            SELECT COUNT(*) INTO v_customer_usage
            FROM public.orders
            WHERE promo_code = v_promo.code
              AND status != 'cancelled'
              AND (
                  customer_phone = TRIM(p_customer_phone)
                  OR (p_customer_email IS NOT NULL AND customer_email ILIKE TRIM(p_customer_email))
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

    -- 5. Insert Order Record with Promo Snapshot
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

    -- 6. Insert Order Items (with authoritative prices) & Deduct Stock for catalog items
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_qty := (v_item->>'quantity')::INTEGER;
        v_is_custom := COALESCE((v_item->>'is_custom')::BOOLEAN, false);

        IF v_is_custom THEN
            -- Recalculate authoritative price from DB
            SELECT * INTO v_builder_settings
            FROM public.custom_builder_settings
            WHERE id = 'primary_builder_settings';

            v_custom_config := v_item->'custom_configuration';
            v_option_adjustments_sum := 0;

            FOR v_selected_opt_id_text IN
                SELECT DISTINCT opt_elem->>'id'
                FROM jsonb_array_elements(COALESCE(v_custom_config->'groups', '[]'::jsonb)) grp_elem,
                     jsonb_array_elements(COALESCE(grp_elem->'selected_options', '[]'::jsonb)) opt_elem
                WHERE opt_elem->>'id' IS NOT NULL
            LOOP
                SELECT * INTO v_option
                FROM public.custom_builder_options
                WHERE id = v_selected_opt_id_text::UUID AND is_active = true;

                IF FOUND THEN
                    v_option_adjustments_sum := v_option_adjustments_sum + GREATEST(0, v_option.price_adjustment);
                END IF;
            END LOOP;

            v_server_custom_unit_price := GREATEST(0, v_builder_settings.base_price + v_option_adjustments_sum);
            v_unit_price := v_server_custom_unit_price;
            v_line_total := v_unit_price * v_qty;

            -- Update custom_configuration snapshot with authoritative price
            v_formatted_price := 'PKR ' || TO_CHAR(v_server_custom_unit_price, 'FM999,999,999');
            v_stored_custom_config := jsonb_set(
                jsonb_set(
                    jsonb_set(
                        v_custom_config,
                        '{base_price}',
                        to_jsonb(v_builder_settings.base_price)
                    ),
                    '{total_price}',
                    to_jsonb(v_server_custom_unit_price)
                ),
                '{formatted_total_price}',
                to_jsonb(v_formatted_price)
            );

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
                NULL,
                COALESCE(v_item->>'product_name', 'Custom SCENTE'),
                'custom-scente',
                COALESCE(v_item->>'size', 'Bespoke'),
                v_qty,
                v_unit_price,
                v_line_total,
                NULL,
                true,
                v_stored_custom_config
            );
        ELSE
            -- Resolve variant
            v_variant_id := NULL;
            IF (v_item->>'variant_id') IS NOT NULL AND (v_item->>'variant_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
                v_variant_id := (v_item->>'variant_id')::UUID;
            END IF;

            IF v_variant_id IS NOT NULL THEN
                SELECT * INTO v_variant FROM public.product_variants WHERE id = v_variant_id;
            ELSE
                SELECT * INTO v_variant FROM public.product_variants WHERE product_id = (v_item->>'product_id') AND size = COALESCE(v_item->>'size', '50ml') LIMIT 1;
            END IF;

            SELECT * INTO v_product FROM public.products WHERE id = v_variant.product_id;

            v_unit_price := COALESCE(v_variant.price, v_product.price);
            v_line_total := v_unit_price * v_qty;

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
                v_product.id,
                v_product.name,
                v_product.slug,
                v_variant.size,
                v_qty,
                v_unit_price,
                v_line_total,
                v_variant.id,
                false,
                NULL
            );

            UPDATE public.product_variants
            SET stock_quantity = stock_quantity - v_qty,
                updated_at = NOW()
            WHERE id = v_variant.id;

            PERFORM public.sync_product_inventory_from_variants(v_variant.product_id);
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

-- Ensure permissions
GRANT EXECUTE ON FUNCTION public.create_cod_order(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, TEXT) TO anon, authenticated;
