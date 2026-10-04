import React from "react";
import { motion } from "framer-motion";

const ANNOUNCEMENT_MESSAGES = [
  "COMPLIMENTARY EXPRESS DELIVERY ACROSS PAKISTAN",
  "CASH ON DELIVERY AVAILABLE NATIONWIDE",
  "DISCOVER THE SCENTEPK COLLECTION",
  "CRAFTED TO LINGER",
  "DISCOVER YOUR SIGNATURE SCENT",
];

export default function AnnouncementBar() {
  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className="bg-[#090908] border-b border-[rgba(242,238,231,0.06)] py-2 sm:py-2.5 select-none relative z-50 overflow-hidden"
      aria-label="Announcements"
    >
      <div className="w-full overflow-hidden whitespace-nowrap flex items-center">
        <div className="animate-marquee group flex items-center shrink-0">
          {/* Track 1 */}
          <div className="flex items-center shrink-0">
            {ANNOUNCEMENT_MESSAGES.map((message, index) => (
              <span key={`track1-${index}`} className="inline-flex items-center shrink-0">
                <span className="text-[9.5px] sm:text-[10.5px] uppercase font-sans tracking-[0.2em] sm:tracking-[0.24em] font-light text-[#E8E2D8] whitespace-nowrap">
                  {message}
                </span>
                <span
                  className="text-[#BFA27A] px-7 sm:px-11 md:px-14 text-[8px] sm:text-[9px] select-none opacity-80 inline-flex items-center justify-center shrink-0"
                  aria-hidden="true"
                >
                  •
                </span>
              </span>
            ))}
          </div>

          {/* Track 2 (Duplicate for infinite seamless loop) */}
          <div className="flex items-center shrink-0" aria-hidden="true">
            {ANNOUNCEMENT_MESSAGES.map((message, index) => (
              <span key={`track2-${index}`} className="inline-flex items-center shrink-0">
                <span className="text-[9.5px] sm:text-[10.5px] uppercase font-sans tracking-[0.2em] sm:tracking-[0.24em] font-light text-[#E8E2D8] whitespace-nowrap">
                  {message}
                </span>
                <span
                  className="text-[#BFA27A] px-7 sm:px-11 md:px-14 text-[8px] sm:text-[9px] select-none opacity-80 inline-flex items-center justify-center shrink-0"
                  aria-hidden="true"
                >
                  •
                </span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
