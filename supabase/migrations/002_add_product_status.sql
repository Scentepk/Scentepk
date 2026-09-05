-- ==============================================================================
-- SCENTÉ — Phase 3B: Product Status Column & Integrity Migration
-- ==============================================================================

-- Add status column if it does not already exist
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active' 
CHECK (status IN ('active', 'inactive', 'out_of_stock'));

-- Backfill / align existing records based on is_active and stock_quantity
UPDATE public.products 
SET status = CASE 
    WHEN is_active = false THEN 'inactive'
    WHEN stock_quantity = 0 THEN 'out_of_stock'
    ELSE 'active'
END
WHERE status IS NULL OR status = 'active';

-- Index for performant querying by status and active state
CREATE INDEX IF NOT EXISTS idx_products_status ON public.products (status);
