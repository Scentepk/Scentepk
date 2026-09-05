import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, ShoppingBag, ArrowRight, Search } from "lucide-react";
import Input from "./Input";
import { useCart } from "../context/CartContext";
import { PRODUCTS } from "../data/products";
import { getActiveProducts } from "../services/products";
import { LUXURY_EASE, SUBTLE_EASE } from "../lib/animations";

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const isScrolledRef = useRef(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Live Catalog State (initialized with fallback products, then synced with live database/cache)
  const [catalogProducts, setCatalogProducts] = useState(PRODUCTS);

  // Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const searchContainerRef = useRef(null);

  const location = useLocation();
  const { totalCount } = useCart();

  // Fresh live catalog loader
  const loadLiveCatalog = useCallback(async () => {
    try {
      const { data, error } = await getActiveProducts();
      if (!error && Array.isArray(data) && data.length > 0) {
        setCatalogProducts(data);
      }
    } catch (err) {
      console.warn("Navbar: Could not sync live products catalog:", err);
    }
  }, []);

  // Synchronize live catalog on mount, route changes, window focus, and catalog updates
  useEffect(() => {
    loadLiveCatalog();

    const handleCatalogUpdate = () => {
      loadLiveCatalog();
    };

    const handleStorage = (e) => {
      if (e.key === "scente_admin_products_cache") {
        loadLiveCatalog();
      }
    };

    const handleWindowFocus = () => {
      loadLiveCatalog();
    };

    window.addEventListener("scente_catalog_updated", handleCatalogUpdate);
    window.addEventListener("storage", handleStorage);
    window.addEventListener("focus", handleWindowFocus);

    return () => {
      window.removeEventListener("scente_catalog_updated", handleCatalogUpdate);
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("focus", handleWindowFocus);
    };
  }, [loadLiveCatalog]);

  // Optimized latching scroll listener
  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentScrolled = window.scrollY > 20;
          if (currentScrolled !== isScrolledRef.current) {
            isScrolledRef.current = currentScrolled;
            setIsScrolled(currentScrolled);
          }
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close mobile menu & reset search state on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    setIsFocused(false);
    setSearchQuery("");
  }, [location.pathname]);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [mobileMenuOpen]);

  // Close search dropdown on click outside or Escape key
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setIsFocused(false);
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setIsFocused(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // Filter products dynamically against live catalog
  const searchResults = useMemo(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed) return [];

    const tokens = trimmed.toLowerCase().split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return [];

    return catalogProducts.filter((product) => {
      // Respect visibility: only active/published products for customers
      if (
        product.isActive === false ||
        product.is_active === false ||
        product.status === "inactive"
      ) {
        return false;
      }

      // Collect searchable fields
      const searchFields = [
        product.name,
        product.slug,
        product.subtitle,
        product.tagline,
        product.description,
        product.brand,
        product.olfactiveFamily,
        product.olfactive_family,
        product.family,
        product.gender,
        product.mood,
        product.concentration,
      ];

      if (Array.isArray(product.accords)) {
        searchFields.push(...product.accords);
      } else if (typeof product.accords === "string") {
        searchFields.push(product.accords);
      }

      if (Array.isArray(product.families)) {
        searchFields.push(...product.families);
      }

      if (product.notes) {
        if (typeof product.notes === "object") {
          ["top", "heart", "base"].forEach((level) => {
            const notesList = product.notes[level];
            if (Array.isArray(notesList)) {
              searchFields.push(...notesList);
            } else if (typeof notesList === "string") {
              searchFields.push(notesList);
            }
          });
        } else if (typeof product.notes === "string") {
          searchFields.push(product.notes);
        }
      }

      const searchableText = searchFields
        .filter(Boolean)
        .map((f) => String(f).toLowerCase())
        .join(" ");

      // Tokenized query: every word entered must match
      return tokens.every((token) => searchableText.includes(token));
    });
  }, [searchQuery, catalogProducts]);

  const navLinks = [
    { name: "HOME", path: "/" },
    { name: "SHOP", path: "/shop" },
    { name: "TRACK ORDER", path: "/track" },
  ];

  return (
    <>
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, delay: 0.15, ease: LUXURY_EASE }}
        className={`sticky top-0 z-40 transition-all duration-500 ${isScrolled
          ? "bg-[#0D0D0C]/90 backdrop-blur-md border-b border-[rgba(242,238,231,0.06)] py-3.5 shadow-[0_4px_30px_rgba(0,0,0,0.6)]"
          : "bg-[#0D0D0C] border-b border-[rgba(242,238,231,0.05)] py-4 sm:py-5"
          }`}
      >
        <div className="layout-container flex items-center justify-between">
          {/* Mobile Menu Trigger (Left on Mobile/Tablet) */}
          <div className="flex lg:hidden items-center flex-1 justify-start">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 -ml-2 text-[#F2EEE7] hover:text-[#BFA27A] transition-colors focus:outline-none cursor-pointer"
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5 stroke-[1.5]" />
            </button>
          </div>

          {/* Brand Logo / Wordmark */}
          <div className="flex items-center justify-center lg:justify-start">
            <Link
              to="/"
              className="group flex flex-col items-center lg:items-start tracking-tight focus:outline-none"
            >
              <span className="font-serif text-2xl sm:text-[27px] font-medium tracking-[0.24em] text-[#F2EEE7] group-hover:text-[#FAF8F5] transition-colors duration-300">
                SCENTÉ
              </span>
              <span className="text-[7.5px] uppercase font-sans tracking-[0.35em] text-[#AAA49B] -mt-1 font-light opacity-80">
                Premium Perfumes
              </span>
            </Link>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center space-x-5 xl:space-x-8 ml-auto mr-6 xl:mr-8">
            {navLinks.map((link) => (
              <NavLink
                key={link.name}
                to={link.path}
                end={link.path === "/"}
                className={({ isActive }) =>
                  `relative py-1 text-[11px] lg:text-[11.5px] font-sans uppercase tracking-nav transition-colors duration-300 ${isActive
                    ? "text-[#F2EEE7] font-medium"
                    : "text-[#AAA49B] hover:text-[#BFA27A] font-normal"
                  }`
                }
              >
                {({ isActive }) => (
                  <span className="relative">
                    {link.name}
                    {isActive && (
                      <motion.div
                        layoutId="activeNavIndicatorDark"
                        className="absolute -bottom-1.5 left-0 right-0 h-[1px] bg-[#BFA27A]"
                        transition={{ type: "spring", stiffness: 350, damping: 30 }}
                      />
                    )}
                  </span>
                )}
              </NavLink>
            ))}
          </nav>

          {/* Far Right Actions: BAG (0) followed by SEARCH INPUT */}
          <div className="flex items-center justify-end space-x-4 lg:space-x-6 flex-1 lg:flex-initial">
            {/* 1. BAG */}
            <NavLink
              to="/cart"
              className={({ isActive }) =>
                `group flex items-center space-x-2 py-1 px-1 transition-colors duration-300 focus:outline-none relative ${isActive ? "text-[#F2EEE7]" : "text-[#AAA49B] hover:text-[#F2EEE7]"
                }`
              }
              aria-label={`Shopping Bag (${totalCount} items)`}
            >
              {({ isActive }) => (
                <>
                  <div className="hidden lg:flex items-center space-x-1.5 text-[11px] xl:text-[11.5px] font-sans uppercase tracking-nav">
                    <span className="relative inline-flex">
                      <span className={isActive ? "text-[#F2EEE7] font-medium" : "text-[#AAA49B] group-hover:text-[#F2EEE7]"}>
                        BAG
                      </span>
                      {isActive && (
                        <motion.span
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.2 }}
                          className="absolute -bottom-1.5 inset-x-0 h-[1px] bg-[#BFA27A] block pointer-events-none"
                        />
                      )}
                    </span>
                    <span className={`text-[10px] font-light ${isActive ? "text-[#BFA27A]" : "text-[#777169] group-hover:text-[#BFA27A]"}`}>
                      ({totalCount})
                    </span>
                  </div>
                  <div className="lg:hidden flex items-center relative">
                    <ShoppingBag className={`w-5 h-5 stroke-[1.4] ${isActive ? "text-[#BFA27A]" : "text-[#F2EEE7] group-hover:text-[#BFA27A]"}`} />
                    {totalCount > 0 && (
                      <span className="absolute -top-1 -right-2 text-[9px] font-medium bg-[#BFA27A] text-[#0D0D0C] w-4 h-4 rounded-full flex items-center justify-center">
                        {totalCount}
                      </span>
                    )}
                  </div>
                </>
              )}
            </NavLink>

            {/* 2. INLINE SEARCH INPUT FIELD (POSITIONED IMMEDIATELY AFTER BAG) */}
            <div className="relative hidden lg:block" ref={searchContainerRef}>
              <div className="relative flex items-center group">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setIsFocused(true);
                  }}
                  onFocus={() => {
                    setIsFocused(true);
                    loadLiveCatalog();
                  }}
                  placeholder="Search products..."
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck="false"
                  className="w-44 xl:w-56 2xl:w-64 focus:w-60 xl:focus:w-72 bg-[#141312]/90 hover:bg-[#181715] focus:bg-[#161513] border border-[rgba(242,238,231,0.14)] hover:border-[rgba(242,238,231,0.28)] focus:border-[#BFA27A] focus:shadow-[0_0_0_1px_rgba(191,162,122,0.35)] rounded-full h-9 pl-4 pr-9 text-xs sm:text-[12.5px] font-sans text-[#F2EEE7] placeholder-[#777169] focus:outline-none transition-all duration-300"
                />
                <Search className="w-3.5 h-3.5 text-[#777169] group-focus-within:text-[#BFA27A] absolute right-3.5 pointer-events-none stroke-[1.5] transition-colors duration-200" />
              </div>

              {/* Modern Floating Search Panel */}
              <AnimatePresence>
                {isFocused && searchQuery.trim() !== "" && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.98 }}
                    transition={{ duration: 0.2, ease: LUXURY_EASE }}
                    className="absolute right-0 top-full mt-3 w-96 max-w-[calc(100vw-2.5rem)] bg-[#121110]/95 backdrop-blur-2xl border border-[rgba(242,238,231,0.1)] rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.85)] p-4 sm:p-5 z-50 overflow-hidden"
                  >
                    {searchResults.length === 0 ? (
                      <div className="py-6 text-center space-y-1 font-sans">
                        <p className="text-xs text-[#AAA49B] font-light">No products found</p>
                        <p className="text-[10px] text-[#777169] font-light">Try searching for another product name, note, or olfactive family.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between pb-2 border-b border-[rgba(242,238,231,0.06)]">
                          <span className="text-[9.5px] uppercase font-sans tracking-[0.22em] text-[#BFA27A] font-medium">
                            COMPOSITIONS ({searchResults.length})
                          </span>
                          <span className="text-[9.5px] uppercase font-sans tracking-micro text-[#777169]">
                            SCENTÉ ARCHIVE
                          </span>
                        </div>

                        <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
                          {searchResults.map((product) => {
                            const displayImg = product.image || product.primary_image || (product.images && product.images[0]) || "";
                            const displayFamily = product.olfactiveFamily || product.olfactive_family || "";
                            const displaySubtitle = product.subtitle || "Extrait";
                            const displayPrice = product.formattedPrice || (product.price ? `PKR ${Number(product.price).toLocaleString()}` : "");

                            return (
                              <Link
                                key={product.id || product.slug}
                                to={`/product/${product.slug}`}
                                onClick={() => {
                                  setIsFocused(false);
                                  setSearchQuery("");
                                }}
                                className="flex items-center space-x-3.5 p-2.5 rounded-xl hover:bg-[#1A1917]/80 transition-all duration-200 group cursor-pointer border border-transparent hover:border-[rgba(242,238,231,0.04)]"
                              >
                                <div className="w-10 h-12 rounded-lg overflow-hidden bg-[#0D0D0C] shrink-0 border border-[rgba(242,238,231,0.06)] flex items-center justify-center">
                                  {displayImg ? (
                                    <img
                                      src={displayImg}
                                      alt={product.name}
                                      onError={(e) => {
                                        e.currentTarget.style.display = "none";
                                      }}
                                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-90 group-hover:opacity-100"
                                    />
                                  ) : (
                                    <span className="text-[8px] text-[#777169] font-serif tracking-widest uppercase">SCENTÉ</span>
                                  )}
                                </div>

                                <div className="flex-grow min-w-0 font-sans space-y-0.5">
                                  <h5 className="text-xs font-serif text-[#F2EEE7] group-hover:text-[#BFA27A] truncate transition-colors duration-200 font-medium">
                                    {product.name}
                                  </h5>
                                  <p className="text-[10.5px] text-[#AAA49B] truncate font-light leading-snug">
                                    {displayFamily ? `${displayFamily} • ` : ""}{displaySubtitle}
                                  </p>
                                </div>

                                {displayPrice && (
                                  <span className="text-xs font-sans text-[#F2EEE7] shrink-0 font-medium tracking-tight">
                                    {displayPrice}
                                  </span>
                                )}
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Mobile Drawer Navigation */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-50 bg-[#0D0D0C] flex flex-col justify-between p-5 sm:p-8 lg:hidden overflow-y-auto"
          >
            {/* Top Area: Brand Header, Search Input, and Navigation Links */}
            <div className="w-full flex flex-col shrink-0">
              {/* Top Bar with Brand and Dedicated Close Button */}
              <div className="w-full flex items-center justify-between pb-6 border-b border-[rgba(242,238,231,0.06)]">
                <span className="font-serif text-xl tracking-[0.2em] text-[#F2EEE7]">
                  SCENTÉ
                </span>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 -mr-2 text-[#AAA49B] hover:text-[#BFA27A] transition-colors focus:outline-none cursor-pointer"
                  aria-label="Close menu"
                >
                  <X className="w-6 h-6 stroke-[1.5]" />
                </button>
              </div>

              {/* Mobile Embedded Search Input (Comfortable breathing room near top) */}
              <div className="w-full mt-6 sm:mt-7 mb-2">
                <Input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => loadLiveCatalog()}
                  placeholder="Search products..."
                  icon={Search}
                  iconPosition="right"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck="false"
                />

                <AnimatePresence initial={false}>
                  {searchQuery.trim() !== "" && (
                    <motion.div
                      key="mobile-search-results-panel"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{
                        duration: 0.38,
                        ease: SUBTLE_EASE,
                      }}
                      className="w-full overflow-hidden"
                    >
                      <div className="pt-2.5">
                        <div className="bg-[#141312] border border-[rgba(242,238,231,0.1)] rounded-xl p-2 max-h-64 overflow-y-auto divide-y divide-[rgba(242,238,231,0.06)] shadow-[0_12px_36px_rgba(0,0,0,0.65)]">
                          {searchResults.length === 0 ? (
                            <div className="py-5 text-center space-y-1 font-sans">
                              <p className="text-xs text-[#AAA49B] font-light">No products found</p>
                              <p className="text-[10px] text-[#777169] font-light">Try searching for another note or product.</p>
                            </div>
                          ) : (
                            searchResults.map((product) => {
                              const displayImg = product.image || product.primary_image || (product.images && product.images[0]) || "";
                              const displayFamily = product.olfactiveFamily || product.olfactive_family || "";
                              const displaySubtitle = product.subtitle || "Extrait";
                              const displayPrice = product.formattedPrice || (product.price ? `PKR ${Number(product.price).toLocaleString()}` : "");

                              return (
                                <Link
                                  key={product.id || product.slug}
                                  to={`/product/${product.slug}`}
                                  onClick={() => {
                                    setMobileMenuOpen(false);
                                    setSearchQuery("");
                                  }}
                                  className="flex items-center space-x-3.5 py-3 px-2 rounded-lg hover:bg-[#1A1917] active:bg-[#1F1D19] transition-colors group"
                                >
                                  <div className="w-12 h-14 rounded-lg overflow-hidden bg-[#0D0D0C] shrink-0 border border-[rgba(242,238,231,0.08)] flex items-center justify-center">
                                    {displayImg ? (
                                      <img
                                        src={displayImg}
                                        alt={product.name}
                                        onError={(e) => {
                                          e.currentTarget.style.display = "none";
                                        }}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                      />
                                    ) : (
                                      <span className="text-[9px] text-[#777169] font-serif tracking-widest uppercase">SCENTÉ</span>
                                    )}
                                  </div>
                                  <div className="flex-grow min-w-0 font-sans space-y-0.5">
                                    <h5 className="text-sm font-serif text-[#F2EEE7] group-hover:text-[#BFA27A] truncate transition-colors duration-150 font-medium">
                                      {product.name}
                                    </h5>
                                    <p className="text-[11px] text-[#AAA49B] truncate font-light leading-snug">
                                      {displayFamily ? `${displayFamily} • ` : ""}{displaySubtitle}
                                    </p>
                                  </div>
                                  {displayPrice && (
                                    <span className="text-xs font-sans text-[#F2EEE7] shrink-0 font-medium tracking-tight">
                                      {displayPrice}
                                    </span>
                                  )}
                                </Link>
                              );
                            })
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Editorial Divider separating search and navigation */}
              <div className="w-full border-b border-[rgba(242,238,231,0.06)] mt-4 sm:mt-5 mb-2" />

              {/* Nav links: Full width, identical left start alignment, right-aligned arrows */}
              <nav className="w-full flex flex-col divide-y divide-[rgba(242,238,231,0.04)] pt-2" aria-label="Mobile Navigation">
                {navLinks.map((link, idx) => (
                  <motion.div
                    key={link.name}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      delay: 0.05 * (idx + 1),
                      duration: 0.35,
                      ease: LUXURY_EASE,
                    }}
                    className="w-full"
                  >
                    <Link
                      to={link.path}
                      onClick={() => setMobileMenuOpen(false)}
                      className="group w-full flex items-center justify-between text-xl sm:text-2xl font-serif text-[#F2EEE7] tracking-wide hover:text-[#BFA27A] transition-colors duration-200 py-4 sm:py-4.5"
                    >
                      <span className="tracking-[0.1em] font-normal">{link.name}</span>
                      <ArrowRight className="w-4 h-4 text-[#BFA27A]/50 group-hover:text-[#BFA27A] group-hover:translate-x-1.5 transition-all duration-300 shrink-0 stroke-[1.5]" />
                    </Link>
                  </motion.div>
                ))}
              </nav>
            </div>

            {/* Mobile Footer Info */}
            <div className="w-full border-t border-[rgba(242,238,231,0.06)] pt-5 mt-10 flex flex-col space-y-1.5 text-[10.5px] font-sans tracking-[0.16em] uppercase text-[#777169] shrink-0">
              <div className="flex justify-between text-[#AAA49B]">
                <span>CONCIERGE & ORDERS</span>
                <span>PAKISTAN</span>
              </div>
              <p className="text-[10px] lowercase text-[#777169] tracking-normal font-light">
                concierge@scente-parfums.com
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
