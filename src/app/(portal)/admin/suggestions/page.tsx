"use client";

import React, { useEffect, useState } from "react";
import { collection, onSnapshot, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/lib/context/AuthContext";
import { canManageContent } from "@/lib/auth/permissions";
import { Suggestion, SuggestionSchema } from "@/lib/schema/suggestion";
import { 
  Lightbulb, 
  ShieldAlert, 
  Trash2, 
  Check, 
  ThumbsUp, 
  MessageSquareText, 
  Calendar 
} from "lucide-react";

export default function SuggestionsAdminPage() {
  const { profile, loading: authLoading } = useAuth();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [activeNoteEditId, setActiveNoteEditId] = useState<string | null>(null);
  const [adminNoteInput, setAdminNoteInput] = useState<string>("");

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "suggestions"), (snap) => {
      const list: Suggestion[] = [];
      snap.forEach((d) => {
        const parsed = SuggestionSchema.safeParse(d.data());
        if (parsed.success) list.push(parsed.data);
      });
      list.sort((a, b) => (b.upvoteUids?.length || 0) - (a.upvoteUids?.length || 0));
      setSuggestions(list);
    });

    return () => unsub();
  }, []);

  if (authLoading) return <div className="p-8 text-slate-400">Verifying authorization...</div>;
  if (!canManageContent(profile)) {
    return (
      <div className="p-8 text-amber-400 flex items-center gap-3">
        <ShieldAlert className="w-6 h-6 shrink-0" />
        <span>Community Manager or Administrator clearance required.</span>
      </div>
    );
  }

  const handleUpdateStatus = async (suggestionId: string, status: Suggestion["status"]) => {
    await updateDoc(doc(db, "suggestions", suggestionId), {
      status,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleSaveAdminNote = async (suggestionId: string) => {
    await updateDoc(doc(db, "suggestions", suggestionId), {
      adminNotes: adminNoteInput,
      updatedAt: new Date().toISOString(),
    });
    setActiveNoteEditId(null);
  };

  const handleDelete = async (suggestionId: string) => {
    if (!confirm("Are you sure you want to delete this suggestion?")) return;
    await deleteDoc(doc(db, "suggestions", suggestionId));
  };

  const statusBadges: Record<Suggestion["status"], string> = {
    submitted: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    under_review: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    accepted: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    declined: "bg-rose-500/10 text-rose-400 border-rose-500/20",
    implemented: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  };

  const filteredSuggestions = statusFilter === "all"
    ? suggestions
    : suggestions.filter((s) => s.status === statusFilter);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Lightbulb className="text-yellow-400 w-6 h-6" /> Suggestion Box Triage
          </h1>
          <p className="text-slate-400 text-sm">
            Review member-submitted ideas, gauge section interest via upvotes, and log leadership responses.
          </p>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-wrap items-center gap-1.5">
          {["all", "submitted", "under_review", "accepted", "declined", "implemented"].map((filter) => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={`px-3 py-1 rounded text-xs font-semibold uppercase tracking-wider transition ${
                statusFilter === filter
                  ? "bg-yellow-400 text-slate-950 font-bold"
                  : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              {filter.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {filteredSuggestions.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-500 text-sm">
            No suggestions found matching &ldquo;{statusFilter}&rdquo;.
          </div>
        ) : (
          filteredSuggestions.map((item) => (
            <div
              key={item.id}
              className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition flex flex-col md:flex-row justify-between gap-5"
            >
              <div className="space-y-3 flex-1">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                      statusBadges[item.status]
                    }`}
                  >
                    {item.status.replace("_", " ")}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800 uppercase">
                    {item.category.replace("_", " ")}
                  </span>
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    {item.createdAt.split("T")[0]}
                  </span>
                  <span className="text-xs font-semibold text-yellow-400 flex items-center gap-1 bg-yellow-400/10 px-2 py-0.5 rounded border border-yellow-400/20">
                    <ThumbsUp className="w-3.5 h-3.5" />
                    {item.upvoteUids?.length || 0} Upvotes
                  </span>
                </div>

                <div>
                  <h2 className="text-base font-bold text-white">{item.title}</h2>
                  <div className="text-xs text-slate-400 mt-0.5">
                    Proposed by: <span className="text-slate-200 font-semibold">{item.authorName}</span>
                  </div>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed bg-slate-950 p-3 rounded-lg border border-slate-800/80">
                  {item.description}
                </p>

                {/* Leadership Response Note */}
                <div className="pt-1">
                  {activeNoteEditId === item.id ? (
                    <div className="space-y-2 bg-slate-950 p-3 rounded-lg border border-slate-800">
                      <label className="block text-[11px] font-semibold text-slate-400 uppercase">
                        Leadership Directives / Feedback Note
                      </label>
                      <textarea
                        rows={2}
                        value={adminNoteInput}
                        onChange={(e) => setAdminNoteInput(e.target.value)}
                        placeholder="Add public leadership feedback or timeline note..."
                        className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-xs text-white"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setActiveNoteEditId(null)}
                          className="px-2.5 py-1 text-xs text-slate-400 hover:text-white"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleSaveAdminNote(item.id)}
                          className="flex items-center gap-1 bg-yellow-400 text-slate-950 font-bold px-3 py-1 rounded text-xs"
                        >
                          <Check className="w-3.5 h-3.5" /> Save Note
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-2 text-xs">
                      <div className="text-slate-400 flex items-start gap-1.5">
                        <MessageSquareText className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
                        <span>
                          {item.adminNotes ? (
                            <span className="text-slate-300 font-medium">Leadership: &ldquo;{item.adminNotes}&rdquo;</span>
                          ) : (
                            <span className="italic text-slate-600">No leadership notes attached.</span>
                          )}
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          setActiveNoteEditId(item.id);
                          setAdminNoteInput(item.adminNotes || "");
                        }}
                        className="text-[11px] text-yellow-400 hover:underline shrink-0"
                      >
                        {item.adminNotes ? "Edit Note" : "+ Add Note"}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Status & Deletion Actions */}
              <div className="flex md:flex-col justify-between items-end gap-3 shrink-0 border-t md:border-t-0 md:border-l border-slate-800 pt-3 md:pt-0 md:pl-5">
                <select
                  value={item.status}
                  onChange={(e) => handleUpdateStatus(item.id, e.target.value as Suggestion["status"])}
                  className="bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-xs text-white"
                >
                  <option value="submitted">Submitted</option>
                  <option value="under_review">Under Review</option>
                  <option value="accepted">Accepted</option>
                  <option value="declined">Declined</option>
                  <option value="implemented">Implemented</option>
                </select>

                <button
                  onClick={() => handleDelete(item.id)}
                  className="p-1.5 text-slate-400 hover:text-rose-400 rounded hover:bg-slate-800 transition"
                  title="Delete Suggestion"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}