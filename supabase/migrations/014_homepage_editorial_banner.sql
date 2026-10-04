-- ==============================================================================
-- SCENTE — Homepage Editorial Banner Table & RLS Policies
-- Enables dynamic editorial campaign banner management from Admin Panel
-- ==============================================================================

-- 1. CREATE 'homepage_editorial_banner' TABLE
CREATE TABLE IF NOT EXISTS public.homepage_editorial_banner (
    id TEXT PRIMARY KEY DEFAULT 'primary_editorial_banner',
    image_url TEXT NOT NULL DEFAULT '/images/campaign/perfume-dark-editorial.jpg',
    mobile_image_url TEXT DEFAULT NULL,
    storage_path TEXT DEFAULT NULL,
    mobile_storage_path TEXT DEFAULT NULL,
    title TEXT DEFAULT NULL,
    subtitle TEXT DEFAULT NULL,
    button_text TEXT DEFAULT NULL,
    button_link TEXT DEFAULT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. ENABLE ROW LEVEL SECURITY (RLS)
ALTER TABLE public.homepage_editorial_banner ENABLE ROW LEVEL SECURITY;

-- 3. RLS POLICIES

-- Allow public read access to all users (storefront)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'homepage_editorial_banner'
          AND policyname = 'Public can view active editorial banner'
    ) THEN
        CREATE POLICY "Public can view active editorial banner"
            ON public.homepage_editorial_banner FOR SELECT
            USING (true);
    END IF;
END $$;

-- Allow authenticated administrators to insert/update/delete editorial banner
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'homepage_editorial_banner'
          AND policyname = 'Admins can insert editorial banner'
    ) THEN
        CREATE POLICY "Admins can insert editorial banner"
            ON public.homepage_editorial_banner FOR INSERT
            WITH CHECK (public.is_admin());
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'homepage_editorial_banner'
          AND policyname = 'Admins can update editorial banner'
    ) THEN
        CREATE POLICY "Admins can update editorial banner"
            ON public.homepage_editorial_banner FOR UPDATE
            USING (public.is_admin())
            WITH CHECK (public.is_admin());
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'homepage_editorial_banner'
          AND policyname = 'Admins can delete editorial banner'
    ) THEN
        CREATE POLICY "Admins can delete editorial banner"
            ON public.homepage_editorial_banner FOR DELETE
            USING (public.is_admin());
    END IF;
END $$;

-- 4. SEED INITIAL PRIMARY EDITORIAL BANNER ROW
INSERT INTO public.homepage_editorial_banner (
    id,
    image_url,
    mobile_image_url,
    title,
    subtitle,
    button_text,
    button_link,
    is_active
) VALUES (
    'primary_editorial_banner',
    '/images/campaign/perfume-dark-editorial.jpg',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    true
)
ON CONFLICT (id) DO NOTHING;
