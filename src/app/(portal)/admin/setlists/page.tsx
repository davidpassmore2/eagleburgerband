// src/app/(portal)/admin/setlists/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import { collection, onSnapshot, doc, setDoc, updateDoc, deleteDoc, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/lib/context/AuthContext";
import { canManageCatalog } from "@/lib/auth/permissions";
import { Setlist, SetlistSchema, SetlistItem } from "@/lib/schema/setlist";
import { Tune, TuneSchema } from "@/lib/schema/tune";
import { Gig, GigSchema } from "@/lib/schema/gig";
import { 
  Music, 
  ShieldAlert, 
  Plus, 
  Trash2, 
  Check, 
  X, 
  ArrowUp, 
  ArrowDown, 
  Clock, 
  Flame, 
  ListOrdered 
} from "lucide-react";

export default function SetlistsAdminPage() {
  const { profile, loading: authLoading } = useAuth();
  const [setlists, setSetlists] = useState<Setlist[]>([]);
  const [tunes, setTunes] = useState<Tune[]>([]);
  const [gigs, setGigs] = useState<Gig[]>([]);
  const [editingSetlist, setEditingSetlist] = useState<Setlist | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const [formData, setFormData] = useState<Partial<Setlist>>({
    title: "",
    description: "",
    gigId: "",
    targetDurationMinutes: 45,
    items: [],
  });

  useEffect(() => {
    const unsubSets = onSnapshot(collection(db, "setlists"), (snap) => {
      const list: Setlist[] = [];
      snap.forEach((d) => {
        const parsed = SetlistSchema.safeParse(d.data());
        if (parsed.success) list.push(parsed.data);
      });
      list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      setSetlists(list);
    });

    async function fetchTunesAndGigs() {
      const tSnap = await getDocs(collection(db, "tunes"));
      const tList: Tune[] = [];
      tSnap.forEach((d) => {
        const parsed = TuneSchema.safeParse(d.data());
        if (parsed.success) tList.push(parsed.data);
      });
      tList.sort((a, b) => a.title.localeCompare(b.title));
      setTunes(tList);

      const gSnap = await getDocs(collection(db, "gigs"));
      const gList: Gig[] = [];
      gSnap.forEach((d) => {
        const parsed = GigSchema.safeParse(d.data());
        if (parsed.success) gList.push(parsed.data);
      });
      gList.sort((a, b) => b.date.localeCompare(a.date));
      setGigs(gList);
    }

    fetchTunesAndGigs();
    return () => unsubSets();
  }, []);

  if (authLoading) return <div className="p-8 text-slate-400">Verifying authorization...</div>;
  if (!canManageCatalog(profile)) {
    return (
      <div className="p-8 text-amber-400 flex items-center gap-3">
        <ShieldAlert className="w-6 h-6 shrink-0" />
        <span>Catalog Manager permissions required to build performance setlists.</span>
      </div>
    );
  }

  const handleStartCreate = () => {
    setEditingSetlist(null);
    setIsCreating(true);
    setFormData({
      id: `set_${Date.now()}`,
      title: "",
      description: "",
      gigId: gigs[0]?.id || "",
      targetDurationMinutes: 45,
      items: [],
    });
  };

  const handleEdit = (setlist: Setlist) => {
    setEditingSetlist(setlist);
    setIsCreating(false);
    setFormData({ ...setlist });
  };

  const handleAddTuneToSet = (tuneId: string) => {
    if (!tuneId) return;
    const currentItems = formData.items || [];
    const newItem: SetlistItem = {
      tuneId,
      customNotes: "",
      transitionType: "standard_pause",
    };
    setFormData({ ...formData, items: [...currentItems, newItem] });
  };

  const handleMoveItem = (index: number, direction: "up" | "down") => {
    if (!formData.items) return;
    const items = [...formData.items];
    const targetIdx = direction === "up" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= items.length) return;

    const temp = items[index];
    items[index] = items[targetIdx];
    items[targetIdx] = temp;
    setFormData({ ...formData, items });
  };

  const handleRemoveItem = (index: number) => {
    if (!formData.items) return;
    const items = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items });
  };

  const handleUpdateItem = (index: number, field: keyof SetlistItem, value: string) => {
    if (!formData.items) return;
    const items = [...formData.items];
    items[index] = { ...items[index], [field]: value };
    setFormData({ ...formData, items });
  };

  const handleSave = async () => {
    if (!formData.title?.trim()) return;

    const setId = formData.id || `set_${Date.now()}`;
    const payload = {
      ...formData,
      id: setId,
      createdAt: editingSetlist?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const parsed = SetlistSchema.safeParse(payload);
    if (!parsed.success) {
      alert("Invalid setlist structure.");
      return;
    }

    const docRef = doc(db, "setlists", setId);
    if (isCreating) {
      await setDoc(docRef, parsed.data);
    } else {
      await updateDoc(docRef, parsed.data as Record<string, unknown>);
    }

    setEditingSetlist(null);
    setIsCreating(false);
  };

  const handleDelete = async (setId: string) => {
    if (!confirm("Are you sure you want to delete this setlist?")) return;
    await deleteDoc(doc(db, "setlists", setId));
  };

  const tuneMap = new Map(tunes.map((t) => [t.id, t]));

  const totalSeconds = (formData.items || []).reduce((acc, item) => {
    const tune = tuneMap.get(item.tuneId);
    return acc + (tune?.durationSeconds || 180);
  }, 0);
  const totalMinutes = Math.floor(totalSeconds / 60);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <ListOrdered className="text-yellow-400 w-6 h-6" /> Setlist Studio
          </h1>
          <p className="text-slate-400 text-sm">
            Sequence song progression, plan transition cues, and balance total performance run-time.
          </p>
        </div>

        {!editingSetlist && !isCreating && (
          <button
            onClick={handleStartCreate}
            className="flex items-center gap-2 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold px-4 py-2 rounded text-xs transition shadow"
          >
            <Plus className="w-4 h-4" /> Create Setlist
          </button>
        )}
      </div>

      {/* Editor Drawer */}
      {(isCreating || editingSetlist) && (
        <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 space-y-5 shadow-2xl">
          <div className="flex justify-between items-center border-b border-slate-800 pb-3">
            <div>
              <h2 className="text-lg font-bold text-white">
                {isCreating ? "Construct New Setlist" : `Editing: ${formData.title}`}
              </h2>
              <div className="text-xs text-slate-400 flex items-center gap-3 font-mono mt-1">
                <span>Target: {formData.targetDurationMinutes} min</span>
                <span>•</span>
                <span className={totalMinutes > (formData.targetDurationMinutes || 45) ? "text-amber-400 font-bold" : "text-emerald-400"}>
                  Calculated: {totalMinutes}m {totalSeconds % 60}s ({formData.items?.length || 0} charts)
                </span>
              </div>
            </div>
            <button
              onClick={() => {
                setEditingSetlist(null);
                setIsCreating(false);
              }}
              className="text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Setlist Title</label>
              <input
                type="text"
                value={formData.title || ""}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g. Garden Party Set 1"
                className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Target Gig Attachment</label>
              <select
                value={formData.gigId || ""}
                onChange={(e) => setFormData({ ...formData, gigId: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-xs text-white"
              >
                <option value="">-- Generic / Unassigned --</option>
                {gigs.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.date} - {g.internalLogistics?.title || g.publicDetails?.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Target Length (Minutes)</label>
              <input
                type="number"
                value={formData.targetDurationMinutes ?? 45}
                onChange={(e) => setFormData({ ...formData, targetDurationMinutes: parseInt(e.target.value) || 45 })}
                className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-xs text-white font-mono"
              />
            </div>
          </div>

          {/* Quick Add Tune Picker */}
          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 flex flex-col sm:flex-row items-center gap-3">
            <span className="text-xs font-semibold text-slate-400 uppercase shrink-0">Add Tune to Set:</span>
            <select
              defaultValue=""
              onChange={(e) => {
                handleAddTuneToSet(e.target.value);
                e.target.value = "";
              }}
              className="bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-xs text-white flex-1 w-full"
            >
              <option value="" disabled>-- Select chart from repertoire catalog --</option>
              {tunes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title} ({t.key} • {Math.floor(t.durationSeconds / 60)}:{((t.durationSeconds % 60)).toString().padStart(2, "0")})
                </option>
              ))}
            </select>
          </div>

          {/* Sequenced List */}
          <div className="space-y-2">
            {(formData.items || []).length === 0 ? (
              <div className="text-xs text-slate-500 italic p-6 text-center border border-dashed border-slate-800 rounded-lg">
                No songs sequenced in this setlist. Pick tunes from the selector above.
              </div>
            ) : (
              formData.items?.map((item, index) => {
                const tune = tuneMap.get(item.tuneId);

                return (
                  <div
                    key={index}
                    className="bg-slate-950 border border-slate-800 rounded-lg p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <span className="font-mono text-xs font-bold text-yellow-400 w-6 text-center">
                        #{index + 1}
                      </span>
                      <div>
                        <div className="font-bold text-white text-xs">
                          {tune ? tune.title : `Unknown Tune (${item.tuneId})`}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono flex items-center gap-2">
                          <span>Key: {tune?.key || "TBA"}</span>
                          <span>•</span>
                          <span>BPM: {tune?.tempoBpm || 120}</span>
                          <span>•</span>
                          <span>Time: {tune ? Math.floor(tune.durationSeconds / 60) : 3}m</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                      <select
                        value={item.transitionType}
                        onChange={(e) => handleUpdateItem(index, "transitionType", e.target.value)}
                        className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-[11px] text-slate-300"
                      >
                        <option value="standard_pause">Pause / Director Cue</option>
                        <option value="direct_segue">Direct Segue (Attacca)</option>
                        <option value="drum_roll">Drum Cadence Vamp</option>
                        <option value="vamp">Riff Vamp</option>
                      </select>

                      <input
                        type="text"
                        value={item.customNotes}
                        onChange={(e) => handleUpdateItem(index, "customNotes", e.target.value)}
                        placeholder="Soloist / specific transition note..."
                        className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-[11px] text-slate-300 flex-1 sm:w-48"
                      />

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleMoveItem(index, "up")}
                          disabled={index === 0}
                          className="p-1 text-slate-400 hover:text-white disabled:opacity-30"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveItem(index, "down")}
                          disabled={index === (formData.items?.length || 0) - 1}
                          className="p-1 text-slate-400 hover:text-white disabled:opacity-30"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(index)}
                          className="p-1 text-slate-400 hover:text-rose-400"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              onClick={() => {
                setEditingSetlist(null);
                setIsCreating(false);
              }}
              className="px-4 py-2 text-xs text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-1.5 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold px-5 py-2 rounded text-xs transition shadow"
            >
              <Check className="w-4 h-4" /> Save Setlist
            </button>
          </div>
        </div>
      )}

      {/* Setlists Directory */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {setlists.map((setlist) => {
          const associatedGig = gigs.find((g) => g.id === setlist.gigId);

          return (
            <div
              key={setlist.id}
              className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition flex flex-col justify-between space-y-4"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-base">{setlist.title}</span>
                  <span className="text-[11px] font-mono text-yellow-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                    {setlist.items.length} charts
                  </span>
                </div>

                {associatedGig && (
                  <div className="text-xs text-slate-400">
                    Attached to: <strong className="text-slate-300">{associatedGig.date} ({associatedGig.internalLogistics?.title || associatedGig.publicDetails?.title})</strong>
                  </div>
                )}

                <div className="space-y-1 pt-2">
                  {setlist.items.slice(0, 4).map((item, idx) => {
                    const t = tuneMap.get(item.tuneId);
                    return (
                      <div key={idx} className="text-xs text-slate-400 flex items-center gap-2">
                        <span className="font-mono text-[10px] text-slate-600">{idx + 1}.</span>
                        <span className="text-slate-200">{t?.title || item.tuneId}</span>
                        {item.transitionType === "direct_segue" && (
                          <span className="text-[9px] font-bold uppercase text-amber-400 bg-amber-950/60 px-1 rounded">
                            Attacca
                          </span>
                        )}
                      </div>
                    );
                  })}
                  {setlist.items.length > 4 && (
                    <div className="text-[11px] text-slate-500 italic pl-4">
                      + {setlist.items.length - 4} more charts...
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800/80">
                <button
                  onClick={() => handleEdit(setlist)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-yellow-400 text-xs font-semibold rounded transition"
                >
                  Edit Setlist
                </button>
                <button
                  onClick={() => handleDelete(setlist.id)}
                  className="p-1.5 text-slate-400 hover:text-rose-400 rounded hover:bg-slate-800 transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}