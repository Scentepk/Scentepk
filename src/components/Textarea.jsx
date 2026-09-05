import React, { forwardRef } from "react";

const Textarea = forwardRef(function Textarea(
  {
    className = "",
    rows = 4,
    surface = "deep", // "deep" (#0D0D0C) | "elevated" (#181714)
    error = "",
    disabled = false,
    ...props
  },
  ref
) {
  const bgClass =
    surface === "elevated"
      ? "bg-[#181714] input-surface-elevated"
      : "bg-[#0D0D0C]";

  const stateClass = error
    ? "border-rose-500/80 focus:border-rose-500 shadow-[0_0_0_1px_rgba(244,63,94,0.3)]"
    : "border-[rgba(242,238,231,0.12)] hover:border-[rgba(242,238,231,0.22)] focus:border-[#BFA27A] focus:shadow-[0_0_0_1px_rgba(191,162,122,0.35)]";

  const disabledClass = disabled
    ? "opacity-50 cursor-not-allowed pointer-events-none"
    : "";

  return (
    <textarea
      ref={ref}
      rows={rows}
      disabled={disabled}
      aria-invalid={Boolean(error)}
      className={`w-full ${bgClass} border rounded-xl p-3.5 text-xs font-sans text-[#F2EEE7] placeholder-[#777169] focus:outline-none leading-relaxed resize-none transition-all duration-200 ${stateClass} ${disabledClass} ${className}`}
      {...props}
    />
  );
});

Textarea.displayName = "Textarea";

export default Textarea;
