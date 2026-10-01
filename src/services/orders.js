import { supabase, isSupabaseConfigured } from "../lib/supabase.js";
import { DELIVERY_CONFIG } from "../config/delivery.js";

const LOCAL_STORAGE_ORDERS_KEY = "scente_admin_orders_cache";
const LOCAL_STORAGE_PRODUCTS_KEY = "scente_admin_products_cache";

import { incrementLocalPromoUsage } from "./promoCodes.js";
import { verifyAndCalculateCustomOrderPrice } from "./customBuilder.js";

/**
 * Submit Cash on Delivery Order
 * In Supabase-connected mode, delegates to atomic security-definer RPC function.
 * In local prototype mode, generates structured payload and updates local caches.
 */
export async function createCodOrder(customerData, cartItems, promoDetails = null) {
  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  // Authoritative server-side/service-side price verification for any custom perfume items
  const verifiedCustomItems = new Map();
  for (const item of cartItems) {
    if (item.isCustom) {
      // Gather option IDs from selections or configuration
      let optionIds = Array.isArray(item.selectedOptionIds) ? item.selectedOptionIds : [];
      if (optionIds.length === 0 && item.selections) {
        optionIds = Object.values(item.selections)
          .flatMap((v) => (Array.isArray(v) ? v.map((o) => o?.id) : [v?.id]))
          .filter(Boolean);
      }

      const verification = await verifyAndCalculateCustomOrderPrice(optionIds, item.selections || {});
      if (!verification.isValid) {
        throw new Error(
          `Custom fragrance formulation issue: ${verification.error || "Please review your bespoke configuration."}`
        );
      }

      // Stale cart price detection: ensure customer is informed if pricing changed since adding to bag
      const clientUnitPrice = Math.max(0, Math.round(Number(item.price || 0)));
      if (verification.finalPrice !== clientUnitPrice) {
        throw new Error(
          `Your custom fragrance pricing has been updated to PKR ${verification.finalPrice.toLocaleString()} due to recent atelier adjustments. Please review your order before continuing.`
        );
      }

      verifiedCustomItems.set(item, {
        finalPrice: verification.finalPrice,
        snapshot: verification.snapshot,
      });
    }
  }

  const itemsPayload = await Promise.all(
    cartItems.map(async (item) => {
      if (item.isCustom) {
        const verified = verifiedCustomItems.get(item);
        return {
          is_custom: true,
          product_name: item.product?.name || "Custom SCENTÉ",
          size: item.size || "Bespoke",
          quantity: item.quantity || 1,
          unit_price: verified?.finalPrice ?? item.price,
          custom_configuration: verified?.snapshot ?? item.customConfiguration ?? null,
        };
      }

      let variantId =
        item.variantId ||
        item.variant?.id ||
        item.product?.variants?.find((v) => v.size === item.size)?.id ||
        null;

      // If variantId is missing or mock string (e.g. 'var-...'), resolve real UUID from Supabase
      if ((!variantId || !UUID_REGEX.test(variantId)) && isSupabaseConfigured && supabase) {
        try {
          const { data: vRow } = await supabase
            .from("product_variants")
            .select("id")
            .eq("product_id", item.product.id)
            .eq("size", item.size || "50ml")
            .maybeSingle();

          if (vRow?.id) {
            variantId = vRow.id;
          }
        } catch (err) {
          console.warn("Could not query variant UUID from Supabase:", err);
        }
      }

      return {
        is_custom: false,
        variant_id: variantId,
        product_id: item.product.id,
        size: item.size || "50ml",
        quantity: item.quantity || 1,
      };
    })
  );

  // 1. If Supabase is connected, execute atomic server-side RPC
  if (isSupabaseConfigured && supabase) {
    const basePayload = {
      p_customer_full_name: customerData.fullName,
      p_customer_phone: customerData.phone,
      p_customer_email: customerData.email || null,
      p_shipping_address: customerData.address,
      p_city: customerData.city,
      p_province: customerData.province,
      p_postal_code: customerData.postalCode || null,
      p_items: itemsPayload,
    };

    let resultData = null;
    let resultError = null;

    // Primary attempt: Pass 9-parameter payload (including p_promo_code: code || null).
    const fullPayload = {
      ...basePayload,
      p_promo_code: promoDetails?.code || null,
    };

    const res = await supabase.rpc("create_cod_order", fullPayload);
    if (!res.error) {
      resultData = res.data;
    } else {
      console.warn("create_cod_order primary call failed:", res.error);
      // If remote database does not have migration 009 applied yet (schema cache missing 9-param function)
      if (
        res.error.message?.includes("schema cache") ||
        res.error.message?.includes("Could not find the function")
      ) {
        const fallbackRes = await supabase.rpc("create_cod_order", basePayload);
        if (!fallbackRes.error) {
          resultData = fallbackRes.data;
          if (promoDetails?.code) {
            const discount = promoDetails.discountAmount || 0;
            const newTotal = Math.max(0, (resultData.subtotal || 0) - discount);
            try {
              await supabase
                .from("orders")
                .update({
                  promo_code: promoDetails.code,
                  discount_amount: discount,
                  discount_type: promoDetails.discountType || null,
                  discount_value: promoDetails.discountValue || null,
                  total: newTotal,
                })
                .eq("id", resultData.order_id);
            } catch (e) {
              console.warn("Could not patch promo to orders table:", e);
            }
            resultData.discount_amount = discount;
            resultData.promo_code = promoDetails.code;
            resultData.total = newTotal;
          }
        } else {
          resultError = fallbackRes.error;
        }
      } else {
        resultError = res.error;
      }
    }

    if (resultError) {
      console.error("Supabase RPC create_cod_order error:", resultError);
      throw new Error(resultError.message || "Unable to place order. Please try again.");
    }

    return { data: resultData, error: null, isRemote: true };
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
      if (item.isCustom) {
        const verified = verifiedCustomItems.get(item);
        const verifiedPrice = verified?.finalPrice ?? item.price;
        return {
          id: `item-${Date.now()}-${idx}`,
          is_custom: true,
          product_id: null,
          product_name: item.product?.name || "Custom SCENTÉ",
          product_slug: "custom-scente",
          size: item.size || "Bespoke",
          quantity: item.quantity,
          unit_price: verifiedPrice,
          line_total: verifiedPrice * item.quantity,
          custom_configuration: verified?.snapshot ?? item.customConfiguration ?? null,
        };
      }

      const itemPrice = item.price ?? item.product.price;
      return {
        id: `item-${Date.now()}-${idx}`,
        is_custom: false,
        product_id: item.product.id,
        product_name: item.product.name,
        product_slug: item.product.slug,
        size: item.size || "50ml",
        quantity: item.quantity,
        unit_price: itemPrice,
        line_total: itemPrice * item.quantity,
        custom_configuration: null,
      };
    }),
    isRemote: false,
  };

  // Sync to local orders cache so admin panel sees it
  try {
    const existingOrders = JSON.parse(localStorage.getItem(LOCAL_STORAGE_ORDERS_KEY) || "[]");
    existingOrders.unshift(localOrder);
    localStorage.setItem(LOCAL_STORAGE_ORDERS_KEY, JSON.stringify(existingOrders));

    // Deduct stock in local products cache (only for standard catalog products)
    const existingProducts = JSON.parse(localStorage.getItem(LOCAL_STORAGE_PRODUCTS_KEY) || "[]");
    if (existingProducts.length > 0) {
      cartItems.forEach((cartItem) => {
        if (cartItem.isCustom) return; // Custom bespoke perfumes do not deduct catalog inventory
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
              is_custom: Boolean(i.is_custom),
              custom_configuration: i.custom_configuration || null,
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


