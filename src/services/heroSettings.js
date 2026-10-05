import { supabase, isSupabaseConfigured } from "../lib/supabase.js";

export const LOCAL_STORAGE_HERO_KEY = "scente_hero_settings_cache";
export const LOCAL_STORAGE_HERO_DRAFT_KEY = "scente_hero_draft_settings";
export const HERO_UPDATE_EVENT = "scente_hero_updated";

export const DEFAULT_CROP_SETTINGS = {
  x: 50, // 0 to 100% horizontal center
  y: 50, // 0 to 100% vertical center
  zoom: 1.0, // 1.0x to 3.0x scale
  cropFrame: { x: 0, y: 0, width: 100, height: 100 },
};

export const DEFAULT_HERO_SLIDES = [
  {
    id: "slide-1",
    product_id: null,
    eyebrow: "SCENTEPK — BATCH 04",
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
    desktop_crop: { ...DEFAULT_CROP_SETTINGS, x: 70 }, // Position bottle comfortably on right side
    mobile_crop: { ...DEFAULT_CROP_SETTINGS, x: 50 },
  },
  {
    id: "slide-2",
    product_id: null,
    eyebrow: "EXTRAIT DE PARFUM",
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
    desktop_crop: { ...DEFAULT_CROP_SETTINGS, x: 68 },
    mobile_crop: { ...DEFAULT_CROP_SETTINGS, x: 50 },
  },
  {
    id: "slide-3",
    product_id: null,
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
    desktop_crop: { ...DEFAULT_CROP_SETTINGS, x: 74 },
    mobile_crop: { ...DEFAULT_CROP_SETTINGS, x: 50 },
  },
];

export const DEFAULT_HERO_SETTINGS = {
  id: "primary_hero",
  slides: DEFAULT_HERO_SLIDES,
  updated_at: new Date().toISOString(),
};

/**
 * Normalizes crop/position configuration safely
 */
export function normalizeCrop(rawCrop, fallback = DEFAULT_CROP_SETTINGS) {
  if (!rawCrop || typeof rawCrop !== "object") return { ...fallback };

  const x = typeof rawCrop.x === "number" && !isNaN(rawCrop.x) ? Math.min(100, Math.max(0, rawCrop.x)) : fallback.x;
  const y = typeof rawCrop.y === "number" && !isNaN(rawCrop.y) ? Math.min(100, Math.max(0, rawCrop.y)) : fallback.y;
  const zoom = typeof rawCrop.zoom === "number" && !isNaN(rawCrop.zoom) ? Math.min(3, Math.max(1, rawCrop.zoom)) : fallback.zoom;

  const rawFrame = rawCrop.cropFrame;
  const cropFrame = rawFrame && typeof rawFrame === "object" ? {
    x: typeof rawFrame.x === "number" ? Math.min(100, Math.max(0, rawFrame.x)) : 0,
    y: typeof rawFrame.y === "number" ? Math.min(100, Math.max(0, rawFrame.y)) : 0,
    width: typeof rawFrame.width === "number" ? Math.min(100, Math.max(10, rawFrame.width)) : 100,
    height: typeof rawFrame.height === "number" ? Math.min(100, Math.max(10, rawFrame.height)) : 100,
  } : { ...fallback.cropFrame };

  return { x, y, zoom, cropFrame };
}

/**
 * Normalize an individual hero slide object
 */
export function normalizeSingleSlide(raw, defaultIndex = 0) {
  const fallback = DEFAULT_HERO_SLIDES[defaultIndex] || DEFAULT_HERO_SLIDES[0];
  if (!raw || typeof raw !== "object") return { ...fallback };

  // Check if legacy objectPosition contains percentage (e.g. "object-[72%_center]")
  let legacyDesktopCrop = { ...fallback.desktop_crop };
  if (raw.objectPosition && typeof raw.objectPosition === "string") {
    const match = raw.objectPosition.match(/object-\[(\d+)%_/);
    if (match && match[1]) {
      legacyDesktopCrop.x = parseInt(match[1], 10);
    }
  }

  return {
    id: raw.id || `slide-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    product_id:
      raw.product_id !== undefined
        ? (raw.product_id || null)
        : raw.productId !== undefined
          ? (raw.productId || null)
          : (fallback.product_id || null),
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
    desktop_crop: normalizeCrop(raw.desktop_crop, legacyDesktopCrop),
    mobile_crop: normalizeCrop(raw.mobile_crop, fallback.mobile_crop),
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
      draft_slides: null,
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

  let draft_slides = null;
  if (Array.isArray(raw.draft_slides) && raw.draft_slides.length > 0) {
    draft_slides = raw.draft_slides.map((s, i) => normalizeSingleSlide(s, i));
  }

  return {
    id: raw.id || "primary_hero",
    slides,
    draft_slides,
    updated_at: raw.updated_at || new Date().toISOString(),
  };
}

// In-memory flag to avoid redundant failing network calls if the table has not yet been migrated
let isHeroTableAvailable = true;

/**
 * Fetch current hero settings (checks Supabase, falls back to LocalStorage, then DEFAULT_HERO_SETTINGS)
 * Returns { data: publishedSettings, draft: draftSettings | null, error: null }
 */
export async function getHeroSettings() {
  // 1. Check local storage cache for published settings
  let cached = null;
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_HERO_KEY);
    if (raw) {
      cached = normalizeHeroSettings(JSON.parse(raw));
    }
  } catch (e) {
    console.warn("Could not read local hero cache:", e);
  }

  // Check local draft cache
  let localDraft = null;
  try {
    const rawDraft = localStorage.getItem(LOCAL_STORAGE_HERO_DRAFT_KEY);
    if (rawDraft) {
      const parsedDraft = JSON.parse(rawDraft);
      if (Array.isArray(parsedDraft.slides) && parsedDraft.slides.length > 0) {
        localDraft = parsedDraft.slides.map((s, i) => normalizeSingleSlide(s, i));
      }
    }
  } catch (e) { }

  // If Supabase is not configured or table is missing, return cached or default
  if (!isSupabaseConfigured || !supabase || !isHeroTableAvailable) {
    const normalized = cached || normalizeHeroSettings(null);
    return {
      data: normalized,
      draft: localDraft || normalized.draft_slides || null,
      error: null,
    };
  }

  try {
    const { data, error } = await supabase
      .from("hero_settings")
      .select("*")
      .eq("id", "primary_hero")
      .maybeSingle();

    if (error) {
      if (
        error.message?.includes("schema cache") ||
        error.message?.includes("does not exist") ||
        error.code === "PGRST205" ||
        error.code === "42P01"
      ) {
        isHeroTableAvailable = false;
        console.info(
          "SCENTE Info: 'public.hero_settings' table has not been created in Supabase yet. Using local hero campaign slides."
        );
      } else {
        console.warn("Hero settings DB fetch warning:", error.message);
      }
      const normalized = cached || normalizeHeroSettings(null);
      return {
        data: normalized,
        draft: localDraft || normalized.draft_slides || null,
        error: null,
      };
    }

    if (data) {
      const normalized = normalizeHeroSettings(data);
      try {
        localStorage.setItem(LOCAL_STORAGE_HERO_KEY, JSON.stringify(normalized));
      } catch (e) { }

      // Prioritize local draft if newer or DB draft
      const activeDraft = localDraft || normalized.draft_slides || null;

      return { data: normalized, draft: activeDraft, error: null };
    }

    // No row found, return cached or default
    const normalized = cached || normalizeHeroSettings(null);
    return {
      data: normalized,
      draft: localDraft || normalized.draft_slides || null,
      error: null,
    };
  } catch (err) {
    console.error("Failed to get hero settings:", err);
    const normalized = cached || normalizeHeroSettings(null);
    return {
      data: normalized,
      draft: localDraft || normalized.draft_slides || null,
      error: null,
    };
  }
}

/**
 * Save / Update working DRAFT of hero settings (Persists to Supabase draft & LocalStorage)
 * DOES NOT impact live storefront!
 */
export async function saveHeroDraft(payload) {
  if (!payload || typeof payload !== "object") {
    return { data: null, error: new Error("Invalid draft payload provided") };
  }

  const slides = Array.isArray(payload.slides)
    ? payload.slides.map((s, i) => normalizeSingleSlide(s, i))
    : Array.isArray(payload)
      ? payload.map((s, i) => normalizeSingleSlide(s, i))
      : DEFAULT_HERO_SLIDES;

  const draftPayload = {
    id: "primary_hero",
    slides,
    updated_at: new Date().toISOString(),
  };

  // 1. Persist to local draft storage
  try {
    localStorage.setItem(LOCAL_STORAGE_HERO_DRAFT_KEY, JSON.stringify(draftPayload));
  } catch (e) {
    console.warn("Could not save to local draft cache:", e);
  }

  // 2. Persist to Supabase draft_slides if available
  if (isSupabaseConfigured && supabase) {
    try {
      // Check if draft_slides column can be updated on primary_hero
      const { data, error } = await supabase
        .from("hero_settings")
        .update({
          draft_slides: slides,
          updated_at: new Date().toISOString(),
        })
        .eq("id", "primary_hero")
        .select()
        .single();

      if (!error && data) {
        return { data: slides, error: null };
      }
    } catch (err) {
      // If column draft_slides doesn't exist yet, local draft storage is already active
      console.warn("Cloud draft persistence fallback to local cache:", err.message);
    }
  }

  return { data: slides, error: null };
}

/**
 * Publish hero settings (Writes published settings to Supabase & LocalStorage, clears draft, broadcasts event)
 * Instantly updates live storefront!
 */
export async function publishHeroSettings(payload) {
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

  // Clear local draft cache since it is now published
  try {
    localStorage.removeItem(LOCAL_STORAGE_HERO_DRAFT_KEY);
    localStorage.setItem(LOCAL_STORAGE_HERO_KEY, JSON.stringify(normalized));
    window.dispatchEvent(new CustomEvent(HERO_UPDATE_EVENT, { detail: normalized }));
  } catch (e) {
    console.warn("Could not write to local hero cache:", e);
  }

  // If Supabase is configured, persist to database
  if (isSupabaseConfigured && supabase) {
    const primarySlide = normalized.slides[0];
    try {
      const upsertData = {
        id: "primary_hero",
        slides: normalized.slides,
        draft_slides: null, // Clear draft upon publishing
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
        desktop_crop: primarySlide.desktop_crop,
        mobile_crop: primarySlide.mobile_crop,
        is_active: true,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from("hero_settings")
        .upsert(upsertData, { onConflict: "id" })
        .select()
        .single();

      if (error) {
        // If error was due to unknown columns (like draft_slides or desktop_crop before migration), retry with base columns
        if (error.message?.includes("column") || error.code === "42703") {
          delete upsertData.draft_slides;
          delete upsertData.desktop_crop;
          delete upsertData.mobile_crop;
          const retry = await supabase
            .from("hero_settings")
            .upsert(upsertData, { onConflict: "id" })
            .select()
            .single();
          if (retry.error) throw retry.error;
          isHeroTableAvailable = true;
          return { data: normalizeHeroSettings(retry.data), error: null };
        }
        throw error;
      }

      isHeroTableAvailable = true;
      return { data: normalizeHeroSettings(data), error: null };
    } catch (err) {
      console.error("Failed to publish hero settings to Supabase:", err);
      return {
        data: normalized,
        error: new Error(err.message || "Failed to persist to cloud database"),
      };
    }
  }

  return { data: normalized, error: null };
}

/**
 * Discard hero draft changes and revert to published state
 */
export async function discardHeroDraft() {
  try {
    localStorage.removeItem(LOCAL_STORAGE_HERO_DRAFT_KEY);
  } catch (e) { }

  if (isSupabaseConfigured && supabase) {
    try {
      await supabase
        .from("hero_settings")
        .update({ draft_slides: null })
        .eq("id", "primary_hero");
    } catch (e) { }
  }

  return { success: true };
}

/**
 * Backward compatibility alias for saveHeroSettings
 */
export async function saveHeroSettings(payload) {
  return publishHeroSettings(payload);
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
