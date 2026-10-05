import { supabase, isSupabaseConfigured } from "../lib/supabase.js";

const LOCAL_STORAGE_ORDERS_KEY = "scente_admin_orders_cache";
const LOCAL_STORAGE_PRODUCTS_KEY = "scente_admin_products_cache";

/**
 * Initializes and retrieves the local prototype orders list
 */
function getLocalOrdersStore() {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_ORDERS_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        if (!parsed.some((o) => o.id === "ord-951382" || o.reference === "SC-951382")) {
          parsed.unshift(initial[0]);
          saveLocalOrdersStore(parsed);
        }
        return parsed;
      }
    }
  } catch (e) {
    console.error("Error reading local orders cache:", e);
  }

  // Initial demo records
  const initial = [
    {
      id: "ord-951382",
      reference: "SC-951382",
      customer_full_name: "Farhan Al-Rashid",
      customer_phone: "0300 9513820",
      customer_email: "farhan.rashid@scente.pk",
      shipping_address: "Villa 9, Street 8, Sector F-8/3",
      city: "Islamabad",
      province: "Islamabad Capital Territory",
      postal_code: "44000",
      payment_method: "cod",
      subtotal: 3300,
      delivery_fee: 0,
      total: 3300,
      status: "pending",
      carrier: null,
      tracking_number: null,
      cancelled_at: null,
      notes: "Handle bespoke flacon with care.",
      created_at: new Date(Date.now() - 1800000).toISOString(),
      updated_at: new Date(Date.now() - 1800000).toISOString(),
      order_items: [
        {
          id: "item-custom-1",
          is_custom: true,
          product_id: null,
          product_name: "Custom SCENTE",
          product_slug: "custom-scente",
          size: "50ml",
          quantity: 1,
          unit_price: 3300,
          line_total: 3300,
          custom_configuration: {
            base_price: 2500,
            total_price: 3300,
            formatted_total_price: "PKR 3,300",
            currency: "PKR",
            summary: "50ml · Woody · Amber · Bourbon Vanilla",
            created_at: new Date(Date.now() - 1800000).toISOString(),
            groups: [
              {
                group_id: "grp-size",
                group_slug: "bottle-size",
                group_name: "Bottle Size",
                selected_options: [
                  {
                    id: "opt-50ml",
                    name: "50ml Flacon",
                    slug: "50ml",
                    category: null,
                    price_adjustment: 0,
                  },
                ],
              },
              {
                group_id: "grp-notes",
                group_slug: "notes",
                group_name: "Fragrance Notes",
                selected_options: [
                  {
                    id: "opt-woody",
                    name: "Woody",
                    slug: "woody",
                    category: "Heart Note",
                    price_adjustment: 300,
                  },
                  {
                    id: "opt-amber",
                    name: "Amber",
                    slug: "amber",
                    category: "Heart Note",
                    price_adjustment: 200,
                  },
                ],
              },
              {
                group_id: "grp-base",
                group_slug: "base-accord",
                group_name: "Base Accord",
                selected_options: [
                  {
                    id: "opt-bourbon-vanilla",
                    name: "Bourbon Vanilla",
                    slug: "bourbon-vanilla",
                    category: "Base Note",
                    price_adjustment: 300,
                  },
                ],
              },
            ],
          },
        },
      ],
    },
    {
      id: "ord-849204",
      reference: "SC-849204",
      customer_full_name: "Tariq Mansoor",
      customer_phone: "0300 1234567",
      customer_email: "tariq.mansoor@example.com",
      shipping_address: "House 42, Street 14, Phase 6, DHA",
      city: "Karachi",
      province: "Sindh",
      postal_code: "75500",
      payment_method: "cod",
      subtotal: 12500,
      delivery_fee: 0,
      total: 12500,
      status: "pending",
      carrier: null,
      tracking_number: null,
      cancelled_at: null,
      notes: "Please call upon arrival.",
      created_at: new Date(Date.now() - 3600000).toISOString(),
      updated_at: new Date(Date.now() - 3600000).toISOString(),
      order_items: [
        {
          id: "item-1",
          is_custom: false,
          product_id: "scente-noir",
          product_name: "SCENTE NOIR",
          product_slug: "scente-noir",
          size: "50ml",
          quantity: 1,
          unit_price: 12500,
          line_total: 12500,
        },
      ],
    },
    {
      id: "ord-619482",
      reference: "SC-619482",
      customer_full_name: "Ayesha Malik",
      customer_phone: "0321 9876543",
      customer_email: "ayesha.malik@domain.pk",
      shipping_address: "Apartment 5B, Gulberg Heights, Main Boulevard",
      city: "Lahore",
      province: "Punjab",
      postal_code: "54000",
      payment_method: "cod",
      subtotal: 17800,
      delivery_fee: 0,
      total: 17800,
      status: "confirmed",
      carrier: "TCS Express",
      tracking_number: null,
      cancelled_at: null,
      notes: "Mixed luxury parcel (Catalog + Bespoke).",
      created_at: new Date(Date.now() - 14400000).toISOString(),
      updated_at: new Date(Date.now() - 7200000).toISOString(),
      order_items: [
        {
          id: "item-2",
          is_custom: false,
          product_id: "scente-amber",
          product_name: "SCENTE AMBER",
          product_slug: "scente-amber",
          size: "50ml",
          quantity: 1,
          unit_price: 14500,
          line_total: 14500,
        },
        {
          id: "item-2-custom",
          is_custom: true,
          product_id: null,
          product_name: "Custom SCENTE",
          product_slug: "custom-scente",
          size: "50ml",
          quantity: 1,
          unit_price: 3300,
          line_total: 3300,
          custom_configuration: {
            base_price: 2500,
            total_price: 3300,
            formatted_total_price: "PKR 3,300",
            currency: "PKR",
            summary: "50ml · Woody · Amber · Bourbon Vanilla",
            created_at: new Date(Date.now() - 14400000).toISOString(),
            groups: [
              {
                group_id: "grp-size",
                group_slug: "bottle-size",
                group_name: "Bottle Size",
                selected_options: [
                  { id: "opt-50ml", name: "50ml Flacon", slug: "50ml", price_adjustment: 0 },
                ],
              },
              {
                group_id: "grp-notes",
                group_slug: "notes",
                group_name: "Fragrance Notes",
                selected_options: [
                  { id: "opt-woody", name: "Woody", slug: "woody", price_adjustment: 300 },
                  { id: "opt-amber", name: "Amber", slug: "amber", price_adjustment: 200 },
                ],
              },
              {
                group_id: "grp-base",
                group_slug: "base-accord",
                group_name: "Base Accord",
                selected_options: [
                  { id: "opt-bourbon-vanilla", name: "Bourbon Vanilla", slug: "bourbon-vanilla", price_adjustment: 300 },
                ],
              },
            ],
          },
        },
      ],
    },
    {
      id: "ord-392105",
      reference: "SC-392105",
      customer_full_name: "Bilal Khan",
      customer_phone: "0333 5551234",
      customer_email: "bilal.khan@office.com",
      shipping_address: "House 18, Sector F-7/2",
      city: "Islamabad",
      province: "Islamabad Capital Territory",
      postal_code: "44000",
      payment_method: "cod",
      subtotal: 26000,
      delivery_fee: 0,
      total: 26000,
      status: "shipped",
      carrier: "Leopard Express",
      tracking_number: "LEO-9842104",
      shipped_at: new Date(Date.now() - 28800000).toISOString(),
      delivered_at: null,
      cancelled_at: null,
      notes: "Leave at concierge desk.",
      created_at: new Date(Date.now() - 86400000).toISOString(),
      updated_at: new Date(Date.now() - 28800000).toISOString(),
      order_items: [
        {
          id: "item-3",
          product_id: "scente-noir",
          product_name: "SCENTE NOIR",
          product_slug: "scente-noir",
          size: "50ml",
          quantity: 1,
          unit_price: 12500,
          line_total: 12500,
        },
        {
          id: "item-4",
          product_id: "scente-musk",
          product_name: "SCENTE MUSK",
          product_slug: "scente-musk",
          size: "50ml",
          quantity: 1,
          unit_price: 13500,
          line_total: 13500,
        },
      ],
    },
    {
      id: "ord-742918",
      reference: "SC-742918",
      customer_full_name: "Zainab Shah",
      customer_phone: "0345 8887766",
      customer_email: "zainab.shah@gmail.com",
      shipping_address: "Bungalow 12, Street 3, F-6/3",
      city: "Islamabad",
      province: "Islamabad Capital Territory",
      postal_code: "44000",
      payment_method: "cod",
      subtotal: 15500,
      delivery_fee: 0,
      total: 15500,
      status: "delivered",
      carrier: "TCS Express",
      tracking_number: "TCS-7192834",
      shipped_at: new Date(Date.now() - 172800000).toISOString(),
      delivered_at: new Date(Date.now() - 86400000).toISOString(),
      cancelled_at: null,
      notes: "",
      created_at: new Date(Date.now() - 259200000).toISOString(),
      updated_at: new Date(Date.now() - 86400000).toISOString(),
      order_items: [
        {
          id: "item-5",
          product_id: "scente-rose",
          product_name: "SCENTE ROSE",
          product_slug: "scente-rose",
          size: "50ml",
          quantity: 1,
          unit_price: 15500,
          line_total: 15500,
        },
      ],
    },
  ];

  try {
    localStorage.setItem(LOCAL_STORAGE_ORDERS_KEY, JSON.stringify(initial));
  } catch (e) {}
  return initial;
}

function saveLocalOrdersStore(orders) {
  try {
    localStorage.setItem(LOCAL_STORAGE_ORDERS_KEY, JSON.stringify(orders));
  } catch (e) {
    console.error("Error saving local orders cache:", e);
  }
}

/**
 * Fetch orders list with search, filter, and sorting
 */
export async function getAllOrdersAdmin({ search = "", status = "all", sortBy = "newest" } = {}) {
  if (!isSupabaseConfigured || !supabase) {
    let items = getLocalOrdersStore();

    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter(
        (o) =>
          o.reference.toLowerCase().includes(q) ||
          o.customer_full_name.toLowerCase().includes(q) ||
          o.customer_phone.includes(q) ||
          o.city.toLowerCase().includes(q) ||
          (o.tracking_number && o.tracking_number.toLowerCase().includes(q))
      );
    }

    if (status !== "all") {
      items = items.filter((o) => o.status === status);
    }

    if (sortBy === "newest") {
      items.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    } else if (sortBy === "oldest") {
      items.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    } else if (sortBy === "highest") {
      items.sort((a, b) => b.total - a.total);
    } else if (sortBy === "lowest") {
      items.sort((a, b) => a.total - b.total);
    }

    return { data: items, error: null };
  }

  try {
    let query = supabase
      .from("orders")
      .select("*, order_items(*)");

    if (search.trim()) {
      query = query.or(
        `reference.ilike.%${search.trim()}%,customer_full_name.ilike.%${search.trim()}%,customer_phone.ilike.%${search.trim()}%,tracking_number.ilike.%${search.trim()}%`
      );
    }

    if (status !== "all") {
      query = query.eq("status", status);
    }

    if (sortBy === "oldest") {
      query = query.order("created_at", { ascending: true });
    } else if (sortBy === "highest") {
      query = query.order("total", { ascending: false });
    } else if (sortBy === "lowest") {
      query = query.order("total", { ascending: true });
    } else {
      query = query.order("created_at", { ascending: false });
    }

    const { data, error } = await query;
    if (error) throw error;

    return { data: data || [], error: null };
  } catch (err) {
    console.error("Failed to fetch admin orders from Supabase:", err);
    return { data: [], error: err };
  }
}

const isUuid = (val) =>
  typeof val === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val.trim());

/**
 * Fetch a single order by ID or reference with full items breakdown
 */
export async function getOrderByIdAdmin(idOrRef) {
  if (!idOrRef) return { data: null, error: new Error("Order identifier required") };

  if (!isSupabaseConfigured || !supabase) {
    const items = getLocalOrdersStore();
    const match = items.find((o) => o.id === idOrRef || o.reference === idOrRef);
    if (!match) return { data: null, error: new Error("Order not found") };
    return { data: match, error: null };
  }

  try {
    let query = supabase.from("orders").select("*, order_items(*)");
    if (isUuid(idOrRef)) {
      query = query.eq("id", idOrRef.trim());
    } else {
      query = query.eq("reference", idOrRef.trim().toUpperCase());
    }

    const { data, error } = await query.single();

    if (error) throw error;
    return { data, error: null };
  } catch (err) {
    console.error(`Failed to fetch order ${idOrRef}:`, err);
    return { data: null, error: err };
  }
}

/**
 * Update order status
 * If newStatus is 'cancelled', triggers server-side atomic stock restoration RPC
 * with idempotency guards against double restoration.
 */
export async function updateOrderStatusAdmin(orderId, newStatus) {
  const allowedStatuses = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"];
  if (!allowedStatuses.includes(newStatus)) {
    return { data: null, error: new Error(`Invalid status "${newStatus}".`) };
  }

  // 1. Specialized handling for cancellation with inventory restoration
  if (newStatus === "cancelled") {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.rpc("cancel_order_and_restore_stock", {
          p_order_id: String(orderId),
        });

        if (error) throw error;

        // Fetch refreshed order record
        const { data: updatedOrder } = await getOrderByIdAdmin(orderId);
        return {
          data: updatedOrder,
          restoredUnits: data?.restored_units || 0,
          alreadyCancelled: data?.already_cancelled || false,
          error: null,
        };
      } catch (err) {
        console.warn("Supabase cancel_order_and_restore_stock error, falling back to local restoration:", err);
      }
    }

    // Local fallback stock restoration
    const items = getLocalOrdersStore();
    const idx = items.findIndex((o) => o.id === orderId || o.reference === orderId);
    if (idx === -1) return { data: null, error: new Error("Order not found") };

    const targetOrder = items[idx];
    let restoredCount = 0;

    // Idempotency check: Only restore if not already cancelled
    if (targetOrder.status !== "cancelled" && !targetOrder.cancelled_at) {
      try {
        const localProducts = JSON.parse(localStorage.getItem(LOCAL_STORAGE_PRODUCTS_KEY) || "[]");
        (targetOrder.order_items || []).forEach((item) => {
          const prod = localProducts.find((p) => p.id === item.product_id);
          if (prod) {
            if (Array.isArray(prod.variants) && prod.variants.length > 0) {
              const variant = prod.variants.find((v) => v.id === item.variant_id || v.size === item.size);
              if (variant) {
                variant.stock_quantity = (variant.stock_quantity || 0) + (item.quantity || 1);
                variant.isOutOfStock = variant.stock_quantity <= 0;
              }
              prod.stock_quantity = prod.variants.reduce((sum, v) => sum + (Number(v.stock_quantity) || 0), 0);
            } else {
              prod.stock_quantity = (prod.stock_quantity || 0) + (item.quantity || 1);
            }
            if (prod.status === "out_of_stock" && prod.stock_quantity > 0) {
              prod.status = "active";
            }
            restoredCount += item.quantity || 1;
          }
        });
        localStorage.setItem(LOCAL_STORAGE_PRODUCTS_KEY, JSON.stringify(localProducts));
      } catch (e) {
        console.error("Local stock restoral error:", e);
      }
      targetOrder.cancelled_at = new Date().toISOString();
    }

    targetOrder.status = "cancelled";
    targetOrder.updated_at = new Date().toISOString();
    saveLocalOrdersStore(items);

    return {
      data: targetOrder,
      restoredUnits: restoredCount,
      alreadyCancelled: restoredCount === 0,
      error: null,
    };
  }

  // 2. Standard status updates (pending, confirmed, processing, shipped, delivered)
  if (!isSupabaseConfigured || !supabase) {
    const items = getLocalOrdersStore();
    const idx = items.findIndex((o) => o.id === orderId || o.reference === orderId);
    if (idx === -1) return { data: null, error: new Error("Order not found") };

    items[idx].status = newStatus;
    if (newStatus === "shipped" && !items[idx].shipped_at) {
      items[idx].shipped_at = new Date().toISOString();
    }
    if (newStatus === "delivered" && !items[idx].delivered_at) {
      if (!items[idx].shipped_at) items[idx].shipped_at = new Date().toISOString();
      items[idx].delivered_at = new Date().toISOString();
    }
    if (newStatus === "cancelled" && !items[idx].cancelled_at) {
      items[idx].cancelled_at = new Date().toISOString();
    }
    items[idx].updated_at = new Date().toISOString();
    saveLocalOrdersStore(items);
    return { data: items[idx], error: null };
  }

  try {
    let query = supabase
      .from("orders")
      .update({ status: newStatus, updated_at: new Date().toISOString() });

    if (isUuid(orderId)) {
      query = query.eq("id", orderId.trim());
    } else {
      query = query.eq("reference", orderId.trim().toUpperCase());
    }

    const { data, error } = await query.select("*, order_items(*)").single();

    if (error) throw error;
    return { data, error: null };
  } catch (err) {
    console.error(`Failed to update status for order ${orderId}:`, err);
    return { data: null, error: err };
  }
}

/**
 * Admin: Update shipment carrier and tracking/consignment number
 */
export async function updateOrderTrackingAdmin(orderId, { carrier, trackingNumber }) {
  const payload = {
    carrier: carrier ? carrier.trim() : null,
    tracking_number: trackingNumber ? trackingNumber.trim() : null,
    updated_at: new Date().toISOString(),
  };

  if (!isSupabaseConfigured || !supabase) {
    const items = getLocalOrdersStore();
    const idx = items.findIndex((o) => o.id === orderId || o.reference === orderId);
    if (idx === -1) return { data: null, error: new Error("Order not found") };

    items[idx] = { ...items[idx], ...payload };
    saveLocalOrdersStore(items);
    return { data: items[idx], error: null };
  }

  try {
    let query = supabase.from("orders").update(payload);
    if (isUuid(orderId)) {
      query = query.eq("id", orderId.trim());
    } else {
      query = query.eq("reference", orderId.trim().toUpperCase());
    }

    const { data, error } = await query.select().single();

    if (error) throw error;
    return { data, error: null };
  } catch (err) {
    console.error(`Failed to update tracking for order ${orderId}:`, err);
    return { data: null, error: err };
  }
}

/**
 * Safely restores reserved inventory for an order if it is in an active pre-dispatch state.
 * Idempotent: Never restores stock if the order was already cancelled or delivered.
 * Custom items (is_custom: true) are strictly skipped and do not affect catalog inventory.
 */
async function restoreOrderStockBeforeDelete(idOrRef) {
  if (!idOrRef) return;

  if (isSupabaseConfigured && supabase) {
    try {
      let query = supabase.from("orders").select("id, status, cancelled_at");
      if (isUuid(idOrRef)) {
        query = query.eq("id", idOrRef.trim());
      } else {
        query = query.eq("reference", idOrRef.trim().toUpperCase());
      }
      const { data: ord } = await query.maybeSingle();

      if (ord && ["pending", "confirmed", "processing"].includes(ord.status) && !ord.cancelled_at) {
        await supabase.rpc("cancel_order_and_restore_stock", {
          p_order_id: String(ord.id),
        });
      }
    } catch (err) {
      console.warn(`Could not restore stock before deleting order ${idOrRef}:`, err);
    }
    return;
  }

  // Local storage prototype restoral
  try {
    const items = getLocalOrdersStore();
    const targetOrder = items.find((o) => o.id === idOrRef || o.reference === idOrRef);
    if (!targetOrder || !["pending", "confirmed", "processing"].includes(targetOrder.status) || targetOrder.cancelled_at) {
      return;
    }

    const localProducts = JSON.parse(localStorage.getItem(LOCAL_STORAGE_PRODUCTS_KEY) || "[]");
    let changed = false;

    (targetOrder.order_items || []).forEach((item) => {
      if (item.is_custom) return; // Custom items never touch catalog variant stock
      const prod = localProducts.find((p) => p.id === item.product_id);
      if (prod) {
        if (Array.isArray(prod.variants) && prod.variants.length > 0) {
          const variant = prod.variants.find((v) => v.id === item.variant_id || v.size === item.size);
          if (variant) {
            variant.stock_quantity = (variant.stock_quantity || 0) + (item.quantity || 1);
            variant.isOutOfStock = variant.stock_quantity <= 0;
            changed = true;
          }
          prod.stock_quantity = prod.variants.reduce((sum, v) => sum + (Number(v.stock_quantity) || 0), 0);
        } else {
          prod.stock_quantity = (prod.stock_quantity || 0) + (item.quantity || 1);
          changed = true;
        }
        if (prod.status === "out_of_stock" && prod.stock_quantity > 0) {
          prod.status = "active";
        }
      }
    });

    if (changed) {
      localStorage.setItem(LOCAL_STORAGE_PRODUCTS_KEY, JSON.stringify(localProducts));
    }
    targetOrder.cancelled_at = new Date().toISOString();
  } catch (e) {
    console.error("Local stock restoration error prior to deletion:", e);
  }
}

/**
 * Admin: Permanently delete an order and its associated order items (via cascade)
 * Restores reserved variant stock for active pre-dispatch orders prior to deletion.
 */
export async function deleteOrderAdmin(orderId) {
  if (!orderId) {
    return { success: false, error: new Error("Order identifier required.") };
  }

  // 1. Restore reserved inventory before deletion if order is active
  await restoreOrderStockBeforeDelete(orderId);

  if (!isSupabaseConfigured || !supabase) {
    const items = getLocalOrdersStore();
    const filtered = items.filter((o) => o.id !== orderId && o.reference !== orderId);
    saveLocalOrdersStore(filtered);
    return { success: true, error: null };
  }

  try {
    let query = supabase.from("orders").delete();
    if (isUuid(orderId)) {
      query = query.eq("id", orderId.trim());
    } else {
      query = query.eq("reference", orderId.trim().toUpperCase());
    }

    const { error } = await query;
    if (error) throw error;

    // Also update local cache if present
    const items = getLocalOrdersStore();
    const filtered = items.filter((o) => o.id !== orderId && o.reference !== orderId);
    saveLocalOrdersStore(filtered);

    return { success: true, error: null };
  } catch (err) {
    console.error(`Failed to delete order ${orderId}:`, err);
    return { success: false, error: err };
  }
}

/**
 * Admin: Permanently delete multiple orders by their IDs or references
 * Restores reserved variant stock for active pre-dispatch orders prior to deletion.
 */
export async function deleteMultipleOrdersAdmin(orderIds) {
  if (!Array.isArray(orderIds) || orderIds.length === 0) {
    return { success: false, error: new Error("At least one order identifier required.") };
  }

  // 1. Restore reserved inventory for any active orders before deletion
  for (const id of orderIds) {
    await restoreOrderStockBeforeDelete(id);
  }

  const idsToMatch = new Set(orderIds.map((id) => String(id).trim()));

  if (!isSupabaseConfigured || !supabase) {
    const items = getLocalOrdersStore();
    const filtered = items.filter(
      (o) => !idsToMatch.has(String(o.id).trim()) && !idsToMatch.has(String(o.reference).trim())
    );
    saveLocalOrdersStore(filtered);
    return { success: true, error: null };
  }

  try {
    const uuids = orderIds.filter((id) => isUuid(String(id))).map((id) => String(id).trim());
    const refs = orderIds
      .filter((id) => !isUuid(String(id)))
      .map((id) => String(id).trim().toUpperCase());

    if (uuids.length > 0) {
      const { error: uuidErr } = await supabase.from("orders").delete().in("id", uuids);
      if (uuidErr) throw uuidErr;
    }

    if (refs.length > 0) {
      const { error: refErr } = await supabase.from("orders").delete().in("reference", refs);
      if (refErr) throw refErr;
    }

    // Also update local cache if present
    const items = getLocalOrdersStore();
    const filtered = items.filter(
      (o) => !idsToMatch.has(String(o.id).trim()) && !idsToMatch.has(String(o.reference).trim())
    );
    saveLocalOrdersStore(filtered);

    return { success: true, error: null };
  } catch (err) {
    console.error("Failed to delete multiple orders:", err);
    return { success: false, error: err };
  }
}

/**
 * Admin: Permanently delete ALL orders and their associated items
 * Restores reserved variant stock for all active pre-dispatch orders prior to deletion.
 */
export async function deleteAllOrdersAdmin() {
  if (!isSupabaseConfigured || !supabase) {
    const items = getLocalOrdersStore();
    for (const ord of items) {
      await restoreOrderStockBeforeDelete(ord.id);
    }
    saveLocalOrdersStore([]);
    return { success: true, error: null };
  }

  try {
    // 1. Query and restore reserved stock for any active orders before deletion
    const { data: activeOrders } = await supabase
      .from("orders")
      .select("id, status, cancelled_at")
      .in("status", ["pending", "confirmed", "processing"])
      .is("cancelled_at", null);

    if (Array.isArray(activeOrders) && activeOrders.length > 0) {
      for (const ord of activeOrders) {
        try {
          await supabase.rpc("cancel_order_and_restore_stock", {
            p_order_id: String(ord.id),
          });
        } catch (e) {
          console.warn(`Could not restore stock for order ${ord.id}:`, e);
        }
      }
    }

    // 2. Perform deletion
    // Supabase / PostgREST requires a filter to prevent unintended full table wipeout.
    // Using .neq("id", "00000000-0000-0000-0000-000000000000") matches all orders.
    const { error } = await supabase
      .from("orders")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");

    if (error) throw error;

    saveLocalOrdersStore([]);
    return { success: true, error: null };
  } catch (err) {
    console.error("Failed to delete all orders:", err);
    return { success: false, error: err };
  }
}


