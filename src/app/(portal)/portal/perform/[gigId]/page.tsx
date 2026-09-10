"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { 
  ArrowLeft, 
  ExternalLink, 
  Loader2, 
  Radio, 
  Sparkles,
  Zap
} from "lucide-react";

interface SetlistEntry {
  songId: string;
  title: string;
  keySignature: string;
  tempoBpm: number;
  notes?: string;
  driveLink?: string;
}

interface GigDetails {
  title: string;
  venue?: string;
  date?: string;
}

export default function OnStagePerformancePage({
  params,
}: {
  params: Promise<{ gigId: string }>;
}) {
  const resolvedParams = use(params);
  const gigId = resolvedParams.gigId;

  const [tunes, setTunes] = useState<SetlistEntry[]>([]);
  const [gig, setGig] = useState<GigDetails | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Listen to Gig Details
    const unsubGig = onSnapshot(doc(db, "gigs", gigId), (snap) => {
      if (snap.exists()) {
        const d = snap.data();
        setGig({
          title: d.title || d.publicDetails?.title || "Eagleburger Live",
          venue: d.venue || d.publicDetails?.venue || "",
          date: d.date || "",
        });
      }
    });

    // 2. Listen to Setlist
    const unsubSetlist = onSnapshot(doc(db, "setlists", gigId), (snap) => {
      if (snap.exists()) {
        const d = snap.data();
        setTunes(Array.isArray(d.tunes) ? d.tunes : []);
      }
      setLoading(false);
    });

    return () => {
      unsubGig();
      unsubSetlist();
    };
  }, [gigId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-yellow-400 flex items-center justify-center gap-2 font-mono text-sm">
        <Loader2 className="w-5 h-5 animate-spin" />
        INITIALIZING ON-STAGE TELEPROMPTER...
      </div>
    );
  }

  const activeTune = tunes[currentIndex];

  return (
    <div className="min-h-screen bg-black text-white p-4 sm:p-6 flex flex-col justify-between select-none">
      {/* Stage Header */}
      <div className="border-b border-zinc-800 pb-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/setlists"
            className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="text-[10px] font-mono uppercase font-bold tracking-widest text-emerald-400">
                LIVE ON STAGE
              </span>
            </div>
            <h1 className="text-lg font-black tracking-tight truncate max-w-[240px] sm:max-w-md text-white">
              {gig?.title}
            </h1>
          </div>
        </div>

        <div className="text-right font-mono text-xs text-zinc-500">
          CHART {tunes.length > 0 ? currentIndex + 1 : 0} OF {tunes.length}
        </div>
      </div>

      {/* Active Chart Spotlight Card */}
      {activeTune ? (
        <div className="my-auto py-8 text-center space-y-6">
          <div className="inline-flex items-center gap-2 bg-zinc-900 border border-zinc-800 px-3.5 py-1 rounded-full text-xs font-mono font-bold text-yellow-400">
            <Radio className="w-3.5 h-3.5 text-yellow-400 animate-pulse" />
            <span>NOW PLAYING</span>
          </div>

          <div className="space-y-2">
            <h2 className="text-4xl sm:text-6xl font-black text-white tracking-tight uppercase leading-none">
              {activeTune.title}
            </h2>
            <div className="flex items-center justify-center gap-4 text-sm sm:text-base font-mono font-bold text-yellow-400 pt-2">
              <span className="bg-yellow-400/10 border border-yellow-400/30 px-3 py-1 rounded-xl">
                KEY: {activeTune.keySignature}
              </span>
              <span className="bg-zinc-900 border border-zinc-800 px-3 py-1 rounded-xl text-zinc-300">
                {activeTune.tempoBpm} BPM
              </span>
            </div>
          </div>

          {activeTune.notes && (
            <div className="max-w-md mx-auto bg-zinc-900/80 border border-zinc-800 p-3 rounded-2xl text-xs text-zinc-300 font-sans italic">
              {activeTune.notes}
            </div>
          )}

          {activeTune.driveLink && (
            <div className="pt-2">
              <a
                href={activeTune.driveLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-yellow-400 border border-zinc-800 text-xs font-mono font-bold px-4 py-2 rounded-xl transition"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>OPEN SHEET MUSIC PDF</span>
                <ExternalLink className="w-3 h-3 text-zinc-500" />
              </a>
            </div>
          )}
        </div>
      ) : (
        <div className="my-auto text-center space-y-2 text-zinc-500">
          <Sparkles className="w-8 h-8 mx-auto" />
          <p className="text-sm font-mono">No tunes scheduled in this setlist yet.</p>
        </div>
      )}

      {/* Stage Bottom Navigation & Next Cue */}
      <div className="border-t border-zinc-800 pt-4 space-y-4">
        {currentIndex < tunes.length - 1 && (
          <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl px-4 py-2 flex items-center justify-between text-xs font-mono text-zinc-400">
            <span className="text-[10px] uppercase font-bold text-zinc-500">ON DECK:</span>
            <span className="font-bold text-zinc-200 truncate">{tunes[currentIndex + 1].title}</span>
            <span className="text-yellow-400 text-[11px]">{tunes[currentIndex + 1].keySignature}</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            disabled={currentIndex <= 0}
            onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
            className="py-4 bg-zinc-900 hover:bg-zinc-800 active:bg-zinc-700 text-zinc-200 font-black rounded-2xl border border-zinc-800 transition disabled:opacity-20 text-sm font-mono"
          >
            ← PREVIOUS TUNE
          </button>
          <button
            type="button"
            disabled={currentIndex >= tunes.length - 1}
            onClick={() => setCurrentIndex((prev) => Math.min(tunes.length - 1, prev + 1))}
            className="py-4 bg-yellow-400 hover:bg-yellow-300 active:bg-yellow-500 text-black font-black rounded-2xl transition disabled:opacity-20 text-sm font-mono shadow-lg shadow-yellow-400/10"
          >
            NEXT TUNE →
          </button>
        </div>
      </div>
    </div>
  );
}