-- ==============================================================================
-- 009_promo_codes.sql
-- SCENTE Ecommerce — Admin-Controlled Promo Code & Discount System
-- ==============================================================================

-- 1. Create Promo Codes Table
CREATE TABLE IF NOT EXISTS public.promo_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
    discount_value NUMERIC NOT NULL CHECK (discount_value > 0),
    min_order_amount NUMERIC NULL CHECK (min_order_amount IS NULL OR min_order_amount >= 0),
    max_discount_amount NUMERIC NULL CHECK (max_discount_amount IS NULL OR max_discount_amount >= 0),
    start_date TIMESTAMPTZ NULL,
    expiry_date TIMESTAMPTZ NULL,
    total_usage_limit INTEGER NULL CHECK (total_usage_limit IS NULL OR total_usage_limit > 0),
    per_customer_limit INTEGER NULL CHECK (per_customer_limit IS NULL OR per_customer_limit > 0),
    usage_count INTEGER NOT NULL DEFAULT 0 CHECK (usage_count >= 0),
    is_active BOOLEAN NOT NULL DEFAULT true,
    description TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast lookup by code
CREATE INDEX IF NOT EXISTS idx_promo_codes_code ON public.promo_codes (code);
CREATE INDEX IF NOT EXISTS idx_promo_codes_active ON public.promo_codes (is_active);

-- 2. Add Discount / Promo Columns to Orders Table
ALTER TABLE public.orders
    ADD COLUMN IF NOT EXISTS promo_code TEXT NULL,
    ADD COLUMN IF NOT EXISTS discount_type TEXT NULL,
    ADD COLUMN IF NOT EXISTS discount_value NUMERIC NULL,
    ADD COLUMN IF NOT EXISTS discount_amount NUMERIC NOT NULL DEFAULT 0;

-- 3. Row-Level Security (RLS)
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;

-- Admins have full access
DROP POLICY IF EXISTS "Admins can do all on promo_codes" ON public.promo_codes;
CREATE POLICY "Admins can do all on promo_codes"
    ON public.promo_codes
    FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- Public can view active promo codes for client validation fallback
DROP POLICY IF EXISTS "Public can view active promo codes" ON public.promo_codes;
CREATE POLICY "Public can view active promo codes"
    ON public.promo_codes
    FOR SELECT
    TO public
    USING (is_active = true);

-- 4. Secure Promo Code Validation RPC
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

    -- 5. Check minimum order requirement
    IF v_promo.min_order_amount IS NOT NULL AND v_promo.min_order_amount > 0 THEN
        IF p_subtotal < v_promo.min_order_amount THEN
            RETURN jsonb_build_object(
                'valid', false,
                'message', 'This code requires a minimum order value of PKR ' || TO_CHAR(v_promo.min_order_amount, 'FM999,999,999') || '.'
            );
        END IF;
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

    -- 7. Check per-customer usage limit if identifier provided
    IF v_promo.per_customer_limit IS NOT NULL AND v_promo.per_customer_limit > 0 THEN
        IF NULLIF(TRIM(COALESCE(p_customer_phone, '')), '') IS NOT NULL OR NULLIF(TRIM(COALESCE(p_customer_email, '')), '') IS NOT NULL THEN
            SELECT COUNT(*) INTO v_customer_usage
            FROM public.orders
            WHERE promo_code = v_promo.code
              AND status != 'cancelled'
              AND (
                  (p_customer_phone IS NOT NULL AND customer_phone = TRIM(p_customer_phone))
                  OR
                  (p_customer_email IS NOT NULL AND customer_email ILIKE TRIM(p_customer_email))
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

-- 5. UPGRADED ATOMIC COD ORDER RPC WITH SECURE PROMO CALCULATION
-- Drop obsolete 8-parameter signature from migration 004 to eliminate PostgREST function overload ambiguity
DROP FUNCTION IF EXISTS public.create_cod_order(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB);

CREATE OR REPLACE FUNCTION public.create_cod_order(
    p_customer_full_name TEXT,
    p_customer_phone TEXT,
    p_customer_email TEXT,
    p_shipping_address TEXT,
    p_city TEXT,
    p_province TEXT,
    p_postal_code TEXT,
    p_items JSONB, -- Array of { "variant_id": "...", "product_id": "...", "quantity": 1 }
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

    -- Promo validation records
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

    -- Harden p_items input (must be non-null JSON array)
    IF p_items IS NULL OR jsonb_typeof(p_items) != 'array' THEN
        RAISE EXCEPTION 'p_items must be a valid JSON array of order items';
    END IF;

    IF jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'Order must contain at least one item';
    END IF;

    -- Prevent duplicate variant_id within a single checkout payload
    IF EXISTS (
        SELECT (elem->>'variant_id')
        FROM jsonb_array_elements(p_items) elem
        WHERE (elem->>'variant_id') IS NOT NULL AND TRIM(elem->>'variant_id') != ''
        GROUP BY (elem->>'variant_id')
        HAVING COUNT(*) > 1
    ) THEN
        RAISE EXCEPTION 'Duplicate variant_id detected in checkout.';
    END IF;

    -- 2. Validate all items & Lock required variants (FOR UPDATE)
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_qty := (v_item->>'quantity')::INTEGER;
        IF v_qty IS NULL OR v_qty <= 0 THEN
            RAISE EXCEPTION 'Item quantity must be greater than zero';
        END IF;

        IF (v_item->>'variant_id') IS NULL OR TRIM(v_item->>'variant_id') = '' THEN
            RAISE EXCEPTION 'Checkout item requires a valid variant_id.';
        END IF;

        BEGIN
            v_variant_id := (v_item->>'variant_id')::UUID;
        EXCEPTION WHEN OTHERS THEN
            RAISE EXCEPTION 'Invalid variant_id UUID format for checkout item.';
        END;

        -- Resolve variant with row-level lock FOR UPDATE
        SELECT * INTO v_variant
        FROM public.product_variants
        WHERE id = v_variant_id
        FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Sorry, one or more items in your cart are no longer available.';
        END IF;

        SELECT * INTO v_product
        FROM public.products
        WHERE id = v_variant.product_id;

        IF NOT FOUND OR NOT v_product.is_active THEN
            RAISE EXCEPTION 'Sorry, one or more items in your cart are no longer available.';
        END IF;

        IF (v_item->>'product_id') IS NOT NULL AND v_variant.product_id != (v_item->>'product_id') THEN
            RAISE EXCEPTION 'Variant does not belong to the specified product.';
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
        -- Lock promo code row FOR UPDATE to prevent race conditions on usage_count
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

        -- Calculate discount server-side
        IF v_promo.discount_type = 'percentage' THEN
            v_raw_discount := ROUND((v_subtotal * v_promo.discount_value) / 100.0);
            IF v_promo.max_discount_amount IS NOT NULL AND v_promo.max_discount_amount > 0 THEN
                v_raw_discount := LEAST(v_raw_discount, v_promo.max_discount_amount);
            END IF;
        ELSIF v_promo.discount_type = 'fixed' THEN
            v_raw_discount := LEAST(v_promo.discount_value, v_subtotal);
        END IF;

        v_discount_amount := GREATEST(0, LEAST(v_raw_discount::INTEGER, v_subtotal));

        -- Increment promo code usage count
        UPDATE public.promo_codes
        SET usage_count = usage_count + 1,
            updated_at = NOW()
        WHERE id = v_promo.id;

        -- Record applied promo metadata into scalar variables (safe from unassigned RECORD errors)
        v_applied_promo_code := v_promo.code;
        v_applied_discount_type := v_promo.discount_type;
        v_applied_discount_value := v_promo.discount_value;
    END IF;

    -- Final order total: subtotal minus validated discount plus delivery fee (never negative)
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
        v_variant_id := (v_item->>'variant_id')::UUID;

        SELECT * INTO v_variant
        FROM public.product_variants
        WHERE id = v_variant_id;

        SELECT * INTO v_product
        FROM public.products
        WHERE id = v_variant.product_id;

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

        -- Decrement Variant stock
        UPDATE public.product_variants
        SET stock_quantity = stock_quantity - v_qty,
            updated_at = NOW()
        WHERE id = v_variant_id;

        -- Re-aggregate product base stock
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

-- 6. Seed initial curated promo codes for immediate use
INSERT INTO public.promo_codes (
    code,
    discount_type,
    discount_value,
    min_order_amount,
    max_discount_amount,
    start_date,
    expiry_date,
    total_usage_limit,
    per_customer_limit,
    usage_count,
    is_active,
    description
) VALUES
(
    'WELCOME10',
    'percentage',
    10,
    3000,
    1500,
    NOW() - INTERVAL '1 day',
    NOW() + INTERVAL '1 year',
    500,
    1,
    0,
    true,
    'Welcome introductory offer — 10% off on orders above PKR 3,000 (Max PKR 1,500 discount)'
),
(
    'SCENTE500',
    'fixed',
    500,
    4000,
    NULL,
    NOW() - INTERVAL '1 day',
    NOW() + INTERVAL '1 year',
    200,
    1,
    0,
    true,
    'Welcome privilege gift — PKR 500 fixed deduction on orders above PKR 4,000'
)
ON CONFLICT (code) DO NOTHING;
