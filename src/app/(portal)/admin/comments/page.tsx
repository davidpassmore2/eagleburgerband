"use client";

import React, { useEffect, useState } from "react";
import { collection, onSnapshot, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/lib/context/AuthContext";
import { canManageContent } from "@/lib/auth/permissions";
import { Comment, CommentSchema } from "@/lib/schema/comment";
import { 
  MessageSquareQuote, 
  ShieldAlert, 
  Pin, 
  Flag, 
  Trash2, 
  CheckCircle2, 
  Calendar,
  ExternalLink,
  Music2,
  Lightbulb,
  CalendarDays,
  Radio
} from "lucide-react";
import Link from "next/link";

export default function CommentsAdminPage() {
  const { profile, loading: authLoading } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [viewTab, setViewTab] = useState<"flagged" | "all">("flagged");
  const [targetFilter, setTargetFilter] = useState<string>("all");

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "comments"), (snap) => {
      const list: Comment[] = [];
      snap.forEach((d) => {
        const parsed = CommentSchema.safeParse({ id: d.id, ...d.data() });
        if (parsed.success) list.push(parsed.data);
      });
      list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      setComments(list);
    });

    return () => unsub();
  }, []);

  if (authLoading) return <div className="p-8 text-slate-400">Verifying access...</div>;
  if (!canManageContent(profile)) {
    return (
      <div className="p-8 text-amber-400 flex items-center gap-3">
        <ShieldAlert className="w-6 h-6 shrink-0" />
        <span>Community Manager or Administrator permissions required.</span>
      </div>
    );
  }

  const handleTogglePin = async (comment: Comment) => {
    await updateDoc(doc(db, "comments", comment.id), {
      isPinned: !comment.isPinned,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleDismissFlag = async (commentId: string) => {
    await updateDoc(doc(db, "comments", commentId), {
      isFlagged: false,
      flagReason: "",
      flaggedByUid: "",
      updatedAt: new Date().toISOString(),
    });
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm("Are you sure you want to permanently delete this comment?")) return;
    await deleteDoc(doc(db, "comments", commentId));
  };

  const flaggedComments = comments.filter((c) => c.isFlagged);
  const baseList = viewTab === "flagged" ? flaggedComments : comments;
  const displayComments = targetFilter === "all"
    ? baseList
    : baseList.filter((c) => c.targetType === targetFilter);

  const getTargetLink = (comment: Comment) => {
    switch (comment.targetType) {
      case "suggestion":
        return "/admin/suggestions";
      case "tune":
        return "/portal/library";
      case "gig":
        return `/portal/gigs/${comment.targetId}`;
      default:
        return null;
    }
  };

  const getTargetBadge = (comment: Comment) => {
    switch (comment.targetType) {
      case "suggestion":
        return (
          <span className="bg-purple-500/10 text-purple-400 border border-purple-500/30 text-[11px] font-mono px-2 py-0.5 rounded flex items-center gap-1 uppercase">
            <Lightbulb className="w-3 h-3" /> Suggestion: {comment.targetTitle || comment.targetId}
          </span>
        );
      case "tune":
        return (
          <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[11px] font-mono px-2 py-0.5 rounded flex items-center gap-1 uppercase">
            <Music2 className="w-3 h-3" /> Tune: {comment.targetTitle || comment.targetId}
          </span>
        );
      case "gig":
        return (
          <span className="bg-amber-400/10 text-amber-400 border border-amber-400/30 text-[11px] font-mono px-2 py-0.5 rounded flex items-center gap-1 uppercase">
            <CalendarDays className="w-3 h-3" /> Gig: {comment.targetTitle || comment.targetId}
          </span>
        );
      default:
        return (
          <span className="bg-slate-950 text-slate-400 border border-slate-800 text-[11px] font-mono px-2 py-0.5 rounded flex items-center gap-1 uppercase">
            <Radio className="w-3 h-3" /> {comment.targetType}: {comment.targetTitle || comment.targetId}
          </span>
        );
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <MessageSquareQuote className="text-yellow-400 w-6 h-6" /> Comment Moderation Studio
          </h1>
          <p className="text-slate-400 text-sm">
            Audit discussions across suggestions, gigs, and repertoire catalog entries, triage flagged content, and manage pinned announcements.
          </p>
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-2 bg-slate-900 p-1 rounded-lg border border-slate-800">
          <button
            onClick={() => setViewTab("flagged")}
            className={`px-3 py-1.5 rounded text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 transition ${
              viewTab === "flagged"
                ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Flag className="w-3.5 h-3.5" /> Flagged Queue ({flaggedComments.length})
          </button>
          <button
            onClick={() => setViewTab("all")}
            className={`px-3 py-1.5 rounded text-xs font-semibold uppercase tracking-wider transition ${
              viewTab === "all"
                ? "bg-yellow-400 text-slate-950 font-bold"
                : "text-slate-400 hover:text-white"
            }`}
          >
            All Activity ({comments.length})
          </button>
        </div>
      </div>

      {/* Target Type Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        <span className="text-slate-500 font-semibold uppercase tracking-wider text-[10px] mr-1">
          Filter By:
        </span>
        {[
          { id: "all", label: "All Types" },
          { id: "suggestion", label: "Suggestions" },
          { id: "tune", label: "Repertoire Tunes" },
          { id: "gig", label: "Gigs" },
          { id: "general_announcement", label: "Announcements" },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setTargetFilter(tab.id)}
            className={`px-3 py-1.5 rounded-lg font-bold transition border ${
              targetFilter === tab.id
                ? "bg-slate-800 text-white border-slate-700 shadow-sm"
                : "bg-slate-900 text-slate-400 border-slate-800 hover:text-white"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {displayComments.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-500 text-sm">
            {viewTab === "flagged"
              ? "All clear! There are no flagged comments awaiting triage."
              : "No comments posted yet for this criteria."}
          </div>
        ) : (
          displayComments.map((comment) => {
            const targetLink = getTargetLink(comment);

            return (
              <div
                key={comment.id}
                className={`bg-slate-900 border rounded-xl p-5 transition flex flex-col md:flex-row justify-between gap-4 ${
                  comment.isFlagged
                    ? "border-rose-500/40 bg-rose-950/10"
                    : comment.isPinned
                    ? "border-yellow-400/40"
                    : "border-slate-800"
                }`}
              >
                <div className="space-y-2.5 flex-1">
                  <div className="flex flex-wrap items-center gap-2.5 text-xs">
                    <span className="font-bold text-white">{comment.authorName}</span>
                    <span className="text-slate-500">•</span>
                    {getTargetBadge(comment)}
                    {targetLink && (
                      <Link
                        href={targetLink}
                        className="text-yellow-400 hover:text-yellow-300 text-[11px] flex items-center gap-0.5 ml-1 transition"
                        title="View item in app"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>View</span>
                      </Link>
                    )}
                    <span className="text-slate-500">•</span>
                    <span className="text-slate-400 flex items-center gap-1 text-[11px]">
                      <Calendar className="w-3 h-3 text-slate-500" />
                      {comment.createdAt.split("T")[0]}
                    </span>

                    {comment.isPinned && (
                      <span className="bg-yellow-400/10 text-yellow-400 border border-yellow-400/30 text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
                        <Pin className="w-3 h-3" /> Pinned
                      </span>
                    )}

                    {comment.isFlagged && (
                      <span className="bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
                        <Flag className="w-3 h-3" /> Flagged: {comment.flagReason || "Requires inspection"}
                      </span>
                    )}
                  </div>

                  <div className="text-xs text-slate-200 leading-relaxed bg-slate-950/70 p-3 rounded-lg border border-slate-800 font-mono whitespace-pre-wrap">
                    {comment.content}
                  </div>
                </div>

                {/* Action Toolbar */}
                <div className="flex md:flex-col justify-end items-end gap-2 shrink-0 border-t md:border-t-0 md:border-l border-slate-800 pt-3 md:pt-0 md:pl-4">
                  {comment.isFlagged && (
                    <button
                      onClick={() => handleDismissFlag(comment.id)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 rounded text-xs font-semibold transition"
                      title="Clear flag and mark safe"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Dismiss Flag
                    </button>
                  )}

                  <button
                    onClick={() => handleTogglePin(comment)}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded text-xs font-semibold transition ${
                      comment.isPinned
                        ? "bg-yellow-400 text-slate-950 font-bold"
                        : "bg-slate-800 hover:bg-slate-700 text-slate-300"
                    }`}
                  >
                    <Pin className="w-3.5 h-3.5" />
                    {comment.isPinned ? "Unpin" : "Pin Notice"}
                  </button>

                  <button
                    onClick={() => handleDeleteComment(comment.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-400 rounded hover:bg-slate-800 transition"
                    title="Permanently remove"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}