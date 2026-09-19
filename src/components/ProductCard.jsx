import React, { memo } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Heart } from "lucide-react";
import { LUXURY_EASE, VIEWPORT_DEFAULT } from "../lib/animations";
import { getOptimizedImageUrl } from "../lib/images";
import { useWishlist } from "../context/WishlistContext";

function ProductCard({ product, index = 0, compact = false, variant = "default" }) {
  const {
    slug,
    name,
    subtitle,
    olfactiveFamily,
    formattedPrice,
    image,
    secondaryImage,
    mood,
  } = product;

  const { isInWishlist, toggleWishlist: contextToggle } = useWishlist();
  const isWishlisted = isInWishlist(product.id || slug);

  const toggleWishlist = (e) => {
    e.preventDefault();
    e.stopPropagation();
    contextToggle(product.id || slug);
  };

  const activeVariants = Array.isArray(product.variants)
    ? product.variants.filter((v) => v.isActive !== false && v.is_active !== false)
    : [];

  const isOutOfStock =
    activeVariants.length > 0
      ? activeVariants.every((v) => Number(v.stockQuantity ?? v.stock_quantity ?? 0) <= 0)
      : (product.status === "out_of_stock" ||
         product.isOutOfStock ||
         Number(product.stockQuantity ?? product.stock_quantity ?? 0) <= 0);

  const primaryImg = product.image || product.primary_image;
  const secImg = product.secondaryImage || product.secondary_image;

  const optimizedPrimaryImg = getOptimizedImageUrl(primaryImg, { width: compact ? 450 : 600, quality: 80 });
  const optimizedSecImg = secImg ? getOptimizedImageUrl(secImg, { width: compact ? 450 : 600, quality: 75 }) : null;

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={VIEWPORT_DEFAULT}
      transition={{
        duration: 0.75,
        delay: Math.min(index * 0.08, 0.32),
        ease: LUXURY_EASE,
      }}
      className="group flex flex-col h-full w-full justify-between transform-gpu"
    >
      {variant === "scentara" ? (
        <Link to={`/product/${slug}`} className="flex flex-col flex-grow focus:outline-none text-center">
          {/* Image Container with Wishlist Heart */}
          <div className="relative aspect-square mb-3.5 bg-[#141312] overflow-hidden rounded-2xl border border-white/[0.07] transition-all duration-500 group-hover:border-[#BFA27A]/40 group-hover:shadow-[0_12px_35px_rgba(0,0,0,0.6)]">
            <img
              src={optimizedPrimaryImg}
              alt={`${name} - ${subtitle}`}
              loading="lazy"
              decoding="async"
              className="w-full h-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-[1.04] opacity-95 group-hover:opacity-100"
            />
            {optimizedSecImg && (
              <img
                src={optimizedSecImg}
                alt={`${name} atmosphere`}
                loading="lazy"
                decoding="async"
                className="absolute inset-0 w-full h-full object-cover object-center opacity-0 group-hover:opacity-100 transition-opacity duration-700 ease-out"
              />
            )}

            {/* Out of Stock Luxury Badge */}
            {isOutOfStock && (
              <div className="absolute top-3 left-3 z-10">
                <span className="text-[8px] uppercase font-sans tracking-[0.2em] bg-[#121110]/95 text-[#AAA49B] border border-white/10 px-2.5 py-0.5 rounded-full font-medium shadow-md">
                  Out of Stock
                </span>
              </div>
            )}

            {/* Wishlist Heart Button */}
            <button
              onClick={toggleWishlist}
              type="button"
              aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
              className="absolute top-3 right-3 z-20 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/95 hover:bg-white text-[#1a1918] shadow-md flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 cursor-pointer"
            >
              <Heart
                className={`w-4 h-4 transition-colors ${
                  isWishlisted ? "fill-[#e11d48] text-[#e11d48]" : "text-[#1a1918]"
                }`}
              />
            </button>
          </div>

          {/* Scentara Centered Meta */}
          <div className="space-y-1 px-2 pb-2">
            <span className="text-[11px] sm:text-xs font-sans text-[#AAA49B] font-light tracking-wide line-clamp-1">
              {olfactiveFamily || subtitle || "Extrait de Parfum"}
            </span>
            <h3 className="font-sans font-bold text-base sm:text-lg text-[#F2EEE7] group-hover:text-[#BFA27A] transition-colors duration-300 tracking-tight line-clamp-1">
              {name}
            </h3>
            <p className="font-sans font-semibold text-sm sm:text-base text-[#F2EEE7] pt-0.5">
              {formattedPrice}
            </p>
          </div>
        </Link>
      ) : (
        <Link to={`/product/${slug}`} className="flex flex-col flex-grow focus:outline-none">
          {/* Product Image Container */}
          <div
            className={`relative ${
              compact ? "aspect-[4/3] mb-3 sm:mb-4" : "aspect-square mb-3 sm:mb-6"
            } bg-[#121110] overflow-hidden border border-[rgba(242,238,231,0.04)] transition-all duration-700 group-hover:border-[rgba(191,162,122,0.3)]`}
          >
            {/* Primary image */}
            <img
              src={optimizedPrimaryImg}
              alt={`${name} - ${subtitle}`}
              loading="lazy"
              decoding="async"
              className="w-full h-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-[1.03] opacity-90 group-hover:opacity-100 will-change-transform"
            />

            {/* Secondary image on hover */}
            {optimizedSecImg && (
              <img
                src={optimizedSecImg}
                alt={`${name} atmosphere`}
                loading="lazy"
                decoding="async"
                className="absolute inset-0 w-full h-full object-cover object-center opacity-0 group-hover:opacity-100 transition-opacity duration-700 ease-out"
              />
            )}

            {/* Out of Stock Luxury Badge */}
            {isOutOfStock && (
              <div className="absolute top-2 right-2 sm:top-3 sm:right-3 z-10">
                <span className="text-[7.5px] sm:text-[8.5px] uppercase font-sans tracking-[0.16em] sm:tracking-[0.2em] bg-[#121110]/95 text-[#AAA49B] border border-[rgba(242,238,231,0.16)] px-2 py-0.5 sm:px-2.5 sm:py-1 font-medium shadow-md backdrop-blur-md">
                  Out of Stock
                </span>
              </div>
            )}

            {/* Subtle dark studio vignette */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#0D0D0C]/70 via-transparent to-black/20 opacity-70 group-hover:opacity-40 transition-opacity duration-500 pointer-events-none" />
          </div>

          {/* Product Meta: Clean Hierarchy with Reserved Vertical Slots */}
          <div
            className={`flex flex-col flex-grow min-w-0 ${
              compact ? "space-y-1 px-2 sm:px-3" : "space-y-1 sm:space-y-1.5 px-1.5 sm:px-4"
            }`}
          >
            <div className="flex items-center justify-between font-sans min-h-[18px] sm:min-h-[22px]">
              <span
                className={`${
                  compact ? "text-[8.5px] sm:text-[9px]" : "text-[8.5px] sm:text-[10px]"
                } uppercase tracking-[0.12em] sm:tracking-[0.18em] text-[#AAA49B] font-light truncate mr-1`}
              >
                {subtitle || "Extrait de Parfum"}
              </span>
              <span
                className={`${
                  compact ? "text-xs sm:text-sm" : "text-[12px] sm:text-base md:text-lg"
                } font-medium tracking-[0.02em] sm:tracking-[0.04em] text-[#F2EEE7] shrink-0`}
              >
                {formattedPrice}
              </span>
            </div>

            <h3
              className={`font-serif ${
                compact ? "text-base sm:text-xl" : "text-[15.5px] sm:text-2xl md:text-[26px] lg:text-[28px]"
              } font-normal leading-snug tracking-[-0.01em] text-[#F2EEE7] group-hover:text-[#BFA27A] transition-colors duration-300 min-h-[38px] sm:min-h-[58px] line-clamp-2`}
            >
              {name}
            </h3>

            {/* Descriptors */}
            <div className="min-h-[15px] sm:min-h-[20px]">
              {mood ? (
                <p
                  className={`${
                    compact ? "text-[8px] sm:text-[8.5px]" : "text-[8px] sm:text-[9.5px]"
                  } uppercase font-sans tracking-[0.12em] sm:tracking-[0.18em] text-[#BFA27A]/90 font-normal truncate`}
                >
                  {mood}
                </p>
              ) : null}
            </div>

            <p
              className={`${
                compact ? "text-[10px] sm:text-[11px]" : "text-[10.5px] sm:text-xs"
              } font-sans text-[#777169] font-light line-clamp-1 min-h-[15px] sm:min-h-[18px]`}
            >
              {olfactiveFamily}
            </p>
          </div>
        </Link>
      )}

      {/* Discover Action (Pinned to Bottom for default variant) */}
      {variant !== "scentara" && (
        <div
          className={`${
            compact ? "mt-2.5 pt-2 px-2 sm:px-3" : "mt-3 sm:mt-5 pt-2.5 sm:pt-3 px-1.5 sm:px-4"
          } border-t border-[rgba(242,238,231,0.06)] flex items-center justify-between font-sans mt-auto min-w-0`}
        >
          <Link
            to={`/product/${slug}`}
            className={`inline-flex items-center shrink-0 ${
              compact ? "text-[8.5px] sm:text-[9.5px]" : "text-[9px] sm:text-[10.5px]"
            } uppercase tracking-[0.12em] sm:tracking-[0.14em] text-[#AAA49B] group-hover:text-[#BFA27A] font-medium transition-colors duration-300`}
          >
            <span>Discover</span>
            <ArrowRight className="w-2.5 h-2.5 sm:w-3 sm:h-3 ml-1 sm:ml-1.5 shrink-0 transition-transform duration-300 ease-out group-hover:translate-x-1.5 stroke-[1.4] text-[#BFA27A]" />
          </Link>
        </div>
      )}
    </motion.article>
  );
}

export default memo(ProductCard);
