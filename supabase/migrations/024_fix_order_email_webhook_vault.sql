-- ==============================================================================
-- 024_fix_order_email_webhook_vault.sql
-- SCENTÉ — Fix Vault Secret Decryption in Order Notification Webhook Trigger
-- ==============================================================================

-- 1. Ensure extensions exist in proper schemas
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS supabase_vault WITH SCHEMA vault;

-- 2. Recreate send_order_email_on_insert with search_path including vault and pgsodium
-- Resolves the issue where pgsodium / vault decryption failed under isolated search_path,
-- ensuring the order_webhook_secret is successfully read and passed in request headers.
CREATE OR REPLACE FUNCTION public.send_order_email_on_insert()
RETURNS TRIGGER AS $$
DECLARE
    v_request_id BIGINT;
    v_payload JSONB;
    v_webhook_secret TEXT;
    v_headers JSONB;
BEGIN
    -- Only trigger for newly created orders that have not already had an email sent
    IF NEW.notification_sent_at IS NOT NULL THEN
        RETURN NEW;
    END IF;

    -- Dynamically check for server-configured secret from database settings or Vault
    v_webhook_secret := NULLIF(current_setting('app.settings.order_webhook_secret', true), '');
    IF v_webhook_secret IS NULL THEN
        BEGIN
            SELECT decrypted_secret INTO v_webhook_secret
            FROM vault.decrypted_secrets
            WHERE name = 'order_webhook_secret'
            LIMIT 1;
        EXCEPTION WHEN OTHERS THEN
            v_webhook_secret := NULL;
        END;
    END IF;

    -- Standard Content-Type header
    v_headers := jsonb_build_object(
        'Content-Type', 'application/json'
    );

    -- Attach webhook secret headers for Edge Function authentication
    IF v_webhook_secret IS NOT NULL THEN
        v_headers := v_headers || jsonb_build_object(
            'x-webhook-secret', v_webhook_secret,
            'Authorization', 'Bearer ' || v_webhook_secret
        );
    END IF;

    -- Prepare payload matching send-order-email expectation
    v_payload := jsonb_build_object(
        'type', 'INSERT',
        'table', 'orders',
        'schema', 'public',
        'record', row_to_json(NEW)
    );

    -- Dispatch asynchronous HTTP POST to send-order-email Edge Function
    SELECT net.http_post(
        url := 'https://uungyqinfveuxtaxettk.supabase.co/functions/v1/send-order-email',
        headers := v_headers,
        body := v_payload
    ) INTO v_request_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions, vault, pgsodium;

-- 3. Ensure trigger is attached to public.orders
DROP TRIGGER IF EXISTS trg_send_order_email_on_insert ON public.orders;
CREATE TRIGGER trg_send_order_email_on_insert
AFTER INSERT ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.send_order_email_on_insert();

-- 4. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
