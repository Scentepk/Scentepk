import React, { useState, useEffect, useMemo } from "react";
import {
  getAllReviewsAdmin,
  createReviewAdmin,
  updateReviewAdmin,
  deleteReviewAdmin,
  toggleReviewPublishAdmin,
} from "../../services/reviews";
import { getActiveProducts } from "../../services/products";
import {
  Star,
  Plus,
  Search,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  Eye,
  EyeOff,
  MessageSquare,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import CustomSelect from "../../components/CustomSelect";

export default function AdminReviews() {
  const [reviews, setReviews] = useState([]);
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // 'all' | 'published' | 'draft'
  const [toastMessage, setToastMessage] = useState("");

  // Modal State for Create / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("create"); // 'create' | 'edit'
  const [activeReviewId, setActiveReviewId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  // Delete Confirmation State
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    customerName: "",
    reviewText: "",
    rating: 5,
    location: "",
    productId: "",
    isPublished: true,
    displayOrder: 0,
  });

  const productOptions = useMemo(() => {
    return [
      { value: "", label: "General House Review (No specific product)" },
      ...products.map((p) => ({
        value: p.id,
        label: `${p.name} (${p.subtitle || "Extrait de Parfum"})`,
      })),
    ];
  }, [products]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [reviewsRes, productsRes] = await Promise.all([
        getAllReviewsAdmin(),
        getActiveProducts(),
      ]);

      if (reviewsRes.data) {
        setReviews(reviewsRes.data);
      }
      if (productsRes.data) {
        setProducts(productsRes.data);
      }
    } catch (err) {
      console.error("Failed to load admin reviews data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 4000);
  };

  // Open Create Modal
  const handleOpenCreate = () => {
    setModalMode("create");
    setActiveReviewId(null);
    setFormError("");
    setFormData({
      customerName: "",
      reviewText: "",
      rating: 5,
      location: "",
      productId: "",
      isPublished: true,
      displayOrder: reviews.length,
    });
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (review) => {
    setModalMode("edit");
    setActiveReviewId(review.id);
    setFormError("");
    setFormData({
      customerName: review.customerName || "",
      reviewText: review.reviewText || "",
      rating: review.rating || 5,
      location: review.location || "",
      productId: review.productId || "",
      isPublished: Boolean(review.isPublished),
      displayOrder: review.displayOrder ?? 0,
    });
    setIsModalOpen(true);
  };

  // Handle Form Submit
  const handleSubmitForm = async (e) => {
    e.preventDefault();
    setFormError("");

    if (!formData.customerName.trim()) {
      setFormError("Customer name is required.");
      return;
    }
    if (!formData.reviewText.trim()) {
      setFormError("Review text is required.");
      return;
    }
    if (formData.rating < 1 || formData.rating > 5) {
      setFormError("Rating must be between 1 and 5 stars.");
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        customerName: formData.customerName.trim(),
        reviewText: formData.reviewText.trim(),
        rating: Number(formData.rating),
        location: formData.location.trim() || null,
        productId: formData.productId || null,
        isPublished: Boolean(formData.isPublished),
        displayOrder: Number(formData.displayOrder) || 0,
      };

      if (modalMode === "create") {
        const { data, error } = await createReviewAdmin(payload);
        if (error) {
          setFormError(error.message || "Failed to create review.");
          setIsSubmitting(false);
          return;
        }
        showToast("Review created successfully.");
        if (data) {
          setReviews((prev) => [data, ...prev]);
        } else {
          loadData();
        }
      } else {
        const { data, error } = await updateReviewAdmin(activeReviewId, payload);
        if (error) {
          setFormError(error.message || "Failed to update review.");
          setIsSubmitting(false);
          return;
        }
        showToast("Review updated successfully.");
        if (data) {
          setReviews((prev) => prev.map((r) => (r.id === activeReviewId ? data : r)));
        } else {
          loadData();
        }
      }

      setIsModalOpen(false);
    } catch (err) {
      console.error("Form submit error:", err);
      setFormError("An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Toggle Publish
  const handleTogglePublish = async (review) => {
    const nextState = !review.isPublished;
    try {
      const { data, error } = await toggleReviewPublishAdmin(review.id, nextState);
      if (error) {
        showToast("Failed to update publication status.");
        return;
      }
      setReviews((prev) =>
        prev.map((r) => (r.id === review.id ? (data || { ...r, isPublished: nextState }) : r))
      );
      showToast(nextState ? "Review published on storefront." : "Review moved to drafts.");
    } catch (err) {
      showToast("Error updating status.");
    }
  };

  // Handle Delete
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);

    try {
      const { error } = await deleteReviewAdmin(deleteTarget.id);
      if (error) {
        showToast("Failed to delete review.");
        setIsDeleting(false);
        return;
      }
      setReviews((prev) => prev.filter((r) => r.id !== deleteTarget.id));
      showToast("Review deleted successfully.");
      setDeleteTarget(null);
    } catch (err) {
      showToast("Error deleting review.");
    } finally {
      setIsDeleting(false);
    }
  };

  // Filtered & Searched Reviews
  const filteredReviews = useMemo(() => {
    return reviews.filter((review) => {
      // 1. Status Filter
      if (statusFilter === "published" && !review.isPublished) return false;
      if (statusFilter === "draft" && review.isPublished) return false;

      // 2. Search Query
      if (search.trim()) {
        const query = search.toLowerCase();
        const name = (review.customerName || "").toLowerCase();
        const text = (review.reviewText || "").toLowerCase();
        const loc = (review.location || "").toLowerCase();
        const prod = (review.productName || review.product?.name || "").toLowerCase();

        return (
          name.includes(query) ||
          text.includes(query) ||
          loc.includes(query) ||
          prod.includes(query)
        );
      }

      return true;
    });
  }, [reviews, statusFilter, search]);

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 right-4 sm:top-6 sm:right-6 z-50 flex items-center space-x-2.5 bg-[#181714] border border-[#BFA27A]/40 text-[#F2EEE7] px-4 py-2.5 sm:py-3 rounded-xl shadow-2xl backdrop-blur-md max-w-[calc(100vw-32px)]"
          >
            <CheckCircle2 className="w-4 h-4 text-[#BFA27A] shrink-0" />
            <span className="text-xs font-sans tracking-wide">{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.06] pb-6">
        <div>
          <span className="text-[10px] sm:text-[11px] uppercase font-sans tracking-[0.24em] text-[#BFA27A] font-medium block mb-1">
            Storefront Social Proof
          </span>
          <h1 className="font-serif text-2xl sm:text-3xl text-[#F2EEE7] font-light">
            Customer Reviews
          </h1>
          <p className="text-xs sm:text-sm font-sans text-[#AAA49B] font-light mt-1">
            Curate verified patron testimonials displayed on the SCENTÉ homepage.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl border border-[#BFA27A] text-[#090908] bg-[#BFA27A] hover:bg-[#D4BA94] hover:border-[#D4BA94] active:scale-[0.99] font-sans text-xs uppercase tracking-[0.14em] font-semibold transition-all duration-200 cursor-pointer shadow-md"
        >
          <Plus className="w-4 h-4 mr-2 stroke-[2.5]" />
          <span>Add Review</span>
        </button>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-[#121110] p-4 rounded-xl border border-white/[0.06]">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[#777169] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by customer, text, city, fragrance..."
            className="w-full bg-[#181714] border border-white/[0.08] focus:border-[#BFA27A] rounded-lg pl-9.5 pr-4 py-2 text-xs font-sans text-[#F2EEE7] placeholder-[#777169] focus:outline-none transition-colors"
          />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center space-x-1.5 p-1 bg-[#181714] rounded-lg border border-white/[0.06] shrink-0">
          {[
            { key: "all", label: "All" },
            { key: "published", label: "Published" },
            { key: "draft", label: "Drafts" },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setStatusFilter(tab.key)}
              className={`px-3 py-1.5 rounded-md text-xs font-sans uppercase tracking-wider transition-colors duration-150 cursor-pointer ${
                statusFilter === tab.key
                  ? "bg-[#BFA27A] text-[#090908] font-semibold shadow-sm"
                  : "text-[#AAA49B] hover:text-[#F2EEE7]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Reviews Table or Empty State */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-[#121110] rounded-xl border border-white/[0.06]">
          <Loader2 className="w-6 h-6 animate-spin text-[#BFA27A] mb-3" />
          <span className="text-xs uppercase font-sans tracking-widest text-[#AAA49B]">
            Loading reviews catalog...
          </span>
        </div>
      ) : filteredReviews.length === 0 ? (
        <div className="text-center py-16 px-4 bg-[#121110] rounded-xl border border-white/[0.06] max-w-2xl mx-auto">
          <div className="w-12 h-12 rounded-full bg-white/[0.04] border border-white/10 flex items-center justify-center mx-auto mb-4 text-[#BFA27A]">
            <MessageSquare className="w-5 h-5 stroke-[1.5]" />
          </div>
          <h3 className="font-serif text-xl text-[#F2EEE7] font-light mb-2">
            No reviews found
          </h3>
          <p className="text-xs sm:text-sm font-sans text-[#AAA49B] font-light leading-relaxed mb-6">
            {search.trim() || statusFilter !== "all"
              ? "No reviews match your current filters."
              : "No reviews have been created yet. Add your first verified patron review."}
          </p>
          <button
            type="button"
            onClick={handleOpenCreate}
            className="inline-flex items-center text-xs uppercase tracking-[0.16em] text-[#BFA27A] hover:underline"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            <span>Create New Review</span>
          </button>
        </div>
      ) : (
        <div className="bg-[#121110] rounded-xl border border-white/[0.06] overflow-hidden">
          {/* DESKTOP TABLE VIEW (>= 768px) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[760px]">
              <thead>
                <tr className="border-b border-white/[0.08] text-[10px] sm:text-[11px] font-sans uppercase tracking-[0.16em] text-[#777169] bg-[#181714] whitespace-nowrap">
                  <th className="py-3 px-4 font-medium">Customer</th>
                  <th className="py-3 px-4 font-medium">Rating</th>
                  <th className="py-3 px-4 font-medium">Testimonial</th>
                  <th className="py-3 px-4 font-medium">Fragrance</th>
                  <th className="py-3 px-4 font-medium text-center">Order</th>
                  <th className="py-3 px-4 font-medium">Status</th>
                  <th className="py-3 px-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04] text-xs font-sans">
                {filteredReviews.map((review) => {
                  const prodName =
                    review.productName || review.product?.name || (review.productId ? "Specific Perfume" : "General");

                  return (
                    <tr
                      key={review.id}
                      className="hover:bg-white/[0.02] transition-colors duration-150"
                    >
                      {/* Customer Name & Location */}
                      <td className="py-4 px-4 align-top">
                        <div className="font-medium text-[#F2EEE7] text-sm">
                          {review.customerName}
                        </div>
                        {review.location && (
                          <div className="text-[11px] text-[#777169] font-light">
                            {review.location}
                          </div>
                        )}
                      </td>

                      {/* Rating Stars */}
                      <td className="py-4 px-4 align-top whitespace-nowrap">
                        <div className="flex items-center space-x-0.5 text-[#BFA27A]">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-3.5 h-3.5 ${
                                i < review.rating ? "fill-[#BFA27A] stroke-none" : "stroke-white/20 fill-none"
                              }`}
                            />
                          ))}
                        </div>
                      </td>

                      {/* Review Quote */}
                      <td className="py-4 px-4 align-top max-w-xs md:max-w-md">
                        <p className="text-[#AAA49B] line-clamp-2 font-light leading-relaxed italic">
                          "{review.reviewText}"
                        </p>
                      </td>

                      {/* Associated Product */}
                      <td className="py-4 px-4 align-top whitespace-nowrap">
                        <span className="inline-block text-[11px] font-sans tracking-wide px-2 py-0.5 rounded bg-[#181714] border border-white/[0.06] text-[#BFA27A]">
                          {prodName}
                        </span>
                      </td>

                      {/* Display Order */}
                      <td className="py-4 px-4 align-top text-center whitespace-nowrap text-[#777169] font-serif">
                        #{review.displayOrder}
                      </td>

                      {/* Publish Status Toggle */}
                      <td className="py-4 px-4 align-top whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleTogglePublish(review)}
                          className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[10px] font-sans uppercase tracking-wider font-semibold transition-all cursor-pointer ${
                            review.isPublished
                              ? "bg-emerald-950/80 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-900/90"
                              : "bg-white/[0.04] text-[#8E887F] border border-white/10 hover:bg-white/[0.08]"
                          }`}
                          title="Click to toggle publish status"
                        >
                          {review.isPublished ? (
                            <>
                              <Eye className="w-3 h-3" />
                              <span>Published</span>
                            </>
                          ) : (
                            <>
                              <EyeOff className="w-3 h-3" />
                              <span>Draft</span>
                            </>
                          )}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-4 align-top text-right whitespace-nowrap">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(review)}
                            className="p-1.5 text-[#AAA49B] hover:text-[#BFA27A] transition-colors rounded hover:bg-white/[0.05]"
                            title="Edit Review"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(review)}
                            className="p-1.5 text-[#AAA49B] hover:text-red-400 transition-colors rounded hover:bg-white/[0.05]"
                            title="Delete Review"
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

          {/* MOBILE REVIEW CARDS VIEW (< 768px) */}
          <div className="md:hidden divide-y divide-[rgba(242,238,231,0.06)] font-sans text-xs">
            {filteredReviews.map((review) => {
              const prodName =
                review.productName || review.product?.name || (review.productId ? "Specific Perfume" : "General");

              return (
                <div key={review.id} className="p-4 space-y-3 bg-[#121110]">
                  {/* Card Top: Customer Info + Star Rating & Order */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="font-serif text-base text-[#F2EEE7] font-normal leading-snug truncate">
                        {review.customerName}
                      </div>
                      {review.location && (
                        <div className="text-[11px] text-[#777169] font-light mt-0.5">
                          {review.location}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <div className="flex items-center space-x-0.5 text-[#BFA27A]">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-3.5 h-3.5 ${
                              i < review.rating ? "fill-[#BFA27A] stroke-none" : "stroke-white/20 fill-none"
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-[10px] text-[#777169] font-mono">
                        #{review.displayOrder}
                      </span>
                    </div>
                  </div>

                  {/* Review Testimonial Quote */}
                  <div className="p-3 bg-[#181714] rounded-lg border border-white/[0.04]">
                    <p className="text-[#AAA49B] text-xs font-light leading-relaxed italic">
                      "{review.reviewText}"
                    </p>
                  </div>

                  {/* Card Footer: Fragrance Tag + Status Toggle + Edit/Delete */}
                  <div className="flex items-center justify-between gap-2 pt-1 flex-wrap">
                    <span className="inline-block text-[10.5px] font-sans tracking-wide px-2.5 py-1 rounded bg-[#0D0D0C] border border-white/[0.08] text-[#BFA27A] truncate max-w-[150px]">
                      {prodName}
                    </span>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleTogglePublish(review)}
                        className={`inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-full text-[9.5px] font-sans uppercase tracking-wider font-semibold transition-all cursor-pointer ${
                          review.isPublished
                            ? "bg-emerald-950/80 text-emerald-300 border border-emerald-500/30"
                            : "bg-white/[0.04] text-[#8E887F] border border-white/10"
                        }`}
                        title="Click to toggle publish status"
                      >
                        {review.isPublished ? (
                          <>
                            <Eye className="w-3 h-3" />
                            <span>Published</span>
                          </>
                        ) : (
                          <>
                            <EyeOff className="w-3 h-3" />
                            <span>Draft</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenEdit(review)}
                        className="p-1.5 text-[#AAA49B] hover:text-[#BFA27A] transition-colors rounded hover:bg-white/[0.05] border border-white/10"
                        title="Edit Review"
                        aria-label={`Edit review from ${review.customerName}`}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setDeleteTarget(review)}
                        className="p-1.5 text-[#AAA49B] hover:text-red-400 transition-colors rounded hover:bg-white/[0.05] border border-white/10"
                        title="Delete Review"
                        aria-label={`Delete review from ${review.customerName}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* CREATE / EDIT MODAL                                                   */}
      {/* ===================================================================== */}
      <AnimatePresence>
        {isModalOpen && (
          <div
            data-lenis-prevent
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <motion.div
              data-lenis-prevent
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-lg bg-[#141312] border border-white/[0.1] rounded-2xl p-5 sm:p-8 shadow-2xl text-[#F2EEE7] max-h-[90vh] overflow-y-auto overscroll-contain"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-4 mb-6">
                <div>
                  <h3 className="font-serif text-xl sm:text-2xl text-[#F2EEE7] font-light">
                    {modalMode === "create" ? "Add Customer Review" : "Edit Customer Review"}
                  </h3>
                  <p className="text-xs font-sans text-[#AAA49B] mt-0.5">
                    {modalMode === "create"
                      ? "Add a verified patron testimonial for the storefront."
                      : "Modify review content, rating, or publication status."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 text-[#AAA49B] hover:text-[#F2EEE7] transition-colors rounded-lg hover:bg-white/[0.05]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Error Banner */}
              {formError && (
                <div className="flex items-center space-x-2 text-xs text-red-400 bg-red-950/40 border border-red-500/30 p-3 rounded-lg mb-5">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmitForm} className="space-y-4">
                {/* Customer Name */}
                <div>
                  <label className="block text-xs uppercase font-sans tracking-wider text-[#AAA49B] mb-1.5">
                    Customer Name <span className="text-[#BFA27A]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.customerName}
                    onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                    placeholder="e.g. Bilal K."
                    className="w-full bg-[#181714] border border-white/[0.08] focus:border-[#BFA27A] rounded-lg px-3.5 py-2.5 text-xs font-sans text-[#F2EEE7] focus:outline-none transition-colors"
                  />
                </div>

                {/* Rating Selector */}
                <div>
                  <label className="block text-xs uppercase font-sans tracking-wider text-[#AAA49B] mb-1.5">
                    Rating <span className="text-[#BFA27A]">*</span>
                  </label>
                  <div className="flex items-center space-x-2">
                    {[1, 2, 3, 4, 5].map((stars) => (
                      <button
                        key={stars}
                        type="button"
                        onClick={() => setFormData({ ...formData, rating: stars })}
                        className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg border text-xs font-sans transition-all cursor-pointer ${
                          formData.rating >= stars
                            ? "bg-[#BFA27A]/10 border-[#BFA27A] text-[#BFA27A]"
                            : "bg-[#181714] border-white/[0.08] text-[#777169] hover:border-white/20"
                        }`}
                      >
                        <Star className="w-3.5 h-3.5 fill-[#BFA27A] stroke-none" />
                        <span className="font-semibold">{stars}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Location & Display Order Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs uppercase font-sans tracking-wider text-[#AAA49B] mb-1.5">
                      City / Location
                    </label>
                    <input
                      type="text"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      placeholder="e.g. Lahore, Karachi"
                      className="w-full bg-[#181714] border border-white/[0.08] focus:border-[#BFA27A] rounded-lg px-3.5 py-2.5 text-xs font-sans text-[#F2EEE7] focus:outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs uppercase font-sans tracking-wider text-[#AAA49B] mb-1.5">
                      Display Order (Ascending)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.displayOrder}
                      onChange={(e) =>
                        setFormData({ ...formData, displayOrder: parseInt(e.target.value, 10) || 0 })
                      }
                      className="w-full bg-[#181714] border border-white/[0.08] focus:border-[#BFA27A] rounded-lg px-3.5 py-2.5 text-xs font-sans text-[#F2EEE7] focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                {/* Fragrance / Product Selection */}
                <div>
                  <label className="block text-xs uppercase font-sans tracking-wider text-[#AAA49B] mb-1.5">
                    Associated Product (Optional)
                  </label>
                  <CustomSelect
                    value={formData.productId || ""}
                    onChange={(val) => setFormData({ ...formData, productId: val })}
                    options={productOptions}
                    placeholder="General House Review (No specific product)"
                    buttonClassName="!bg-[#181714] !border-white/[0.08] !text-xs !font-sans !rounded-lg !py-2.5 !px-3.5"
                    menuClassName="!bg-[#181714] !border-white/[0.1] !rounded-xl !shadow-2xl z-[60]"
                  />
                </div>

                {/* Review Text */}
                <div>
                  <label className="block text-xs uppercase font-sans tracking-wider text-[#AAA49B] mb-1.5">
                    Testimonial / Review Text <span className="text-[#BFA27A]">*</span>
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={formData.reviewText}
                    onChange={(e) => setFormData({ ...formData, reviewText: e.target.value })}
                    placeholder="Enter customer quote..."
                    className="w-full bg-[#181714] border border-white/[0.08] focus:border-[#BFA27A] rounded-lg p-3 text-xs font-sans text-[#F2EEE7] focus:outline-none transition-colors leading-relaxed"
                  />
                </div>

                {/* Publication Toggle */}
                <div className="flex items-center justify-between p-3.5 rounded-lg bg-[#181714] border border-white/[0.06]">
                  <div>
                    <span className="block text-xs font-medium text-[#F2EEE7]">
                      Publish on Storefront
                    </span>
                    <span className="block text-[11px] text-[#777169] font-light">
                      When published, this review will appear in the homepage Patron Impressions.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.isPublished}
                    onChange={(e) => setFormData({ ...formData, isPublished: e.target.checked })}
                    className="w-4 h-4 rounded text-[#BFA27A] focus:ring-[#BFA27A] bg-[#090908] border-white/20 cursor-pointer"
                  />
                </div>

                {/* Modal Actions */}
                <div className="flex items-center justify-end space-x-3 pt-4 border-t border-white/[0.08]">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2.5 text-xs uppercase font-sans tracking-wider text-[#AAA49B] hover:text-[#F2EEE7] transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex items-center px-6 py-2.5 rounded-xl border border-[#BFA27A] text-[#090908] bg-[#BFA27A] hover:bg-[#D4BA94] hover:border-[#D4BA94] active:scale-[0.99] font-sans text-xs uppercase tracking-[0.14em] font-semibold transition-all duration-200 cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" />}
                    <span>{modalMode === "create" ? "Save Review" : "Update Review"}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ===================================================================== */}
      {/* DELETE CONFIRMATION MODAL                                             */}
      {/* ===================================================================== */}
      <AnimatePresence>
        {deleteTarget && (
          <div
            data-lenis-prevent
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <motion.div
              data-lenis-prevent
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm bg-[#141312] border border-white/[0.1] rounded-2xl p-6 text-center text-[#F2EEE7] shadow-2xl"
            >
              <div className="w-12 h-12 rounded-full bg-red-950/60 border border-red-500/30 flex items-center justify-center mx-auto mb-4 text-red-400">
                <Trash2 className="w-5 h-5 stroke-[1.5]" />
              </div>
              <h4 className="font-serif text-xl text-[#F2EEE7] mb-2 font-light">
                Delete Review?
              </h4>
              <p className="text-xs font-sans text-[#AAA49B] mb-6 leading-relaxed">
                Are you sure you want to delete the review by{" "}
                <span className="text-[#F2EEE7] font-medium">{deleteTarget.customerName}</span>?
                This action cannot be undone.
              </p>
              <div className="flex items-center justify-center space-x-3">
                <button
                  type="button"
                  onClick={() => setDeleteTarget(null)}
                  className="px-4 py-2 text-xs uppercase font-sans tracking-wider text-[#AAA49B] hover:text-[#F2EEE7] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={handleConfirmDelete}
                  className="inline-flex items-center px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-sans text-xs uppercase tracking-wider font-semibold transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isDeleting && <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" />}
                  <span>Delete</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
