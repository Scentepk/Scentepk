import { Check, Plus } from "lucide-react";
import { motion } from "framer-motion";
import { getOptimizedImageUrl } from "../../lib/images";

/**
 * CustomBuilderOptionCard
 * Premium selectable option card representing a single choice in the perfume builder.
 */
export default function CustomBuilderOptionCard({
  option,
  isSelected,
  onToggle,
  disabled = false,
  currency = "PKR",
}) {
  const isAdjustmentPositive = Number(option.price_adjustment || 0) > 0;
  const formattedAdjustment = isAdjustmentPositive
    ? `+ ${currency} ${Number(option.price_adjustment).toLocaleString("en-PK")}`
    : null;

  const optimizedImage = option.image_url
    ? getOptimizedImageUrl(option.image_url, { width: 400, quality: 80 })
    : null;

  const handleKeyDown = (e) => {
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      if (!disabled || isSelected) {
        onToggle(option);
      }
    }
  };

  return (
    <motion.div
      role="button"
      tabIndex={disabled && !isSelected ? -1 : 0}
      aria-pressed={isSelected}
      aria-disabled={disabled && !isSelected}
      onClick={() => {
        if (!disabled || isSelected) {
          onToggle(option);
        }
      }}
      onKeyDown={handleKeyDown}
      whileHover={!disabled || isSelected ? { y: -2 } : {}}
      whileTap={!disabled || isSelected ? { scale: 0.99 } : {}}
      className={`group relative flex flex-col justify-between p-4 sm:p-5 rounded-sm border transition-all duration-300 text-left select-none outline-none focus-visible:ring-1 focus-visible:ring-[#BFA27A] cursor-pointer ${
        isSelected
          ? "bg-[#181714] border-[#BFA27A] shadow-[0_4px_24px_rgba(191,162,122,0.12)]"
          : disabled
          ? "bg-[#0D0D0C]/40 border-[rgba(242,238,231,0.04)] opacity-50 cursor-not-allowed"
          : "bg-[#121110] border-[rgba(242,238,231,0.08)] hover:border-[rgba(242,238,231,0.22)] hover:bg-[#161513]"
      }`}
    >
      {/* Top Header: Visual thumbnail (if present) & Selection Checkmark */}
      <div className={`flex items-start ${optimizedImage ? "justify-between" : "justify-end"} gap-3 mb-3`}>
        {/* Visual thumbnail if provided */}
        {optimizedImage && (
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-sm overflow-hidden bg-[#0D0D0C] border border-[rgba(242,238,231,0.08)] shrink-0">
            <img
              src={optimizedImage}
              alt=""
              aria-hidden="true"
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          </div>
        )}

        {/* Selection Indicator Pill */}
        <div
          className={`w-6 h-6 rounded-full flex items-center justify-center transition-all duration-200 shrink-0 ${
            isSelected
              ? "bg-[#BFA27A] text-[#0D0D0C]"
              : "border border-[rgba(242,238,231,0.2)] text-transparent group-hover:border-[#BFA27A]/50"
          }`}
        >
          {isSelected ? (
            <Check className="w-3.5 h-3.5 stroke-[2.5]" />
          ) : (
            <Plus className="w-3 h-3 text-[#AAA49B] opacity-0 group-hover:opacity-100 transition-opacity" />
          )}
        </div>
      </div>

      {/* Center Details: Category, Name, Description */}
      <div className="space-y-1.5 grow">
        {option.category && (
          <span className="text-[9px] uppercase tracking-[0.2em] text-[#BFA27A] font-medium block">
            {option.category}
          </span>
        )}

        <h3 className="font-serif text-lg sm:text-xl text-[#F2EEE7] font-normal leading-snug">
          {option.name}
        </h3>

        {option.description && (
          <p className="text-xs text-[#AAA49B] font-light leading-relaxed line-clamp-2">
            {option.description}
          </p>
        )}
      </div>

      {/* Bottom Footer: Price Adjustment */}
      <div className="pt-3 mt-2 border-t border-[rgba(242,238,231,0.06)] flex items-center justify-between">
        {formattedAdjustment ? (
          <span className="font-serif text-xs sm:text-sm text-[#BFA27A] font-medium">
            {formattedAdjustment}
          </span>
        ) : (
          <span className="text-[10px] uppercase font-sans tracking-wider text-[#777169]">
            Included
          </span>
        )}

        {isSelected && (
          <span className="text-[9.5px] uppercase font-mono tracking-wider text-[#BFA27A]">
            Selected
          </span>
        )}
      </div>
    </motion.div>
  );
}
