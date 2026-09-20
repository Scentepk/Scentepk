-- ==============================================================================
-- 011_order_notification_tracking.sql
-- SCENTÉ — Add notification_sent_at timestamp to orders table for webhook idempotency
-- ==============================================================================

ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS notification_sent_at TIMESTAMPTZ NULL;

CREATE INDEX IF NOT EXISTS idx_orders_notification_sent_at ON public.orders(notification_sent_at);
