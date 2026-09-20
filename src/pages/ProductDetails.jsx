import React, { useState, useEffect, useRef, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { PRODUCTS } from "../data/products";
import { getProductBySlug, getActiveProducts, normalizeProduct } from "../services/products";
import { useCart } from "../context/CartContext";
import SectionHeading from "../components/SectionHeading";
import ProductCard from "../components/ProductCard";
import Button from "../components/Button";
import ScrollReveal from "../components/ScrollReveal";
import {
  Check,
  Shield,
  Truck,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Minus,
  Plus,
  Droplets,
  Clock,
  Sparkles,
  Compass,
  RotateCcw,
  ShoppingBag,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { LUXURY_EASE } from "../lib/animations";
import ProductLightbox from "../components/ProductLightbox";
import SEO from "../components/SEO";

export default function ProductDetails() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { addToCart, buyNow } = useCart();

  const [added, setAdded] = useState(false);
  const [selectedSize, setSelectedSize] = useState("50ml");
  const [quantity, setQuantity] = useState(1);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [openAccordion, setOpenAccordion] = useState("notes"); // "notes" | "ritual" | "delivery" | null
  const [showStickyBar, setShowStickyBar] = useState(false);

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
    return raw ? normalizeProduct(raw) : null;
  };

  const [product, setProduct] = useState(() => findCachedProduct(slug));
  const [isLoading, setIsLoading] = useState(() => !findCachedProduct(slug));
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const cached = findCachedProduct(slug);

    if (cached) {
      setProduct(cached);
      setIsLoading(false);
      setNotFound(false);
    } else {
      setProduct(null);
      setIsLoading(true);
      setNotFound(false);
    }

    let isCurrentRequest = true;

    getProductBySlug(slug)
      .then(({ data }) => {
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
      isCurrentRequest = false;
    };
  }, [slug]);

  // Reset active image index and quantity when slug changes
  useEffect(() => {
    setActiveImageIndex(0);
    setQuantity(1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [slug]);

  // Scroll listener for sticky mobile action bar
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 600) {
        setShowStickyBar(true);
      } else {
        setShowStickyBar(false);
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const galleryImages =
    product?.images && product.images.length > 0
      ? product.images
      : [product?.image, product?.primary_image, product?.secondary_image].filter(Boolean);

  const activeImageSrc =
    galleryImages[activeImageIndex] ||
    galleryImages[0] ||
    product?.image ||
    product?.primary_image ||
    PRODUCTS[0].image;

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

  useEffect(() => {
    if (variants.length > 0 && !variants.some((v) => v.size === selectedSize)) {
      setSelectedSize(variants[0].size);
    }
  }, [variants, selectedSize]);

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

  const batchBadgeText = `30–35% EXTRAIT DE PARFUM · COLD MACERATED`;

  const productTypeSubtitle = (() => {
    const size = activeVariant?.size || (product?.volume ? product.volume.split("/")[0].trim() : "50ml");
    return `${size} ${resolvedFormulationType}`;
  })();

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

  // Recommendations
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

  const relatedProducts = useMemo(() => {
    if (!product || !catalogProducts || catalogProducts.length === 0) return [];

    const eligible = catalogProducts.filter((p) => {
      const isCurrent = p.slug === product.slug || p.id === product.id;
      const isActive = p.status !== "inactive" && p.is_active !== false && p.isActive !== false;
      return !isCurrent && isActive;
    });

    if (eligible.length === 0) return [];

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

      if (currentFamily && pFamily && currentFamily === pFamily) {
        score += 10;
      } else if (pFamilies.some((f) => currentFamilies.includes(f))) {
        score += 8;
      }

      if (
        product.olfactiveFamily &&
        p.olfactiveFamily &&
        product.olfactiveFamily.toLowerCase() === p.olfactiveFamily.toLowerCase()
      ) {
        score += 5;
      }

      const timestamp = p.created_at ? new Date(p.created_at).getTime() : 0;
      return { product: p, score, timestamp };
    });

    scored.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return b.timestamp - a.timestamp;
    });

    return scored.slice(0, 3).map((item) => item.product);
  }, [product, catalogProducts]);

  if (isLoading || (!product && !notFound)) {
    return <ProductDetailsSkeleton />;
  }

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

  // Performance telemetry data
  const performanceMetrics = [
    {
      label: "CONCENTRATION",
      value: resolvedClassification,
      bar: 95,
      icon: Droplets,
      desc: "30–35% pure botanical perfume oil",
    },
    {
      label: "LONGEVITY",
      value: "14+ Hours",
      bar: 92,
      icon: Clock,
      desc: "Enduring sillage on skin & clothing",
    },
    {
      label: "PROJECTION",
      value: "Commandingly Intimate",
      bar: 86,
      icon: Sparkles,
      desc: "Intriguing aura within conversation distance",
    },
    {
      label: "MATURATION",
      value: "90-Day Cold Macerated",
      bar: 100,
      icon: Compass,
      desc: "Zero water dilution, micro-batch rested",
    },
  ];

  return (
    <div className="bg-[#0D0D0C] text-[#F2EEE7] min-h-screen pb-24 lg:pb-0">
      <SEO
        title={`${product.name} — ${resolvedClassification} (${selectedSize})`}
        description={`${cleanedDescription ? cleanedDescription.slice(0, 155) : (product.tagline || product.subtitle || product.name)}. Handcrafted in Pakistan with pure perfume oils. Cash on Delivery available.`}
        canonicalUrl={`https://scente.pk/product/${product.slug || slug}`}
        ogImage={ogImageUrl}
        ogType="product"
        productData={productSchemaData}
        keywords={productKeywords}
      />

      {/* BREADCRUMB & BACK NAVIGATION */}
      <div className="layout-container pt-6 sm:pt-8">
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
          <span className="text-[#BFA27A]">{product.family ? product.family.toUpperCase() : "ATELIER"}</span>
          <span>/</span>
          <span className="text-[#F2EEE7] font-medium">{product.name}</span>
        </motion.div>
      </div>

      {/* 1. HERO SECTION (SPLIT TWO-COLUMN LUXURY SHOWCASE) */}
      <section className="layout-container py-8 sm:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 xl:gap-18 items-start">
          {/* LEFT: IMAGE GALLERY */}
          <div className="lg:col-span-7 flex flex-col space-y-4">
            {/* Main Image Container */}
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.985 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.85, ease: LUXURY_EASE }}
              className="relative aspect-square sm:aspect-[4/3] lg:aspect-square bg-[#141312] overflow-hidden rounded-3xl border border-white/[0.08] shadow-[0_30px_90px_rgba(0,0,0,0.85)] select-none group/main cursor-zoom-in"
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
              {/* Formulation Badge */}
              <div className="absolute top-4 left-4 z-20 pointer-events-none">
                <span className="text-[9px] sm:text-[9.5px] uppercase font-sans tracking-[0.2em] bg-[#0D0D0C]/85 backdrop-blur-md text-[#BFA27A] px-3.5 py-1.5 rounded-full font-medium border border-[#BFA27A]/30 shadow-lg">
                  {batchBadgeText}
                </span>
              </div>

              {/* Main Image */}
              <AnimatePresence mode="wait">
                <motion.img
                  key={activeImageSrc}
                  initial={{ opacity: 0.8 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0.8 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                  src={activeImageSrc}
                  alt={`${product.name}`}
                  loading="eager"
                  fetchPriority="high"
                  className="w-full h-full object-cover select-none transition-transform duration-700 ease-out group-hover/main:scale-[1.03]"
                  onError={(e) => {
                    const fallback = PRODUCTS.find((p) => p.slug === slug || p.id === slug)?.image || PRODUCTS[0].image;
                    if (fallback && e.target.src !== fallback) {
                      e.target.src = fallback;
                    }
                  }}
                />
              </AnimatePresence>

              {/* Sold Out Overlay */}
              {isOutOfStock && (
                <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px] flex items-center justify-center pointer-events-none z-10">
                  <span className="text-xs uppercase font-sans tracking-[0.25em] bg-black/90 text-rose-300 px-5 py-2.5 rounded-full font-semibold border border-rose-500/40">
                    SOLD OUT
                  </span>
                </div>
              )}

              {/* Left/Right Navigation Arrows */}
              {galleryImages.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={handlePrevImage}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-[#0D0D0C]/80 hover:bg-[#0D0D0C] text-[#F2EEE7] hover:text-[#BFA27A] border border-white/10 backdrop-blur-md flex items-center justify-center transition-all duration-200 shadow-xl cursor-pointer"
                    aria-label="Previous image"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={handleNextImage}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-[#0D0D0C]/80 hover:bg-[#0D0D0C] text-[#F2EEE7] hover:text-[#BFA27A] border border-white/10 backdrop-blur-md flex items-center justify-center transition-all duration-200 shadow-xl cursor-pointer"
                    aria-label="Next image"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}

              {/* Image Counter Badge */}
              {galleryImages.length > 1 && (
                <div className="absolute bottom-4 right-4 z-10 bg-[#0D0D0C]/85 backdrop-blur-md px-3 py-1 text-[10px] font-mono text-[#AAA49B] border border-white/10 rounded-full tracking-wider pointer-events-none">
                  {activeImageIndex + 1} / {galleryImages.length}
                </div>
              )}
            </motion.div>

            {/* Thumbnail Row */}
            {galleryImages.length > 1 && (
              <div className="w-full overflow-x-auto pb-1 pt-1 scrollbar-none">
                <div className="flex items-center gap-3">
                  {galleryImages.map((imgUrl, idx) => {
                    const isActive = idx === activeImageIndex;
                    return (
                      <button
                        key={`${imgUrl}-${idx}`}
                        type="button"
                        onClick={() => setActiveImageIndex(idx)}
                        className={`relative aspect-square w-16 sm:w-20 rounded-2xl overflow-hidden border transition-all duration-300 cursor-pointer bg-[#141312] shrink-0 ${
                          isActive
                            ? "border-[#BFA27A] ring-2 ring-[#BFA27A]/50 shadow-[0_0_15px_rgba(191,162,122,0.3)] scale-[1.03]"
                            : "border-white/10 opacity-60 hover:opacity-100 hover:border-white/30"
                        }`}
                      >
                        <img
                          src={imgUrl}
                          alt=""
                          className="w-full h-full object-cover pointer-events-none"
                        />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT: PRODUCT DOSSIER & ACTIONS */}
          <div className="lg:col-span-5 flex flex-col justify-between font-sans">
            <div>
              {/* Eyebrow */}
              <div className="mb-2">
                <span className="text-[10px] sm:text-[11px] uppercase font-sans tracking-[0.24em] text-[#BFA27A] font-medium block">
                  {product.olfactiveFamily || "HAUTE PARFUMERIE"}
                </span>
              </div>

              {/* Title & Type */}
              <div className="mb-4">
                <h1 className="font-serif text-3xl sm:text-4xl lg:text-[44px] text-[#F2EEE7] tracking-tight leading-[1.15] mb-2 font-normal">
                  {product.name}
                </h1>
                <p className="text-xs sm:text-[13px] text-[#AAA49B] tracking-[0.08em] font-light">
                  {productTypeSubtitle}
                </p>
              </div>

              {/* Price Block */}
              <div className="mb-6 pb-6 border-b border-white/[0.08]">
                <div className="flex items-baseline gap-3">
                  <span className="font-serif text-3xl sm:text-4xl text-[#F2EEE7] font-normal tracking-wide">
                    {currentFormattedPrice}
                  </span>
                  <span className="text-xs text-[#AAA49B] uppercase tracking-wider font-light">
                    / {selectedSize}
                  </span>
                </div>
                <p className="text-[11px] text-[#777169] tracking-wider mt-1.5 font-light">
                  Inclusive of all taxes · Complimentary express shipping across Pakistan
                </p>
              </div>

              {/* Description */}
              {cleanedDescription && (
                <p className="text-sm text-[#C4BEB4] font-light leading-[1.8] mb-6 max-w-xl">
                  {cleanedDescription}
                </p>
              )}

              {/* Bottle Size Selector */}
              <div className="mb-6 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="uppercase tracking-[0.2em] text-[#AAA49B] font-medium text-[10.5px]">
                    BOTTLE SIZE
                  </span>
                  <span className="text-[#BFA27A] text-[11px] font-mono">
                    {selectedVariantVolume}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {variants.map((v) => {
                    const isSelected = selectedSize === v.size;
                    const isSoldOut = v.isOutOfStock || (v.stockQuantity !== undefined && v.stockQuantity <= 0);
                    return (
                      <button
                        key={v.id || v.size}
                        type="button"
                        disabled={isSoldOut}
                        onClick={() => setSelectedSize(v.size)}
                        className={`px-5 py-2.5 rounded-xl font-sans text-xs uppercase tracking-[0.14em] transition-all duration-200 cursor-pointer border ${
                          isSelected
                            ? "bg-[#1E1C18] border-[#BFA27A] text-[#F2EEE7] font-medium shadow-[0_0_15px_rgba(191,162,122,0.2)] ring-1 ring-[#BFA27A]/50"
                            : "bg-[#141312] border-white/10 text-[#AAA49B] hover:border-white/30 hover:text-white"
                        } ${isSoldOut ? "opacity-40 cursor-not-allowed line-through" : ""}`}
                      >
                        <span>{v.size}</span>
                        {v.formattedPrice && (
                          <span className="block text-[10px] text-[#777169] font-mono mt-0.5">
                            {v.formattedPrice}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Stock Status & Quantity Stepper */}
              <div className="flex items-center justify-between py-4 border-y border-white/[0.08] mb-7">
                <div className="flex items-center gap-2 text-xs">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      isOutOfStockNow
                        ? "bg-rose-500"
                        : isLowStock
                        ? "bg-amber-400 animate-pulse"
                        : "bg-emerald-400"
                    }`}
                  />
                  <span className="uppercase tracking-widest text-[11px] font-medium text-[#F2EEE7]">
                    {isOutOfStockNow
                      ? "Sold Out"
                      : isLowStock
                      ? "Only a few bottles remaining"
                      : "In Stock · Ready to Dispatch"}
                  </span>
                </div>

                {!isOutOfStockNow && (
                  <div className="flex items-center bg-[#141312] border border-white/10 rounded-xl p-1">
                    <button
                      type="button"
                      onClick={handleDecreaseQuantity}
                      disabled={quantity <= 1}
                      className="w-8 h-8 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-[#F2EEE7] hover:text-[#BFA27A] flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                      aria-label="Decrease quantity"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-10 text-center font-mono text-sm text-[#F2EEE7] select-none font-medium">
                      {quantity}
                    </span>
                    <button
                      type="button"
                      onClick={handleIncreaseQuantity}
                      disabled={quantity >= maxStock}
                      className="w-8 h-8 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-[#F2EEE7] hover:text-[#BFA27A] flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                      aria-label="Increase quantity"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* Primary & Secondary Action CTAs */}
              <div className="space-y-3 mb-8">
                {isOutOfStockNow ? (
                  <div className="w-full bg-[#161513] text-[#AAA49B] border border-rose-500/30 rounded-xl py-4 px-4 text-xs uppercase font-sans tracking-[0.2em] text-center select-none font-semibold flex items-center justify-center space-x-2">
                    <span className="w-2 h-2 rounded-full bg-rose-400 shrink-0" />
                    <span className="text-rose-300">SOLD OUT — CHECK BACK SOON</span>
                  </div>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={handleBuyNow}
                      className="w-full py-4 px-6 rounded-xl bg-[#BFA27A] hover:bg-[#D4BA94] text-[#0D0D0C] font-semibold text-xs uppercase tracking-[0.2em] transition-all duration-300 shadow-[0_8px_30px_rgba(191,162,122,0.25)] hover:shadow-[0_8px_35px_rgba(191,162,122,0.4)] flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <span>BUY NOW — CASH ON DELIVERY</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleAddToCart}
                      className="w-full py-4 px-6 rounded-xl bg-[#141312] hover:bg-[#1A1916] text-[#F2EEE7] hover:text-[#BFA27A] border border-white/10 hover:border-[#BFA27A]/50 font-medium text-xs uppercase tracking-[0.2em] transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {added ? (
                        <>
                          <Check className="w-4 h-4 text-[#BFA27A]" />
                          <span className="text-[#BFA27A]">ADDED TO YOUR BAG</span>
                        </>
                      ) : (
                        <span>ADD TO BAG</span>
                      )}
                    </button>
                  </>
                )}
              </div>

              {/* Trust Guarantees */}
              <div className="grid grid-cols-3 gap-3 pt-6 border-t border-white/[0.06] text-[11px] text-[#AAA49B]">
                <div className="flex items-center gap-2.5 bg-[#141312] p-3 rounded-xl border border-white/[0.04]">
                  <Shield className="w-4 h-4 text-[#BFA27A] shrink-0" />
                  <span>100% Authentic Extrait</span>
                </div>
                <div className="flex items-center gap-2.5 bg-[#141312] p-3 rounded-xl border border-white/[0.04]">
                  <Truck className="w-4 h-4 text-[#BFA27A] shrink-0" />
                  <span>Express 2–4 Days</span>
                </div>
                <div className="flex items-center gap-2.5 bg-[#141312] p-3 rounded-xl border border-white/[0.04]">
                  <Check className="w-4 h-4 text-[#BFA27A] shrink-0" />
                  <span>Cash on Delivery</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. FRAGRANCE PERFORMANCE & TELEMETRY SECTION (NICHE BRAND GAUGES) */}
      <section className="py-14 sm:py-20 bg-[#121110] border-y border-white/[0.06]">
        <div className="layout-container">
          <div className="max-w-2xl mb-10">
            <span className="text-[10px] uppercase font-sans tracking-[0.26em] text-[#BFA27A] font-medium block mb-2">
              THE FORMULATION STANDARD
            </span>
            <h2 className="font-serif text-2xl sm:text-3xl lg:text-4xl text-[#F2EEE7] font-normal">
              Calibrated for Enduring Presence
            </h2>
            <p className="text-xs sm:text-sm font-sans text-[#AAA49B] font-light mt-2 leading-relaxed">
              Every SCENTÉ composition is matured in dark temperature-regulated cellars with radical pure oil concentrations.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {performanceMetrics.map((metric, idx) => {
              const IconComponent = metric.icon;
              return (
                <ScrollReveal
                  key={metric.label}
                  delay={idx * 0.08}
                  className="p-6 rounded-2xl bg-[#161513] border border-white/[0.06] flex flex-col justify-between space-y-4 hover:border-[#BFA27A]/30 transition-colors"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[10px] uppercase tracking-[0.2em] font-sans text-[#777169] font-medium">
                        {metric.label}
                      </span>
                      <IconComponent className="w-4 h-4 text-[#BFA27A]" />
                    </div>
                    <h3 className="font-serif text-xl sm:text-2xl text-[#F2EEE7] font-normal mb-1">
                      {metric.value}
                    </h3>
                    <p className="text-[11px] font-sans text-[#AAA49B] font-light leading-relaxed">
                      {metric.desc}
                    </p>
                  </div>

                  {/* Progress Gauge */}
                  <div className="space-y-1.5 pt-2">
                    <div className="w-full bg-white/[0.06] h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-[#8E785C] to-[#BFA27A] h-full rounded-full transition-all duration-1000 ease-out"
                        style={{ width: `${metric.bar}%` }}
                      />
                    </div>
                  </div>
                </ScrollReveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* 3. INTERACTIVE ACCORDIONS (COMPOSITION, RITUAL, DELIVERY) */}
      <section className="py-14 sm:py-20">
        <div className="layout-container max-w-4xl">
          <div className="divide-y divide-white/[0.08] border-y border-white/[0.08]">
            {/* Accordion 1: The Olfactive Notes */}
            <div className="py-6">
              <button
                type="button"
                onClick={() => setOpenAccordion(openAccordion === "notes" ? null : "notes")}
                className="w-full flex items-center justify-between text-left group cursor-pointer focus:outline-none"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xs uppercase font-sans tracking-[0.2em] text-[#BFA27A] font-medium">
                    01
                  </span>
                  <h3 className="font-serif text-xl sm:text-2xl text-[#F2EEE7] group-hover:text-[#BFA27A] transition-colors font-normal">
                    The Olfactive Notes & Architecture
                  </h3>
                </div>
                <ChevronDown
                  className={`w-5 h-5 text-[#AAA49B] transition-transform duration-300 ${
                    openAccordion === "notes" ? "rotate-180 text-[#BFA27A]" : ""
                  }`}
                />
              </button>

              <AnimatePresence initial={false}>
                {openAccordion === "notes" && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: LUXURY_EASE }}
                    className="overflow-hidden pt-6"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5 font-sans">
                      {/* Top Notes */}
                      <div className="p-5 rounded-2xl bg-[#141312] border border-white/[0.06] space-y-2">
                        <span className="text-[10px] uppercase tracking-[0.2em] text-[#BFA27A] font-medium block">
                          TOP ACCORD (0–30 MIN)
                        </span>
                        <h4 className="font-serif text-lg text-[#F2EEE7] font-normal">
                          The Opening Aura
                        </h4>
                        <p className="text-xs text-[#AAA49B] font-light leading-relaxed">
                          {product?.notes?.top && Array.isArray(product.notes.top)
                            ? product.notes.top.join(" · ")
                            : "Crisp Botanical Extracts · Luminous Resins"}
                        </p>
                      </div>

                      {/* Heart Notes */}
                      <div className="p-5 rounded-2xl bg-[#141312] border border-white/[0.06] space-y-2">
                        <span className="text-[10px] uppercase tracking-[0.2em] text-[#BFA27A] font-medium block">
                          HEART ACCORD (1–6 HOURS)
                        </span>
                        <h4 className="font-serif text-lg text-[#F2EEE7] font-normal">
                          The Persistent Core
                        </h4>
                        <p className="text-xs text-[#AAA49B] font-light leading-relaxed">
                          {product?.notes?.heart && Array.isArray(product.notes.heart)
                            ? product.notes.heart.join(" · ")
                            : "Floral Accords · Tuscan Leather"}
                        </p>
                      </div>

                      {/* Base Notes */}
                      <div className="p-5 rounded-2xl bg-[#141312] border border-white/[0.06] space-y-2">
                        <span className="text-[10px] uppercase tracking-[0.2em] text-[#BFA27A] font-medium block">
                          BASE ACCORD (6–14+ HOURS)
                        </span>
                        <h4 className="font-serif text-lg text-[#F2EEE7] font-normal">
                          The Enduring Trace
                        </h4>
                        <p className="text-xs text-[#AAA49B] font-light leading-relaxed">
                          {product?.notes?.base && Array.isArray(product.notes.base)
                            ? product.notes.base.join(" · ")
                            : "Smoked Woods · Aged Ambergris · Musks"}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Accordion 2: Application Ritual */}
            <div className="py-6">
              <button
                type="button"
                onClick={() => setOpenAccordion(openAccordion === "ritual" ? null : "ritual")}
                className="w-full flex items-center justify-between text-left group cursor-pointer focus:outline-none"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xs uppercase font-sans tracking-[0.2em] text-[#BFA27A] font-medium">
                    02
                  </span>
                  <h3 className="font-serif text-xl sm:text-2xl text-[#F2EEE7] group-hover:text-[#BFA27A] transition-colors font-normal">
                    The Application Ritual & Longevity
                  </h3>
                </div>
                <ChevronDown
                  className={`w-5 h-5 text-[#AAA49B] transition-transform duration-300 ${
                    openAccordion === "ritual" ? "rotate-180 text-[#BFA27A]" : ""
                  }`}
                />
              </button>

              <AnimatePresence initial={false}>
                {openAccordion === "ritual" && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: LUXURY_EASE }}
                    className="overflow-hidden pt-6 font-sans text-xs sm:text-sm text-[#AAA49B] font-light leading-relaxed space-y-3"
                  >
                    <p>
                      Because SCENTÉ compositions contain 30–35% pure fragrance oil with zero water dilution, standard heavy misting is unnecessary. 2 to 3 sprays on pulse points — the hollow of the neck, inner wrists, and collarbone — are sufficient for an intimate, hypnotic sillage that radiates throughout your day.
                    </p>
                    <p className="text-[#BFA27A] text-xs font-mono">
                      Tip: Do not rub your wrists together after spraying, as friction crushes the delicate top molecular accords and alters the planned drydown sequence.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Accordion 3: Delivery, Returns & COD Guarantee */}
            <div className="py-6">
              <button
                type="button"
                onClick={() => setOpenAccordion(openAccordion === "delivery" ? null : "delivery")}
                className="w-full flex items-center justify-between text-left group cursor-pointer focus:outline-none"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xs uppercase font-sans tracking-[0.2em] text-[#BFA27A] font-medium">
                    03
                  </span>
                  <h3 className="font-serif text-xl sm:text-2xl text-[#F2EEE7] group-hover:text-[#BFA27A] transition-colors font-normal">
                    Nationwide Delivery, COD & Authentic Guarantee
                  </h3>
                </div>
                <ChevronDown
                  className={`w-5 h-5 text-[#AAA49B] transition-transform duration-300 ${
                    openAccordion === "delivery" ? "rotate-180 text-[#BFA27A]" : ""
                  }`}
                />
              </button>

              <AnimatePresence initial={false}>
                {openAccordion === "delivery" && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: LUXURY_EASE }}
                    className="overflow-hidden pt-6 font-sans text-xs sm:text-sm text-[#AAA49B] font-light leading-relaxed space-y-3"
                  >
                    <p>
                      Every flacon is securely packed in temperature-resistant cushioned velvet packaging and dispatched via premium air-courier services (TCS / Leopard / Trax).
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-[#D5CFC7]">
                      <li>Karachi, Lahore & Islamabad: 2–3 business days.</li>
                      <li>Other major cities across Pakistan: 3–4 business days.</li>
                      <li>Cash on Delivery (COD) available with zero additional surcharge.</li>
                      <li>100% money-back guarantee if package arrives damaged.</li>
                    </ul>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </section>

      {/* 4. YOU MAY ALSO LIKE (CURATED COMPOSITIONS WITH SCENTARA CARDS) */}
      {relatedProducts.length > 0 && (
        <section className="py-16 sm:py-24 border-t border-white/[0.06]">
          <div className="layout-container">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-12 pb-6 border-b border-white/[0.06]">
              <div>
                <span className="text-[10px] uppercase font-sans tracking-[0.26em] text-[#BFA27A] font-medium block mb-2">
                  CURATED HARMONY
                </span>
                <h2 className="font-serif text-2xl sm:text-3xl lg:text-4xl text-[#F2EEE7] font-normal">
                  You May Also Like
                </h2>
              </div>
              <Link
                to="/shop"
                className="mt-4 sm:mt-0 text-xs uppercase tracking-wider text-[#BFA27A] hover:text-white transition-colors"
              >
                View Full Collection →
              </Link>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
              {relatedProducts.map((p, idx) => (
                <ProductCard key={p.id || p.slug} product={p} variant="scentara" index={idx} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 5. STICKY MOBILE BOTTOM BAR */}
      <AnimatePresence>
        {showStickyBar && !isOutOfStockNow && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ duration: 0.3, ease: LUXURY_EASE }}
            className="fixed bottom-0 left-0 right-0 z-40 bg-[#121110]/95 backdrop-blur-xl border-t border-white/10 px-4 py-3 sm:py-3.5 lg:hidden flex items-center justify-between gap-3 shadow-[0_-10px_30px_rgba(0,0,0,0.8)] safe-pb"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-10 h-10 xs:w-11 xs:h-11 rounded-lg overflow-hidden bg-black shrink-0 border border-white/10">
                <img src={activeImageSrc} alt="" className="w-full h-full object-cover" />
              </div>
              <div className="min-w-0">
                <h4 className="font-serif text-xs xs:text-sm text-[#F2EEE7] truncate font-medium">
                  {product.name}
                </h4>
                <p className="text-[10.5px] xs:text-[11px] font-mono text-[#BFA27A]">
                  {currentFormattedPrice}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleAddToCart}
                className="py-2.5 px-3.5 xs:px-4 rounded-xl bg-[#BFA27A] hover:bg-[#D4BA94] text-[#0D0D0C] font-semibold text-[10.5px] xs:text-[11px] uppercase tracking-wider transition-colors cursor-pointer"
              >
                {added ? "ADDED" : "ADD TO BAG"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 6. FULL-SCREEN LUXURY RESPONSIVE LIGHTBOX */}
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
 */
function ProductDetailsSkeleton() {
  return (
    <div className="bg-[#0D0D0C] text-[#F2EEE7] min-h-screen">
      <div className="border-b border-white/[0.06] bg-[#0D0D0C]/80 backdrop-blur-md sticky top-16 sm:top-20 z-20">
        <div className="layout-container py-3 sm:py-4 flex items-center space-x-2">
          <div className="h-3 w-12 bg-[#181714] rounded animate-pulse" />
          <span className="text-[#777169]">/</span>
          <div className="h-3 w-20 bg-[#181714] rounded animate-pulse" />
          <span className="text-[#777169]">/</span>
          <div className="h-3 w-32 bg-[#22201C] rounded animate-pulse" />
        </div>
      </div>

      <section className="pt-8 sm:pt-16 pb-16 sm:pb-24">
        <div className="layout-container">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
            <div className="lg:col-span-7">
              <div className="relative aspect-square bg-[#141312] rounded-3xl border border-white/[0.06] overflow-hidden shadow-2xl animate-pulse flex items-center justify-center">
                <div className="w-10 h-10 rounded-full border-2 border-[#BFA27A]/20 border-t-[#BFA27A] animate-spin" />
              </div>
            </div>

            <div className="lg:col-span-5 space-y-6">
              <div className="h-3.5 w-44 bg-[#181714] rounded animate-pulse" />
              <div className="space-y-2.5">
                <div className="h-10 sm:h-12 w-3/4 bg-[#1C1A17] rounded animate-pulse" />
                <div className="h-4 w-1/2 bg-[#1C1A17] rounded animate-pulse" />
              </div>
              <div className="h-8 w-36 bg-[#25221D] rounded animate-pulse" />
              <div className="space-y-2.5">
                <div className="h-3.5 w-full bg-[#181714] rounded animate-pulse" />
                <div className="h-3.5 w-5/6 bg-[#181714] rounded animate-pulse" />
              </div>
              <div className="h-14 w-full bg-[#BFA27A]/20 rounded-xl animate-pulse" />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

