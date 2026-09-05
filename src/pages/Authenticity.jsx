import React from "react";
import SectionHeading from "../components/SectionHeading";
import ScrollReveal from "../components/ScrollReveal";
import SEO from "../components/SEO";

export default function Authenticity() {
  return (
    <div className="bg-[#0D0D0C] text-[#F2EEE7] min-h-screen">
      <SEO
        title="Authenticity Guarantee — 30%+ Extrait de Parfum Standard"
        description="Every bottle of SCENTÉ is an unadulterated Extrait de Parfum crafted with 30%+ pure perfume oils, direct from our maison with tamper-evident batch certification."
        canonicalUrl="https://scente.pk/authenticity"
        keywords="authentic perfume Pakistan, pure perfume oil, original extrait de parfum, SCENTÉ authenticity guarantee, Grasse fragrance oils"
      />
      <div className="layout-container py-16 sm:py-24">
        <SectionHeading
          eyebrow="ATELIER STANDARDS"
          title="Authenticity Guarantee"
          subtitle="Every bottle of SCENTÉ is an unadulterated Extrait de Parfum crafted with 30%+ pure perfume oil."
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
          <ScrollReveal delay={0.05} className="bg-[#121110] p-8 border border-[rgba(242,238,231,0.08)] space-y-4">
            <span className="text-[10px] font-sans uppercase tracking-eyebrow text-[#BFA27A] font-medium block">
              30%+ OIL CONCENTRATION
            </span>
            <h3 className="font-serif text-xl font-light text-[#F2EEE7]">Extrait De Parfum Standard</h3>
            <p className="font-sans text-xs text-[#AAA49B] leading-relaxed font-light">
              Unlike diluted mass EDPs, every SCENTÉ composition contains 30% to 32% pure perfume oils sourced from Grasse and Florence for intimate skin projection and 12+ hour sillage.
            </p>
          </ScrollReveal>

          <ScrollReveal delay={0.12} className="bg-[#121110] p-8 border border-[rgba(242,238,231,0.08)] space-y-4">
            <span className="text-[10px] font-sans uppercase tracking-eyebrow text-[#BFA27A] font-medium block">
              ATELIER DIRECT
            </span>
            <h3 className="font-serif text-xl font-light text-[#F2EEE7]">Single-Source Atelier</h3>
            <p className="font-sans text-xs text-[#AAA49B] leading-relaxed font-light">
              We ship directly from our controlled maison facility. We do not distribute through third-party unverified channels, ensuring 100% genuine products.
            </p>
          </ScrollReveal>

          <ScrollReveal delay={0.19} className="bg-[#121110] p-8 border border-[rgba(242,238,231,0.08)] space-y-4">
            <span className="text-[10px] font-sans uppercase tracking-eyebrow text-[#BFA27A] font-medium block">
              BATCH CERTIFICATION
            </span>
            <h3 className="font-serif text-xl font-light text-[#F2EEE7]">Individual Batch Seals</h3>
            <p className="font-sans text-xs text-[#AAA49B] leading-relaxed font-light">
              Each flacon features an engraved batch code and tamper-evident house security seal, guaranteeing fresh maceration and original formulation.
            </p>
          </ScrollReveal>
        </div>
      </div>
    </div>
  );
}
