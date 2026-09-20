import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import {
  Image as ImageIcon,
  Upload,
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
  HelpCircle,
  Sliders,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  getEditorialBannerSettings,
  saveEditorialBannerSettings,
  uploadEditorialBannerImage,
  deleteEditorialBannerImage,
  DEFAULT_EDITORIAL_BANNER_SETTINGS,
} from "../../services/editorialBanner";

export default function AdminEditorialBanner() {
  const [savedSettings, setSavedSettings] = useState(DEFAULT_EDITORIAL_BANNER_SETTINGS);
  const [formData, setFormData] = useState(DEFAULT_EDITORIAL_BANNER_SETTINGS);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingDesktop, setIsUploadingDesktop] = useState(false);
  const [isUploadingMobile, setIsUploadingMobile] = useState(false);
  const [notification, setNotification] = useState(null); // { type, message }

  // Preview Mode: 'desktop' | 'mobile'
  const [previewDevice, setPreviewDevice] = useState("desktop");

  const desktopFileInputRef = useRef(null);
  const mobileFileInputRef = useRef(null);

  // Load existing settings on mount
  useEffect(() => {
    async function loadSettings() {
      setIsLoading(true);
      try {
        const { data } = await getEditorialBannerSettings();
        if (data) {
          setSavedSettings(data);
          setFormData(data);
        }
      } catch (err) {
        console.error("Error loading editorial banner settings:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadSettings();
  }, []);

  const hasUnsavedChanges = JSON.stringify(formData) !== JSON.stringify(savedSettings);

  const handleFieldChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Upload Desktop Image
  const handleDesktopFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingDesktop(true);
    setNotification(null);

    try {
      const { url, path, error } = await uploadEditorialBannerImage(file, "desktop");
      if (error) throw error;

      // Stage new image in form data
      setFormData((prev) => ({
        ...prev,
        image_url: url,
        storage_path: path,
      }));

      setNotification({
        type: "success",
        message: "Desktop editorial image uploaded! Click 'Save Changes' to publish.",
      });
    } catch (err) {
      console.error("Upload error:", err);
      setNotification({
        type: "error",
        message: err.message || "Failed to upload image. Please try again.",
      });
    } finally {
      setIsUploadingDesktop(false);
      if (desktopFileInputRef.current) desktopFileInputRef.current.value = "";
    }
  };

  // Upload Mobile Image
  const handleMobileFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingMobile(true);
    setNotification(null);

    try {
      const { url, path, error } = await uploadEditorialBannerImage(file, "mobile");
      if (error) throw error;

      setFormData((prev) => ({
        ...prev,
        mobile_image_url: url,
        mobile_storage_path: path,
      }));

      setNotification({
        type: "success",
        message: "Mobile editorial image uploaded! Click 'Save Changes' to publish.",
      });
    } catch (err) {
      console.error("Mobile upload error:", err);
      setNotification({
        type: "error",
        message: err.message || "Failed to upload mobile image. Please try again.",
      });
    } finally {
      setIsUploadingMobile(false);
      if (mobileFileInputRef.current) mobileFileInputRef.current.value = "";
    }
  };

  // Remove Mobile Image
  const handleRemoveMobileImage = async () => {
    if (formData.mobile_storage_path) {
      try {
        await deleteEditorialBannerImage(formData.mobile_storage_path);
      } catch (e) {}
    }
    setFormData((prev) => ({
      ...prev,
      mobile_image_url: "",
      mobile_storage_path: null,
    }));
    setNotification({
      type: "info",
      message: "Mobile image removed. The desktop image will be used with responsive cropping on all devices.",
    });
  };

  // Save Settings
  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setNotification(null);

    try {
      const { data, error } = await saveEditorialBannerSettings(formData);
      if (error) throw error;

      setSavedSettings(data || formData);
      setFormData(data || formData);
      setNotification({
        type: "success",
        message: "Editorial banner settings successfully saved and published!",
      });

      setTimeout(() => {
        setNotification((prev) => (prev?.type === "success" ? null : prev));
      }, 5000);
    } catch (err) {
      console.error("Save error:", err);
      setNotification({
        type: "error",
        message: err.message || "Failed to save settings. Please try again.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Discard changes
  const handleDiscard = () => {
    setFormData(savedSettings);
    setNotification({
      type: "info",
      message: "Draft changes discarded. Reverted to last saved configuration.",
    });
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-[#BFA27A]" />
        <p className="text-xs uppercase font-sans tracking-[0.2em] text-[#AAA49B]">
          Loading Editorial Banner Settings...
        </p>
      </div>
    );
  }

  const activePreviewImage =
    previewDevice === "mobile" && formData.mobile_image_url
      ? formData.mobile_image_url
      : formData.image_url;

  return (
    <div className="space-y-8 pb-16">
      {/* 1. HEADER & ACTIONS BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/[0.08]">
        <div>
          <div className="flex items-center space-x-2 text-[10px] uppercase font-sans tracking-[0.24em] text-[#BFA27A] mb-1 font-semibold">
            <Sliders className="w-3.5 h-3.5" />
            <span>HOMEPAGE CMS</span>
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-light text-[#F2EEE7] tracking-tight">
            Homepage Editorial Banner
          </h1>
          <p className="text-xs sm:text-sm font-sans text-[#AAA49B] font-light mt-1">
            Manage the full-width cinematic editorial campaign banner placed between Bestsellers and New Arrivals.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/#bestsellers"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-2 rounded-lg border border-white/15 hover:border-white/30 text-xs uppercase font-sans tracking-wider text-[#AAA49B] hover:text-[#F2EEE7] transition-colors flex items-center gap-1.5"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>View Live Storefront</span>
            <ExternalLink className="w-3 h-3 ml-0.5 opacity-60" />
          </Link>

          {hasUnsavedChanges && (
            <button
              type="button"
              onClick={handleDiscard}
              disabled={isSaving}
              className="px-3.5 py-2 rounded-lg border border-rose-500/30 hover:border-rose-500/60 text-xs uppercase font-sans tracking-wider text-rose-300 hover:text-rose-200 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Discard</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || !hasUnsavedChanges}
            className="px-5 py-2 rounded-lg bg-[#BFA27A] hover:bg-[#D4BA94] text-[#090908] text-xs uppercase font-sans tracking-wider font-semibold transition-all duration-200 flex items-center gap-2 cursor-pointer shadow-lg disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>Save Changes</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 2. NOTIFICATION BANNER */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className={`p-4 rounded-xl border flex items-center justify-between text-xs font-sans ${
              notification.type === "success"
                ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-200"
                : notification.type === "error"
                ? "bg-rose-950/40 border-rose-500/40 text-rose-200"
                : "bg-[#181714] border-[#BFA27A]/30 text-[#F2EEE7]"
            }`}
          >
            <div className="flex items-center space-x-2.5">
              {notification.type === "success" ? (
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : notification.type === "error" ? (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              ) : (
                <HelpCircle className="w-4 h-4 text-[#BFA27A] shrink-0" />
              )}
              <span>{notification.message}</span>
            </div>
            <button
              onClick={() => setNotification(null)}
              className="text-xs uppercase tracking-wider text-white/50 hover:text-white ml-4 cursor-pointer"
            >
              Dismiss
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. LIVE INTERACTIVE PREVIEW */}
      <div className="bg-[#121110] border border-white/[0.08] rounded-2xl p-5 sm:p-6 space-y-4 shadow-xl">
        <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-white/[0.06]">
          <div className="flex items-center space-x-2">
            <span className="text-xs uppercase font-sans tracking-wider text-[#F2EEE7] font-semibold">
              Live Campaign Preview
            </span>
            {hasUnsavedChanges && (
              <span className="text-[10px] uppercase font-sans tracking-wider px-2 py-0.5 rounded-full bg-amber-950/60 border border-amber-500/40 text-amber-300 font-medium">
                Unsaved Draft
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 p-1 rounded-lg bg-[#090908] border border-white/10">
            <button
              type="button"
              onClick={() => setPreviewDevice("desktop")}
              className={`px-3 py-1.5 rounded-md text-xs font-sans uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer ${
                previewDevice === "desktop"
                  ? "bg-[#BFA27A] text-[#090908] font-semibold shadow"
                  : "text-[#AAA49B] hover:text-[#F2EEE7]"
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>Desktop (21:9)</span>
            </button>

            <button
              type="button"
              onClick={() => setPreviewDevice("mobile")}
              className={`px-3 py-1.5 rounded-md text-xs font-sans uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer ${
                previewDevice === "mobile"
                  ? "bg-[#BFA27A] text-[#090908] font-semibold shadow"
                  : "text-[#AAA49B] hover:text-[#F2EEE7]"
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Mobile View</span>
            </button>
          </div>
        </div>

        {/* Device Frame */}
        <div className="flex justify-center bg-[#090908] p-4 sm:p-8 rounded-xl border border-white/[0.04]">
          <div
            className={`transition-all duration-300 relative rounded-xl overflow-hidden border border-white/10 shadow-2xl bg-[#141311] ${
              previewDevice === "mobile"
                ? "w-[340px] aspect-[4/3]"
                : "w-full aspect-[21/9] max-h-[380px]"
            }`}
          >
            <img
              src={activePreviewImage}
              alt="Editorial Banner Preview"
              className="w-full h-full object-cover object-center"
            />

            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/15 to-black/25 pointer-events-none" />

            {/* Text Overlay Preview if present */}
            {(formData.title || formData.subtitle || formData.button_text) && (
              <div className="absolute inset-0 flex items-center justify-center text-center p-4 sm:p-6 z-10">
                <div className="max-w-md mx-auto space-y-2">
                  {formData.title && (
                    <h3 className="font-serif font-light text-xl sm:text-2xl text-[#F2EEE7] tracking-tight">
                      {formData.title}
                    </h3>
                  )}
                  {formData.subtitle && (
                    <p className="text-[11px] sm:text-xs font-sans text-[#D4CEC5] font-light leading-relaxed">
                      {formData.subtitle}
                    </p>
                  )}
                  {formData.button_text && (
                    <div className="pt-2">
                      <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#F2EEE7] text-[#090908] text-[10px] uppercase font-sans tracking-wider font-semibold">
                        <span>{formData.button_text}</span>
                        <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Disabled Overlay Indicator */}
            {!formData.is_active && (
              <div className="absolute inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center z-20">
                <span className="px-4 py-1.5 rounded-full bg-rose-950/80 border border-rose-500 text-rose-200 text-xs uppercase font-sans tracking-wider font-semibold">
                  Banner Disabled (Hidden on Storefront)
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4. SETTINGS FORM & MEDIA CONTROLS */}
      <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Image Management & Visibility */}
        <div className="lg:col-span-6 space-y-6">
          {/* Visibility Card */}
          <div className="bg-[#121110] border border-white/[0.08] rounded-2xl p-6 space-y-4">
            <h2 className="font-serif text-lg font-light text-[#F2EEE7]">Banner Visibility</h2>
            <div className="flex items-center justify-between p-4 bg-[#090908] rounded-xl border border-white/[0.06]">
              <div>
                <p className="text-xs font-sans uppercase tracking-wider text-[#F2EEE7] font-semibold">
                  Active Status
                </p>
                <p className="text-xs text-[#AAA49B] font-light mt-0.5">
                  {formData.is_active
                    ? "Visible on homepage between Bestsellers and New Arrivals."
                    : "Hidden from homepage."}
                </p>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => handleFieldChange("is_active", e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-[#222] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#BFA27A]" />
              </label>
            </div>
          </div>

          {/* Desktop Image Card */}
          <div className="bg-[#121110] border border-white/[0.08] rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-serif text-lg font-light text-[#F2EEE7]">Desktop Campaign Image</h2>
                <p className="text-xs text-[#AAA49B] font-light mt-0.5">
                  Primary image displayed in wide cinematic format (~21:9).
                </p>
              </div>
              <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-white/10 text-[#AAA49B] font-mono">
                Required
              </span>
            </div>

            <div className="relative aspect-[21/9] max-h-48 rounded-xl overflow-hidden border border-white/10 bg-[#090908]">
              <img
                src={formData.image_url}
                alt="Desktop Banner"
                className="w-full h-full object-cover object-center"
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <input
                ref={desktopFileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/avif"
                onChange={handleDesktopFileSelect}
                className="hidden"
                id="desktop-banner-input"
              />

              <button
                type="button"
                onClick={() => desktopFileInputRef.current?.click()}
                disabled={isUploadingDesktop}
                className="flex-1 px-4 py-2.5 rounded-xl bg-[#181714] hover:bg-[#BFA27A] hover:text-[#090908] border border-white/15 hover:border-[#BFA27A] text-xs uppercase font-sans tracking-wider transition-colors flex items-center justify-center gap-2 cursor-pointer font-medium disabled:opacity-50"
              >
                {isUploadingDesktop ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-[#BFA27A]" />
                    <span>Uploading...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    <span>Replace Desktop Image</span>
                  </>
                )}
              </button>
            </div>
            <p className="text-[10.5px] text-[#777169] font-light">
              Supports JPEG, PNG, WebP, AVIF up to 5MB. Uploads securely to Supabase Storage.
            </p>
          </div>

          {/* Optional Mobile Image Card */}
          <div className="bg-[#121110] border border-white/[0.08] rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-serif text-lg font-light text-[#F2EEE7]">Optional Mobile Crop</h2>
                <p className="text-xs text-[#AAA49B] font-light mt-0.5">
                  Tailored crop for portrait smartphones (&lt;768px).
                </p>
              </div>
              <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-white/5 text-[#777169] font-mono">
                Optional
              </span>
            </div>

            {formData.mobile_image_url ? (
              <div className="space-y-3">
                <div className="relative aspect-[4/3] max-h-48 w-48 mx-auto rounded-xl overflow-hidden border border-white/10 bg-[#090908]">
                  <img
                    src={formData.mobile_image_url}
                    alt="Mobile Banner"
                    className="w-full h-full object-cover object-center"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => mobileFileInputRef.current?.click()}
                    disabled={isUploadingMobile}
                    className="flex-1 px-4 py-2 rounded-xl bg-[#181714] hover:bg-white/10 border border-white/15 text-xs uppercase font-sans tracking-wider transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {isUploadingMobile ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Upload className="w-3.5 h-3.5" />
                    )}
                    <span>Replace Mobile Crop</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleRemoveMobileImage}
                    className="px-3 py-2 rounded-xl border border-rose-500/30 text-rose-300 hover:bg-rose-950/40 text-xs uppercase font-sans tracking-wider transition-colors flex items-center gap-1.5 cursor-pointer"
                    title="Remove mobile crop"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Remove</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center p-6 border border-dashed border-white/10 rounded-xl space-y-3 bg-[#090908]">
                <Smartphone className="w-8 h-8 text-[#777169] mx-auto stroke-[1.2]" />
                <p className="text-xs text-[#AAA49B] font-light max-w-xs mx-auto">
                  No dedicated mobile crop set. The desktop image will be automatically centered and reflowed responsively.
                </p>
                <button
                  type="button"
                  onClick={() => mobileFileInputRef.current?.click()}
                  disabled={isUploadingMobile}
                  className="px-4 py-2 rounded-xl bg-[#181714] hover:bg-[#BFA27A] hover:text-[#090908] border border-white/15 text-xs uppercase font-sans tracking-wider transition-colors inline-flex items-center gap-1.5 cursor-pointer font-medium disabled:opacity-50"
                >
                  {isUploadingMobile ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#BFA27A]" />
                  ) : (
                    <Upload className="w-3.5 h-3.5" />
                  )}
                  <span>Upload Mobile Crop</span>
                </button>
              </div>
            )}

            <input
              ref={mobileFileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              onChange={handleMobileFileSelect}
              className="hidden"
              id="mobile-banner-input"
            />
          </div>
        </div>

        {/* Right Column: Optional Text Overlay Controls */}
        <div className="lg:col-span-6 space-y-6">
          <div className="bg-[#121110] border border-white/[0.08] rounded-2xl p-6 space-y-5">
            <div>
              <div className="flex items-center justify-between">
                <h2 className="font-serif text-lg font-light text-[#F2EEE7]">
                  Optional Content Overlay
                </h2>
                <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-white/5 text-[#777169] font-mono">
                  HTML Overlay
                </span>
              </div>
              <p className="text-xs text-[#AAA49B] font-light mt-1 leading-relaxed">
                Add optional typography rendered on top of the image. Leave fields blank for a pure, clean campaign visual.
              </p>
            </div>

            <div className="space-y-4 font-sans text-xs">
              {/* Title */}
              <div>
                <label className="block text-[10.5px] uppercase tracking-wider text-[#777169] mb-1.5 font-medium">
                  Title (Optional)
                </label>
                <input
                  type="text"
                  value={formData.title || ""}
                  onChange={(e) => handleFieldChange("title", e.target.value)}
                  placeholder="e.g. THE VAULT CAMPAIGN"
                  className="w-full bg-[#090908] border border-white/10 rounded-xl px-4 py-3 text-sm text-[#F2EEE7] focus:border-[#BFA27A] outline-none transition-colors placeholder:text-[#555]"
                />
              </div>

              {/* Subtitle */}
              <div>
                <label className="block text-[10.5px] uppercase tracking-wider text-[#777169] mb-1.5 font-medium">
                  Subtitle / Editorial Blurb (Optional)
                </label>
                <textarea
                  rows={3}
                  value={formData.subtitle || ""}
                  onChange={(e) => handleFieldChange("subtitle", e.target.value)}
                  placeholder="e.g. Rare essences distilled in Florence. Limited reserve releases for the season."
                  className="w-full bg-[#090908] border border-white/10 rounded-xl p-4 text-sm text-[#F2EEE7] focus:border-[#BFA27A] outline-none transition-colors placeholder:text-[#555] resize-none"
                />
              </div>

              {/* Button Text */}
              <div>
                <label className="block text-[10.5px] uppercase tracking-wider text-[#777169] mb-1.5 font-medium">
                  Button Text (Optional)
                </label>
                <input
                  type="text"
                  value={formData.button_text || ""}
                  onChange={(e) => handleFieldChange("button_text", e.target.value)}
                  placeholder="e.g. EXPLORE THE CAMPAIGN"
                  className="w-full bg-[#090908] border border-white/10 rounded-xl px-4 py-3 text-sm text-[#F2EEE7] focus:border-[#BFA27A] outline-none transition-colors placeholder:text-[#555]"
                />
              </div>

              {/* Button Link */}
              <div>
                <label className="block text-[10.5px] uppercase tracking-wider text-[#777169] mb-1.5 font-medium">
                  Button Link (Optional)
                </label>
                <input
                  type="text"
                  value={formData.button_link || ""}
                  onChange={(e) => handleFieldChange("button_link", e.target.value)}
                  placeholder="e.g. /shop or /product/noir-oud"
                  className="w-full bg-[#090908] border border-white/10 rounded-xl px-4 py-3 text-sm text-[#F2EEE7] focus:border-[#BFA27A] outline-none transition-colors placeholder:text-[#555]"
                />
              </div>
            </div>

            {/* Clear Overlay button */}
            {(formData.title || formData.subtitle || formData.button_text || formData.button_link) && (
              <button
                type="button"
                onClick={() => {
                  setFormData((prev) => ({
                    ...prev,
                    title: "",
                    subtitle: "",
                    button_text: "",
                    button_link: "",
                  }));
                }}
                className="text-xs uppercase tracking-wider text-[#AAA49B] hover:text-rose-300 transition-colors pt-2 flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Clear All Overlay Text</span>
              </button>
            )}
          </div>

          {/* Quick Info Reassurance */}
          <div className="bg-[#121110] border border-white/[0.08] rounded-2xl p-6 space-y-3 font-sans text-xs text-[#AAA49B]">
            <div className="flex items-center space-x-2 text-[#BFA27A]">
              <HelpCircle className="w-4 h-4" />
              <span className="font-medium uppercase tracking-wider">Editorial Standard</span>
            </div>
            <p className="leading-relaxed font-light">
              The editorial banner is designed to create breathing room between product listings. For the purest luxury aesthetic, keeping overlay text minimal or blank allows the campaign photography to speak for itself.
            </p>
          </div>
        </div>
      </form>
    </div>
  );
}
