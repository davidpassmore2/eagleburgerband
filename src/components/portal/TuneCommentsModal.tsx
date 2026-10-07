"use client";

import React from "react";
import { X, Music2, Star } from "lucide-react";
import CommentsStream from "./CommentsStream";
import StarRating from "./StarRating";

interface TuneCommentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  tune: {
    id: string;
    title: string;
    artist?: string;
    keySignature?: string;
    ratings?: Record<string, number>;
    ratingAverage?: number;
    ratingCount?: number;
  } | null;
  currentUserId?: string;
  onRate?: (tuneId: string, stars: number) => void;
}

export default function TuneCommentsModal({
  isOpen,
  onClose,
  tune,
  currentUserId,
  onRate,
}: TuneCommentsModalProps) {
  if (!isOpen || !tune) return null;

  const userRating = currentUserId && tune.ratings ? tune.ratings[currentUserId] : undefined;
  const ratingAverage = tune.ratingAverage || 0;
  const ratingCount = tune.ratingCount || 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-yellow-400 bg-yellow-400/10 px-2 py-0.5 rounded border border-yellow-400/20">
                Chart Rating & Discussion
              </span>
              {tune.keySignature && (
                <span className="text-[10px] font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                  {tune.keySignature}
                </span>
              )}
            </div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Music2 className="w-5 h-5 text-yellow-400 shrink-0" />
              {tune.title}
            </h2>
            {tune.artist && (
              <p className="text-xs text-slate-400">By {tune.artist}</p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Member Rating & Score Card */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-inner">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Catalog Score
              </span>
            </div>
            <div className="flex items-center gap-2">
              <StarRating
                score={ratingAverage}
                count={ratingCount}
                size="md"
                showCount={true}
                showScoreText={true}
              />
            </div>
            <p className="text-[11px] text-slate-400">
              {ratingCount > 0
                ? `Calculated from ${ratingCount} member vote${ratingCount === 1 ? "" : "s"}`
                : "No member ratings yet. Be the first to rate!"}
            </p>
          </div>

          {/* Interactive Member Rating Picker */}
          {onRate && currentUserId && (
            <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-3 flex flex-col items-start sm:items-end gap-1 shrink-0 w-full sm:w-[215px]">
              <span className="text-[11px] font-semibold text-slate-300">
                {userRating ? "Your Rating:" : "Rate This Song (1-5):"}
              </span>
              <StarRating
                score={ratingAverage}
                count={ratingCount}
                userRating={userRating}
                interactive={true}
                size="md"
                showCount={false}
                showScoreText={false}
                onRate={(stars) => onRate(tune.id, stars)}
              />
              <span className="text-[10px] text-slate-500 font-mono">
                {userRating ? `Rated ${userRating}★ (click to toggle)` : "Click stars to vote"}
              </span>
            </div>
          )}
        </div>

        {/* Discussion Stream */}
        <div className="pt-1">
          <CommentsStream
            targetType="tune"
            targetId={tune.id}
            targetTitle={tune.title}
          />
        </div>
      </div>
    </div>
  );
}

