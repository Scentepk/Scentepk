-- ==============================================================================
-- SCENTE — Phase 3C: Hero Section Settings Table & RLS Policies
-- Enables dynamic hero background image & copy management from Admin Panel
-- ==============================================================================

-- 1. CREATE 'hero_settings' TABLE
CREATE TABLE IF NOT EXISTS public.hero_settings (
    id TEXT PRIMARY KEY DEFAULT 'primary_hero',
    eyebrow TEXT NOT NULL DEFAULT 'SCENTE — BATCH 04',
    badge TEXT NOT NULL DEFAULT '30% PURE PERFUME OIL',
    headline_line1 TEXT NOT NULL DEFAULT 'FRAGRANCE',
    headline_line2 TEXT NOT NULL DEFAULT 'BECOMES',
    headline_line3 TEXT NOT NULL DEFAULT 'IDENTITY.',
    subtitle TEXT NOT NULL DEFAULT 'Artisanal fragrances crafted for presence, character and lasting impression.',
    cta_text TEXT NOT NULL DEFAULT 'EXPLORE FRAGRANCES',
    cta_link TEXT NOT NULL DEFAULT '/shop',
    image_url TEXT NOT NULL DEFAULT '/images/campaign/hero-campaign-main.jpg',
    mobile_image_url TEXT DEFAULT NULL,
    storage_path TEXT DEFAULT NULL,
    mobile_storage_path TEXT DEFAULT NULL,
    slides JSONB DEFAULT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure slides column exists if table was already created
ALTER TABLE public.hero_settings ADD COLUMN IF NOT EXISTS slides JSONB DEFAULT NULL;

-- 2. ENABLE ROW LEVEL SECURITY (RLS)
ALTER TABLE public.hero_settings ENABLE ROW LEVEL SECURITY;

-- 3. RLS POLICIES

-- Allow public read access to all users (storefront)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'hero_settings'
          AND policyname = 'Public can view active hero settings'
    ) THEN
        CREATE POLICY "Public can view active hero settings"
            ON public.hero_settings FOR SELECT
            USING (true);
    END IF;
END $$;

-- Allow authenticated administrators to insert/update hero settings
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'hero_settings'
          AND policyname = 'Admins can insert hero settings'
    ) THEN
        CREATE POLICY "Admins can insert hero settings"
            ON public.hero_settings FOR INSERT
            WITH CHECK (public.is_admin());
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'hero_settings'
          AND policyname = 'Admins can update hero settings'
    ) THEN
        CREATE POLICY "Admins can update hero settings"
            ON public.hero_settings FOR UPDATE
            USING (public.is_admin())
            WITH CHECK (public.is_admin());
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'hero_settings'
          AND policyname = 'Admins can delete hero settings'
    ) THEN
        CREATE POLICY "Admins can delete hero settings"
            ON public.hero_settings FOR DELETE
            USING (public.is_admin());
    END IF;
END $$;

-- 4. SEED INITIAL PRIMARY HERO ROW
INSERT INTO public.hero_settings (
    id,
    eyebrow,
    badge,
    headline_line1,
    headline_line2,
    headline_line3,
    subtitle,
    cta_text,
    cta_link,
    image_url,
    is_active
) VALUES (
    'primary_hero',
    'SCENTE — BATCH 04',
    '30% PURE PERFUME OIL',
    'FRAGRANCE',
    'BECOMES',
    'IDENTITY.',
    'Artisanal fragrances crafted for presence, character and lasting impression.',
    'EXPLORE FRAGRANCES',
    '/shop',
    '/images/campaign/hero-campaign-main.jpg',
    true
)
ON CONFLICT (id) DO NOTHING;
