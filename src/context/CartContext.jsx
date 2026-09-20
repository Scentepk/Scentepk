import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { PRODUCTS } from "../data/products";
import { createCodOrder } from "../services/orders";
import { validateCartStock } from "../services/inventory";

const CartContext = createContext();

export function CartProvider({ children }) {
  // Initialize from localStorage or sample item for first-time visitors
  const [cartItems, setCartItems] = useState(() => {
    try {
      const saved = localStorage.getItem("scente_cart");
      if (saved !== null) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error("Failed to load cart from storage", e);
    }
    return [
      {
        product: PRODUCTS[0],
        size: "50ml",
        quantity: 1,
        price: PRODUCTS[0].price,
        formattedPrice: PRODUCTS[0].formattedPrice,
        variantId: null,
      },
    ];
  });

  // Ephemeral in-memory order completion state (never persisted across sessions/restarts)
  const [lastOrder, setLastOrder] = useState(null);

  // Sync cart to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("scente_cart", JSON.stringify(cartItems));
    } catch (e) {
      console.error("Failed to save cart to storage", e);
    }
  }, [cartItems]);

  // Clean up any stale legacy session order keys on startup
  useEffect(() => {
    try {
      sessionStorage.removeItem("scente_last_order");
    } catch (e) {}
  }, []);

  // Validate cart against real-time Supabase stock
  const validateAndSyncStock = useCallback(async (customItems = null) => {
    const itemsToCheck = customItems || cartItems;
    if (!itemsToCheck || itemsToCheck.length === 0) {
      return { isValid: true, unavailableItems: [], adjustedItems: [], updatedItems: [] };
    }

    const result = await validateCartStock(itemsToCheck);

    if (!customItems && result.hasChanges) {
      setCartItems(result.updatedItems);
    }

    return result;
  }, [cartItems]);

  // Add to cart with strict variant-level inventory validation
  const addToCart = (product, size = "50ml", quantity = 1, variant = null) => {
    const selectedVariant =
      variant ||
      (product.variants && product.variants.find((v) => v.size === size)) ||
      null;

    const availableStock = selectedVariant
      ? Number(selectedVariant.stock_quantity ?? selectedVariant.stockQuantity ?? 0)
      : Number(product.stock_quantity ?? product.stockQuantity ?? 50);

    const isOutOfStock = availableStock <= 0 || (selectedVariant && selectedVariant.is_active === false);

    if (isOutOfStock) {
      console.warn("Cannot add out of stock product to bag");
      return false;
    }

    const price = selectedVariant?.price ?? product.price;
    const formattedPrice =
      selectedVariant?.formattedPrice ??
      product.formattedPrice ??
      `PKR ${price.toLocaleString()}`;
    const variantId = selectedVariant?.id || null;

    setCartItems((prevItems) => {
      const existingIndex = prevItems.findIndex(
        (item) => item.product.id === product.id && item.size === size
      );

      if (existingIndex > -1) {
        const updated = [...prevItems];
        const newTotalQty = Math.min(availableStock, updated[existingIndex].quantity + quantity);
        updated[existingIndex].quantity = newTotalQty;
        updated[existingIndex].price = price;
        updated[existingIndex].formattedPrice = formattedPrice;
        updated[existingIndex].variantId = variantId;
        updated[existingIndex].variant = selectedVariant;
        updated[existingIndex].isUnavailable = false;
        return updated;
      } else {
        const cappedQty = Math.min(availableStock, Math.max(1, quantity));
        return [
          ...prevItems,
          {
            product,
            size,
            quantity: cappedQty,
            price,
            formattedPrice,
            variantId,
            variant: selectedVariant,
            isUnavailable: false,
          },
        ];
      }
    });

    return true;
  };

  // Remove from cart
  const removeFromCart = (productId, size) => {
    setCartItems((prevItems) =>
      prevItems.filter(
        (item) => !(item.product.id === productId && item.size === size)
      )
    );
  };

  // Update quantity (with strict minimum = 1, prevent <= 0 through decrement)
  const updateQuantity = (productId, size, newQty) => {
    if (newQty < 1) return; // Prevent quantity becoming 0 via decrement
    setCartItems((prevItems) =>
      prevItems.map((item) => {
        if (item.product.id === productId && item.size === size) {
          return { ...item, quantity: newQty };
        }
        return item;
      })
    );
  };

  // Ephemeral Buy Now checkout item (completely isolated from persistent Bag)
  const [buyNowItem, setBuyNowItem] = useState(() => {
    try {
      const saved = sessionStorage.getItem("scente_buynow_item");
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return null;
  });

  const clearBuyNow = () => {
    setBuyNowItem(null);
    try {
      sessionStorage.removeItem("scente_buynow_item");
    } catch (e) {}
  };

  // Dedicated Buy Now flow: creates an isolated checkout session without mutating or clearing the persistent Bag
  const buyNow = (product, size = "50ml", quantity = 1, variant = null) => {
    const selectedVariant =
      variant ||
      (product.variants && product.variants.find((v) => v.size === size)) ||
      null;

    const availableStock = selectedVariant
      ? Number(selectedVariant.stock_quantity ?? selectedVariant.stockQuantity ?? 0)
      : Number(product.stock_quantity ?? product.stockQuantity ?? 50);

    const isOutOfStock = availableStock <= 0 || (selectedVariant && selectedVariant.is_active === false);

    if (isOutOfStock) {
      console.warn("Cannot buy out of stock product");
      return null;
    }

    const price = Number(selectedVariant?.price ?? product.price) || 0;
    const formattedPrice =
      selectedVariant?.formattedPrice ??
      product.formattedPrice ??
      `PKR ${price.toLocaleString()}`;
    const variantId = selectedVariant?.id || null;
    const finalQuantity = Math.min(availableStock, Math.max(1, quantity));

    const newItem = {
      product,
      size,
      quantity: finalQuantity,
      price,
      formattedPrice,
      variantId,
      variant: selectedVariant,
      availableStock,
      isUnavailable: false,
    };

    // Store ONLY in temporary Buy Now state; persistent cartItems remains completely untouched!
    setBuyNowItem(newItem);
    setLastOrder(null);
    try {
      sessionStorage.setItem("scente_buynow_item", JSON.stringify(newItem));
      sessionStorage.removeItem("scente_confirmed_order");
      sessionStorage.removeItem("scente_last_order");
    } catch (e) {
      console.error("Storage update error in buyNow:", e);
    }
    return newItem;
  };

  // Clear cart (persists empty array so cleared cart stays empty across reloads)
  const clearCart = () => {
    setCartItems([]);
    try {
      localStorage.setItem("scente_cart", JSON.stringify([]));
    } catch (e) {
      console.error("Failed to clear cart storage", e);
    }
  };

  // Total quantity count (strictly reflects persistent Bag items)
  const totalCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  // Subtotal in PKR (using variant price if present, fallback to base product price)
  const subtotal = cartItems.reduce(
    (acc, item) => acc + (item.price ?? item.product.price) * item.quantity,
    0
  );

  const formattedSubtotal = `PKR ${subtotal.toLocaleString()}`;

  /**
   * Submit Cash on Delivery Order
   * Connects to Supabase createCodOrder service or structured fallback
   * Supports both regular Bag checkout and isolated Buy Now checkout
   */
  const placeOrder = async (customerData, itemsToOrder = null, promoDetails = null) => {
    const isBuyNowOrder = Boolean(itemsToOrder && itemsToOrder.length > 0) || Boolean(buyNowItem);
    const orderItems = (itemsToOrder && itemsToOrder.length > 0)
      ? itemsToOrder
      : (buyNowItem ? [buyNowItem] : cartItems);

    if (!orderItems || orderItems.length === 0) {
      throw new Error("No items in order to place");
    }

    // Pre-validate stock before submitting to catch stale UI immediately
    const stockValidation = await validateCartStock(orderItems);
    if (!stockValidation.isValid) {
      if (!isBuyNowOrder && stockValidation.hasChanges) {
        setCartItems(stockValidation.updatedItems);
      }
      const unavailableNames = (stockValidation.unavailableItems || [])
        .map((i) => `"${i.product?.name || "Item"}" (${i.size || "50ml"})`)
        .join(", ");
      const adjustedNames = (stockValidation.adjustedItems || [])
        .map((i) => `"${i.product?.name || "Item"}" (${i.size || "50ml"} - only ${i.adjustedQuantity} left)`)
        .join(", ");

      const errorDetail = [unavailableNames, adjustedNames].filter(Boolean).join("; ");

      throw new Error(
        errorDetail
          ? `Sorry, ${errorDetail} is no longer available in the requested quantity.`
          : "Sorry, one or more items in your cart are no longer available in the requested quantity."
      );
    }

    let orderPayload;
    try {
      const result = await createCodOrder(customerData, orderItems, promoDetails);
      orderPayload = result.data;
    } catch (err) {
      // Re-sync stock immediately to reflect current state to customer
      await validateAndSyncStock();
      throw err;
    }

    const fullOrderDetails = {
      ...orderPayload,
      promo_code: orderPayload.promo_code || promoDetails?.code || null,
      discount_amount: orderPayload.discount_amount ?? promoDetails?.discountAmount ?? 0,
      customer: {
        fullName: customerData.fullName,
        phone: customerData.phone,
        email: customerData.email || "",
        address: customerData.address,
        city: customerData.city,
        province: customerData.province,
        postalCode: customerData.postalCode || "",
      },
      items: orderItems.map((item) => {
        const itemPrice = item.price ?? item.product.price;
        const itemFormattedPrice =
          item.formattedPrice ||
          item.product.formattedPrice ||
          `PKR ${itemPrice.toLocaleString()}`;
        return {
          productId: item.product.id,
          productName: item.product.name,
          slug: item.product.slug,
          size: item.size,
          quantity: item.quantity,
          variantId: item.variantId || item.variant?.id,
          unitPrice: itemPrice,
          formattedUnitPrice: itemFormattedPrice,
          lineTotal: itemPrice * item.quantity,
          formattedLineTotal: `PKR ${(itemPrice * item.quantity).toLocaleString()}`,
        };
      }),
      formattedTotal: `PKR ${orderPayload.total.toLocaleString()}`,
    };

    setLastOrder(fullOrderDetails);

    if (isBuyNowOrder) {
      // Clear ONLY the Buy Now temporary session; persistent Bag (cartItems) remains 100% intact!
      clearBuyNow();
    } else {
      // Normal Bag checkout: clear cartItems because customer checked out their Bag
      clearCart();
    }

    return fullOrderDetails;
  };

  return (
    <CartContext.Provider
      value={{
        cartItems,
        buyNowItem,
        clearBuyNow,
        addToCart,
        buyNow,
        removeFromCart,
        updateQuantity,
        clearCart,
        totalCount,
        subtotal,
        formattedSubtotal,
        lastOrder,
        placeOrder,
        validateAndSyncStock,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
