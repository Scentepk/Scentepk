// Vercel Serverless Function to serve dynamic Open Graph previews for crawlers (WhatsApp, Facebook, Twitter, etc.)

const DEFAULT_BRAND_TITLE = "SCENTÉPK by Mian Ishaq Hanif | Premium Fragrance";
const DEFAULT_BRAND_DESC =
  "SCENTÉPK by Mian Ishaq Hanif — Luxury artisanal fragrances crafted with pure perfume oils. Cash on Delivery across Pakistan.";
const DEFAULT_BRAND_IMAGE =
  "https://scentepk.com/images/campaign/hero-campaign-main.jpg";
const BASE_SITE_URL = "https://scentepk.com";

const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL || "https://uungyqinfveuxtaxettk.supabase.co";
const SUPABASE_ANON_KEY =
  process.env.VITE_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV1bmd5cWluZnZldXh0YXhldHRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg1MDU1NTcsImV4cCI6MjEwNDA4MTU1N30.rt-O5bY6A9ruY0X8cVhdmsj38SEVVfu0NMFAgYiV_f4";

function escapeHtml(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function normalizeImageUrl(url) {
  if (!url) return DEFAULT_BRAND_IMAGE;
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }
  return `${BASE_SITE_URL}${url.startsWith("/") ? "" : "/"}${url}`;
}

export default async function handler(req, res) {
  const { slug } = req.query;

  let title = DEFAULT_BRAND_TITLE;
  let description = DEFAULT_BRAND_DESC;
  let imageUrl = DEFAULT_BRAND_IMAGE;
  let canonicalUrl = `${BASE_SITE_URL}/product/${encodeURIComponent(slug || "")}`;

  if (slug) {
    try {
      const endpoint = `${SUPABASE_URL}/rest/v1/products?or=(slug.eq.${encodeURIComponent(
        slug
      )},id.eq.${encodeURIComponent(slug)})&select=*&limit=1`;

      const response = await fetch(endpoint, {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
      });

      if (response.ok) {
        const rows = await response.json();
        if (Array.isArray(rows) && rows.length > 0) {
          const product = rows[0];
          const prodName = product.name || "Luxury Fragrance";
          const priceStr = product.price
            ? ` | PKR ${Number(product.price).toLocaleString()}`
            : "";
          const subtitle =
            product.subtitle || product.olfactive_family || "Premium Fragrance";

          title = `${prodName} — ${subtitle} | SCENTÉPK by Mian Ishaq Hanif`;

          const rawDesc =
            product.tagline ||
            product.description ||
            "Luxury handcrafted fragrance with pure perfume oils.";
          const cleanDesc = rawDesc.replace(/\s+/g, " ").trim();
          description = `${cleanDesc}${priceStr}. Handcrafted in Pakistan by SCENTÉPK by Mian Ishaq Hanif. Cash on Delivery available.`;

          const rawImg =
            product.primary_image ||
            product.image ||
            (product.images && product.images[0]) ||
            DEFAULT_BRAND_IMAGE;

          imageUrl = normalizeImageUrl(rawImg);
        }
      }
    } catch {
      // Gracefully fall back to brand defaults if Supabase fails
    }
  }

  const safeTitle = escapeHtml(title);
  const safeDesc = escapeHtml(description);
  const safeImg = escapeHtml(imageUrl);
  const safeUrl = escapeHtml(canonicalUrl);
  const redirectTarget = slug ? `/product/${encodeURIComponent(slug)}` : "/";

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${safeTitle}</title>
  <meta name="description" content="${safeDesc}" />

  <!-- Open Graph / WhatsApp / Facebook -->
  <meta property="og:site_name" content="SCENTÉPK by Mian Ishaq Hanif" />
  <meta property="og:type" content="product" />
  <meta property="og:title" content="${safeTitle}" />
  <meta property="og:description" content="${safeDesc}" />
  <meta property="og:image" content="${safeImg}" />
  <meta property="og:image:secure_url" content="${safeImg}" />
  <meta property="og:image:alt" content="${safeTitle}" />
  <meta property="og:url" content="${safeUrl}" />

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${safeTitle}" />
  <meta name="twitter:description" content="${safeDesc}" />
  <meta name="twitter:image" content="${safeImg}" />

  <!-- Instant Browser Redirect for Real Users -->
  <meta http-equiv="refresh" content="0;url=${redirectTarget}" />
  <script>
    window.location.replace(${JSON.stringify(redirectTarget)});
  </script>
</head>
<body style="background:#0D0D0C;color:#F2EEE7;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
  <p>Loading <a href="${redirectTarget}" style="color:#BFA27A;text-decoration:none;">${safeTitle}</a>...</p>
</body>
</html>`;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
  return res.status(200).send(html);
}
