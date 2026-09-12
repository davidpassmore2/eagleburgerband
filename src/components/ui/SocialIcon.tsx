"use client";

import React from "react";
import { Globe } from "lucide-react";
import { SocialPlatform } from "@/lib/schema/siteConfig";

interface SocialIconProps {
  platform: SocialPlatform | string;
  className?: string;
}

export function SocialIcon({ platform, className = "w-4 h-4" }: SocialIconProps) {
  const normalized = platform.toLowerCase().trim();

  switch (normalized) {
    case "youtube":
      return (
        <svg
          className={className}
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
        </svg>
      );

    case "instagram":
      return (
        <svg
          className={className}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
          <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
          <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
        </svg>
      );

    case "facebook":
      return (
        <svg
          className={className}
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      );

    case "tiktok":
      return (
        <svg
          className={className}
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.298-.002.595.042.88.13V9.4a6.33 6.33 0 0 0-1-.08A6.34 6.34 0 0 0 3 15.66a6.34 6.34 0 0 0 10.82 4.47 6.27 6.27 0 0 0 1.86-4.47V8.69a8.18 8.18 0 0 0 4.78 1.52V6.76c-.29-.01-.58-.03-.87-.07z" />
        </svg>
      );

    case "spotify":
      return (
        <svg
          className={className}
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.503 17.308a.747.747 0 0 1-1.028.248c-2.817-1.721-6.363-2.111-10.54-1.157a.749.749 0 0 1-.334-1.46c4.571-1.045 8.492-.596 11.654 1.341a.75.75 0 0 1 .248 1.028zm1.47-3.266a.936.936 0 0 1-1.287.308c-3.225-1.982-8.142-2.557-11.958-1.399a.937.937 0 0 1-.548-1.792c4.364-1.324 9.789-.684 13.485 1.595a.936.936 0 0 1 .308 1.288zm.126-3.41c-3.868-2.296-10.248-2.508-13.941-1.387a1.124 1.124 0 1 1-.655-2.151c4.246-1.29 11.287-1.041 15.742 1.604a1.125 1.125 0 0 1-1.146 1.934z" />
        </svg>
      );

    case "twitter":
    case "x":
      return (
        <svg
          className={className}
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      );

    default:
      return <Globe className={className} />;
  }
}

export function getSocialBrandColors(platform: SocialPlatform | string) {
  const normalized = platform.toLowerCase().trim();
  switch (normalized) {
    case "youtube":
      return {
        text: "text-red-400",
        hoverBorder: "hover:border-red-500/50",
        hoverBg: "hover:bg-red-500/10",
        hoverText: "hover:text-red-400",
      };
    case "instagram":
      return {
        text: "text-pink-400",
        hoverBorder: "hover:border-pink-500/50",
        hoverBg: "hover:bg-pink-500/10",
        hoverText: "hover:text-pink-400",
      };
    case "facebook":
      return {
        text: "text-blue-400",
        hoverBorder: "hover:border-blue-500/50",
        hoverBg: "hover:bg-blue-500/10",
        hoverText: "hover:text-blue-400",
      };
    case "tiktok":
      return {
        text: "text-cyan-400",
        hoverBorder: "hover:border-cyan-500/50",
        hoverBg: "hover:bg-cyan-500/10",
        hoverText: "hover:text-cyan-400",
      };
    case "spotify":
      return {
        text: "text-emerald-400",
        hoverBorder: "hover:border-emerald-500/50",
        hoverBg: "hover:bg-emerald-500/10",
        hoverText: "hover:text-emerald-400",
      };
    case "twitter":
    case "x":
      return {
        text: "text-slate-300",
        hoverBorder: "hover:border-slate-400/50",
        hoverBg: "hover:bg-white/10",
        hoverText: "hover:text-white",
      };
    default:
      return {
        text: "text-yellow-400",
        hoverBorder: "hover:border-yellow-400/50",
        hoverBg: "hover:bg-yellow-400/10",
        hoverText: "hover:text-yellow-400",
      };
  }
}

