import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import {
  Sparkles,
  Upload,
  Image as ImageIcon,
  Save,
  RotateCcw,
  Check,
  AlertCircle,
  Eye,
  Monitor,
  Smartphone,
  ExternalLink,
  ArrowRight,
  Loader2,
  Trash2,
  Plus,
  Layers,
  HelpCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  getHeroSettings,
  saveHeroSettings,
  uploadHeroImage,
  deleteHeroImage,
  DEFAULT_HERO_SETTINGS,
  DEFAULT_HERO_SLIDES,
  normalizeSingleSlide,
} from "../../services/heroSettings";

export default function AdminHeroManagement() {
  // Saved server/DB state
  const [savedSettings, setSavedSettings] = useState(DEFAULT_HERO_SETTINGS);
  // Working draft state with slides array
  const [formData, setFormData] = useState(DEFAULT_HERO_SETTINGS);
  // Currently active slide index for editing
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingDesktop, setIsUploadingDesktop] = useState(false);
  const [isUploadingMobile, setIsUploadingMobile] = useState(false);
  const [notification, setNotification] = useState(null); // { type, message }

  // Preview Mode: 'desktop' | 'mobile'
  const [previewDevice, setPreviewDevice] = useState("desktop");

  const desktopFileInputRef = useRef(null);
  const mobileFileInputRef = useRef(null);

  // Load existing hero settings on mount
  useEffect(() => {
    async function loadSettings() {
      setIsLoading(true);
      try {
        const { data } = await getHeroSettings();
        if (data && Array.isArray(data.slides)) {
          setSavedSettings(data);
          setFormData(data);
        }
      } catch (err) {
        console.error("Error loading hero settings:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadSettings();
  }, []);

  // Safe active slide
  const slides = formData.slides || [];
  const currentSlide = slides[activeSlideIndex] || slides[0] || DEFAULT_HERO_SLIDES[0];

  // Check if there are unsaved changes
  const hasUnsavedChanges =
    JSON.stringify(formData) !== JSON.stringify(savedSettings);

  // Helper to update active slide field
  const handleActiveSlideChange = (field, value) => {
    setFormData((prev) => {
      const updatedSlides = [...(prev.slides || [])];
      if (!updatedSlides[activeSlideIndex]) {
        updatedSlides[activeSlideIndex] = { ...DEFAULT_HERO_SLIDES[0] };
      }
      updatedSlides[activeSlideIndex] = {
        ...updatedSlides[activeSlideIndex],
        [field]: value,
      };
      return {
        ...prev,
        slides: updatedSlides,
      };
    });
  };

  // Add a new slide to the carousel
  const handleAddSlide = () => {
    const newSlideNumber = slides.length + 1;
    const newSlide = normalizeSingleSlide({
      id: `slide-${Date.now()}`,
      eyebrow: `SCENTÉ — EDITION 0${newSlideNumber}`,
      badge: "EXTRAIT DE PARFUM",
      headline_line1: "DISCOVER",
      headline_line2: "THE",
      headline_line3: "COLLECTION.",
      subtitle: "Handcrafted pure perfume oils formulated in Pakistan for extraordinary endurance.",
      cta_text: "EXPLORE FRAGRANCES",
      cta_link: "/shop",
      image_url: "/images/campaign/hero-campaign-main.jpg",
      mobile_image_url: "",
    });

    setFormData((prev) => ({
      ...prev,
      slides: [...(prev.slides || []), newSlide],
    }));

    setActiveSlideIndex(slides.length);
    setNotification({
      type: "info",
      message: `Slide 0${newSlideNumber} added. Upload your photo and click 'Save Changes' to publish.`,
    });
  };

  // Delete an existing slide / image from the hero carousel
  const handleDeleteSlide = async (indexToDelete, e) => {
    e?.stopPropagation();

    if (slides.length <= 1) {
      alert("At least 1 hero banner is required. To replace this image, use the 'Replace Image' button below.");
      return;
    }

    const targetSlide = slides[indexToDelete];
    const confirmDelete = window.confirm(
      `Are you sure you want to DELETE Slide 0${indexToDelete + 1} (${targetSlide.headline_line1 || "Hero"} Banner)? It will be permanently removed from your homepage carousel.`
    );

    if (!confirmDelete) return;

    // If it had a Supabase storage path, clean it up
    if (targetSlide.storage_path) {
      try {
        await deleteHeroImage(targetSlide.storage_path);
      } catch (err) {}
    }
    if (targetSlide.mobile_storage_path) {
      try {
        await deleteHeroImage(targetSlide.mobile_storage_path);
      } catch (err) {}
    }

    const updatedSlides = slides.filter((_, idx) => idx !== indexToDelete);

    setFormData((prev) => ({
      ...prev,
      slides: updatedSlides,
    }));

    // Adjust active index
    if (activeSlideIndex >= updatedSlides.length) {
      setActiveSlideIndex(Math.max(0, updatedSlides.length - 1));
    } else if (activeSlideIndex === indexToDelete) {
      setActiveSlideIndex(Math.max(0, indexToDelete - 1));
    }

    setNotification({
      type: "success",
      message: `Slide 0${indexToDelete + 1} deleted! Click 'SAVE CHANGES' to update your homepage.`,
    });
  };

  // Upload Desktop Image for active slide
  const handleDesktopImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingDesktop(true);
    setNotification(null);

    try {
      const { url, path, error } = await uploadHeroImage(file, "desktop");
      if (error) throw error;

      handleActiveSlideChange("image_url", url);
      handleActiveSlideChange("storage_path", path);

      setNotification({
        type: "success",
        message: "New image uploaded! Click 'Save Changes' to publish to homepage.",
      });
    } catch (err) {
      setNotification({
        type: "error",
        message: err.message || "Failed to upload image. Please check format & size (<5MB).",
      });
    } finally {
      setIsUploadingDesktop(false);
      if (desktopFileInputRef.current) desktopFileInputRef.current.value = "";
    }
  };

  // Upload Mobile Image for active slide
  const handleMobileImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingMobile(true);
    setNotification(null);

    try {
      const { url, path, error } = await uploadHeroImage(file, "mobile");
      if (error) throw error;

      handleActiveSlideChange("mobile_image_url", url);
      handleActiveSlideChange("mobile_storage_path", path);

      setNotification({
        type: "success",
        message: "Mobile portrait image uploaded! Click 'Save Changes' to publish.",
      });
    } catch (err) {
      setNotification({
        type: "error",
        message: err.message || "Failed to upload mobile image (<5MB).",
      });
    } finally {
      setIsUploadingMobile(false);
      if (mobileFileInputRef.current) mobileFileInputRef.current.value = "";
    }
  };

  // Save changes to Supabase & LocalStorage
  const handleSave = async (e) => {
    e?.preventDefault();
    setIsSaving(true);
    setNotification(null);

    try {
      const { data, error } = await saveHeroSettings(formData);
      if (error && !data) throw error;

      if (data) {
        setSavedSettings(data);
        setFormData(data);
      }

      setNotification({
        type: "success",
        message: "Hero section published! Homepage carousel updated in real-time.",
      });

      setTimeout(() => {
        setNotification((prev) => (prev?.type === "success" ? null : prev));
      }, 5000);
    } catch (err) {
      setNotification({
        type: "error",
        message: err.message || "Failed to publish hero section changes.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Cancel / Revert edits to last saved state
  const handleRevert = () => {
    setFormData(savedSettings);
    setActiveSlideIndex(0);
    setNotification({
      type: "info",
      message: "Unsaved changes reverted to published state.",
    });
    setTimeout(() => setNotification(null), 3000);
  };

  // Reset to Atelier Default 3 slides
  const handleResetToDefault = () => {
    if (window.confirm("Reset hero section to the original 3 SCENTÉ campaign slides?")) {
      setFormData(DEFAULT_HERO_SETTINGS);
      setActiveSlideIndex(0);
    }
  };

  if (isLoading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-[#BFA27A]" />
        <span className="text-xs uppercase font-sans tracking-[0.24em] text-[#AAA49B]">
          LOADING HERO SLIDES & IMAGES...
        </span>
      </div>
    );
  }

  const activeDisplayImage =
    previewDevice === "mobile" && currentSlide.mobile_image_url
      ? currentSlide.mobile_image_url
      : currentSlide.image_url;

  return (
    <div className="space-y-8 pb-20">
      {/* 1. TOP HEADER & ACTION BUTTONS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/[0.08]">
        <div>
          <div className="flex items-center space-x-2.5 mb-1.5">
            <span className="text-[10px] uppercase font-sans tracking-[0.26em] text-[#BFA27A] font-semibold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              FRONT-OF-HOUSE EDITORIAL
            </span>
            {hasUnsavedChanges && (
              <span className="px-2 py-0.5 rounded-full text-[9px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/30">
                UNSAVED CHANGES
              </span>
            )}
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl text-[#F2EEE7] font-normal tracking-wide">
            Hero Section Management
          </h1>
          <p className="text-xs sm:text-sm font-sans text-[#AAA49B] font-light mt-1">
            Manage, replace, or delete your existing hero carousel slides, campaign imagery, and text.
          </p>
        </div>

        {/* Global Toolbar Actions */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleRevert}
            disabled={!hasUnsavedChanges || isSaving}
            className="px-4 py-2.5 rounded-lg border border-white/10 text-[#AAA49B] hover:text-[#F2EEE7] hover:border-white/20 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-sans uppercase tracking-[0.16em] transition-colors flex items-center gap-2 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Cancel</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || !hasUnsavedChanges}
            className="px-5 py-2.5 rounded-lg bg-[#BFA27A] hover:bg-[#D4BA94] text-[#0D0D0C] disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-xs font-sans uppercase tracking-[0.18em] transition-all shadow-[0_4px_20px_rgba(191,162,122,0.25)] flex items-center gap-2 cursor-pointer"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>SAVING...</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>SAVE CHANGES</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* NOTIFICATION BANNER */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`p-4 rounded-xl border text-xs font-sans flex items-center justify-between gap-3 ${
              notification.type === "success"
                ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-300"
                : notification.type === "error"
                ? "bg-rose-950/40 border-rose-500/40 text-rose-300"
                : "bg-[#181714] border-white/10 text-[#D4CEC5]"
            }`}
          >
            <div className="flex items-center gap-2.5">
              {notification.type === "success" ? (
                <Check className="w-4 h-4 shrink-0 text-emerald-400" />
              ) : notification.type === "error" ? (
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              ) : (
                <HelpCircle className="w-4 h-4 shrink-0 text-[#BFA27A]" />
              )}
              <span>{notification.message}</span>
            </div>
            <button
              onClick={() => setNotification(null)}
              className="text-white/60 hover:text-white text-xs underline cursor-pointer"
            >
              Dismiss
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===================================================================
          2. SLIDES CAROUSEL MANAGER (LIST, SELECT, DELETE & ADD SLIDES)
          =================================================================== */}
      <div className="p-6 rounded-2xl bg-[#121110] border border-white/[0.08] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/[0.06]">
          <div className="flex items-center space-x-2">
            <Layers className="w-4 h-4 text-[#BFA27A]" />
            <h2 className="font-serif text-lg text-[#F2EEE7] font-normal">
              Active Hero Slides ({slides.length})
            </h2>
          </div>
          <span className="text-[11px] font-sans text-[#AAA49B]">
            Click a slide to edit. Click <strong className="text-rose-400">Delete (🗑️)</strong> to permanently remove any existing image.
          </span>
        </div>

        {/* Horizontal Carousel Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pt-1">
          {slides.map((slide, idx) => {
            const isSelected = idx === activeSlideIndex;
            return (
              <div
                key={slide.id || idx}
                onClick={() => setActiveSlideIndex(idx)}
                className={`relative rounded-xl overflow-hidden border p-3 flex flex-col justify-between transition-all duration-300 cursor-pointer group select-none ${
                  isSelected
                    ? "bg-[#1C1B18] border-[#BFA27A] shadow-[0_0_20px_rgba(191,162,122,0.15)] ring-1 ring-[#BFA27A]"
                    : "bg-[#161513] border-white/10 hover:border-white/25 hover:bg-[#1A1916]"
                }`}
              >
                {/* Thumbnail Image */}
                <div className="relative aspect-[16/9] rounded-lg overflow-hidden bg-black border border-white/10 mb-2.5">
                  <img
                    src={slide.image_url}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 left-2">
                    <span className="text-[9px] uppercase font-mono font-semibold px-2 py-0.5 rounded bg-black/80 backdrop-blur-md text-[#BFA27A] border border-white/10">
                      0{idx + 1}
                    </span>
                  </div>

                  {/* Red Delete Slide Button */}
                  <button
                    type="button"
                    onClick={(e) => handleDeleteSlide(idx, e)}
                    className="absolute top-2 right-2 w-7 h-7 rounded-md bg-rose-950/90 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 flex items-center justify-center transition-all shadow-md cursor-pointer group/btn"
                    title={`Delete Slide 0${idx + 1} from Hero Carousel`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Info Text */}
                <div className="space-y-0.5">
                  <span className="text-[9.5px] uppercase font-sans tracking-wider text-[#BFA27A] truncate block font-medium">
                    {slide.eyebrow || `SCENTÉ SLIDE 0${idx + 1}`}
                  </span>
                  <h4 className="font-serif text-sm text-[#F2EEE7] truncate">
                    {slide.headline_line1} {slide.headline_line2}
                  </h4>
                </div>

                {/* Selected Pill Indicator */}
                <div className="pt-2 flex items-center justify-between text-[10px] uppercase font-sans tracking-wider">
                  <span className={isSelected ? "text-[#BFA27A] font-semibold" : "text-[#777169]"}>
                    {isSelected ? "● Currently Editing" : "Click to edit"}
                  </span>
                  {slides.length > 1 && (
                    <span
                      onClick={(e) => handleDeleteSlide(idx, e)}
                      className="text-rose-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      Delete
                    </span>
                  )}
                </div>
              </div>
            );
          })}

          {/* Add New Slide Button */}
          <button
            type="button"
            onClick={handleAddSlide}
            className="rounded-xl border border-dashed border-white/20 hover:border-[#BFA27A] bg-[#141312]/50 hover:bg-[#181714] p-6 flex flex-col items-center justify-center text-center space-y-2 text-[#AAA49B] hover:text-[#BFA27A] transition-all min-h-[160px] cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-full border border-white/20 group-hover:border-[#BFA27A] flex items-center justify-center transition-colors">
              <Plus className="w-5 h-5 text-[#BFA27A]" />
            </div>
            <span className="text-xs uppercase font-sans tracking-[0.16em] font-medium">
              + Add New Hero Slide
            </span>
            <span className="text-[10px] text-[#777169]">
              Add a new background image & copy
            </span>
          </button>
        </div>
      </div>

      {/* ===================================================================
          3. MAIN TWO-COLUMN SPLIT: ACTIVE SLIDE EDITOR & LIVE REAL-TIME PREVIEW
          =================================================================== */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        {/* ===================================================================
            LEFT COLUMN (XL:COL-SPAN-6): ACTIVE SLIDE CONTROLS
            =================================================================== */}
        <div className="xl:col-span-6 space-y-6">
          {/* SECTION A: HERO IMAGERY */}
          <div className="p-6 rounded-2xl bg-[#121110] border border-white/[0.08] space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.06]">
              <div className="flex items-center space-x-2">
                <ImageIcon className="w-4 h-4 text-[#BFA27A]" />
                <h2 className="font-serif text-lg text-[#F2EEE7] font-normal">
                  Slide 0{activeSlideIndex + 1} Image
                </h2>
              </div>
              <span className="text-[10px] font-sans uppercase tracking-[0.2em] text-[#777169]">
                MAX 5MB · WEBP / JPG / PNG
              </span>
            </div>

            {/* Desktop Background Image */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-sans font-medium uppercase tracking-[0.16em] text-[#D4CEC5]">
                  Desktop Background Image <span className="text-[#BFA27A]">*</span>
                </label>
                {slides.length > 1 && (
                  <button
                    type="button"
                    onClick={(e) => handleDeleteSlide(activeSlideIndex, e)}
                    className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1.5 underline cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete This Entire Slide</span>
                  </button>
                )}
              </div>

              <div className="relative rounded-xl overflow-hidden border border-white/10 bg-[#090908] group aspect-[16/8] flex items-center justify-center">
                {currentSlide.image_url ? (
                  <img
                    src={currentSlide.image_url}
                    alt="Desktop Hero Preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-center p-4">
                    <ImageIcon className="w-8 h-8 text-[#777169] mx-auto mb-2" />
                    <p className="text-xs text-[#AAA49B]">No desktop image selected</p>
                  </div>
                )}

                {/* Overlay Action Bar */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 backdrop-blur-xs">
                  <button
                    type="button"
                    onClick={() => desktopFileInputRef.current?.click()}
                    disabled={isUploadingDesktop}
                    className="px-4 py-2 rounded-lg bg-[#BFA27A] hover:bg-[#D4BA94] text-[#0D0D0C] text-xs font-semibold uppercase tracking-wider transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    {isUploadingDesktop ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Upload className="w-3.5 h-3.5" />
                    )}
                    <span>Replace Image</span>
                  </button>

                  {slides.length > 1 && (
                    <button
                      type="button"
                      onClick={(e) => handleDeleteSlide(activeSlideIndex, e)}
                      className="px-3.5 py-2 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 text-xs font-semibold uppercase tracking-wider transition-colors flex items-center gap-1.5 cursor-pointer"
                      title="Delete this slide from the hero section"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                      <span>Delete Slide</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Upload & Direct URL input row */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="file"
                  ref={desktopFileInputRef}
                  onChange={handleDesktopImageUpload}
                  accept="image/jpeg,image/png,image/webp,image/avif"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => desktopFileInputRef.current?.click()}
                  disabled={isUploadingDesktop}
                  className="px-4 py-2 rounded-lg bg-[#181714] hover:bg-[#201F1B] border border-white/10 text-xs font-sans text-[#F2EEE7] flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5 text-[#BFA27A]" />
                  <span>{isUploadingDesktop ? "Uploading..." : "Upload File"}</span>
                </button>

                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={currentSlide.image_url}
                    onChange={(e) => handleActiveSlideChange("image_url", e.target.value)}
                    placeholder="/images/campaign/hero-campaign-main.jpg or https://..."
                    className="w-full bg-[#181714] border border-white/10 rounded-lg px-3 py-2 text-xs font-mono text-[#AAA49B] focus:border-[#BFA27A] focus:text-[#F2EEE7] focus:outline-none transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Mobile Background Image (Optional) */}
            <div className="space-y-3 pt-3 border-t border-white/[0.06]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-3.5 h-3.5 text-[#BFA27A]" />
                  <label className="text-xs font-sans font-medium uppercase tracking-[0.16em] text-[#D4CEC5]">
                    Mobile Image (Optional Vertical)
                  </label>
                </div>
                <span className="text-[10px] font-sans text-[#777169]">
                  Defaults to desktop image if unset
                </span>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="file"
                  ref={mobileFileInputRef}
                  onChange={handleMobileImageUpload}
                  accept="image/jpeg,image/png,image/webp,image/avif"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => mobileFileInputRef.current?.click()}
                  disabled={isUploadingMobile}
                  className="px-4 py-2 rounded-lg bg-[#181714] hover:bg-[#201F1B] border border-white/10 text-xs font-sans text-[#F2EEE7] flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5 text-[#BFA27A]" />
                  <span>{isUploadingMobile ? "Uploading..." : "Upload Mobile"}</span>
                </button>

                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={currentSlide.mobile_image_url || ""}
                    onChange={(e) => handleActiveSlideChange("mobile_image_url", e.target.value)}
                    placeholder="Optional vertical image URL"
                    className="w-full bg-[#181714] border border-white/10 rounded-lg px-3 py-2 text-xs font-mono text-[#AAA49B] focus:border-[#BFA27A] focus:text-[#F2EEE7] focus:outline-none transition-colors"
                  />
                </div>

                {currentSlide.mobile_image_url && (
                  <button
                    type="button"
                    onClick={() => handleActiveSlideChange("mobile_image_url", "")}
                    className="p-2 text-[#777169] hover:text-rose-400 transition-colors cursor-pointer"
                    title="Remove mobile image"
                  >
                    <Trash2 className="w-4 h-4 text-rose-400" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* SECTION B: HERO HEADLINE & COPY */}
          <div className="p-6 rounded-2xl bg-[#121110] border border-white/[0.08] space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.06]">
              <h2 className="font-serif text-lg text-[#F2EEE7] font-normal">
                Slide 0{activeSlideIndex + 1} Headline & Copy
              </h2>
              <span className="text-[10px] font-sans uppercase tracking-[0.2em] text-[#BFA27A]">
                SCENTÉ ATELIER VOICE
              </span>
            </div>

            {/* Eyebrow & Badge row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-sans font-medium uppercase tracking-[0.16em] text-[#AAA49B]">
                  Introductory Eyebrow
                </label>
                <input
                  type="text"
                  value={currentSlide.eyebrow}
                  onChange={(e) => handleActiveSlideChange("eyebrow", e.target.value)}
                  placeholder="e.g. SCENTÉ — BATCH 04"
                  className="w-full bg-[#181714] border border-white/10 rounded-lg px-3.5 py-2.5 text-xs text-[#F2EEE7] focus:border-[#BFA27A] focus:outline-none transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-sans font-medium uppercase tracking-[0.16em] text-[#AAA49B]">
                  Pill Badge Text
                </label>
                <input
                  type="text"
                  value={currentSlide.badge}
                  onChange={(e) => handleActiveSlideChange("badge", e.target.value)}
                  placeholder="e.g. 30% PURE PERFUME OIL"
                  className="w-full bg-[#181714] border border-white/10 rounded-lg px-3.5 py-2.5 text-xs text-[#F2EEE7] focus:border-[#BFA27A] focus:outline-none transition-colors"
                />
              </div>
            </div>

            {/* 3-Line Headline Form */}
            <div className="space-y-3">
              <label className="text-[11px] font-sans font-medium uppercase tracking-[0.16em] text-[#AAA49B] block">
                Main Headline (3 Lines) <span className="text-[#BFA27A]">*</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <span className="text-[10px] font-mono text-[#777169] block mb-1">LINE 1</span>
                  <input
                    type="text"
                    value={currentSlide.headline_line1}
                    onChange={(e) => handleActiveSlideChange("headline_line1", e.target.value)}
                    placeholder="FRAGRANCE"
                    className="w-full bg-[#181714] border border-white/10 rounded-lg px-3 py-2 text-xs uppercase font-sans font-bold text-[#F2EEE7] focus:border-[#BFA27A] focus:outline-none"
                  />
                </div>

                <div>
                  <span className="text-[10px] font-mono text-[#777169] block mb-1">LINE 2</span>
                  <input
                    type="text"
                    value={currentSlide.headline_line2}
                    onChange={(e) => handleActiveSlideChange("headline_line2", e.target.value)}
                    placeholder="BECOMES"
                    className="w-full bg-[#181714] border border-white/10 rounded-lg px-3 py-2 text-xs uppercase font-sans font-bold text-[#F2EEE7] focus:border-[#BFA27A] focus:outline-none"
                  />
                </div>

                <div>
                  <span className="text-[10px] font-mono text-[#777169] block mb-1">LINE 3</span>
                  <input
                    type="text"
                    value={currentSlide.headline_line3}
                    onChange={(e) => handleActiveSlideChange("headline_line3", e.target.value)}
                    placeholder="IDENTITY."
                    className="w-full bg-[#181714] border border-white/10 rounded-lg px-3 py-2 text-xs uppercase font-sans font-bold text-[#EAE4DC] focus:border-[#BFA27A] focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Subtitle / Description */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-sans font-medium uppercase tracking-[0.16em] text-[#AAA49B]">
                Supporting Description / Subtitle
              </label>
              <textarea
                rows={3}
                value={currentSlide.subtitle}
                onChange={(e) => handleActiveSlideChange("subtitle", e.target.value)}
                placeholder="Artisanal fragrances crafted for presence, character and lasting impression."
                className="w-full bg-[#181714] border border-white/10 rounded-lg px-3.5 py-2.5 text-xs text-[#D4CEC5] font-light leading-relaxed focus:border-[#BFA27A] focus:outline-none resize-none transition-colors"
              />
            </div>
          </div>

          {/* SECTION C: CALL TO ACTION (CTA) BUTTON */}
          <div className="p-6 rounded-2xl bg-[#121110] border border-white/[0.08] space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.06]">
              <h2 className="font-serif text-lg text-[#F2EEE7] font-normal">
                Call to Action (CTA)
              </h2>
              <span className="text-[10px] font-sans uppercase tracking-[0.2em] text-[#777169]">
                PRIMARY BUTTON
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-sans font-medium uppercase tracking-[0.16em] text-[#AAA49B]">
                  Button Text <span className="text-[#BFA27A]">*</span>
                </label>
                <input
                  type="text"
                  value={currentSlide.cta_text}
                  onChange={(e) => handleActiveSlideChange("cta_text", e.target.value)}
                  placeholder="e.g. EXPLORE FRAGRANCES"
                  className="w-full bg-[#181714] border border-white/10 rounded-lg px-3.5 py-2.5 text-xs text-[#F2EEE7] font-semibold uppercase tracking-wider focus:border-[#BFA27A] focus:outline-none transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-sans font-medium uppercase tracking-[0.16em] text-[#AAA49B]">
                  Destination URL / Link <span className="text-[#BFA27A]">*</span>
                </label>
                <input
                  type="text"
                  value={currentSlide.cta_link}
                  onChange={(e) => handleActiveSlideChange("cta_link", e.target.value)}
                  placeholder="e.g. /shop or /product/grand-soiree"
                  className="w-full bg-[#181714] border border-white/10 rounded-lg px-3.5 py-2.5 text-xs font-mono text-[#F2EEE7] focus:border-[#BFA27A] focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between">
              <button
                type="button"
                onClick={handleResetToDefault}
                className="text-[11px] text-[#777169] hover:text-[#BFA27A] underline transition-colors cursor-pointer"
              >
                Reset all slides to SCENTÉ original default
              </button>

              <Link
                to="/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-[#AAA49B] hover:text-[#F2EEE7] flex items-center gap-1.5 transition-colors"
              >
                <span>Preview live storefront</span>
                <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </div>

        {/* ===================================================================
            RIGHT COLUMN (XL:COL-SPAN-6): LIVE REAL-TIME PREVIEW PANEL
            =================================================================== */}
        <div className="xl:col-span-6 space-y-4 xl:sticky xl:top-8">
          <div className="p-4 rounded-2xl bg-[#121110] border border-white/[0.08] space-y-4">
            {/* Preview Header & Device Switcher */}
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
              <div className="flex items-center space-x-2">
                <Eye className="w-4 h-4 text-[#BFA27A]" />
                <span className="font-serif text-sm text-[#F2EEE7]">
                  Previewing Slide 0{activeSlideIndex + 1}
                </span>
              </div>

              {/* Viewport Switcher */}
              <div className="flex items-center bg-[#181714] p-1 rounded-lg border border-white/10">
                <button
                  type="button"
                  onClick={() => setPreviewDevice("desktop")}
                  className={`px-3 py-1.5 rounded-md text-[10.5px] uppercase font-sans tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer ${
                    previewDevice === "desktop"
                      ? "bg-[#BFA27A] text-[#0D0D0C] font-semibold"
                      : "text-[#AAA49B] hover:text-[#F2EEE7]"
                  }`}
                >
                  <Monitor className="w-3.5 h-3.5" />
                  <span>Desktop</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPreviewDevice("mobile")}
                  className={`px-3 py-1.5 rounded-md text-[10.5px] uppercase font-sans tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer ${
                    previewDevice === "mobile"
                      ? "bg-[#BFA27A] text-[#0D0D0C] font-semibold"
                      : "text-[#AAA49B] hover:text-[#F2EEE7]"
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Mobile</span>
                </button>
              </div>
            </div>

            {/* LIVE PREVIEW CONTAINER */}
            <div className="flex justify-center bg-[#090908] p-2 sm:p-4 rounded-xl overflow-hidden border border-white/[0.06]">
              <div
                className={`relative overflow-hidden transition-all duration-300 rounded-xl border border-white/15 shadow-2xl select-none ${
                  previewDevice === "desktop"
                    ? "w-full aspect-[16/10] sm:aspect-[16/9]"
                    : "w-[280px] sm:w-[320px] aspect-[9/16]"
                }`}
              >
                {/* 1. Background Campaign Image */}
                <img
                  src={activeDisplayImage}
                  alt="Hero Preview"
                  className="absolute inset-0 w-full h-full object-cover object-center"
                />

                {/* 2. Gradient Overlays for High Legibility */}
                <div className="absolute inset-0 bg-gradient-to-r from-[#090908]/90 via-[#090908]/55 to-transparent pointer-events-none" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#090908] via-transparent to-black/30 pointer-events-none" />

                {/* 3. Real-Time Copy Typography */}
                <div className="relative z-10 w-full h-full flex flex-col justify-center p-4 sm:p-6 lg:p-8">
                  <div className="max-w-[85%] sm:max-w-[80%] space-y-2 sm:space-y-3">
                    {/* Eyebrow & Badge */}
                    <div className="flex flex-wrap items-center gap-2">
                      {currentSlide.eyebrow && (
                        <span className="text-[8px] sm:text-[9.5px] uppercase font-sans tracking-[0.2em] text-[#BFA27A] font-semibold truncate max-w-full">
                          {currentSlide.eyebrow}
                        </span>
                      )}
                      {currentSlide.eyebrow && currentSlide.badge && (
                        <span className="w-1 h-1 rounded-full bg-[#BFA27A]/60" />
                      )}
                      {currentSlide.badge && (
                        <span className="text-[7.5px] sm:text-[8.5px] uppercase font-sans tracking-[0.14em] text-[#AAA49B] font-medium">
                          {currentSlide.badge}
                        </span>
                      )}
                    </div>

                    {/* Main Headline */}
                    <h2
                      className={`font-sans font-bold leading-[0.96] text-[#F2EEE7] tracking-[-0.03em] uppercase drop-shadow-md ${
                        previewDevice === "mobile"
                          ? "text-lg sm:text-xl"
                          : "text-xl sm:text-2xl lg:text-3xl"
                      }`}
                    >
                      {currentSlide.headline_line1} <br />
                      {currentSlide.headline_line2} <br />
                      <span className="text-[#EAE4DC]">{currentSlide.headline_line3}</span>
                    </h2>

                    {/* Supporting Description */}
                    {currentSlide.subtitle && (
                      <p
                        className={`font-sans text-[#D4CEC5] font-light leading-relaxed line-clamp-3 ${
                          previewDevice === "mobile"
                            ? "text-[9.5px]"
                            : "text-[10.5px] sm:text-xs"
                        }`}
                      >
                        {currentSlide.subtitle}
                      </p>
                    )}

                    {/* CTA Button */}
                    {currentSlide.cta_text && (
                      <div className="pt-1 sm:pt-2">
                        <div className="inline-flex items-center justify-center px-4 py-2 sm:px-5 sm:py-2.5 rounded-full bg-[#F2EEE7] text-[#090908] text-[9.5px] sm:text-[11px] font-semibold uppercase tracking-[0.16em] shadow-lg">
                          <span>{currentSlide.cta_text}</span>
                          <ArrowRight className="w-3 h-3 ml-1.5" />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Slide index Watermark in Preview */}
                <div className="absolute bottom-2 right-3 pointer-events-none opacity-50">
                  <span className="text-[8px] font-mono text-white tracking-widest">
                    SLIDE 0{activeSlideIndex + 1} / 0{slides.length}
                  </span>
                </div>
              </div>
            </div>

            <div className="text-[11px] text-[#777169] text-center font-sans">
              Edits update the preview above in real time. Changes are published to live visitors when you click <strong className="text-[#F2EEE7]">Save Changes</strong>.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
