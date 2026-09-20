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
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error("Error reading local orders cache:", e);
  }

  // Initial demo records
  const initial = [
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
          product_id: "scente-noir",
          product_name: "SCENTÉ NOIR",
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
      subtotal: 14500,
      delivery_fee: 0,
      total: 14500,
      status: "confirmed",
      carrier: "TCS Express",
      tracking_number: null,
      cancelled_at: null,
      notes: "",
      created_at: new Date(Date.now() - 14400000).toISOString(),
      updated_at: new Date(Date.now() - 7200000).toISOString(),
      order_items: [
        {
          id: "item-2",
          product_id: "scente-amber",
          product_name: "SCENTÉ AMBER",
          product_slug: "scente-amber",
          size: "50ml",
          quantity: 1,
          unit_price: 14500,
          line_total: 14500,
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
          product_name: "SCENTÉ NOIR",
          product_slug: "scente-noir",
          size: "50ml",
          quantity: 1,
          unit_price: 12500,
          line_total: 12500,
        },
        {
          id: "item-4",
          product_id: "scente-musk",
          product_name: "SCENTÉ MUSK",
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
          product_name: "SCENTÉ ROSE",
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

    return { data, error: null };
  } catch (err) {
    console.error("Failed to fetch admin orders from Supabase:", err);
    return { data: getLocalOrdersStore(), error: err };
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
    const items = getLocalOrdersStore();
    const match = items.find((o) => o.id === idOrRef || o.reference === idOrRef);
    return { data: match || null, error: err };
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
    // Local fallback update
    const items = getLocalOrdersStore();
    const idx = items.findIndex((o) => o.id === orderId || o.reference === orderId);
    if (idx !== -1) {
      items[idx] = { ...items[idx], ...payload };
      saveLocalOrdersStore(items);
      return { data: items[idx], error: null };
    }
    return { data: null, error: err };
  }
}

/**
 * Admin: Permanently delete an order and its associated order items (via cascade)
 */
export async function deleteOrderAdmin(orderId) {
  if (!orderId) {
    return { success: false, error: new Error("Order identifier required.") };
  }

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

