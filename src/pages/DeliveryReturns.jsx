import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import ScrollReveal from "../components/ScrollReveal";
import { LUXURY_EASE } from "../lib/animations";
import SEO from "../components/SEO";

export default function DeliveryReturns() {
  const returnSteps = [
    {
      number: "01",
      title: "CONTACT US",
      description: "Contact the SCENTEPK team through the existing contact/inquiry system.",
    },
    {
      number: "02",
      title: "SHARE YOUR ORDER DETAILS",
      description: "Provide your Order Reference Number and the information requested by the team.",
    },
    {
      number: "03",
      title: "REVIEW",
      description: "Our team reviews the request according to the applicable return policy.",
    },
    {
      number: "04",
      title: "RESOLUTION",
      description: "If approved, the return/refund process follows the applicable policy.",
    },
  ];

  const eligibilityCriteria = [
    {
      label: "Condition",
      detail: "Flacons must be completely unopened with security seals unbroken and intact.",
    },
    {
      label: "Packaging",
      detail: "Must be in original bespoke protective housing and protective encasings.",
    },
    {
      label: "Timeline",
      detail: "Requests must be initiated within 7 days of delivery confirmation.",
    },
    {
      label: "Verification",
      detail: "A valid Order Reference Number and registered contact details are required.",
    },
  ];

  return (
    <div className="bg-[#0D0D0C] text-[#F2EEE7] min-h-screen">
      <SEO
        title="Delivery & Returns — Shipping & Transit Logistics"
        description="Comprehensive guide to SCENTEPK express courier shipping, transit timelines across Pakistan, secure packaging, and return policies."
        canonicalUrl="https://scente.pk/delivery-returns"
        keywords="SCENTEPK delivery, perfume shipping Pakistan, return policy, delivery times Karachi Lahore Islamabad"
      />
      <div className="layout-container py-14 sm:py-20">
        {/* 1. HERO SECTION */}
        <section className="border-b border-[rgba(242,238,231,0.06)] pb-12 sm:pb-16 mb-16 sm:mb-24">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: LUXURY_EASE }}
            className="max-w-3xl space-y-4 sm:space-y-5"
          >
            <span className="text-[10px] sm:text-[11px] uppercase font-sans tracking-[0.25em] text-[#BFA27A] font-medium block">
              DELIVERY & RETURNS
            </span>
            <h1 className="font-serif font-light text-3xl sm:text-4xl lg:text-5xl text-[#F2EEE7] tracking-headline leading-[1.12]">
              From Our Studio to Your Door
            </h1>
            <p className="font-sans text-sm sm:text-base text-[#AAA49B] font-light leading-[1.75] max-w-2xl pt-1">
              Everything you need to know about delivery, receiving your order, and returns at SCENTEPK.
            </p>
          </motion.div>
        </section>

        {/* 2. DELIVERY OVERVIEW */}
        <section className="mb-20 sm:mb-28">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 items-start">
            <div className="lg:col-span-4">
              <ScrollReveal>
                <span className="text-[10px] sm:text-[11px] uppercase font-sans tracking-[0.22em] text-[#777169] font-medium block mb-2">
                  DELIVERY
                </span>
                <h2 className="font-serif font-light text-2xl sm:text-3xl text-[#F2EEE7] tracking-headline">
                  Nationwide Delivery
                </h2>
              </ScrollReveal>
            </div>

            <div className="lg:col-span-8 space-y-6">
              <ScrollReveal delay={0.08} className="space-y-4">
                <p className="font-sans text-sm sm:text-[15px] text-[#AAA49B] font-light leading-[1.8]">
                  SCENTEPK delivers fragrances across Pakistan through its available courier network. Each composition is hand-checked and encased in protective housing before dispatch.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4">
                  <div className="p-6 bg-[#121110] border border-[rgba(242,238,231,0.06)] rounded-sm space-y-1.5">
                    <span className="text-[10px] uppercase font-sans tracking-[0.2em] text-[#777169] block font-medium">
                      Estimated Delivery
                    </span>
                    <p className="font-serif text-xl sm:text-2xl text-[#F2EEE7] font-light tracking-tight">
                      2–4 Business Days
                    </p>
                  </div>

                  <div className="p-6 bg-[#121110] border border-[rgba(242,238,231,0.06)] rounded-sm space-y-1.5">
                    <span className="text-[10px] uppercase font-sans tracking-[0.2em] text-[#777169] block font-medium">
                      Cash on Delivery
                    </span>
                    <p className="font-serif text-xl sm:text-2xl text-[#F2EEE7] font-light tracking-tight">
                      Available Nationwide
                    </p>
                  </div>
                </div>
              </ScrollReveal>
            </div>
          </div>
        </section>


        {/* 6. RETURNS OVERVIEW */}
        <section className="mb-20 sm:mb-28 border-t border-[rgba(242,238,231,0.06)] pt-14 sm:pt-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 items-start">
            <div className="lg:col-span-4">
              <ScrollReveal>
                <span className="text-[10px] sm:text-[11px] uppercase font-sans tracking-[0.22em] text-[#777169] font-medium block mb-2">
                  RETURNS
                </span>
                <h2 className="font-serif font-light text-2xl sm:text-3xl text-[#F2EEE7] tracking-headline">
                  A Considered Approach to Returns
                </h2>
              </ScrollReveal>
            </div>

            <div className="lg:col-span-8 space-y-4">
              <ScrollReveal delay={0.08}>
                <p className="font-sans text-sm sm:text-[15px] text-[#AAA49B] font-light leading-[1.8]">
                  Because fragrances are personal products, returns should follow SCENTEPK's actual return policy. To maintain integrity, hygiene, and authenticity, our return process adheres to strict quality standards.
                </p>
              </ScrollReveal>
            </div>
          </div>
        </section>

        {/* 7. RETURN ELIGIBILITY */}
        <section className="mb-20 sm:mb-28 border-t border-[rgba(242,238,231,0.06)] pt-14 sm:pt-20">
          <ScrollReveal className="mb-10 sm:mb-14">
            <span className="text-[10px] sm:text-[11px] uppercase font-sans tracking-[0.22em] text-[#777169] font-medium block mb-2">
              REQUIREMENTS
            </span>
            <h2 className="font-serif font-light text-2xl sm:text-3xl text-[#F2EEE7] tracking-headline">
              Return Eligibility
            </h2>
          </ScrollReveal>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 border-t border-[rgba(242,238,231,0.06)] pt-10 sm:pt-12">
            {eligibilityCriteria.map((item, idx) => (
              <ScrollReveal key={item.label} delay={idx * 0.08} className="space-y-2.5">
                <span className="text-[10.5px] uppercase font-sans tracking-[0.18em] text-[#BFA27A] font-medium block">
                  {item.label}
                </span>
                <p className="font-sans text-xs sm:text-[13px] text-[#AAA49B] font-light leading-[1.7]">
                  {item.detail}
                </p>
              </ScrollReveal>
            ))}
          </div>
        </section>

        {/* 8. HOW TO REQUEST A RETURN */}
        <section className="mb-20 sm:mb-28 border-t border-[rgba(242,238,231,0.06)] pt-14 sm:pt-20">
          <ScrollReveal className="mb-10 sm:mb-14">
            <span className="text-[10px] sm:text-[11px] uppercase font-sans tracking-[0.22em] text-[#777169] font-medium block mb-2">
              PROCEDURE
            </span>
            <h2 className="font-serif font-light text-2xl sm:text-3xl text-[#F2EEE7] tracking-headline">
              How to Request a Return
            </h2>
          </ScrollReveal>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-10 border-t border-[rgba(242,238,231,0.06)] pt-10 sm:pt-12">
            {returnSteps.map((step, idx) => (
              <ScrollReveal key={step.number} delay={idx * 0.08} className="space-y-3.5">
                <span className="font-serif text-2xl sm:text-3xl font-light text-[#BFA27A]/85 block tracking-tight">
                  {step.number}
                </span>
                <h3 className="font-sans text-xs sm:text-[12.5px] uppercase tracking-[0.16em] text-[#F2EEE7] font-medium">
                  {step.title}
                </h3>
                <p className="font-sans text-xs sm:text-[13px] text-[#AAA49B] font-light leading-[1.7]">
                  {step.description}
                </p>
              </ScrollReveal>
            ))}
          </div>
        </section>

        {/* 9. EXCHANGES / REFUNDS */}
        <section className="mb-20 sm:mb-28 border-t border-[rgba(242,238,231,0.06)] pt-14 sm:pt-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 items-start">
            <div className="lg:col-span-4">
              <ScrollReveal>
                <span className="text-[10px] sm:text-[11px] uppercase font-sans tracking-[0.22em] text-[#777169] font-medium block mb-2">
                  CLIENT RESOLUTION
                </span>
                <h2 className="font-serif font-light text-2xl sm:text-3xl text-[#F2EEE7] tracking-headline">
                  Exchanges & Refunds
                </h2>
              </ScrollReveal>
            </div>

            <div className="lg:col-span-8">
              <ScrollReveal delay={0.08} className="space-y-3">
                <p className="font-sans text-sm sm:text-[15px] text-[#AAA49B] font-light leading-[1.8]">
                  For questions regarding exchanges or refunds, please contact the SCENTEPK team with your Order Reference Number.
                </p>
              </ScrollReveal>
            </div>
          </div>
        </section>

        {/* 10. NEED ASSISTANCE? */}
        <section className="border-t border-[rgba(242,238,231,0.06)] pt-14 sm:pt-20 text-center max-w-2xl mx-auto space-y-4">
          <ScrollReveal>
            <span className="text-[10px] uppercase font-sans tracking-[0.22em] text-[#777169] font-medium block mb-2">
              PRIVATE CONCIERGE
            </span>
            <h3 className="font-serif font-light text-xl sm:text-2xl text-[#F2EEE7] tracking-headline">
              NEED ASSISTANCE?
            </h3>
            <p className="font-sans text-xs sm:text-[13px] text-[#AAA49B] font-light leading-[1.7] max-w-md mx-auto pt-1">
              Our team is here to help with questions about your delivery, order, or return.
            </p>
            <div className="pt-4">
              <Link
                to="/contact"
                className="inline-flex items-center text-xs uppercase font-sans tracking-[0.18em] text-[#F2EEE7] hover:text-[#BFA27A] border border-[rgba(242,238,231,0.18)] hover:border-[#BFA27A] py-2.5 px-6 rounded-lg transition-colors font-medium"
              >
                Contact Concierge
              </Link>
            </div>
          </ScrollReveal>
        </section>
      </div>
    </div>
  );
}
