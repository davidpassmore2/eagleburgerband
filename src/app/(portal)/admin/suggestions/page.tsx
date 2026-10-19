"use client";

import React, { useEffect, useState, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
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
import { canReviewSuggestion } from "@/lib/auth/permissions";
import { User } from "@/lib/schema/user";
import {
  Suggestion,
  SuggestionSchema,
  SuggestionCategory,
  SuggestionStatus,
} from "@/lib/schema/suggestion";
import { toast } from "@/lib/context/ToastContext";
import { dispatchPortalInteraction } from "@/lib/metrics/usageTracker";
import { getYouTubeEmbedUrl } from "@/lib/utils/media";
import { 
  Lightbulb, 
  ThumbsUp, 
  ThumbsDown, 
  Plus, 
  Trash2, 
  ExternalLink, 
  Search, 
  Loader2, 
  X, 
  Check, 
  Layers, 
  Music2, 
  Calendar, 
  Globe, 
  MessageSquare, 
  ShieldCheck, 
  CheckCircle2, 
  Clock, 
  ArrowRight, 
  Edit3,
  User as UserIcon,
  ChevronDown,
  Archive,
  ArchiveRestore,
} from "lucide-react";
import CommentsStream from "@/components/portal/CommentsStream";
import PortalBreadcrumb from "@/components/portal/PortalBreadcrumb";

interface SuggestionItem {
  id: string;
  title: string;
  description: string;
  category: SuggestionCategory;
  authorName: string;
  authorUid: string;
  status: SuggestionStatus;
  upvoteUids: string[];
  downvoteUids: string[];
  originalArtist?: string;
  referenceUrl?: string;
  adminNotes?: string;
  reviewedByUid?: string | null;
  reviewedByName?: string | null;
  reviewedAt?: string | null;
  promotedSongId?: string;
  isArchived: boolean;
  archivedAt?: string | null;
  archivedByUid?: string | null;
  createdAt: string;
  updatedAt?: string;
}

const CATEGORIES = [
  {
    id: "all" as const,
    label: "All Suggestions",
    reviewerLabel: "All Leadership",
    icon: Layers,
    color: "text-amber-400 bg-amber-400/10 border-amber-400/30",
    description: "Review, vote, and discuss member suggestions across all categories including repertoire, gig leads, web features, and band operations. Triage status and reviewer notes from leadership are tracked in real time.",
    tip: "Vote to signal priority to band leadership during production triage",
  },
  {
    id: "tune_request" as const,
    label: "Tune Requests",
    reviewerLabel: "Catalog Manager",
    icon: Music2,
    color: "text-purple-400 bg-purple-500/10 border-purple-500/30",
    description: "Propose new charts, song arrangements, and repertoire additions. Include original artist, genre, reference audio links, and style notes to assist the Catalog and Setlist Manager with review.",
    tip: "Include reference YouTube or audio links for expedited review",
  },
  {
    id: "gig_outreach" as const,
    label: "Gig Outreach",
    reviewerLabel: "Gig Manager",
    icon: Calendar,
    color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
    description: "Submit prospective performance opportunities, festival bookings, parade invitations, and venue contacts for leadership evaluation and scheduling.",
    tip: "Provide event dates, contact persons, and venue location details",
  },
  {
    id: "website_request" as const,
    label: "Website Requests",
    reviewerLabel: "Web Manager",
    icon: Globe,
    color: "text-blue-400 bg-blue-500/10 border-blue-500/30",
    description: "Suggest portal enhancements, public site features, bug fixes, digital tool requests, or UX improvements for the band's web presence.",
    tip: "Describe workflow improvements or report specific bugs",
  },
  {
    id: "general_feedback" as const,
    label: "General Feedback",
    reviewerLabel: "Community Manager",
    icon: MessageSquare,
    color: "text-amber-400 bg-amber-500/10 border-amber-500/30",
    description: "Share constructive thoughts on rehearsals, uniforms and merchandise, social events, section dynamics, and general band operations.",
    tip: "Constructive feedback and creative ideas keep our ensemble thriving",
  },
];

// Normalize legacy statuses
const normalizeStatus = (rawStatus?: string): SuggestionStatus => {
  if (!rawStatus) return "submitted";
  const cleaned = rawStatus.toLowerCase().replace(/[\s-]+/g, "_");
  if (cleaned === "pitched") return "submitted";
  if (cleaned === "in_review" || cleaned === "review" || cleaned === "under_review") return "under_review";
  if (cleaned === "approved" || cleaned === "accepted" || cleaned === "promoted") return "accepted";
  if (cleaned === "shelved" || cleaned === "declined" || cleaned === "rejected") return "declined";
  if (cleaned === "implemented") return "implemented";
  return "submitted";
};

// Normalize legacy categories
const normalizeCategory = (rawCategory?: string): SuggestionCategory => {
  if (!rawCategory) return "general_feedback";
  if (rawCategory === "tune_request") return "tune_request";
  if (rawCategory === "gig_outreach" || rawCategory === "gig_opportunity") return "gig_outreach";
  if (rawCategory === "website_request") return "website_request";
  return "general_feedback";
};

function SuggestionTriageContent() {
  const searchParams = useSearchParams();
  const { firebaseUser, profile, loading: authLoading } = useAuth();
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"score" | "newest" | "upvotes">("score");
  const [showArchived, setShowArchived] = useState(false);

  // Create Modal State
  const [isCreating, setIsCreating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [createForm, setCreateForm] = useState({
    title: "",
    category: "tune_request" as SuggestionCategory,
    description: "",
    originalArtist: "",
    referenceUrl: "",
  });

  // URL query parameter synchronization (e.g. ?category=tune_request&action=new)
  useEffect(() => {
    const categoryParam = searchParams.get("category");
    const actionParam = searchParams.get("action");
    const newParam = searchParams.get("new");
    const submitParam = searchParams.get("submit");

    if (categoryParam) {
      const normalized = normalizeCategory(categoryParam);
      setActiveCategory(categoryParam === "all" ? "all" : normalized);
      setCreateForm((prev) => ({ ...prev, category: normalized }));
    }

    if (
      actionParam === "new" ||
      actionParam === "create" ||
      newParam === "true" ||
      newParam === "1" ||
      submitParam === "true" ||
      submitParam === "1"
    ) {
      setIsCreating(true);
    }
  }, [searchParams]);

  // Edit Review Notes Modal
  const [notesTarget, setNotesTarget] = useState<SuggestionItem | null>(null);
  const [reviewNotesText, setReviewNotesText] = useState("");
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [promotingId, setPromotingId] = useState<string | null>(null);
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});

  const toggleComments = (id: string) => {
    setExpandedComments((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const userProfile = profile as unknown as User;

  useEffect(() => {
    if (authLoading) return;

    const unsub = onSnapshot(
      collection(db, "suggestions"),
      (snap) => {
        const list: SuggestionItem[] = [];
        snap.forEach((d) => {
          const data = d.data();
          const upvotes = Array.isArray(data.upvoteUids)
            ? data.upvoteUids
            : Array.isArray(data.upvotes)
            ? data.upvotes
            : [];
          const downvotes = Array.isArray(data.downvoteUids)
            ? data.downvoteUids
            : Array.isArray(data.downvotes)
            ? data.downvotes
            : [];

          list.push({
            id: d.id,
            title: data.title || "",
            description: data.description || data.notes || "",
            category: normalizeCategory(data.category),
            authorName: data.authorName || data.suggestedBy || "Musician",
            authorUid: data.authorUid || data.suggestedByUid || "",
            status: normalizeStatus(data.status),
            upvoteUids: upvotes,
            downvoteUids: downvotes,
            originalArtist: data.originalArtist || data.artist || "",
            referenceUrl: data.referenceUrl || "",
            adminNotes: data.adminNotes || "",
            reviewedByUid: data.reviewedByUid || null,
            reviewedByName: data.reviewedByName || null,
            reviewedAt: data.reviewedAt || null,
            promotedSongId: data.promotedSongId || undefined,
            isArchived: Boolean(data.isArchived),
            archivedAt: data.archivedAt || null,
            archivedByUid: data.archivedByUid || null,
            createdAt: data.createdAt || new Date().toISOString(),
            updatedAt: data.updatedAt,
          });
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

  // Bi-directional voting handler
  const handleVote = async (sug: SuggestionItem, voteType: "up" | "down") => {
    if (!firebaseUser) {
      toast.error("Please sign in to vote on suggestions.");
      return;
    }
    const uid = firebaseUser.uid;
    const hasUpvoted = sug.upvoteUids.includes(uid);
    const hasDownvoted = sug.downvoteUids.includes(uid);
    const sugRef = doc(db, "suggestions", sug.id);

    try {
      if (voteType === "up") {
        if (hasUpvoted) {
          // Toggle off
          await updateDoc(sugRef, {
            upvoteUids: arrayRemove(uid),
            upvotes: arrayRemove(uid), // sync legacy field
            updatedAt: new Date().toISOString(),
          });
        } else {
          // Add upvote, remove any downvote
          await updateDoc(sugRef, {
            upvoteUids: arrayUnion(uid),
            upvotes: arrayUnion(uid),
            downvoteUids: arrayRemove(uid),
            downvotes: arrayRemove(uid),
            updatedAt: new Date().toISOString(),
          });
        }
      } else {
        // Vote down
        if (hasDownvoted) {
          // Toggle off
          await updateDoc(sugRef, {
            downvoteUids: arrayRemove(uid),
            downvotes: arrayRemove(uid),
            updatedAt: new Date().toISOString(),
          });
        } else {
          // Add downvote, remove any upvote
          await updateDoc(sugRef, {
            downvoteUids: arrayUnion(uid),
            downvotes: arrayUnion(uid),
            upvoteUids: arrayRemove(uid),
            upvotes: arrayRemove(uid),
            updatedAt: new Date().toISOString(),
          });
        }
      }
      dispatchPortalInteraction("vote_suggestion", `${voteType === "up" ? "Upvoted" : "Downvoted"} suggestion: ${sug.title}`, { suggestionId: sug.id, voteType });
    } catch (err) {
      console.error("Voting error:", err);
      toast.error("Failed to submit vote: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  // Status Change handler (restricted by category role)
  const handleStatusChange = async (sug: SuggestionItem, nextStatus: SuggestionStatus) => {
    if (!canReviewSuggestion(userProfile, sug.category)) {
      toast.error("You do not have administrative permission to triage this category.");
      return;
    }

    try {
      await updateDoc(doc(db, "suggestions", sug.id), {
        status: nextStatus,
        reviewedByUid: firebaseUser?.uid || null,
        reviewedByName: profile?.displayName || "Reviewer",
        reviewedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      toast.error("Failed to update status: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  // Save Review Notes
  const handleSaveReviewNotes = async () => {
    if (!notesTarget) return;
    setIsSavingNotes(true);

    try {
      await updateDoc(doc(db, "suggestions", notesTarget.id), {
        adminNotes: reviewNotesText.trim(),
        reviewedByUid: firebaseUser?.uid || null,
        reviewedByName: profile?.displayName || "Reviewer",
        reviewedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      setNotesTarget(null);
      setReviewNotesText("");
      toast.success("Review notes saved.");
    } catch (err) {
      toast.error("Failed to save review notes: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsSavingNotes(false);
    }
  };

  // Create Suggestion
  const handleCreateSuggestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.title.trim() || !firebaseUser) return;

    setIsSaving(true);
    try {
      const sugId = `sug_${Date.now()}`;
      const payload: Suggestion = SuggestionSchema.parse({
        id: sugId,
        authorUid: firebaseUser.uid,
        authorName: profile?.displayName || firebaseUser.displayName || "Musician",
        category: createForm.category,
        title: createForm.title.trim(),
        description: createForm.description.trim(),
        status: "submitted",
        upvoteUids: [firebaseUser.uid],
        downvoteUids: [],
        originalArtist: createForm.originalArtist.trim(),
        referenceUrl: createForm.referenceUrl.trim(),
        targetRole: "",
        adminNotes: "",
        reviewedByUid: null,
        reviewedByName: null,
        reviewedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // Write to suggestions collection
      await setDoc(doc(db, "suggestions", sugId), payload);
      dispatchPortalInteraction("create_suggestion", `Submitted suggestion: ${createForm.title.trim()}`, { title: createForm.title.trim(), category: createForm.category });

      toast.success("Suggestion submitted successfully!");
      setIsCreating(false);
      setCreateForm({
        title: "",
        category: "tune_request",
        description: "",
        originalArtist: "",
        referenceUrl: "",
      });
    } catch (err) {
      toast.error("Failed to submit suggestion: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsSaving(false);
    }
  };

  // Promote tune to catalog
  const handlePromoteToCatalog = async (sug: SuggestionItem) => {
    if (!confirm(`Promote "${sug.title}" directly to the active band song catalog?`)) return;
    setPromotingId(sug.id);

    try {
      const songId = `song_${sug.title.toLowerCase().replace(/[^a-z0-9]/g, "_")}`;
      const payload = {
        id: songId,
        title: sug.title,
        artist: sug.originalArtist || "Ensemble",
        arranger: "Eagleburger",
        keySignature: "Bb Major",
        tempoBpm: 120,
        driveLink: sug.referenceUrl || "",
        tags: ["Ensemble Suggestion", "In Development"],
        updatedAt: new Date().toISOString(),
      };

      await setDoc(doc(db, "tunes", songId), payload, { merge: true });

      await updateDoc(doc(db, "suggestions", sug.id), {
        status: "accepted",
        promotedSongId: songId,
        updatedAt: new Date().toISOString(),
      });
      dispatchPortalInteraction("promote_suggestion", `Promoted "${sug.title}" to catalog`, { suggestionId: sug.id, songId });

      toast.success(`"${sug.title}" is now added to the Song Catalog!`);
    } catch (err) {
      toast.error("Failed to promote suggestion: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setPromotingId(null);
    }
  };

  // Delete suggestion
  const handleDeleteSuggestion = async (id: string, title: string) => {
    if (!confirm(`Delete suggestion for "${title}"?`)) return;
    try {
      await deleteDoc(doc(db, "suggestions", id));
      toast.success("Suggestion deleted.");
    } catch (err) {
      toast.error("Failed to delete suggestion: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  // Archive suggestion handler (available regardless of status or type)
  const handleArchive = async (sug: SuggestionItem) => {
    try {
      await updateDoc(doc(db, "suggestions", sug.id), {
        isArchived: true,
        archivedAt: new Date().toISOString(),
        archivedByUid: firebaseUser?.uid || null,
        updatedAt: new Date().toISOString(),
      });
      dispatchPortalInteraction("archive_suggestion", `Archived suggestion: ${sug.title}`, { suggestionId: sug.id });
      toast.success(`"${sug.title}" moved to archive.`);
    } catch (err) {
      console.error("Archive error:", err);
      toast.error("Failed to archive: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  // Unarchive suggestion handler
  const handleUnarchive = async (sug: SuggestionItem) => {
    try {
      await updateDoc(doc(db, "suggestions", sug.id), {
        isArchived: false,
        archivedAt: null,
        archivedByUid: null,
        updatedAt: new Date().toISOString(),
      });
      dispatchPortalInteraction("unarchive_suggestion", `Restored suggestion: ${sug.title}`, { suggestionId: sug.id });
      toast.success(`"${sug.title}" restored to main list.`);
    } catch (err) {
      console.error("Unarchive error:", err);
      toast.error("Failed to unarchive: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  // Split suggestions into active vs archived
  const { activeSuggestions, archivedSuggestions } = useMemo(() => {
    const active: SuggestionItem[] = [];
    const archived: SuggestionItem[] = [];
    suggestions.forEach((s) => {
      if (s.isArchived) {
        archived.push(s);
      } else {
        active.push(s);
      }
    });
    return { activeSuggestions: active, archivedSuggestions: archived };
  }, [suggestions]);

  // Filtered & Sorted Active Suggestions
  const filteredSuggestions = useMemo(() => {
    return activeSuggestions
      .filter((s) => {
        // Category filter
        if (activeCategory !== "all" && s.category !== activeCategory) {
          return false;
        }

        // Status filter
        if (filterStatus === "open") {
          if (s.status !== "submitted" && s.status !== "under_review") return false;
        } else if (filterStatus === "resolved") {
          if (s.status !== "accepted" && s.status !== "implemented") return false;
        } else if (filterStatus === "declined") {
          if (s.status !== "declined") return false;
        }

        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchTitle = s.title.toLowerCase().includes(q);
          const matchDesc = s.description.toLowerCase().includes(q);
          const matchAuthor = s.authorName.toLowerCase().includes(q);
          const matchArtist = (s.originalArtist || "").toLowerCase().includes(q);
          if (!matchTitle && !matchDesc && !matchAuthor && !matchArtist) return false;
        }

        return true;
      })
      .sort((a, b) => {
        const scoreA = (a.upvoteUids.length || 0) - (a.downvoteUids.length || 0);
        const scoreB = (b.upvoteUids.length || 0) - (b.downvoteUids.length || 0);

        if (sortBy === "score") {
          if (scoreB !== scoreA) return scoreB - scoreA;
          return b.createdAt.localeCompare(a.createdAt);
        } else if (sortBy === "upvotes") {
          const upA = a.upvoteUids.length || 0;
          const upB = b.upvoteUids.length || 0;
          if (upB !== upA) return upB - upA;
          return b.createdAt.localeCompare(a.createdAt);
        } else {
          return b.createdAt.localeCompare(a.createdAt);
        }
      });
  }, [activeSuggestions, activeCategory, filterStatus, searchQuery, sortBy]);

  // Filtered & Sorted Archived Suggestions
  const filteredArchivedSuggestions = useMemo(() => {
    return archivedSuggestions
      .filter((s) => {
        // Category filter
        if (activeCategory !== "all" && s.category !== activeCategory) {
          return false;
        }

        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchTitle = s.title.toLowerCase().includes(q);
          const matchDesc = s.description.toLowerCase().includes(q);
          const matchAuthor = s.authorName.toLowerCase().includes(q);
          const matchArtist = (s.originalArtist || "").toLowerCase().includes(q);
          if (!matchTitle && !matchDesc && !matchAuthor && !matchArtist) return false;
        }

        return true;
      })
      .sort((a, b) => {
        const timeA = a.archivedAt || a.updatedAt || a.createdAt;
        const timeB = b.archivedAt || b.updatedAt || b.createdAt;
        return timeB.localeCompare(timeA);
      });
  }, [archivedSuggestions, activeCategory, searchQuery]);

  // Counts by category (active only)
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: activeSuggestions.length };
    activeSuggestions.forEach((s) => {
      counts[s.category] = (counts[s.category] || 0) + 1;
    });
    return counts;
  }, [activeSuggestions]);

  // Telemetry totals (active only)
  const telemetry = useMemo(() => {
    let totalScore = 0;
    let pendingCount = 0;
    let resolvedCount = 0;

    activeSuggestions.forEach((s) => {
      totalScore += (s.upvoteUids.length || 0) - (s.downvoteUids.length || 0);
      if (s.status === "submitted" || s.status === "under_review") pendingCount++;
      if (s.status === "accepted" || s.status === "implemented") resolvedCount++;
    });

    return { totalScore, pendingCount, resolvedCount, totalCount: activeSuggestions.length };
  }, [activeSuggestions]);

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-400 gap-2 text-xs">
        <Loader2 className="w-4 h-4 animate-spin text-yellow-400" />
        Loading suggestion triage & voting workstation...
      </div>
    );
  }

  const getStatusBadge = (status: SuggestionStatus) => {
    switch (status) {
      case "accepted":
      case "approved":
        return (
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
            <Check className="w-3 h-3" /> Accepted
          </span>
        );
      case "implemented":
        return (
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Implemented
          </span>
        );
      case "under_review":
      case "in_review":
        return (
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/30 flex items-center gap-1">
            <Clock className="w-3 h-3" /> In Review
          </span>
        );
      case "declined":
      case "shelved":
        return (
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
            Declined
          </span>
        );
      default:
        return (
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-400/15 text-amber-300 border border-amber-400/30">
            Open
          </span>
        );
    }
  };

  const getCategoryInfo = (category: SuggestionCategory) => {
    const found = CATEGORIES.find((c) => c.id === category);
    return found || CATEGORIES[4];
  };

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      <PortalBreadcrumb className="mb-2" />
      {/* Header Banner */}
      <div 
        suppressHydrationWarning
        style={{ backgroundColor: "var(--ebb-surface)", borderColor: "var(--ebb-border)" }}
        className="border rounded-3xl p-5 sm:p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-xl transition-colors"
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
              className="text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded border"
            >
              Ensemble Voice & Governance
            </span>
            <span className="text-[11px] font-mono text-slate-400">
              {suggestions.length} Total Suggestion{suggestions.length === 1 ? "" : "s"}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2 mt-1">
            <Lightbulb className="w-6 h-6 text-yellow-400" /> Suggestion Triage & Member Voice
          </h1>
          <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
            Submit ideas for tunes, gig outreach, website features, or general feedback. All members can vote with thumbs up or down. Category role managers triage and review suggestions.
          </p>
        </div>

        {!isCreating && (
          <button
            type="button"
            onClick={() => setIsCreating(true)}
            className="bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 transition shadow-lg shrink-0"
          >
            <Plus className="w-4 h-4" /> Submit Suggestion
          </button>
        )}
      </div>

      {/* Telemetry Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-1">
          <span className="text-[10px] font-mono text-slate-400 uppercase">Total Suggestions</span>
          <div className="text-2xl font-bold text-white">{telemetry.totalCount}</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-1">
          <span className="text-[10px] font-mono text-amber-400 uppercase">Awaiting Triage</span>
          <div className="text-2xl font-bold text-amber-400">{telemetry.pendingCount}</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-1">
          <span className="text-[10px] font-mono text-emerald-400 uppercase">Accepted / Done</span>
          <div className="text-2xl font-bold text-emerald-400">{telemetry.resolvedCount}</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-1">
          <span className="text-[10px] font-mono text-indigo-400 uppercase">Net Upvotes</span>
          <div className="text-2xl font-bold text-indigo-400">
            {telemetry.totalScore > 0 ? `+${telemetry.totalScore}` : telemetry.totalScore}
          </div>
        </div>
      </div>

      {/* Category Queue Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {CATEGORIES.map((cat) => {
          const IconComp = cat.icon;
          const count = categoryCounts[cat.id] || 0;
          const isActive = activeCategory === cat.id;

          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 border ${
                isActive
                  ? "bg-yellow-400 text-slate-950 border-yellow-400 shadow-md"
                  : "bg-slate-900 text-slate-400 border-slate-800 hover:text-white hover:bg-slate-800"
              }`}
            >
              <IconComp className="w-4 h-4 shrink-0" />
              <span>{cat.label}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                isActive ? "bg-black/20 text-slate-950" : "bg-slate-950 text-slate-400"
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Active Category Description Panel */}
      {(() => {
        const activeCat = CATEGORIES.find((c) => c.id === activeCategory) || CATEGORIES[0];
        const IconComp = activeCat.icon;
        const count = categoryCounts[activeCat.id] || 0;
        return (
          <div 
            suppressHydrationWarning
            style={{ backgroundColor: "var(--ebb-surface)", borderColor: "var(--ebb-border)" }}
            className="border rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm transition-colors"
          >
            <div className="flex items-start gap-3.5">
              <div className={`p-2.5 rounded-xl shrink-0 border ${activeCat.color}`}>
                <IconComp className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-slate-100 text-sm">{activeCat.label}</h3>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700/60">
                    Reviewer: {activeCat.reviewerLabel}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    • {count} {count === 1 ? "suggestion" : "suggestions"}
                  </span>
                </div>
                <p className="text-slate-300 text-xs leading-relaxed max-w-3xl">
                  {activeCat.description}
                </p>
              </div>
            </div>
            {activeCat.tip && (
              <div className="flex items-center gap-2 text-slate-400 text-xs bg-slate-950/70 border border-slate-800 px-3.5 py-2 rounded-xl shrink-0 self-start md:self-center">
                <span className="text-amber-400 text-sm shrink-0">💡</span>
                <span className="text-[11px] leading-tight">
                  <strong className="text-slate-200 font-semibold">Tip:</strong> {activeCat.tip}
                </span>
              </div>
            )}
          </div>
        );
      })()}

      {/* Filter and Search Bar */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-3.5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Status Filter */}
          <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-xl p-0.5">
            <button
              type="button"
              onClick={() => setFilterStatus("all")}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition ${
                filterStatus === "all" ? "bg-slate-800 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus("open")}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition ${
                filterStatus === "open" ? "bg-slate-800 text-amber-300" : "text-slate-400 hover:text-white"
              }`}
            >
              Open / In Review
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus("resolved")}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition ${
                filterStatus === "resolved" ? "bg-slate-800 text-emerald-300" : "text-slate-400 hover:text-white"
              }`}
            >
              Accepted
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus("declined")}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition ${
                filterStatus === "declined" ? "bg-slate-800 text-slate-300" : "text-slate-400 hover:text-white"
              }`}
            >
              Declined
            </button>
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <span>Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as "score" | "newest" | "upvotes")}
              className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1 text-xs text-white focus:outline-none focus:border-yellow-400"
            >
              <option value="score">Highest Net Score</option>
              <option value="upvotes">Most Upvoted</option>
              <option value="newest">Newest First</option>
            </select>
          </div>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search suggestions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400"
          />
        </div>
      </div>

      {/* New Suggestion Form Modal */}
      {isCreating && (
        <form
          onSubmit={handleCreateSuggestion}
          className="bg-slate-900 border border-yellow-400/30 rounded-3xl p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-yellow-400" /> Submit Suggestion / Request
            </h2>
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Category */}
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Suggestion Category *
              </label>
              <select
                value={createForm.category}
                onChange={(e) => setCreateForm({ ...createForm, category: e.target.value as SuggestionCategory })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400"
              >
                <option value="tune_request">Tune Request (Reviewed by Catalog Manager)</option>
                <option value="gig_outreach">Gig Outreach & Venues (Reviewed by Gig Manager)</option>
                <option value="website_request">Website & Portal (Reviewed by Web Manager)</option>
                <option value="general_feedback">General Feedback (Reviewed by Community Manager)</option>
              </select>
            </div>

            {/* Title */}
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Title / Short Summary *
              </label>
              <input
                type="text"
                required
                placeholder={
                  createForm.category === "tune_request"
                    ? "e.g. Chameleon (Herbie Hancock)"
                    : createForm.category === "gig_outreach"
                    ? "e.g. Millvale Riverfront Porchfest Pitch"
                    : createForm.category === "website_request"
                    ? "e.g. Add dark mode toggle to rehearsal vault"
                    : "e.g. Rehearsal warm-up format suggestion"
                }
                value={createForm.title}
                onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400"
              />
            </div>
          </div>

          {/* Conditional Fields for Tune Requests */}
          {createForm.category === "tune_request" && (
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Original Artist / Performer
              </label>
              <input
                type="text"
                placeholder="e.g. Herbie Hancock / Maynard Ferguson"
                value={createForm.originalArtist}
                onChange={(e) => setCreateForm({ ...createForm, originalArtist: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400"
              />
            </div>
          )}

          {/* Reference URL */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Reference Link (Optional)
            </label>
            <input
              type="url"
              placeholder="e.g. https://youtube.com/... or https://spotify.com/..."
              value={createForm.referenceUrl}
              onChange={(e) => setCreateForm({ ...createForm, referenceUrl: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Details & Rationale *
            </label>
            <textarea
              required
              rows={3}
              placeholder="Explain why this suggestion is great for the Eagleburger Band (e.g. arrangement viability, parade energy, community impact, tech improvement)..."
              value={createForm.description}
              onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400 resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold px-5 py-2 rounded-xl text-xs flex items-center gap-1.5 transition shadow-md disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              <span>Submit for Ensemble Review</span>
            </button>
          </div>
        </form>
      )}

      {/* Suggestions List */}
      <div className="space-y-4">
        {filteredSuggestions.length === 0 ? (
          <div className="p-12 text-center text-slate-500 bg-slate-900/40 rounded-3xl border border-slate-800 text-xs">
            No suggestions found matching the selected criteria.
          </div>
        ) : (
          filteredSuggestions.map((sug) => {
            const catInfo = getCategoryInfo(sug.category);
            const CatIcon = catInfo.icon;
            const canTriage = canReviewSuggestion(userProfile, sug.category);
            const netScore = (sug.upvoteUids.length || 0) - (sug.downvoteUids.length || 0);
            const userUpvoted = firebaseUser ? sug.upvoteUids.includes(firebaseUser.uid) : false;
            const userDownvoted = firebaseUser ? sug.downvoteUids.includes(firebaseUser.uid) : false;
            const isPromoting = promotingId === sug.id;
            const youtubeEmbedUrl = getYouTubeEmbedUrl(sug.referenceUrl);

            return (
              <div
                key={sug.id}
                className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-4 hover:border-slate-700 transition shadow-sm"
              >
                {/* Header Row: Category Badge, Status, Voting Score */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Category Chip */}
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border flex items-center gap-1.5 ${catInfo.color}`}>
                      <CatIcon className="w-3 h-3" />
                      <span>{catInfo.label}</span>
                    </span>

                    {/* Status Badge */}
                    {getStatusBadge(sug.status)}

                    {/* Reviewer Cue */}
                    <span className="text-[10px] font-mono text-slate-500 hidden sm:inline">
                      &bull; Queue: {catInfo.reviewerLabel}
                    </span>
                  </div>

                  {/* Bi-directional Voting Capsule */}
                  <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-2xl p-1 self-end sm:self-center shadow-xs">
                    {/* Thumbs Up Button */}
                    <button
                      type="button"
                      onClick={() => handleVote(sug, "up")}
                      className={`px-2.5 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                        userUpvoted
                          ? "bg-emerald-500 text-slate-950 shadow-sm"
                          : "text-slate-400 hover:text-emerald-400 hover:bg-slate-900"
                      }`}
                      title="Vote Thumbs Up"
                    >
                      <ThumbsUp className="w-3.5 h-3.5" />
                      <span>{sug.upvoteUids.length}</span>
                    </button>

                    {/* Net Score Pill */}
                    <span
                      className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-lg ${
                        netScore > 0
                          ? "text-emerald-400 bg-emerald-500/10"
                          : netScore < 0
                          ? "text-rose-400 bg-rose-500/10"
                          : "text-slate-500 bg-slate-900"
                      }`}
                      title="Net Ensemble Score"
                    >
                      {netScore > 0 ? `+${netScore}` : netScore}
                    </span>

                    {/* Thumbs Down Button */}
                    <button
                      type="button"
                      onClick={() => handleVote(sug, "down")}
                      className={`px-2.5 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                        userDownvoted
                          ? "bg-rose-500 text-white shadow-sm"
                          : "text-slate-400 hover:text-rose-400 hover:bg-slate-900"
                      }`}
                      title="Vote Thumbs Down"
                    >
                      <ThumbsDown className="w-3.5 h-3.5" />
                      <span>{sug.downvoteUids.length}</span>
                    </button>
                  </div>
                </div>

                {/* Suggestion Title & Metadata */}
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                    <span>{sug.title}</span>
                    {sug.originalArtist && (
                      <span className="text-xs text-slate-400 font-normal">
                        by <strong className="text-slate-300">{sug.originalArtist}</strong>
                      </span>
                    )}
                  </h3>

                  <div className="flex items-center gap-3 text-xs text-slate-400 mt-1 flex-wrap">
                    <span className="flex items-center gap-1 text-slate-300">
                      <UserIcon className="w-3.5 h-3.5 text-slate-500" />
                      {sug.authorName}
                    </span>
                    <span>&bull;</span>
                    <span className="text-slate-500 font-mono text-[11px]">
                      {new Date(sug.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>

                    {sug.referenceUrl && (
                      <>
                        <span>&bull;</span>
                        <a
                          href={sug.referenceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-amber-400 hover:text-amber-300 transition flex items-center gap-1"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Reference Link</span>
                        </a>
                      </>
                    )}
                  </div>
                </div>

                {/* Description Body */}
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed bg-slate-950/50 p-3 rounded-2xl border border-slate-800/80">
                  {sug.description}
                </p>

                {/* Embedded YouTube Reference Media */}
                {youtubeEmbedUrl && (
                  <div className="w-full max-w-2xl rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 shadow-md">
                    <div className="relative aspect-video w-full">
                      <iframe
                        src={youtubeEmbedUrl}
                        title={`Reference video for ${sug.title}`}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                        className="absolute inset-0 w-full h-full border-0"
                      />
                    </div>
                  </div>
                )}

                {/* Leadership Response / Reviewer Notes */}
                {sug.adminNotes && (
                  <div className="p-3.5 bg-yellow-400/5 border border-yellow-400/20 rounded-2xl space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-yellow-300 flex items-center gap-1.5 text-[11px]">
                        <ShieldCheck className="w-3.5 h-3.5 text-yellow-400" />
                        Leadership Response ({sug.reviewedByName || "Reviewer"}):
                      </span>
                      {sug.reviewedAt && (
                        <span className="text-[10px] font-mono text-slate-500">
                          {new Date(sug.reviewedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    <p className="text-slate-200 leading-relaxed">{sug.adminNotes}</p>
                  </div>
                )}

                {/* Triage Action Bar (If User has assigned review role or is admin) */}
                <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  {canTriage ? (
                    <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
                      <span className="text-[11px] font-semibold text-slate-400">
                        Triage ({catInfo.reviewerLabel}):
                      </span>
                      <select
                        value={sug.status}
                        onChange={(e) => handleStatusChange(sug, e.target.value as SuggestionStatus)}
                        className="bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1 text-xs text-white focus:outline-none focus:border-yellow-400 cursor-pointer"
                      >
                        <option value="submitted">Submitted</option>
                        <option value="under_review">Under Review</option>
                        <option value="accepted">Accepted / Approved</option>
                        <option value="implemented">Implemented</option>
                        <option value="declined">Declined / Shelved</option>
                      </select>

                      <button
                        type="button"
                        onClick={() => {
                          setNotesTarget(sug);
                          setReviewNotesText(sug.adminNotes || "");
                        }}
                        className="px-3 py-1 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-950 border border-slate-800 hover:border-slate-700 transition flex items-center gap-1"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-yellow-400" />
                        <span>{sug.adminNotes ? "Edit Response" : "Add Response"}</span>
                      </button>

                      {/* Promote to Catalog button for tune requests */}
                      {sug.category === "tune_request" && !sug.promotedSongId && (
                        <button
                          type="button"
                          disabled={isPromoting}
                          onClick={() => handlePromoteToCatalog(sug)}
                          className="px-3 py-1 rounded-xl text-xs font-bold text-slate-950 bg-yellow-400 hover:bg-yellow-300 transition flex items-center gap-1 disabled:opacity-50 shadow-xs"
                        >
                          {isPromoting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />}
                          <span>Promote to Catalog</span>
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="text-[11px] text-slate-500 font-mono">
                      Queue assigned to <span className="text-slate-400">{catInfo.reviewerLabel}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2 ml-auto sm:ml-0">
                    <button
                      type="button"
                      onClick={() => toggleComments(sug.id)}
                      className={`px-3 py-1 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
                        expandedComments[sug.id]
                          ? "bg-yellow-400/20 text-yellow-300 border border-yellow-400/40"
                          : "text-slate-400 hover:text-white bg-slate-950 border border-slate-800 hover:border-slate-700"
                      }`}
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-yellow-400" />
                      <span>Discussion</span>
                      <ChevronDown
                        className={`w-3 h-3 transition-transform duration-200 ${
                          expandedComments[sug.id] ? "rotate-180" : ""
                        }`}
                      />
                    </button>

                    {/* Archive Button (Available regardless of status or type) */}
                    <button
                      type="button"
                      onClick={() => handleArchive(sug)}
                      className="px-3 py-1 rounded-xl text-xs font-semibold text-slate-400 hover:text-amber-300 bg-slate-950 border border-slate-800 hover:border-amber-400/30 transition flex items-center gap-1.5 cursor-pointer"
                      title="Archive this submission"
                    >
                      <Archive className="w-3.5 h-3.5 text-slate-400" />
                      <span>Archive</span>
                    </button>

                    {/* Delete Option (For author or Admin) */}
                    {(canTriage || (firebaseUser && sug.authorUid === firebaseUser.uid)) && (
                      <button
                        type="button"
                        onClick={() => handleDeleteSuggestion(sug.id, sug.title)}
                        className="text-slate-500 hover:text-rose-400 transition p-1 text-xs flex items-center gap-1"
                        title="Delete suggestion"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Collapsible Discussion Stream */}
                {expandedComments[sug.id] && (
                  <div className="pt-3 border-t border-slate-800/80 animate-in fade-in duration-150">
                    <CommentsStream
                      targetType="suggestion"
                      targetId={sug.id}
                      targetTitle={sug.title}
                      compact
                    />
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Archived Submissions Section at bottom of submissions list */}
      <div className="pt-6 border-t border-slate-800/80 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/40 border border-slate-800 p-4 rounded-3xl">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-slate-800/80 border border-slate-700/60 text-slate-400">
              <Archive className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Archived Submissions
              </h3>
              <p className="text-[11px] text-slate-500">
                {archivedSuggestions.length === 1
                  ? "1 submission archived"
                  : `${archivedSuggestions.length} submissions archived`}
                {archivedSuggestions.length > 0 && " • Preserved for reference and can be restored anytime"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowArchived((prev) => !prev)}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-700/80 border border-slate-700 transition flex items-center justify-center gap-2 cursor-pointer shadow-xs self-start sm:self-center"
          >
            <Archive className="w-3.5 h-3.5 text-amber-400" />
            <span>
              {showArchived
                ? "Hide Archived Items"
                : `Show Archived Items (${archivedSuggestions.length})`}
            </span>
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform duration-200 ${
                showArchived ? "rotate-180" : ""
              }`}
            />
          </button>
        </div>

        {showArchived && (
          <div className="space-y-4 pt-1 animate-in fade-in duration-200">
            {filteredArchivedSuggestions.length === 0 ? (
              <div className="p-8 text-center text-slate-500 bg-slate-900/30 rounded-3xl border border-dashed border-slate-800 text-xs">
                {archivedSuggestions.length === 0
                  ? "No archived submissions yet. Use the 'Archive' button on any submission in the list above to move it here."
                  : "No archived submissions match the current category filter or search query."}
              </div>
            ) : (
              filteredArchivedSuggestions.map((sug) => {
                const catInfo = getCategoryInfo(sug.category);
                const CatIcon = catInfo.icon;
                const canTriage = canReviewSuggestion(userProfile, sug.category);
                const netScore = (sug.upvoteUids.length || 0) - (sug.downvoteUids.length || 0);
                const youtubeEmbedUrl = getYouTubeEmbedUrl(sug.referenceUrl);

                return (
                  <div
                    key={sug.id}
                    className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-5 sm:p-6 space-y-4 hover:border-slate-700/80 transition"
                  >
                    {/* Header Row: Category Badge, Status, Archived Badge, and Unarchive Button */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Category Chip */}
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border flex items-center gap-1.5 ${catInfo.color}`}>
                          <CatIcon className="w-3 h-3" />
                          <span>{catInfo.label}</span>
                        </span>

                        {/* Status Badge */}
                        {getStatusBadge(sug.status)}

                        {/* Archived Badge */}
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 flex items-center gap-1">
                          <Archive className="w-3 h-3 text-amber-400" />
                          <span>Archived</span>
                        </span>
                      </div>

                      {/* Unarchive Button */}
                      <button
                        type="button"
                        onClick={() => handleUnarchive(sug)}
                        className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-slate-950 bg-amber-400 hover:bg-yellow-300 transition flex items-center gap-1.5 cursor-pointer shadow-sm self-end sm:self-center"
                        title="Move this submission back into the main list"
                      >
                        <ArchiveRestore className="w-3.5 h-3.5" />
                        <span>Unarchive</span>
                      </button>
                    </div>

                    {/* Suggestion Title & Metadata */}
                    <div>
                      <h3 className="text-base sm:text-lg font-bold text-white/90 flex items-center gap-2">
                        <span>{sug.title}</span>
                        {sug.originalArtist && (
                          <span className="text-xs text-slate-400 font-normal">
                            by <strong className="text-slate-300">{sug.originalArtist}</strong>
                          </span>
                        )}
                      </h3>

                      <div className="flex items-center gap-3 text-xs text-slate-400 mt-1 flex-wrap">
                        <span className="flex items-center gap-1 text-slate-300">
                          <UserIcon className="w-3.5 h-3.5 text-slate-500" />
                          {sug.authorName}
                        </span>
                        <span>&bull;</span>
                        <span className="text-slate-500 font-mono text-[11px]">
                          Submitted: {new Date(sug.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                        {sug.archivedAt && (
                          <>
                            <span>&bull;</span>
                            <span className="text-amber-400/80 font-mono text-[11px]">
                              Archived: {new Date(sug.archivedAt).toLocaleDateString()}
                            </span>
                          </>
                        )}
                        <span>&bull;</span>
                        <span className="text-slate-400 font-mono text-[11px]">
                          Net Score: {netScore > 0 ? `+${netScore}` : netScore} ({sug.upvoteUids.length} up / {sug.downvoteUids.length} down)
                        </span>

                        {sug.referenceUrl && (
                          <>
                            <span>&bull;</span>
                            <a
                              href={sug.referenceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-amber-400 hover:text-amber-300 transition flex items-center gap-1"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              <span>Reference Link</span>
                            </a>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Description Body */}
                    {sug.description && (
                      <p className="text-xs sm:text-sm text-slate-300 leading-relaxed bg-slate-950/40 p-3 rounded-2xl border border-slate-800/60">
                        {sug.description}
                      </p>
                    )}

                    {/* Embedded YouTube Reference Media */}
                    {youtubeEmbedUrl && (
                      <div className="w-full max-w-2xl rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 shadow-md">
                        <div className="relative aspect-video w-full">
                          <iframe
                            src={youtubeEmbedUrl}
                            title={`Reference video for ${sug.title}`}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                            allowFullScreen
                            className="absolute inset-0 w-full h-full border-0"
                          />
                        </div>
                      </div>
                    )}

                    {/* Leadership Response / Reviewer Notes */}
                    {sug.adminNotes && (
                      <div className="p-3.5 bg-yellow-400/5 border border-yellow-400/20 rounded-2xl space-y-1 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-yellow-300 flex items-center gap-1.5 text-[11px]">
                            <ShieldCheck className="w-3.5 h-3.5 text-yellow-400" />
                            Leadership Response ({sug.reviewedByName || "Reviewer"}):
                          </span>
                          {sug.reviewedAt && (
                            <span className="text-[10px] font-mono text-slate-500">
                              {new Date(sug.reviewedAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                        <p className="text-slate-200 leading-relaxed">{sug.adminNotes}</p>
                      </div>
                    )}

                    {/* Action Bar (Discussion, Delete) */}
                    <div className="pt-3 border-t border-slate-800/60 flex items-center justify-between gap-3 flex-wrap">
                      <div className="text-[11px] text-slate-500 font-mono">
                        Archived submission &bull; Click Unarchive to restore to active triage
                      </div>

                      <div className="flex items-center gap-2 ml-auto">
                        <button
                          type="button"
                          onClick={() => toggleComments(sug.id)}
                          className={`px-3 py-1 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
                            expandedComments[sug.id]
                              ? "bg-yellow-400/20 text-yellow-300 border border-yellow-400/40"
                              : "text-slate-400 hover:text-white bg-slate-950 border border-slate-800 hover:border-slate-700"
                          }`}
                        >
                          <MessageSquare className="w-3.5 h-3.5 text-yellow-400" />
                          <span>Discussion</span>
                          <ChevronDown
                            className={`w-3 h-3 transition-transform duration-200 ${
                              expandedComments[sug.id] ? "rotate-180" : ""
                            }`}
                          />
                        </button>

                        {(canTriage || (firebaseUser && sug.authorUid === firebaseUser.uid)) && (
                          <button
                            type="button"
                            onClick={() => handleDeleteSuggestion(sug.id, sug.title)}
                            className="text-slate-500 hover:text-rose-400 transition p-1 text-xs flex items-center gap-1"
                            title="Delete suggestion"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Collapsible Discussion Stream */}
                    {expandedComments[sug.id] && (
                      <div className="pt-3 border-t border-slate-800/80 animate-in fade-in duration-150">
                        <CommentsStream
                          targetType="suggestion"
                          targetId={sug.id}
                          targetTitle={sug.title}
                          compact
                        />
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Modal for Leadership Response / Admin Notes */}
      {notesTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-yellow-400" />
                  Leadership Response Notes
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Responding to: <strong className="text-white">{notesTarget.title}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setNotesTarget(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 block">
                Official Feedback / Response (Visible to all members)
              </label>
              <textarea
                rows={4}
                value={reviewNotesText}
                onChange={(e) => setReviewNotesText(e.target.value)}
                placeholder="e.g. Love this idea! We're queuing this for arranging in Q3... or: The venue reached out to confirm parade timing..."
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400 resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setNotesTarget(null)}
                disabled={isSavingNotes}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveReviewNotes}
                disabled={isSavingNotes}
                className="px-5 py-2 rounded-xl text-xs font-bold text-slate-950 bg-yellow-400 hover:bg-yellow-300 transition flex items-center gap-1.5 shadow-md disabled:opacity-50"
              >
                {isSavingNotes ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                <span>Save Response</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SuggestionTriageWrapper() {
  const searchParams = useSearchParams();
  return <SuggestionTriageContent key={searchParams.toString()} />;
}

export default function SuggestionTriagePage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center p-12 text-slate-400 gap-2 text-xs">
          <Loader2 className="w-4 h-4 animate-spin text-yellow-400" />
          Loading suggestion triage & voting workstation...
        </div>
      }
    >
      <SuggestionTriageWrapper />
    </Suspense>
  );
}