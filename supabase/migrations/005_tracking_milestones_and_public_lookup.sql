-- ==============================================================================
-- SCENTÉ — Phase 1: Tracking Milestones & Public Order Tracking Hardening
-- Migration: 005_tracking_milestones_and_public_lookup.sql
-- ==============================================================================

-- 1. ADD MILESTONE TIMESTAMPS TO ORDERS TABLE
-- Non-breaking addition: shipped_at and delivered_at default to NULL for all existing orders.
-- Existing carrier and tracking_number columns are preserved.
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS shipped_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_orders_shipped_at ON public.orders(shipped_at);
CREATE INDEX IF NOT EXISTS idx_orders_delivered_at ON public.orders(delivered_at);


-- 2. TRIGGER FUNCTION: AUTOMATIC ORDER MILESTONE TIMESTAMPS
-- Enforces milestone timestamps directly at the database level on status transitions.
-- Idempotency Guard: NEVER overwrites existing shipped_at, delivered_at, or cancelled_at.
CREATE OR REPLACE FUNCTION public.handle_order_milestone_timestamps()
RETURNS TRIGGER AS $$
BEGIN
    -- Transition to 'shipped': Record shipped_at if not already recorded
    IF NEW.status = 'shipped' THEN
        NEW.shipped_at := COALESCE(OLD.shipped_at, NEW.shipped_at, NOW());
    END IF;

    -- Transition to 'delivered': Record delivered_at (and shipped_at if missing) if not already recorded
    IF NEW.status = 'delivered' THEN
        NEW.shipped_at := COALESCE(OLD.shipped_at, NEW.shipped_at, NOW());
        NEW.delivered_at := COALESCE(OLD.delivered_at, NEW.delivered_at, NOW());
    END IF;

    -- Transition to 'cancelled': Preserve/record cancelled_at
    IF NEW.status = 'cancelled' THEN
        NEW.cancelled_at := COALESCE(OLD.cancelled_at, NEW.cancelled_at, NOW());
    END IF;

    -- Safety: Preserve existing timestamps if a general update supplies NULL
    IF OLD.shipped_at IS NOT NULL AND NEW.shipped_at IS NULL THEN
        NEW.shipped_at := OLD.shipped_at;
    END IF;

    IF OLD.delivered_at IS NOT NULL AND NEW.delivered_at IS NULL THEN
        NEW.delivered_at := OLD.delivered_at;
    END IF;

    IF OLD.cancelled_at IS NOT NULL AND NEW.cancelled_at IS NULL THEN
        NEW.cancelled_at := OLD.cancelled_at;
    END IF;

    -- Always update updated_at timestamp
    NEW.updated_at := NOW();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop trigger if exists before recreating
DROP TRIGGER IF EXISTS trg_order_milestone_timestamps ON public.orders;
CREATE TRIGGER trg_order_milestone_timestamps
BEFORE UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.handle_order_milestone_timestamps();


-- 3. UPGRADE SECURE PUBLIC ORDER TRACKING RPC
-- Requires both reference and customer phone (dual-factor verification) to prevent order enumeration.
-- Returns sanitized tracking manifest without customer PII (no customer_full_name, phone, email, shipping address, or admin notes).
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
    -- Normalize phone: strip spaces, dashes, parentheses, dots, and non-digits
    v_clean_input_phone := REGEXP_REPLACE(COALESCE(p_phone, ''), '[^0-9]', '', 'g');

    -- Reject empty inputs with generic message to avoid enumeration
    IF v_clean_ref = '' OR v_clean_input_phone = '' THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Order not found. Please check your order reference and phone number.'
        );
    END IF;

    -- 2. Dual-Factor Lookup: Reference + Phone verification
    -- Resilient to local vs international formats (e.g. 0300... vs +92300...): matches exact digits or last 9 digits
    SELECT * INTO v_order
    FROM public.orders
    WHERE UPPER(TRIM(reference)) = v_clean_ref
      AND (
        REGEXP_REPLACE(customer_phone, '[^0-9]', '', 'g') = v_clean_input_phone
        OR RIGHT(REGEXP_REPLACE(customer_phone, '[^0-9]', '', 'g'), 9) = RIGHT(v_clean_input_phone, 9)
      );

    -- 3. Return uniform failure if not found (prevents order enumeration)
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Order not found. Please check your order reference and phone number.'
        );
    END IF;

    -- 4. Aggregate items for tracking display (strictly limited to tracking essentials: product_name, size, quantity, unit_price, line_total)
    SELECT jsonb_agg(
        jsonb_build_object(
            'product_name', oi.product_name,
            'size', oi.size,
            'quantity', oi.quantity,
            'unit_price', oi.unit_price,
            'line_total', oi.line_total
        )
    ) INTO v_items
    FROM public.order_items oi
    WHERE oi.order_id = v_order.id;

    -- 5. Return sanitized tracking payload (strictly excluding customer PII and internal admin notes)
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
        'shipped_at', v_order.shipped_at,
        'delivered_at', v_order.delivered_at,
        'cancelled_at', v_order.cancelled_at,
        'items', COALESCE(v_items, '[]'::jsonb)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- Grant execution permission to anonymous and authenticated users
GRANT EXECUTE ON FUNCTION public.track_order_public(TEXT, TEXT) TO anon, authenticated;
