import React from "react";
import { Check } from "lucide-react";

/**
 * CustomBuilderProgress
 * Dynamic step progress indicator conforming to active admin groups.
 */
export default function CustomBuilderProgress({
  groups = [],
  currentStepIndex = 0,
  onStepClick,
  selections = {},
}) {
  const totalSteps = groups.length;
  if (totalSteps === 0) return null;

  return (
    <div className="w-full space-y-3 font-sans" aria-label="Creation Progress">
      {/* Top Header: Current Step Counter and Active Group */}
      <div className="flex items-center justify-between text-[11px] uppercase font-mono tracking-wider">
        <div className="flex items-center space-x-1.5">
          <span className="text-[#BFA27A] font-semibold">
            {String(currentStepIndex + 1).padStart(2, "0")}
          </span>
          <span className="text-[#777169]">/</span>
          <span className="text-[#AAA49B]">
            {String(totalSteps).padStart(2, "0")}
          </span>
        </div>
        <span className="text-[#AAA49B] truncate max-w-[200px] sm:max-w-none text-right font-light">
          {groups[currentStepIndex]?.name}
        </span>
      </div>

      {/* Progress Track */}
      <div className="w-full h-1 bg-[#181714] rounded-full overflow-hidden border border-white/[0.04]">
        <div
          className="h-full bg-gradient-to-r from-[#BFA27A] to-[#D4BA94] transition-all duration-500 ease-out"
          style={{ width: `${((currentStepIndex + 1) / totalSteps) * 100}%` }}
        />
      </div>

      {/* Desktop / Tablet Step Tabs */}
      <div className="hidden sm:flex items-center justify-between gap-2 pt-1 overflow-x-auto">
        {groups.map((group, idx) => {
          const isCompleted = idx < currentStepIndex;
          const isCurrent = idx === currentStepIndex;
          const isAccessible = idx <= currentStepIndex;
          const slug = group.slug || group.id;
          const hasSelection = Boolean(
            selections[slug] &&
              (Array.isArray(selections[slug]) ? selections[slug].length > 0 : true)
          );

          return (
            <button
              key={group.id}
              type="button"
              disabled={!isAccessible}
              onClick={() => isAccessible && onStepClick && onStepClick(idx)}
              aria-current={isCurrent ? "step" : undefined}
              className={`flex items-center space-x-2 py-1.5 px-2 rounded-sm text-left transition-all ${
                isAccessible ? "cursor-pointer" : "cursor-not-allowed opacity-35"
              }`}
            >
              {/* Step Number or Check */}
              <span
                className={`w-5 h-5 rounded-full text-[10px] font-mono flex items-center justify-center shrink-0 border transition-colors ${
                  isCurrent
                    ? "bg-[#BFA27A] text-[#0D0D0C] border-[#BFA27A] font-semibold"
                    : isCompleted || hasSelection
                    ? "bg-[#181714] text-[#BFA27A] border-[#BFA27A]/40"
                    : "bg-transparent text-[#777169] border-[rgba(242,238,231,0.1)]"
                }`}
              >
                {isCompleted ? <Check className="w-3 h-3 stroke-[2.5]" /> : String(idx + 1).padStart(2, "0")}
              </span>

              {/* Group Name */}
              <span
                className={`text-[11px] uppercase tracking-wider font-medium truncate max-w-[120px] lg:max-w-[160px] ${
                  isCurrent
                    ? "text-[#F2EEE7]"
                    : isCompleted
                    ? "text-[#AAA49B] hover:text-[#F2EEE7]"
                    : "text-[#777169]"
                }`}
              >
                {group.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
