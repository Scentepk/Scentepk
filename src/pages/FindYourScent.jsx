import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  ArrowLeft,
  Check,
  RotateCcw,
  SlidersHorizontal,
  Sparkles,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { getActiveProducts } from "../services/products";
import { getFragranceRecommendations } from "../services/recommendationEngine";
import { getOptimizedImageUrl } from "../lib/images";
import { LUXURY_EASE } from "../lib/animations";
import SEO from "../components/SEO";

// Controlled Quiz Taxonomy conforming to SCENTÉ Fragrance Engine
const QUESTIONS = [
  {
    id: "scentFamilies",
    title: "What kind of scent draws you in?",
    subtitle: "Select one or more olfactive families that resonate with your taste.",
    isMulti: true,
    options: [
      { value: "woody", label: "Woody", desc: "Warm cedar, sandalwood, oud & dry vetiver" },
      { value: "oriental_amber", label: "Oriental & Amber", desc: "Opulent amber, resinous incense & golden spices" },
      { value: "fresh_citrus", label: "Fresh & Citrus", desc: "Vibrant bergamot, neroli & crisp sparkling zest" },
      { value: "floral", label: "Floral", desc: "Velvety damask rose, night jasmine & petal blooms" },
      { value: "leather_smoky", label: "Leather & Smoky", desc: "Burnished suede, birch tar & rich tobacco leaf" },
      { value: "clean_musk", label: "Clean & Musk", desc: "Pure white musk, airy linen & delicate ambrette" },
      { value: "gourmand", label: "Gourmand", desc: "Warm bourbon vanilla, caramelized tonka & praline" },
    ],
  },
  {
    id: "intensity",
    title: "How do you want your fragrance to feel?",
    subtitle: "Select the sillage and presence that matches your wearing style.",
    isMulti: false,
    options: [
      { value: "subtle", label: "Subtle", desc: "Intimate skin scent" },
      { value: "moderate", label: "Moderate", desc: "Balanced everyday sillage" },
      { value: "intense", label: "Intense", desc: "Commanding room-filling trail" },
    ],
  },
  {
    id: "moods",
    title: "What mood do you want to carry?",
    subtitle: "Select one or more impressions you want to embody.",
    isMulti: true,
    options: [
      { value: "mysterious", label: "Mysterious & Dark", desc: "Enigmatic, nocturnal and shadowy" },
      { value: "warm_enveloping", label: "Warm & Enveloping", desc: "Comforting, sensual and deeply inviting" },
      { value: "clean_timeless", label: "Clean & Timeless", desc: "Crisp, poised and effortlessly refined" },
      { value: "regal_opulent", label: "Regal & Opulent", desc: "Aristocratic, grand and unapologetic" },
      { value: "luminous_fresh", label: "Luminous & Fresh", desc: "Breezy, radiant and invigorated" },
      { value: "bold_magnetic", label: "Bold & Magnetic", desc: "Charismatic, striking and unforgettable" },
      { value: "romantic", label: "Romantic", desc: "Poetic, intimate and intoxicating" },
      { value: "dramatic", label: "Dramatic", desc: "Theatrical, deep and expressive" },
    ],
  },
  {
    id: "occasions",
    title: "When will you wear it most?",
    subtitle: "Select the occasions that will define this fragrance.",
    isMulti: true,
    options: [
      { value: "daily_office", label: "Daily & Office", desc: "Workplace, boardrooms and effortless daytime wear" },
      { value: "evening_date", label: "Evening & Date Night", desc: "Intimate dinners, late evenings and allure" },
      { value: "special_event", label: "Weddings & Special Events", desc: "Milestones, celebrations and black-tie galas" },
      { value: "signature_all_day", label: "Signature / All-Day", desc: "Your personal, distinctive everyday signature" },
      { value: "party", label: "Parties & Social", desc: "Lively gatherings, lounges and nightlife" },
    ],
  },
  {
    id: "seasons",
    title: "When do you want to wear it?",
    subtitle: "Select your preferred seasonal climate.",
    isMulti: false,
    options: [
      { value: "all_year", label: "All Year", desc: "Versatile, climate-adaptive extrait composition" },
      { value: "spring_summer", label: "Spring / Summer", desc: "Lighter air, warm sunshine and humid breezes" },
      { value: "fall_winter", label: "Fall / Winter", desc: "Crisp autumn chill, cool evenings and deep winter air" },
    ],
  },
];

// Display label mappings for human-readable match explanations (no raw keys exposed)
const DESCRIPTOR_LABELS = {
  woody: "woody",
  oriental_amber: "oriental",
  fresh_citrus: "fresh citrus",
  floral: "floral",
  leather_smoky: "leather",
  clean_musk: "clean musk",
  gourmand: "gourmand",
  subtle: "subtle",
  moderate: "moderate",
  intense: "intense",
  mysterious: "mysterious",
  warm_enveloping: "warm",
  clean_timeless: "timeless",
  regal_opulent: "regal",
  luminous_fresh: "luminous",
  bold_magnetic: "magnetic",
  romantic: "romantic",
  dramatic: "dramatic",
  daily_office: "daytime",
  evening_date: "evening",
  special_event: "special occasion",
  signature_all_day: "signature",
  party: "social",
  all_year: "all-season",
  spring_summer: "warm-weather",
  fall_winter: "cool-weather",
};

/**
 * Builds a natural, customer-friendly explanation from matched criteria
 * e.g., "Matches your woody, intense, and evening preferences."
 */
function buildMatchExplanation(product, preferences) {
  const profile = product?.fragranceProfile || {};
  const matchedDescriptors = [];

  // Scent family descriptor
  const matchedFamilies = (profile.scentFamilies || []).filter((f) =>
    (preferences.scentFamilies || []).includes(f)
  );
  if (matchedFamilies.length > 0) {
    matchedDescriptors.push(DESCRIPTOR_LABELS[matchedFamilies[0]] || matchedFamilies[0]);
  }

  // Intensity descriptor
  if (preferences.intensity && profile.intensity === preferences.intensity) {
    matchedDescriptors.push(DESCRIPTOR_LABELS[preferences.intensity] || preferences.intensity);
  }

  // Occasion descriptor
  const matchedOccasions = (profile.occasions || []).filter((o) =>
    (preferences.occasions || []).includes(o)
  );
  if (matchedOccasions.length > 0) {
    matchedDescriptors.push(DESCRIPTOR_LABELS[matchedOccasions[0]] || matchedOccasions[0]);
  } else {
    // Fallback to mood if occasion didn't match
    const matchedMoods = (profile.moods || []).filter((m) =>
      (preferences.moods || []).includes(m)
    );
    if (matchedMoods.length > 0) {
      matchedDescriptors.push(DESCRIPTOR_LABELS[matchedMoods[0]] || matchedMoods[0]);
    }
  }

  if (matchedDescriptors.length === 0) {
    return "Crafted to complement your olfactive taste.";
  }
  if (matchedDescriptors.length === 1) {
    return `Matches your ${matchedDescriptors[0]} preference.`;
  }
  if (matchedDescriptors.length === 2) {
    return `Matches your ${matchedDescriptors[0]} and ${matchedDescriptors[1]} preferences.`;
  }
  return `Matches your ${matchedDescriptors.slice(0, -1).join(", ")}, and ${matchedDescriptors[matchedDescriptors.length - 1]} preferences.`;
}

export default function FindYourScent() {
  const navigate = useNavigate();

  // Local Page State
  // stage: "intro" | "quiz" | "results"
  const [stage, setStage] = useState("intro");
  const [currentStep, setCurrentStep] = useState(0);

  const [preferences, setPreferences] = useState({
    scentFamilies: [],
    intensity: null,
    moods: [],
    occasions: [],
    seasons: [],
  });

  const [products, setProducts] = useState([]);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(true);
  const [catalogError, setCatalogError] = useState(null);
  const [recommendations, setRecommendations] = useState([]);

  // Load active catalog using existing product service
  useEffect(() => {
    let isMounted = true;
    async function loadCatalog() {
      setIsLoadingCatalog(true);
      setCatalogError(null);
      try {
        const { data, error } = await getActiveProducts();
        if (!isMounted) return;
        if (error || !data) {
          setCatalogError("Unable to load fragrance catalog. Please check your connection.");
        } else {
          setProducts(data);
        }
      } catch (err) {
        if (isMounted) {
          setCatalogError("An error occurred while loading the fragrance catalog.");
        }
      } finally {
        if (isMounted) {
          setIsLoadingCatalog(false);
        }
      }
    }
    loadCatalog();
    return () => {
      isMounted = false;
    };
  }, []);

  // Answer handler for current question
  const currentQuestion = QUESTIONS[currentStep];

  const handleToggleOption = (value) => {
    if (!currentQuestion) return;

    if (currentQuestion.isMulti) {
      const field = currentQuestion.id;
      const currentList = preferences[field] || [];
      const updated = currentList.includes(value)
        ? currentList.filter((v) => v !== value)
        : [...currentList, value];

      setPreferences((prev) => ({
        ...prev,
        [field]: updated,
      }));
    } else {
      // Single select: intensity or seasons
      if (currentQuestion.id === "intensity") {
        setPreferences((prev) => ({
          ...prev,
          intensity: prev.intensity === value ? null : value,
        }));
      } else if (currentQuestion.id === "seasons") {
        setPreferences((prev) => ({
          ...prev,
          seasons: prev.seasons.includes(value) ? [] : [value],
        }));
      }
    }
  };

  // Determine if current question has been answered
  const isCurrentQuestionAnswered = () => {
    if (!currentQuestion) return false;
    if (currentQuestion.id === "scentFamilies") {
      return preferences.scentFamilies.length > 0;
    }
    if (currentQuestion.id === "intensity") {
      return Boolean(preferences.intensity);
    }
    if (currentQuestion.id === "moods") {
      return preferences.moods.length > 0;
    }
    if (currentQuestion.id === "occasions") {
      return preferences.occasions.length > 0;
    }
    if (currentQuestion.id === "seasons") {
      return preferences.seasons.length > 0;
    }
    return false;
  };

  // Navigation handlers
  const handleBegin = () => {
    setStage("quiz");
    setCurrentStep(0);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      setStage("intro");
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleContinue = () => {
    if (!isCurrentQuestionAnswered()) return;

    if (currentStep < QUESTIONS.length - 1) {
      setCurrentStep((prev) => prev + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      // Final Question Answered -> Run Engine
      runRecommendations();
    }
  };

  const runRecommendations = () => {
    const results = getFragranceRecommendations(products, preferences, {
      limit: 3,
    });
    setRecommendations(results);
    setStage("results");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleStartOver = () => {
    setPreferences({
      scentFamilies: [],
      intensity: null,
      moods: [],
      occasions: [],
      seasons: [],
    });
    setRecommendations([]);
    setCurrentStep(0);
    setStage("intro");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleRefineAnswers = () => {
    setStage("quiz");
    setCurrentStep(0);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const hasAnswer = isCurrentQuestionAnswered();

  return (
    <div className="bg-[#0D0D0C] text-[#F2EEE7] selection:bg-[#BFA27A]/30 selection:text-[#F2EEE7]">
      <SEO
        title="Find Your Scent | SCENTÉ Pakistan"
        description="Discover the SCENTÉ fragrance that matches your preferred scent family, intensity, mood, occasion and season."
        canonicalUrl="https://scente.pk/find-your-scent"
        keywords="find your scent, fragrance recommendation, perfume finder Pakistan, scent consultation, SCENTÉ"
      />

      <div className="layout-container pt-8 sm:pt-12 md:pt-16 pb-12 sm:pb-16 md:pb-20">
        <AnimatePresence mode="wait">
          {/* ================================================================ */}
          {/* STAGE 1: INTRO                                                   */}
          {/* ================================================================ */}
          {stage === "intro" && (
            <motion.div
              key="intro"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.6, ease: LUXURY_EASE }}
              className="max-w-2xl mx-auto text-center flex flex-col items-center"
            >
              <span className="text-[10px] sm:text-[11px] uppercase font-sans tracking-[0.24em] text-[#BFA27A] font-medium block mb-2.5 sm:mb-3">
                Bespoke Fragrance Consultation
              </span>

              <h1 className="font-serif font-light text-3xl sm:text-4xl md:text-5xl text-[#F2EEE7] tracking-headline leading-[1.1] mb-4 sm:mb-5">
                Find Your <span className="italic font-normal">Scent</span>
              </h1>

              <p className="text-sm sm:text-base font-sans text-[#AAA49B] font-light leading-relaxed max-w-lg mb-6 sm:mb-8">
                Tell us what you're looking for. We'll match you with a SCENTÉ fragrance that fits your preferences.
              </p>

              {/* Loading / Error / Primary CTA */}
              {isLoadingCatalog ? (
                <div className="flex items-center space-x-3 text-xs uppercase tracking-widest text-[#AAA49B] py-4">
                  <Loader2 className="w-4 h-4 animate-spin text-[#BFA27A]" />
                  <span>Preparing Fragrance Atelier...</span>
                </div>
              ) : catalogError ? (
                <div className="p-4 bg-[#141312] border border-red-500/20 rounded-xl text-center max-w-md">
                  <div className="flex items-center justify-center space-x-2 text-red-400 text-xs mb-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{catalogError}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => window.location.reload()}
                    className="text-xs uppercase tracking-wider text-[#BFA27A] hover:underline"
                  >
                    Reload Page
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  id="finder-begin-btn"
                  onClick={handleBegin}
                  className="inline-flex items-center justify-center px-7 sm:px-9 py-3.5 sm:py-4 rounded-xl border border-[rgba(242,238,231,0.20)] hover:border-[#BFA27A] hover:text-[#BFA27A] hover:bg-[#161513]/60 active:scale-[0.99] font-sans text-xs uppercase tracking-[0.18em] text-[#F2EEE7] font-medium transition-all duration-300 group cursor-pointer"
                >
                  <span>Begin</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-2.5 transition-transform duration-300 group-hover:translate-x-1.5 text-[#BFA27A]" />
                </button>
              )}

              {/* Sub-consultation meta */}
              <div className="mt-8 sm:mt-10 pt-6 sm:pt-7 border-t border-white/[0.06] w-full grid grid-cols-3 gap-4 text-center">
                <div>
                  <span className="block font-serif text-lg text-[#F2EEE7] font-light">05</span>
                  <span className="text-[10px] uppercase font-sans tracking-wider text-[#777169]">
                    Questions
                  </span>
                </div>
                <div>
                  <span className="block font-serif text-lg text-[#F2EEE7] font-light">Direct</span>
                  <span className="text-[10px] uppercase font-sans tracking-wider text-[#777169]">
                    Matching
                  </span>
                </div>
                <div>
                  <span className="block font-serif text-lg text-[#F2EEE7] font-light">Instant</span>
                  <span className="text-[10px] uppercase font-sans tracking-wider text-[#777169]">
                    Matching
                  </span>
                </div>
              </div>
            </motion.div>
          )}

          {/* ================================================================ */}
          {/* STAGE 2: QUIZ STEPS                                              */}
          {/* ================================================================ */}
          {stage === "quiz" && currentQuestion && (
            <motion.div
              key={`question-${currentStep}`}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -14 }}
              transition={{ duration: 0.45, ease: LUXURY_EASE }}
              className="max-w-3xl mx-auto w-full"
            >
              {/* Quiz Header & Progress */}
              <div className="mb-6 sm:mb-8">
                <div className="flex items-center justify-between mb-2.5 text-xs font-sans tracking-widest text-[#AAA49B]">
                  <span className="uppercase text-[10px] sm:text-[11px] tracking-[0.2em] text-[#BFA27A] font-medium">
                    Question {String(currentStep + 1).padStart(2, "0")} of {String(QUESTIONS.length).padStart(2, "0")}
                  </span>
                  <span className="font-serif text-sm text-[#F2EEE7]">
                    {String(currentStep + 1).padStart(2, "0")} / {String(QUESTIONS.length).padStart(2, "0")}
                  </span>
                </div>

                {/* Refined progress bar */}
                <div
                  className="w-full bg-white/[0.06] h-[2px] rounded-full overflow-hidden"
                  role="progressbar"
                  aria-valuenow={currentStep + 1}
                  aria-valuemin={1}
                  aria-valuemax={QUESTIONS.length}
                  aria-label={`Quiz progress: question ${currentStep + 1} of ${QUESTIONS.length}`}
                >
                  <div
                    className="bg-[#BFA27A] h-full transition-all duration-500 ease-out"
                    style={{
                      width: `${((currentStep + 1) / QUESTIONS.length) * 100}%`,
                    }}
                  />
                </div>
              </div>

              {/* Question Heading */}
              <div className="mb-6 sm:mb-7">
                <h2 className="font-serif font-light text-2xl sm:text-3xl md:text-4xl text-[#F2EEE7] tracking-headline leading-snug mb-2 sm:mb-3">
                  {currentQuestion.title}
                </h2>
                <p className="text-xs sm:text-sm font-sans text-[#AAA49B] font-light">
                  {currentQuestion.subtitle}
                  {currentQuestion.isMulti && (
                    <span className="ml-2 text-[#BFA27A] text-[11px] uppercase tracking-wider font-normal">
                      (Select all that apply)
                    </span>
                  )}
                </p>
              </div>

              {/* Options Grid */}
              <div
                className={`grid gap-3 sm:gap-4 mb-8 sm:mb-10 ${
                  currentQuestion.options.length <= 3
                    ? "grid-cols-1 sm:grid-cols-3"
                    : currentQuestion.options.length <= 6
                    ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
                    : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
                }`}
                role={currentQuestion.isMulti ? "group" : "radiogroup"}
                aria-label={currentQuestion.title}
              >
                {currentQuestion.options.map((option) => {
                  let isSelected = false;
                  if (currentQuestion.id === "scentFamilies") {
                    isSelected = preferences.scentFamilies.includes(option.value);
                  } else if (currentQuestion.id === "intensity") {
                    isSelected = preferences.intensity === option.value;
                  } else if (currentQuestion.id === "moods") {
                    isSelected = preferences.moods.includes(option.value);
                  } else if (currentQuestion.id === "occasions") {
                    isSelected = preferences.occasions.includes(option.value);
                  } else if (currentQuestion.id === "seasons") {
                    isSelected = preferences.seasons.includes(option.value);
                  }

                  return (
                    <button
                      key={option.value}
                      type="button"
                      role={currentQuestion.isMulti ? "checkbox" : "radio"}
                      aria-checked={isSelected}
                      onClick={() => handleToggleOption(option.value)}
                      className={`relative flex flex-col justify-between p-4 sm:p-5 rounded-xl border text-left transition-all duration-200 cursor-pointer focus-visible:ring-1 focus-visible:ring-[#BFA27A] focus-visible:outline-none ${
                        isSelected
                          ? "border-[#BFA27A] bg-[#BFA27A]/[0.08] shadow-[0_0_20px_rgba(191,162,122,0.12)] text-[#F2EEE7]"
                          : "border-white/[0.08] bg-[#121110] text-[#AAA49B] hover:border-white/[0.18] hover:text-[#F2EEE7] hover:bg-[#161513]"
                      }`}
                    >
                      <div className="flex items-start justify-between w-full mb-3">
                        <span className={`font-serif text-base sm:text-lg font-light ${isSelected ? "text-[#F2EEE7]" : "text-[#E6E1D8]"}`}>
                          {option.label}
                        </span>

                        {/* Accessible Indicator */}
                        <div
                          className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all shrink-0 ml-2 mt-0.5 ${
                            isSelected
                              ? "bg-[#BFA27A] border-[#BFA27A] text-[#090908]"
                              : "border-white/20 bg-transparent"
                          }`}
                          aria-hidden="true"
                        >
                          {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                        </div>
                      </div>

                      {option.desc && (
                        <p className="text-[11px] sm:text-xs font-sans text-[#8E887F] font-light leading-relaxed">
                          {option.desc}
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Navigation Controls */}
              <div className="flex items-center justify-between pt-6 border-t border-white/[0.06]">
                <button
                  type="button"
                  id="quiz-back-btn"
                  onClick={handleBack}
                  className="inline-flex items-center text-xs uppercase tracking-[0.16em] text-[#AAA49B] hover:text-[#F2EEE7] transition-colors duration-200 py-3 px-2 group cursor-pointer focus-visible:ring-1 focus-visible:ring-[#BFA27A] focus-visible:outline-none"
                >
                  <ArrowLeft className="w-3.5 h-3.5 mr-2 transition-transform duration-200 group-hover:-translate-x-1" />
                  <span>Back</span>
                </button>

                <button
                  type="button"
                  id="quiz-continue-btn"
                  disabled={!hasAnswer}
                  onClick={handleContinue}
                  className={`inline-flex items-center justify-center px-6 sm:px-8 py-3.5 rounded-xl border text-xs uppercase tracking-[0.16em] font-medium transition-all duration-200 group cursor-pointer focus-visible:ring-1 focus-visible:ring-[#BFA27A] focus-visible:outline-none ${
                    hasAnswer
                      ? "border-[#BFA27A] text-[#090908] bg-[#BFA27A] hover:bg-[#D4BA94] hover:border-[#D4BA94] active:scale-[0.99] shadow-lg shadow-[#BFA27A]/10"
                      : "border-white/[0.08] text-[#55504A] bg-[#141312] cursor-not-allowed opacity-50"
                  }`}
                >
                  <span>{currentStep === QUESTIONS.length - 1 ? "Find My Scent" : "Continue"}</span>
                  <ArrowRight
                    className={`w-3.5 h-3.5 ml-2 transition-transform duration-200 ${
                      hasAnswer ? "group-hover:translate-x-1" : ""
                    }`}
                  />
                </button>
              </div>
            </motion.div>
          )}

          {/* ================================================================ */}
          {/* STAGE 3: RESULTS                                                 */}
          {/* ================================================================ */}
          {stage === "results" && (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.6, ease: LUXURY_EASE }}
              className="max-w-5xl mx-auto w-full"
            >
              {/* Results Heading */}
              <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-12">
                <span className="text-[10px] sm:text-[11px] uppercase font-sans tracking-[0.24em] text-[#BFA27A] font-medium block mb-2 sm:mb-2.5">
                  Olfactive Recommendations
                </span>
                <h1 className="font-serif font-light text-3xl sm:text-4xl md:text-5xl text-[#F2EEE7] tracking-headline mb-3 sm:mb-4">
                  Your SCENTÉ <span className="italic font-normal">Matches</span>
                </h1>
                <p className="text-xs sm:text-sm font-sans text-[#AAA49B] font-light leading-relaxed">
                  We found these fragrances based on your preferences.
                </p>
              </div>

              {/* Case A: Results Found */}
              {recommendations.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 mb-14">
                  {recommendations.map((product, idx) => {
                    const matchScore = product.recommendation?.matchScore ?? 0;
                    const explanation = buildMatchExplanation(product, preferences);
                    const primaryImg = product.image || product.primary_image;
                    const optimizedImg = getOptimizedImageUrl(primaryImg, { width: 600, quality: 80 });

                    return (
                      <article
                        key={product.id || product.slug}
                        className="group flex flex-col justify-between bg-[#121110] border border-white/[0.08] hover:border-[#BFA27A]/50 rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-[0_16px_40px_rgba(0,0,0,0.6)]"
                      >
                        {/* Image Link */}
                        <Link
                          to={`/product/${product.slug}`}
                          className="relative aspect-square bg-[#141312] overflow-hidden block focus:outline-none"
                          tabIndex={-1}
                          aria-hidden="true"
                        >
                          {optimizedImg ? (
                            <img
                              src={optimizedImg}
                              alt={`${product.name} - ${product.subtitle || "Extrait de Parfum"}`}
                              loading="lazy"
                              decoding="async"
                              className="w-full h-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105 opacity-90 group-hover:opacity-100"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[#777169] text-xs uppercase tracking-widest">
                              Atelier Bottle
                            </div>
                          )}

                          {/* Match Score Badge */}
                          <div className="absolute top-3 right-3 z-10">
                            <span className="inline-flex items-center text-[10px] uppercase font-sans tracking-[0.16em] bg-[#090908]/90 backdrop-blur-sm text-[#BFA27A] border border-[#BFA27A]/30 px-2.5 py-1 rounded-full font-medium shadow-md">
                              <Sparkles className="w-2.5 h-2.5 mr-1 text-[#BFA27A]" />
                              {matchScore}% match
                            </span>
                          </div>

                          {/* Rank Pill */}
                          <div className="absolute top-3 left-3 z-10">
                            <span className="text-[10px] uppercase font-sans tracking-widest bg-[#090908]/80 text-[#AAA49B] px-2 py-0.5 rounded-full border border-white/10">
                              #{idx + 1} Match
                            </span>
                          </div>
                        </Link>

                        {/* Content */}
                        <div className="p-5 sm:p-6 flex flex-col flex-grow justify-between">
                          <div>
                            {/* Subtitle / Concentration */}
                            <span className="text-[10px] uppercase font-sans tracking-[0.2em] text-[#BFA27A] font-medium block mb-1">
                              {product.subtitle || "Extrait de Parfum"}
                            </span>

                            {/* Product Name */}
                            <h3 className="font-serif text-xl sm:text-2xl text-[#F2EEE7] font-light mb-2">
                              <Link
                                to={`/product/${product.slug}`}
                                className="hover:text-[#BFA27A] transition-colors duration-200 focus-visible:ring-1 focus-visible:ring-[#BFA27A] focus-visible:outline-none"
                              >
                                {product.name}
                              </Link>
                            </h3>

                            {/* Price */}
                            <p className="font-serif text-base text-[#E6E1D8] mb-3">
                              {product.formattedPrice || (product.price ? `PKR ${Number(product.price).toLocaleString()}` : "")}
                            </p>

                            {/* Match Explanation */}
                            <div className="bg-[#181714] border border-white/[0.04] rounded-lg p-3 mb-4">
                              <p className="text-xs font-sans text-[#AAA49B] font-light leading-relaxed">
                                {explanation}
                              </p>
                            </div>

                            {/* Product description excerpt */}
                            {product.description && (
                              <p className="text-xs font-sans text-[#777169] line-clamp-2 leading-relaxed mb-4">
                                {product.description}
                              </p>
                            )}
                          </div>

                          {/* CTA Link to existing Product Details */}
                          <Link
                            to={`/product/${product.slug}`}
                            className="inline-flex items-center justify-center w-full py-3 px-4 rounded-xl border border-[rgba(242,238,231,0.14)] hover:border-[#BFA27A] hover:text-[#BFA27A] hover:bg-[#161513]/40 text-[#F2EEE7] font-sans text-xs uppercase tracking-[0.16em] font-medium transition-all duration-200 group/link focus-visible:ring-1 focus-visible:ring-[#BFA27A] focus-visible:outline-none"
                          >
                            <span>Explore Fragrance</span>
                            <ArrowRight className="w-3.5 h-3.5 ml-2 transition-transform duration-200 group-hover/link:translate-x-1" />
                          </Link>
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : (
                /* Case B: No Match Fallback State */
                <div className="p-8 sm:p-12 bg-[#121110] border border-white/[0.08] rounded-2xl text-center max-w-xl mx-auto mb-14">
                  <div className="w-12 h-12 rounded-full bg-white/[0.04] border border-white/10 flex items-center justify-center mx-auto mb-4 text-[#BFA27A]">
                    <Sparkles className="w-5 h-5 stroke-[1.5]" />
                  </div>
                  <h3 className="font-serif text-2xl text-[#F2EEE7] font-light mb-2">
                    Nothing matched your preferences closely enough.
                  </h3>
                  <p className="text-xs sm:text-sm font-sans text-[#AAA49B] font-light leading-relaxed max-w-md mx-auto mb-8">
                    We could not find an exact match for your specific combination. Try broadening your scent family, mood, or intensity selections to explore other Extraits in our cellar.
                  </p>
                  <button
                    type="button"
                    onClick={handleStartOver}
                    className="inline-flex items-center justify-center px-8 py-3.5 rounded-xl border border-[#BFA27A] text-[#090908] bg-[#BFA27A] hover:bg-[#D4BA94] hover:border-[#D4BA94] font-sans text-xs uppercase tracking-[0.16em] font-medium transition-all duration-200 cursor-pointer"
                  >
                    <span>Try Again</span>
                  </button>
                </div>
              )}

              {/* Bottom Actions: Refine or Start Over */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-6 border-t border-white/[0.06]">
                <button
                  type="button"
                  onClick={handleRefineAnswers}
                  className="inline-flex items-center text-xs uppercase tracking-[0.16em] text-[#AAA49B] hover:text-[#BFA27A] transition-colors duration-200 py-2.5 px-4 rounded-lg border border-white/[0.08] hover:border-[#BFA27A]/40 group cursor-pointer focus-visible:ring-1 focus-visible:ring-[#BFA27A] focus-visible:outline-none"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 mr-2 transition-transform duration-200 group-hover:rotate-12" />
                  <span>Refine Your Answers</span>
                </button>

                <button
                  type="button"
                  onClick={handleStartOver}
                  className="inline-flex items-center text-xs uppercase tracking-[0.16em] text-[#AAA49B] hover:text-[#F2EEE7] transition-colors duration-200 py-2.5 px-4 group cursor-pointer focus-visible:ring-1 focus-visible:ring-[#BFA27A] focus-visible:outline-none"
                >
                  <RotateCcw className="w-3.5 h-3.5 mr-2 transition-transform duration-200 group-hover:-rotate-45" />
                  <span>Start Over</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
