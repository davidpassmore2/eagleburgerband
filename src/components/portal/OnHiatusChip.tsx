"use client";

import React from "react";
import { Coffee } from "lucide-react";

interface OnHiatusChipProps {
  className?: string;
  size?: "sm" | "md";
}

export default function OnHiatusChip({
  className = "",
  size = "sm",
}: OnHiatusChipProps) {
  return (
    <span
      title="On Hiatus"
      className={`inline-flex items-center gap-1 font-bold uppercase tracking-wider rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30 shrink-0 ${
        size === "md" ? "px-2.5 py-1 text-xs" : "px-2 py-0.5 text-[10px]"
      } ${className}`}
    >
      <Coffee
        className={
          size === "md"
            ? "w-3.5 h-3.5 text-purple-400 shrink-0"
            : "w-3 h-3 text-purple-400 shrink-0"
        }
      />
      <span>On Hiatus</span>
    </span>
  );
}

