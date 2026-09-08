"use client";

import React, { useEffect, useState } from "react";
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc,
  getDocs
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/lib/context/AuthContext";
import { canManageGigs } from "@/lib/auth/permissions";
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
  UserCheck
} from "lucide-react";

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
  status: "active" | "archived" | "in_rehearsal";
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
  const [status, setStatus] = useState<"active" | "archived" | "in_rehearsal">("active");
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
  if (!canManageGigs(profile)) {
    return (
      <div className="p-8 text-amber-400 flex items-center gap-3">
        <ShieldAlert className="w-6 h-6 shrink-0" />
        <span>Band Manager clearance required to curate repertoire.</span>
      </div>
    );
  }

  const openNewModal = () => {
    setEditingTune(null);
    setTitle("");
    setArtist("");
    setKeySignature("Bb");
    setTempo("120");
    setMeter("4/4");
    setDriveLink("");
    setAudioSampleUrl("");
    setChartContactUid("");
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

    const payload = {
      title: title.trim(),
      artist: artist.trim(),
      keySignature: keySignature.trim(),
      tempo: tempo.trim(),
      meter: meter.trim(),
      driveLink: driveLink.trim(),
      audioSampleUrl: audioSampleUrl.trim(),
      chartContactUid: chartContactUid || "",
      chartContactName: contactMember ? contactMember.displayName : "",
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
      setIsModalOpen(false);
    } catch (err) {
      alert("Failed to save tune: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTune = async (tuneId: string) => {
    if (confirm("Delete this chart from the master library?")) {
      await deleteDoc(doc(db, "tunes", tuneId));
    }
  };

  const allTags = Array.from(new Set(tunes.flatMap((t) => t.tags || []))).sort();

  const filteredTunes = tunes.filter((t) => {
    const matchesSearch =
      t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.artist && t.artist.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (t.keySignature && t.keySignature.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (t.chartContactName && t.chartContactName.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesTag = tagFilter === "all" || (t.tags && t.tags.includes(tagFilter));

    return matchesSearch && matchesTag;
  });

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Music className="text-yellow-400 w-6 h-6" /> Repertoire Studio & Chart Library
          </h1>
          <p className="text-slate-400 text-sm">
            Maintain master sheet music links, keys, audio references, and charting leads.
          </p>
        </div>

        <button
          type="button"
          onClick={openNewModal}
          className="bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold px-4 py-2 rounded-lg text-xs transition flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" /> Add Chart / Tune
        </button>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
          <input
            type="text"
            placeholder="Search title, artist, key, or charting lead..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 w-full focus:outline-none focus:border-yellow-400"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <SlidersHorizontal className="w-4 h-4 text-slate-500 shrink-0" />
          <select
            value={tagFilter}
            onChange={(e) => setTagFilter(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-yellow-400 w-full sm:w-auto"
          >
            <option value="all">All Genres / Tags</option>
            {allTags.map((tag) => (
              <option key={tag} value={tag}>
                {tag}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tunes Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800 font-mono">
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
            <tbody className="divide-y divide-slate-800/60 font-sans">
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
                        className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase border ${
                          tune.status === "active"
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : tune.status === "in_rehearsal"
                            ? "bg-amber-400/10 text-amber-400 border-amber-400/20"
                            : "bg-slate-800 text-slate-500 border-slate-700"
                        }`}
                      >
                        {tune.status.replace("_", " ")}
                      </span>
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
                        <button
                          type="button"
                          onClick={() => openEditModal(tune)}
                          className="text-slate-400 hover:text-white p-1 rounded transition"
                          title="Edit Tune"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteTune(tune.id)}
                          className="text-slate-500 hover:text-rose-400 p-1 rounded transition"
                          title="Delete Tune"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
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
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Music className="text-yellow-400 w-5 h-5" />
                {editingTune ? "Edit Chart Details" : "Add Chart to Library"}
              </h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTune} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 uppercase font-bold mb-1">Title *</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Chameleon"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-yellow-400"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 uppercase font-bold mb-1">Original Artist / Arranger</label>
                  <input
                    type="text"
                    value={artist}
                    onChange={(e) => setArtist(e.target.value)}
                    placeholder="e.g. Herbie Hancock"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-yellow-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 uppercase font-bold mb-1">Key Signature</label>
                  <input
                    type="text"
                    value={keySignature}
                    onChange={(e) => setKeySignature(e.target.value)}
                    placeholder="e.g. Bb or Gm"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-yellow-400 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 uppercase font-bold mb-1">Tempo (BPM)</label>
                  <input
                    type="text"
                    value={tempo}
                    onChange={(e) => setTempo(e.target.value)}
                    placeholder="120"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-yellow-400 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 uppercase font-bold mb-1">Meter</label>
                  <input
                    type="text"
                    value={meter}
                    onChange={(e) => setMeter(e.target.value)}
                    placeholder="4/4"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-yellow-400 font-mono"
                  />
                </div>
              </div>

              {/* Charting Contact Dropdown */}
              <div>
                <label className="block text-slate-400 uppercase font-bold mb-1">
                  Charting Lead / Contact (Member)
                </label>
                <select
                  value={chartContactUid}
                  onChange={(e) => setChartContactUid(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-yellow-400"
                >
                  <option value="">-- No specific charting contact --</option>
                  {members.map((m) => (
                    <option key={m.uid} value={m.uid}>
                      {m.displayName} ({m.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 uppercase font-bold mb-1">Google Drive / PDF Link</label>
                <input
                  type="url"
                  value={driveLink}
                  onChange={(e) => setDriveLink(e.target.value)}
                  placeholder="https://drive.google.com/..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-yellow-400"
                />
              </div>

              <div>
                <label className="block text-slate-400 uppercase font-bold mb-1">Reference Audio Link (YouTube/SoundCloud)</label>
                <input
                  type="url"
                  value={audioSampleUrl}
                  onChange={(e) => setAudioSampleUrl(e.target.value)}
                  placeholder="https://youtube.com/..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-yellow-400"
                />
              </div>

              <div>
                <label className="block text-slate-400 uppercase font-bold mb-1">
                  Tags & Genres (comma separated)
                </label>
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  placeholder="Funk, Street Beat, Parade, High Energy"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-yellow-400"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 uppercase font-bold mb-1">Library Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as "active" | "archived" | "in_rehearsal")}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-yellow-400"
                  >
                    <option value="active">Active Performance</option>
                    <option value="in_rehearsal">In Rehearsal</option>
                    <option value="archived">Archived / Retired</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 uppercase font-bold mb-1">Performance Notes</label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Solo order: Trombone, Snare feature"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-yellow-400"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 font-bold hover:bg-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-lg bg-yellow-400 text-slate-950 font-bold hover:bg-yellow-300 transition disabled:opacity-50"
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