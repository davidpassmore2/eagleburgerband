"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/lib/context/AuthContext";
import { canManageContactInbox } from "@/lib/auth/permissions";
import { User } from "@/lib/schema/user";
import {
  GeneralInquiry,
  GeneralInquiryStatus,
} from "@/lib/schema/generalInquiry";
import {
  Mail,
  User as UserIcon,
  Phone,
  CheckCircle2,
  Clock,
  Archive,
  Trash2,
  Search,
  Loader2,
  ShieldAlert,
  MessageSquare,
  ArrowUpRight,
  HelpCircle,
  Newspaper,
  HeartHandshake,
  ShoppingBag,
} from "lucide-react";

export default function ContactInboxAdminStudio() {
  const { profile, loading: authLoading } = useAuth();
  const [messages, setMessages] = useState<GeneralInquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  // Note editing state
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState("");

  useEffect(() => {
    if (authLoading) return;

    const unsub = onSnapshot(
      collection(db, "contact_messages"),
      (snap) => {
        const list: GeneralInquiry[] = [];
        snap.forEach((d) => {
          list.push({ id: d.id, ...d.data() } as GeneralInquiry);
        });
        list.sort((a, b) => {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateB - dateA;
        });
        setMessages(list);
        setLoading(false);
      },
      (err) => {
        console.error("Contact inbox listener error:", err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [authLoading]);

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-400 gap-2 text-xs">
        <Loader2 className="w-4 h-4 animate-spin text-yellow-400" />
        <span>Loading contact inbox...</span>
      </div>
    );
  }

  if (!canManageContactInbox(profile as unknown as User)) {
    return (
      <div className="p-8 text-rose-400 text-xs font-semibold flex items-center gap-2">
        <ShieldAlert className="w-4 h-4" />
        <span>Manager or Admin privileges required to access the general contact inbox.</span>
      </div>
    );
  }

  const handleUpdateStatus = async (id: string, newStatus: GeneralInquiryStatus) => {
    setActionInProgress(id);
    try {
      await updateDoc(doc(db, "contact_messages", id), {
        status: newStatus,
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.error("Error updating message status:", err);
      alert("Failed to update status.");
    } finally {
      setActionInProgress(null);
    }
  };

  const handleSaveNotes = async (id: string) => {
    setActionInProgress(id);
    try {
      await updateDoc(doc(db, "contact_messages", id), {
        internalNotes: noteDraft,
        updatedAt: new Date().toISOString(),
      });
      setEditingNotesId(null);
    } catch (err) {
      console.error("Error saving internal notes:", err);
      alert("Failed to save internal notes.");
    } finally {
      setActionInProgress(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to permanently delete this contact message?")) {
      return;
    }
    setActionInProgress(id);
    try {
      await deleteDoc(doc(db, "contact_messages", id));
    } catch (err) {
      console.error("Error deleting message:", err);
      alert("Failed to delete message.");
    } finally {
      setActionInProgress(null);
    }
  };

  // Metrics
  const totalCount = messages.length;
  const newCount = messages.filter((m) => m.status === "new").length;
  const inProgressCount = messages.filter((m) => m.status === "in_progress").length;
  const resolvedCount = messages.filter((m) => m.status === "resolved").length;

  const filtered = messages.filter((m) => {
    const matchesStatus = statusFilter === "all" || m.status === statusFilter;
    const matchesCategory =
      categoryFilter === "all" || m.category === categoryFilter;
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      m.name.toLowerCase().includes(q) ||
      m.email.toLowerCase().includes(q) ||
      m.subject.toLowerCase().includes(q) ||
      m.message.toLowerCase().includes(q);
    return matchesStatus && matchesCategory && matchesSearch;
  });

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case "press":
        return <Newspaper className="w-3 h-3 text-purple-400" />;
      case "community":
        return <HeartHandshake className="w-3 h-3 text-rose-400" />;
      case "merch":
        return <ShoppingBag className="w-3 h-3 text-emerald-400" />;
      default:
        return <HelpCircle className="w-3 h-3 text-yellow-400" />;
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Studio Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight flex items-center gap-2.5">
            <Mail className="w-6 h-6 text-yellow-400" />
            <span>General Contact Inbox</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Incoming public inquiries, press inquiries, community requests, and general questions.
          </p>
        </div>

        {/* Link to Booking Leads */}
        <Link
          href="/admin/inquiries"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-yellow-400 hover:border-slate-700 text-xs font-semibold transition"
        >
          <span>View Booking Leads</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Total Messages
          </span>
          <span className="text-2xl font-black text-white">{totalCount}</span>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900 border border-amber-500/30">
          <span className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider block">
            New / Unread
          </span>
          <span className="text-2xl font-black text-amber-400">{newCount}</span>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900 border border-blue-500/30">
          <span className="text-[11px] font-semibold text-blue-400 uppercase tracking-wider block">
            In Progress
          </span>
          <span className="text-2xl font-black text-blue-400">{inProgressCount}</span>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900 border border-emerald-500/30">
          <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider block">
            Resolved
          </span>
          <span className="text-2xl font-black text-emerald-400">{resolvedCount}</span>
        </div>
      </div>

      {/* Toolbar & Filters */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-slate-900 p-3 rounded-2xl border border-slate-800">
        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {[
            { id: "all", label: "All" },
            { id: "new", label: `New (${newCount})` },
            { id: "in_progress", label: "In Progress" },
            { id: "resolved", label: "Resolved" },
            { id: "archived", label: "Archived" },
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

        {/* Category & Search Filter */}
        <div className="flex items-center gap-2">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-yellow-400"
          >
            <option value="all">All Categories</option>
            <option value="general">General</option>
            <option value="press">Press & Media</option>
            <option value="community">Community</option>
            <option value="merch">Merchandise</option>
            <option value="other">Other</option>
          </select>

          <div className="relative min-w-[180px]">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search sender, subject..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400"
            />
          </div>
        </div>
      </div>

      {/* Messages List */}
      {filtered.length === 0 ? (
        <div className="p-12 text-center bg-slate-900/40 rounded-2xl border border-slate-800 text-slate-500 text-xs">
          No contact messages found with current filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filtered.map((item) => {
            const isProcessing = actionInProgress === item.id;
            const isEditingNote = editingNotesId === item.id;

            return (
              <div
                key={item.id}
                className={`p-5 rounded-2xl border transition ${
                  item.status === "new"
                    ? "bg-slate-900/90 border-amber-500/40 shadow-sm shadow-amber-500/5"
                    : item.status === "in_progress"
                    ? "bg-slate-900/90 border-blue-500/40"
                    : item.status === "resolved"
                    ? "bg-slate-900/80 border-slate-800"
                    : "bg-slate-900/40 border-slate-800/60 opacity-70"
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5">
                  {/* Left content */}
                  <div className="space-y-3 flex-1">
                    {/* Subject & Category Row */}
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h3 className="text-base font-black text-white uppercase tracking-tight">
                        {item.subject}
                      </h3>

                      <span className="px-2.5 py-0.5 rounded-md bg-slate-800 text-slate-300 font-semibold text-[11px] border border-slate-700 flex items-center gap-1.5 capitalize">
                        {getCategoryIcon(item.category)}
                        <span>{item.category}</span>
                      </span>

                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                          item.status === "new"
                            ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                            : item.status === "in_progress"
                            ? "bg-blue-500/10 text-blue-400 border border-blue-500/30"
                            : item.status === "resolved"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                            : "bg-slate-800 text-slate-400 border border-slate-700"
                        }`}
                      >
                        {item.status.replace(/_/g, " ")}
                      </span>

                      {item.createdAt && (
                        <span className="text-[11px] text-slate-500 font-mono ml-auto">
                          {new Date(item.createdAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>

                    {/* Sender Info Row */}
                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
                      <span className="font-bold text-white flex items-center gap-1.5">
                        <UserIcon className="w-3.5 h-3.5 text-slate-500" />
                        {item.name}
                      </span>
                      <a
                        href={`mailto:${item.email}?subject=Re: ${encodeURIComponent(item.subject)}`}
                        className="flex items-center gap-1.5 hover:text-yellow-400 transition"
                      >
                        <Mail className="w-3.5 h-3.5 text-slate-500" />
                        <span>{item.email}</span>
                      </a>
                      {item.phone && (
                        <a
                          href={`tel:${item.phone}`}
                          className="flex items-center gap-1.5 hover:text-yellow-400 transition"
                        >
                          <Phone className="w-3.5 h-3.5 text-slate-500" />
                          <span>{item.phone}</span>
                        </a>
                      )}
                    </div>

                    {/* Message Body */}
                    <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80 text-xs text-slate-200 leading-relaxed whitespace-pre-wrap">
                      {item.message}
                    </div>

                    {/* Internal Notes */}
                    <div className="pt-1">
                      {isEditingNote ? (
                        <div className="space-y-2 bg-slate-950/90 p-3 rounded-xl border border-slate-800">
                          <label className="block text-[11px] font-bold uppercase tracking-wider text-yellow-400">
                            Internal Response Notes
                          </label>
                          <textarea
                            rows={2}
                            value={noteDraft}
                            onChange={(e) => setNoteDraft(e.target.value)}
                            placeholder="Add notes on who replied, scheduled call, etc..."
                            className="w-full p-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-600 focus:border-yellow-400"
                          />
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setEditingNotesId(null)}
                              className="px-3 py-1 rounded-lg text-slate-400 text-xs hover:text-white"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              disabled={isProcessing}
                              onClick={() => handleSaveNotes(item.id)}
                              className="px-3 py-1 rounded-lg bg-yellow-400 text-slate-950 text-xs font-bold hover:bg-yellow-300"
                            >
                              Save Notes
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between text-xs bg-slate-950/40 px-3 py-2 rounded-xl border border-slate-800/60">
                          <div className="flex items-center gap-2 text-slate-400">
                            <MessageSquare className="w-3.5 h-3.5 text-slate-500" />
                            <span>
                              {item.internalNotes ? (
                                <span className="text-slate-300">{item.internalNotes}</span>
                              ) : (
                                <span className="italic text-slate-600">No internal notes logged</span>
                              )}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingNotesId(item.id);
                              setNoteDraft(item.internalNotes || "");
                            }}
                            className="text-slate-400 hover:text-yellow-400 text-[11px] font-medium transition"
                          >
                            Edit Note
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions Column */}
                  <div className="flex flex-row lg:flex-col items-stretch gap-1.5 shrink-0 border-t lg:border-t-0 lg:border-l border-slate-800 pt-3 lg:pt-0 lg:pl-4 min-w-[160px]">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                      Actions
                    </span>

                    {/* Reply via email */}
                    <a
                      href={`mailto:${item.email}?subject=Re: ${encodeURIComponent(item.subject)}`}
                      className="px-3 py-1.5 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-slate-950 text-xs font-black transition flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <Mail className="w-3.5 h-3.5" />
                      <span>Reply via Email</span>
                    </a>

                    {/* Mark In Progress */}
                    {item.status !== "in_progress" && (
                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={() => handleUpdateStatus(item.id, "in_progress")}
                        className="px-3 py-1.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 text-xs font-bold transition flex items-center justify-center gap-1.5"
                      >
                        <Clock className="w-3.5 h-3.5" />
                        <span>In Progress</span>
                      </button>
                    )}

                    {/* Mark Resolved */}
                    {item.status !== "resolved" && (
                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={() => handleUpdateStatus(item.id, "resolved")}
                        className="px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold transition flex items-center justify-center gap-1.5"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Resolve</span>
                      </button>
                    )}

                    {/* Archive */}
                    {item.status !== "archived" && (
                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={() => handleUpdateStatus(item.id, "archived")}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700 text-xs font-medium transition flex items-center justify-center gap-1.5"
                      >
                        <Archive className="w-3.5 h-3.5" />
                        <span>Archive</span>
                      </button>
                    )}

                    {/* Delete */}
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => handleDelete(item.id)}
                      className="px-3 py-1.5 rounded-xl text-rose-400 hover:bg-rose-500/10 text-xs font-medium transition flex items-center justify-center gap-1.5 mt-2"
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
    </div>
  );
}
