"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { 
  collection, 
  onSnapshot, 
  setDoc, 
  deleteDoc, 
  doc 
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/lib/context/AuthContext";
import { canManageCatalog } from "@/lib/auth/permissions";
import { User } from "@/lib/schema/user";
import { 
  Music, 
  Plus, 
  Trash2, 
  Play, 
  Pause, 
  Loader2, 
  ShieldAlert, 
  X, 
  Check, 
  Search, 
  Radio, 
  ArrowRight
} from "lucide-react";

export type VaultTrackType = "full_mix" | "brass_stem" | "drum_line" | "reference_recording";

export interface VaultTrackDoc {
  id: string;
  songTitle: string;
  trackType: VaultTrackType;
  audioUrl: string;
  tempoBpm?: number;
  sectionTags: string[];
  notes?: string;
  uploadedAt: string;
}

const SECTION_OPTIONS = ["All", "Trumpet", "Trombone", "Saxophone", "Sousaphone", "Percussion"];

export default function VaultAdminPage() {
  const { profile, loading: authLoading } = useAuth();
  const [tracks, setTracks] = useState<VaultTrackDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeAudio, setActiveAudio] = useState<{ id: string; audio: HTMLAudioElement } | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    songTitle: "",
    trackType: "full_mix" as VaultTrackType,
    audioUrl: "",
    tempoBpm: 112,
    sectionTags: ["All"] as string[],
    notes: "",
  });

  useEffect(() => {
    if (authLoading) return;

    const unsub = onSnapshot(
      collection(db, "vault_tracks"),
      (snap) => {
        const list: VaultTrackDoc[] = [];
        snap.forEach((d) => {
          const data = d.data();
          list.push({
            id: d.id,
            songTitle: data.songTitle || "Untitled Track",
            trackType: data.trackType || "full_mix",
            audioUrl: data.audioUrl || "",
            tempoBpm: typeof data.tempoBpm === "number" ? data.tempoBpm : undefined,
            sectionTags: Array.isArray(data.sectionTags) ? data.sectionTags : ["All"],
            notes: data.notes || "",
            uploadedAt: data.uploadedAt || "",
          });
        });
        list.sort((a, b) => a.songTitle.localeCompare(b.songTitle));
        setTracks(list);
        setLoading(false);
      },
      (err) => {
        console.error("Vault tracks fetch error:", err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [authLoading]);

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      if (activeAudio) {
        activeAudio.audio.pause();
      }
    };
  }, [activeAudio]);

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-400 gap-2 text-xs">
        <Loader2 className="w-4 h-4 animate-spin text-yellow-400" />
        Loading Rehearsal Vault Media...
      </div>
    );
  }

  const userProfile = profile as unknown as User;
  if (!userProfile || !canManageCatalog(userProfile)) {
    return (
      <div className="p-8 text-rose-400 text-xs font-semibold flex items-center gap-2">
        <ShieldAlert className="w-4 h-4" />
        Catalog Manager privileges required to upload and curate practice audio.
      </div>
    );
  }

  const handleToggleAudio = (track: VaultTrackDoc) => {
    if (!track.audioUrl) return;

    if (playingId === track.id) {
      activeAudio?.audio.pause();
      setPlayingId(null);
      return;
    }

    if (activeAudio) {
      activeAudio.audio.pause();
    }

    const sound = new Audio(track.audioUrl);
    sound.play().catch((err) => alert("Audio playback failed: " + err.message));
    sound.onended = () => setPlayingId(null);

    setActiveAudio({ id: track.id, audio: sound });
    setPlayingId(track.id);
  };

  const handleCreateTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.songTitle.trim() || !formData.audioUrl.trim()) return;

    setIsSaving(true);
    try {
      const trackId = `track_${Date.now()}`;
      const payload: VaultTrackDoc = {
        id: trackId,
        songTitle: formData.songTitle.trim(),
        trackType: formData.trackType,
        audioUrl: formData.audioUrl.trim(),
        tempoBpm: Number(formData.tempoBpm) || undefined,
        sectionTags: formData.sectionTags.length > 0 ? formData.sectionTags : ["All"],
        notes: formData.notes.trim(),
        uploadedAt: new Date().toISOString(),
      };

      await setDoc(doc(db, "vault_tracks", trackId), payload);
      setIsCreating(false);
      setFormData({
        songTitle: "",
        trackType: "full_mix",
        audioUrl: "",
        tempoBpm: 112,
        sectionTags: ["All"],
        notes: "",
      });
    } catch (err) {
      alert("Failed to record track: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteTrack = async (id: string, title: string) => {
    if (!confirm(`Delete "${title}" from the practice vault?`)) return;
    try {
      if (playingId === id) {
        activeAudio?.audio.pause();
        setPlayingId(null);
      }
      await deleteDoc(doc(db, "vault_tracks", id));
    } catch (err) {
      alert("Failed to delete track: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  const toggleSectionTag = (tag: string) => {
    setFormData((prev) => {
      const exists = prev.sectionTags.includes(tag);
      if (exists) {
        return { ...prev, sectionTags: prev.sectionTags.filter((t) => t !== tag) };
      }
      return { ...prev, sectionTags: [...prev.sectionTags, tag] };
    });
  };

  const filteredTracks = tracks.filter((t) =>
    t.songTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.sectionTags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (t.notes || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      {/* Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-yellow-400 bg-slate-950 px-2.5 py-0.5 rounded border border-slate-800">
              Stage 21 Studio
            </span>
            <span className="text-xs font-mono text-slate-400">
              Repertoire Media
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Rehearsal Vault Studio</h1>
          <p className="text-xs text-slate-400">
            Upload reference recordings, isolated sectional stems, and tempo click parameters for band practice.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/portal/vault"
            className="bg-slate-950 hover:bg-slate-800 text-yellow-400 border border-slate-800 hover:border-yellow-400/40 px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
          >
            <span>Musician View</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>

          {!isCreating && (
            <button
              type="button"
              onClick={() => setIsCreating(true)}
              className="bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition shadow shrink-0"
            >
              <Plus className="w-4 h-4" /> Add Practice Track
            </button>
          )}
        </div>
      </div>

      {/* Creation Modal / Inline Drawer */}
      {isCreating && (
        <form
          onSubmit={handleCreateTrack}
          className="bg-slate-900 border border-yellow-400/30 rounded-2xl p-5 space-y-4 shadow-2xl"
        >
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Music className="w-4 h-4 text-yellow-400" /> New Vault Audio Track
            </h2>
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">Song / Tune Title *</label>
              <input
                type="text"
                required
                placeholder="e.g. Bourbon Street Parade"
                value={formData.songTitle}
                onChange={(e) => setFormData({ ...formData, songTitle: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">Track Category</label>
              <select
                value={formData.trackType}
                onChange={(e) => setFormData({ ...formData, trackType: e.target.value as VaultTrackType })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400"
              >
                <option value="full_mix">Full Ensemble Mix</option>
                <option value="brass_stem">Brass Isolated Stem</option>
                <option value="drum_line">Drum Line Cadence / Groove</option>
                <option value="reference_recording">Original Reference Recording</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">Tempo (BPM)</label>
              <input
                type="number"
                min="40"
                max="240"
                value={formData.tempoBpm}
                onChange={(e) => setFormData({ ...formData, tempoBpm: Number(e.target.value) || 0 })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-300 block mb-1">Direct Audio Stream URL (MP3/WAV/Dropbox/CDN) *</label>
            <input
              type="url"
              required
              placeholder="https://firebasestorage.googleapis.com/... or direct mp3 link"
              value={formData.audioUrl}
              onChange={(e) => setFormData({ ...formData, audioUrl: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-300 block mb-2">Section Targeting</label>
            <div className="flex flex-wrap gap-2">
              {SECTION_OPTIONS.map((sec) => {
                const isSelected = formData.sectionTags.includes(sec);
                return (
                  <button
                    key={sec}
                    type="button"
                    onClick={() => toggleSectionTag(sec)}
                    className={`text-xs px-2.5 py-1 rounded-lg font-semibold transition border ${
                      isSelected
                        ? "bg-yellow-400 text-slate-950 border-yellow-400"
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
            <label className="text-[11px] font-semibold text-slate-300 block mb-1">Rehearsal Instructions / Notes</label>
            <input
              type="text"
              placeholder="e.g. Second-line rhythm in bar 32, horns play bridge an octave down"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="px-3 py-1.5 text-xs text-slate-400 hover:text-white transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold px-4 py-1.5 rounded-lg text-xs flex items-center gap-1 transition disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              <span>Save Track</span>
            </button>
          </div>
        </form>
      )}

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
        <input
          type="text"
          placeholder="Filter practice tracks by song title, section, or notes..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400 font-semibold"
        />
      </div>

      {/* Track Cards List */}
      <div className="space-y-3">
        {filteredTracks.map((t) => (
          <div
            key={t.id}
            className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition shadow"
          >
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => handleToggleAudio(t)}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition shrink-0 ${
                  playingId === t.id
                    ? "bg-yellow-400 text-slate-950 shadow-lg shadow-yellow-400/20"
                    : "bg-slate-950 text-slate-300 border border-slate-800 hover:text-white hover:border-slate-700"
                }`}
                title={playingId === t.id ? "Pause track" : "Play preview"}
              >
                {playingId === t.id ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
              </button>

              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-bold text-white truncate">{t.songTitle}</span>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                    {t.trackType.replace("_", " ")}
                  </span>
                  {t.tempoBpm && (
                    <span className="text-[10px] font-mono font-bold text-yellow-400 bg-yellow-400/10 px-2 py-0.5 rounded border border-yellow-400/20">
                      {t.tempoBpm} BPM
                    </span>
                  )}
                </div>

                {t.notes && <div className="text-xs text-slate-400">{t.notes}</div>}

                <div className="flex items-center gap-1 flex-wrap pt-0.5">
                  {t.sectionTags.map((sec) => (
                    <span
                      key={sec}
                      className="text-[9px] font-mono text-slate-400 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800"
                    >
                      {sec}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
              <button
                type="button"
                onClick={() => handleDeleteTrack(t.id, t.songTitle)}
                className="p-2 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-950 transition border border-transparent hover:border-slate-800"
                title="Remove track"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}

        {filteredTracks.length === 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-500 text-xs flex flex-col items-center justify-center gap-2">
            <Radio className="w-6 h-6 text-slate-600" />
            No practice tracks cataloged yet.
          </div>
        )}
      </div>
    </div>
  );
}