-- ==============================================================================
-- SCENTÉ — Phase 3D: Variant-Level Inventory & Transactional Checkout
-- ==============================================================================

-- 1. HARDEN ORDER REFERENCE (Safe unique index to prevent reference collisions)
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_reference_unique ON public.orders(reference);

-- 2. EXTEND ORDER_ITEMS WITH VARIANT_ID (Safe, non-breaking for existing orders)
ALTER TABLE public.order_items
ADD COLUMN IF NOT EXISTS variant_id UUID REFERENCES public.product_variants(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_order_items_variant_id ON public.order_items(variant_id);


-- 3. PROTECT HISTORICAL ORDER VARIANTS (Trigger-level safety)
-- Variants referenced by past orders are never hard-deleted; they are deactivated instead.
CREATE OR REPLACE FUNCTION public.prevent_hard_delete_referenced_variants()
RETURNS TRIGGER AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM public.order_items WHERE variant_id = OLD.id) THEN
        -- Instead of hard deleting, soft-deactivate to protect historical orders and foreign keys
        UPDATE public.product_variants
        SET is_active = false,
            updated_at = NOW()
        WHERE id = OLD.id;
        RETURN NULL; -- Aborts hard DELETE; preserves row in product_variants with is_active = false
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_protect_referenced_variants ON public.product_variants;
CREATE TRIGGER trg_protect_referenced_variants
BEFORE DELETE ON public.product_variants
FOR EACH ROW
EXECUTE FUNCTION public.prevent_hard_delete_referenced_variants();


-- 4. HELPER: SYNC BASE PRODUCT STOCK & STATUS FROM ACTIVE VARIANTS
-- product_variants is the authoritative single source of truth.
-- products.stock_quantity is transactionally derived from active variants.
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


-- 5. ATOMIC TRANSACTIONAL COD ORDER CREATION RPC
-- Architecture:
-- 1. Validate customer input and harden p_items (must be non-null JSON array).
-- 2. Reject duplicate variant_id occurrences within the checkout payload.
-- 3. Require variant_id for every checkout item (no silent fallback).
-- 4. Lock each required variant row using FOR UPDATE to prevent race conditions.
-- 5. Confirm sufficient stock for EVERY item (all-or-nothing atomicity).
-- 6. Generate collision-free order reference (SC-XXXXXX).
-- 7. Deduct variant stock directly.
-- 8. Insert order record.
-- 9. Insert order_items records with exact variant_id UUID and verified size.
-- 10. Transactionally recalculate base product stock from active variants.
-- 11. If ANY step fails -> full PostgreSQL transaction ROLLBACK.
CREATE OR REPLACE FUNCTION public.create_cod_order(
    p_customer_full_name TEXT,
    p_customer_phone TEXT,
    p_customer_email TEXT,
    p_shipping_address TEXT,
    p_city TEXT,
    p_province TEXT,
    p_postal_code TEXT,
    p_items JSONB -- Array of { "variant_id": "...", "product_id": "...", "quantity": 1 }
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
    v_total INTEGER := 0;
    v_order_record RECORD;
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
    -- Server calculates all prices; client cannot supply price, subtotal, or total.
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_qty := (v_item->>'quantity')::INTEGER;
        IF v_qty IS NULL OR v_qty <= 0 THEN
            RAISE EXCEPTION 'Item quantity must be greater than zero';
        END IF;

        -- Require variant_id for all new checkout requests
        IF (v_item->>'variant_id') IS NULL OR TRIM(v_item->>'variant_id') = '' THEN
            RAISE EXCEPTION 'Checkout item requires a valid variant_id. Fallback resolution is disabled for new orders.';
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

        -- Validate product_id match if product_id is also supplied
        IF (v_item->>'product_id') IS NOT NULL AND v_variant.product_id != (v_item->>'product_id') THEN
            RAISE EXCEPTION 'Variant does not belong to the specified product.';
        END IF;

        -- Check variant active status
        IF NOT v_variant.is_active THEN
            RAISE EXCEPTION 'Sorry, one or more items in your cart are no longer available in the requested quantity.';
        END IF;

        -- Check variant stock (Source of Truth)
        IF v_variant.stock_quantity < v_qty THEN
            RAISE EXCEPTION 'Sorry, one or more items in your cart are no longer available in the requested quantity.';
        END IF;

        -- Verify base product exists and is active
        SELECT * INTO v_product
        FROM public.products
        WHERE id = v_variant.product_id AND is_active = true;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Sorry, one or more items in your cart are no longer available.';
        END IF;

        -- Server calculates unit price exclusively from variant (or base product fallback)
        v_unit_price := COALESCE(v_variant.price, v_product.price);
        v_line_total := v_unit_price * v_qty;
        v_subtotal := v_subtotal + v_line_total;
    END LOOP;

    v_total := v_subtotal + v_delivery_fee;

    -- 3. Generate unique order reference (SC-XXXXXX) with collision guard
    LOOP
        v_reference := 'SC-' || LPAD(FLOOR(RANDOM() * 900000 + 100000)::TEXT, 6, '0');
        EXIT WHEN NOT EXISTS (SELECT 1 FROM public.orders WHERE reference = v_reference);
    END LOOP;

    -- 4. Insert Order Record
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
        v_total,
        'pending'
    ) RETURNING * INTO v_order_record;

    v_order_id := v_order_record.id;

    -- 5. Deduct Variant Stock, Insert Order Items with variant_id, and Sync Product Stock
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

        -- Insert order item with exact variant_id UUID and verified size
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

        -- Atomically deduct stock directly from variant
        UPDATE public.product_variants
        SET stock_quantity = stock_quantity - v_qty,
            updated_at = NOW()
        WHERE id = v_variant.id;

        -- Recalculate base product stock transactionally from active variants
        PERFORM public.sync_product_inventory_from_variants(v_product.id);
    END LOOP;

    -- Return clean confirmation object
    RETURN jsonb_build_object(
        'id', v_order_record.id,
        'reference', v_order_record.reference,
        'customer_full_name', v_order_record.customer_full_name,
        'city', v_order_record.city,
        'province', v_order_record.province,
        'payment_method', v_order_record.payment_method,
        'subtotal', v_order_record.subtotal,
        'delivery_fee', v_order_record.delivery_fee,
        'total', v_order_record.total,
        'status', v_order_record.status,
        'created_at', v_order_record.created_at
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.create_cod_order(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB) TO anon, authenticated;


-- 6. IDEMPOTENT ORDER CANCELLATION & INVENTORY RESTORATION RPC
-- Restores stock strictly based on order_items.variant_id + quantity.
-- Historical order fallback strictly verifies single unique variant match.
-- Idempotency Guard: Only restores on the first transition to cancelled.
CREATE OR REPLACE FUNCTION public.cancel_order_and_restore_stock(
    p_order_id TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_order RECORD;
    v_item RECORD;
    v_legacy_match_count INTEGER;
    v_legacy_variant_id UUID;
    v_restored_count INTEGER := 0;
BEGIN
    -- 1. Authorization: Verify administrator privileges
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Unauthorized: Only SCENTÉ Atelier administrators can cancel orders.';
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

    -- 4. Restore stock strictly based on order_items.variant_id + quantity
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
            ELSIF v_legacy_match_count > 1 THEN
                RAISE EXCEPTION 'Ambiguous historical item for product "%" and size "%": multiple variants matched (% found). Admin manual resolution required.', v_item.product_id, v_item.size, v_legacy_match_count;
            ELSE
                RAISE EXCEPTION 'Matching variant not found for historical order item (product "%", size "%"). Admin manual resolution required.', v_item.product_id, v_item.size;
            END IF;
        END IF;

        -- Recalculate base product stock transactionally from active variants
        IF v_item.product_id IS NOT NULL THEN
            PERFORM public.sync_product_inventory_from_variants(v_item.product_id);
        END IF;

        v_restored_count := v_restored_count + v_item.quantity;
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
