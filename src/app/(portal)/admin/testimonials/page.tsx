"use client";

import React, { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/lib/context/AuthContext";
import { canManageTestimonials } from "@/lib/auth/permissions";
import { User } from "@/lib/schema/user";
import {
  Testimonial,
  TestimonialStatus,
} from "@/lib/schema/testimonial";
import {
  Star,
  Quote,
  CheckCircle2,
  XCircle,
  Sparkles,
  Trash2,
  Edit2,
  Search,
  Loader2,
  ShieldAlert,
  Mail,
  User as UserIcon,
  X,
  Save,
} from "lucide-react";

export default function TestimonialsAdminStudio() {
  const { profile, loading: authLoading } = useAuth();
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [editingItem, setEditingItem] = useState<Testimonial | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;

    const unsub = onSnapshot(
      collection(db, "testimonials"),
      (snap) => {
        const list: Testimonial[] = [];
        snap.forEach((d) => {
          list.push({ id: d.id, ...d.data() } as Testimonial);
        });
        list.sort((a, b) => {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateB - dateA;
        });
        setTestimonials(list);
        setLoading(false);
      },
      (err) => {
        console.error("Admin testimonials listener error:", err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [authLoading]);

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-400 gap-2 text-xs">
        <Loader2 className="w-4 h-4 animate-spin text-yellow-400" />
        <span>Loading testimonials studio...</span>
      </div>
    );
  }

  if (!canManageTestimonials(profile as unknown as User)) {
    return (
      <div className="p-8 text-rose-400 text-xs font-semibold flex items-center gap-2">
        <ShieldAlert className="w-4 h-4" />
        <span>Web Manager or Admin privileges required to manage testimonials.</span>
      </div>
    );
  }

  const handleUpdateStatus = async (id: string, newStatus: TestimonialStatus) => {
    setActionInProgress(id);
    try {
      await updateDoc(doc(db, "testimonials", id), {
        status: newStatus,
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.error("Error updating testimonial status:", err);
      alert("Failed to update status. Please try again.");
    } finally {
      setActionInProgress(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to permanently delete this testimonial?")) {
      return;
    }
    setActionInProgress(id);
    try {
      await deleteDoc(doc(db, "testimonials", id));
    } catch (err) {
      console.error("Error deleting testimonial:", err);
      alert("Failed to delete testimonial.");
    } finally {
      setActionInProgress(null);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    setIsSaving(true);
    try {
      await updateDoc(doc(db, "testimonials", editingItem.id), {
        authorName: editingItem.authorName,
        roleOrEvent: editingItem.roleOrEvent || "",
        organization: editingItem.organization || "",
        quote: editingItem.quote,
        rating: Number(editingItem.rating),
        tag: editingItem.tag || "Community Event",
        notes: editingItem.notes || "",
        updatedAt: new Date().toISOString(),
      });
      setEditingItem(null);
    } catch (err) {
      console.error("Error saving testimonial edits:", err);
      alert("Failed to save changes.");
    } finally {
      setIsSaving(false);
    }
  };

  // Metrics
  const totalCount = testimonials.length;
  const pendingCount = testimonials.filter((t) => t.status === "pending").length;
  const approvedCount = testimonials.filter((t) => t.status === "approved").length;
  const featuredCount = testimonials.filter((t) => t.status === "featured").length;

  const filtered = testimonials.filter((t) => {
    const matchesStatus = statusFilter === "all" || t.status === statusFilter;
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      t.authorName.toLowerCase().includes(q) ||
      t.quote.toLowerCase().includes(q) ||
      (t.organization && t.organization.toLowerCase().includes(q)) ||
      (t.roleOrEvent && t.roleOrEvent.toLowerCase().includes(q));
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Studio Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight flex items-center gap-2.5">
            <Quote className="w-6 h-6 text-yellow-400" />
            <span>Testimonial & Reviews Studio</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Review public review submissions, approve community testimonials, and feature top quotes.
          </p>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Total Reviews
          </span>
          <span className="text-2xl font-black text-white">{totalCount}</span>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900 border border-amber-500/30">
          <span className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider block">
            Pending Review
          </span>
          <span className="text-2xl font-black text-amber-400">{pendingCount}</span>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900 border border-emerald-500/30">
          <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider block">
            Approved & Live
          </span>
          <span className="text-2xl font-black text-emerald-400">{approvedCount}</span>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900 border border-yellow-500/30">
          <span className="text-[11px] font-semibold text-yellow-400 uppercase tracking-wider block">
            Featured Highlights
          </span>
          <span className="text-2xl font-black text-yellow-400">{featuredCount}</span>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900 p-3 rounded-2xl border border-slate-800">
        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: "all", label: "All" },
            { id: "pending", label: `Pending (${pendingCount})` },
            { id: "approved", label: "Approved" },
            { id: "featured", label: "Featured" },
            { id: "rejected", label: "Rejected" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                statusFilter === tab.id
                  ? "bg-yellow-400 text-slate-950 font-bold shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative min-w-[220px]">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search author, quote, event..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400"
          />
        </div>
      </div>

      {/* Reviews List */}
      {filtered.length === 0 ? (
        <div className="p-12 text-center bg-slate-900/40 rounded-2xl border border-slate-800 text-slate-500 text-xs">
          No testimonials match the selected filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filtered.map((item) => {
            const isProcessing = actionInProgress === item.id;
            return (
              <div
                key={item.id}
                className={`p-5 rounded-2xl border transition ${
                  item.status === "pending"
                    ? "bg-slate-900/90 border-amber-500/40 shadow-sm shadow-amber-500/5"
                    : item.status === "featured"
                    ? "bg-slate-900/90 border-yellow-400/40"
                    : item.status === "approved"
                    ? "bg-slate-900/70 border-slate-800"
                    : "bg-slate-900/40 border-slate-800/60 opacity-70"
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  {/* Content Column */}
                  <div className="space-y-2 flex-1">
                    {/* Stars and Badges */}
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex items-center gap-0.5 text-yellow-400">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`w-3.5 h-3.5 ${
                              i < (item.rating || 5)
                                ? "fill-yellow-400 text-yellow-400"
                                : "text-slate-700"
                            }`}
                          />
                        ))}
                      </div>

                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                          item.status === "pending"
                            ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                            : item.status === "approved"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                            : item.status === "featured"
                            ? "bg-yellow-400/10 text-yellow-400 border border-yellow-400/30"
                            : "bg-rose-500/10 text-rose-400 border border-rose-500/30"
                        }`}
                      >
                        {item.status}
                      </span>

                      {item.tag && (
                        <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 text-[10px] font-medium border border-slate-700">
                          {item.tag}
                        </span>
                      )}

                      {item.createdAt && (
                        <span className="text-[10px] text-slate-500 font-mono">
                          {new Date(item.createdAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>

                    {/* Quote */}
                    <p className="text-slate-200 text-sm italic leading-relaxed">
                      &ldquo;{item.quote}&rdquo;
                    </p>

                    {/* Author Attribution */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400 pt-1">
                      <span className="font-bold text-white flex items-center gap-1.5">
                        <UserIcon className="w-3.5 h-3.5 text-slate-500" />
                        {item.authorName}
                      </span>
                      {(item.roleOrEvent || item.organization) && (
                        <span>
                          {[item.roleOrEvent, item.organization].filter(Boolean).join(" • ")}
                        </span>
                      )}
                      {item.email && (
                        <span className="text-slate-500 flex items-center gap-1 font-mono text-[11px]">
                          <Mail className="w-3 h-3" />
                          {item.email}
                        </span>
                      )}
                    </div>

                    {/* Internal Notes */}
                    {item.notes && (
                      <div className="pt-2 text-[11px] text-slate-400 bg-slate-950/60 px-3 py-1.5 rounded-lg border border-slate-800">
                        <span className="text-yellow-400/80 font-semibold uppercase tracking-wider mr-1">
                          Admin Note:
                        </span>
                        {item.notes}
                      </div>
                    )}
                  </div>

                  {/* Quick Action Buttons */}
                  <div className="flex items-center md:flex-col gap-1.5 shrink-0 border-t md:border-t-0 md:border-l border-slate-800 pt-3 md:pt-0 md:pl-4">
                    {/* Approve */}
                    {item.status !== "approved" && (
                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={() => handleUpdateStatus(item.id, "approved")}
                        className="px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[11px] font-bold flex items-center gap-1.5 transition disabled:opacity-50"
                        title="Approve and make visible on public website"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Approve</span>
                      </button>
                    )}

                    {/* Feature */}
                    {item.status !== "featured" && (
                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={() => handleUpdateStatus(item.id, "featured")}
                        className="px-3 py-1.5 rounded-xl bg-yellow-400/10 hover:bg-yellow-400/20 text-yellow-400 border border-yellow-400/30 text-[11px] font-bold flex items-center gap-1.5 transition disabled:opacity-50"
                        title="Feature review at the top of the gallery"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Feature</span>
                      </button>
                    )}

                    {/* Reject */}
                    {item.status !== "rejected" && (
                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={() => handleUpdateStatus(item.id, "rejected")}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700 text-[11px] font-medium flex items-center gap-1.5 transition disabled:opacity-50"
                        title="Reject / unpublish review"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Reject</span>
                      </button>
                    )}

                    {/* Edit */}
                    <button
                      type="button"
                      onClick={() => setEditingItem(item)}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[11px] font-medium flex items-center gap-1.5 transition"
                    >
                      <Edit2 className="w-3 h-3" />
                      <span>Edit</span>
                    </button>

                    {/* Delete */}
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => handleDelete(item.id)}
                      className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[11px] font-medium flex items-center gap-1.5 transition disabled:opacity-50"
                      title="Permanently remove"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Testimonial Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-white uppercase tracking-tight">
                Edit Testimonial
              </h3>
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="block font-semibold text-slate-300">Author Name</label>
                <input
                  type="text"
                  required
                  value={editingItem.authorName}
                  onChange={(e) =>
                    setEditingItem((prev) => prev ? { ...prev, authorName: e.target.value } : null)
                  }
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:border-yellow-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block font-semibold text-slate-300">Role / Context</label>
                  <input
                    type="text"
                    value={editingItem.roleOrEvent || ""}
                    onChange={(e) =>
                      setEditingItem((prev) => prev ? { ...prev, roleOrEvent: e.target.value } : null)
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block font-semibold text-slate-300">Organization</label>
                  <input
                    type="text"
                    value={editingItem.organization || ""}
                    onChange={(e) =>
                      setEditingItem((prev) => prev ? { ...prev, organization: e.target.value } : null)
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block font-semibold text-slate-300">Rating (1-5)</label>
                  <select
                    value={editingItem.rating}
                    onChange={(e) =>
                      setEditingItem((prev) => prev ? { ...prev, rating: Number(e.target.value) } : null)
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                  >
                    {[5, 4, 3, 2, 1].map((r) => (
                      <option key={r} value={r}>
                        {r} Stars
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="block font-semibold text-slate-300">Tag</label>
                  <select
                    value={editingItem.tag}
                    onChange={(e) =>
                      setEditingItem((prev) => prev ? { ...prev, tag: e.target.value } : null)
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                  >
                    <option value="Community Event">Community Event</option>
                    <option value="Parade">Parade</option>
                    <option value="Festival">Festival</option>
                    <option value="Wedding">Wedding</option>
                    <option value="Private Event">Private Event</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block font-semibold text-slate-300">Quote</label>
                <textarea
                  rows={4}
                  required
                  value={editingItem.quote}
                  onChange={(e) =>
                    setEditingItem((prev) => prev ? { ...prev, quote: e.target.value } : null)
                  }
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="block font-semibold text-slate-300">Internal Admin Note</label>
                <input
                  type="text"
                  placeholder="e.g. Verified by coordinator on parade day"
                  value={editingItem.notes || ""}
                  onChange={(e) =>
                    setEditingItem((prev) => prev ? { ...prev, notes: e.target.value } : null)
                  }
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-black flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>Save Changes</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
