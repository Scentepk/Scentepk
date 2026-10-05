import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import ScrollReveal from "../components/ScrollReveal";
import { LUXURY_EASE } from "../lib/animations";
import SEO from "../components/SEO";

export default function CodGuide() {
  const steps = [
    {
      number: "01",
      title: "PLACE YOUR ORDER",
      description:
        "Select your fragrance, choose your bottle size, and complete the checkout with your delivery details.",
    },
    {
      number: "02",
      title: "ORDER CONFIRMATION",
      description:
        "Your order is reviewed and confirmed by the SCENTEPK team.",
    },
    {
      number: "03",
      title: "YOUR ORDER SHIPS",
      description:
        "Once confirmed, your fragrance is dispatched through the available courier service.",
    },
    {
      number: "04",
      title: "RECEIVE & PAY",
      description:
        "Receive your order at your delivery address and pay the exact order amount in cash to the courier.",
    },
  ];

  const expectations = [
    "Cash on Delivery is available across Pakistan with zero prepayment required.",
    "No advance online payment or digital card transaction is necessary to complete your order.",
    "Your order details, bottle selection, and total amount are confirmed before dispatch.",
    "Shipments typically arrive within 2–4 business days across major cities and nationwide districts.",
    "Customers should keep the required cash amount ready when the courier arrives.",
  ];

  return (
    <div className="bg-[#0D0D0C] text-[#F2EEE7] min-h-screen">
      <SEO
        title="Cash on Delivery Guide — Seamless Payment on Arrival"
        description="Learn how Cash on Delivery works at SCENTEPK. Zero advance payment required; inspect and pay in cash only when your sealed parcel arrives."
        canonicalUrl="https://scente.pk/cod-guide"
        keywords="cash on delivery perfume Pakistan, COD fragrance guide, pay on delivery perfume, no advance payment"
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
              CASH ON DELIVERY
            </span>
            <h1 className="font-serif font-light text-3xl sm:text-4xl lg:text-5xl text-[#F2EEE7] tracking-headline leading-[1.12]">
              A Simple, Secure Way to Receive Your Fragrance
            </h1>
            <p className="font-sans text-sm sm:text-base text-[#AAA49B] font-light leading-[1.75] max-w-2xl pt-1">
              SCENTEPK offers Cash on Delivery across Pakistan, allowing customers to pay when their order arrives.
            </p>
          </motion.div>
        </section>

        {/* 2. HOW IT WORKS */}
        <section className="mb-20 sm:mb-28">
          <ScrollReveal className="mb-10 sm:mb-14">
            <span className="text-[10px] sm:text-[11px] uppercase font-sans tracking-[0.22em] text-[#777169] font-medium block mb-2">
              THE PROCESS
            </span>
            <h2 className="font-serif font-light text-2xl sm:text-3xl text-[#F2EEE7] tracking-headline">
              HOW IT WORKS
            </h2>
          </ScrollReveal>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-10 border-t border-[rgba(242,238,231,0.06)] pt-10 sm:pt-12">
            {steps.map((step, idx) => (
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

        {/* 3. WHAT TO EXPECT */}
        <section className="mb-20 sm:mb-28 border-t border-[rgba(242,238,231,0.06)] pt-14 sm:pt-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 items-start">
            <div className="lg:col-span-4">
              <ScrollReveal>
                <span className="text-[10px] sm:text-[11px] uppercase font-sans tracking-[0.22em] text-[#777169] font-medium block mb-2">
                  CLIENT EXPERIENCE
                </span>
                <h2 className="font-serif font-light text-2xl sm:text-3xl text-[#F2EEE7] tracking-headline">
                  WHAT TO EXPECT
                </h2>
              </ScrollReveal>
            </div>

            <div className="lg:col-span-8">
              <ScrollReveal delay={0.08} className="divide-y divide-[rgba(242,238,231,0.06)]">
                {expectations.map((item, idx) => (
                  <div key={idx} className="py-4 sm:py-5 first:pt-0 flex items-start space-x-4">
                    <span className="text-[#BFA27A] font-serif text-base shrink-0 leading-none pt-1">
                      ·
                    </span>
                    <p className="font-sans text-xs sm:text-sm text-[#AAA49B] font-light leading-[1.75]">
                      {item}
                    </p>
                  </div>
                ))}
              </ScrollReveal>
            </div>
          </div>
        </section>

        {/* 4. BEFORE YOUR ORDER ARRIVES */}
        <section className="mb-20 sm:mb-28 border-t border-[rgba(242,238,231,0.06)] pt-14 sm:pt-20">
          <ScrollReveal className="mb-10 sm:mb-14">
            <span className="text-[10px] sm:text-[11px] uppercase font-sans tracking-[0.22em] text-[#777169] font-medium block mb-2">
              PREPARATION
            </span>
            <h2 className="font-serif font-light text-2xl sm:text-3xl text-[#F2EEE7] tracking-headline">
              BEFORE YOUR ORDER ARRIVES
            </h2>
          </ScrollReveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 lg:gap-10">
            <ScrollReveal delay={0.05} className="bg-[#121110] p-7 sm:p-8 border border-[rgba(242,238,231,0.06)] rounded-sm space-y-3">
              <h3 className="font-serif text-lg sm:text-xl font-normal text-[#F2EEE7]">
                Keep the payment ready
              </h3>
              <p className="font-sans text-xs sm:text-[13px] text-[#AAA49B] font-light leading-[1.7]">
                Have the exact or sufficient amount available when your order arrives.
              </p>
            </ScrollReveal>

            <ScrollReveal delay={0.12} className="bg-[#121110] p-7 sm:p-8 border border-[rgba(242,238,231,0.06)] rounded-sm space-y-3">
              <h3 className="font-serif text-lg sm:text-xl font-normal text-[#F2EEE7]">
                Keep your phone accessible
              </h3>
              <p className="font-sans text-xs sm:text-[13px] text-[#AAA49B] font-light leading-[1.7]">
                The courier may contact you to coordinate delivery.
              </p>
            </ScrollReveal>

            <ScrollReveal delay={0.19} className="bg-[#121110] p-7 sm:p-8 border border-[rgba(242,238,231,0.06)] rounded-sm space-y-3">
              <h3 className="font-serif text-lg sm:text-xl font-normal text-[#F2EEE7]">
                Check your delivery details
              </h3>
              <p className="font-sans text-xs sm:text-[13px] text-[#AAA49B] font-light leading-[1.7]">
                Make sure your address and contact information are correct when placing the order.
              </p>
            </ScrollReveal>
          </div>
        </section>

        {/* 5. IMPORTANT INFORMATION */}
        <section className="mb-20 sm:mb-28 border-t border-[rgba(242,238,231,0.06)] pt-14 sm:pt-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 items-start">
            <div className="lg:col-span-4">
              <ScrollReveal>
                <span className="text-[10px] sm:text-[11px] uppercase font-sans tracking-[0.22em] text-[#777169] font-medium block mb-2">
                  POLICIES & PROCEDURES
                </span>
                <h2 className="font-serif font-light text-2xl sm:text-3xl text-[#F2EEE7] tracking-headline">
                  IMPORTANT INFORMATION
                </h2>
              </ScrollReveal>
            </div>

            <div className="lg:col-span-8 space-y-8">
              <ScrollReveal delay={0.06} className="space-y-2 border-b border-[rgba(242,238,231,0.06)] pb-6">
                <h3 className="font-sans text-xs sm:text-[13px] uppercase tracking-[0.16em] text-[#BFA27A] font-medium">
                  ORDER CHANGES
                </h3>
                <p className="font-sans text-xs sm:text-sm text-[#AAA49B] font-light leading-[1.75]">
                  If you need to make changes to your order, contact SCENTE as soon as possible.
                </p>
              </ScrollReveal>

              <ScrollReveal delay={0.12} className="space-y-2 border-b border-[rgba(242,238,231,0.06)] pb-6">
                <h3 className="font-sans text-xs sm:text-[13px] uppercase tracking-[0.16em] text-[#BFA27A] font-medium">
                  DELIVERY ATTEMPTS
                </h3>
                <p className="font-sans text-xs sm:text-sm text-[#AAA49B] font-light leading-[1.75]">
                  If you are unavailable when the courier arrives, the courier may make another delivery attempt according to their standard process.
                </p>
              </ScrollReveal>

              <ScrollReveal delay={0.18} className="space-y-2">
                <h3 className="font-sans text-xs sm:text-[13px] uppercase tracking-[0.16em] text-[#BFA27A] font-medium">
                  ORDER CANCELLATION
                </h3>
                <p className="font-sans text-xs sm:text-sm text-[#AAA49B] font-light leading-[1.75]">
                  Pending orders can be cancelled directly through the Track Order page using your Order Reference Number and contact phone number, or by contacting our team before your fragrance is dispatched.
                </p>
              </ScrollReveal>
            </div>
          </div>
        </section>


        {/* 7. CONTACT SECTION (NEED ASSISTANCE) */}
        <section className="border-t border-[rgba(242,238,231,0.06)] pt-12 sm:pt-16 text-center max-w-2xl mx-auto space-y-4">
          <ScrollReveal>
            <span className="text-[10px] uppercase font-sans tracking-[0.22em] text-[#777169] font-medium block mb-2">
              PRIVATE CONCIERGE
            </span>
            <h3 className="font-serif font-light text-xl sm:text-2xl text-[#F2EEE7] tracking-headline">
              NEED ASSISTANCE?
            </h3>
            <p className="font-sans text-xs sm:text-[13px] text-[#AAA49B] font-light leading-[1.7] max-w-md mx-auto pt-1">
              If you have a question about your order or delivery, contact the SCENTE team.
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
