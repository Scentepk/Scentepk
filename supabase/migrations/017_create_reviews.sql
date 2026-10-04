-- ==============================================================================
-- SCENTE — Phase 6.5: Reviews Management System
-- Migration 017: Create public.reviews table, constraints, indexes & RLS policies
-- ==============================================================================

-- 1. CREATE 'reviews' TABLE
CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_name TEXT NOT NULL,
    review_text TEXT NOT NULL,
    rating SMALLINT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    location TEXT DEFAULT NULL,
    product_id TEXT DEFAULT NULL REFERENCES public.products(id) ON DELETE SET NULL,
    is_published BOOLEAN NOT NULL DEFAULT false,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT check_customer_name_not_empty CHECK (char_length(trim(customer_name)) > 0),
    CONSTRAINT check_review_text_not_empty CHECK (char_length(trim(review_text)) > 0)
);

-- 2. CREATE PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_reviews_published_display
    ON public.reviews(is_published, display_order ASC, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_reviews_product_id
    ON public.reviews(product_id);

-- 3. UPDATED_AT TRIGGER FUNCTION
CREATE OR REPLACE FUNCTION public.handle_reviews_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_reviews_updated_at ON public.reviews;
CREATE TRIGGER trg_reviews_updated_at
    BEFORE UPDATE ON public.reviews
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_reviews_updated_at();

-- 4. ENABLE ROW LEVEL SECURITY
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- 5. RLS POLICIES

-- Public: Can SELECT only published reviews
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'reviews'
          AND policyname = 'Public can view published reviews'
    ) THEN
        CREATE POLICY "Public can view published reviews"
            ON public.reviews FOR SELECT
            USING (is_published = true);
    END IF;
END $$;

-- Admin: Can SELECT all reviews (both published and drafts)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'reviews'
          AND policyname = 'Admins can view all reviews'
    ) THEN
        CREATE POLICY "Admins can view all reviews"
            ON public.reviews FOR SELECT
            USING (public.is_admin());
    END IF;
END $$;

-- Admin: Can INSERT reviews
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'reviews'
          AND policyname = 'Admins can insert reviews'
    ) THEN
        CREATE POLICY "Admins can insert reviews"
            ON public.reviews FOR INSERT
            WITH CHECK (public.is_admin());
    END IF;
END $$;

-- Admin: Can UPDATE reviews
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'reviews'
          AND policyname = 'Admins can update reviews'
    ) THEN
        CREATE POLICY "Admins can update reviews"
            ON public.reviews FOR UPDATE
            USING (public.is_admin())
            WITH CHECK (public.is_admin());
    END IF;
END $$;

-- Admin: Can DELETE reviews
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'reviews'
          AND policyname = 'Admins can delete reviews'
    ) THEN
        CREATE POLICY "Admins can delete reviews"
            ON public.reviews FOR DELETE
            USING (public.is_admin());
    END IF;
END $$;
