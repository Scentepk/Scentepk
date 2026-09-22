import React, { useState } from "react";
import SectionHeading from "../components/SectionHeading";
import { Check, AlertCircle, Loader2 } from "lucide-react";
import ScrollReveal from "../components/ScrollReveal";
import CustomSelect from "../components/CustomSelect";
import Input from "../components/Input";
import Textarea from "../components/Textarea";
import { submitInquiry } from "../services/inquiries";
import { motion, AnimatePresence } from "framer-motion";
import SEO from "../components/SEO";

export default function Contact() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [subject, setSubject] = useState("Fragrance Consultation");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");

    if (!name.trim()) {
      setErrorMessage("Please enter your full name.");
      return;
    }
    if (!message.trim()) {
      setErrorMessage("Please enter your inquiry message.");
      return;
    }

    setIsSubmitting(true);
    const { data, error } = await submitInquiry({
      name,
      email,
      phone,
      subject,
      message,
    });
    setIsSubmitting(false);

    if (error) {
      setErrorMessage(error.message || "Failed to transmit inquiry. Please try again.");
    } else {
      setSubmitted(true);
      setName("");
      setEmail("");
      setPhone("");
      setMessage("");
      setTimeout(() => setSubmitted(false), 7000);
    }
  };

  const subjectOptions = [
    { value: "Fragrance Consultation", label: "Fragrance Consultation" },
    { value: "Order & Delivery Inquiry", label: "Order & Delivery Inquiry" },
    { value: "Corporate & Event Gifting", label: "Corporate & Event Gifting" },
    { value: "Press & Editorial", label: "Press & Editorial" },
  ];

  return (
    <div className="bg-[#0D0D0C] text-[#F2EEE7] min-h-screen">
      <SEO
        title="Private Concierge — Atelier Client Services"
        description="Connect with the SCENTÉPK private concierge for fragrance consultations, order inquiries, and bespoke corporate gifting across Pakistan."
        canonicalUrl="https://scente.pk/contact"
        keywords="contact SCENTÉPK, perfume concierge Pakistan, bespoke fragrance gifting, luxury customer service"
      />
      <div className="layout-container py-10 sm:py-16 lg:py-24">
        <SectionHeading
          eyebrow="CLIENT SERVICES & ATELIER"
          title="Private Concierge"
          subtitle="For personalized olfactive advice, corporate bespoke gifting, or urgent order tracking across Pakistan."
        />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 mt-8 sm:mt-12">
          {/* Left Form */}
          <ScrollReveal delay={0.08} className="lg:col-span-7 bg-[#121110] p-5 xs:p-6 sm:p-10 lg:p-12 border border-[rgba(242,238,231,0.08)] shadow-2xl">
            <h3 className="font-serif font-light text-xl sm:text-2xl text-[#F2EEE7] mb-6 tracking-headline">
              Transmit an Inquiry
            </h3>

            <form onSubmit={handleSubmit} className="space-y-6 font-sans">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] uppercase tracking-micro text-[#777169] mb-2 font-medium">
                    Full Name <span className="text-[#BFA27A]">*</span>
                  </label>
                  <Input
                    type="text"
                    required
                    surface="elevated"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your full name"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-micro text-[#777169] mb-2 font-medium">
                    Email Address
                  </label>
                  <Input
                    type="email"
                    surface="elevated"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your.email@domain.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] uppercase tracking-micro text-[#777169] mb-2 font-medium">
                    Phone / WhatsApp (Optional)
                  </label>
                  <Input
                    type="tel"
                    surface="elevated"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+92 300 0000000"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-micro text-[#777169] mb-2 font-medium">
                    Subject
                  </label>
                  <CustomSelect
                    value={subject}
                    onChange={setSubject}
                    options={subjectOptions}
                    placeholder="Select consultation subject"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-micro text-[#777169] mb-2 font-medium">
                  Message <span className="text-[#BFA27A]">*</span>
                </label>
                <Textarea
                  rows={5}
                  required
                  surface="elevated"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="How may our concierge assist you today?"
                />
              </div>

              <AnimatePresence>
                {errorMessage && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="p-4 bg-rose-950/20 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2"
                  >
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                    <span>{errorMessage}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:w-auto bg-transparent text-[#F2EEE7] border border-[rgba(242,238,231,0.22)] rounded-xl px-8 py-4 text-xs font-sans uppercase tracking-[0.14em] hover:border-[#BFA27A] hover:text-[#BFA27A] hover:bg-[#181714] disabled:opacity-40 transition-all duration-200 cursor-pointer font-medium flex items-center justify-center space-x-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-[#BFA27A]" />
                    <span>DISPATCHING INQUIRY...</span>
                  </>
                ) : (
                  <span>{submitted ? "Inquiry Dispatched" : "Send Inquiry →"}</span>
                )}
              </button>

              <AnimatePresence>
                {submitted && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center space-x-2 text-xs text-[#BFA27A] mt-3 p-3 bg-[#181714] border border-[#BFA27A]/30 rounded-lg"
                  >
                    <Check className="w-4 h-4 text-[#BFA27A] shrink-0" />
                    <span>Thank you. Your inquiry has been registered in the atelier system. Our concierge will respond within 24 hours.</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </form>
          </ScrollReveal>

          {/* Right Details */}
          <div className="lg:col-span-5 space-y-12">
            <ScrollReveal delay={0.16} className="space-y-6">
              <span className="text-[10px] sm:text-[11px] uppercase font-sans tracking-eyebrow text-[#BFA27A] block font-medium">
                DIRECT CHANNELS
              </span>
              <h4 className="font-serif font-light text-2xl text-[#F2EEE7] tracking-headline">
                Atelier Headquarters
              </h4>
              <p className="text-sm font-sans text-[#AAA49B] font-light leading-relaxed">
                SCENTÉPK Parfums operates an exclusive private blending atelier. Consultations and formulation visits are by verified appointment only.
              </p>

              <div className="space-y-4 pt-4 border-t border-[rgba(242,238,231,0.06)] font-sans text-xs">
                <div>
                  <span className="text-[10px] uppercase tracking-micro text-[#777169] block mb-1">
                    Direct Email
                  </span>
                  <a
                    href="mailto:concierge@scente-parfums.com"
                    className="text-[#F2EEE7] hover:text-[#BFA27A] transition-colors"
                  >
                    concierge@scente-parfums.com
                  </a>
                </div>

                <div>
                  <span className="text-[10px] uppercase tracking-micro text-[#777169] block mb-1">
                    Concierge WhatsApp / Hotline
                  </span>
                  <span className="text-[#F2EEE7] font-mono">
                    +92 300 0000000 (10:00 AM – 7:00 PM PKT)
                  </span>
                </div>

                <div>
                  <span className="text-[10px] uppercase tracking-micro text-[#777169] block mb-1">
                    Atelier Location
                  </span>
                  <span className="text-[#F2EEE7]">
                    Sector F-7/2, Islamabad, Pakistan
                  </span>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </div>
    </div>
  );
}
