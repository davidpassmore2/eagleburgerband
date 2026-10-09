"use client";

import React, { useEffect, useState, use, useRef } from "react";
import Link from "next/link";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { 
  ArrowLeft, 
  ExternalLink, 
  Loader2, 
  Radio, 
  Sparkles,
  Zap,
  Sun,
  Moon,
  Volume2,
  ListOrdered,
  Wifi,
  WifiOff,
  X
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

// Helper to normalize tune items from stage docs, embedded gig setlists, or master templates
function normalizeTune(t: Record<string, unknown>): SetlistEntry {
  const songId = typeof t.songId === "string" ? t.songId : typeof t.tuneId === "string" ? t.tuneId : typeof t.id === "string" ? t.id : "";
  const title = typeof t.title === "string" && t.title ? t.title : "Untitled Tune";
  const keySignature = typeof t.keySignature === "string" ? t.keySignature : "TBD";
  const tempoBpm = typeof t.tempoBpm === "number" ? t.tempoBpm : Number(t.tempoBpm) || 120;
  const notes = typeof t.performanceNotes === "string" ? t.performanceNotes : typeof t.notes === "string" ? t.notes : "";
  const driveLink = typeof t.driveLink === "string" ? t.driveLink : typeof t.sheetMusicUrl === "string" ? t.sheetMusicUrl : "";

  return {
    songId,
    title,
    keySignature,
    tempoBpm,
    notes,
    driveLink,
  };
}

const KEY_FREQUENCIES: Record<string, number> = {
  "C": 261.63,
  "C#": 277.18,
  "DB": 277.18,
  "D": 293.66,
  "D#": 311.13,
  "EB": 311.13,
  "E": 329.63,
  "F": 349.23,
  "F#": 369.99,
  "GB": 369.99,
  "G": 392.00,
  "G#": 415.30,
  "AB": 415.30,
  "A": 440.00,
  "A#": 466.16,
  "BB": 466.16,
  "B": 493.88,
};

function playConcertPitch(keySignature: string, onStop?: () => void) {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    
    // Normalize key (e.g. "B-flat", "Bb Major", "Eb minor", "F")
    const cleaned = keySignature.toUpperCase().replace(/\s*(MAJOR|MINOR|MAJ|MIN|M)/gi, "").trim();
    let freq = 466.16; // default Concert Bb
    for (const [k, f] of Object.entries(KEY_FREQUENCIES)) {
      if (cleaned.startsWith(k)) {
        freq = f;
        break;
      }
    }

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, ctx.currentTime);

    gain.gain.setValueAtTime(0.01, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 2.0);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 2.0);
    setTimeout(() => {
      ctx.close().catch(() => {});
      if (onStop) onStop();
    }, 2100);
  } catch (err) {
    console.error("Audio pitch tone error:", err);
    if (onStop) onStop();
  }
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
  const [isOnline, setIsOnline] = useState(true);
  const [isSunlight, setIsSunlight] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isPlayingPitch, setIsPlayingPitch] = useState(false);
  const [hasCachedData, setHasCachedData] = useState(false);

  const gigRef = useRef<GigDetails | null>(null);
  gigRef.current = gig;

  // Hydrate from localStorage on mount for offline parade readiness
  useEffect(() => {
    setIsOnline(typeof navigator !== "undefined" ? navigator.onLine : true);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Load sunlight preference
    const savedSunlight = localStorage.getItem("ebb_perform_sunlight");
    if (savedSunlight === "true") {
      setIsSunlight(true);
    }

    // Hydrate offline cache
    const cacheKey = `ebb_stage_${gigId}`;
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.gig) setGig(parsed.gig);
        if (Array.isArray(parsed.tunes) && parsed.tunes.length > 0) {
          setTunes(parsed.tunes);
          setHasCachedData(true);
          setLoading(false);
        }
      }
    } catch {
      // Ignore cache hydration errors
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [gigId]);

  // Firestore sync & cache update
  useEffect(() => {
    let isMounted = true;
    let unsubMasterTemplate: (() => void) | null = null;

    // 1. Listen to Gig Details
    const unsubGig = onSnapshot(doc(db, "gigs", gigId), (snap) => {
      if (!isMounted) return;
      if (snap.exists()) {
        const d = snap.data();
        const gigData: GigDetails = {
          title: d.title || d.publicDetails?.title || "Eagleburger Live",
          venue: d.venue || d.publicDetails?.venue || "",
          date: d.date || "",
        };
        setGig(gigData);

        // Fallback resolution if stage-view setlist doc does not provide tunes:
        if (Array.isArray(d.setlist) && d.setlist.length > 0) {
          setTunes((prev) => {
            const next = prev.length === 0 ? d.setlist.map(normalizeTune) : prev;
            return next;
          });
        } else if (d.setlistId) {
          if (unsubMasterTemplate) unsubMasterTemplate();
          unsubMasterTemplate = onSnapshot(doc(db, "setlists", d.setlistId), (tplSnap) => {
            if (!isMounted) return;
            if (tplSnap.exists()) {
              const tplData = tplSnap.data();
              if (Array.isArray(tplData.tunes) && tplData.tunes.length > 0) {
                setTunes((prev) => (prev.length === 0 ? tplData.tunes.map(normalizeTune) : prev));
              }
            }
          });
        }
      }
    });

    // 2. Listen to Stage Setlist Document (canonical sync target from Setlist Assignment)
    const unsubSetlist = onSnapshot(
      doc(db, "setlists", gigId),
      (snap) => {
        if (!isMounted) return;
        if (snap.exists()) {
          const d = snap.data();
          if (Array.isArray(d.tunes) && d.tunes.length > 0) {
            const parsedTunes = d.tunes.map(normalizeTune);
            setTunes(parsedTunes);
            // Cache to localStorage
            try {
              localStorage.setItem(
                `ebb_stage_${gigId}`,
                JSON.stringify({ gig: gigRef.current, tunes: parsedTunes, timestamp: Date.now() })
              );
              setHasCachedData(true);
            } catch {
              // Ignore storage errors
            }
          }
        }
        setLoading(false);
      },
      (err) => {
        console.warn("Firestore onSnapshot error, falling back to cache:", err);
        setLoading(false);
      }
    );

    return () => {
      isMounted = false;
      unsubGig();
      unsubSetlist();
      if (unsubMasterTemplate) unsubMasterTemplate();
    };
  }, [gigId]);

  const toggleSunlightMode = () => {
    setIsSunlight((prev) => {
      const next = !prev;
      localStorage.setItem("ebb_perform_sunlight", String(next));
      return next;
    });
  };

  const handlePlayPitch = (keySignature: string) => {
    if (isPlayingPitch) return;
    setIsPlayingPitch(true);
    playConcertPitch(keySignature, () => {
      setIsPlayingPitch(false);
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-yellow-400 flex items-center justify-center gap-2 font-mono text-sm">
        <Loader2 className="w-5 h-5 animate-spin" />
        INITIALIZING ON-STAGE TELEPROMPTER...
      </div>
    );
  }

  const activeTune = tunes[currentIndex];

  // Dynamic style tokens based on sunlight mode
  const bgClass = isSunlight ? "bg-amber-50 text-neutral-950" : "bg-black text-white";
  const headerBorder = isSunlight ? "border-b-2 border-neutral-300" : "border-b border-zinc-800";
  const cardBorder = isSunlight ? "border border-neutral-300 bg-white" : "border border-zinc-800 bg-zinc-900";
  const subtextClass = isSunlight ? "text-neutral-600" : "text-zinc-400";
  const titleClass = isSunlight ? "text-black font-black" : "text-white font-black";

  return (
    <div className={`min-h-screen ${bgClass} p-4 sm:p-6 flex flex-col justify-between select-none transition-colors duration-200`}>
      {/* Stage Header */}
      <div className={`${headerBorder} pb-3 flex items-center justify-between gap-2 sm:gap-4`}>
        <div className="flex items-center gap-2.5 sm:gap-3">
          <Link
            href={`/portal/gigs/${gigId}`}
            className={`p-2 rounded-xl transition ${
              isSunlight 
                ? "bg-neutral-200 text-neutral-800 hover:bg-neutral-300 border border-neutral-300" 
                : "bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white"
            }`}
            title="Return to Gig Call Sheet"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              {isOnline ? (
                <>
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                  </span>
                  <span className="text-[10px] font-mono uppercase font-bold tracking-widest text-emerald-500">
                    LIVE CLOUD SYNC
                  </span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3 h-3 text-amber-500" />
                  <span className="text-[10px] font-mono uppercase font-bold tracking-widest text-amber-500">
                    OFFLINE CACHED {hasCachedData ? "✓" : ""}
                  </span>
                </>
              )}
            </div>
            <h1 className={`text-base sm:text-lg font-black tracking-tight truncate max-w-[180px] sm:max-w-md ${titleClass}`}>
              {gig?.title}
            </h1>
          </div>
        </div>

        {/* Header Right Action Group */}
        <div className="flex items-center gap-2">
          {/* Sunlight High-Contrast Toggle */}
          <button
            type="button"
            onClick={toggleSunlightMode}
            className={`p-2 rounded-xl font-mono text-xs font-bold flex items-center gap-1.5 transition ${
              isSunlight
                ? "bg-amber-300 text-neutral-950 border border-amber-400 hover:bg-amber-400"
                : "bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white"
            }`}
            title={isSunlight ? "Switch to Dark Stage Mode" : "Switch to Outdoor Sunlight Mode"}
          >
            {isSunlight ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4 text-yellow-400" />}
            <span className="hidden sm:inline">{isSunlight ? "DARK" : "SUNLIGHT"}</span>
          </button>

          {/* Setlist Quick-Jump Drawer Trigger */}
          <button
            type="button"
            onClick={() => setIsDrawerOpen(true)}
            className={`px-3 py-2 rounded-xl font-mono text-xs font-bold flex items-center gap-1.5 transition ${
              isSunlight
                ? "bg-neutral-200 text-neutral-900 border border-neutral-300 hover:bg-neutral-300"
                : "bg-zinc-900 border border-zinc-800 text-yellow-400 hover:bg-zinc-800"
            }`}
            title="Open Full Setlist Selector"
          >
            <ListOrdered className="w-4 h-4" />
            <span>{tunes.length > 0 ? currentIndex + 1 : 0}/{tunes.length}</span>
          </button>
        </div>
      </div>

      {/* Active Chart Spotlight Card */}
      {activeTune ? (
        <div className="my-auto py-6 sm:py-8 text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-mono font-bold border shadow-sm">
            <Radio className={`w-3.5 h-3.5 animate-pulse ${isSunlight ? "text-red-600" : "text-yellow-400"}`} />
            <span className={isSunlight ? "text-neutral-900 font-black" : "text-yellow-400"}>NOW PLAYING</span>
          </div>

          <div className="space-y-3">
            <h2 className={`text-4xl sm:text-6xl md:text-7xl font-black tracking-tight uppercase leading-none break-words ${titleClass}`}>
              {activeTune.title}
            </h2>
            
            <div className="flex items-center justify-center gap-3 sm:gap-4 font-mono font-bold pt-2 flex-wrap">
              {/* Interactive Key Signature with Audio Pitch Reference Tone */}
              <button
                type="button"
                onClick={() => handlePlayPitch(activeTune.keySignature)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl border text-sm sm:text-base font-black transition active:scale-95 ${
                  isPlayingPitch
                    ? "bg-yellow-400 text-black border-yellow-500 animate-pulse ring-4 ring-yellow-400/40"
                    : isSunlight
                    ? "bg-yellow-300 text-neutral-950 border-neutral-400 hover:bg-yellow-400"
                    : "bg-yellow-400/15 border-yellow-400/40 text-yellow-400 hover:bg-yellow-400/25"
                }`}
                title="Tap to hear Concert Pitch tone"
              >
                <Volume2 className={`w-4 h-4 ${isPlayingPitch ? "animate-bounce" : ""}`} />
                <span>KEY: {activeTune.keySignature}</span>
                <span className="text-[10px] opacity-75 font-sans font-normal ml-0.5">
                  {isPlayingPitch ? "PITCHING..." : "♫ TONE"}
                </span>
              </button>

              <span className={`px-3.5 py-1.5 rounded-xl border text-sm sm:text-base ${
                isSunlight
                  ? "bg-neutral-200 border-neutral-300 text-neutral-900"
                  : "bg-zinc-900 border border-zinc-800 text-zinc-300"
              }`}>
                {activeTune.tempoBpm} BPM
              </span>
            </div>
          </div>

          {activeTune.notes && (
            <div className={`max-w-md mx-auto p-3.5 rounded-2xl text-xs sm:text-sm font-sans italic border shadow-sm ${
              isSunlight
                ? "bg-amber-100/70 border-amber-200 text-neutral-900 font-medium"
                : "bg-zinc-900/80 border-zinc-800 text-zinc-300"
            }`}>
              {activeTune.notes}
            </div>
          )}

          {activeTune.driveLink && (
            <div className="pt-2">
              <a
                href={activeTune.driveLink}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex items-center gap-2 text-xs font-mono font-bold px-4 py-2.5 rounded-xl transition border shadow-md ${
                  isSunlight
                    ? "bg-neutral-900 hover:bg-black text-amber-300 border-neutral-900"
                    : "bg-zinc-900 hover:bg-zinc-800 text-yellow-400 border-zinc-800"
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>OPEN SHEET MUSIC PDF</span>
                <ExternalLink className="w-3 h-3 opacity-60" />
              </a>
            </div>
          )}
        </div>
      ) : (
        <div className={`my-auto text-center space-y-2 ${subtextClass}`}>
          <Sparkles className="w-8 h-8 mx-auto" />
          <p className="text-sm font-mono">No tunes scheduled in this setlist yet.</p>
        </div>
      )}

      {/* Stage Bottom Navigation & Next Cue */}
      <div className={`${headerBorder} pt-4 space-y-4`}>
        {currentIndex < tunes.length - 1 && (
          <div className={`rounded-xl px-4 py-2 flex items-center justify-between text-xs font-mono border ${
            isSunlight
              ? "bg-neutral-200/80 border-neutral-300 text-neutral-800"
              : "bg-zinc-900/60 border-zinc-800/80 text-zinc-400"
          }`}>
            <span className={`text-[10px] uppercase font-bold ${isSunlight ? "text-neutral-600" : "text-zinc-500"}`}>
              ON DECK:
            </span>
            <span className="font-bold truncate max-w-[200px] sm:max-w-md">
              {tunes[currentIndex + 1].title}
            </span>
            <span className={`text-[11px] font-bold ${isSunlight ? "text-amber-700" : "text-yellow-400"}`}>
              {tunes[currentIndex + 1].keySignature}
            </span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            disabled={currentIndex <= 0}
            onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
            className={`py-4 font-black rounded-2xl border transition disabled:opacity-20 text-sm font-mono ${
              isSunlight
                ? "bg-neutral-200 hover:bg-neutral-300 text-neutral-950 border-neutral-300"
                : "bg-zinc-900 hover:bg-zinc-800 active:bg-zinc-700 text-zinc-200 border-zinc-800"
            }`}
          >
            ← PREV TUNE
          </button>
          <button
            type="button"
            disabled={currentIndex >= tunes.length - 1}
            onClick={() => setCurrentIndex((prev) => Math.min(tunes.length - 1, prev + 1))}
            className={`py-4 font-black rounded-2xl transition disabled:opacity-20 text-sm font-mono shadow-lg ${
              isSunlight
                ? "bg-amber-400 hover:bg-amber-300 text-neutral-950 border border-amber-500"
                : "bg-yellow-400 hover:bg-yellow-300 active:bg-yellow-500 text-black shadow-yellow-400/10"
            }`}
          >
            NEXT TUNE →
          </button>
        </div>
      </div>

      {/* Setlist Quick-Jump Drawer / Sheet Modal */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          <div 
            className={`w-full max-w-lg max-h-[85vh] rounded-t-3xl sm:rounded-3xl border flex flex-col overflow-hidden shadow-2xl ${
              isSunlight ? "bg-white border-neutral-300 text-black" : "bg-zinc-950 border-zinc-800 text-white"
            }`}
          >
            {/* Drawer Header */}
            <div className={`p-4 border-b flex items-center justify-between ${isSunlight ? "border-neutral-200 bg-neutral-100" : "border-zinc-800 bg-zinc-900/60"}`}>
              <div className="flex items-center gap-2 font-mono">
                <ListOrdered className="w-5 h-5 text-yellow-500" />
                <h3 className="font-bold text-sm">SETLIST SELECTOR ({tunes.length} TUNES)</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsDrawerOpen(false)}
                className={`p-1.5 rounded-lg ${isSunlight ? "hover:bg-neutral-200 text-neutral-600" : "hover:bg-zinc-800 text-zinc-400"}`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Tune List */}
            <div className="overflow-y-auto divide-y divide-zinc-800/40 p-2 space-y-1">
              {tunes.map((tune, idx) => {
                const isActive = idx === currentIndex;
                return (
                  <button
                    key={`${tune.songId}-${idx}`}
                    type="button"
                    onClick={() => {
                      setCurrentIndex(idx);
                      setIsDrawerOpen(false);
                    }}
                    className={`w-full text-left p-3 rounded-2xl flex items-center justify-between transition ${
                      isActive
                        ? isSunlight
                          ? "bg-amber-300 text-black font-black shadow-sm"
                          : "bg-yellow-400 text-black font-black"
                        : isSunlight
                        ? "hover:bg-neutral-100 text-neutral-900"
                        : "hover:bg-zinc-900 text-zinc-300"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={`w-7 h-7 rounded-xl flex items-center justify-center font-mono text-xs font-bold ${
                        isActive 
                          ? "bg-black text-yellow-400" 
                          : isSunlight 
                          ? "bg-neutral-200 text-neutral-700" 
                          : "bg-zinc-800 text-zinc-400"
                      }`}>
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm truncate font-semibold">{tune.title}</p>
                        <p className={`text-[11px] font-mono ${isActive ? "text-neutral-900" : subtextClass}`}>
                          Key: {tune.keySignature} • {tune.tempoBpm} BPM
                        </p>
                      </div>
                    </div>
                    {isActive && (
                      <span className="text-[10px] font-mono font-black uppercase px-2 py-0.5 rounded-md bg-black text-yellow-400 ml-2">
                        ACTIVE
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Drawer Footer */}
            <div className={`p-3 border-t text-center font-mono text-xs ${isSunlight ? "border-neutral-200 bg-neutral-100 text-neutral-600" : "border-zinc-800 bg-zinc-900/60 text-zinc-400"}`}>
              Tap any song to jump directly to it on stage
            </div>
          </div>
        </div>
      )}
    </div>
  );
}