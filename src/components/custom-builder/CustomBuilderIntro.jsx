import React from "react";
import { ArrowRight, Sparkles, ShieldCheck, Compass } from "lucide-react";
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
  const title = settings.title || "BUILD YOUR SCENTÉ";
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
          className="inline-flex items-center justify-center px-8 sm:px-10 py-4 sm:py-4.5 rounded-sm border border-[rgba(242,238,231,0.22)] bg-[#141311] hover:border-[#BFA27A] hover:bg-[#1A1916] hover:text-[#BFA27A] active:scale-[0.99] font-sans text-xs uppercase tracking-[0.2em] text-[#F2EEE7] font-medium transition-all duration-300 shadow-[0_4px_24px_rgba(0,0,0,0.4)] group cursor-pointer focus-visible:ring-1 focus-visible:ring-[#BFA27A] outline-none"
        >
          <span>Begin Your Creation</span>
          <ArrowRight className="w-4 h-4 ml-3 transition-transform duration-300 group-hover:translate-x-1.5 text-[#BFA27A]" />
        </button>

        {groupsCount > 0 && (
          <span className="text-[10px] uppercase font-mono tracking-widest text-[#777169]">
            {groupsCount} Bespoke Step{groupsCount > 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Editorial Trust / Experience Pillars */}
      <div className="mt-12 sm:mt-16 pt-8 sm:pt-10 border-t border-[rgba(242,238,231,0.06)] w-full grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-4 text-center">
        <div className="flex flex-col items-center space-y-1.5">
          <div className="w-8 h-8 rounded-full bg-[#181714] border border-[rgba(242,238,231,0.06)] flex items-center justify-center text-[#BFA27A] mb-1">
            <Sparkles className="w-3.5 h-3.5 stroke-[1.5]" />
          </div>
          <span className="font-serif text-sm text-[#F2EEE7] font-normal">
            Bespoke Extrait
          </span>
          <span className="text-[11px] font-sans text-[#777169] font-light">
            Formulated to your exacting taste
          </span>
        </div>

        <div className="flex flex-col items-center space-y-1.5">
          <div className="w-8 h-8 rounded-full bg-[#181714] border border-[rgba(242,238,231,0.06)] flex items-center justify-center text-[#BFA27A] mb-1">
            <Compass className="w-3.5 h-3.5 stroke-[1.5]" />
          </div>
          <span className="font-serif text-sm text-[#F2EEE7] font-normal">
            Transparent Atelier
          </span>
          <span className="text-[11px] font-sans text-[#777169] font-light">
            Live pricing on every refinement
          </span>
        </div>

        <div className="flex flex-col items-center space-y-1.5">
          <div className="w-8 h-8 rounded-full bg-[#181714] border border-[rgba(242,238,231,0.06)] flex items-center justify-center text-[#BFA27A] mb-1">
            <ShieldCheck className="w-3.5 h-3.5 stroke-[1.5]" />
          </div>
          <span className="font-serif text-sm text-[#F2EEE7] font-normal">
            Master Craftsmanship
          </span>
          <span className="text-[11px] font-sans text-[#777169] font-light">
            Hand-bottled in Karachi, Pakistan
          </span>
        </div>
      </div>
    </motion.div>
  );
}
