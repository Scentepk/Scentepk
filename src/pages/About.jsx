import React from "react";
import SectionHeading from "../components/SectionHeading";
import ScrollReveal from "../components/ScrollReveal";
import Button from "../components/Button";
import { BRAND_VALUES } from "../data/products";
import SEO from "../components/SEO";

export default function About() {
  return (
    <div className="bg-[#0D0D0C] text-[#F2EEE7] min-h-screen">
      <SEO
        title="Brand Story — Heritage & Olfactive Ethos"
        description="Learn the ethos behind SCENTE: pure, high-concentration Extraits de Parfum formulated with 30-40% perfume oils, meticulous cellar maceration, and enduring sillage."
        canonicalUrl="https://scentepk.com/about"
        keywords="SCENTE story, luxury perfumery Pakistan, artisanal extrait de parfum, perfume maceration, Karachi fragrance"
      />
      <div className="layout-container py-14 sm:py-20">
        {/* Header */}
        <ScrollReveal className="max-w-3xl mb-14">
          <span className="text-[10px] sm:text-[11px] uppercase font-sans tracking-eyebrow text-[#BFA27A] block mb-3 font-medium">
            OUR HERITAGE
          </span>
          <h1 className="font-serif font-light text-fluid-display text-[#F2EEE7] tracking-headline mb-4 leading-[1.08]">
            The House of <span className="italic">SCENTEPK</span>
          </h1>
          <p className="text-sm sm:text-base font-sans text-[#AAA49B] font-light leading-[1.7]">
            SCENTEPK was founded on a simple, uncompromising ethos: to formulate pure, high-concentration Extraits de Parfum that honor ancient perfumery traditions while pushing the boundaries of modern sillage.
          </p>
        </ScrollReveal>

        {/* Brand Value Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-10 mb-20">
          {BRAND_VALUES.map((val, idx) => (
            <ScrollReveal
              key={val.number}
              delay={idx * 0.1}
              className="p-5 xs:p-6 sm:p-8 bg-[#121110] border border-[rgba(242,238,231,0.04)] flex flex-col justify-between transition-all duration-300 hover:border-[rgba(191,162,122,0.25)]"
            >
              <div>
                <span className="font-serif font-light text-3xl text-[#777169] block mb-4">
                  {val.number}
                </span>
                <h3 className="font-serif text-xl text-[#F2EEE7] mb-3 font-normal">
                  {val.title}
                </h3>
                <p className="text-xs sm:text-sm font-sans text-[#AAA49B] font-light leading-[1.6]">
                  {val.description}
                </p>
              </div>
            </ScrollReveal>
          ))}
        </div>

        {/* Editorial Story: Craft & Concentration */}
        <section className="bg-[#121110] p-6 sm:p-14 border border-[rgba(242,238,231,0.06)] mb-14 sm:mb-20 font-sans">
          <div className="max-w-2xl space-y-6">
            <span className="text-[10px] sm:text-[11px] uppercase tracking-[0.24em] text-[#BFA27A] font-medium block">
              OUR CRAFT & CONCENTRATION
            </span>
            <h2 className="font-serif font-light text-3xl sm:text-4xl text-[#F2EEE7] tracking-headline leading-tight">
              Concentrated by Design
            </h2>
            <p className="text-sm sm:text-[15px] text-[#AAA49B] font-light leading-[1.8]">
              SCENTE compositions are crafted with a high concentration of fine perfume oils and given time to mature, allowing each fragrance to develop depth, character, and lasting presence on skin.
            </p>
            <div className="pt-2">
              <Button to="/shop" variant="solid">
                Explore the Archive
              </Button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
