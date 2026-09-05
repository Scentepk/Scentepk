-- ==============================================================================
-- SCENTÉ — Phase 3A: Supabase Database Schema & Security Foundation
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. PROFILES & ROLES (Admin Authentication Foundation)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('admin', 'customer')),
    full_name TEXT,
    phone TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger to create profile record when an auth user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, role)
    VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', 'customer')
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Helper function to check if current requesting user is an admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;


-- 3. PRODUCTS TABLE
CREATE TABLE IF NOT EXISTS public.products (
    id TEXT PRIMARY KEY, -- e.g. 'scente-noir'
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    subtitle TEXT DEFAULT 'Extrait de Parfum',
    tagline TEXT,
    description TEXT,
    concentration TEXT DEFAULT '30% Pure Perfume Oil',
    family TEXT NOT NULL, -- e.g. 'woody'
    families JSONB NOT NULL DEFAULT '[]'::jsonb, -- e.g. ["woody", "amber"]
    olfactive_family TEXT, -- e.g. 'Smoky Woods & Black Leather'
    price INTEGER NOT NULL CHECK (price >= 0),
    currency TEXT NOT NULL DEFAULT 'PKR',
    volume TEXT NOT NULL DEFAULT '50ml / 1.7 FL. OZ.',
    primary_image TEXT NOT NULL,
    secondary_image TEXT,
    mood TEXT,
    notes JSONB NOT NULL DEFAULT '{"top": [], "heart": [], "base": []}'::jsonb,
    stock_quantity INTEGER NOT NULL DEFAULT 100 CHECK (stock_quantity >= 0),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- 4. PRODUCT VARIANTS TABLE (Supports different flacon sizes & prices)
CREATE TABLE IF NOT EXISTS public.product_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    size TEXT NOT NULL, -- e.g. '50ml', '30ml', '100ml'
    volume TEXT NOT NULL, -- e.g. '50ml / 1.7 FL. OZ.'
    price INTEGER NOT NULL CHECK (price >= 0),
    stock_quantity INTEGER NOT NULL DEFAULT 50 CHECK (stock_quantity >= 0),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_product_size UNIQUE (product_id, size)
);


-- 5. PRODUCT IMAGES TABLE (Storage integration)
CREATE TABLE IF NOT EXISTS public.product_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    storage_path TEXT,
    public_url TEXT NOT NULL,
    alt_text TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_primary BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- 6. ORDERS TABLE
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reference TEXT NOT NULL UNIQUE, -- e.g. 'SC-849204'
    customer_full_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    customer_email TEXT,
    shipping_address TEXT NOT NULL,
    city TEXT NOT NULL,
    province TEXT NOT NULL,
    postal_code TEXT,
    payment_method TEXT NOT NULL DEFAULT 'cod' CHECK (payment_method IN ('cod')),
    subtotal INTEGER NOT NULL CHECK (subtotal >= 0),
    delivery_fee INTEGER NOT NULL DEFAULT 0 CHECK (delivery_fee >= 0),
    total INTEGER NOT NULL CHECK (total >= 0),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- 7. ORDER ITEMS TABLE (Immutable snapshot of price & title at purchase time)
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id TEXT REFERENCES public.products(id) ON DELETE SET NULL,
    product_name TEXT NOT NULL,
    product_slug TEXT NOT NULL,
    size TEXT NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price INTEGER NOT NULL CHECK (unit_price >= 0),
    line_total INTEGER NOT NULL CHECK (line_total >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- 8. INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_products_slug ON public.products(slug);
CREATE INDEX IF NOT EXISTS idx_products_active ON public.products(is_active);
CREATE INDEX IF NOT EXISTS idx_product_variants_product_id ON public.product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_orders_reference ON public.orders(reference);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);


-- 9. ROW LEVEL SECURITY (RLS) POLICIES

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- PROFILES POLICIES
CREATE POLICY "Users can read own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
    ON public.profiles FOR SELECT
    USING (public.is_admin());

CREATE POLICY "Admins can update profiles"
    ON public.profiles FOR UPDATE
    USING (public.is_admin());

-- PRODUCTS POLICIES
CREATE POLICY "Public can view active products"
    ON public.products FOR SELECT
    USING (is_active = true);

CREATE POLICY "Admins have full access to products"
    ON public.products FOR ALL
    USING (public.is_admin());

-- PRODUCT VARIANTS POLICIES
CREATE POLICY "Public can view active variants"
    ON public.product_variants FOR SELECT
    USING (is_active = true);

CREATE POLICY "Admins have full access to variants"
    ON public.product_variants FOR ALL
    USING (public.is_admin());

-- PRODUCT IMAGES POLICIES
CREATE POLICY "Public can view product images"
    ON public.product_images FOR SELECT
    USING (true);

CREATE POLICY "Admins have full access to product images"
    ON public.product_images FOR ALL
    USING (public.is_admin());

-- ORDERS POLICIES
-- Anonymous / customers cannot list all orders. Admins can manage all orders.
CREATE POLICY "Admins have full access to orders"
    ON public.orders FOR ALL
    USING (public.is_admin());

-- ORDER ITEMS POLICIES
CREATE POLICY "Admins have full access to order items"
    ON public.order_items FOR ALL
    USING (public.is_admin());


-- 10. ATOMIC SERVER-SIDE COD ORDER CREATION FUNCTION
-- Prevents price tampering by computing subtotal and totals strictly from database records.
CREATE OR REPLACE FUNCTION public.create_cod_order(
    p_customer_full_name TEXT,
    p_customer_phone TEXT,
    p_customer_email TEXT,
    p_shipping_address TEXT,
    p_city TEXT,
    p_province TEXT,
    p_postal_code TEXT,
    p_items JSONB -- Array of { "product_id": "...", "size": "...", "quantity": 1 }
)
RETURNS JSONB AS $$
DECLARE
    v_order_id UUID;
    v_reference TEXT;
    v_item JSONB;
    v_product RECORD;
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

    IF jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'Order must contain at least one item';
    END IF;

    -- 2. Generate unique order reference (e.g. SC-849204)
    v_reference := 'SC-' || LPAD(FLOOR(RANDOM() * 900000 + 100000)::TEXT, 6, '0');

    -- 3. Calculate verified server-side prices and validate stock
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        IF (v_item->>'quantity')::INTEGER <= 0 THEN
            RAISE EXCEPTION 'Item quantity must be greater than zero';
        END IF;

        SELECT * INTO v_product
        FROM public.products
        WHERE id = (v_item->>'product_id') AND is_active = true;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Product with ID % is unavailable', (v_item->>'product_id');
        END IF;

        -- Verify stock on base product
        IF v_product.stock_quantity < (v_item->>'quantity')::INTEGER THEN
            RAISE EXCEPTION 'Insufficient stock available for %', v_product.name;
        END IF;

        -- Check if variant price exists, otherwise use base product price
        SELECT price INTO v_unit_price
        FROM public.product_variants
        WHERE product_id = v_product.id AND size = (v_item->>'size') AND is_active = true;

        IF v_unit_price IS NULL THEN
            v_unit_price := v_product.price;
        END IF;

        v_line_total := v_unit_price * (v_item->>'quantity')::INTEGER;
        v_subtotal := v_subtotal + v_line_total;
    END LOOP;

    v_total := v_subtotal + v_delivery_fee;

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

    -- 5. Insert Order Items Snapshot & Decrement Stock
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        SELECT * INTO v_product
        FROM public.products
        WHERE id = (v_item->>'product_id');

        SELECT price INTO v_unit_price
        FROM public.product_variants
        WHERE product_id = v_product.id AND size = (v_item->>'size');

        IF v_unit_price IS NULL THEN
            v_unit_price := v_product.price;
        END IF;

        v_line_total := v_unit_price * (v_item->>'quantity')::INTEGER;

        INSERT INTO public.order_items (
            order_id,
            product_id,
            product_name,
            product_slug,
            size,
            quantity,
            unit_price,
            line_total
        ) VALUES (
            v_order_id,
            v_product.id,
            v_product.name,
            v_product.slug,
            v_item->>'size',
            (v_item->>'quantity')::INTEGER,
            v_unit_price,
            v_line_total
        );

        -- Atomically decrement stock
        UPDATE public.products
        SET stock_quantity = stock_quantity - (v_item->>'quantity')::INTEGER
        WHERE id = v_product.id;

        UPDATE public.product_variants
        SET stock_quantity = stock_quantity - (v_item->>'quantity')::INTEGER
        WHERE product_id = v_product.id AND size = (v_item->>'size');
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

