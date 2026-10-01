"use client";

import React, { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { PageHeaderImage } from "@/lib/schema/page";
import { GlobalPageBanner, SiteNavigationSchema } from "@/lib/schema/siteConfig";
import { Sparkles } from "lucide-react";

interface PublicPageHeaderProps {
  headerImage?: PageHeaderImage | null;
  fallbackTitle?: string;
  fallbackSubtitle?: string;
  defaultTitle?: string;
  defaultDescription?: string;
}

export function usePageBanner(headerImage?: PageHeaderImage | null) {
  const [globalBanner, setGlobalBanner] = useState<GlobalPageBanner | null>(null);

  useEffect(() => {
    let isMounted = true;
    getDoc(doc(db, "site_navigation", "config"))
      .then((snap) => {
        if (!isMounted) return;
        if (snap.exists()) {
          const parsed = SiteNavigationSchema.safeParse(snap.data());
          if (parsed.success && parsed.data.globalPageBanner) {
            setGlobalBanner(parsed.data.globalPageBanner);
          }
        }
      })
      .catch((err) => console.warn("Public page banner load error:", err));

    return () => {
      isMounted = false;
    };
  }, []);

  const hasPageImage = Boolean(headerImage && headerImage.imageUrl && headerImage.imageUrl.trim());
  // Individual pages set specific banner images using resource assets.
  // If a page specifies headerImage, respect it directly.
  const activeBanner = hasPageImage
    ? headerImage
    : headerImage === undefined && globalBanner?.enabled && globalBanner.imageUrl
    ? globalBanner
    : null;
  const isBannerActive = Boolean(activeBanner && activeBanner.imageUrl && activeBanner.imageUrl.trim());

  return { isBannerActive, activeBanner, globalBanner };
}

export default function PublicPageHeader({
  headerImage,
  fallbackTitle,
  fallbackSubtitle,
  defaultTitle,
  defaultDescription,
}: PublicPageHeaderProps) {
  const { isBannerActive, activeBanner } = usePageBanner(headerImage);

  if (!isBannerActive || !activeBanner || !activeBanner.imageUrl) {
    return null;
  }

  const {
    imageUrl,
    altText = "Eagleburger Band Header",
    overlayOpacity = 60,
    headlineAlignment = "center",
    heightPreset = "standard",
    badgeText,
  } = activeBanner;

  const customTitle = "customTitle" in activeBanner ? activeBanner.customTitle : undefined;
  const customSubtitle = "customSubtitle" in activeBanner ? activeBanner.customSubtitle : undefined;

  const title = customTitle?.trim() || fallbackTitle?.trim() || defaultTitle?.trim();
  const subtitle = customSubtitle?.trim() || fallbackSubtitle?.trim() || defaultDescription?.trim();

  const heightClasses =
    heightPreset === "compact"
      ? "min-h-[220px] sm:min-h-[280px]"
      : heightPreset === "cinematic"
      ? "min-h-[420px] sm:min-h-[540px]"
      : "min-h-[300px] sm:min-h-[380px]";

  const alignmentClasses =
    headlineAlignment === "left"
      ? "text-left items-start"
      : headlineAlignment === "right"
      ? "text-right items-end"
      : "text-center items-center";

  const opacityDecimal = Math.max(0, Math.min(100, overlayOpacity)) / 100;

  return (
    <div
      className={`relative w-full overflow-hidden flex flex-col justify-center border-b border-slate-800 ${heightClasses}`}
      suppressHydrationWarning
    >
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt={altText || title || "Eagleburger Band Header"}
          className="w-full h-full object-cover object-center select-none"
          loading="eager"
        />
      </div>

      {/* Configurable Darkness / Tint Overlay */}
      <div
        className="absolute inset-0 z-10 transition-opacity duration-300"
        style={{ backgroundColor: `rgba(2, 6, 23, ${opacityDecimal})` }}
      />

      {/* Decorative Gradient Vignette at Top and Bottom for Smooth Blend */}
      <div className="absolute inset-0 z-10 bg-gradient-to-t from-slate-950 via-transparent to-black/40 pointer-events-none" />

      {/* Content Container */}
      <div
        className={`relative z-20 max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10 flex flex-col ${alignmentClasses} space-y-4`}
      >
        {badgeText?.trim() && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-yellow-400/20 border border-yellow-400/40 text-yellow-300 text-xs font-mono font-bold uppercase tracking-wider backdrop-blur-md shadow-lg">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{badgeText.trim()}</span>
          </div>
        )}

        {title && (
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-bold text-white uppercase tracking-tight leading-tight drop-shadow-md font-arvo">
            {title}
          </h1>
        )}

        {subtitle && (
          <p className="text-sm sm:text-base md:text-lg text-slate-200 max-w-2xl leading-relaxed drop-shadow font-medium">
            {subtitle}
          </p>
        )}
      </div>

      {/* Bottom Accent Line */}
      <div className="absolute bottom-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-yellow-400/60 to-transparent z-20 pointer-events-none" />
    </div>
  );
}
