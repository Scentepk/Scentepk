-- ==============================================================================
-- SCENTÉ — Phase 3B: Supabase Storage Configuration & RLS Policies
-- Bucket: 'product-images' (Public read for storefront, Admin-only write/delete)
-- ==============================================================================

-- 1. REGISTER 'product-images' STORAGE BUCKET
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'product-images',
    'product-images',
    true,
    5242880, -- 5MB limit
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. STORAGE RLS POLICIES ON storage.objects

-- Allow public read access to all objects in 'product-images' bucket
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'storage'
          AND tablename = 'objects'
          AND policyname = 'Public can view product images'
    ) THEN
        CREATE POLICY "Public can view product images"
            ON storage.objects FOR SELECT
            USING (bucket_id = 'product-images');
    END IF;
END $$;

-- Restrict uploads to authenticated administrators
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'storage'
          AND tablename = 'objects'
          AND policyname = 'Admins can upload product images'
    ) THEN
        CREATE POLICY "Admins can upload product images"
            ON storage.objects FOR INSERT
            WITH CHECK (
                bucket_id = 'product-images'
                AND public.is_admin()
            );
    END IF;
END $$;

-- Restrict updates/overwrites to authenticated administrators
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'storage'
          AND tablename = 'objects'
          AND policyname = 'Admins can update product images'
    ) THEN
        CREATE POLICY "Admins can update product images"
            ON storage.objects FOR UPDATE
            USING (
                bucket_id = 'product-images'
                AND public.is_admin()
            );
    END IF;
END $$;

-- Restrict deletions to authenticated administrators
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'storage'
          AND tablename = 'objects'
          AND policyname = 'Admins can delete product images'
    ) THEN
        CREATE POLICY "Admins can delete product images"
            ON storage.objects FOR DELETE
            USING (
                bucket_id = 'product-images'
                AND public.is_admin()
            );
    END IF;
END $$;
