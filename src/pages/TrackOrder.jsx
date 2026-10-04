import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import ScrollReveal from "../components/ScrollReveal";
import Input from "../components/Input";
import { trackOrderPublic, cancelOrderCustomer } from "../services/orders";
import {
  Search,
  Package,
  Truck,
  Check,
  Copy,
  AlertCircle,
  AlertTriangle,
  Loader2,
  RotateCcw,
  XCircle,
  ShieldCheck,
  FlaskConical,
  HelpCircle,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import SEO from "../components/SEO";

export default function TrackOrder() {
  const location = useLocation();

  const isFromConfirmation = Boolean(location.state?.fromConfirmation);
  const initialRef = isFromConfirmation
    ? (location.state?.reference || "").trim().toUpperCase()
    : "";
  const initialPhone = isFromConfirmation
    ? (location.state?.phone || "").trim()
    : "";

  const [reference, setReference] = useState(initialRef);
  const [phone, setPhone] = useState(initialPhone);
  const [isLoading, setIsLoading] = useState(false);
  const [orderData, setOrderData] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [copied, setCopied] = useState(false);

  // Cancellation State
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelSuccessMessage, setCancelSuccessMessage] = useState("");
  const [cancelErrorMessage, setCancelErrorMessage] = useState("");

  // Auto-query only if arriving directly from checkout confirmation
  useEffect(() => {
    if (isFromConfirmation && initialRef && initialPhone) {
      try {
        window.history.replaceState({}, document.title, location.pathname);
      } catch (e) { }

      setIsLoading(true);
      setErrorMessage("");
      trackOrderPublic(initialRef, initialPhone)
        .then(({ data, error }) => {
          setIsLoading(false);
          if (data) {
            setOrderData(data);
          } else {
            setErrorMessage(
              "Order not found. Please check your order reference and phone number and try again."
            );
          }
        })
        .catch(() => {
          setIsLoading(false);
          setErrorMessage(
            "Order not found. Please check your order reference and phone number and try again."
          );
        });
    }
  }, []);

  const formatMilestoneDate = (isoString) => {
    if (!isoString) return null;
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return null;
      return d.toLocaleDateString("en-PK", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch (e) {
      return null;
    }
  };

  const getStatusMessage = (status) => {
    switch (status?.toLowerCase()) {
      case "pending":
        return "Your order has been received and is awaiting atelier review.";
      case "confirmed":
        return "Your order has been verified and confirmed by the atelier.";
      case "processing":
        return "Your fragrance is being carefully prepared for dispatch.";
      case "shipped":
        return "Your order is in transit with the express courier.";
      case "delivered":
        return "Your order has been delivered. We hope you enjoy your fragrance.";
      case "cancelled":
        return "This order has been cancelled.";
      default:
        return "Your order status is being updated by our atelier.";
    }
  };

  const handleTrack = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setCancelSuccessMessage("");
    setCancelErrorMessage("");
    setOrderData(null);

    const cleanRef = reference.trim().toUpperCase();
    const cleanPhone = phone.trim();

    if (!cleanRef) {
      setErrorMessage("Please enter your Order Reference (e.g. SC-123456).");
      return;
    }
    if (!cleanPhone) {
      setErrorMessage("Please enter the mobile phone number used during checkout.");
      return;
    }

    setIsLoading(true);
    const { data, error } = await trackOrderPublic(cleanRef, cleanPhone);
    setIsLoading(false);

    if (error || !data) {
      setErrorMessage(
        "Order not found. Please check your order reference and phone number and try again."
      );
    } else {
      setOrderData(data);
    }
  };

  const handleCopyTracking = (num) => {
    if (!num) return;
    try {
      navigator.clipboard.writeText(num);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error("Clipboard copy error:", e);
    }
  };

  const handleReset = () => {
    setOrderData(null);
    setErrorMessage("");
    setCancelSuccessMessage("");
    setCancelErrorMessage("");
    setReference("");
    setPhone("");
  };

  // Secure Customer Cancellation
  const handleConfirmCancel = async () => {
    if (!orderData || !orderData.reference || !phone.trim() || isCancelling) return;

    setIsCancelling(true);
    setCancelErrorMessage("");

    const { data, error } = await cancelOrderCustomer(orderData.reference, phone.trim());
    setIsCancelling(false);

    if (error) {
      setCancelErrorMessage(
        error.message || "Unable to cancel order. It may have already progressed to dispatch."
      );
    } else {
      setShowCancelModal(false);
      setCancelSuccessMessage(
        "Your order has been cancelled successfully. Reserved inventory has been restored to the catalog."
      );

      // Immediate UI update to reflect CANCELLED status
      setOrderData((prev) => ({
        ...prev,
        status: "cancelled",
        cancelled_at: data?.cancelled_at || new Date().toISOString(),
      }));

      // Re-fetch fresh state from server
      const cleanRef = reference.trim().toUpperCase();
      const cleanPhone = phone.trim();
      if (cleanRef && cleanPhone) {
        const refreshed = await trackOrderPublic(cleanRef, cleanPhone);
        if (refreshed?.data) {
          setOrderData(refreshed.data);
        }
      }
    }
  };

  const statusLower = orderData?.status?.toLowerCase();
  const isCancelled = statusLower === "cancelled";

  // Cancellation is allowed strictly prior to courier dispatch
  // Allowed: pending, confirmed, processing
  // Disallowed: shipped, delivered, cancelled
  const isCancellable =
    (statusLower === "pending" ||
      statusLower === "confirmed" ||
      statusLower === "processing") &&
    !isCancelled;

  /**
   * CANONICAL 6-MILESTONE TIMELINE GENERATOR
   * Exactly represents:
   * 1. pending    -> Order Placed
   * 2. confirmed  -> Confirmed
   * 3. processing -> Processing
   * 4. cancelled  -> Cancelled
   * 5. shipped    -> Shipped
   * 6. delivered  -> Delivered
   */
  const buildTimelineMilestones = () => {
    if (!orderData) return [];

    const reachedConfirmed = Boolean(
      orderData.confirmed_at ||
      orderData.reached_confirmed ||
      orderData.previous_status === "confirmed" ||
      orderData.previous_status === "processing" ||
      orderData.cancelled_from === "confirmed" ||
      orderData.cancelled_from === "processing"
    );

    const reachedProcessing = Boolean(
      orderData.processing_at ||
      orderData.reached_processing ||
      orderData.previous_status === "processing" ||
      orderData.cancelled_from === "processing"
    );

    // Milestone 1: Order Placed (pending)
    const mPlaced = {
      key: "pending",
      label: "Order Placed",
      desc: isCancelled ? "Order received by atelier" : "Awaiting atelier review",
      date: formatMilestoneDate(orderData.created_at),
      state: statusLower === "pending" ? "current" : "completed",
    };

    // Milestone 2: Confirmed
    let mConfirmedState = "upcoming";
    if (statusLower === "confirmed") {
      mConfirmedState = "current";
    } else if (
      statusLower === "processing" ||
      statusLower === "shipped" ||
      statusLower === "delivered"
    ) {
      mConfirmedState = "completed";
    } else if (isCancelled) {
      mConfirmedState = reachedConfirmed ? "completed" : "inactive";
    }

    const mConfirmed = {
      key: "confirmed",
      label: "Confirmed",
      desc: isCancelled && !reachedConfirmed ? "Not confirmed" : "Order verified & confirmed",
      date: formatMilestoneDate(orderData.confirmed_at), // strictly null if not present in DB
      state: mConfirmedState,
    };

    // Milestone 3: Processing
    let mProcessingState = "upcoming";
    if (statusLower === "processing") {
      mProcessingState = "current";
    } else if (statusLower === "shipped" || statusLower === "delivered") {
      mProcessingState = "completed";
    } else if (isCancelled) {
      mProcessingState = reachedProcessing ? "completed" : "inactive";
    }

    const mProcessing = {
      key: "processing",
      label: "Processing",
      desc: isCancelled && !reachedProcessing ? "Not processed" : "Fragrance in preparation",
      date: formatMilestoneDate(orderData.processing_at), // strictly null if not present in DB
      state: mProcessingState,
    };

    // Milestone 4: Cancelled
    let mCancelledState = "inactive";
    let mCancelledDesc = "Eligible for cancellation before dispatch";
    if (isCancelled) {
      mCancelledState = "terminal";
      mCancelledDesc = "Order cancelled";
    } else if (statusLower === "shipped" || statusLower === "delivered") {
      mCancelledState = "inactive";
      mCancelledDesc = "Closed upon courier dispatch";
    }

    const mCancelled = {
      key: "cancelled",
      label: "Cancelled",
      desc: mCancelledDesc,
      date: isCancelled ? formatMilestoneDate(orderData.cancelled_at) : null,
      state: mCancelledState,
    };

    // Milestone 5: Shipped
    let mShippedState = "upcoming";
    let mShippedDesc = "In transit with courier";
    let mShippedDate = formatMilestoneDate(orderData.shipped_at);
    if (isCancelled) {
      mShippedState = "inactive";
      mShippedDesc = "Not dispatched";
      mShippedDate = null;
    } else if (statusLower === "shipped") {
      mShippedState = "current";
    } else if (statusLower === "delivered") {
      mShippedState = "completed";
    }

    const mShipped = {
      key: "shipped",
      label: "Shipped",
      desc: mShippedDesc,
      date: mShippedDate,
      state: mShippedState,
    };

    // Milestone 6: Delivered
    let mDeliveredState = "upcoming";
    let mDeliveredDesc = "Handed over & payment received";
    let mDeliveredDate = formatMilestoneDate(orderData.delivered_at);
    if (isCancelled) {
      mDeliveredState = "inactive";
      mDeliveredDesc = "Not delivered";
      mDeliveredDate = null;
    } else if (statusLower === "delivered") {
      mDeliveredState = "completed";
    }

    const mDelivered = {
      key: "delivered",
      label: "Delivered",
      desc: mDeliveredDesc,
      date: mDeliveredDate,
      state: mDeliveredState,
    };

    return [mPlaced, mConfirmed, mProcessing, mCancelled, mShipped, mDelivered];
  };

  const timelineMilestones = orderData ? buildTimelineMilestones() : [];

  return (
    <div className="bg-[#0D0D0C] text-[#F2EEE7] min-h-screen">
      <SEO
        title="Track Your Parcel — Live Dispatch & Logistics"
        description="Inspect live courier milestones and transit manifests for your SCENTEPK fragrance order using your order reference and registered contact number."
        canonicalUrl="https://scente.pk/track"
        keywords="track order, SCENTEPK tracking, perfume delivery status Pakistan, courier tracking, Cash on Delivery status"
      />
      <div className="layout-container py-10 sm:py-16 lg:py-20 max-w-4xl mx-auto">
        {/* 1. HEADER */}
        <ScrollReveal className="text-center mb-8 sm:mb-12">
          <span className="text-[10px] sm:text-[11px] uppercase font-sans tracking-eyebrow text-[#BFA27A] block mb-3 font-medium">
            DISPATCH & LOGISTICS
          </span>
          <h1 className="font-serif font-light text-2xl xs:text-3xl sm:text-5xl text-[#F2EEE7] tracking-headline mb-3">
            Track Your Parcel
          </h1>
          <p className="text-xs sm:text-sm font-sans text-[#AAA49B] font-light max-w-lg mx-auto leading-relaxed">
            Enter your unique Order Reference and registered contact number to inspect live courier milestones and transit manifests.
          </p>
        </ScrollReveal>

        {/* 2. SEARCH FORM */}
        <ScrollReveal
          delay={0.05}
          className="bg-[#121110] p-4 xs:p-6 sm:p-9 border border-[rgba(242,238,231,0.08)] shadow-2xl mb-8 sm:mb-10 rounded-sm"
        >
          <form onSubmit={handleTrack} className="space-y-5 font-sans">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Order Reference */}
              <div>
                <label
                  htmlFor="orderRef"
                  className="block text-[10px] uppercase tracking-micro text-[#777169] mb-1.5 font-medium"
                >
                  Order Reference <span className="text-[#BFA27A]">*</span>
                </label>
                <Input
                  id="orderRef"
                  type="text"
                  required
                  disabled={isLoading}
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="e.g. SC-123456"
                  icon={Search}
                  iconPosition="left"
                  autoComplete="off"
                  className="font-mono text-sm tracking-wider uppercase placeholder:normal-case placeholder:font-sans"
                />
                <p className="text-[10.5px] text-[#777169] font-light mt-1.5 flex items-center space-x-1">
                  <HelpCircle className="w-3 h-3 text-[#777169] shrink-0" />
                  <span>Your order reference can be found in your order confirmation.</span>
                </p>
              </div>

              {/* Mobile Phone */}
              <div>
                <label
                  htmlFor="orderPhone"
                  className="block text-[10px] uppercase tracking-micro text-[#777169] mb-1.5 font-medium"
                >
                  Contact Mobile Number <span className="text-[#BFA27A]">*</span>
                </label>
                <Input
                  id="orderPhone"
                  type="tel"
                  required
                  disabled={isLoading}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 0300 1234567"
                  autoComplete="tel"
                  className="font-mono text-sm tracking-wider placeholder:font-sans"
                />
                <p className="text-[10.5px] text-[#777169] font-light mt-1.5">
                  The mobile number entered at checkout.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-3 border-t border-[rgba(242,238,231,0.05)]">
              <span className="text-[11px] text-[#777169] font-light flex items-center space-x-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#BFA27A] shrink-0" />
                <span>Protected by Atelier Order Verification — reference and phone must match.</span>
              </span>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full sm:w-auto bg-[#F2EEE7] text-[#0D0D0C] border border-[#F2EEE7] py-3 px-8 text-xs uppercase font-sans tracking-[0.2em] hover:bg-[#BFA27A] hover:border-[#BFA27A] hover:text-[#0D0D0C] disabled:opacity-50 transition-all duration-200 font-medium whitespace-nowrap cursor-pointer shadow-md flex items-center justify-center space-x-2 min-h-[44px]"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-[#0D0D0C]" />
                    <span>RETRIEVING MANIFEST...</span>
                  </>
                ) : (
                  <span>INSPECT DISPATCH</span>
                )}
              </button>
            </div>
          </form>

          {/* Error / Not Found Message */}
          <AnimatePresence>
            {errorMessage && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-6 p-4 bg-rose-950/20 border border-rose-500/30 text-rose-300 text-xs font-sans rounded-sm flex items-start space-x-3"
              >
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-medium text-rose-200">Order not found</p>
                  <p className="text-[11px] text-rose-300/80 leading-relaxed">
                    Please check your order reference and phone number and try again. If you need assistance locating your dispatch record, our concierge is at your service.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </ScrollReveal>

        {/* 3. EMPTY STATE (When no search has occurred and no order loaded) */}
        {!orderData && !isLoading && !errorMessage && (
          <ScrollReveal delay={0.1}>
            <div className="bg-[#121110] border border-[rgba(242,238,231,0.06)] p-6 sm:p-8 space-y-4 rounded-sm">
              <div className="flex items-center space-x-2.5 text-[#BFA27A]">
                <Package className="w-4 h-4 shrink-0" />
                <h3 className="font-serif text-lg sm:text-xl text-[#F2EEE7] font-normal">
                  Track your SCENTEPK order
                </h3>
              </div>
              <p className="text-xs font-sans text-[#AAA49B] font-light leading-relaxed max-w-2xl">
                Enter the order reference and mobile number from your confirmation to view the latest shipment status.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-[rgba(242,238,231,0.04)] text-xs font-sans text-[#777169]">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase tracking-wider text-[#BFA27A] block font-medium">
                    Order Reference Format
                  </span>
                  <p className="text-[11px] text-[#AAA49B] font-light">
                    Your reference begins with <strong className="text-[#F2EEE7] font-mono">SC-</strong> followed by 6 unique digits (e.g. <span className="font-mono text-[#F2EEE7]">SC-123456</span>), issued upon checkout.
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] uppercase tracking-wider text-[#BFA27A] block font-medium">
                    Cash on Delivery Notice
                  </span>
                  <p className="text-[11px] text-[#AAA49B] font-light">
                    Payment is collected exclusively upon delivery by our authorized courier. You may inspect the sealed parcel before settlement.
                  </p>
                </div>
              </div>
            </div>
          </ScrollReveal>
        )}

        {/* 4. TRACKING RESULTS MANIFEST */}
        {orderData && (
          <ScrollReveal className="bg-[#121110] border border-[rgba(242,238,231,0.08)] shadow-2xl p-4 xs:p-6 sm:p-10 space-y-8 font-sans rounded-sm">
            {/* Manifest Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-[rgba(242,238,231,0.06)] gap-4">
              <div className="space-y-1">
                <span className="text-[10px] uppercase tracking-micro text-[#777169] block font-medium">
                  ORDER REFERENCE
                </span>
                <span className="font-serif text-2xl sm:text-3xl text-[#F2EEE7] font-normal tracking-wide block">
                  {orderData.reference}
                </span>
                <div className="flex flex-wrap items-center gap-2 text-xs text-[#AAA49B]">
                  <span>
                    Placed on{" "}
                    {new Date(orderData.created_at).toLocaleDateString("en-PK", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                  <span>•</span>
                  <span>
                    Destination: <strong className="text-[#F2EEE7] font-medium">{orderData.city}{orderData.province ? `, ${orderData.province}` : ""}</strong>
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <span
                  className={`inline-block text-[10px] uppercase tracking-[0.18em] px-3.5 py-1.5 border font-medium ${isCancelled
                      ? "bg-rose-950/40 text-rose-300 border-rose-500/40"
                      : orderData.status === "delivered"
                        ? "bg-emerald-950/60 text-emerald-200 border-emerald-500/40"
                        : orderData.status === "shipped"
                          ? "bg-emerald-950/40 text-emerald-300 border-emerald-500/30"
                          : orderData.status === "processing"
                            ? "bg-purple-950/40 text-purple-300 border-purple-500/30"
                            : orderData.status === "confirmed"
                              ? "bg-sky-950/40 text-sky-300 border-sky-500/30"
                              : "bg-[#181714] text-[#BFA27A] border-[#BFA27A]/40"
                    }`}
                >
                  {isCancelled ? "CANCELLED" : orderData.status.toUpperCase()}
                </span>

                <button
                  type="button"
                  onClick={handleReset}
                  className="text-[10px] uppercase tracking-[0.16em] text-[#AAA49B] hover:text-[#F2EEE7] transition-colors flex items-center space-x-1.5 py-1.5 px-2.5 border border-[rgba(242,238,231,0.1)] hover:border-[rgba(242,238,231,0.25)] cursor-pointer"
                  title="Track another order"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Track another order</span>
                </button>
              </div>
            </div>

            {/* Contextual Status Message Banner */}
            <div className="p-4 bg-[#0D0D0C] border border-[rgba(242,238,231,0.06)] rounded-sm flex items-center space-x-3 text-xs">
              <CheckCircle2 className="w-4 h-4 text-[#BFA27A] shrink-0" />
              <p className="text-[#F2EEE7] font-light">
                {getStatusMessage(orderData.status)}
              </p>
            </div>

            {/* 6-CANONICAL STATUS TIMELINE WITH STABLE VERTICAL CONNECTORS */}
            <div className="space-y-4 py-2">
              <span className="text-[10px] uppercase font-sans tracking-[0.2em] text-[#777169] block font-medium">
                SHIPMENT TIMELINE
              </span>

              <div className="bg-[#0D0D0C] p-5 sm:p-8 border border-[rgba(242,238,231,0.06)] rounded-sm">
                <div className="space-y-0">
                  {timelineMilestones.map((m, idx) => {
                    const isLast = idx === timelineMilestones.length - 1;
                    const nextMilestone = !isLast ? timelineMilestones[idx + 1] : null;

                    // Compute connector style from current node to next node
                    // Layout structure: flex-col with `self-stretch` and `grow` ensures connector touches
                    // bottom of current circle to top of next circle with ZERO gaps and NO overflow.
                    let connectorClass = "w-0.5 bg-[rgba(242,238,231,0.12)]";

                    if (isCancelled) {
                      if (idx < 3) {
                        // Before Cancelled terminal node
                        if (m.state === "completed" && (nextMilestone?.state === "completed" || nextMilestone?.state === "terminal")) {
                          connectorClass = "w-0.5 bg-[#BFA27A]";
                        } else if (nextMilestone?.state === "terminal") {
                          connectorClass = "w-0.5 bg-rose-500/50";
                        } else {
                          connectorClass = "w-0.5 bg-[rgba(242,238,231,0.12)]";
                        }
                      } else {
                        // At or after Cancelled node (voided / not reached path)
                        connectorClass = "w-0 border-l border-dashed border-[rgba(242,238,231,0.15)]";
                      }
                    } else {
                      // Active order progression
                      if (m.state === "completed" && (nextMilestone?.state === "completed" || nextMilestone?.state === "current")) {
                        connectorClass = "w-0.5 bg-[#BFA27A]";
                      } else if ((statusLower === "shipped" || statusLower === "delivered") && idx <= 3) {
                        connectorClass = "w-0.5 bg-[#BFA27A]";
                      } else {
                        connectorClass = "w-0.5 bg-[rgba(242,238,231,0.12)]";
                      }
                    }

                    // Render node circle
                    let circleStyle = "bg-[#0D0D0C] border border-[rgba(242,238,231,0.12)] text-[#55514B]";
                    let iconElement = <span>{idx + 1}</span>;

                    if (m.state === "completed") {
                      circleStyle = "bg-[#181714] border border-[#BFA27A] text-[#BFA27A]";
                      iconElement = <Check className="w-3.5 h-3.5 stroke-[2.5]" />;
                    } else if (m.state === "current") {
                      circleStyle = "bg-[#BFA27A] text-[#0D0D0C] font-bold ring-4 ring-[#BFA27A]/25";
                      iconElement = <span>{idx + 1}</span>;
                    } else if (m.state === "terminal") {
                      circleStyle = "bg-rose-950/80 border-2 border-rose-500 text-rose-300 ring-4 ring-rose-500/20";
                      iconElement = <XCircle className="w-4 h-4 text-rose-400" />;
                    } else if (m.key === "cancelled") {
                      // Cancelled milestone in active (uncancelled) orders
                      circleStyle = "bg-[#0D0D0C] border border-dashed border-[rgba(242,238,231,0.18)] text-[#66615B]";
                      iconElement = <span className="text-[10px] text-[#66615B]">✕</span>;
                    } else if (isCancelled && (m.key === "shipped" || m.key === "delivered")) {
                      // Shipped / Delivered in cancelled orders
                      circleStyle = "bg-[#0D0D0C] border border-[rgba(242,238,231,0.06)] text-[#3E3A36]";
                      iconElement = <span className="text-[10px] text-[#3E3A36]">○</span>;
                    } else if (isCancelled && m.state === "inactive") {
                      // Unreached Confirmed or Processing in cancelled orders
                      circleStyle = "bg-[#0D0D0C] border border-[rgba(242,238,231,0.08)] text-[#55514B]";
                      iconElement = <span className="text-[10px] text-[#55514B]">○</span>;
                    }

                    return (
                      <div key={m.key} className="flex items-start gap-4 sm:gap-6 relative">
                        {/* Column 1: Node Icon + Vertical Connector */}
                        <div className="flex flex-col items-center self-stretch shrink-0 w-8 relative">
                          {/* Node Circle */}
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-mono shrink-0 z-10 transition-all duration-300 ${circleStyle}`}
                          >
                            {iconElement}
                          </div>

                          {/* Connector Line: zero top/bottom margin, stretches directly to touch bottom edge where next node starts */}
                          {!isLast && (
                            <div
                              className={`grow transition-colors duration-300 ${connectorClass}`}
                            />
                          )}
                        </div>

                        {/* Column 2: Content (Labels, Descriptions, Dates) */}
                        <div className={`flex-1 min-w-0 ${!isLast ? "pb-6 sm:pb-7" : "pb-1"}`}>
                          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
                            <div className="flex items-center space-x-2">
                              <p
                                className={`text-xs sm:text-sm uppercase tracking-wider font-medium ${m.state === "terminal"
                                    ? "text-rose-300 font-semibold"
                                    : m.state === "current"
                                      ? "text-[#F2EEE7]"
                                      : m.state === "completed"
                                        ? "text-[#AAA49B]"
                                        : isCancelled && (m.key === "shipped" || m.key === "delivered" || m.state === "inactive")
                                          ? "text-[#55514B]"
                                          : "text-[#66615B]"
                                  }`}
                              >
                                {m.label}
                              </p>

                              {m.state === "current" && (
                                <span className="text-[9px] uppercase tracking-wider px-2 py-0.5 bg-[#BFA27A]/15 text-[#BFA27A] border border-[#BFA27A]/30 rounded-full font-medium">
                                  Live Stage
                                </span>
                              )}

                              {m.state === "terminal" && (
                                <span className="text-[9px] uppercase tracking-wider px-2 py-0.5 bg-rose-950/60 text-rose-300 border border-rose-500/40 rounded-full font-medium">
                                  Terminal
                                </span>
                              )}
                            </div>

                            {/* Milestone Timestamp (Real database timestamp only - never fabricated) */}
                            {m.date && (
                              <span
                                className={`text-[10.5px] font-mono shrink-0 ${m.state === "terminal" ? "text-rose-400" : "text-[#BFA27A]"
                                  }`}
                              >
                                {m.date}
                              </span>
                            )}
                          </div>

                          <p
                            className={`text-xs font-light mt-0.5 leading-relaxed ${m.state === "terminal"
                                ? "text-rose-300/80"
                                : isCancelled && (m.key === "shipped" || m.key === "delivered" || m.state === "inactive")
                                  ? "text-[#55514B]"
                                  : "text-[#777169]"
                              }`}
                          >
                            {m.desc}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Cancelled Alert Banner if order is cancelled */}
                {isCancelled && (
                  <div className="mt-5 p-4 bg-rose-950/20 border border-rose-500/30 text-rose-300 text-xs rounded-sm flex items-start space-x-3">
                    <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <p className="font-medium text-rose-200">Order Cancelled</p>
                      <p className="text-[11px] text-rose-300/80 leading-relaxed">
                        This order was cancelled
                        {orderData.cancelled_at && (
                          <span> on {formatMilestoneDate(orderData.cancelled_at)}</span>
                        )}
                        . Reserved bottles have been restored to the atelier catalog. No Cash on Delivery payment is due.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Courier & Tracking Details Card */}
            <div className="bg-[#0D0D0C] p-5 sm:p-6 border border-[rgba(242,238,231,0.06)] rounded-sm">
              {orderData.carrier || orderData.tracking_number ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  {/* Carrier */}
                  <div>
                    <span className="text-[9.5px] uppercase tracking-wider text-[#777169] block mb-1 font-medium">
                      Shipped with
                    </span>
                    <div className="flex items-center space-x-2 text-[#F2EEE7]">
                      <Truck className="w-4 h-4 text-[#BFA27A] shrink-0" />
                      <span className="text-sm font-medium">
                        {orderData.carrier || "Express Courier"}
                      </span>
                    </div>
                  </div>

                  {/* Tracking Number */}
                  <div>
                    <span className="text-[9.5px] uppercase tracking-wider text-[#777169] block mb-1 font-medium">
                      Tracking Number
                    </span>
                    {orderData.tracking_number ? (
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-sm text-[#BFA27A] font-medium break-all">
                          {orderData.tracking_number}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopyTracking(orderData.tracking_number)}
                          className="p-1 text-[#AAA49B] hover:text-[#F2EEE7] transition-colors cursor-pointer shrink-0"
                          title="Copy tracking number"
                          aria-label="Copy tracking number"
                        >
                          {copied ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                        {copied && (
                          <span className="text-[10px] text-emerald-400 font-sans tracking-wide">
                            Copied
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-[#777169] italic font-light">
                        Tracking number will appear once assigned by courier
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-start space-x-3 text-xs text-[#AAA49B]">
                  <Truck className="w-4 h-4 text-[#BFA27A] shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[9.5px] uppercase tracking-wider text-[#777169] block mb-0.5 font-medium">
                      Courier Logistics
                    </span>
                    <p className="text-xs text-[#AAA49B] font-light">
                      Courier details will appear here once your order has been dispatched.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Parcel Line Items */}
            {orderData.items && orderData.items.length > 0 && (
              <div className="space-y-3 pt-2">
                <span className="text-[10px] uppercase font-sans tracking-[0.2em] text-[#777169] block font-medium">
                  PARCEL CONTENTS ({orderData.items.length}{" "}
                  {orderData.items.length === 1 ? "Composition" : "Compositions"})
                </span>

                <div className="divide-y divide-[rgba(242,238,231,0.04)] border-t border-b border-[rgba(242,238,231,0.06)] py-2 text-xs">
                  {orderData.items.map((item, idx) => {
                    const isCustom = Boolean(item.is_custom);
                    const config = item.custom_configuration;
                    return (
                      <div
                        key={idx}
                        className="py-3.5 space-y-2 text-[#F2EEE7]"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex items-start space-x-3">
                            {isCustom ? (
                              <FlaskConical className="w-4 h-4 text-[#BFA27A] shrink-0 mt-0.5" />
                            ) : (
                              <Package className="w-4 h-4 text-[#BFA27A] shrink-0 mt-0.5" />
                            )}
                            <div>
                              <div className="flex items-center space-x-2">
                                <p className="font-serif text-sm text-[#F2EEE7] font-normal">
                                  {isCustom ? (item.product_name || "Custom SCENTE") : item.product_name}
                                </p>
                                {isCustom && (
                                  <span className="inline-flex items-center text-[8.5px] uppercase tracking-[0.16em] px-1.5 py-0.5 bg-[#BFA27A]/15 text-[#BFA27A] border border-[#BFA27A]/30 font-medium rounded-xs">
                                    BESPOKE
                                  </span>
                                )}
                              </div>
                              <p className="text-[10.5px] text-[#777169] mt-0.5">
                                {item.quantity} × {item.size || "50ml"} {isCustom ? "Bespoke Creation" : "Extrait de Parfum"}
                              </p>
                            </div>
                          </div>
                          <span className="font-serif text-sm font-medium">
                            PKR {Number(item.line_total || item.unit_price * item.quantity).toLocaleString()}
                          </span>
                        </div>

                        {/* Customer-Facing Bespoke Formulation Presentation */}
                        {isCustom && config && (
                          <div className="ml-7 p-3 bg-[#121110] border border-[rgba(242,238,231,0.06)] rounded-xs space-y-2 text-xs font-sans">
                            <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.18em] text-[#BFA27A] font-medium border-b border-[rgba(242,238,231,0.04)] pb-1.5">
                              <span>YOUR FORMULATION</span>
                              <span className="text-[#8E887F] font-normal normal-case font-serif italic text-xs">
                                Atelier Custom Blend
                              </span>
                            </div>

                            {config.summary && (
                              <p className="text-[11px] text-[#F2EEE7] font-serif italic">
                                "{config.summary}"
                              </p>
                            )}

                            {config.groups && config.groups.length > 0 && (
                              <div className="space-y-1.5 pt-1">
                                {config.groups.map((grp, gIdx) => (
                                  <div key={grp.group_id || grp.group_slug || gIdx} className="flex flex-col sm:flex-row sm:items-baseline text-[11px]">
                                    <span className="text-[#8E887F] sm:w-28 shrink-0 font-medium">
                                      {grp.group_name}:
                                    </span>
                                    <span className="text-[#AAA49B]">
                                      {grp.selected_options?.map((opt) => opt.name).join(", ")}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}

                            {config.base_price && (
                              <div className="pt-2 border-t border-[rgba(242,238,231,0.04)] flex items-center justify-between text-[10.5px] text-[#8E887F]">
                                <span>Base: PKR {Number(config.base_price).toLocaleString()}</span>
                                <span>Total: PKR {Number(item.unit_price || config.total_price || 0).toLocaleString()}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Settlement Summary */}
                <div className="border-t border-[rgba(242,238,231,0.06)] pt-4 space-y-2 text-xs font-sans">
                  <div className="flex justify-between text-[#AAA49B]">
                    <span>Subtotal</span>
                    <span className="font-serif text-[#F2EEE7]">
                      PKR {Number(orderData.subtotal ?? (orderData.total - (orderData.delivery_fee || 0))).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between text-[#AAA49B]">
                    <span>Express Delivery</span>
                    <span className="text-[#BFA27A] uppercase text-[10px]">
                      {Number(orderData.delivery_fee) === 0
                        ? "Complimentary"
                        : `PKR ${Number(orderData.delivery_fee).toLocaleString()}`}
                    </span>
                  </div>
                  <div className="flex justify-between items-baseline pt-2 border-t border-[rgba(242,238,231,0.06)]">
                    <div>
                      <span className="text-[#F2EEE7] font-medium text-sm block">Total Due</span>
                      <span className="text-[10px] text-[#777169] uppercase tracking-wider">
                        Payment Mode: Cash on Delivery (COD)
                      </span>
                    </div>
                    <span className="font-serif text-xl sm:text-2xl text-[#F2EEE7] font-medium">
                      PKR {Number(orderData.total || 0).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Cancellation Action for Eligible Pre-Dispatch Orders */}
                {isCancellable && (
                  <div className="mt-6 pt-4 border-t border-[rgba(242,238,231,0.06)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-[#0E0D0C] border border-[rgba(242,238,231,0.04)] rounded-sm">
                    <div className="space-y-0.5">
                      <span className="text-[10px] uppercase tracking-wider text-[#BFA27A] font-medium block">
                        CANCELLATION WINDOW ACTIVE
                      </span>
                      <p className="text-[11px] text-[#AAA49B] font-light">
                        This order is currently in <strong className="text-[#F2EEE7] uppercase font-mono">{orderData.status}</strong> status. You may cancel prior to courier dispatch to release reserved bottles back to the catalog.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setCancelErrorMessage("");
                        setShowCancelModal(true);
                      }}
                      className="w-full sm:w-auto text-[10px] uppercase font-sans tracking-[0.2em] px-5 py-2.5 border border-rose-500/40 text-rose-300 hover:bg-rose-950/40 hover:border-rose-500/80 transition-colors cursor-pointer whitespace-nowrap min-h-[40px]"
                    >
                      Cancel Order
                    </button>
                  </div>
                )}

                {/* For Shipped or Delivered Orders (Cannot be cancelled by customer) */}
                {(statusLower === "shipped" || statusLower === "delivered") && (
                  <div className="mt-6 pt-4 border-t border-[rgba(242,238,231,0.06)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 bg-[#0E0D0C] border border-[rgba(242,238,231,0.04)] rounded-sm">
                    <div className="space-y-0.5">
                      <span className="text-[10px] uppercase tracking-wider text-[#777169] font-medium block">
                        Parcel In Transit or Delivered
                      </span>
                      <p className="text-[11px] text-[#AAA49B] font-light">
                        This order has already dispatched with the courier. If you require assistance with returns or address corrections, please contact our concierge.
                      </p>
                    </div>
                    <Link
                      to="/contact"
                      className="text-[10px] uppercase font-sans tracking-[0.2em] px-4 py-2 border border-[rgba(242,238,231,0.2)] text-[#F2EEE7] hover:border-[#BFA27A] hover:text-[#BFA27A] transition-colors whitespace-nowrap"
                    >
                      Contact Concierge
                    </Link>
                  </div>
                )}
              </div>
            )}
          </ScrollReveal>
        )}

        {/* Cancellation Success Notification Toast/Banner */}
        <AnimatePresence>
          {cancelSuccessMessage && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-6 p-4 bg-emerald-950/30 border border-emerald-500/40 text-emerald-200 text-xs font-sans flex items-start space-x-3 rounded-sm"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
              <div className="space-y-0.5">
                <p className="font-medium text-emerald-100">{cancelSuccessMessage}</p>
                <p className="text-[11px] text-emerald-300/80">
                  The shipment manifest has been voided and no Cash on Delivery collection will occur.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Cancellation Confirmation Modal */}
        <AnimatePresence>
          {showCancelModal && (
            <div
              data-lenis-prevent
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              role="dialog"
              aria-modal="true"
            >
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => !isCancelling && setShowCancelModal(false)}
                className="fixed inset-0 bg-black/80 backdrop-blur-sm"
              />

              {/* Modal Card */}
              <motion.div
                data-lenis-prevent
                initial={{ opacity: 0, scale: 0.96, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 12 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="relative z-10 max-w-md w-full bg-[#121110] border border-[rgba(242,238,231,0.12)] p-6 sm:p-8 shadow-2xl space-y-6 text-[#F2EEE7] rounded-sm"
              >
                <div className="text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-rose-950/30 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto">
                    <AlertTriangle className="w-6 h-6 stroke-[1.5]" />
                  </div>

                  <span className="text-[10px] uppercase font-sans tracking-[0.25em] text-[#BFA27A] block font-medium">
                    CONFIRMATION REQUIRED
                  </span>

                  <h3 className="font-serif text-2xl sm:text-3xl font-light text-[#F2EEE7]">
                    Cancel Order?
                  </h3>

                  <p className="text-xs font-sans text-[#AAA49B] font-light leading-relaxed">
                    Are you sure you want to cancel order <strong className="text-[#F2EEE7] font-medium font-mono">{orderData?.reference}</strong>? This action cannot be undone and will immediately release reserved inventory back to the catalog.
                  </p>
                </div>

                {/* Error message inside modal */}
                {cancelErrorMessage && (
                  <div className="p-3.5 bg-rose-950/30 border border-rose-500/40 text-rose-300 text-xs font-sans flex items-start space-x-2.5 rounded-sm">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                    <p className="leading-relaxed">{cancelErrorMessage}</p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                  <button
                    type="button"
                    disabled={isCancelling}
                    onClick={() => setShowCancelModal(false)}
                    className="w-full sm:w-1/2 border border-[rgba(242,238,231,0.2)] text-[#AAA49B] hover:text-[#F2EEE7] hover:border-[#F2EEE7] py-3 px-4 text-[11px] uppercase tracking-[0.2em] font-sans transition-colors cursor-pointer disabled:opacity-40 text-center min-h-[44px]"
                  >
                    Keep Order
                  </button>

                  <button
                    type="button"
                    disabled={isCancelling}
                    onClick={handleConfirmCancel}
                    className="w-full sm:w-1/2 bg-rose-950/60 border border-rose-500/50 text-rose-200 hover:bg-rose-900/70 hover:border-rose-400 py-3 px-4 text-[11px] uppercase tracking-[0.2em] font-sans font-medium transition-colors cursor-pointer disabled:opacity-40 flex items-center justify-center space-x-2 text-center shadow-lg min-h-[44px]"
                  >
                    {isCancelling ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-200" />
                        <span>CANCELLING...</span>
                      </>
                    ) : (
                      <span>Cancel Order</span>
                    )}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
