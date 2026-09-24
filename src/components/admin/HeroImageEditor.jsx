import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Monitor,
  Smartphone,
  Upload,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Sliders,
  Sparkles,
  Move,
  Grid,
  Eye,
  EyeOff,
  Trash2,
  Loader2,
  Check,
  Maximize2,
} from "lucide-react";
import { DEFAULT_CROP_SETTINGS } from "../../services/heroSettings";

/**
 * High-End Luxury Hero Image Crop & Positioning Editor for SCENTÉ Admin
 */
export default function HeroImageEditor({
  slide,
  onSlideChange,
  onUploadImage,
  isUploadingDesktop = false,
  isUploadingMobile = false,
}) {
  // Active Tab: 'desktop' | 'mobile'
  const [activeTab, setActiveTab] = useState("desktop");
  // Show live text overlay over the canvas (default false for clear flacon framing)
  const [showOverlay, setShowOverlay] = useState(false);
  // Show rule of thirds grid
  const [showGrid, setShowGrid] = useState(true);

  // Active crop values for the current tab
  const activeCrop =
    activeTab === "desktop"
      ? slide.desktop_crop || DEFAULT_CROP_SETTINGS
      : slide.mobile_crop || DEFAULT_CROP_SETTINGS;

  const currentImage =
    activeTab === "desktop"
      ? slide.image_url
      : slide.mobile_image_url || slide.image_url;

  const isUsingFallback =
    activeTab === "mobile" && !slide.mobile_image_url && Boolean(slide.image_url);

  // References for dragging and canvas
  const canvasRef = useRef(null);
  const isDraggingRef = useRef(false);
  const dragStartPosRef = useRef({ x: 0, y: 0 });
  const startCropPosRef = useRef({ x: 50, y: 50 });

  // Update active crop configuration
  const handleCropUpdate = useCallback(
    (newPartialCrop) => {
      const field = activeTab === "desktop" ? "desktop_crop" : "mobile_crop";
      const updated = {
        ...activeCrop,
        ...newPartialCrop,
      };
      onSlideChange(field, updated);
    },
    [activeTab, activeCrop, onSlideChange]
  );

  // Direct pan / drag handling on canvas
  const handleMouseDown = (e) => {
    e.preventDefault();
    isDraggingRef.current = true;
    dragStartPosRef.current = { x: e.clientX, y: e.clientY };
    startCropPosRef.current = { x: activeCrop.x ?? 50, y: activeCrop.y ?? 50 };
  };

  const handleMouseMove = useCallback(
    (e) => {
      if (!isDraggingRef.current || !canvasRef.current) return;

      const rect = canvasRef.current.getBoundingClientRect();
      const deltaX = e.clientX - dragStartPosRef.current.x;
      const deltaY = e.clientY - dragStartPosRef.current.y;

      // Sensitive drag ratio inverted for natural panning (dragging right reveals left)
      const zoom = activeCrop.zoom || 1.0;
      const sensitivity = 80 / (zoom * Math.max(rect.width, 300));

      let newX = startCropPosRef.current.x - deltaX * sensitivity;
      let newY = startCropPosRef.current.y - deltaY * sensitivity;

      newX = Math.round(Math.min(100, Math.max(0, newX)));
      newY = Math.round(Math.min(100, Math.max(0, newY)));

      handleCropUpdate({ x: newX, y: newY });
    },
    [activeCrop.zoom, handleCropUpdate]
  );

  const handleMouseUp = useCallback(() => {
    isDraggingRef.current = false;
  }, []);

  // Touch drag support for tablet/mobile admin
  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      isDraggingRef.current = true;
      dragStartPosRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      };
      startCropPosRef.current = { x: activeCrop.x ?? 50, y: activeCrop.y ?? 50 };
    }
  };

  const handleTouchMove = useCallback(
    (e) => {
      if (!isDraggingRef.current || !canvasRef.current || e.touches.length !== 1) return;

      const rect = canvasRef.current.getBoundingClientRect();
      const deltaX = e.touches[0].clientX - dragStartPosRef.current.x;
      const deltaY = e.touches[0].clientY - dragStartPosRef.current.y;

      const zoom = activeCrop.zoom || 1.0;
      const sensitivity = 80 / (zoom * Math.max(rect.width, 300));

      let newX = startCropPosRef.current.x - deltaX * sensitivity;
      let newY = startCropPosRef.current.y - deltaY * sensitivity;

      newX = Math.round(Math.min(100, Math.max(0, newX)));
      newY = Math.round(Math.min(100, Math.max(0, newY)));

      handleCropUpdate({ x: newX, y: newY });
    },
    [activeCrop.zoom, handleCropUpdate]
  );

  // Mouse wheel zoom
  const handleWheel = (e) => {
    e.preventDefault();
    const zoomDelta = e.deltaY < 0 ? 0.08 : -0.08;
    const currentZoom = activeCrop.zoom ?? 1.0;
    const newZoom = Math.min(3.0, Math.max(1.0, parseFloat((currentZoom + zoomDelta).toFixed(2))));
    handleCropUpdate({ zoom: newZoom });
  };

  useEffect(() => {
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("touchend", handleMouseUp);
    return () => {
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchend", handleMouseUp);
    };
  }, [handleMouseUp]);

  // Reset positioning for current tab
  const handleResetPosition = () => {
    handleCropUpdate({
      x: 50,
      y: 50,
      zoom: 1.0,
      cropFrame: { x: 0, y: 0, width: 100, height: 100 },
    });
  };

  // Quick preset alignments
  const applyPreset = (presetX, presetY) => {
    handleCropUpdate({ x: presetX, y: presetY });
  };

  // File input refs
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      onUploadImage(file, activeTab);
      e.target.value = "";
    }
  };

  const isUploading =
    activeTab === "desktop" ? isUploadingDesktop : isUploadingMobile;

  return (
    <div className="p-5 sm:p-6 rounded-2xl bg-[#121110] border border-white/[0.08] space-y-6 select-none">
      {/* 1. TOP TABS: DESKTOP HERO & MOBILE HERO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/[0.06]">
        <div className="flex items-center space-x-2">
          <Sliders className="w-4 h-4 text-[#BFA27A]" />
          <h2 className="font-serif text-lg text-[#F2EEE7] font-normal">
            Hero Image & Positioning Editor
          </h2>
        </div>

        {/* Viewport Tabs Switcher */}
        <div className="flex items-center bg-[#181714] p-1 rounded-xl border border-white/10 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab("desktop")}
            className={`px-4 py-2 rounded-lg text-xs uppercase font-sans tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === "desktop"
                ? "bg-[#BFA27A] text-[#0D0D0C] font-semibold shadow-md"
                : "text-[#AAA49B] hover:text-[#F2EEE7]"
            }`}
          >
            <Monitor className="w-3.5 h-3.5" />
            <span>Desktop Hero (16:9)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("mobile")}
            className={`px-4 py-2 rounded-lg text-xs uppercase font-sans tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === "mobile"
                ? "bg-[#BFA27A] text-[#0D0D0C] font-semibold shadow-md"
                : "text-[#AAA49B] hover:text-[#F2EEE7]"
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Mobile Hero (9:16)</span>
            {isUsingFallback && (
              <span className="w-1.5 h-1.5 rounded-full bg-[#BFA27A]/80" title="Using desktop image fallback" />
            )}
          </button>
        </div>
      </div>

      {/* 2. SUB-STATUS: FALLBACK NOTICE & UPLOAD TRIGGER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-sans">
        <div className="flex items-center gap-2 text-[#AAA49B]">
          <span className="text-[#BFA27A] font-medium uppercase tracking-wider text-[11px]">
            {activeTab === "desktop" ? "Desktop Master Aspect" : "Mobile Vertical Aspect"}
          </span>
          <span>·</span>
          {activeTab === "mobile" && isUsingFallback ? (
            <span className="text-amber-400/90 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              Inheriting Desktop Image (Upload separate image or adjust mobile positioning)
            </span>
          ) : (
            <span className="text-[#888177]">
              {activeTab === "desktop"
                ? "Widescreen campaign visual for laptops & monitors"
                : "Vertical portrait view for smartphone patrons"}
            </span>
          )}
        </div>

        {/* Upload Button */}
        <div className="flex items-center gap-2 shrink-0">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/jpeg,image/png,image/webp,image/avif"
            className="hidden"
          />

          {activeTab === "mobile" && slide.mobile_image_url && (
            <button
              type="button"
              onClick={() => {
                onSlideChange("mobile_image_url", "");
                onSlideChange("mobile_storage_path", null);
              }}
              className="px-3 py-1.5 rounded-lg border border-rose-500/20 text-rose-300 hover:text-white hover:bg-rose-950/40 text-[11px] font-sans transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Remove dedicated mobile image and revert to desktop image fallback"
            >
              <Trash2 className="w-3 h-3" />
              <span>Use Desktop Fallback</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="px-3.5 py-1.5 rounded-lg bg-[#1C1B17] hover:bg-[#252420] border border-white/10 text-xs text-[#F2EEE7] hover:text-[#BFA27A] transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            {isUploading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#BFA27A]" />
            ) : (
              <Upload className="w-3.5 h-3.5 text-[#BFA27A]" />
            )}
            <span>
              {isUploading
                ? "Uploading..."
                : activeTab === "desktop"
                ? "Replace Desktop Image"
                : slide.mobile_image_url
                ? "Replace Mobile Image"
                : "Upload Mobile Image"}
            </span>
          </button>
        </div>
      </div>

      {/* 3. INTERACTIVE CANVAS VIEWPORT */}
      <div className="relative rounded-2xl overflow-hidden border border-white/[0.12] bg-[#080807] shadow-2xl flex flex-col items-center justify-center p-3 sm:p-5">
        {/* Canvas Frame Container */}
        <div
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onWheel={handleWheel}
          className={`relative overflow-hidden border border-[#BFA27A]/40 ring-1 ring-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.9)] cursor-grab active:cursor-grabbing transition-all rounded-xl ${
            activeTab === "desktop"
              ? "w-full aspect-[16/9] max-h-[460px]"
              : "w-[270px] xs:w-[310px] sm:w-[340px] aspect-[9/16] max-h-[520px]"
          }`}
          style={{ touchAction: "none" }}
        >
          {/* A. Background Image with Scaled and Shifted Transform */}
          {currentImage ? (
            <img
              src={currentImage}
              alt="Hero Interactive Canvas"
              draggable={false}
              className="absolute inset-0 w-full h-full object-cover select-none pointer-events-none transition-transform duration-75"
              style={{
                objectPosition: `${activeCrop.x ?? 50}% ${activeCrop.y ?? 50}%`,
                transform: `scale(${activeCrop.zoom ?? 1.0})`,
                transformOrigin: `${activeCrop.x ?? 50}% ${activeCrop.y ?? 50}%`,
              }}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-[#AAA49B] p-4 text-center">
              <Upload className="w-8 h-8 text-[#BFA27A] mb-2 opacity-60" />
              <p className="text-xs">No image available. Please upload an image.</p>
            </div>
          )}

          {/* B. Vignette luxury gradients (matching storefront) */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#090908]/90 via-[#090908]/60 to-transparent pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#090908]/85 via-transparent to-black/30 pointer-events-none" />

          {/* C. Composition Rule-of-Thirds Grid Overlay */}
          {showGrid && (
            <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 z-10">
              <div className="border-r border-b border-[#BFA27A]/20" />
              <div className="border-r border-b border-[#BFA27A]/20" />
              <div className="border-b border-[#BFA27A]/20" />
              <div className="border-r border-b border-[#BFA27A]/20" />
              <div className="border-r border-b border-[#BFA27A]/20" />
              <div className="border-b border-[#BFA27A]/20" />
              <div className="border-r border-b border-[#BFA27A]/20" />
              <div className="border-r border-b border-[#BFA27A]/20" />
              <div className="" />
            </div>
          )}

          {/* D. Live SCENTÉ Luxury Text & CTA Overlay Preview (Toggleable) */}
          {showOverlay && (
            <div className="absolute inset-0 z-20 pointer-events-none flex flex-col justify-center p-4 sm:p-7 bg-black/20">
              <div className="max-w-[78%] sm:max-w-[70%] space-y-1.5 sm:space-y-2.5 drop-shadow-md">
                {/* Eyebrow & Badge */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {slide.eyebrow && (
                    <span className="text-[7.5px] sm:text-[9px] uppercase font-sans tracking-[0.2em] text-[#BFA27A] font-semibold">
                      {slide.eyebrow}
                    </span>
                  )}
                  {slide.eyebrow && slide.badge && (
                    <span className="w-1 h-1 rounded-full bg-[#BFA27A]/60" />
                  )}
                  {slide.badge && (
                    <span className="text-[7px] sm:text-[8px] uppercase font-sans tracking-[0.14em] text-[#AAA49B]">
                      {slide.badge}
                    </span>
                  )}
                </div>

                {/* 3-Line Headline */}
                <h3
                  className={`font-sans font-bold leading-[0.98] text-[#F2EEE7] uppercase tracking-tight ${
                    activeTab === "mobile" ? "text-base sm:text-lg" : "text-lg sm:text-2xl lg:text-3xl"
                  }`}
                >
                  {slide.headline_line1} <br />
                  {slide.headline_line2} <br />
                  <span className="text-[#EAE4DC]">{slide.headline_line3}</span>
                </h3>

                {/* Subtitle */}
                {slide.subtitle && (
                  <p
                    className={`font-sans text-[#D4CEC5] font-light leading-relaxed line-clamp-2 ${
                      activeTab === "mobile" ? "text-[9px]" : "text-[10px] sm:text-[11.5px]"
                    }`}
                  >
                    {slide.subtitle}
                  </p>
                )}

                {/* CTA Button */}
                {slide.cta_text && (
                  <div className="pt-1">
                    <span className="inline-block px-3 py-1.5 sm:px-4 sm:py-2 rounded-full bg-[#F2EEE7] text-[#090908] text-[8.5px] sm:text-[10px] font-semibold uppercase tracking-wider shadow-lg">
                      {slide.cta_text}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* E. Floating Canvas Quick Toggles (Top Right Glass Pill) */}
          <div className="absolute top-3 right-3 z-30 flex items-center gap-1.5 bg-[#0D0D0C]/85 backdrop-blur-md p-1 rounded-xl border border-white/15 shadow-xl">
            <button
              type="button"
              onClick={() => setShowOverlay((prev) => !prev)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-sans uppercase tracking-wider flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
                showOverlay
                  ? "bg-[#BFA27A] text-[#0D0D0C] font-semibold"
                  : "text-[#AAA49B] hover:text-[#F2EEE7] hover:bg-white/5"
              }`}
              title="Toggle Live Copy & Headline Preview on Canvas"
            >
              {showOverlay ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              <span>Text Overlay</span>
            </button>

            <button
              type="button"
              onClick={() => setShowGrid((prev) => !prev)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-sans uppercase tracking-wider flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
                showGrid
                  ? "bg-[#BFA27A] text-[#0D0D0C] font-semibold"
                  : "text-[#AAA49B] hover:text-[#F2EEE7] hover:bg-white/5"
              }`}
              title="Toggle Rule-of-Thirds Grid Overlay"
            >
              <Grid className="w-3.5 h-3.5" />
              <span>Grid</span>
            </button>
          </div>

          {/* F. Interactive Drag Hint Watermark (Bottom Right Glass Pill) */}
          <div className="absolute bottom-3 right-3 z-30 pointer-events-none bg-[#0D0D0C]/85 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/15 text-[9.5px] font-mono text-[#BFA27A] flex items-center gap-1.5 shadow-lg">
            <Move className="w-3 h-3 text-[#BFA27A]" />
            <span>DRAG TO REPOSITION</span>
          </div>
        </div>

        {/* Framing Instructions */}
        <p className="text-[11px] text-[#777169] text-center font-sans mt-3">
          Click and drag inside the frame to center your perfume flacon. Use the slider or mouse wheel to zoom.
        </p>
      </div>

      {/* 4. ULTRA-MINIMAL LUXURY FRAMING BAR */}
      <div className="bg-[#141312] border border-white/10 rounded-2xl p-3 sm:p-4 shadow-xl">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 sm:gap-4 lg:gap-6">
          {/* A. 3-Position Flacon Alignment Segmented Control */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[10.5px] uppercase font-sans tracking-[0.16em] text-[#AAA49B] font-medium whitespace-nowrap">
              Focus:
            </span>
            <div className="flex items-center bg-[#1C1B18] p-1 rounded-xl border border-white/10 shrink-0">
              <button
                type="button"
                onClick={() => applyPreset(30, 50)}
                className={`px-3 py-1.5 rounded-lg text-xs font-sans tracking-wide transition-all cursor-pointer whitespace-nowrap ${
                  (activeCrop.x ?? 50) <= 35 && (activeCrop.y ?? 50) === 50
                    ? "bg-[#BFA27A] text-[#0D0D0C] font-semibold shadow-sm"
                    : "text-[#AAA49B] hover:text-[#F2EEE7]"
                }`}
                title="Position flacon on the left"
              >
                Left
              </button>

              <button
                type="button"
                onClick={() => applyPreset(50, 50)}
                className={`px-3 py-1.5 rounded-lg text-xs font-sans tracking-wide transition-all cursor-pointer whitespace-nowrap ${
                  (activeCrop.x ?? 50) === 50 && (activeCrop.y ?? 50) === 50
                    ? "bg-[#BFA27A] text-[#0D0D0C] font-semibold shadow-sm"
                    : "text-[#AAA49B] hover:text-[#F2EEE7]"
                }`}
                title="Position flacon in the center"
              >
                Center
              </button>

              <button
                type="button"
                onClick={() => applyPreset(72, 50)}
                className={`px-3 py-1.5 rounded-lg text-xs font-sans tracking-wide transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  (activeCrop.x ?? 50) >= 65 && (activeCrop.y ?? 50) === 50
                    ? "bg-[#BFA27A] text-[#0D0D0C] font-semibold shadow-sm"
                    : "text-[#AAA49B] hover:text-[#F2EEE7]"
                }`}
                title="Position flacon on the right (Recommended for Desktop so it sits clear of headline)"
              >
                <span>Right</span>
                <span
                  className={`text-[8.5px] uppercase font-mono px-1 rounded ${
                    (activeCrop.x ?? 50) >= 65 && (activeCrop.y ?? 50) === 50
                      ? "bg-black/20 text-[#0D0D0C]"
                      : "text-[#BFA27A] bg-[#BFA27A]/15"
                  }`}
                >
                  Best
                </span>
              </button>
            </div>
          </div>

          {/* B. Zoom Scale Slider */}
          <div className="flex-1 flex items-center gap-3 min-w-0">
            <span className="text-[10.5px] uppercase font-sans tracking-[0.16em] text-[#AAA49B] font-medium whitespace-nowrap shrink-0">
              Zoom:
            </span>

            <input
              type="range"
              min="1.0"
              max="3.0"
              step="0.05"
              value={activeCrop.zoom ?? 1.0}
              onChange={(e) => handleCropUpdate({ zoom: parseFloat(e.target.value) })}
              className="flex-1 accent-[#BFA27A] cursor-pointer h-1.5 bg-white/10 rounded-lg hover:bg-white/20 transition-all min-w-[80px]"
            />

            <span className="font-mono text-xs text-[#BFA27A] bg-[#1C1B18] px-2 py-1 rounded-md border border-[#BFA27A]/25 font-semibold whitespace-nowrap shrink-0">
              {(activeCrop.zoom ?? 1.0).toFixed(2)}x
            </span>
          </div>

          {/* C. Reset Button */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleResetPosition}
              className="px-3.5 py-1.5 rounded-xl bg-[#1C1B18] hover:bg-[#252420] hover:text-[#F2EEE7] hover:border-[#BFA27A]/40 border border-white/10 text-xs font-sans text-[#AAA49B] flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer shadow-sm"
              title="Reset Zoom & Alignment to Center"
            >
              <RotateCcw className="w-3.5 h-3.5 text-[#BFA27A]" />
              <span>Reset</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
