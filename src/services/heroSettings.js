import { supabase, isSupabaseConfigured } from "../lib/supabase";

export const LOCAL_STORAGE_HERO_KEY = "scente_hero_settings_cache";
export const HERO_UPDATE_EVENT = "scente_hero_updated";

export const DEFAULT_HERO_SLIDES = [
  {
    id: "slide-1",
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
  },
  {
    id: "slide-2",
    eyebrow: "ATELIER EXTRAIT DE PARFUM",
    badge: "14+ HR LONGEVITY",
    headline_line1: "YOUR",
    headline_line2: "SIGNATURE.",
    headline_line3: "YOUR PRESENCE.",
    subtitle: "Cold-macerated extraits formulated to leave an indelible impression that lingers for 14+ hours.",
    cta_text: "EXPLORE FRAGRANCES",
    cta_link: "/shop",
    image_url: "/images/hero-campaign.jpg",
    mobile_image_url: "",
    storage_path: null,
    mobile_storage_path: null,
  },
  {
    id: "slide-3",
    eyebrow: "HAUTE PARFUMERIE",
    badge: "FREE COD ACROSS PAKISTAN",
    headline_line1: "PURE",
    headline_line2: "SENSORY",
    headline_line3: "DISTINCTION.",
    subtitle: "Artisanal perfumes hand-poured in strictly numbered batches with rare botanical essences.",
    cta_text: "EXPLORE FRAGRANCES",
    cta_link: "/shop",
    image_url: "/images/campaign/campaign-1.jpg",
    mobile_image_url: "",
    storage_path: null,
    mobile_storage_path: null,
  },
];

export const DEFAULT_HERO_SETTINGS = {
  id: "primary_hero",
  slides: DEFAULT_HERO_SLIDES,
  updated_at: new Date().toISOString(),
};

/**
 * Normalize an individual hero slide object
 */
export function normalizeSingleSlide(raw, defaultIndex = 0) {
  const fallback = DEFAULT_HERO_SLIDES[defaultIndex] || DEFAULT_HERO_SLIDES[0];
  if (!raw || typeof raw !== "object") return { ...fallback };

  return {
    id: raw.id || `slide-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    eyebrow: raw.eyebrow !== undefined ? String(raw.eyebrow).trim() : fallback.eyebrow,
    badge: raw.badge !== undefined ? String(raw.badge).trim() : fallback.badge,
    headline_line1:
      raw.headline_line1 !== undefined
        ? String(raw.headline_line1).trim()
        : raw.headlineLine1 !== undefined
        ? String(raw.headlineLine1).trim()
        : fallback.headline_line1,
    headline_line2:
      raw.headline_line2 !== undefined
        ? String(raw.headline_line2).trim()
        : raw.headlineLine2 !== undefined
        ? String(raw.headlineLine2).trim()
        : fallback.headline_line2,
    headline_line3:
      raw.headline_line3 !== undefined
        ? String(raw.headline_line3).trim()
        : raw.headlineLine3 !== undefined
        ? String(raw.headlineLine3).trim()
        : fallback.headline_line3,
    subtitle: raw.subtitle !== undefined ? String(raw.subtitle).trim() : fallback.subtitle,
    cta_text:
      raw.cta_text !== undefined
        ? String(raw.cta_text).trim()
        : raw.ctaText !== undefined
        ? String(raw.ctaText).trim()
        : fallback.cta_text,
    cta_link:
      raw.cta_link !== undefined
        ? String(raw.cta_link).trim()
        : raw.ctaLink !== undefined
        ? String(raw.ctaLink).trim()
        : fallback.cta_link,
    image_url: raw.image_url || raw.image || fallback.image_url,
    mobile_image_url: raw.mobile_image_url || raw.mobileImage || "",
    storage_path: raw.storage_path || null,
    mobile_storage_path: raw.mobile_storage_path || null,
  };
}

/**
 * Normalize and sanitize full hero settings from DB or LocalStorage
 */
export function normalizeHeroSettings(raw) {
  if (!raw || typeof raw !== "object") {
    return {
      id: "primary_hero",
      slides: DEFAULT_HERO_SLIDES.map((s, i) => normalizeSingleSlide(s, i)),
      updated_at: new Date().toISOString(),
    };
  }

  let slides = [];
  if (Array.isArray(raw.slides) && raw.slides.length > 0) {
    slides = raw.slides.map((s, i) => normalizeSingleSlide(s, i));
  } else if (raw.image_url || raw.headline_line1) {
    // Single slide legacy conversion
    slides = [normalizeSingleSlide(raw, 0)];
  } else {
    slides = DEFAULT_HERO_SLIDES.map((s, i) => normalizeSingleSlide(s, i));
  }

  return {
    id: raw.id || "primary_hero",
    slides,
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
    return { data: cached || normalizeHeroSettings(null), error: null };
  }

  try {
    const { data, error } = await supabase
      .from("hero_settings")
      .select("*")
      .eq("id", "primary_hero")
      .maybeSingle();

    if (error) {
      console.warn("Hero settings DB fetch warning:", error.message);
      return { data: cached || normalizeHeroSettings(null), error: null };
    }

    if (data) {
      const normalized = normalizeHeroSettings(data);
      try {
        localStorage.setItem(LOCAL_STORAGE_HERO_KEY, JSON.stringify(normalized));
      } catch (e) {}
      return { data: normalized, error: null };
    }

    // No row found, return cached or default
    return { data: cached || normalizeHeroSettings(null), error: null };
  } catch (err) {
    console.error("Failed to get hero settings:", err);
    return { data: cached || normalizeHeroSettings(null), error: null };
  }
}

/**
 * Save / Update hero settings (Writes to Supabase & LocalStorage, broadcasts event)
 */
export async function saveHeroSettings(payload) {
  if (!payload || typeof payload !== "object") {
    return { data: null, error: new Error("Invalid payload provided") };
  }

  const normalized = normalizeHeroSettings({
    ...payload,
    id: "primary_hero",
    updated_at: new Date().toISOString(),
  });

  if (!Array.isArray(normalized.slides) || normalized.slides.length === 0) {
    return { data: null, error: new Error("At least one hero slide is required.") };
  }

  // Primary slide for legacy column backward compatibility
  const primarySlide = normalized.slides[0];

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
      const upsertData = {
        id: "primary_hero",
        slides: normalized.slides,
        eyebrow: primarySlide.eyebrow,
        badge: primarySlide.badge,
        headline_line1: primarySlide.headline_line1,
        headline_line2: primarySlide.headline_line2,
        headline_line3: primarySlide.headline_line3,
        subtitle: primarySlide.subtitle,
        cta_text: primarySlide.cta_text,
        cta_link: primarySlide.cta_link,
        image_url: primarySlide.image_url,
        mobile_image_url: primarySlide.mobile_image_url || null,
        storage_path: primarySlide.storage_path,
        mobile_storage_path: primarySlide.mobile_storage_path,
        is_active: true,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from("hero_settings")
        .upsert(upsertData, { onConflict: "id" })
        .select()
        .single();

      if (error) throw error;

      return { data: normalizeHeroSettings(data), error: null };
    } catch (err) {
      console.error("Failed to save hero settings to Supabase:", err);
      // Return normalized local data so user isn't blocked if network is degraded
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
          path: `local/hero-${type}-${Date.now()}-${file.name}`,
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
 * Delete hero image from Supabase Storage bucket
 */
export async function deleteHeroImage(storagePath) {
  if (!storagePath || !isSupabaseConfigured || !supabase) {
    return { success: true, error: null };
  }

  // Don't delete static repository assets
  if (
    storagePath.startsWith("local/") ||
    storagePath.startsWith("/images/") ||
    storagePath.startsWith("images/")
  ) {
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
