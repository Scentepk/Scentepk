-- ==============================================================================
-- SCENTÉ — Migration 020: Custom Perfume COD Order Integration
-- Feature: BUILD YOUR SCENTÉ (Cart, Checkout & Order Creation RPC Extension)
-- ==============================================================================

-- Update create_cod_order to atomically support both standard catalog products
-- and bespoke custom perfume items with immutable configuration snapshots.

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

    -- 2. Validate all items & Lock required variants (FOR UPDATE)
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_qty := (v_item->>'quantity')::INTEGER;
        IF v_qty IS NULL OR v_qty <= 0 THEN
            RAISE EXCEPTION 'Item quantity must be greater than zero';
        END IF;

        v_is_custom := COALESCE((v_item->>'is_custom')::BOOLEAN, false);

        IF v_is_custom THEN
            -- Custom Perfume item validation
            SELECT * INTO v_builder_settings
            FROM public.custom_builder_settings
            WHERE id = 'primary_builder_settings';

            IF NOT FOUND OR NOT v_builder_settings.is_active THEN
                RAISE EXCEPTION 'The Custom Perfume Builder is currently inactive. Please review your bag.';
            END IF;

            v_unit_price := COALESCE((v_item->>'unit_price')::INTEGER, v_builder_settings.base_price);
            IF v_unit_price < 0 THEN
                RAISE EXCEPTION 'Invalid custom perfume unit price.';
            END IF;

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

    -- 6. Insert Order Items & Deduct Stock
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_qty := (v_item->>'quantity')::INTEGER;
        v_is_custom := COALESCE((v_item->>'is_custom')::BOOLEAN, false);

        IF v_is_custom THEN
            v_unit_price := COALESCE((v_item->>'unit_price')::INTEGER, 0);
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
                NULL,
                COALESCE(v_item->>'product_name', 'Custom SCENTÉ'),
                'custom-scente',
                COALESCE(v_item->>'size', 'Bespoke'),
                v_qty,
                v_unit_price,
                v_line_total,
                NULL,
                true,
                v_item->'custom_configuration'
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
