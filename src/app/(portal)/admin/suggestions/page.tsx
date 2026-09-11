"use client";

import React, { useEffect, useState } from "react";
import { 
  collection, 
  onSnapshot, 
  setDoc, 
  deleteDoc, 
  updateDoc, 
  doc, 
  arrayUnion, 
  arrayRemove 
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/lib/context/AuthContext";
import { canManageCatalog } from "@/lib/auth/permissions";
import { User } from "@/lib/schema/user";
import { 
  Lightbulb, 
  ThumbsUp, 
  Plus, 
  Trash2, 
  ArrowRight, 
  ExternalLink, 
  Search, 
  Loader2, 
  X, 
  Check, 
  Video 
} from "lucide-react";

export type SuggestionStatus = "pitched" | "in_review" | "approved" | "shelved";

interface TuneSuggestion {
  id: string;
  title: string;
  originalArtist: string;
  suggestedBy: string;
  suggestedByUid: string;
  referenceUrl?: string;
  notes?: string;
  status: SuggestionStatus;
  upvotes: string[];
  keyProposal?: string;
  createdAt: string;
  updatedAt?: string;
}

// Normalize legacy or alternate status strings into valid SuggestionStatus
const normalizeStatus = (rawStatus?: string): SuggestionStatus => {
  if (!rawStatus) return "pitched";
  const cleaned = rawStatus.toLowerCase().replace(/[\s-]+/g, "_");
  if (cleaned === "under_review" || cleaned === "in_review" || cleaned === "review") {
    return "in_review";
  }
  if (cleaned === "approved" || cleaned === "promoted") return "approved";
  if (cleaned === "shelved" || cleaned === "rejected" || cleaned === "archived") return "shelved";
  return "pitched";
};

export default function TuneSuggestionsAdminPage() {
  const { firebaseUser, profile, loading: authLoading } = useAuth();
  const [suggestions, setSuggestions] = useState<TuneSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [isCreating, setIsCreating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [promotingId, setPromotingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    originalArtist: "",
    referenceUrl: "",
    keyProposal: "Bb Major",
    notes: "",
  });

  useEffect(() => {
    if (authLoading) return;

    const unsub = onSnapshot(
      collection(db, "suggestions"),
      (snap) => {
        const list: TuneSuggestion[] = [];
        snap.forEach((d) => {
          const data = d.data();
          list.push({
            id: d.id,
            title: data.title || "",
            originalArtist: data.originalArtist || data.artist || "",
            suggestedBy: data.suggestedBy || "Anonymous",
            suggestedByUid: data.suggestedByUid || "",
            referenceUrl: data.referenceUrl || "",
            notes: data.notes || "",
            status: normalizeStatus(data.status),
            upvotes: Array.isArray(data.upvotes) ? data.upvotes : [],
            keyProposal: data.keyProposal || "Bb Major",
            createdAt: data.createdAt || new Date().toISOString(),
            updatedAt: data.updatedAt,
          } as TuneSuggestion);
        });

        list.sort((a, b) => {
          const voteDiff = (b.upvotes?.length || 0) - (a.upvotes?.length || 0);
          if (voteDiff !== 0) return voteDiff;
          return b.createdAt.localeCompare(a.createdAt);
        });

        setSuggestions(list);
        setLoading(false);
      },
      (err) => {
        console.error("Suggestions listener error:", err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [authLoading]);

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-400 gap-2 text-xs">
        <Loader2 className="w-4 h-4 animate-spin text-yellow-400" />
        Loading repertoire proposals & votes...
      </div>
    );
  }

  const userProfile = profile as unknown as User;
  const isManager = Boolean(userProfile && canManageCatalog(userProfile));

  const handleToggleVote = async (sug: TuneSuggestion) => {
    if (!firebaseUser) return;
    const hasVoted = sug.upvotes.includes(firebaseUser.uid);
    const sugRef = doc(db, "suggestions", sug.id);

    try {
      if (hasVoted) {
        await updateDoc(sugRef, {
          upvotes: arrayRemove(firebaseUser.uid),
          updatedAt: new Date().toISOString(),
        });
      } else {
        await updateDoc(sugRef, {
          upvotes: arrayUnion(firebaseUser.uid),
          updatedAt: new Date().toISOString(),
        });
      }
    } catch (err) {
      alert("Failed to toggle vote: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleStatusChange = async (sugId: string, nextStatus: SuggestionStatus) => {
    try {
      await updateDoc(doc(db, "suggestions", sugId), {
        status: nextStatus,
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      alert("Failed to change status: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleCreateSuggestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !firebaseUser) return;

    setIsSaving(true);
    try {
      const sugId = `sug_${Date.now()}`;
      const payload: TuneSuggestion = {
        id: sugId,
        title: formData.title.trim(),
        originalArtist: formData.originalArtist.trim(),
        suggestedBy: profile?.displayName || firebaseUser.displayName || "Musician",
        suggestedByUid: firebaseUser.uid,
        referenceUrl: formData.referenceUrl.trim(),
        keyProposal: formData.keyProposal.trim(),
        notes: formData.notes.trim(),
        status: "pitched",
        upvotes: [firebaseUser.uid],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await setDoc(doc(db, "suggestions", sugId), payload, { merge: true });
      setIsCreating(false);
      setFormData({
        title: "",
        originalArtist: "",
        referenceUrl: "",
        keyProposal: "Bb Major",
        notes: "",
      });
    } catch (err) {
      alert("Failed to submit tune proposal: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsSaving(false);
    }
  };

  const handlePromoteToCatalog = async (sug: TuneSuggestion) => {
    if (!confirm(`Promote "${sug.title}" directly to the active band repertoire catalog?`)) return;
    setPromotingId(sug.id);

    try {
      const songId = `song_${sug.title.toLowerCase().replace(/[^a-z0-9]/g, "_")}`;
      const payload = {
        id: songId,
        title: sug.title,
        artist: sug.originalArtist,
        arranger: "Eagleburger",
        keySignature: sug.keyProposal || "Bb Major",
        tempoBpm: 120,
        driveLink: sug.referenceUrl || "",
        tags: ["Ensemble Proposal", "In Development"],
        updatedAt: new Date().toISOString(),
      };

      await setDoc(doc(db, "songs", songId), payload, { merge: true });
      await setDoc(doc(db, "tunes", songId), payload, { merge: true });

      await updateDoc(doc(db, "suggestions", sug.id), {
        status: "approved",
        promotedSongId: songId,
        updatedAt: new Date().toISOString(),
      });

      alert(`"${sug.title}" is now added to the Repertoire Catalog!`);
    } catch (err) {
      alert("Failed to promote suggestion: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setPromotingId(null);
    }
  };

  const handleDeleteSuggestion = async (id: string, title: string) => {
    if (!confirm(`Delete proposal for "${title}"?`)) return;
    try {
      await deleteDoc(doc(db, "suggestions", id));
    } catch (err) {
      alert("Failed to delete proposal: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  const filtered = suggestions.filter((s) => {
    const matchesStatus =
      filterStatus === "all" ||
      s.status === filterStatus ||
      (filterStatus === "in_review" && (s.status === "in_review" as SuggestionStatus));

    const matchesSearch =
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.originalArtist.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.suggestedBy.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesStatus && matchesSearch;
  });

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      {/* Banner */}
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
              {suggestions.length} Pitched Song{suggestions.length === 1 ? "" : "s"}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
            <Lightbulb className="w-5 h-5" style={{ color: "var(--ebb-primary)" }} /> Tune Proposals & Member Pitches
          </h1>
          <p className="text-xs text-slate-400">
            Musician pitch room for brass arrangements, peer upvoting, and promotion into active repertoire charts.
          </p>
        </div>

        {!isCreating && (
          <button
            type="button"
            suppressHydrationWarning
            onClick={() => setIsCreating(true)}
            style={{
              backgroundColor: "var(--ebb-primary)",
              color: "#020617",
            }}
            className="font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 transition shadow hover:brightness-110 shrink-0"
          >
            <Plus className="w-4 h-4" /> Pitch a Tune
          </button>
        )}
      </div>

      {/* Suggestion Form Modal */}
      {isCreating && (
        <form
          onSubmit={handleCreateSuggestion}
          className="bg-slate-900 border border-yellow-400/30 rounded-2xl p-5 space-y-4 shadow-2xl"
        >
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-yellow-400" /> Pitch New Song to Band
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
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">Song Title *</label>
              <input
                type="text"
                required
                placeholder="e.g. Papa Was a Rollin' Stone"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">Original Artist *</label>
              <input
                type="text"
                required
                placeholder="e.g. The Temptations"
                value={formData.originalArtist}
                onChange={(e) => setFormData({ ...formData, originalArtist: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">Proposed Key</label>
              <input
                type="text"
                placeholder="Bb Minor / Concert Eb"
                value={formData.keyProposal}
                onChange={(e) => setFormData({ ...formData, keyProposal: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                Reference Audio / Video Link
              </label>
              <input
                type="url"
                placeholder="https://youtube.com/watch?v=..."
                value={formData.referenceUrl}
                onChange={(e) => setFormData({ ...formData, referenceUrl: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                Arrangement Notes / Brass Vibe
              </label>
              <input
                type="text"
                placeholder="Heavy sousa baseline, second line snare groove"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400"
              />
            </div>
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
              {isSaving ? "Pitching..." : "Submit Proposal"}
            </button>
          </div>
        </form>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search proposals by title, artist, or proposer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400 font-semibold"
          />
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 shrink-0">
          {[
            { key: "all", label: "All" },
            { key: "pitched", label: "Pitched" },
            { key: "in_review", label: "In Review" },
            { key: "approved", label: "Approved" },
            { key: "shelved", label: "Shelved" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilterStatus(tab.key)}
              className={`text-xs px-3 py-1.5 rounded-xl font-bold transition border ${
                filterStatus === tab.key
                  ? "bg-yellow-400 text-slate-950 border-yellow-400"
                  : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Suggestions Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((sug) => {
          const hasVoted = Boolean(firebaseUser && sug.upvotes.includes(firebaseUser.uid));

          return (
            <div
              key={sug.id}
              className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 space-y-4 shadow transition flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  {/* Status Pill with interactive manager dropdown */}
                  {isManager ? (
                    <select
                      value={sug.status}
                      onChange={(e) => handleStatusChange(sug.id, e.target.value as SuggestionStatus)}
                      className={`text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded border focus:outline-none cursor-pointer ${
                        sug.status === "approved"
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                          : sug.status === "in_review"
                          ? "bg-blue-500/10 text-blue-400 border-blue-500/30"
                          : sug.status === "shelved"
                          ? "bg-slate-800 text-slate-500 border-slate-700"
                          : "bg-yellow-400/10 text-yellow-400 border-yellow-400/30"
                      }`}
                    >
                      <option value="pitched" className="bg-slate-900 text-yellow-400">Pitched</option>
                      <option value="in_review" className="bg-slate-900 text-blue-400">In Review</option>
                      <option value="approved" className="bg-slate-900 text-emerald-400">Approved</option>
                      <option value="shelved" className="bg-slate-900 text-slate-500">Shelved</option>
                    </select>
                  ) : (
                    <span
                      className={`text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                        sug.status === "approved"
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                          : sug.status === "in_review"
                          ? "bg-blue-500/10 text-blue-400 border-blue-500/30"
                          : sug.status === "shelved"
                          ? "bg-slate-800 text-slate-500 border-slate-700"
                          : "bg-yellow-400/10 text-yellow-400 border-yellow-400/30"
                      }`}
                    >
                      {sug.status.replace("_", " ")}
                    </span>
                  )}

                  {isManager && (
                    <button
                      type="button"
                      onClick={() => handleDeleteSuggestion(sug.id, sug.title)}
                      className="text-slate-500 hover:text-rose-400 p-1 rounded transition"
                      title="Delete pitch"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div>
                  <h3 className="font-bold text-white text-base leading-snug">{sug.title}</h3>
                  <div className="text-xs text-slate-400 font-semibold">{sug.originalArtist}</div>
                  <div className="text-[11px] text-slate-500 pt-0.5">
                    Pitched by: <strong className="text-slate-400">{sug.suggestedBy}</strong>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400">
                  <span className="bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                    Key: {sug.keyProposal || "Bb Major"}
                  </span>
                </div>

                {sug.notes && (
                  <p className="text-xs text-slate-400 italic bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/60">
                    &ldquo;{sug.notes}&rdquo;
                  </p>
                )}

                {sug.referenceUrl && (
                  <a
                    href={sug.referenceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-semibold text-yellow-400 hover:text-yellow-300 flex items-center gap-1.5 pt-1"
                  >
                    <Video className="w-3.5 h-3.5 text-rose-500" />
                    <span>Reference Recording</span>
                    <ExternalLink className="w-3 h-3 text-slate-500" />
                  </a>
                )}
              </div>

              {/* Card Footer */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => handleToggleVote(sug)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition border ${
                    hasVoted
                      ? "bg-yellow-400 text-slate-950 border-yellow-400 shadow-md shadow-yellow-400/20"
                      : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                  }`}
                  title={hasVoted ? "Remove your upvote" : "Upvote this suggestion"}
                >
                  <ThumbsUp className="w-3.5 h-3.5" />
                  <span>{sug.upvotes.length}</span>
                </button>

                {isManager && sug.status !== "approved" && (
                  <button
                    type="button"
                    disabled={promotingId === sug.id}
                    onClick={() => handlePromoteToCatalog(sug)}
                    className="bg-slate-950 hover:bg-slate-800 text-emerald-400 border border-emerald-500/30 font-bold px-2.5 py-1.5 rounded-xl text-xs flex items-center gap-1 transition disabled:opacity-50"
                    title="Promote directly into active repertoire charts"
                  >
                    {promotingId === sug.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <ArrowRight className="w-3.5 h-3.5" />
                    )}
                    <span>Promote</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}