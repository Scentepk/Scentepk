import React from "react";
import { motion } from "framer-motion";
import { LUXURY_EASE, VIEWPORT_DEFAULT } from "../lib/animations";

export default function SectionHeading({
  eyebrow,
  title,
  subtitle,
  align = "left", // "left" | "center"
  className = "",
}) {
  const isCenter = align === "center";

  return (
    <div
      className={`mb-12 sm:mb-16 md:mb-20 ${
        isCenter ? "text-center max-w-3xl mx-auto" : "max-w-2xl"
      } ${className}`}
    >
      {eyebrow && (
        <motion.span
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={VIEWPORT_DEFAULT}
          transition={{ duration: 0.6, ease: LUXURY_EASE }}
          className="block text-[10px] sm:text-[11px] font-sans uppercase tracking-eyebrow text-[#BFA27A] mb-3 font-medium"
        >
          {eyebrow}
        </motion.span>
      )}

      {title && (
        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={VIEWPORT_DEFAULT}
          transition={{ duration: 0.8, delay: 0.08, ease: LUXURY_EASE }}
          className="font-serif font-light text-fluid-section leading-[1.08] text-[#F2EEE7] tracking-headline"
        >
          {title}
        </motion.h2>
      )}

      {subtitle && (
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={VIEWPORT_DEFAULT}
          transition={{ duration: 0.8, delay: 0.16, ease: LUXURY_EASE }}
          className={`mt-4 text-sm sm:text-base font-sans text-[#AAA49B] font-light leading-[1.6] ${
            isCenter ? "mx-auto" : ""
          }`}
        >
          {subtitle}
        </motion.p>
      )}
    </div>
  );
}

