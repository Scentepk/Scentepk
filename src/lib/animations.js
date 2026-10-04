// SCENTE Luxury Animation & Scroll Primitives
// 60 FPS GPU-accelerated motion tokens and Framer Motion variants

export const LUXURY_EASE = [0.16, 1, 0.3, 1]; // Editorial deceleration curve
export const SUBTLE_EASE = [0.22, 1, 0.36, 1]; // Smooth micro-interaction curve
export const ACCELERATED_EASE = [0.4, 0, 0.2, 1];

export const DURATION = {
  instant: 0.2,
  micro: 0.35,
  fast: 0.5,
  standard: 0.7,
  editorial: 0.85,
  monumental: 1.1,
};

export const VIEWPORT_DEFAULT = {
  once: true,
  margin: "-40px",
};

export const VIEWPORT_EARLY = {
  once: true,
  margin: "-20px",
};

// 1. Text & Container Reveal Variants (translateY + opacity)
export const fadeUpVariant = {
  hidden: {
    opacity: 0,
    y: 20,
  },
  visible: (custom = {}) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: custom.duration || DURATION.editorial,
      delay: custom.delay || 0,
      ease: custom.ease || LUXURY_EASE,
    },
  }),
};

export const fadeInVariant = {
  hidden: {
    opacity: 0,
  },
  visible: (custom = {}) => ({
    opacity: 1,
    transition: {
      duration: custom.duration || DURATION.standard,
      delay: custom.delay || 0,
      ease: custom.ease || LUXURY_EASE,
    },
  }),
};

export const scaleInVariant = {
  hidden: {
    opacity: 0,
    scale: 0.98,
    y: 12,
  },
  visible: (custom = {}) => ({
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: custom.duration || DURATION.editorial,
      delay: custom.delay || 0,
      ease: custom.ease || LUXURY_EASE,
    },
  }),
};

// 2. Grouped Choreography Stagger Containers
export const staggerContainerVariant = (staggerChildren = 0.08, delayChildren = 0.05) => ({
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren,
      delayChildren,
    },
  },
});

export const itemStaggerVariant = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: DURATION.standard,
      ease: LUXURY_EASE,
    },
  },
};

// 3. Editorial Section Choreography Helper (Eyebrow -> Heading -> Body -> CTA)
export const sectionChoreography = {
  eyebrow: {
    initial: { opacity: 0, y: 8 },
    whileInView: { opacity: 1, y: 0 },
    viewport: VIEWPORT_DEFAULT,
    transition: { duration: 0.6, delay: 0, ease: LUXURY_EASE },
  },
  heading: {
    initial: { opacity: 0, y: 16 },
    whileInView: { opacity: 1, y: 0 },
    viewport: VIEWPORT_DEFAULT,
    transition: { duration: 0.8, delay: 0.08, ease: LUXURY_EASE },
  },
  body: {
    initial: { opacity: 0, y: 12 },
    whileInView: { opacity: 1, y: 0 },
    viewport: VIEWPORT_DEFAULT,
    transition: { duration: 0.8, delay: 0.16, ease: LUXURY_EASE },
  },
  cta: {
    initial: { opacity: 0, y: 10 },
    whileInView: { opacity: 1, y: 0 },
    viewport: VIEWPORT_DEFAULT,
    transition: { duration: 0.7, delay: 0.24, ease: LUXURY_EASE },
  },
};
