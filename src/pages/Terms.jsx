import React from "react";
import SectionHeading from "../components/SectionHeading";
import ScrollReveal from "../components/ScrollReveal";
import SEO from "../components/SEO";

export default function Terms() {
  return (
    <div className="bg-[#0D0D0C] text-[#F2EEE7] min-h-screen">
      <SEO
        title="Terms of Service — Legal & Purchase Policy"
        description="Terms governing the purchase of SCENTEPK Extrait de Parfum products, Cash on Delivery agreements, and website terms of service."
        canonicalUrl="https://scente.pk/terms"
      />
      <div className="layout-container py-16 sm:py-24">
        <SectionHeading
          eyebrow="LEGAL & COMPLIANCE"
          title="Terms of Service"
          subtitle="Terms governing the purchase of SCENTEPK Extrait de Parfum products and website usage."
        />

        <div className="max-w-4xl mx-auto mt-12 space-y-8 font-sans text-xs text-[#AAA49B] leading-[1.8] font-light">
          <ScrollReveal delay={0.05} className="bg-[#121110] p-8 sm:p-10 border border-[rgba(242,238,231,0.08)] space-y-3">
            <h3 className="font-serif text-xl font-light text-[#F2EEE7]">1. Orders & Pricing</h3>
            <p>
              All orders placed on scente.pk are subject to product availability and atelier confirmation. All prices are listed in Pakistani Rupees (PKR) and include standard taxes.
            </p>
          </ScrollReveal>

          <ScrollReveal delay={0.12} className="bg-[#121110] p-8 sm:p-10 border border-[rgba(242,238,231,0.08)] space-y-3">
            <h3 className="font-serif text-xl font-light text-[#F2EEE7]">2. Cash on Delivery Policy</h3>
            <p>
              By selecting Cash on Delivery (COD), the client agrees to provide valid contact information and accept delivery upon presentation of the parcel by courier representatives.
            </p>
          </ScrollReveal>

          <ScrollReveal delay={0.19} className="bg-[#121110] p-8 sm:p-10 border border-[rgba(242,238,231,0.08)] space-y-3">
            <h3 className="font-serif text-xl font-light text-[#F2EEE7]">3. Intellectual Property</h3>
            <p>
              The SCENTEPK name, trademark, olfactive descriptions, bottle designs, and website content are the exclusive intellectual property of SCENTEPK Parfums. Unauthorized reproduction is strictly prohibited.
            </p>
          </ScrollReveal>
        </div>
      </div>
    </div>
  );
}
