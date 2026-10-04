import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-secret, x-supabase-webhook-secret",
};

interface OrderItem {
  id?: string;
  is_custom?: boolean;
  custom_configuration?: {
    base_price?: number;
    total_price?: number;
    formatted_total_price?: string;
    currency?: string;
    summary?: string;
    created_at?: string;
    groups?: Array<{
      group_id?: string;
      group_slug?: string;
      group_name?: string;
      selected_options?: Array<{
        id?: string;
        name?: string;
        slug?: string;
        category?: string | null;
        price_adjustment?: number;
      }>;
    }>;
  } | null;
  product_name?: string;
  name?: string;
  size?: string;
  quantity?: number;
  unit_price?: number;
  price?: number;
  line_total?: number;
}

interface OrderPayload {
  id?: string;
  order_id?: string;
  reference?: string;
  customer_full_name?: string;
  customer_name?: string;
  customer_phone?: string;
  phone?: string;
  customer_email?: string;
  email?: string;
  shipping_address?: string;
  address?: string;
  city?: string;
  province?: string;
  postal_code?: string;
  payment_method?: string;
  subtotal?: number;
  delivery_fee?: number;
  discount_amount?: number;
  promo_code?: string;
  discount_type?: string;
  discount_value?: number;
  total?: number;
  created_at?: string;
  notification_sent_at?: string | null;
  customer_email_sent_at?: string | null;
  items?: OrderItem[];
  order_items?: OrderItem[];
}

Deno.serve(async (req: Request) => {
  // 1. Handle CORS Preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 2. Read Server-Side Secrets
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const ADMIN_NOTIFICATION_EMAIL = Deno.env.get("ADMIN_NOTIFICATION_EMAIL");
    const SITE_URL = Deno.env.get("SITE_URL") || "https://scente.pk";
    const WEBHOOK_SECRET = Deno.env.get("ORDER_WEBHOOK_SECRET");

    // Optional shared secret verification if configured
    if (WEBHOOK_SECRET) {
      const incomingSecret =
        req.headers.get("x-webhook-secret") ||
        req.headers.get("x-supabase-webhook-secret");
      const authHeader = req.headers.get("authorization");
      const isSecretValid =
        incomingSecret === WEBHOOK_SECRET ||
        (authHeader && (authHeader === `Bearer ${WEBHOOK_SECRET}` || authHeader.endsWith(WEBHOOK_SECRET)));

      if (!isSecretValid) {
        console.warn("[send-order-email] Unauthorized request rejected: missing or invalid webhook secret.");
        return new Response(
          JSON.stringify({
            success: false,
            error: "Unauthorized: Invalid webhook secret header.",
          }),
          {
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    if (!RESEND_API_KEY) {
      console.error("[send-order-email] Missing RESEND_API_KEY in environment secrets.");
      return new Response(
        JSON.stringify({
          success: false,
          error: "RESEND_API_KEY is not configured in Supabase Secrets.",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!ADMIN_NOTIFICATION_EMAIL) {
      console.error("[send-order-email] Missing ADMIN_NOTIFICATION_EMAIL in environment secrets.");
      return new Response(
        JSON.stringify({
          success: false,
          error: "ADMIN_NOTIFICATION_EMAIL is not configured in Supabase Secrets.",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 3. Parse Request Payload (Supports direct API invocation & Supabase Database Webhook payloads)
    const rawBody = await req.json();
    const order: OrderPayload = rawBody.record || rawBody;

    const orderId = order.id || order.order_id || "N/A";
    const reference = order.reference || "SC-UNKNOWN";
    const customerName = (order.customer_full_name || order.customer_name || "Valued Client").trim();
    const customerPhone = (order.customer_phone || order.phone || "Not provided").trim();
    const rawCustomerEmail = (order.customer_email || order.email || "").trim();
    const hasCustomerEmail = Boolean(
      rawCustomerEmail &&
      rawCustomerEmail.includes("@") &&
      rawCustomerEmail.toLowerCase() !== "not provided"
    );

    const address = order.shipping_address || order.address || "Not provided";
    const city = order.city || "Not provided";
    const province = order.province || "";
    const postalCode = order.postal_code || "";
    const paymentMethod = (order.payment_method || "cod").toUpperCase();
    const subtotal = Number(order.subtotal || 0);
    const deliveryFee = Number(order.delivery_fee || 0);
    const discountAmount = Number(order.discount_amount || 0);
    const promoCode = order.promo_code || null;
    const total = Number(order.total || 0);
    const createdAt = order.created_at
      ? new Date(order.created_at).toLocaleString("en-PK", {
          timeZone: "Asia/Karachi",
          dateStyle: "medium",
          timeStyle: "short",
        })
      : new Date().toLocaleString("en-PK", {
          timeZone: "Asia/Karachi",
          dateStyle: "medium",
          timeStyle: "short",
        });

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    // 3.5 Idempotency Guard: Check if both admin and customer emails were already dispatched
    let dbAdminSent = Boolean(order.notification_sent_at);
    let dbCustomerSent = Boolean(order.customer_email_sent_at);

    if (supabaseUrl && serviceKey && order.id && order.id !== "test-order-99") {
      try {
        const checkRes = await fetch(
          `${supabaseUrl}/rest/v1/orders?id=eq.${order.id}&select=notification_sent_at,customer_email_sent_at`,
          {
            headers: {
              apikey: serviceKey,
              Authorization: `Bearer ${serviceKey}`,
            },
          }
        );
        if (checkRes.ok) {
          const rows = await checkRes.json();
          if (rows?.[0]) {
            if (rows[0].notification_sent_at) dbAdminSent = true;
            if (rows[0].customer_email_sent_at) dbCustomerSent = true;
          }
        }
      } catch (dbErr) {
        console.warn("[send-order-email] Could not verify email sent status from DB:", dbErr);
      }
    }

    const shouldSendAdmin = !dbAdminSent;
    const shouldSendCustomer = hasCustomerEmail && !dbCustomerSent;

    if (!shouldSendAdmin && (!hasCustomerEmail || dbCustomerSent)) {
      console.log(`[send-order-email] Both admin and customer emails already sent for order ${reference}. Skipping duplicate.`);
      return new Response(
        JSON.stringify({
          success: true,
          skipped: true,
          message: `All notifications already completed for ${reference}`,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 4. Retrieve Line Items if not provided in webhook payload
    let items: OrderItem[] = order.order_items || order.items || [];
    if ((!items || items.length === 0) && order.id && supabaseUrl && serviceKey) {
      try {
        const itemsRes = await fetch(
          `${supabaseUrl}/rest/v1/order_items?order_id=eq.${order.id}&select=*`,
          {
            headers: {
              apikey: serviceKey,
              Authorization: `Bearer ${serviceKey}`,
            },
          }
        );
        if (itemsRes.ok) {
          items = await itemsRes.json();
          console.log(`[send-order-email] Retrieved ${items.length} items from database for order ${reference}`);
        }
      } catch (fetchErr) {
        console.warn("[send-order-email] Could not fetch order_items from DB:", fetchErr);
      }
    }

    // 5. URLs
    const adminOrderUrl = `${SITE_URL.replace(/\/+$/, "")}/admin/orders/${orderId !== "N/A" ? orderId : reference}`;
    const customerTrackUrl = `${SITE_URL.replace(/\/+$/, "")}/track`;

    // 6. Common Line Items HTML — SCENTÉ Haute Parfumerie Editorial Manifest
    function escapeHtml(str: string): string {
      if (!str) return "";
      return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    }

    function buildCustomerItemRowHtml(item: OrderItem): string {
      try {
        const isCustom = Boolean(item.is_custom);
        const name = isCustom ? (item.product_name || "Custom SCENTÉ") : (item.product_name || item.name || "SCENTÉ Fragrance");
        const size = item.size || (isCustom ? "Bespoke Flacon" : "50ml");
        const qty = item.quantity || 1;
        const unitPrice = Number(item.unit_price || item.price || 0);
        const lineTotal = Number(item.line_total || unitPrice * qty);
        const config = item.custom_configuration;

        let formulationHtml = "";
        if (isCustom && config) {
          const summaryText = config.summary
            ? `<div style="font-family: 'Playfair Display', Georgia, serif; font-size: 13px; color: #F2EEE7; font-style: italic; margin-bottom: 8px;">"${escapeHtml(config.summary)}"</div>`
            : "";

          let optionsListHtml = "";
          if (Array.isArray(config.groups) && config.groups.length > 0) {
            optionsListHtml = config.groups
              .map((grp) => {
                const grpName = escapeHtml(grp.group_name || "Notes");
                const opts = Array.isArray(grp.selected_options)
                  ? grp.selected_options.map((o) => escapeHtml(o.name || "")).filter(Boolean).join(", ")
                  : "";
                return opts
                  ? `<div style="font-size: 11px; color: #A39E95; margin-bottom: 4px;"><strong style="color: #BFA27A; font-weight: 500;">${grpName}:</strong> ${opts}</div>`
                  : "";
              })
              .filter(Boolean)
              .join("");
          }

          formulationHtml = `
            <div style="margin-top: 10px; padding: 12px; background-color: #171614; border: 1px solid #282521; border-radius: 2px;">
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 9.5px; text-transform: uppercase; letter-spacing: 0.18em; color: #BFA27A; font-weight: 600; margin-bottom: 6px;">
                YOUR FORMULATION
              </div>
              ${summaryText}
              ${optionsListHtml}
            </div>
          `;
        }

        return `
          <tr>
            <td style="padding: 16px 0; border-bottom: 1px solid #1E1D1A; vertical-align: top;">
              <div style="font-family: 'Playfair Display', Georgia, serif; font-size: 15px; color: #F2EEE7; font-weight: 400; line-height: 1.35;">
                ${escapeHtml(name)}
              </div>
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 11px; text-transform: uppercase; letter-spacing: 0.14em; color: #8E887F; margin-top: 5px;">
                ${escapeHtml(size)} ${isCustom ? "• BESPOKE CREATION" : ""}
              </div>
              ${formulationHtml}
            </td>
            <td align="center" style="padding: 16px 8px; border-bottom: 1px solid #1E1D1A; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; color: #A39E95; vertical-align: top;">
              ${qty}
            </td>
            <td align="right" style="padding: 16px 8px; border-bottom: 1px solid #1E1D1A; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; color: #A39E95; vertical-align: top; white-space: nowrap;">
              PKR ${unitPrice.toLocaleString()}
            </td>
            <td align="right" style="padding: 16px 0; border-bottom: 1px solid #1E1D1A; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; color: #F2EEE7; font-weight: 500; vertical-align: top; white-space: nowrap;">
              PKR ${lineTotal.toLocaleString()}
            </td>
          </tr>
        `;
      } catch (err) {
        console.error("[send-order-email] Error building customer item row:", err);
        return `
          <tr>
            <td style="padding: 16px 0; border-bottom: 1px solid #1E1D1A; font-size: 13px; color: #F2EEE7;">${escapeHtml(item.product_name || "Custom SCENTÉ")}</td>
            <td align="center" style="padding: 16px 8px; border-bottom: 1px solid #1E1D1A; color: #A39E95;">${item.quantity || 1}</td>
            <td align="right" style="padding: 16px 8px; border-bottom: 1px solid #1E1D1A; color: #A39E95;">PKR ${Number(item.unit_price || 0).toLocaleString()}</td>
            <td align="right" style="padding: 16px 0; border-bottom: 1px solid #1E1D1A; color: #F2EEE7;">PKR ${Number(item.line_total || 0).toLocaleString()}</td>
          </tr>
        `;
      }
    }

    function buildAdminItemRowHtml(item: OrderItem): string {
      try {
        const isCustom = Boolean(item.is_custom);
        const name = isCustom ? (item.product_name || "CUSTOM SCENTÉ (BESPOKE)") : (item.product_name || item.name || "SCENTÉ Fragrance");
        const size = item.size || (isCustom ? "50ml Flacon" : "50ml");
        const qty = item.quantity || 1;
        const unitPrice = Number(item.unit_price || item.price || 0);
        const lineTotal = Number(item.line_total || unitPrice * qty);
        const config = item.custom_configuration;

        let adminFormulationHtml = "";
        if (isCustom && config) {
          const summaryText = config.summary
            ? `<div style="font-family: 'Playfair Display', Georgia, serif; font-size: 13px; color: #F2EEE7; font-style: italic; margin-bottom: 10px;">"${escapeHtml(config.summary)}"</div>`
            : "";

          let groupsHtml = "";
          if (Array.isArray(config.groups) && config.groups.length > 0) {
            groupsHtml = config.groups
              .map((grp) => {
                const grpName = escapeHtml(grp.group_name || "Group");
                const optsHtml = Array.isArray(grp.selected_options)
                  ? grp.selected_options
                      .map((opt) => {
                        const optName = escapeHtml(opt.name || "");
                        const adj = Number(opt.price_adjustment || 0);
                        const adjStr = adj > 0
                          ? `<span style="color: #BFA27A; font-family: monospace; font-size: 11px;">+PKR ${adj.toLocaleString()}</span>`
                          : `<span style="color: #8E887F; font-size: 10px;">(Included)</span>`;
                        return `<div style="padding: 2px 0 2px 8px; font-size: 11.5px; color: #E5E0D8;">• ${optName} ${adjStr}</div>`;
                      })
                      .join("")
                  : "";
                return `
                  <div style="margin-bottom: 8px;">
                    <div style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.15em; color: #8E887F; font-weight: 600;">${grpName}</div>
                    ${optsHtml}
                  </div>
                `;
              })
              .join("");
          }

          const basePrice = Number(config.base_price || 0);
          const verifiedTotal = Number(config.total_price || unitPrice);
          const adjustments = Math.max(0, verifiedTotal - basePrice);

          const pricingBreakdown = `
            <div style="margin-top: 10px; padding-top: 8px; border-top: 1px dashed #302C26; font-size: 11px; color: #A39E95;">
              <span>Base Price: <strong style="color: #F2EEE7; font-family: monospace;">PKR ${basePrice.toLocaleString()}</strong></span>
              ${adjustments > 0 ? `<span style="margin-left: 14px;">Adjustments: <strong style="color: #BFA27A; font-family: monospace;">+PKR ${adjustments.toLocaleString()}</strong></span>` : ""}
              <span style="margin-left: 14px;">Verified Unit: <strong style="color: #F2EEE7; font-family: monospace;">PKR ${verifiedTotal.toLocaleString()}</strong></span>
            </div>
          `;

          adminFormulationHtml = `
            <div style="margin-top: 12px; padding: 14px; background-color: #171614; border: 1px solid #BFA27A; border-radius: 2px;">
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 10px; text-transform: uppercase; letter-spacing: 0.22em; color: #BFA27A; font-weight: 600; margin-bottom: 8px;">
                ATELIER PREPARATION SPECIFICATION
              </div>
              ${summaryText}
              ${groupsHtml}
              ${pricingBreakdown}
            </div>
          `;
        }

        return `
          <tr>
            <td style="padding: 16px 0; border-bottom: 1px solid #1E1D1A; vertical-align: top;">
              <div style="font-family: 'Playfair Display', Georgia, serif; font-size: 15px; color: #F2EEE7; font-weight: 400; line-height: 1.35;">
                ${escapeHtml(name)}
              </div>
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 11px; text-transform: uppercase; letter-spacing: 0.14em; color: #8E887F; margin-top: 5px;">
                ${escapeHtml(size)} ${isCustom ? "• BESPOKE ATELIER CREATION" : ""}
              </div>
              ${adminFormulationHtml}
            </td>
            <td align="center" style="padding: 16px 8px; border-bottom: 1px solid #1E1D1A; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; color: #A39E95; vertical-align: top;">
              ${qty}
            </td>
            <td align="right" style="padding: 16px 8px; border-bottom: 1px solid #1E1D1A; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; color: #A39E95; vertical-align: top; white-space: nowrap;">
              PKR ${unitPrice.toLocaleString()}
            </td>
            <td align="right" style="padding: 16px 0; border-bottom: 1px solid #1E1D1A; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; color: #F2EEE7; font-weight: 500; vertical-align: top; white-space: nowrap;">
              PKR ${lineTotal.toLocaleString()}
            </td>
          </tr>
        `;
      } catch (err) {
        console.error("[send-order-email] Error building admin item row:", err);
        return `
          <tr>
            <td style="padding: 16px 0; border-bottom: 1px solid #1E1D1A; font-size: 13px; color: #F2EEE7;">${escapeHtml(item.product_name || "Custom SCENTÉ")}</td>
            <td align="center" style="padding: 16px 8px; border-bottom: 1px solid #1E1D1A; color: #A39E95;">${item.quantity || 1}</td>
            <td align="right" style="padding: 16px 8px; border-bottom: 1px solid #1E1D1A; color: #A39E95;">PKR ${Number(item.unit_price || 0).toLocaleString()}</td>
            <td align="right" style="padding: 16px 0; border-bottom: 1px solid #1E1D1A; color: #F2EEE7;">PKR ${Number(item.line_total || 0).toLocaleString()}</td>
          </tr>
        `;
      }
    }

    const customerItemsRowsHtml = items.length > 0
      ? items.map(buildCustomerItemRowHtml).join("")
      : `
        <tr>
          <td colspan="4" align="center" style="padding: 24px 0; font-size: 13px; color: #8E887F; border-bottom: 1px solid #1E1D1A; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
            Order items details available in atelier manifest.
          </td>
        </tr>
      `;

    const adminItemsRowsHtml = items.length > 0
      ? items.map(buildAdminItemRowHtml).join("")
      : `
        <tr>
          <td colspan="4" align="center" style="padding: 24px 0; font-size: 13px; color: #8E887F; border-bottom: 1px solid #1E1D1A; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
            Order items details available in atelier manifest.
          </td>
        </tr>
      `;

    const promoDiscountRow = discountAmount > 0
      ? `
        <tr>
          <td colspan="3" align="right" style="padding: 8px 0 4px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; color: #8E887F;">
            Promo Discount ${promoCode ? `(<span style="color: #BFA27A; letter-spacing: 0.04em;">${promoCode}</span>)` : ""}:
          </td>
          <td align="right" style="padding: 8px 0 4px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; color: #BFA27A; font-weight: 500; white-space: nowrap;">
            -PKR ${discountAmount.toLocaleString()}
          </td>
        </tr>
      `
      : "";

    // 7. BUILD ADMIN NOTIFICATION HTML (SCENTÉ Dark Luxury Atelier Logistics)
    const adminHtmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="dark only">
  <meta name="supported-color-schemes" content="dark only">
  <title>New Order — ${reference} | SCENTÉ</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #0D0D0C;
      color: #F2EEE7;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    table {
      border-collapse: collapse;
      mso-table-lspace: 0pt;
      mso-table-rspace: 0pt;
    }
    @media only screen and (max-width: 600px) {
      .container-table {
        width: 100% !important;
        border-radius: 0 !important;
      }
      .mobile-padding {
        padding-left: 20px !important;
        padding-right: 20px !important;
      }
      .mobile-stack {
        display: block !important;
        width: 100% !important;
        box-sizing: border-box !important;
      }
      .mobile-stack-border {
        border-left: none !important;
        border-top: 1px solid #23201C !important;
        padding-left: 0 !important;
        padding-top: 20px !important;
        margin-top: 20px !important;
      }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #0D0D0C; color: #F2EEE7;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #0D0D0C; padding: 40px 12px;">
    <tr>
      <td align="center">
        <!-- Main Card Container -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" class="container-table" style="max-width: 600px; background-color: #121110; border: 1px solid #201E1A; border-radius: 2px; overflow: hidden;">
          
          <!-- Subtle Champagne Accent Hairline -->
          <tr>
            <td style="background-color: #BFA27A; height: 1px; font-size: 0; line-height: 0;">&nbsp;</td>
          </tr>

          <!-- Atelier Header -->
          <tr>
            <td align="center" style="padding: 40px 32px 28px 32px; border-bottom: 1px solid #1E1D1A;">
              <div style="font-family: 'Playfair Display', Georgia, serif; font-size: 26px; font-weight: 300; letter-spacing: 0.35em; color: #F2EEE7; text-transform: uppercase;">
                SCENTÉ
              </div>
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 9px; text-transform: uppercase; letter-spacing: 0.28em; color: #8E887F; margin-top: 8px; font-weight: 500;">
                HAUTE PARFUMERIE • ATELIER DISPATCH
              </div>
            </td>
          </tr>

          <!-- Hero Section -->
          <tr>
            <td class="mobile-padding" style="padding: 36px 36px 28px 36px; background-color: #141311; border-bottom: 1px solid #1E1D1A;">
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 10px; text-transform: uppercase; letter-spacing: 0.24em; color: #BFA27A; font-weight: 600; margin-bottom: 12px;">
                NEW ORDER
              </div>
              <h1 style="margin: 0; font-family: 'Playfair Display', Georgia, serif; font-size: 26px; font-weight: 400; color: #F2EEE7; letter-spacing: 0.01em; line-height: 1.3;">
                Order ${reference}
              </h1>
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12.5px; color: #8E887F; margin-top: 8px;">
                Placed on ${createdAt} (Pakistan Standard Time)
              </div>
              <div style="margin-top: 16px;">
                <span style="display: inline-block; background-color: #181714; border: 1px solid #2A2723; color: #A39E95; font-size: 9.5px; text-transform: uppercase; letter-spacing: 0.16em; font-weight: 500; padding: 4px 10px; border-radius: 2px;">
                  PENDING FULFILLMENT • ${paymentMethod}
                </span>
              </div>
            </td>
          </tr>

          <!-- Customer & Logistics Specification -->
          <tr>
            <td class="mobile-padding" style="padding: 32px 36px; border-bottom: 1px solid #1E1D1A;">
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 10px; text-transform: uppercase; letter-spacing: 0.22em; color: #BFA27A; font-weight: 600; margin-bottom: 18px;">
                RECIPIENT &amp; LOGISTICS
              </div>
              
              <table width="100%" cellspacing="0" cellpadding="0" border="0" style="font-size: 13px; line-height: 1.6;">
                <tr>
                  <td width="50%" valign="top" class="mobile-stack" style="padding-right: 16px;">
                    <div style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.12em; color: #8E887F; margin-bottom: 3px;">CUSTOMER</div>
                    <div style="color: #F2EEE7; font-weight: 500; font-size: 14px;">${customerName}</div>

                    <div style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.12em; color: #8E887F; margin-top: 14px; margin-bottom: 3px;">CONTACT PHONE</div>
                    <div>
                      <a href="tel:${customerPhone.replace(/[^0-9+]/g, '')}" style="color: #BFA27A; text-decoration: none; font-weight: 500;">
                        ${customerPhone}
                      </a>
                    </div>

                    <div style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.12em; color: #8E887F; margin-top: 14px; margin-bottom: 3px;">EMAIL ADDRESS</div>
                    <div style="color: #A39E95;">${hasCustomerEmail ? rawCustomerEmail : "Not provided"}</div>
                  </td>

                  <td width="50%" valign="top" class="mobile-stack mobile-stack-border" style="padding-left: 16px; border-left: 1px solid #23201C;">
                    <div style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.12em; color: #8E887F; margin-bottom: 3px;">SHIPPING ADDRESS</div>
                    <div style="color: #F2EEE7;">${address}</div>

                    <div style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.12em; color: #8E887F; margin-top: 14px; margin-bottom: 3px;">DESTINATION</div>
                    <div style="color: #F2EEE7; font-weight: 500;">
                      ${city}${province ? `, ${province}` : ""}${postalCode ? ` (${postalCode})` : ""}
                    </div>

                    <div style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.12em; color: #8E887F; margin-top: 14px; margin-bottom: 3px;">PAYMENT METHOD</div>
                    <div style="color: #BFA27A; font-weight: 500;">Cash on Delivery (Courier Collect)</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Items Manifest Table -->
          <tr>
            <td class="mobile-padding" style="padding: 32px 36px 12px 36px;">
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 10px; text-transform: uppercase; letter-spacing: 0.22em; color: #8E887F; font-weight: 600; margin-bottom: 16px;">
                ORDERED ITEMS MANIFEST
              </div>

              <table width="100%" cellspacing="0" cellpadding="0" border="0">
                <thead>
                  <tr style="border-bottom: 1px solid #201E1A;">
                    <th align="left" style="padding: 0 0 10px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 9.5px; text-transform: uppercase; letter-spacing: 0.16em; color: #8E887F; font-weight: 600;">FRAGRANCE</th>
                    <th align="center" style="padding: 0 8px 10px 8px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 9.5px; text-transform: uppercase; letter-spacing: 0.16em; color: #8E887F; font-weight: 600;">QTY</th>
                    <th align="right" style="padding: 0 8px 10px 8px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 9.5px; text-transform: uppercase; letter-spacing: 0.16em; color: #8E887F; font-weight: 600;">PRICE</th>
                    <th align="right" style="padding: 0 0 10px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 9.5px; text-transform: uppercase; letter-spacing: 0.16em; color: #8E887F; font-weight: 600;">TOTAL</th>
                  </tr>
                </thead>
                <tbody>
                  ${adminItemsRowsHtml}
                </tbody>
              </table>
            </td>
          </tr>

          <!-- Financial Breakdown -->
          <tr>
            <td class="mobile-padding" style="padding: 12px 36px 32px 36px;">
              <table width="100%" cellspacing="0" cellpadding="0" border="0" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                <tr>
                  <td colspan="3" align="right" style="padding: 6px 0 4px 0; font-size: 12.5px; color: #8E887F;">
                    Subtotal:
                  </td>
                  <td align="right" style="padding: 6px 0 4px 0; font-size: 13px; color: #F2EEE7; font-weight: 400; white-space: nowrap;">
                    PKR ${subtotal.toLocaleString()}
                  </td>
                </tr>

                ${promoDiscountRow}

                <tr>
                  <td colspan="3" align="right" style="padding: 4px 0 12px 0; font-size: 12.5px; color: #8E887F;">
                    Courier Delivery:
                  </td>
                  <td align="right" style="padding: 4px 0 12px 0; font-size: 12.5px; color: #A39E95; white-space: nowrap;">
                    ${deliveryFee > 0 ? `PKR ${deliveryFee.toLocaleString()}` : "COMPLIMENTARY"}
                  </td>
                </tr>

                <tr>
                  <td colspan="3" align="right" style="padding: 16px 0 0 0; border-top: 1px solid #1E1D1A; font-family: 'Playfair Display', Georgia, serif; font-size: 15px; color: #F2EEE7;">
                    Total Collectable:
                  </td>
                  <td align="right" style="padding: 16px 0 0 0; border-top: 1px solid #1E1D1A; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 18px; color: #BFA27A; font-weight: 600; white-space: nowrap;">
                    PKR ${total.toLocaleString()}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Admin CTA Button -->
          <tr>
            <td align="center" class="mobile-padding" style="padding: 8px 36px 36px 36px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center">
                <tr>
                  <td align="center" style="border-radius: 2px; background-color: #BFA27A;">
                    <a href="${adminOrderUrl}" target="_blank" style="display: inline-block; padding: 15px 36px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 11.5px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.18em; color: #0D0D0C; text-decoration: none; border-radius: 2px;">
                      View Order in Admin Dashboard &rarr;
                    </a>
                  </td>
                </tr>
              </table>
              <div style="font-size: 11px; color: #6E6962; margin-top: 14px;">
                Direct URL: <a href="${adminOrderUrl}" style="color: #8E887F; text-decoration: underline;">${adminOrderUrl}</a>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding: 28px 24px; background-color: #090908; border-top: 1px solid #1A1916; font-size: 11px; color: #6E6962; line-height: 1.6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
              <div style="letter-spacing: 0.12em; text-transform: uppercase; color: #8E887F;">SCENTÉ Luxury Fragrance Atelier</div>
              <div style="margin-top: 4px;">Automated internal logistics record &bull; Authorized dispatch notification</div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    // 8. BUILD CUSTOMER ORDER CONFIRMATION HTML (SCENTÉ Editorial Noir & Warm Champagne)
    const customerHtmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="dark only">
  <meta name="supported-color-schemes" content="dark only">
  <title>Order Confirmed — ${reference} | SCENTÉ</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #0D0D0C;
      color: #F2EEE7;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    table {
      border-collapse: collapse;
      mso-table-lspace: 0pt;
      mso-table-rspace: 0pt;
    }
    @media only screen and (max-width: 600px) {
      .container-table {
        width: 100% !important;
        border-radius: 0 !important;
      }
      .mobile-padding {
        padding-left: 20px !important;
        padding-right: 20px !important;
      }
      .mobile-stack {
        display: block !important;
        width: 100% !important;
        box-sizing: border-box !important;
      }
      .mobile-meta-cell {
        display: block !important;
        width: 100% !important;
        padding: 8px 0 !important;
        border-left: none !important;
        border-top: 1px solid #23201C !important;
      }
      .mobile-meta-cell-first {
        border-top: none !important;
        padding-top: 0 !important;
      }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #0D0D0C; color: #F2EEE7;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #0D0D0C; padding: 40px 12px;">
    <tr>
      <td align="center">
        <!-- Main Card Container -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" class="container-table" style="max-width: 600px; background-color: #121110; border: 1px solid #201E1A; border-radius: 2px; overflow: hidden;">
          
          <!-- Subtle Champagne Accent Hairline -->
          <tr>
            <td style="background-color: #BFA27A; height: 1px; font-size: 0; line-height: 0;">&nbsp;</td>
          </tr>

          <!-- SCENTÉ Header -->
          <tr>
            <td align="center" style="padding: 44px 32px 30px 32px; border-bottom: 1px solid #1E1D1A;">
              <div style="font-family: 'Playfair Display', Georgia, serif; font-size: 28px; font-weight: 300; letter-spacing: 0.35em; color: #F2EEE7; text-transform: uppercase;">
                SCENTÉ
              </div>
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 9px; text-transform: uppercase; letter-spacing: 0.28em; color: #8E887F; margin-top: 8px; font-weight: 500;">
                HAUTE PARFUMERIE
              </div>
            </td>
          </tr>

          <!-- Hero Section: Order Confirmed -->
          <tr>
            <td class="mobile-padding" style="padding: 38px 36px 30px 36px; background-color: #141311; border-bottom: 1px solid #1E1D1A;">
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 10px; text-transform: uppercase; letter-spacing: 0.24em; color: #BFA27A; font-weight: 600; margin-bottom: 14px;">
                ORDER CONFIRMED
              </div>
              <h1 style="margin: 0; font-family: 'Playfair Display', Georgia, serif; font-size: 26px; font-weight: 400; color: #F2EEE7; letter-spacing: 0.01em; line-height: 1.3;">
                Your order is confirmed.
              </h1>
              <p style="margin: 14px 0 0 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13.5px; line-height: 1.65; color: #A39E95; font-weight: 300;">
                Dear ${customerName}, thank you for choosing SCENTÉ. Your order has been received and our atelier has commenced preparation. You will receive real-time updates as your parcel progresses through dispatch.
              </p>

              <!-- Prominent Order Reference Card -->
              <div style="margin-top: 24px; background-color: #181714; border: 1px solid #23201C; border-radius: 2px; padding: 18px 22px;">
                <table width="100%" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td class="mobile-meta-cell mobile-meta-cell-first" valign="top" style="padding-right: 14px;">
                      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 9.5px; text-transform: uppercase; letter-spacing: 0.16em; color: #8E887F;">ORDER REFERENCE</div>
                      <div style="font-family: 'Playfair Display', Georgia, serif; font-size: 16px; color: #F2EEE7; margin-top: 4px; font-weight: 400;">${reference}</div>
                    </td>
                    <td class="mobile-meta-cell" valign="top" style="padding-left: 14px; padding-right: 14px; border-left: 1px solid #23201C;">
                      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 9.5px; text-transform: uppercase; letter-spacing: 0.16em; color: #8E887F;">ORDER DATE</div>
                      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12.5px; color: #A39E95; margin-top: 4px;">${createdAt}</div>
                    </td>
                    <td class="mobile-meta-cell" valign="top" style="padding-left: 14px; border-left: 1px solid #23201C;">
                      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 9.5px; text-transform: uppercase; letter-spacing: 0.16em; color: #8E887F;">PAYMENT</div>
                      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12.5px; color: #BFA27A; margin-top: 4px; font-weight: 500;">Cash on Delivery</div>
                    </td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>

          <!-- Items Manifest Table -->
          <tr>
            <td class="mobile-padding" style="padding: 32px 36px 12px 36px;">
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 10px; text-transform: uppercase; letter-spacing: 0.22em; color: #8E887F; font-weight: 600; margin-bottom: 16px;">
                ORDER SUMMARY
              </div>

              <table width="100%" cellspacing="0" cellpadding="0" border="0">
                <thead>
                  <tr style="border-bottom: 1px solid #201E1A;">
                    <th align="left" style="padding: 0 0 10px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 9.5px; text-transform: uppercase; letter-spacing: 0.16em; color: #8E887F; font-weight: 600;">ITEM</th>
                    <th align="center" style="padding: 0 8px 10px 8px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 9.5px; text-transform: uppercase; letter-spacing: 0.16em; color: #8E887F; font-weight: 600;">QTY</th>
                    <th align="right" style="padding: 0 8px 10px 8px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 9.5px; text-transform: uppercase; letter-spacing: 0.16em; color: #8E887F; font-weight: 600;">PRICE</th>
                    <th align="right" style="padding: 0 0 10px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 9.5px; text-transform: uppercase; letter-spacing: 0.16em; color: #8E887F; font-weight: 600;">TOTAL</th>
                  </tr>
                </thead>
                <tbody>
                  ${customerItemsRowsHtml}
                </tbody>
              </table>
            </td>
          </tr>

          <!-- Pricing Summary -->
          <tr>
            <td class="mobile-padding" style="padding: 12px 36px 28px 36px;">
              <table width="100%" cellspacing="0" cellpadding="0" border="0" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                <tr>
                  <td colspan="3" align="right" style="padding: 6px 0 4px 0; font-size: 12.5px; color: #8E887F;">
                    Subtotal:
                  </td>
                  <td align="right" style="padding: 6px 0 4px 0; font-size: 13px; color: #F2EEE7; font-weight: 400; white-space: nowrap;">
                    PKR ${subtotal.toLocaleString()}
                  </td>
                </tr>

                ${promoDiscountRow}

                <tr>
                  <td colspan="3" align="right" style="padding: 4px 0 12px 0; font-size: 12.5px; color: #8E887F;">
                    Delivery:
                  </td>
                  <td align="right" style="padding: 4px 0 12px 0; font-size: 12.5px; color: #A39E95; white-space: nowrap;">
                    ${deliveryFee > 0 ? `PKR ${deliveryFee.toLocaleString()}` : "COMPLIMENTARY"}
                  </td>
                </tr>

                <tr>
                  <td colspan="3" align="right" style="padding: 16px 0 0 0; border-top: 1px solid #1E1D1A; font-family: 'Playfair Display', Georgia, serif; font-size: 15px; color: #F2EEE7;">
                    TOTAL:
                  </td>
                  <td align="right" style="padding: 16px 0 0 0; border-top: 1px solid #1E1D1A; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 18px; color: #BFA27A; font-weight: 600; white-space: nowrap;">
                    PKR ${total.toLocaleString()}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Shipping Address Card -->
          <tr>
            <td class="mobile-padding" style="padding: 0 36px 32px 36px;">
              <table width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #181714; border: 1px solid #23201C; border-radius: 2px; padding: 22px 24px;">
                <tr>
                  <td>
                    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 10px; text-transform: uppercase; letter-spacing: 0.22em; color: #BFA27A; font-weight: 600; margin-bottom: 12px;">
                      DELIVERY DESTINATION
                    </div>
                    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13.5px; color: #F2EEE7; font-weight: 500;">
                      ${customerName}
                    </div>
                    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; color: #A39E95; margin-top: 4px; line-height: 1.5;">
                      ${address}
                    </div>
                    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; color: #A39E95; margin-top: 2px;">
                      ${city}${province ? `, ${province}` : ""}${postalCode ? ` (${postalCode})` : ""}
                    </div>
                    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12.5px; color: #8E887F; margin-top: 6px;">
                      Contact: <span style="color: #F2EEE7;">${customerPhone}</span>
                    </div>
                    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 11.5px; color: #8E887F; margin-top: 12px; padding-top: 10px; border-top: 1px solid #23201C;">
                      Payment method: <strong style="color: #BFA27A; font-weight: 500;">Cash on Delivery</strong> &mdash; payment will be collected by courier upon handover.
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Large Premium CTA -->
          <tr>
            <td align="center" class="mobile-padding" style="padding: 4px 36px 32px 36px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center">
                <tr>
                  <td align="center" style="border-radius: 2px; background-color: #BFA27A;">
                    <a href="${customerTrackUrl}" target="_blank" style="display: inline-block; padding: 16px 44px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 11.5px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.2em; color: #0D0D0C; text-decoration: none; border-radius: 2px;">
                      TRACK YOUR PARCEL
                    </a>
                  </td>
                </tr>
              </table>
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 11.5px; color: #6E6962; margin-top: 14px; max-width: 420px; line-height: 1.5;">
                You can track transit milestones anytime using your reference <span style="color: #F2EEE7; font-family: monospace;">${reference}</span> and registered contact number.
              </div>
            </td>
          </tr>

          <!-- Small Closing Message -->
          <tr>
            <td class="mobile-padding" style="padding: 24px 36px; background-color: #141311; border-top: 1px solid #1E1D1A; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; color: #8E887F; line-height: 1.6;">
              If you have questions or wish to amend details prior to courier dispatch, our atelier concierge is at your service at <a href="mailto:scentepk@gmail.com" style="color: #BFA27A; text-decoration: none;">scentepk@gmail.com</a>.
            </td>
          </tr>

          <!-- SCENTÉ Footer -->
          <tr>
            <td align="center" style="padding: 30px 24px; background-color: #090908; border-top: 1px solid #1A1916; font-size: 11px; color: #6E6962; line-height: 1.6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
              <div style="letter-spacing: 0.18em; text-transform: uppercase; color: #8E887F; font-size: 10.5px;">SCENTÉ HAUTE PARFUMERIE</div>
              <div style="margin-top: 4px;">Handcrafted &amp; Sealed in Small Batches &bull; All Rights Reserved</div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    // 9. DISPATCH NOTIFICATIONS
    let adminResult: { sent: boolean; id?: string; error?: unknown } = { sent: false };
    let customerResult: { sent: boolean; id?: string; skipped?: boolean; error?: unknown } = {
      sent: false,
      skipped: !hasCustomerEmail,
    };

    // 9.1 Branch 1: Send Admin Notification
    if (shouldSendAdmin) {
      console.log(`[send-order-email] Dispatching admin notification for ${reference} to ${ADMIN_NOTIFICATION_EMAIL}`);
      const adminResendHeaders: Record<string, string> = {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      };
      if (orderId && orderId !== "N/A") {
        adminResendHeaders["Idempotency-Key"] = `scente-order-admin-${orderId}`;
      }

      try {
        const adminRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: adminResendHeaders,
          body: JSON.stringify({
            from: "SCENTÉ Atelier <orders@scentepk.com>",
            to: [ADMIN_NOTIFICATION_EMAIL],
            subject: `New SCENTÉ Order — ${reference}`,
            html: adminHtmlContent,
          }),
        });
        const adminData = await adminRes.json();
        if (adminRes.ok) {
          adminResult = { sent: true, id: adminData.id };
          console.log(`[send-order-email] Admin email sent successfully (ID: ${adminData.id})`);
        } else {
          adminResult = { sent: false, error: adminData };
          console.error("[send-order-email] Resend admin email error:", adminData);
        }
      } catch (adminErr) {
        adminResult = { sent: false, error: String(adminErr) };
        console.error("[send-order-email] Failed to send admin email:", adminErr);
      }
    } else {
      console.log(`[send-order-email] Admin email previously dispatched for ${reference}. Skipping.`);
      adminResult = { sent: true, id: "previously-sent" };
    }

    // 9.2 Branch 2: Send Customer Order Confirmation (if email is provided)
    if (shouldSendCustomer) {
      console.log(`[send-order-email] Dispatching customer confirmation for ${reference} to ${rawCustomerEmail}`);
      const customerResendHeaders: Record<string, string> = {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      };
      if (orderId && orderId !== "N/A") {
        customerResendHeaders["Idempotency-Key"] = `scente-order-customer-${orderId}`;
      }

      try {
        const customerRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: customerResendHeaders,
          body: JSON.stringify({
            from: "SCENTÉ Atelier <orders@scentepk.com>",
            to: [rawCustomerEmail],
            subject: `Order Confirmed — ${reference} | SCENTÉ`,
            html: customerHtmlContent,
          }),
        });
        const customerData = await customerRes.json();
        if (customerRes.ok) {
          customerResult = { sent: true, id: customerData.id };
          console.log(`[send-order-email] Customer email sent successfully (ID: ${customerData.id})`);
        } else {
          customerResult = { sent: false, error: customerData };
          console.warn("[send-order-email] Resend customer email error:", customerData);
        }
      } catch (custErr) {
        customerResult = { sent: false, error: String(custErr) };
        console.warn("[send-order-email] Failed to send customer email:", custErr);
      }
    } else if (!hasCustomerEmail) {
      console.log(`[send-order-email] Customer email not provided for ${reference}. Gracefully skipped.`);
      customerResult = { sent: false, skipped: true };
    } else {
      console.log(`[send-order-email] Customer confirmation previously dispatched for ${reference}. Skipping.`);
      customerResult = { sent: true, id: "previously-sent" };
    }

    // 10. Update Database Tracking Timestamps
    if (supabaseUrl && serviceKey && order.id && order.id !== "test-order-99") {
      const updates: Record<string, string> = {};
      if (adminResult.sent && !dbAdminSent) {
        updates.notification_sent_at = new Date().toISOString();
      }
      if ((customerResult.sent || customerResult.skipped) && !dbCustomerSent) {
        updates.customer_email_sent_at = new Date().toISOString();
      }

      if (Object.keys(updates).length > 0) {
        try {
          await fetch(`${supabaseUrl}/rest/v1/orders?id=eq.${order.id}`, {
            method: "PATCH",
            headers: {
              apikey: serviceKey,
              Authorization: `Bearer ${serviceKey}`,
              "Content-Type": "application/json",
              Prefer: "return=minimal",
            },
            body: JSON.stringify(updates),
          });
          console.log(`[send-order-email] Updated database tracking timestamps for order ${reference}:`, updates);
        } catch (patchErr) {
          console.warn("[send-order-email] Could not update tracking timestamps in DB:", patchErr);
        }
      }
    }

    // 11. Return Detailed Result
    return new Response(
      JSON.stringify({
        success: true,
        reference,
        admin_email: {
          recipient: ADMIN_NOTIFICATION_EMAIL,
          sent: adminResult.sent,
          id: adminResult.id,
          error: adminResult.error,
        },
        customer_email: {
          recipient: hasCustomerEmail ? rawCustomerEmail : null,
          sent: customerResult.sent,
          skipped: customerResult.skipped,
          id: customerResult.id,
          error: customerResult.error,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("[send-order-email] Unhandled function error:", err);
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMsg,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
