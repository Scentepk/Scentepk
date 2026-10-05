import React, { useState, useRef, useEffect } from "react";
import {
  X,
  RotateCw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  RotateCcw,
  Check,
  Crop,
  Move,
  Grid,
  ChevronRight,
  Eye,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useSmoothScroll } from "../../context/SmoothScrollProvider";

/**
 * SCENTE Luxury Visual Image Crop & Positioning Modal
 * Provides visual 1:1 and 4:5 rule-of-thirds framing, direct pointer dragging,
 * smooth wheel/slider zoom, rotation, live storefront preview card,
 * and high-resolution canvas export.
 */
export default function ImageCropModal({
  isOpen,
  onClose,
  imageSource, // File, Blob, or URL string
  imageFileName = "fragrance-product.jpg",
  productName = "Crafted Fragrance",
  productSubtitle = "Extrait de Parfum",
  productPrice = 12500,
  queueIndex = 0,
  queueTotal = 1,
  onApplyCrop, // ({ file, dataUrl, cropMetadata }) => void
  isProcessing = false,
}) {
  const { lenis } = useSmoothScroll();

  // Crop state
  const [aspectRatio, setAspectRatio] = useState("1:1"); // '1:1' | '4:5'
  const [zoom, setZoom] = useState(1.0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [rotation, setRotation] = useState(0); // 0, 90, 180, 270
  const [showGrid, setShowGrid] = useState(true);

  // Image loading state
  const [imageUrl, setImageUrl] = useState(null);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [loadError, setLoadError] = useState("");

  // Refs for dragging and viewport
  const viewportRef = useRef(null);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const panStartRef = useRef({ x: 0, y: 0 });
  const touchDistanceRef = useRef(null);

  // 1. Lock Body Scroll & Pause Lenis Smooth Scroll while modal is open
  useEffect(() => {
    if (!isOpen) return;

    // Pause Lenis
    if (lenis) {
      try {
        lenis.stop();
      } catch {
        // safe ignore
      }
    }

    // Lock document body scroll
    const originalBodyOverflow = document.body.style.overflow;
    const originalHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      // Resume Lenis
      if (lenis) {
        try {
          lenis.start();
        } catch {
          // safe ignore
        }
      }
      document.body.style.overflow = originalBodyOverflow;
      document.documentElement.style.overflow = originalHtmlOverflow;
    };
  }, [isOpen, lenis]);

  // 2. Store image object URL and clean up
  useEffect(() => {
    if (!isOpen || !imageSource) {
      setImageUrl(null);
      setIsImageLoaded(false);
      setLoadError("");
      return;
    }

    let urlToLoad = null;
    let isCreatedBlobUrl = false;

    if (imageSource instanceof File || imageSource instanceof Blob) {
      urlToLoad = URL.createObjectURL(imageSource);
      isCreatedBlobUrl = true;
      setImageUrl(urlToLoad);
    } else if (typeof imageSource === "string") {
      // Remote or local string URL
      urlToLoad = imageSource;
      setImageUrl(urlToLoad);
    }

    // Reset crop transforms on new image
    setZoom(1.0);
    setPan({ x: 0, y: 0 });
    setRotation(0);
    setIsImageLoaded(false);
    setLoadError("");

    return () => {
      if (isCreatedBlobUrl && urlToLoad) {
        URL.revokeObjectURL(urlToLoad);
      }
    };
  }, [isOpen, imageSource]);

  // Handle image element load
  const handleImageLoaded = (e) => {
    const { naturalWidth, naturalHeight } = e.target;
    setImageSize({ width: naturalWidth, height: naturalHeight });
    setIsImageLoaded(true);
  };

  const handleImageError = () => {
    setLoadError("Unable to load image for framing. Please verify the file format.");
  };

  // Keyboard escape listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen && !isProcessing) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isProcessing, onClose]);

  // Viewport dimensions (calibrated for laptop & desktop viewing without overflow)
  const getViewportDimensions = () => {
    if (aspectRatio === "4:5") {
      return { width: 256, height: 320 };
    }
    // 1:1 Square (storefront standard)
    return { width: 290, height: 290 };
  };

  // Direct Mouse / Touch Dragging
  const handlePointerDown = (e) => {
    if (!isImageLoaded || isProcessing) return;
    e.preventDefault();
    e.stopPropagation();
    isDraggingRef.current = true;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    panStartRef.current = { ...pan };

    if (e.currentTarget.setPointerCapture) {
      e.currentTarget.setPointerCapture(e.pointerId);
    }
  };

  const handlePointerMove = (e) => {
    if (!isDraggingRef.current) return;
    e.preventDefault();
    e.stopPropagation();
    const deltaX = e.clientX - dragStartRef.current.x;
    const deltaY = e.clientY - dragStartRef.current.y;

    setPan({
      x: Math.round(panStartRef.current.x + deltaX),
      y: Math.round(panStartRef.current.y + deltaY),
    });
  };

  const handlePointerUp = (e) => {
    isDraggingRef.current = false;
    touchDistanceRef.current = null;
    if (e.currentTarget.releasePointerCapture) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // Safe ignore
      }
    }
  };

  // Mouse wheel zoom (strictly stops propagation so the page background NEVER scrolls)
  const handleWheel = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const zoomStep = e.deltaY < 0 ? 0.08 : -0.08;
    setZoom((prev) => {
      const next = parseFloat((prev + zoomStep).toFixed(2));
      return Math.min(3.5, Math.max(0.6, next));
    });
  };

  // Touch pinch-to-zoom
  const handleTouchMove = (e) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      e.stopPropagation();
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      );

      if (touchDistanceRef.current !== null) {
        const delta = distance - touchDistanceRef.current;
        setZoom((prev) => {
          const next = parseFloat((prev + delta * 0.005).toFixed(2));
          return Math.min(3.5, Math.max(0.6, next));
        });
      }
      touchDistanceRef.current = distance;
    }
  };

  const handleTouchEnd = () => {
    touchDistanceRef.current = null;
  };

  // Rotation: 90-degree step clockwise
  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  // Reset to default center framing
  const handleReset = () => {
    setZoom(1.0);
    setPan({ x: 0, y: 0 });
    setRotation(0);
  };

  // Preset: Fit Image (contain entirely within frame)
  const handleFitImage = () => {
    if (!imageSize.width || !imageSize.height) return;
    const { width: vW, height: vH } = getViewportDimensions();
    const isRotated90or270 = rotation === 90 || rotation === 270;
    const currentW = isRotated90or270 ? imageSize.height : imageSize.width;
    const currentH = isRotated90or270 ? imageSize.width : imageSize.height;

    const scale = Math.min(vW / currentW, vH / currentH);
    const baseCoverScale = Math.max(vW / currentW, vH / currentH);
    const fitZoom = parseFloat((scale / baseCoverScale).toFixed(2));
    setZoom(Math.max(0.6, fitZoom));
    setPan({ x: 0, y: 0 });
  };

  // Preset: Fill Frame (cover entire frame)
  const handleFillFrame = () => {
    setZoom(1.0);
    setPan({ x: 0, y: 0 });
  };

  // Calculate base display size for the image so it fits/covers the frame naturally at zoom=1
  const calculateBaseDisplaySize = () => {
    const { width: vW, height: vH } = getViewportDimensions();
    if (!imageSize.width || !imageSize.height) {
      return { width: vW, height: vH };
    }

    const isRotated = rotation === 90 || rotation === 270;
    const naturalW = isRotated ? imageSize.height : imageSize.width;
    const naturalH = isRotated ? imageSize.width : imageSize.height;

    // Minimum scale to cover viewport without letterboxing at zoom = 1
    const coverScale = Math.max(vW / naturalW, vH / naturalH);

    return {
      width: Math.round(imageSize.width * coverScale),
      height: Math.round(imageSize.height * coverScale),
    };
  };

  const baseSize = calculateBaseDisplaySize();
  const vDim = getViewportDimensions();

  // Export high-resolution cropped file using HTML5 Canvas
  const handleApply = async () => {
    if (!imageUrl || !imageSize.width || !imageSize.height || isProcessing) return;

    try {
      // Determine canvas export dimensions
      const targetOutputSize = aspectRatio === "4:5"
        ? { width: 1200, height: 1500 }
        : { width: 1400, height: 1400 };

      const canvas = document.createElement("canvas");
      canvas.width = targetOutputSize.width;
      canvas.height = targetOutputSize.height;
      const ctx = canvas.getContext("2d", { alpha: false });

      if (!ctx) {
        throw new Error("Could not initialize 2D canvas context.");
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.fillStyle = "#0D0D0C";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Load image element
      const img = new Image();
      img.crossOrigin = "anonymous";

      await new Promise((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = (err) => reject(err);
        img.src = imageUrl;
      });

      // Scale ratio from modal viewport to high-res canvas
      const scaleToCanvas = targetOutputSize.width / vDim.width;

      ctx.save();
      // Translate to canvas center + pan offset scaled to high-res
      ctx.translate(
        canvas.width / 2 + pan.x * scaleToCanvas,
        canvas.height / 2 + pan.y * scaleToCanvas
      );
      // Rotation
      ctx.rotate((rotation * Math.PI) / 180);
      // Zoom and canvas scale
      ctx.scale(zoom * scaleToCanvas, zoom * scaleToCanvas);

      // Draw image centered around its base dimensions
      ctx.drawImage(
        img,
        -baseSize.width / 2,
        -baseSize.height / 2,
        baseSize.width,
        baseSize.height
      );
      ctx.restore();

      // Convert canvas to Blob
      const blob = await new Promise((resolve) => {
        canvas.toBlob(
          (b) => {
            if (b) resolve(b);
            else {
              canvas.toBlob((jb) => resolve(jb), "image/jpeg", 0.92);
            }
          },
          "image/webp",
          0.92
        );
      });

      if (!blob) {
        throw new Error("Canvas export failed to produce image blob.");
      }

      // Generate clean file name
      const baseName = (imageFileName || "fragrance-photo")
        .replace(/\.[^/.]+$/, "")
        .replace(/[^\w-]/g, "-")
        .toLowerCase();
      const outputFileName = `${baseName}-cropped-${Date.now()}.webp`;

      const croppedFile = new File([blob], outputFileName, {
        type: blob.type || "image/webp",
        lastModified: Date.now(),
      });

      const dataUrl = canvas.toDataURL("image/webp", 0.92);

      // Pass result to parent callback
      onApplyCrop({
        file: croppedFile,
        dataUrl,
        cropMetadata: {
          zoom,
          pan,
          rotation,
          aspectRatio,
          sourceWidth: imageSize.width,
          sourceHeight: imageSize.height,
        },
      });
    } catch (err) {
      console.error("Error cropping image:", err);
      setLoadError("Failed to render high-resolution crop. Please try again.");
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto"
        data-lenis-prevent
      >
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/85 backdrop-blur-md transition-opacity"
          onClick={!isProcessing ? onClose : undefined}
          data-lenis-prevent
        />

        {/* Modal Window (max-h constrained so it never overflows laptop screen) */}
        <motion.div
          initial={{ opacity: 0, scale: 0.97, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.97, y: 10 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          data-lenis-prevent
          className="relative w-full max-w-4xl max-h-[92vh] bg-[#0D0D0C] border border-[rgba(242,238,231,0.1)] rounded-xl sm:rounded-2xl shadow-[0_30px_100px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col z-10 text-[#F2EEE7]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* 1. MODAL HEADER (FIXED TOP BAR) */}
          <div className="shrink-0 px-4 sm:px-6 py-3 border-b border-[rgba(242,238,231,0.08)] bg-[#121110] flex items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[10px] uppercase font-sans tracking-[0.2em] text-[#BFA27A] font-medium flex items-center gap-1.5">
                  <Crop className="w-3 h-3" />
                  <span>IMAGE STUDIO</span>
                </span>
                {queueTotal > 1 && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#BFA27A]/15 text-[#BFA27A] border border-[#BFA27A]/30">
                    Image {queueIndex + 1} of {queueTotal}
                  </span>
                )}
              </div>
              <h2 className="font-serif text-base sm:text-lg text-[#F2EEE7] font-normal">
                Frame & Position Fragrance Image
              </h2>
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              disabled={isProcessing}
              className="p-1.5 text-[#AAA49B] hover:text-[#F2EEE7] hover:bg-white/[0.06] rounded-lg transition-colors cursor-pointer disabled:opacity-40"
              aria-label="Close image crop editor"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* 2. MAIN WORKSPACE (SCROLLABLE BODY WITH LENIS PREVENT) */}
          <div
            data-lenis-prevent
            className="flex-1 overflow-y-auto min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-0 divide-y lg:divide-y-0 lg:divide-x divide-[rgba(242,238,231,0.08)]"
          >
            {/* LEFT / CENTER: INTERACTIVE CROP STAGE (7 COLS) */}
            <div
              data-lenis-prevent
              className="lg:col-span-7 xl:col-span-8 p-3 sm:p-5 flex flex-col items-center justify-between bg-[#0A0A09] relative select-none space-y-3"
            >
              {/* Aspect Ratio Switcher */}
              <div className="w-full flex items-center justify-between text-xs">
                <div className="flex items-center gap-1 bg-[#121110] p-1 rounded-lg border border-white/[0.08]">
                  <button
                    type="button"
                    onClick={() => setAspectRatio("1:1")}
                    className={`px-3 py-1 rounded-md text-[10.5px] uppercase tracking-wider font-medium transition-all cursor-pointer ${
                      aspectRatio === "1:1"
                        ? "bg-[#BFA27A] text-[#0D0D0C] shadow-sm font-semibold"
                        : "text-[#AAA49B] hover:text-[#F2EEE7]"
                    }`}
                  >
                    1:1 Square (Shop Standard)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAspectRatio("4:5")}
                    className={`px-3 py-1 rounded-md text-[10.5px] uppercase tracking-wider font-medium transition-all cursor-pointer ${
                      aspectRatio === "4:5"
                        ? "bg-[#BFA27A] text-[#0D0D0C] shadow-sm font-semibold"
                        : "text-[#AAA49B] hover:text-[#F2EEE7]"
                    }`}
                  >
                    4:5 Editorial
                  </button>
                </div>

                {/* Grid toggle */}
                <button
                  type="button"
                  onClick={() => setShowGrid((prev) => !prev)}
                  className={`px-2.5 py-1 rounded-md text-[10.5px] uppercase tracking-wider flex items-center gap-1.5 border transition-colors cursor-pointer ${
                    showGrid
                      ? "bg-[#BFA27A]/15 text-[#BFA27A] border-[#BFA27A]/40"
                      : "text-[#AAA49B] border-white/10 hover:text-[#F2EEE7]"
                  }`}
                  title="Toggle 3x3 Rule-of-Thirds Grid"
                >
                  <Grid className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">3x3 Grid</span>
                </button>
              </div>

              {/* Crop Frame Stage Container (compact height so it fits on laptop screen) */}
              <div
                data-lenis-prevent
                className="relative flex items-center justify-center overflow-hidden rounded-lg bg-[#070706] border border-white/[0.06] shadow-inner"
                style={{
                  width: "100%",
                  maxWidth: "480px",
                  height: "330px",
                  touchAction: "none",
                }}
                onWheel={handleWheel}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              >
                {/* Background subtle studio checkerboard */}
                <div
                  className="absolute inset-0 opacity-15 pointer-events-none"
                  style={{
                    backgroundImage: `radial-gradient(circle at 1px 1px, rgba(191,162,122,0.3) 1px, transparent 0)`,
                    backgroundSize: "24px 24px",
                  }}
                />

                {/* Drag Hint Overlay */}
                <div className="absolute top-2 left-2 z-20 pointer-events-none flex items-center gap-1.5 bg-[#0D0D0C]/85 backdrop-blur-md px-2.5 py-1 rounded text-[9.5px] uppercase tracking-widest text-[#AAA49B] border border-white/10">
                  <Move className="w-3 h-3 text-[#BFA27A]" />
                  <span>Drag to pan • Scroll to zoom</span>
                </div>

                {/* Viewport Box (The Exact Framing Box) */}
                <div
                  ref={viewportRef}
                  className="relative overflow-visible cursor-grab active:cursor-grabbing select-none"
                  style={{
                    width: `${vDim.width}px`,
                    height: `${vDim.height}px`,
                    maxWidth: "calc(100% - 24px)",
                    maxHeight: "calc(100% - 24px)",
                  }}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={handlePointerUp}
                >
                  {/* Outer Dimmed Mask */}
                  <div
                    className="absolute inset-0 pointer-events-none z-10 border-2 border-[#BFA27A] rounded-sm transition-all"
                    style={{
                      boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.75)",
                    }}
                  />

                  {/* 3x3 Rule-of-Thirds Grid Overlay */}
                  {showGrid && (
                    <div className="absolute inset-0 pointer-events-none z-10 grid grid-cols-3 grid-rows-3">
                      <div className="border-r border-b border-[#BFA27A]/35" />
                      <div className="border-r border-b border-[#BFA27A]/35" />
                      <div className="border-b border-[#BFA27A]/35" />

                      <div className="border-r border-b border-[#BFA27A]/35" />
                      <div className="border-r border-b border-[#BFA27A]/35" />
                      <div className="border-b border-[#BFA27A]/35" />

                      <div className="border-r border-b border-[#BFA27A]/35" />
                      <div className="border-r border-b border-[#BFA27A]/35" />
                      <div />
                    </div>
                  )}

                  {/* The Actual Image Being Framed */}
                  {imageUrl && (
                    <div
                      className="absolute inset-0 flex items-center justify-center pointer-events-none"
                      style={{
                        transform: `translate(${pan.x}px, ${pan.y}px)`,
                        transition: isDraggingRef.current ? "none" : "transform 0.05s ease-out",
                      }}
                    >
                      <img
                        src={imageUrl}
                        alt="Fragrance composition to crop"
                        onLoad={handleImageLoaded}
                        onError={handleImageError}
                        draggable={false}
                        className="max-w-none select-none will-change-transform"
                        style={{
                          width: `${baseSize.width}px`,
                          height: `${baseSize.height}px`,
                          transform: `scale(${zoom}) rotate(${rotation}deg)`,
                          transformOrigin: "center center",
                          transition: isDraggingRef.current ? "none" : "transform 0.05s ease-out",
                        }}
                      />
                    </div>
                  )}
                </div>

                {/* Error notice if image failed */}
                {loadError && (
                  <div className="absolute inset-0 z-30 bg-[#0D0D0C]/90 flex items-center justify-center p-6 text-center">
                    <p className="text-xs text-rose-400 font-sans">{loadError}</p>
                  </div>
                )}
              </div>

              {/* TOOLBAR CONTROLS (ZOOM SLIDER, ROTATE, FIT, RESET) */}
              <div className="w-full bg-[#121110] border border-white/[0.06] rounded-xl p-2.5 sm:p-3 space-y-2">
                {/* Zoom row */}
                <div className="flex items-center gap-2 sm:gap-3">
                  <span className="text-[10px] uppercase font-sans tracking-wider text-[#AAA49B] font-medium shrink-0 flex items-center gap-1">
                    <ZoomIn className="w-3.5 h-3.5 text-[#BFA27A]" />
                    <span>Zoom</span>
                  </span>

                  <button
                    type="button"
                    onClick={() => setZoom((z) => Math.max(0.6, parseFloat((z - 0.1).toFixed(2))))}
                    className="p-1 text-[#AAA49B] hover:text-[#F2EEE7] hover:bg-white/[0.08] rounded cursor-pointer transition-colors"
                    title="Zoom Out"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>

                  <input
                    type="range"
                    min="0.6"
                    max="3.5"
                    step="0.05"
                    value={zoom}
                    onChange={(e) => setZoom(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-[#1C1A17] rounded-lg appearance-none cursor-pointer accent-[#BFA27A]"
                  />

                  <button
                    type="button"
                    onClick={() => setZoom((z) => Math.min(3.5, parseFloat((z + 0.1).toFixed(2))))}
                    className="p-1 text-[#AAA49B] hover:text-[#F2EEE7] hover:bg-white/[0.08] rounded cursor-pointer transition-colors"
                    title="Zoom In"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>

                  <span className="font-mono text-[11px] text-[#BFA27A] min-w-[40px] text-right font-medium">
                    {Math.round(zoom * 100)}%
                  </span>
                </div>

                {/* Presets & Actions */}
                <div className="flex items-center justify-between flex-wrap gap-1.5 pt-1.5 border-t border-white/[0.04] text-[10.5px] font-sans">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={handleRotate}
                      className="px-2 py-1 bg-[#181714] hover:bg-white/[0.08] text-[#AAA49B] hover:text-[#F2EEE7] border border-white/10 rounded-md transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCw className="w-3 h-3 text-[#BFA27A]" />
                      <span>Rotate 90°</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleFitImage}
                      className="px-2 py-1 bg-[#181714] hover:bg-white/[0.08] text-[#AAA49B] hover:text-[#F2EEE7] border border-white/10 rounded-md transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Minimize2 className="w-3 h-3 text-[#BFA27A]" />
                      <span>Fit Image</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleFillFrame}
                      className="px-2 py-1 bg-[#181714] hover:bg-white/[0.08] text-[#AAA49B] hover:text-[#F2EEE7] border border-white/10 rounded-md transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Maximize2 className="w-3 h-3 text-[#BFA27A]" />
                      <span>Fill Frame</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleReset}
                    className="px-2 py-1 text-[#AAA49B] hover:text-[#F2EEE7] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset</span>
                  </button>
                </div>
              </div>
            </div>

            {/* RIGHT SIDEBAR: LIVE STOREFRONT PREVIEW & ACTIONS (5 COLS) */}
            <div
              data-lenis-prevent
              className="lg:col-span-5 xl:col-span-4 p-4 sm:p-5 flex flex-col justify-between bg-[#121110] space-y-4"
            >
              <div className="space-y-3">
                {/* Storefront Live Preview Card Header */}
                <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
                  <span className="text-[10px] uppercase font-sans tracking-[0.18em] text-[#AAA49B] font-medium flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5 text-[#BFA27A]" />
                    <span>LIVE STOREFRONT PREVIEW</span>
                  </span>
                  <span className="text-[9px] uppercase font-mono px-2 py-0.5 rounded bg-[#BFA27A]/15 text-[#BFA27A] border border-[#BFA27A]/30">
                    Exact Look
                  </span>
                </div>

                {/* Live Card Mockup (compact to fit without scrolling) */}
                <div className="mx-auto w-full max-w-[210px] bg-[#0D0D0C] border border-[rgba(242,238,231,0.08)] rounded-sm overflow-hidden shadow-2xl p-2 space-y-2">
                  {/* Framed Image Container */}
                  <div
                    className={`relative ${
                      aspectRatio === "4:5" ? "aspect-[4/5]" : "aspect-square"
                    } bg-[#141312] overflow-hidden rounded-sm border border-[rgba(242,238,231,0.04)] flex items-center justify-center`}
                  >
                    {imageUrl && (
                      <div
                        className="absolute inset-0 flex items-center justify-center pointer-events-none"
                        style={{
                          transform: `translate(${(pan.x * 190) / vDim.width}px, ${(pan.y * 190) / vDim.height}px)`,
                        }}
                      >
                        <img
                          src={imageUrl}
                          alt="Live storefront crop preview"
                          className="max-w-none select-none"
                          style={{
                            width: `${(baseSize.width * 190) / vDim.width}px`,
                            height: `${(baseSize.height * 190) / vDim.height}px`,
                            transform: `scale(${zoom}) rotate(${rotation}deg)`,
                            transformOrigin: "center center",
                          }}
                        />
                      </div>
                    )}

                    {/* Subtle studio vignette matching ProductCard */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0D0D0C]/60 via-transparent to-transparent pointer-events-none" />
                  </div>

                  {/* Card Metadata */}
                  <div className="space-y-0.5 px-0.5">
                    <span className="text-[8px] uppercase tracking-[0.16em] text-[#AAA49B] block font-light truncate">
                      {productSubtitle || "Extrait de Parfum"}
                    </span>
                    <h4 className="font-serif text-xs text-[#F2EEE7] font-normal leading-snug truncate">
                      {productName || "Fragrance Name"}
                    </h4>
                    <div className="flex items-center justify-between pt-0.5">
                      <span className="font-sans text-[11px] font-medium text-[#BFA27A]">
                        Rs. {Number(productPrice || 12500).toLocaleString()}
                      </span>
                      <span className="text-[8.5px] uppercase tracking-wider text-[#777169]">
                        In Stock
                      </span>
                    </div>
                  </div>
                </div>

                {/* Framing Tip */}
                <div className="p-2.5 bg-[#0D0D0C] border border-white/[0.04] rounded-lg text-[10.5px] text-[#AAA49B] space-y-0.5 font-light">
                  <p className="text-[#BFA27A] font-medium text-[9.5px] uppercase tracking-wider">
                    Studio Framing Tip
                  </p>
                  <p>
                    Position the perfume bottle cap or logo along the top third gridline for the most commanding luxury composition.
                  </p>
                </div>
              </div>

              {/* MODAL FOOTER BUTTONS */}
              <div className="space-y-2 pt-3 border-t border-white/[0.06]">
                <button
                  type="button"
                  onClick={handleApply}
                  disabled={!isImageLoaded || isProcessing}
                  className="w-full py-2.5 bg-[#BFA27A] hover:bg-[#A88B65] text-[#0D0D0C] font-semibold text-xs tracking-[0.18em] uppercase rounded-sm transition-all flex items-center justify-center space-x-2 cursor-pointer shadow-lg disabled:opacity-40 min-h-[42px]"
                >
                  {isProcessing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-[#0D0D0C] border-t-transparent rounded-full animate-spin" />
                      <span>UPLOADING CROPPED IMAGE...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>
                        {queueTotal > 1 && queueIndex < queueTotal - 1
                          ? "APPLY & CROP NEXT PHOTO"
                          : "APPLY CROP TO PRODUCT"}
                      </span>
                    </>
                  )}
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={isProcessing}
                    className="flex-1 py-2 bg-transparent hover:bg-white/[0.04] text-[#AAA49B] hover:text-[#F2EEE7] border border-white/10 text-xs tracking-wider uppercase rounded-sm transition-colors cursor-pointer min-h-[36px]"
                  >
                    Cancel
                  </button>

                  {queueTotal > 1 && queueIndex < queueTotal - 1 && (
                    <button
                      type="button"
                      onClick={() => onApplyCrop({ skip: true })}
                      disabled={isProcessing}
                      className="py-2 px-3 bg-transparent hover:bg-white/[0.04] text-[#BFA27A] hover:text-[#F2EEE7] border border-[#BFA27A]/30 text-xs tracking-wider uppercase rounded-sm transition-colors cursor-pointer flex items-center gap-1 min-h-[36px]"
                    >
                      <span>Skip</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
