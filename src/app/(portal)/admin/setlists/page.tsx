"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { 
  collection, 
  onSnapshot, 
  setDoc, 
  doc 
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/lib/context/AuthContext";
import { canManageCatalog, canManageGigs } from "@/lib/auth/permissions";
import { User } from "@/lib/schema/user";
import { 
  Music, 
  Plus, 
  Trash2, 
  ArrowUp, 
  ArrowDown, 
  Save, 
  ExternalLink, 
  Calendar, 
  PlaySquare, 
  Loader2, 
  ShieldAlert,
  Search,
  Check
} from "lucide-react";

interface SongItem {
  id: string;
  title: string;
  artist?: string;
  keySignature?: string;
  tempoBpm?: number;
  driveLink?: string;
}

interface SetlistEntry {
  songId: string;
  title: string;
  keySignature: string;
  tempoBpm: number;
  notes?: string;
  driveLink?: string;
}

interface GigSummary {
  id: string;
  title: string;
  date: string;
}

export default function SetlistStudioPage() {
  const { profile, loading: authLoading } = useAuth();
  const [gigs, setGigs] = useState<GigSummary[]>([]);
  const [catalog, setCatalog] = useState<SongItem[]>([]);
  const [selectedGigId, setSelectedGigId] = useState<string>("");
  const [setlistTunes, setSetlistTunes] = useState<SetlistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [searchSongQuery, setSearchSongQuery] = useState("");

  // 1. Fetch available gigs
  useEffect(() => {
    if (authLoading) return;

    const unsubGigs = onSnapshot(
      collection(db, "gigs"),
      (snap) => {
        const gList: GigSummary[] = [];
        snap.forEach((d) => {
          const data = d.data();
          gList.push({
            id: d.id,
            title: data.title || data.publicDetails?.title || `Gig ${d.id.slice(0, 6)}`,
            date: data.date || "TBD",
          });
        });
        gList.sort((a, b) => a.date.localeCompare(b.date));
        setGigs(gList);
        if (gList.length > 0 && !selectedGigId) {
          setSelectedGigId(gList[0].id);
        }
      },
      (err) => console.error("Error loading gigs:", err)
    );

    // 2. Fetch song catalog
    const unsubSongs = onSnapshot(
      collection(db, "songs"),
      (snap) => {
        const sList: SongItem[] = [];
        snap.forEach((d) => {
          const data = d.data();
          sList.push({
            id: d.id,
            title: data.title || "Untitled",
            artist: data.artist || "",
            keySignature: data.keySignature || data.key || "Bb",
            tempoBpm: typeof data.tempoBpm === "number" ? data.tempoBpm : 120,
            driveLink: data.driveLink || "",
          });
        });
        sList.sort((a, b) => a.title.localeCompare(b.title));
        setCatalog(sList);
        setLoading(false);
      },
      (err) => {
        console.error("Error loading songs:", err);
        setLoading(false);
      }
    );

    return () => {
      unsubGigs();
      unsubSongs();
    };
  }, [authLoading, selectedGigId]);

  // 3. Listen to existing setlist for the selected gig
  useEffect(() => {
    if (!selectedGigId) return;

    const unsubSetlist = onSnapshot(
      doc(db, "setlists", selectedGigId),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setSetlistTunes(Array.isArray(data.tunes) ? data.tunes : []);
        } else {
          setSetlistTunes([]);
        }
      },
      (err) => console.warn("Notice: setlist not created yet:", err)
    );

    return () => unsubSetlist();
  }, [selectedGigId]);

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-400 gap-2 text-xs">
        <Loader2 className="w-4 h-4 animate-spin text-yellow-400" />
        Loading Setlist Studio...
      </div>
    );
  }

  const userProfile = profile as unknown as User;
  const hasAccess = Boolean(userProfile && (canManageCatalog(userProfile) || canManageGigs(userProfile)));

  if (!hasAccess) {
    return (
      <div className="p-8 text-rose-400 text-xs font-semibold flex items-center gap-2">
        <ShieldAlert className="w-4 h-4" />
        Musical Director or Gig Manager privileges required to modify setlists.
      </div>
    );
  }

  const handleAddTune = (song: SongItem) => {
    setSetlistTunes((prev) => [
      ...prev,
      {
        songId: song.id,
        title: song.title,
        keySignature: song.keySignature || "Bb",
        tempoBpm: song.tempoBpm || 120,
        notes: "",
        driveLink: song.driveLink || "",
      },
    ]);
  };

  const handleRemoveTune = (index: number) => {
    setSetlistTunes((prev) => prev.filter((_, i) => i !== index));
  };

  const handleMoveTune = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= setlistTunes.length) return;

    const updated = [...setlistTunes];
    const item = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = item;
    setSetlistTunes(updated);
  };

  const handleSaveSetlist = async () => {
    if (!selectedGigId) return;
    setSaving(true);
    try {
      await setDoc(
        doc(db, "setlists", selectedGigId),
        {
          gigId: selectedGigId,
          tunes: setlistTunes,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    } catch (err) {
      alert("Failed to save setlist: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setSaving(false);
    }
  };

  const filteredCatalog = catalog.filter(
    (c) =>
      c.title.toLowerCase().includes(searchSongQuery.toLowerCase()) ||
      (c.artist || "").toLowerCase().includes(searchSongQuery.toLowerCase())
  );

  const selectedGig = gigs.find((g) => g.id === selectedGigId);

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-yellow-400 bg-slate-950 px-2.5 py-0.5 rounded border border-slate-800">
              Stage 20 Studio
            </span>
            <span className="text-xs font-mono text-slate-400">
              {setlistTunes.length} Chart{setlistTunes.length === 1 ? "" : "s"} Slated
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Setlist Builder</h1>
          <p className="text-xs text-slate-400">
            Sequence gig repertoires, track tonal keys, and generate live stage views.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {selectedGigId && (
            <Link
              href={`/portal/perform/${selectedGigId}`}
              target="_blank"
              className="bg-slate-950 hover:bg-slate-800 text-yellow-400 border border-yellow-400/40 font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 transition"
            >
              <PlaySquare className="w-4 h-4" />
              <span>Launch Stage Mode</span>
              <ExternalLink className="w-3 h-3 text-slate-500" />
            </Link>
          )}

          <button
            type="button"
            disabled={saving}
            onClick={handleSaveSetlist}
            className="bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition shadow disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : savedSuccess ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
            <span>{saving ? "Saving..." : savedSuccess ? "Saved!" : "Save Setlist"}</span>
          </button>
        </div>
      </div>

      {/* Performance Gig Selector */}
      <div className="space-y-2">
        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
          Target Performance
        </label>
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
          {gigs.map((gig) => {
            const isSelected = gig.id === selectedGigId;
            return (
              <button
                key={gig.id}
                type="button"
                onClick={() => setSelectedGigId(gig.id)}
                className={`text-xs px-3.5 py-2 rounded-xl font-bold transition flex items-center gap-2 border shrink-0 text-left ${
                  isSelected
                    ? "bg-slate-800 text-white border-yellow-400/80 shadow-md"
                    : "bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200"
                }`}
              >
                <Calendar className={`w-3.5 h-3.5 ${isSelected ? "text-yellow-400" : "text-slate-500"}`} />
                <div>
                  <div className="font-bold truncate max-w-[170px]">{gig.title}</div>
                  <div className="text-[10px] font-mono text-slate-500">{gig.date}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Two-Column Layout: Setlist Order vs Song Library */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Current Ordered Setlist */}
        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Run of Show ({setlistTunes.length} Tunes)
            </h2>
            {selectedGig && (
              <span className="text-[11px] font-mono text-slate-500">{selectedGig.title}</span>
            )}
          </div>

          {setlistTunes.length === 0 ? (
            <div className="bg-slate-900/60 border border-dashed border-slate-800 rounded-2xl p-8 text-center space-y-2">
              <Music className="w-8 h-8 text-slate-600 mx-auto" />
              <div className="text-xs font-semibold text-slate-400">No charts added yet</div>
              <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                Pick tunes from the catalog on the right to populate the gig set sequence.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {setlistTunes.map((tune, idx) => (
                <div
                  key={`${tune.songId}-${idx}`}
                  className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex items-center justify-between gap-3 group hover:border-slate-700 transition shadow"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center font-mono font-bold text-xs text-yellow-400 shrink-0">
                      {idx + 1}
                    </span>
                    <div>
                      <div className="text-xs font-bold text-white">{tune.title}</div>
                      <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400 mt-0.5">
                        <span className="bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
                          {tune.keySignature}
                        </span>
                        <span>{tune.tempoBpm} BPM</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => handleMoveTune(idx, "up")}
                      className="p-1 rounded bg-slate-950 text-slate-400 hover:text-white disabled:opacity-30 transition border border-slate-800"
                      title="Move earlier in set"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === setlistTunes.length - 1}
                      onClick={() => handleMoveTune(idx, "down")}
                      className="p-1 rounded bg-slate-950 text-slate-400 hover:text-white disabled:opacity-30 transition border border-slate-800"
                      title="Move later in set"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveTune(idx)}
                      className="p-1 rounded bg-slate-950 text-slate-500 hover:text-rose-400 transition border border-slate-800 ml-1"
                      title="Remove from setlist"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Song Catalog Browser */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 shadow">
          <div className="space-y-1">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Repertoire Charts
            </h2>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search catalog..."
                value={searchSongQuery}
                onChange={(e) => setSearchSongQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400"
              />
            </div>
          </div>

          <div className="max-h-[480px] overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
            {filteredCatalog.map((song) => (
              <div
                key={song.id}
                className="bg-slate-950 border border-slate-800/80 hover:border-slate-700 rounded-xl p-2.5 flex items-center justify-between gap-2 transition"
              >
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white truncate">{song.title}</div>
                  <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-500 mt-0.5">
                    <span>{song.keySignature}</span>
                    <span>•</span>
                    <span>{song.tempoBpm} BPM</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleAddTune(song)}
                  className="bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold p-1.5 rounded-lg text-xs flex items-center gap-1 shrink-0 transition"
                  title="Add to setlist"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}