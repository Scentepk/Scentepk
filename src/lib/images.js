/**
 * Utility for responsive and optimized image URLs.
 * Automatically formats external CDN URLs (such as Unsplash) with optimal width and WebP/AVIF formatting,
 * while leaving Supabase Storage URLs and local assets completely intact.
 */
export function getOptimizedImageUrl(url, { width = 800, quality = 80 } = {}) {
  if (!url || typeof url !== "string") return "";

  // 1. Unsplash CDN Optimization
  if (url.includes("images.unsplash.com")) {
    try {
      const parsed = new URL(url);
      parsed.searchParams.set("w", String(width));
      parsed.searchParams.set("q", String(quality));
      parsed.searchParams.set("auto", "format");
      if (!parsed.searchParams.has("fit")) {
        parsed.searchParams.set("fit", "crop");
      }
      return parsed.toString();
    } catch {
      return url;
    }
  }

  // 2. Supabase Storage & Local Assets: Return unchanged to preserve existing behavior & security
  return url;
}
