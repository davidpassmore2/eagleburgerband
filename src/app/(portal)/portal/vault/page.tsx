"use client";

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/lib/context/AuthContext";
import { 
  Play, 
  Pause, 
  ArrowLeft, 
  Volume2, 
  VolumeX, 
  Activity, 
  Music2, 
  Loader2, 
  Search 
} from "lucide-react";

interface VaultTrack {
  id: string;
  songTitle: string;
  trackType: "full_mix" | "brass_stem" | "drum_line" | "reference_recording";
  audioUrl: string;
  tempoBpm?: number;
  sectionTags: string[];
  notes?: string;
}

const SECTIONS = ["All", "Trumpet", "Trombone", "Saxophone", "Sousaphone", "Percussion"];

export default function MusicianVaultPage() {
  const { loading: authLoading } = useAuth();
  const [tracks, setTracks] = useState<VaultTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSection, setSelectedSection] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  // Audio Playback State
  const [currentTrack, setCurrentTrack] = useState<VaultTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Metronome & Click Track State
  const [metronomeActive, setMetronomeActive] = useState(false);
  const [metronomeBpm, setMetronomeBpm] = useState<number>(112);
  const [beatPulse, setBeatPulse] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "vault_tracks"),
      (snap) => {
        const list: VaultTrack[] = [];
        snap.forEach((d) => {
          const data = d.data();
          list.push({
            id: d.id,
            songTitle: data.songTitle || "Untitled",
            trackType: data.trackType || "full_mix",
            audioUrl: data.audioUrl || "",
            tempoBpm: typeof data.tempoBpm === "number" ? data.tempoBpm : undefined,
            sectionTags: Array.isArray(data.sectionTags) ? data.sectionTags : ["All"],
            notes: data.notes || "",
          });
        });
        list.sort((a, b) => a.songTitle.localeCompare(b.songTitle));
        setTracks(list);
        setLoading(false);
      },
      (err) => {
        console.error("Error loading vault tracks:", err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, []);

  // Metronome Click Engine using Web Audio API
  const playClickBeep = () => {
    try {
      if (!audioContextRef.current) {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        audioContextRef.current = new AudioCtx();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === "suspended") {
        ctx.resume();
      }

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.05);

      setBeatPulse(true);
      setTimeout(() => setBeatPulse(false), 80);
    } catch (e) {
      console.warn("Metronome sound failed:", e);
    }
  };

  useEffect(() => {
    if (metronomeActive && metronomeBpm > 0) {
      const intervalMs = (60 / metronomeBpm) * 1000;
      timerRef.current = setInterval(() => {
        playClickBeep();
      }, intervalMs);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [metronomeActive, metronomeBpm]);

  const handlePlayTrack = (track: VaultTrack) => {
    if (currentTrack?.id === track.id) {
      if (isPlaying) {
        audioRef.current?.pause();
        setIsPlaying(false);
      } else {
        audioRef.current?.play();
        setIsPlaying(true);
      }
      return;
    }

    setCurrentTrack(track);
    setIsPlaying(true);
    if (track.tempoBpm) {
      setMetronomeBpm(track.tempoBpm);
    }

    if (audioRef.current) {
      audioRef.current.src = track.audioUrl;
      audioRef.current.play().catch((err) => {
        alert("Playback error: " + err.message);
        setIsPlaying(false);
      });
    }
  };

  const filteredTracks = tracks.filter((t) => {
    const matchesSection =
      selectedSection === "All" ||
      t.sectionTags.includes(selectedSection) ||
      t.sectionTags.includes("All");

    const matchesSearch =
      t.songTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.notes || "").toLowerCase().includes(searchQuery.toLowerCase());

    return matchesSection && matchesSearch;
  });

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-400 gap-2 text-xs">
        <Loader2 className="w-4 h-4 animate-spin text-yellow-400" />
        Loading Practice Vault & Stems...
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6 pb-28">
      {/* Invisible HTML Audio Element */}
      <audio
        ref={audioRef}
        onEnded={() => setIsPlaying(false)}
        onPause={() => setIsPlaying(false)}
        onPlay={() => setIsPlaying(true)}
      />

      {/* Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link
              href="/portal"
              className="p-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:text-white transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
            </Link>
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-yellow-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
              Musician Vault
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Rehearsal Lounge & Stems</h1>
          <p className="text-xs text-slate-400">
            Listen to sectionals, isolate brass lines, and dial in tempos with the integrated click track.
          </p>
        </div>

        {/* Metronome Controller */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3 flex items-center gap-3 shrink-0 shadow-lg">
          <div
            className={`w-3.5 h-3.5 rounded-full transition-transform duration-75 ${
              beatPulse ? "scale-150 bg-yellow-400 shadow-md shadow-yellow-400/80" : "bg-slate-800"
            }`}
          />
          <div className="text-xs">
            <span className="text-[10px] font-mono text-slate-500 uppercase block leading-none">Click BPM</span>
            <div className="flex items-center gap-1 font-mono font-bold text-white">
              <input
                type="number"
                min="40"
                max="240"
                value={metronomeBpm}
                onChange={(e) => setMetronomeBpm(Number(e.target.value) || 0)}
                className="w-12 bg-transparent text-yellow-400 focus:outline-none text-center"
              />
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              if (metronomeActive) setBeatPulse(false);
              setMetronomeActive(!metronomeActive);
            }}
            className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition flex items-center gap-1 ${
              metronomeActive
                ? "bg-yellow-400 text-slate-950 border-yellow-400 shadow"
                : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>{metronomeActive ? "Stop Click" : "Start Click"}</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search tunes, cadences, or practice instructions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400 font-semibold"
            />
          </div>

          {/* Sectional Picklist */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 shrink-0">
            {SECTIONS.map((sec) => (
              <button
                key={sec}
                type="button"
                onClick={() => setSelectedSection(sec)}
                className={`text-xs px-3 py-1.5 rounded-xl font-bold transition border ${
                  selectedSection === sec
                    ? "bg-yellow-400 text-slate-950 border-yellow-400 shadow-md"
                    : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                {sec}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Practice Tracks List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filteredTracks.map((track) => {
          const isCurrent = currentTrack?.id === track.id;
          const isPlayingThis = isCurrent && isPlaying;

          return (
            <div
              key={track.id}
              className={`bg-slate-900 border rounded-2xl p-4 transition flex flex-col justify-between gap-3 shadow group ${
                isPlayingThis
                  ? "border-yellow-400/80 shadow-yellow-400/10"
                  : "border-slate-800 hover:border-slate-700"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-white text-sm group-hover:text-yellow-400 transition truncate">
                      {track.songTitle}
                    </span>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                      {track.trackType.replace("_", " ")}
                    </span>
                  </div>

                  {track.notes && (
                    <p className="text-xs text-slate-400 leading-snug line-clamp-2">
                      {track.notes}
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => handlePlayTrack(track)}
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition shrink-0 shadow-lg ${
                    isPlayingThis
                      ? "bg-yellow-400 text-slate-950 shadow-yellow-400/30"
                      : "bg-slate-950 text-slate-300 border border-slate-800 hover:text-white hover:border-slate-700"
                  }`}
                  title={isPlayingThis ? "Pause" : "Play"}
                >
                  {isPlayingThis ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                </button>
              </div>

              <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800/80 text-[11px] font-mono text-slate-500">
                <div className="flex items-center gap-1 flex-wrap">
                  {track.sectionTags.map((sec) => (
                    <span
                      key={sec}
                      className="bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800 text-[9px] text-slate-400"
                    >
                      {sec}
                    </span>
                  ))}
                </div>

                {track.tempoBpm ? (
                  <button
                    type="button"
                    onClick={() => {
                      setMetronomeBpm(track.tempoBpm!);
                      setMetronomeActive(true);
                    }}
                    className="text-yellow-400 hover:underline font-bold flex items-center gap-1"
                    title="Load this track's tempo into click"
                  >
                    <Activity className="w-3 h-3" /> {track.tempoBpm} BPM
                  </button>
                ) : (
                  <span>Free Tempo</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filteredTracks.length === 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-500 text-xs flex flex-col items-center justify-center gap-2">
          <Music2 className="w-6 h-6 text-slate-600" />
          No practice audio found matching this filter.
        </div>
      )}

      {/* Floating Bottom Audio Player Bar */}
      {currentTrack && (
        <div className="fixed bottom-4 left-4 right-4 max-w-2xl mx-auto bg-slate-900/95 backdrop-blur border border-yellow-400/40 rounded-2xl p-3.5 shadow-2xl flex items-center justify-between gap-4 z-50">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => handlePlayTrack(currentTrack)}
              className="w-10 h-10 rounded-xl bg-yellow-400 text-slate-950 font-bold flex items-center justify-center shrink-0 shadow transition hover:bg-yellow-300"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
            </button>

            <div className="min-w-0">
              <div className="text-xs font-bold text-white truncate">{currentTrack.songTitle}</div>
              <div className="text-[10px] font-mono text-slate-400 truncate">
                {currentTrack.trackType.replace("_", " ")}
                {currentTrack.tempoBpm && ` • ${currentTrack.tempoBpm} BPM`}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                if (audioRef.current) {
                  audioRef.current.muted = !isMuted;
                  setIsMuted(!isMuted);
                }
              }}
              className="p-2 rounded-lg text-slate-400 hover:text-white bg-slate-950 border border-slate-800 transition"
              title={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}