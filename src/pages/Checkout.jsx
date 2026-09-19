import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { Check, ShieldCheck, ArrowLeft, Truck, AlertCircle, Loader2, Copy, Search, CheckCircle2, Tag, X } from "lucide-react";
import Button from "../components/Button";
import Input from "../components/Input";
import { motion, AnimatePresence } from "framer-motion";
import { LUXURY_EASE } from "../lib/animations";
import SEO from "../components/SEO";
import { validatePromoCode } from "../services/promoCodes";

export default function Checkout() {
  const { cartItems, buyNowItem, clearBuyNow, placeOrder, validateAndSyncStock } = useCart();
  const location = useLocation();
  const isBuyNow = Boolean(location.state?.isBuyNow || (buyNowItem && location.state?.isBuyNow !== false));
  const isFreshCheckout = Boolean(location.state?.freshCheckout);

  // Active items being checked out: isolated Buy Now item if in Buy Now flow, else regular cartItems
  const checkoutItems = isBuyNow && buyNowItem ? [buyNowItem] : cartItems;

  const checkoutSubtotal = checkoutItems.reduce(
    (acc, item) => acc + (item.price ?? item.product.price) * item.quantity,
    0
  );
  const formattedSubtotal = `PKR ${checkoutSubtotal.toLocaleString()}`;

  // Customer Form State (City & Province initialized empty for manual customer entry)
  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    email: "",
    address: "",
    city: "",
    province: "",
    postalCode: "",
  });

  // Validation errors
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState("");

  // Promo Code State
  const [promoCodeInput, setPromoCodeInput] = useState("");
  const [appliedPromo, setAppliedPromo] = useState(null);
  const [isApplyingPromo, setIsApplyingPromo] = useState(false);
  const [promoError, setPromoError] = useState("");
  const [promoSuccess, setPromoSuccess] = useState("");

  // Re-verify applied promo when cart subtotal changes
  useEffect(() => {
    if (!appliedPromo) return;

    let isMounted = true;
    validatePromoCode(appliedPromo.code, checkoutSubtotal, formData.phone, formData.email).then((res) => {
      if (!isMounted) return;
      if (res.valid) {
        setAppliedPromo(res);
        setPromoError("");
      } else {
        setAppliedPromo(null);
        setPromoError(res.message || "Promo code is no longer applicable to your cart.");
        setPromoSuccess("");
      }
    });

    return () => {
      isMounted = false;
    };
  }, [checkoutSubtotal]);

  const discountAmount = appliedPromo?.discountAmount || 0;
  const finalTotalDue = Math.max(0, checkoutSubtotal - discountAmount);
  const formattedTotalDue = `PKR ${finalTotalDue.toLocaleString()}`;
  const formattedDiscountAmount = `-PKR ${discountAmount.toLocaleString()}`;

  const handleApplyPromo = async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const cleanCode = promoCodeInput.trim().toUpperCase();
    if (!cleanCode) {
      setPromoError("Please enter a promo code.");
      setPromoSuccess("");
      return;
    }

    setIsApplyingPromo(true);
    setPromoError("");
    setPromoSuccess("");

    try {
      const res = await validatePromoCode(cleanCode, checkoutSubtotal, formData.phone, formData.email);
      if (res.valid) {
        setAppliedPromo(res);
        setPromoSuccess(`Promo code ${res.code} applied! Saved PKR ${res.discountAmount.toLocaleString()}.`);
        setPromoError("");
      } else {
        setAppliedPromo(null);
        setPromoError(res.message || "Invalid promo code. Please check and try again.");
        setPromoSuccess("");
      }
    } catch (err) {
      console.error("Promo validation error:", err);
      setPromoError("Unable to validate promo code. Please try again.");
      setPromoSuccess("");
    } finally {
      setIsApplyingPromo(false);
    }
  };

  const handleRemovePromo = () => {
    setAppliedPromo(null);
    setPromoCodeInput("");
    setPromoError("");
    setPromoSuccess("");
  };

  // Validate stock on checkout mount
  useEffect(() => {
    async function verifyCheckoutStock() {
      try {
        const res = await validateAndSyncStock(checkoutItems);
        if (res.unavailableItems?.length > 0) {
          setSubmissionError("Sorry, one or more items in your cart are currently sold out.");
        } else if (res.adjustedItems?.length > 0) {
          setSubmissionError("Some quantities were automatically adjusted to match current atelier inventory.");
        }
      } catch (e) {
        console.warn("Stock verification error:", e);
      }
    }
    verifyCheckoutStock();
  }, [validateAndSyncStock, checkoutItems]);

  const hasUnavailableItems = checkoutItems.some(
    (item) => item.isUnavailable || item.availableStock === 0 || item.variant?.isOutOfStock
  );

  // Confirmed Order state: only populated immediately following a successful order submission.
  // Stale confirmed orders are NEVER loaded as the default state for active checkouts or Buy Now.
  const [confirmedOrder, setConfirmedOrder] = useState(() => {
    if (isFreshCheckout || (checkoutItems && checkoutItems.length > 0)) {
      try {
        sessionStorage.removeItem("scente_confirmed_order");
      } catch (e) {}
      return null;
    }
    // Only restore if user reloaded while actively on the confirmation view with 0 items in cart
    try {
      const saved = sessionStorage.getItem("scente_confirmed_order");
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return null;
  });

  // Guard: if user has active items in checkout, ensure stale confirmation is discarded
  useEffect(() => {
    if (checkoutItems && checkoutItems.length > 0 && confirmedOrder) {
      setConfirmedOrder(null);
      try {
        sessionStorage.removeItem("scente_confirmed_order");
      } catch (e) {}
    }
  }, [checkoutItems?.length]);

  const [copiedRef, setCopiedRef] = useState(false);

  // Handle Copy Order Reference
  const handleCopyReference = (refText) => {
    if (!refText) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard
        .writeText(refText)
        .then(() => {
          setCopiedRef(true);
          setTimeout(() => setCopiedRef(false), 2500);
        })
        .catch(() => {
          fallbackCopy(refText);
        });
    } else {
      fallbackCopy(refText);
    }
  };

  const fallbackCopy = (text) => {
    try {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopiedRef(true);
      setTimeout(() => setCopiedRef(false), 2500);
    } catch (err) {
      console.error("Clipboard copy fallback error:", err);
    }
  };

  // Handle Input Changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  // Form Validation
  const validateForm = () => {
    const newErrors = {};

    if (!formData.fullName.trim() || formData.fullName.trim().length < 2) {
      newErrors.fullName = "Please provide your full recipient name.";
    }

    // Phone validation for Pakistani numbers
    const cleanPhone = formData.phone.replace(/[\s-]/g, "");
    const phoneRegex = /^(\+92|0|0092)?3[0-9]{9}$/;
    if (!cleanPhone || !phoneRegex.test(cleanPhone)) {
      newErrors.phone = "Please enter a valid Pakistani mobile number (e.g. 0300 1234567).";
    }

    if (!formData.address.trim() || formData.address.trim().length < 5) {
      newErrors.address = "Please enter a complete street / house address for courier delivery.";
    }

    if (!formData.city.trim()) {
      newErrors.city = "Please enter your city.";
    }

    if (!formData.province.trim()) {
      newErrors.province = "Please enter your province.";
    }

    // Optional email validation
    if (formData.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email.trim())) {
        newErrors.email = "Please provide a valid email format or leave blank.";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle Submit COD Order
  const handlePlaceOrder = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    if (checkoutItems.length === 0) {
      return;
    }

    if (hasUnavailableItems) {
      setSubmissionError("Sorry, one or more items in your cart are currently sold out.");
      return;
    }

    setIsSubmitting(true);
    setSubmissionError("");

    try {
      const generatedOrder = await placeOrder(formData, checkoutItems, appliedPromo);
      setConfirmedOrder(generatedOrder);
      try {
        sessionStorage.setItem("scente_confirmed_order", JSON.stringify(generatedOrder));
      } catch (e) {}
      window.scrollTo(0, 0);
    } catch (err) {
      console.error("Order submission error:", err);
      const message = err?.message || "Sorry, one or more items in your cart are no longer available in the requested quantity.";
      setSubmissionError(message);
      try {
        await validateAndSyncStock(checkoutItems);
      } catch (e) {}
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setIsSubmitting(false);
    }
  };

  // 1. ORDER CONFIRMATION VIEW
  if (confirmedOrder) {
    return (
      <div className="bg-[#0D0D0C] text-[#F2EEE7] min-h-screen py-14 sm:py-20">
        <SEO
          title={`Order Confirmed (${confirmedOrder.reference})`}
          description="Your Cash on Delivery reservation has been registered at our atelier."
          noindex={true}
        />
        <div className="layout-container max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="bg-[#121110] p-6 sm:p-12 border border-[rgba(242,238,231,0.08)] shadow-2xl space-y-8"
          >
            {/* Header Status */}
            <div className="text-center space-y-3 pb-6 border-b border-[rgba(242,238,231,0.06)]">
              <div className="w-12 h-12 rounded-full bg-[#181714] border border-[#BFA27A]/50 text-[#BFA27A] flex items-center justify-center mx-auto mb-3 shadow-lg">
                <Check className="w-5 h-5 stroke-[2.5]" />
              </div>
              <span className="text-[10.5px] sm:text-[11px] uppercase font-sans tracking-[0.25em] text-[#BFA27A] block font-medium">
                ORDER CONFIRMED
              </span>
              <h1 className="font-serif font-light text-3xl sm:text-4xl text-[#F2EEE7] tracking-headline">
                Thank you for choosing SCENTÉ.
              </h1>
              <p className="text-xs sm:text-sm font-sans text-[#AAA49B] font-light max-w-lg mx-auto leading-[1.6]">
                Your Cash on Delivery reservation has been registered at our atelier. We are preparing your bespoke flacon(s) for express insured dispatch.
              </p>
            </div>

            {/* Visual Focal Point: Order Reference Hero Card */}
            <div className="bg-[#0E0D0C] border border-[#BFA27A]/30 p-6 sm:p-8 text-center space-y-4 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-24 bg-[#BFA27A]/5 blur-3xl pointer-events-none" />

              <span className="text-[9.5px] sm:text-[10px] uppercase font-sans tracking-[0.28em] text-[#777169] block font-medium">
                YOUR UNIQUE ORDER REFERENCE
              </span>

              <div className="font-serif text-3xl sm:text-5xl tracking-[0.16em] text-[#F2EEE7] font-medium select-all py-1">
                {confirmedOrder.reference}
              </div>

              {/* Copy Order Reference Button */}
              <div className="flex justify-center pt-1">
                <button
                  type="button"
                  onClick={() => handleCopyReference(confirmedOrder.reference)}
                  className={`inline-flex items-center space-x-2 text-xs uppercase font-sans tracking-[0.18em] px-5 py-2.5 border transition-all duration-200 cursor-pointer ${
                    copiedRef
                      ? "bg-emerald-950/60 border-emerald-500/60 text-emerald-300 shadow-md"
                      : "bg-[#181714] border-[rgba(242,238,231,0.18)] text-[#F2EEE7] hover:border-[#BFA27A] hover:text-[#BFA27A]"
                  }`}
                >
                  {copiedRef ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[2.5]" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 stroke-[1.5]" />
                      <span>Copy Order Reference</span>
                    </>
                  )}
                </button>
              </div>

              {/* Clear Informational Notice */}
              <div className="pt-3 border-t border-[rgba(242,238,231,0.06)] flex items-center justify-center space-x-2 text-[11px] text-[#AAA49B] font-light">
                <ShieldCheck className="w-4 h-4 text-[#BFA27A] shrink-0" />
                <span>Please save your Order Reference Number. No account is required to track your order.</span>
              </div>
            </div>

            {/* Action Bar: Track My Order + Return to Collection */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-1">
              <Link
                to="/track"
                state={{
                  reference: confirmedOrder.reference,
                  phone: confirmedOrder.customer?.phone || "",
                  fromConfirmation: true,
                }}
                onClick={() => {
                  try {
                    sessionStorage.removeItem("scente_confirmed_order");
                  } catch (e) {}
                }}
                className="w-full sm:w-auto bg-[#F2EEE7] text-[#0D0D0C] border border-[#F2EEE7] py-3.5 px-8 text-xs uppercase font-sans tracking-[0.2em] font-medium hover:bg-[#BFA27A] hover:border-[#BFA27A] transition-all duration-200 text-center cursor-pointer shadow-lg inline-flex items-center justify-center space-x-2"
              >
                <Search className="w-3.5 h-3.5 stroke-[2]" />
                <span>Track My Order</span>
              </Link>

              <Link
                to="/shop"
                onClick={() => {
                  try {
                    sessionStorage.removeItem("scente_confirmed_order");
                  } catch (e) {}
                  setConfirmedOrder(null);
                }}
                className="w-full sm:w-auto bg-transparent border border-[rgba(242,238,231,0.2)] text-[#AAA49B] hover:text-[#F2EEE7] hover:border-[#F2EEE7] py-3.5 px-6 text-xs uppercase font-sans tracking-[0.2em] font-medium transition-colors text-center cursor-pointer"
              >
                Explore More Fragrances
              </Link>
            </div>

            {/* Order Summary Breakdown */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-sans bg-[#0D0D0C] p-6 border border-[rgba(242,238,231,0.04)]">
              <div>
                <span className="text-[10px] uppercase text-[#777169] tracking-micro block mb-1">
                  PAYMENT METHOD
                </span>
                <span className="text-[#BFA27A] font-medium uppercase tracking-micro">
                  CASH ON DELIVERY (COD)
                </span>
              </div>

              <div>
                <span className="text-[10px] uppercase text-[#777169] tracking-micro block mb-1">
                  TOTAL AMOUNT (DUE ON ARRIVAL)
                </span>
                <span className="text-sm font-sans text-[#F2EEE7] font-medium">
                  {confirmedOrder.formattedTotal}
                </span>
              </div>

              <div className="pt-2">
                <span className="text-[10px] uppercase text-[#777169] tracking-micro block mb-1">
                  RECIPIENT & DESTINATION
                </span>
                <span className="text-[#F2EEE7]">
                  {confirmedOrder.customer.fullName} • {confirmedOrder.customer.city}
                  {confirmedOrder.customer.province && `, ${confirmedOrder.customer.province}`}
                </span>
              </div>

              <div className="pt-2">
                <span className="text-[10px] uppercase text-[#777169] tracking-micro block mb-1">
                  REGISTERED CONTACT
                </span>
                <span className="text-[#AAA49B] font-mono">
                  {confirmedOrder.customer.phone}
                </span>
              </div>

              {confirmedOrder.promo_code && (
                <div className="pt-3 border-t border-[rgba(242,238,231,0.06)] col-span-1 sm:col-span-2 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] uppercase text-[#777169] tracking-micro">
                      PROMO PRIVILEGE:
                    </span>
                    <span className="font-mono text-xs text-[#BFA27A] px-2 py-0.5 bg-[#BFA27A]/10 border border-[#BFA27A]/30">
                      {confirmedOrder.promo_code}
                    </span>
                  </div>
                  <span className="text-xs text-[#BFA27A] font-medium font-sans">
                    -PKR {Number(confirmedOrder.discount_amount || 0).toLocaleString()} SAVINGS
                  </span>
                </div>
              )}
            </div>

            {/* Compositions List */}
            {confirmedOrder.items && confirmedOrder.items.length > 0 && (
              <div className="space-y-3 font-sans">
                <span className="text-[10px] uppercase tracking-micro text-[#777169] block font-medium">
                  COMPOSITIONS INCLUDED
                </span>
                <div className="divide-y divide-[rgba(242,238,231,0.04)] border-t border-b border-[rgba(242,238,231,0.06)]">
                  {confirmedOrder.items.map((item, idx) => (
                    <div key={idx} className="py-3 flex justify-between items-center text-xs">
                      <div>
                        <p className="font-serif font-light text-base text-[#F2EEE7]">{item.productName}</p>
                        <p className="text-[10.5px] text-[#AAA49B]">{item.quantity} × {item.size} Extrait de Parfum</p>
                      </div>
                      <span className="font-sans text-sm text-[#F2EEE7]">
                        {item.formattedLineTotal}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Reassurance Footer */}
            <div className="border-t border-[rgba(242,238,231,0.06)] pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-sans text-[#AAA49B]">
              <div className="flex items-center space-x-3">
                <Truck className="w-4 h-4 text-[#BFA27A] shrink-0" />
                <span>Complimentary express air courier dispatch with cash collection on arrival.</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  // 2. DIRECT ACCESS / EMPTY CHECKOUT STATE
  if (checkoutItems.length === 0) {
    return (
      <div className="bg-[#0D0D0C] text-[#F2EEE7] min-h-[70vh] flex items-center justify-center px-6 py-20">
        <SEO
          title="Checkout — Bag Empty"
          noindex={true}
        />
        <div className="text-center max-w-md mx-auto bg-[#121110] p-10 sm:p-14 border border-[rgba(242,238,231,0.06)] shadow-2xl">
          <span className="text-[10px] sm:text-[11px] uppercase font-sans tracking-eyebrow text-[#BFA27A] block mb-3 font-medium">
            ATELIER CHECKOUT
          </span>
          <h1 className="font-serif font-light text-3xl sm:text-4xl text-[#F2EEE7] mb-3 tracking-headline">
            {isBuyNow ? "No Item Selected" : "Your Bag is Empty"}
          </h1>
          <p className="text-sm font-sans text-[#AAA49B] font-light leading-[1.6] mb-8">
            Please select a composition from our collection before proceeding to private checkout.
          </p>
          <Button to="/shop" variant="solid">
            Return to the Collection →
          </Button>
        </div>
      </div>
    );
  }

  // 3. CHECKOUT FORM & SUMMARY
  return (
    <div className="bg-[#0D0D0C] text-[#F2EEE7] min-h-screen">
      <SEO
        title="Checkout — Express Insured Delivery"
        description="Complete your order for handcrafted Extraits de Parfum. Complimentary express shipping and Cash on Delivery across Pakistan."
        canonicalUrl="https://scente.pk/checkout"
        noindex={true}
      />
      <div className="layout-container py-10 sm:py-16">
        {/* Navigation Breadcrumb */}
        <Link
          to={isBuyNow && buyNowItem?.product?.slug ? `/product/${buyNowItem.product.slug}` : "/cart"}
          className="inline-flex items-center text-[10.5px] uppercase font-sans tracking-nav text-[#AAA49B] hover:text-[#BFA27A] transition-colors mb-8"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-2 stroke-[1.5]" />
          <span>{isBuyNow && buyNowItem ? `Return to ${buyNowItem.product.name}` : "Return to Shopping Bag"}</span>
        </Link>

        {/* Header */}
        <div className="border-b border-[rgba(242,238,231,0.06)] pb-6 mb-10">
          <span className="text-[10px] sm:text-[11px] uppercase font-sans tracking-eyebrow text-[#BFA27A] block mb-2 font-medium">
            CHECKOUT
          </span>
          <h1 className="font-serif font-light text-3xl sm:text-5xl text-[#F2EEE7] tracking-headline mb-2">
            Complete Your Order
          </h1>
          <p className="text-sm font-sans text-[#AAA49B] font-light leading-[1.6]">
            A few details, and your composition will be on its way. Insured express delivery with Cash on Delivery nationwide.
          </p>
        </div>

        {/* Inventory / Submission Error Alert */}
        {submissionError && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 p-4 sm:p-5 bg-rose-950/40 border border-rose-500/50 text-rose-200 text-xs font-sans rounded-xl flex items-start space-x-3 shadow-xl"
          >
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1 space-y-1">
              <span className="font-medium text-sm text-rose-300 block">{submissionError}</span>
              {submissionError.toLowerCase().includes("stock") ||
              submissionError.toLowerCase().includes("not available") ||
              submissionError.toLowerCase().includes("sold out") ? (
                <>
                  <p className="text-[11px] text-rose-300/80 leading-relaxed">
                    One or more requested bottle sizes are no longer in stock. Please adjust your bag before placing your order.
                  </p>
                  <div className="pt-2">
                    <Link
                      to="/cart"
                      className="inline-flex items-center text-xs uppercase tracking-wider text-[#BFA27A] hover:underline font-medium"
                    >
                      ← Return to Bag to Adjust Items
                    </Link>
                  </div>
                </>
              ) : (
                <p className="text-[11px] text-rose-300/80 leading-relaxed">
                  Please review your details or try placing your order again.
                </p>
              )}
            </div>
          </motion.div>
        )}

        {/* Split Form & Order Summary */}
        <form onSubmit={handlePlaceOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-start">
          {/* Left Column: Customer & Delivery Details */}
          <div className="lg:col-span-7 space-y-8">
            {/* Section 1: Customer Details */}
            <div className="bg-[#121110] p-6 sm:p-10 border border-[rgba(242,238,231,0.06)] space-y-6">
              <h2 className="font-serif font-light text-xl sm:text-2xl text-[#F2EEE7] pb-3 border-b border-[rgba(242,238,231,0.06)] tracking-headline">
                1. Customer Details
              </h2>

              <div className="space-y-4 font-sans">
                {/* Full Name */}
                <div>
                  <label htmlFor="fullName" className="block text-[10px] uppercase tracking-micro text-[#777169] mb-2 font-medium">
                    Full Recipient Name <span className="text-[#BFA27A]">*</span>
                  </label>
                  <Input
                    id="fullName"
                    name="fullName"
                    type="text"
                    required
                    value={formData.fullName}
                    onChange={handleChange}
                    placeholder="e.g. Tariq Mansoor"
                    error={errors.fullName}
                  />
                  {errors.fullName && (
                    <p className="text-[11px] font-sans text-rose-400 mt-1.5 flex items-center space-x-1">
                      <AlertCircle className="w-3.5 h-3.5 mr-1 shrink-0" />
                      <span>{errors.fullName}</span>
                    </p>
                  )}
                </div>

                {/* Phone & Email */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="phone" className="block text-[10px] uppercase tracking-micro text-[#777169] mb-2 font-medium">
                      Mobile Phone (for COD confirmation) <span className="text-[#BFA27A]">*</span>
                    </label>
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      required
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="0300 1234567"
                      error={errors.phone}
                    />
                    {errors.phone && (
                      <p className="text-[11px] font-sans text-rose-400 mt-1.5 flex items-center space-x-1">
                        <AlertCircle className="w-3.5 h-3.5 mr-1 shrink-0" />
                        <span>{errors.phone}</span>
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-[10px] uppercase tracking-micro text-[#777169] mb-2 font-medium">
                      Email Address <span className="text-[#777169] lowercase font-light">(optional for tracking)</span>
                    </label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="client@domain.com"
                      error={errors.email}
                    />
                    {errors.email && (
                      <p className="text-[11px] font-sans text-rose-400 mt-1.5 flex items-center space-x-1">
                        <AlertCircle className="w-3.5 h-3.5 mr-1 shrink-0" />
                        <span>{errors.email}</span>
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: Delivery Destination */}
            <div className="bg-[#121110] p-6 sm:p-10 border border-[rgba(242,238,231,0.06)] space-y-6">
              <h2 className="font-serif font-light text-xl sm:text-2xl text-[#F2EEE7] pb-3 border-b border-[rgba(242,238,231,0.06)] tracking-headline">
                2. Delivery Destination
              </h2>

              <div className="space-y-4 font-sans">
                {/* Complete Street Address */}
                <div>
                  <label htmlFor="address" className="block text-[10px] uppercase tracking-micro text-[#777169] mb-2 font-medium">
                    Complete Street Address, House / Suite Number <span className="text-[#BFA27A]">*</span>
                  </label>
                  <Input
                    id="address"
                    name="address"
                    type="text"
                    required
                    value={formData.address}
                    onChange={handleChange}
                    placeholder="e.g. House 42, Street 14, Phase 6, DHA"
                    error={errors.address}
                  />
                  {errors.address && (
                    <p className="text-[11px] font-sans text-rose-400 mt-1.5 flex items-center space-x-1">
                      <AlertCircle className="w-3.5 h-3.5 mr-1 shrink-0" />
                      <span>{errors.address}</span>
                    </p>
                  )}
                </div>

                {/* City & Province & Postal Code */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* City */}
                  <div>
                    <label htmlFor="city" className="block text-[10px] uppercase tracking-micro text-[#777169] mb-2 font-medium">
                      City <span className="text-[#BFA27A]">*</span>
                    </label>
                    <Input
                      id="city"
                      name="city"
                      type="text"
                      required
                      value={formData.city}
                      onChange={handleChange}
                      placeholder="Enter your city"
                      error={errors.city}
                    />
                    {errors.city && (
                      <p className="text-[11px] font-sans text-rose-400 mt-1.5 flex items-center space-x-1">
                        <AlertCircle className="w-3.5 h-3.5 mr-1 shrink-0" />
                        <span>{errors.city}</span>
                      </p>
                    )}
                  </div>

                  {/* Province */}
                  <div>
                    <label htmlFor="province" className="block text-[10px] uppercase tracking-micro text-[#777169] mb-2 font-medium">
                      Province <span className="text-[#BFA27A]">*</span>
                    </label>
                    <Input
                      id="province"
                      name="province"
                      type="text"
                      required
                      value={formData.province}
                      onChange={handleChange}
                      placeholder="Enter your province"
                      error={errors.province}
                    />
                    {errors.province && (
                      <p className="text-[11px] font-sans text-rose-400 mt-1.5 flex items-center space-x-1">
                        <AlertCircle className="w-3.5 h-3.5 mr-1 shrink-0" />
                        <span>{errors.province}</span>
                      </p>
                    )}
                  </div>

                  {/* Postal Code */}
                  <div>
                    <label htmlFor="postalCode" className="block text-[10px] uppercase tracking-micro text-[#777169] mb-2 font-medium">
                      Postal Code <span className="text-[#777169] lowercase font-light">(opt)</span>
                    </label>
                    <Input
                      id="postalCode"
                      name="postalCode"
                      type="text"
                      value={formData.postalCode}
                      onChange={handleChange}
                      placeholder="e.g. 75500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Section 3: Payment Method (Cash on Delivery Only) */}
            <div className="bg-[#121110] p-6 sm:p-10 border border-[rgba(242,238,231,0.06)] space-y-4 font-sans">
              <h2 className="font-serif font-light text-xl sm:text-2xl text-[#F2EEE7] pb-3 border-b border-[rgba(242,238,231,0.06)] tracking-headline">
                3. Payment Selection
              </h2>

              <div className="p-4 bg-[#0D0D0C] border border-[#BFA27A]/30 flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <div className="w-3.5 h-3.5 rounded-full border-2 border-[#BFA27A] flex items-center justify-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#BFA27A]" />
                    </div>
                    <span className="text-xs text-[#F2EEE7] font-medium tracking-wide">
                      Cash on Delivery (Nationwide)
                    </span>
                  </div>
                  <p className="text-[11px] text-[#AAA49B] font-light pl-5.5 leading-[1.6]">
                    Pay when your order arrives. Available across all cities and districts in Pakistan.
                  </p>
                </div>

                <span className="text-[9.5px] uppercase text-[#BFA27A] tracking-micro font-medium shrink-0 ml-4">
                  COD ONLY
                </span>
              </div>
            </div>
          </div>

          {/* Right Column: Order Summary (Sticky on Desktop) */}
          <div className="lg:col-span-5 lg:sticky lg:top-28 space-y-6">
            <div className="bg-[#121110] p-6 sm:p-8 border border-[rgba(242,238,231,0.06)] shadow-2xl space-y-6">
              <h3 className="font-serif font-light text-2xl text-[#F2EEE7] pb-4 border-b border-[rgba(242,238,231,0.06)] tracking-headline">
                Your Order
              </h3>

              {/* Items List */}
              <div className="space-y-3 max-h-64 overflow-y-auto pr-1 divide-y divide-[rgba(242,238,231,0.04)] font-sans">
                {checkoutItems.map((item) => (
                  <div
                    key={`${item.product.id}-${item.size}`}
                    className="pt-3 first:pt-0 flex justify-between items-start text-xs text-[#F2EEE7]"
                  >
                    <div>
                      <p className="font-serif font-light text-base text-[#F2EEE7]">{item.product.name}</p>
                      <p className="text-[10.5px] text-[#AAA49B]">
                        {item.quantity} × {item.size} • {item.formattedPrice || item.product.formattedPrice}
                      </p>
                    </div>
                    <span className="font-sans text-sm text-[#F2EEE7]">
                      PKR {((item.price ?? item.product.price) * item.quantity).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>

              {/* Optional Promo Code Box */}
              <div className="pt-4 border-t border-[rgba(242,238,231,0.06)] font-sans space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5 text-xs text-[#AAA49B]">
                    <Tag className="w-3.5 h-3.5 text-[#BFA27A]" />
                    <span className="text-[10px] uppercase tracking-wider text-[#777169] font-medium">
                      Promo Code
                    </span>
                  </div>
                  {appliedPromo && (
                    <span className="text-[9.5px] uppercase tracking-wider text-emerald-400 font-mono">
                      Active
                    </span>
                  )}
                </div>

                {appliedPromo ? (
                  <div className="bg-[#0D0D0C] border border-[#BFA27A]/40 p-3 rounded flex items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-xs text-[#F2EEE7] font-semibold tracking-wider">
                          {appliedPromo.code}
                        </span>
                        <span className="text-[9px] uppercase px-1.5 py-0.5 bg-[#BFA27A]/15 text-[#BFA27A] border border-[#BFA27A]/30 font-medium">
                          Applied
                        </span>
                      </div>
                      <p className="text-[11px] text-[#BFA27A] font-light">
                        Discount of PKR {appliedPromo.discountAmount.toLocaleString()} applied
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleRemovePromo}
                      className="text-xs text-[#AAA49B] hover:text-rose-400 p-1.5 transition-colors cursor-pointer flex items-center space-x-1 shrink-0"
                      title="Remove promo code"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span className="text-[10px] uppercase tracking-wider">Remove</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={promoCodeInput}
                        onChange={(e) => {
                          setPromoCodeInput(e.target.value.toUpperCase());
                          if (promoError) setPromoError("");
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleApplyPromo(e);
                          }
                        }}
                        placeholder="Enter promo code"
                        className="flex-1 bg-[#0D0D0C] border border-[rgba(242,238,231,0.12)] focus:border-[#BFA27A] text-xs font-mono uppercase text-[#F2EEE7] px-3.5 py-2.5 outline-none transition-colors placeholder:normal-case placeholder:font-sans placeholder:text-[#55504A]"
                      />
                      <button
                        type="button"
                        onClick={handleApplyPromo}
                        disabled={isApplyingPromo || !promoCodeInput.trim()}
                        className="bg-[#181714] hover:bg-[#BFA27A] text-[#F2EEE7] hover:text-[#0D0D0C] border border-[#BFA27A]/50 px-4 py-2.5 text-[10.5px] uppercase tracking-wider transition-all duration-200 cursor-pointer disabled:opacity-40 disabled:hover:bg-[#181714] disabled:hover:text-[#F2EEE7] disabled:cursor-not-allowed font-medium shrink-0 flex items-center justify-center min-w-[70px]"
                      >
                        {isApplyingPromo ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-[#BFA27A]" />
                        ) : (
                          <span>Apply</span>
                        )}
                      </button>
                    </div>

                    {promoError && (
                      <p className="text-[11px] font-sans text-rose-400 flex items-start space-x-1 pt-0.5">
                        <AlertCircle className="w-3.5 h-3.5 mr-1 shrink-0 mt-0.5" />
                        <span>{promoError}</span>
                      </p>
                    )}
                    {promoSuccess && (
                      <p className="text-[11px] font-sans text-emerald-400 flex items-center space-x-1 pt-0.5">
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1 shrink-0" />
                        <span>{promoSuccess}</span>
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Totals Breakdown */}
              <div className="space-y-3 text-xs font-sans text-[#AAA49B] pt-4 border-t border-[rgba(242,238,231,0.06)]">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="text-[#F2EEE7] font-medium">{formattedSubtotal}</span>
                </div>

                {appliedPromo && (
                  <>
                    <div className="flex justify-between items-center text-[#F2EEE7]">
                      <span>Promo Code</span>
                      <span className="font-mono text-xs text-[#BFA27A] font-medium">
                        {appliedPromo.code} <span className="text-[9.5px] text-[#BFA27A]/80 uppercase ml-1">[Applied]</span>
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-[#BFA27A]">
                      <span>Discount</span>
                      <span className="font-serif font-medium">{formattedDiscountAmount}</span>
                    </div>
                  </>
                )}

                <div className="flex justify-between">
                  <span>Express Courier (Pakistan)</span>
                  <span className="text-[#BFA27A] font-medium uppercase tracking-micro">COMPLIMENTARY</span>
                </div>
                <div className="flex justify-between">
                  <span>Payment Term</span>
                  <span className="text-[#F2EEE7]">CASH ON DELIVERY</span>
                </div>
              </div>

              {/* Total Due */}
              <div className="flex justify-between items-baseline font-sans text-xl sm:text-2xl font-light text-[#F2EEE7] pt-3 border-t border-[rgba(242,238,231,0.06)]">
                <span>Total Due</span>
                <span>{formattedTotalDue}</span>
              </div>

              {/* Submit CTA */}
              <button
                type="submit"
                disabled={isSubmitting || hasUnavailableItems || checkoutItems.length === 0}
                className="w-full bg-[#BFA27A] hover:bg-[#A88B65] text-[#0D0D0C] border border-[#BFA27A] rounded-xl py-4 px-8 text-xs uppercase font-sans tracking-[0.14em] disabled:opacity-40 disabled:hover:bg-[#BFA27A] disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center space-x-2 cursor-pointer font-semibold shadow-lg"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-[#0D0D0C]" />
                    <span>Securing Reservation...</span>
                  </>
                ) : hasUnavailableItems ? (
                  <span>Items Sold Out — Cannot Proceed</span>
                ) : (
                  <span>Place COD Order →</span>
                )}
              </button>

              {/* Reassurance */}
              <div className="flex items-center justify-center space-x-2 text-[10px] uppercase font-sans text-[#777169] tracking-micro pt-2">
                <ShieldCheck className="w-3.5 h-3.5 text-[#BFA27A]" />
                <span>Confidential Atelier Packaging</span>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
