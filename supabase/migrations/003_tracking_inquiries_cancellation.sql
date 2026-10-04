-- ==============================================================================
-- SCENTE — Phase 3C: Order Tracking, Contact Inquiries & Inventory Restoration
-- ==============================================================================

-- 1. EXTEND ORDERS TABLE WITH SHIPMENT & CANCELLATION TRACKING
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS tracking_number TEXT,
ADD COLUMN IF NOT EXISTS carrier TEXT,
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_orders_tracking_number ON public.orders(tracking_number);


-- 2. CREATE INQUIRIES TABLE
CREATE TABLE IF NOT EXISTS public.inquiries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    subject TEXT,
    message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'unread' CHECK (status IN ('unread', 'read', 'resolved')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inquiries_status ON public.inquiries(status);
CREATE INDEX IF NOT EXISTS idx_inquiries_created_at ON public.inquiries(created_at DESC);

-- Enable RLS on inquiries
ALTER TABLE public.inquiries ENABLE ROW LEVEL SECURITY;

-- Public (Anonymous & Authenticated) can ONLY insert inquiries
DROP POLICY IF EXISTS "Public can submit inquiries" ON public.inquiries;
CREATE POLICY "Public can submit inquiries"
    ON public.inquiries FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

-- Only Administrators can view, update, and delete inquiries
DROP POLICY IF EXISTS "Admins have full access to inquiries" ON public.inquiries;
CREATE POLICY "Admins have full access to inquiries"
    ON public.inquiries FOR ALL
    TO authenticated
    USING (public.is_admin());


-- 3. SECURE PUBLIC ORDER TRACKING RPC
-- Verifies reference AND phone number before returning tracking manifest.
-- Does NOT expose sensitive customer street address, email, or internal notes.
CREATE OR REPLACE FUNCTION public.track_order_public(
    p_reference TEXT,
    p_phone TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_clean_ref TEXT;
    v_clean_input_phone TEXT;
    v_order RECORD;
    v_items JSONB;
BEGIN
    -- 1. Input Sanitization
    v_clean_ref := UPPER(TRIM(COALESCE(p_reference, '')));
    -- Normalize phone: strip spaces, dashes, parentheses, dots
    v_clean_input_phone := REGEXP_REPLACE(COALESCE(p_phone, ''), '[^0-9]', '', 'g');

    IF v_clean_ref = '' OR v_clean_input_phone = '' THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Order not found. Please check your order reference and phone number.'
        );
    END IF;

    -- 2. Secure Query with phone matching (resilient to 0300 vs +92300 formats: compare last 9 digits)
    SELECT * INTO v_order
    FROM public.orders
    WHERE UPPER(TRIM(reference)) = v_clean_ref
      AND (
        REGEXP_REPLACE(customer_phone, '[^0-9]', '', 'g') = v_clean_input_phone
        OR RIGHT(REGEXP_REPLACE(customer_phone, '[^0-9]', '', 'g'), 9) = RIGHT(v_clean_input_phone, 9)
      );

    -- 3. Generic error message prevents order enumeration
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Order not found. Please check your order reference and phone number.'
        );
    END IF;

    -- 4. Aggregate items for tracking display
    SELECT jsonb_agg(
        jsonb_build_object(
            'product_name', oi.product_name,
            'product_slug', oi.product_slug,
            'size', oi.size,
            'quantity', oi.quantity,
            'unit_price', oi.unit_price,
            'line_total', oi.line_total
        )
    ) INTO v_items
    FROM public.order_items oi
    WHERE oi.order_id = v_order.id;

    -- 5. Return structured, safe tracking payload
    RETURN jsonb_build_object(
        'success', true,
        'reference', v_order.reference,
        'status', v_order.status,
        'carrier', v_order.carrier,
        'tracking_number', v_order.tracking_number,
        'city', v_order.city,
        'province', v_order.province,
        'payment_method', v_order.payment_method,
        'subtotal', v_order.subtotal,
        'delivery_fee', v_order.delivery_fee,
        'total', v_order.total,
        'created_at', v_order.created_at,
        'updated_at', v_order.updated_at,
        'cancelled_at', v_order.cancelled_at,
        'items', COALESCE(v_items, '[]'::jsonb)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

GRANT EXECUTE ON FUNCTION public.track_order_public(TEXT, TEXT) TO anon, authenticated;


-- 4. ATOMIC ORDER CANCELLATION & INVENTORY RESTORATION RPC
-- Restores base product and variant stock atomically.
-- Guarantees IDEMPOTENCY: stock is only restored once when transitioning non-cancelled -> cancelled.
CREATE OR REPLACE FUNCTION public.cancel_order_and_restore_stock(
    p_order_id TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_order RECORD;
    v_item RECORD;
    v_restored_count INTEGER := 0;
BEGIN
    -- 1. Authorization: Verify administrator privileges
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Unauthorized: Only SCENTE Atelier administrators can cancel orders.';
    END IF;

    -- 2. Lock and fetch order
    SELECT * INTO v_order
    FROM public.orders
    WHERE id::TEXT = p_order_id OR reference = p_order_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Order not found.'
        );
    END IF;

    -- 3. Idempotency Guard: If already cancelled, do NOT restore stock again
    IF v_order.status = 'cancelled' OR v_order.cancelled_at IS NOT NULL THEN
        RETURN jsonb_build_object(
            'success', true,
            'already_cancelled', true,
            'message', 'Order is already marked as cancelled. Stock was previously restored.',
            'order_id', v_order.id,
            'status', 'cancelled'
        );
    END IF;

    -- 4. Restore stock for each item in the order
    FOR v_item IN
        SELECT product_id, size, quantity
        FROM public.order_items
        WHERE order_id = v_order.id
    LOOP
        -- Restore base product stock
        IF v_item.product_id IS NOT NULL THEN
            UPDATE public.products
            SET stock_quantity = stock_quantity + v_item.quantity,
                updated_at = NOW()
            WHERE id = v_item.product_id;

            -- Restore variant stock if size is defined
            IF v_item.size IS NOT NULL THEN
                UPDATE public.product_variants
                SET stock_quantity = stock_quantity + v_item.quantity,
                    updated_at = NOW()
                WHERE product_id = v_item.product_id AND size = v_item.size;
            END IF;

            v_restored_count := v_restored_count + v_item.quantity;
        END IF;
    END LOOP;

    -- 5. Mark order as cancelled with timestamp
    UPDATE public.orders
    SET status = 'cancelled',
        cancelled_at = NOW(),
        updated_at = NOW()
    WHERE id = v_order.id;

    RETURN jsonb_build_object(
        'success', true,
        'already_cancelled', false,
        'order_id', v_order.id,
        'status', 'cancelled',
        'cancelled_at', NOW(),
        'restored_units', v_restored_count,
        'message', FORMAT('Order marked as cancelled. %s unit(s) restored to catalog inventory.', v_restored_count)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.cancel_order_and_restore_stock(TEXT) TO authenticated;
