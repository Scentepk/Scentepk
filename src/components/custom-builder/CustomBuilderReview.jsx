import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Edit3, ArrowLeft, CheckCircle2, ArrowRight, ShoppingBag, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import { LUXURY_EASE } from "../../lib/animations";
import { useCart } from "../../context/CartContext";
import {
  validateBuilderSelections,
  buildCustomConfigurationSnapshot,
} from "../../services/customBuilderPricing";

/**
 * CustomBuilderReview
 * High-touch customer review screen presenting the bespoke perfume specification,
 * itemized formula breakdown, and verified final pricing before ordering.
 */
export default function CustomBuilderReview({
  settings = {},
  groups = [],
  selections = {},
  totalPrice = 0,
  onEditStep,
  onRestart,
}) {
  const navigate = useNavigate();
  const { addCustomToCart, clearBuyNow } = useCart();
  const [addedSuccess, setAddedSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const currency = settings.currency || "PKR";
  const basePrice = Number(settings.base_price || 0);

  // Group items with their chosen options
  const manifest = groups
    .map((group, groupIndex) => {
      const slug = group.slug || group.id;
      const raw = selections[slug];
      let selectedList = [];
      if (Array.isArray(raw)) {
        selectedList = raw.filter(Boolean);
      } else if (raw && typeof raw === "object") {
        selectedList = [raw];
      }

      return {
        groupIndex,
        group,
        options: selectedList,
      };
    })
    .filter((entry) => entry.options.length > 0);

  // Handle Add to Bag
  const handleAddToBag = () => {
    setErrorMessage("");

    // 1. Validate complete builder configuration
    const validation = validateBuilderSelections(groups, selections);
    if (!validation.isValid) {
      const firstError = Object.values(validation.errors)[0];
      setErrorMessage(firstError || "Please ensure all required selections are made.");
      return;
    }

    // 2. Build immutable snapshot for order storage
    const snapshot = buildCustomConfigurationSnapshot(
      settings,
      groups,
      selections,
      totalPrice
    );

    // 3. Optional image extraction from chosen options
    let customImage = null;
    for (const entry of manifest) {
      const optWithImg = entry.options.find((o) => o?.image_url);
      if (optWithImg?.image_url) {
        customImage = optWithImg.image_url;
        break;
      }
    }

    // 4. Add custom item through CartProvider
    addCustomToCart({
      customConfiguration: snapshot,
      selections,
      finalPrice: totalPrice,
      size: "Bespoke",
      quantity: 1,
      imageUrl: customImage,
    });

    setAddedSuccess(true);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.6, ease: LUXURY_EASE }}
      className="max-w-3xl mx-auto py-6 sm:py-10 px-4 font-sans"
    >
      {/* Top Breadcrumb / Return */}
      <div className="flex items-center justify-between mb-8 sm:mb-10 pb-4 border-b border-[rgba(242,238,231,0.06)]">
        <button
          type="button"
          onClick={() => onEditStep(groups.length - 1)}
          className="inline-flex items-center text-xs uppercase font-mono tracking-widest text-[#AAA49B] hover:text-[#BFA27A] transition-colors cursor-pointer group"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-2 transition-transform group-hover:-translate-x-1" />
          <span>Back to Refinement</span>
        </button>

        <span className="text-[10px] uppercase font-mono tracking-[0.24em] text-[#BFA27A] font-semibold">
          FINAL SPECIFICATION
        </span>
      </div>

      {/* Main Review Card / Atelier Formulation Manifest */}
      <div className="bg-[#121110] border border-[rgba(242,238,231,0.08)] rounded-sm p-6 sm:p-10 shadow-2xl relative overflow-hidden">
        {/* Subtle Ambient Background Accent */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#BFA27A]/5 blur-3xl pointer-events-none rounded-full" />

        {/* Header */}
        <div className="text-center pb-8 border-b border-[rgba(242,238,231,0.06)]">
          <span className="text-[10px] uppercase font-mono tracking-[0.28em] text-[#BFA27A] font-medium block mb-1">
            ATELIER BESPOKE FORMULA
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl text-[#F2EEE7] font-normal tracking-tight">
            Your Scent is Ready
          </h2>
          <p className="text-xs text-[#AAA49B] font-light mt-2 max-w-md mx-auto">
            A distinct, personalized formulation hand-blended to your selected olfactive architecture.
          </p>
        </div>

        {/* Inline Error Notice */}
        {errorMessage && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="my-4 p-3.5 bg-red-950/30 border border-red-500/40 rounded-sm flex items-center space-x-2 text-xs text-red-300"
          >
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{errorMessage}</span>
          </motion.div>
        )}

        {/* Itemized Specification Table */}
        <div className="py-6 sm:py-8 space-y-6 divide-y divide-[rgba(242,238,231,0.04)]">
          {/* Base Price Line */}
          <div className="pt-4 first:pt-0 flex items-center justify-between text-sm">
            <div>
              <span className="font-serif text-base text-[#F2EEE7] block">
                Atelier Formulation Base
              </span>
              <span className="text-xs text-[#777169] font-light">
                Custom bottle, extrait formulation & signature packaging
              </span>
            </div>
            <div className="text-right">
              <span className="font-serif text-base text-[#F2EEE7]">
                {currency} {basePrice.toLocaleString("en-PK")}
              </span>
            </div>
          </div>

          {/* Group Selections */}
          {manifest.map(({ group, groupIndex, options }) => (
            <div key={group.id} className="pt-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase font-mono tracking-[0.2em] text-[#BFA27A] font-medium">
                  {group.name}
                </span>
                <button
                  type="button"
                  onClick={() => onEditStep(groupIndex)}
                  className="inline-flex items-center space-x-1.5 text-[11px] font-sans uppercase tracking-wider text-[#AAA49B] hover:text-[#BFA27A] transition-colors cursor-pointer"
                >
                  <Edit3 className="w-3 h-3" />
                  <span>Modify</span>
                </button>
              </div>

              <div className="space-y-2 pl-2 border-l border-[rgba(242,238,231,0.06)]">
                {options.map((option) => {
                  const adj = Number(option.price_adjustment || 0);
                  return (
                    <div
                      key={option.id}
                      className="flex items-baseline justify-between text-sm"
                    >
                      <div className="space-y-0.5">
                        <span className="font-serif text-base text-[#F2EEE7] block">
                          {option.name}
                        </span>
                        {option.category && (
                          <span className="text-[10px] uppercase font-mono tracking-wider text-[#777169]">
                            {option.category}
                          </span>
                        )}
                        {option.description && (
                          <p className="text-xs text-[#AAA49B] font-light max-w-md">
                            {option.description}
                          </p>
                        )}
                      </div>

                      <div className="text-right shrink-0 ml-4">
                        <span className="font-serif text-sm text-[#BFA27A]">
                          {adj > 0
                            ? `+ ${currency} ${adj.toLocaleString("en-PK")}`
                            : "Included"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Total Price Section */}
        <div className="pt-6 border-t border-[rgba(242,238,231,0.1)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-[10px] uppercase font-mono tracking-[0.22em] text-[#AAA49B] block">
              FINAL PRICE
            </span>
            <span className="text-xs text-[#777169] font-light">
              Free nationwide delivery across Pakistan
            </span>
          </div>

          <div className="text-left sm:text-right">
            <span className="font-serif text-3xl sm:text-4xl text-[#F2EEE7] font-normal tracking-tight block">
              {currency} {totalPrice.toLocaleString("en-PK")}
            </span>
          </div>
        </div>
      </div>

      {/* Main Review Actions */}
      <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-center justify-between gap-4">
        <button
          type="button"
          onClick={onRestart}
          className="w-full sm:w-auto px-6 py-3.5 rounded-sm border border-[rgba(242,238,231,0.12)] text-[#AAA49B] hover:text-[#F2EEE7] hover:border-[rgba(242,238,231,0.3)] font-sans text-xs uppercase tracking-[0.16em] transition-all cursor-pointer text-center"
        >
          Start Over
        </button>

        {/* Add to Bag Action */}
        <button
          type="button"
          id="builder-finish-btn"
          onClick={handleAddToBag}
          className="w-full sm:w-auto inline-flex items-center justify-center px-4 sm:px-12 py-3.5 sm:py-4 rounded-sm border border-[#BFA27A] bg-[#BFA27A] text-[#0D0D0C] hover:bg-[#d6b78d] active:scale-[0.99] font-sans text-xs uppercase tracking-[0.14em] sm:tracking-[0.2em] font-semibold transition-all duration-300 shadow-[0_4px_24px_rgba(191,162,122,0.25)] cursor-pointer"
        >
          <ShoppingBag className="w-4 h-4 mr-2 sm:mr-2.5 shrink-0" />
          <span>Add to Bag — {currency} {totalPrice.toLocaleString("en-PK")}</span>
        </button>
      </div>

      {/* Added to Bag Success Confirmation Modal */}
      {addedSuccess && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-[#121110] border border-[#BFA27A]/40 p-6 sm:p-9 rounded-sm max-w-md w-full text-center space-y-6 shadow-2xl"
          >
            <div className="w-14 h-14 rounded-full bg-[#181714] border border-[#BFA27A]/40 flex items-center justify-center text-[#BFA27A] mx-auto shadow-lg">
              <CheckCircle2 className="w-7 h-7 stroke-[1.5]" />
            </div>

            <div className="space-y-2">
              <span className="text-[10px] uppercase font-mono tracking-[0.26em] text-[#BFA27A] font-semibold block">
                CREATION SAVED
              </span>
              <h3 className="font-serif text-2xl sm:text-3xl text-[#F2EEE7] font-normal">
                Added to Your Bag
              </h3>
              <p className="text-xs text-[#AAA49B] font-light leading-relaxed">
                Your custom perfume formula has been placed in your shopping bag at{" "}
                <span className="text-[#F2EEE7] font-medium">
                  {currency} {totalPrice.toLocaleString("en-PK")}
                </span>
                . You may proceed immediately to checkout or view your bag.
              </p>
            </div>

            <div className="pt-2 space-y-3 font-sans">
              <button
                type="button"
                id="builder-checkout-btn"
                onClick={() => {
                  clearBuyNow();
                  navigate("/checkout", { state: { freshCheckout: true, isBuyNow: false } });
                }}
                className="w-full py-3.5 px-6 rounded-sm bg-[#BFA27A] hover:bg-[#d6b78d] text-[#0D0D0C] text-xs uppercase tracking-[0.2em] font-semibold transition-all duration-300 flex items-center justify-center space-x-2 shadow-lg cursor-pointer"
              >
                <span>Proceed to Checkout</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                id="builder-view-bag-btn"
                onClick={() => navigate("/cart")}
                className="w-full py-3 px-6 rounded-sm border border-[rgba(242,238,231,0.2)] hover:border-[#BFA27A] text-[#F2EEE7] text-xs uppercase tracking-wider transition-colors cursor-pointer"
              >
                View Your Bag
              </button>

              <button
                type="button"
                onClick={() => {
                  setAddedSuccess(false);
                  onRestart();
                }}
                className="text-[11px] text-[#777169] hover:text-[#AAA49B] tracking-wide transition-colors cursor-pointer pt-1 block mx-auto"
              >
                Create Another Bespoke Fragrance
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}

