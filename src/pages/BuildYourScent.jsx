import React, { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  AlertCircle,
  RefreshCw,
  Info,
} from "lucide-react";
import SEO from "../components/SEO";
import AtelierLoader from "../components/AtelierLoader";
import CustomBuilderIntro from "../components/custom-builder/CustomBuilderIntro";
import CustomBuilderProgress from "../components/custom-builder/CustomBuilderProgress";
import CustomBuilderOptionCard from "../components/custom-builder/CustomBuilderOptionCard";
import CustomBuilderSummary from "../components/custom-builder/CustomBuilderSummary";
import CustomBuilderReview from "../components/custom-builder/CustomBuilderReview";
import { getBuilderConfig } from "../services/customBuilder";
import {
  calculateCustomPerfumePrice,
  validateBuilderSelections,
} from "../services/customBuilderPricing";
import { LUXURY_EASE } from "../lib/animations";

export default function BuildYourScent() {
  // Config state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [settings, setSettings] = useState(null);
  const [groups, setGroups] = useState([]);

  // Builder flow state: "intro" | "building" | "review"
  const [stage, setStage] = useState("intro");
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  // Selections map: { [groupSlug]: optionObject | Array<optionObject> }
  const [selections, setSelections] = useState({});

  // Inline step validation error message
  const [validationError, setValidationError] = useState("");

  // Load builder configuration from service layer
  const loadConfiguration = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchErr } = await getBuilderConfig();
      if (fetchErr) {
        throw fetchErr;
      }
      if (!data) {
        throw new Error("Unable to retrieve builder configuration.");
      }
      setSettings(data.settings || {});
      setGroups(data.groups || []);
    } catch (err) {
      console.error("Failed to load custom builder config:", err);
      setError("We couldn't load the fragrance builder right now. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConfiguration();
  }, [loadConfiguration]);

  // Flatten currently selected options across all groups for price calculation
  const flattenedSelectedOptions = useMemo(() => {
    const list = [];
    for (const group of groups) {
      const slug = group.slug || group.id;
      const raw = selections[slug];
      if (Array.isArray(raw)) {
        list.push(...raw.filter(Boolean));
      } else if (raw && typeof raw === "object") {
        list.push(raw);
      }
    }
    return list;
  }, [groups, selections]);

  // Live integer PKR price calculation
  const currentTotalPrice = useMemo(() => {
    const base = settings?.base_price ?? 0;
    return calculateCustomPerfumePrice(base, flattenedSelectedOptions);
  }, [settings?.base_price, flattenedSelectedOptions]);

  // Current active group
  const currentGroup = groups[currentStepIndex] || null;
  const currentGroupSlug = currentGroup ? currentGroup.slug || currentGroup.id : null;

  // Selected options for current group
  const currentGroupSelections = useMemo(() => {
    if (!currentGroupSlug) return [];
    const raw = selections[currentGroupSlug];
    if (Array.isArray(raw)) return raw.filter(Boolean);
    if (raw && typeof raw === "object") return [raw];
    return [];
  }, [selections, currentGroupSlug]);

  // Toggle option selection within current group
  const handleToggleOption = (option) => {
    if (!currentGroup || !currentGroupSlug) return;
    setValidationError(""); // clear inline error on user interaction

    const isSingle = currentGroup.selection_type === "single";
    const maxSelections = Number(currentGroup.max_selections || (isSingle ? 1 : 99));

    if (isSingle) {
      // Single selection replaces previous or unselects if clicked again and optional
      const isAlreadySelected = currentGroupSelections.some((o) => o.id === option.id);
      if (isAlreadySelected) {
        if (!currentGroup.is_required) {
          setSelections((prev) => ({ ...prev, [currentGroupSlug]: null }));
        }
      } else {
        setSelections((prev) => ({ ...prev, [currentGroupSlug]: option }));
      }
    } else {
      // Multiple selection
      const exists = currentGroupSelections.some((o) => o.id === option.id);
      if (exists) {
        const nextList = currentGroupSelections.filter((o) => o.id !== option.id);
        setSelections((prev) => ({ ...prev, [currentGroupSlug]: nextList }));
      } else {
        if (currentGroupSelections.length >= maxSelections) {
          setValidationError(
            `You can select at most ${maxSelections} ${
              maxSelections === 1 ? "option" : "options"
            } for ${currentGroup.name}.`
          );
          return;
        }
        const nextList = [...currentGroupSelections, option];
        setSelections((prev) => ({ ...prev, [currentGroupSlug]: nextList }));
      }
    }
  };

  // Determine whether the current step meets selection requirements to allow continuation
  const isStepRequirementSatisfied = useMemo(() => {
    if (!currentGroup) return true;
    const isRequired = currentGroup.is_required !== false;
    const count = currentGroupSelections.length;
    const isSingle = currentGroup.selection_type === "single";

    if (isRequired && count === 0) return false;
    if (count === 0 && !isRequired) return true;

    const min = Number(currentGroup.min_selections ?? (isRequired ? 1 : 0));
    if (count < min) return false;

    const max = Number(currentGroup.max_selections ?? (isSingle ? 1 : 99));
    if (count > max) return false;

    return true;
  }, [currentGroup, currentGroupSelections]);

  // Validate current step before advancing
  const validateCurrentStep = () => {
    if (!currentGroup) return true;
    const isRequired = currentGroup.is_required !== false;
    const min = Number(currentGroup.min_selections ?? (isRequired ? 1 : 0));
    const count = currentGroupSelections.length;

    if (isRequired && count === 0) {
      setValidationError(`Please select an option for ${currentGroup.name} to continue.`);
      return false;
    }

    if (count > 0 && count < min) {
      setValidationError(
        `Please select at least ${min} ${min === 1 ? "option" : "options"} for ${
          currentGroup.name
        }.`
      );
      return false;
    }

    const max = Number(currentGroup.max_selections ?? (currentGroup.selection_type === "single" ? 1 : 99));
    if (count > max) {
      setValidationError(
        `You can select at most ${max} ${max === 1 ? "option" : "options"} for ${
          currentGroup.name
        }.`
      );
      return false;
    }

    setValidationError("");
    return true;
  };

  // Step Navigation handlers
  const handleBegin = () => {
    setStage("building");
    setCurrentStepIndex(0);
    setValidationError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleNextStep = () => {
    if (!validateCurrentStep()) return;

    if (currentStepIndex < groups.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
      setValidationError("");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      // Validate all groups before opening Review
      const validation = validateBuilderSelections(groups, selections);
      if (!validation.isValid) {
        const firstErrorKey = Object.keys(validation.errors)[0];
        setValidationError(validation.errors[firstErrorKey] || "Please review your selections.");
        return;
      }
      setStage("review");
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handlePrevStep = () => {
    setValidationError("");
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      setStage("intro");
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleJumpToStep = (index) => {
    if (index >= 0 && index < groups.length) {
      setStage("building");
      setCurrentStepIndex(index);
      setValidationError("");
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleRestart = () => {
    setSelections({});
    setCurrentStepIndex(0);
    setStage("intro");
    setValidationError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ============================================================================
  // CONDITIONAL RENDER: LOADING STATE
  // ============================================================================
  if (loading) {
    return (
      <div className="bg-[#0D0D0C] min-h-screen text-[#F2EEE7] flex items-center justify-center">
        <AtelierLoader />
      </div>
    );
  }

  // ============================================================================
  // CONDITIONAL RENDER: ERROR STATE
  // ============================================================================
  if (error) {
    return (
      <div className="bg-[#0D0D0C] min-h-screen text-[#F2EEE7] flex items-center justify-center px-4 py-20">
        <div className="bg-[#121110] border border-[rgba(242,238,231,0.08)] p-8 sm:p-10 rounded-sm text-center max-w-md w-full space-y-5 shadow-2xl">
          <div className="w-12 h-12 rounded-full bg-[#181714] border border-red-500/30 flex items-center justify-center text-red-400 mx-auto">
            <AlertCircle className="w-6 h-6 stroke-[1.5]" />
          </div>
          <div className="space-y-2">
            <h2 className="font-serif text-2xl text-[#F2EEE7] font-normal">
              Atelier Unavailable
            </h2>
            <p className="text-xs text-[#AAA49B] font-light leading-relaxed">
              {error}
            </p>
          </div>
          <button
            type="button"
            onClick={loadConfiguration}
            className="inline-flex items-center justify-center px-6 py-3 rounded-sm border border-[#BFA27A] text-[#BFA27A] hover:bg-[#BFA27A] hover:text-[#0D0D0C] font-sans text-xs uppercase tracking-widest transition-all cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-2" />
            <span>Try Again</span>
          </button>
        </div>
      </div>
    );
  }

  // ============================================================================
  // CONDITIONAL RENDER: INACTIVE BUILDER STATE (settings.is_active === false)
  // ============================================================================
  if (!settings || settings.is_active === false) {
    return (
      <div className="bg-[#0D0D0C] min-h-screen text-[#F2EEE7] flex items-center justify-center px-4 py-20">
        <div className="bg-[#121110] border border-[rgba(242,238,231,0.08)] p-8 sm:p-12 rounded-sm text-center max-w-lg w-full space-y-5 shadow-2xl">
          <div className="w-12 h-12 rounded-full bg-[#181714] border border-[#BFA27A]/30 flex items-center justify-center text-[#BFA27A] mx-auto">
            <RefreshCw className="w-5 h-5 stroke-[1.5]" />
          </div>
          <span className="text-[10px] uppercase font-mono tracking-[0.24em] text-[#BFA27A] font-semibold block">
            CUSTOM CREATION
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl text-[#F2EEE7] font-normal">
            Atelier Currently Resting
          </h2>
          <p className="text-xs sm:text-sm text-[#AAA49B] font-light leading-relaxed max-w-sm mx-auto">
            Our custom fragrance builder is currently undergoing scheduled refinement. Please check back soon for bespoke formulations.
          </p>
        </div>
      </div>
    );
  }

  // ============================================================================
  // CONDITIONAL RENDER: EMPTY CONFIGURATION STATE (groups.length === 0)
  // ============================================================================
  if (groups.length === 0) {
    return (
      <div className="bg-[#0D0D0C] min-h-screen text-[#F2EEE7] flex items-center justify-center px-4 py-20">
        <div className="bg-[#121110] border border-[rgba(242,238,231,0.08)] p-8 sm:p-12 rounded-sm text-center max-w-lg w-full space-y-4 shadow-2xl">
          <span className="text-[10px] uppercase font-mono tracking-[0.24em] text-[#BFA27A] font-semibold block">
            PREPARING ATELIER
          </span>
          <h2 className="font-serif text-2xl sm:text-3xl text-[#F2EEE7] font-normal">
            Formulation Experience in Preparation
          </h2>
          <p className="text-xs text-[#AAA49B] font-light leading-relaxed">
            The custom fragrance experience is being prepared by our master perfumers. New bespoke options will be available shortly.
          </p>
        </div>
      </div>
    );
  }

  // ============================================================================
  // MAIN BUILDER PAGE RENDER
  // ============================================================================
  const currency = settings.currency || "PKR";
  const isLastStep = currentStepIndex === groups.length - 1;

  return (
    <div className="bg-[#0D0D0C] min-h-screen text-[#F2EEE7] selection:bg-[#BFA27A]/30 selection:text-[#F2EEE7] pb-32 sm:pb-36 lg:pb-16">
      <SEO
        title={`${settings.title || "Build Your SCENTE"} | Bespoke Fragrance Atelier`}
        description={
          settings.description ||
          "Create your own custom luxury fragrance with SCENTE. Choose your bottle, notes, and profile."
        }
        canonicalUrl="https://scente.pk/build-your-scent"
        keywords="custom perfume Pakistan, bespoke fragrance, create your scent, SCENTE custom builder"
      />

      <div className="layout-container pt-6 sm:pt-10 md:pt-12">
        <AnimatePresence mode="wait">
          {/* ================================================================ */}
          {/* STAGE 1: INTRO                                                   */}
          {/* ================================================================ */}
          {stage === "intro" && (
            <CustomBuilderIntro
              key="intro"
              settings={settings}
              groupsCount={groups.length}
              onBegin={handleBegin}
            />
          )}

          {/* ================================================================ */}
          {/* STAGE 2: MULTI-STEP BUILDER                                      */}
          {/* ================================================================ */}
          {stage === "building" && currentGroup && (
            <div key="building-stage" className="space-y-8">
              {/* Top Dynamic Progress Bar */}
              <div className="max-w-6xl mx-auto">
                <CustomBuilderProgress
                  groups={groups}
                  currentStepIndex={currentStepIndex}
                  onStepClick={handleJumpToStep}
                  selections={selections}
                />
              </div>

              {/* Two Column Layout: Main Step Work area + Desktop Sticky Summary */}
              <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
                {/* Main Step Left Column: Animated on step transition */}
                <div className="lg:col-span-8">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={`group-${currentGroup.id || currentStepIndex}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.3, ease: LUXURY_EASE }}
                      className="space-y-6 sm:space-y-8"
                    >
                      {/* Step Header */}
                      <div className="space-y-3 pb-5 border-b border-[rgba(242,238,231,0.06)]">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center space-x-1.5">
                            <span className="text-[11px] sm:text-xs uppercase font-mono tracking-[0.24em] text-[#BFA27A] font-semibold">
                              STEP {String(currentStepIndex + 1).padStart(2, "0")}
                            </span>
                            <span className="text-xs font-mono text-[#777169]">/</span>
                            <span className="text-xs font-mono text-[#777169]">
                              {String(groups.length).padStart(2, "0")}
                            </span>
                          </div>

                          <span
                            className={`text-[9.5px] uppercase font-mono tracking-wider px-2.5 py-0.5 rounded-full border ${
                              currentGroup.is_required !== false
                                ? "bg-[#181714] text-[#BFA27A] border-[#BFA27A]/30"
                                : "bg-transparent text-[#777169] border-[rgba(242,238,231,0.1)]"
                            }`}
                          >
                            {currentGroup.is_required !== false ? "Required" : "Optional"}
                          </span>
                        </div>

                        <h2 className="font-serif text-2xl sm:text-3xl md:text-4xl text-[#F2EEE7] font-normal leading-tight tracking-tight uppercase">
                          {currentGroup.name}
                        </h2>

                        {currentGroup.description && (
                          <p className="text-xs sm:text-sm text-[#AAA49B] font-light leading-relaxed max-w-2xl">
                            {currentGroup.description}
                          </p>
                        )}

                        {/* Selection Instructions Notice */}
                        <div className="flex items-center space-x-2 pt-1 text-[11px] font-sans text-[#777169]">
                          <Info className="w-3.5 h-3.5 shrink-0 text-[#BFA27A]/70" />
                          <span>
                            {currentGroup.selection_type === "single"
                              ? (currentGroup.is_required !== false
                                  ? "Select one option to define this element."
                                  : "Select one option (optional).")
                              : `Select ${
                                  currentGroup.min_selections > 0
                                    ? `at least ${currentGroup.min_selections}`
                                    : "up"
                                } to ${currentGroup.max_selections || 99} option${
                                  (currentGroup.max_selections || 2) > 1 ? "s" : ""
                                }.`}
                          </span>
                        </div>
                      </div>

                      {/* Inline Validation Alert */}
                      {validationError && (
                        <motion.div
                          initial={{ opacity: 0, y: -6 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="p-3.5 bg-red-950/20 border border-red-500/30 rounded-sm flex items-center space-x-2.5 text-xs text-red-300 font-sans"
                        >
                          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                          <span>{validationError}</span>
                        </motion.div>
                      )}

                      {/* Options Grid */}
                      {Array.isArray(currentGroup.options) && currentGroup.options.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 sm:gap-4">
                          {currentGroup.options.map((option) => {
                            const isSelected = currentGroupSelections.some(
                              (o) => o.id === option.id
                            );
                            const isMaxReached =
                              currentGroup.selection_type === "multiple" &&
                              !isSelected &&
                              currentGroupSelections.length >=
                                Number(currentGroup.max_selections || 99);

                            return (
                              <CustomBuilderOptionCard
                                key={option.id}
                                option={option}
                                isSelected={isSelected}
                                onToggle={handleToggleOption}
                                disabled={isMaxReached}
                                currency={currency}
                              />
                            );
                          })}
                        </div>
                      ) : (
                        <div className="p-8 bg-[#121110] border border-[rgba(242,238,231,0.06)] rounded-sm text-center text-xs text-[#777169] italic">
                          No options are currently configured for this step.
                        </div>
                      )}

                      {/* Desktop / In-flow Navigation Controls */}
                      <div className="pt-6 border-t border-[rgba(242,238,231,0.06)] flex items-center justify-between gap-4">
                        <button
                          type="button"
                          onClick={handlePrevStep}
                          className="inline-flex items-center px-5 sm:px-6 py-3 rounded-sm border border-[rgba(242,238,231,0.12)] text-[#AAA49B] hover:text-[#F2EEE7] hover:border-[rgba(242,238,231,0.3)] font-sans text-xs uppercase tracking-wider transition-colors cursor-pointer group"
                        >
                          <ArrowLeft className="w-3.5 h-3.5 mr-2 transition-transform group-hover:-translate-x-1" />
                          <span>{currentStepIndex === 0 ? "Introduction" : "Back"}</span>
                        </button>

                        <div className="flex items-center gap-3">
                          {!isStepRequirementSatisfied && (
                            <span className="text-[11px] text-[#AAA49B] font-sans italic hidden sm:inline">
                              {currentGroup.selection_type === "single"
                                ? "Select an option to continue"
                                : `Select at least ${currentGroup.min_selections || 1} option${(currentGroup.min_selections || 1) > 1 ? "s" : ""}`}
                            </span>
                          )}

                          <button
                            type="button"
                            id="builder-next-btn"
                            disabled={!isStepRequirementSatisfied}
                            onClick={handleNextStep}
                            className="inline-flex items-center px-7 sm:px-9 py-3 rounded-sm border border-[#BFA27A] bg-[#BFA27A] text-[#0D0D0C] hover:bg-[#d6b78d] active:scale-[0.99] font-sans text-xs uppercase tracking-widest font-semibold transition-all shadow-[0_4px_20px_rgba(191,162,122,0.2)] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-[#BFA27A] disabled:hover:text-[#0D0D0C] disabled:active:scale-100 disabled:shadow-none cursor-pointer group"
                          >
                            <span>{isLastStep ? "Review Formulation" : "Continue"}</span>
                            <ArrowRight className="w-3.5 h-3.5 ml-2 transition-transform group-hover:translate-x-1" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  </AnimatePresence>
                </div>

                {/* Right Column: Desktop Sticky Summary Panel */}
                <div className="hidden lg:block lg:col-span-4 sticky top-24">
                  <CustomBuilderSummary
                    settings={settings}
                    groups={groups}
                    selections={selections}
                    totalPrice={currentTotalPrice}
                    onGoToStep={handleJumpToStep}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ================================================================ */}
          {/* STAGE 3: FORMULATION REVIEW                                      */}
          {/* ================================================================ */}
          {stage === "review" && (
            <CustomBuilderReview
              key="review"
              settings={settings}
              groups={groups}
              selections={selections}
              totalPrice={currentTotalPrice}
              onEditStep={handleJumpToStep}
              onRestart={handleRestart}
            />
          )}
        </AnimatePresence>
      </div>

      {/* ==================================================================== */}
      {/* MOBILE STICKY BOTTOM SUMMARY BAR (Only visible during building)       */}
      {/* ==================================================================== */}
      {stage === "building" && currentGroup && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#121110]/95 backdrop-blur-md border-t border-[rgba(242,238,231,0.1)] px-4 py-3 sm:py-3.5 shadow-[0_-4px_24px_rgba(0,0,0,0.5)] safe-pb">
          <div className="flex items-center justify-between gap-3 max-w-md mx-auto">
            {/* Price & Selection Tally */}
            <div>
              <span className="text-[9px] uppercase font-mono tracking-wider text-[#AAA49B] block">
                CURRENT TOTAL
              </span>
              <span className="font-serif text-lg text-[#F2EEE7] font-medium leading-tight">
                {currency} {currentTotalPrice.toLocaleString("en-PK")}
              </span>
            </div>

            {/* Compact Action Buttons */}
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={handlePrevStep}
                className="px-3.5 py-2.5 rounded-sm border border-[rgba(242,238,231,0.15)] text-[#AAA49B] hover:text-[#F2EEE7] text-xs font-sans uppercase tracking-wider transition-colors cursor-pointer"
              >
                Back
              </button>

              <button
                type="button"
                id="builder-mobile-next-btn"
                disabled={!isStepRequirementSatisfied}
                onClick={handleNextStep}
                className="inline-flex items-center px-5 py-2.5 rounded-sm border border-[#BFA27A] bg-[#BFA27A] text-[#0D0D0C] text-xs font-sans uppercase tracking-wider font-semibold transition-all shadow-[0_2px_12px_rgba(191,162,122,0.2)] disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none cursor-pointer"
              >
                <span>{isLastStep ? "Review" : "Continue"}</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
