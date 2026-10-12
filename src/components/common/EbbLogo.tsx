"use client";

import React from "react";

interface EbbLogoProps {
  /**
   * Any CSS color string or hex value (e.g. "#facc15", "#f43f5e", "var(--ebb-primary)", "currentColor").
   * Defaults to "var(--ebb-primary)".
   */
  color?: string;
  className?: string;
  src?: string;
  alt?: string;
  style?: React.CSSProperties;
}

/**
 * EbbLogo renders the Eagleburger Band emblem tinted to any exact hex color or CSS variable
 * using CSS mask-image on the silhouette PNG asset.
 */
export default function EbbLogo({
  color = "var(--ebb-primary)",
  className = "w-8 h-8",
  src = "/images/eagleburger-logo.png",
  alt = "Eagleburger Band Logo",
  style,
}: EbbLogoProps) {
  return (
    <div
      role="img"
      aria-label={alt}
      suppressHydrationWarning
      className={`shrink-0 transition-colors duration-300 ${className}`}
      style={{
        backgroundColor: color,
        maskImage: `url('${src}')`,
        WebkitMaskImage: `url('${src}')`,
        maskSize: "contain",
        WebkitMaskSize: "contain",
        maskRepeat: "no-repeat",
        WebkitMaskRepeat: "no-repeat",
        maskPosition: "center",
        WebkitMaskPosition: "center",
        ...style,
      }}
    />
  );
}

