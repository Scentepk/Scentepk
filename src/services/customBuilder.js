import { supabase, isSupabaseConfigured } from "../lib/supabase.js";
import {
  calculateCustomPerfumePrice,
  validateBuilderSelections,
  buildCustomConfigurationSnapshot,
} from "./customBuilderPricing.js";

export const LOCAL_STORAGE_BUILDER_KEY = "scente_custom_builder_cache";
export const BUILDER_UPDATE_EVENT = "scente:builder-update";

export const DEFAULT_BUILDER_SETTINGS = {
  id: "primary_builder_settings",
  is_active: false,
  base_price: 0,
  currency: "PKR",
  title: "BUILD YOUR SCENTE",
  subtitle: "Create a Fragrance That's Yours",
  description: "Choose your size, fragrance profile, notes, and intensity to create a scent made around your preferences.",
  updated_at: new Date().toISOString(),
};

/**
 * Normalizes builder settings from database or cache
 */
export function normalizeBuilderSettings(raw) {
  if (!raw || typeof raw !== "object") {
    return { ...DEFAULT_BUILDER_SETTINGS };
  }

  return {
    id: raw.id || "primary_builder_settings",
    is_active: Boolean(raw.is_active),
    base_price: Math.max(0, Math.round(Number(raw.base_price ?? raw.basePrice ?? 0))),
    currency: raw.currency || "PKR",
    title: raw.title || DEFAULT_BUILDER_SETTINGS.title,
    subtitle: raw.subtitle || DEFAULT_BUILDER_SETTINGS.subtitle,
    description: raw.description || DEFAULT_BUILDER_SETTINGS.description,
    updated_at: raw.updated_at || new Date().toISOString(),
  };
}

/**
 * Normalizes a group row from database or cache
 */
export function normalizeBuilderGroup(raw) {
  if (!raw || typeof raw !== "object") return null;

  return {
    id: raw.id,
    slug: raw.slug,
    name: raw.name,
    description: raw.description || "",
    selection_type: raw.selection_type || raw.selectionType || "single",
    is_required: raw.is_required !== undefined ? Boolean(raw.is_required) : true,
    min_selections: Math.max(0, Number(raw.min_selections ?? raw.minSelections ?? 1)),
    max_selections: Math.max(1, Number(raw.max_selections ?? raw.maxSelections ?? 1)),
    is_active: raw.is_active !== undefined ? Boolean(raw.is_active) : true,
    sort_order: Number(raw.sort_order ?? raw.sortOrder ?? 0),
    options: Array.isArray(raw.options) ? raw.options.map(normalizeBuilderOption).filter(Boolean) : [],
    created_at: raw.created_at || new Date().toISOString(),
    updated_at: raw.updated_at || new Date().toISOString(),
  };
}

/**
 * Normalizes an option row from database or cache
 */
export function normalizeBuilderOption(raw) {
  if (!raw || typeof raw !== "object") return null;

  return {
    id: raw.id,
    group_id: raw.group_id || raw.groupId,
    name: raw.name,
    slug: raw.slug,
    description: raw.description || "",
    category: raw.category || null,
    price_adjustment: Math.max(0, Math.round(Number(raw.price_adjustment ?? raw.priceAdjustment ?? 0))),
    image_url: raw.image_url || raw.imageUrl || null,
    storage_path: raw.storage_path || raw.storagePath || null,
    is_active: raw.is_active !== undefined ? Boolean(raw.is_active) : true,
    sort_order: Number(raw.sort_order ?? raw.sortOrder ?? 0),
    created_at: raw.created_at || new Date().toISOString(),
    updated_at: raw.updated_at || new Date().toISOString(),
  };
}

// In-memory flag to guard against repeated 404s if migration is not yet applied
let isBuilderTableAvailable = true;

/**
 * Reads local storage cache
 */
function getCachedBuilderConfig() {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_BUILDER_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        settings: normalizeBuilderSettings(parsed.settings),
        groups: Array.isArray(parsed.groups) ? parsed.groups.map(normalizeBuilderGroup).filter(Boolean) : [],
      };
    }
  } catch (e) {
    console.warn("Could not read local builder cache:", e);
  }
  return null;
}

/**
 * Writes local storage cache
 */
function setCachedBuilderConfig(config) {
  try {
    localStorage.setItem(LOCAL_STORAGE_BUILDER_KEY, JSON.stringify(config));
    window.dispatchEvent(new CustomEvent(BUILDER_UPDATE_EVENT, { detail: config }));
  } catch (e) {
    console.warn("Could not write local builder cache:", e);
  }
}

// ==============================================================================
// CUSTOMER / STOREFRONT READ OPERATIONS
// ==============================================================================

/**
 * Fetch active builder configuration for the storefront.
 * Returns only active settings, active groups, and active options.
 *
 * @returns {Promise<{
 *   data: { settings: Object, groups: Array<Object> },
 *   error: Error | null
 * }>}
 */
export async function getBuilderConfig() {
  const cached = getCachedBuilderConfig();

  if (!isSupabaseConfigured || !supabase || !isBuilderTableAvailable) {
    return {
      data: cached || {
        settings: normalizeBuilderSettings(null),
        groups: [],
      },
      error: null,
    };
  }

  try {
    // 1. Fetch singleton settings
    const { data: settingsRow, error: settingsError } = await supabase
      .from("custom_builder_settings")
      .select("*")
      .eq("id", "primary_builder_settings")
      .maybeSingle();

    if (settingsError) {
      if (
        settingsError.message?.includes("schema cache") ||
        settingsError.message?.includes("does not exist") ||
        settingsError.code === "PGRST205" ||
        settingsError.code === "42P01"
      ) {
        isBuilderTableAvailable = false;
        return { data: cached || { settings: normalizeBuilderSettings(null), groups: [] }, error: null };
      }
      throw settingsError;
    }

    const normalizedSettings = normalizeBuilderSettings(settingsRow);

    // 2. Fetch active groups
    const { data: groupsRows, error: groupsError } = await supabase
      .from("custom_builder_groups")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (groupsError) throw groupsError;

    // 3. Fetch active options for active groups
    const groupIds = (groupsRows || []).map((g) => g.id);
    let optionsRows = [];

    if (groupIds.length > 0) {
      const { data: optionsData, error: optionsError } = await supabase
        .from("custom_builder_options")
        .select("*")
        .eq("is_active", true)
        .in("group_id", groupIds)
        .order("sort_order", { ascending: true });

      if (optionsError) throw optionsError;
      optionsRows = optionsData || [];
    }

    // 4. Assemble tree
    const optionsByGroup = {};
    for (const opt of optionsRows) {
      const gid = opt.group_id;
      if (!optionsByGroup[gid]) optionsByGroup[gid] = [];
      optionsByGroup[gid].push(normalizeBuilderOption(opt));
    }

    const structuredGroups = (groupsRows || []).map((g) => {
      const norm = normalizeBuilderGroup(g);
      norm.options = optionsByGroup[g.id] || [];
      return norm;
    });

    const result = {
      settings: normalizedSettings,
      groups: structuredGroups,
    };

    setCachedBuilderConfig(result);
    return { data: result, error: null };
  } catch (err) {
    console.error("Error fetching builder configuration:", err);
    return {
      data: cached || { settings: normalizeBuilderSettings(null), groups: [] },
      error: err,
    };
  }
}

// ==============================================================================
// ADMIN READ OPERATIONS
// ==============================================================================

/**
 * Fetch complete builder configuration for Admin Management.
 * Returns settings, all groups (active + inactive), and all options (active + inactive).
 *
 * @returns {Promise<{
 *   data: { settings: Object, groups: Array<Object> },
 *   error: Error | null
 * }>}
 */
export async function getAdminBuilderConfig() {
  const cached = getCachedBuilderConfig();

  if (!isSupabaseConfigured || !supabase || !isBuilderTableAvailable) {
    return {
      data: cached || { settings: normalizeBuilderSettings(null), groups: [] },
      error: null,
    };
  }

  try {
    const { data: settingsRow, error: settingsError } = await supabase
      .from("custom_builder_settings")
      .select("*")
      .eq("id", "primary_builder_settings")
      .maybeSingle();

    if (settingsError) throw settingsError;

    const { data: groupsRows, error: groupsError } = await supabase
      .from("custom_builder_groups")
      .select("*")
      .order("sort_order", { ascending: true });

    if (groupsError) throw groupsError;

    const { data: optionsRows, error: optionsError } = await supabase
      .from("custom_builder_options")
      .select("*")
      .order("sort_order", { ascending: true });

    if (optionsError) throw optionsError;

    const optionsByGroup = {};
    for (const opt of optionsRows || []) {
      const gid = opt.group_id;
      if (!optionsByGroup[gid]) optionsByGroup[gid] = [];
      optionsByGroup[gid].push(normalizeBuilderOption(opt));
    }

    const structuredGroups = (groupsRows || []).map((g) => {
      const norm = normalizeBuilderGroup(g);
      norm.options = optionsByGroup[g.id] || [];
      return norm;
    });

    const result = {
      settings: normalizeBuilderSettings(settingsRow),
      groups: structuredGroups,
    };

    setCachedBuilderConfig(result);
    return { data: result, error: null };
  } catch (err) {
    console.error("Error fetching admin builder configuration:", err);
    return {
      data: cached || { settings: normalizeBuilderSettings(null), groups: [] },
      error: err,
    };
  }
}

// ==============================================================================
// ADMIN MUTATION OPERATIONS (PREPARED FOR PHASE 3)
// ==============================================================================

/**
 * Update global builder settings
 */
export async function updateBuilderSettingsAdmin(payload) {
  const norm = normalizeBuilderSettings({
    ...payload,
    updated_at: new Date().toISOString(),
  });

  if (!isSupabaseConfigured || !supabase) {
    const current = getCachedBuilderConfig() || { settings: norm, groups: [] };
    current.settings = norm;
    setCachedBuilderConfig(current);
    return { data: norm, error: null };
  }

  try {
    const { data, error } = await supabase
      .from("custom_builder_settings")
      .upsert({
        id: "primary_builder_settings",
        is_active: norm.is_active,
        base_price: norm.base_price,
        currency: norm.currency,
        title: norm.title,
        subtitle: norm.subtitle,
        description: norm.description,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    const updated = normalizeBuilderSettings(data);
    const cached = getCachedBuilderConfig();
    if (cached) {
      cached.settings = updated;
      setCachedBuilderConfig(cached);
    }

    return { data: updated, error: null };
  } catch (err) {
    console.error("Error updating builder settings:", err);
    return { data: null, error: err };
  }
}

/**
 * Create a new customization group
 */
export async function createBuilderGroupAdmin(groupPayload) {
  if (!isSupabaseConfigured || !supabase) {
    const newGroup = normalizeBuilderGroup({
      ...groupPayload,
      id: `local-grp-${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      options: [],
    });
    const cached = getCachedBuilderConfig() || { settings: normalizeBuilderSettings(null), groups: [] };
    cached.groups.push(newGroup);
    setCachedBuilderConfig(cached);
    return { data: newGroup, error: null };
  }

  try {
    const { data, error } = await supabase
      .from("custom_builder_groups")
      .insert({
        slug: groupPayload.slug,
        name: groupPayload.name,
        description: groupPayload.description || null,
        selection_type: groupPayload.selection_type || groupPayload.selectionType || "single",
        is_required: groupPayload.is_required !== undefined ? Boolean(groupPayload.is_required) : true,
        min_selections: Math.max(0, Number(groupPayload.min_selections ?? 1)),
        max_selections: Math.max(1, Number(groupPayload.max_selections ?? 1)),
        is_active: groupPayload.is_active !== undefined ? Boolean(groupPayload.is_active) : true,
        sort_order: Number(groupPayload.sort_order ?? 0),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return { data: normalizeBuilderGroup(data), error: null };
  } catch (err) {
    console.error("Error creating builder group:", err);
    return { data: null, error: err };
  }
}

/**
 * Update an existing customization group
 */
export async function updateBuilderGroupAdmin(groupId, groupPayload) {
  if (!isSupabaseConfigured || !supabase) {
    const cached = getCachedBuilderConfig();
    if (cached) {
      const idx = cached.groups.findIndex((g) => g.id === groupId);
      if (idx > -1) {
        cached.groups[idx] = normalizeBuilderGroup({ ...cached.groups[idx], ...groupPayload });
        setCachedBuilderConfig(cached);
        return { data: cached.groups[idx], error: null };
      }
    }
    return { data: null, error: new Error("Group not found in local cache") };
  }

  try {
    const { data, error } = await supabase
      .from("custom_builder_groups")
      .update({
        slug: groupPayload.slug,
        name: groupPayload.name,
        description: groupPayload.description || null,
        selection_type: groupPayload.selection_type || groupPayload.selectionType || "single",
        is_required: groupPayload.is_required !== undefined ? Boolean(groupPayload.is_required) : true,
        min_selections: Math.max(0, Number(groupPayload.min_selections ?? 1)),
        max_selections: Math.max(1, Number(groupPayload.max_selections ?? 1)),
        is_active: groupPayload.is_active !== undefined ? Boolean(groupPayload.is_active) : true,
        sort_order: Number(groupPayload.sort_order ?? 0),
        updated_at: new Date().toISOString(),
      })
      .eq("id", groupId)
      .select()
      .single();

    if (error) throw error;
    return { data: normalizeBuilderGroup(data), error: null };
  } catch (err) {
    console.error("Error updating builder group:", err);
    return { data: null, error: err };
  }
}

/**
 * Delete a customization group
 */
export async function deleteBuilderGroupAdmin(groupId) {
  if (!isSupabaseConfigured || !supabase) {
    const cached = getCachedBuilderConfig();
    if (cached) {
      cached.groups = cached.groups.filter((g) => g.id !== groupId);
      setCachedBuilderConfig(cached);
    }
    return { success: true, error: null };
  }

  try {
    const { error } = await supabase.from("custom_builder_groups").delete().eq("id", groupId);
    if (error) throw error;
    return { success: true, error: null };
  } catch (err) {
    console.error("Error deleting builder group:", err);
    return { success: false, error: err };
  }
}

/**
 * Create a new customization option
 */
export async function createBuilderOptionAdmin(optionPayload) {
  if (!isSupabaseConfigured || !supabase) {
    const newOption = normalizeBuilderOption({
      ...optionPayload,
      id: `local-opt-${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    const cached = getCachedBuilderConfig();
    if (cached) {
      const grp = cached.groups.find((g) => g.id === optionPayload.group_id);
      if (grp) grp.options.push(newOption);
      setCachedBuilderConfig(cached);
    }
    return { data: newOption, error: null };
  }

  try {
    const { data, error } = await supabase
      .from("custom_builder_options")
      .insert({
        group_id: optionPayload.group_id || optionPayload.groupId,
        name: optionPayload.name,
        slug: optionPayload.slug,
        description: optionPayload.description || null,
        category: optionPayload.category || null,
        price_adjustment: Math.max(0, Math.round(Number(optionPayload.price_adjustment || 0))),
        image_url: optionPayload.image_url || null,
        storage_path: optionPayload.storage_path || null,
        is_active: optionPayload.is_active !== undefined ? Boolean(optionPayload.is_active) : true,
        sort_order: Number(optionPayload.sort_order ?? 0),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return { data: normalizeBuilderOption(data), error: null };
  } catch (err) {
    console.error("Error creating builder option:", err);
    return { data: null, error: err };
  }
}

/**
 * Update an existing customization option
 */
export async function updateBuilderOptionAdmin(optionId, optionPayload) {
  if (!isSupabaseConfigured || !supabase) {
    const cached = getCachedBuilderConfig();
    if (cached) {
      for (const grp of cached.groups) {
        const idx = grp.options.findIndex((o) => o.id === optionId);
        if (idx > -1) {
          grp.options[idx] = normalizeBuilderOption({ ...grp.options[idx], ...optionPayload });
          setCachedBuilderConfig(cached);
          return { data: grp.options[idx], error: null };
        }
      }
    }
    return { data: null, error: new Error("Option not found in local cache") };
  }

  try {
    const { data, error } = await supabase
      .from("custom_builder_options")
      .update({
        name: optionPayload.name,
        slug: optionPayload.slug,
        description: optionPayload.description || null,
        category: optionPayload.category || null,
        price_adjustment: Math.max(0, Math.round(Number(optionPayload.price_adjustment || 0))),
        image_url: optionPayload.image_url || null,
        storage_path: optionPayload.storage_path || null,
        is_active: optionPayload.is_active !== undefined ? Boolean(optionPayload.is_active) : true,
        sort_order: Number(optionPayload.sort_order ?? 0),
        updated_at: new Date().toISOString(),
      })
      .eq("id", optionId)
      .select()
      .single();

    if (error) throw error;
    return { data: normalizeBuilderOption(data), error: null };
  } catch (err) {
    console.error("Error updating builder option:", err);
    return { data: null, error: err };
  }
}

/**
 * Delete a customization option
 */
export async function deleteBuilderOptionAdmin(optionId) {
  if (!isSupabaseConfigured || !supabase) {
    const cached = getCachedBuilderConfig();
    if (cached) {
      for (const grp of cached.groups) {
        grp.options = grp.options.filter((o) => o.id !== optionId);
      }
      setCachedBuilderConfig(cached);
    }
    return { success: true, error: null };
  }

  try {
    const { error } = await supabase.from("custom_builder_options").delete().eq("id", optionId);
    if (error) throw error;
    return { success: true, error: null };
  } catch (err) {
    console.error("Error deleting builder option:", err);
    return { success: false, error: err };
  }
}

/**
 * Batch reorder groups
 * @param {Array<{ id: string, sort_order: number }>} groupOrders
 */
export async function reorderBuilderGroupsAdmin(groupOrders = []) {
  if (!Array.isArray(groupOrders) || groupOrders.length === 0) {
    return { success: true, error: null };
  }

  if (!isSupabaseConfigured || !supabase) {
    const cached = getCachedBuilderConfig();
    if (cached) {
      groupOrders.forEach(({ id, sort_order }) => {
        const grp = cached.groups.find((g) => g.id === id);
        if (grp) grp.sort_order = sort_order;
      });
      cached.groups.sort((a, b) => a.sort_order - b.sort_order);
      setCachedBuilderConfig(cached);
    }
    return { success: true, error: null };
  }

  try {
    const updates = groupOrders.map(({ id, sort_order }) =>
      supabase
        .from("custom_builder_groups")
        .update({ sort_order, updated_at: new Date().toISOString() })
        .eq("id", id)
    );
    await Promise.all(updates);
    return { success: true, error: null };
  } catch (err) {
    console.error("Error reordering builder groups:", err);
    return { success: false, error: err };
  }
}

/**
 * Batch reorder options within a group
 * @param {Array<{ id: string, sort_order: number }>} optionOrders
 */
export async function reorderBuilderOptionsAdmin(optionOrders = []) {
  if (!Array.isArray(optionOrders) || optionOrders.length === 0) {
    return { success: true, error: null };
  }

  if (!isSupabaseConfigured || !supabase) {
    const cached = getCachedBuilderConfig();
    if (cached) {
      for (const grp of cached.groups) {
        optionOrders.forEach(({ id, sort_order }) => {
          const opt = grp.options.find((o) => o.id === id);
          if (opt) opt.sort_order = sort_order;
        });
        grp.options.sort((a, b) => a.sort_order - b.sort_order);
      }
      setCachedBuilderConfig(cached);
    }
    return { success: true, error: null };
  }

  try {
    const updates = optionOrders.map(({ id, sort_order }) =>
      supabase
        .from("custom_builder_options")
        .update({ sort_order, updated_at: new Date().toISOString() })
        .eq("id", id)
    );
    await Promise.all(updates);
    return { success: true, error: null };
  } catch (err) {
    console.error("Error reordering builder options:", err);
    return { success: false, error: err };
  }
}

// ==============================================================================
// IMAGE UPLOAD SERVICE (REUSES 'product-images' STORAGE BUCKET UNDER builder/)
// ==============================================================================

/**
 * Upload builder option image to Supabase Storage bucket 'product-images' (under builder/)
 *
 * @param {File} file
 * @returns {Promise<{ url: string | null, path: string | null, error: Error | null }>}
 */
export async function uploadBuilderOptionImageAdmin(file) {
  if (!file) return { url: null, path: null, error: new Error("No file provided") };

  const validTypes = ["image/jpeg", "image/png", "image/webp", "image/avif"];
  if (!validTypes.includes(file.type)) {
    return { url: null, path: null, error: new Error("Invalid format. Please upload JPEG, PNG, WebP, or AVIF.") };
  }

  // Size limit 5MB
  if (file.size > 5 * 1024 * 1024) {
    return { url: null, path: null, error: new Error("Image exceeds 5MB limit.") };
  }

  if (!isSupabaseConfigured || !supabase) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve({ url: reader.result, path: `local/builder/${file.name}`, error: null });
      };
      reader.onerror = () => {
        resolve({ url: null, path: null, error: new Error("Failed to read image locally") });
      };
      reader.readAsDataURL(file);
    });
  }

  try {
    const fileExt = file.name.split(".").pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
    const filePath = `builder/${fileName}`;

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
    console.error("Storage upload error for builder option:", err);
    return { url: null, path: null, error: err };
  }
}

// ==============================================================================
// AUTHORITATIVE PRICE VERIFICATION (SERVER / SERVICE SECURITY)
// ==============================================================================

/**
 * Authoritatively verifies a set of chosen builder option IDs against the active database configuration,
 * validating constraints and recalculating the authoritative total price.
 *
 * This function guarantees that client-side browser devtools price tampering is completely discarded.
 *
 * @param {Array<string>} selectedOptionIds - Array of option UUIDs passed by customer
 * @param {Object} [selectionsMap={}] - Group slug to option mapping
 * @returns {Promise<{
 *   isValid: boolean,
 *   basePrice: number,
 *   totalAdjustments: number,
 *   finalPrice: number,
 *   snapshot: Object | null,
 *   error: string | null
 * }>}
 */
export async function verifyAndCalculateCustomOrderPrice(selectedOptionIds = [], selectionsMap = {}) {
  try {
    const { data: config, error: configError } = await getBuilderConfig();
    if (configError || !config) {
      return {
        isValid: false,
        basePrice: 0,
        totalAdjustments: 0,
        finalPrice: 0,
        snapshot: null,
        error: "Unable to retrieve authoritative builder configuration.",
      };
    }

    const { settings, groups } = config;

    if (!settings.is_active) {
      return {
        isValid: false,
        basePrice: 0,
        totalAdjustments: 0,
        finalPrice: 0,
        snapshot: null,
        error: "Custom Perfume Builder is currently inactive.",
      };
    }

    // Run structural validation against groups
    const validationResult = validateBuilderSelections(groups, selectionsMap);
    if (!validationResult.isValid) {
      const errorMsg = Object.values(validationResult.errors).join("; ");
      return {
        isValid: false,
        basePrice: settings.base_price,
        totalAdjustments: 0,
        finalPrice: settings.base_price,
        snapshot: null,
        error: errorMsg || "Invalid builder selections.",
      };
    }

    // Authoritative calculation using verified option adjustments
    const basePrice = settings.base_price;
    const finalPrice = calculateCustomPerfumePrice(basePrice, validationResult.flattenedSelectedOptions);
    const totalAdjustments = Math.max(0, finalPrice - basePrice);

    // Build immutable snapshot
    const snapshot = buildCustomConfigurationSnapshot(
      settings,
      groups,
      selectionsMap,
      finalPrice
    );

    return {
      isValid: true,
      basePrice,
      totalAdjustments,
      finalPrice,
      snapshot,
      error: null,
    };
  } catch (err) {
    console.error("Authoritative price verification error:", err);
    return {
      isValid: false,
      basePrice: 0,
      totalAdjustments: 0,
      finalPrice: 0,
      snapshot: null,
      error: err.message || "Failed to authoritatively verify price.",
    };
  }
}
