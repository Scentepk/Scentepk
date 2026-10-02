import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { ChevronLeft, ChevronRight, Star } from "lucide-react";
import {
  getReviewsVisibleCount,
  calculateCarouselMaxIndex,
  shouldShowCarouselNavigation,
} from "../services/reviews";

/**
 * Individual Review Card component adhering strictly to SCENTÉ Haute Parfumerie aesthetic tokens.
 */
function ReviewCard({ review, fragranceLabel, cardRef }) {
  return (
    <div
      ref={cardRef}
      data-review-card
      className="p-5 sm:p-8 rounded-2xl bg-[#121110] border border-white/[0.05] hover:border-[#BFA27A]/25 transition-all duration-300 flex flex-col justify-between space-y-6 h-full min-h-[260px] sm:min-h-[280px]"
    >
      <div className="space-y-4">
        <div className="flex items-center gap-1 text-[#BFA27A]">
          {[...Array(5)].map((_, i) => (
            <Star
              key={i}
              className={`w-3.5 h-3.5 ${
                i < review.rating ? "fill-[#BFA27A] stroke-none" : "stroke-white/20 fill-none"
              }`}
            />
          ))}
        </div>

        <p className="text-xs sm:text-sm font-sans text-[#DDD7CE] font-light leading-relaxed italic line-clamp-4">
          "{review.reviewText}"
        </p>
      </div>

      <div className="pt-4 border-t border-white/[0.06] flex items-center justify-between">
        <div>
          <h4 className="font-sans font-semibold text-sm text-[#F2EEE7]">
            {review.customerName}
          </h4>
          <span className="text-[9.5px] uppercase font-sans tracking-[0.16em] text-[#888279] block">
            {review.location ? `${review.location} • ` : ""}Verified Patron
          </span>
        </div>
        {fragranceLabel && (
          <span className="text-[9.5px] uppercase font-sans tracking-[0.16em] text-[#BFA27A] bg-[#181714] px-2.5 py-1 rounded-full border border-[rgba(191,162,122,0.2)]">
            {fragranceLabel}
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * Responsive Luxury Horizontal Reviews Carousel
 * - Desktop: 3 visible cards, shifts 1 review at a time.
 * - Tablet: 2 visible cards, shifts 1 review at a time.
 * - Mobile: 1 visible card, touch-friendly swipe gesture.
 * - Stable height across any review volume.
 */
export default function ReviewsCarousel({ reviews = [] }) {
  const viewportRef = useRef(null);
  const firstCardRef = useRef(null);
  const [rawIndex, setRawIndex] = useState(0);
  const [windowWidth, setWindowWidth] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth : 1024
  );
  const [viewportWidth, setViewportWidth] = useState(0);
  const [stepWidth, setStepWidth] = useState(0);

  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const isHorizontalSwipe = useRef(false);

  const safeReviewsLength = Array.isArray(reviews) ? reviews.length : 0;

  // Sync window width & recalculate step dimensions via ResizeObserver
  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth;
      setWindowWidth(w);
      if (viewportRef.current) {
        setViewportWidth(viewportRef.current.clientWidth);
      }
      if (firstCardRef.current) {
        const cardW = firstCardRef.current.offsetWidth;
        const gap = 24; // 1.5rem (gap-6)
        setStepWidth(cardW + gap);
      }
    };

    handleResize();

    const ro = new ResizeObserver(() => {
      handleResize();
    });

    if (viewportRef.current) ro.observe(viewportRef.current);
    if (firstCardRef.current) ro.observe(firstCardRef.current);
    window.addEventListener("resize", handleResize);

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", handleResize);
    };
  }, [safeReviewsLength]);

  const visibleCount = useMemo(() => getReviewsVisibleCount(windowWidth), [windowWidth]);
  const maxIndex = useMemo(
    () => calculateCarouselMaxIndex(safeReviewsLength, visibleCount),
    [safeReviewsLength, visibleCount]
  );

  // Derived clamped index avoids cascading setState in effect
  const activeIndex = Math.min(rawIndex, maxIndex);

  const handlePrev = useCallback(() => {
    setRawIndex((prev) => Math.max(0, Math.min(prev, maxIndex) - 1));
  }, [maxIndex]);

  const handleNext = useCallback(() => {
    setRawIndex((prev) => Math.min(maxIndex, Math.min(prev, maxIndex) + 1));
  }, [maxIndex]);

  // Keyboard navigation when carousel is focused
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        handlePrev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        handleNext();
      }
    },
    [handlePrev, handleNext]
  );

  // Dynamic pixel offset for hardware-accelerated translateX
  const offsetPx = useMemo(() => {
    if (activeIndex === 0) return 0;
    if (stepWidth > 0) return activeIndex * stepWidth;
    if (viewportWidth > 0) {
      const cardW = (viewportWidth - (visibleCount - 1) * 24) / visibleCount;
      return activeIndex * (cardW + 24);
    }
    return 0;
  }, [activeIndex, stepWidth, viewportWidth, visibleCount]);

  // Guard: 0 reviews -> render nothing
  if (!reviews || reviews.length === 0) return null;

  // Touch gesture handling for smooth mobile swiping (doesn't block vertical scroll)
  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    isHorizontalSwipe.current = false;
  };

  const handleTouchMove = (e) => {
    const deltaX = Math.abs(e.touches[0].clientX - touchStartX.current);
    const deltaY = Math.abs(e.touches[0].clientY - touchStartY.current);
    if (deltaX > deltaY && deltaX > 10) {
      isHorizontalSwipe.current = true;
    }
  };

  const handleTouchEnd = (e) => {
    if (!isHorizontalSwipe.current) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    const threshold = 40;
    if (deltaX < -threshold) {
      handleNext();
    } else if (deltaX > threshold) {
      handlePrev();
    }
  };

  // Edge Case: 1 review -> centered luxury card, no arrows or dots
  if (reviews.length === 1) {
    const review = reviews[0];
    const fragranceLabel =
      review.productName || review.product?.name || (review.productId ? "Extrait de Parfum" : null);

    return (
      <div className="max-w-md mx-auto mt-12 sm:mt-16">
        <ReviewCard review={review} fragranceLabel={fragranceLabel} />
      </div>
    );
  }

  const showNavMobile = reviews.length > 1;
  const showNavDesktop = reviews.length > 3;

  // Whether current active breakpoint needs navigation
  const canNavigate = shouldShowCarouselNavigation(reviews.length, visibleCount);

  const isPrevDisabled = activeIndex === 0;
  const isNextDisabled = activeIndex >= maxIndex;

  return (
    <div className="relative mt-12 sm:mt-16">
      {/* Flex container placing flanking arrows cleanly outside the review cards */}
      <div className="flex items-center gap-3 sm:gap-4 lg:gap-5">
        {/* Desktop & Tablet Previous Arrow (Cleanly outside cards on the left) */}
        {canNavigate && (
          <button
            type="button"
            onClick={handlePrev}
            disabled={isPrevDisabled}
            aria-label="Previous review"
            className={`hidden md:flex shrink-0 z-20 w-10 h-10 lg:w-11 lg:h-11 rounded-full items-center justify-center border transition-all duration-300 shadow-xl focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#BFA27A] ${
              isPrevDisabled
                ? "border-white/5 bg-[#121110]/50 text-[#555049] cursor-not-allowed opacity-30"
                : "border-white/10 bg-[#121110]/95 text-[#F2EEE7] hover:text-[#BFA27A] hover:border-[#BFA27A]/50 hover:bg-[#181714] cursor-pointer"
            } ${!showNavDesktop ? "lg:hidden" : ""}`}
          >
            <ChevronLeft className="w-5 h-5 stroke-[1.5]" />
          </button>
        )}

        {/* Carousel Viewport Container */}
        <div
          ref={viewportRef}
          className="overflow-hidden flex-1 min-w-0 focus-visible:outline-none"
          tabIndex={canNavigate ? 0 : -1}
          onKeyDown={canNavigate ? handleKeyDown : undefined}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          role="region"
          aria-roledescription="carousel"
          aria-label="Customer Reviews"
        >
        <div
          className={`flex gap-6 items-stretch transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            reviews.length === 2 ? "lg:justify-center" : ""
          }`}
          style={{
            transform: `translateX(-${offsetPx}px)`,
          }}
        >
          {reviews.map((review, idx) => {
            const fragranceLabel =
              review.productName ||
              review.product?.name ||
              (review.productId ? "Extrait de Parfum" : null);

            return (
              <div
                key={review.id || idx}
                ref={idx === 0 ? firstCardRef : null}
                className="w-full md:w-[calc((100%-1.5rem)/2)] lg:w-[calc((100%-3rem)/3)] shrink-0 flex flex-col"
              >
                <ReviewCard review={review} fragranceLabel={fragranceLabel} />
              </div>
            );
          })}
        </div>
      </div>

      {/* Desktop & Tablet Next Arrow (Cleanly outside cards on the right) */}
      {canNavigate && (
        <button
          type="button"
          onClick={handleNext}
          disabled={isNextDisabled}
          aria-label="Next review"
          className={`hidden md:flex shrink-0 z-20 w-10 h-10 lg:w-11 lg:h-11 rounded-full items-center justify-center border transition-all duration-300 shadow-xl focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#BFA27A] ${
            isNextDisabled
              ? "border-white/5 bg-[#121110]/50 text-[#555049] cursor-not-allowed opacity-30"
              : "border-white/10 bg-[#121110]/95 text-[#F2EEE7] hover:text-[#BFA27A] hover:border-[#BFA27A]/50 hover:bg-[#181714] cursor-pointer"
          } ${!showNavDesktop ? "lg:hidden" : ""}`}
        >
          <ChevronRight className="w-5 h-5 stroke-[1.5]" />
        </button>
      )}
    </div>

      {/* Bottom Controls Bar: Mobile (Arrows + Dots) & Tablet/Desktop (Subtle Dots) */}
      {canNavigate && (
        <div
          className={`flex items-center justify-between md:justify-center gap-4 mt-8 sm:mt-10 ${
            !showNavDesktop ? "lg:hidden" : ""
          }`}
        >
          {/* Mobile Prev Arrow */}
          <button
            type="button"
            onClick={handlePrev}
            disabled={isPrevDisabled}
            aria-label="Previous review"
            className={`md:hidden flex w-10 h-10 rounded-full items-center justify-center border transition-all duration-300 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#BFA27A] ${
              isPrevDisabled
                ? "border-white/5 bg-[#121110]/50 text-[#555049] cursor-not-allowed opacity-30"
                : "border-white/10 bg-[#121110] text-[#F2EEE7] hover:text-[#BFA27A] hover:border-[#BFA27A]/50 active:scale-95"
            } ${!showNavMobile ? "hidden" : ""}`}
          >
            <ChevronLeft className="w-4 h-4 stroke-[1.75]" />
          </button>

          {/* Pagination Indicators / Dots */}
          <div className="flex items-center gap-2" role="tablist" aria-label="Review pagination">
            {Array.from({ length: maxIndex + 1 }).map((_, idx) => (
              <button
                key={idx}
                type="button"
                role="tab"
                aria-selected={activeIndex === idx}
                aria-label={`Go to review slide ${idx + 1}`}
                onClick={() => setRawIndex(idx)}
                className={`transition-all duration-300 rounded-full focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#BFA27A] ${
                  activeIndex === idx
                    ? "w-6 h-1.5 bg-[#BFA27A]"
                    : "w-1.5 h-1.5 bg-white/20 hover:bg-white/40"
                }`}
              />
            ))}
          </div>

          {/* Mobile Next Arrow */}
          <button
            type="button"
            onClick={handleNext}
            disabled={isNextDisabled}
            aria-label="Next review"
            className={`md:hidden flex w-10 h-10 rounded-full items-center justify-center border transition-all duration-300 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#BFA27A] ${
              isNextDisabled
                ? "border-white/5 bg-[#121110]/50 text-[#555049] cursor-not-allowed opacity-30"
                : "border-white/10 bg-[#121110] text-[#F2EEE7] hover:text-[#BFA27A] hover:border-[#BFA27A]/50 active:scale-95"
            } ${!showNavMobile ? "hidden" : ""}`}
          >
            <ChevronRight className="w-4 h-4 stroke-[1.75]" />
          </button>
        </div>
      )}
    </div>
  );
}
