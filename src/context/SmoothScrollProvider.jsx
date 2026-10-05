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

    // 2. Initialize Lenis with luxury easing curve & comprehensive modal / nested scroll protection
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
      allowNestedScroll: true,
      prevent: (node) => {
        if (!node || !(node instanceof HTMLElement)) return false;

        // 1. Explicit lenis-prevent attribute anywhere in hierarchy
        if (node.hasAttribute("data-lenis-prevent") || node.closest?.("[data-lenis-prevent]")) {
          return true;
        }

        // 2. Modals, dialogs, drawers, popups, and lightboxes across the entire website
        if (
          node.closest?.('[role="dialog"]') ||
          node.closest?.('[aria-modal="true"]') ||
          node.closest?.(".fixed.inset-0:not(.pointer-events-none)") ||
          node.closest?.("[data-modal]")
        ) {
          return true;
        }

        // 3. Form controls with internal scroll
        if (node.tagName === "TEXTAREA" || node.tagName === "SELECT") {
          return true;
        }

        return false;
      },
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

    // 4. Global Active Modal & Drawer Scroll-Lock Observer
    // Detects any open modal or drawer across the entire app and halts background Lenis/body scroll
    const checkActiveModals = () => {
      const modalSelectors = [
        '[role="dialog"]',
        '[aria-modal="true"]',
        '.fixed.inset-0:not(.pointer-events-none)',
      ];
      const hasActiveModal = modalSelectors.some((sel) => {
        const found = document.querySelector(sel);
        if (!found) return false;
        return found.offsetWidth > 0 || found.offsetHeight > 0 || found.getClientRects().length > 0;
      });

      if (hasActiveModal) {
        if (!document.body.dataset.lenisModalLocked) {
          document.body.dataset.lenisModalLocked = "true";
          document.body.style.overflow = "hidden";
          lenis.stop();
        }
      } else {
        if (document.body.dataset.lenisModalLocked) {
          delete document.body.dataset.lenisModalLocked;
          document.body.style.overflow = "";
          lenis.start();
        }
      }
    };

    const modalObserver = new MutationObserver(() => {
      checkActiveModals();
    });

    modalObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "style", "aria-modal", "role"],
    });

    // 5. Global Anchor Smooth Scroll Handler with Navbar Offset
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
      modalObserver.disconnect();
      if (document.body.dataset.lenisModalLocked) {
        delete document.body.dataset.lenisModalLocked;
        document.body.style.overflow = "";
      }
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
