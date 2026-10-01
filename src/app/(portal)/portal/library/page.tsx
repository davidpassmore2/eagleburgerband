"use client";

import React, { useEffect, useState, useMemo, useRef } from "react";
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  setDoc, 
  deleteDoc, 
  doc, 
  getDocs, 
  arrayUnion, 
  arrayRemove 
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/lib/context/AuthContext";
import { canManageCatalog, isAdmin } from "@/lib/auth/permissions";
import { buildRepertoireAnalytics, normalizeSongTitle, TuneStat, GigData } from "@/lib/repertoire/analytics";
import { TuneStatus } from "@/lib/schema/tune";
import { 
  Music2, 
  Search, 
  ExternalLink, 
  Flame, 
  Archive, 
  RotateCcw, 
  Sparkles, 
  BookOpen, 
  MessageSquare,
  Plus,
  Trash2,
  Edit3,
  Play,
  Pause,
  ThumbsUp,
  ThumbsDown,
  X,
  Loader2,
  SlidersHorizontal,
  Lightbulb
} from "lucide-react";
import Link from "next/link";
import TuneCommentsModal from "@/components/portal/TuneCommentsModal";
import { toast } from "@/lib/context/ToastContext";

export interface UnifiedTune {
  id: string;
  title: string;
  artist?: string;
  originalArtist?: string;
  arranger?: string;
  keySignature?: string;
  tempoBpm?: number;
  tempo?: string;
  meter?: string;
  timeSignature?: string;
  durationSeconds?: number;
  status: TuneStatus;
  lifecycleStatus?: string;
  driveLink?: string;
  audioSampleUrl?: string;
  audioReferenceUrl?: string;
  chartContactUid?: string;
  chartContactName?: string;
  tags?: string[];
  notes?: string;
  upvoteUids?: string[];
  downvoteUids?: string[];
  createdAt?: string;
  updatedAt?: string;
}

interface MemberOption {
  uid: string;
  displayName: string;
  email: string;
}

export default function UnifiedRepertoireLibraryPage() {
  const { profile, firebaseUser, loading: authLoading } = useAuth();
  const canManage = Boolean(profile && (canManageCatalog(profile) || isAdmin(profile)));
  const currentUserId = firebaseUser?.uid || profile?.uid || "";

  const [tunes, setTunes] = useState<UnifiedTune[]>([]);
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [, setGigs] = useState<GigData[]>([]);
  const [analytics, setAnalytics] = useState<Record<string, TuneStat>>({});
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "in_repertoire" | "in_rehearsal" | "review" | "frequent" | "vault" | "unplayed" | "archived">("all");
  const [selectedTag, setSelectedTag] = useState<string>("all");

  // Comments & Audio Preview
  const [selectedTuneForComments, setSelectedTuneForComments] = useState<UnifiedTune | null>(null);
  const [playingAudioTuneId, setPlayingAudioTuneId] = useState<string | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // Manager Edit & Add Modal State
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingTune, setEditingTune] = useState<UnifiedTune | null>(null);
  const [saving, setSaving] = useState(false);

  // Form Fields
  const [formTitle, setFormTitle] = useState("");
  const [formArtist, setFormArtist] = useState("");
  const [formArranger, setFormArranger] = useState("Eagleburger");
  const [formKeySignature, setFormKeySignature] = useState("Bb Major");
  const [formTempoBpm, setFormTempoBpm] = useState(120);
  const [formMeter, setFormMeter] = useState("4/4");
  const [formStatus, setFormStatus] = useState<TuneStatus>("active");
  const [formDriveLink, setFormDriveLink] = useState("");
  const [formAudioSampleUrl, setFormAudioSampleUrl] = useState("");
  const [formChartContactUid, setFormChartContactUid] = useState("");
  const [formTags, setFormTags] = useState("");
  const [formNotes, setFormNotes] = useState("");

  // Subscribe to canonical 'tunes' collection
  useEffect(() => {
    const qTunes = query(collection(db, "tunes"), orderBy("title", "asc"));
    const unsubTunes = onSnapshot(
      qTunes,
      (snap) => {
        const list: UnifiedTune[] = [];
        snap.forEach((d) => {
          const raw = d.data();
          list.push({
            id: d.id,
            title: raw.title || "Untitled Tune",
            artist: raw.artist || raw.originalArtist || "",
            originalArtist: raw.originalArtist || raw.artist || "",
            arranger: raw.arranger || "",
            keySignature: raw.keySignature || raw.key || "",
            tempoBpm: typeof raw.tempoBpm === "number" ? raw.tempoBpm : 120,
            tempo: raw.tempo || "",
            meter: raw.meter || raw.timeSignature || "4/4",
            timeSignature: raw.timeSignature || raw.meter || "4/4",
            durationSeconds: raw.durationSeconds || 180,
            status: (raw.status as TuneStatus) || "active",
            lifecycleStatus: raw.lifecycleStatus || "active_rotation",
            driveLink: raw.driveLink || "",
            audioSampleUrl: raw.audioSampleUrl || raw.audioReferenceUrl || "",
            audioReferenceUrl: raw.audioReferenceUrl || raw.audioSampleUrl || "",
            chartContactUid: raw.chartContactUid || "",
            chartContactName: raw.chartContactName || "",
            tags: Array.isArray(raw.tags) ? raw.tags : [],
            notes: raw.notes || "",
            upvoteUids: Array.isArray(raw.upvoteUids) ? raw.upvoteUids : Array.isArray(raw.upvotes) ? raw.upvotes : [],
            downvoteUids: Array.isArray(raw.downvoteUids) ? raw.downvoteUids : Array.isArray(raw.downvotes) ? raw.downvotes : [],
            createdAt: raw.createdAt || new Date().toISOString(),
            updatedAt: raw.updatedAt || new Date().toISOString(),
          });
        });
        setTunes(list);
        setLoading(false);
      },
      (err) => {
        console.error("Error loading tunes:", err);
        setLoading(false);
      }
    );

    // Subscribe to gigs for live performance statistics
    const qGigs = query(collection(db, "gigs"), orderBy("date", "desc"));
    const unsubGigs = onSnapshot(
      qGigs,
      (snap) => {
        const list: GigData[] = [];
        snap.forEach((d) => {
          list.push({ id: d.id, ...d.data() } as GigData);
        });
        setGigs(list);
        setAnalytics(buildRepertoireAnalytics(list));
      },
      (err) => console.warn("Notice: gigs listener note:", err)
    );

    // Fetch members roster for chart contact assignment
    const fetchMembers = async () => {
      try {
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
      } catch (err) {
        console.warn("Notice: members fetch note:", err);
      }
    };

    fetchMembers();

    return () => {
      unsubTunes();
      unsubGigs();
    };
  }, []);

  // Extract all unique tags
  const availableTags = useMemo(() => {
    const tagSet = new Set<string>();
    tunes.forEach((t) => {
      (t.tags || []).forEach((tag) => {
        if (tag.trim()) tagSet.add(tag.trim());
      });
    });
    return Array.from(tagSet).sort();
  }, [tunes]);

  // Audio Playback Handler
  const handleTogglePlayAudio = (tune: UnifiedTune) => {
    if (!tune.audioSampleUrl) return;

    if (playingAudioTuneId === tune.id) {
      audioPlayerRef.current?.pause();
      setPlayingAudioTuneId(null);
      return;
    }

    setPlayingAudioTuneId(tune.id);
    if (audioPlayerRef.current) {
      audioPlayerRef.current.src = tune.audioSampleUrl;
      audioPlayerRef.current.play().catch((err) => {
        toast.error("Audio playback error: " + err.message);
        setPlayingAudioTuneId(null);
      });
    }
  };

  // Upvote / Downvote Reactions
  const handleVote = async (tuneId: string, voteType: "up" | "down") => {
    if (!currentUserId) {
      toast.error("Please log in to react to charts.");
      return;
    }

    const tune = tunes.find((t) => t.id === tuneId);
    if (!tune) return;

    const hasUpvoted = (tune.upvoteUids || []).includes(currentUserId);
    const hasDownvoted = (tune.downvoteUids || []).includes(currentUserId);
    const tuneRef = doc(db, "tunes", tuneId);

    try {
      if (voteType === "up") {
        if (hasUpvoted) {
          await setDoc(tuneRef, { upvoteUids: arrayRemove(currentUserId) }, { merge: true });
        } else {
          await setDoc(
            tuneRef,
            {
              upvoteUids: arrayUnion(currentUserId),
              downvoteUids: arrayRemove(currentUserId),
            },
            { merge: true }
          );
        }
      } else {
        if (hasDownvoted) {
          await setDoc(tuneRef, { downvoteUids: arrayRemove(currentUserId) }, { merge: true });
        } else {
          await setDoc(
            tuneRef,
            {
              downvoteUids: arrayUnion(currentUserId),
              upvoteUids: arrayRemove(currentUserId),
            },
            { merge: true }
          );
        }
      }
    } catch (err) {
      console.error("Voting error:", err);
    }
  };

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setEditingTune(null);
    setFormTitle("");
    setFormArtist("");
    setFormArranger("Eagleburger");
    setFormKeySignature("Bb Major");
    setFormTempoBpm(120);
    setFormMeter("4/4");
    setFormStatus("active");
    setFormDriveLink("");
    setFormAudioSampleUrl("");
    setFormChartContactUid("");
    setFormTags("Street Beat, Parade");
    setFormNotes("");
    setIsEditorOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (tune: UnifiedTune) => {
    setEditingTune(tune);
    setFormTitle(tune.title);
    setFormArtist(tune.artist || tune.originalArtist || "");
    setFormArranger(tune.arranger || "");
    setFormKeySignature(tune.keySignature || "Bb Major");
    setFormTempoBpm(tune.tempoBpm || 120);
    setFormMeter(tune.meter || tune.timeSignature || "4/4");
    setFormStatus(tune.status || "active");
    setFormDriveLink(tune.driveLink || "");
    setFormAudioSampleUrl(tune.audioSampleUrl || tune.audioReferenceUrl || "");
    setFormChartContactUid(tune.chartContactUid || "");
    setFormTags((tune.tags || []).join(", "));
    setFormNotes(tune.notes || "");
    setIsEditorOpen(true);
  };

  // Save Chart (Create or Update)
  const handleSaveTune = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      toast.error("Chart title is required.");
      return;
    }

    setSaving(true);
    try {
      const contactMember = members.find((m) => m.uid === formChartContactUid);
      const contactName = contactMember ? contactMember.displayName : "";

      const splitTags = formTags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      const tuneId = editingTune?.id || `song_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;

      const payload = {
        id: tuneId,
        title: formTitle.trim(),
        artist: formArtist.trim(),
        originalArtist: formArtist.trim(),
        arranger: formArranger.trim(),
        key: formKeySignature.trim(),
        keySignature: formKeySignature.trim(),
        tempoBpm: Number(formTempoBpm) || 120,
        tempo: `${formTempoBpm} BPM`,
        meter: formMeter.trim() || "4/4",
        timeSignature: formMeter.trim() || "4/4",
        durationSeconds: editingTune?.durationSeconds || 180,
        status: formStatus,
        lifecycleStatus: formStatus === "active" ? "active_rotation" : formStatus,
        driveLink: formDriveLink.trim(),
        audioSampleUrl: formAudioSampleUrl.trim(),
        audioReferenceUrl: formAudioSampleUrl.trim(),
        chartContactUid: formChartContactUid,
        chartContactName: contactName,
        tags: splitTags,
        notes: formNotes.trim(),
        updatedAt: new Date().toISOString(),
      };

      // 1. Write to canonical 'tunes' collection
      await setDoc(doc(db, "tunes", tuneId), payload, { merge: true });

      toast.success(`Chart "${formTitle.trim()}" saved.`);
      setIsEditorOpen(false);
      setEditingTune(null);
    } catch (err) {
      toast.error("Failed to save chart: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setSaving(false);
    }
  };

  // Delete Chart
  const handleDeleteTune = async (tuneId: string, title: string) => {
    if (!confirm(`Are you sure you want to permanently delete "${title}" from the repertoire catalog?`)) {
      return;
    }

    try {
      await deleteDoc(doc(db, "tunes", tuneId));
      toast.success(`Chart "${title}" deleted.`);
    } catch (err) {
      toast.error("Failed to delete chart: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  // Filtered Tunes List
  const filteredTunes = useMemo(() => {
    return tunes.filter((t) => {
      const norm = normalizeSongTitle(t.title);
      const stat = analytics[norm];

      const matchesSearch =
        t.title.toLowerCase().includes(search.toLowerCase()) ||
        (t.artist && t.artist.toLowerCase().includes(search.toLowerCase())) ||
        (t.arranger && t.arranger.toLowerCase().includes(search.toLowerCase())) ||
        (t.notes && t.notes.toLowerCase().includes(search.toLowerCase())) ||
        (t.tags && t.tags.some((tag) => tag.toLowerCase().includes(search.toLowerCase())));

      if (!matchesSearch) return false;

      // Status Filter
      if (statusFilter === "active" && t.status !== "active") return false;
      if (statusFilter === "in_repertoire" && t.status !== "in_repertoire") return false;
      if (statusFilter === "in_rehearsal" && t.status !== "in_rehearsal" && t.status !== "review") return false;
      if (statusFilter === "archived" && t.status !== "archived") return false;
      if (statusFilter === "unplayed" && stat && stat.playCount > 0) return false;
      if (statusFilter === "frequent" && stat?.statusCategory !== "frequent") return false;
      if (statusFilter === "vault" && stat?.statusCategory !== "vault") return false;

      // Tag Filter
      if (selectedTag !== "all" && (!t.tags || !t.tags.includes(selectedTag))) {
        return false;
      }

      return true;
    });
  }, [tunes, search, statusFilter, selectedTag, analytics]);

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-400 gap-2 text-xs">
        <Loader2 className="w-4 h-4 animate-spin text-yellow-400" />
        Loading Repertoire Catalog & Sheet Music...
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6 pb-20">
      {/* Invisible HTML5 Audio Player */}
      <audio
        ref={audioPlayerRef}
        onEnded={() => setPlayingAudioTuneId(null)}
        className="hidden"
      />

      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-yellow-400 bg-slate-950 px-2.5 py-0.5 rounded border border-slate-800">
              Repertoire Studio
            </span>
            <span className="text-xs font-mono text-slate-400">
              {tunes.length} Active Charts
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-2.5">
            <Music2 className="w-7 h-7 text-yellow-400" /> Repertoire Catalog
          </h1>
          <p className="text-xs text-slate-400">
            Official music library for the Eagleburger Band. Access sheet music, audio reference samples, performance frequencies, and rehearsal arrangements.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full md:w-auto">
          {/* Search Bar */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search title, artist, tags..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400 font-semibold"
            />
          </div>

          {/* Pitch a Tune — available to all members */}
          <Link
            href="/admin/suggestions?category=tune_request"
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold px-4 py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 transition border border-slate-700 hover:border-slate-600 shrink-0"
            title="Suggest a new tune for the band's repertoire"
          >
            <Lightbulb className="w-4 h-4 text-yellow-400" /> Pitch a Tune
          </Link>

          {/* Manager Action: Add Chart */}
          {canManage && (
            <button
              type="button"
              onClick={handleOpenCreateModal}
              className="bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 transition shadow shrink-0"
            >
              <Plus className="w-4 h-4" /> Add New Chart
            </button>
          )}
        </div>

      </div>

      {/* Filter Toolbar */}
      <div className="space-y-2.5 bg-slate-950/60 border border-slate-800/80 rounded-2xl p-3.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setStatusFilter("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition border ${
                statusFilter === "all"
                  ? "bg-yellow-400 text-slate-950 border-yellow-400"
                  : "bg-slate-900 text-slate-400 border-slate-800 hover:text-white"
              }`}
            >
              All ({tunes.length})
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter("active")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition border ${
                statusFilter === "active"
                  ? "bg-emerald-500 text-slate-950 border-emerald-400 font-black"
                  : "bg-slate-900 text-emerald-400 border-slate-800 hover:text-white"
              }`}
            >
              Active Rotation ({tunes.filter((t) => t.status === "active").length})
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter("in_repertoire")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 border ${
                statusFilter === "in_repertoire"
                  ? "bg-sky-400 text-slate-950 border-sky-300 font-black"
                  : "bg-slate-900 text-sky-400 border-slate-800 hover:text-white"
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" /> In Repertoire ({tunes.filter((t) => t.status === "in_repertoire").length})
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter("in_rehearsal")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition border ${
                statusFilter === "in_rehearsal"
                  ? "bg-amber-400 text-slate-950 border-amber-400 font-black"
                  : "bg-slate-900 text-amber-400 border-slate-800 hover:text-white"
              }`}
            >
              Rehearsal / Review ({tunes.filter((t) => t.status === "in_rehearsal" || t.status === "review").length})
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter("frequent")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 border ${
                statusFilter === "frequent"
                  ? "bg-amber-500 text-slate-950 border-amber-400 font-black"
                  : "bg-slate-900 text-slate-400 border-slate-800 hover:text-white"
              }`}
            >
              <Flame className="w-3.5 h-3.5 text-amber-400" /> Heavy Rotation
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter("vault")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 border ${
                statusFilter === "vault"
                  ? "bg-purple-500 text-white border-purple-400 font-black"
                  : "bg-slate-900 text-slate-400 border-slate-800 hover:text-white"
              }`}
            >
              <Archive className="w-3.5 h-3.5 text-purple-400" /> In Vault (&gt;90 Days)
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter("unplayed")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 border ${
                statusFilter === "unplayed"
                  ? "bg-slate-700 text-white border-slate-600 font-black"
                  : "bg-slate-900 text-slate-400 border-slate-800 hover:text-white"
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-400" /> Unperformed
            </button>
          </div>

          {/* Tag Filter Dropdown */}
          {availableTags.length > 0 && (
            <div className="flex items-center gap-1.5">
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={selectedTag}
                onChange={(e) => setSelectedTag(e.target.value)}
                className="bg-slate-900 border border-slate-800 text-slate-300 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-yellow-400"
              >
                <option value="all">All Musical Styles</option>
                {availableTags.map((tag) => (
                  <option key={tag} value={tag}>
                    {tag}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Educational Note for In Repertoire */}
      {statusFilter === "in_repertoire" && (
        <div className="bg-sky-500/10 border border-sky-500/30 rounded-xl p-3.5 text-xs text-sky-200 flex items-center gap-3 shadow-sm">
          <BookOpen className="w-5 h-5 text-sky-400 shrink-0" />
          <div>
            <div className="font-bold text-sky-300">In Repertoire Expectations</div>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              Musicians should learn and maintain these charts in their gig folders. While called less frequently on regular street call sheets, they remain ready to be programmed for special events, requests, or deep setlist runs.
            </p>
          </div>
        </div>
      )}

      {/* Repertoire Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {filteredTunes.map((tune) => {
          const norm = normalizeSongTitle(tune.title);
          const stat = analytics[norm];
          const hasUpvoted = (tune.upvoteUids || []).includes(currentUserId);
          const hasDownvoted = (tune.downvoteUids || []).includes(currentUserId);
          const upvoteCount = (tune.upvoteUids || []).length;
          const downvoteCount = (tune.downvoteUids || []).length;
          const isPlayingAudio = playingAudioTuneId === tune.id;

          return (
            <div
              key={tune.id}
              className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl p-4 flex flex-col justify-between gap-3 shadow-sm transition group"
            >
              <div className="space-y-2">
                {/* Title & Key Row */}
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5 min-w-0">
                    <h2 className="text-sm font-extrabold text-white flex items-center gap-1.5 truncate">
                      <Music2 className="w-4 h-4 text-yellow-400 shrink-0" />
                      <span className="truncate">{tune.title}</span>
                    </h2>
                    {tune.artist && (
                      <p className="text-xs text-slate-400 truncate">By {tune.artist}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* Status Badge */}
                    {tune.status === "in_repertoire" && (
                      <span className="text-[10px] font-bold text-sky-400 bg-sky-500/10 border border-sky-500/20 px-2 py-0.5 rounded flex items-center gap-1">
                        <BookOpen className="w-3 h-3" /> Repertoire
                      </span>
                    )}
                    {tune.status === "active" && (
                      <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                        Active
                      </span>
                    )}
                    {(tune.status === "in_rehearsal" || tune.status === "review") && (
                      <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">
                        Rehearsal
                      </span>
                    )}
                    {tune.status === "archived" && (
                      <span className="text-[10px] font-bold text-slate-500 bg-slate-800 border border-slate-700 px-2 py-0.5 rounded">
                        Archived
                      </span>
                    )}

                    {/* Key Signature */}
                    {tune.keySignature && (
                      <span className="text-[10px] font-mono font-bold text-yellow-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800 shrink-0">
                        {tune.keySignature}
                      </span>
                    )}
                  </div>
                </div>

                {/* Arranger, Meter, Tempo Meta */}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400 font-mono">
                  {tune.arranger && <span>Arr: {tune.arranger}</span>}
                  {tune.tempoBpm ? <span>{tune.tempoBpm} BPM</span> : null}
                  {tune.meter && <span>{tune.meter}</span>}
                  {tune.chartContactName && (
                    <span className="text-yellow-400/80">Lead: {tune.chartContactName}</span>
                  )}
                </div>

                {/* Notes if present */}
                {tune.notes && (
                  <p className="text-[11px] text-slate-400 italic line-clamp-2 bg-slate-950/50 p-2 rounded-lg border border-slate-800/50">
                    {tune.notes}
                  </p>
                )}

                {/* Tags Chips */}
                {tune.tags && tune.tags.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1 pt-0.5">
                    {tune.tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="text-[9px] font-mono font-medium px-1.5 py-0.5 rounded bg-slate-950 text-slate-400 border border-slate-800"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Bottom Actions & Frequency Stats */}
              <div className="pt-2.5 border-t border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-xs">
                {/* Performance History / Stat */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {stat ? (
                    <>
                      <span className="bg-slate-950 text-slate-300 font-mono text-[10px] px-2 py-0.5 rounded border border-slate-800">
                        Played {stat.playCount} {stat.playCount === 1 ? "time" : "times"}
                      </span>

                      {stat.statusCategory === "frequent" && (
                        <span className="bg-amber-400/10 text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded border border-amber-400/20 flex items-center gap-1">
                          <Flame className="w-3 h-3" /> Recent Rotation
                        </span>
                      )}

                      {stat.statusCategory === "vault" && (
                        <span className="bg-purple-500/10 text-purple-400 text-[10px] font-bold px-2 py-0.5 rounded border border-purple-500/20 flex items-center gap-1">
                          <Archive className="w-3 h-3" /> In Vault
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="text-slate-500 text-[11px] flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-yellow-400/60" /> Ready for setlists
                    </span>
                  )}
                </div>

                {/* Right Action Buttons */}
                <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                  {/* Reaction Up/Down Voting */}
                  <div className="flex items-center gap-1 bg-slate-950 px-1.5 py-1 rounded-lg border border-slate-800">
                    <button
                      type="button"
                      onClick={() => handleVote(tune.id, "up")}
                      className={`flex items-center gap-1 text-[11px] font-mono px-1 py-0.5 rounded transition ${
                        hasUpvoted ? "text-emerald-400 bg-emerald-500/10 font-bold" : "text-slate-500 hover:text-slate-300"
                      }`}
                      title="Favorite / Vote Up"
                    >
                      <ThumbsUp className="w-3 h-3" />
                      <span>{upvoteCount}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleVote(tune.id, "down")}
                      className={`flex items-center gap-1 text-[11px] font-mono px-1 py-0.5 rounded transition ${
                        hasDownvoted ? "text-rose-400 bg-rose-500/10 font-bold" : "text-slate-500 hover:text-slate-300"
                      }`}
                      title="Needs Work / Vote Down"
                    >
                      <ThumbsDown className="w-3 h-3" />
                      <span>{downvoteCount}</span>
                    </button>
                  </div>

                  {/* Audio Sample Player Button */}
                  {tune.audioSampleUrl && (
                    <button
                      type="button"
                      onClick={() => handleTogglePlayAudio(tune)}
                      className={`p-1.5 rounded-lg border transition ${
                        isPlayingAudio
                          ? "bg-yellow-400 text-slate-950 border-yellow-400"
                          : "bg-slate-950 text-slate-300 border-slate-800 hover:border-yellow-400/40 hover:text-yellow-400"
                      }`}
                      title={isPlayingAudio ? "Pause Audio Preview" : "Play Audio Reference Sample"}
                    >
                      {isPlayingAudio ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                    </button>
                  )}

                  {/* Discussion Comments Button */}
                  <button
                    type="button"
                    onClick={() => setSelectedTuneForComments(tune)}
                    className="p-1.5 rounded-lg bg-slate-950 text-slate-400 hover:text-yellow-400 border border-slate-800 hover:border-yellow-400/40 transition"
                    title="View & Add Rehearsal Discussion"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                  </button>

                  {/* Sheet Music Charts Drive Link */}
                  {tune.driveLink && (
                    <a
                      href={tune.driveLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1.5 rounded-lg bg-yellow-400/10 hover:bg-yellow-400/20 text-yellow-400 border border-yellow-400/20 font-bold text-xs flex items-center gap-1 transition"
                      title="Open Sheet Music Charts in Google Drive"
                    >
                      <span>Charts</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}

                  {/* Manager Actions: Edit & Delete */}
                  {canManage && (
                    <div className="flex items-center gap-1 pl-1 border-l border-slate-800">
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(tune)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                        title="Edit Chart Metadata"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteTune(tune.id, tune.title)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
                        title="Delete Chart"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredTunes.length === 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center space-y-3">
          <Music2 className="w-8 h-8 text-slate-600 mx-auto" />
          <h3 className="text-sm font-bold text-white">No Repertoire Charts Found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            No charts matched your current search and filter settings. Try adjusting your query or resetting filters.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearch("");
              setStatusFilter("all");
              setSelectedTag("all");
            }}
            className="text-xs font-bold text-yellow-400 hover:text-yellow-300"
          >
            Reset All Filters
          </button>
        </div>
      )}

      {/* Tune Discussion Modal */}
      <TuneCommentsModal
        isOpen={Boolean(selectedTuneForComments)}
        onClose={() => setSelectedTuneForComments(null)}
        tune={selectedTuneForComments}
      />

      {/* Manager Add / Edit Chart Modal */}
      {isEditorOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Music2 className="w-5 h-5 text-yellow-400" />
                {editingTune ? `Edit Chart: ${editingTune.title}` : "Add New Sheet Music Chart"}
              </h2>
              <button
                type="button"
                onClick={() => setIsEditorOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTune} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">Chart Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Iron City Funk"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">Artist / Composer</label>
                  <input
                    type="text"
                    placeholder="e.g. Stevie Wonder / Traditional"
                    value={formArtist}
                    onChange={(e) => setFormArtist(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">Arranger</label>
                  <input
                    type="text"
                    placeholder="e.g. Eagleburger"
                    value={formArranger}
                    onChange={(e) => setFormArranger(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">Key Signature</label>
                  <input
                    type="text"
                    placeholder="e.g. Bb Major"
                    value={formKeySignature}
                    onChange={(e) => setFormKeySignature(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">Tempo (BPM)</label>
                  <input
                    type="number"
                    placeholder="120"
                    value={formTempoBpm}
                    onChange={(e) => setFormTempoBpm(Number(e.target.value) || 120)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">Meter</label>
                  <input
                    type="text"
                    placeholder="4/4"
                    value={formMeter}
                    onChange={(e) => setFormMeter(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">Repertoire Status</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as TuneStatus)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400"
                  >
                    <option value="active">Active Rotation (Main Gig Book)</option>
                    <option value="in_repertoire">In Repertoire (Learn & Maintain)</option>
                    <option value="in_rehearsal">In Rehearsal / Under Development</option>
                    <option value="review">Review Queue</option>
                    <option value="archived">Archived / Dormant</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">Chart Lead Contact</label>
                  <select
                    value={formChartContactUid}
                    onChange={(e) => setFormChartContactUid(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400"
                  >
                    <option value="">No designated lead</option>
                    {members.map((m) => (
                      <option key={m.uid} value={m.uid}>
                        {m.displayName} ({m.email})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">Google Drive Sheet Music URL</label>
                  <input
                    type="url"
                    placeholder="https://drive.google.com/..."
                    value={formDriveLink}
                    onChange={(e) => setFormDriveLink(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">Audio Reference Sample URL (MP3/WAV)</label>
                  <input
                    type="url"
                    placeholder="https://example.com/audio/sample.mp3"
                    value={formAudioSampleUrl}
                    onChange={(e) => setFormAudioSampleUrl(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">Tags (Comma-Separated)</label>
                  <input
                    type="text"
                    placeholder="Street Beat, Parade, Funk, Crowd Favorite"
                    value={formTags}
                    onChange={(e) => setFormTags(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">Arrangement & Rehearsal Notes</label>
                  <textarea
                    rows={3}
                    placeholder="e.g. Percussion cadence enters on pickup. Sousaphone clavinet riff at bar 16."
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditorOpen(false)}
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
                  {editingTune ? "Update Chart" : "Save to Catalog"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}