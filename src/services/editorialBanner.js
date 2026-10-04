import { supabase, isSupabaseConfigured } from "../lib/supabase.js";

export const LOCAL_STORAGE_EDITORIAL_BANNER_KEY = "scente_editorial_banner_cache";
export const EDITORIAL_BANNER_UPDATE_EVENT = "scente:editorial-banner-update";

export const DEFAULT_EDITORIAL_BANNER_SETTINGS = {
  id: "primary_editorial_banner",
  image_url: "/images/campaign/perfume-dark-editorial.jpg",
  mobile_image_url: "",
  storage_path: null,
  mobile_storage_path: null,
  title: "",
  subtitle: "",
  button_text: "",
  button_link: "",
  is_active: true,
  updated_at: new Date().toISOString(),
};

/**
 * Normalizes editorial banner payload from database, cache, or form
 */
export function normalizeEditorialBannerSettings(raw) {
  if (!raw || typeof raw !== "object") {
    return { ...DEFAULT_EDITORIAL_BANNER_SETTINGS };
  }

  return {
    id: raw.id || "primary_editorial_banner",
    image_url: raw.image_url || DEFAULT_EDITORIAL_BANNER_SETTINGS.image_url,
    mobile_image_url: raw.mobile_image_url || "",
    storage_path: raw.storage_path || null,
    mobile_storage_path: raw.mobile_storage_path || null,
    title: typeof raw.title === "string" ? raw.title : "",
    subtitle: typeof raw.subtitle === "string" ? raw.subtitle : "",
    button_text: typeof raw.button_text === "string" ? raw.button_text : "",
    button_link: typeof raw.button_link === "string" ? raw.button_link : "",
    is_active: raw.is_active !== undefined ? Boolean(raw.is_active) : true,
    updated_at: raw.updated_at || new Date().toISOString(),
  };
}

// In-memory flag to avoid repetitive 404 network calls if migration has not been applied yet
let isEditorialTableAvailable = true;

/**
 * Fetch active editorial banner settings (Supabase first with LocalStorage cache fallback)
 */
export async function getEditorialBannerSettings() {
  // 1. Check local storage cache
  let cached = null;
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_EDITORIAL_BANNER_KEY);
    if (raw) {
      cached = normalizeEditorialBannerSettings(JSON.parse(raw));
    }
  } catch (e) {
    console.warn("Could not read local editorial banner cache:", e);
  }

  // If Supabase is not configured or table is known to be missing in schema cache, return cached or default
  if (!isSupabaseConfigured || !supabase || !isEditorialTableAvailable) {
    return { data: cached || normalizeEditorialBannerSettings(null), error: null };
  }

  try {
    const { data, error } = await supabase
      .from("homepage_editorial_banner")
      .select("*")
      .eq("id", "primary_editorial_banner")
      .maybeSingle();

    if (error) {
      if (
        error.message?.includes("schema cache") ||
        error.message?.includes("does not exist") ||
        error.code === "PGRST205" ||
        error.code === "42P01"
      ) {
        isEditorialTableAvailable = false;
        console.info(
          "SCENTE Info: 'public.homepage_editorial_banner' table not yet created in Supabase. Using local editorial banner settings. Run migration '014_homepage_editorial_banner.sql' to enable cloud persistence."
        );
      } else {
        console.warn("Editorial banner DB fetch warning:", error.message);
      }
      return { data: cached || normalizeEditorialBannerSettings(null), error: null };
    }

    if (data) {
      const normalized = normalizeEditorialBannerSettings(data);
      try {
        localStorage.setItem(LOCAL_STORAGE_EDITORIAL_BANNER_KEY, JSON.stringify(normalized));
      } catch (e) {}
      return { data: normalized, error: null };
    }

    return { data: cached || normalizeEditorialBannerSettings(null), error: null };
  } catch (err) {
    console.error("Failed to get editorial banner settings:", err);
    return { data: cached || normalizeEditorialBannerSettings(null), error: null };
  }
}

/**
 * Save / Update editorial banner settings (writes to Supabase & LocalStorage, broadcasts event)
 */
export async function saveEditorialBannerSettings(payload) {
  if (!payload || typeof payload !== "object") {
    return { data: null, error: new Error("Invalid payload provided") };
  }

  const normalized = normalizeEditorialBannerSettings({
    ...payload,
    id: "primary_editorial_banner",
    updated_at: new Date().toISOString(),
  });

  // Always update LocalStorage cache so storefront and admin update immediately
  try {
    localStorage.setItem(LOCAL_STORAGE_EDITORIAL_BANNER_KEY, JSON.stringify(normalized));
    window.dispatchEvent(new CustomEvent(EDITORIAL_BANNER_UPDATE_EVENT, { detail: normalized }));
  } catch (e) {
    console.warn("Could not write to local editorial banner cache:", e);
  }

  // If Supabase is configured, persist to cloud database
  if (isSupabaseConfigured && supabase) {
    try {
      const upsertData = {
        id: "primary_editorial_banner",
        image_url: normalized.image_url,
        mobile_image_url: normalized.mobile_image_url || null,
        storage_path: normalized.storage_path || null,
        mobile_storage_path: normalized.mobile_storage_path || null,
        title: normalized.title || null,
        subtitle: normalized.subtitle || null,
        button_text: normalized.button_text || null,
        button_link: normalized.button_link || null,
        is_active: normalized.is_active,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from("homepage_editorial_banner")
        .upsert(upsertData, { onConflict: "id" })
        .select()
        .single();

      if (error) throw error;

      isEditorialTableAvailable = true;
      return { data: normalizeEditorialBannerSettings(data), error: null };
    } catch (err) {
      console.error("Failed to save editorial banner to Supabase:", err);
      return {
        data: normalized,
        error: new Error(err.message || "Failed to persist to cloud database"),
      };
    }
  }

  return { data: normalized, error: null };
}

/**
 * Upload Editorial banner image to Supabase Storage bucket 'product-images' (under editorial/)
 */
export async function uploadEditorialBannerImage(file, type = "desktop") {
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
          path: `local/editorial-${type}-${Date.now()}-${file.name}`,
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
    const filePath = `editorial/editorial-${type}-${fileName}`;

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
    console.error("Editorial banner image upload error:", err);
    return { url: null, path: null, error: err };
  }
}

/**
 * Delete editorial banner image from Supabase Storage bucket
 */
export async function deleteEditorialBannerImage(storagePath) {
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
    console.warn("Storage delete editorial image error:", err);
    return { success: false, error: err };
  }
}
