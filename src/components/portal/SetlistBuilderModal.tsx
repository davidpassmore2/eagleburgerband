"use client";

import React, { useState, useEffect } from "react";
import { 
  collection, 
  getDocs, 
  doc, 
  updateDoc 
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { 
  X, 
  Plus, 
  Trash2, 
  ChevronUp, 
  ChevronDown, 
  Search, 
  ListMusic, 
  Save 
} from "lucide-react";

export type SetlistItem = {
  id: string;
  tuneId: string;
  title: string;
  artist?: string;
  keySignature?: string;
  tempo?: string;
  driveLink?: string;
  performanceNote?: string;
};

export type PerformanceSet = {
  id: string;
  setName: string;
  items: SetlistItem[];
};

type TuneOption = {
  id: string;
  title: string;
  artist?: string;
  keySignature?: string;
  tempo?: string;
  driveLink?: string;
  status?: string;
};

type Props = {
  gigId: string;
  initialSets?: PerformanceSet[];
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
};

export default function SetlistBuilderModal({
  gigId,
  initialSets = [],
  isOpen,
  onClose,
  onSaved
}: Props) {
  const [sets, setSets] = useState<PerformanceSet[]>(() => {
    if (initialSets && initialSets.length > 0) {
      return initialSets;
    }
    return [{ id: "set_1", setName: "Set 1", items: [] }];
  });

  const [activeSetId, setActiveSetId] = useState<string>(() => {
    return initialSets && initialSets.length > 0 && initialSets[0]
      ? initialSets[0].id
      : "set_1";
  });

  const [library, setLibrary] = useState<TuneOption[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const fetchTunes = async () => {
      const snap = await getDocs(collection(db, "tunes"));
      const list: TuneOption[] = [];
      snap.forEach((d) => {
        const data = d.data();
        if (data.status !== "archived") {
          list.push({
            id: d.id,
            title: data.title || "Untitled",
            artist: data.artist || "",
            keySignature: data.keySignature || "",
            tempo: data.tempo || "",
            driveLink: data.driveLink || "",
          });
        }
      });
      list.sort((a, b) => a.title.localeCompare(b.title));
      setLibrary(list);
    };

    fetchTunes();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAddSet = () => {
    const nextIdx = sets.length + 1;
    const generatedId = doc(collection(db, "temp")).id;
    const newSet: PerformanceSet = {
      id: "set_" + generatedId,
      setName: `Set ${nextIdx}`,
      items: [],
    };
    setSets([...sets, newSet]);
    setActiveSetId(newSet.id);
  };

  const handleRemoveSet = (setId: string) => {
    if (sets.length <= 1) {
      alert("At least one set is required.");
      return;
    }
    const updated = sets.filter((s) => s.id !== setId);
    setSets(updated);
    if (activeSetId === setId && updated[0]) {
      setActiveSetId(updated[0].id);
    }
  };

  const handleAddTuneToSet = (tune: TuneOption) => {
    const targetSet = sets.find((s) => s.id === activeSetId) || sets[0];
    if (!targetSet) return;

    const generatedId = doc(collection(db, "temp")).id;

    const newItem: SetlistItem = {
      id: "item_" + generatedId,
      tuneId: tune.id,
      title: tune.title,
      artist: tune.artist,
      keySignature: tune.keySignature,
      tempo: tune.tempo,
      driveLink: tune.driveLink,
      performanceNote: "",
    };

    const updatedSets = sets.map((s) => {
      if (s.id === targetSet.id) {
        return { ...s, items: [...s.items, newItem] };
      }
      return s;
    });

    setSets(updatedSets);
  };

  const handleRemoveItem = (setId: string, itemId: string) => {
    setSets(
      sets.map((s) => {
        if (s.id === setId) {
          return { ...s, items: s.items.filter((i) => i.id !== itemId) };
        }
        return s;
      })
    );
  };

  const handleMoveItem = (setId: string, index: number, direction: "up" | "down") => {
    const currentSet = sets.find((s) => s.id === setId);
    if (!currentSet) return;

    const items = [...currentSet.items];
    const targetIndex = direction === "up" ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= items.length) return;

    const temp = items[index];
    const targetItem = items[targetIndex];
    if (temp && targetItem) {
      items[index] = targetItem;
      items[targetIndex] = temp;
    }

    setSets(
      sets.map((s) => (s.id === setId ? { ...s, items } : s))
    );
  };

  const handleUpdateNote = (setId: string, itemId: string, note: string) => {
    setSets(
      sets.map((s) => {
        if (s.id === setId) {
          return {
            ...s,
            items: s.items.map((i) => (i.id === itemId ? { ...i, performanceNote: note } : i)),
          };
        }
        return s;
      })
    );
  };

  const handleSaveSetlist = async () => {
    setSaving(true);
    try {
      await updateDoc(doc(db, "gigs", gigId), {
        setlist: sets,
        updatedAt: new Date().toISOString(),
      });
      if (onSaved) onSaved();
      onClose();
    } catch (err) {
      alert("Failed to save setlist: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setSaving(false);
    }
  };

  const activeSet = sets.find((s) => s.id === activeSetId) || sets[0] || {
    id: "set_default",
    setName: "Set 1",
    items: [],
  };

  const filteredTunes = library.filter((t) => {
    const q = searchTerm.toLowerCase();
    return (
      t.title.toLowerCase().includes(q) ||
      (t.artist && t.artist.toLowerCase().includes(q)) ||
      (t.keySignature && t.keySignature.toLowerCase().includes(q))
    );
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-5xl h-[88vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center gap-2">
            <ListMusic className="w-5 h-5 text-yellow-400" />
            <h2 className="text-lg font-bold text-white">Gig Setlist Studio</h2>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={saving}
              onClick={handleSaveSetlist}
              className="bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold px-3.5 py-1.5 rounded-lg text-xs flex items-center gap-1.5 transition disabled:opacity-50"
            >
              <Save className="w-4 h-4" /> {saving ? "Saving..." : "Publish Setlist"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Set Selector Tabs */}
        <div className="flex items-center gap-2 px-4 py-2 bg-slate-950/60 border-b border-slate-800 overflow-x-auto">
          {sets.map((s) => (
            <div key={s.id} className="flex items-center">
              <button
                type="button"
                onClick={() => setActiveSetId(s.id)}
                className={`px-3 py-1.5 rounded-l-lg text-xs font-bold transition flex items-center gap-2 border ${
                  activeSetId === s.id
                    ? "bg-yellow-400 text-slate-950 border-yellow-400"
                    : "bg-slate-900 text-slate-400 border-slate-800 hover:text-white"
                }`}
              >
                {s.setName} ({s.items.length})
              </button>
              <button
                type="button"
                onClick={() => handleRemoveSet(s.id)}
                className={`px-2 py-1.5 rounded-r-lg text-xs border border-l-0 transition ${
                  activeSetId === s.id
                    ? "bg-yellow-400 text-slate-950 border-yellow-400 hover:bg-yellow-500"
                    : "bg-slate-900 text-slate-500 border-slate-800 hover:text-rose-400"
                }`}
                title="Delete Set"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}

          <button
            type="button"
            onClick={handleAddSet}
            className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 border border-slate-700 transition"
          >
            <Plus className="w-3.5 h-3.5 text-yellow-400" /> New Set
          </button>
        </div>

        {/* Two-Pane Body */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 min-h-0 overflow-hidden">
          {/* Left: Active Set Order & Notes */}
          <div className="md:col-span-7 flex flex-col border-b md:border-b-0 md:border-r border-slate-800 overflow-y-auto p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={activeSet.setName}
                  onChange={(e) => {
                    const newName = e.target.value;
                    setSets(sets.map((s) => (s.id === activeSet.id ? { ...s, setName: newName } : s)));
                  }}
                  className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-sm font-bold text-white focus:outline-none focus:border-yellow-400 w-44"
                />
                <span className="text-xs text-slate-500 font-mono">
                  {activeSet.items.length} tunes
                </span>
              </div>
            </div>

            {activeSet.items.length === 0 ? (
              <div className="border border-dashed border-slate-800 rounded-xl p-8 text-center text-slate-500 text-xs my-auto">
                This set is empty. Click tunes from the library on the right to add them to this set.
              </div>
            ) : (
              <div className="space-y-2">
                {activeSet.items.map((item, idx) => (
                  <div
                    key={item.id}
                    className="bg-slate-950 border border-slate-800 rounded-lg p-3 space-y-2 group hover:border-slate-700 transition"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs font-mono font-bold text-yellow-400 w-5 text-center">
                          {idx + 1}.
                        </span>
                        <div className="truncate">
                          <span className="text-xs font-bold text-white block truncate">
                            {item.title}
                          </span>
                          {item.artist && (
                            <span className="text-[11px] text-slate-400 block truncate">
                              {item.artist}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {item.keySignature && (
                          <span className="text-[10px] font-mono font-bold text-yellow-400 bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded">
                            {item.keySignature}
                          </span>
                        )}
                        {item.tempo && (
                          <span className="text-[10px] font-mono text-slate-500">
                            {item.tempo} bpm
                          </span>
                        )}

                        {/* Reorder Buttons */}
                        <div className="flex items-center gap-0.5 pl-1 border-l border-slate-800">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => handleMoveItem(activeSet.id, idx, "up")}
                            className="text-slate-500 hover:text-white disabled:opacity-20 p-0.5"
                            title="Move Up"
                          >
                            <ChevronUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === activeSet.items.length - 1}
                            onClick={() => handleMoveItem(activeSet.id, idx, "down")}
                            className="text-slate-500 hover:text-white disabled:opacity-20 p-0.5"
                            title="Move Down"
                          >
                            <ChevronDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(activeSet.id, item.id)}
                            className="text-slate-500 hover:text-rose-400 p-0.5 ml-1"
                            title="Remove From Set"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Gig-Specific Tune Note */}
                    <div>
                      <input
                        type="text"
                        placeholder="Live note (e.g. Solo: Alto Sax -> Bone, Segue into next tune...)"
                        value={item.performanceNote || ""}
                        onChange={(e) => handleUpdateNote(activeSet.id, item.id, e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-[11px] text-slate-300 placeholder-slate-600 focus:outline-none focus:border-yellow-400"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right: Master Repertoire Library Picker */}
          <div className="md:col-span-5 flex flex-col p-4 bg-slate-950/40 overflow-y-auto space-y-3">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500" />
              <input
                type="text"
                placeholder="Search catalog to add..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-8 pr-2 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400"
              />
            </div>

            <div className="space-y-1.5 overflow-y-auto flex-1">
              {filteredTunes.length === 0 ? (
                <div className="text-center py-6 text-slate-500 text-xs">
                  No matching charts in library.
                </div>
              ) : (
                filteredTunes.map((tune) => (
                  <div
                    key={tune.id}
                    onClick={() => handleAddTuneToSet(tune)}
                    className="p-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg cursor-pointer transition flex items-center justify-between gap-2 group"
                  >
                    <div className="truncate">
                      <div className="text-xs font-bold text-white group-hover:text-yellow-400 transition truncate">
                        {tune.title}
                      </div>
                      {tune.artist && (
                        <div className="text-[10px] text-slate-400 truncate">{tune.artist}</div>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {tune.keySignature && (
                        <span className="text-[10px] font-mono text-yellow-400 bg-slate-950 px-1 py-0.5 rounded border border-slate-800">
                          {tune.keySignature}
                        </span>
                      )}
                      <span className="bg-slate-950 text-slate-300 group-hover:bg-yellow-400 group-hover:text-slate-950 p-1 rounded transition border border-slate-800">
                        <Plus className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}