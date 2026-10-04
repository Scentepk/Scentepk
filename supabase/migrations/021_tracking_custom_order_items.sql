-- ==============================================================================
-- 021_tracking_custom_order_items.sql
-- SCENTE — Support Bespoke Custom Perfume Formulations in Public Order Tracking
-- ==============================================================================

-- Updates public.track_order_public to include is_custom and custom_configuration
-- in order_items aggregation so customers tracking bespoke orders receive their
-- formulation summary and options while preserving dual-factor lookup security.

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

    -- 4. Aggregate items for tracking display (includes bespoke formulation snapshot)
    SELECT jsonb_agg(
        jsonb_build_object(
            'product_name', oi.product_name,
            'size', oi.size,
            'quantity', oi.quantity,
            'unit_price', oi.unit_price,
            'line_total', oi.line_total,
            'is_custom', COALESCE(oi.is_custom, false),
            'custom_configuration', oi.custom_configuration
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
