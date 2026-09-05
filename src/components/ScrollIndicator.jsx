import React from "react";
import { motion } from "framer-motion";
import { ArrowDown } from "lucide-react";
import { useSmoothScroll } from "../context/SmoothScrollProvider";

export default function ScrollIndicator({ targetId = "collection" }) {
  const { scrollTo } = useSmoothScroll();

  const handleScrollClick = () => {
    scrollTo(`#${targetId}`, { offset: -75, duration: 1.2 });
  };

  return (
    <button
      onClick={handleScrollClick}
      className="group flex flex-col items-center space-y-2 text-[#777169] hover:text-[#BFA27A] transition-colors duration-300 focus:outline-none cursor-pointer"
      aria-label={`Scroll to ${targetId}`}
    >
      <span className="text-[9px] uppercase font-sans tracking-[0.3em] font-light">
        SCROLL
      </span>
      <motion.div
        animate={{ y: [0, 5, 0] }}
        transition={{
          repeat: Infinity,
          duration: 2.2,
          ease: "easeInOut",
        }}
      >
        <ArrowDown className="w-3.5 h-3.5 stroke-[1.2]" />
      </motion.div>
    </button>
  );
}
