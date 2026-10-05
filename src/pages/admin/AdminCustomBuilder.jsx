import React, { useState, useEffect, useId } from "react";
import {
  getAdminBuilderConfig,
  updateBuilderSettingsAdmin,
  createBuilderGroupAdmin,
  updateBuilderGroupAdmin,
  deleteBuilderGroupAdmin,
  reorderBuilderGroupsAdmin,
  createBuilderOptionAdmin,
  updateBuilderOptionAdmin,
  deleteBuilderOptionAdmin,
  reorderBuilderOptionsAdmin,
  uploadBuilderOptionImageAdmin,
} from "../../services/customBuilder";
import {
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  ArrowUp,
  ArrowDown,
  Layers,
  ChevronDown,
  ChevronUp,
  Save,
  ImageIcon,
  Upload,
  Coins,
  ShieldAlert,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Button from "../../components/Button";
import { useSmoothScroll } from "../../context/SmoothScrollProvider";

export default function AdminCustomBuilder() {
  const { lenis } = useSmoothScroll();
  const [builderConfig, setBuilderConfig] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState("success"); // 'success' | 'error'

  // Settings Panel State
  const [settingsForm, setSettingsForm] = useState({
    is_active: false,
    base_price: 0,
    currency: "PKR",
    title: "",
    subtitle: "",
    description: "",
  });
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsError, setSettingsError] = useState("");

  // Expanded Groups Set (group IDs whose options are revealed)
  const [expandedGroupIds, setExpandedGroupIds] = useState(new Set());

  // Group Modal State (Create / Edit)
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [groupModalMode, setGroupModalMode] = useState("create"); // 'create' | 'edit'
  const [activeGroupId, setActiveGroupId] = useState(null);
  const [groupFormData, setGroupFormData] = useState({
    name: "",
    slug: "",
    description: "",
    selection_type: "single",
    is_required: true,
    min_selections: 1,
    max_selections: 1,
    is_active: true,
  });
  const [isSubmittingGroup, setIsSubmittingGroup] = useState(false);
  const [groupFormError, setGroupFormError] = useState("");

  // Option Modal State (Create / Edit)
  const [isOptionModalOpen, setIsOptionModalOpen] = useState(false);
  const [optionModalMode, setOptionModalMode] = useState("create"); // 'create' | 'edit'
  const [activeOptionId, setActiveOptionId] = useState(null);
  const [targetGroupIdForOption, setTargetGroupIdForOption] = useState(null);
  const [optionFormData, setOptionFormData] = useState({
    name: "",
    slug: "",
    description: "",
    category: "",
    price_adjustment: 0,
    image_url: "",
    storage_path: "",
    is_active: true,
  });
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isSubmittingOption, setIsSubmittingOption] = useState(false);
  const [optionFormError, setOptionFormError] = useState("");

  // Delete Confirmation State
  const [deleteTarget, setDeleteTarget] = useState(null); // { type: 'group' | 'option', item: Object, parentGroupId?: string }
  const [isDeleting, setIsDeleting] = useState(false);

  // Accessible IDs for aria controls
  const fileInputId = useId();

  // Synchronize modal open state with body scroll lock and Lenis smooth scroll
  const isAnyModalOpen = Boolean(isGroupModalOpen || isOptionModalOpen || deleteTarget);

  useEffect(() => {
    if (isAnyModalOpen) {
      document.body.style.overflow = "hidden";
      if (lenis) lenis.stop();
    } else {
      document.body.style.overflow = "";
      if (lenis) lenis.start();
    }
    return () => {
      document.body.style.overflow = "";
      if (lenis) lenis.start();
    };
  }, [isAnyModalOpen, lenis]);

  // Load complete builder configuration from service layer
  const loadConfig = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await getAdminBuilderConfig();
      if (error) throw error;
      setBuilderConfig(data);
      if (data?.settings) {
        setSettingsForm({
          is_active: Boolean(data.settings.is_active),
          base_price: Number(data.settings.base_price || 0),
          currency: data.settings.currency || "PKR",
          title: data.settings.title || "",
          subtitle: data.settings.subtitle || "",
          description: data.settings.description || "",
        });
      }
    } catch (err) {
      console.error("Failed to load admin builder config:", err);
      showToast("Unable to load builder configuration from server.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  const showToast = (msg, type = "success") => {
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => {
      setToastMessage("");
    }, 4000);
  };

  // Helper to generate a URL-safe slug from a human-readable title
  const generateSlug = (text) => {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  };

  // ==============================================================================
  // SETTINGS HANDLERS
  // ==============================================================================

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSettingsError("");

    const basePriceNum = Number(settingsForm.base_price);
    if (isNaN(basePriceNum) || !isFinite(basePriceNum) || basePriceNum < 0) {
      setSettingsError("Base price must be a valid, non-negative integer amount in PKR.");
      return;
    }

    if (!settingsForm.title.trim()) {
      setSettingsError("Builder title is required.");
      return;
    }

    setIsSavingSettings(true);
    try {
      const payload = {
        ...settingsForm,
        base_price: Math.round(basePriceNum),
      };
      const { data, error } = await updateBuilderSettingsAdmin(payload);
      if (error) throw error;

      setSettingsForm((prev) => ({
        ...prev,
        ...data,
      }));
      setBuilderConfig((prev) => (prev ? { ...prev, settings: data } : prev));
      showToast("Builder settings successfully updated.");
    } catch (err) {
      console.error("Failed to update builder settings:", err);
      setSettingsError(err.message || "Unable to save builder settings. Please try again.");
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleToggleGlobalActive = async () => {
    const nextState = !settingsForm.is_active;
    setIsSavingSettings(true);
    try {
      const payload = { ...settingsForm, is_active: nextState };
      const { data, error } = await updateBuilderSettingsAdmin(payload);
      if (error) throw error;

      setSettingsForm((prev) => ({ ...prev, is_active: data.is_active }));
      setBuilderConfig((prev) => (prev ? { ...prev, settings: data } : prev));
      showToast(`Builder is now ${data.is_active ? "ACTIVE" : "INACTIVE"}.`);
    } catch (err) {
      showToast("Failed to toggle builder status.", "error");
    } finally {
      setIsSavingSettings(false);
    }
  };

  // ==============================================================================
  // GROUP CRUD & REORDER HANDLERS
  // ==============================================================================

  const toggleGroupExpand = (groupId) => {
    setExpandedGroupIds((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  const handleOpenCreateGroup = () => {
    setGroupModalMode("create");
    setActiveGroupId(null);
    setGroupFormError("");
    setGroupFormData({
      name: "",
      slug: "",
      description: "",
      selection_type: "single",
      is_required: true,
      min_selections: 1,
      max_selections: 1,
      is_active: true,
    });
    setIsGroupModalOpen(true);
  };

  const handleOpenEditGroup = (group) => {
    setGroupModalMode("edit");
    setActiveGroupId(group.id);
    setGroupFormError("");
    setGroupFormData({
      name: group.name,
      slug: group.slug,
      description: group.description || "",
      selection_type: group.selection_type || "single",
      is_required: Boolean(group.is_required),
      min_selections: Number(group.min_selections ?? 1),
      max_selections: Number(group.max_selections ?? 1),
      is_active: Boolean(group.is_active),
    });
    setIsGroupModalOpen(true);
  };

  const handleSaveGroup = async (e) => {
    e.preventDefault();
    setGroupFormError("");

    const name = groupFormData.name.trim();
    const slug = groupFormData.slug.trim() || generateSlug(name);

    if (!name) {
      setGroupFormError("Group name is required.");
      return;
    }
    if (!slug) {
      setGroupFormError("Group slug is required.");
      return;
    }

    const min = Math.max(0, parseInt(groupFormData.min_selections, 10) || 0);
    let max = Math.max(1, parseInt(groupFormData.max_selections, 10) || 1);

    if (groupFormData.selection_type === "single") {
      max = 1;
    }

    if (max < min) {
      setGroupFormError("Maximum selections must be greater than or equal to minimum selections.");
      return;
    }

    if (groupFormData.is_required && min < 1) {
      setGroupFormError("Required groups must have a minimum selection of at least 1.");
      return;
    }

    setIsSubmittingGroup(true);
    try {
      const payload = {
        name,
        slug,
        description: groupFormData.description.trim() || null,
        selection_type: groupFormData.selection_type,
        is_required: groupFormData.is_required,
        min_selections: min,
        max_selections: max,
        is_active: groupFormData.is_active,
      };

      if (groupModalMode === "create") {
        const nextOrder = (builderConfig?.groups?.length || 0) + 1;
        const { data, error } = await createBuilderGroupAdmin({ ...payload, sort_order: nextOrder });
        if (error) throw error;
        showToast(`Group "${data.name}" created.`);
      } else {
        const { data, error } = await updateBuilderGroupAdmin(activeGroupId, payload);
        if (error) throw error;
        showToast(`Group "${data.name}" updated.`);
      }

      setIsGroupModalOpen(false);
      await loadConfig();
    } catch (err) {
      console.error("Save group error:", err);
      setGroupFormError(err.message || "Failed to save builder group. Check for duplicate slugs.");
    } finally {
      setIsSubmittingGroup(false);
    }
  };

  const handleToggleGroupActive = async (group) => {
    try {
      const next = !group.is_active;
      const { error } = await updateBuilderGroupAdmin(group.id, {
        ...group,
        is_active: next,
      });
      if (error) throw error;
      showToast(`Group "${group.name}" is now ${next ? "ACTIVE" : "INACTIVE"}.`);
      await loadConfig();
    } catch (err) {
      showToast("Failed to toggle group active state.", "error");
    }
  };

  const handleMoveGroup = async (index, direction) => {
    const groups = [...(builderConfig?.groups || [])];
    const targetIndex = direction === "up" ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= groups.length) return;

    // Swap sort orders
    const currentGroup = groups[index];
    const targetGroup = groups[targetIndex];

    const currentOrder = currentGroup.sort_order ?? index;
    const targetOrder = targetGroup.sort_order ?? targetIndex;

    const ordersToUpdate = [
      { id: currentGroup.id, sort_order: targetOrder },
      { id: targetGroup.id, sort_order: currentOrder },
    ];

    try {
      const { error } = await reorderBuilderGroupsAdmin(ordersToUpdate);
      if (error) throw error;
      await loadConfig();
    } catch (err) {
      showToast("Failed to reorder groups.", "error");
    }
  };

  // ==============================================================================
  // OPTION CRUD & REORDER HANDLERS
  // ==============================================================================

  const handleOpenCreateOption = (group) => {
    setOptionModalMode("create");
    setTargetGroupIdForOption(group.id);
    setActiveOptionId(null);
    setOptionFormError("");
    setOptionFormData({
      name: "",
      slug: "",
      description: "",
      category: "",
      price_adjustment: 0,
      image_url: "",
      storage_path: "",
      is_active: true,
    });
    setIsOptionModalOpen(true);
  };

  const handleOpenEditOption = (option, groupId) => {
    setOptionModalMode("edit");
    setTargetGroupIdForOption(groupId);
    setActiveOptionId(option.id);
    setOptionFormError("");
    setOptionFormData({
      name: option.name,
      slug: option.slug,
      description: option.description || "",
      category: option.category || "",
      price_adjustment: Number(option.price_adjustment || 0),
      image_url: option.image_url || "",
      storage_path: option.storage_path || "",
      is_active: Boolean(option.is_active),
    });
    setIsOptionModalOpen(true);
  };

  const handleImageFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingImage(true);
    setOptionFormError("");

    try {
      const { url, path, error } = await uploadBuilderOptionImageAdmin(file);
      if (error) throw error;

      setOptionFormData((prev) => ({
        ...prev,
        image_url: url,
        storage_path: path,
      }));
      showToast("Option visual uploaded.");
    } catch (err) {
      console.error("Image upload failed:", err);
      setOptionFormError(err.message || "Failed to upload image. Must be JPEG, PNG, WebP or AVIF (max 5MB).");
    } finally {
      setIsUploadingImage(false);
      e.target.value = "";
    }
  };

  const handleRemoveOptionImage = () => {
    setOptionFormData((prev) => ({
      ...prev,
      image_url: "",
      storage_path: "",
    }));
  };

  const handleSaveOption = async (e) => {
    e.preventDefault();
    setOptionFormError("");

    const name = optionFormData.name.trim();
    const slug = optionFormData.slug.trim() || generateSlug(name);
    const adjNum = Number(optionFormData.price_adjustment);

    if (!name) {
      setOptionFormError("Option name is required.");
      return;
    }
    if (!slug) {
      setOptionFormError("Option slug is required.");
      return;
    }
    if (isNaN(adjNum) || !isFinite(adjNum) || adjNum < 0) {
      setOptionFormError("Price adjustment must be a non-negative integer amount in PKR.");
      return;
    }

    setIsSubmittingOption(true);
    try {
      const payload = {
        group_id: targetGroupIdForOption,
        name,
        slug,
        description: optionFormData.description.trim() || null,
        category: optionFormData.category.trim() || null,
        price_adjustment: Math.round(adjNum),
        image_url: optionFormData.image_url || null,
        storage_path: optionFormData.storage_path || null,
        is_active: optionFormData.is_active,
      };

      if (optionModalMode === "create") {
        const parentGrp = builderConfig?.groups?.find((g) => g.id === targetGroupIdForOption);
        const nextOrder = (parentGrp?.options?.length || 0) + 1;
        const { data, error } = await createBuilderOptionAdmin({ ...payload, sort_order: nextOrder });
        if (error) throw error;
        showToast(`Option "${data.name}" created.`);
      } else {
        const { data, error } = await updateBuilderOptionAdmin(activeOptionId, payload);
        if (error) throw error;
        showToast(`Option "${data.name}" updated.`);
      }

      setIsOptionModalOpen(false);
      await loadConfig();
    } catch (err) {
      console.error("Save option error:", err);
      setOptionFormError(err.message || "Failed to save option. Check for duplicate slugs.");
    } finally {
      setIsSubmittingOption(false);
    }
  };

  const handleToggleOptionActive = async (option) => {
    try {
      const next = !option.is_active;
      const { error } = await updateBuilderOptionAdmin(option.id, {
        ...option,
        is_active: next,
      });
      if (error) throw error;
      showToast(`Option "${option.name}" is now ${next ? "ACTIVE" : "INACTIVE"}.`);
      await loadConfig();
    } catch (err) {
      showToast("Failed to toggle option active state.", "error");
    }
  };

  const handleMoveOption = async (group, optIndex, direction) => {
    const options = [...(group.options || [])];
    const targetIndex = direction === "up" ? optIndex - 1 : optIndex + 1;

    if (targetIndex < 0 || targetIndex >= options.length) return;

    const currentOpt = options[optIndex];
    const targetOpt = options[targetIndex];

    const currentOrder = currentOpt.sort_order ?? optIndex;
    const targetOrder = targetOpt.sort_order ?? targetIndex;

    const ordersToUpdate = [
      { id: currentOpt.id, sort_order: targetOrder },
      { id: targetOpt.id, sort_order: currentOrder },
    ];

    try {
      const { error } = await reorderBuilderOptionsAdmin(ordersToUpdate);
      if (error) throw error;
      await loadConfig();
    } catch (err) {
      showToast("Failed to reorder options.", "error");
    }
  };

  // ==============================================================================
  // DELETION CONFIRMATION HANDLERS
  // ==============================================================================

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;

    setIsDeleting(true);
    try {
      if (deleteTarget.type === "group") {
        const { error } = await deleteBuilderGroupAdmin(deleteTarget.item.id);
        if (error) throw error;
        showToast(`Group "${deleteTarget.item.name}" deleted.`);
      } else {
        const { error } = await deleteBuilderOptionAdmin(deleteTarget.item.id);
        if (error) throw error;
        showToast(`Option "${deleteTarget.item.name}" deleted.`);
      }

      setDeleteTarget(null);
      await loadConfig();
    } catch (err) {
      console.error("Delete error:", err);
      showToast(err.message || "Failed to delete item.", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  // Metrics computation for overview banner
  const groupsList = builderConfig?.groups || [];
  const totalGroups = groupsList.length;
  const activeGroups = groupsList.filter((g) => g.is_active).length;
  const totalOptions = groupsList.reduce((acc, g) => acc + (g.options?.length || 0), 0);
  const activeOptions = groupsList.reduce(
    (acc, g) => acc + (g.options?.filter((o) => o.is_active).length || 0),
    0
  );

  // ==============================================================================
  // RENDER: LOADING STATE
  // ==============================================================================
  if (isLoading) {
    return (
      <div className="py-28 text-center text-[#AAA49B] text-xs uppercase font-sans tracking-[0.24em] flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-6 h-6 animate-spin text-[#BFA27A]" />
        <span>Loading Custom Perfume Builder Manifest...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8 w-full max-w-6xl mx-auto pb-16 font-sans text-xs">
      {/* 1. FLOATING TOAST NOTIFICATION */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className={`fixed top-6 right-6 z-50 px-5 py-3.5 border shadow-2xl flex items-center space-x-3 rounded-sm ${
              toastType === "error"
                ? "bg-rose-950/90 border-rose-500/50 text-rose-200"
                : "bg-[#181714] border-[#BFA27A]/50 text-[#F2EEE7]"
            }`}
          >
            {toastType === "error" ? (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-[#BFA27A] shrink-0" />
            )}
            <span className="font-sans text-xs">{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. PAGE HEADER & QUICK OVERVIEW BANNER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-[rgba(242,238,231,0.06)] gap-4">
        <div>
          <span className="text-[10px] uppercase tracking-[0.28em] text-[#BFA27A] font-semibold block mb-1">
            BUILDER CONFIGURATION
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl text-[#F2EEE7] font-normal tracking-tight">
            Build Your SCENTE
          </h1>
          <p className="text-xs text-[#AAA49B] mt-1 font-light">
            Manage customization steps, options, price adjustments, and global perfume builder parameters.
          </p>
        </div>

        {/* Global Active State Indicator */}
        <div className="flex items-center space-x-3 bg-[#121110] border border-[rgba(242,238,231,0.08)] px-4 py-2.5 rounded-sm">
          <div className="flex flex-col">
            <span className="text-[9.5px] uppercase tracking-wider text-[#777169] font-medium">
              Builder Status
            </span>
            <span
              className={`text-xs font-mono font-semibold tracking-wider ${
                settingsForm.is_active ? "text-emerald-400" : "text-[#777169]"
              }`}
            >
              {settingsForm.is_active ? "LIVE / ACTIVE" : "DISABLED"}
            </span>
          </div>
          <button
            type="button"
            onClick={handleToggleGlobalActive}
            disabled={isSavingSettings}
            className={`px-3 py-1.5 text-[10px] uppercase font-sans tracking-wider rounded-sm transition-colors cursor-pointer border ${
              settingsForm.is_active
                ? "bg-rose-950/40 text-rose-300 border-rose-500/30 hover:bg-rose-900/40"
                : "bg-emerald-950/40 text-emerald-300 border-emerald-500/30 hover:bg-emerald-900/40"
            }`}
          >
            {settingsForm.is_active ? "Deactivate" : "Activate"}
          </button>
        </div>
      </div>

      {/* 3. METRICS SUMMARY TILES */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Base Price Tile */}
        <div className="bg-[#121110] p-4 border border-[rgba(242,238,231,0.06)] rounded-sm space-y-1">
          <span className="text-[9px] uppercase tracking-wider text-[#777169] block font-medium">
            Starting Base Price
          </span>
          <p className="text-lg font-serif text-[#F2EEE7]">
            PKR {settingsForm.base_price.toLocaleString("en-PK")}
          </p>
          <span className="text-[10px] text-[#AAA49B] font-light">Before option adjustments</span>
        </div>

        {/* Total Groups Tile */}
        <div className="bg-[#121110] p-4 border border-[rgba(242,238,231,0.06)] rounded-sm space-y-1">
          <span className="text-[9px] uppercase tracking-wider text-[#777169] block font-medium">
            Customization Steps
          </span>
          <p className="text-lg font-serif text-[#F2EEE7]">
            {activeGroups} <span className="text-xs text-[#777169]">/ {totalGroups} Active</span>
          </p>
          <span className="text-[10px] text-[#AAA49B] font-light">Sequential customer steps</span>
        </div>

        {/* Total Options Tile */}
        <div className="bg-[#121110] p-4 border border-[rgba(242,238,231,0.06)] rounded-sm space-y-1">
          <span className="text-[9px] uppercase tracking-wider text-[#777169] block font-medium">
            Selectable Options
          </span>
          <p className="text-lg font-serif text-[#F2EEE7]">
            {activeOptions} <span className="text-xs text-[#777169]">/ {totalOptions} Active</span>
          </p>
          <span className="text-[10px] text-[#AAA49B] font-light">Across all groups</span>
        </div>

        {/* Currency Tile */}
        <div className="bg-[#121110] p-4 border border-[rgba(242,238,231,0.06)] rounded-sm space-y-1">
          <span className="text-[9px] uppercase tracking-wider text-[#777169] block font-medium">
            Operating Currency
          </span>
          <p className="text-lg font-mono text-[#BFA27A] font-semibold">{settingsForm.currency}</p>
          <span className="text-[10px] text-[#AAA49B] font-light">Single integer PKR</span>
        </div>
      </div>

      {/* 4. GLOBAL BUILDER SETTINGS CARD */}
      <div className="bg-[#121110] p-5 sm:p-7 border border-[rgba(242,238,231,0.06)] rounded-sm space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-[rgba(242,238,231,0.06)]">
          <div className="flex items-center space-x-2">
            <Coins className="w-4 h-4 text-[#BFA27A]" />
            <h2 className="font-serif text-lg text-[#F2EEE7]">Global Settings & Base Pricing</h2>
          </div>
          <span className="text-[10px] font-mono text-[#777169] uppercase">
            Singleton Table: custom_builder_settings
          </span>
        </div>

        {settingsError && (
          <div className="bg-rose-950/40 border border-rose-500/40 p-3 text-rose-300 flex items-center space-x-2 rounded-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{settingsError}</span>
          </div>
        )}

        <form onSubmit={handleSaveSettings} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Base Price Input */}
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-[#777169] mb-1.5 font-medium">
                Custom Perfume Base Price (PKR) <span className="text-[#BFA27A]">*</span>
              </label>
              <input
                type="number"
                required
                min="0"
                step="1"
                value={settingsForm.base_price}
                onChange={(e) =>
                  setSettingsForm((prev) => ({
                    ...prev,
                    base_price: Math.max(0, parseInt(e.target.value, 10) || 0),
                  }))
                }
                placeholder="e.g. 1200"
                className="w-full bg-[#0D0D0C] border border-[rgba(242,238,231,0.12)] focus:border-[#BFA27A] text-sm font-sans text-[#F2EEE7] px-3.5 py-2.5 outline-none transition-colors rounded-sm"
              />
              <p className="text-[10px] text-[#777169] mt-1">
                The baseline starting price before any size or ingredient adjustments are added.
              </p>
            </div>

            {/* Currency Display */}
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-[#777169] mb-1.5 font-medium">
                Currency
              </label>
              <input
                type="text"
                disabled
                value={settingsForm.currency}
                className="w-full bg-[#0D0D0C]/50 border border-[rgba(242,238,231,0.06)] text-sm font-mono text-[#AAA49B] px-3.5 py-2.5 rounded-sm cursor-not-allowed"
              />
              <p className="text-[10px] text-[#777169] mt-1">
                Locked to PKR (Pakistani Rupee integer format).
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Title */}
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-[#777169] mb-1.5 font-medium">
                Storefront Headline <span className="text-[#BFA27A]">*</span>
              </label>
              <input
                type="text"
                required
                value={settingsForm.title}
                onChange={(e) => setSettingsForm((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="e.g. BUILD YOUR SCENTE"
                className="w-full bg-[#0D0D0C] border border-[rgba(242,238,231,0.12)] focus:border-[#BFA27A] text-sm font-sans text-[#F2EEE7] px-3.5 py-2.5 outline-none transition-colors rounded-sm"
              />
            </div>

            {/* Subtitle */}
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-[#777169] mb-1.5 font-medium">
                Storefront Subtitle
              </label>
              <input
                type="text"
                value={settingsForm.subtitle}
                onChange={(e) => setSettingsForm((prev) => ({ ...prev, subtitle: e.target.value }))}
                placeholder="e.g. Create a Fragrance That's Yours"
                className="w-full bg-[#0D0D0C] border border-[rgba(242,238,231,0.12)] focus:border-[#BFA27A] text-sm font-sans text-[#F2EEE7] px-3.5 py-2.5 outline-none transition-colors rounded-sm"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-[#777169] mb-1.5 font-medium">
              Supporting Editorial Description
            </label>
            <textarea
              rows={2}
              value={settingsForm.description}
              onChange={(e) => setSettingsForm((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="e.g. Choose your size, fragrance profile, notes, and intensity to create a scent made around your preferences."
              className="w-full bg-[#0D0D0C] border border-[rgba(242,238,231,0.12)] focus:border-[#BFA27A] text-sm font-sans text-[#F2EEE7] p-3 outline-none transition-colors rounded-sm resize-none"
            />
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={isSavingSettings}
              className="bg-[#181714] text-[#F2EEE7] border border-[#BFA27A]/50 hover:bg-[#BFA27A] hover:text-[#0D0D0C] px-6 py-2.5 text-[11px] uppercase tracking-[0.16em] transition-all duration-200 flex items-center space-x-2 cursor-pointer font-medium disabled:opacity-50"
            >
              {isSavingSettings ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#BFA27A]" />
                  <span>SAVING...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>SAVE SETTINGS</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* 5. BUILDER GROUPS SECTION */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[rgba(242,238,231,0.06)]">
          <div>
            <h2 className="font-serif text-2xl text-[#F2EEE7]">Customization Steps & Groups</h2>
            <p className="text-xs text-[#AAA49B] font-light">
              Define the sequential steps the customer will navigate (e.g. Size, Fragrance Profile, Notes).
            </p>
          </div>

          <button
            type="button"
            onClick={handleOpenCreateGroup}
            className="inline-flex items-center justify-center space-x-2 bg-[#BFA27A] hover:bg-[#D4BA94] text-[#0D0D0C] px-4 py-2.5 text-[11px] uppercase font-sans tracking-[0.16em] font-semibold transition-colors cursor-pointer rounded-sm shadow-md"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>ADD GROUP</span>
          </button>
        </div>

        {/* Group Cards Container */}
        {groupsList.length === 0 ? (
          /* Empty State */
          <div className="p-10 sm:p-14 bg-[#121110] border border-[rgba(242,238,231,0.08)] rounded-sm text-center max-w-lg mx-auto space-y-4">
            <div className="w-12 h-12 rounded-full bg-[#181714] border border-[rgba(242,238,231,0.1)] flex items-center justify-center mx-auto text-[#BFA27A]">
              <Layers className="w-6 h-6 stroke-[1.5]" />
            </div>
            <div>
              <h3 className="font-serif text-xl text-[#F2EEE7]">No Builder Groups Configured</h3>
              <p className="text-xs text-[#AAA49B] mt-1 font-light leading-relaxed">
                Create your first customization step (such as Size, Fragrance Profile, or Notes) to begin configuring the Build Your SCENTE experience.
              </p>
            </div>
            <button
              type="button"
              onClick={handleOpenCreateGroup}
              className="inline-flex items-center space-x-2 bg-[#BFA27A] text-[#0D0D0C] px-5 py-2.5 text-[11px] uppercase tracking-[0.16em] font-semibold transition-colors cursor-pointer rounded-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create First Group</span>
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {groupsList.map((group, index) => {
              const isExpanded = expandedGroupIds.has(group.id);
              const options = group.options || [];

              return (
                <div
                  key={group.id}
                  className={`bg-[#121110] border transition-all rounded-sm ${
                    group.is_active
                      ? "border-[rgba(242,238,231,0.08)] hover:border-[rgba(242,238,231,0.16)]"
                      : "border-rose-950/40 opacity-75"
                  }`}
                >
                  {/* Group Header Row */}
                  <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* Left: Step Index & Title */}
                    <div className="flex items-start space-x-3.5">
                      <span className="font-mono text-sm text-[#BFA27A] font-semibold bg-[#181714] border border-[rgba(242,238,231,0.08)] w-8 h-8 rounded-sm flex items-center justify-center shrink-0">
                        {String(index + 1).padStart(2, "0")}
                      </span>

                      <div className="space-y-1">
                        <div className="flex items-center flex-wrap gap-2">
                          <h3 className="font-serif text-lg text-[#F2EEE7] font-normal">
                            {group.name}
                          </h3>
                          <span className="font-mono text-[9px] uppercase px-1.5 py-0.5 bg-[#0D0D0C] border border-[rgba(242,238,231,0.08)] text-[#AAA49B]">
                            slug: {group.slug}
                          </span>
                          <span
                            className={`text-[9px] uppercase font-mono px-2 py-0.5 border rounded-sm font-medium ${
                              group.is_active
                                ? "bg-emerald-950/40 text-emerald-300 border-emerald-500/30"
                                : "bg-rose-950/40 text-rose-300 border-rose-500/30"
                            }`}
                          >
                            {group.is_active ? "ACTIVE" : "INACTIVE"}
                          </span>
                        </div>

                        {group.description && (
                          <p className="text-xs text-[#AAA49B] font-light">{group.description}</p>
                        )}

                        <div className="flex items-center flex-wrap gap-3 pt-1 text-[10px] text-[#777169] font-light">
                          <span>
                            Type: <strong className="text-[#F2EEE7] uppercase">{group.selection_type}</strong>
                          </span>
                          <span>•</span>
                          <span>
                            Requirement:{" "}
                            <strong className="text-[#F2EEE7]">
                              {group.is_required ? "Required" : "Optional"}
                            </strong>
                          </span>
                          <span>•</span>
                          <span>
                            Limits:{" "}
                            <strong className="text-[#F2EEE7]">
                              Min {group.min_selections} / Max {group.max_selections}
                            </strong>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Actions & Options Drawer Trigger */}
                    <div className="flex items-center justify-between md:justify-end gap-2 border-t md:border-t-0 pt-3 md:pt-0 border-[rgba(242,238,231,0.04)]">
                      {/* Reorder Buttons */}
                      <div className="flex items-center space-x-1">
                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={() => handleMoveGroup(index, "up")}
                          className="p-1.5 bg-[#0D0D0C] border border-[rgba(242,238,231,0.08)] hover:border-[#BFA27A] text-[#AAA49B] hover:text-[#BFA27A] disabled:opacity-30 disabled:cursor-not-allowed rounded-sm cursor-pointer"
                          title="Move step up"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={index === groupsList.length - 1}
                          onClick={() => handleMoveGroup(index, "down")}
                          className="p-1.5 bg-[#0D0D0C] border border-[rgba(242,238,231,0.08)] hover:border-[#BFA27A] text-[#AAA49B] hover:text-[#BFA27A] disabled:opacity-30 disabled:cursor-not-allowed rounded-sm cursor-pointer"
                          title="Move step down"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Active Toggle */}
                      <button
                        type="button"
                        onClick={() => handleToggleGroupActive(group)}
                        className={`px-2.5 py-1 text-[9.5px] uppercase font-mono tracking-wider rounded-sm transition-colors cursor-pointer border ${
                          group.is_active
                            ? "border-rose-500/30 text-rose-300 hover:bg-rose-950/40"
                            : "border-emerald-500/30 text-emerald-300 hover:bg-emerald-950/40"
                        }`}
                      >
                        {group.is_active ? "Deactivate" : "Activate"}
                      </button>

                      {/* Edit Group */}
                      <button
                        type="button"
                        onClick={() => handleOpenEditGroup(group)}
                        className="p-1.5 bg-[#0D0D0C] border border-[rgba(242,238,231,0.08)] hover:border-[#BFA27A] text-[#AAA49B] hover:text-[#BFA27A] transition-colors rounded-sm cursor-pointer"
                        title="Edit group configuration"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      {/* Delete Group */}
                      <button
                        type="button"
                        onClick={() => setDeleteTarget({ type: "group", item: group })}
                        className="p-1.5 bg-[#0D0D0C] border border-[rgba(242,238,231,0.08)] hover:border-rose-500/50 text-[#AAA49B] hover:text-rose-400 transition-colors rounded-sm cursor-pointer"
                        title="Delete group"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>

                      {/* Expand / Collapse Options Drawer */}
                      <button
                        type="button"
                        onClick={() => toggleGroupExpand(group.id)}
                        className={`px-3 py-1.5 text-[10px] uppercase font-sans tracking-wider rounded-sm transition-colors cursor-pointer flex items-center space-x-1.5 border ${
                          isExpanded
                            ? "bg-[#BFA27A] text-[#0D0D0C] border-[#BFA27A] font-semibold"
                            : "bg-[#181714] text-[#F2EEE7] border-[rgba(242,238,231,0.12)] hover:border-[#BFA27A]"
                        }`}
                      >
                        <span>{options.length} Options</span>
                        {isExpanded ? (
                          <ChevronUp className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* 6. NESTED OPTIONS DRAWER */}
                  {isExpanded && (
                    <div className="border-t border-[rgba(242,238,231,0.06)] bg-[#0D0D0C] p-4 sm:p-6 space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[rgba(242,238,231,0.04)]">
                        <div>
                          <span className="text-[9.5px] uppercase font-mono tracking-wider text-[#BFA27A] font-medium block">
                            STEP OPTIONS
                          </span>
                          <h4 className="font-serif text-base text-[#F2EEE7]">
                            Selectable choices for "{group.name}"
                          </h4>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleOpenCreateOption(group)}
                          className="inline-flex items-center space-x-1.5 bg-[#181714] border border-[#BFA27A]/50 hover:bg-[#BFA27A] hover:text-[#0D0D0C] text-[#F2EEE7] px-3.5 py-1.5 text-[10px] uppercase tracking-wider font-semibold transition-colors cursor-pointer rounded-sm"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>ADD OPTION</span>
                        </button>
                      </div>

                      {/* Options List */}
                      {options.length === 0 ? (
                        <div className="py-6 text-center text-xs text-[#777169] bg-[#121110] border border-[rgba(242,238,231,0.04)] rounded-sm">
                          No options configured in this group yet. Click "+ Add Option" above to create one.
                        </div>
                      ) : (
                        <div className="divide-y divide-[rgba(242,238,231,0.04)]">
                          {options.map((option, optIdx) => (
                            <div
                              key={option.id}
                              className="py-3 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                            >
                              {/* Option Visual & Details */}
                              <div className="flex items-center space-x-3">
                                {/* Thumbnail */}
                                <div className="w-10 h-10 bg-[#141312] border border-[rgba(242,238,231,0.08)] rounded-sm overflow-hidden flex items-center justify-center shrink-0">
                                  {option.image_url ? (
                                    <img
                                      src={option.image_url}
                                      alt={option.name}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <ImageIcon className="w-4 h-4 text-[#777169]" />
                                  )}
                                </div>

                                <div className="space-y-0.5">
                                  <div className="flex items-center flex-wrap gap-2">
                                    <span className="font-serif text-base text-[#F2EEE7] font-normal">
                                      {option.name}
                                    </span>
                                    {option.category && (
                                      <span className="text-[9px] uppercase px-1.5 py-0.2 bg-[#181714] text-[#AAA49B] border border-[rgba(242,238,231,0.06)] rounded-sm">
                                        {option.category}
                                      </span>
                                    )}
                                    <span
                                      className={`text-[8.5px] uppercase font-mono px-1.5 py-0.2 border rounded-sm ${
                                        option.is_active
                                          ? "bg-emerald-950/40 text-emerald-300 border-emerald-500/30"
                                          : "bg-rose-950/40 text-rose-300 border-rose-500/30"
                                      }`}
                                    >
                                      {option.is_active ? "ACTIVE" : "INACTIVE"}
                                    </span>
                                  </div>

                                  {option.description && (
                                    <p className="text-[11px] text-[#AAA49B] font-light">
                                      {option.description}
                                    </p>
                                  )}

                                  <div className="flex items-center space-x-2 text-[10px]">
                                    <span className="text-[#777169] font-mono">slug: {option.slug}</span>
                                    <span className="text-[#777169]">•</span>
                                    <span className="font-serif text-[#BFA27A] font-semibold text-xs">
                                      {option.price_adjustment > 0
                                        ? `+ PKR ${option.price_adjustment.toLocaleString("en-PK")}`
                                        : "+ PKR 0 (Included)"}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Option Actions */}
                              <div className="flex items-center justify-end space-x-2 pt-1 sm:pt-0">
                                {/* Option Reorder */}
                                <div className="flex items-center space-x-1">
                                  <button
                                    type="button"
                                    disabled={optIdx === 0}
                                    onClick={() => handleMoveOption(group, optIdx, "up")}
                                    className="p-1 bg-[#121110] border border-[rgba(242,238,231,0.06)] hover:border-[#BFA27A] text-[#AAA49B] hover:text-[#BFA27A] disabled:opacity-30 disabled:cursor-not-allowed rounded-sm cursor-pointer"
                                    title="Move option up"
                                  >
                                    <ArrowUp className="w-3 h-3" />
                                  </button>
                                  <button
                                    type="button"
                                    disabled={optIdx === options.length - 1}
                                    onClick={() => handleMoveOption(group, optIdx, "down")}
                                    className="p-1 bg-[#121110] border border-[rgba(242,238,231,0.06)] hover:border-[#BFA27A] text-[#AAA49B] hover:text-[#BFA27A] disabled:opacity-30 disabled:cursor-not-allowed rounded-sm cursor-pointer"
                                    title="Move option down"
                                  >
                                    <ArrowDown className="w-3 h-3" />
                                  </button>
                                </div>

                                {/* Option Active Toggle */}
                                <button
                                  type="button"
                                  onClick={() => handleToggleOptionActive(option)}
                                  className={`px-2 py-0.5 text-[9px] uppercase font-mono tracking-wider rounded-sm transition-colors cursor-pointer border ${
                                    option.is_active
                                      ? "border-rose-500/30 text-rose-300 hover:bg-rose-950/40"
                                      : "border-emerald-500/30 text-emerald-300 hover:bg-emerald-950/40"
                                  }`}
                                >
                                  {option.is_active ? "Deactivate" : "Activate"}
                                </button>

                                {/* Edit Option */}
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditOption(option, group.id)}
                                  className="p-1 text-[#AAA49B] hover:text-[#BFA27A] bg-[#121110] border border-[rgba(242,238,231,0.06)] hover:border-[#BFA27A]/50 transition-colors rounded-sm cursor-pointer"
                                  title="Edit option"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>

                                {/* Delete Option */}
                                <button
                                  type="button"
                                  onClick={() =>
                                    setDeleteTarget({
                                      type: "option",
                                      item: option,
                                      parentGroupId: group.id,
                                    })
                                  }
                                  className="p-1 text-[#AAA49B] hover:text-rose-400 bg-[#121110] border border-[rgba(242,238,231,0.06)] hover:border-rose-500/50 transition-colors rounded-sm cursor-pointer"
                                  title="Delete option"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ==============================================================================
          MODAL A: CREATE / EDIT GROUP
          ============================================================================== */}
      <AnimatePresence>
        {isGroupModalOpen && (
          <div
            data-lenis-prevent
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <motion.div
              data-lenis-prevent
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#121110] border border-[rgba(242,238,231,0.12)] w-full max-w-lg max-h-[90vh] overflow-y-auto overscroll-contain p-6 sm:p-7 shadow-2xl space-y-5 rounded-sm relative font-sans text-xs"
            >
              <div className="flex items-center justify-between pb-3 border-b border-[rgba(242,238,231,0.06)]">
                <div>
                  <span className="text-[9px] uppercase tracking-[0.25em] text-[#BFA27A] font-semibold block">
                    {groupModalMode === "create" ? "NEW CUSTOMIZATION STEP" : "EDIT STEP CONFIGURATION"}
                  </span>
                  <h3 className="font-serif text-xl text-[#F2EEE7]">
                    {groupModalMode === "create" ? "Add Builder Group" : `Edit ${groupFormData.name}`}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsGroupModalOpen(false)}
                  className="p-1.5 text-[#777169] hover:text-[#F2EEE7] transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {groupFormError && (
                <div className="bg-rose-950/40 border border-rose-500/40 p-3 text-rose-300 text-xs flex items-center space-x-2 rounded-sm">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{groupFormError}</span>
                </div>
              )}

              <form onSubmit={handleSaveGroup} className="space-y-4">
                {/* Name */}
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-[#777169] mb-1 font-medium">
                    Group Name <span className="text-[#BFA27A]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={groupFormData.name}
                    onChange={(e) => {
                      const val = e.target.value;
                      setGroupFormData((prev) => ({
                        ...prev,
                        name: val,
                        slug: groupModalMode === "create" && !prev.slugEdited ? generateSlug(val) : prev.slug,
                      }));
                    }}
                    placeholder="e.g. Size, Fragrance Profile, Notes, Intensity"
                    className="w-full bg-[#0D0D0C] border border-[rgba(242,238,231,0.12)] focus:border-[#BFA27A] text-sm font-sans text-[#F2EEE7] px-3.5 py-2.5 outline-none rounded-sm"
                  />
                </div>

                {/* Slug */}
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-[#777169] mb-1 font-medium">
                    Slug Identifier <span className="text-[#BFA27A]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={groupFormData.slug}
                    onChange={(e) =>
                      setGroupFormData((prev) => ({
                        ...prev,
                        slug: generateSlug(e.target.value),
                        slugEdited: true,
                      }))
                    }
                    placeholder="e.g. size, fragrance-profile, notes"
                    className="w-full bg-[#0D0D0C] border border-[rgba(242,238,231,0.12)] focus:border-[#BFA27A] text-sm font-mono text-[#F2EEE7] px-3.5 py-2.5 outline-none rounded-sm"
                  />
                  <p className="text-[10px] text-[#777169] mt-0.5">
                    Used internally and in database order snapshots. Must be unique.
                  </p>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-[#777169] mb-1 font-medium">
                    Customer Hint / Description
                  </label>
                  <textarea
                    rows={2}
                    value={groupFormData.description}
                    onChange={(e) =>
                      setGroupFormData((prev) => ({ ...prev, description: e.target.value }))
                    }
                    placeholder="e.g. Select the bottle volume that suits your ritual."
                    className="w-full bg-[#0D0D0C] border border-[rgba(242,238,231,0.12)] focus:border-[#BFA27A] text-sm font-sans text-[#F2EEE7] p-3 outline-none rounded-sm resize-none"
                  />
                </div>

                {/* Selection Type & Required Toggle */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-[#777169] mb-1 font-medium">
                      Selection Type
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setGroupFormData((prev) => ({
                            ...prev,
                            selection_type: "single",
                            max_selections: 1,
                          }))
                        }
                        className={`py-2 px-2 text-xs uppercase tracking-wider rounded-sm text-center cursor-pointer transition-all ${
                          groupFormData.selection_type === "single"
                            ? "bg-[#BFA27A] text-[#0D0D0C] font-semibold"
                            : "bg-[#0D0D0C] text-[#AAA49B] border border-[rgba(242,238,231,0.1)]"
                        }`}
                      >
                        Single
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setGroupFormData((prev) => ({
                            ...prev,
                            selection_type: "multiple",
                            max_selections: Math.max(2, prev.max_selections),
                          }))
                        }
                        className={`py-2 px-2 text-xs uppercase tracking-wider rounded-sm text-center cursor-pointer transition-all ${
                          groupFormData.selection_type === "multiple"
                            ? "bg-[#BFA27A] text-[#0D0D0C] font-semibold"
                            : "bg-[#0D0D0C] text-[#AAA49B] border border-[rgba(242,238,231,0.1)]"
                        }`}
                      >
                        Multiple
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-[#777169] mb-1 font-medium">
                      Requirement
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setGroupFormData((prev) => ({
                            ...prev,
                            is_required: true,
                            min_selections: Math.max(1, prev.min_selections),
                          }))
                        }
                        className={`py-2 px-2 text-xs uppercase tracking-wider rounded-sm text-center cursor-pointer transition-all ${
                          groupFormData.is_required
                            ? "bg-[#BFA27A] text-[#0D0D0C] font-semibold"
                            : "bg-[#0D0D0C] text-[#AAA49B] border border-[rgba(242,238,231,0.1)]"
                        }`}
                      >
                        Required
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setGroupFormData((prev) => ({
                            ...prev,
                            is_required: false,
                            min_selections: 0,
                          }))
                        }
                        className={`py-2 px-2 text-xs uppercase tracking-wider rounded-sm text-center cursor-pointer transition-all ${
                          !groupFormData.is_required
                            ? "bg-[#BFA27A] text-[#0D0D0C] font-semibold"
                            : "bg-[#0D0D0C] text-[#AAA49B] border border-[rgba(242,238,231,0.1)]"
                        }`}
                      >
                        Optional
                      </button>
                    </div>
                  </div>
                </div>

                {/* Min / Max Selections */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-[#777169] mb-1 font-medium">
                      Min Selections
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={groupFormData.min_selections}
                      onChange={(e) =>
                        setGroupFormData((prev) => ({
                          ...prev,
                          min_selections: Math.max(0, parseInt(e.target.value, 10) || 0),
                        }))
                      }
                      className="w-full bg-[#0D0D0C] border border-[rgba(242,238,231,0.12)] focus:border-[#BFA27A] text-sm font-sans text-[#F2EEE7] px-3.5 py-2 outline-none rounded-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-[#777169] mb-1 font-medium">
                      Max Selections
                    </label>
                    <input
                      type="number"
                      min="1"
                      disabled={groupFormData.selection_type === "single"}
                      value={groupFormData.selection_type === "single" ? 1 : groupFormData.max_selections}
                      onChange={(e) =>
                        setGroupFormData((prev) => ({
                          ...prev,
                          max_selections: Math.max(1, parseInt(e.target.value, 10) || 1),
                        }))
                      }
                      className="w-full bg-[#0D0D0C] border border-[rgba(242,238,231,0.12)] focus:border-[#BFA27A] text-sm font-sans text-[#F2EEE7] px-3.5 py-2 outline-none rounded-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>

                {/* Active Checkbox */}
                <div className="pt-2 flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="groupActiveCheck"
                    checked={groupFormData.is_active}
                    onChange={(e) =>
                      setGroupFormData((prev) => ({ ...prev, is_active: e.target.checked }))
                    }
                    className="w-4 h-4 accent-[#BFA27A] cursor-pointer"
                  />
                  <label
                    htmlFor="groupActiveCheck"
                    className="text-xs text-[#F2EEE7] cursor-pointer select-none font-medium"
                  >
                    Group is Active on Storefront
                  </label>
                </div>

                {/* Modal Buttons */}
                <div className="pt-3 flex items-center justify-end space-x-3 border-t border-[rgba(242,238,231,0.06)]">
                  <button
                    type="button"
                    onClick={() => setIsGroupModalOpen(false)}
                    className="px-4 py-2.5 text-xs uppercase tracking-wider text-[#AAA49B] hover:text-[#F2EEE7] transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingGroup}
                    className="bg-[#BFA27A] hover:bg-[#D4BA94] text-[#0D0D0C] px-5 py-2.5 text-xs uppercase font-sans tracking-[0.16em] font-semibold transition-colors cursor-pointer rounded-sm disabled:opacity-50 flex items-center space-x-2"
                  >
                    {isSubmittingGroup ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <span>Save Group</span>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ==============================================================================
          MODAL B: CREATE / EDIT OPTION
          ============================================================================== */}
      <AnimatePresence>
        {isOptionModalOpen && (
          <div
            data-lenis-prevent
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <motion.div
              data-lenis-prevent
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#121110] border border-[rgba(242,238,231,0.12)] w-full max-w-lg max-h-[90vh] overflow-y-auto overscroll-contain p-6 sm:p-7 shadow-2xl space-y-5 rounded-sm relative font-sans text-xs"
            >
              <div className="flex items-center justify-between pb-3 border-b border-[rgba(242,238,231,0.06)]">
                <div>
                  <span className="text-[9px] uppercase tracking-[0.25em] text-[#BFA27A] font-semibold block">
                    {optionModalMode === "create" ? "NEW CUSTOMIZATION OPTION" : "EDIT OPTION CONFIGURATION"}
                  </span>
                  <h3 className="font-serif text-xl text-[#F2EEE7]">
                    {optionModalMode === "create" ? "Add Option" : `Edit ${optionFormData.name}`}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOptionModalOpen(false)}
                  className="p-1.5 text-[#777169] hover:text-[#F2EEE7] transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {optionFormError && (
                <div className="bg-rose-950/40 border border-rose-500/40 p-3 text-rose-300 text-xs flex items-center space-x-2 rounded-sm">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{optionFormError}</span>
                </div>
              )}

              <form onSubmit={handleSaveOption} className="space-y-4">
                {/* Option Name */}
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-[#777169] mb-1 font-medium">
                    Option Name <span className="text-[#BFA27A]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={optionFormData.name}
                    onChange={(e) => {
                      const val = e.target.value;
                      setOptionFormData((prev) => ({
                        ...prev,
                        name: val,
                        slug: optionModalMode === "create" && !prev.slugEdited ? generateSlug(val) : prev.slug,
                      }));
                    }}
                    placeholder="e.g. 50ml, Woody, Vanilla, Aged Oud"
                    className="w-full bg-[#0D0D0C] border border-[rgba(242,238,231,0.12)] focus:border-[#BFA27A] text-sm font-sans text-[#F2EEE7] px-3.5 py-2.5 outline-none rounded-sm"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Slug */}
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-[#777169] mb-1 font-medium">
                      Slug <span className="text-[#BFA27A]">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={optionFormData.slug}
                      onChange={(e) =>
                        setOptionFormData((prev) => ({
                          ...prev,
                          slug: generateSlug(e.target.value),
                          slugEdited: true,
                        }))
                      }
                      placeholder="e.g. 50ml, woody, vanilla"
                      className="w-full bg-[#0D0D0C] border border-[rgba(242,238,231,0.12)] focus:border-[#BFA27A] text-sm font-mono text-[#F2EEE7] px-3 py-2 outline-none rounded-sm"
                    />
                  </div>

                  {/* Category / Sub-Grouping */}
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-[#777169] mb-1 font-medium">
                      Category Tag <span className="text-[#777169] lowercase font-light">(optional)</span>
                    </label>
                    <input
                      type="text"
                      value={optionFormData.category}
                      onChange={(e) =>
                        setOptionFormData((prev) => ({ ...prev, category: e.target.value }))
                      }
                      placeholder="e.g. Top Notes, Base Notes"
                      className="w-full bg-[#0D0D0C] border border-[rgba(242,238,231,0.12)] focus:border-[#BFA27A] text-sm font-sans text-[#F2EEE7] px-3 py-2 outline-none rounded-sm"
                    />
                  </div>
                </div>

                {/* Price Adjustment */}
                <div className="p-3.5 bg-[#0D0D0C] border border-[rgba(242,238,231,0.08)] rounded-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-[10px] uppercase tracking-wider text-[#BFA27A] font-medium">
                      Price Adjustment (PKR) <span className="text-[#BFA27A]">*</span>
                    </label>
                    <span className="text-[10px] font-mono text-[#AAA49B]">Additive Delta</span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-base text-[#BFA27A] font-semibold">+ PKR</span>
                    <input
                      type="number"
                      required
                      min="0"
                      step="1"
                      value={optionFormData.price_adjustment}
                      onChange={(e) =>
                        setOptionFormData((prev) => ({
                          ...prev,
                          price_adjustment: Math.max(0, parseInt(e.target.value, 10) || 0),
                        }))
                      }
                      placeholder="0"
                      className="w-full bg-[#121110] border border-[rgba(242,238,231,0.12)] focus:border-[#BFA27A] text-sm font-sans text-[#F2EEE7] px-3 py-2 outline-none rounded-sm"
                    />
                  </div>
                  <p className="text-[10.5px] text-[#777169] font-light leading-relaxed">
                    Set to 0 if this option is included in the base price. Otherwise, specify the exact incremental amount in PKR (e.g. 300 adds PKR 300 to the total).
                  </p>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-[#777169] mb-1 font-medium">
                    Description <span className="text-[#777169] lowercase font-light">(optional)</span>
                  </label>
                  <textarea
                    rows={2}
                    value={optionFormData.description}
                    onChange={(e) =>
                      setOptionFormData((prev) => ({ ...prev, description: e.target.value }))
                    }
                    placeholder="e.g. Deep, warm and intoxicating aged oud from Assam."
                    className="w-full bg-[#0D0D0C] border border-[rgba(242,238,231,0.12)] focus:border-[#BFA27A] text-sm font-sans text-[#F2EEE7] p-2.5 outline-none rounded-sm resize-none"
                  />
                </div>

                {/* Visual / Image Upload */}
                <div className="space-y-2">
                  <label className="block text-[10px] uppercase tracking-wider text-[#777169] font-medium">
                    Option Thumbnail Image <span className="text-[#777169] lowercase font-light">(optional)</span>
                  </label>

                  <div className="flex items-center space-x-3">
                    <div className="w-16 h-16 bg-[#0D0D0C] border border-[rgba(242,238,231,0.12)] rounded-sm overflow-hidden flex items-center justify-center shrink-0">
                      {optionFormData.image_url ? (
                        <img
                          src={optionFormData.image_url}
                          alt="Option Preview"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <ImageIcon className="w-6 h-6 text-[#777169]" />
                      )}
                    </div>

                    <div className="space-y-1.5 grow">
                      <div className="flex items-center space-x-2">
                        <label
                          htmlFor={fileInputId}
                          className="inline-flex items-center space-x-1.5 bg-[#181714] border border-[rgba(242,238,231,0.14)] hover:border-[#BFA27A] text-[#F2EEE7] px-3 py-1.5 text-[10px] uppercase font-sans tracking-wider rounded-sm cursor-pointer transition-colors"
                        >
                          {isUploadingImage ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#BFA27A]" />
                              <span>Uploading...</span>
                            </>
                          ) : (
                            <>
                              <Upload className="w-3.5 h-3.5" />
                              <span>Upload Visual</span>
                            </>
                          )}
                        </label>
                        <input
                          id={fileInputId}
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/avif"
                          disabled={isUploadingImage}
                          onChange={handleImageFileChange}
                          className="hidden"
                        />

                        {optionFormData.image_url && (
                          <button
                            type="button"
                            onClick={handleRemoveOptionImage}
                            className="text-rose-400 hover:text-rose-300 text-[10px] uppercase tracking-wider underline cursor-pointer"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                      <p className="text-[10px] text-[#777169]">
                        JPEG, PNG, WebP or AVIF (max 5MB). Uploads to product-images storage.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Active Checkbox */}
                <div className="pt-2 flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="optionActiveCheck"
                    checked={optionFormData.is_active}
                    onChange={(e) =>
                      setOptionFormData((prev) => ({ ...prev, is_active: e.target.checked }))
                    }
                    className="w-4 h-4 accent-[#BFA27A] cursor-pointer"
                  />
                  <label
                    htmlFor="optionActiveCheck"
                    className="text-xs text-[#F2EEE7] cursor-pointer select-none font-medium"
                  >
                    Option is Active & Selectable by Customers
                  </label>
                </div>

                {/* Modal Buttons */}
                <div className="pt-3 flex items-center justify-end space-x-3 border-t border-[rgba(242,238,231,0.06)]">
                  <button
                    type="button"
                    onClick={() => setIsOptionModalOpen(false)}
                    className="px-4 py-2.5 text-xs uppercase tracking-wider text-[#AAA49B] hover:text-[#F2EEE7] transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingOption || isUploadingImage}
                    className="bg-[#BFA27A] hover:bg-[#D4BA94] text-[#0D0D0C] px-5 py-2.5 text-xs uppercase font-sans tracking-[0.16em] font-semibold transition-colors cursor-pointer rounded-sm disabled:opacity-50 flex items-center space-x-2"
                  >
                    {isSubmittingOption ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <span>Save Option</span>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ==============================================================================
          MODAL C: DELETE CONFIRMATION DIALOG
          ============================================================================== */}
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
              className="bg-[#121110] border border-rose-500/30 w-full max-w-md max-h-[90vh] overflow-y-auto overscroll-contain p-6 sm:p-7 shadow-2xl space-y-4 rounded-sm font-sans text-xs"
            >
              <div className="flex items-center space-x-3 text-rose-400">
                <div className="w-10 h-10 rounded-full bg-rose-950/40 border border-rose-500/40 flex items-center justify-center shrink-0">
                  <ShieldAlert className="w-5 h-5 stroke-[1.5]" />
                </div>
                <div>
                  <h3 className="font-serif text-lg text-[#F2EEE7]">
                    {deleteTarget.type === "group" ? "Delete Builder Group?" : "Delete Option?"}
                  </h3>
                  <span className="text-[10px] uppercase font-mono tracking-wider text-rose-400">
                    Irreversible Operation
                  </span>
                </div>
              </div>

              <p className="text-xs text-[#AAA49B] font-light leading-relaxed">
                {deleteTarget.type === "group" ? (
                  <>
                    Are you sure you want to delete <strong className="text-[#F2EEE7]">"{deleteTarget.item.name}"</strong>?{" "}
                    <span className="text-rose-300 font-medium">
                      All options configured within this group will also be permanently deleted.
                    </span>
                  </>
                ) : (
                  <>
                    Are you sure you want to delete the option{" "}
                    <strong className="text-[#F2EEE7]">"{deleteTarget.item.name}"</strong>?
                  </>
                )}
              </p>

              <div className="pt-3 flex items-center justify-end space-x-3 border-t border-[rgba(242,238,231,0.06)]">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setDeleteTarget(null)}
                  className="px-4 py-2 text-xs uppercase tracking-wider text-[#AAA49B] hover:text-[#F2EEE7] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={handleConfirmDelete}
                  className="bg-rose-950 text-rose-200 border border-rose-500/50 hover:bg-rose-900/60 px-5 py-2 text-xs uppercase tracking-wider font-semibold rounded-sm transition-colors cursor-pointer flex items-center space-x-2"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <span>Confirm Delete</span>
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
