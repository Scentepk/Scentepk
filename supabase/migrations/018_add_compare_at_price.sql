-- ==============================================================================
-- SCENTE — Phase 7: Sale / Compare-at Pricing System
-- Migration 018: Add compare_at_price to products and product_variants
-- ==============================================================================

-- 1. ADD COMPARE-AT PRICE TO PUBLIC.PRODUCTS (Main display compare-at price)
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS compare_at_price INTEGER DEFAULT NULL
CHECK (compare_at_price IS NULL OR compare_at_price >= 0);

COMMENT ON COLUMN public.products.compare_at_price IS
'Original / previous price shown with a strikethrough. The authoritative selling price remains in price.';

-- 2. ADD COMPARE-AT PRICE TO PUBLIC.PRODUCT_VARIANTS (Per bottle-size compare-at price)
ALTER TABLE public.product_variants
ADD COLUMN IF NOT EXISTS compare_at_price INTEGER DEFAULT NULL
CHECK (compare_at_price IS NULL OR compare_at_price >= 0);

COMMENT ON COLUMN public.product_variants.compare_at_price IS
'Variant-level original price shown with a strikethrough. The authoritative selling price remains in price.';
