import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { ArrowRight, Minus, Plus, AlertCircle } from "lucide-react";
import ScrollReveal from "../components/ScrollReveal";
import { motion, AnimatePresence } from "framer-motion";
import { LUXURY_EASE } from "../lib/animations";
import SEO from "../components/SEO";

export default function Cart() {
  const { cartItems, removeFromCart, updateQuantity, formattedSubtotal, clearBuyNow, validateAndSyncStock } = useCart();
  const [stockNotice, setStockNotice] = useState("");
  const [isValidating, setIsValidating] = useState(true);

  // Validate cart against real-time Supabase inventory on mount
  useEffect(() => {
    let isMounted = true;
    async function checkStock() {
      setIsValidating(true);
      try {
        const res = await validateAndSyncStock();
        if (isMounted) {
          if (res.unavailableItems?.length > 0) {
            setStockNotice("One or more items in your bag are currently sold out. Please remove them to proceed.");
          } else if (res.adjustedItems?.length > 0) {
            setStockNotice("Some item quantities were adjusted to match current atelier inventory.");
          } else {
            setStockNotice("");
          }
        }
      } catch (e) {
        console.error("Cart stock check error:", e);
      } finally {
        if (isMounted) setIsValidating(false);
      }
    }

    checkStock();
    return () => {
      isMounted = false;
    };
  }, [validateAndSyncStock]);

  const hasUnavailableItems = cartItems.some(
    (item) => item.isUnavailable || item.availableStock === 0 || item.variant?.isOutOfStock
  );

  return (
    <div className="bg-[#0D0D0C] text-[#F2EEE7] min-h-screen">
      <SEO
        title="Your Bag — Review Selections"
        description="Review your selected Extraits de Parfum. Enjoy complimentary shipping and Cash on Delivery across Pakistan."
        canonicalUrl="https://scente.pk/cart"
        noindex={true}
      />
      <div className="layout-container py-10 sm:py-16">
        {/* 1. EDITORIAL PAGE HEADER */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: LUXURY_EASE }}
          className="border-b border-[rgba(242,238,231,0.06)] pb-5 sm:pb-6 mb-8 sm:mb-10"
        >
          <h1 className="font-serif font-light text-xl sm:text-2xl lg:text-[26px] text-[#F2EEE7] tracking-[0.18em] uppercase">
            YOUR BAG
          </h1>
        </motion.div>

        {/* Real-time Inventory Notice */}
        {stockNotice && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-4 mb-8 text-xs font-sans flex items-center space-x-3 border ${
              hasUnavailableItems
                ? "bg-rose-950/30 border-rose-500/40 text-rose-300"
                : "bg-amber-950/30 border-amber-500/40 text-amber-300"
            }`}
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{stockNotice}</span>
          </motion.div>
        )}

        {cartItems.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
            {/* 2. CART ITEMS LIST */}
            <div className="lg:col-span-8">
              <div>
                <AnimatePresence mode="popLayout">
                  {cartItems.map((item) => (
                    <motion.div
                      key={`${item.product.id}-${item.size}`}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.97 }}
                      transition={{ duration: 0.35, ease: LUXURY_EASE }}
                      className="py-8 first:pt-0 border-b border-[rgba(242,238,231,0.06)]"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 sm:gap-8">
                        {/* Product Visual & Details */}
                        <div className="flex items-center space-x-3.5 xs:space-x-5 sm:space-x-7">
                          <Link
                            to={`/product/${item.product.slug}`}
                            className="w-16 xs:w-20 sm:w-24 aspect-[4/5] bg-[#121110] shrink-0 border border-[rgba(242,238,231,0.08)] overflow-hidden block rounded-sm group"
                          >
                            <img
                              src={item.product.image || item.product.primary_image}
                              alt={item.product.name}
                              className="w-full h-full object-cover opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500 select-none"
                            />
                          </Link>

                          <div className="space-y-1 sm:space-y-1.5 font-sans">
                            <h3 className="font-serif font-light text-base xs:text-xl sm:text-2xl text-[#F2EEE7] tracking-headline leading-tight">
                              <Link
                                to={`/product/${item.product.slug}`}
                                className="hover:text-[#BFA27A] transition-colors"
                              >
                                {item.product.name}
                              </Link>
                            </h3>
                            <p className="text-[11px] xs:text-xs sm:text-[13px] text-[#AAA49B] font-light tracking-wide">
                              {item.size || "50ml"} · {item.product.subtitle || "Extrait de Parfum"}
                            </p>
                            {(item.isUnavailable || item.availableStock === 0 || item.variant?.isOutOfStock) && (
                              <span className="inline-block text-[9px] xs:text-[9.5px] uppercase tracking-wider text-rose-400 bg-rose-950/60 border border-rose-500/40 px-2 py-0.5 rounded-sm font-medium">
                                SOLD OUT — PLEASE REMOVE
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Quantity, Price & Remove Controls */}
                        <div className="flex items-center justify-between sm:justify-end gap-3 xs:gap-6 sm:gap-10 pt-1 sm:pt-0">
                          {/* Quantity Stepper */}
                          <div className="space-y-1 text-left sm:text-center">
                            <span className="text-[8.5px] xs:text-[9px] uppercase font-sans tracking-[0.18em] xs:tracking-[0.22em] text-[#777169] block font-medium">
                              QUANTITY
                            </span>
                            <div className="flex items-center border border-[rgba(242,238,231,0.12)] bg-[#121110] rounded-full px-2.5 xs:px-3 py-1 xs:py-1.5 transition-colors hover:border-[rgba(242,238,231,0.22)]">
                              <button
                                type="button"
                                onClick={() => updateQuantity(item.product.id, item.size, item.quantity - 1)}
                                disabled={item.quantity <= 1 || item.isUnavailable || item.availableStock === 0}
                                className="text-[#AAA49B] hover:text-[#F2EEE7] disabled:opacity-20 disabled:hover:text-[#AAA49B] transition-colors p-1 cursor-pointer disabled:cursor-not-allowed flex items-center justify-center min-w-[24px] min-h-[24px]"
                                aria-label="Decrease quantity"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="w-6 xs:w-8 text-center text-xs text-[#F2EEE7] font-medium font-sans select-none">
                                {item.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() => updateQuantity(item.product.id, item.size, item.quantity + 1)}
                                disabled={
                                  item.isUnavailable ||
                                  item.availableStock === 0 ||
                                  item.quantity >= (item.availableStock ?? item.variant?.stockQuantity ?? item.variant?.stock_quantity ?? 99)
                                }
                                className="text-[#AAA49B] hover:text-[#F2EEE7] disabled:opacity-20 disabled:hover:text-[#AAA49B] transition-colors p-1 cursor-pointer disabled:cursor-not-allowed flex items-center justify-center min-w-[24px] min-h-[24px]"
                                aria-label="Increase quantity"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          </div>

                          {/* Product Price & Subtle Remove */}
                          <div className="text-right min-w-[90px] xs:min-w-[110px]">
                            {item.compareAtPrice && Number(item.compareAtPrice) > (item.price ?? item.product.price) && (
                              <div className="text-[11px] sm:text-xs text-[#777169] line-through font-serif decoration-[#777169]/70">
                                PKR {(Number(item.compareAtPrice) * item.quantity).toLocaleString()}
                              </div>
                            )}
                            <div className="font-serif font-light text-base xs:text-lg sm:text-xl text-[#F2EEE7] tracking-tight">
                              PKR {((item.price ?? item.product.price) * item.quantity).toLocaleString()}
                            </div>
                            <div className="pt-1.5 sm:pt-3">
                              <button
                                type="button"
                                onClick={() => removeFromCart(item.product.id, item.size)}
                                className="text-xs sm:text-[13px] font-sans text-[#AAA49B] hover:text-[#BFA27A] underline underline-offset-4 decoration-[rgba(242,238,231,0.25)] hover:decoration-[#BFA27A] transition-all cursor-pointer font-medium tracking-wide py-1"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              {/* Secondary Navigation */}
              <div className="pt-8">
                <Link
                  to="/shop"
                  className="inline-flex items-center text-xs uppercase font-sans tracking-[0.2em] text-[#AAA49B] hover:text-[#BFA27A] transition-colors font-medium group"
                >
                  <span className="transition-transform duration-200 group-hover:-translate-x-1">←</span>
                  <span className="ml-2">Continue Exploring The Collection</span>
                </Link>
              </div>
            </div>

            {/* 3. ORDER SUMMARY */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1, ease: LUXURY_EASE }}
              className="lg:col-span-4 bg-[#121110] p-7 sm:p-9 border border-[rgba(242,238,231,0.06)] rounded-xl lg:sticky lg:top-28 space-y-6 transform-gpu"
            >
              <h2 className="font-serif font-light text-2xl text-[#F2EEE7] pb-4 border-b border-[rgba(242,238,231,0.06)] tracking-headline">
                Order Summary
              </h2>

              <div className="space-y-4 font-sans text-xs sm:text-[13px] pb-6 border-b border-[rgba(242,238,231,0.06)]">
                <div className="flex justify-between items-center text-[#AAA49B] font-light">
                  <span className="uppercase tracking-[0.16em] text-[11px] text-[#777169] font-medium">SUBTOTAL</span>
                  <span className="text-[#F2EEE7] font-medium">{formattedSubtotal}</span>
                </div>
                <div className="flex justify-between items-center text-[#AAA49B] font-light">
                  <span className="uppercase tracking-[0.16em] text-[11px] text-[#777169] font-medium">SHIPPING</span>
                  <span className="text-[#BFA27A] font-medium tracking-wide">Complimentary</span>
                </div>
                <div className="flex justify-between items-center text-[#AAA49B] font-light">
                  <span className="uppercase tracking-[0.16em] text-[11px] text-[#777169] font-medium">TAXES</span>
                  <span className="text-[#AAA49B] font-light">Included</span>
                </div>
              </div>

              {/* Total */}
              <div className="flex justify-between items-baseline font-sans pt-1">
                <span className="text-xs uppercase font-sans tracking-[0.2em] text-[#F2EEE7] font-medium">
                  TOTAL
                </span>
                <span className="text-2xl sm:text-3xl font-serif font-light tracking-tight text-[#F2EEE7]">
                  {formattedSubtotal}
                </span>
              </div>

              {/* Primary Checkout CTA */}
              {hasUnavailableItems ? (
                <div className="w-full bg-[#181714] text-[#AAA49B] border border-rose-500/40 py-4 px-6 text-xs uppercase font-sans tracking-[0.18em] font-medium rounded-xl text-center select-none shadow-inner">
                  REMOVE SOLD OUT ITEMS TO PROCEED
                </div>
              ) : (
                <Link
                  to="/checkout"
                  state={{ freshCheckout: true, isBuyNow: false }}
                  onClick={() => {
                    clearBuyNow();
                    try {
                      sessionStorage.removeItem("scente_confirmed_order");
                      sessionStorage.removeItem("scente_last_order");
                    } catch (e) {}
                  }}
                  className="w-full bg-[#BFA27A] hover:bg-[#A88B65] text-[#0D0D0C] py-4 px-8 text-xs sm:text-[12.5px] uppercase font-sans tracking-[0.22em] font-semibold rounded-xl shadow-[0_4px_25px_rgba(191,162,122,0.25)] hover:shadow-[0_6px_30px_rgba(191,162,122,0.4)] transition-all duration-300 flex items-center justify-center space-x-2 block cursor-pointer group"
                >
                  <span>PROCEED TO CHECKOUT</span>
                  <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
                </Link>
              )}
            </motion.div>
          </div>
        ) : (
          /* 4. REDESIGNED EDITORIAL EMPTY CART STATE */
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: LUXURY_EASE }}
            className="py-24 sm:py-32 text-center max-w-xl mx-auto bg-[#121110] p-8 sm:p-14 border border-[rgba(242,238,231,0.06)] rounded-2xl shadow-2xl transform-gpu"
          >
            <span className="text-[10px] sm:text-[11px] uppercase font-sans tracking-eyebrow text-[#BFA27A] block mb-3 font-medium">
              YOUR BAG IS EMPTY
            </span>
            <h2 className="font-serif font-light text-3xl sm:text-4xl text-[#F2EEE7] mb-4 tracking-headline">
              "Discover a fragrance crafted to become your signature."
            </h2>
            <p className="text-xs sm:text-sm font-sans text-[#AAA49B] font-light leading-[1.6] mb-8 max-w-md mx-auto">
              Each SCENTÉ composition is hand-macerated with pure perfume oil concentration for an enduring, magnetic aura.
            </p>
            <Link
              to="/shop"
              className="inline-block bg-[#BFA27A] hover:bg-[#A88B65] text-[#0D0D0C] py-3.5 px-8 text-xs uppercase font-sans tracking-[0.2em] font-semibold rounded-xl transition-all duration-300"
            >
              CONTINUE EXPLORING THE COLLECTION
            </Link>
          </motion.div>
        )}

        {/* 5. ATELIER STANDARDS FOOTNOTE */}
        <div className="mt-16 sm:mt-24 pt-12 sm:pt-16 border-t border-[rgba(242,238,231,0.06)]">
          <ScrollReveal className="mb-8 sm:mb-12">
            <span className="text-[10px] sm:text-[11px] uppercase font-sans tracking-eyebrow text-[#BFA27A] font-medium block mb-1.5">
              ATELIER DISPATCH STANDARDS
            </span>
            <h2 className="font-serif font-light text-2xl sm:text-3xl text-[#F2EEE7] tracking-headline">
              The Scenté Guarantee
            </h2>
          </ScrollReveal>

          <div className="divide-y divide-[rgba(242,238,231,0.06)] lg:divide-y-0 lg:grid lg:grid-cols-4 lg:gap-10 xl:gap-14">
            <ScrollReveal delay={0.08} className="py-6 sm:py-8 lg:py-2 lg:border-r border-[rgba(242,238,231,0.06)] lg:pr-8 xl:pr-10 flex flex-col justify-start">
              <span className="text-[11px] sm:text-[11.5px] uppercase font-sans tracking-micro text-[#F2EEE7] font-medium block mb-2">
                CASH ON DELIVERY
              </span>
              <p className="text-xs sm:text-[13px] font-sans text-[#AAA49B] font-light leading-[1.65]">
                Pay upon arrival. Available nationwide across Pakistan with zero prepayment required.
              </p>
            </ScrollReveal>

            <ScrollReveal delay={0.14} className="py-6 sm:py-8 lg:py-2 lg:border-r border-[rgba(242,238,231,0.06)] lg:pr-8 xl:pr-10 flex flex-col justify-start">
              <span className="text-[11px] sm:text-[11.5px] uppercase font-sans tracking-micro text-[#F2EEE7] font-medium block mb-2">
                COMPLIMENTARY EXPRESS
              </span>
              <p className="text-xs sm:text-[13px] font-sans text-[#AAA49B] font-light leading-[1.65]">
                Insured express air courier dispatch across Pakistan, delivered safely within 2–4 business days.
              </p>
            </ScrollReveal>

            <ScrollReveal delay={0.2} className="py-6 sm:py-8 lg:py-2 lg:border-r border-[rgba(242,238,231,0.06)] lg:pr-8 xl:pr-10 flex flex-col justify-start">
              <span className="text-[11px] sm:text-[11.5px] uppercase font-sans tracking-micro text-[#F2EEE7] font-medium block mb-2">
                EXTRAIT DE PARFUM
              </span>
              <p className="text-xs sm:text-[13px] font-sans text-[#AAA49B] font-light leading-[1.65]">
                30% pure perfume oil concentration handcrafted in small batches for intimate, enduring longevity.
              </p>
            </ScrollReveal>

            <ScrollReveal delay={0.26} className="py-6 sm:py-8 lg:py-2 lg:pr-0 flex flex-col justify-start">
              <span className="text-[11px] sm:text-[11.5px] uppercase font-sans tracking-micro text-[#F2EEE7] font-medium block mb-2">
                ATELIER PACKAGING
              </span>
              <p className="text-xs sm:text-[13px] font-sans text-[#AAA49B] font-light leading-[1.65]">
                Every 50ml flacon is encased in custom protective housing and accompanied by a sample vial.
              </p>
            </ScrollReveal>
          </div>
        </div>
      </div>
    </div>
  );
}
