import { supabase, isSupabaseConfigured } from "../lib/supabase.js";

export const LOCAL_STORAGE_PROMOS_KEY = "scente_admin_promo_codes_cache";
const LOCAL_STORAGE_ORDERS_KEY = "scente_admin_orders_cache";

/**
 * Default Seed Promo Codes for offline/prototype execution
 */
export const DEFAULT_SEED_PROMOS = [
  {
    id: "promo-seed-1",
    code: "WELCOME10",
    discount_type: "percentage",
    discount_value: 10,
    min_order_amount: 3000,
    max_discount_amount: 1500,
    start_date: new Date(Date.now() - 86400000).toISOString(),
    expiry_date: new Date(Date.now() + 365 * 86400000).toISOString(),
    total_usage_limit: 500,
    per_customer_limit: 1,
    usage_count: 0,
    is_active: true,
    description: "Welcome introductory gift — 10% off on orders above PKR 3,000 (Max PKR 1,500)",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "promo-seed-2",
    code: "SCENTE500",
    discount_type: "fixed",
    discount_value: 500,
    min_order_amount: 4000,
    max_discount_amount: null,
    start_date: new Date(Date.now() - 86400000).toISOString(),
    expiry_date: new Date(Date.now() + 365 * 86400000).toISOString(),
    total_usage_limit: 200,
    per_customer_limit: 1,
    usage_count: 0,
    is_active: true,
    description: "Atelier privilege gift — PKR 500 fixed deduction on orders above PKR 4,000",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

/**
 * Initialize / Read local promo codes cache
 */
function getLocalPromoCodes() {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_PROMOS_KEY);
    if (!raw) {
      localStorage.setItem(LOCAL_STORAGE_PROMOS_KEY, JSON.stringify(DEFAULT_SEED_PROMOS));
      return [...DEFAULT_SEED_PROMOS];
    }
    return JSON.parse(raw);
  } catch (e) {
    console.warn("Failed to parse local promo codes cache:", e);
    return [...DEFAULT_SEED_PROMOS];
  }
}

/**
 * Save to local promo codes cache & broadcast update
 */
function saveLocalPromoCodes(codes) {
  try {
    localStorage.setItem(LOCAL_STORAGE_PROMOS_KEY, JSON.stringify(codes));
    window.dispatchEvent(new CustomEvent("scente_promos_updated", { detail: codes }));
  } catch (e) {
    console.error("Failed to save local promo codes cache:", e);
  }
}

/**
 * Determine dynamic status of a promo code
 * Returns: 'active' | 'scheduled' | 'expired' | 'inactive'
 */
export function getPromoCodeStatus(promo) {
  if (!promo.is_active) return "inactive";

  const now = new Date();
  if (promo.start_date && new Date(promo.start_date) > now) {
    return "scheduled";
  }

  if (promo.expiry_date && new Date(promo.expiry_date) < now) {
    return "expired";
  }

  if (promo.total_usage_limit && promo.usage_count >= promo.total_usage_limit) {
    return "expired";
  }

  return "active";
}

/**
 * Validate Promo Code for Customer Checkout
 * Tries Supabase RPC `validate_promo_code` first.
 * If offline or Supabase RPC fails, safely evaluates against local cache.
 */
export async function validatePromoCode(code, subtotal, customerPhone = "", customerEmail = "") {
  const cleanCode = (code || "").trim().toUpperCase();

  if (!cleanCode) {
    return {
      valid: false,
      message: "Please enter a promo code.",
    };
  }

  if (typeof subtotal !== "number" || subtotal <= 0) {
    return {
      valid: false,
      message: "Cart subtotal must be greater than zero.",
    };
  }

  // 1. Try remote Supabase RPC
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase.rpc("validate_promo_code", {
        p_code: cleanCode,
        p_subtotal: Math.round(subtotal),
        p_customer_phone: customerPhone?.trim() || null,
        p_customer_email: customerEmail?.trim() || null,
      });

      if (!error && data) {
        return {
          valid: Boolean(data.valid),
          code: data.code || cleanCode,
          discountType: data.discount_type,
          discountValue: Number(data.discount_value || 0),
          discountAmount: Number(data.discount_amount || 0),
          subtotal: Number(data.subtotal || subtotal),
          finalTotal: Number(data.final_total ?? (subtotal - (data.discount_amount || 0))),
          message: data.message || (data.valid ? "Promo code applied successfully." : "Invalid promo code."),
        };
      }
    } catch (rpcErr) {
      console.warn("Supabase RPC validate_promo_code failed, evaluating local rules:", rpcErr);
    }
  }

  // 2. Local fallback evaluation (Deterministic mirror of DB logic)
  const localCodes = getLocalPromoCodes();
  const promo = localCodes.find((p) => p.code.toUpperCase() === cleanCode);

  if (!promo) {
    return {
      valid: false,
      message: "Invalid promo code. Please verify and try again.",
    };
  }

  if (!promo.is_active) {
    return {
      valid: false,
      message: "This promo code is currently inactive.",
    };
  }

  const now = new Date();
  if (promo.start_date && new Date(promo.start_date) > now) {
    return {
      valid: false,
      message: "This promotional offer has not started yet.",
    };
  }

  if (promo.expiry_date && new Date(promo.expiry_date) < now) {
    return {
      valid: false,
      message: "This promo code has expired.",
    };
  }

  if (promo.min_order_amount && subtotal < Number(promo.min_order_amount)) {
    return {
      valid: false,
      message: `This code requires a minimum order value of PKR ${Number(promo.min_order_amount).toLocaleString()}.`,
    };
  }

  if (promo.total_usage_limit && promo.usage_count >= Number(promo.total_usage_limit)) {
    return {
      valid: false,
      message: "This promo code has reached its maximum usage limit.",
    };
  }

  // Per-customer usage check against local orders with phone normalization
  if (promo.per_customer_limit) {
    try {
      const orders = JSON.parse(localStorage.getItem(LOCAL_STORAGE_ORDERS_KEY) || "[]");
      const customerOrdersWithCode = orders.filter((ord) => {
        if (ord.promo_code !== promo.code) return false;
        if (ord.status === "cancelled") return false;

        let matchesPhone = false;
        if (customerPhone && ord.customer_phone) {
          const normInput = String(customerPhone).replace(/\D/g, "");
          const normSaved = String(ord.customer_phone).replace(/\D/g, "");
          matchesPhone =
            normInput.length >= 9 &&
            (normInput === normSaved ||
              normSaved.endsWith(normInput.slice(-9)) ||
              normInput.endsWith(normSaved.slice(-9)));
        }

        const matchesEmail =
          customerEmail && ord.customer_email?.toLowerCase() === customerEmail.trim().toLowerCase();
        return matchesPhone || matchesEmail;
      });

      if (customerOrdersWithCode.length >= Number(promo.per_customer_limit)) {
        return {
          valid: false,
          message: "You have already utilized this promo code the maximum allowed times.",
        };
      }
    } catch (e) {
      // Continue if local storage orders unreadable
    }
  }

  // Calculate discount amount
  let discountAmount = 0;
  if (promo.discount_type === "percentage") {
    const rawDiscount = Math.round((subtotal * Number(promo.discount_value)) / 100);
    if (promo.max_discount_amount && Number(promo.max_discount_amount) > 0) {
      discountAmount = Math.min(rawDiscount, Number(promo.max_discount_amount));
    } else {
      discountAmount = rawDiscount;
    }
  } else if (promo.discount_type === "fixed") {
    discountAmount = Math.min(Number(promo.discount_value), subtotal);
  }

  // Guard against negative payable totals
  discountAmount = Math.max(0, Math.min(discountAmount, subtotal));
  const finalTotal = Math.max(0, subtotal - discountAmount);

  return {
    valid: true,
    code: promo.code,
    discountType: promo.discount_type,
    discountValue: Number(promo.discount_value),
    discountAmount,
    subtotal,
    finalTotal,
    message: "Promo code applied successfully.",
  };
}

/**
 * Fetch all Promo Codes for Admin Panel
 */
export async function getAdminPromoCodes() {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from("promo_codes")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && data) {
        // Cache to local storage for offline resilience
        saveLocalPromoCodes(data);
        return data.map((item) => ({
          ...item,
          status: getPromoCodeStatus(item),
        }));
      }
      console.warn("Supabase getAdminPromoCodes error, falling back to cache:", error);
    } catch (e) {
      console.warn("Supabase query failed, falling back to local promo cache:", e);
    }
  }

  const localCodes = getLocalPromoCodes();
  return localCodes.map((item) => ({
    ...item,
    status: getPromoCodeStatus(item),
  }));
}

/**
 * Create a new Promo Code
 */
export async function createAdminPromoCode(payload) {
  const cleanCode = (payload.code || "").trim().toUpperCase();

  if (!cleanCode) {
    return { data: null, error: { message: "Promo code name is required." } };
  }

  const discountValue = Number(payload.discount_value);
  if (isNaN(discountValue) || discountValue <= 0) {
    return { data: null, error: { message: "Discount value must be a positive number." } };
  }

  if (payload.discount_type === "percentage" && discountValue > 100) {
    return { data: null, error: { message: "Percentage discount cannot exceed 100%." } };
  }

  const record = {
    code: cleanCode,
    discount_type: payload.discount_type || "percentage",
    discount_value: discountValue,
    min_order_amount: payload.min_order_amount ? Number(payload.min_order_amount) : null,
    max_discount_amount: payload.max_discount_amount ? Number(payload.max_discount_amount) : null,
    start_date: payload.start_date || null,
    expiry_date: payload.expiry_date || null,
    total_usage_limit: payload.total_usage_limit ? parseInt(payload.total_usage_limit, 10) : null,
    per_customer_limit: payload.per_customer_limit ? parseInt(payload.per_customer_limit, 10) : null,
    usage_count: 0,
    is_active: payload.is_active !== false,
    description: (payload.description || "").trim() || null,
  };

  // 1. Try Supabase
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from("promo_codes")
        .insert([record])
        .select()
        .single();

      if (error) {
        console.error("Supabase createAdminPromoCode error:", error);
        return { data: null, error };
      }

      // Update local cache
      const localCodes = getLocalPromoCodes();
      localCodes.unshift(data);
      saveLocalPromoCodes(localCodes);

      return { data, error: null };
    } catch (err) {
      console.warn("Supabase createAdminPromoCode failed, saving locally:", err);
    }
  }

  // 2. Local Fallback
  const localCodes = getLocalPromoCodes();
  if (localCodes.some((p) => p.code.toUpperCase() === cleanCode)) {
    return { data: null, error: { message: `Promo code "${cleanCode}" already exists.` } };
  }

  const newPromo = {
    ...record,
    id: `promo-${Date.now()}`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  localCodes.unshift(newPromo);
  saveLocalPromoCodes(localCodes);

  return { data: newPromo, error: null };
}

/**
 * Update an existing Promo Code
 */
export async function updateAdminPromoCode(id, payload) {
  const cleanCode = (payload.code || "").trim().toUpperCase();

  if (!cleanCode) {
    return { data: null, error: { message: "Promo code name is required." } };
  }

  const discountValue = Number(payload.discount_value);
  if (isNaN(discountValue) || discountValue <= 0) {
    return { data: null, error: { message: "Discount value must be a positive number." } };
  }

  if (payload.discount_type === "percentage" && discountValue > 100) {
    return { data: null, error: { message: "Percentage discount cannot exceed 100%." } };
  }

  const updateFields = {
    code: cleanCode,
    discount_type: payload.discount_type || "percentage",
    discount_value: discountValue,
    min_order_amount: payload.min_order_amount ? Number(payload.min_order_amount) : null,
    max_discount_amount: payload.max_discount_amount ? Number(payload.max_discount_amount) : null,
    start_date: payload.start_date || null,
    expiry_date: payload.expiry_date || null,
    total_usage_limit: payload.total_usage_limit ? parseInt(payload.total_usage_limit, 10) : null,
    per_customer_limit: payload.per_customer_limit ? parseInt(payload.per_customer_limit, 10) : null,
    is_active: payload.is_active !== false,
    description: (payload.description || "").trim() || null,
    updated_at: new Date().toISOString(),
  };

  // 1. Try Supabase
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from("promo_codes")
        .update(updateFields)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        console.error("Supabase updateAdminPromoCode error:", error);
        return { data: null, error };
      }

      const localCodes = getLocalPromoCodes().map((p) => (p.id === id ? data : p));
      saveLocalPromoCodes(localCodes);

      return { data, error: null };
    } catch (err) {
      console.warn("Supabase updateAdminPromoCode failed, updating locally:", err);
    }
  }

  // 2. Local Fallback
  const localCodes = getLocalPromoCodes();
  const index = localCodes.findIndex((p) => p.id === id);
  if (index === -1) {
    return { data: null, error: { message: "Promo code not found." } };
  }

  const updatedPromo = {
    ...localCodes[index],
    ...updateFields,
  };

  localCodes[index] = updatedPromo;
  saveLocalPromoCodes(localCodes);

  return { data: updatedPromo, error: null };
}

/**
 * Toggle Active / Inactive Status
 */
export async function toggleAdminPromoCodeStatus(id, isActive) {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from("promo_codes")
        .update({ is_active: isActive, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();

      if (!error && data) {
        const localCodes = getLocalPromoCodes().map((p) => (p.id === id ? data : p));
        saveLocalPromoCodes(localCodes);
        return { data, error: null };
      }
    } catch (e) {
      console.warn("Supabase toggle promo status failed, toggling locally:", e);
    }
  }

  const localCodes = getLocalPromoCodes();
  const index = localCodes.findIndex((p) => p.id === id);
  if (index !== -1) {
    localCodes[index].is_active = isActive;
    localCodes[index].updated_at = new Date().toISOString();
    saveLocalPromoCodes(localCodes);
    return { data: localCodes[index], error: null };
  }

  return { data: null, error: { message: "Promo code not found." } };
}

/**
 * Delete a Promo Code
 */
export async function deleteAdminPromoCode(id) {
  if (isSupabaseConfigured && supabase) {
    try {
      const { error } = await supabase
        .from("promo_codes")
        .delete()
        .eq("id", id);

      if (error) {
        console.error("Supabase deleteAdminPromoCode error:", error);
        return { error };
      }
    } catch (e) {
      console.warn("Supabase delete failed, removing locally:", e);
    }
  }

  const localCodes = getLocalPromoCodes().filter((p) => p.id !== id);
  saveLocalPromoCodes(localCodes);
  return { error: null };
}

/**
 * Increment usage count in local cache
 */
export function incrementLocalPromoUsage(code) {
  if (!code) return;
  const localCodes = getLocalPromoCodes();
  const cleanCode = code.trim().toUpperCase();
  const target = localCodes.find((p) => p.code.toUpperCase() === cleanCode);
  if (target) {
    target.usage_count = (target.usage_count || 0) + 1;
    target.updated_at = new Date().toISOString();
    saveLocalPromoCodes(localCodes);
  }
}
