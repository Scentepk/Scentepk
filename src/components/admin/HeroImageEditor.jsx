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

  // Show live text overlay over the canvas
  const [showOverlay, setShowOverlay] = useState(true);
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
      <div className="relative rounded-2xl overflow-hidden border border-white/15 bg-[#080807] shadow-2xl flex flex-col items-center justify-center p-3 sm:p-6">
        {/* Canvas Frame Container */}
        <div
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onWheel={handleWheel}
          className={`relative overflow-hidden border-2 border-[#BFA27A]/60 shadow-[0_0_40px_rgba(0,0,0,0.8)] cursor-grab active:cursor-grabbing transition-all rounded-xl ${
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

          {/* B. Vignette luxury gradients (exactly matching storefront) */}
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
              <div className="border-r border-[#BFA27A]/20" />
              <div className="border-r border-[#BFA27A]/20" />
              <div className="" />
            </div>
          )}

          {/* D. Live SCENTÉ Luxury Text & CTA Overlay Preview */}
          {showOverlay && (
            <div className="absolute inset-0 z-20 pointer-events-none flex flex-col justify-center p-4 sm:p-7">
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

          {/* E. Interactive Drag Hint Watermark */}
          <div className="absolute bottom-2 right-2.5 z-30 pointer-events-none bg-black/70 backdrop-blur-md px-2 py-1 rounded-md border border-white/10 text-[9px] font-mono text-[#BFA27A] flex items-center gap-1.5">
            <Move className="w-3 h-3 text-[#BFA27A]" />
            <span>DRAG TO REPOSITION</span>
          </div>
        </div>

        {/* Framing Instructions */}
        <p className="text-[11px] text-[#777169] text-center font-sans mt-3">
          Click and drag inside the frame to center your perfume flacon. Use the slider or mouse wheel to zoom.
        </p>
      </div>

      {/* 4. TOOLBAR CONTROLS: ZOOM, POSITION COORDINATES, PRESETS & OVERLAYS */}
      <div className="p-4 rounded-xl bg-[#171614] border border-white/[0.06] space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          {/* A. Zoom Slider Control (Cols 5) */}
          <div className="md:col-span-5 space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-sans">
              <span className="uppercase tracking-wider text-[#AAA49B] font-medium flex items-center gap-1.5">
                <Maximize2 className="w-3 h-3 text-[#BFA27A]" />
                Scale / Zoom: <strong className="text-[#F2EEE7] font-mono">{(activeCrop.zoom ?? 1.0).toFixed(2)}x</strong>
              </span>
              <span className="text-[10px] text-[#777169]">1.00x – 3.00x</span>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() =>
                  handleCropUpdate({
                    zoom: Math.max(1.0, parseFloat(((activeCrop.zoom ?? 1.0) - 0.1).toFixed(2))),
                  })
                }
                className="w-7 h-7 rounded-md bg-[#201F1B] hover:bg-[#2A2924] text-[#AAA49B] hover:text-[#F2EEE7] flex items-center justify-center border border-white/10 transition-colors cursor-pointer"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>

              <input
                type="range"
                min="1.0"
                max="3.0"
                step="0.05"
                value={activeCrop.zoom ?? 1.0}
                onChange={(e) => handleCropUpdate({ zoom: parseFloat(e.target.value) })}
                className="flex-1 accent-[#BFA27A] cursor-pointer h-1.5 bg-white/10 rounded-lg"
              />

              <button
                type="button"
                onClick={() =>
                  handleCropUpdate({
                    zoom: Math.min(3.0, parseFloat(((activeCrop.zoom ?? 1.0) + 0.1).toFixed(2))),
                  })
                }
                className="w-7 h-7 rounded-md bg-[#201F1B] hover:bg-[#2A2924] text-[#AAA49B] hover:text-[#F2EEE7] flex items-center justify-center border border-white/10 transition-colors cursor-pointer"
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* B. Focal Presets (Cols 4) */}
          <div className="md:col-span-4 space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-sans">
              <span className="uppercase tracking-wider text-[#AAA49B] font-medium">
                Flacon Composition Presets
              </span>
              <span className="text-[10px] font-mono text-[#BFA27A]">
                X: {activeCrop.x ?? 50}% · Y: {activeCrop.y ?? 50}%
              </span>
            </div>

            <div className="grid grid-cols-3 gap-1">
              <button
                type="button"
                onClick={() => applyPreset(30, 30)}
                className="px-2 py-1 rounded bg-[#201F1B] hover:bg-[#2D2B26] hover:text-[#BFA27A] border border-white/5 text-[10px] font-sans text-[#AAA49B] transition-colors cursor-pointer text-center"
              >
                Top Left
              </button>
              <button
                type="button"
                onClick={() => applyPreset(50, 30)}
                className="px-2 py-1 rounded bg-[#201F1B] hover:bg-[#2D2B26] hover:text-[#BFA27A] border border-white/5 text-[10px] font-sans text-[#AAA49B] transition-colors cursor-pointer text-center"
              >
                Top Center
              </button>
              <button
                type="button"
                onClick={() => applyPreset(70, 30)}
                className="px-2 py-1 rounded bg-[#201F1B] hover:bg-[#2D2B26] hover:text-[#BFA27A] border border-white/5 text-[10px] font-sans text-[#AAA49B] transition-colors cursor-pointer text-center"
              >
                Top Right
              </button>

              <button
                type="button"
                onClick={() => applyPreset(30, 50)}
                className="px-2 py-1 rounded bg-[#201F1B] hover:bg-[#2D2B26] hover:text-[#BFA27A] border border-white/5 text-[10px] font-sans text-[#AAA49B] transition-colors cursor-pointer text-center"
              >
                Center Left
              </button>
              <button
                type="button"
                onClick={() => applyPreset(50, 50)}
                className="px-2 py-1 rounded bg-[#201F1B] hover:bg-[#2D2B26] hover:text-[#BFA27A] border border-white/5 text-[10px] font-sans text-[#AAA49B] transition-colors cursor-pointer text-center font-medium"
              >
                Center
              </button>
              <button
                type="button"
                onClick={() => applyPreset(72, 50)}
                className="px-2 py-1 rounded bg-[#201F1B] hover:bg-[#BFA27A] hover:text-[#0D0D0C] border border-[#BFA27A]/30 text-[10px] font-sans text-[#BFA27A] font-semibold transition-colors cursor-pointer text-center"
                title="Ideal for Desktop: keeps flacon in open space right of text"
              >
                Right (Flacon)
              </button>
            </div>
          </div>

          {/* C. Toggles & Reset Position (Cols 3) */}
          <div className="md:col-span-3 flex flex-col justify-between space-y-2">
            <div className="flex items-center justify-between gap-2">
              {/* Overlay Toggle */}
              <button
                type="button"
                onClick={() => setShowOverlay((prev) => !prev)}
                className={`flex-1 px-2.5 py-1.5 rounded-lg border text-[10px] uppercase font-sans tracking-wider flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                  showOverlay
                    ? "bg-[#2A2720] border-[#BFA27A]/50 text-[#BFA27A]"
                    : "bg-[#201F1B] border-white/10 text-[#777169]"
                }`}
              >
                {showOverlay ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                <span>Text Overlay</span>
              </button>

              {/* Grid Toggle */}
              <button
                type="button"
                onClick={() => setShowGrid((prev) => !prev)}
                className={`px-2.5 py-1.5 rounded-lg border text-[10px] uppercase font-sans tracking-wider flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                  showGrid
                    ? "bg-[#2A2720] border-[#BFA27A]/50 text-[#BFA27A]"
                    : "bg-[#201F1B] border-white/10 text-[#777169]"
                }`}
                title="Toggle Rule-of-Thirds Grid"
              >
                <Grid className="w-3 h-3" />
                <span>Grid</span>
              </button>
            </div>

            {/* Reset Position Button */}
            <button
              type="button"
              onClick={handleResetPosition}
              className="w-full px-3 py-1.5 rounded-lg bg-[#201F1B] hover:bg-[#2D2B26] hover:text-[#F2EEE7] border border-white/10 text-[10.5px] uppercase font-sans tracking-wider text-[#AAA49B] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3 text-[#BFA27A]" />
              <span>Reset Position</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
