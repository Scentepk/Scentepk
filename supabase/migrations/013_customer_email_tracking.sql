-- ==============================================================================
-- 013_customer_email_tracking.sql
-- SCENTÉ — Add customer_email_sent_at timestamp to orders table for idempotency
-- ==============================================================================

ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS customer_email_sent_at TIMESTAMPTZ NULL;

CREATE INDEX IF NOT EXISTS idx_orders_customer_email_sent_at ON public.orders(customer_email_sent_at);
