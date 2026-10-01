import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  getOrderByIdAdmin,
  updateOrderStatusAdmin,
  updateOrderTrackingAdmin,
  deleteOrderAdmin,
} from "../../services/adminOrders";
import {
  ArrowLeft,
  User,
  MapPin,
  Truck,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Loader2,
  Save,
  Clock,
  Trash2,
  Sparkles,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import CustomSelect from "../../components/CustomSelect";
import Input from "../../components/Input";

export default function AdminOrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [currentStatus, setCurrentStatus] = useState("pending");
  const [carrier, setCarrier] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [isSavingTracking, setIsSavingTracking] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const handleDeleteOrder = async () => {
    if (!order) return;
    setIsDeleting(true);
    setDeleteError("");
    const idOrRef = order.id || order.reference;
    const { success, error } = await deleteOrderAdmin(idOrRef);
    setIsDeleting(false);

    if (error) {
      setDeleteError(error.message || "Failed to delete order.");
    } else {
      navigate("/admin/orders");
    }
  };

  const statusOptions = [
    { value: "pending", label: "PENDING" },
    { value: "confirmed", label: "CONFIRMED" },
    { value: "processing", label: "PROCESSING" },
    { value: "shipped", label: "SHIPPED" },
    { value: "delivered", label: "DELIVERED" },
    { value: "cancelled", label: "CANCELLED" },
  ];

  const carrierOptions = [
    { value: "Leopard Express", label: "Leopard Express" },
    { value: "TCS Express", label: "TCS Express" },
    { value: "Trax Logistics", label: "Trax Logistics" },
    { value: "CallCourier", label: "CallCourier" },
    { value: "M&P Express", label: "M&P Express" },
    { value: "DHL Express", label: "DHL Express" },
    { value: "Atelier Private Courier", label: "Atelier Private Courier" },
  ];

  useEffect(() => {
    async function loadOrder() {
      setIsLoading(true);
      const { data, error } = await getOrderByIdAdmin(id);
      if (error || !data) {
        setErrorMessage("Order not found or access restricted.");
      } else {
        setOrder(data);
        setCurrentStatus(data.status || "pending");
        setCarrier(data.carrier || "Leopard Express");
        setTrackingNumber(data.tracking_number || "");
      }
      setIsLoading(false);
    }
    loadOrder();
  }, [id]);

  // Handle Order Status Update (with stock restoration on cancellation)
  const handleStatusChange = async (newStatus) => {
    if (newStatus === currentStatus) return;

    if (newStatus === "cancelled") {
      const confirmCancel = window.confirm(
        `Are you sure you wish to mark order ${order?.reference} as CANCELLED?\n\nThis will automatically restore reserved stock to the atelier product catalog.`
      );
      if (!confirmCancel) return;
    }

    setIsUpdating(true);
    setErrorMessage("");

    const res = await updateOrderStatusAdmin(order.id || order.reference, newStatus);
    setIsUpdating(false);

    if (res.error) {
      setErrorMessage(res.error.message || "Failed to update order status.");
    } else {
      setCurrentStatus(newStatus);

      // Refresh order record directly from database to reflect trigger milestone timestamps
      const { data: refreshed } = await getOrderByIdAdmin(order.id || order.reference);
      if (refreshed) {
        setOrder(refreshed);
      } else if (res.data) {
        setOrder(res.data);
      } else {
        setOrder((prev) => ({
          ...prev,
          status: newStatus,
          cancelled_at: newStatus === "cancelled" ? new Date().toISOString() : prev.cancelled_at,
        }));
      }

      if (newStatus === "cancelled") {
        if (res.alreadyCancelled) {
          setToastMessage(`Order status updated to CANCELLED. (Inventory was previously restored).`);
        } else {
          setToastMessage(
            `Order marked as CANCELLED. ${res.restoredUnits || 0} unit(s) restored to catalog inventory.`
          );
        }
      } else {
        setToastMessage(`Order status updated to ${newStatus.toUpperCase()}`);
      }
      setTimeout(() => setToastMessage(""), 4500);
    }
  };

  // Handle Save Tracking & Carrier Information
  const handleSaveTracking = async (e) => {
    e.preventDefault();
    setIsSavingTracking(true);
    setErrorMessage("");

    const { error } = await updateOrderTrackingAdmin(order.id || order.reference, {
      carrier,
      trackingNumber,
    });
    setIsSavingTracking(false);

    if (error) {
      setErrorMessage(error.message || "Failed to update shipment tracking information.");
    } else {
      setOrder((prev) => ({
        ...prev,
        carrier,
        tracking_number: trackingNumber,
      }));
      setToastMessage(
        trackingNumber
          ? `Tracking saved: ${carrier} • ${trackingNumber}`
          : `Carrier updated: ${carrier}`
      );
      setTimeout(() => setToastMessage(""), 3500);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "pending":
        return "bg-amber-950/40 text-amber-300 border-amber-500/30";
      case "confirmed":
        return "bg-sky-950/40 text-sky-300 border-sky-500/30";
      case "processing":
        return "bg-purple-950/40 text-purple-300 border-purple-500/30";
      case "shipped":
        return "bg-emerald-950/40 text-emerald-300 border-emerald-500/30";
      case "delivered":
        return "bg-emerald-950/60 text-emerald-200 border-emerald-500/40";
      case "cancelled":
        return "bg-rose-950/40 text-rose-300 border-rose-500/30";
      default:
        return "bg-zinc-800 text-zinc-300 border-zinc-700";
    }
  };

  if (isLoading) {
    return (
      <div className="py-24 text-center text-[#AAA49B] text-xs uppercase font-sans tracking-[0.24em] flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-6 h-6 animate-spin text-[#BFA27A]" />
        <span>Retrieving Order Manifest...</span>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="py-16 text-center space-y-4">
        <AlertCircle className="w-8 h-8 text-rose-400 mx-auto" />
        <h2 className="font-serif text-2xl text-[#F2EEE7]">Order Not Found</h2>
        <p className="text-xs font-sans text-[#777169]">{errorMessage}</p>
        <Link
          to="/admin/orders"
          className="inline-block mt-4 text-xs font-sans uppercase tracking-wider text-[#BFA27A] border border-[rgba(242,238,231,0.1)] px-4 py-2"
        >
          Return to Orders
        </Link>
      </div>
    );
  }

  const items = order.order_items || [];

  return (
    <div className="space-y-6 sm:space-y-8 w-full max-w-5xl mx-auto min-w-0">
      {/* 1. TOAST NOTIFICATION */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed top-6 right-6 z-50 bg-[#181714] border border-[#BFA27A]/50 text-[#F2EEE7] px-5 py-3 text-xs font-sans shadow-2xl flex items-center space-x-2 rounded-sm"
          >
            <CheckCircle2 className="w-4 h-4 text-[#BFA27A]" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. TOP HEADER */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between pb-5 sm:pb-6 border-b border-[rgba(242,238,231,0.06)] gap-4">
        <div className="space-y-1">
          <Link
            to="/admin/orders"
            className="inline-flex items-center text-[10.5px] uppercase font-sans tracking-[0.2em] text-[#777169] hover:text-[#BFA27A] transition-colors mb-2 min-h-[36px]"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1.5 stroke-[1.5]" />
            <span>Back to Orders</span>
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-normal text-[#F2EEE7] tracking-tight">
              Order {order.reference}
            </h1>
            <span
              className={`inline-block text-[9.5px] uppercase tracking-wider px-2.5 py-1 border ${getStatusBadge(
                currentStatus
              )}`}
            >
              {currentStatus}
            </span>
            {items.some((i) => Boolean(i.is_custom)) && (
              <span className="inline-flex items-center gap-1.5 text-[9.5px] uppercase tracking-[0.16em] px-2.5 py-1 bg-[#BFA27A]/15 text-[#BFA27A] border border-[#BFA27A]/40 font-medium rounded-xs">
                <Sparkles className="w-3 h-3 text-[#BFA27A]" />
                <span>BESPOKE CREATION</span>
              </span>
            )}
          </div>
          <p className="text-xs font-sans text-[#AAA49B] font-light">
            Placed on{" "}
            {new Date(order.created_at).toLocaleDateString("en-PK", {
              day: "numeric",
              month: "long",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
            {order.shipped_at && (
              <span className="text-emerald-400/90 block sm:inline sm:ml-2 mt-0.5 sm:mt-0">
                • Shipped {new Date(order.shipped_at).toLocaleDateString("en-PK", { day: "numeric", month: "short" })}
              </span>
            )}
            {order.delivered_at && (
              <span className="text-emerald-300 block sm:inline sm:ml-2 mt-0.5 sm:mt-0">
                • Delivered {new Date(order.delivered_at).toLocaleDateString("en-PK", { day: "numeric", month: "short" })}
              </span>
            )}
            {order.cancelled_at && (
              <span className="text-rose-400 block sm:inline sm:ml-2 mt-0.5 sm:mt-0">
                • Cancelled on {new Date(order.cancelled_at).toLocaleDateString("en-PK")}
              </span>
            )}
          </p>
        </div>

        {/* Status Transition Control & Delete Button */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
          <div className="bg-[#121110] p-3 border border-[rgba(242,238,231,0.08)] rounded-xl flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 font-sans text-xs flex-1 lg:flex-initial">
            <span className="text-[10px] uppercase tracking-wider text-[#777169] font-medium">
              UPDATE ORDER STATUS:
            </span>
            <div className="flex items-center space-x-2">
              <CustomSelect
                value={currentStatus}
                disabled={isUpdating}
                onChange={handleStatusChange}
                options={statusOptions}
                size="sm"
                className="w-full sm:w-44"
              />
              {isUpdating && <Loader2 className="w-4 h-4 animate-spin text-[#BFA27A]" />}
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setDeleteError("");
              setShowDeleteModal(true);
            }}
            className="flex items-center justify-center space-x-2 px-4 py-3 bg-rose-950/20 hover:bg-rose-950/40 border border-rose-500/30 hover:border-rose-500/50 text-rose-300 hover:text-rose-200 text-xs font-sans uppercase tracking-wider rounded-xl transition-colors cursor-pointer min-h-[44px]"
            title="Delete Order"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
            <span>Delete Order</span>
          </button>
        </div>
      </div>

      {/* 3. TWO-COLUMN SPLIT: CUSTOMER & DESTINATION */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 font-sans text-xs">
        {/* Recipient Details */}
        <div className="bg-[#121110] p-5 sm:p-6 border border-[rgba(242,238,231,0.06)] space-y-4 rounded-sm">
          <div className="flex items-center space-x-2 pb-3 border-b border-[rgba(242,238,231,0.06)]">
            <User className="w-4 h-4 text-[#BFA27A]" />
            <h2 className="font-serif text-lg text-[#F2EEE7]">Customer & Recipient</h2>
          </div>

          <div className="space-y-2.5">
            <div>
              <span className="text-[9.5px] uppercase tracking-wider text-[#777169] block">
                Full Name
              </span>
              <p className="text-[#F2EEE7] font-medium text-sm mt-0.5">
                {order.customer_full_name}
              </p>
            </div>
            <div>
              <span className="text-[9.5px] uppercase tracking-wider text-[#777169] block">
                Contact Phone
              </span>
              <p className="text-[#AAA49B] font-mono mt-0.5">
                {order.customer_phone}
              </p>
            </div>
            {order.customer_email && (
              <div>
                <span className="text-[9.5px] uppercase tracking-wider text-[#777169] block">
                  Email Address
                </span>
                <p className="text-[#AAA49B] mt-0.5 break-all">{order.customer_email}</p>
              </div>
            )}
          </div>
        </div>

        {/* Shipping Destination */}
        <div className="bg-[#121110] p-5 sm:p-6 border border-[rgba(242,238,231,0.06)] space-y-4 rounded-sm">
          <div className="flex items-center space-x-2 pb-3 border-b border-[rgba(242,238,231,0.06)]">
            <MapPin className="w-4 h-4 text-[#BFA27A]" />
            <h2 className="font-serif text-lg text-[#F2EEE7]">Delivery Destination</h2>
          </div>

          <div className="space-y-2.5">
            <div>
              <span className="text-[9.5px] uppercase tracking-wider text-[#777169] block">
                Shipping Address
              </span>
              <p className="text-[#F2EEE7] mt-0.5 leading-relaxed">
                {order.shipping_address}
              </p>
            </div>
            <div className="flex justify-between pt-1">
              <div>
                <span className="text-[9.5px] uppercase tracking-wider text-[#777169] block">
                  City & Province
                </span>
                <p className="text-[#AAA49B] mt-0.5">
                  {order.city}
                  {order.province && `, ${order.province}`}
                </p>
              </div>
              {order.postal_code && (
                <div>
                  <span className="text-[9.5px] uppercase tracking-wider text-[#777169] block">
                    Postal Code
                  </span>
                  <p className="text-[#AAA49B] font-mono mt-0.5">{order.postal_code}</p>
                </div>
              )}
            </div>
            <div className="pt-2 border-t border-[rgba(242,238,231,0.04)] flex items-center justify-between text-[11px]">
              <span className="text-[#777169]">Payment Mode:</span>
              <span className="text-[#BFA27A] uppercase font-medium">
                Cash on Delivery (COD)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. DISPATCH MILESTONES & TRANSIT TIMELINE */}
      <div className="bg-[#121110] p-5 sm:p-6 border border-[rgba(242,238,231,0.06)] space-y-4 rounded-sm font-sans text-xs">
        <div className="flex items-center justify-between pb-3 border-b border-[rgba(242,238,231,0.06)]">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-[#BFA27A]" />
            <h2 className="font-serif text-lg text-[#F2EEE7]">Order Milestones</h2>
          </div>
          <span className="text-[10px] text-[#777169] tracking-wider uppercase font-mono">
            Database Timestamps
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {/* Created */}
          <div className="bg-[#0D0D0C] p-3.5 border border-[rgba(242,238,231,0.04)] rounded-sm space-y-1">
            <span className="text-[9.5px] uppercase tracking-wider text-[#777169] block">
              Order Placed
            </span>
            <p className="text-[#F2EEE7] font-medium text-xs">
              {order.created_at
                ? new Date(order.created_at).toLocaleDateString("en-PK", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "—"}
            </p>
          </div>

          {/* Shipped */}
          <div className="bg-[#0D0D0C] p-3.5 border border-[rgba(242,238,231,0.04)] rounded-sm space-y-1">
            <span className="text-[9.5px] uppercase tracking-wider text-[#777169] block">
              Shipped
            </span>
            <p className={`text-xs ${order.shipped_at ? "text-emerald-300 font-medium" : "text-[#777169] italic"}`}>
              {order.shipped_at
                ? new Date(order.shipped_at).toLocaleDateString("en-PK", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "Not shipped yet"}
            </p>
          </div>

          {/* Delivered */}
          <div className="bg-[#0D0D0C] p-3.5 border border-[rgba(242,238,231,0.04)] rounded-sm space-y-1">
            <span className="text-[9.5px] uppercase tracking-wider text-[#777169] block">
              Delivered
            </span>
            <p className={`text-xs ${order.delivered_at ? "text-emerald-300 font-medium" : "text-[#777169] italic"}`}>
              {order.delivered_at
                ? new Date(order.delivered_at).toLocaleDateString("en-PK", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "Not delivered yet"}
            </p>
          </div>

          {/* Cancelled (if applicable) */}
          {order.cancelled_at && (
            <div className="bg-rose-950/20 p-3.5 border border-rose-500/30 rounded-sm space-y-1">
              <span className="text-[9.5px] uppercase tracking-wider text-rose-400 block font-medium">
                Cancelled
              </span>
              <p className="text-rose-200 text-xs font-medium">
                {new Date(order.cancelled_at).toLocaleDateString("en-PK", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 5. SHIPPING & TRACKING MANAGEMENT CARD */}
      <div className="bg-[#121110] p-5 sm:p-7 border border-[rgba(242,238,231,0.06)] space-y-5 font-sans text-xs rounded-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[rgba(242,238,231,0.06)] gap-1">
          <div className="flex items-center space-x-2">
            <Truck className="w-4 h-4 text-[#BFA27A]" />
            <h2 className="font-serif text-lg sm:text-xl text-[#F2EEE7]">
              Shipping & Courier Tracking
            </h2>
          </div>
          <span className="text-[10px] text-[#777169] tracking-wider uppercase font-medium">
            Live on Client Track Order Page
          </span>
        </div>

        <form onSubmit={handleSaveTracking} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Carrier Selection */}
            <div>
              <label className="block text-[9.5px] uppercase tracking-wider text-[#777169] mb-1.5 font-medium">
                Courier Carrier
              </label>
              <CustomSelect
                value={carrier}
                onChange={setCarrier}
                options={carrierOptions}
                size="sm"
              />
            </div>

            {/* Tracking Number Input */}
            <div>
              <label className="block text-[9.5px] uppercase tracking-wider text-[#777169] mb-1.5 font-medium">
                Consignment / Tracking Number
              </label>
              <Input
                type="text"
                size="compact"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                placeholder="e.g. LEO-9842104 or 7291840192"
                className="font-mono text-sm text-[#F2EEE7]"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <p className="text-[11px] text-[#777169] font-light">
              Saving updates the parcel manifest immediately for client tracking.
            </p>

            <button
              type="submit"
              disabled={isSavingTracking}
              className="w-full sm:w-auto bg-[#181714] text-[#F2EEE7] border border-[#BFA27A]/50 hover:bg-[#BFA27A] hover:text-[#0D0D0C] px-6 py-3 text-xs uppercase font-sans tracking-[0.16em] transition-all duration-200 flex items-center justify-center space-x-2 cursor-pointer font-medium disabled:opacity-50 min-h-[44px]"
            >
              {isSavingTracking ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#BFA27A]" />
                  <span>SAVING...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>SAVE TRACKING</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* 5. IMMUTABLE ORDER ITEMS SNAPSHOT */}
      <div className="bg-[#121110] p-5 sm:p-7 border border-[rgba(242,238,231,0.06)] space-y-5 rounded-sm">
        <div className="flex items-center justify-between pb-3 border-b border-[rgba(242,238,231,0.06)]">
          <h2 className="font-serif text-lg sm:text-xl text-[#F2EEE7]">
            Order Line Items ({items.length})
          </h2>
          <span className="text-[10px] uppercase font-sans text-[#777169] tracking-wider font-mono">
            Immutable Snapshot
          </span>
        </div>

        {items.length > 0 ? (
          <>
            {/* DESKTOP TABLE VIEW (>= 768px) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs font-sans">
                <thead>
                  <tr className="border-b border-[rgba(242,238,231,0.06)] text-[9.5px] uppercase tracking-[0.2em] text-[#777169]">
                    <th className="pb-3 font-medium">Composition</th>
                    <th className="pb-3 font-medium">Size</th>
                    <th className="pb-3 font-medium text-center">Qty</th>
                    <th className="pb-3 font-medium text-right">Unit Price</th>
                    <th className="pb-3 font-medium text-right">Line Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[rgba(242,238,231,0.04)]">
                  {items.map((item, idx) => {
                    const isCustom = Boolean(item.is_custom);
                    const config = item.custom_configuration;
                    return (
                      <tr key={item.id || idx} className="align-top">
                        <td className="py-4">
                          <div className="flex items-center space-x-2">
                            <p className="font-serif text-base text-[#F2EEE7]">
                              {item.product_name}
                            </p>
                            {isCustom && (
                              <span className="inline-flex items-center text-[8.5px] uppercase tracking-[0.16em] px-1.5 py-0.5 bg-[#BFA27A]/15 text-[#BFA27A] border border-[#BFA27A]/30 font-medium rounded-xs">
                                BESPOKE
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] font-mono text-[#777169]">
                            /{item.product_slug || (isCustom ? "custom-scente" : "product")}
                          </p>

                          {/* Bespoke Formulation Specification */}
                          {isCustom && (
                            <div className="mt-3 p-3.5 bg-[#0D0D0C] border border-[#BFA27A]/30 rounded-xs space-y-3 font-sans text-xs max-w-xl">
                              <div className="flex items-center justify-between border-b border-[rgba(242,238,231,0.06)] pb-2">
                                <span className="text-[10px] uppercase tracking-[0.18em] font-medium text-[#BFA27A] flex items-center gap-1.5">
                                  <Sparkles className="w-3 h-3 text-[#BFA27A]" />
                                  <span>ATELIER FORMULATION SPECIFICATION</span>
                                </span>
                                {config?.formatted_total_price && (
                                  <span className="text-[9.5px] uppercase tracking-wider text-[#AAA49B] font-mono">
                                    Verified: {config.formatted_total_price}
                                  </span>
                                )}
                              </div>

                              {config?.summary && (
                                <p className="text-[11px] text-[#F2EEE7] font-serif italic border-l-2 border-[#BFA27A] pl-2.5 py-0.5">
                                  "{config.summary}"
                                </p>
                              )}

                              {config?.groups && config.groups.length > 0 ? (
                                <div className="space-y-2 pt-1">
                                  {config.groups.map((grp, gIdx) => (
                                    <div key={grp.group_id || grp.group_slug || gIdx} className="space-y-1">
                                      <span className="text-[9.5px] uppercase tracking-wider text-[#8E887F] block font-medium">
                                        {grp.group_name}
                                      </span>
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pl-1">
                                        {grp.selected_options?.map((opt, oIdx) => (
                                          <div
                                            key={opt.id || opt.slug || oIdx}
                                            className="flex items-center justify-between text-xs bg-[#141311] px-2.5 py-1.5 border border-[rgba(242,238,231,0.04)]"
                                          >
                                            <span className="text-[#F2EEE7] font-light">
                                              • {opt.name}
                                            </span>
                                            {Number(opt.price_adjustment) > 0 ? (
                                              <span className="text-[10px] font-mono text-[#BFA27A] ml-2 shrink-0">
                                                +PKR {Number(opt.price_adjustment).toLocaleString()}
                                              </span>
                                            ) : (
                                              <span className="text-[9px] text-[#777169] uppercase tracking-wider ml-2 shrink-0">
                                                Included
                                              </span>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-[11px] text-[#AAA49B] font-light italic">
                                  Bespoke fragrance creation (Standard formulation parameters apply).
                                </p>
                              )}

                              {/* Historical Price Composition */}
                              {config && (
                                <div className="border-t border-[rgba(242,238,231,0.06)] pt-2.5 flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#AAA49B]">
                                  <div className="flex items-center space-x-3">
                                    <span>
                                      Base:{" "}
                                      <strong className="font-mono text-[#F2EEE7]">
                                        PKR {Number(config.base_price || 0).toLocaleString()}
                                      </strong>
                                    </span>
                                    {Number(config.total_price) > Number(config.base_price) && (
                                      <span>
                                        Adjustments:{" "}
                                        <strong className="font-mono text-[#BFA27A]">
                                          +PKR {(Number(config.total_price) - Number(config.base_price)).toLocaleString()}
                                        </strong>
                                      </span>
                                    )}
                                  </div>
                                  <div>
                                    <span>Verified Total: </span>
                                    <strong className="font-mono text-[#F2EEE7]">
                                      PKR {Number(item.unit_price || config.total_price || 0).toLocaleString()}
                                    </strong>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="py-4 uppercase text-[#AAA49B]">
                          {item.size || "50ml"}
                        </td>
                        <td className="py-4 text-center font-mono text-[#F2EEE7]">
                          {item.quantity}
                        </td>
                        <td className="py-4 text-right font-serif text-[#AAA49B]">
                          PKR {Number(item.unit_price || 0).toLocaleString()}
                        </td>
                        <td className="py-4 text-right font-serif text-[#F2EEE7] font-medium">
                          PKR {Number(item.line_total || item.unit_price * item.quantity).toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* MOBILE LINE ITEMS CARDS (< 768px) */}
            <div className="md:hidden divide-y divide-[rgba(242,238,231,0.06)] font-sans text-xs">
              {items.map((item, idx) => {
                const isCustom = Boolean(item.is_custom);
                const config = item.custom_configuration;
                return (
                  <div key={item.id || idx} className="py-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center space-x-2">
                          <p className="font-serif text-base text-[#F2EEE7]">
                            {item.product_name}
                          </p>
                          {isCustom && (
                            <span className="inline-flex items-center text-[8.5px] uppercase tracking-[0.16em] px-1.5 py-0.5 bg-[#BFA27A]/15 text-[#BFA27A] border border-[#BFA27A]/30 font-medium rounded-xs">
                              BESPOKE
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] font-mono text-[#777169]">
                          /{item.product_slug || (isCustom ? "custom-scente" : "product")} • {item.size || "50ml"}
                        </p>
                      </div>

                      <span className="font-serif text-sm text-[#F2EEE7] font-medium">
                        PKR {Number(item.line_total || item.unit_price * item.quantity).toLocaleString()}
                      </span>
                    </div>

                    {/* Bespoke Mobile Formulation Card */}
                    {isCustom && (
                      <div className="p-3 bg-[#0D0D0C] border border-[#BFA27A]/30 rounded-xs space-y-2.5 font-sans text-xs">
                        <div className="flex items-center justify-between border-b border-[rgba(242,238,231,0.06)] pb-1.5">
                          <span className="text-[9.5px] uppercase tracking-[0.16em] font-medium text-[#BFA27A] flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-[#BFA27A]" />
                            <span>FORMULATION</span>
                          </span>
                          {config?.formatted_total_price && (
                            <span className="text-[9px] uppercase font-mono text-[#AAA49B]">
                              {config.formatted_total_price}
                            </span>
                          )}
                        </div>

                        {config?.summary && (
                          <p className="text-[11px] text-[#F2EEE7] font-serif italic border-l-2 border-[#BFA27A] pl-2 py-0.5">
                            "{config.summary}"
                          </p>
                        )}

                        {config?.groups && config.groups.length > 0 && (
                          <div className="space-y-2 pt-1">
                            {config.groups.map((grp, gIdx) => (
                              <div key={grp.group_id || grp.group_slug || gIdx} className="space-y-1">
                                <span className="text-[9px] uppercase tracking-wider text-[#8E887F] block font-medium">
                                  {grp.group_name}
                                </span>
                                <div className="space-y-1 pl-1">
                                  {grp.selected_options?.map((opt, oIdx) => (
                                    <div
                                      key={opt.id || opt.slug || oIdx}
                                      className="flex items-center justify-between text-[11px] bg-[#141311] px-2 py-1 border border-[rgba(242,238,231,0.04)]"
                                    >
                                      <span className="text-[#F2EEE7] font-light">• {opt.name}</span>
                                      {Number(opt.price_adjustment) > 0 ? (
                                        <span className="text-[10px] font-mono text-[#BFA27A]">
                                          +PKR {Number(opt.price_adjustment).toLocaleString()}
                                        </span>
                                      ) : (
                                        <span className="text-[8.5px] text-[#777169] uppercase">
                                          Included
                                        </span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {config && (
                          <div className="border-t border-[rgba(242,238,231,0.06)] pt-2 text-[10.5px] text-[#AAA49B] flex items-center justify-between">
                            <span>Base: PKR {Number(config.base_price || 0).toLocaleString()}</span>
                            <span>Unit Total: PKR {Number(item.unit_price || config.total_price || 0).toLocaleString()}</span>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex items-center justify-between text-[11px] text-[#AAA49B] pt-1">
                      <span>Qty: <strong className="font-mono text-[#F2EEE7]">{item.quantity}</strong></span>
                      <span>Unit: PKR {Number(item.unit_price || 0).toLocaleString()}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className="py-8 text-center text-xs font-sans text-[#777169]">
            No line items recorded for this order.
          </div>
        )}

        {/* Settlement Financial Summary */}
        <div className="border-t border-[rgba(242,238,231,0.06)] pt-4 w-full md:max-w-xs md:ml-auto space-y-2 text-xs font-sans">
          <div className="flex justify-between text-[#AAA49B]">
            <span>Subtotal</span>
            <span className="font-serif text-[#F2EEE7]">
              PKR {Number(order.subtotal || order.total).toLocaleString()}
            </span>
          </div>
          {order.promo_code && (
            <div className="flex justify-between text-[#BFA27A]">
              <span>Promo Privilege ({order.promo_code})</span>
              <span className="font-serif">
                -PKR {Number(order.discount_amount || 0).toLocaleString()}
              </span>
            </div>
          )}
          <div className="flex justify-between text-[#AAA49B]">
            <span>Express Delivery</span>
            <span className="text-[#BFA27A] uppercase text-[10px]">
              {order.delivery_fee === 0 ? "Complimentary" : `PKR ${order.delivery_fee}`}
            </span>
          </div>
          <div className="flex justify-between pt-2 border-t border-[rgba(242,238,231,0.06)] text-sm font-medium">
            <span className="text-[#F2EEE7]">Total Settlement Due</span>
            <span className="font-serif text-lg sm:text-xl text-[#F2EEE7]">
              PKR {Number(order.total || 0).toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* 5. DELETE ORDER CONFIRMATION MODAL */}
      <AnimatePresence>
        {showDeleteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#141311] border border-[rgba(242,238,231,0.12)] max-w-md w-full p-6 sm:p-7 space-y-5 rounded-sm shadow-2xl relative font-sans text-xs"
            >
              <div className="flex items-start space-x-3.5">
                <div className="w-10 h-10 rounded-full bg-rose-950/50 border border-rose-500/30 flex items-center justify-center shrink-0 text-rose-400">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-serif text-lg sm:text-xl text-[#F2EEE7] font-normal">
                    Delete Order {order.reference}?
                  </h3>
                  <p className="text-[#AAA49B] text-xs font-light leading-relaxed">
                    This action will permanently delete order <strong className="text-[#F2EEE7] font-mono">{order.reference}</strong> and its line items from the atelier database. This action cannot be undone.
                  </p>
                </div>
              </div>

              {deleteError && (
                <div className="p-3 bg-rose-950/40 border border-rose-500/40 text-rose-200 text-xs rounded-sm">
                  {deleteError}
                </div>
              )}

              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2.5 bg-[#181714] border border-[rgba(242,238,231,0.1)] text-[#AAA49B] hover:text-[#F2EEE7] uppercase tracking-wider text-[11px] font-medium transition-colors cursor-pointer rounded-sm"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={handleDeleteOrder}
                  className="px-5 py-2.5 bg-rose-700 hover:bg-rose-600 text-white uppercase tracking-wider text-[11px] font-semibold transition-colors cursor-pointer rounded-sm flex items-center space-x-1.5 shadow-lg shadow-rose-950/50 disabled:opacity-50"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete Order</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
