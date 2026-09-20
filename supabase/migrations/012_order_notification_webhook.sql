-- ==============================================================================
-- 012_order_notification_webhook.sql
-- SCENTÉ — Automatic Order Email Notification Trigger via pg_net
-- ==============================================================================

-- 1. Ensure pg_net extension is enabled
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- 2. Trigger function to dispatch asynchronous HTTP POST to send-order-email Edge Function
-- Runs strictly AFTER INSERT on public.orders, non-blocking, executes only on committed transactions.
CREATE OR REPLACE FUNCTION public.send_order_email_on_insert()
RETURNS TRIGGER AS $$
DECLARE
    v_request_id BIGINT;
    v_payload JSONB;
BEGIN
    -- Only trigger for newly created orders that have not already had an email sent
    IF NEW.notification_sent_at IS NOT NULL THEN
        RETURN NEW;
    END IF;

    v_payload := jsonb_build_object(
        'type', 'INSERT',
        'table', 'orders',
        'schema', 'public',
        'record', row_to_json(NEW)
    );

    SELECT net.http_post(
        url := 'https://uungyqinfveuxtaxettk.supabase.co/functions/v1/send-order-email',
        headers := jsonb_build_object(
            'Content-Type', 'application/json'
        ),
        body := v_payload
    ) INTO v_request_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions;

-- 3. Attach trigger to public.orders
DROP TRIGGER IF EXISTS trg_send_order_email_on_insert ON public.orders;
CREATE TRIGGER trg_send_order_email_on_insert
AFTER INSERT ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.send_order_email_on_insert();
