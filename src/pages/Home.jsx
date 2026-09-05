import React, { useRef, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { PRODUCTS, BRAND_VALUES } from "../data/products";
import { getActiveProducts } from "../services/products";
import ProductCard from "../components/ProductCard";
import SectionHeading from "../components/SectionHeading";
import Button from "../components/Button";
import ScrollReveal from "../components/ScrollReveal";
import ScrollIndicator from "../components/ScrollIndicator";
import ParallaxImage from "../components/ParallaxImage";
import { ArrowRight } from "lucide-react";
import { motion, AnimatePresence, useScroll, useTransform, useSpring } from "framer-motion";
import { LUXURY_EASE, VIEWPORT_DEFAULT } from "../lib/animations";
import SEO from "../components/SEO";

export default function Home() {
  const heroRef = useRef(null);
  const [activeProducts, setActiveProducts] = useState(() => {
    try {
      const saved = localStorage.getItem("scente_admin_products_cache");
      if (saved) {
        return JSON.parse(saved).filter((p) => p.status !== "inactive" && p.is_active !== false);
      }
    } catch (e) { }
    return PRODUCTS.filter((p) => p.status !== "inactive" && p.is_active !== false);
  });

  useEffect(() => {
    getActiveProducts().then(({ data }) => {
      if (data && data.length > 0) {
        setActiveProducts(data);
      }
    });
  }, []);

  // Scroll Progress Physics for Hero Section
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });

  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 24,
    restDelta: 0.001,
  });

  // Hero Parallax Transforms (Page Scroll Only)
  const heroHeadlineY = useTransform(smoothProgress, [0, 1], ["0%", "28%"]);
  const heroImageY = useTransform(smoothProgress, [0, 1], ["0%", "15%"]);
  const heroOpacity = useTransform(smoothProgress, [0, 0.75], [1, 0.2]);
  const heroImageScale = useTransform(smoothProgress, [0, 1], [1, 1.04]);
  const heroAuraY = useTransform(smoothProgress, [0, 1], ["-50%", "-30%"]);


  return (
    <div className="w-full bg-[#0D0D0C] text-[#F2EEE7] overflow-hidden">
      <SEO
        title="SCENTÉ — Haute Parfumerie | Artisanal Extraits de Parfum"
        description="SCENTÉ is an artisanal niche perfume atelier crafting rare Extraits de Parfum with 30%+ perfume oils. Complimentary express courier delivery across Pakistan with Cash on Delivery."
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
        structuredData={{
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "SCENTÉ Parfums",
          url: "https://scente.pk",
          logo: "https://scente.pk/favicon.svg",
          description: "Haute Parfumerie atelier crafting rare Extraits de Parfum with 30%+ perfume oil concentration.",
          contactPoint: {
            "@type": "ContactPoint",
            contactType: "concierge",
            email: "concierge@scente.pk",
            areaServed: "PK",
            availableLanguage: ["English", "Urdu"],
          },
        }}
      />
      {/* =========================================================================
          1. HERO SECTION (Cinematic Editorial Campaign — Completely Static Mouse Image)
          ========================================================================= */}
      <section
        ref={heroRef}
        className="relative min-h-[68vh] sm:min-h-[76vh] lg:min-h-[80vh] xl:min-h-[82vh] max-h-[900px] flex flex-col justify-between pt-3 sm:pt-6 lg:pt-8 pb-4 sm:pb-6 lg:pb-8 border-b border-[rgba(242,238,231,0.06)] bg-[#0D0D0C] overflow-hidden"
      >
        {/* Physical Studio Ambient Backlight linked to smooth scroll */}
        <motion.div
          style={{ y: heroAuraY, opacity: heroOpacity }}
          className="absolute top-1/2 right-[5%] sm:right-[10%] -translate-y-1/2 w-[280px] sm:w-[420px] lg:w-[540px] xl:w-[620px] h-[280px] sm:h-[420px] lg:h-[540px] xl:h-[620px] bg-radial from-[#BFA27A]/12 via-[#141311]/45 to-transparent rounded-full blur-[70px] sm:blur-[90px] lg:blur-[110px] pointer-events-none -z-10 will-change-transform"
        />

        {/* Secondary subtle warmth aura behind typography */}
        <div className="absolute top-1/4 left-1/12 w-[220px] sm:w-[340px] lg:w-[420px] h-[220px] sm:h-[340px] lg:h-[420px] bg-radial from-[#BFA27A]/5 via-[#181714]/20 to-transparent rounded-full blur-[60px] sm:blur-[80px] pointer-events-none -z-10" />

        <div className="layout-container w-full grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 lg:gap-8 xl:gap-12 items-center flex-grow py-1 sm:py-3 lg:py-0">
          {/* LEFT ZONE: Editorial Typography (Choreographed Entrance & Scroll Shift) */}
          <motion.div
            style={{ y: heroHeadlineY, opacity: heroOpacity }}
            className="lg:col-span-7 xl:col-span-6 flex flex-col justify-center z-10 space-y-4 sm:space-y-5 lg:space-y-6 transform-gpu"
          >
            {/* House Identity & Subtle Edition Label */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.08, ease: LUXURY_EASE }}
              className="flex items-center justify-between max-w-md"
            >
              <div className="space-y-0.5 sm:space-y-1">
                <span className="text-[10.5px] sm:text-[11.5px] font-sans uppercase tracking-eyebrow text-[#BFA27A] font-medium block">
                  SCENTÉ
                </span>
                <span className="text-[8.5px] sm:text-[9.5px] font-sans uppercase tracking-micro text-[#8A847C] block font-light">
                  Perfume Extracts
                </span>
              </div>
            </motion.div>

            {/* Main Headline — Cormorant Garamond Light with Italic Accent */}
            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.85, delay: 0.16, ease: LUXURY_EASE }}
              className="font-serif font-light text-fluid-hero leading-[0.96] text-[#F2EEE7] tracking-[-0.03em]"
            >
              A Scent <br />
              <span className="italic font-light text-[#EAE4DC]">That Stays.</span>
            </motion.h1>

            {/* Supporting Copy — 3-Line Concise Manifesto */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.75, delay: 0.26, ease: LUXURY_EASE }}
              className="space-y-1 text-[13px] sm:text-[14px] md:text-[15px] font-sans text-[#AAA49B] font-light leading-[1.6] max-w-md"
            >
              <p className="text-[#DDD7CE]">Composed slowly.</p>
              <p className="text-[#AAA49B]">Worn intimately.</p>
              <p className="text-[#888279]">Remembered instinctively.</p>
            </motion.div>

            {/* Primary CTA & Credibility Note */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.75, delay: 0.34, ease: LUXURY_EASE }}
              className="pt-2 sm:pt-3 space-y-4"
            >
              <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                <Button
                  to="/shop"
                  variant="solid"
                  showArrow={true}
                  className="px-7 py-3 sm:px-10 sm:py-4 text-[10.5px] sm:text-xs tracking-[0.15em]"
                >
                  Explore the Collection
                </Button>

                <div className="flex items-center space-x-2 text-[9px] sm:text-[10px] font-sans uppercase tracking-micro text-[#8A847C]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#BFA27A] inline-block opacity-90 shadow-[0_0_8px_rgba(191,162,122,0.5)]" />
                  <span className="text-[#AAA49B] font-light">30% PURE PERFUME OIL</span>
                </div>
              </div>
            </motion.div>
          </motion.div>

          {/* RIGHT ZONE: Hero Perfume Flacon (Responsive Frame & True Aspect Ratio) */}
          <div className="lg:col-span-5 xl:col-span-6 relative flex items-center justify-center lg:justify-end mt-4 sm:mt-6 lg:mt-0 pointer-events-none w-full">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1.0, delay: 0.22, ease: LUXURY_EASE }}
              style={{
                y: heroImageY,
                scale: heroImageScale,
                opacity: heroOpacity,
              }}
              className="relative w-full flex items-center justify-center lg:justify-end transform-gpu will-change-transform"
            >
              {/* Responsive Flacon Frame */}
              <div className="hero-flacon-wrapper">
                <img
                  src="/images/scente-hero.webp"
                  alt="SCENTÉ Éclat Rogue Extrait de Parfum"
                  loading="eager"
                  fetchPriority="high"
                  decoding="sync"
                  width="480"
                  height="640"
                  className="hero-flacon-img"
                />
              </div>
            </motion.div>
          </div>
        </div>

        {/* Minimalist Bottom Indicator */}
        <div className="flex justify-center pt-3 sm:pt-4">
          <ScrollIndicator targetId="statement" />
        </div>
      </section>

      {/* =========================================================================
          2. EDITORIAL STATEMENT TRANSITION (Generous Negative Space & Choreography)
          ========================================================================= */}
      <section
        id="statement"
        className="py-24 sm:py-32 md:py-40 bg-[#0D0D0C] border-b border-[rgba(242,238,231,0.06)] scroll-mt-10 text-center"
      >
        <div className="layout-container max-w-3xl mx-auto space-y-6 sm:space-y-8">
          <motion.span
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={VIEWPORT_DEFAULT}
            transition={{ duration: 0.6, ease: LUXURY_EASE }}
            className="text-[10px] sm:text-[11px] uppercase font-sans tracking-eyebrow text-[#BFA27A] block font-medium"
          >
            THE SCENTÉ PHILOSOPHY
          </motion.span>

          <motion.blockquote
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={VIEWPORT_DEFAULT}
            transition={{ duration: 0.85, delay: 0.08, ease: LUXURY_EASE }}
            className="font-serif font-light text-fluid-section leading-[1.12] text-[#F2EEE7] tracking-[-0.025em]"
          >
            "A fragrance should not announce itself. <br className="hidden sm:inline" />
            <span className="italic text-[#AAA49B]">It should remain.</span>"
          </motion.blockquote>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={VIEWPORT_DEFAULT}
            transition={{ duration: 0.8, delay: 0.16, ease: LUXURY_EASE }}
            className="text-xs sm:text-sm font-sans text-[#AAA49B] font-light leading-[1.6] max-w-lg mx-auto"
          >
            Composed with patience, macerated in limited batches with 30% pure perfume oil, and designed for quiet, enduring presence.
          </motion.p>
        </div>
      </section>

      {/* =========================================================================
          3. THE COLLECTION SECTION (#0D0D0C Dark Editorial Gallery)
          ========================================================================= */}
      <section
        id="collection"
        className="py-20 sm:py-28 bg-[#0D0D0C] border-b border-[rgba(242,238,231,0.06)]"
      >
        <div className="layout-container">
          <div className="mb-14 sm:mb-18 pb-6 border-b border-[rgba(242,238,231,0.06)]">
            <SectionHeading
              eyebrow="THE COLLECTION"
              title="Compositions for Every Version of You."
              subtitle="Explore our permanent collection of Extraits de Parfum, handcrafted with pure perfume oils for extraordinary depth and longevity."
              className="mb-0 max-w-2xl"
            />
          </div>

          {/* 6 Product Cards Grid (3 Columns Desktop, 2 Columns Tablet, 2 Columns Mobile) */}
          <div className="scente-product-grid">
            {activeProducts.slice(0, 6).map((product, index) => (
              <ProductCard key={product.id} product={product} index={index} />
            ))}
          </div>

          {/* Centered Collection CTA */}
          <ScrollReveal delay={0.2} className="mt-8 sm:mt-16 md:mt-20 flex justify-center">
            <Button
              to="/shop"
              variant="solid"
              className="px-4 py-2 sm:px-9 sm:py-3.5 text-[9.5px] sm:text-xs tracking-[0.08em] sm:tracking-[0.16em] rounded-lg sm:rounded-xl"
            >
              Explore the Collection
            </Button>
          </ScrollReveal>
        </div>
      </section>




      {/* =========================================================================
          6. METHODOLOGY / BRAND PILLARS (#0D0D0C Staggered Entrance)
          ========================================================================= */}
      <section className="py-20 sm:py-28 bg-[#0D0D0C] border-b border-[rgba(242,238,231,0.06)]">
        <div className="layout-container">
          <SectionHeading
            eyebrow="OUR METHODOLOGY"
            title="The Standard of Haute Parfumerie"
            subtitle="We refuse mass-market compromises. Every drop is blended and rested under rigorous standards."
            align="center"
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-10 mt-14">
            {BRAND_VALUES.map((val, idx) => (
              <ScrollReveal
                key={val.number}
                delay={idx * 0.1}
                className="p-8 bg-[#121110] border border-[rgba(242,238,231,0.04)] flex flex-col justify-between transition-all duration-300 hover:border-[rgba(191,162,122,0.25)] transform-gpu"
              >
                <div>
                  <span className="font-serif font-light text-3xl text-[#777169] block mb-4">
                    {val.number}
                  </span>
                  <h3 className="font-serif text-xl text-[#F2EEE7] mb-3 font-normal">
                    {val.title}
                  </h3>
                  <p className="text-xs sm:text-sm font-sans text-[#AAA49B] font-light leading-[1.6]">
                    {val.description}
                  </p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>


    </div>
  );
}
