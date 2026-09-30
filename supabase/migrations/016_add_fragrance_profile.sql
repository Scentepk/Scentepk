-- ==============================================================================
-- SCENTÉ — Phase 4A: Fragrance Profile Recommendation Metadata
-- Supports deterministic "Find Your Scent" recommendation engine
-- ==============================================================================

-- 1. Add fragrance_profile JSONB column to products table with safe default structure
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS fragrance_profile JSONB DEFAULT '{
  "scent_families": [],
  "intensity": null,
  "moods": [],
  "occasions": [],
  "seasons": []
}'::jsonb;

-- 2. Backfill any existing rows where fragrance_profile is NULL
UPDATE public.products
SET fragrance_profile = '{
  "scent_families": [],
  "intensity": null,
  "moods": [],
  "occasions": [],
  "seasons": []
}'::jsonb
WHERE fragrance_profile IS NULL;

-- 3. Schema commentary
COMMENT ON COLUMN public.products.fragrance_profile IS 'Structured JSON metadata used by the fragrance recommendation engine: scent_families, intensity, moods, occasions, seasons.';
