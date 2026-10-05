import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  getAllOrdersAdmin,
  deleteOrderAdmin,
  deleteMultipleOrdersAdmin,
  deleteAllOrdersAdmin,
} from "../../services/adminOrders";
import {
  Search,
  RefreshCw,
  ShoppingBag,
  Eye,
  Trash2,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  MapPin,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import CustomSelect from "../../components/CustomSelect";
import Input from "../../components/Input";

export default function AdminOrderList() {
  const [orders, setOrders] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [isLoading, setIsLoading] = useState(true);

  // Single order delete state
  const [orderToDelete, setOrderToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // Bulk select & delete state
  const [selectedOrderIds, setSelectedOrderIds] = useState(new Set());
  const [showDeleteSelectedModal, setShowDeleteSelectedModal] = useState(false);
  const [isDeletingSelected, setIsDeletingSelected] = useState(false);
  const [deleteSelectedError, setDeleteSelectedError] = useState("");

  // Delete all orders state
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  const [deleteAllConfirmInput, setDeleteAllConfirmInput] = useState("");
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [deleteAllError, setDeleteAllError] = useState("");

  const [toastMessage, setToastMessage] = useState("");
  const [loadError, setLoadError] = useState("");

  const sortOptions = [
    { value: "newest", label: "Newest First" },
    { value: "oldest", label: "Oldest First" },
    { value: "highest", label: "Highest Total" },
    { value: "lowest", label: "Lowest Total" },
  ];

  const typeOptions = [
    { id: "all", label: "All Formulations" },
    { id: "bespoke", label: "Bespoke Orders" },
    { id: "standard", label: "Catalog Only" },
  ];

  const statuses = [
    { id: "all", label: "All Statuses" },
    { id: "pending", label: "Pending" },
    { id: "confirmed", label: "Confirmed" },
    { id: "processing", label: "Processing" },
    { id: "shipped", label: "Shipped" },
    { id: "delivered", label: "Delivered" },
    { id: "cancelled", label: "Cancelled" },
  ];

  const loadOrders = async () => {
    setIsLoading(true);
    setLoadError("");
    const { data, error } = await getAllOrdersAdmin({
      search,
      status: statusFilter,
      sortBy,
    });
    if (error) {
      setLoadError("Unable to synchronize orders with database. Please refresh.");
    }
    if (data) setOrders(data);
    setIsLoading(false);
  };

  useEffect(() => {
    loadOrders();
  }, [search, statusFilter, sortBy]);

  // Single order delete execution
  const handleConfirmDelete = async () => {
    if (!orderToDelete) return;
    setIsDeleting(true);
    setDeleteError("");
    const idOrRef = orderToDelete.id || orderToDelete.reference;
    const { error } = await deleteOrderAdmin(idOrRef);
    setIsDeleting(false);

    if (error) {
      setDeleteError(error.message || "Failed to remove order from database.");
    } else {
      const deletedRef = orderToDelete.reference;
      setOrders((prev) => prev.filter((o) => o.id !== idOrRef && o.reference !== idOrRef));
      setSelectedOrderIds((prev) => {
        const next = new Set(prev);
        next.delete(idOrRef);
        return next;
      });
      setOrderToDelete(null);
      setToastMessage(`Order ${deletedRef} permanently removed.`);
      setTimeout(() => setToastMessage(""), 4000);
    }
  };

  // Bulk delete selected orders execution
  const handleConfirmDeleteSelected = async () => {
    if (selectedOrderIds.size === 0) return;
    setIsDeletingSelected(true);
    setDeleteSelectedError("");

    const idsArray = Array.from(selectedOrderIds);
    const { error } = await deleteMultipleOrdersAdmin(idsArray);
    setIsDeletingSelected(false);

    if (error) {
      setDeleteSelectedError(error.message || "Failed to remove selected orders.");
    } else {
      const count = idsArray.length;
      const idsSet = new Set(idsArray);
      setOrders((prev) => prev.filter((o) => !idsSet.has(o.id) && !idsSet.has(o.reference)));
      setSelectedOrderIds(new Set());
      setShowDeleteSelectedModal(false);
      setToastMessage(`${count} ${count === 1 ? "order" : "orders"} permanently deleted.`);
      setTimeout(() => setToastMessage(""), 4000);
    }
  };

  // Delete all orders execution
  const handleConfirmDeleteAll = async () => {
    setIsDeletingAll(true);
    setDeleteAllError("");
    const { error } = await deleteAllOrdersAdmin();
    setIsDeletingAll(false);

    if (error) {
      setDeleteAllError(error.message || "Failed to remove all orders from database.");
    } else {
      setOrders([]);
      setSelectedOrderIds(new Set());
      setShowDeleteAllModal(false);
      setDeleteAllConfirmInput("");
      setToastMessage("All orders permanently deleted from database.");
      setTimeout(() => setToastMessage(""), 4000);
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

  const displayedOrders = orders.filter((ord) => {
    if (typeFilter === "bespoke") {
      return ord.order_items?.some((i) => Boolean(i.is_custom));
    }
    if (typeFilter === "standard") {
      return !ord.order_items?.some((i) => Boolean(i.is_custom));
    }
    return true;
  });

  const isAllSelected =
    displayedOrders.length > 0 &&
    displayedOrders.every((o) => selectedOrderIds.has(o.id || o.reference));

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedOrderIds(new Set());
    } else {
      const next = new Set();
      displayedOrders.forEach((o) => next.add(o.id || o.reference));
      setSelectedOrderIds(next);
    }
  };

  const toggleSelectOne = (idOrRef) => {
    setSelectedOrderIds((prev) => {
      const next = new Set(prev);
      if (next.has(idOrRef)) {
        next.delete(idOrRef);
      } else {
        next.add(idOrRef);
      }
      return next;
    });
  };

  return (
    <div className="space-y-6 sm:space-y-8 w-full min-w-0">
      {/* 0. TOAST NOTIFICATION */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed top-4 right-4 sm:top-6 sm:right-6 z-50 bg-[#181714] border border-[#BFA27A]/50 text-[#F2EEE7] px-4 sm:px-5 py-2.5 sm:py-3 text-xs font-sans shadow-2xl flex items-center space-x-2 rounded-sm max-w-[calc(100vw-32px)]"
          >
            <CheckCircle2 className="w-4 h-4 text-[#BFA27A]" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 1. HEADER WITH ACTIONS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 sm:pb-6 border-b border-[rgba(242,238,231,0.06)] gap-4">
        <div>
          <span className="text-[10px] sm:text-[11px] uppercase font-sans tracking-eyebrow text-[#BFA27A] block mb-1 font-medium">
            LOGISTICS & RESERVATIONS
          </span>
          <h1 className="font-serif font-light text-2xl sm:text-3xl lg:text-4xl text-[#F2EEE7] tracking-headline">
            Cash on Delivery Orders
          </h1>
          <p className="text-xs sm:text-sm font-sans text-[#AAA49B] font-light mt-0.5">
            Review delivery destinations, parcel tracking, and order line items.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-stretch sm:self-auto flex-wrap">
          {/* Delete All Orders Button */}
          {orders.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setDeleteAllError("");
                setDeleteAllConfirmInput("");
                setShowDeleteAllModal(true);
              }}
              disabled={isLoading}
              className="flex-1 sm:flex-initial flex items-center justify-center space-x-2 bg-rose-950/20 hover:bg-rose-950/40 border border-rose-500/30 text-rose-300 hover:text-rose-200 px-4 py-2.5 text-xs font-sans uppercase tracking-[0.16em] transition-colors cursor-pointer min-h-[44px] rounded-sm shadow-sm"
              title="Permanently delete all orders"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              <span>Delete All Orders</span>
            </button>
          )}

          {/* Refresh Button */}
          <button
            type="button"
            onClick={loadOrders}
            disabled={isLoading}
            className="flex-1 sm:flex-initial flex items-center justify-center space-x-2 bg-[#121110] border border-[rgba(242,238,231,0.12)] px-4 py-2.5 text-xs font-sans uppercase tracking-[0.18em] text-[#AAA49B] hover:text-[#F2EEE7] hover:border-[#BFA27A] transition-colors cursor-pointer min-h-[44px] rounded-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-[#BFA27A]" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* 2. SEARCH & FILTER TOOLBAR */}
      <div className="bg-[#121110] p-4 sm:p-5 border border-[rgba(242,238,231,0.06)] space-y-3 sm:space-y-0 sm:flex sm:flex-row sm:gap-4 sm:items-center sm:justify-between font-sans text-xs rounded-sm">
        {/* Search Input */}
        <div className="flex-1 max-w-lg">
          <Input
            id="orderSearch"
            type="text"
            size="compact"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by client name, reference (SC-849204), phone, or city..."
            icon={Search}
            iconPosition="left"
          />
        </div>

        {/* Status Dropdown, Type Filter & Sorting */}
        <div className="grid grid-cols-1 sm:flex sm:items-center gap-2 sm:gap-3">
          <CustomSelect
            value={statusFilter}
            onChange={setStatusFilter}
            options={statuses}
            size="sm"
            className="w-full sm:w-40"
          />

          <CustomSelect
            value={typeFilter}
            onChange={setTypeFilter}
            options={typeOptions}
            size="sm"
            className="w-full sm:w-40"
          />

          <CustomSelect
            value={sortBy}
            onChange={setSortBy}
            options={sortOptions}
            size="sm"
            className="w-full sm:w-40"
            align="right"
          />
        </div>
      </div>

      {/* 2B. ERROR NOTIFICATION */}
      {loadError && (
        <div className="bg-rose-950/30 border border-rose-500/40 text-rose-200 px-4 py-3 text-xs rounded-sm flex items-center space-x-2 font-sans">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{loadError}</span>
        </div>
      )}

      {/* 2C. BULK SELECTION ACTION BANNER */}
      {selectedOrderIds.size > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          className="bg-[#181714] border border-[#BFA27A]/40 p-3 sm:p-4 rounded-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-sans shadow-xl"
        >
          <div className="flex items-center space-x-3">
            <span className="w-2 h-2 rounded-full bg-[#BFA27A] animate-pulse" />
            <span className="text-[#F2EEE7] font-medium">
              <strong className="text-[#BFA27A]">{selectedOrderIds.size}</strong>{" "}
              {selectedOrderIds.size === 1 ? "order" : "orders"} selected
            </span>
          </div>

          <div className="flex items-center space-x-2.5">
            <button
              type="button"
              onClick={() => setSelectedOrderIds(new Set())}
              className="px-3 py-1.5 bg-transparent border border-white/10 hover:border-white/20 text-[#AAA49B] hover:text-[#F2EEE7] text-[11px] uppercase tracking-wider rounded-xs transition-colors cursor-pointer"
            >
              Deselect All
            </button>

            <button
              type="button"
              onClick={() => {
                setDeleteSelectedError("");
                setShowDeleteSelectedModal(true);
              }}
              className="px-3.5 py-1.5 bg-rose-700 hover:bg-rose-600 text-white text-[11px] uppercase tracking-wider font-semibold rounded-xs transition-colors flex items-center space-x-1.5 shadow-md shadow-rose-950/40 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Selected ({selectedOrderIds.size})</span>
            </button>
          </div>
        </motion.div>
      )}

      {/* 3. ORDERS VIEW (DESKTOP TABLE & MOBILE CARDS) */}
      <div className="bg-[#121110] border border-[rgba(242,238,231,0.06)] shadow-2xl overflow-hidden rounded-sm">
        {displayedOrders.length > 0 ? (
          <>
            {/* DESKTOP TABLE VIEW (>= 768px) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs font-sans">
                <thead>
                  <tr className="border-b border-[rgba(242,238,231,0.06)] text-[9.5px] uppercase tracking-[0.2em] text-[#777169] bg-[#0D0D0C]/40">
                    <th className="py-3.5 pl-5 pr-2 w-10">
                      <input
                        type="checkbox"
                        checked={isAllSelected}
                        onChange={toggleSelectAll}
                        aria-label="Select all orders"
                        className="w-4 h-4 rounded-xs border-white/20 bg-[#181714] text-[#BFA27A] focus:ring-[#BFA27A] accent-[#BFA27A] cursor-pointer"
                      />
                    </th>
                    <th className="py-3.5 px-4 font-medium">Reference</th>
                    <th className="py-3.5 px-4 font-medium">Customer</th>
                    <th className="py-3.5 px-4 font-medium">City</th>
                    <th className="py-3.5 px-4 font-medium">Date</th>
                    <th className="py-3.5 px-4 font-medium">Total</th>
                    <th className="py-3.5 px-4 font-medium">Status</th>
                    <th className="py-3.5 px-5 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[rgba(242,238,231,0.04)]">
                  {displayedOrders.map((ord) => {
                    const isSelected = selectedOrderIds.has(ord.id || ord.reference);
                    return (
                      <tr
                        key={ord.id || ord.reference}
                        className={`transition-colors ${
                          isSelected ? "bg-[#BFA27A]/[0.06]" : "hover:bg-[#181714]/60"
                        }`}
                      >
                        {/* Checkbox */}
                        <td className="py-3.5 pl-5 pr-2 w-10">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectOne(ord.id || ord.reference)}
                            aria-label={`Select order ${ord.reference}`}
                            className="w-4 h-4 rounded-xs border-white/20 bg-[#181714] text-[#BFA27A] focus:ring-[#BFA27A] accent-[#BFA27A] cursor-pointer"
                          />
                        </td>

                        {/* Reference */}
                        <td className="py-3.5 px-4 font-mono text-[#F2EEE7] font-medium">
                          <div className="flex items-center space-x-2">
                            <Link
                              to={`/admin/orders/${ord.id || ord.reference}`}
                              className="hover:text-[#BFA27A]"
                            >
                              {ord.reference}
                            </Link>
                            {ord.order_items?.some((i) => Boolean(i.is_custom)) && (
                              <span className="inline-flex items-center text-[8.5px] uppercase tracking-[0.16em] px-1.5 py-0.5 bg-[#BFA27A]/15 text-[#BFA27A] border border-[#BFA27A]/30 font-medium rounded-xs">
                                BESPOKE
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Customer Info */}
                        <td className="py-3.5 px-4">
                          <p className="font-serif text-sm text-[#F2EEE7] font-normal">
                            {ord.customer_full_name}
                          </p>
                          <p className="text-[10px] text-[#777169] font-mono">
                            {ord.customer_phone}
                          </p>
                        </td>

                        {/* City */}
                        <td className="py-3.5 px-4 text-[#AAA49B]">
                          {ord.city}
                        </td>

                        {/* Date */}
                        <td className="py-3.5 px-4 text-[#777169] text-[10.5px]">
                          {new Date(ord.created_at).toLocaleDateString("en-PK", {
                            day: "numeric",
                            month: "short",
                          })}
                        </td>

                        {/* Amount */}
                        <td className="py-3.5 px-4 font-serif text-sm text-[#F2EEE7]">
                          PKR {Number(ord.total || 0).toLocaleString()}
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-block text-[9px] uppercase tracking-wider px-2 py-0.5 border ${getStatusBadge(
                              ord.status
                            )}`}
                          >
                            {ord.status}
                          </span>
                        </td>

                        {/* Single Actions */}
                        <td className="py-3.5 px-5 text-right whitespace-nowrap">
                          <div className="inline-flex items-center space-x-1.5 justify-end">
                            <Link
                              to={`/admin/orders/${ord.id || ord.reference}`}
                              className="p-1.5 text-[#AAA49B] hover:text-[#BFA27A] transition-colors inline-block"
                              title="View order details"
                              aria-label={`View order ${ord.reference}`}
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </Link>
                            <button
                              type="button"
                              onClick={() => {
                                setDeleteError("");
                                setOrderToDelete(ord);
                              }}
                              className="p-1.5 text-[#AAA49B] hover:text-rose-400 transition-colors inline-block cursor-pointer"
                              title="Delete this order"
                              aria-label={`Delete order ${ord.reference}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* MOBILE ORDER CARDS VIEW (< 768px) */}
            <div className="md:hidden divide-y divide-[rgba(242,238,231,0.06)] font-sans text-xs">
              {displayedOrders.map((ord) => {
                const isSelected = selectedOrderIds.has(ord.id || ord.reference);
                return (
                  <div
                    key={ord.id || ord.reference}
                    className={`p-4 space-y-3 transition-colors ${
                      isSelected ? "bg-[#BFA27A]/[0.06]" : ""
                    }`}
                  >
                    {/* Card Header: Checkbox + Reference + Status */}
                    <div className="flex items-center justify-between">
                      <label className="flex items-center space-x-2.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectOne(ord.id || ord.reference)}
                          aria-label={`Select order ${ord.reference}`}
                          className="w-4 h-4 rounded-xs border-white/20 bg-[#181714] text-[#BFA27A] focus:ring-[#BFA27A] accent-[#BFA27A] cursor-pointer"
                        />
                        <span className="font-mono text-[#F2EEE7] font-medium text-sm">
                          {ord.reference}
                        </span>
                        {ord.order_items?.some((i) => Boolean(i.is_custom)) && (
                          <span className="inline-flex items-center text-[8.5px] uppercase tracking-[0.16em] px-1.5 py-0.5 bg-[#BFA27A]/15 text-[#BFA27A] border border-[#BFA27A]/30 font-medium rounded-xs">
                            BESPOKE
                          </span>
                        )}
                      </label>
                      <span
                        className={`inline-block text-[9px] uppercase tracking-wider px-2 py-0.5 border ${getStatusBadge(
                          ord.status
                        )}`}
                      >
                        {ord.status}
                      </span>
                    </div>

                    {/* Customer & Destination */}
                    <div className="space-y-1">
                      <p className="font-serif text-base text-[#F2EEE7]">
                        {ord.customer_full_name}
                      </p>
                      <div className="flex items-center justify-between text-[11px] text-[#777169]">
                        <span className="flex items-center space-x-1">
                          <MapPin className="w-3 h-3 text-[#BFA27A]" />
                          <span>{ord.city}</span>
                        </span>
                        <span>
                          {new Date(ord.created_at).toLocaleDateString("en-PK", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                    </div>

                    {/* Pricing & Tracking info */}
                    <div className="flex items-center justify-between pt-1 border-t border-[rgba(242,238,231,0.04)]">
                      <div>
                        <span className="text-[10px] text-[#777169] uppercase block">
                          Settlement Due
                        </span>
                        <span className="font-serif text-base text-[#F2EEE7] font-medium">
                          PKR {Number(ord.total || 0).toLocaleString()}
                        </span>
                      </div>

                      {ord.tracking_number ? (
                        <span className="text-[10px] font-mono text-[#BFA27A] bg-[#181714] px-2 py-0.5 border border-[#BFA27A]/30">
                          {ord.tracking_number}
                        </span>
                      ) : (
                        <span className="text-[10px] uppercase tracking-wider text-[#777169]">
                          Cash on Delivery
                        </span>
                      )}
                    </div>

                    {/* Action buttons on mobile */}
                    <div className="pt-2 flex items-center space-x-2">
                      <Link
                        to={`/admin/orders/${ord.id || ord.reference}`}
                        className="flex-1 flex items-center justify-center space-x-1.5 bg-[#181714] border border-[rgba(242,238,231,0.12)] text-[#F2EEE7] hover:text-[#BFA27A] py-2.5 text-[11px] uppercase tracking-[0.16em] rounded-sm min-h-[44px]"
                      >
                        <Eye className="w-3.5 h-3.5 text-[#BFA27A]" />
                        <span>Inspect Details</span>
                      </Link>
                      <button
                        type="button"
                        onClick={() => {
                          setDeleteError("");
                          setOrderToDelete(ord);
                        }}
                        className="px-3 bg-rose-950/20 hover:bg-rose-950/40 border border-rose-500/30 text-rose-300 hover:text-rose-200 py-2.5 text-[11px] uppercase rounded-sm min-h-[44px] flex items-center justify-center cursor-pointer"
                        title="Delete order"
                        aria-label={`Delete order ${ord.reference}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className="py-16 text-center space-y-3">
            <ShoppingBag className="w-8 h-8 text-[#777169] mx-auto opacity-40" />
            <p className="text-sm font-serif text-[#F2EEE7]">No orders found.</p>
            <p className="text-xs font-sans text-[#777169]">
              Orders placed by storefront clients will appear here.
            </p>
          </div>
        )}
      </div>

      {/* 4. SINGLE ORDER DELETE CONFIRMATION MODAL */}
      <AnimatePresence>
        {orderToDelete && (
          <div
            data-lenis-prevent
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <motion.div
              data-lenis-prevent
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
                    Delete Order {orderToDelete.reference}?
                  </h3>
                  <p className="text-[#AAA49B] text-xs font-light leading-relaxed">
                    This action will permanently delete order <strong className="text-[#F2EEE7] font-mono">{orderToDelete.reference}</strong> and all associated items from the database. This action cannot be undone.
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
                  onClick={() => setOrderToDelete(null)}
                  className="px-4 py-2.5 bg-[#181714] border border-[rgba(242,238,231,0.1)] text-[#AAA49B] hover:text-[#F2EEE7] uppercase tracking-wider text-[11px] font-medium transition-colors cursor-pointer rounded-sm"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={handleConfirmDelete}
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

      {/* 5. BULK DELETE SELECTED ORDERS CONFIRMATION MODAL */}
      <AnimatePresence>
        {showDeleteSelectedModal && (
          <div
            data-lenis-prevent
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <motion.div
              data-lenis-prevent
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
                    Delete {selectedOrderIds.size} Selected {selectedOrderIds.size === 1 ? "Order" : "Orders"}?
                  </h3>
                  <p className="text-[#AAA49B] text-xs font-light leading-relaxed">
                    This action will permanently delete <strong className="text-[#F2EEE7] font-mono">{selectedOrderIds.size}</strong> selected {selectedOrderIds.size === 1 ? "order" : "orders"} and all their associated line items from the database. This action cannot be undone.
                  </p>
                </div>
              </div>

              {deleteSelectedError && (
                <div className="p-3 bg-rose-950/40 border border-rose-500/40 text-rose-200 text-xs rounded-sm">
                  {deleteSelectedError}
                </div>
              )}

              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  disabled={isDeletingSelected}
                  onClick={() => setShowDeleteSelectedModal(false)}
                  className="px-4 py-2.5 bg-[#181714] border border-[rgba(242,238,231,0.1)] text-[#AAA49B] hover:text-[#F2EEE7] uppercase tracking-wider text-[11px] font-medium transition-colors cursor-pointer rounded-sm"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isDeletingSelected}
                  onClick={handleConfirmDeleteSelected}
                  className="px-5 py-2.5 bg-rose-700 hover:bg-rose-600 text-white uppercase tracking-wider text-[11px] font-semibold transition-colors cursor-pointer rounded-sm flex items-center space-x-1.5 shadow-lg shadow-rose-950/50 disabled:opacity-50"
                >
                  {isDeletingSelected ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete {selectedOrderIds.size} {selectedOrderIds.size === 1 ? "Order" : "Orders"}</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 6. DELETE ALL ORDERS CONFIRMATION MODAL (High-Security Protection) */}
      <AnimatePresence>
        {showDeleteAllModal && (
          <div
            data-lenis-prevent
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <motion.div
              data-lenis-prevent
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#141311] border border-rose-500/40 max-w-md w-full p-6 sm:p-7 space-y-5 rounded-sm shadow-2xl relative font-sans text-xs"
            >
              <div className="flex items-start space-x-3.5">
                <div className="w-10 h-10 rounded-full bg-rose-950/70 border border-rose-500/40 flex items-center justify-center shrink-0 text-rose-300">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-serif text-lg sm:text-xl text-[#F2EEE7] font-normal">
                    Delete ALL Orders?
                  </h3>
                  <p className="text-[#AAA49B] text-xs font-light leading-relaxed">
                    You are about to permanently delete <strong className="text-rose-300 font-mono">ALL {orders.length}</strong> orders from the database. All customers' order records, tracking history, and items will be completely purged.
                  </p>
                </div>
              </div>

              <div className="p-3.5 bg-rose-950/20 border border-rose-500/20 rounded-sm space-y-2">
                <p className="text-[11px] text-[#DDD7CE]">
                  To prevent accidental deletion, please type <strong className="text-rose-400 font-mono">DELETE ALL</strong> below:
                </p>
                <input
                  type="text"
                  value={deleteAllConfirmInput}
                  onChange={(e) => setDeleteAllConfirmInput(e.target.value)}
                  placeholder="DELETE ALL"
                  className="w-full bg-[#0D0D0C] border border-rose-500/40 focus:border-rose-400 px-3 py-2 text-xs font-mono text-[#F2EEE7] placeholder-[#777169] rounded-xs focus:outline-none"
                />
              </div>

              {deleteAllError && (
                <div className="p-3 bg-rose-950/40 border border-rose-500/40 text-rose-200 text-xs rounded-sm">
                  {deleteAllError}
                </div>
              )}

              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  disabled={isDeletingAll}
                  onClick={() => {
                    setShowDeleteAllModal(false);
                    setDeleteAllConfirmInput("");
                  }}
                  className="px-4 py-2.5 bg-[#181714] border border-[rgba(242,238,231,0.1)] text-[#AAA49B] hover:text-[#F2EEE7] uppercase tracking-wider text-[11px] font-medium transition-colors cursor-pointer rounded-sm"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isDeletingAll || deleteAllConfirmInput.trim().toUpperCase() !== "DELETE ALL"}
                  onClick={handleConfirmDeleteAll}
                  className="px-5 py-2.5 bg-rose-700 hover:bg-rose-600 disabled:bg-rose-950/40 disabled:text-rose-400/40 disabled:cursor-not-allowed text-white uppercase tracking-wider text-[11px] font-semibold transition-colors cursor-pointer rounded-sm flex items-center space-x-1.5 shadow-lg shadow-rose-950/50"
                >
                  {isDeletingAll ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Purging all orders...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Confirm Delete All</span>
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
