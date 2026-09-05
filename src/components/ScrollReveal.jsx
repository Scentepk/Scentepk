import React from "react";
import { motion } from "framer-motion";
import { LUXURY_EASE, DURATION, VIEWPORT_DEFAULT } from "../lib/animations";

/**
 * ScrollReveal — Standardized viewport reveal wrapper using GPU transform + opacity.
 */
export default function ScrollReveal({
  children,
  className = "",
  delay = 0,
  duration = DURATION.editorial,
  yOffset = 20,
  scaleOffset = 1,
  once = true,
  margin = "-40px",
  as = "div",
  ...props
}) {
  const Component = motion[as] || motion.div;

  return (
    <Component
      initial={{
        opacity: 0,
        y: yOffset,
        scale: scaleOffset,
      }}
      whileInView={{
        opacity: 1,
        y: 0,
        scale: 1,
      }}
      viewport={{ once, margin }}
      transition={{
        duration,
        delay,
        ease: LUXURY_EASE,
      }}
      className={className}
      {...props}
    >
      {children}
    </Component>
  );
}
