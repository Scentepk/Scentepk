import React from "react";
import { Edit2 } from "lucide-react";

/**
 * CustomBuilderSummary
 * Sticky luxury creation manifest providing live pricing and selected specifications.
 */
export default function CustomBuilderSummary({
  settings = {},
  groups = [],
  selections = {},
  totalPrice = 0,
  onGoToStep,
}) {
  const basePrice = Number(settings.base_price || 0);
  const currency = settings.currency || "PKR";

  // Gather active selections across all groups
  const items = [];
  for (let idx = 0; idx < groups.length; idx++) {
    const group = groups[idx];
    const slug = group.slug || group.id;
    const raw = selections[slug];

    let list = [];
    if (Array.isArray(raw)) {
      list = raw.filter(Boolean);
    } else if (raw && typeof raw === "object") {
      list = [raw];
    }

    if (list.length > 0) {
      items.push({
        groupIndex: idx,
        groupName: group.name,
        options: list,
      });
    }
  }

  return (
    <aside className="bg-[#121110] border border-[rgba(242,238,231,0.08)] p-6 sm:p-7 rounded-sm space-y-6 shadow-2xl font-sans text-xs">
      {/* Header */}
      <div className="pb-4 border-b border-[rgba(242,238,231,0.06)]">
        <span className="text-[9.5px] uppercase font-mono tracking-[0.24em] text-[#BFA27A] font-semibold block mb-0.5">
          BESPOKE FORMULATION
        </span>
        <h2 className="font-serif text-xl sm:text-2xl text-[#F2EEE7] font-normal tracking-tight">
          Your SCENTE
        </h2>
      </div>

      {/* Selected Items Manifest */}
      <div className="space-y-4 max-h-[360px] overflow-y-auto pr-1 divide-y divide-[rgba(242,238,231,0.04)]">
        {/* Base Starting Price */}
        <div className="pt-2 first:pt-0 flex items-baseline justify-between text-xs">
          <div>
            <span className="text-[#AAA49B] block font-light">Formulation Base</span>
            <span className="text-[10px] text-[#777169]">Custom bottle & blending</span>
          </div>
          <span className="font-serif text-sm text-[#F2EEE7]">
            {currency} {basePrice.toLocaleString("en-PK")}
          </span>
        </div>

        {/* Selected Groups & Options */}
        {items.map((item) => (
          <div key={item.groupName} className="pt-3 space-y-1">
            <div className="flex items-center justify-between text-[10px] uppercase font-mono tracking-wider text-[#777169]">
              <span>{item.groupName}</span>
              {onGoToStep && (
                <button
                  type="button"
                  onClick={() => onGoToStep(item.groupIndex)}
                  className="hover:text-[#BFA27A] flex items-center space-x-1 cursor-pointer"
                  title={`Edit ${item.groupName}`}
                >
                  <Edit2 className="w-2.5 h-2.5" />
                  <span>Edit</span>
                </button>
              )}
            </div>

            <div className="space-y-1.5">
              {item.options.map((opt) => (
                <div key={opt.id} className="flex items-baseline justify-between text-xs text-[#F2EEE7]">
                  <span className="font-serif text-sm font-normal text-[#E6E1D8]">
                    {opt.name}
                  </span>
                  <span className="font-serif text-xs text-[#BFA27A]">
                    {Number(opt.price_adjustment || 0) > 0
                      ? `+ ${currency} ${Number(opt.price_adjustment).toLocaleString("en-PK")}`
                      : "Included"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}

        {items.length === 0 && (
          <div className="py-6 text-center text-[#777169] text-xs italic font-light">
            Your selected specifications will appear here as you craft your scent.
          </div>
        )}
      </div>

      {/* Live Total Statement */}
      <div className="pt-5 border-t border-[rgba(242,238,231,0.08)] space-y-1">
        <div className="flex items-baseline justify-between">
          <span className="text-[10px] uppercase font-mono tracking-[0.2em] text-[#AAA49B]">
            CURRENT TOTAL
          </span>
          <span className="font-serif text-2xl sm:text-3xl text-[#F2EEE7] font-normal tracking-tight">
            {currency} {totalPrice.toLocaleString("en-PK")}
          </span>
        </div>
        <p className="text-[10px] text-[#777169] font-light leading-relaxed">
          Includes bespoke extrait formulation and custom bottle presentation.
        </p>
      </div>
    </aside>
  );
}
