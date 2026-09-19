import React, { useState, useEffect } from "react";
import {
  getAdminPromoCodes,
  createAdminPromoCode,
  updateAdminPromoCode,
  toggleAdminPromoCodeStatus,
  deleteAdminPromoCode,
} from "../../services/promoCodes";
import {
  Tag,
  Plus,
  Search,
  SlidersHorizontal,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Calendar,
  Percent,
  Coins,
  Copy,
  Check,
  X,
  Clock,
  Users,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function AdminPromoCodes() {
  const [promoCodes, setPromoCodes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [toastMessage, setToastMessage] = useState("");
  const [copiedCode, setCopiedCode] = useState(null);

  // Modal State for Create / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("create"); // 'create' | 'edit'
  const [activePromoId, setActivePromoId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  // Delete Confirmation State
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    code: "",
    discount_type: "percentage",
    discount_value: "",
    min_order_amount: "",
    max_discount_amount: "",
    start_date: "",
    expiry_date: "",
    total_usage_limit: "",
    per_customer_limit: "1",
    is_active: true,
    description: "",
  });

  const loadPromoCodes = async () => {
    setIsLoading(true);
    try {
      const data = await getAdminPromoCodes();
      setPromoCodes(data || []);
    } catch (err) {
      console.error("Failed to load promo codes:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPromoCodes();
  }, []);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 4000);
  };

  const handleCopy = (code) => {
    if (!code) return;
    navigator.clipboard?.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Open Create Modal
  const handleOpenCreate = () => {
    setModalMode("create");
    setActivePromoId(null);
    setFormError("");
    setFormData({
      code: "",
      discount_type: "percentage",
      discount_value: "",
      min_order_amount: "",
      max_discount_amount: "",
      start_date: "",
      expiry_date: "",
      total_usage_limit: "",
      per_customer_limit: "1",
      is_active: true,
      description: "",
    });
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (promo) => {
    setModalMode("edit");
    setActivePromoId(promo.id);
    setFormError("");

    // Format ISO dates to input datetime-local format YYYY-MM-DDTHH:MM
    const formatForInput = (isoString) => {
      if (!isoString) return "";
      const d = new Date(isoString);
      return d.toISOString().slice(0, 16);
    };

    setFormData({
      code: promo.code || "",
      discount_type: promo.discount_type || "percentage",
      discount_value: promo.discount_value?.toString() || "",
      min_order_amount: promo.min_order_amount?.toString() || "",
      max_discount_amount: promo.max_discount_amount?.toString() || "",
      start_date: formatForInput(promo.start_date),
      expiry_date: formatForInput(promo.expiry_date),
      total_usage_limit: promo.total_usage_limit?.toString() || "",
      per_customer_limit: promo.per_customer_limit?.toString() || "",
      is_active: promo.is_active !== false,
      description: promo.description || "",
    });
    setIsModalOpen(true);
  };

  // Save Promo Code (Create or Edit)
  const handleSavePromo = async (e) => {
    e.preventDefault();
    setFormError("");

    if (!formData.code.trim()) {
      setFormError("Promo code is required.");
      return;
    }

    const val = Number(formData.discount_value);
    if (isNaN(val) || val <= 0) {
      setFormError("Please enter a valid positive discount value.");
      return;
    }

    if (formData.discount_type === "percentage" && val > 100) {
      setFormError("Percentage discount cannot exceed 100%.");
      return;
    }

    setIsSubmitting(true);

    const payload = {
      code: formData.code.trim().toUpperCase(),
      discount_type: formData.discount_type,
      discount_value: val,
      min_order_amount: formData.min_order_amount ? Number(formData.min_order_amount) : null,
      max_discount_amount:
        formData.discount_type === "percentage" && formData.max_discount_amount
          ? Number(formData.max_discount_amount)
          : null,
      start_date: formData.start_date ? new Date(formData.start_date).toISOString() : null,
      expiry_date: formData.expiry_date ? new Date(formData.expiry_date).toISOString() : null,
      total_usage_limit: formData.total_usage_limit ? parseInt(formData.total_usage_limit, 10) : null,
      per_customer_limit: formData.per_customer_limit ? parseInt(formData.per_customer_limit, 10) : null,
      is_active: formData.is_active,
      description: formData.description.trim() || null,
    };

    try {
      if (modalMode === "create") {
        const { data, error } = await createAdminPromoCode(payload);
        if (error) {
          setFormError(error.message || "Failed to create promo code.");
        } else {
          showToast(`Promo code "${payload.code}" created successfully.`);
          setIsModalOpen(false);
          await loadPromoCodes();
        }
      } else {
        const { data, error } = await updateAdminPromoCode(activePromoId, payload);
        if (error) {
          setFormError(error.message || "Failed to update promo code.");
        } else {
          showToast(`Promo code "${payload.code}" updated successfully.`);
          setIsModalOpen(false);
          await loadPromoCodes();
        }
      }
    } catch (err) {
      setFormError(err?.message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle Status
  const handleToggleStatus = async (promo) => {
    const newStatus = !promo.is_active;
    const { error } = await toggleAdminPromoCodeStatus(promo.id, newStatus);
    if (!error) {
      setPromoCodes((prev) =>
        prev.map((p) =>
          p.id === promo.id
            ? {
                ...p,
                is_active: newStatus,
                status: !newStatus
                  ? "inactive"
                  : p.expiry_date && new Date(p.expiry_date) < new Date()
                  ? "expired"
                  : p.start_date && new Date(p.start_date) > new Date()
                  ? "scheduled"
                  : "active",
              }
            : p
        )
      );
      showToast(`Promo code "${promo.code}" marked as ${newStatus ? "ACTIVE" : "INACTIVE"}.`);
    } else {
      showToast(error.message || "Failed to change status.");
    }
  };

  // Confirm Delete
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const { error } = await deleteAdminPromoCode(deleteTarget.id);
      if (error) {
        showToast(error.message || "Failed to delete promo code.");
      } else {
        showToast(`Promo code "${deleteTarget.code}" deleted.`);
        setDeleteTarget(null);
        await loadPromoCodes();
      }
    } catch (err) {
      showToast("Error deleting promo code.");
    } finally {
      setIsDeleting(false);
    }
  };

  // Filtering
  const filteredPromos = promoCodes.filter((promo) => {
    const matchesSearch =
      promo.code.toLowerCase().includes(search.toLowerCase()) ||
      (promo.description && promo.description.toLowerCase().includes(search.toLowerCase()));

    if (!matchesSearch) return false;

    if (statusFilter === "all") return true;
    return promo.status === statusFilter;
  });

  // Metrics
  const activeCount = promoCodes.filter((p) => p.status === "active").length;
  const totalRedemptions = promoCodes.reduce((acc, p) => acc + (p.usage_count || 0), 0);

  const getStatusBadge = (status) => {
    switch (status) {
      case "active":
        return "bg-emerald-950/50 text-emerald-300 border-emerald-500/40";
      case "scheduled":
        return "bg-sky-950/50 text-sky-300 border-sky-500/40";
      case "expired":
        return "bg-amber-950/50 text-amber-300 border-amber-500/40";
      case "inactive":
      default:
        return "bg-zinc-900 text-zinc-400 border-zinc-700/50";
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 w-full min-w-0 font-sans text-xs">
      {/* 1. TOAST NOTIFICATION */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed top-6 right-6 z-50 bg-[#181714] border border-[#BFA27A]/50 text-[#F2EEE7] px-5 py-3 text-xs shadow-2xl flex items-center space-x-2"
          >
            <CheckCircle2 className="w-4 h-4 text-[#BFA27A]" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. HEADER & PRIMARY ACTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[rgba(242,238,231,0.06)] pb-6">
        <div>
          <span className="text-[10px] uppercase font-sans tracking-[0.25em] text-[#BFA27A] block font-medium mb-1">
            CAMPAIGN CONCIERGE
          </span>
          <h1 className="font-serif font-light text-2xl sm:text-3xl text-[#F2EEE7]">
            Promo Codes & Discounts
          </h1>
          <p className="text-[#AAA49B] text-xs font-light mt-1">
            Manage customer privilege codes, discount caps, usage constraints, and scheduled dates.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          className="bg-[#BFA27A] hover:bg-[#A88B65] text-[#0D0D0C] font-semibold px-5 py-3 text-xs uppercase tracking-wider transition-all duration-200 flex items-center justify-center space-x-2 cursor-pointer shadow-lg shrink-0 rounded-sm"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Create Promo Code</span>
        </button>
      </div>

      {/* 3. METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#121110] border border-[rgba(242,238,231,0.06)] p-4 sm:p-5 rounded-sm space-y-1">
          <span className="text-[9.5px] uppercase tracking-wider text-[#777169] block">
            Total Promo Codes
          </span>
          <p className="font-serif text-2xl text-[#F2EEE7]">{promoCodes.length}</p>
        </div>
        <div className="bg-[#121110] border border-[rgba(242,238,231,0.06)] p-4 sm:p-5 rounded-sm space-y-1">
          <span className="text-[9.5px] uppercase tracking-wider text-[#777169] block">
            Currently Active
          </span>
          <p className="font-serif text-2xl text-emerald-400">{activeCount}</p>
        </div>
        <div className="bg-[#121110] border border-[rgba(242,238,231,0.06)] p-4 sm:p-5 rounded-sm space-y-1">
          <span className="text-[9.5px] uppercase tracking-wider text-[#777169] block">
            Total Redemptions
          </span>
          <p className="font-serif text-2xl text-[#BFA27A]">{totalRedemptions}</p>
        </div>
      </div>

      {/* 4. SEARCH & STATUS FILTER TABS */}
      <div className="bg-[#121110] border border-[rgba(242,238,231,0.06)] p-4 sm:p-5 rounded-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Search Bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-3.5 h-3.5 text-[#777169] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by code or description..."
              className="w-full bg-[#0D0D0C] border border-[rgba(242,238,231,0.1)] focus:border-[#BFA27A] text-xs text-[#F2EEE7] pl-9 pr-3 py-2.5 outline-none transition-colors rounded-sm"
            />
          </div>

          {/* Filter Status Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 border-t sm:border-t-0 pt-2 sm:pt-0 border-[rgba(242,238,231,0.06)]">
            {[
              { id: "all", label: "All" },
              { id: "active", label: "Active" },
              { id: "scheduled", label: "Scheduled" },
              { id: "expired", label: "Expired" },
              { id: "inactive", label: "Inactive" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 text-[10.5px] uppercase tracking-wider rounded-sm transition-all duration-150 cursor-pointer ${
                  statusFilter === tab.id
                    ? "bg-[#BFA27A] text-[#0D0D0C] font-semibold"
                    : "bg-[#181714] text-[#AAA49B] hover:text-[#F2EEE7] border border-[rgba(242,238,231,0.06)]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 5. PROMO CODES TABLE & CARDS */}
      <div className="bg-[#121110] border border-[rgba(242,238,231,0.06)] rounded-sm overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center space-y-3">
            <Loader2 className="w-6 h-6 animate-spin text-[#BFA27A] mx-auto" />
            <p className="text-xs text-[#AAA49B]">Accessing Atelier Promo Registers...</p>
          </div>
        ) : filteredPromos.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <Tag className="w-8 h-8 text-[#777169] mx-auto stroke-[1.2]" />
            <p className="text-sm text-[#F2EEE7]">No promo codes found.</p>
            <p className="text-xs text-[#777169]">
              {search || statusFilter !== "all"
                ? "Try clearing your search or status filter."
                : "Click '+ Create Promo Code' above to set up your first campaign offer."}
            </p>
          </div>
        ) : (
          <>
            {/* DESKTOP TABLE (>= 768px) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[rgba(242,238,231,0.06)] text-[9.5px] uppercase tracking-[0.2em] text-[#777169] bg-[#0E0D0C]">
                    <th className="py-3 px-4 font-medium">Code</th>
                    <th className="py-3 px-4 font-medium">Discount Offer</th>
                    <th className="py-3 px-4 font-medium">Min Order</th>
                    <th className="py-3 px-4 font-medium">Usage & Limits</th>
                    <th className="py-3 px-4 font-medium">Validity Window</th>
                    <th className="py-3 px-4 font-medium text-center">Status</th>
                    <th className="py-3 px-4 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[rgba(242,238,231,0.04)]">
                  {filteredPromos.map((promo) => (
                    <tr key={promo.id} className="hover:bg-[#181714]/60 transition-colors">
                      {/* Code */}
                      <td className="py-4 px-4">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-sm text-[#F2EEE7] font-semibold tracking-wider">
                            {promo.code}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopy(promo.code)}
                            className="text-[#777169] hover:text-[#BFA27A] transition-colors p-1"
                            title="Copy code"
                          >
                            {copiedCode === promo.code ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                        {promo.description && (
                          <p className="text-[10.5px] text-[#777169] max-w-xs line-clamp-1 mt-0.5">
                            {promo.description}
                          </p>
                        )}
                      </td>

                      {/* Discount Offer */}
                      <td className="py-4 px-4">
                        <div className="flex items-center space-x-1.5">
                          {promo.discount_type === "percentage" ? (
                            <Percent className="w-3.5 h-3.5 text-[#BFA27A]" />
                          ) : (
                            <Coins className="w-3.5 h-3.5 text-[#BFA27A]" />
                          )}
                          <span className="font-serif text-sm text-[#F2EEE7]">
                            {promo.discount_type === "percentage"
                              ? `${promo.discount_value}% OFF`
                              : `PKR ${Number(promo.discount_value).toLocaleString()} OFF`}
                          </span>
                        </div>
                        {promo.discount_type === "percentage" && promo.max_discount_amount && (
                          <p className="text-[10px] text-[#777169] mt-0.5">
                            Capped at PKR {Number(promo.max_discount_amount).toLocaleString()}
                          </p>
                        )}
                      </td>

                      {/* Min Order */}
                      <td className="py-4 px-4 text-[#AAA49B]">
                        {promo.min_order_amount
                          ? `PKR ${Number(promo.min_order_amount).toLocaleString()}`
                          : "None"}
                      </td>

                      {/* Usage & Limits */}
                      <td className="py-4 px-4">
                        <div className="font-mono text-xs text-[#F2EEE7]">
                          {promo.usage_count || 0}
                          {promo.total_usage_limit ? ` / ${promo.total_usage_limit}` : " used"}
                        </div>
                        {promo.per_customer_limit && (
                          <p className="text-[10px] text-[#777169] mt-0.5">
                            Max {promo.per_customer_limit}/customer
                          </p>
                        )}
                      </td>

                      {/* Validity Window */}
                      <td className="py-4 px-4 text-[#AAA49B] text-[11px]">
                        {promo.start_date || promo.expiry_date ? (
                          <div className="space-y-0.5">
                            {promo.start_date && (
                              <p>From: {new Date(promo.start_date).toLocaleDateString("en-PK")}</p>
                            )}
                            {promo.expiry_date && (
                              <p>Until: {new Date(promo.expiry_date).toLocaleDateString("en-PK")}</p>
                            )}
                          </div>
                        ) : (
                          <span className="text-[#777169]">No date restrictions</span>
                        )}
                      </td>

                      {/* Status Badge & Quick Toggle */}
                      <td className="py-4 px-4 text-center">
                        <div className="inline-flex flex-col items-center gap-1.5">
                          <span
                            className={`text-[9.5px] uppercase font-mono px-2 py-0.5 border rounded-sm font-medium ${getStatusBadge(
                              promo.status
                            )}`}
                          >
                            {promo.status}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(promo)}
                            className={`text-[9px] uppercase tracking-wider underline transition-colors cursor-pointer ${
                              promo.is_active ? "text-[#777169] hover:text-rose-400" : "text-emerald-400 hover:text-emerald-300"
                            }`}
                          >
                            {promo.is_active ? "Deactivate" : "Activate"}
                          </button>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(promo)}
                            className="p-1.5 text-[#AAA49B] hover:text-[#BFA27A] bg-[#0D0D0C] border border-[rgba(242,238,231,0.06)] hover:border-[#BFA27A]/50 transition-colors cursor-pointer rounded-sm"
                            title="Edit promo code"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(promo)}
                            className="p-1.5 text-[#AAA49B] hover:text-rose-400 bg-[#0D0D0C] border border-[rgba(242,238,231,0.06)] hover:border-rose-500/50 transition-colors cursor-pointer rounded-sm"
                            title="Delete promo code"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* MOBILE CARDS (< 768px) */}
            <div className="md:hidden divide-y divide-[rgba(242,238,231,0.06)] p-4 space-y-4">
              {filteredPromos.map((promo) => (
                <div key={promo.id} className="pt-4 first:pt-0 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-base text-[#F2EEE7] font-semibold">
                          {promo.code}
                        </span>
                        <span
                          className={`text-[9px] uppercase font-mono px-1.5 py-0.5 border rounded-sm font-medium ${getStatusBadge(
                            promo.status
                          )}`}
                        >
                          {promo.status}
                        </span>
                      </div>
                      {promo.description && (
                        <p className="text-[11px] text-[#AAA49B] mt-1">{promo.description}</p>
                      )}
                    </div>

                    <div className="flex items-center space-x-1">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(promo)}
                        className="p-2 text-[#AAA49B] hover:text-[#BFA27A]"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(promo)}
                        className="p-2 text-[#AAA49B] hover:text-rose-400"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 bg-[#0D0D0C] p-3 border border-[rgba(242,238,231,0.04)] text-[11px]">
                    <div>
                      <span className="text-[#777169] block text-[9.5px] uppercase">Offer</span>
                      <span className="text-[#F2EEE7] font-medium">
                        {promo.discount_type === "percentage"
                          ? `${promo.discount_value}% OFF`
                          : `PKR ${Number(promo.discount_value).toLocaleString()} OFF`}
                      </span>
                    </div>
                    <div>
                      <span className="text-[#777169] block text-[9.5px] uppercase">Min Order</span>
                      <span className="text-[#AAA49B]">
                        {promo.min_order_amount
                          ? `PKR ${Number(promo.min_order_amount).toLocaleString()}`
                          : "None"}
                      </span>
                    </div>
                    <div>
                      <span className="text-[#777169] block text-[9.5px] uppercase">Used</span>
                      <span className="font-mono text-[#F2EEE7]">
                        {promo.usage_count || 0}
                        {promo.total_usage_limit ? ` / ${promo.total_usage_limit}` : ""}
                      </span>
                    </div>
                    <div>
                      <span className="text-[#777169] block text-[9.5px] uppercase">Quick Action</span>
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(promo)}
                        className="text-[10px] uppercase text-[#BFA27A] underline cursor-pointer"
                      >
                        {promo.is_active ? "Deactivate" : "Activate"}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* 6. CREATE / EDIT MODAL */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="bg-[#121110] border border-[rgba(242,238,231,0.12)] w-full max-w-xl max-h-[90vh] overflow-y-auto p-6 sm:p-8 shadow-2xl space-y-6 rounded-sm relative"
            >
              <div className="flex items-center justify-between pb-4 border-b border-[rgba(242,238,231,0.06)]">
                <div>
                  <span className="text-[9.5px] uppercase tracking-[0.25em] text-[#BFA27A] font-medium block">
                    {modalMode === "create" ? "NEW CAMPAIGN CODE" : "EDIT CAMPAIGN CODE"}
                  </span>
                  <h2 className="font-serif text-xl text-[#F2EEE7]">
                    {modalMode === "create" ? "Create Promo Code" : `Edit ${formData.code}`}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 text-[#777169] hover:text-[#F2EEE7] transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {formError && (
                <div className="bg-rose-950/40 border border-rose-500/40 p-3 text-rose-300 text-xs flex items-center space-x-2 rounded-sm">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleSavePromo} className="space-y-4">
                {/* Promo Code Name */}
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-[#777169] mb-1.5 font-medium">
                    Promo Code <span className="text-[#BFA27A]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))
                    }
                    placeholder="e.g. SCENTE20"
                    className="w-full bg-[#0D0D0C] border border-[rgba(242,238,231,0.12)] focus:border-[#BFA27A] text-sm font-mono uppercase text-[#F2EEE7] px-3.5 py-2.5 outline-none transition-colors rounded-sm"
                  />
                  <p className="text-[10px] text-[#777169] mt-1">
                    Customers enter this code at checkout (case-insensitive, auto-capitalized).
                  </p>
                </div>

                {/* Discount Type Toggle */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-[#777169] mb-1.5 font-medium">
                      Discount Type <span className="text-[#BFA27A]">*</span>
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setFormData((prev) => ({ ...prev, discount_type: "percentage" }))
                        }
                        className={`py-2 px-3 text-xs uppercase tracking-wider rounded-sm transition-all text-center cursor-pointer ${
                          formData.discount_type === "percentage"
                            ? "bg-[#BFA27A] text-[#0D0D0C] font-semibold"
                            : "bg-[#0D0D0C] text-[#AAA49B] border border-[rgba(242,238,231,0.1)]"
                        }`}
                      >
                        Percentage (%)
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setFormData((prev) => ({ ...prev, discount_type: "fixed" }))
                        }
                        className={`py-2 px-3 text-xs uppercase tracking-wider rounded-sm transition-all text-center cursor-pointer ${
                          formData.discount_type === "fixed"
                            ? "bg-[#BFA27A] text-[#0D0D0C] font-semibold"
                            : "bg-[#0D0D0C] text-[#AAA49B] border border-[rgba(242,238,231,0.1)]"
                        }`}
                      >
                        Fixed (PKR)
                      </button>
                    </div>
                  </div>

                  {/* Discount Value */}
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-[#777169] mb-1.5 font-medium">
                      Discount Value <span className="text-[#BFA27A]">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      max={formData.discount_type === "percentage" ? "100" : undefined}
                      value={formData.discount_value}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, discount_value: e.target.value }))
                      }
                      placeholder={formData.discount_type === "percentage" ? "e.g. 20" : "e.g. 500"}
                      className="w-full bg-[#0D0D0C] border border-[rgba(242,238,231,0.12)] focus:border-[#BFA27A] text-sm font-sans text-[#F2EEE7] px-3.5 py-2.5 outline-none transition-colors rounded-sm"
                    />
                  </div>
                </div>

                {/* Min Order & Max Discount Cap */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-[#777169] mb-1.5 font-medium">
                      Minimum Order Amount (PKR) <span className="text-[#777169] lowercase font-light">(optional)</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.min_order_amount}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, min_order_amount: e.target.value }))
                      }
                      placeholder="e.g. 4000 (leave empty for none)"
                      className="w-full bg-[#0D0D0C] border border-[rgba(242,238,231,0.12)] focus:border-[#BFA27A] text-sm font-sans text-[#F2EEE7] px-3.5 py-2.5 outline-none transition-colors rounded-sm"
                    />
                  </div>

                  {formData.discount_type === "percentage" ? (
                    <div>
                      <label className="block text-[10px] uppercase tracking-wider text-[#777169] mb-1.5 font-medium">
                        Max Discount Cap (PKR) <span className="text-[#777169] lowercase font-light">(optional)</span>
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={formData.max_discount_amount}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, max_discount_amount: e.target.value }))
                        }
                        placeholder="e.g. 1500 (limits max discount)"
                        className="w-full bg-[#0D0D0C] border border-[rgba(242,238,231,0.12)] focus:border-[#BFA27A] text-sm font-sans text-[#F2EEE7] px-3.5 py-2.5 outline-none transition-colors rounded-sm"
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-[10px] uppercase tracking-wider text-[#777169] mb-1.5 font-medium">
                        Per-Customer Usage Limit
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={formData.per_customer_limit}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, per_customer_limit: e.target.value }))
                        }
                        placeholder="e.g. 1 use per customer"
                        className="w-full bg-[#0D0D0C] border border-[rgba(242,238,231,0.12)] focus:border-[#BFA27A] text-sm font-sans text-[#F2EEE7] px-3.5 py-2.5 outline-none transition-colors rounded-sm"
                      />
                    </div>
                  )}
                </div>

                {/* Total Usage Limit & Per-Customer (for percentage) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-[#777169] mb-1.5 font-medium">
                      Total Usage Limit (Atelier-wide) <span className="text-[#777169] lowercase font-light">(optional)</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.total_usage_limit}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, total_usage_limit: e.target.value }))
                      }
                      placeholder="e.g. 500 total redemptions"
                      className="w-full bg-[#0D0D0C] border border-[rgba(242,238,231,0.12)] focus:border-[#BFA27A] text-sm font-sans text-[#F2EEE7] px-3.5 py-2.5 outline-none transition-colors rounded-sm"
                    />
                  </div>

                  {formData.discount_type === "percentage" && (
                    <div>
                      <label className="block text-[10px] uppercase tracking-wider text-[#777169] mb-1.5 font-medium">
                        Per-Customer Usage Limit <span className="text-[#777169] lowercase font-light">(optional)</span>
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={formData.per_customer_limit}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, per_customer_limit: e.target.value }))
                        }
                        placeholder="e.g. 1"
                        className="w-full bg-[#0D0D0C] border border-[rgba(242,238,231,0.12)] focus:border-[#BFA27A] text-sm font-sans text-[#F2EEE7] px-3.5 py-2.5 outline-none transition-colors rounded-sm"
                      />
                    </div>
                  )}
                </div>

                {/* Date Window */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-[#777169] mb-1.5 font-medium">
                      Start Date & Time <span className="text-[#777169] lowercase font-light">(optional)</span>
                    </label>
                    <input
                      type="datetime-local"
                      value={formData.start_date}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, start_date: e.target.value }))
                      }
                      className="w-full bg-[#0D0D0C] border border-[rgba(242,238,231,0.12)] focus:border-[#BFA27A] text-xs font-sans text-[#F2EEE7] px-3 py-2 outline-none transition-colors rounded-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-[#777169] mb-1.5 font-medium">
                      Expiry Date & Time <span className="text-[#777169] lowercase font-light">(optional)</span>
                    </label>
                    <input
                      type="datetime-local"
                      value={formData.expiry_date}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, expiry_date: e.target.value }))
                      }
                      className="w-full bg-[#0D0D0C] border border-[rgba(242,238,231,0.12)] focus:border-[#BFA27A] text-xs font-sans text-[#F2EEE7] px-3 py-2 outline-none transition-colors rounded-sm"
                    />
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-[#777169] mb-1.5 font-medium">
                    Internal Description / Campaign Notes <span className="text-[#777169] lowercase font-light">(optional)</span>
                  </label>
                  <textarea
                    rows="2"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, description: e.target.value }))
                    }
                    placeholder="e.g. Special VIP invitation code for Karachi Autumn launch"
                    className="w-full bg-[#0D0D0C] border border-[rgba(242,238,231,0.12)] focus:border-[#BFA27A] text-xs font-sans text-[#F2EEE7] p-3 outline-none transition-colors rounded-sm resize-none"
                  />
                </div>

                {/* Active Status Toggle */}
                <div className="pt-2 flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, is_active: e.target.checked }))
                    }
                    className="w-4 h-4 accent-[#BFA27A] rounded cursor-pointer"
                  />
                  <label htmlFor="is_active" className="text-xs text-[#F2EEE7] cursor-pointer">
                    Enable this promo code immediately for customer checkout
                  </label>
                </div>

                {/* Actions */}
                <div className="pt-4 border-t border-[rgba(242,238,231,0.06)] flex items-center justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-5 py-2.5 text-xs uppercase tracking-wider text-[#AAA49B] hover:text-[#F2EEE7] transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-[#BFA27A] hover:bg-[#A88B65] text-[#0D0D0C] font-semibold px-6 py-2.5 text-xs uppercase tracking-wider transition-all duration-200 cursor-pointer disabled:opacity-50 flex items-center space-x-2 rounded-sm"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-[#0D0D0C]" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <span>{modalMode === "create" ? "Create Code" : "Save Changes"}</span>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 7. SAFE DELETE CONFIRMATION MODAL */}
      <AnimatePresence>
        {deleteTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="bg-[#121110] border border-rose-500/30 w-full max-w-md p-6 shadow-2xl space-y-5 rounded-sm"
            >
              <div className="space-y-2">
                <span className="text-[10px] uppercase tracking-wider text-rose-400 font-medium block">
                  CONFIRM DELETION
                </span>
                <h3 className="font-serif text-xl text-[#F2EEE7]">
                  Delete Promo Code "{deleteTarget.code}"?
                </h3>
                <p className="text-xs text-[#AAA49B] leading-relaxed">
                  This promo code will be removed from the atelier register. Past completed orders will retain their recorded discount snapshots.
                </p>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteTarget(null)}
                  className="px-4 py-2 text-xs uppercase tracking-wider text-[#AAA49B] hover:text-[#F2EEE7] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                  className="bg-rose-600 hover:bg-rose-700 text-white font-semibold px-5 py-2 text-xs uppercase tracking-wider transition-colors cursor-pointer disabled:opacity-50 flex items-center space-x-2 rounded-sm"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <span>Delete Code</span>
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
