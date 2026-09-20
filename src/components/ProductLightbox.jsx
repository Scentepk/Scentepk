import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from "lucide-react";
import { LUXURY_EASE, SUBTLE_EASE } from "../lib/animations";

/**
 * ProductLightbox - Full-screen luxury image viewer for SCENTÉ Product Detail Page
 * Features:
 * - Desktop keyboard navigation (ArrowLeft, ArrowRight, Escape)
 * - Mobile touch swipe gestures (drag left/right to switch images)
 * - Pinch-to-zoom and double-tap zoom (1x to 2.5x)
 * - Image counter ("01 / 04")
 * - Miniature bottom thumbnail strip
 * - Body scroll locking and backdrop dismiss
 */
export default function ProductLightbox({
  isOpen = false,
  images = [],
  initialIndex = 0,
  productName = "Product",
  onClose,
}) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [scale, setScale] = useState(1);
  const [panPosition, setPanPosition] = useState({ x: 0, y: 0 });
  const [direction, setDirection] = useState(0); // -1 for prev, +1 for next

  // Touch tracking refs
  const touchStartRef = useRef({ x: 0, y: 0, time: 0 });
  const touchDistanceRef = useRef(0);
  const isDraggingRef = useRef(false);
  const lastTapRef = useRef(0);

  // Sync initialIndex when lightbox opens
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex);
      setScale(1);
      setPanPosition({ x: 0, y: 0 });
      setDirection(0);
    }
  }, [isOpen, initialIndex]);

  // Lock body scrolling when open
  useEffect(() => {
    if (isOpen) {
      const previousOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = previousOverflow || "unset";
      };
    }
  }, [isOpen]);

  const totalImages = images.length;

  const handlePrev = useCallback(
    (e) => {
      e?.stopPropagation?.();
      if (totalImages <= 1) return;
      setDirection(-1);
      setScale(1);
      setPanPosition({ x: 0, y: 0 });
      setCurrentIndex((prev) => (prev - 1 + totalImages) % totalImages);
    },
    [totalImages]
  );

  const handleNext = useCallback(
    (e) => {
      e?.stopPropagation?.();
      if (totalImages <= 1) return;
      setDirection(1);
      setScale(1);
      setPanPosition({ x: 0, y: 0 });
      setCurrentIndex((prev) => (prev + 1) % totalImages);
    },
    [totalImages]
  );

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose?.();
      } else if (e.key === "ArrowLeft") {
        handlePrev();
      } else if (e.key === "ArrowRight") {
        handleNext();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handlePrev, handleNext, onClose]);

  // Double-tap or double-click to toggle zoom
  const handleDoubleTap = (e) => {
    e.stopPropagation();
    if (scale > 1) {
      setScale(1);
      setPanPosition({ x: 0, y: 0 });
    } else {
      setScale(2.5);
    }
  };

  // Touch handlers for mobile swipe & pinch-to-zoom
  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      touchStartRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };
      isDraggingRef.current = true;

      // Detect double-tap on mobile
      const now = Date.now();
      if (now - lastTapRef.current < 300) {
        handleDoubleTap(e);
      }
      lastTapRef.current = now;
    } else if (e.touches.length === 2) {
      // Pinch gesture start
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const dist = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY);
      touchDistanceRef.current = dist;
    }
  };

  const handleTouchMove = (e) => {
    if (e.touches.length === 2) {
      // Handle pinch-to-zoom
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const dist = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY);
      if (touchDistanceRef.current > 0) {
        const factor = dist / touchDistanceRef.current;
        setScale((prev) => Math.min(Math.max(1, prev * (factor > 1 ? 1.03 : 0.97)), 3));
      }
      touchDistanceRef.current = dist;
    } else if (e.touches.length === 1 && scale > 1) {
      // Pan zoomed image
      const touch = e.touches[0];
      const deltaX = touch.clientX - touchStartRef.current.x;
      const deltaY = touch.clientY - touchStartRef.current.y;
      setPanPosition((prev) => ({
        x: prev.x + deltaX * 0.4,
        y: prev.y + deltaY * 0.4,
      }));
      touchStartRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };
    }
  };

  const handleTouchEnd = (e) => {
    if (scale <= 1 && isDraggingRef.current && e.changedTouches.length === 1) {
      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - touchStartRef.current.x;
      const deltaY = touch.clientY - touchStartRef.current.y;
      const elapsed = Date.now() - touchStartRef.current.time;

      // Trigger swipe if horizontal displacement is significant and primarily horizontal
      const minSwipeDistance = 45;
      if (Math.abs(deltaX) > minSwipeDistance && Math.abs(deltaX) > Math.abs(deltaY) * 1.4 && elapsed < 500) {
        if (deltaX < 0) {
          handleNext();
        } else {
          handlePrev();
        }
      }
    }
    isDraggingRef.current = false;
    touchDistanceRef.current = 0;
  };

  const currentImageSrc = images[currentIndex] || "";

  // Slide animation variants for smooth transition between images
  const slideVariants = {
    enter: (dir) => ({
      x: dir > 0 ? 80 : dir < 0 ? -80 : 0,
      opacity: 0,
      scale: 0.98,
    }),
    center: {
      x: 0,
      opacity: 1,
      scale: 1,
      transition: {
        x: { type: "spring", stiffness: 320, damping: 32 },
        opacity: { duration: 0.25 },
        scale: { duration: 0.25, ease: SUBTLE_EASE },
      },
    },
    exit: (dir) => ({
      x: dir > 0 ? -80 : dir < 0 ? 80 : 0,
      opacity: 0,
      scale: 0.98,
      transition: {
        x: { type: "spring", stiffness: 320, damping: 32 },
        opacity: { duration: 0.2 },
      },
    }),
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label={`${productName} image gallery lightbox`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.28, ease: LUXURY_EASE }}
          onClick={onClose}
          className="fixed inset-0 h-[100dvh] z-50 bg-[#090908]/95 backdrop-blur-xl flex flex-col justify-between select-none overflow-hidden safe-pt safe-pb"
        >
          {/* Top Bar: Brand, Image Counter, and Close Button */}
          <div
            className="w-full flex items-center justify-between px-5 sm:px-8 py-4 sm:py-5 z-20"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Left: Counter & Title */}
            <div className="flex items-center space-x-3 sm:space-x-4">
              <span className="font-serif text-sm sm:text-base tracking-[0.2em] text-[#F2EEE7] font-medium hidden xs:inline-block">
                SCENTÉ
              </span>
              {totalImages > 1 && (
                <div className="bg-[#141312] border border-[rgba(242,238,231,0.1)] px-3 py-1 text-[11px] font-mono tracking-[0.18em] text-[#AAA49B] rounded-full">
                  <span className="text-[#F2EEE7] font-medium">
                    {String(currentIndex + 1).padStart(2, "0")}
                  </span>
                  <span className="mx-1 text-[#777169]">/</span>
                  <span>{String(totalImages).padStart(2, "0")}</span>
                </div>
              )}
            </div>

            {/* Center Hint (Mobile / Desktop cues) */}
            <div className="hidden md:flex items-center space-x-2 text-[10px] uppercase font-sans tracking-[0.18em] text-[#777169]">
              <span>Double-click to zoom</span>
              <span>•</span>
              <span>Use arrow keys</span>
            </div>

            {/* Right: Zoom controls & Close */}
            <div className="flex items-center space-x-2 sm:space-x-3">
              {/* Zoom toggle button */}
              <button
                type="button"
                onClick={handleDoubleTap}
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-full border border-[rgba(242,238,231,0.14)] bg-[#141312]/80 hover:bg-[#1C1B18] text-[#AAA49B] hover:text-[#BFA27A] hover:border-[#BFA27A] flex items-center justify-center transition-colors cursor-pointer"
                aria-label={scale > 1 ? "Zoom out" : "Zoom in"}
                title={scale > 1 ? "Reset zoom" : "Zoom in"}
              >
                {scale > 1 ? (
                  <ZoomOut className="w-4 h-4 stroke-[1.5]" />
                ) : (
                  <ZoomIn className="w-4 h-4 stroke-[1.5]" />
                )}
              </button>

              {/* Close Button */}
              <button
                type="button"
                onClick={onClose}
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-full border border-[rgba(242,238,231,0.14)] bg-[#141312]/80 hover:bg-[#1C1B18] text-[#AAA49B] hover:text-[#BFA27A] hover:border-[#BFA27A] flex items-center justify-center transition-colors cursor-pointer"
                aria-label="Close image gallery"
                title="Close gallery (Esc)"
              >
                <X className="w-5 h-5 stroke-[1.5]" />
              </button>
            </div>
          </div>

          {/* Main Content Area: Centered Image & Touch Surface */}
          <div
            className="flex-1 relative w-full h-full flex items-center justify-center overflow-hidden px-4 sm:px-12"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {/* Desktop Left Navigation Arrow */}
            {totalImages > 1 && (
              <button
                type="button"
                onClick={handlePrev}
                className="absolute left-4 sm:left-6 top-1/2 -translate-y-1/2 z-20 w-11 h-11 sm:w-12 sm:h-12 rounded-full border border-[rgba(242,238,231,0.14)] bg-[#121110]/80 hover:bg-[#181714] text-[#F2EEE7] hover:text-[#BFA27A] hover:border-[#BFA27A] flex items-center justify-center transition-all duration-200 shadow-2xl cursor-pointer group"
                aria-label="Previous image"
              >
                <ChevronLeft className="w-6 h-6 stroke-[1.5] transition-transform group-hover:-translate-x-0.5" />
              </button>
            )}

            {/* Active Image Container */}
            <div
              className="relative max-w-full max-h-full flex items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              <AnimatePresence initial={false} custom={direction} mode="wait">
                <motion.div
                  key={currentImageSrc}
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  className="flex items-center justify-center cursor-zoom-in"
                  onClick={handleDoubleTap}
                  style={{
                    cursor: scale > 1 ? "grab" : "zoom-in",
                  }}
                >
                  <img
                    src={currentImageSrc}
                    alt={`${productName} - View ${currentIndex + 1}`}
                    draggable={false}
                    style={{
                      transform: `scale(${scale}) translate3d(${panPosition.x / scale}px, ${panPosition.y / scale}px, 0)`,
                      transition: isDraggingRef.current ? "none" : "transform 0.25s cubic-bezier(0.22, 1, 0.36, 1)",
                    }}
                    className="max-h-[68dvh] sm:max-h-[76vh] md:max-h-[80vh] max-w-[92vw] sm:max-w-[85vw] object-contain rounded-lg shadow-[0_25px_70px_rgba(0,0,0,0.9)] border border-[rgba(242,238,231,0.06)] pointer-events-auto"
                  />
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Desktop Right Navigation Arrow */}
            {totalImages > 1 && (
              <button
                type="button"
                onClick={handleNext}
                className="absolute right-4 sm:right-6 top-1/2 -translate-y-1/2 z-20 w-11 h-11 sm:w-12 sm:h-12 rounded-full border border-[rgba(242,238,231,0.14)] bg-[#121110]/80 hover:bg-[#181714] text-[#F2EEE7] hover:text-[#BFA27A] hover:border-[#BFA27A] flex items-center justify-center transition-all duration-200 shadow-2xl cursor-pointer group"
                aria-label="Next image"
              >
                <ChevronRight className="w-6 h-6 stroke-[1.5] transition-transform group-hover:translate-x-0.5" />
              </button>
            )}
          </div>

          {/* Bottom Thumbnail Strip (Quick Navigation) */}
          <div
            className="w-full py-4 sm:py-5 px-4 flex flex-col items-center justify-center space-y-2 z-20"
            onClick={(e) => e.stopPropagation()}
          >
            {totalImages > 1 && (
              <div className="flex items-center gap-2 sm:gap-2.5 overflow-x-auto max-w-full px-2 py-1 scrollbar-none">
                {images.map((imgUrl, idx) => {
                  const isActive = idx === currentIndex;
                  return (
                    <button
                      key={`${imgUrl}-${idx}`}
                      type="button"
                      onClick={() => {
                        setDirection(idx > currentIndex ? 1 : -1);
                        setScale(1);
                        setPanPosition({ x: 0, y: 0 });
                        setCurrentIndex(idx);
                      }}
                      className={`relative aspect-[4/3] w-12 sm:w-14 rounded-md overflow-hidden border transition-all duration-200 cursor-pointer bg-[#121110] shrink-0 ${
                        isActive
                          ? "border-[#BFA27A] ring-1 ring-[#BFA27A] opacity-100 scale-105 shadow-[0_0_12px_rgba(191,162,122,0.3)]"
                          : "border-[rgba(242,238,231,0.1)] opacity-50 hover:opacity-85 hover:border-[rgba(242,238,231,0.3)]"
                      }`}
                      aria-label={`Jump to photo ${idx + 1}`}
                    >
                      <img
                        src={imgUrl}
                        alt={`Thumbnail ${idx + 1}`}
                        className="w-full h-full object-cover pointer-events-none"
                      />
                    </button>
                  );
                })}
              </div>
            )}

            {/* Mobile Swipe Guidance Note */}
            <span className="text-[9.5px] uppercase font-sans tracking-[0.2em] text-[#777169] md:hidden">
              Swipe left / right to browse
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
