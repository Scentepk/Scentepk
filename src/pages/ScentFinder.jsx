import React, { useState } from "react";
import SectionHeading from "../components/SectionHeading";
import { PRODUCTS } from "../data/products";
import { ArrowRight, RotateCcw } from "lucide-react";
import Button from "../components/Button";
import { motion, AnimatePresence } from "framer-motion";
import { LUXURY_EASE } from "../lib/animations";
import SEO from "../components/SEO";

export default function ScentFinder() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});

  const questions = [
    {
      id: "mood",
      title: "What presence do you wish to project?",
      options: [
        { label: "Magnetic, deep, and smoky", value: "scente-noir" },
        { label: "Warm, radiant, and opulent", value: "scente-amber" },
        { label: "Clean, intimate, and serene", value: "scente-musk" },
      ],
    },
    {
      id: "occasion",
      title: "When will this fragrance most often accompany you?",
      options: [
        { label: "Nocturnal events, black-tie, and private dinners", value: "scente-noir" },
        { label: "Twilight gatherings, colder months, and special moments", value: "scente-amber" },
        { label: "Daily signature, linen shirts, and close encounters", value: "scente-musk" },
      ],
    },
    {
      id: "accord",
      title: "Which raw olfactive territory calls to you?",
      options: [
        { label: "Smoked Cardamom, Tuscan Leather & Aged Oud", value: "scente-noir" },
        { label: "Golden Amber, Bitter Almond & Madagascar Vanilla", value: "scente-amber" },
        { label: "Florentine Orris, Pure Molecular Musk & Virginian Cedar", value: "scente-musk" },
      ],
    },
  ];

  const handleSelect = (questionId, value) => {
    const nextAnswers = { ...answers, [questionId]: value };
    setAnswers(nextAnswers);
    if (step < questions.length - 1) {
      setStep(step + 1);
    } else {
      setStep(questions.length); // Results step
    }
  };

  const getRecommendation = () => {
    const scores = { "scente-noir": 0, "scente-amber": 0, "scente-musk": 0 };
    Object.values(answers).forEach((val) => {
      if (scores[val] !== undefined) scores[val] += 1;
    });

    let bestMatch = "scente-noir";
    let max = -1;
    Object.entries(scores).forEach(([key, val]) => {
      if (val > max) {
        max = val;
        bestMatch = key;
      }
    });

    return PRODUCTS.find((p) => p.slug === bestMatch) || PRODUCTS[0];
  };

  const recommendedProduct = getRecommendation();

  const resetFinder = () => {
    setStep(0);
    setAnswers({});
  };

  return (
    <div className="bg-[#0D0D0C] text-[#F2EEE7] min-h-screen">
      <SEO
        title="Scent Finder — Guided Fragrance Consultation"
        description="Discover your bespoke signature scent through SCENTÉ's guided fragrance consultation. Match your presence, notes, and aesthetic with handcrafted Extraits de Parfum."
        canonicalUrl="https://scente.pk/scent-finder"
        keywords="scent finder, fragrance quiz Pakistan, perfume consultation, find signature fragrance, luxury extrait"
      />
      <div className="layout-container py-16 sm:py-24">
        <div className="max-w-4xl mx-auto">
          <SectionHeading
            eyebrow="GUIDED OLFACTIVE CONSULTATION"
            title="Find Your Extrait Signature"
            subtitle="A three-step consultation to match your natural aura and aesthetic with a SCENTÉ composition."
            align="center"
          />

          <AnimatePresence mode="wait">
            {step < questions.length ? (
              <motion.div
                key={`step-${step}`}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.45, ease: LUXURY_EASE }}
                className="bg-[#121110] p-8 sm:p-14 border border-[rgba(242,238,231,0.08)] rounded-2xl mt-8 shadow-2xl transform-gpu"
              >
                <div className="flex items-center justify-between mb-8 pb-4 border-b border-[rgba(242,238,231,0.08)] text-[11px] font-sans tracking-micro uppercase text-[#777169]">
                  <span>STEP 0{step + 1} OF 0{questions.length}</span>
                  <span className="text-[#BFA27A] font-medium">ATELIER CONSULTATION</span>
                </div>

                <h3 className="font-serif font-light text-2xl sm:text-3xl text-[#F2EEE7] mb-8 tracking-headline">
                  {questions[step].title}
                </h3>

                <div className="flex flex-col space-y-4">
                  {questions[step].options.map((opt, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSelect(questions[step].id, opt.value)}
                      className="w-full text-left p-5 bg-[#181714] border border-[rgba(242,238,231,0.08)] hover:border-[#BFA27A] hover:bg-[#211F1B] rounded-xl transition-all duration-200 flex items-center justify-between text-sm sm:text-base font-sans text-[#F2EEE7] font-light cursor-pointer group"
                    >
                      <span>{opt.label}</span>
                      <ArrowRight className="w-4 h-4 text-[#777169] group-hover:text-[#BFA27A] group-hover:translate-x-1 transition-all duration-200" />
                    </button>
                  ))}
                </div>
              </motion.div>
            ) : (
              /* Results View */
              <motion.div
                key="results"
                initial={{ opacity: 0, scale: 0.98, y: 16 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.6, ease: LUXURY_EASE }}
                className="bg-[#121110] p-8 sm:p-14 border border-[rgba(242,238,231,0.08)] rounded-2xl mt-8 shadow-2xl transform-gpu"
              >
                <div className="text-center max-w-md mx-auto mb-10">
                  <span className="text-[10px] sm:text-[11px] uppercase font-sans tracking-eyebrow text-[#BFA27A] font-medium block mb-2">
                    YOUR OLFACTIVE PRESCRIPTION
                  </span>
                  <h3 className="font-serif font-light text-3xl sm:text-4xl text-[#F2EEE7] tracking-headline">
                    {recommendedProduct.name}
                  </h3>
                  <p className="text-xs font-sans text-[#AAA49B] tracking-micro uppercase mt-1">
                    {recommendedProduct.olfactiveFamily}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center bg-[#181714] p-6 border border-[rgba(242,238,231,0.08)] rounded-xl mb-8">
                  <div className="aspect-[4/5] bg-[#0D0D0C] rounded-lg overflow-hidden">
                    <img
                      src={recommendedProduct.image}
                      alt={recommendedProduct.name}
                      className="w-full h-full object-cover opacity-90"
                    />
                  </div>
                  <div className="flex flex-col justify-between h-full space-y-4 font-sans">
                    <p className="text-sm text-[#AAA49B] font-light leading-[1.6]">
                      {recommendedProduct.description}
                    </p>
                    <div className="text-xs text-[#AAA49B] space-y-1.5 border-t border-[rgba(242,238,231,0.08)] pt-3 leading-[1.6]">
                      <p><strong className="text-[#F2EEE7] font-medium">Top:</strong> {recommendedProduct.notes.top.join(", ")}</p>
                      <p><strong className="text-[#F2EEE7] font-medium">Heart:</strong> {recommendedProduct.notes.heart.join(", ")}</p>
                      <p><strong className="text-[#F2EEE7] font-medium">Base:</strong> {recommendedProduct.notes.base.join(", ")}</p>
                    </div>
                    <div className="pt-2">
                      <Button to={`/product/${recommendedProduct.slug}`} variant="solid">
                        Explore {recommendedProduct.name} ({recommendedProduct.formattedPrice})
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="text-center">
                  <button
                    onClick={resetFinder}
                    className="inline-flex items-center text-xs font-sans uppercase tracking-nav text-[#AAA49B] hover:text-[#BFA27A] transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5 mr-2" />
                    <span>Retake Consultation</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
