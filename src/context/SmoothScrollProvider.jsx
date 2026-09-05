import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import Lenis from "lenis";

const SmoothScrollContext = createContext({
  lenis: null,
  scrollTo: () => {},
});

export function SmoothScrollProvider({ children }) {
  const [lenisInstance, setLenisInstance] = useState(null);
  const lenisRef = useRef(null);
  const location = useLocation();

  useEffect(() => {
    // 1. Accessibility: Respect prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) {
      return;
    }

    // 2. Initialize Lenis with luxury easing curve
    const lenis = new Lenis({
      duration: 1.15,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // Gentle acceleration with soft deceleration
      orientation: "vertical",
      gestureOrientation: "vertical",
      smoothWheel: true,
      wheelMultiplier: 0.92,
      touchMultiplier: 1.4,
      touchInertiaMultiplier: 1.0,
      infinite: false,
    });

    lenisRef.current = lenis;
    setLenisInstance(lenis);

    // 3. Centralized Request Animation Frame Loop
    let rafId;
    function raf(time) {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    }
    rafId = requestAnimationFrame(raf);

    // 4. Global Anchor Smooth Scroll Handler with Navbar Offset
    const handleAnchorClick = (e) => {
      const target = e.target.closest("a");
      if (!target) return;

      const href = target.getAttribute("href");
      if (href && href.startsWith("#") && href.length > 1) {
        const element = document.querySelector(href);
        if (element) {
          e.preventDefault();
          lenis.scrollTo(element, { offset: -75, duration: 1.2 });
        }
      }
    };

    document.addEventListener("click", handleAnchorClick);

    // Clean up on unmount
    return () => {
      document.removeEventListener("click", handleAnchorClick);
      cancelAnimationFrame(rafId);
      lenis.destroy();
      lenisRef.current = null;
      setLenisInstance(null);
    };
  }, []);

  // 5. Route Change Scroll Restoration / Hash Handler
  useEffect(() => {
    if (!lenisRef.current) {
      window.scrollTo(0, 0);
      return;
    }

    if (location.hash) {
      const el = document.querySelector(location.hash);
      if (el) {
        setTimeout(() => {
          lenisRef.current?.scrollTo(el, { offset: -75, duration: 1.0 });
        }, 80);
        return;
      }
    }

    // Scroll to top immediately on route transition
    lenisRef.current.scrollTo(0, { immediate: true });
    window.scrollTo(0, 0);
  }, [location.pathname, location.hash]);

  const scrollTo = (target, options = {}) => {
    if (lenisRef.current) {
      lenisRef.current.scrollTo(target, { offset: -75, ...options });
    } else {
      if (typeof target === "string") {
        const el = document.querySelector(target);
        el?.scrollIntoView({ behavior: "smooth" });
      } else if (typeof target === "number") {
        window.scrollTo({ top: target, behavior: "smooth" });
      }
    }
  };

  return (
    <SmoothScrollContext.Provider value={{ lenis: lenisInstance, scrollTo }}>
      {children}
    </SmoothScrollContext.Provider>
  );
}

export function useSmoothScroll() {
  return useContext(SmoothScrollContext);
}
