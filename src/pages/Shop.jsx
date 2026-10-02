import React, { useState, useEffect, useMemo } from "react";
import { getActiveProducts, getVerifiedCachedActiveProducts } from "../services/products";
import ProductCard from "../components/ProductCard";
import Button from "../components/Button";
import ScrollReveal from "../components/ScrollReveal";
import { useSearchParams, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  SlidersHorizontal,
  X,
  RotateCcw,
  Check,
  Sparkles,
} from "lucide-react";
import { LUXURY_EASE } from "../lib/animations";
import SEO from "../components/SEO";
import CustomSelect from "../components/CustomSelect";

const MAX_CATALOG_PRICE = 25000;
const MIN_CATALOG_PRICE = 0;

/**
 * Top-level FilterPanel component:
 * Defined OUTSIDE the Shop component to prevent React from unmounting/remounting
 * the slider and inputs during mouse drag operations.
 */
const FilterPanel = React.memo(function FilterPanel({
  availabilityOpen,
  setAvailabilityOpen,
  inStockOnly,
  setInStockOnly,
  outOfStockOnly,
  setOutOfStockOnly,
  priceOpen,
  setPriceOpen,
  priceMin,
  setPriceMin,
  priceMax,
  setPriceMax,
  hasActiveFilters,
  resetAllFilters,
  counts = { inStock: 0, outOfStock: 0 },
}) {
  const sliderPercentage = Math.min(
    100,
    Math.max(
      0,
      ((priceMax - MIN_CATALOG_PRICE) / (MAX_CATALOG_PRICE - MIN_CATALOG_PRICE)) * 100
    )
  );

  return (
    <div className="space-y-6 text-sm">
      {/* 1. AVAILABILITY ACCORDION */}
      <div className="border-b border-white/[0.08] pb-5">
        <button
          type="button"
          onClick={() => setAvailabilityOpen((prev) => !prev)}
          className="w-full flex items-center justify-between text-left py-1 text-xs uppercase tracking-wider text-[#F2EEE7] font-medium hover:text-[#BFA27A] transition-colors cursor-pointer"
        >
          <span>Availability</span>
          <div className="flex items-center gap-2">
            {(inStockOnly || outOfStockOnly) && (
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  setInStockOnly(false);
                  setOutOfStockOnly(false);
                }}
                className="text-[10px] lowercase tracking-normal text-[#BFA27A] underline cursor-pointer hover:text-white"
              >
                Reset
              </span>
            )}
            <ChevronDown
              className={`w-3.5 h-3.5 text-[#AAA49B] transition-transform duration-200 ${availabilityOpen ? "rotate-180" : ""
                }`}
            />
          </div>
        </button>

        <AnimatePresence initial={false}>
          {availabilityOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden pt-3 space-y-2.5"
            >
              <label className="flex items-center gap-2.5 cursor-pointer text-xs text-[#AAA49B] hover:text-[#F2EEE7] transition-colors select-none">
                <div
                  onClick={() => setInStockOnly((prev) => !prev)}
                  className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${inStockOnly
                    ? "bg-[#BFA27A] border-[#BFA27A] text-[#0D0D0C]"
                    : "border-white/20 bg-transparent hover:border-white/40"
                    }`}
                >
                  {inStockOnly && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
                <span onClick={() => setInStockOnly((prev) => !prev)} className="flex-1">
                  In stock ({counts.inStock})
                </span>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer text-xs text-[#AAA49B] hover:text-[#F2EEE7] transition-colors select-none">
                <div
                  onClick={() => setOutOfStockOnly((prev) => !prev)}
                  className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${outOfStockOnly
                    ? "bg-[#BFA27A] border-[#BFA27A] text-[#0D0D0C]"
                    : "border-white/20 bg-transparent hover:border-white/40"
                    }`}
                >
                  {outOfStockOnly && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
                <span onClick={() => setOutOfStockOnly((prev) => !prev)} className="flex-1">
                  Out of stock ({counts.outOfStock})
                </span>
              </label>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 2. PRICE ACCORDION */}
      <div className="border-b border-white/[0.08] pb-5">
        <button
          type="button"
          onClick={() => setPriceOpen((prev) => !prev)}
          className="w-full flex items-center justify-between text-left py-1 text-xs uppercase tracking-wider text-[#F2EEE7] font-medium hover:text-[#BFA27A] transition-colors cursor-pointer"
        >
          <span>Price</span>
          <div className="flex items-center gap-2">
            {(priceMin > MIN_CATALOG_PRICE || priceMax < MAX_CATALOG_PRICE) && (
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  setPriceMin(MIN_CATALOG_PRICE);
                  setPriceMax(MAX_CATALOG_PRICE);
                }}
                className="text-[10px] lowercase tracking-normal text-[#BFA27A] underline cursor-pointer hover:text-white"
              >
                Reset
              </span>
            )}
            <ChevronDown
              className={`w-3.5 h-3.5 text-[#AAA49B] transition-transform duration-200 ${priceOpen ? "rotate-180" : ""
                }`}
            />
          </div>
        </button>

        <AnimatePresence initial={false}>
          {priceOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden pt-3 space-y-4"
            >
              <p className="text-[11px] text-[#777169]">
                The highest price is Rs. {MAX_CATALOG_PRICE.toLocaleString()}
              </p>

              {/* Slider for Max Price */}
              <div className="space-y-1.5">
                <input
                  type="range"
                  min={MIN_CATALOG_PRICE}
                  max={MAX_CATALOG_PRICE}
                  step={250}
                  value={priceMax}
                  onInput={(e) => {
                    const val = Number(e.target.value);
                    if (val >= priceMin) setPriceMax(val);
                  }}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    if (val >= priceMin) setPriceMax(val);
                  }}
                  className="luxury-range-slider"
                  style={{
                    background: `linear-gradient(to right, #BFA27A 0%, #BFA27A ${sliderPercentage}%, rgba(255, 255, 255, 0.12) ${sliderPercentage}%, rgba(255, 255, 255, 0.12) 100%)`,
                  }}
                  aria-label="Filter products by maximum price"
                />
                <div className="flex justify-between text-[10px] text-[#777169] font-mono">
                  <span>Rs. 0</span>
                  <span>Rs. {MAX_CATALOG_PRICE.toLocaleString()}</span>
                </div>
              </div>

              {/* Inputs for Price Range */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-[#777169] mb-1">
                    From
                  </label>
                  <div className="flex items-center px-2.5 py-1.5 bg-[#141312] border border-white/10 rounded-lg text-xs text-[#F2EEE7] focus-within:border-[#BFA27A]">
                    <span className="text-[#777169] mr-1 text-[11px]">Rs.</span>
                    <input
                      type="number"
                      min={MIN_CATALOG_PRICE}
                      max={priceMax}
                      value={priceMin}
                      onChange={(e) => {
                        const val = Math.max(0, Number(e.target.value) || 0);
                        setPriceMin(val);
                      }}
                      className="w-full bg-transparent focus:outline-none text-xs font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-[#777169] mb-1">
                    To
                  </label>
                  <div className="flex items-center px-2.5 py-1.5 bg-[#141312] border border-white/10 rounded-lg text-xs text-[#F2EEE7] focus-within:border-[#BFA27A]">
                    <span className="text-[#777169] mr-1 text-[11px]">Rs.</span>
                    <input
                      type="number"
                      min={priceMin}
                      max={MAX_CATALOG_PRICE}
                      value={priceMax}
                      onChange={(e) => {
                        const val = Number(e.target.value) || MAX_CATALOG_PRICE;
                        setPriceMax(val);
                      }}
                      className="w-full bg-transparent focus:outline-none text-xs font-mono"
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Clear all filters button if active */}
      {hasActiveFilters && (
        <button
          type="button"
          onClick={resetAllFilters}
          className="w-full py-2.5 px-3 rounded-lg border border-white/10 text-[11px] uppercase tracking-wider text-[#AAA49B] hover:text-[#F2EEE7] hover:border-[#BFA27A]/50 transition-colors flex items-center justify-center gap-2 cursor-pointer"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Reset All Filters</span>
        </button>
      )}
    </div>
  );
});

function ProductGridSkeleton({ count = 8 }) {
  return (
    <div
      className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 min-[880px]:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4.5 lg:gap-5"
      role="status"
      aria-label="Loading fragrance compositions"
    >
      {Array.from({ length: count }).map((_, idx) => (
        <div key={idx} className="flex flex-col h-full w-full justify-between animate-pulse select-none">
          {/* Image Container Skeleton matching ProductCard Scentara */}
          <div className="relative aspect-square mb-3.5 bg-[#141312] overflow-hidden rounded-2xl border border-white/[0.07] flex items-center justify-center">
            <div className="w-8 h-8 rounded-full border border-white/[0.05] flex items-center justify-center opacity-30">
              <span className="font-serif text-[11px] text-[#BFA27A]/40 tracking-widest pl-0.5">S</span>
            </div>
          </div>
          {/* Centered Meta Skeleton */}
          <div className="space-y-1.5 px-1 sm:px-2 pb-2 text-center flex flex-col items-center">
            <div className="h-2.5 bg-white/[0.05] rounded-full w-20" />
            <div className="h-4 bg-white/[0.08] rounded-full w-32" />
            <div className="h-3 bg-white/[0.06] rounded-full w-16 pt-0.5" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Shop() {
  const verifiedCache = useMemo(() => getVerifiedCachedActiveProducts(), []);
  const [productsList, setProductsList] = useState(() => verifiedCache || []);
  const [searchParams, setSearchParams] = useSearchParams();

  // URL query parameter for audience/category
  const rawParam = (
    searchParams.get("audience") ||
    searchParams.get("gender") ||
    searchParams.get("category") ||
    searchParams.get("family") ||
    ""
  ).toLowerCase().trim();

  // Normalize aliases: "wax" -> "waxes", "tester" -> "testers"
  const normalizedParam = rawParam === "wax" ? "waxes" : rawParam === "tester" ? "testers" : rawParam;

  const validAudiences = ["men", "women", "unisex", "waxes", "testers"];
  const initialFilter = validAudiences.includes(normalizedParam) ? normalizedParam : "all";

  // Filter States
  const [activeFilter, setActiveFilter] = useState(initialFilter);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [outOfStockOnly, setOutOfStockOnly] = useState(false);
  const [priceMin, setPriceMin] = useState(MIN_CATALOG_PRICE);
  const [priceMax, setPriceMax] = useState(MAX_CATALOG_PRICE);

  // Accordion toggle states
  const [availabilityOpen, setAvailabilityOpen] = useState(true);
  const [priceOpen, setPriceOpen] = useState(true);

  // Mobile filter drawer state
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(() => !verifiedCache || verifiedCache.length === 0);

  // Sync state if URL changes externally
  useEffect(() => {
    if (validAudiences.includes(normalizedParam)) {
      setActiveFilter(normalizedParam);
    } else if (!normalizedParam || !validAudiences.includes(normalizedParam)) {
      setActiveFilter("all");
    }
  }, [normalizedParam]);

  // Handle category/audience filter
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

  // Reset all filters
  const resetAllFilters = () => {
    setActiveFilter("all");
    setInStockOnly(false);
    setOutOfStockOnly(false);
    setPriceMin(MIN_CATALOG_PRICE);
    setPriceMax(MAX_CATALOG_PRICE);
    const newParams = new URLSearchParams(searchParams);
    newParams.delete("category");
    newParams.delete("family");
    newParams.delete("gender");
    newParams.delete("audience");
    setSearchParams(newParams, { replace: true });
  };

  const hasActiveFilters =
    activeFilter !== "all" ||
    inStockOnly ||
    outOfStockOnly ||
    priceMin > MIN_CATALOG_PRICE ||
    priceMax < MAX_CATALOG_PRICE;

  const activeFiltersCount =
    (activeFilter !== "all" ? 1 : 0) +
    (inStockOnly ? 1 : 0) +
    (outOfStockOnly ? 1 : 0) +
    (priceMin > MIN_CATALOG_PRICE || priceMax < MAX_CATALOG_PRICE ? 1 : 0);

  // Fetch active products from Supabase (falls back smoothly to verified/local catalog)
  useEffect(() => {
    let isMounted = true;
    async function loadCatalog() {
      if (!productsList || productsList.length === 0) {
        setIsLoading(true);
      }
      try {
        const { data } = await getActiveProducts();
        if (isMounted && data && data.length > 0) {
          setProductsList(data);
        }
      } catch (err) {
        console.error("Shop: error fetching catalog:", err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }
    loadCatalog();
    return () => {
      isMounted = false;
    };
  }, []);

  // Calculate dynamic counts
  const counts = useMemo(() => {
    const isProductOutOfStock = (p) => {
      const activeVariants = Array.isArray(p.variants)
        ? p.variants.filter((v) => v.isActive !== false && v.is_active !== false)
        : [];
      if (activeVariants.length > 0) {
        return activeVariants.every((v) => Number(v.stockQuantity ?? v.stock_quantity ?? 0) <= 0);
      }
      return (
        p.status === "out_of_stock" ||
        p.isOutOfStock ||
        Number(p.stockQuantity ?? p.stock_quantity ?? 0) <= 0
      );
    };

    let inStock = 0;
    let outOfStock = 0;
    let all = productsList.length;
    let men = 0;
    let women = 0;
    let unisex = 0;
    let waxes = 0;
    let testers = 0;

    productsList.forEach((p) => {
      if (isProductOutOfStock(p)) {
        outOfStock++;
      } else {
        inStock++;
      }

      const fam = (p.family || "").toLowerCase();
      const aud = (p.audience || "").toLowerCase();
      const fams = Array.isArray(p.families) ? p.families.map((f) => String(f).toLowerCase()) : [];
      const desc = (p.description || "").toLowerCase();

      // Structured classification: Waxes
      if (fam === "waxes" || fam === "wax" || aud === "waxes" || aud === "wax" || fams.includes("waxes") || fams.includes("wax")) {
        waxes++;
      }
      // Structured classification: Testers
      else if (fam === "testers" || fam === "tester" || aud === "testers" || aud === "tester" || fams.includes("testers") || fams.includes("tester")) {
        testers++;
      }
      // Structured classification: Fragrances
      else {
        if (fam === "men" || aud === "men" || fams.includes("men") || fam === "woody" || desc.includes("masculine")) {
          men++;
        }
        if (fam === "women" || aud === "women" || fams.includes("women") || fam === "floral" || desc.includes("feminine")) {
          women++;
        }
        if (
          fam === "unisex" ||
          aud === "unisex" ||
          fams.includes("unisex") ||
          ["amber", "musk", "fresh"].includes(fam) ||
          desc.includes("unisex")
        ) {
          unisex++;
        }
      }
    });

    return { inStock, outOfStock, all, men, women, unisex, waxes, testers };
  }, [productsList]);

  // Dynamic filter
  const filteredProducts = useMemo(() => {
    return productsList.filter((product) => {
      // 1. Availability filter
      const activeVariants = Array.isArray(product.variants)
        ? product.variants.filter((v) => v.isActive !== false && v.is_active !== false)
        : [];
      const isOutOfStock =
        activeVariants.length > 0
          ? activeVariants.every((v) => Number(v.stockQuantity ?? v.stock_quantity ?? 0) <= 0)
          : (product.status === "out_of_stock" ||
            product.isOutOfStock ||
            Number(product.stockQuantity ?? product.stock_quantity ?? 0) <= 0);

      if (inStockOnly && !outOfStockOnly && isOutOfStock) return false;
      if (outOfStockOnly && !inStockOnly && !isOutOfStock) return false;

      // 2. Price filter
      const price = Number(product.price || 0);
      if (price < priceMin || price > priceMax) return false;

      // 3. Collection / Category filter
      if (activeFilter === "all") return true;

      const pFamily = (product.family || "").toLowerCase();
      const pAudience = (product.audience || "").toLowerCase();
      const pFamilies = Array.isArray(product.families)
        ? product.families.map((f) => String(f).toLowerCase())
        : [];
      const pDesc = (product.description || "").toLowerCase();

      // Waxes filter (structured data matching)
      if (activeFilter === "waxes") {
        return (
          pFamily === "waxes" ||
          pFamily === "wax" ||
          pAudience === "waxes" ||
          pAudience === "wax" ||
          pFamilies.includes("waxes") ||
          pFamilies.includes("wax")
        );
      }

      // Testers filter (structured data matching)
      if (activeFilter === "testers") {
        return (
          pFamily === "testers" ||
          pFamily === "tester" ||
          pAudience === "testers" ||
          pAudience === "tester" ||
          pFamilies.includes("testers") ||
          pFamilies.includes("tester")
        );
      }

      // If product is classified as a wax or tester, exclude from perfume filters
      const isWaxOrTester =
        pFamily === "waxes" ||
        pFamily === "wax" ||
        pFamily === "testers" ||
        pFamily === "tester" ||
        pFamilies.includes("waxes") ||
        pFamilies.includes("wax") ||
        pFamilies.includes("testers") ||
        pFamilies.includes("tester");

      if (isWaxOrTester) return false;

      if (pFamily === activeFilter || pAudience === activeFilter || pFamilies.includes(activeFilter)) {
        return true;
      }

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
  }, [productsList, activeFilter, inStockOnly, outOfStockOnly, priceMin, priceMax]);

  return (
    <div className="bg-[#0D0D0C] text-[#F2EEE7] min-h-screen">
      <SEO
        title={
          activeFilter === "waxes"
            ? "Artisan Scented Waxes — The Collection"
            : activeFilter === "testers"
              ? "Discovery Testers — The Collection"
              : activeFilter !== "all"
                ? `${activeFilter.charAt(0).toUpperCase() + activeFilter.slice(1)}'s Fragrances — The Collection`
                : "The Fragrance Collection — Handcrafted Extraits de Parfum"
        }
        description="Explore the SCENTÉPK collection of artisan Extraits de Parfum, scented botanical waxes, and discovery testers. Handcrafted in limited maceration batches with 30-40% pure perfume oil concentrations. Cash on Delivery across Pakistan."
        canonicalUrl="https://scente.pk/shop"
        keywords="buy perfume online Pakistan, luxury extrait de parfum, artisan scented waxes, perfume testers, artisan fragrance Karachi, Lahore, Islamabad, Cash on Delivery perfumes"
      />

      {/* 1. PAGE TITLE HEADER */}
      <section className="pt-10 sm:pt-14 pb-6 sm:pb-8 border-b border-[rgba(242,238,231,0.06)]">
        <div className="layout-container">
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: LUXURY_EASE }}
            className="font-serif text-3xl sm:text-4xl md:text-5xl font-light tracking-wide text-[#F2EEE7]"
          >
            THE COLLECTION
          </motion.h1>
        </div>
      </section>

      {/* MOBILE CONTROL BAR (Filter Button + Category Dropdown right in the filter line) */}
      <div className="lg:hidden border-b border-white/[0.06] bg-[#0D0D0C] py-2.5 px-4 sticky top-16 z-30 backdrop-blur-md">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setMobileFilterOpen(true)}
            className="flex items-center gap-2 text-xs uppercase tracking-wider text-[#F2EEE7] hover:text-[#BFA27A] py-2 px-3 rounded-lg bg-[#141312] border border-white/10 cursor-pointer shrink-0"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-[#BFA27A]" />
            <span>Filter</span>
            {activeFiltersCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-[#BFA27A] text-[#0D0D0C] text-[10px] font-bold flex items-center justify-center">
                {activeFiltersCount}
              </span>
            )}
          </button>

          {/* Category Dropdown (Default: All, options: Men, Women, Unisex, Testers, Waxes) */}
          <div className="w-40 sm:w-44 shrink-0">
            <CustomSelect
              value={activeFilter}
              onChange={(val) => handleFilterSelect(val)}
              options={[
                { value: "all", label: "All" },
                { value: "men", label: "Men" },
                { value: "women", label: "Women" },
                { value: "unisex", label: "Unisex" },
                { value: "testers", label: "Testers" },
                { value: "waxes", label: "Waxes" },
              ]}
              size="sm"
              align="right"
              buttonClassName="!bg-[#141312] !border-white/10 !py-2 !px-3 !text-xs !rounded-lg"
              menuClassName="!bg-[#141312] !border-white/10 !shadow-2xl z-50 !w-44 !right-0"
            />
          </div>
        </div>
      </div>

      {/* MOBILE SLIDE-OUT FILTER DRAWER */}
      <AnimatePresence>
        {mobileFilterOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileFilterOpen(false)}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 lg:hidden"
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 0.3, ease: LUXURY_EASE }}
              className="fixed top-0 bottom-0 left-0 w-[85%] max-w-sm h-[100dvh] bg-[#121110] border-r border-white/10 p-5 sm:p-6 z-50 overflow-y-auto overscroll-contain lg:hidden flex flex-col justify-between safe-pt safe-drawer-bottom"
              data-lenis-prevent
            >
              <div>
                <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6">
                  <span className="text-xs uppercase tracking-[0.2em] font-medium text-[#F2EEE7]">
                    Filter
                  </span>
                  <button
                    type="button"
                    onClick={() => setMobileFilterOpen(false)}
                    className="p-1 rounded-lg text-[#AAA49B] hover:text-white cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <FilterPanel
                  availabilityOpen={availabilityOpen}
                  setAvailabilityOpen={setAvailabilityOpen}
                  inStockOnly={inStockOnly}
                  setInStockOnly={setInStockOnly}
                  outOfStockOnly={outOfStockOnly}
                  setOutOfStockOnly={setOutOfStockOnly}
                  priceOpen={priceOpen}
                  setPriceOpen={setPriceOpen}
                  priceMin={priceMin}
                  setPriceMin={setPriceMin}
                  priceMax={priceMax}
                  setPriceMax={setPriceMax}
                  hasActiveFilters={hasActiveFilters}
                  resetAllFilters={resetAllFilters}
                  counts={counts}
                />
              </div>

              <div className="pt-6 border-t border-white/10 mt-6 space-y-2">
                <Button
                  onClick={() => setMobileFilterOpen(false)}
                  variant="solid"
                  className="w-full text-center justify-center"
                >
                  Apply Filters ({filteredProducts.length})
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* MAIN CONTENT AREA: SIDEBAR + PRODUCT GRID */}
      <section className="py-10 sm:py-16">
        <div className="layout-container">
          <div className="lg:flex lg:gap-10 xl:gap-14 items-start">
            {/* DESKTOP FILTER SIDEBAR */}
            <aside className="hidden lg:block w-60 xl:w-64 shrink-0 sticky top-28">
              <div className="flex items-center justify-between pb-4 mb-2 border-b border-white/[0.08]">
                <h2 className="text-xs font-sans uppercase tracking-[0.2em] text-[#F2EEE7] font-semibold">
                  Filter:
                </h2>
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={resetAllFilters}
                    className="text-[11px] text-[#BFA27A] underline hover:text-white transition-colors cursor-pointer"
                  >
                    Reset all
                  </button>
                )}
              </div>
              <FilterPanel
                availabilityOpen={availabilityOpen}
                setAvailabilityOpen={setAvailabilityOpen}
                inStockOnly={inStockOnly}
                setInStockOnly={setInStockOnly}
                outOfStockOnly={outOfStockOnly}
                setOutOfStockOnly={setOutOfStockOnly}
                priceOpen={priceOpen}
                setPriceOpen={setPriceOpen}
                priceMin={priceMin}
                setPriceMin={setPriceMin}
                priceMax={priceMax}
                setPriceMax={setPriceMax}
                hasActiveFilters={hasActiveFilters}
                resetAllFilters={resetAllFilters}
                counts={counts}
              />

              {/* Bespoke Fragrance Atelier CTA Card */}
              <div className="mt-8 p-4 rounded-xl bg-[#121110] border border-[rgba(242,238,231,0.08)] space-y-2.5">
                <div className="flex items-center gap-1.5 text-[#BFA27A]">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span className="text-[10px] uppercase font-sans tracking-[0.2em] font-medium">
                    BESPOKE ATELIER
                  </span>
                </div>
                <p className="text-xs font-serif text-[#F2EEE7] leading-snug">
                  Looking for a scent made exclusively for you?
                </p>
                <p className="text-[11px] font-sans text-[#AAA49B] font-light leading-relaxed">
                  Select your size, profile and notes in our custom builder.
                </p>
                <Link
                  to="/build-your-scent"
                  className="inline-block pt-1 text-[11px] uppercase font-sans tracking-[0.14em] text-[#BFA27A] hover:text-[#F2EEE7] font-semibold transition-colors"
                >
                  Build Your Scent →
                </Link>
              </div>
            </aside>

            {/* PRODUCT GRID (RESPONSIVE COLUMNS) */}
            <main className="flex-1 min-w-0">
              {/* Desktop Category Dropdown & Results Counter */}
              <div className="hidden lg:flex items-center justify-between pb-4 mb-6 border-b border-white/[0.06]">
                <span className="text-xs uppercase font-sans tracking-[0.16em] text-[#AAA49B]">
                  {isLoading
                    ? "Curating Compositions..."
                    : `${filteredProducts.length} ${filteredProducts.length === 1 ? "Composition" : "Compositions"}`}
                </span>
                <div className="flex items-center gap-2.5">
                  <span className="text-[11px] uppercase tracking-wider text-[#777169]">Category:</span>
                  <div className="w-44">
                    <CustomSelect
                      value={activeFilter}
                      onChange={(val) => handleFilterSelect(val)}
                      options={[
                        { value: "all", label: "All" },
                        { value: "men", label: "Men" },
                        { value: "women", label: "Women" },
                        { value: "unisex", label: "Unisex" },
                        { value: "testers", label: "Testers" },
                        { value: "waxes", label: "Waxes" },
                      ]}
                      size="sm"
                      align="right"
                      buttonClassName="!bg-[#141312] !border-white/10 !py-2 !px-3 !text-xs !rounded-lg"
                      menuClassName="!bg-[#141312] !border-white/10 !shadow-2xl z-50 !w-44 !right-0"
                    />
                  </div>
                </div>
              </div>
              {isLoading ? (
                <ProductGridSkeleton count={8} />
              ) : filteredProducts.length > 0 ? (
                <motion.div
                  layout
                  className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 min-[880px]:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4.5 lg:gap-5"
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
                          delay: Math.min(idx * 0.05, 0.25),
                          ease: LUXURY_EASE,
                        }}
                        className="h-full flex flex-col"
                      >
                        <ProductCard product={product} variant="scentara" index={idx} />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </motion.div>
              ) : (
                /* ELEGANT EMPTY FILTER STATE */
                <ScrollReveal className="py-24 sm:py-32 text-center max-w-md mx-auto bg-[#121110] p-8 sm:p-12 border border-[rgba(242,238,231,0.06)] rounded-2xl">
                  <span className="text-[10px] uppercase font-sans tracking-[0.28em] text-[#BFA27A] block mb-3 font-medium">
                    ZERO COMPOSITIONS FOUND
                  </span>
                  <h3 className="font-serif text-2xl sm:text-3xl text-[#F2EEE7] mb-3 font-normal">
                    No matching perfumes.
                  </h3>
                  <p className="text-xs sm:text-sm font-sans text-[#AAA49B] font-light leading-relaxed mb-6">
                    Try adjusting your price range, availability, or selected fragrance collection.
                  </p>
                  <Button
                    onClick={resetAllFilters}
                    variant="solid"
                  >
                    Reset All Filters
                  </Button>
                </ScrollReveal>
              )}
            </main>
          </div>
        </div>
      </section>
    </div>
  );
}


