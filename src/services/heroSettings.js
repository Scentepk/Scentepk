import { supabase, isSupabaseConfigured } from "../lib/supabase";

export const LOCAL_STORAGE_HERO_KEY = "scente_hero_settings_cache";
export const HERO_UPDATE_EVENT = "scente_hero_updated";

export const DEFAULT_HERO_SETTINGS = {
  id: "primary_hero",
  eyebrow: "SCENTÉ — BATCH 04",
  badge: "30% PURE PERFUME OIL",
  headline_line1: "FRAGRANCE",
  headline_line2: "BECOMES",
  headline_line3: "IDENTITY.",
  subtitle: "Artisanal fragrances crafted for presence, character and lasting impression.",
  cta_text: "EXPLORE FRAGRANCES",
  cta_link: "/shop",
  image_url: "/images/campaign/hero-campaign-main.jpg",
  mobile_image_url: "",
  storage_path: null,
  mobile_storage_path: null,
  is_active: true,
};

/**
 * Normalize and sanitize hero settings row from DB or LocalStorage
 */
export function normalizeHeroSettings(raw) {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_HERO_SETTINGS };

  return {
    id: raw.id || "primary_hero",
    eyebrow: raw.eyebrow !== undefined ? String(raw.eyebrow).trim() : DEFAULT_HERO_SETTINGS.eyebrow,
    badge: raw.badge !== undefined ? String(raw.badge).trim() : DEFAULT_HERO_SETTINGS.badge,
    headline_line1:
      raw.headline_line1 !== undefined
        ? String(raw.headline_line1).trim()
        : DEFAULT_HERO_SETTINGS.headline_line1,
    headline_line2:
      raw.headline_line2 !== undefined
        ? String(raw.headline_line2).trim()
        : DEFAULT_HERO_SETTINGS.headline_line2,
    headline_line3:
      raw.headline_line3 !== undefined
        ? String(raw.headline_line3).trim()
        : DEFAULT_HERO_SETTINGS.headline_line3,
    subtitle: raw.subtitle !== undefined ? String(raw.subtitle).trim() : DEFAULT_HERO_SETTINGS.subtitle,
    cta_text: raw.cta_text !== undefined ? String(raw.cta_text).trim() : DEFAULT_HERO_SETTINGS.cta_text,
    cta_link: raw.cta_link !== undefined ? String(raw.cta_link).trim() : DEFAULT_HERO_SETTINGS.cta_link,
    image_url: raw.image_url || DEFAULT_HERO_SETTINGS.image_url,
    mobile_image_url: raw.mobile_image_url || "",
    storage_path: raw.storage_path || null,
    mobile_storage_path: raw.mobile_storage_path || null,
    is_active: raw.is_active !== undefined ? Boolean(raw.is_active) : true,
    updated_at: raw.updated_at || new Date().toISOString(),
  };
}

/**
 * Fetch active hero settings (Supabase first with LocalStorage cache fallback)
 */
export async function getHeroSettings() {
  // 1. Check local storage cache
  let cached = null;
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_HERO_KEY);
    if (raw) {
      cached = normalizeHeroSettings(JSON.parse(raw));
    }
  } catch (e) {
    console.warn("Could not read local hero cache:", e);
  }

  // If Supabase is not configured, return cached or default
  if (!isSupabaseConfigured || !supabase) {
    return { data: cached || { ...DEFAULT_HERO_SETTINGS }, error: null };
  }

  try {
    const { data, error } = await supabase
      .from("hero_settings")
      .select("*")
      .eq("id", "primary_hero")
      .maybeSingle();

    if (error) {
      console.warn("Hero settings DB fetch warning:", error.message);
      return { data: cached || { ...DEFAULT_HERO_SETTINGS }, error: null };
    }

    if (data) {
      const normalized = normalizeHeroSettings(data);
      try {
        localStorage.setItem(LOCAL_STORAGE_HERO_KEY, JSON.stringify(normalized));
      } catch (e) {}
      return { data: normalized, error: null };
    }

    // No row found, return cached or default
    return { data: cached || { ...DEFAULT_HERO_SETTINGS }, error: null };
  } catch (err) {
    console.error("Failed to get hero settings:", err);
    return { data: cached || { ...DEFAULT_HERO_SETTINGS }, error: null };
  }
}

/**
 * Save / Update hero settings (Writes to Supabase & LocalStorage, broadcasts event)
 */
export async function saveHeroSettings(payload) {
  if (!payload || typeof payload !== "object") {
    return { data: null, error: new Error("Invalid payload provided") };
  }

  // Validate required text fields
  if (!payload.headline_line1?.trim()) {
    return { data: null, error: new Error("Main headline (Line 1) is required.") };
  }
  if (!payload.cta_text?.trim()) {
    return { data: null, error: new Error("CTA button label is required.") };
  }
  if (!payload.cta_link?.trim()) {
    return { data: null, error: new Error("CTA button destination link is required.") };
  }
  if (!payload.image_url?.trim()) {
    return { data: null, error: new Error("Hero desktop background image is required.") };
  }

  const normalized = normalizeHeroSettings({
    ...payload,
    id: "primary_hero",
    updated_at: new Date().toISOString(),
  });

  // Always update LocalStorage cache so storefront and admin update immediately
  try {
    localStorage.setItem(LOCAL_STORAGE_HERO_KEY, JSON.stringify(normalized));
    window.dispatchEvent(new CustomEvent(HERO_UPDATE_EVENT, { detail: normalized }));
  } catch (e) {
    console.warn("Could not write to local hero cache:", e);
  }

  // If Supabase is configured, persist to database
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from("hero_settings")
        .upsert(
          {
            id: "primary_hero",
            eyebrow: normalized.eyebrow,
            badge: normalized.badge,
            headline_line1: normalized.headline_line1,
            headline_line2: normalized.headline_line2,
            headline_line3: normalized.headline_line3,
            subtitle: normalized.subtitle,
            cta_text: normalized.cta_text,
            cta_link: normalized.cta_link,
            image_url: normalized.image_url,
            mobile_image_url: normalized.mobile_image_url || null,
            storage_path: normalized.storage_path,
            mobile_storage_path: normalized.mobile_storage_path,
            is_active: normalized.is_active,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "id" }
        )
        .select()
        .single();

      if (error) throw error;

      return { data: normalizeHeroSettings(data), error: null };
    } catch (err) {
      console.error("Failed to save hero settings to Supabase:", err);
      // Return normalized local data with warning so user isn't blocked if network is degraded
      return {
        data: normalized,
        error: new Error(err.message || "Failed to persist to cloud database"),
      };
    }
  }

  return { data: normalized, error: null };
}

/**
 * Upload Hero background image to Supabase Storage bucket 'product-images' (under hero/)
 */
export async function uploadHeroImage(file, type = "desktop") {
  if (!file) return { url: null, path: null, error: new Error("No image file provided") };

  // Allowed formats
  const validTypes = ["image/jpeg", "image/png", "image/webp", "image/avif"];
  if (!validTypes.includes(file.type)) {
    return {
      url: null,
      path: null,
      error: new Error("Invalid format. Please upload JPEG, PNG, WebP, or AVIF."),
    };
  }

  // Size limit 5MB
  if (file.size > 5 * 1024 * 1024) {
    return { url: null, path: null, error: new Error("Image exceeds 5MB limit.") };
  }

  if (!isSupabaseConfigured || !supabase) {
    // Generate preview data URL in local/prototype mode
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve({
          url: reader.result,
          path: `local/hero-${type}-${file.name}`,
          error: null,
        });
      };
      reader.onerror = () => {
        resolve({
          url: null,
          path: null,
          error: new Error("Failed to process image locally"),
        });
      };
      reader.readAsDataURL(file);
    });
  }

  try {
    const fileExt = file.name.split(".").pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
    const filePath = `hero/hero-${type}-${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("product-images")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) throw uploadError;

    const { data: publicUrlData } = supabase.storage
      .from("product-images")
      .getPublicUrl(filePath);

    return { url: publicUrlData.publicUrl, path: filePath, error: null };
  } catch (err) {
    console.error("Hero image storage upload error:", err);
    return { url: null, path: null, error: err };
  }
}

/**
 * Delete replaced hero image from Supabase Storage bucket
 */
export async function deleteHeroImage(storagePath) {
  if (!storagePath || !isSupabaseConfigured || !supabase) {
    return { success: true, error: null };
  }

  // Don't delete if it's a seed or local path
  if (storagePath.startsWith("local/") || storagePath.startsWith("/images/")) {
    return { success: true, error: null };
  }

  try {
    const { error } = await supabase.storage
      .from("product-images")
      .remove([storagePath]);

    if (error) throw error;
    return { success: true, error: null };
  } catch (err) {
    console.warn("Storage delete hero image error:", err);
    return { success: false, error: err };
  }
}
