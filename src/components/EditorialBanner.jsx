import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import {
  getEditorialBannerSettings,
  LOCAL_STORAGE_EDITORIAL_BANNER_KEY,
  EDITORIAL_BANNER_UPDATE_EVENT,
  DEFAULT_EDITORIAL_BANNER_SETTINGS,
} from "../services/editorialBanner";
import { LUXURY_EASE } from "../lib/animations";

export default function EditorialBanner() {
  const [settings, setSettings] = useState(() => {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_EDITORIAL_BANNER_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return DEFAULT_EDITORIAL_BANNER_SETTINGS;
  });

  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    // 1. Initial background fetch from Supabase
    getEditorialBannerSettings().then(({ data }) => {
      if (data) {
        setSettings(data);
        setImageFailed(false);
      }
    });

    // 2. Real-time same-window custom event listener
    const handleBannerUpdate = (e) => {
      if (e.detail) {
        setSettings(e.detail);
        setImageFailed(false);
      }
    };

    // 3. Real-time cross-tab storage event listener
    const handleStorageChange = (e) => {
      if (e.key === LOCAL_STORAGE_EDITORIAL_BANNER_KEY && e.newValue) {
        try {
          setSettings(JSON.parse(e.newValue));
          setImageFailed(false);
        } catch (err) {}
      }
    };

    window.addEventListener(EDITORIAL_BANNER_UPDATE_EVENT, handleBannerUpdate);
    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener(EDITORIAL_BANNER_UPDATE_EVENT, handleBannerUpdate);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  // 1. Hidden if disabled by administrator
  if (!settings.is_active) {
    return null;
  }

  // 2. Fallback: hide gracefully if image is missing or errored
  if (imageFailed || !settings.image_url) {
    return null;
  }

  const hasOverlayContent = Boolean(
    settings.title?.trim() || settings.subtitle?.trim() || settings.button_text?.trim()
  );

  return (
    <section
      aria-label="SCENTEPK Campaign Editorial"
      className="relative w-full overflow-hidden bg-[#090908] border-y border-white/[0.06] select-none"
    >
      {/* Full-bleed edge-to-edge container: adapts dynamically to the image's natural aspect ratio so 100% of the original image is visible with ZERO top/bottom/side crop */}
      <div className="relative w-full overflow-hidden bg-[#090908]">
        <picture className="w-full block">
          {settings.mobile_image_url && (
            <source
              media="(max-width: 767px)"
              srcSet={settings.mobile_image_url}
            />
          )}
          {/* Natural full-width uncropped image: completely static, zero zoom/scale/transform, no distortion */}
          <img
            src={settings.image_url}
            alt="SCENTEPK Parfums Editorial Campaign"
            loading="lazy"
            decoding="async"
            onError={() => setImageFailed(true)}
            className="w-full h-auto block select-none pointer-events-none"
          />
        </picture>

        {/* Cinematic atmospheric depth vignette */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-black/30 pointer-events-none" />

        {/* Optional HTML Text Overlay (Empty/disabled by default unless configured by Admin) */}
        {hasOverlayContent && (
          <div className="absolute inset-0 flex items-center justify-center text-center z-10 px-4 sm:px-8 md:px-12 py-6 sm:py-12">
            <div className="max-w-2xl mx-auto flex flex-col items-center space-y-3 sm:space-y-4">
              {settings.title && (
                <motion.h2
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.1, ease: LUXURY_EASE }}
                  className="font-serif font-light text-2xl xs:text-3xl sm:text-4xl lg:text-5xl text-[#F2EEE7] tracking-headline leading-tight drop-shadow-lg"
                >
                  {settings.title}
                </motion.h2>
              )}

              {settings.subtitle && (
                <motion.p
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.18, ease: LUXURY_EASE }}
                  className="text-xs xs:text-sm sm:text-base font-sans text-[#D4CEC5] font-light leading-relaxed max-w-md drop-shadow-md"
                >
                  {settings.subtitle}
                </motion.p>
              )}

              {settings.button_text && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.26, ease: LUXURY_EASE }}
                  className="pt-2 sm:pt-3"
                >
                  <Link
                    to={settings.button_link || "/shop"}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#F2EEE7] text-[#090908] hover:bg-[#BFA27A] hover:text-[#090908] text-xs uppercase font-sans tracking-[0.18em] font-semibold transition-all duration-300 shadow-xl"
                  >
                    <span>{settings.button_text}</span>
                    <ArrowRight className="w-3.5 h-3.5 stroke-[2]" />
                  </Link>
                </motion.div>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
