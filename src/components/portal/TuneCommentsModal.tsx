"use client";

import React from "react";
import { X, Music2 } from "lucide-react";
import CommentsStream from "./CommentsStream";

interface TuneCommentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  tune: {
    id: string;
    title: string;
    artist?: string;
    keySignature?: string;
  } | null;
}

export default function TuneCommentsModal({
  isOpen,
  onClose,
  tune,
}: TuneCommentsModalProps) {
  if (!isOpen || !tune) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-yellow-400 bg-yellow-400/10 px-2 py-0.5 rounded border border-yellow-400/20">
                Chart Discussion
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

