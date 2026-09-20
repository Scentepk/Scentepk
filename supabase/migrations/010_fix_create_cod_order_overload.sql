-- ==============================================================================
-- 010_fix_create_cod_order_overload.sql
-- SCENTÉ — Complete Fix for PostgREST Overload, Variant Resolution & Restock
-- ==============================================================================

-- 1. Ensure helper inventory sync functions exist
CREATE OR REPLACE FUNCTION public.sync_product_inventory_from_variants(p_product_id TEXT)
RETURNS VOID AS $$
DECLARE
    v_total_stock INTEGER;
BEGIN
    SELECT COALESCE(SUM(stock_quantity), 0) INTO v_total_stock
    FROM public.product_variants
    WHERE product_id = p_product_id AND is_active = true;

    UPDATE public.products
    SET stock_quantity = v_total_stock,
        status = CASE
            WHEN v_total_stock <= 0 AND status = 'active' THEN 'out_of_stock'
            WHEN v_total_stock > 0 AND status = 'out_of_stock' THEN 'active'
            ELSE status
        END,
        updated_at = NOW()
    WHERE id = p_product_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Alias helper to ensure both function names work reliably
CREATE OR REPLACE FUNCTION public.sync_product_stock_from_variants(p_product_id TEXT)
RETURNS VOID AS $$
BEGIN
    PERFORM public.sync_product_inventory_from_variants(p_product_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Ensure standard fragrance variants exist and have active inventory
INSERT INTO public.product_variants (product_id, size, volume, price, stock_quantity, is_active)
VALUES 
    ('scente-noir', '50ml', '50ml / 1.7 FL. OZ.', 12500, 50, true),
    ('scente-amber', '50ml', '50ml / 1.7 FL. OZ.', 14500, 50, true),
    ('scente-musk', '50ml', '50ml / 1.7 FL. OZ.', 13500, 50, true)
ON CONFLICT (product_id, size) DO UPDATE SET
    stock_quantity = GREATEST(public.product_variants.stock_quantity, 50),
    is_active = true,
    updated_at = NOW();

-- Ensure all existing variants have active stock
UPDATE public.product_variants
SET stock_quantity = 50, is_active = true
WHERE stock_quantity <= 0 OR is_active = false;

-- Sync base products stock and status
UPDATE public.products p
SET stock_quantity = COALESCE((
    SELECT SUM(stock_quantity) 
    FROM public.product_variants pv 
    WHERE pv.product_id = p.id AND pv.is_active = true
), 50),
status = 'active',
is_active = true;

-- 3. Drop the legacy 8-parameter overload from migration 004
DROP FUNCTION IF EXISTS public.create_cod_order(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB);

-- 4. Create the robust 9-parameter create_cod_order function
CREATE OR REPLACE FUNCTION public.create_cod_order(
    p_customer_full_name TEXT,
    p_customer_phone TEXT,
    p_customer_email TEXT,
    p_shipping_address TEXT,
    p_city TEXT,
    p_province TEXT,
    p_postal_code TEXT,
    p_items JSONB, -- Array of { "variant_id": "...", "product_id": "...", "quantity": 1, "size": "50ml" }
    p_promo_code TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_order_id UUID;
    v_reference TEXT;
    v_item JSONB;
    v_variant RECORD;
    v_product RECORD;
    v_variant_id UUID;
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

        -- Flexible variant resolution: UUID check, fallback to (product_id, size)
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

        -- Record applied promo metadata into safe scalar variables
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

    -- 6. Deduct Variant Stock, Insert Order Items, and Sync Product Stock
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_qty := (v_item->>'quantity')::INTEGER;
        
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
            variant_id
        ) VALUES (
            v_order_id,
            v_product.id,
            v_product.name,
            v_product.slug,
            v_variant.size,
            v_qty,
            v_unit_price,
            v_line_total,
            v_variant.id
        );

        UPDATE public.product_variants
        SET stock_quantity = stock_quantity - v_qty,
            updated_at = NOW()
        WHERE id = v_variant.id;

        PERFORM public.sync_product_inventory_from_variants(v_variant.product_id);
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

-- 5. Ensure permissions
GRANT EXECUTE ON FUNCTION public.create_cod_order(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.validate_promo_code(TEXT, NUMERIC, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_product_inventory_from_variants(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_product_stock_from_variants(TEXT) TO anon, authenticated;
