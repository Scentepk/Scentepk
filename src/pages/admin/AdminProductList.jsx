import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  getAllProductsAdmin,
  updateProductStatusAdmin,
  deleteProductAdmin,
} from "../../services/adminProducts";
import {
  Plus,
  Search,
  SlidersHorizontal,
  Edit2,
  ExternalLink,
  CheckCircle2,
  RefreshCw,
  Package,
  Trash2,
  AlertTriangle,
  Loader2,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import CustomSelect from "../../components/CustomSelect";
import Input from "../../components/Input";

export default function AdminProductList() {
  const location = useLocation();
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [familyFilter, setFamilyFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState("");
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const audiences = [
    { id: "all", label: "All Audiences" },
    { id: "men", label: "Men" },
    { id: "women", label: "Women" },
    { id: "unisex", label: "Unisex" },
  ];

  const loadProducts = async () => {
    setIsLoading(true);
    const { data } = await getAllProductsAdmin({
      search,
      family: familyFilter,
      status: statusFilter,
    });
    if (data) setProducts(data);
    setIsLoading(false);
  };

  useEffect(() => {
    loadProducts();
  }, [search, familyFilter, statusFilter]);

  useEffect(() => {
    if (location.state?.message) {
      setToastMessage(location.state.message);
      window.history.replaceState({}, document.title);
      setTimeout(() => setToastMessage(""), 4000);
    }
  }, [location.state]);

  const handleDeleteProduct = async () => {
    if (!productToDelete) return;
    setIsDeleting(true);
    setDeleteError("");
    const { success, error } = await deleteProductAdmin(productToDelete.id);
    setIsDeleting(false);
    if (error) {
      setDeleteError(error.message || "Failed to delete fragrance. Please try again.");
    } else {
      const deletedName = productToDelete.name;
      setProducts((prev) => prev.filter((p) => p.id !== productToDelete.id));
      setProductToDelete(null);
      setToastMessage(`"${deletedName}" was permanently deleted.`);
      setTimeout(() => setToastMessage(""), 4000);
    }
  };

  const handleStatusChange = async (id, name, newStatus) => {
    const { error } = await updateProductStatusAdmin(id, newStatus);
    if (!error) {
      setProducts((prev) =>
        prev.map((p) =>
          p.id === id
            ? {
                ...p,
                status: newStatus,
                is_active: newStatus !== "inactive",
                stock_quantity:
                  newStatus === "out_of_stock"
                    ? 0
                    : p.stock_quantity === 0
                    ? 50
                    : p.stock_quantity,
              }
            : p
        )
      );
      const labels = { active: "Active", inactive: "Inactive", out_of_stock: "Out of Stock" };
      setToastMessage(`${name} status updated to ${labels[newStatus] || newStatus}.`);
      setTimeout(() => setToastMessage(""), 3500);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "active":
        return "bg-emerald-950/40 text-emerald-300 border-emerald-500/30";
      case "out_of_stock":
        return "bg-amber-950/40 text-amber-300 border-amber-500/30";
      case "inactive":
        return "bg-rose-950/40 text-rose-300 border-rose-500/30";
      default:
        return "bg-zinc-800 text-zinc-300 border-zinc-700";
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 w-full min-w-0">
      {/* 1. TOAST NOTIFICATION */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed top-6 right-6 z-50 bg-[#181714] border border-[#BFA27A]/50 text-[#F2EEE7] px-5 py-3 text-xs font-sans shadow-2xl flex items-center space-x-2"
          >
            <CheckCircle2 className="w-4 h-4 text-[#BFA27A]" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 sm:pb-6 border-b border-[rgba(242,238,231,0.06)] gap-4">
        <div>
          <span className="text-[10px] sm:text-[11px] uppercase font-sans tracking-eyebrow text-[#BFA27A] block mb-1 font-medium">
            CATALOG ARCHITECTURE
          </span>
          <h1 className="font-serif font-light text-2xl sm:text-3xl lg:text-4xl text-[#F2EEE7] tracking-headline">
            Fragrance Catalog
          </h1>
          <p className="text-xs sm:text-sm font-sans text-[#AAA49B] font-light mt-0.5">
            Manage active Extrait formulations, bottle sizing variants, and stock.
          </p>
        </div>

        <Link
          to="/admin/products/new"
          className="self-stretch sm:self-auto inline-flex items-center justify-center space-x-2 bg-transparent text-[#F2EEE7] border border-[rgba(242,238,231,0.22)] px-5 py-3 text-xs uppercase font-sans tracking-[0.2em] hover:border-[#BFA27A] hover:text-[#BFA27A] hover:bg-[#181714] transition-all font-medium min-h-[44px]"
        >
          <Plus className="w-4 h-4 text-[#BFA27A]" />
          <span>Add Fragrance</span>
        </Link>
      </div>

      {/* 3. FILTERS & SEARCH CONTROLS */}
      <div className="bg-[#121110] p-4 sm:p-5 border border-[rgba(242,238,231,0.06)] space-y-4 font-sans text-xs rounded-sm">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Search */}
          <div className="flex-1 max-w-lg">
            <Input
              type="text"
              size="compact"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by fragrance name or slug..."
              icon={Search}
              iconPosition="left"
            />
          </div>

          {/* Desktop Filters (>= 768px) */}
          <div className="hidden md:flex flex-wrap items-center gap-3">
            <CustomSelect
              value={familyFilter}
              onChange={setFamilyFilter}
              options={audiences}
              size="sm"
              className="w-44"
            />

            {/* Status Filter Tabs */}
            <div className="flex border border-[rgba(242,238,231,0.12)] bg-[#0D0D0C] rounded-xl p-1 overflow-hidden">
              {[
                { id: "all", label: "All" },
                { id: "active", label: "Active" },
                { id: "out_of_stock", label: "Out of Stock" },
                { id: "inactive", label: "Inactive" },
              ].map((st) => (
                <button
                  key={st.id}
                  onClick={() => setStatusFilter(st.id)}
                  className={`px-3 py-1 rounded-lg text-[10.5px] uppercase font-sans tracking-[0.14em] transition-colors duration-150 cursor-pointer ${
                    statusFilter === st.id
                      ? "bg-[#1C1B18] text-[#BFA27A] font-medium"
                      : "text-[#AAA49B] hover:text-[#F2EEE7]"
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>

            <button
              onClick={loadProducts}
              className="p-2.5 bg-[#0D0D0C] border border-[rgba(242,238,231,0.12)] text-[#AAA49B] hover:text-[#F2EEE7] hover:border-[#BFA27A] transition-colors min-w-[38px] min-h-[38px] flex items-center justify-center cursor-pointer"
              title="Refresh list"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-[#BFA27A]" : ""}`} />
            </button>
          </div>

          {/* Mobile Filter Toggle Button (< 768px) */}
          <div className="md:hidden flex items-center space-x-2 pt-1">
            <button
              type="button"
              onClick={() => setShowMobileFilters(!showMobileFilters)}
              className="flex-1 flex items-center justify-center space-x-2 bg-[#0D0D0C] border border-[rgba(242,238,231,0.14)] py-2.5 px-4 text-xs uppercase tracking-wider text-[#F2EEE7] hover:border-[#BFA27A] min-h-[44px]"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-[#BFA27A]" />
              <span>
                Filters {familyFilter !== "all" || statusFilter !== "all" ? "• Active" : ""}
              </span>
            </button>

            <button
              onClick={loadProducts}
              className="p-2.5 bg-[#0D0D0C] border border-[rgba(242,238,231,0.14)] text-[#AAA49B] min-w-[44px] min-h-[44px] flex items-center justify-center"
              title="Refresh list"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-[#BFA27A]" : ""}`} />
            </button>
          </div>
        </div>

        {/* Mobile Collapsible Filters Drawer */}
        <AnimatePresence>
          {showMobileFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden pt-3 border-t border-[rgba(242,238,231,0.06)] space-y-3"
            >
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-[#777169] mb-1.5 font-medium">
                  Audience
                </label>
                <CustomSelect
                  value={familyFilter}
                  onChange={setFamilyFilter}
                  options={audiences}
                  size="sm"
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-wider text-[#777169] mb-1.5 font-medium">
                  Product Status
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: "all", label: "All" },
                    { id: "active", label: "Active" },
                    { id: "out_of_stock", label: "Out of Stock" },
                    { id: "inactive", label: "Inactive" },
                  ].map((st) => (
                    <button
                      key={st.id}
                      onClick={() => setStatusFilter(st.id)}
                      className={`py-2 px-3 text-[10.5px] uppercase font-sans tracking-[0.14em] border transition-colors cursor-pointer text-center min-h-[40px] ${
                        statusFilter === st.id
                          ? "bg-[#1C1B18] border-[#BFA27A] text-[#BFA27A] font-semibold"
                          : "bg-[#0D0D0C] border-[rgba(242,238,231,0.08)] text-[#AAA49B]"
                      }`}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>
              </div>

              {(familyFilter !== "all" || statusFilter !== "all") && (
                <button
                  onClick={() => {
                    setFamilyFilter("all");
                    setStatusFilter("all");
                  }}
                  className="w-full py-2 text-[10px] uppercase tracking-wider text-[#BFA27A] hover:underline text-center"
                >
                  Reset all filters
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 4. PRODUCTS VIEW (TABLE FOR DESKTOP, CARDS FOR MOBILE) */}
      <div className="bg-[#121110] border border-[rgba(242,238,231,0.06)] shadow-2xl overflow-hidden rounded-sm">
        {products.length > 0 ? (
          <>
            {/* DESKTOP TABLE VIEW (>= 768px) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs font-sans">
                <thead>
                  <tr className="border-b border-[rgba(242,238,231,0.06)] text-[9.5px] uppercase tracking-[0.2em] text-[#777169] bg-[#0D0D0C]/40">
                    <th className="py-3.5 px-5 font-medium">Fragrance</th>
                    <th className="py-3.5 px-4 font-medium">Slug</th>
                    <th className="py-3.5 px-4 font-medium">Audience</th>
                    <th className="py-3.5 px-4 font-medium">Price</th>
                    <th className="py-3.5 px-4 font-medium">Stock</th>
                    <th className="py-3.5 px-4 font-medium">Status</th>
                    <th className="py-3.5 px-5 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[rgba(242,238,231,0.04)]">
                  {products.map((prod) => (
                    <tr key={prod.id} className="hover:bg-[#181714]/60 transition-colors">
                      {/* Visual & Title */}
                      <td className="py-3.5 px-5">
                        <div className="flex items-center space-x-3.5">
                          <div className="w-10 h-12 bg-[#0D0D0C] border border-[rgba(242,238,231,0.06)] shrink-0 overflow-hidden rounded-sm">
                            <img
                              src={prod.primary_image || prod.image}
                              alt={prod.name}
                              className="w-full h-full object-cover opacity-90"
                              onError={(e) => {
                                e.target.src =
                                  "https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&w=200&q=80";
                              }}
                            />
                          </div>
                          <div>
                            <p className="font-serif text-base text-[#F2EEE7] font-normal leading-snug">
                              {prod.name}
                            </p>
                            <p className="text-[10px] text-[#777169]">
                              {prod.subtitle || "Extrait de Parfum"} • {prod.concentration || "30% Oil"}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Slug */}
                      <td className="py-3.5 px-4 font-mono text-[11px] text-[#AAA49B]">
                        /{prod.slug}
                      </td>

                      {/* Audience */}
                      <td className="py-3.5 px-4">
                        <span className="text-[10px] uppercase tracking-wider text-[#BFA27A] font-medium">
                          {prod.family || "Unisex"}
                        </span>
                      </td>

                      {/* Price */}
                      <td className="py-3.5 px-4 font-serif text-sm text-[#F2EEE7]">
                        PKR {Number(prod.price || 0).toLocaleString()}
                      </td>

                      {/* Stock (3-tier inventory indicators) */}
                      <td className="py-3.5 px-4 font-sans">
                        {Number(prod.stock_quantity ?? 0) <= 0 ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] uppercase tracking-wider text-rose-400 bg-rose-950/40 border border-rose-500/30 font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                            0 • Out
                          </span>
                        ) : Number(prod.stock_quantity ?? 0) <= 5 ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] uppercase tracking-wider text-amber-400 bg-amber-950/40 border border-amber-500/30 font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                            {prod.stock_quantity} • Low
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] uppercase tracking-wider text-emerald-400 bg-emerald-950/30 border border-emerald-500/25 font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            {prod.stock_quantity}
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block text-[9px] uppercase tracking-wider px-2 py-0.5 border ${getStatusBadge(
                            prod.status
                          )}`}
                        >
                          {prod.status === "out_of_stock" ? "Out of Stock" : prod.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-5 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          <Link
                            to={`/admin/products/${prod.id}/edit`}
                            className="p-1.5 text-[#AAA49B] hover:text-[#BFA27A] transition-colors"
                            title="Edit fragrance"
                            aria-label={`Edit ${prod.name}`}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Link>

                          <Link
                            to={`/product/${prod.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 text-[#AAA49B] hover:text-[#F2EEE7] transition-colors"
                            title="View on storefront"
                            aria-label={`View ${prod.name} on storefront`}
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Link>

                          <button
                            type="button"
                            onClick={() => {
                              setDeleteError("");
                              setProductToDelete(prod);
                            }}
                            className="p-1.5 text-[#AAA49B] hover:text-rose-400 transition-colors cursor-pointer"
                            title="Delete fragrance"
                            aria-label={`Delete ${prod.name}`}
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

            {/* MOBILE PRODUCT CARDS VIEW (< 768px) */}
            <div className="md:hidden divide-y divide-[rgba(242,238,231,0.06)] font-sans text-xs">
              {products.map((prod) => (
                <div key={prod.id} className="p-4 space-y-3.5">
                  {/* Card Top: Image + Info */}
                  <div className="flex items-start space-x-3.5">
                    <div className="w-16 h-20 bg-[#0D0D0C] border border-[rgba(242,238,231,0.08)] shrink-0 overflow-hidden rounded-sm">
                      <img
                        src={prod.primary_image || prod.image}
                        alt={prod.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.src =
                            "https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&w=200&q=80";
                        }}
                      />
                    </div>

                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[9.5px] uppercase font-sans tracking-[0.16em] text-[#BFA27A] font-medium">
                          {prod.family || "Unisex"}
                        </span>
                        <span
                          className={`inline-block text-[9px] uppercase tracking-wider px-2 py-0.5 border shrink-0 ${getStatusBadge(
                            prod.status
                          )}`}
                        >
                          {prod.status === "out_of_stock" ? "Out of Stock" : prod.status}
                        </span>
                      </div>

                      <h3 className="font-serif text-lg text-[#F2EEE7] font-normal leading-snug truncate">
                        {prod.name}
                      </h3>

                      <p className="font-mono text-[11px] text-[#777169] truncate">
                        /{prod.slug}
                      </p>

                      <div className="flex items-center justify-between pt-1">
                        <span className="font-serif text-sm text-[#F2EEE7] font-medium">
                          PKR {Number(prod.price || 0).toLocaleString()}
                        </span>
                        <span className="font-mono text-[11px] text-[#AAA49B]">
                          Stock:{" "}
                          <strong
                            className={
                              prod.stock_quantity === 0
                                ? "text-rose-400"
                                : prod.stock_quantity <= 10
                                ? "text-amber-400"
                                : "text-[#F2EEE7]"
                            }
                          >
                            {prod.stock_quantity}
                          </strong>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Card Actions Toolbar */}
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[rgba(242,238,231,0.04)]">
                    <Link
                      to={`/admin/products/${prod.id}/edit`}
                      className="flex items-center justify-center space-x-1 bg-[#181714] border border-[rgba(242,238,231,0.12)] text-[#F2EEE7] hover:text-[#BFA27A] py-2 text-[10.5px] uppercase tracking-wider rounded-sm min-h-[42px]"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-[#BFA27A]" />
                      <span>Edit</span>
                    </Link>

                    <Link
                      to={`/product/${prod.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center space-x-1 bg-[#0D0D0C] border border-[rgba(242,238,231,0.08)] text-[#AAA49B] hover:text-[#F2EEE7] py-2 text-[10.5px] uppercase tracking-wider rounded-sm min-h-[42px]"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Store</span>
                    </Link>

                    <button
                      type="button"
                      onClick={() => {
                        setDeleteError("");
                        setProductToDelete(prod);
                      }}
                      className="flex items-center justify-center space-x-1 bg-rose-950/20 border border-rose-500/30 text-rose-300 hover:bg-rose-950/40 py-2 text-[10.5px] uppercase tracking-wider rounded-sm min-h-[42px] cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                      <span>Delete</span>
                    </button>
                  </div>

                  {/* Quick Mobile Status Switcher */}
                  <div className="flex items-center justify-between pt-1 text-[11px]">
                    <span className="text-[#777169]">Quick Status:</span>
                    <button
                      type="button"
                      onClick={() =>
                        handleStatusChange(
                          prod.id,
                          prod.name,
                          prod.status === "active" ? "out_of_stock" : "active"
                        )
                      }
                      className={`px-3 py-1 text-[10px] uppercase tracking-wider border rounded-sm transition-colors min-h-[36px] ${
                        prod.status === "active"
                          ? "border-amber-500/30 text-amber-300 hover:bg-amber-950/40"
                          : "border-emerald-500/30 text-emerald-300 hover:bg-emerald-950/40"
                      }`}
                    >
                      {prod.status === "active" ? "Set Out of Stock" : "Set Active"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="py-16 text-center space-y-3">
            <Package className="w-8 h-8 text-[#777169] mx-auto opacity-40" />
            <p className="text-sm font-serif text-[#F2EEE7]">No fragrances matched your query.</p>
            <p className="text-xs font-sans text-[#777169]">
              Try adjusting your search criteria or clear your active filters.
            </p>
          </div>
        )}
      </div>

      {/* 5. DELETE CONFIRMATION MODAL */}
      <AnimatePresence>
        {productToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (!isDeleting) setProductToDelete(null);
              }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />

            {/* Modal Dialog */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-md bg-[#141311] border border-[rgba(242,238,231,0.12)] p-6 sm:p-7 shadow-2xl rounded-sm z-10 space-y-5"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-rose-950/50 border border-rose-500/40 flex items-center justify-center text-rose-400 shrink-0">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-serif text-lg text-[#F2EEE7] font-normal">
                      Delete Fragrance
                    </h3>
                    <p className="text-[11px] text-[#777169] uppercase tracking-wider">
                      Permanent Catalog Removal
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setProductToDelete(null)}
                  className="p-1.5 text-[#AAA49B] hover:text-[#F2EEE7] transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Product Snippet */}
              <div className="flex items-center space-x-3 p-3 bg-[#0D0D0C] border border-[rgba(242,238,231,0.06)] rounded-sm">
                <div className="w-12 h-14 bg-[#181714] border border-[rgba(242,238,231,0.08)] overflow-hidden shrink-0">
                  <img
                    src={productToDelete.primary_image || productToDelete.image}
                    alt={productToDelete.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-serif text-base text-[#F2EEE7] truncate">
                    {productToDelete.name}
                  </p>
                  <p className="text-[11px] font-mono text-[#AAA49B] truncate">
                    /{productToDelete.slug} • PKR {Number(productToDelete.price || 0).toLocaleString()}
                  </p>
                </div>
              </div>

              <p className="text-xs font-sans text-[#AAA49B] leading-relaxed">
                Are you sure you want to delete <strong className="text-[#F2EEE7]">{productToDelete.name}</strong>? This action will permanently remove this fragrance, all its bottle size variants, and gallery images from your storefront. This cannot be undone.
              </p>

              {deleteError && (
                <div className="p-3 bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs rounded-sm">
                  {deleteError}
                </div>
              )}

              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setProductToDelete(null)}
                  className="px-4 py-2.5 text-xs uppercase font-sans tracking-[0.16em] text-[#AAA49B] hover:text-[#F2EEE7] border border-[rgba(242,238,231,0.1)] transition-colors min-h-[42px] cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={handleDeleteProduct}
                  className="px-5 py-2.5 text-xs uppercase font-sans tracking-[0.18em] bg-rose-900/80 hover:bg-rose-800 text-white border border-rose-500/60 flex items-center space-x-2 font-medium transition-all shadow-lg min-h-[42px] disabled:opacity-50 cursor-pointer"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>DELETING...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>DELETE FRAGRANCE</span>
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
