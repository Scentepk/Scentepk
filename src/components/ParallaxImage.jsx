import React, { useRef, useState, useEffect } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

/**
 * ParallaxImage — Subtle GPU-accelerated scroll motion for editorial photography.
 * Range is kept strictly subtle (-12px to +12px) to feel editorial, not bouncy.
 * Automatically disables motion on mobile devices (<768px) and when prefers-reduced-motion is active.
 */
export default function ParallaxImage({
  src,
  alt = "SCENTE Haute Parfumerie",
  className = "",
  imgClassName = "",
  aspectRatio = "aspect-[4/5]",
  offsetRange = [-14, 14],
  loading = "lazy",
  children,
}) {
  const containerRef = useRef(null);
  const [canParallax, setCanParallax] = useState(false);

  useEffect(() => {
    // Check reduced motion preference and device width
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isDesktop = window.innerWidth >= 768;
    setCanParallax(!prefersReducedMotion && isDesktop);

    const handleResize = () => {
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      setCanParallax(!reduced && window.innerWidth >= 768);
    };

    window.addEventListener("resize", handleResize, { passive: true });
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"],
  });

  const yTransform = useTransform(scrollYProgress, [0, 1], offsetRange);

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden ${aspectRatio} ${className}`}
    >
      <motion.div
        style={{ y: canParallax ? yTransform : 0 }}
        className="w-full h-full scale-[1.07] will-change-transform"
      >
        <img
          src={src}
          alt={alt}
          loading={loading}
          className={`w-full h-full object-cover object-center ${imgClassName}`}
        />
      </motion.div>
      {children}
    </div>
  );
}
