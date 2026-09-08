// src/app/(portal)/admin/catalog/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import { collection, onSnapshot, doc, setDoc, updateDoc, deleteDoc, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/lib/context/AuthContext";
import { canManageCatalog } from "@/lib/auth/permissions";
import { Tune, TuneSchema, ChartAttachment } from "@/lib/schema/tune";
import { Section, SectionSchema } from "@/lib/schema/section";
import { 
  Library, 
  ShieldAlert, 
  Plus, 
  Edit2, 
  Trash2, 
  Check, 
  X, 
  Music, 
  FileText, 
  Clock, 
  Activity, 
  ExternalLink 
} from "lucide-react";

interface FormState {
  id: string;
  title: string;
  originalArtist: string;
  arranger: string;
  key: string;
  tempoBpm: number;
  timeSignature: string;
  durationSeconds: number;
  lifecycleStatus: Tune["lifecycleStatus"];
  notes: string;
  chartAttachments: ChartAttachment[];
  audioReferenceUrl: string;
}

const DEFAULT_FORM: FormState = {
  id: "",
  title: "",
  originalArtist: "",
  arranger: "",
  key: "Bb",
  tempoBpm: 124,
  timeSignature: "4/4",
  durationSeconds: 180,
  lifecycleStatus: "active_rotation",
  notes: "",
  chartAttachments: [],
  audioReferenceUrl: "",
};

export default function CatalogAdminPage() {
  const { profile, loading: authLoading } = useAuth();
  const [tunes, setTunes] = useState<Tune[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [editingTune, setEditingTune] = useState<Tune | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [formData, setFormData] = useState<FormState>(DEFAULT_FORM);

  useEffect(() => {
    const unsubTunes = onSnapshot(collection(db, "tunes"), (snap) => {
      const list: Tune[] = [];
      snap.forEach((d) => {
        const parsed = TuneSchema.safeParse(d.data());
        if (parsed.success) list.push(parsed.data);
      });
      list.sort((a, b) => a.title.localeCompare(b.title));
      setTunes(list);
    });

    async function loadSections() {
      const secSnap = await getDocs(collection(db, "sections"));
      const sList: Section[] = [];
      secSnap.forEach((d) => {
        const parsed = SectionSchema.safeParse(d.data());
        if (parsed.success) sList.push(parsed.data);
      });
      sList.sort((a, b) => a.order - b.order);
      setSections(sList);
    }

    loadSections();
    return () => unsubTunes();
  }, []);

  if (authLoading) return <div className="p-8 text-slate-400">Verifying authorization...</div>;
  if (!canManageCatalog(profile)) {
    return (
      <div className="p-8 text-amber-400 flex items-center gap-3">
        <ShieldAlert className="w-6 h-6 shrink-0" />
        <span>Catalog Manager or Administrator clearance required.</span>
      </div>
    );
  }

  const handleStartCreate = () => {
    setEditingTune(null);
    setIsCreating(true);
    setFormData({
      ...DEFAULT_FORM,
      id: `tune_${Date.now()}`,
    });
  };

  const handleEdit = (tune: Tune) => {
    setEditingTune(tune);
    setIsCreating(false);
    setFormData({
      id: tune.id,
      title: tune.title,
      originalArtist: tune.originalArtist || "",
      arranger: tune.arranger || "",
      key: tune.key || "Bb",
      tempoBpm: tune.tempoBpm ?? 120,
      timeSignature: tune.timeSignature || "4/4",
      durationSeconds: tune.durationSeconds ?? 180,
      lifecycleStatus: tune.lifecycleStatus,
      notes: tune.notes || "",
      chartAttachments: tune.chartAttachments || [],
      audioReferenceUrl: tune.audioReferenceUrl || "",
    });
  };

  const handleAddChartAttachment = () => {
    if (sections.length === 0) return;
    setFormData({
      ...formData,
      chartAttachments: [
        ...formData.chartAttachments,
        {
          sectionId: sections[0].id,
          partName: `${sections[0].name} Part`,
          fileUrl: "",
          key: formData.key,
        },
      ],
    });
  };

  const handleUpdateChart = (index: number, field: keyof ChartAttachment, value: string) => {
    const updated = [...formData.chartAttachments];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, chartAttachments: updated });
  };

  const handleRemoveChart = (index: number) => {
    const updated = formData.chartAttachments.filter((_, i) => i !== index);
    setFormData({ ...formData, chartAttachments: updated });
  };

  const handleSave = async () => {
    if (!formData.title.trim()) return;

    const tuneId = formData.id || `tune_${Date.now()}`;
    const payload = {
      ...formData,
      id: tuneId,
      createdAt: editingTune?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const parsed = TuneSchema.safeParse(payload);
    if (!parsed.success) {
      alert("Invalid tune data. Please check required fields.");
      return;
    }

    const tuneDocRef = doc(db, "tunes", tuneId);
    if (isCreating) {
      await setDoc(tuneDocRef, parsed.data);
    } else {
      await updateDoc(tuneDocRef, parsed.data as Record<string, unknown>);
    }

    setEditingTune(null);
    setIsCreating(false);
  };

  const handleDelete = async (tuneId: string) => {
    if (!confirm("Are you sure you want to remove this tune from the catalog?")) return;
    await deleteDoc(doc(db, "tunes", tuneId));
  };

  const statusBadges: Record<Tune["lifecycleStatus"], string> = {
    active_rotation: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    in_rehearsal: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    concept: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    archived: "bg-slate-800 text-slate-400 border-slate-700",
  };

  const filteredTunes = filterStatus === "all"
    ? tunes
    : tunes.filter((t) => t.lifecycleStatus === filterStatus);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Library className="text-yellow-400 w-6 h-6" /> Repertoire Catalog Studio
          </h1>
          <p className="text-slate-400 text-sm">
            Maintain tune charts, keys, tempos, rehearsal stages, and section-specific PDF parts.
          </p>
        </div>

        {!editingTune && !isCreating && (
          <button
            onClick={handleStartCreate}
            className="flex items-center gap-2 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold px-4 py-2 rounded text-xs transition shadow"
          >
            <Plus className="w-4 h-4" /> Add New Tune
          </button>
        )}
      </div>

      {/* Editor Drawer */}
      {(isCreating || editingTune) && (
        <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 space-y-5 shadow-2xl">
          <div className="flex justify-between items-center border-b border-slate-800 pb-3">
            <h2 className="text-lg font-bold text-white">
              {isCreating ? "Add Tune to Catalog" : `Edit Chart: ${formData.title}`}
            </h2>
            <button
              onClick={() => {
                setEditingTune(null);
                setIsCreating(false);
              }}
              className="text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Tune Title</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g. Ghost Town"
                className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Original Artist</label>
              <input
                type="text"
                value={formData.originalArtist}
                onChange={(e) => setFormData({ ...formData, originalArtist: e.target.value })}
                placeholder="e.g. The Specials"
                className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Arranger</label>
              <input
                type="text"
                value={formData.arranger}
                onChange={(e) => setFormData({ ...formData, arranger: e.target.value })}
                placeholder="e.g. Dave C."
                className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-xs text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Concert Key</label>
              <input
                type="text"
                value={formData.key}
                onChange={(e) => setFormData({ ...formData, key: e.target.value })}
                placeholder="Bb, Fm, Eb"
                className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-xs text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Tempo (BPM)</label>
              <input
                type="number"
                value={formData.tempoBpm}
                onChange={(e) => setFormData({ ...formData, tempoBpm: parseInt(e.target.value) || 120 })}
                className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-xs text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Meter</label>
              <input
                type="text"
                value={formData.timeSignature}
                onChange={(e) => setFormData({ ...formData, timeSignature: e.target.value })}
                placeholder="4/4, 6/8"
                className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-xs text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Run Time (Sec)</label>
              <input
                type="number"
                value={formData.durationSeconds}
                onChange={(e) => setFormData({ ...formData, durationSeconds: parseInt(e.target.value) || 180 })}
                className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-xs text-white font-mono"
              />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Lifecycle</label>
              <select
                value={formData.lifecycleStatus}
                onChange={(e) => setFormData({ ...formData, lifecycleStatus: e.target.value as Tune["lifecycleStatus"] })}
                className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-xs text-white"
              >
                <option value="active_rotation">Active Rotation</option>
                <option value="in_rehearsal">In Rehearsal</option>
                <option value="concept">Concept / Read-Through</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Reference Audio Link</label>
            <input
              type="url"
              value={formData.audioReferenceUrl}
              onChange={(e) => setFormData({ ...formData, audioReferenceUrl: e.target.value })}
              placeholder="https://youtube.com/watch?v=... or Google Drive demo"
              className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-xs text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Rehearsal & Performance Directives</label>
            <textarea
              rows={2}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Intro drum cadence 4 bars; horns enter measure 5 on cue."
              className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-xs text-white"
            />
          </div>

          {/* Section Chart Attachments */}
          <div className="space-y-3 pt-2 border-t border-slate-800">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-yellow-400" /> Section Chart Attachments
              </span>
              <button
                type="button"
                onClick={handleAddChartAttachment}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-yellow-400 rounded text-xs font-semibold transition flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Add Part
              </button>
            </div>

            {formData.chartAttachments.length === 0 ? (
              <div className="text-xs text-slate-500 italic p-3 bg-slate-950/60 rounded border border-slate-800 text-center">
                No section parts attached. Add PDF links for Low Brass, Trumpets, Reeds, or Percussion.
              </div>
            ) : (
              <div className="space-y-2">
                {formData.chartAttachments.map((chart, idx) => (
                  <div key={idx} className="flex flex-col sm:flex-row items-center gap-2 bg-slate-950 p-2.5 rounded border border-slate-800">
                    <select
                      value={chart.sectionId}
                      onChange={(e) => handleUpdateChart(idx, "sectionId", e.target.value)}
                      className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white sm:w-1/4 w-full"
                    >
                      {sections.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>

                    <input
                      type="text"
                      value={chart.partName}
                      onChange={(e) => handleUpdateChart(idx, "partName", e.target.value)}
                      placeholder="Part (e.g. 1st Trombone / Sousaphone)"
                      className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white sm:w-1/4 w-full"
                    />

                    <input
                      type="url"
                      value={chart.fileUrl}
                      onChange={(e) => handleUpdateChart(idx, "fileUrl", e.target.value)}
                      placeholder="PDF or Drive Link URL"
                      className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white flex-1 w-full"
                    />

                    <button
                      type="button"
                      onClick={() => handleRemoveChart(idx)}
                      className="p-1 text-slate-400 hover:text-rose-400 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              onClick={() => {
                setEditingTune(null);
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
              <Check className="w-4 h-4" /> Save Tune Chart
            </button>
          </div>
        </div>
      )}

      {/* Catalog Table */}
      <div className="flex items-center gap-2 pb-2">
        {["all", "active_rotation", "in_rehearsal", "concept", "archived"].map((status) => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`px-3 py-1.5 rounded text-xs font-semibold uppercase tracking-wider transition ${
              filterStatus === status
                ? "bg-yellow-400 text-slate-950 font-bold"
                : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
            }`}
          >
            {status.replace("_", " ")}
          </button>
        ))}
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-x-auto shadow">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
            <tr>
              <th className="p-4">Title & Artist</th>
              <th className="p-4">Key / BPM / Time</th>
              <th className="p-4">Stage</th>
              <th className="p-4">Parts Attached</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {filteredTunes.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-6 text-center text-slate-500">
                  No charts found matching this filter.
                </td>
              </tr>
            ) : (
              filteredTunes.map((tune) => {
                const minutes = Math.floor(tune.durationSeconds / 60);
                const seconds = (tune.durationSeconds % 60).toString().padStart(2, "0");

                return (
                  <tr key={tune.id} className="hover:bg-slate-800/30 transition">
                    <td className="p-4">
                      <div className="font-bold text-white text-sm flex items-center gap-2">
                        <Music className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
                        {tune.title}
                      </div>
                      <div className="text-slate-400 text-[11px] mt-0.5">
                        {tune.originalArtist && <span>Orig: {tune.originalArtist}</span>}
                        {tune.arranger && <span className="ml-2 font-mono">Arr: {tune.arranger}</span>}
                      </div>
                    </td>
                    <td className="p-4 font-mono">
                      <span className="text-yellow-400 font-bold">{tune.key}</span>
                      <span className="text-slate-500 mx-1.5">•</span>
                      <span>{tune.tempoBpm} BPM</span>
                      <span className="text-slate-500 mx-1.5">•</span>
                      <span>{tune.timeSignature}</span>
                      <span className="text-slate-500 mx-1.5">•</span>
                      <span className="text-slate-400">{minutes}:{seconds}</span>
                    </td>
                    <td className="p-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                          statusBadges[tune.lifecycleStatus]
                        }`}
                      >
                        {tune.lifecycleStatus.replace("_", " ")}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-1.5">
                        {tune.chartAttachments?.length > 0 ? (
                          tune.chartAttachments.map((c, i) => (
                            <a
                              key={i}
                              href={c.fileUrl || "#"}
                              target="_blank"
                              rel="noreferrer"
                              className="bg-slate-950 hover:bg-slate-800 border border-slate-800 px-2 py-0.5 rounded text-[10px] text-slate-300 flex items-center gap-1 font-mono transition"
                            >
                              <FileText className="w-3 h-3 text-yellow-400" />
                              {c.partName}
                            </a>
                          ))
                        ) : (
                          <span className="text-slate-600 italic">No parts</span>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(tune)}
                          className="p-1.5 text-slate-400 hover:text-yellow-400 rounded hover:bg-slate-800 transition"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(tune.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-400 rounded hover:bg-slate-800 transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}