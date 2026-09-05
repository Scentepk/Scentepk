import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { LUXURY_EASE } from "../lib/animations";

export default function CustomSelect({
  value,
  onChange,
  options = [],
  placeholder = "Select an option",
  className = "",
  buttonClassName = "",
  menuClassName = "",
  size = "default", // "default" | "sm" | "compact"
  disabled = false,
  error = "",
  align = "left", // "left" | "right"
  ariaLabel,
  name,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Close on click outside & Escape key
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // Normalize options: handles { value, label }, { id, label }, or plain strings
  const normalizedOptions = options.map((opt) => {
    if (typeof opt === "string") return { value: opt, label: opt };
    const val = opt.value !== undefined ? opt.value : opt.id;
    const lab = opt.label !== undefined ? opt.label : opt.name || String(val);
    return { ...opt, value: val, label: lab };
  });

  const selectedOption = normalizedOptions.find(
    (opt) => String(opt.value) === String(value)
  );

  const isCompact = size === "sm" || size === "compact";

  const handleSelect = (optVal) => {
    if (disabled) return;
    if (onChange) {
      onChange(optVal, { target: { value: optVal, name } });
    }
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full bg-[#121110] border rounded-xl font-sans text-left flex items-center justify-between transition-all duration-200 cursor-pointer focus:outline-none ${
          isCompact ? "py-2 px-3 text-xs" : "py-3 px-4 text-xs"
        } ${
          disabled
            ? "opacity-50 cursor-not-allowed pointer-events-none"
            : ""
        } ${
          error
            ? "border-rose-500/80 focus:border-rose-500 shadow-[0_0_0_1px_rgba(244,63,94,0.3)]"
            : isOpen
            ? "border-[#BFA27A] bg-[#181714] shadow-[0_0_0_1px_rgba(191,162,122,0.35)]"
            : "border-[rgba(242,238,231,0.12)] hover:border-[rgba(242,238,231,0.22)] focus:border-[#BFA27A] focus:shadow-[0_0_0_1px_rgba(191,162,122,0.35)] text-[#F2EEE7]"
        } ${buttonClassName}`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={ariaLabel}
      >
        <span className={`truncate mr-2 ${selectedOption ? "text-[#F2EEE7]" : "text-[#777169]"}`}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-[#AAA49B] transition-transform duration-200 shrink-0 ${
            isOpen ? "rotate-180 text-[#BFA27A]" : ""
          }`}
        />
      </button>

      {/* Floating Dropdown Panel */}
      <AnimatePresence>
        {isOpen && !disabled && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.18, ease: LUXURY_EASE }}
            className={`absolute top-full mt-2 bg-[#141312]/95 backdrop-blur-xl border border-[rgba(242,238,231,0.1)] rounded-xl shadow-[0_15px_40px_rgba(0,0,0,0.85)] p-1.5 z-50 max-h-60 overflow-y-auto ${
              align === "right"
                ? "right-0 min-w-full"
                : "left-0 min-w-full"
            } ${menuClassName}`}
            role="listbox"
          >
            {normalizedOptions.map((opt) => {
              const isSelected = String(opt.value) === String(value);
              return (
                <button
                  key={String(opt.value)}
                  type="button"
                  onClick={() => handleSelect(opt.value)}
                  className={`w-full text-left px-3.5 py-2.5 rounded-lg text-xs font-sans flex items-center justify-between transition-colors duration-150 cursor-pointer ${
                    isSelected
                      ? "bg-[#1F1D19] text-[#BFA27A] font-medium"
                      : "text-[#AAA49B] hover:text-[#F2EEE7] hover:bg-[#1A1916]"
                  }`}
                  role="option"
                  aria-selected={isSelected}
                >
                  <span className="truncate pr-2">{opt.label}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-[#BFA27A] shrink-0 ml-2" />}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
