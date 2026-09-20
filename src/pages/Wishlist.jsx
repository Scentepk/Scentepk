import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, ShoppingBag, ArrowRight, Trash2 } from "lucide-react";
import { useWishlist } from "../context/WishlistContext";
import { useCart } from "../context/CartContext";
import { PRODUCTS } from "../data/products";
import ProductCard from "../components/ProductCard";
import Button from "../components/Button";
import ScrollReveal from "../components/ScrollReveal";
import SEO from "../components/SEO";
import { LUXURY_EASE } from "../lib/animations";

export default function Wishlist() {
  const { wishlist, clearWishlist, wishlistCount } = useWishlist();
  const { addToCart } = useCart();

  // Match wishlisted IDs with catalog products
  const wishlistProducts = useMemo(() => {
    if (!wishlist || wishlist.length === 0) return [];
    return PRODUCTS.filter((p) => wishlist.includes(p.id) || wishlist.includes(p.slug));
  }, [wishlist]);

  // Handle adding all wishlisted items to cart
  const handleAddAllToCart = () => {
    wishlistProducts.forEach((product) => {
      const activeVariant = Array.isArray(product.variants) && product.variants.length > 0
        ? product.variants[0]
        : null;
      addToCart(product, activeVariant, 1);
    });
  };

  return (
    <div className="bg-[#0D0D0C] text-[#F2EEE7] min-h-screen">
      <SEO
        title="My Wishlist — Saved Compositions"
        description="View your saved SCENTÉ artisanal Extraits de Parfum compositions. Limited batch handcrafted luxury fragrances."
        canonicalUrl="https://scente.pk/wishlist"
      />

      {/* 1. EDITORIAL HEADER */}
      <section className="pt-12 sm:pt-16 md:pt-20 pb-8 sm:pb-12 border-b border-[rgba(242,238,231,0.06)]">
        <div className="layout-container">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div>
              <motion.span
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: LUXURY_EASE }}
                className="block text-[10px] sm:text-[11px] font-sans uppercase tracking-eyebrow text-[#BFA27A] mb-3 font-medium"
              >
                CURATED ARCHIVE
              </motion.span>
              <motion.h1
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.08, ease: LUXURY_EASE }}
                className="font-serif font-light text-fluid-display leading-[1.08] text-[#F2EEE7] tracking-headline"
              >
                My Wishlist
              </motion.h1>
            </div>

            {wishlistProducts.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.16, ease: LUXURY_EASE }}
                className="flex flex-wrap items-center gap-2 sm:gap-3"
              >
                <button
                  type="button"
                  onClick={handleAddAllToCart}
                  className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-[#BFA27A] text-[#0D0D0C] text-xs uppercase tracking-wider font-semibold hover:bg-[#D4BA94] transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-[0_4px_20px_rgba(191,162,122,0.25)] min-h-[42px]"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>Add All to Bag</span>
                </button>
                <button
                  type="button"
                  onClick={clearWishlist}
                  className="px-3.5 py-2.5 rounded-xl border border-white/10 text-xs uppercase tracking-wider text-[#AAA49B] hover:text-[#F2EEE7] hover:border-white/25 transition-colors flex items-center justify-center gap-1.5 cursor-pointer min-h-[42px]"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear All</span>
                </button>
              </motion.div>
            )}
          </div>
        </div>
      </section>

      {/* 2. MAIN WISHLIST CONTENT */}
      <section className="py-8 sm:py-16">
        <div className="layout-container">
          {wishlistProducts.length > 0 ? (
            <div>
              <div className="flex items-center justify-between pb-4 sm:pb-6 mb-6 sm:mb-8 border-b border-white/[0.06]">
                <p className="text-xs font-mono uppercase text-[#AAA49B]">
                  Showing {wishlistProducts.length} {wishlistProducts.length === 1 ? "Composition" : "Compositions"}
                </p>
                <Link
                  to="/shop"
                  className="text-xs uppercase tracking-wider text-[#BFA27A] hover:text-white flex items-center gap-1 transition-colors"
                >
                  <span>Continue Exploring</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>

              <motion.div
                layout
                className="grid grid-cols-2 gap-3.5 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4"
              >
                <AnimatePresence mode="popLayout">
                  {wishlistProducts.map((product, idx) => (
                    <motion.div
                      key={product.id || product.slug}
                      layout
                      initial={{ opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.25 } }}
                      transition={{ duration: 0.4, delay: Math.min(idx * 0.05, 0.2), ease: LUXURY_EASE }}
                      className="h-full flex flex-col"
                    >
                      <ProductCard product={product} variant="scentara" index={idx} />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </motion.div>
            </div>
          ) : (
            /* 3. EMPTY STATE */
            <ScrollReveal className="py-16 sm:py-28 text-center max-w-lg mx-auto bg-[#141312] p-6 sm:p-14 border border-[rgba(242,238,231,0.07)] rounded-3xl">
              <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-white/[0.03] border border-white/[0.08] flex items-center justify-center text-[#BFA27A]">
                <Heart className="w-8 h-8 stroke-[1.2]" />
              </div>
              <span className="text-[10px] uppercase font-sans tracking-[0.28em] text-[#BFA27A] block mb-3 font-medium">
                EMPTY ARCHIVE
              </span>
              <h2 className="font-serif text-2xl sm:text-3xl text-[#F2EEE7] mb-3 font-normal">
                Your wishlist is currently empty.
              </h2>
              <p className="text-xs sm:text-sm font-sans text-[#AAA49B] font-light leading-relaxed mb-8 max-w-sm mx-auto">
                Explore our collection of limited-maceration Extraits de Parfum and save your favorite compositions by clicking the heart icon.
              </p>
              <Button to="/shop" variant="solid">
                Explore The Collection
              </Button>
            </ScrollReveal>
          )}
        </div>
      </section>
    </div>
  );
}
