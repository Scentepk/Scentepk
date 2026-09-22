import React from "react";
import { Link } from "react-router-dom";
import ScrollReveal from "./ScrollReveal";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-[#080807] text-[#F2EEE7] pt-16 sm:pt-20 pb-10 sm:pb-12 border-t border-[rgba(242,238,231,0.06)]">
      <div className="layout-container space-y-12 sm:space-y-16">
        {/* Main Footer Grid Layout (Brand + Explore + Client Care + Legal) */}
        <ScrollReveal className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 md:gap-8 lg:gap-12 xl:gap-14 items-start pb-12 sm:pb-16 border-b border-[rgba(242,238,231,0.06)]">

          {/* 1. BRAND AREA (Left Column) */}
          <div className="md:col-span-2 lg:col-span-4 space-y-3.5">
            <Link to="/" className="inline-block group focus:outline-none">
              <span className="font-serif font-medium text-2xl sm:text-[28px] tracking-[0.24em] text-[#F2EEE7] group-hover:text-[#BFA27A] transition-colors duration-300 block leading-none">
                SCENTÉPK
              </span>
            </Link>
            <p className="text-[9.5px] uppercase font-sans tracking-[0.22em] text-[#BFA27A] font-medium leading-relaxed">
              HAUTE PARFUMERIE • PURE EXTRAITS
            </p>
            <p className="font-serif italic text-sm text-[#AAA49B] font-light leading-relaxed max-w-xs pt-1">
              “Crafted with intention. Made to be remembered.”
            </p>
          </div>

          {/* 2. EXPLORE (Middle Column) */}
          <div className="md:col-span-1 lg:col-span-2 space-y-4 sm:space-y-5">
            <h4 className="text-[10.5px] sm:text-[11px] font-sans uppercase tracking-[0.22em] text-[#F2EEE7] font-medium leading-none">
              EXPLORE
            </h4>
            <ul className="space-y-1.5 text-[12px] font-sans tracking-[0.06em] font-light">
              <li>
                <Link
                  to="/shop"
                  className="text-[#AAA49B] hover:text-[#BFA27A] transition-colors duration-200 block py-1.5 whitespace-nowrap"
                >
                  Shop
                </Link>
              </li>
              <li>
                <Link
                  to="/about"
                  className="text-[#AAA49B] hover:text-[#BFA27A] transition-colors duration-200 block py-1.5 whitespace-nowrap"
                >
                  About
                </Link>
              </li>
            </ul>
          </div>

          {/* 3. CLIENT CARE (Middle/Right Column) */}
          <div className="md:col-span-1 lg:col-span-3 space-y-4 sm:space-y-5">
            <h4 className="text-[10.5px] sm:text-[11px] font-sans uppercase tracking-[0.22em] text-[#F2EEE7] font-medium leading-none">
              CLIENT CARE
            </h4>
            <ul className="space-y-1.5 text-[12px] font-sans tracking-[0.06em] font-light">
              <li>
                <Link
                  to="/track"
                  className="text-[#AAA49B] hover:text-[#BFA27A] transition-colors duration-200 block py-1.5 whitespace-nowrap"
                >
                  Track Order
                </Link>
              </li>
              <li>
                <Link
                  to="/contact"
                  className="text-[#AAA49B] hover:text-[#BFA27A] transition-colors duration-200 block py-1.5 whitespace-nowrap"
                >
                  Contact
                </Link>
              </li>
              <li>
                <Link
                  to="/delivery-returns"
                  className="text-[#AAA49B] hover:text-[#BFA27A] transition-colors duration-200 block py-1.5 whitespace-nowrap"
                >
                  Delivery & Returns
                </Link>
              </li>
              <li>
                <Link
                  to="/cod-guide"
                  className="text-[#AAA49B] hover:text-[#BFA27A] transition-colors duration-200 block py-1.5 whitespace-nowrap"
                >
                  COD Guide
                </Link>
              </li>
            </ul>
          </div>

          {/* 4. LEGAL (Right Column) */}
          <div className="md:col-span-1 lg:col-span-3 space-y-4 sm:space-y-5">
            <h4 className="text-[10.5px] sm:text-[11px] font-sans uppercase tracking-[0.22em] text-[#F2EEE7] font-medium leading-none">
              LEGAL
            </h4>
            <ul className="space-y-1.5 text-[12px] font-sans tracking-[0.06em] font-light">
              <li>
                <Link
                  to="/privacy"
                  className="text-[#AAA49B] hover:text-[#BFA27A] transition-colors duration-200 block py-1.5 whitespace-nowrap"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  to="/terms"
                  className="text-[#AAA49B] hover:text-[#BFA27A] transition-colors duration-200 block py-1.5 whitespace-nowrap"
                >
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link
                  to="/authenticity"
                  className="text-[#AAA49B] hover:text-[#BFA27A] transition-colors duration-200 block py-1.5 whitespace-nowrap"
                >
                  Authenticity Guarantee
                </Link>
              </li>
            </ul>
          </div>

        </ScrollReveal>

        {/* BOTTOM BAR (Copyright Left, Social Icons Right) */}
        <div className="flex flex-col sm:flex-row items-center justify-between text-[10.5px] font-sans uppercase tracking-[0.16em] text-[#777169] gap-4 pt-2 text-center sm:text-left">
          <div className="flex items-center space-x-3">
            <p>© {currentYear} SCENTÉPK PARFUMS. ALL RIGHTS RESERVED.</p>
          </div>

          {/* 4 Circular Social Icons (Instagram, Facebook, TikTok, WhatsApp) */}
          <div className="flex items-center space-x-3">
            {/* Instagram */}
            <a
              href="https://www.instagram.com/scentepk/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="SCENTÉPK Instagram Profile"
              className="w-9 h-9 sm:w-8 sm:h-8 rounded-full border border-[rgba(242,238,231,0.18)] flex items-center justify-center text-[#AAA49B] hover:text-[#BFA27A] hover:border-[#BFA27A] hover:bg-[#181714] transition-all duration-300 focus:outline-none"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
              </svg>
            </a>

            {/* Facebook */}
            <a
              href="https://www.facebook.com/people/Scente-Pk/61579229135561/?mibextid=wwXIfr&rdid=zcqC2T5gKBIbeTJK&share_url=https%3A%2F%2Fwww.facebook.com%2Fshare%2F1FLbFQVT1t%2F%3Fmibextid%3DwwXIfr%26utm_source%3Dig%26utm_medium%3Dsocial%26utm_content%3Dlink_in_bio"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="SCENTÉPK Facebook Page"
              className="w-9 h-9 sm:w-8 sm:h-8 rounded-full border border-[rgba(242,238,231,0.18)] flex items-center justify-center text-[#AAA49B] hover:text-[#BFA27A] hover:border-[#BFA27A] hover:bg-[#181714] transition-all duration-300 focus:outline-none"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
              </svg>
            </a>

            {/* TikTok */}
            <a
              href="https://www.tiktok.com/@scente.pk?_t=ZS-8zw2sHXoXFC&fbclid=PAcGRvZgJleHRuA2FlbQIxMQBzcnRjBmFwcF9pZA85MzY2MTk3NDMzOTI0NTkAAafohWpxaFI9iUFhGgRV5gHxa6lknO0pLbA7ZcEu9w3i8R0s8GDN8Lml5iFidQ_aem_UT-MIoalpW7U_b2n2xU2Gw"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="SCENTÉPK TikTok Profile"
              className="w-9 h-9 sm:w-8 sm:h-8 rounded-full border border-[rgba(242,238,231,0.18)] flex items-center justify-center text-[#AAA49B] hover:text-[#BFA27A] hover:border-[#BFA27A] hover:bg-[#181714] transition-all duration-300 focus:outline-none"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
              </svg>
            </a>

            {/* WhatsApp */}
            <a
              href="https://wa.me/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="SCENTÉPK WhatsApp Concierge"
              className="w-9 h-9 sm:w-8 sm:h-8 rounded-full border border-[rgba(242,238,231,0.18)] flex items-center justify-center text-[#AAA49B] hover:text-[#BFA27A] hover:border-[#BFA27A] hover:bg-[#181714] transition-all duration-300 focus:outline-none"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
              </svg>
            </a>
          </div>
        </div>

      </div>
    </footer>
  );
}
