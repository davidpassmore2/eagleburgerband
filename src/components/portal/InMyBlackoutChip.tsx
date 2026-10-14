"use client";

import React from "react";
import { Palmtree } from "lucide-react";

interface InMyBlackoutChipProps {
  className?: string;
  size?: "sm" | "md";
}

export default function InMyBlackoutChip({
  className = "",
  size = "sm",
}: InMyBlackoutChipProps) {
  return (
    <span
      title="in my blackout"
      className={`inline-flex items-center gap-1 font-bold uppercase tracking-wider rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 shrink-0 ${
        size === "md" ? "px-2.5 py-1 text-xs" : "px-2 py-0.5 text-[10px]"
      } ${className}`}
    >
      <Palmtree className={size === "md" ? "w-3.5 h-3.5 text-amber-400 shrink-0" : "w-3 h-3 text-amber-400 shrink-0"} />
      <span>in my blackout</span>
    </span>
  );
}

