import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { PRODUCTS } from "../data/products";

export const LOW_STOCK_THRESHOLD = 5;

/**
 * Fetch overview metrics for the Admin Dashboard
 */
export async function getDashboardStats() {
  if (!isSupabaseConfigured || !supabase) {
    // Local fallback metrics based on seed dataset
    return {
      data: {
        totalProducts: PRODUCTS.length,
        pendingOrders: 1,
        totalOrders: 3,
        totalRevenue: 39500, // PKR
        formattedRevenue: "PKR 39,500",
      },
      error: null,
    };
  }

  try {
    // 1. Total active products count
    const { count: productCount, error: prodErr } = await supabase
      .from("products")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true);

    if (prodErr) throw prodErr;

    // 2. Orders queries
    const { data: orders, error: ordersErr } = await supabase
      .from("orders")
      .select("id, status, total");

    if (ordersErr) throw ordersErr;

    const totalOrders = orders?.length || 0;
    const pendingOrders = orders?.filter((o) => o.status === "pending").length || 0;
    const totalRevenue = orders?.reduce((sum, o) => sum + (o.total || 0), 0) || 0;

    return {
      data: {
        totalProducts: productCount || 0,
        pendingOrders,
        totalOrders,
        totalRevenue,
        formattedRevenue: `PKR ${totalRevenue.toLocaleString()}`,
      },
      error: null,
    };
  } catch (err) {
    console.error("Failed to query dashboard statistics:", err);
    return {
      data: {
        totalProducts: PRODUCTS.length,
        pendingOrders: 0,
        totalOrders: 0,
        totalRevenue: 0,
        formattedRevenue: "PKR 0",
      },
      error: err,
    };
  }
}

/**
 * Fetch recent orders list for the Dashboard table
 */
export async function getRecentOrders(limit = 6) {
  if (!isSupabaseConfigured || !supabase) {
    // Mock sample order records for local testing
    return {
      data: [
        {
          id: "ord-1",
          reference: "SC-849204",
          customer_full_name: "Tariq Mansoor",
          city: "Karachi",
          total: 12500,
          formattedTotal: "PKR 12,500",
          status: "pending",
          created_at: new Date(Date.now() - 3600000).toISOString(),
        },
        {
          id: "ord-2",
          reference: "SC-619482",
          customer_full_name: "Ayesha Malik",
          city: "Lahore",
          total: 14500,
          formattedTotal: "PKR 14,500",
          status: "confirmed",
          created_at: new Date(Date.now() - 14400000).toISOString(),
        },
        {
          id: "ord-3",
          reference: "SC-392105",
          customer_full_name: "Bilal Khan",
          city: "Islamabad",
          total: 13500,
          formattedTotal: "PKR 13,500",
          status: "shipped",
          created_at: new Date(Date.now() - 86400000).toISOString(),
        },
      ],
      error: null,
    };
  }

  try {
    const { data, error } = await supabase
      .from("orders")
      .select("id, reference, customer_full_name, city, total, status, created_at")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;

    const formatted = (data || []).map((o) => ({
      ...o,
      formattedTotal: `PKR ${(o.total || 0).toLocaleString()}`,
    }));

    return { data: formatted, error: null };
  } catch (err) {
    console.error("Failed to query recent orders:", err);
    return { data: [], error: err };
  }
}

/**
 * Fetch products or variants approaching low stock
 */
export async function getLowStockProducts(threshold = LOW_STOCK_THRESHOLD) {
  if (!isSupabaseConfigured || !supabase) {
    return {
      data: [
        {
          id: "scente-noir",
          name: "SCENTE NOIR",
          size: "50ml",
          stock_quantity: 4,
          price: 12500,
        },
      ],
      error: null,
    };
  }

  try {
    const { data, error } = await supabase
      .from("products")
      .select("id, name, stock_quantity, price, is_active")
      .eq("is_active", true)
      .lte("stock_quantity", threshold)
      .order("stock_quantity", { ascending: true });

    if (error) throw error;
    return { data: data || [], error: null };
  } catch (err) {
    console.error("Failed to query low stock inventory:", err);
    return { data: [], error: err };
  }
}
