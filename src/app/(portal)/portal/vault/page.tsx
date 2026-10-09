"use client";

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { collection, onSnapshot, setDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/lib/context/AuthContext";
import { canManageCatalog, isAdmin } from "@/lib/auth/permissions";
import { 
  VaultTrack, 
  VaultTrackType, 
  VaultTrackSchema 
} from "@/lib/schema/vaultTrack";
import { toast } from "@/lib/context/ToastContext";
import PortalBreadcrumb from "@/components/portal/PortalBreadcrumb";
import { 
  Play, 
  Pause, 
  ArrowLeft, 
  Volume2, 
  VolumeX, 
  Activity, 
  Music2, 
  Loader2, 
  Search,
  Plus,
  Trash2,
  X,
  Radio
} from "lucide-react";

const SECTIONS = ["All", "Trumpet", "Trombone", "Saxophone", "Sousaphone", "Percussion"];

export default function MusicianVaultPage() {
  const { profile, loading: authLoading } = useAuth();
  const canManage = Boolean(profile && (canManageCatalog(profile) || isAdmin(profile)));

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

  // Manager Upload Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [songTitle, setSongTitle] = useState("");
  const [trackType, setTrackType] = useState<VaultTrackType>("full_mix");
  const [audioUrl, setAudioUrl] = useState("");
  const [tempoBpm, setTempoBpm] = useState<number>(120);
  const [selectedSectionTags, setSelectedSectionTags] = useState<string[]>(["All"]);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "vault_tracks"),
      (snap) => {
        const list: VaultTrack[] = [];
        snap.forEach((d) => {
          const parsed = VaultTrackSchema.safeParse({ id: d.id, ...d.data() });
          if (parsed.success) {
            list.push({
              ...parsed.data,
              songTitle: parsed.data.songTitle || parsed.data.title || "Untitled",
              title: parsed.data.title || parsed.data.songTitle || "Untitled",
            });
          } else {
            const data = d.data();
            list.push({
              id: d.id,
              songTitle: data.songTitle || data.title || "Untitled",
              title: data.title || data.songTitle || "Untitled",
              trackType: (data.trackType as VaultTrackType) || "full_mix",
              audioUrl: data.audioUrl || "",
              tempoBpm: typeof data.tempoBpm === "number" ? data.tempoBpm : 120,
              sectionTags: Array.isArray(data.sectionTags) ? data.sectionTags : ["All"],
              notes: data.notes || "",
              uploadedAt: data.uploadedAt || "",
            });
          }
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
        toast.error("Playback error: " + err.message);
        setIsPlaying(false);
      });
    }
  };

  const handleToggleSectionTag = (section: string) => {
    if (section === "All") {
      setSelectedSectionTags(["All"]);
      return;
    }

    let updated = selectedSectionTags.filter((s) => s !== "All");
    if (updated.includes(section)) {
      updated = updated.filter((s) => s !== section);
    } else {
      updated.push(section);
    }

    if (updated.length === 0) updated = ["All"];
    setSelectedSectionTags(updated);
  };

  // Manager: Add / Upload Track
  const handleSaveTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!songTitle.trim() || !audioUrl.trim()) {
      toast.error("Song title and audio URL are required.");
      return;
    }

    setSaving(true);
    try {
      const trackId = `vault_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
      const payload = {
        id: trackId,
        songTitle: songTitle.trim(),
        title: songTitle.trim(),
        trackType,
        audioUrl: audioUrl.trim(),
        tempoBpm: Number(tempoBpm) || 120,
        sectionTags: selectedSectionTags,
        notes: notes.trim(),
        uploadedAt: new Date().toISOString(),
      };

      const validated = VaultTrackSchema.parse(payload);
      await setDoc(doc(db, "vault_tracks", trackId), validated);

      toast.success(`Vault track "${songTitle.trim()}" saved.`);
      setIsAddModalOpen(false);
      setSongTitle("");
      setAudioUrl("");
      setNotes("");
      setSelectedSectionTags(["All"]);
    } catch (err) {
      toast.error("Failed to save vault track: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setSaving(false);
    }
  };

  // Manager: Delete Track
  const handleDeleteTrack = async (trackId: string, title: string) => {
    if (!confirm(`Are you sure you want to delete track "${title}" from the Rehearsal Vault?`)) {
      return;
    }

    try {
      if (currentTrack?.id === trackId) {
        audioRef.current?.pause();
        setCurrentTrack(null);
        setIsPlaying(false);
      }
      await deleteDoc(doc(db, "vault_tracks", trackId));
      toast.success(`Track "${title}" deleted.`);
    } catch (err) {
      toast.error("Failed to delete track: " + (err instanceof Error ? err.message : String(err)));
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
      <PortalBreadcrumb className="mb-2" />
      {/* Invisible HTML Audio Element */}
      <audio
        ref={audioRef}
        onEnded={() => setIsPlaying(false)}
        className="hidden"
      />

      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-yellow-400 bg-slate-950 px-2.5 py-0.5 rounded border border-slate-800">
              Musician Audio Studio
            </span>
            <span className="text-xs font-mono text-slate-400">
              {tracks.length} Recording(s)
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-2.5">
            <Radio className="w-7 h-7 text-yellow-400" /> Rehearsal Vault
          </h1>
          <p className="text-xs text-slate-400">
            Section stems, reference full-mix recordings, and interactive click tracks to practice your parts at home.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/portal/library"
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white bg-slate-950 px-3 py-2 rounded-xl border border-slate-800 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Repertoire Catalog
          </Link>

          {canManage && (
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 transition shadow"
            >
              <Plus className="w-4 h-4" /> Upload Stem Track
            </button>
          )}
        </div>
      </div>

      {/* Interactive Metronome Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col md:flex-row items-center justify-between gap-5">
        <div className="flex items-center gap-4 w-full md:w-auto">
          <button
            type="button"
            onClick={() => setMetronomeActive(!metronomeActive)}
            className={`w-12 h-12 rounded-2xl flex items-center justify-center transition shadow-lg ${
              metronomeActive
                ? "bg-yellow-400 text-slate-950 ring-4 ring-yellow-400/20"
                : "bg-slate-950 text-slate-400 border border-slate-800 hover:text-white hover:border-slate-700"
            }`}
            title={metronomeActive ? "Stop Click" : "Start Click"}
          >
            <Activity className={`w-6 h-6 ${metronomeActive && beatPulse ? "scale-125" : ""} transition-transform`} />
          </button>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono uppercase tracking-wider text-slate-400">
                Studio Metronome
              </span>
              <span
                className={`w-2 h-2 rounded-full ${
                  beatPulse ? "bg-yellow-400 scale-150" : "bg-slate-700"
                } transition-all`}
              />
            </div>
            <div className="text-xl font-black text-white font-mono flex items-center gap-1">
              <span>{metronomeBpm}</span>
              <span className="text-xs font-normal text-slate-400 font-sans">BPM</span>
            </div>
          </div>
        </div>

        {/* BPM Quick Adjust Buttons */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          <button
            type="button"
            onClick={() => setMetronomeBpm((prev) => Math.max(40, prev - 5))}
            className="px-3 py-1.5 bg-slate-950 border border-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-mono font-bold hover:border-slate-700 transition"
          >
            -5
          </button>
          <input
            type="range"
            min={40}
            max={220}
            value={metronomeBpm}
            onChange={(e) => setMetronomeBpm(Number(e.target.value))}
            className="w-32 accent-yellow-400 cursor-pointer"
          />
          <button
            type="button"
            onClick={() => setMetronomeBpm((prev) => Math.min(240, prev + 5))}
            className="px-3 py-1.5 bg-slate-950 border border-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-mono font-bold hover:border-slate-700 transition"
          >
            +5
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Section Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {SECTIONS.map((sec) => (
            <button
              key={sec}
              type="button"
              onClick={() => setSelectedSection(sec)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap border ${
                selectedSection === sec
                  ? "bg-yellow-400 text-slate-950 border-yellow-400 shadow-sm"
                  : "bg-slate-900 text-slate-400 border-slate-800 hover:text-white hover:border-slate-700"
              }`}
            >
              {sec}
            </button>
          ))}
        </div>

        {/* Search Field */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search stems or song..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400 font-semibold"
          />
        </div>
      </div>

      {/* Tracks Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredTracks.map((t) => {
          const isThisPlaying = currentTrack?.id === t.id && isPlaying;

          return (
            <div
              key={t.id}
              className={`border rounded-2xl p-4 flex flex-col justify-between gap-3 transition shadow-sm ${
                currentTrack?.id === t.id
                  ? "bg-slate-900 border-yellow-400/40 shadow-yellow-400/5 ring-1 ring-yellow-400/20"
                  : "bg-slate-900/60 border-slate-800/80 hover:border-slate-700"
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-0.5">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Music2 className="w-4 h-4 text-yellow-400 shrink-0" />
                      {t.songTitle}
                    </h3>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] uppercase font-mono font-bold bg-slate-950 text-slate-400 px-2 py-0.5 rounded border border-slate-800">
                        {t.trackType.replace("_", " ")}
                      </span>
                      {t.tempoBpm && (
                        <span className="text-[10px] font-mono text-yellow-400 bg-yellow-400/10 px-2 py-0.5 rounded border border-yellow-400/20">
                          {t.tempoBpm} BPM
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handlePlayTrack(t)}
                      className={`w-9 h-9 rounded-xl flex items-center justify-center transition shrink-0 ${
                        isThisPlaying
                          ? "bg-yellow-400 text-slate-950 shadow-md"
                          : "bg-slate-950 text-slate-300 border border-slate-800 hover:border-yellow-400 hover:text-yellow-400"
                      }`}
                      title={isThisPlaying ? "Pause Track" : "Play Stem Track"}
                    >
                      {isThisPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 translate-x-0.5" />}
                    </button>

                    {canManage && (
                      <button
                        type="button"
                        onClick={() => handleDeleteTrack(t.id, t.songTitle)}
                        className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition"
                        title="Delete Track"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {t.notes && (
                  <p className="text-[11px] text-slate-400 leading-relaxed bg-slate-950/40 p-2.5 rounded-xl border border-slate-800/40">
                    {t.notes}
                  </p>
                )}
              </div>

              {/* Section Tags */}
              <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                <div className="flex items-center gap-1 flex-wrap">
                  {t.sectionTags.map((sec, idx) => (
                    <span
                      key={idx}
                      className="bg-slate-950 text-slate-400 px-1.5 py-0.5 rounded border border-slate-800"
                    >
                      {sec}
                    </span>
                  ))}
                </div>
                <span>Audio Stem</span>
              </div>
            </div>
          );
        })}
      </div>

      {filteredTracks.length === 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center space-y-3">
          <Radio className="w-8 h-8 text-slate-600 mx-auto" />
          <h3 className="text-sm font-bold text-white">No Practice Stems Found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            No audio tracks matched your selected section or search query.
          </p>
        </div>
      )}

      {/* Floating Bottom Audio Player Bar */}
      {currentTrack && (
        <div className="fixed bottom-4 left-4 right-4 max-w-3xl mx-auto z-40 bg-slate-900/95 backdrop-blur-md border border-yellow-400/30 rounded-2xl p-4 shadow-2xl flex items-center justify-between gap-4 animate-in slide-in-from-bottom duration-200">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => handlePlayTrack(currentTrack)}
              className="w-10 h-10 rounded-xl bg-yellow-400 text-slate-950 flex items-center justify-center shrink-0 shadow-md hover:bg-yellow-300 transition"
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 translate-x-0.5" />}
            </button>
            <div className="min-w-0">
              <span className="text-[10px] font-mono uppercase text-yellow-400 font-bold block">
                Now Practicing
              </span>
              <div className="text-sm font-bold text-white truncate">
                {currentTrack.songTitle}
              </div>
              <div className="text-[11px] text-slate-400 flex items-center gap-1.5 font-mono">
                <span>{currentTrack.trackType.replace("_", " ")}</span>
                {currentTrack.tempoBpm && <span>• {currentTrack.tempoBpm} BPM</span>}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => {
                if (audioRef.current) {
                  audioRef.current.muted = !isMuted;
                  setIsMuted(!isMuted);
                }
              }}
              className="text-slate-400 hover:text-white p-2"
              title={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? <VolumeX className="w-5 h-5 text-rose-400" /> : <Volume2 className="w-5 h-5" />}
            </button>

            <button
              type="button"
              onClick={() => {
                audioRef.current?.pause();
                setCurrentTrack(null);
                setIsPlaying(false);
              }}
              className="text-slate-400 hover:text-white p-2"
              title="Close Player"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Manager Add Track Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Radio className="w-4 h-4 text-yellow-400" /> Upload Rehearsal Stem Track
              </h2>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveTrack} className="space-y-3.5">
              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">Song / Chart Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Bloomfield Bounce"
                  value={songTitle}
                  onChange={(e) => setSongTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">Track Type</label>
                  <select
                    value={trackType}
                    onChange={(e) => setTrackType(e.target.value as VaultTrackType)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400"
                  >
                    <option value="full_mix">Full Band Mix</option>
                    <option value="brass_stem">Brass Section Stem</option>
                    <option value="drum_line">Battery / Drumline Stem</option>
                    <option value="reference_recording">Live Reference</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">Tempo (BPM)</label>
                  <input
                    type="number"
                    placeholder="120"
                    value={tempoBpm}
                    onChange={(e) => setTempoBpm(Number(e.target.value) || 120)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">Audio Recording URL (MP3 / WAV) *</label>
                <input
                  type="url"
                  required
                  placeholder="https://example.com/stems/bounce_sousa.mp3"
                  value={audioUrl}
                  onChange={(e) => setAudioUrl(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1.5">Target Instrument Sections</label>
                <div className="flex flex-wrap gap-1.5">
                  {SECTIONS.map((sec) => {
                    const isSelected = selectedSectionTags.includes(sec);
                    return (
                      <button
                        key={sec}
                        type="button"
                        onClick={() => handleToggleSectionTag(sec)}
                        className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border transition ${
                          isSelected
                            ? "bg-yellow-400/20 text-yellow-400 border-yellow-400/40"
                            : "bg-slate-950 text-slate-400 border-slate-800 hover:text-white"
                        }`}
                      >
                        {sec}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">Practice & Rehearsal Notes</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Listen for the pickup at bar 16; solo section count-in on beat 4."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold px-5 py-2 rounded-xl text-xs flex items-center gap-1.5 transition disabled:opacity-50"
                >
                  {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Save to Vault
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}