import React, { useRef, useState, useEffect, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { PRODUCTS } from "../data/products";
import { getActiveProducts } from "../services/products";
import {
  getHeroSettings,
  HERO_UPDATE_EVENT,
  LOCAL_STORAGE_HERO_KEY,
} from "../services/heroSettings";
import { useCart } from "../context/CartContext";
import SectionHeading from "../components/SectionHeading";
import EditorialBanner from "../components/EditorialBanner";
import SEO from "../components/SEO";
import {
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Star,
  Check,
  Plus,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { LUXURY_EASE } from "../lib/animations";
import { getOptimizedImageUrl } from "../lib/images";

// =============================================================================
// HERO SLIDES DATA — Full-Bleed High-Fashion Fragrance Campaign Banners
// =============================================================================
const HERO_SLIDES = [
  {
    id: "slide-1",
    eyebrow: "SCENTÉ — BATCH 04",
    headlineLine1: "FRAGRANCE",
    headlineLine2: "BECOMES",
    headlineLine3: "IDENTITY.",
    subtitle: "Artisanal fragrances crafted for presence, character and lasting impression.",
    ctaText: "EXPLORE FRAGRANCES",
    ctaLink: "/shop",
    badge: "30% PURE PERFUME OIL",
    image: "/images/campaign/hero-campaign-main.jpg",
    imageAlt: "SCENTÉ The Nocturnal Oud Artisanal Fragrance Campaign",
    objectPosition: "object-center md:object-[72%_center] lg:object-center",
    overlayGradient: "from-[#090908]/90 via-[#090908]/50 to-transparent",
  },
  {
    id: "slide-2",
    eyebrow: "ATELIER EXTRAIT DE PARFUM",
    headlineLine1: "YOUR",
    headlineLine2: "SIGNATURE.",
    headlineLine3: "YOUR PRESENCE.",
    subtitle: "Cold-macerated extraits formulated to leave an indelible impression that lingers for 14+ hours.",
    ctaText: "EXPLORE FRAGRANCES",
    ctaLink: "/shop",
    badge: "14+ HR LONGEVITY",
    image: "/images/hero-campaign.jpg",
    imageAlt: "SCENTÉ Artisanal Flacons Haute Parfumerie",
    objectPosition: "object-center md:object-[70%_center] lg:object-center",
    overlayGradient: "from-[#090908]/90 via-[#090908]/55 to-transparent",
  },
  {
    id: "slide-3",
    eyebrow: "HAUTE PARFUMERIE",
    headlineLine1: "PURE",
    headlineLine2: "SENSORY",
    headlineLine3: "DISTINCTION.",
    subtitle: "Artisanal perfumes hand-poured in strictly numbered batches with rare botanical essences.",
    ctaText: "EXPLORE FRAGRANCES",
    ctaLink: "/shop",
    badge: "FREE COD ACROSS PAKISTAN",
    image: "/images/campaign/campaign-1.jpg",
    imageAlt: "SCENTÉ Luxury Fragrance Editorial Campaign",
    objectPosition: "object-center md:object-[76%_center] lg:object-center",
    overlayGradient: "from-[#090908]/95 via-[#090908]/60 to-[#090908]/20",
  },
];

// =============================================================================
// COLLECTION EDITORIAL DATA
// =============================================================================
const EDITORIAL_COLLECTIONS = {
  women: {
    title: "Women Perfumes",
    image: "/images/collections/collection-women.jpg",
    link: "/shop?audience=women",
  },
  men: {
    title: "Men Perfumes",
    image: "/images/collections/collection-men.jpg",
    link: "/shop?audience=men",
  },
};



// =============================================================================
// SOCIAL PROOF DATA (Verified Patron Reflections)
// =============================================================================
const TESTIMONIALS = [
  {
    id: 1,
    name: "Bilal K.",
    city: "Lahore",
    fragrance: "SCENTÉ NOIR",
    quote:
      "SCENTÉ NOIR is simply on another level. The leather and smoked cardamom projection lasted through a 10-hour workday in Lahore and was still noticeable the next morning. Rivals the finest Parisian niche extraits.",
  },
  {
    id: 2,
    name: "Ayesha M.",
    city: "Karachi",
    fragrance: "SCENTÉ AMBER",
    quote:
      "Finally, a Pakistani atelier delivering genuine Extrait de Parfum strength. SCENTÉ AMBER is warm, opulent, and received endless compliments at an evening dinner. Truly exceptional quiet luxury.",
  },
  {
    id: 3,
    name: "Hamza R.",
    city: "Islamabad",
    fragrance: "SCENTÉ OUD",
    quote:
      "The bottle weight, magnetic cap feel, and the rare Assam oud note are extraordinary. Arrived in Islamabad within 48 hours via COD. Superb artistry and flawless presentation.",
  },
];

export default function Home() {
  // Live Product State (localStorage cache + Supabase sync)
  const [activeProducts, setActiveProducts] = useState(() => {
    try {
      const saved = localStorage.getItem("scente_admin_products_cache");
      if (saved) {
        return JSON.parse(saved).filter((p) => p.status !== "inactive" && p.is_active !== false);
      }
    } catch (e) {}
    return PRODUCTS.filter((p) => p.status !== "inactive" && p.is_active !== false);
  });

  useEffect(() => {
    getActiveProducts().then(({ data }) => {
      if (data && data.length > 0) {
        setActiveProducts(data);
      }
    });
  }, []);

  // Cart Context for Quick Add
  const { addToCart } = useCart();
  const [addedItemKey, setAddedItemKey] = useState(null);

  const handleQuickAdd = useCallback(
    (e, product) => {
      e.preventDefault();
      e.stopPropagation();
      const success = addToCart(product, "50ml", 1);
      if (success !== false) {
        setAddedItemKey(product.id);
        setTimeout(() => {
          setAddedItemKey((prev) => (prev === product.id ? null : prev));
        }, 2000);
      }
    },
    [addToCart]
  );

  // ===========================================================================
  // DYNAMIC HERO ATELIER SETTINGS & REAL-TIME BROADCAST SYNC
  // ===========================================================================
  const [customHero, setCustomHero] = useState(() => {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_HERO_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return null;
  });

  useEffect(() => {
    // 1. Initial background fetch from Supabase
    getHeroSettings().then(({ data }) => {
      if (data) setCustomHero(data);
    });

    // 2. Real-time same-window custom event listener
    const handleHeroUpdate = (e) => {
      if (e.detail) setCustomHero(e.detail);
    };

    // 3. Real-time cross-tab storage event listener (no redeploy/reload required)
    const handleStorageChange = (e) => {
      if (e.key === LOCAL_STORAGE_HERO_KEY && e.newValue) {
        try {
          setCustomHero(JSON.parse(e.newValue));
        } catch (err) {}
      }
    };

    window.addEventListener(HERO_UPDATE_EVENT, handleHeroUpdate);
    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener(HERO_UPDATE_EVENT, handleHeroUpdate);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  // Compute live slides with primary hero overrides from Admin
  const heroSlides = useMemo(() => {
    if (!customHero) return HERO_SLIDES;

    if (Array.isArray(customHero.slides) && customHero.slides.length > 0) {
      return customHero.slides.map((s, idx) => ({
        id: s.id || `slide-${idx + 1}`,
        eyebrow: s.eyebrow || "",
        badge: s.badge || "",
        headlineLine1: s.headline_line1 || s.headlineLine1 || "",
        headlineLine2: s.headline_line2 || s.headlineLine2 || "",
        headlineLine3: s.headline_line3 || s.headlineLine3 || "",
        subtitle: s.subtitle || "",
        ctaText: s.cta_text || s.ctaText || "EXPLORE FRAGRANCES",
        ctaLink: s.cta_link || s.ctaLink || "/shop",
        image: s.image_url || s.image || "/images/campaign/hero-campaign-main.jpg",
        mobileImage: s.mobile_image_url || s.mobileImage || null,
        desktop_crop: s.desktop_crop || null,
        mobile_crop: s.mobile_crop || null,
        imageAlt: s.imageAlt || `SCENTÉ Artisanal Fragrance Campaign ${idx + 1}`,
        objectPosition: s.objectPosition || "object-center md:object-[72%_center] lg:object-center",
        overlayGradient: s.overlayGradient || "from-[#090908]/90 via-[#090908]/50 to-transparent",
      }));
    }

    if (customHero.headline_line1 || customHero.image_url) {
      const dynamicFirstSlide = {
        ...HERO_SLIDES[0],
        eyebrow: customHero.eyebrow || HERO_SLIDES[0].eyebrow,
        badge: customHero.badge || HERO_SLIDES[0].badge,
        headlineLine1: customHero.headline_line1 || HERO_SLIDES[0].headlineLine1,
        headlineLine2: customHero.headline_line2 || HERO_SLIDES[0].headlineLine2,
        headlineLine3: customHero.headline_line3 || HERO_SLIDES[0].headlineLine3,
        subtitle: customHero.subtitle || HERO_SLIDES[0].subtitle,
        ctaText: customHero.cta_text || HERO_SLIDES[0].ctaText,
        ctaLink: customHero.cta_link || HERO_SLIDES[0].ctaLink,
        image: customHero.image_url || HERO_SLIDES[0].image,
        mobileImage: customHero.mobile_image_url || null,
        desktop_crop: customHero.desktop_crop || null,
        mobile_crop: customHero.mobile_crop || null,
      };
      return [dynamicFirstSlide];
    }

    return HERO_SLIDES;
  }, [customHero]);

  // ===========================================================================
  // HERO CAROUSEL STATE & CONTROLS
  // ===========================================================================
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  // Auto-advance timer (6s)
  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [isPaused, heroSlides.length]);

  const nextSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
  }, [heroSlides.length]);

  const prevSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev - 1 + heroSlides.length) % heroSlides.length);
  }, [heroSlides.length]);

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e) => {
    touchEndX.current = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX.current;
    if (diff > 50) nextSlide();
    else if (diff < -50) prevSlide();
  };

  // ===========================================================================
  // NEW ARRIVALS HORIZONTAL SCROLL CONTROLS
  // ===========================================================================
  const arrivalsTrackRef = useRef(null);

  const scrollArrivals = (direction) => {
    if (arrivalsTrackRef.current) {
      const scrollAmount = direction === "left" ? -360 : 360;
      arrivalsTrackRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  return (
    <div className="w-full bg-[#090908] text-[#F2EEE7] selection:bg-[#BFA27A] selection:text-[#090908]">
      <SEO
        title="SCENTÉ — Haute Parfumerie | Artisanal Extraits de Parfum"
        description="SCENTÉ is a modern Pakistani artisanal fragrance house crafting rare Extraits de Parfum with 30%+ perfume oils. Complimentary express courier delivery across Pakistan with Cash on Delivery."
        keywords={[
          "SCENTÉ",
          "niche perfume Pakistan",
          "luxury extrait de parfum",
          "haute parfumerie",
          "cash on delivery perfume Pakistan",
          "Lahore fragrance",
          "Karachi luxury perfume",
          "Islamabad niche fragrance",
        ]}
        canonical="/"
      />

      {/* =======================================================================
          1. HERO CAMPAIGN CAROUSEL (Full-Bleed Luxury Campaign Banner)
          ======================================================================= */}
      <section
        className="relative w-full h-[46vh] xs:h-[50vh] min-h-[320px] xs:min-h-[350px] max-h-[420px] xs:max-h-[450px] sm:h-[calc(100vh-112px)] sm:min-h-[520px] sm:max-h-[740px] bg-[#090908] select-none flex items-center overflow-hidden border-b border-white/[0.06]"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        aria-label="Artisanal Fragrance Campaign"
      >
        <AnimatePresence mode="wait">
          {heroSlides.map((slide, index) => {
            if (index !== currentSlide) return null;
            return (
              <motion.div
                key={slide.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.7, ease: LUXURY_EASE }}
                className="absolute inset-0 w-full h-full overflow-hidden"
              >
                {/* 1. Large Campaign Editorial Photograph with Responsive Mobile & Desktop Crop Art Direction */}
                {/* Mobile Viewport (< md: 768px) */}
                <div className="block md:hidden absolute inset-0 w-full h-full overflow-hidden">
                  <motion.img
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.6, ease: LUXURY_EASE }}
                    src={slide.mobileImage || slide.image}
                    alt={slide.imageAlt || "SCENTÉ Artisanal Fragrance Campaign"}
                    className="w-full h-full object-cover"
                    style={{
                      objectPosition: slide.mobile_crop ? `${slide.mobile_crop.x}% ${slide.mobile_crop.y}%` : "50% 50%",
                      transform: slide.mobile_crop?.zoom ? `scale(${slide.mobile_crop.zoom})` : undefined,
                      transformOrigin: slide.mobile_crop ? `${slide.mobile_crop.x}% ${slide.mobile_crop.y}%` : "50% 50%",
                    }}
                  />
                </div>

                {/* Desktop Viewport (>= md: 768px) */}
                <div className="hidden md:block absolute inset-0 w-full h-full overflow-hidden">
                  <motion.img
                    initial={{ scale: 1.03 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 7, ease: "easeOut" }}
                    src={slide.image}
                    alt={slide.imageAlt || "SCENTÉ Artisanal Fragrance Campaign"}
                    className={`w-full h-full object-cover ${!slide.desktop_crop ? (slide.objectPosition || "object-center") : ""}`}
                    style={
                      slide.desktop_crop
                        ? {
                            objectPosition: `${slide.desktop_crop.x}% ${slide.desktop_crop.y}%`,
                            transform: `scale(${slide.desktop_crop.zoom ?? 1.0})`,
                            transformOrigin: `${slide.desktop_crop.x}% ${slide.desktop_crop.y}%`,
                          }
                        : undefined
                    }
                  />
                </div>

                {/* 2. Atmospheric Luxury Vignette / Gradient Overlay */}
                <div
                  className="absolute inset-0 bg-gradient-to-r from-[#090908]/90 via-[#090908]/70 via-65% sm:via-[#090908]/50 sm:via-50% to-transparent pointer-events-none"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#090908]/85 via-transparent to-black/30 pointer-events-none" />

                {/* 3. Hero Copy Content: Vertically balanced and width-constrained so it never overlaps the bottle */}
                <div className="relative z-10 w-full h-full flex items-center">
                  <div className="layout-container w-full py-4 xs:py-5 sm:py-8 lg:py-10 pb-8 xs:pb-10 sm:pb-8">
                    <div className="max-w-[65%] xs:max-w-[70%] sm:max-w-xl lg:max-w-2xl flex flex-col justify-center space-y-1.5 xs:space-y-2.5 sm:space-y-4 lg:space-y-5">
                      
                      {/* Eyebrow & Badge */}
                      {(slide.eyebrow || slide.badge) && (
                        <motion.div
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.5, delay: 0.12, ease: LUXURY_EASE }}
                          className="flex flex-wrap items-center gap-1.5 xs:gap-2 sm:gap-3"
                        >
                          {slide.eyebrow && (
                            <span className="text-[8px] xs:text-[9.5px] sm:text-xs uppercase font-sans tracking-[0.16em] xs:tracking-[0.24em] text-[#BFA27A] font-semibold">
                              {slide.eyebrow}
                            </span>
                          )}
                          {slide.eyebrow && slide.badge && (
                            <span className="hidden xs:inline-block w-1.5 h-1.5 rounded-full bg-[#BFA27A]/60" />
                          )}
                          {slide.badge && (
                            <span className="hidden xs:inline-block text-[8px] xs:text-[9px] sm:text-[10px] uppercase font-sans tracking-[0.14em] xs:tracking-[0.16em] text-[#AAA49B] font-medium">
                              {slide.badge}
                            </span>
                          )}
                        </motion.div>
                      )}

                      {/* Main Headline */}
                      {(slide.headlineLine1 || slide.headlineLine2 || slide.headlineLine3) && (
                        <motion.h1
                          initial={{ opacity: 0, y: 16 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.6, delay: 0.2, ease: LUXURY_EASE }}
                          className="font-sans font-bold text-lg xs:text-xl sm:text-4xl md:text-5xl lg:text-[54px] xl:text-[60px] leading-[1.1] sm:leading-[0.96] text-[#F2EEE7] tracking-[-0.03em] uppercase drop-shadow-md"
                        >
                          {slide.headlineLine1 && <>{slide.headlineLine1} <br /></>}
                          {slide.headlineLine2 && <>{slide.headlineLine2} <br /></>}
                          {slide.headlineLine3 && <span className="text-[#EAE4DC]">{slide.headlineLine3}</span>}
                        </motion.h1>
                      )}

                      {/* Supporting Text */}
                      {slide.subtitle && (
                        <motion.p
                          initial={{ opacity: 0, y: 14 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.6, delay: 0.28, ease: LUXURY_EASE }}
                          className="text-[10px] xs:text-[11.5px] sm:text-sm md:text-[15px] font-sans text-[#D4CEC5] font-light leading-[1.4] sm:leading-[1.6] drop-shadow-sm line-clamp-2 sm:line-clamp-none"
                        >
                          {slide.subtitle}
                        </motion.p>
                      )}

                      {/* Primary CTA */}
                      {slide.ctaText && (
                        <motion.div
                          initial={{ opacity: 0, y: 14 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.6, delay: 0.36, ease: LUXURY_EASE }}
                          className="pt-0.5 sm:pt-2"
                        >
                          <Link
                            to={slide.ctaLink || "/shop"}
                            className="inline-flex items-center justify-center px-4 py-2 xs:px-5 xs:py-2.5 sm:px-9 sm:py-4 rounded-full bg-[#F2EEE7] text-[#090908] hover:bg-[#BFA27A] hover:text-[#090908] text-[10px] xs:text-[11px] sm:text-[13px] font-semibold uppercase tracking-[0.14em] xs:tracking-[0.18em] transition-all duration-300 shadow-2xl shadow-black/80 hover:scale-[1.02] active:scale-[0.98] group"
                          >
                            <span>{slide.ctaText}</span>
                            <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 ml-1.5 sm:ml-2 transition-transform duration-300 group-hover:translate-x-1 stroke-[2]" />
                          </Link>
                        </motion.div>
                      )}

                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Minimalist Slide Controls: Hairline Desktop Arrows (Only when multiple slides exist, desktop only) */}
        {heroSlides.length > 1 && (
          <div className="hidden sm:flex absolute bottom-3 xs:bottom-4 sm:bottom-6 right-4 xs:right-6 sm:right-10 items-center gap-2 xs:gap-2.5 sm:gap-3 z-20 pointer-events-auto">
            <button
              onClick={prevSlide}
              aria-label="Previous slide"
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full border border-white/15 hover:border-[#BFA27A] text-[#F2EEE7] hover:text-[#BFA27A] bg-[#090908]/60 backdrop-blur-md flex items-center justify-center transition-all duration-300 shadow-lg cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5 stroke-[1.8]" />
            </button>
            <button
              onClick={nextSlide}
              aria-label="Next slide"
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full border border-white/15 hover:border-[#BFA27A] text-[#F2EEE7] hover:text-[#BFA27A] bg-[#090908]/60 backdrop-blur-md flex items-center justify-center transition-all duration-300 shadow-lg cursor-pointer"
            >
              <ChevronRight className="w-3.5 h-3.5 stroke-[1.8]" />
            </button>
          </div>
        )}

        {/* Bottom Minimal Progress Bar & Slide Numbers (Only when multiple slides exist) */}
        {heroSlides.length > 1 && (
          <div className="absolute bottom-2.5 xs:bottom-3.5 sm:bottom-6 left-0 z-20">
            <div className="layout-container flex items-center gap-2 sm:gap-3">
              <div className="flex items-center gap-1 text-[8.5px] xs:text-[9.5px] sm:text-xs font-sans tracking-[0.18em] sm:tracking-[0.22em] text-[#AAA49B]">
                <span className="text-[#F2EEE7] font-semibold">0{currentSlide + 1}</span>
                <span className="opacity-40">/</span>
                <span className="opacity-60">0{heroSlides.length}</span>
              </div>

              <div className="flex items-center gap-1 sm:gap-1.5 ml-1.5 sm:ml-3">
                {heroSlides.map((slide, idx) => (
                  <button
                    key={slide.id}
                    onClick={() => setCurrentSlide(idx)}
                    aria-label={`Jump to slide ${idx + 1}`}
                    className={`h-0.5 sm:h-1 transition-all duration-500 rounded-full cursor-pointer ${
                      idx === currentSlide ? "w-5 xs:w-7 sm:w-8 bg-[#BFA27A]" : "w-1.5 sm:w-2 bg-white/25 hover:bg-white/50"
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* =======================================================================
          2. SHOP BY COLLECTION (Scentara Dual Campaign Banner — Women & Men)
          ======================================================================= */}
      <section id="collections" className="py-12 sm:py-16 bg-[#090908] border-b border-white/[0.06]">
        <div className="layout-container">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 sm:mb-10 gap-4">
            <div>
              <span className="text-[10px] sm:text-[11px] uppercase font-sans tracking-[0.24em] text-[#BFA27A] font-semibold block mb-2">
                COLLECTIONS
              </span>
              <h2 className="font-sans font-bold text-2xl sm:text-3xl md:text-4xl text-[#F2EEE7] tracking-tight">
                Shop by Collection
              </h2>
            </div>
            <Link
              to="/shop"
              className="inline-flex items-center text-xs uppercase font-sans tracking-[0.18em] text-[#AAA49B] hover:text-[#BFA27A] transition-colors duration-300 font-medium"
            >
              <span>Explore All Compositions</span>
              <ArrowRight className="w-3.5 h-3.5 ml-2" />
            </Link>
          </div>

          {/* Unified Dual Campaign Banner (Sleek Horizontal Ratio — Scentara Style) */}
          <div className="relative overflow-hidden rounded-xl md:rounded-2xl border border-white/[0.08] shadow-2xl bg-[#121110]">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
              {/* WOMEN PERFUMES (Left Half) */}
              <Link
                to={EDITORIAL_COLLECTIONS.women.link}
                className="group relative h-[240px] xs:h-[280px] sm:h-[320px] md:h-[360px] lg:h-[400px] overflow-hidden block"
              >
                <img
                  src={EDITORIAL_COLLECTIONS.women.image}
                  alt="Women Perfumes"
                  loading="lazy"
                  className="w-full h-full object-cover object-[15%_center] md:object-[12%_center] transition-transform duration-700 ease-out group-hover:scale-105"
                />

                {/* Subtle Hover Vignette */}
                <div className="absolute inset-0 bg-black/5 group-hover:bg-transparent transition-colors duration-300" />

                {/* Modern Bottom Explore Pill */}
                <div className="absolute bottom-6 sm:bottom-8 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
                  <span className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-black/60 text-white border border-white/20 backdrop-blur-xl text-[11px] sm:text-xs uppercase font-sans tracking-[0.24em] font-semibold shadow-xl select-none">
                    <span>EXPLORE</span>
                    <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </Link>

              {/* MEN PERFUMES (Right Half) */}
              <Link
                to={EDITORIAL_COLLECTIONS.men.link}
                aria-label="Explore Men Perfumes"
                className="group relative h-[240px] xs:h-[280px] sm:h-[320px] md:h-[360px] lg:h-[400px] overflow-hidden block border-t md:border-t-0 md:border-l border-white/[0.08]"
              >
                <img
                  src={EDITORIAL_COLLECTIONS.men.image}
                  alt="Men Perfumes"
                  loading="lazy"
                  className="w-full h-full object-cover object-[80%_center] md:object-center transition-transform duration-700 ease-out group-hover:scale-105"
                />

                {/* Subtle Hover Vignette */}
                <div className="absolute inset-0 bg-black/5 group-hover:bg-transparent transition-colors duration-300" />

                {/* Modern Bottom Explore Pill */}
                <div className="absolute bottom-6 sm:bottom-8 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
                  <span className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-black/60 text-white border border-white/20 backdrop-blur-xl text-[11px] sm:text-xs uppercase font-sans tracking-[0.24em] font-semibold shadow-xl select-none">
                    <span>EXPLORE</span>
                    <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* =======================================================================
          3. FEATURED PRODUCTS (BESTSELLERS — 4 Minimal Spacious Product Cards)
          ======================================================================= */}
      <section id="bestsellers" className="py-14 sm:py-24 lg:py-32 bg-[#090908] border-b border-white/[0.06]">
        <div className="layout-container">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 sm:mb-16 gap-4 border-b border-white/[0.06] pb-6">
            <SectionHeading
              eyebrow="SIGNATURE SCENTS"
              title="Bestsellers"
              subtitle="Our most acclaimed Extraits de Parfum, macerated with 30%+ pure perfume oils for unrivaled depth."
              className="mb-0 max-w-2xl"
            />
            <Link
              to="/shop"
              className="inline-flex items-center text-xs uppercase font-sans tracking-[0.16em] text-[#BFA27A] hover:text-[#D4BA94] transition-colors duration-300 font-medium"
            >
              <span>View Full Catalog</span>
              <ArrowRight className="w-3.5 h-3.5 ml-2" />
            </Link>
          </div>

          {/* 4 Clean Modern Product Cards on Desktop, 2 Columns on Mobile */}
          <div className="grid grid-cols-2 gap-3.5 sm:gap-6 lg:grid-cols-4">
            {activeProducts.slice(0, 4).map((product) => {
              const primaryImg = product.image || product.primary_image;
              const secondaryImg = product.secondaryImage || product.secondary_image;
              const isAdded = addedItemKey === product.id;

              return (
                <div
                  key={product.id}
                  className="group flex flex-col h-full bg-[#0D0D0C] rounded-xl overflow-hidden border border-white/[0.05] hover:border-[#BFA27A]/30 transition-all duration-500"
                >
                  {/* Image Container with Smooth Secondary Hover Cross-Fade */}
                  <Link
                    to={`/product/${product.slug}`}
                    className="relative aspect-[4/5] overflow-hidden bg-[#141311] block"
                  >
                    <img
                      src={getOptimizedImageUrl(primaryImg, { width: 500, quality: 85 })}
                      alt={product.name}
                      loading="lazy"
                      className="w-full h-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105"
                    />

                    {secondaryImg && (
                      <img
                        src={getOptimizedImageUrl(secondaryImg, { width: 500, quality: 80 })}
                        alt={`${product.name} lifestyle`}
                        loading="lazy"
                        className="absolute inset-0 w-full h-full object-cover object-center opacity-0 group-hover:opacity-100 transition-opacity duration-700 ease-out"
                      />
                    )}

                    {/* Subtle Concentration Badge */}
                    <div className="absolute top-2 left-2 sm:top-3 sm:left-3 z-10">
                      <span className="text-[7.5px] xs:text-[8.5px] uppercase font-sans tracking-[0.14em] sm:tracking-[0.18em] bg-[#090908]/90 text-[#BFA27A] border border-[rgba(191,162,122,0.3)] px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full font-semibold backdrop-blur-md">
                        {product.concentration || "30% Extrait"}
                      </span>
                    </div>
                  </Link>

                  {/* Minimal Details & Quick Action */}
                  <div className="p-3 xs:p-4 sm:p-5 flex flex-col flex-grow justify-between space-y-3 sm:space-y-4">
                    <div className="space-y-1 sm:space-y-1.5">
                      <div className="flex items-center justify-between text-[8px] xs:text-[9px] uppercase font-sans tracking-[0.16em] sm:tracking-[0.2em] text-[#888279]">
                        <span className="truncate pr-1">{product.subtitle || "Extrait"}</span>
                        <span className="text-[#BFA27A] font-medium shrink-0">{product.volume || "50ml"}</span>
                      </div>

                      <Link to={`/product/${product.slug}`}>
                        <h3 className="font-sans font-bold text-sm xs:text-base sm:text-lg lg:text-xl text-[#F2EEE7] group-hover:text-[#BFA27A] transition-colors duration-200 tracking-tight line-clamp-1">
                          {product.name}
                        </h3>
                      </Link>

                      <p className="text-[11px] sm:text-xs font-sans text-[#AAA49B] font-light line-clamp-1">
                        {product.olfactiveFamily}
                      </p>
                    </div>

                    {/* Price & Modern Quick Add Button */}
                    <div className="pt-2.5 sm:pt-3 border-t border-white/[0.06] flex items-center justify-between gap-1.5 xs:gap-2">
                      <span className="text-xs xs:text-sm sm:text-base font-sans font-semibold text-[#F2EEE7] tracking-tight shrink-0">
                        {product.formattedPrice}
                      </span>

                      <button
                        onClick={(e) => handleQuickAdd(e, product)}
                        aria-label={`Quick add ${product.name} to bag`}
                        className={`inline-flex items-center gap-1 text-[9px] xs:text-[10px] uppercase font-sans tracking-[0.1em] xs:tracking-[0.14em] font-semibold px-2.5 py-1.5 xs:px-3.5 xs:py-2 rounded-full transition-all duration-300 shrink-0 cursor-pointer ${
                          isAdded
                            ? "bg-emerald-800 text-emerald-100 border border-emerald-500/50"
                            : "bg-[#181714] text-[#F2EEE7] hover:bg-[#BFA27A] hover:text-[#090908] border border-white/10 hover:border-[#BFA27A]"
                        }`}
                      >
                        {isAdded ? (
                          <>
                            <Check className="w-2.5 h-2.5 xs:w-3 xs:h-3 text-emerald-300 stroke-[2.5]" />
                            <span>Added</span>
                          </>
                        ) : (
                          <>
                            <Plus className="w-2.5 h-2.5 xs:w-3 xs:h-3 stroke-[2]" />
                            <span>Add</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* =======================================================================
          4. SCENTÉ EDITORIAL CAMPAIGN BANNER (Cinematic Editorial Image Section)
          ======================================================================= */}
      <EditorialBanner />

      {/* =======================================================================
          5. NEW ARRIVALS (Horizontal Interactive Product Track)
          ======================================================================= */}
      <section className="py-14 sm:py-24 lg:py-32 bg-[#090908] border-b border-white/[0.06]">
        <div className="layout-container">
          <div className="flex items-end justify-between mb-10 sm:mb-14">
            <div>
              <span className="text-[10px] sm:text-[11px] font-sans uppercase tracking-[0.24em] text-[#BFA27A] font-semibold block mb-2">
                LATEST RELEASES
              </span>
              <h2 className="font-sans font-bold text-3xl sm:text-4xl md:text-5xl text-[#F2EEE7] tracking-tight">
                New Arrivals
              </h2>
            </div>

            {/* Desktop Navigation Arrows */}
            <div className="hidden sm:flex items-center gap-3">
              <button
                onClick={() => scrollArrivals("left")}
                aria-label="Previous products"
                className="w-10 h-10 rounded-full border border-white/10 text-[#F2EEE7] flex items-center justify-center hover:bg-[#BFA27A] hover:text-[#090908] hover:border-[#BFA27A] transition-colors duration-200"
              >
                <ChevronLeft className="w-4 h-4 stroke-[2]" />
              </button>
              <button
                onClick={() => scrollArrivals("right")}
                aria-label="Next products"
                className="w-10 h-10 rounded-full border border-white/10 text-[#F2EEE7] flex items-center justify-center hover:bg-[#BFA27A] hover:text-[#090908] hover:border-[#BFA27A] transition-colors duration-200"
              >
                <ChevronRight className="w-4 h-4 stroke-[2]" />
              </button>
            </div>
          </div>

          {/* Smooth Horizontal Track */}
          <div
            ref={arrivalsTrackRef}
            className="flex gap-6 overflow-x-auto scrollbar-hide pb-4 snap-x snap-mandatory"
            style={{ scrollBehavior: "smooth" }}
          >
            {activeProducts.map((product) => {
              const primaryImg = product.image || product.primary_image;
              const isAdded = addedItemKey === product.id;

              return (
                <div
                  key={`new-${product.id}`}
                  className="min-w-[200px] xs:min-w-[240px] sm:min-w-[300px] max-w-[320px] snap-start flex flex-col bg-[#0D0D0C] rounded-xl overflow-hidden border border-white/[0.05] hover:border-[#BFA27A]/30 transition-all duration-300 group"
                >
                  <Link to={`/product/${product.slug}`} className="relative aspect-[4/3] overflow-hidden bg-[#141311] block">
                    <img
                      src={getOptimizedImageUrl(primaryImg, { width: 450, quality: 80 })}
                      alt={product.name}
                      loading="lazy"
                      className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-3 right-3">
                      <span className="text-[8px] uppercase font-sans tracking-[0.16em] bg-[#090908]/90 text-[#F2EEE7] px-2.5 py-0.5 rounded-full border border-white/10">
                        New Batch
                      </span>
                    </div>
                  </Link>

                  <div className="p-5 flex flex-col flex-grow justify-between space-y-3">
                    <div>
                      <span className="text-[9px] uppercase font-sans tracking-[0.2em] text-[#888279] block">
                        {product.subtitle || "Extrait de Parfum"}
                      </span>
                      <Link to={`/product/${product.slug}`}>
                        <h4 className="font-sans font-bold text-lg text-[#F2EEE7] group-hover:text-[#BFA27A] transition-colors mt-0.5 tracking-tight">
                          {product.name}
                        </h4>
                      </Link>
                    </div>

                    <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between">
                      <span className="text-sm font-sans font-semibold text-[#F2EEE7]">
                        {product.formattedPrice}
                      </span>
                      <button
                        onClick={(e) => handleQuickAdd(e, product)}
                        className={`text-[9.5px] uppercase font-sans tracking-[0.14em] font-semibold px-3 py-1.5 rounded-full transition-colors ${
                          isAdded
                            ? "bg-emerald-800 text-emerald-100"
                            : "bg-[#181714] text-[#AAA49B] hover:bg-[#BFA27A] hover:text-[#090908]"
                        }`}
                      >
                        {isAdded ? "Added ✓" : "Quick Add"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>



      {/* =======================================================================
          8. CUSTOMER REVIEWS (Refined Social Proof)
          ======================================================================= */}
      <section className="py-14 sm:py-24 lg:py-32 bg-[#0D0D0C] border-b border-white/[0.06]">
        <div className="layout-container">
          <SectionHeading
            eyebrow="PATRON IMPRESSIONS"
            title="What Our Customers Say"
            subtitle="Verified reviews from fragrance connoisseurs and patrons across Pakistan."
            align="center"
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 mt-16">
            {TESTIMONIALS.map((review) => (
              <div
                key={review.id}
                className="p-5 sm:p-8 rounded-2xl bg-[#121110] border border-white/[0.05] hover:border-[#BFA27A]/25 transition-all duration-300 flex flex-col justify-between space-y-6"
              >
                <div className="space-y-4">
                  <div className="flex items-center gap-1 text-[#BFA27A]">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-3.5 h-3.5 fill-[#BFA27A] stroke-none" />
                    ))}
                  </div>

                  <p className="text-xs sm:text-sm font-sans text-[#DDD7CE] font-light leading-relaxed italic">
                    "{review.quote}"
                  </p>
                </div>

                <div className="pt-4 border-t border-white/[0.06] flex items-center justify-between">
                  <div>
                    <h4 className="font-sans font-semibold text-sm text-[#F2EEE7]">
                      {review.name}
                    </h4>
                    <span className="text-[9.5px] uppercase font-sans tracking-[0.16em] text-[#888279] block">
                      {review.city} • Verified Patron
                    </span>
                  </div>
                  <span className="text-[9.5px] uppercase font-sans tracking-[0.16em] text-[#BFA27A] bg-[#181714] px-2.5 py-1 rounded-full border border-[rgba(191,162,122,0.2)]">
                    {review.fragrance}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =======================================================================
          9. FINAL CAMPAIGN BANNER (Find Your Signature)
          ======================================================================= */}
      <section className="relative py-16 sm:py-28 lg:py-36 bg-[#090908] border-b border-white/[0.06] text-center overflow-hidden">
        {/* Subtle Ambient Radial Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-radial from-[#BFA27A]/10 to-transparent rounded-full blur-[100px] pointer-events-none" />

        <div className="layout-container relative z-10 max-w-3xl mx-auto space-y-8">
          <span className="text-[10px] sm:text-[11px] uppercase font-sans tracking-[0.28em] text-[#BFA27A] font-semibold block">
            THE SIGNATURE EXPERIENCE
          </span>

          <h2 className="font-sans font-bold text-3xl xs:text-4xl sm:text-5xl md:text-6xl text-[#F2EEE7] leading-[1.05] tracking-tight">
            Find Your Signature.
          </h2>

          <p className="text-sm sm:text-base font-sans text-[#AAA49B] font-normal leading-relaxed max-w-xl mx-auto">
            Discover the fragrance that becomes an inseparable part of your presence. Unhurried, distinctive, and handcrafted to endure.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <Link
              to="/shop"
              className="inline-flex items-center justify-center px-9 py-4 rounded-full bg-[#F2EEE7] text-[#090908] hover:bg-[#BFA27A] text-xs font-semibold uppercase tracking-[0.16em] transition-all duration-300 shadow-xl shadow-black/50"
            >
              <span>Shop All Fragrances</span>
              <ArrowRight className="w-3.5 h-3.5 ml-2 stroke-[2]" />
            </Link>
          </div>

          <div className="pt-6">
            <p className="text-[10px] uppercase font-sans tracking-[0.2em] text-[#888279] font-medium">
              Complimentary Express Delivery & Cash on Delivery Available Across Pakistan
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
