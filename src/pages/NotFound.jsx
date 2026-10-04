import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Compass, ArrowRight } from "lucide-react";
import SEO from "../components/SEO";

export default function NotFound() {
  return (
    <div className="min-h-[85vh] bg-[#0D0D0C] text-[#F2EEE7] flex items-center justify-center px-4 sm:px-6 py-20 relative overflow-hidden">
      <SEO
        title="404 — The Essence Has Vanished | SCENTE"
        description="The atelier destination or fragrance composition you are searching for does not exist or has returned to the private vault."
        noindex={true}
      />

      {/* Subtle Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#BFA27A]/5 rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="max-w-xl w-full mx-auto text-center space-y-8 relative z-10"
      >
        {/* Eyebrow / Monogram */}
        <div className="flex flex-col items-center space-y-3">
          <div className="w-14 h-14 rounded-full bg-[#121110] border border-[#BFA27A]/30 flex items-center justify-center text-[#BFA27A] shadow-xl">
            <Compass className="w-6 h-6 stroke-[1.2]" />
          </div>
          <span className="text-[10px] sm:text-[11px] uppercase font-sans tracking-[0.3em] text-[#BFA27A] font-medium">
            404 • ARCHIVE RECORD NOT FOUND
          </span>
        </div>

        {/* Headline */}
        <div className="space-y-3">
          <h1 className="font-serif text-2xl xs:text-3xl sm:text-5xl lg:text-6xl font-light text-[#F2EEE7] tracking-tight leading-tight">
            The Essence Has Vanished
          </h1>
          <p className="text-xs sm:text-sm font-sans text-[#AAA49B] font-light max-w-md mx-auto leading-relaxed">
            The fragrance manifest or atelier destination you are searching for is no longer in active circulation or has moved to the private archive.
          </p>
        </div>

        {/* Action CTAs */}
        <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            to="/"
            className="w-full sm:w-auto bg-[#F2EEE7] text-[#0D0D0C] border border-[#F2EEE7] py-3.5 px-8 text-xs uppercase font-sans tracking-[0.2em] hover:bg-[#BFA27A] hover:border-[#BFA27A] hover:text-[#0D0D0C] transition-all duration-200 font-medium whitespace-nowrap shadow-lg min-h-[44px] flex items-center justify-center"
          >
            Return to Storefront
          </Link>
          <Link
            to="/shop"
            className="w-full sm:w-auto bg-transparent text-[#F2EEE7] border border-[rgba(242,238,231,0.2)] py-3.5 px-8 text-xs uppercase font-sans tracking-[0.2em] hover:border-[#BFA27A] hover:text-[#BFA27A] transition-colors font-medium whitespace-nowrap min-h-[44px] flex items-center justify-center space-x-2"
          >
            <span>Explore Collection</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Auxiliary Links */}
        <div className="pt-8 border-t border-[rgba(242,238,231,0.06)] flex flex-wrap items-center justify-center gap-6 text-[11px] font-sans text-[#777169]">
          <Link to="/track" className="hover:text-[#BFA27A] transition-colors">
            Track Your Order
          </Link>
          <span>•</span>
          <Link to="/contact" className="hover:text-[#BFA27A] transition-colors">
            Atelier Concierge
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
