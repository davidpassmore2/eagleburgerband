"use client";

import React, { useState, useEffect } from "react";
import { doc, updateDoc, collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { buildRepertoireAnalytics, normalizeSongTitle, TuneStat, GigData } from "@/lib/repertoire/analytics";
import { 
  X, 
  Plus, 
  Trash2, 
  Save, 
  Music2, 
  Flame, 
  Archive 
} from "lucide-react";

export type SetItem = {
  id: string;
  title: string;
  artist?: string;
  keySignature?: string;
  driveLink?: string;
  performanceNote?: string;
};

export type PerformanceSet = {
  id: string;
  setName: string;
  items: SetItem[];
};

type LibrarySong = {
  id: string;
  title: string;
  artist?: string;
  keySignature?: string;
  driveLink?: string;
};

type Props = {
  gigId: string;
  initialSets?: PerformanceSet[];
  isOpen: boolean;
  onClose: () => void;
};

export default function SetlistBuilderModal({ gigId, initialSets = [], isOpen, onClose }: Props) {
  const [sets, setSets] = useState<PerformanceSet[]>(() =>
    initialSets.length > 0 ? initialSets : [{ id: "set-1", setName: "Set 1", items: [] }]
  );
  const [library, setLibrary] = useState<LibrarySong[]>([]);
  const [analytics, setAnalytics] = useState<Record<string, TuneStat>>({});
  const [selectedSetIdx, setSelectedSetIdx] = useState(0);
  const [saving, setSaving] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");

  useEffect(() => {
    if (!isOpen) return;

    const fetchCatalog = async () => {
      const snap = await getDocs(query(collection(db, "songs"), orderBy("title", "asc")));
      const list: LibrarySong[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as LibrarySong);
      });
      setLibrary(list);

      const gigsSnap = await getDocs(collection(db, "gigs"));
      const gigList: GigData[] = [];
      gigsSnap.forEach((d) => {
        gigList.push({ id: d.id, ...d.data() } as GigData);
      });
      setAnalytics(buildRepertoireAnalytics(gigList));
    };

    fetchCatalog();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAddSongToSet = (song: LibrarySong) => {
    const activeSet = sets[selectedSetIdx];
    if (!activeSet) return;

    const newItemId = `${song.id}-${activeSet.items.length}`;

    const newItem: SetItem = {
      id: newItemId,
      title: song.title,
      artist: song.artist || "",
      keySignature: song.keySignature || "",
      driveLink: song.driveLink || "",
      performanceNote: "",
    };

    const updated = [...sets];
    updated[selectedSetIdx] = {
      ...activeSet,
      items: [...activeSet.items, newItem],
    };
    setSets(updated);
  };

  const handleRemoveSong = (itemIdx: number) => {
    const activeSet = sets[selectedSetIdx];
    if (!activeSet) return;

    const updatedItems = activeSet.items.filter((_, idx) => idx !== itemIdx);
    const updated = [...sets];
    updated[selectedSetIdx] = { ...activeSet, items: updatedItems };
    setSets(updated);
  };

  const handleSaveSetlist = async () => {
    setSaving(true);
    try {
      await updateDoc(doc(db, "gigs", gigId), {
        setlist: sets,
        updatedAt: new Date().toISOString(),
      });
      onClose();
    } catch (err) {
      alert("Failed to save setlist: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setSaving(false);
    }
  };

  const filteredLibrary = library.filter((s) =>
    s.title.toLowerCase().includes(searchFilter.toLowerCase()) ||
    (s.artist && s.artist.toLowerCase().includes(searchFilter.toLowerCase()))
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden shadow-2xl">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center gap-2">
            <Music2 className="w-5 h-5 text-yellow-400" />
            <h2 className="text-base font-bold text-white">Gig Setlist Builder</h2>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-800 overflow-hidden">
          <div className="flex flex-col h-full overflow-hidden p-4 space-y-3 bg-slate-950/40">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Chart Library
              </span>
              <input
                type="text"
                placeholder="Search tunes..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-yellow-400 w-44 font-semibold"
              />
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {filteredLibrary.map((song) => {
                const norm = normalizeSongTitle(song.title);
                const stat = analytics[norm];

                return (
                  <div
                    key={song.id}
                    className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 flex items-center justify-between gap-2 hover:border-slate-700 transition"
                  >
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-white truncate">{song.title}</span>
                        {song.keySignature && (
                          <span className="text-[10px] font-mono text-yellow-400 bg-slate-950 px-1.5 py-0.2 rounded border border-slate-800">
                            {song.keySignature}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 text-[10px]">
                        {stat ? (
                          <>
                            <span className="text-slate-400 font-mono">
                              Played {stat.playCount}x
                            </span>
                            {stat.daysSinceLastPlayed !== null && (
                              <span
                                className={`flex items-center gap-0.5 font-semibold ${
                                  stat.statusCategory === "frequent"
                                    ? "text-amber-400"
                                    : stat.statusCategory === "vault"
                                    ? "text-purple-400"
                                    : "text-slate-400"
                                }`}
                              >
                                {stat.statusCategory === "frequent" && <Flame className="w-2.5 h-2.5" />}
                                {stat.statusCategory === "vault" && <Archive className="w-2.5 h-2.5" />}
                                {stat.daysSinceLastPlayed === 0
                                  ? "Played today"
                                  : `${stat.daysSinceLastPlayed}d ago`}
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="text-slate-500 font-mono">Never performed</span>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleAddSongToSet(song)}
                      className="bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold p-1.5 rounded-lg text-xs flex items-center gap-1 shrink-0 transition"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col h-full overflow-hidden p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-yellow-400">
                {sets[selectedSetIdx]?.setName || "Setlist"} ({sets[selectedSetIdx]?.items.length || 0} tunes)
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {sets[selectedSetIdx]?.items.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-xs">
                  No tunes added to this set yet. Click &quot;Add&quot; on any chart to insert it.
                </div>
              ) : (
                sets[selectedSetIdx]?.items.map((item, idx) => (
                  <div
                    key={item.id}
                    className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs font-mono font-bold text-yellow-400 w-5">
                        {idx + 1}.
                      </span>
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-white truncate block">
                          {item.title}
                        </span>
                        {item.artist && (
                          <span className="text-[10px] text-slate-400 truncate block">
                            {item.artist}
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveSong(idx)}
                      className="text-slate-500 hover:text-rose-400 p-1 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition text-xs"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={handleSaveSetlist}
            className="bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold px-5 py-2 rounded-xl text-xs flex items-center gap-1.5 transition disabled:opacity-50 shadow-lg"
          >
            <Save className="w-3.5 h-3.5" />
            {saving ? "Publishing..." : "Save Setlist"}
          </button>
        </div>
      </div>
    </div>
  );
}