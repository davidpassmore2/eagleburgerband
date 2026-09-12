"use client";

import React, { useEffect, useState, useSyncExternalStore } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { AnnouncementBanner, SiteNavigationSchema } from "@/lib/schema/siteConfig";
import Link from "next/link";
import { Sparkles, Info, AlertTriangle, X, ArrowRight } from "lucide-react";

const emptySubscribe = () => () => {};

export default function PublicAnnouncementBanner() {
  const [banner, setBanner] = useState<AnnouncementBanner | null>(null);
  const [userDismissed, setUserDismissed] = useState(false);

  const sessionDismissed = useSyncExternalStore(
    emptySubscribe,
    () => {
      try {
        return typeof window !== "undefined" && sessionStorage.getItem("ebb_announcement_dismissed") === "true";
      } catch {
        return false;
      }
    },
    () => false
  );

  const dismissed = userDismissed || sessionDismissed;

  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, "site_navigation", "config"),
      (snap) => {
        if (snap.exists()) {
          const parsed = SiteNavigationSchema.safeParse(snap.data());
          if (parsed.success && parsed.data.announcementBanner.enabled) {
            setBanner(parsed.data.announcementBanner);
          } else {
            setBanner(null);
          }
        }
      },
      (err) => {
        console.warn("Announcement banner load notice:", err);
      }
    );

    return () => unsub();
  }, []);

  if (!banner || !banner.enabled || !banner.message?.trim() || dismissed) {
    return null;
  }

  const handleDismiss = () => {
    setUserDismissed(true);
    try {
      sessionStorage.setItem("ebb_announcement_dismissed", "true");
    } catch {
      // Ignore
    }
  };

  const getVariantStyles = () => {
    switch (banner.bannerType) {
      case "alert":
        return "bg-rose-950/90 text-rose-200 border-b border-rose-500/40";
      case "info":
        return "bg-sky-950/90 text-sky-200 border-b border-sky-500/40";
      case "highlight":
      default:
        return "bg-yellow-400 text-slate-950 font-semibold border-b border-yellow-500";
    }
  };

  const getIcon = () => {
    switch (banner.bannerType) {
      case "alert":
        return <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />;
      case "info":
        return <Info className="w-4 h-4 text-sky-400 shrink-0" />;
      case "highlight":
      default:
        return <Sparkles className="w-4 h-4 text-slate-950 shrink-0" />;
    }
  };

  return (
    <div
      className={`px-4 py-2.5 text-xs transition-colors flex items-center justify-between gap-3 ${getVariantStyles()}`}
      role="alert"
      suppressHydrationWarning
    >
      <div className="max-w-7xl mx-auto flex items-center justify-center gap-2 flex-1 text-center">
        {getIcon()}
        <span>{banner.message}</span>
        {banner.linkHref && banner.linkText && (
          <Link
            href={banner.linkHref}
            suppressHydrationWarning
            className={`inline-flex items-center gap-1 underline underline-offset-2 font-bold ml-1 hover:opacity-80 transition ${
              banner.bannerType === "highlight" ? "text-slate-950" : "text-white"
            }`}
          >
            <span>{banner.linkText}</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        )}
      </div>

      <button
        type="button"
        onClick={handleDismiss}
        className="p-1 rounded-lg hover:opacity-70 transition shrink-0"
        title="Dismiss announcement"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
