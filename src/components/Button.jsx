import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

export default function Button({
  children,
  to,
  href,
  onClick,
  variant = "editorial", // "editorial" | "solid" | "outline" | "subtle"
  className = "",
  showArrow = true,
  type = "button",
  ...props
}) {
  const hasCustomPaddingX = /\bpx-/.test(className);
  const hasCustomPaddingY = /\bpy-/.test(className);
  const hasCustomTextSize = /\btext-(xs|sm|base|lg|xl|\[)/.test(className);
  const hasCustomTracking = /\btracking-/.test(className);
  const hasCustomRounded = /\brounded-/.test(className);

  const defaultPadding = `${hasCustomPaddingX ? "" : "px-7 sm:px-8"} ${hasCustomPaddingY ? "" : "py-3.5 sm:py-4"}`;
  const roundedClass = hasCustomRounded ? "" : "rounded-xl";
  const textClass = hasCustomTextSize ? "" : "text-[11px] sm:text-xs";
  const trackingClass = hasCustomTracking ? "" : "tracking-[0.14em]";

  const baseClasses =
    `inline-flex items-center justify-center select-none transition-all duration-300 font-sans ${trackingClass} uppercase ${textClass} cursor-pointer group focus:outline-none font-medium`;

  let variantClasses = "";
  if (variant === "editorial") {
    variantClasses =
      "text-[#F2EEE7] hover:text-[#BFA27A] font-medium py-2 relative after:content-[''] after:absolute after:bottom-0 after:left-0 after:w-full after:h-[1px] after:bg-[rgba(242,238,231,0.25)] hover:after:bg-[#BFA27A] after:transition-all after:duration-300";
  } else if (variant === "solid" || variant === "primary") {
    // Refined dark luxury CTA: thin ivory border, dark background, champagne hover
    variantClasses =
      `bg-transparent text-[#F2EEE7] ${defaultPadding} ${roundedClass} border border-[rgba(242,238,231,0.20)] hover:border-[#BFA27A] hover:text-[#BFA27A] hover:bg-[#161513]/40 active:scale-[0.99] font-normal transition-all duration-200`;
  } else if (variant === "outline") {
    variantClasses =
      `bg-transparent text-[#F2EEE7] ${roundedClass} border border-[rgba(242,238,231,0.14)] hover:border-[#BFA27A] hover:text-[#BFA27A] ${defaultPadding} transition-all duration-200`;
  } else if (variant === "subtle") {
    variantClasses =
      "text-[#AAA49B] hover:text-[#BFA27A] py-1 border-b border-transparent hover:border-[#BFA27A]/40 transition-colors duration-200";
  }

  const content = (
    <>
      <span>{children}</span>
      {showArrow && (
        <ArrowRight className="w-3 h-3 sm:w-3.5 sm:h-3.5 ml-2 sm:ml-2.5 transition-transform duration-300 ease-out group-hover:translate-x-1.5 stroke-[1.4] shrink-0" />
      )}
    </>
  );

  if (to) {
    return (
      <Link
        to={to}
        className={`${baseClasses} ${variantClasses} ${className}`}
        {...props}
      >
        {content}
      </Link>
    );
  }

  if (href) {
    return (
      <a
        href={href}
        className={`${baseClasses} ${variantClasses} ${className}`}
        target="_blank"
        rel="noopener noreferrer"
        {...props}
      >
        {content}
      </a>
    );
  }

  return (
    <button
      type={type}
      onClick={onClick}
      className={`${baseClasses} ${variantClasses} ${className}`}
      {...props}
    >
      {content}
    </button>
  );
}
