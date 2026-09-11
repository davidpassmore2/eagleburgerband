"use client";

import React, { useEffect, useState } from "react";
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc,
  setDoc,
  getDocs
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/lib/context/AuthContext";
import { canManageCatalog, isAdmin, canViewAndSubmitTunes } from "@/lib/auth/permissions";
import { 
  Music, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  ExternalLink, 
  ShieldAlert, 
  X,
  SlidersHorizontal,
  UserCheck,
  Sparkles,
  BookOpen,
  Filter
} from "lucide-react";
import { TuneStatus } from "@/lib/schema/tune";

export type TuneRecord = {
  id: string;
  title: string;
  artist?: string;
  keySignature?: string;
  tempo?: string;
  meter?: string;
  driveLink?: string;
  audioSampleUrl?: string;
  chartContactUid?: string;
  chartContactName?: string;
  tags?: string[];
  notes?: string;
  status: TuneStatus;
  createdAt: string;
  updatedAt: string;
  [key: string]: unknown;
};

type MemberOption = {
  uid: string;
  displayName: string;
  email: string;
};

export default function AdminTunesStudioPage() {
  const { profile, loading: authLoading } = useAuth();
  const [tunes, setTunes] = useState<TuneRecord[]>([]);
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [tagFilter, setTagFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | TuneStatus>("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTune, setEditingTune] = useState<TuneRecord | null>(null);

  // Form State
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [keySignature, setKeySignature] = useState("Bb");
  const [tempo, setTempo] = useState("");
  const [meter, setMeter] = useState("4/4");
  const [driveLink, setDriveLink] = useState("");
  const [audioSampleUrl, setAudioSampleUrl] = useState("");
  const [chartContactUid, setChartContactUid] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<TuneStatus>("active");
  const [saving, setSaving] = useState(false);

  // Subscribe to Tunes and fetch Users list
  useEffect(() => {
    const unsubTunes = onSnapshot(collection(db, "tunes"), (snap) => {
      const list: TuneRecord[] = [];
      snap.forEach((d) => {
        const raw = d.data();
        list.push({
          id: d.id,
          title: raw.title || "Untitled Tune",
          artist: raw.artist || "",
          keySignature: raw.keySignature || "",
          tempo: raw.tempo || "",
          meter: raw.meter || "4/4",
          driveLink: raw.driveLink || "",
          audioSampleUrl: raw.audioSampleUrl || "",
          chartContactUid: raw.chartContactUid || "",
          chartContactName: raw.chartContactName || "",
          tags: Array.isArray(raw.tags) ? raw.tags : [],
          notes: raw.notes || "",
          status: raw.status || "active",
          createdAt: raw.createdAt || new Date().toISOString(),
          updatedAt: raw.updatedAt || new Date().toISOString(),
        });
      });
      list.sort((a, b) => a.title.localeCompare(b.title));
      setTunes(list);
    });

    const fetchMembers = async () => {
      const snap = await getDocs(collection(db, "users"));
      const list: MemberOption[] = [];
      snap.forEach((d) => {
        const data = d.data();
        const name = data.displayName || data.name || data.email?.split("@")[0] || "Unnamed Member";
        list.push({
          uid: d.id,
          displayName: name,
          email: data.email || "",
        });
      });
      list.sort((a, b) => a.displayName.localeCompare(b.displayName));
      setMembers(list);
    };

    fetchMembers();

    return () => unsubTunes();
  }, []);

  if (authLoading) return <div className="p-8 text-slate-400">Verifying music clearance...</div>;
  if (!profile || !canViewAndSubmitTunes(profile)) {
    return (
      <div className="p-8 text-amber-400 flex items-center gap-3">
        <ShieldAlert className="w-6 h-6 shrink-0" />
        <span>Band Member account required to view and submit repertoire charts.</span>
      </div>
    );
  }

  const isManager = Boolean(profile && (canManageCatalog(profile) || isAdmin(profile)));

  const openNewModal = () => {
    setEditingTune(null);
    setTitle("");
    setArtist("");
    setKeySignature("Bb");
    setTempo("120");
    setMeter("4/4");
    setDriveLink("");
    setAudioSampleUrl("");
    setChartContactUid(profile?.uid || "");
    setTagInput("");
    setNotes("");
    setStatus("active");
    setIsModalOpen(true);
  };

  const openEditModal = (tune: TuneRecord) => {
    setEditingTune(tune);
    setTitle(tune.title);
    setArtist(tune.artist || "");
    setKeySignature(tune.keySignature || "Bb");
    setTempo(tune.tempo || "");
    setMeter(tune.meter || "4/4");
    setDriveLink(tune.driveLink || "");
    setAudioSampleUrl(tune.audioSampleUrl || "");
    setChartContactUid(tune.chartContactUid || "");
    setTagInput((tune.tags || []).join(", "));
    setNotes(tune.notes || "");
    setStatus(tune.status);
    setIsModalOpen(true);
  };

  const handleSaveTune = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || saving) return;
    setSaving(true);

    const parsedTags = tagInput
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    const contactMember = members.find((m) => m.uid === chartContactUid);
    const resolvedContactName = contactMember 
      ? contactMember.displayName 
      : (chartContactUid === profile?.uid ? (profile?.displayName || "You") : "");

    const payload = {
      title: title.trim(),
      artist: artist.trim(),
      keySignature: keySignature.trim(),
      tempo: tempo.trim(),
      meter: meter.trim(),
      driveLink: driveLink.trim(),
      audioSampleUrl: audioSampleUrl.trim(),
      chartContactUid: chartContactUid || "",
      chartContactName: resolvedContactName,
      tags: parsedTags,
      notes: notes.trim(),
      status,
      updatedAt: new Date().toISOString(),
    };

    try {
      if (editingTune) {
        await updateDoc(doc(db, "tunes", editingTune.id), payload);
      } else {
        await addDoc(collection(db, "tunes"), {
          ...payload,
          createdAt: new Date().toISOString(),
        });
      }

      // Sync to songs collection for setlists and repertoire analytics
      try {
        const songId = `song_${title.toLowerCase().replace(/[^a-z0-9]/g, "_")}`;
        await setDoc(doc(db, "songs", songId), {
          id: songId,
          title: title.trim(),
          artist: artist.trim(),
          arranger: resolvedContactName || (profile?.displayName || "Eagleburger"),
          keySignature: keySignature.trim(),
          tempoBpm: Number(tempo) || 120,
          driveLink: driveLink.trim(),
          tags: parsedTags,
          status,
          updatedAt: new Date().toISOString(),
        }, { merge: true });
      } catch (syncErr) {
        console.warn("Notice: optional song collection sync:", syncErr);
      }

      setIsModalOpen(false);
    } catch (err) {
      alert("Failed to save tune: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTune = async (tune: TuneRecord) => {
    const isOwner = tune.chartContactUid === profile?.uid;
    if (!isManager && !isOwner) {
      alert("Only Band Managers or the original chart submitter can delete this tune.");
      return;
    }

    if (confirm(`Delete chart "${tune.title}" from the master library?`)) {
      try {
        await deleteDoc(doc(db, "tunes", tune.id));
        const songId = `song_${tune.title.toLowerCase().replace(/[^a-z0-9]/g, "_")}`;
        await deleteDoc(doc(db, "songs", songId));
      } catch (err) {
        alert("Failed to delete chart: " + (err instanceof Error ? err.message : String(err)));
      }
    }
  };

  const allTags = Array.from(new Set(tunes.flatMap((t) => t.tags || []))).sort();

  const statusCounts = {
    all: tunes.length,
    active: tunes.filter((t) => t.status === "active").length,
    in_repertoire: tunes.filter((t) => t.status === "in_repertoire").length,
    in_rehearsal: tunes.filter((t) => t.status === "in_rehearsal").length,
    archived: tunes.filter((t) => t.status === "archived").length,
  };

  const filteredTunes = tunes.filter((t) => {
    const matchesSearch =
      t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.artist && t.artist.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (t.keySignature && t.keySignature.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (t.chartContactName && t.chartContactName.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesTag = tagFilter === "all" || (t.tags && t.tags.includes(tagFilter));
    const matchesStatus = statusFilter === "all" || t.status === statusFilter;

    return matchesSearch && matchesTag && matchesStatus;
  });

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div 
        suppressHydrationWarning
        style={{ backgroundColor: "var(--ebb-surface)", borderColor: "var(--ebb-border)" }}
        className="border rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow transition-colors"
      >
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span 
              suppressHydrationWarning
              style={{
                backgroundColor: "var(--ebb-surface-muted)",
                borderColor: "var(--ebb-border)",
                color: "var(--ebb-primary)"
              }}
              className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded border"
            >
              All Members Welcome
            </span>
            <span className="text-[11px] font-mono text-slate-400">
              {tunes.length} tunes cataloged
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
            <Music className="w-5 h-5" style={{ color: "var(--ebb-primary)" }} /> Repertoire Studio & Chart Library
          </h1>
          <p className="text-slate-400 text-xs">
            Browse active band repertoire, download sheet music part PDFs, check concert keys, and submit new charts.
          </p>
        </div>

        <button
          type="button"
          suppressHydrationWarning
          onClick={openNewModal}
          style={{
            backgroundColor: "var(--ebb-primary)",
            color: "#020617",
          }}
          className="font-bold px-4 py-2.5 rounded-xl text-xs transition flex items-center gap-1.5 shadow hover:brightness-110 shrink-0"
        >
          <Plus className="w-4 h-4" /> Add Chart / Tune
        </button>
      </div>

      {/* Quick Status Filter Chips */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1 mr-1">
          <Filter className="w-3.5 h-3.5" style={{ color: "var(--ebb-primary)" }} /> Status:
        </span>
        <button
          type="button"
          onClick={() => setStatusFilter("all")}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition border ${
            statusFilter === "all"
              ? "bg-slate-100 text-slate-900 border-white shadow-sm"
              : "text-slate-400 hover:text-white"
          }`}
          style={statusFilter !== "all" ? { backgroundColor: "var(--ebb-surface)", borderColor: "var(--ebb-border)" } : {}}
        >
          All ({statusCounts.all})
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter("active")}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition border ${
            statusFilter === "active"
              ? "bg-emerald-500 text-slate-950 border-emerald-400 shadow-sm"
              : "text-emerald-400 hover:bg-emerald-500/10"
          }`}
          style={statusFilter !== "active" ? { backgroundColor: "var(--ebb-surface)", borderColor: "var(--ebb-border)" } : {}}
        >
          Active Rotation ({statusCounts.active})
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter("in_repertoire")}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition border flex items-center gap-1.5 ${
            statusFilter === "in_repertoire"
              ? "bg-sky-400 text-slate-950 border-sky-300 shadow-sm font-black"
              : "text-sky-400 hover:bg-sky-500/10"
          }`}
          style={statusFilter !== "in_repertoire" ? { backgroundColor: "var(--ebb-surface)", borderColor: "var(--ebb-border)" } : {}}
        >
          <BookOpen className="w-3.5 h-3.5 shrink-0" />
          In Repertoire ({statusCounts.in_repertoire})
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter("in_rehearsal")}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition border ${
            statusFilter === "in_rehearsal"
              ? "bg-amber-400 text-slate-950 border-amber-300 shadow-sm"
              : "text-amber-400 hover:bg-amber-500/10"
          }`}
          style={statusFilter !== "in_rehearsal" ? { backgroundColor: "var(--ebb-surface)", borderColor: "var(--ebb-border)" } : {}}
        >
          In Rehearsal ({statusCounts.in_rehearsal})
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter("archived")}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition border ${
            statusFilter === "archived"
              ? "bg-slate-700 text-white border-slate-600 shadow-sm"
              : "text-slate-500 hover:text-slate-400"
          }`}
          style={statusFilter !== "archived" ? { backgroundColor: "var(--ebb-surface)", borderColor: "var(--ebb-border)" } : {}}
        >
          Archived ({statusCounts.archived})
        </button>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
          <input
            type="text"
            suppressHydrationWarning
            placeholder="Search title, artist, key, or charting lead..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ backgroundColor: "var(--ebb-surface-muted)", borderColor: "var(--ebb-border)" }}
            className="border rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 w-full focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full sm:w-auto">
          <SlidersHorizontal className="w-4 h-4 text-slate-500 shrink-0" />
          <select
            value={tagFilter}
            suppressHydrationWarning
            onChange={(e) => setTagFilter(e.target.value)}
            style={{ backgroundColor: "var(--ebb-surface-muted)", borderColor: "var(--ebb-border)" }}
            className="border rounded-xl px-3 py-2 text-xs text-white focus:outline-none w-full sm:w-auto"
          >
            <option value="all">All Genres / Tags</option>
            {allTags.map((tag) => (
              <option key={tag} value={tag}>
                {tag}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            suppressHydrationWarning
            onChange={(e) => setStatusFilter(e.target.value as "all" | TuneStatus)}
            style={{ backgroundColor: "var(--ebb-surface-muted)", borderColor: "var(--ebb-border)" }}
            className="border rounded-xl px-3 py-2 text-xs text-white focus:outline-none w-full sm:w-auto font-medium"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Rotation</option>
            <option value="in_repertoire">In Repertoire (Learn & Maintain)</option>
            <option value="in_rehearsal">In Rehearsal</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </div>

      {/* In Repertoire Educational Callout */}
      {statusFilter === "in_repertoire" && (
        <div 
          suppressHydrationWarning
          style={{ backgroundColor: "rgba(14, 165, 233, 0.08)", borderColor: "rgba(14, 165, 233, 0.3)" }}
          className="border rounded-xl p-3.5 text-xs text-sky-200 flex items-center gap-3 shadow-sm"
        >
          <BookOpen className="w-5 h-5 text-sky-400 shrink-0" />
          <div>
            <div className="font-bold text-sky-300">In Repertoire Policy</div>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              Musicians should learn and maintain these charts in their folders. While called less frequently on regular gig call sheets than active rotation, they remain ready to be programmed for special events, requests, or deep setlist runs.
            </p>
          </div>
        </div>
      )}

      {/* Tunes Table */}
      <div 
        suppressHydrationWarning
        style={{ backgroundColor: "var(--ebb-surface)", borderColor: "var(--ebb-border)" }}
        className="border rounded-2xl overflow-hidden shadow-lg"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead 
              suppressHydrationWarning
              style={{ backgroundColor: "var(--ebb-surface-muted)", borderColor: "var(--ebb-border)" }}
              className="text-[11px] uppercase tracking-wider text-slate-400 border-b font-mono"
            >
              <tr>
                <th className="py-3 px-4">Title & Artist</th>
                <th className="py-3 px-4">Key / Tempo</th>
                <th className="py-3 px-4">Charting Lead</th>
                <th className="py-3 px-4">Tags</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Links</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y font-sans" style={{ borderColor: "var(--ebb-border)" }}>
              {filteredTunes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    No charts found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredTunes.map((tune) => (
                  <tr key={tune.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4">
                      <div className="font-bold text-white text-sm">{tune.title}</div>
                      {tune.artist && <div className="text-slate-400 text-xs">{tune.artist}</div>}
                    </td>
                    <td className="py-3 px-4 font-mono">
                      <div className="text-yellow-400 font-bold">{tune.keySignature || "—"}</div>
                      <div className="text-slate-500 text-[11px]">
                        {tune.tempo ? `${tune.tempo} BPM` : ""} {tune.meter}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {tune.chartContactName ? (
                        <span className="text-xs text-slate-300 flex items-center gap-1">
                          <UserCheck className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
                          {tune.chartContactName}
                        </span>
                      ) : (
                        <span className="text-slate-600 text-xs">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1">
                        {(tune.tags || []).map((tg) => (
                          <span
                            key={tg}
                            className="bg-slate-950 text-slate-300 text-[10px] px-1.5 py-0.5 rounded border border-slate-800"
                          >
                            {tg}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase border inline-block ${
                          tune.status === "active"
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : tune.status === "in_repertoire"
                            ? "bg-sky-500/10 text-sky-400 border-sky-500/20"
                            : tune.status === "in_rehearsal"
                            ? "bg-amber-400/10 text-amber-400 border-amber-400/20"
                            : "bg-slate-800 text-slate-500 border-slate-700"
                        }`}
                      >
                        {tune.status === "in_repertoire" ? "In Repertoire" : tune.status.replace("_", " ")}
                      </span>
                      {tune.status === "in_repertoire" && (
                        <div className="text-[10px] text-sky-400/80 mt-0.5 font-normal">
                          Learn & maintain
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {tune.driveLink && (
                          <a
                            href={tune.driveLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-yellow-400 hover:text-yellow-300 font-medium inline-flex items-center gap-1"
                          >
                            PDF <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                        {tune.audioSampleUrl && (
                          <a
                            href={tune.audioSampleUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-slate-400 hover:text-white font-medium inline-flex items-center gap-1"
                          >
                            Audio <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {(isManager || tune.chartContactUid === profile?.uid) && (
                          <button
                            type="button"
                            onClick={() => openEditModal(tune)}
                            className="text-slate-400 hover:text-white p-1 rounded transition"
                            title="Edit Tune Details"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                        )}
                        {(isManager || tune.chartContactUid === profile?.uid) && (
                          <button
                            type="button"
                            onClick={() => handleDeleteTune(tune)}
                            className="text-slate-500 hover:text-rose-400 p-1 rounded transition"
                            title="Delete Tune"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div 
            suppressHydrationWarning
            style={{ backgroundColor: "var(--ebb-surface)", borderColor: "var(--ebb-border)" }}
            className="border rounded-3xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto shadow-2xl my-8 transition-colors"
          >
            <div className="flex items-center justify-between border-b pb-3.5" style={{ borderColor: "var(--ebb-border)" }}>
              <div className="space-y-0.5">
                <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                  <Music className="w-5 h-5" style={{ color: "var(--ebb-primary)" }} />
                  {editingTune ? "Edit Chart Details" : "Add Chart to Repertoire"}
                </h2>
                <p className="text-[11px] text-slate-400">
                  {editingTune ? "Update sheet music links and musical metadata." : "Submit a new tune or sheet music chart for the ensemble."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg transition hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTune} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Title *</label>
                  <input
                    type="text"
                    required
                    suppressHydrationWarning
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Chameleon"
                    style={{ backgroundColor: "var(--ebb-surface-muted)", borderColor: "var(--ebb-border)" }}
                    className="w-full border rounded-xl p-2.5 text-white focus:outline-none placeholder-slate-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Original Artist / Arranger</label>
                  <input
                    type="text"
                    suppressHydrationWarning
                    value={artist}
                    onChange={(e) => setArtist(e.target.value)}
                    placeholder="e.g. Herbie Hancock"
                    style={{ backgroundColor: "var(--ebb-surface-muted)", borderColor: "var(--ebb-border)" }}
                    className="w-full border rounded-xl p-2.5 text-white focus:outline-none placeholder-slate-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Key Signature</label>
                  <input
                    type="text"
                    suppressHydrationWarning
                    value={keySignature}
                    onChange={(e) => setKeySignature(e.target.value)}
                    placeholder="e.g. Bb or Gm"
                    style={{ backgroundColor: "var(--ebb-surface-muted)", borderColor: "var(--ebb-border)" }}
                    className="w-full border rounded-xl p-2.5 text-white focus:outline-none font-mono placeholder-slate-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Tempo (BPM)</label>
                  <input
                    type="text"
                    suppressHydrationWarning
                    value={tempo}
                    onChange={(e) => setTempo(e.target.value)}
                    placeholder="120"
                    style={{ backgroundColor: "var(--ebb-surface-muted)", borderColor: "var(--ebb-border)" }}
                    className="w-full border rounded-xl p-2.5 text-white focus:outline-none font-mono placeholder-slate-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Meter</label>
                  <input
                    type="text"
                    suppressHydrationWarning
                    value={meter}
                    onChange={(e) => setMeter(e.target.value)}
                    placeholder="4/4"
                    style={{ backgroundColor: "var(--ebb-surface-muted)", borderColor: "var(--ebb-border)" }}
                    className="w-full border rounded-xl p-2.5 text-white focus:outline-none font-mono placeholder-slate-500"
                  />
                </div>
              </div>

              {/* Charting Contact Dropdown */}
              <div>
                <label className="block text-slate-300 font-bold mb-1">
                  Charting Lead / Contact (Musician)
                </label>
                <select
                  value={chartContactUid}
                  suppressHydrationWarning
                  onChange={(e) => setChartContactUid(e.target.value)}
                  style={{ backgroundColor: "var(--ebb-surface-muted)", borderColor: "var(--ebb-border)" }}
                  className="w-full border rounded-xl p-2.5 text-white focus:outline-none"
                >
                  <option value="">-- No specific charting contact --</option>
                  {members.map((m) => (
                    <option key={m.uid} value={m.uid}>
                      {m.displayName} {m.uid === profile?.uid ? "(You)" : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Google Drive / PDF Sheet Music Link</label>
                <input
                  type="url"
                  suppressHydrationWarning
                  value={driveLink}
                  onChange={(e) => setDriveLink(e.target.value)}
                  placeholder="https://drive.google.com/..."
                  style={{ backgroundColor: "var(--ebb-surface-muted)", borderColor: "var(--ebb-border)" }}
                  className="w-full border rounded-xl p-2.5 text-white focus:outline-none placeholder-slate-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Reference Audio Link (YouTube/SoundCloud)</label>
                <input
                  type="url"
                  suppressHydrationWarning
                  value={audioSampleUrl}
                  onChange={(e) => setAudioSampleUrl(e.target.value)}
                  placeholder="https://youtube.com/..."
                  style={{ backgroundColor: "var(--ebb-surface-muted)", borderColor: "var(--ebb-border)" }}
                  className="w-full border rounded-xl p-2.5 text-white focus:outline-none placeholder-slate-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">
                  Tags & Genres (comma separated)
                </label>
                <input
                  type="text"
                  suppressHydrationWarning
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  placeholder="Funk, Street Beat, Parade, High Energy"
                  style={{ backgroundColor: "var(--ebb-surface-muted)", borderColor: "var(--ebb-border)" }}
                  className="w-full border rounded-xl p-2.5 text-white focus:outline-none placeholder-slate-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Library Status</label>
                  <select
                    value={status}
                    suppressHydrationWarning
                    onChange={(e) => setStatus(e.target.value as TuneStatus)}
                    style={{ backgroundColor: "var(--ebb-surface-muted)", borderColor: "var(--ebb-border)" }}
                    className="w-full border rounded-xl p-2.5 text-white focus:outline-none"
                  >
                    <option value="active">Active Performance (Frequent Rotation)</option>
                    <option value="in_repertoire">In Repertoire (Learn & Maintain — Called Less Often)</option>
                    <option value="in_rehearsal">In Rehearsal (Woodshedding)</option>
                    <option value="archived">Archived / Retired</option>
                  </select>
                  {status === "in_repertoire" && (
                    <p className="text-[11px] text-sky-400 mt-1.5 flex items-start gap-1 font-medium leading-tight">
                      <Sparkles className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      Musicians should learn this tune and keep charts ready, though it is called less frequently than active rotation.
                    </p>
                  )}
                  {status === "active" && (
                    <p className="text-[11px] text-emerald-400 mt-1.5 flex items-start gap-1 font-medium leading-tight">
                      Standard core repertoire called regularly on gig call sheets and street parades.
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Performance Notes</label>
                  <input
                    type="text"
                    suppressHydrationWarning
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Solo order: Trombone, Snare feature"
                    style={{ backgroundColor: "var(--ebb-surface-muted)", borderColor: "var(--ebb-border)" }}
                    className="w-full border rounded-xl p-2.5 text-white focus:outline-none placeholder-slate-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t" style={{ borderColor: "var(--ebb-border)" }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border text-slate-300 font-bold hover:text-white transition"
                  style={{ backgroundColor: "var(--ebb-surface-muted)", borderColor: "var(--ebb-border)" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  suppressHydrationWarning
                  style={{
                    backgroundColor: "var(--ebb-primary)",
                    color: "#020617",
                  }}
                  className="px-5 py-2.5 rounded-xl font-bold transition disabled:opacity-50 shadow hover:brightness-110"
                >
                  {saving ? "Saving..." : editingTune ? "Update Chart" : "Save to Library"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}