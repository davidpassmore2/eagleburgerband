"use client";

import React, { useEffect, useState, useRef } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/lib/context/AuthContext";
import { canManageContent, isAdmin } from "@/lib/auth/permissions";
import { Comment, CommentSchema, CommentTargetTypeEnum } from "@/lib/schema/comment";
import DOMPurify from "dompurify";
import {
  MessageSquare,
  Send,
  Pin,
  Flag,
  Trash2,
  AlertCircle,
  Loader2,
  X,
  Clock,
  Shield,
} from "lucide-react";
import { z } from "zod";

type TargetType = z.infer<typeof CommentTargetTypeEnum>;

interface CommentsStreamProps {
  targetType: TargetType;
  targetId: string;
  targetTitle: string;
  compact?: boolean;
  onCommentCountChange?: (count: number) => void;
}

export default function CommentsStream({
  targetType,
  targetId,
  targetTitle,
  compact = false,
  onCommentCountChange,
}: CommentsStreamProps) {
  const { profile, firebaseUser } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newContent, setNewContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Flag modal state
  const [flaggingComment, setFlaggingComment] = useState<Comment | null>(null);
  const [flagReason, setFlagReason] = useState("Inappropriate or offensive");
  const [customReason, setCustomReason] = useState("");
  const [isFlagSubmitting, setIsFlagSubmitting] = useState(false);

  const commentsEndRef = useRef<HTMLDivElement | null>(null);

  const currentUid = firebaseUser?.uid || profile?.uid || "";
  const currentDisplayName =
    profile?.displayName || firebaseUser?.displayName || profile?.email || "Band Member";

  const isModerator = profile ? canManageContent(profile) || isAdmin(profile) : false;

  useEffect(() => {
    if (!targetId) return;

    const q = query(
      collection(db, "comments"),
      where("targetType", "==", targetType),
      where("targetId", "==", targetId)
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const list: Comment[] = [];
        snap.forEach((d) => {
          const parsed = CommentSchema.safeParse({ id: d.id, ...d.data() });
          if (parsed.success) {
            list.push(parsed.data);
          }
        });

        // Sort: Pinned first, then chronological (oldest to newest stream)
        list.sort((a, b) => {
          if (a.isPinned && !b.isPinned) return -1;
          if (!a.isPinned && b.isPinned) return 1;
          return a.createdAt.localeCompare(b.createdAt);
        });

        setComments(list);
        setLoading(false);
        if (onCommentCountChange) {
          onCommentCountChange(list.length);
        }
      },
      (err) => {
        console.error("Failed to load comments stream:", err);
        setError("Failed to load discussion stream.");
        setLoading(false);
      }
    );

    return () => unsub();
  }, [targetType, targetId, onCommentCountChange]);

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim() || !currentUid) return;

    setError(null);
    setIsSubmitting(true);

    try {
      const sanitized = DOMPurify.sanitize(newContent.trim(), {
        ALLOWED_TAGS: [],
        ALLOWED_ATTR: [],
      });

      if (!sanitized) {
        setError("Comment cannot be empty.");
        setIsSubmitting(false);
        return;
      }

      const commentDocRef = doc(collection(db, "comments"));
      const newComment: Comment = {
        id: commentDocRef.id,
        targetType,
        targetId,
        targetTitle: targetTitle || targetId,
        authorUid: currentUid,
        authorName: currentDisplayName,
        content: sanitized,
        isPinned: false,
        isFlagged: false,
        flagReason: "",
        flaggedByUid: "",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await setDoc(commentDocRef, newComment);
      setNewContent("");

      // Scroll to bottom of stream
      setTimeout(() => {
        commentsEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } catch (err: unknown) {
      console.error("Failed to post comment:", err);
      setError("Unable to post comment. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTogglePin = async (comment: Comment) => {
    if (!isModerator) return;
    try {
      await updateDoc(doc(db, "comments", comment.id), {
        isPinned: !comment.isPinned,
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.error("Failed to toggle pin:", err);
    }
  };

  const handleDeleteComment = async (comment: Comment) => {
    const canDelete = comment.authorUid === currentUid || isModerator;
    if (!canDelete) return;

    if (!confirm("Are you sure you want to remove this comment?")) return;

    try {
      await deleteDoc(doc(db, "comments", comment.id));
    } catch (err) {
      console.error("Failed to delete comment:", err);
    }
  };

  const handleOpenFlagModal = (comment: Comment) => {
    setFlaggingComment(comment);
    setFlagReason("Inappropriate or offensive");
    setCustomReason("");
  };

  const handleConfirmFlag = async () => {
    if (!flaggingComment || !currentUid) return;
    setIsFlagSubmitting(true);

    try {
      const finalReason =
        flagReason === "Other"
          ? customReason.trim() || "Reported by member"
          : flagReason;

      await updateDoc(doc(db, "comments", flaggingComment.id), {
        isFlagged: true,
        flagReason: DOMPurify.sanitize(finalReason, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] }),
        flaggedByUid: currentUid,
        updatedAt: new Date().toISOString(),
      });

      setFlaggingComment(null);
    } catch (err) {
      console.error("Failed to report comment:", err);
      alert("Unable to report comment right now.");
    } finally {
      setIsFlagSubmitting(false);
    }
  };

  const formatTimestamp = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffMins < 1) return "just now";
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      return date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
    } catch {
      return isoString.split("T")[0];
    }
  };

  return (
    <div className={`space-y-3 ${compact ? "text-xs" : "text-sm"}`}>
      {/* Stream Header */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2 text-slate-300 font-semibold">
          <MessageSquare className="w-4 h-4 text-yellow-400 shrink-0" />
          <span>Discussion Stream</span>
          <span className="text-slate-500 font-mono text-[11px] bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
            {comments.length}
          </span>
        </div>
        {isModerator && (
          <span className="text-[10px] text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 px-2 py-0.5 rounded flex items-center gap-1 font-mono">
            <Shield className="w-3 h-3" /> Mod Controls Active
          </span>
        )}
      </div>

      {error && (
        <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Comments List Container */}
      <div
        className={`overflow-y-auto space-y-2.5 pr-1 ${
          compact ? "max-h-64" : "max-h-96"
        } scrollbar-thin scrollbar-thumb-slate-800`}
      >
        {loading ? (
          <div className="flex items-center justify-center p-6 text-slate-500 text-xs gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-yellow-400" />
            Loading discussion...
          </div>
        ) : comments.length === 0 ? (
          <div className="p-5 text-center text-slate-500 text-xs bg-slate-950/40 rounded-xl border border-slate-800/80">
            No comments yet. Start the conversation!
          </div>
        ) : (
          comments.map((comment) => {
            const isAuthor = comment.authorUid === currentUid;
            const canDelete = isAuthor || isModerator;

            return (
              <div
                key={comment.id}
                className={`rounded-xl p-3 transition border ${
                  comment.isPinned
                    ? "bg-yellow-400/5 border-yellow-400/30 shadow-sm"
                    : comment.isFlagged
                    ? "bg-rose-950/20 border-rose-500/30"
                    : "bg-slate-950/70 border-slate-800 hover:border-slate-700/80"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center flex-wrap gap-1.5 text-xs">
                    <span
                      className={`font-bold ${
                        isAuthor ? "text-yellow-400" : "text-white"
                      }`}
                    >
                      {comment.authorName}
                    </span>
                    {isAuthor && (
                      <span className="text-[10px] text-yellow-400/80 bg-yellow-400/10 px-1.5 py-0.2 rounded font-mono">
                        You
                      </span>
                    )}
                    <span className="text-slate-600">•</span>
                    <span className="text-slate-500 text-[11px] flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5 text-slate-600" />
                      {formatTimestamp(comment.createdAt)}
                    </span>

                    {comment.isPinned && (
                      <span className="text-[10px] font-bold text-yellow-400 bg-yellow-400/15 border border-yellow-400/30 px-1.5 py-0.2 rounded flex items-center gap-1 ml-1">
                        <Pin className="w-2.5 h-2.5" /> Pinned
                      </span>
                    )}

                    {comment.isFlagged && (
                      <span className="text-[10px] font-bold text-rose-400 bg-rose-500/10 border border-rose-500/30 px-1.5 py-0.2 rounded flex items-center gap-1 ml-1">
                        <Flag className="w-2.5 h-2.5" /> Reported
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    {/* Pin Action for Moderators */}
                    {isModerator && (
                      <button
                        type="button"
                        onClick={() => handleTogglePin(comment)}
                        className={`p-1 rounded hover:bg-slate-800 transition ${
                          comment.isPinned
                            ? "text-yellow-400"
                            : "text-slate-500 hover:text-slate-300"
                        }`}
                        title={comment.isPinned ? "Unpin notice" : "Pin notice"}
                      >
                        <Pin className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {/* Report / Flag button for non-authors or all */}
                    {!isAuthor && !comment.isFlagged && (
                      <button
                        type="button"
                        onClick={() => handleOpenFlagModal(comment)}
                        className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition"
                        title="Report inappropriate content"
                      >
                        <Flag className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {/* Delete action */}
                    {canDelete && (
                      <button
                        type="button"
                        onClick={() => handleDeleteComment(comment)}
                        className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition"
                        title="Delete comment"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="mt-1.5 text-slate-300 text-xs leading-relaxed break-words whitespace-pre-wrap">
                  {comment.content}
                </div>
              </div>
            );
          })
        )}
        <div ref={commentsEndRef} />
      </div>

      {/* Input Box */}
      <form onSubmit={handleAddComment} className="pt-2 border-t border-slate-800/80">
        <div className="flex gap-2">
          <input
            type="text"
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            placeholder="Add to discussion..."
            disabled={isSubmitting || !currentUid}
            className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400 disabled:opacity-50 transition"
          />
          <button
            type="submit"
            disabled={isSubmitting || !newContent.trim() || !currentUid}
            className="bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 transition disabled:opacity-50 shrink-0"
          >
            {isSubmitting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            <span className="hidden sm:inline">Post</span>
          </button>
        </div>
      </form>

      {/* Flag / Report Modal */}
      {flaggingComment && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Flag className="w-4 h-4 text-rose-400" /> Report Comment
              </h3>
              <button
                type="button"
                onClick={() => setFlaggingComment(null)}
                className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-slate-300 bg-slate-950 p-3 rounded-lg border border-slate-800 italic">
              &quot;{flaggingComment.content}&quot;
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300">
                Why are you reporting this comment?
              </label>
              <select
                value={flagReason}
                onChange={(e) => setFlagReason(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-400"
              >
                <option value="Inappropriate or offensive">Inappropriate or offensive</option>
                <option value="Harassment or personal attack">Harassment or personal attack</option>
                <option value="Spam or off-topic advertising">Spam or off-topic advertising</option>
                <option value="Misinformation regarding rehearsal/gig">Misinformation regarding rehearsal/gig</option>
                <option value="Other">Other reason</option>
              </select>

              {flagReason === "Other" && (
                <input
                  type="text"
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  placeholder="Describe why this should be moderated..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-400 mt-2"
                />
              )}
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              This comment will be flagged and routed to the <strong>Comment Moderation Studio</strong> for review by community managers and band leadership.
            </p>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setFlaggingComment(null)}
                disabled={isFlagSubmitting}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmFlag}
                disabled={isFlagSubmitting}
                className="bg-rose-600 hover:bg-rose-500 text-white font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 transition"
              >
                {isFlagSubmitting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Flag className="w-3.5 h-3.5" />
                )}
                Submit Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

