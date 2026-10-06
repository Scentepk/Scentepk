import React from "react";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { LUXURY_EASE } from "../../lib/animations";

/**
 * CustomBuilderIntro
 * Elegant introduction / hero section for the bespoke fragrance builder.
 * Completely dynamic: displays admin-configured title, subtitle, and description.
 */
export default function CustomBuilderIntro({
  settings = {},
  groupsCount = 0,
  onBegin,
}) {
  const title = settings.title || "BUILD YOUR SCENTEPK";
  const subtitle = settings.subtitle || "Create a Fragrance That's Yours";
  const description =
    settings.description ||
    "Choose your size, fragrance profile, notes, and intensity to create a scent made around your preferences.";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.65, ease: LUXURY_EASE }}
      className="max-w-3xl mx-auto text-center flex flex-col items-center py-8 sm:py-12 md:py-16 px-4"
    >
      {/* Eyebrow / Subtitle */}
      {subtitle && (
        <span className="text-[10px] sm:text-[11px] uppercase font-mono tracking-[0.28em] text-[#BFA27A] font-semibold block mb-3 sm:mb-4">
          {subtitle}
        </span>
      )}

      {/* Main Title */}
      <h1 className="font-serif font-light text-3xl sm:text-4xl md:text-5xl lg:text-6xl text-[#F2EEE7] tracking-headline leading-[1.1] mb-5 sm:mb-6">
        {title}
      </h1>

      {/* Narrative Description */}
      {description && (
        <p className="text-sm sm:text-base font-sans text-[#AAA49B] font-light leading-relaxed max-w-xl mb-8 sm:mb-10">
          {description}
        </p>
      )}

      {/* Begin CTA */}
      <div className="flex flex-col items-center gap-4">
        <button
          type="button"
          id="builder-begin-btn"
          onClick={onBegin}
          className="inline-flex items-center justify-center px-9 sm:px-11 py-4 sm:py-4.5 rounded-full bg-[#BFA27A] text-[#090908] hover:bg-[#D4BA94] hover:shadow-[0_0_35px_rgba(191,162,122,0.3)] active:scale-[0.99] font-sans text-xs uppercase tracking-[0.18em] font-semibold transition-all duration-300 shadow-xl shadow-black/50 group cursor-pointer focus-visible:ring-2 focus-visible:ring-[#BFA27A] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0D0D0C] outline-none"
        >
          <span>Begin Your Creation</span>
          <ArrowRight className="w-4 h-4 ml-3 transition-transform duration-300 group-hover:translate-x-1.5 stroke-[2] text-[#090908]" />
        </button>

        {groupsCount > 0 && (
          <span className="text-[10px] uppercase font-mono tracking-widest text-[#777169]">
            {groupsCount} Bespoke Step{groupsCount > 1 ? "s" : ""}
          </span>
        )}
      </div>
    </motion.div>
  );
}
