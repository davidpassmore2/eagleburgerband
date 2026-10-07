"use client";

import React, { useState } from "react";
import { Star } from "lucide-react";

interface StarRatingProps {
  score?: number;
  count?: number;
  userRating?: number;
  interactive?: boolean;
  size?: "xs" | "sm" | "md" | "lg";
  showCount?: boolean;
  showScoreText?: boolean;
  onRate?: (stars: number) => void;
  className?: string;
  disabled?: boolean;
}

export default function StarRating({
  score = 0,
  count = 0,
  userRating,
  interactive = false,
  size = "sm",
  showCount = true,
  showScoreText = true,
  onRate,
  className = "",
  disabled = false,
}: StarRatingProps) {
  const [hoverRating, setHoverRating] = useState<number | null>(null);

  const starSizes = {
    xs: "w-3 h-3",
    sm: "w-3.5 h-3.5",
    md: "w-4 h-4",
    lg: "w-5 h-5",
  };

  const starClass = starSizes[size] || starSizes.sm;

  // If hovering, display hover value; else user's vote (if interactive) or average score
  const displayScore = hoverRating ?? (userRating && interactive ? userRating : score);

  return (
    <div className={`inline-flex items-center gap-1.5 ${className}`}>
      {/* 5 Stars Container */}
      <div 
        className="flex items-center gap-0.5"
        onMouseLeave={() => interactive && setHoverRating(null)}
      >
        {[1, 2, 3, 4, 5].map((starIndex) => {
          const isFilled = displayScore >= starIndex;
          const isHalf = !isFilled && displayScore >= starIndex - 0.5;

          return (
            <button
              key={starIndex}
              type="button"
              disabled={!interactive || disabled}
              onClick={() => {
                if (interactive && onRate && !disabled) {
                  onRate(starIndex);
                }
              }}
              onMouseEnter={() => {
                if (interactive && !disabled) {
                  setHoverRating(starIndex);
                }
              }}
              title={
                interactive
                  ? userRating === starIndex
                    ? `Remove your ${starIndex}-star rating`
                    : `Rate ${starIndex} star${starIndex > 1 ? "s" : ""}`
                  : `${score.toFixed(1)} out of 5 stars`
              }
              className={`${
                interactive && !disabled
                  ? "cursor-pointer transition-transform hover:scale-110 focus:outline-none focus:ring-1 focus:ring-amber-400 rounded-sm"
                  : "cursor-default"
              }`}
            >
              <Star
                className={`${starClass} transition-colors ${
                  isFilled
                    ? "text-amber-400 fill-amber-400"
                    : isHalf
                    ? "text-amber-400 fill-amber-400/50"
                    : "text-slate-600 fill-transparent"
                }`}
              />
            </button>
          );
        })}
      </div>

      {/* Numeric Score Text */}
      {showScoreText && (
        <span className="font-mono font-bold text-xs text-amber-400/90 ml-0.5">
          {score > 0 ? score.toFixed(1) : "—"}
        </span>
      )}

      {/* Rating Count */}
      {showCount && (
        <span className="font-mono text-[10px] text-slate-500">
          {count > 0 ? `(${count})` : "(No ratings)"}
        </span>
      )}

      {/* User's own badge or hover preview with fixed width */}
      {interactive ? (
        <span
          className={`text-[10px] font-mono px-1.5 py-0.5 rounded border text-center shrink-0 w-[58px] transition-colors ${
            hoverRating !== null
              ? "text-amber-400 bg-amber-400/10 border-amber-400/30 font-bold"
              : typeof userRating === "number" && userRating > 0
              ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20 font-bold"
              : "text-slate-500 bg-slate-950 border-slate-800"
          }`}
        >
          {hoverRating !== null
            ? `Vote: ${hoverRating}★`
            : typeof userRating === "number" && userRating > 0
            ? `Your: ${userRating}★`
            : "Rate"}
        </span>
      ) : (
        typeof userRating === "number" && userRating > 0 && (
          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 shrink-0 w-[58px] text-center">
            Your: {userRating}★
          </span>
        )
      )}
    </div>
  );
}
