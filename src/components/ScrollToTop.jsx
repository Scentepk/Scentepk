import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUp } from "lucide-react";
import { LUXURY_EASE } from "../lib/animations";

export default function ScrollToTop() {
  const [isVisible, setIsVisible] = useState(false);
  const isVisibleRef = useRef(false);

  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const shouldBeVisible = window.scrollY > 400;
          if (shouldBeVisible !== isVisibleRef.current) {
            isVisibleRef.current = shouldBeVisible;
            setIsVisible(shouldBeVisible);
          }
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.button
          key="scroll-to-top"
          initial={{ opacity: 0, y: 16, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.9 }}
          transition={{ duration: 0.4, ease: LUXURY_EASE }}
          onClick={scrollToTop}
          aria-label="Scroll back to top"
          className="fixed bottom-20 lg:bottom-8 right-4 sm:right-8 z-30 w-9 h-9 sm:w-10 sm:h-10 rounded-full border border-[rgba(242,238,231,0.16)] bg-[#121110]/85 backdrop-blur-md text-[#AAA49B] hover:text-[#BFA27A] hover:border-[#BFA27A] hover:bg-[#181714] flex items-center justify-center transition-all duration-300 shadow-xl cursor-pointer group focus:outline-none"
        >
          <ArrowUp className="w-4 h-4 transform group-hover:-translate-y-0.5 transition-transform duration-300" />
        </motion.button>
      )}
    </AnimatePresence>
  );
}
