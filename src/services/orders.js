import { supabase, isSupabaseConfigured } from "../lib/supabase.js";
import { DELIVERY_CONFIG } from "../config/delivery.js";

const LOCAL_STORAGE_ORDERS_KEY = "scente_admin_orders_cache";
const LOCAL_STORAGE_PRODUCTS_KEY = "scente_admin_products_cache";

import { incrementLocalPromoUsage } from "./promoCodes.js";

/**
 * Submit Cash on Delivery Order
 * In Supabase-connected mode, delegates to atomic security-definer RPC function.
 * In local prototype mode, generates structured payload and updates local caches.
 */
export async function createCodOrder(customerData, cartItems, promoDetails = null) {
  const itemsPayload = cartItems.map((item) => {
    const variantId =
      item.variantId ||
      item.variant?.id ||
      item.product?.variants?.find((v) => v.size === item.size)?.id ||
      null;

    if (!variantId) {
      throw new Error(
        `Unable to identify bottle size variant for "${item.product.name}" (${item.size}). Please remove and re-add this item.`
      );
    }

    return {
      variant_id: variantId,
      product_id: item.product.id,
      size: item.size || "50ml",
      quantity: item.quantity || 1,
    };
  });

  // 1. If Supabase is connected, execute atomic server-side RPC
  if (isSupabaseConfigured && supabase) {
    const rpcPayload = {
      p_customer_full_name: customerData.fullName,
      p_customer_phone: customerData.phone,
      p_customer_email: customerData.email || null,
      p_shipping_address: customerData.address,
      p_city: customerData.city,
      p_province: customerData.province,
      p_postal_code: customerData.postalCode || null,
      p_items: itemsPayload,
      p_promo_code: promoDetails?.code || null,
    };

    const { data, error } = await supabase.rpc("create_cod_order", rpcPayload);

    if (error) {
      console.error("Supabase RPC create_cod_order error:", error);
      // Clean, customer-friendly message if stock is insufficient
      const isStockError =
        error.message?.includes("not available") ||
        error.message?.includes("Insufficient stock") ||
        error.message?.includes("stock") ||
        error.code === "P0001";

      if (isStockError) {
        throw new Error(
          error.message?.includes("Sorry,")
            ? error.message
            : "Sorry, one or more items in your cart are no longer available in the requested quantity."
        );
      }

      throw new Error(error.message || "Unable to place order. Please try again.");
    }

    return { data, error: null, isRemote: true };
  }

  // 2. Structured fallback / prototype order generation
  const subtotal = cartItems.reduce(
    (acc, item) => acc + (item.price ?? item.product.price) * item.quantity,
    0
  );
  const deliveryFee = DELIVERY_CONFIG.fee;

  let discountAmount = 0;
  if (promoDetails && promoDetails.code) {
    if (promoDetails.discountType === "percentage") {
      const raw = Math.round((subtotal * (Number(promoDetails.discountValue) || 0)) / 100);
      discountAmount = promoDetails.maxDiscountAmount
        ? Math.min(raw, Number(promoDetails.maxDiscountAmount))
        : raw;
    } else if (promoDetails.discountType === "fixed") {
      discountAmount = Math.min(Number(promoDetails.discountValue || 0), subtotal);
    } else if (promoDetails.discountAmount) {
      discountAmount = Math.min(Number(promoDetails.discountAmount), subtotal);
    }
    discountAmount = Math.max(0, Math.min(discountAmount, subtotal));
    incrementLocalPromoUsage(promoDetails.code);
  }

  const total = Math.max(0, subtotal - discountAmount) + deliveryFee;
  const reference = `SC-${Math.floor(100000 + Math.random() * 900000)}`;

  const localOrder = {
    id: `ord-${Date.now()}`,
    reference,
    customer_full_name: customerData.fullName,
    customer_phone: customerData.phone,
    customer_email: customerData.email || "",
    shipping_address: customerData.address,
    city: customerData.city,
    province: customerData.province,
    postal_code: customerData.postalCode || "",
    payment_method: "cod",
    subtotal,
    delivery_fee: deliveryFee,
    discount_amount: discountAmount,
    promo_code: promoDetails?.code || null,
    discount_type: promoDetails?.discountType || null,
    discount_value: promoDetails?.discountValue || null,
    total,
    status: "pending",
    carrier: null,
    tracking_number: null,
    cancelled_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    order_items: cartItems.map((item, idx) => {
      const itemPrice = item.price ?? item.product.price;
      return {
        id: `item-${Date.now()}-${idx}`,
        product_id: item.product.id,
        product_name: item.product.name,
        product_slug: item.product.slug,
        size: item.size || "50ml",
        quantity: item.quantity,
        unit_price: itemPrice,
        line_total: itemPrice * item.quantity,
      };
    }),
    isRemote: false,
  };

  // Sync to local orders cache so admin panel sees it
  try {
    const existingOrders = JSON.parse(localStorage.getItem(LOCAL_STORAGE_ORDERS_KEY) || "[]");
    existingOrders.unshift(localOrder);
    localStorage.setItem(LOCAL_STORAGE_ORDERS_KEY, JSON.stringify(existingOrders));

    // Deduct stock in local products cache
    const existingProducts = JSON.parse(localStorage.getItem(LOCAL_STORAGE_PRODUCTS_KEY) || "[]");
    if (existingProducts.length > 0) {
      cartItems.forEach((cartItem) => {
        const prod = existingProducts.find((p) => p.id === cartItem.product.id);
        if (prod) {
          // Decrement specific variant stock
          if (Array.isArray(prod.variants)) {
            const v = prod.variants.find((vr) => vr.size === cartItem.size);
            if (v) {
              v.stock_quantity = Math.max(0, (v.stock_quantity ?? 10) - cartItem.quantity);
              v.stockQuantity = v.stock_quantity;
              v.isOutOfStock = v.stock_quantity <= 0;
            }
          }
          if (Array.isArray(prod.product_variants)) {
            const v = prod.product_variants.find((vr) => vr.size === cartItem.size);
            if (v) {
              v.stock_quantity = Math.max(0, (v.stock_quantity ?? 10) - cartItem.quantity);
              v.stockQuantity = v.stock_quantity;
              v.isOutOfStock = v.stock_quantity <= 0;
            }
          }

          prod.stock_quantity = Math.max(0, (prod.stock_quantity ?? 50) - cartItem.quantity);
          if (prod.stock_quantity === 0) prod.status = "out_of_stock";
        }
      });
      localStorage.setItem(LOCAL_STORAGE_PRODUCTS_KEY, JSON.stringify(existingProducts));
    }
  } catch (e) {
    console.error("Error updating local stores on order placement:", e);
  }

  return { data: localOrder, error: null, isRemote: false };
}

/**
 * Public Secure Order Tracking
 * Invokes PostgreSQL SECURITY DEFINER RPC 'track_order_public'.
 * Requires both reference and phone number.
 */
export async function trackOrderPublic(reference, phone) {
  const cleanRef = (reference || "").trim().toUpperCase();
  const cleanPhone = (phone || "").trim();

  if (!cleanRef) {
    return { data: null, error: new Error("Please enter your Order Reference.") };
  }
  if (!cleanPhone) {
    return { data: null, error: new Error("Please enter your mobile phone number.") };
  }

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase.rpc("track_order_public", {
        p_reference: cleanRef,
        p_phone: cleanPhone,
      });

      if (error) {
        console.error("Supabase track_order_public error:", error);
        throw error;
      }

      if (!data || !data.success) {
        return {
          data: null,
          error: new Error(data?.error || "Order not found. Please check your order reference and phone number."),
        };
      }

      return { data, error: null };
    } catch (err) {
      console.warn("Falling back to local order lookup:", err);
    }
  }

  // Fallback: Check local storage orders cache
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_ORDERS_KEY);
    if (raw) {
      const orders = JSON.parse(raw);
      const normalizedInputDigits = cleanPhone.replace(/\D/g, "");

      const match = orders.find((o) => {
        const refMatch = o.reference.toUpperCase().trim() === cleanRef;
        const oDigits = (o.customer_phone || "").replace(/\D/g, "");
        const phoneMatch =
          oDigits === normalizedInputDigits ||
          oDigits.endsWith(normalizedInputDigits.slice(-9)) ||
          normalizedInputDigits.endsWith(oDigits.slice(-9));
        return refMatch && phoneMatch;
      });

      if (match) {
        return {
          data: {
            success: true,
            reference: match.reference,
            status: match.status,
            carrier: match.carrier || null,
            tracking_number: match.tracking_number || null,
            city: match.city,
            province: match.province,
            payment_method: match.payment_method,
            subtotal: match.subtotal,
            delivery_fee: match.delivery_fee,
            total: match.total,
            created_at: match.created_at,
            shipped_at: match.shipped_at || null,
            delivered_at: match.delivered_at || null,
            cancelled_at: match.cancelled_at || null,
            updated_at: match.updated_at,
            items: (match.order_items || []).map((i) => ({
              product_name: i.product_name,
              product_slug: i.product_slug,
              size: i.size,
              quantity: i.quantity,
              unit_price: i.unit_price,
              line_total: i.line_total,
            })),
          },
          error: null,
        };
      }
    }
  } catch (e) {
    console.error("Local tracking query error:", e);
  }

  return {
    data: null,
    error: new Error("Order not found. Please check your order reference and phone number."),
  };
}

/**
 * Fetch Order by unique reference (internal)
 */
export async function getOrderByReference(reference) {
  if (!isSupabaseConfigured || !supabase) {
    return { data: null, error: new Error("Supabase is not configured") };
  }

  try {
    const { data, error } = await supabase
      .from("orders")
      .select("*, order_items(*)")
      .eq("reference", reference)
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (err) {
    console.error(`Failed to fetch order ${reference}:`, err);
    return { data: null, error: err };
  }
}

/**
 * Customer / Public: Cancel a PENDING or CONFIRMED order and restore catalog stock
 * Requires dual-factor verification (Order Reference + matching Customer Mobile Number)
 * to prevent unauthorized cancellations via predictable reference enumeration.
 * Calls the existing atomic PostgreSQL RPC: 'cancel_order_and_restore_stock'.
 * Fallback to local storage cache if offline / prototype mode.
 */
export async function cancelPendingOrderCustomer(orderReference, customerPhone = "") {
  const cleanRef = (orderReference || "").trim().toUpperCase();
  const cleanPhone = (customerPhone || "").trim();

  if (!cleanRef) {
    return { data: null, error: new Error("Invalid order reference.") };
  }
  if (!cleanPhone) {
    return { data: null, error: new Error("Mobile phone number is required to verify order cancellation.") };
  }

  // 1. Supabase Connected Mode
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase.rpc("cancel_order_customer", {
        p_reference: cleanRef,
        p_phone: cleanPhone,
      });

      if (error) {
        console.error("Supabase cancel_order_customer error:", error);
        return {
          data: null,
          error: new Error(
            error.message || "Unable to cancel order. It may have already progressed to dispatch."
          ),
        };
      }

      if (data && data.success === false) {
        return {
          data: null,
          error: new Error(data.error || "Order not found or no longer eligible for cancellation."),
        };
      }

      return { data, error: null };
    } catch (err) {
      console.warn("cancel_order_customer RPC call error:", err);
      return {
        data: null,
        error: new Error(
          err.message || "An unexpected error occurred while processing your cancellation."
        ),
      };
    }
  }

  // 2. Local prototype fallback mode
  try {
    const rawOrders = localStorage.getItem(LOCAL_STORAGE_ORDERS_KEY);
    if (rawOrders) {
      const orders = JSON.parse(rawOrders);
      const idx = orders.findIndex(
        (o) => (o.reference || "").toUpperCase() === cleanRef || o.id === cleanRef
      );

      if (idx === -1) {
        return { data: null, error: new Error("Order not found or contact verification failed.") };
      }

      const order = orders[idx];

      // Security check: Verify customer mobile phone matches
      const normalizedInputDigits = cleanPhone.replace(/\D/g, "");
      const oDigits = (order.customer_phone || "").replace(/\D/g, "");
      const phoneMatches =
        oDigits === normalizedInputDigits ||
        oDigits.endsWith(normalizedInputDigits.slice(-9)) ||
        normalizedInputDigits.endsWith(oDigits.slice(-9));

      if (!phoneMatches) {
        return {
          data: null,
          error: new Error("Verification failed. The mobile number does not match this order reference."),
        };
      }

      // Idempotency check: if already cancelled, don't restore stock twice
      if (order.status === "cancelled" || order.cancelled_at) {
        return {
          data: {
            success: true,
            already_cancelled: true,
            order_id: order.id,
            reference: order.reference,
            status: "cancelled",
            cancelled_at: order.cancelled_at,
          },
          error: null,
        };
      }

      // Status check: Only PENDING, CONFIRMED, and PROCESSING orders are cancellable prior to dispatch
      const cancellableStatuses = ["pending", "confirmed", "processing"];
      const currentStatus = (order.status || "").toLowerCase();
      if (!cancellableStatuses.includes(currentStatus)) {
        return {
          data: null,
          error: new Error(
            `This order cannot be cancelled because it is already ${order.status.toUpperCase()}. Orders cannot be cancelled once dispatched.`
          ),
        };
      }

      // Restore stock in local products store
      try {
        const rawProducts = localStorage.getItem(LOCAL_STORAGE_PRODUCTS_KEY);
        if (rawProducts) {
          const products = JSON.parse(rawProducts);
          (order.order_items || []).forEach((item) => {
            const prod = products.find((p) => p.id === item.product_id);
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
            }
          });
          localStorage.setItem(LOCAL_STORAGE_PRODUCTS_KEY, JSON.stringify(products));
        }
      } catch (e) {
        console.error("Local stock restoral error:", e);
      }

      order.status = "cancelled";
      order.cancelled_at = new Date().toISOString();
      order.updated_at = new Date().toISOString();
      orders[idx] = order;
      localStorage.setItem(LOCAL_STORAGE_ORDERS_KEY, JSON.stringify(orders));

      return {
        data: {
          success: true,
          order_id: order.id,
          reference: order.reference,
          status: "cancelled",
          cancelled_at: order.cancelled_at,
        },
        error: null,
      };
    }
  } catch (e) {
    console.error("Local cancellation fallback error:", e);
  }

  return {
    data: null,
    error: new Error("Order not found or no longer cancellable."),
  };
}

export const cancelOrderCustomer = cancelPendingOrderCustomer;


