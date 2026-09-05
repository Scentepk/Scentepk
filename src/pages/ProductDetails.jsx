import React, { useState, useEffect, useRef, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { PRODUCTS } from "../data/products";
import { getProductBySlug, getActiveProducts, normalizeProduct } from "../services/products";
import { useCart } from "../context/CartContext";
import SectionHeading from "../components/SectionHeading";
import ProductCard from "../components/ProductCard";
import Button from "../components/Button";
import ScrollReveal from "../components/ScrollReveal";
import ParallaxImage from "../components/ParallaxImage";
import { Check, Shield, Truck, ChevronLeft, ChevronRight, ChevronDown, Minus, Plus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { LUXURY_EASE } from "../lib/animations";
import ProductLightbox from "../components/ProductLightbox";
import SEO from "../components/SEO";

export default function ProductDetails() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { addToCart, buyNow } = useCart();
  const [added, setAdded] = useState(false);
  const [selectedSize, setSelectedSize] = useState("50ml"); // default "50ml"
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState("notes"); // "notes" | "ritual" | "provenance"
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isSizeDropdownOpen, setIsSizeDropdownOpen] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const sizeDropdownRef = useRef(null);

  // Helper to find exact product match from local admin cache or static catalog
  const findCachedProduct = (targetSlug) => {
    if (!targetSlug) return null;
    let raw = null;
    try {
      const saved = localStorage.getItem("scente_admin_products_cache");
      if (saved) {
        const parsed = JSON.parse(saved);
        raw = parsed.find((p) => p.slug === targetSlug || p.id === targetSlug);
      }
    } catch (e) {}

    if (!raw) {
      raw = PRODUCTS.find((p) => p.slug === targetSlug || p.id === targetSlug);
    }
    // Return normalized product ONLY if targetSlug matched; NEVER fall back to PRODUCTS[0]
    return raw ? normalizeProduct(raw) : null;
  };

  const [product, setProduct] = useState(() => findCachedProduct(slug));
  const [isLoading, setIsLoading] = useState(() => !findCachedProduct(slug));
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    // 1. Instantly check if this exact slug is already cached
    const cached = findCachedProduct(slug);

    if (cached) {
      setProduct(cached);
      setIsLoading(false);
      setNotFound(false);
    } else {
      // 2. Immediately invalidate previous product from state and enter loading mode!
      // This guarantees that the previous product NEVER flashes while fetching the new one.
      setProduct(null);
      setIsLoading(true);
      setNotFound(false);
    }

    // 3. Race condition prevention token
    let isCurrentRequest = true;

    getProductBySlug(slug)
      .then(({ data }) => {
        // If user rapidly clicked another product (e.g. A -> B -> C), ignore stale responses
        if (!isCurrentRequest) return;

        if (data) {
          setProduct(data);
          setNotFound(false);
        } else if (!cached) {
          setNotFound(true);
        }
      })
      .catch((err) => {
        if (!isCurrentRequest) return;
        console.error(`Failed to fetch product for slug ${slug}:`, err);
        if (!cached) setNotFound(true);
      })
      .finally(() => {
        if (isCurrentRequest) {
          setIsLoading(false);
        }
      });

    return () => {
      // Route parameter changed or component unmounted -> ignore this request
      isCurrentRequest = false;
    };
  }, [slug]);

  // Reset active image index whenever viewed product slug changes
  useEffect(() => {
    setActiveImageIndex(0);
  }, [slug]);

  const galleryImages =
    product?.images && product.images.length > 0
      ? product.images
      : [product?.image, product?.primary_image, product?.secondary_image].filter(Boolean);

  const activeImageSrc =
    galleryImages[activeImageIndex] ||
    galleryImages[0] ||
    product?.image ||
    product?.primary_image ||
    PRODUCTS.find((p) => p.slug === slug || p.id === slug)?.image ||
    PRODUCTS[0].image;

  // Gallery Navigation (Loops smoothly: 0 -> last, last -> 0)
  const handlePrevImage = (e) => {
    e?.stopPropagation?.();
    if (galleryImages.length <= 1) return;
    setActiveImageIndex((prev) => (prev - 1 + galleryImages.length) % galleryImages.length);
  };

  const handleNextImage = (e) => {
    e?.stopPropagation?.();
    if (galleryImages.length <= 1) return;
    setActiveImageIndex((prev) => (prev + 1) % galleryImages.length);
  };

  const isInactive = product?.status === "inactive" || product?.isActive === false || product?.is_active === false;
  const isOutOfStock = product?.status === "out_of_stock" || product?.isOutOfStock || product?.stockQuantity === 0 || product?.stock_quantity === 0;

  const variants =
    product?.variants && product.variants.length > 0
      ? product.variants
      : [
          {
            id: `${product?.id || "prod"}-var-50ml`,
            product_id: product?.id,
            size: "50ml",
            volume: product?.volume || "50 ML",
            price: product?.price || 14500,
            formattedPrice: product?.formattedPrice || "PKR 14,500",
            stockQuantity: product?.stockQuantity ?? 50,
            stock_quantity: product?.stockQuantity ?? 50,
            isOutOfStock: Boolean(product?.isOutOfStock),
            isActive: true,
          },
        ];

  // Auto-sync selectedSize to an existing variant whenever product or variants change
  useEffect(() => {
    if (variants.length > 0 && !variants.some((v) => v.size === selectedSize)) {
      setSelectedSize(variants[0].size);
    }
  }, [variants, selectedSize]);

  // Close size dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (sizeDropdownRef.current && !sizeDropdownRef.current.contains(e.target)) {
        setIsSizeDropdownOpen(false);
      }
    };
    if (isSizeDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isSizeDropdownOpen]);

  // Reset dropdown and quantity when product slug or size changes
  useEffect(() => {
    setIsSizeDropdownOpen(false);
    setQuantity(1);
  }, [slug, selectedSize]);

  const activeVariant = variants.find((v) => v.size === selectedSize) || variants[0];
  const currentPrice = activeVariant ? activeVariant.price : (product?.price || 14500);
  const currentFormattedPrice = activeVariant ? activeVariant.formattedPrice : (product?.formattedPrice || "PKR 14,500");
  const totalPrice = currentPrice * quantity;
  const formattedTotalPrice = "PKR " + Number(totalPrice).toLocaleString("en-PK");

  const stockCount = Number(activeVariant?.stock_quantity ?? activeVariant?.stockQuantity ?? 0);
  const isVariantOutOfStock = activeVariant
    ? Boolean(activeVariant.isOutOfStock || stockCount <= 0 || activeVariant.is_active === false)
    : Boolean(isOutOfStock);
  const isOutOfStockNow = isVariantOutOfStock || stockCount <= 0;
  const isLowStock = !isOutOfStockNow && stockCount > 0 && stockCount <= 5;

  const maxStock = Math.max(0, stockCount);
  const handleDecreaseQuantity = () => {
    setQuantity((prev) => Math.max(1, prev - 1));
  };
  const handleIncreaseQuantity = () => {
    if (isOutOfStockNow || maxStock <= 0) return;
    setQuantity((prev) => Math.min(maxStock, prev + 1));
  };

  // Unified, consistent formulation & concentration terminology
  const resolvedClassification = (() => {
    const conc = (product?.concentration || "").trim();
    const sub = (product?.subtitle || "").trim();

    if (sub.toLowerCase().includes("eau de parfum") || conc.toLowerCase().includes("eau de parfum")) {
      const match = conc.match(/\d+%/);
      const percent = match ? `${match[0]} ` : "";
      return `${percent}Eau de Parfum`.trim();
    }

    const match = conc.match(/\d+%/);
    const percent = match ? `${match[0]} ` : "30% ";
    return `${percent}Extrait de Parfum`.trim();
  })();

  const resolvedFormulationType = resolvedClassification.includes("Eau de Parfum")
    ? "Eau de Parfum"
    : "Extrait de Parfum";

  // 1. Batch / Product badge (compact premium eyebrow)
  const batchBadgeText = `BATCH 04 · ${resolvedClassification.toUpperCase()}`;

  // 2. Product type / size (dynamic from actual product/variant data)
  const productTypeSubtitle = (() => {
    const size = activeVariant?.size || (product?.volume ? product.volume.split("/")[0].trim() : "50ml");
    return `${size} ${resolvedFormulationType}`;
  })();

  // 4. Description cleaner (avoids repeating title right after heading)
  const cleanedDescription = (() => {
    if (!product?.description) return "";
    let d = String(product.description).trim();
    if (product?.name) {
      const escaped = product.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const nameRegex = new RegExp(`^${escaped}[\\s:–—,.-]+`, "i");
      if (nameRegex.test(d)) {
        d = d.replace(nameRegex, "").trim();
        if (d.length > 0) {
          d = d.charAt(0).toUpperCase() + d.slice(1);
        }
      }
    }
    return d;
  })();

  // 5. Key Accords / Notes (clean luxury presentation, zero emojis, fully dynamic)
  const keyAccords = (() => {
    if (!product) return [];
    if (Array.isArray(product.accords) && product.accords.length > 0) {
      return product.accords
        .map((a) => String(a).replace(/[\u{1F300}-\u{1F9FF}]/gu, "").trim())
        .filter(Boolean);
    }
    if (product.notes) {
      const allNotes = [
        ...(Array.isArray(product.notes.top) ? product.notes.top : []),
        ...(Array.isArray(product.notes.heart) ? product.notes.heart : []),
        ...(Array.isArray(product.notes.base) ? product.notes.base : []),
      ];
      if (allNotes.length > 0) {
        const cleaned = allNotes
          .map((n) => String(n).replace(/[\u{1F300}-\u{1F9FF}]/gu, "").trim())
          .filter(Boolean);
        return Array.from(new Set(cleaned)).slice(0, 5);
      }
    }
    if (product.olfactiveFamily) {
      const raw = String(product.olfactiveFamily).replace(/[\u{1F300}-\u{1F9FF}]/gu, "").trim();
      const parts = raw.split(/[•·,&|]/).map((s) => s.trim()).filter(Boolean);
      if (parts.length > 0) return parts;
    }
    return [];
  })();

  const keyNotesDisplay = (() => {
    if (keyAccords && keyAccords.length > 0) {
      return keyAccords.join(" · ");
    }
    if (product?.olfactiveFamily) {
      return String(product.olfactiveFamily).replace(/[\u{1F300}-\u{1F9FF}]/gu, "").trim();
    }
    return "Aged Oud · Smoked Woods · Amber Resins";
  })();

  // 7. Selected Variant Volume (single clean supporting line)
  const selectedVariantVolume = (() => {
    if (activeVariant?.volume && activeVariant.volume.includes("FL. OZ.")) {
      return activeVariant.volume;
    }
    if (activeVariant?.volume && activeVariant.volume.includes("/")) {
      return activeVariant.volume;
    }
    const s = String(activeVariant?.size || selectedSize || "50ml").toLowerCase();
    if (s.includes("50")) return "50ml / 1.7 FL. OZ.";
    if (s.includes("100")) return "100ml / 3.4 FL. OZ.";
    if (s.includes("30")) return "30ml / 1.0 FL. OZ.";
    if (s.includes("10")) return "10ml / 0.34 FL. OZ.";
    return activeVariant?.volume || activeVariant?.size || "50ml / 1.7 FL. OZ.";
  })();

  const handleAddToCart = () => {
    if (isOutOfStockNow || !product || stockCount <= 0) return;
    addToCart(product, selectedSize, quantity, activeVariant);
    setAdded(true);
    setTimeout(() => setAdded(false), 3000);
  };

  const handleBuyNow = () => {
    if (isOutOfStockNow || !product || stockCount <= 0) return;
    buyNow(product, selectedSize, quantity, activeVariant);
    navigate("/checkout", { state: { freshCheckout: true, isBuyNow: true } });
  };

  // Dynamic active products catalog (initializes smoothly from cache, then syncs with Supabase)
  const [catalogProducts, setCatalogProducts] = useState(() => {
    try {
      const saved = localStorage.getItem("scente_admin_products_cache");
      if (saved) {
        return JSON.parse(saved)
          .filter((p) => p.status !== "inactive" && p.is_active !== false)
          .map(normalizeProduct);
      }
    } catch (e) {}
    return PRODUCTS.filter((p) => p.status !== "inactive" && p.is_active !== false).map(normalizeProduct);
  });

  // Fetch fresh active products from Supabase whenever slug changes or component mounts
  useEffect(() => {
    let isMounted = true;
    getActiveProducts()
      .then(({ data }) => {
        if (isMounted && data && data.length > 0) {
          setCatalogProducts(data);
        }
      })
      .catch((err) => {
        console.error("Failed to load active products for recommendations:", err);
      });

    return () => {
      isMounted = false;
    };
  }, [slug]);

  // Related products (Dynamic Supabase recommendations, excluding current product, 3-column compact desktop grid)
  const relatedProducts = useMemo(() => {
    if (!product || !catalogProducts || catalogProducts.length === 0) return [];

    // 1. Strictly exclude current product being viewed (by slug and id), ensuring active status
    const eligible = catalogProducts.filter((p) => {
      const isCurrent = p.slug === product.slug || p.id === product.id;
      const isActive = p.status !== "inactive" && p.is_active !== false && p.isActive !== false;
      return !isCurrent && isActive;
    });

    if (eligible.length === 0) return [];

    // 2. Compute relevance and recency score:
    // - High relevance: same fragrance family or overlapping notes
    // - Recency boost: newly added products (by created_at or id) are prioritized so they appear immediately
    const currentFamily = (product.family || "").toLowerCase();
    const currentFamilies = Array.isArray(product.families)
      ? product.families.map((f) => String(f).toLowerCase())
      : [currentFamily].filter(Boolean);

    const scored = eligible.map((p) => {
      let score = 0;
      const pFamily = (p.family || "").toLowerCase();
      const pFamilies = Array.isArray(p.families)
        ? p.families.map((f) => String(f).toLowerCase())
        : [pFamily].filter(Boolean);

      // Exact or overlapping fragrance family match
      if (currentFamily && pFamily && currentFamily === pFamily) {
        score += 10;
      } else if (pFamilies.some((f) => currentFamilies.includes(f))) {
        score += 8;
      }

      // Olfactive family text similarity
      if (
        product.olfactiveFamily &&
        p.olfactiveFamily &&
        product.olfactiveFamily.toLowerCase() === p.olfactiveFamily.toLowerCase()
      ) {
        score += 5;
      }

      // Timestamp weight: newer products get higher priority
      const timestamp = p.created_at ? new Date(p.created_at).getTime() : 0;

      return { product: p, score, timestamp };
    });

    // Sort: highest relevance score first, then newest first
    scored.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return b.timestamp - a.timestamp;
    });

    // Return top 3 recommendations matching the 3-column desktop grid
    return scored.slice(0, 3).map((item) => item.product);
  }, [product, catalogProducts]);

  // 1. Loading state: Immediately renders luxury skeleton, NEVER previous product
  if (isLoading || (!product && !notFound)) {
    return <ProductDetailsSkeleton />;
  }

  // 2. Not found state
  if (notFound || !product) {
    return (
      <div className="bg-[#0D0D0C] text-[#F2EEE7] min-h-[70vh] flex flex-col items-center justify-center text-center p-6">
        <SEO
          title="Composition Not Found"
          description="The requested fragrance composition could not be located in our atelier catalog."
          noindex={true}
        />
        <span className="text-[10px] uppercase font-sans tracking-[0.24em] text-[#BFA27A] mb-3 font-medium">
          ATELIER ARCHIVE
        </span>
        <h1 className="font-serif text-3xl sm:text-4xl text-[#F2EEE7] mb-3">
          Composition Not Found
        </h1>
        <p className="text-xs font-sans text-[#AAA49B] max-w-md mb-8 font-light leading-relaxed">
          The requested fragrance could not be located in our atelier catalog.
        </p>
        <Link
          to="/shop"
          className="inline-flex items-center px-6 py-3.5 bg-transparent border border-[rgba(242,238,231,0.2)] rounded-xl text-xs uppercase font-sans tracking-[0.18em] text-[#F2EEE7] hover:border-[#BFA27A] hover:text-[#BFA27A] transition-all"
        >
          Return to The Collection
        </Link>
      </div>
    );
  }

  if (isInactive) {
    return (
      <div className="bg-[#0D0D0C] text-[#F2EEE7] min-h-[70vh] flex flex-col items-center justify-center text-center p-6">
        <SEO
          title="Composition Currently Unavailable"
          description="This fragrance has been temporarily archived or reserved by the atelier."
          noindex={true}
        />
        <span className="text-[10px] uppercase font-sans tracking-[0.24em] text-[#BFA27A] mb-3 font-medium">
          ATELIER ARCHIVE
        </span>
        <h1 className="font-serif text-3xl sm:text-4xl text-[#F2EEE7] mb-3">
          Composition Currently Unavailable
        </h1>
        <p className="text-xs font-sans text-[#AAA49B] max-w-md mb-8 font-light leading-relaxed">
          This fragrance has been temporarily archived or reserved by the atelier and is not accessible for ordering at this time.
        </p>
        <Link
          to="/shop"
          className="inline-flex items-center px-6 py-3.5 bg-transparent border border-[rgba(242,238,231,0.2)] rounded-xl text-xs uppercase font-sans tracking-[0.18em] text-[#F2EEE7] hover:border-[#BFA27A] hover:text-[#BFA27A] transition-all"
        >
          Return to The Collection
        </Link>
      </div>
    );
  }

  const ogImageUrl = activeImageSrc
    ? activeImageSrc.startsWith("http")
      ? activeImageSrc
      : `https://scente.pk${activeImageSrc.startsWith("/") ? "" : "/"}${activeImageSrc}`
    : "https://scente.pk/og-image.jpg";

  const productKeywords = [
    product?.name,
    resolvedClassification,
    product?.family,
    ...(keyAccords || []),
    "Pakistan luxury perfume",
    "Extrait de Parfum",
    "SCENTÉ fragrance",
    "Cash on Delivery Pakistan"
  ].filter(Boolean).join(", ");

  const productSchemaData = {
    name: product?.name,
    description: cleanedDescription || product?.tagline || product?.subtitle || product?.name,
    image: ogImageUrl,
    price: currentPrice,
    currency: "PKR",
    sku: activeVariant?.sku || `${product?.slug || slug}-${selectedSize}`,
    inStock: !isOutOfStockNow,
    category: product?.family || product?.olfactiveFamily || "Fragrance",
  };

  return (
    <div className="bg-[#0D0D0C] text-[#F2EEE7] min-h-screen">
      <SEO
        title={`${product.name} — ${resolvedClassification} (${selectedSize})`}
        description={`${cleanedDescription ? cleanedDescription.slice(0, 155) : (product.tagline || product.subtitle || product.name)}. Handcrafted in Pakistan with pure perfume oils. Cash on Delivery available.`}
        canonicalUrl={`https://scente.pk/product/${product.slug || slug}`}
        ogImage={ogImageUrl}
        ogType="product"
        productData={productSchemaData}
        keywords={productKeywords}
      />
      {/* 2. BREADCRUMB & BACK NAVIGATION */}
      <div className="layout-container pt-8 sm:pt-10">
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: LUXURY_EASE }}
          className="flex items-center space-x-2 text-[10px] sm:text-[11px] font-sans tracking-[0.2em] uppercase text-[#777169]"
        >
          <Link to="/shop" className="hover:text-[#BFA27A] transition-colors">
            THE COLLECTION
          </Link>
          <span>/</span>
          <span className="text-[#F2EEE7] font-medium">{product.name}</span>
        </motion.div>
      </div>

      {/* 3. PRODUCT HERO (SPLIT EDITORIAL TWO-COLUMN LAYOUT) */}
      <section className="layout-container py-8 sm:py-14">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-start">
          {/* Left Column: Product Photography Gallery */}
          <div className="lg:col-span-7 flex flex-col space-y-4">
            {/* Main Display Image */}
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.985 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.85, ease: LUXURY_EASE }}
              className="relative aspect-[4/5] sm:aspect-[4/3] bg-[#121110] overflow-hidden border border-[rgba(242,238,231,0.04)] shadow-[0_30px_70px_rgba(0,0,0,0.85)] transform-gpu select-none group/main cursor-zoom-in"
              onClick={() => setIsLightboxOpen(true)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setIsLightboxOpen(true);
                }
              }}
              aria-label={`Open full-screen image gallery for ${product.name}`}
            >
              <AnimatePresence mode="wait">
                <motion.img
                  key={activeImageSrc}
                  initial={{ opacity: 0.8 }}
                  animate={{ opacity: 0.98 }}
                  exit={{ opacity: 0.8 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                  src={activeImageSrc}
                  alt={`${product.name} - Photo ${activeImageIndex + 1}`}
                  loading="eager"
                  fetchPriority="high"
                  decoding="sync"
                  className="w-full h-full object-cover select-none transition-transform duration-500 ease-out group-hover/main:scale-[1.02]"
                  onError={(e) => {
                    const fallback = PRODUCTS.find((p) => p.slug === slug || p.id === slug)?.image || PRODUCTS[0].image;
                    if (fallback && e.target.src !== fallback) {
                      e.target.src = fallback;
                    }
                  }}
                />
              </AnimatePresence>

              {/* Badges Overlay */}
              {isOutOfStock && (
                <div className="absolute top-4 sm:top-5 left-4 sm:left-5 z-10 flex items-center space-x-2 pointer-events-none">
                  <span className="text-[9px] uppercase font-sans tracking-[0.2em] bg-amber-950/80 text-amber-300 px-3 py-1.5 font-medium border border-amber-500/30">
                    OUT OF STOCK
                  </span>
                </div>
              )}


              {/* Left Navigation Arrow */}
              {galleryImages.length > 1 && (
                <button
                  type="button"
                  onClick={handlePrevImage}
                  className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-[#0D0D0C]/75 hover:bg-[#0D0D0C]/95 text-[#F2EEE7] hover:text-[#BFA27A] border border-[rgba(242,238,231,0.12)] hover:border-[#BFA27A]/40 backdrop-blur-md flex items-center justify-center transition-all duration-200 shadow-xl cursor-pointer group"
                  aria-label="Previous image"
                  title="Previous image"
                >
                  <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6 transition-transform group-hover:-translate-x-0.5" />
                </button>
              )}

              {/* Right Navigation Arrow */}
              {galleryImages.length > 1 && (
                <button
                  type="button"
                  onClick={handleNextImage}
                  className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-[#0D0D0C]/75 hover:bg-[#0D0D0C]/95 text-[#F2EEE7] hover:text-[#BFA27A] border border-[rgba(242,238,231,0.12)] hover:border-[#BFA27A]/40 backdrop-blur-md flex items-center justify-center transition-all duration-200 shadow-xl cursor-pointer group"
                  aria-label="Next image"
                  title="Next image"
                >
                  <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 transition-transform group-hover:translate-x-0.5" />
                </button>
              )}

              {/* Gallery Image Counter Badge */}
              {galleryImages.length > 1 && (
                <div className="absolute bottom-4 right-4 z-10 bg-[#0D0D0C]/85 backdrop-blur-md px-3 py-1 text-[10px] font-mono text-[#AAA49B] border border-[rgba(242,238,231,0.1)] rounded-sm tracking-wider pointer-events-none">
                  {activeImageIndex + 1} / {galleryImages.length}
                </div>
              )}
            </motion.div>

            {/* Horizontal Thumbnail Row (compact luxury thumbnails) */}
            {galleryImages.length > 1 && (
              <div className="w-full overflow-x-auto pb-1 pt-0.5 scrollbar-none">
                <div className="flex items-center gap-2.5 sm:gap-3">
                  {galleryImages.map((imgUrl, idx) => {
                    const isActive = idx === activeImageIndex;
                    return (
                      <button
                        key={`${imgUrl}-${idx}`}
                        type="button"
                        onClick={() => {
                          if (isActive) {
                            setIsLightboxOpen(true);
                          } else {
                            setActiveImageIndex(idx);
                          }
                        }}
                        className={`relative aspect-[4/5] sm:aspect-[4/3] w-14 sm:w-20 md:w-[84px] shrink-0 rounded-sm overflow-hidden border transition-all duration-200 cursor-pointer bg-[#121110] select-none ${
                          isActive
                            ? "border-[#BFA27A] ring-1 ring-[#BFA27A]/70 shadow-[0_0_12px_rgba(191,162,122,0.25)] opacity-100"
                            : "border-[rgba(242,238,231,0.08)] opacity-50 hover:opacity-85 hover:border-[rgba(242,238,231,0.25)]"
                        }`}
                        aria-label={`View photo ${idx + 1} of ${product.name}`}
                      >
                        <img
                          src={imgUrl}
                          alt={`${product.name} thumbnail ${idx + 1}`}
                          loading="lazy"
                          decoding="async"
                          className="w-full h-full object-cover pointer-events-none"
                          onError={(e) => {
                            e.target.src = "https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&w=200&q=80";
                          }}
                        />
                        {isActive && (
                          <div className="absolute inset-0 bg-[#BFA27A]/10 pointer-events-none" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Editorial Product Information Hierarchy */}
          <div className="lg:col-span-5 flex flex-col justify-between font-sans">
            <div>
              {/* 1. Product Badge (Compact premium eyebrow) */}
              <div className="mb-2">
                <span className="text-[10px] sm:text-[10.5px] uppercase font-sans tracking-[0.24em] text-[#BFA27A] font-medium">
                  {batchBadgeText}
                </span>
              </div>

              {/* 2. Product Title & Product Type */}
              <div className="mb-5">
                <motion.h1
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.08, ease: LUXURY_EASE }}
                  className="font-serif font-normal text-3xl sm:text-4xl lg:text-[42px] text-[#F2EEE7] tracking-wide leading-tight mb-1.5"
                >
                  {product.name}
                </motion.h1>
                <p className="text-xs sm:text-[13px] font-sans text-[#AAA49B] tracking-[0.08em] font-light">
                  {productTypeSubtitle}
                </p>
              </div>

              {/* 3. Main Price & Tax/Shipping Note */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.12, ease: LUXURY_EASE }}
                className="mb-6 pb-5 border-b border-[rgba(242,238,231,0.08)]"
              >
                <div className="font-serif text-2xl sm:text-3xl text-[#F2EEE7] font-normal tracking-wide">
                  {currentFormattedPrice}
                </div>
                <p className="text-[11px] font-sans tracking-[0.08em] text-[#777169] font-light mt-1.5">
                  Inclusive of taxes · Free nationwide shipping
                </p>
              </motion.div>

              {/* 4. Product Description */}
              {cleanedDescription && (
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.16, ease: LUXURY_EASE }}
                  className="text-[13px] sm:text-[13.5px] font-sans text-[#BDB7AC] font-light leading-[1.7] mb-6 max-w-xl"
                >
                  {cleanedDescription}
                </motion.p>
              )}

              {/* 5. Key Accords (Clean luxury presentation, zero emojis, fully dynamic) */}
              {keyAccords.length > 0 && (
                <div className="mb-6 pt-1 pb-5 border-b border-[rgba(242,238,231,0.06)] space-y-1.5">
                  <span className="text-[10.5px] uppercase font-sans tracking-[0.2em] text-[#BFA27A] font-medium block">
                    Key Accords
                  </span>
                  <p className="text-xs sm:text-[13px] font-sans text-[#D5CFC7] font-light tracking-wide leading-relaxed">
                    {keyAccords.join(" · ")}
                  </p>
                </div>
              )}

              {/* 6 & 7. Bottle Size Selection & Selected Variant Information */}
              <div className="mb-6 space-y-2.5">
                <span className="block text-[10.5px] font-sans uppercase tracking-[0.18em] text-[#8E887E] font-medium">
                  SELECT BOTTLE SIZE
                </span>

                {/* Selectable Variant Buttons */}
                <div className="flex flex-wrap items-center gap-2.5">
                  {variants.map((v) => {
                    const isSelected = selectedSize === v.size;
                    const isSoldOut = v.isOutOfStock || (v.stockQuantity !== undefined && v.stockQuantity <= 0);
                    return (
                      <button
                        key={v.id || v.size}
                        type="button"
                        disabled={isSoldOut}
                        onClick={() => setSelectedSize(v.size)}
                        className={`px-5 py-2.5 rounded-lg font-sans text-xs uppercase tracking-[0.14em] transition-all duration-200 cursor-pointer border ${
                          isSelected
                            ? "bg-[#1F1D19] border-[#BFA27A] text-[#F2EEE7] font-medium shadow-[0_0_15px_rgba(191,162,122,0.15)] ring-1 ring-[#BFA27A]/40"
                            : "bg-[#121110] border-[rgba(242,238,231,0.1)] text-[#AAA49B] hover:border-[rgba(242,238,231,0.25)] hover:text-[#F2EEE7]"
                        } ${isSoldOut ? "opacity-40 cursor-not-allowed line-through" : ""}`}
                      >
                        {v.size}
                      </button>
                    );
                  })}
                </div>

                {/* Single clean supporting line for selected variant volume */}
                <p className="text-[11px] font-sans text-[#777169] tracking-wider font-light pt-0.5">
                  {selectedVariantVolume}
                </p>
              </div>

              {/* 8 & Quantity. Stock Status & Quantity Selector */}
              <div className="flex items-center justify-between mb-6 pb-6 border-b border-[rgba(242,238,231,0.06)]">
                {/* Stock Status */}
                <div className="flex items-center space-x-2 text-xs font-sans">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isOutOfStockNow
                        ? "bg-rose-400"
                        : isLowStock
                        ? "bg-amber-400"
                        : "bg-emerald-400"
                    }`}
                  />
                  <span
                    className={`tracking-[0.14em] uppercase text-[11px] font-medium ${
                      isOutOfStockNow
                        ? "text-rose-400 font-semibold"
                        : isLowStock
                        ? "text-amber-300"
                        : "text-[#BFA27A]"
                    }`}
                  >
                    {isOutOfStockNow
                      ? "SOLD OUT"
                      : isLowStock
                      ? "Only a few left"
                      : "In Stock"}
                  </span>
                </div>

                {/* Quantity Counter */}
                {!isOutOfStockNow && (
                  <div className="flex items-center border border-[rgba(242,238,231,0.12)] bg-[#121110] rounded-lg p-1">
                    <button
                      type="button"
                      onClick={handleDecreaseQuantity}
                      disabled={quantity <= 1}
                      className="w-7 h-7 rounded bg-[#1C1B18] hover:bg-[#252320] text-[#F2EEE7] hover:text-[#BFA27A] flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                      aria-label="Decrease quantity"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-9 text-center font-serif text-sm text-[#F2EEE7] font-medium select-none">
                      {quantity}
                    </span>
                    <button
                      type="button"
                      onClick={handleIncreaseQuantity}
                      disabled={quantity >= maxStock}
                      className="w-7 h-7 rounded bg-[#1C1B18] hover:bg-[#252320] text-[#F2EEE7] hover:text-[#BFA27A] flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                      aria-label="Increase quantity"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>

              {/* 9 & 10. Checkout Actions: Buy Now & Add to Bag */}
              <div className="space-y-3 mb-7">
                {isOutOfStockNow ? (
                  <div className="w-full bg-[#161513] text-[#AAA49B] border border-rose-500/30 rounded-lg py-4 px-4 text-xs uppercase font-sans tracking-[0.2em] text-center select-none font-semibold flex items-center justify-center space-x-2 shadow-inner">
                    <span className="w-2 h-2 rounded-full bg-rose-400 shrink-0" />
                    <span className="text-rose-300">SOLD OUT</span>
                  </div>
                ) : (
                  <>
                    {/* 1. BUY NOW (Primary CTA — Direct to Checkout) */}
                    <button
                      type="button"
                      onClick={handleBuyNow}
                      className="w-full bg-[#F2EEE7] hover:bg-[#BFA27A] text-[#0D0D0C] rounded-lg py-3.5 px-6 text-xs uppercase font-sans tracking-[0.2em] font-medium transition-all duration-200 flex items-center justify-center cursor-pointer shadow-md"
                    >
                      <span>BUY NOW</span>
                    </button>

                    {/* 2. ADD TO BAG (Secondary Action) */}
                    <button
                      type="button"
                      onClick={handleAddToCart}
                      className="w-full bg-transparent hover:bg-white/[0.04] text-[#F2EEE7] hover:text-[#BFA27A] border border-[rgba(242,238,231,0.2)] hover:border-[#BFA27A] rounded-lg py-3.5 px-6 text-xs uppercase font-sans tracking-[0.2em] font-medium transition-all duration-200 flex items-center justify-center space-x-2 cursor-pointer"
                    >
                      {added ? (
                        <>
                          <Check className="w-4 h-4 text-[#BFA27A]" />
                          <span className="text-[#BFA27A]">ADDED TO BAG</span>
                        </>
                      ) : (
                        <span>ADD TO BAG</span>
                      )}
                    </button>
                  </>
                )}
              </div>

              {/* 11. Trust / Delivery Information */}
              <div className="pt-6 border-t border-[rgba(242,238,231,0.06)] grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px] font-sans text-[#8E887E] tracking-wide font-light">
                <div className="flex items-center gap-2">
                  <Shield className="w-3.5 h-3.5 text-[#BFA27A] shrink-0" />
                  <span>100% Authentic</span>
                </div>
                <div className="flex items-center gap-2">
                  <Truck className="w-3.5 h-3.5 text-[#BFA27A] shrink-0" />
                  <span>Express Delivery · 2–4 Days</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-[#BFA27A] shrink-0" />
                  <span>Cash on Delivery Available</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. OLFACTIVE PYRAMID SECTION */}
      {product.notes && (
        <section className="py-20 sm:py-28 bg-[#121110] border-t border-b border-[rgba(242,238,231,0.06)]">
          <div className="layout-container">
            <SectionHeading
              eyebrow="OLFACTIVE ARCHITECTURE"
              title="The Olfactive Pyramid"
              subtitle="Every layer of the composition is calibrated to unfold over twelve continuous hours on warm skin."
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
              {/* Top Notes */}
              <ScrollReveal delay={0.08} className="p-8 bg-[#0D0D0C] border border-[rgba(242,238,231,0.04)] space-y-3 transform-gpu">
                <span className="text-[9.5px] uppercase font-sans tracking-[0.24em] text-[#BFA27A] block font-medium">
                  TOP ACCORD (0–30 MIN)
                </span>
                <h3 className="font-serif text-2xl text-[#F2EEE7] font-normal">
                  The Opening Aura
                </h3>
                <p className="text-xs sm:text-sm font-sans text-[#AAA49B] font-light leading-relaxed">
                  {product.notes.top && Array.isArray(product.notes.top) ? product.notes.top.join(" · ") : "Botanical Essences"}
                </p>
              </ScrollReveal>

              {/* Heart Notes */}
              <ScrollReveal delay={0.16} className="p-8 bg-[#0D0D0C] border border-[rgba(242,238,231,0.04)] space-y-3 transform-gpu">
                <span className="text-[9.5px] uppercase font-sans tracking-[0.24em] text-[#BFA27A] block font-medium">
                  HEART ACCORD (1–6 HOURS)
                </span>
                <h3 className="font-serif text-2xl text-[#F2EEE7] font-normal">
                  The Persistent Core
                </h3>
                <p className="text-xs sm:text-sm font-sans text-[#AAA49B] font-light leading-relaxed">
                  {product.notes.heart && Array.isArray(product.notes.heart) ? product.notes.heart.join(" · ") : "Floral & Leather Resins"}
                </p>
              </ScrollReveal>

              {/* Base Notes */}
              <ScrollReveal delay={0.24} className="p-8 bg-[#0D0D0C] border border-[rgba(242,238,231,0.04)] space-y-3 transform-gpu">
                <span className="text-[9.5px] uppercase font-sans tracking-[0.24em] text-[#BFA27A] block font-medium">
                  BASE ACCORD (6–14+ HOURS)
                </span>
                <h3 className="font-serif text-2xl text-[#F2EEE7] font-normal">
                  The Enduring Trace
                </h3>
                <p className="text-xs sm:text-sm font-sans text-[#AAA49B] font-light leading-relaxed">
                  {product.notes.base && Array.isArray(product.notes.base) ? product.notes.base.join(" · ") : "Woods & Amber Resins"}
                </p>
              </ScrollReveal>
            </div>
          </div>
        </section>
      )}



      {/* 6. ATELIER SPECIFICATIONS */}
      <section className="py-14 sm:py-20 bg-[#121110]/60 border-t border-b border-[rgba(242,238,231,0.06)]">
        <ScrollReveal className="layout-container max-w-5xl">
          <span className="text-[10px] sm:text-[11px] uppercase font-sans tracking-[0.24em] text-[#BFA27A] mb-8 sm:mb-10 block font-medium">
            ATELIER SPECIFICATIONS
          </span>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 lg:gap-x-16 gap-y-7 sm:gap-y-9 font-sans">
            {/* Concentration */}
            <div className="space-y-1.5 pb-5 border-b border-[rgba(242,238,231,0.06)]">
              <span className="text-[10px] uppercase tracking-[0.18em] text-[#777169] font-medium block">
                CONCENTRATION
              </span>
              <p className="text-sm sm:text-base text-[#F2EEE7] font-serif tracking-wide leading-snug">
                {resolvedClassification}
              </p>
            </div>

            {/* Volume */}
            <div className="space-y-1.5 pb-5 border-b border-[rgba(242,238,231,0.06)]">
              <span className="text-[10px] uppercase tracking-[0.18em] text-[#777169] font-medium block">
                VOLUME
              </span>
              <p className="text-sm sm:text-base text-[#F2EEE7] font-serif tracking-wide leading-snug">
                {selectedVariantVolume}
              </p>
            </div>

            {/* Key Notes */}
            <div className="space-y-1.5 pb-5 border-b border-[rgba(242,238,231,0.06)]">
              <span className="text-[10px] uppercase tracking-[0.18em] text-[#777169] font-medium block">
                KEY NOTES
              </span>
              <p className="text-sm sm:text-base text-[#F2EEE7] font-serif tracking-wide leading-relaxed">
                {keyNotesDisplay}
              </p>
            </div>

            {/* Delivery */}
            <div className="space-y-1.5 pb-5 border-b border-[rgba(242,238,231,0.06)]">
              <span className="text-[10px] uppercase tracking-[0.18em] text-[#777169] font-medium block">
                DELIVERY
              </span>
              <p className="text-sm sm:text-base text-[#F2EEE7] font-serif tracking-wide leading-snug">
                Express Nationwide · Cash on Delivery Available
              </p>
            </div>
          </div>
        </ScrollReveal>
      </section>

      {/* 7. YOU MAY ALSO LIKE (RELATED COMPOSITIONS) */}
      {relatedProducts.length > 0 && (
        <section className="py-20 sm:py-28 layout-container">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-14 pb-6 border-b border-[rgba(242,238,231,0.06)]">
            <SectionHeading
              eyebrow="CURATED HARMONY"
              title="You May Also Like"
              subtitle="Complementary compositions from our atelier collection."
              className="mb-0"
            />
            <ScrollReveal delay={0.2} className="mt-4 sm:mt-0">
              <Button to="/shop" variant="editorial">
                Explore Full Archive
              </Button>
            </ScrollReveal>
          </div>

          <div className="scente-product-grid">
            {relatedProducts.map((p, idx) => (
              <ProductCard key={p.id} product={p} index={idx} compact={true} />
            ))}
          </div>
        </section>
      )}

      {/* 8. FULL-SCREEN LUXURY RESPONSIVE IMAGE LIGHTBOX */}
      <ProductLightbox
        isOpen={isLightboxOpen}
        images={galleryImages}
        initialIndex={activeImageIndex}
        productName={product?.name || "SCENTÉ Fragrance"}
        onClose={() => setIsLightboxOpen(false)}
      />
    </div>
  );
}

/**
 * Editorial Loading Skeleton for SCENTÉ Product Details Page
 * Preserves the exact dark-atelier geometry to prevent layout shifts or flashing
 */
function ProductDetailsSkeleton() {
  return (
    <div className="bg-[#0D0D0C] text-[#F2EEE7] min-h-screen">
      {/* 1. EDITORIAL BREADCRUMB SKELETON */}
      <div className="border-b border-[rgba(242,238,231,0.06)] bg-[#0D0D0C]/80 backdrop-blur-md sticky top-16 sm:top-20 z-20">
        <div className="layout-container py-3 sm:py-4 flex items-center space-x-2">
          <div className="h-3 w-12 bg-[#181714] rounded animate-pulse" />
          <span className="text-[#777169]">/</span>
          <div className="h-3 w-20 bg-[#181714] rounded animate-pulse" />
          <span className="text-[#777169]">/</span>
          <div className="h-3 w-32 bg-[#22201C] rounded animate-pulse" />
        </div>
      </div>

      {/* 2. MAIN HERO SECTION SKELETON */}
      <section className="pt-8 sm:pt-16 pb-16 sm:pb-24">
        <div className="layout-container">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
            {/* Left Column: Image Canvas Skeleton */}
            <div className="lg:col-span-7">
              <div className="relative aspect-[4/5] bg-[#121110] border border-[rgba(242,238,231,0.06)] overflow-hidden shadow-2xl animate-pulse flex items-center justify-center">
                <div className="w-10 h-10 rounded-full border-2 border-[#BFA27A]/20 border-t-[#BFA27A] animate-spin" />
              </div>
            </div>

            {/* Right Column: Product Dossier Skeleton */}
            <div className="lg:col-span-5 space-y-6">
              {/* Key Notes & Batch Skeleton */}
              <div className="h-3.5 w-44 bg-[#181714] rounded animate-pulse" />

              {/* Product Title Skeleton */}
              <div className="space-y-2.5">
                <div className="h-10 sm:h-12 w-3/4 bg-[#1C1A17] rounded animate-pulse" />
                <div className="h-10 sm:h-12 w-1/2 bg-[#1C1A17] rounded animate-pulse" />
              </div>

              {/* Price & Vat Note Skeleton */}
              <div className="flex items-baseline gap-x-4 pb-6 border-b border-[rgba(242,238,231,0.06)]">
                <div className="h-8 w-36 bg-[#25221D] rounded animate-pulse" />
                <div className="h-3 w-48 bg-[#181714] rounded animate-pulse" />
              </div>

              {/* Description Skeleton */}
              <div className="space-y-2.5">
                <div className="h-3.5 w-full bg-[#181714] rounded animate-pulse" />
                <div className="h-3.5 w-5/6 bg-[#181714] rounded animate-pulse" />
                <div className="h-3.5 w-4/6 bg-[#181714] rounded animate-pulse" />
              </div>

              {/* Size Selector Skeletons */}
              <div className="space-y-3 pt-3">
                <div className="h-3 w-28 bg-[#181714] rounded animate-pulse" />
                <div className="grid grid-cols-2 gap-3">
                  <div className="h-20 bg-[#141311] border border-[rgba(242,238,231,0.06)] rounded-xl animate-pulse" />
                  <div className="h-20 bg-[#141311] border border-[rgba(242,238,231,0.06)] rounded-xl animate-pulse" />
                </div>
              </div>

              {/* Actions Skeletons */}
              <div className="space-y-3 pt-2">
                <div className="h-14 w-full bg-[#2A2824] rounded-xl animate-pulse" />
                <div className="h-14 w-full bg-[#141311] border border-[rgba(242,238,231,0.08)] rounded-xl animate-pulse" />
              </div>

              {/* Trust Badges Skeleton */}
              <div className="grid grid-cols-2 gap-4 pt-6 border-t border-[rgba(242,238,231,0.06)]">
                <div className="h-4 w-32 bg-[#181714] rounded animate-pulse" />
                <div className="h-4 w-32 bg-[#181714] rounded animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
