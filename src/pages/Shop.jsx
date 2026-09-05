import React, { useState, useEffect, useMemo, useRef } from "react";
import { PRODUCTS } from "../data/products";
import { getActiveProducts } from "../services/products";
import ProductCard from "../components/ProductCard";
import Button from "../components/Button";
import ScrollReveal from "../components/ScrollReveal";
import { Link, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { LUXURY_EASE } from "../lib/animations";
import SEO from "../components/SEO";

export default function Shop() {
  const [productsList, setProductsList] = useState(PRODUCTS);
  const [searchParams, setSearchParams] = useSearchParams();

  // Read URL query parameter for audience/category gracefully
  const rawParam = (
    searchParams.get("audience") ||
    searchParams.get("gender") ||
    searchParams.get("category") ||
    searchParams.get("family") ||
    ""
  ).toLowerCase().trim();

  // Only men, women, unisex are valid audience filters; legacy values default gracefully to "all"
  const validAudiences = ["men", "women", "unisex"];
  const initialFilter = validAudiences.includes(rawParam) ? rawParam : "all";

  const [activeFilter, setActiveFilter] = useState(initialFilter);
  const [sortBy, setSortBy] = useState("featured"); // "featured" | "price-asc" | "price-desc"
  const [sortOpen, setSortOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Sync state if URL changes externally
  useEffect(() => {
    if (validAudiences.includes(rawParam)) {
      setActiveFilter(rawParam);
    } else if (!rawParam || !validAudiences.includes(rawParam)) {
      setActiveFilter("all");
    }
  }, [rawParam]);

  // Handle filter selection and update URL cleanly (clearing any old ?category=... params)
  const handleFilterSelect = (id) => {
    setActiveFilter(id);
    const newParams = new URLSearchParams(searchParams);
    newParams.delete("category");
    newParams.delete("family");
    newParams.delete("gender");
    if (id === "all") {
      newParams.delete("audience");
    } else {
      newParams.set("audience", id);
    }
    setSearchParams(newParams, { replace: true });
  };

  // Fetch active products from Supabase (falls back smoothly to local catalog)
  useEffect(() => {
    let isMounted = true;
    async function loadCatalog() {
      setIsLoading(true);
      const { data } = await getActiveProducts();
      if (isMounted && data && data.length > 0) {
        setProductsList(data);
      }
      if (isMounted) {
        setIsLoading(false);
      }
    }
    loadCatalog();
    return () => {
      isMounted = false;
    };
  }, []);

  const sortContainerRef = React.useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (sortContainerRef.current && !sortContainerRef.current.contains(e.target)) {
        setSortOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const audienceFilters = [
    { id: "all", label: "ALL" },
    { id: "men", label: "MEN" },
    { id: "women", label: "WOMEN" },
    { id: "unisex", label: "UNISEX" },
  ];

  const sortOptions = [
    { id: "featured", label: "FEATURED" },
    { id: "price-asc", label: "PRICE: LOW TO HIGH" },
    { id: "price-desc", label: "PRICE: HIGH TO LOW" },
  ];

  // Dynamic filter & sort
  const filteredProducts = useMemo(() => {
    let result = productsList.filter((product) => {
      if (activeFilter === "all") return true;

      const pFamily = (product.family || "").toLowerCase();
      const pAudience = (product.audience || "").toLowerCase();
      const pFamilies = Array.isArray(product.families)
        ? product.families.map((f) => String(f).toLowerCase())
        : [];
      const pDesc = (product.description || "").toLowerCase();

      // Direct match on audience field or family column
      if (pFamily === activeFilter || pAudience === activeFilter || pFamilies.includes(activeFilter)) {
        return true;
      }

      // Backward compatibility for existing legacy catalog entries
      if (activeFilter === "men") {
        if (pFamily === "woody" || pFamilies.includes("woody")) return true;
        if (pDesc.includes("masculine") || pDesc.includes("for men")) return true;
      } else if (activeFilter === "women") {
        if (pFamily === "floral" || pFamilies.includes("floral")) return true;
        if (pDesc.includes("feminine") || pDesc.includes("for women")) return true;
      } else if (activeFilter === "unisex") {
        if (["amber", "musk", "fresh"].includes(pFamily) || pFamilies.some((f) => ["amber", "musk", "fresh"].includes(f))) return true;
        if (pDesc.includes("unisex")) return true;
      }

      return false;
    });

    if (sortBy === "price-asc") {
      result = [...result].sort((a, b) => a.price - b.price);
    } else if (sortBy === "price-desc") {
      result = [...result].sort((a, b) => b.price - a.price);
    }

    return result;
  }, [productsList, activeFilter, sortBy]);

  return (
    <div className="bg-[#0D0D0C] text-[#F2EEE7] min-h-screen">
      <SEO
        title={activeFilter !== "all" ? `${activeFilter.charAt(0).toUpperCase() + activeFilter.slice(1)}'s Fragrances — The Collection` : "The Fragrance Collection — Handcrafted Extraits de Parfum"}
        description="Explore the SCENTÉ collection of artisan Extraits de Parfum. Handcrafted in limited maceration batches with 30-40% pure perfume oil concentrations. Cash on Delivery across Pakistan."
        canonicalUrl="https://scente.pk/shop"
        keywords="buy perfume online Pakistan, luxury extrait de parfum, artisan fragrance Karachi, Lahore, Islamabad, Cash on Delivery perfumes"
      />
      {/* 1. EDITORIAL PAGE HEADER */}
      <section className="pt-12 sm:pt-16 md:pt-20 pb-8 sm:pb-12 border-b border-[rgba(242,238,231,0.06)]">
        <div className="layout-container">
          <motion.span
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: LUXURY_EASE }}
            className="block text-[10px] sm:text-[11px] font-sans uppercase tracking-eyebrow text-[#BFA27A] mb-3 font-medium"
          >
            THE COLLECTION
          </motion.span>
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.08, ease: LUXURY_EASE }}
            className="font-serif font-light text-fluid-display leading-[1.08] text-[#F2EEE7] tracking-headline mb-4"
          >
            The Art of <span className="italic">Wearing Scent</span>.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.16, ease: LUXURY_EASE }}
            className="text-sm sm:text-base font-sans text-[#AAA49B] font-light max-w-2xl leading-[1.6]"
          >
            Explore SCENTÉ's collection of Extraits de Parfum, composed to become part of the memory. Handcrafted in limited maceration batches with pure perfume oils.
          </motion.p>
        </div>
      </section>

      {/* 2. COLLECTION CONTROLS (AUDIENCE FILTERS & SORTING) */}
      <section className="relative z-10 bg-[#0D0D0C] border-b border-[rgba(242,238,231,0.06)] py-4">
        <div className="layout-container flex items-center justify-between gap-4 font-sans">
          {/* Audience Categories (Swipeable on Mobile, Clean on Desktop) */}
          <div className="flex overflow-x-auto flex-nowrap space-x-6 sm:space-x-8 scrollbar-none [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden py-1">
            {audienceFilters.map((cat) => {
              const isActive = activeFilter === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => handleFilterSelect(cat.id)}
                  className={`relative py-1 text-[11px] sm:text-[11.5px] uppercase tracking-nav whitespace-nowrap transition-colors duration-300 cursor-pointer focus:outline-none shrink-0 ${isActive
                    ? "text-[#F2EEE7] font-medium"
                    : "text-[#777169] hover:text-[#AAA49B]"
                    }`}
                >
                  <span>{cat.label}</span>
                  {isActive && (
                    <motion.div
                      layoutId="activeShopFilter"
                      className="absolute -bottom-1 left-0 right-0 h-[1px] bg-[#BFA27A]"
                      transition={{ type: "spring", stiffness: 350, damping: 30 }}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Right: Modern Floating Sort Selection */}
          <div className="relative flex items-center justify-end" ref={sortContainerRef}>
            <button
              onClick={() => setSortOpen(!sortOpen)}
              className="flex items-center space-x-2 text-[10.5px] uppercase tracking-nav text-[#AAA49B] hover:text-[#BFA27A] transition-colors py-1.5 px-3 rounded-lg hover:bg-[#141312] focus:outline-none cursor-pointer"
            >
              <span className="hidden sm:inline">SORT: </span>{sortOptions.find((o) => o.id === sortBy)?.label}
              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${sortOpen ? "rotate-180 text-[#BFA27A]" : ""}`} />
            </button>

            {/* Floating Modern Sort Dropdown Menu */}
            <AnimatePresence>
              {sortOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 6, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 4, scale: 0.98 }}
                  transition={{ duration: 0.18, ease: LUXURY_EASE }}
                  className="absolute right-0 top-full mt-2 w-56 bg-[#141312]/95 backdrop-blur-xl border border-[rgba(242,238,231,0.1)] rounded-xl shadow-[0_15px_40px_rgba(0,0,0,0.85)] p-1.5 z-30 flex flex-col space-y-0.5"
                >
                  {sortOptions.map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => {
                        setSortBy(opt.id);
                        setSortOpen(false);
                      }}
                      className={`text-left px-3.5 py-2.5 rounded-lg text-[10px] font-sans uppercase tracking-[0.18em] transition-colors duration-150 cursor-pointer flex items-center justify-between ${sortBy === opt.id
                        ? "text-[#BFA27A] bg-[#1F1D19] font-medium"
                        : "text-[#AAA49B] hover:text-[#F2EEE7] hover:bg-[#1A1916]"
                        }`}
                    >
                      <span>{opt.label}</span>
                      {sortBy === opt.id && <span className="w-1.5 h-1.5 rounded-full bg-[#BFA27A]" />}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </section>

      {/* 3. PRODUCT GALLERY GRID */}
      <section className="py-14 sm:py-20">
        <div className="layout-container">
          {filteredProducts.length > 0 ? (
            <motion.div
              layout
              className="scente-product-grid"
            >
              <AnimatePresence mode="popLayout">
                {filteredProducts.map((product, idx) => (
                  <motion.div
                    key={product.id}
                    layout
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{
                      duration: 0.45,
                      delay: Math.min(idx * 0.06, 0.3),
                      ease: LUXURY_EASE,
                    }}
                    className="h-full flex flex-col"
                  >
                    <ProductCard product={product} index={idx} />
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          ) : (
            /* 4. ELEGANT EMPTY FILTER STATE */
            <ScrollReveal className="py-24 sm:py-32 text-center max-w-lg mx-auto bg-[#121110] p-10 sm:p-14 border border-[rgba(242,238,231,0.06)]">
              <span className="text-[10px] uppercase font-sans tracking-[0.28em] text-[#BFA27A] block mb-3 font-medium">
                SEASONAL ARCHIVE
              </span>
              <h3 className="font-serif text-2xl sm:text-3xl text-[#F2EEE7] mb-3 font-normal">
                No compositions found in this collection.
              </h3>
              <p className="text-xs sm:text-sm font-sans text-[#AAA49B] font-light leading-relaxed mb-8">
                Our atelier releases compositions in limited seasonal editions. Explore our available collection archive.
              </p>
              <Button
                onClick={() => handleFilterSelect("all")}
                variant="solid"
              >
                Explore All Compositions
              </Button>
            </ScrollReveal>
          )}
        </div>
      </section>


      {/* 6. EDITORIAL PHILOSOPHY INTERLUDE BEFORE FOOTER */}
      <section className="py-20 sm:py-24 text-center">
        <ScrollReveal className="layout-container max-w-2xl mx-auto">
          <span className="text-[9.5px] uppercase font-sans tracking-[0.3em] text-[#BFA27A] block mb-3 font-medium">
            THE SCENTÉ PHILOSOPHY
          </span>
          <h2 className="font-serif text-2xl sm:text-4xl text-[#F2EEE7] font-normal leading-snug mb-4">
            "A fragrance should not announce itself. It should remain."
          </h2>
          <p className="text-xs sm:text-sm font-sans text-[#AAA49B] font-light tracking-wide">
            Composed with patience, designed for presence.
          </p>
        </ScrollReveal>
      </section>
    </div>
  );
}
