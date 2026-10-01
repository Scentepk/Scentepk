-- ==============================================================================
-- SCENTÉ — Migration 019: Custom Perfume Builder Database Architecture
-- Feature: BUILD YOUR SCENTÉ (Bespoke Perfume Builder & Dynamic Pricing)
-- ==============================================================================

-- 1. BUILDER SETTINGS (Global Singleton Configuration)
CREATE TABLE IF NOT EXISTS public.custom_builder_settings (
    id TEXT PRIMARY KEY DEFAULT 'primary_builder_settings',
    is_active BOOLEAN NOT NULL DEFAULT false,
    base_price INTEGER NOT NULL DEFAULT 0 CHECK (base_price >= 0),
    currency TEXT NOT NULL DEFAULT 'PKR',
    title TEXT NOT NULL DEFAULT 'BUILD YOUR SCENTÉ',
    subtitle TEXT NOT NULL DEFAULT 'Create a Fragrance That''s Yours',
    description TEXT DEFAULT 'Choose your size, fragrance profile, notes, and intensity to create a scent made around your preferences.',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.custom_builder_settings IS
'Global configuration for the bespoke Custom Perfume Builder, including base price and active status.';

-- 2. BUILDER GROUPS (Customization Steps / Categories)
CREATE TABLE IF NOT EXISTS public.custom_builder_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT DEFAULT NULL,
    selection_type TEXT NOT NULL DEFAULT 'single' CHECK (selection_type IN ('single', 'multiple')),
    is_required BOOLEAN NOT NULL DEFAULT true,
    min_selections INTEGER NOT NULL DEFAULT 1 CHECK (min_selections >= 0),
    max_selections INTEGER NOT NULL DEFAULT 1 CHECK (max_selections >= 1),
    is_active BOOLEAN NOT NULL DEFAULT true,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_builder_group_selections CHECK (max_selections >= min_selections)
);

COMMENT ON TABLE public.custom_builder_groups IS
'Extensible option groups for perfume customization (e.g., size, fragrance profile, notes, intensity, etc.).';

-- 3. BUILDER OPTIONS (Individual Selectable Choices & Pricing Deltas)
CREATE TABLE IF NOT EXISTS public.custom_builder_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES public.custom_builder_groups(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    description TEXT DEFAULT NULL,
    category TEXT DEFAULT NULL,
    price_adjustment INTEGER NOT NULL DEFAULT 0 CHECK (price_adjustment >= 0),
    image_url TEXT DEFAULT NULL,
    storage_path TEXT DEFAULT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_builder_group_option_slug UNIQUE (group_id, slug)
);

COMMENT ON TABLE public.custom_builder_options IS
'Configurable options within each group with integer price adjustments in PKR.';

-- 4. EXTEND ORDER ITEMS TABLE FOR IMMUTABLE HISTORICAL SNAPSHOTS
ALTER TABLE public.order_items
ADD COLUMN IF NOT EXISTS is_custom BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.order_items
ADD COLUMN IF NOT EXISTS custom_configuration JSONB DEFAULT NULL;

COMMENT ON COLUMN public.order_items.is_custom IS
'True if this line item represents a bespoke custom perfume rather than a standard catalog SKU.';

COMMENT ON COLUMN public.order_items.custom_configuration IS
'Immutable JSON snapshot of selected builder options, option names, and price adjustments at purchase time.';

-- 5. PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_builder_groups_active ON public.custom_builder_groups(is_active);
CREATE INDEX IF NOT EXISTS idx_builder_groups_sort ON public.custom_builder_groups(sort_order ASC);
CREATE INDEX IF NOT EXISTS idx_builder_options_group ON public.custom_builder_options(group_id);
CREATE INDEX IF NOT EXISTS idx_builder_options_active ON public.custom_builder_options(is_active);
CREATE INDEX IF NOT EXISTS idx_builder_options_sort ON public.custom_builder_options(sort_order ASC);
CREATE INDEX IF NOT EXISTS idx_order_items_custom ON public.order_items(is_custom) WHERE is_custom = true;

-- 6. ROW LEVEL SECURITY (RLS) POLICIES

-- Enable RLS
ALTER TABLE public.custom_builder_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_builder_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_builder_options ENABLE ROW LEVEL SECURITY;

-- 6A. custom_builder_settings RLS
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'custom_builder_settings'
          AND policyname = 'Public can view active builder settings'
    ) THEN
        CREATE POLICY "Public can view active builder settings"
            ON public.custom_builder_settings FOR SELECT
            USING (is_active = true);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'custom_builder_settings'
          AND policyname = 'Admins can view all builder settings'
    ) THEN
        CREATE POLICY "Admins can view all builder settings"
            ON public.custom_builder_settings FOR SELECT
            USING (public.is_admin());
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'custom_builder_settings'
          AND policyname = 'Admins can manage builder settings'
    ) THEN
        CREATE POLICY "Admins can manage builder settings"
            ON public.custom_builder_settings FOR ALL
            USING (public.is_admin())
            WITH CHECK (public.is_admin());
    END IF;
END $$;

-- 6B. custom_builder_groups RLS
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'custom_builder_groups'
          AND policyname = 'Public can view active builder groups'
    ) THEN
        CREATE POLICY "Public can view active builder groups"
            ON public.custom_builder_groups FOR SELECT
            USING (is_active = true);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'custom_builder_groups'
          AND policyname = 'Admins can view all builder groups'
    ) THEN
        CREATE POLICY "Admins can view all builder groups"
            ON public.custom_builder_groups FOR SELECT
            USING (public.is_admin());
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'custom_builder_groups'
          AND policyname = 'Admins can manage builder groups'
    ) THEN
        CREATE POLICY "Admins can manage builder groups"
            ON public.custom_builder_groups FOR ALL
            USING (public.is_admin())
            WITH CHECK (public.is_admin());
    END IF;
END $$;

-- 6C. custom_builder_options RLS
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'custom_builder_options'
          AND policyname = 'Public can view active builder options'
    ) THEN
        CREATE POLICY "Public can view active builder options"
            ON public.custom_builder_options FOR SELECT
            USING (
                is_active = true
                AND EXISTS (
                    SELECT 1 FROM public.custom_builder_groups g
                    WHERE g.id = group_id AND g.is_active = true
                )
            );
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'custom_builder_options'
          AND policyname = 'Admins can view all builder options'
    ) THEN
        CREATE POLICY "Admins can view all builder options"
            ON public.custom_builder_options FOR SELECT
            USING (public.is_admin());
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'custom_builder_options'
          AND policyname = 'Admins can manage builder options'
    ) THEN
        CREATE POLICY "Admins can manage builder options"
            ON public.custom_builder_options FOR ALL
            USING (public.is_admin())
            WITH CHECK (public.is_admin());
    END IF;
END $$;

-- 7. SEED MINIMAL SINGLETON ROW (Disabled by default, 0 options seeded)
INSERT INTO public.custom_builder_settings (
    id,
    is_active,
    base_price,
    currency,
    title,
    subtitle,
    description
) VALUES (
    'primary_builder_settings',
    false,
    0,
    'PKR',
    'BUILD YOUR SCENTÉ',
    'Create a Fragrance That''s Yours',
    'Choose your size, fragrance profile, notes, and intensity to create a scent made around your preferences.'
)
ON CONFLICT (id) DO NOTHING;
