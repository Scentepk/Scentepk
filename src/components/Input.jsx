import React, { forwardRef } from "react";

const Input = forwardRef(function Input(
  {
    type = "text",
    className = "",
    size = "default", // "default" (p-3.5) | "sm" | "compact" (p-2.5)
    surface = "deep", // "deep" (#0D0D0C) | "elevated" (#121110 / #181714)
    error = "",
    icon: Icon = null,
    iconPosition = "left", // "left" | "right"
    disabled = false,
    ...props
  },
  ref
) {
  const isCompact = size === "sm" || size === "compact";
  const bgClass =
    surface === "elevated"
      ? "bg-[#181714] input-surface-elevated"
      : "bg-[#0D0D0C]";

  const hasCustomTextSize = /\btext-(xs|sm|base|lg|xl|\d+)/.test(className);
  const textSizeClass = hasCustomTextSize ? "" : "text-base sm:text-xs";

  const paddingClass = isCompact
    ? Icon && iconPosition === "left"
      ? "py-2.5 pl-9 pr-3"
      : Icon && iconPosition === "right"
      ? "py-2.5 pl-3 pr-9"
      : "py-2.5 px-3.5"
    : Icon && iconPosition === "left"
    ? "py-3 sm:py-3.5 pl-10 pr-4"
    : Icon && iconPosition === "right"
    ? "py-3 sm:py-3.5 pl-4 pr-11"
    : "py-3 sm:py-3.5 px-4";

  const stateClass = error
    ? "border-rose-500/80 focus:border-rose-500 shadow-[0_0_0_1px_rgba(244,63,94,0.3)]"
    : "border-[rgba(242,238,231,0.12)] hover:border-[rgba(242,238,231,0.22)] focus:border-[#BFA27A] focus:shadow-[0_0_0_1px_rgba(191,162,122,0.35)]";

  const disabledClass = disabled
    ? "opacity-50 cursor-not-allowed pointer-events-none"
    : "";

  const containerRounded = className.includes("rounded-full")
    ? "rounded-full"
    : className.includes("rounded-2xl")
    ? "rounded-2xl"
    : className.includes("rounded-lg")
    ? "rounded-lg"
    : "rounded-xl";

  return (
    <div className={`relative w-full group ${containerRounded}`}>
      <input
        ref={ref}
        type={type}
        disabled={disabled}
        aria-invalid={Boolean(error)}
        className={`w-full ${bgClass} border rounded-xl font-sans text-[#F2EEE7] placeholder-[#777169] focus:outline-none transition-all duration-200 ${textSizeClass} ${paddingClass} ${stateClass} ${disabledClass} ${className}`}
        {...props}
      />
      {Icon && (
        <Icon
          className={`w-4 h-4 text-[#777169] group-focus-within:text-[#BFA27A] absolute top-1/2 -translate-y-1/2 pointer-events-none stroke-[1.5] transition-colors duration-200 ${
            iconPosition === "right" ? "right-3.5" : "left-3.5"
          }`}
        />
      )}
    </div>
  );
});

Input.displayName = "Input";

export default Input;
