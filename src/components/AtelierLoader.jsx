import React from "react";

/**
 * AtelierLoader — Quiet-luxury branded loading state for lazy-loaded route transitions.
 * Perfectly matches SCENTE dark obsidian (#0D0D0C) and champagne gold (#BFA27A) aesthetic.
 * Fixed min-height ensures zero layout shift during route navigation.
 */
export default function AtelierLoader() {
  return (
    <div
      className="w-full min-h-[70vh] bg-[#0D0D0C] flex flex-col items-center justify-center text-center px-4 select-none"
      role="status"
      aria-live="polite"
      aria-label="Loading atelier composition"
    >
      <div className="relative flex items-center justify-center mb-5">
        {/* Subtle pulsating gold aura */}
        <div className="absolute w-12 h-12 rounded-full bg-[#BFA27A]/10 animate-ping pointer-events-none" />
        
        {/* Atelier Monogram Frame */}
        <div className="w-10 h-10 rounded-full border border-[rgba(191,162,122,0.35)] flex items-center justify-center bg-[#121110] shadow-[0_0_20px_rgba(0,0,0,0.8)]">
          <span className="font-serif text-lg text-[#BFA27A] font-medium tracking-widest pl-0.5">
            S
          </span>
        </div>
      </div>

      {/* Eyebrow Label */}
      <span className="text-[10px] uppercase font-sans tracking-[0.28em] text-[#BFA27A] block font-medium opacity-90 mb-1.5 animate-pulse">
        SCENTE
      </span>

      {/* Subtext */}
      <span className="text-[11px] font-sans tracking-[0.14em] text-[#777169] uppercase font-light">
        Loading...
      </span>
    </div>
  );
}
