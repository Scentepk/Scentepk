-- ==============================================================================
-- SCENTÉ — Phase 2B: Secure Customer Order Cancellation & Inventory Restoration
-- Migration: 006_customer_order_cancellation.sql
-- ==============================================================================

-- SECURE CUSTOMER ORDER CANCELLATION RPC
-- 1. Requires dual-factor verification: Order Reference AND Customer Phone number.
-- 2. Authorization: Permitted ONLY on pre-dispatch orders ('pending', 'confirmed', 'processing').
-- 3. Strict Denial: Orders that are 'shipped' or 'delivered' can NEVER be cancelled by customer.
-- 4. Idempotency: Repeated calls will NOT restore stock twice.
-- 5. Inventory Restoration: Directly restores exact variant_id stock and synchronizes products.
-- 6. SECURITY DEFINER with public search_path, preventing privilege escalation.
CREATE OR REPLACE FUNCTION public.cancel_order_customer(
    p_reference TEXT,
    p_phone TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_clean_ref TEXT;
    v_clean_input_phone TEXT;
    v_order RECORD;
    v_item RECORD;
    v_legacy_match_count INTEGER;
    v_legacy_variant_id UUID;
    v_restored_count INTEGER := 0;
BEGIN
    -- 1. Input Sanitization
    v_clean_ref := UPPER(TRIM(COALESCE(p_reference, '')));
    -- Normalize phone: strip spaces, dashes, parentheses, dots, non-digits
    v_clean_input_phone := REGEXP_REPLACE(COALESCE(p_phone, ''), '[^0-9]', '', 'g');

    IF v_clean_ref = '' OR v_clean_input_phone = '' THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Order reference and customer mobile phone are required.'
        );
    END IF;

    -- 2. Lock and fetch order with dual-factor verification
    SELECT * INTO v_order
    FROM public.orders
    WHERE UPPER(TRIM(reference)) = v_clean_ref
      AND (
        REGEXP_REPLACE(customer_phone, '[^0-9]', '', 'g') = v_clean_input_phone
        OR RIGHT(REGEXP_REPLACE(customer_phone, '[^0-9]', '', 'g'), 9) = RIGHT(v_clean_input_phone, 9)
      )
    FOR UPDATE;

    -- Return uniform failure if order not found or phone mismatch (prevents enumeration)
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Order not found or mobile phone verification failed.'
        );
    END IF;

    -- 3. Idempotency Guard: If already cancelled, do NOT restore stock again
    IF v_order.status = 'cancelled' OR v_order.cancelled_at IS NOT NULL THEN
        RETURN jsonb_build_object(
            'success', true,
            'already_cancelled', true,
            'message', 'Order is already marked as cancelled.',
            'order_id', v_order.id,
            'reference', v_order.reference,
            'status', 'cancelled',
            'cancelled_at', v_order.cancelled_at
        );
    END IF;

    -- 4. Status Validation: Cancellation allowed ONLY prior to courier dispatch
    -- Allowed: 'pending', 'confirmed', 'processing'
    -- Strictly disallowed: 'shipped', 'delivered', or any other status
    IF v_order.status NOT IN ('pending', 'confirmed', 'processing') THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', FORMAT('Order cannot be cancelled because it is already %s.', UPPER(v_order.status))
        );
    END IF;

    -- 5. Restore stock strictly based on order_items.variant_id + quantity
    FOR v_item IN
        SELECT variant_id, product_id, size, quantity
        FROM public.order_items
        WHERE order_id = v_order.id
    LOOP
        IF v_item.variant_id IS NOT NULL THEN
            -- Directly restore variant stock by UUID
            UPDATE public.product_variants
            SET stock_quantity = stock_quantity + v_item.quantity,
                updated_at = NOW()
            WHERE id = v_item.variant_id;
        ELSIF v_item.product_id IS NOT NULL AND v_item.size IS NOT NULL THEN
            -- Historical order item without variant_id: verify uniqueness
            SELECT COUNT(*), MIN(id) INTO v_legacy_match_count, v_legacy_variant_id
            FROM public.product_variants
            WHERE product_id = v_item.product_id AND size = v_item.size;

            IF v_legacy_match_count = 1 THEN
                UPDATE public.product_variants
                SET stock_quantity = stock_quantity + v_item.quantity,
                    updated_at = NOW()
                WHERE id = v_legacy_variant_id;
            END IF;
        END IF;

        -- Recalculate base product stock transactionally from active variants
        IF v_item.product_id IS NOT NULL THEN
            PERFORM public.sync_product_inventory_from_variants(v_item.product_id);
        END IF;

        v_restored_count := v_restored_count + v_item.quantity;
    END LOOP;

    -- 6. Mark order as cancelled with server timestamp
    UPDATE public.orders
    SET status = 'cancelled',
        cancelled_at = NOW(),
        updated_at = NOW()
    WHERE id = v_order.id;

    RETURN jsonb_build_object(
        'success', true,
        'already_cancelled', false,
        'order_id', v_order.id,
        'reference', v_order.reference,
        'status', 'cancelled',
        'cancelled_at', NOW(),
        'restored_units', v_restored_count,
        'message', 'Your order has been cancelled successfully. Reserved inventory has been returned.'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Grant execution permission to anonymous and authenticated users
GRANT EXECUTE ON FUNCTION public.cancel_order_customer(TEXT, TEXT) TO anon, authenticated;

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';

