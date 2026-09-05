import { supabase, isSupabaseConfigured } from "../lib/supabase.js";

/**
 * Fetch latest real-time stock and status for a list of variant IDs from Supabase
 * @param {string[]} variantIds - Array of variant UUIDs
 * @returns {Promise<{ data: Record<string, { id: string, stock_quantity: number, is_active: boolean, price: number, size: string }>, error: Error | null }>}
 */
export async function fetchVariantsStock(variantIds = []) {
  if (!variantIds || variantIds.length === 0) {
    return { data: {}, error: null };
  }

  // Deduplicate and filter valid IDs
  const cleanIds = Array.from(new Set(variantIds.filter(Boolean)));
  if (cleanIds.length === 0) {
    return { data: {}, error: null };
  }

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from("product_variants")
        .select("id, product_id, size, volume, price, stock_quantity, is_active")
        .in("id", cleanIds);

      if (error) throw error;

      const stockMap = {};
      (data || []).forEach((row) => {
        stockMap[row.id] = {
          id: row.id,
          productId: row.product_id,
          size: row.size,
          volume: row.volume,
          price: row.price,
          stockQuantity: Number(row.stock_quantity ?? 0),
          stock_quantity: Number(row.stock_quantity ?? 0),
          isActive: row.is_active !== false,
          is_active: row.is_active !== false,
          isOutOfStock: Number(row.stock_quantity ?? 0) <= 0 || row.is_active === false,
        };
      });

      return { data: stockMap, error: null };
    } catch (err) {
      console.warn("Supabase fetchVariantsStock error:", err);
    }
  }

  // Fallback to local admin cache if offline
  try {
    const raw = localStorage.getItem("scente_admin_products_cache");
    const stockMap = {};
    if (raw) {
      const products = JSON.parse(raw);
      products.forEach((p) => {
        const vars = p.product_variants || p.variants || [];
        vars.forEach((v) => {
          if (cleanIds.includes(v.id)) {
            stockMap[v.id] = {
              id: v.id,
              productId: p.id,
              size: v.size,
              volume: v.volume,
              price: v.price,
              stockQuantity: Number(v.stock_quantity ?? v.stockQuantity ?? 50),
              stock_quantity: Number(v.stock_quantity ?? v.stockQuantity ?? 50),
              isActive: v.is_active !== false,
              is_active: v.is_active !== false,
              isOutOfStock: Number(v.stock_quantity ?? 0) <= 0 || v.is_active === false,
            };
          }
        });
      });
    }
    return { data: stockMap, error: null };
  } catch (e) {
    return { data: {}, error: e };
  }
}

/**
 * Validate a set of cart items against real-time Supabase stock
 * Strictly treats public.product_variants.stock_quantity as the source of truth.
 *
 * @param {Array} cartItems - Array of cart item objects
 * @returns {Promise<{
 *   isValid: boolean,
 *   hasChanges: boolean,
 *   updatedItems: Array,
 *   unavailableItems: Array,
 *   adjustedItems: Array
 * }>}
 */
export async function validateCartStock(cartItems = []) {
  if (!cartItems || cartItems.length === 0) {
    return {
      isValid: true,
      hasChanges: false,
      updatedItems: [],
      unavailableItems: [],
      adjustedItems: [],
    };
  }

  // Collect all variant IDs
  const variantIds = cartItems
    .map((item) => item.variantId || item.variant?.id || item.product?.variants?.find((v) => v.size === item.size)?.id)
    .filter(Boolean);

  const { data: stockMap } = await fetchVariantsStock(variantIds);

  const updatedItems = [];
  const unavailableItems = [];
  const adjustedItems = [];
  let hasChanges = false;

  for (const item of cartItems) {
    const vId =
      item.variantId ||
      item.variant?.id ||
      item.product?.variants?.find((v) => v.size === item.size)?.id ||
      null;
    const liveVariant = vId ? stockMap[vId] : null;

    if (liveVariant) {
      const availableStock = Math.max(0, liveVariant.stockQuantity);
      const isAvailable = liveVariant.isActive && availableStock > 0;

      if (!isAvailable) {
        // Variant completely sold out or disabled
        unavailableItems.push({
          ...item,
          reason: "sold_out",
          availableStock: 0,
        });
        hasChanges = true;
        updatedItems.push({
          ...item,
          isUnavailable: true,
          availableStock: 0,
          variant: {
            ...(item.variant || {}),
            stockQuantity: 0,
            stock_quantity: 0,
            isOutOfStock: true,
          },
        });
      } else if (item.quantity > availableStock) {
        // Customer requested more than currently available
        adjustedItems.push({
          ...item,
          originalQuantity: item.quantity,
          adjustedQuantity: availableStock,
        });
        hasChanges = true;
        updatedItems.push({
          ...item,
          quantity: availableStock,
          isUnavailable: false,
          availableStock,
          variant: {
            ...(item.variant || {}),
            stockQuantity: availableStock,
            stock_quantity: availableStock,
            isOutOfStock: false,
          },
        });
      } else {
        // Stock sufficient
        updatedItems.push({
          ...item,
          isUnavailable: false,
          availableStock,
          variant: {
            ...(item.variant || {}),
            stockQuantity: availableStock,
            stock_quantity: availableStock,
            isOutOfStock: false,
          },
        });
      }
    } else {
      // If variant ID wasn't found in stockMap (offline/sample), retain item as-is
      updatedItems.push(item);
    }
  }

  const isValid = unavailableItems.length === 0 && adjustedItems.length === 0;

  return {
    isValid,
    hasChanges,
    updatedItems,
    unavailableItems,
    adjustedItems,
  };
}
