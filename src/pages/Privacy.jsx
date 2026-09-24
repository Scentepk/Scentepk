import React from "react";
import SectionHeading from "../components/SectionHeading";
import ScrollReveal from "../components/ScrollReveal";
import SEO from "../components/SEO";

export default function Privacy() {
  return (
    <div className="bg-[#0D0D0C] text-[#F2EEE7] min-h-screen">
      <SEO
        title="Privacy Policy — Data Protection & Confidentiality"
        description="Learn how SCENTÉPK safeguards your personal data, delivery records, and concierge communications. We maintain absolute client confidentiality."
        canonicalUrl="https://scente.pk/privacy"
      />
      <div className="layout-container py-16 sm:py-24">
        <SectionHeading
          eyebrow="LEGAL & PRIVACY"
          title="Privacy Policy"
          subtitle="How SCENTÉPK safeguards your personal data, order records, and concierge communications."
        />

        <div className="max-w-4xl mx-auto mt-12 space-y-8 font-sans text-xs text-[#AAA49B] leading-[1.8] font-light">
          <ScrollReveal delay={0.05} className="bg-[#121110] p-8 sm:p-10 border border-[rgba(242,238,231,0.08)] space-y-3">
            <h3 className="font-serif text-xl font-light text-[#F2EEE7]">1. Data Collection & Confidentiality</h3>
            <p>
              SCENTÉPK respects the privacy of every client. Personal information collected during checkout or consultation—including name, delivery address, phone number, and email—is strictly used for order processing, logistics dispatch, and private concierge communication.
            </p>
          </ScrollReveal>

          <ScrollReveal delay={0.12} className="bg-[#121110] p-8 sm:p-10 border border-[rgba(242,238,231,0.08)] space-y-3">
            <h3 className="font-serif text-xl font-light text-[#F2EEE7]">2. Logistics & COD Information</h3>
            <p>
              Address and contact details shared for Cash on Delivery (COD) orders are disclosed solely to courier partners for physical delivery across Pakistan. We never sell, rent, or trade client information to third-party marketing entities.
            </p>
          </ScrollReveal>

          <ScrollReveal delay={0.19} className="bg-[#121110] p-8 sm:p-10 border border-[rgba(242,238,231,0.08)] space-y-3">
            <h3 className="font-serif text-xl font-light text-[#F2EEE7]">3. Data Security & Concierge Enquiries</h3>
            <p>
              All digital transactions and private concierge messages are protected using modern encryption standards. For inquiries regarding your stored personal data, please contact scentepk@gmail.com.
            </p>
          </ScrollReveal>
        </div>
      </div>
    </div>
  );
}
