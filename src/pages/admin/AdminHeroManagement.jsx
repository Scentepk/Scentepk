import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import {
  Sparkles,
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
  Send,
  FileCheck,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  getHeroSettings,
  saveHeroDraft,
  publishHeroSettings,
  discardHeroDraft,
  uploadHeroImage,
  deleteHeroImage,
  DEFAULT_HERO_SETTINGS,
  DEFAULT_HERO_SLIDES,
  DEFAULT_CROP_SETTINGS,
  normalizeSingleSlide,
} from "../../services/heroSettings";
import HeroImageEditor from "../../components/admin/HeroImageEditor";

export default function AdminHeroManagement() {
  // Published server/DB state
  const [publishedSettings, setPublishedSettings] = useState(DEFAULT_HERO_SETTINGS);
  // Persisted draft state
  const [savedDraftSettings, setSavedDraftSettings] = useState(null);
  // Working draft in editor
  const [formData, setFormData] = useState(DEFAULT_HERO_SETTINGS);
  // Currently active slide index for editing
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);

  const [isLoading, setIsLoading] = useState(true);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isUploadingDesktop, setIsUploadingDesktop] = useState(false);
  const [isUploadingMobile, setIsUploadingMobile] = useState(false);
  const [notification, setNotification] = useState(null); // { type, message }

  // Preview Mode: 'desktop' | 'mobile'
  const [previewDevice, setPreviewDevice] = useState("desktop");

  // Load existing hero settings & draft on mount
  useEffect(() => {
    async function loadSettings() {
      setIsLoading(true);
      try {
        const { data, draft } = await getHeroSettings();
        if (data && Array.isArray(data.slides)) {
          setPublishedSettings(data);
        }

        if (draft && Array.isArray(draft) && draft.length > 0) {
          const draftPayload = { id: "primary_hero", slides: draft };
          setSavedDraftSettings(draftPayload);
          setFormData(draftPayload);
        } else if (data && Array.isArray(data.slides)) {
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

  // Compare active working form with published state
  const hasUnpublishedChanges =
    JSON.stringify(formData.slides) !== JSON.stringify(publishedSettings.slides);

  // Compare working form with last saved draft
  const hasUnsavedDraftEdits =
    savedDraftSettings
      ? JSON.stringify(formData.slides) !== JSON.stringify(savedDraftSettings.slides)
      : hasUnpublishedChanges;

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
      desktop_crop: { ...DEFAULT_CROP_SETTINGS, x: 70 },
      mobile_crop: { ...DEFAULT_CROP_SETTINGS, x: 50 },
    });

    setFormData((prev) => ({
      ...prev,
      slides: [...(prev.slides || []), newSlide],
    }));

    setActiveSlideIndex(slides.length);
    setNotification({
      type: "info",
      message: `Slide 0${newSlideNumber} added to working draft. Adjust crop/text and click 'Save Draft' or 'Publish Changes'.`,
    });
  };

  // Delete an existing slide / image from the hero carousel
  const handleDeleteSlide = async (indexToDelete, e) => {
    e?.stopPropagation();

    if (slides.length <= 1) {
      alert("At least 1 hero banner is required. To replace this image, use the image editor above.");
      return;
    }

    const targetSlide = slides[indexToDelete];
    const confirmDelete = window.confirm(
      `Are you sure you want to DELETE Slide 0${indexToDelete + 1} (${targetSlide.headline_line1 || "Hero"} Banner)? It will be removed from your carousel draft.`
    );

    if (!confirmDelete) return;

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
      message: `Slide 0${indexToDelete + 1} deleted from working draft! Remember to click 'Publish Changes' to update the live homepage.`,
    });
  };

  // Upload Image Handler passed to HeroImageEditor
  const handleUploadImage = async (file, type = "desktop") => {
    if (!file) return;

    if (type === "desktop") {
      setIsUploadingDesktop(true);
    } else {
      setIsUploadingMobile(true);
    }
    setNotification(null);

    try {
      const { url, path, error } = await uploadHeroImage(file, type);
      if (error) throw error;

      if (type === "desktop") {
        handleActiveSlideChange("image_url", url);
        handleActiveSlideChange("storage_path", path);
        setNotification({
          type: "success",
          message: "Desktop hero image uploaded! Drag on canvas to adjust framing.",
        });
      } else {
        handleActiveSlideChange("mobile_image_url", url);
        handleActiveSlideChange("mobile_storage_path", path);
        setNotification({
          type: "success",
          message: "Mobile portrait image uploaded! Adjust framing for smartphone patrons.",
        });
      }
    } catch (err) {
      setNotification({
        type: "error",
        message: err.message || "Failed to upload image (<5MB, JPG/PNG/WebP).",
      });
    } finally {
      if (type === "desktop") {
        setIsUploadingDesktop(false);
      } else {
        setIsUploadingMobile(false);
      }
    }
  };

  // 1. SAVE DRAFT (Safe, Does NOT affect live storefront)
  const handleSaveDraft = async () => {
    setIsSavingDraft(true);
    setNotification(null);

    try {
      const { data, error } = await saveHeroDraft(formData);
      if (error) throw error;

      setSavedDraftSettings({ id: "primary_hero", slides: data });
      setNotification({
        type: "success",
        message: "Draft saved! Changes are persisted safely in the admin workspace without altering the live website.",
      });

      setTimeout(() => {
        setNotification((prev) => (prev?.type === "success" ? null : prev));
      }, 5000);
    } catch (err) {
      setNotification({
        type: "error",
        message: err.message || "Failed to save hero draft.",
      });
    } finally {
      setIsSavingDraft(false);
    }
  };

  // 2. PUBLISH CHANGES (Pushes to live storefront immediately)
  const handlePublish = async (e) => {
    e?.preventDefault();
    setIsPublishing(true);
    setNotification(null);

    try {
      const { data, error } = await publishHeroSettings(formData);
      if (error && !data) throw error;

      if (data) {
        setPublishedSettings(data);
        setSavedDraftSettings(null); // Draft is now merged into published
        setFormData(data);
      }

      setNotification({
        type: "success",
        message: "Hero section published! Homepage carousel & positioning updated in real-time for all patrons.",
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
      setIsPublishing(false);
    }
  };

  // 3. DISCARD DRAFT / REVERT TO PUBLISHED
  const handleDiscardDraft = async () => {
    if (window.confirm("Discard all unpublished draft edits and revert to the currently live hero?")) {
      await discardHeroDraft();
      setFormData(publishedSettings);
      setSavedDraftSettings(null);
      setActiveSlideIndex(0);
      setNotification({
        type: "info",
        message: "Unpublished draft discarded. Restored live hero configuration.",
      });
      setTimeout(() => setNotification(null), 4000);
    }
  };

  // 4. RESET ALL SLIDES TO DEFAULT
  const handleResetToDefault = () => {
    if (window.confirm("Reset all hero slides to the original 3 SCENTÉ campaign slides?")) {
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

  // Active preview image & crop calculation
  const activeDisplayImage =
    previewDevice === "mobile" && currentSlide.mobile_image_url
      ? currentSlide.mobile_image_url
      : currentSlide.image_url;

  const activeDisplayCrop =
    previewDevice === "mobile"
      ? currentSlide.mobile_crop || DEFAULT_CROP_SETTINGS
      : currentSlide.desktop_crop || DEFAULT_CROP_SETTINGS;

  return (
    <div className="space-y-8 pb-20">
      {/* 1. TOP HEADER & WORKSPACE TOOLBAR ACTIONS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/[0.08]">
        <div>
          <div className="flex items-center space-x-2.5 mb-1.5">
            <span className="text-[10px] uppercase font-sans tracking-[0.26em] text-[#BFA27A] font-semibold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              FRONT-OF-HOUSE EDITORIAL CMS
            </span>

            {/* Status Pill Badge */}
            {hasUnpublishedChanges ? (
              <span className="px-2.5 py-0.5 rounded-full text-[9.5px] font-mono bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                DRAFT IN PROGRESS
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full text-[9.5px] font-mono bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                <FileCheck className="w-3 h-3 text-emerald-400" />
                ALL CHANGES PUBLISHED
              </span>
            )}
          </div>

          <h1 className="font-serif text-2xl sm:text-3xl text-[#F2EEE7] font-normal tracking-wide">
            Hero Section & Visual Image Editor
          </h1>
          <p className="text-xs sm:text-sm font-sans text-[#AAA49B] font-light mt-1">
            Frame desktop and mobile campaign visuals independently, adjust focal cropping, and publish when ready.
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          {/* Revert / Discard Draft Button */}
          {hasUnpublishedChanges && (
            <button
              type="button"
              onClick={handleDiscardDraft}
              disabled={isSavingDraft || isPublishing}
              className="px-3.5 py-2 rounded-lg border border-rose-500/30 hover:border-rose-500/60 text-rose-300 hover:text-white hover:bg-rose-950/40 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-sans uppercase tracking-[0.14em] transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Discard draft and restore currently published live hero"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Discard Draft</span>
            </button>
          )}

          {/* Save Draft Action Button */}
          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={isSavingDraft || isPublishing || !hasUnsavedDraftEdits}
            className="px-4 py-2 rounded-lg bg-[#1D1C19] hover:bg-[#252420] text-[#E0DCD3] hover:text-[#F2EEE7] border border-white/15 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-sans uppercase tracking-[0.16em] transition-colors flex items-center gap-2 cursor-pointer"
          >
            {isSavingDraft ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#BFA27A]" />
                <span>SAVING DRAFT...</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5 text-[#BFA27A]" />
                <span>Save Draft</span>
              </>
            )}
          </button>

          {/* Publish Changes Action Button */}
          <button
            type="button"
            onClick={handlePublish}
            disabled={isPublishing || !hasUnpublishedChanges}
            className="px-5 py-2 rounded-lg bg-[#BFA27A] hover:bg-[#D4BA94] text-[#0D0D0C] disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-xs font-sans uppercase tracking-[0.18em] transition-all shadow-[0_4px_20px_rgba(191,162,122,0.25)] flex items-center gap-2 cursor-pointer"
          >
            {isPublishing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>PUBLISHING...</span>
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span>PUBLISH CHANGES</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* NOTIFICATION TOAST BANNER */}
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
              Active Hero Carousel Slides ({slides.length})
            </h2>
          </div>
          <span className="text-[11px] font-sans text-[#AAA49B]">
            Select a slide card below to edit its visual crop or copy.
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
                {/* Thumbnail Image with Crop Applied */}
                <div className="relative aspect-[16/9] rounded-lg overflow-hidden bg-black border border-white/10 mb-2.5">
                  <img
                    src={slide.image_url}
                    alt=""
                    className="w-full h-full object-cover"
                    style={{
                      objectPosition: `${slide.desktop_crop?.x ?? 50}% ${slide.desktop_crop?.y ?? 50}%`,
                      transform: `scale(${slide.desktop_crop?.zoom ?? 1.0})`,
                      transformOrigin: `${slide.desktop_crop?.x ?? 50}% ${slide.desktop_crop?.y ?? 50}%`,
                    }}
                  />
                  <div className="absolute top-2 left-2">
                    <span className="text-[9px] uppercase font-mono font-semibold px-2 py-0.5 rounded bg-black/80 backdrop-blur-md text-[#BFA27A] border border-white/10">
                      0{idx + 1}
                    </span>
                  </div>

                  {/* Delete Slide Button */}
                  {slides.length > 1 && (
                    <button
                      type="button"
                      onClick={(e) => handleDeleteSlide(idx, e)}
                      className="absolute top-2 right-2 w-7 h-7 rounded-md bg-rose-950/90 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 flex items-center justify-center transition-all shadow-md cursor-pointer"
                      title={`Delete Slide 0${idx + 1} from Hero Carousel`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
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
                  {slide.mobile_image_url && (
                    <span className="text-[9px] font-mono text-emerald-400 bg-emerald-950/50 px-1.5 py-0.5 rounded border border-emerald-500/20">
                      Mobile Art
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
          3. MAIN TWO-COLUMN SPLIT: ACTIVE SLIDE EDITOR & REAL-TIME PREVIEW
          =================================================================== */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        {/* ===================================================================
            LEFT COLUMN (XL:COL-SPAN-7): VISUAL CROP & COPY CONTROLS
            =================================================================== */}
        <div className="xl:col-span-7 space-y-6">
          {/* SECTION A: PROFESSIONAL HERO IMAGE CROP & POSITIONING CANVAS */}
          <HeroImageEditor
            slide={currentSlide}
            onSlideChange={handleActiveSlideChange}
            onUploadImage={handleUploadImage}
            isUploadingDesktop={isUploadingDesktop}
            isUploadingMobile={isUploadingMobile}
          />

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
            RIGHT COLUMN (XL:COL-SPAN-5): LIVE STOREFRONT SIMULATION PREVIEW
            =================================================================== */}
        <div className="xl:col-span-5 space-y-4 xl:sticky xl:top-8">
          <div className="p-4 rounded-2xl bg-[#121110] border border-white/[0.08] space-y-4">
            {/* Preview Header & Viewport Switcher */}
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
              <div className="flex items-center space-x-2">
                <Eye className="w-4 h-4 text-[#BFA27A]" />
                <span className="font-serif text-sm text-[#F2EEE7]">
                  Simulated Storefront (Slide 0{activeSlideIndex + 1})
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
                    : "w-[270px] sm:w-[310px] aspect-[9/16]"
                }`}
              >
                {/* 1. Background Campaign Image with Real-time Positioning */}
                {activeDisplayImage ? (
                  <img
                    src={activeDisplayImage}
                    alt="Hero Live Preview"
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-100"
                    style={{
                      objectPosition: `${activeDisplayCrop.x ?? 50}% ${activeDisplayCrop.y ?? 50}%`,
                      transform: `scale(${activeDisplayCrop.zoom ?? 1.0})`,
                      transformOrigin: `${activeDisplayCrop.x ?? 50}% ${activeDisplayCrop.y ?? 50}%`,
                    }}
                  />
                ) : (
                  <div className="w-full h-full bg-black flex items-center justify-center text-xs text-[#AAA49B]">
                    No image available
                  </div>
                )}

                {/* 2. Gradient Overlays for High Legibility */}
                <div className="absolute inset-0 bg-gradient-to-r from-[#090908]/90 via-[#090908]/55 to-transparent pointer-events-none" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#090908] via-transparent to-black/30 pointer-events-none" />

                {/* 3. Real-Time Copy Typography */}
                <div className="relative z-10 w-full h-full flex flex-col justify-center p-4 sm:p-6 lg:p-7">
                  <div className="max-w-[85%] sm:max-w-[80%] space-y-2 sm:space-y-2.5">
                    {/* Eyebrow & Badge */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      {currentSlide.eyebrow && (
                        <span className="text-[7.5px] sm:text-[9px] uppercase font-sans tracking-[0.2em] text-[#BFA27A] font-semibold truncate max-w-full">
                          {currentSlide.eyebrow}
                        </span>
                      )}
                      {currentSlide.eyebrow && currentSlide.badge && (
                        <span className="w-1 h-1 rounded-full bg-[#BFA27A]/60" />
                      )}
                      {currentSlide.badge && (
                        <span className="text-[7px] sm:text-[8px] uppercase font-sans tracking-[0.14em] text-[#AAA49B] font-medium">
                          {currentSlide.badge}
                        </span>
                      )}
                    </div>

                    {/* Main Headline */}
                    <h2
                      className={`font-sans font-bold leading-[0.98] text-[#F2EEE7] tracking-[-0.03em] uppercase drop-shadow-md ${
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
                            ? "text-[9px]"
                            : "text-[10px] sm:text-[11.5px]"
                        }`}
                      >
                        {currentSlide.subtitle}
                      </p>
                    )}

                    {/* CTA Button */}
                    {currentSlide.cta_text && (
                      <div className="pt-1">
                        <div className="inline-flex items-center justify-center px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-full bg-[#F2EEE7] text-[#090908] text-[9px] sm:text-[10.5px] font-semibold uppercase tracking-[0.16em] shadow-lg">
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

            <div className="text-[11px] text-[#777169] text-center font-sans space-y-1">
              <p>
                Edits update this preview in real time. Use <strong>Save Draft</strong> to keep working privately.
              </p>
              <p className="text-[#AAA49B]">
                Changes only appear on the public storefront when you click <strong className="text-[#BFA27A]">Publish Changes</strong>.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
