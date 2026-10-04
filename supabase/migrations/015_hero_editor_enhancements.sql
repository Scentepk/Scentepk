-- ==============================================================================
-- SCENTE — Phase 3D: Hero Image Editor Enhancements & Positioning
-- Supports independent desktop & mobile crop/zoom and draft vs. published workflow
-- ==============================================================================

-- 1. Add draft_slides column to store working drafts without impacting live website
ALTER TABLE public.hero_settings 
ADD COLUMN IF NOT EXISTS draft_slides JSONB DEFAULT NULL;

-- 2. Add fallback desktop and mobile crop positioning columns for single-slide legacy rows
ALTER TABLE public.hero_settings 
ADD COLUMN IF NOT EXISTS desktop_crop JSONB DEFAULT NULL;

ALTER TABLE public.hero_settings 
ADD COLUMN IF NOT EXISTS mobile_crop JSONB DEFAULT NULL;

-- 3. Comment describing data structure
COMMENT ON COLUMN public.hero_settings.draft_slides IS 'JSON array of unpublished hero slides containing independent desktop_crop and mobile_crop configurations.';
COMMENT ON COLUMN public.hero_settings.slides IS 'JSON array of published hero slides active on the live storefront.';
