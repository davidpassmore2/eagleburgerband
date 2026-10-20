"use client";

import React, { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  setDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/lib/context/AuthContext";
import { canManageAuditions } from "@/lib/auth/permissions";
import { User } from "@/lib/schema/user";
import {
  Audition,
  AuditionStatus,
} from "@/lib/schema/audition";
import { InviteSchema } from "@/lib/schema/invite";
import { authedFetch } from "@/lib/firebase/authedFetch";
import { toast } from "@/lib/context/ToastContext";
import PortalBreadcrumb from "@/components/portal/PortalBreadcrumb";
import {
  UserPlus,
  Music,
  Mail,
  Phone,
  Calendar,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Clock,
  Trash2,
  Search,
  Loader2,
  ShieldAlert,
  MessageSquare,
  Award,
  Copy,
  Send,
} from "lucide-react";

interface SectionOption {
  id: string;
  name: string;
}

const DEFAULT_SECTIONS: SectionOption[] = [
  { id: "percussion", name: "Drumline & Percussion" },
  { id: "sousaphones", name: "Sousaphones & Tubas" },
  { id: "trombones", name: "Trombones" },
  { id: "trumpets", name: "Trumpets" },
  { id: "saxophones", name: "Saxophones & Woodwinds" },
  { id: "auxiliary", name: "Auxiliary & Visuals" },
];

export default function AuditionsAdminStudio() {
  const { profile, loading: authLoading } = useAuth();
  const [auditions, setAuditions] = useState<Audition[]>([]);
  const [sections, setSections] = useState<SectionOption[]>(DEFAULT_SECTIONS);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sectionFilter, setSectionFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  // Note editing state
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState("");

  useEffect(() => {
    if (authLoading) return;

    const unsubAuditions = onSnapshot(
      collection(db, "auditions"),
      (snap) => {
        const list: Audition[] = [];
        snap.forEach((d) => {
          list.push({ id: d.id, ...d.data() } as Audition);
        });
        list.sort((a, b) => {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateB - dateA;
        });
        setAuditions(list);
        setLoading(false);
      },
      (err) => {
        console.error("Auditions studio listener error:", err);
        setLoading(false);
      }
    );

    const unsubSections = onSnapshot(
      collection(db, "sections"),
      (snap) => {
        if (!snap.empty) {
          const list: SectionOption[] = [];
          snap.forEach((d) => {
            const data = d.data();
            list.push({ id: d.id, name: data.name || d.id });
          });
          if (list.length > 0) setSections(list);
        }
      },
      (err) => console.warn("Could not load sections in auditions studio:", err)
    );

    return () => {
      unsubAuditions();
      unsubSections();
    };
  }, [authLoading]);

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-400 gap-2 text-xs">
        <Loader2 className="w-4 h-4 animate-spin text-yellow-400" />
        <span>Loading auditions & musician applications...</span>
      </div>
    );
  }

  if (!canManageAuditions(profile as unknown as User)) {
    return (
      <div className="p-8 text-rose-400 text-xs font-semibold flex items-center gap-2">
        <ShieldAlert className="w-4 h-4" />
        <span>Section Leader or Admin privileges required to review audition applications.</span>
      </div>
    );
  }

  const handleAcceptApplication = async (item: Audition) => {
    setActionInProgress(item.id);
    try {
      // 1. Generate unique onboarding invite token
      const token =
        item.inviteToken ||
        `inv_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      const claimUrl = `${window.location.origin}/claim?token=${token}`;

      // 2. Prepare instruments array
      const instruments = [
        item.primaryInstrument,
        item.secondaryInstruments,
      ]
        .map((i) => i?.trim())
        .filter(Boolean) as string[];

      // 3. Resolve section name
      const sectionName =
        sections.find((s) => s.id === item.targetSectionId)?.name ||
        item.targetSectionId ||
        "General Roster";

      // 4. Create or ensure invite document in Firestore invites collection
      const invitePayload = {
        token,
        email: item.email.trim().toLowerCase(),
        displayName: item.name.trim(),
        sectionId: item.targetSectionId || null,
        instruments,
        notes: `Accepted from audition application (${item.primaryInstrument})`,
        roles: ["member" as const],
        status: "pending" as const,
        createdAt: new Date().toISOString(),
      };
      const validatedInvite = InviteSchema.parse(invitePayload);
      await setDoc(doc(db, "invites", token), validatedInvite, { merge: true });

      // 5. Dispatch onboarding invitation email via /api/email/invite
      let emailDispatched = false;
      try {
        const res = await authedFetch("/api/email/invite", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token,
            recipientEmail: item.email.trim().toLowerCase(),
            musicianName: item.name.trim(),
            sectionName,
            instruments,
            notes: "Welcome to the Eagleburger Band! Your audition application has been accepted. Complete onboarding to claim your Musician Portal account.",
            sectionId: item.targetSectionId || null,
          }),
        });
        const data = await res.json();
        if (res.ok) {
          emailDispatched = true;
        } else {
          console.warn("Could not dispatch invite email automatically:", data.error);
        }
      } catch (emailErr) {
        console.warn("Invite email dispatch error:", emailErr);
      }

      // 6. Update audition record
      const nowIso = new Date().toISOString();
      await updateDoc(doc(db, "auditions", item.id), {
        status: "accepted",
        inviteToken: token,
        onboardingUrl: claimUrl,
        inviteSentAt: emailDispatched ? nowIso : (item.inviteSentAt || nowIso),
        updatedAt: nowIso,
      });

      toast.success(
        emailDispatched
          ? `Audition accepted! Onboarding invitation email sent to ${item.email}.`
          : `Audition accepted and onboarding link generated!`
      );
    } catch (err) {
      console.error("Error accepting application:", err);
      toast.error("Failed to accept application: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setActionInProgress(null);
    }
  };

  const handleCopyOnboardingLink = (item: Audition) => {
    const token = item.inviteToken;
    if (!token) return;
    const link = item.onboardingUrl || `${window.location.origin}/claim?token=${token}`;
    navigator.clipboard.writeText(link);
    toast.success(`Onboarding link for ${item.name} copied to clipboard!`);
  };

  const handleResendInviteEmail = async (item: Audition) => {
    if (!item.inviteToken) {
      await handleAcceptApplication(item);
      return;
    }
    setActionInProgress(item.id);
    try {
      const sectionName =
        sections.find((s) => s.id === item.targetSectionId)?.name ||
        item.targetSectionId ||
        "General Roster";
      const instruments = [item.primaryInstrument, item.secondaryInstruments]
        .map((i) => i?.trim())
        .filter(Boolean) as string[];

      const res = await authedFetch("/api/email/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: item.inviteToken,
          recipientEmail: item.email.trim().toLowerCase(),
          musicianName: item.name.trim(),
          sectionName,
          instruments,
          notes: "Reminder: Complete your onboarding to claim your Musician Portal account.",
          sectionId: item.targetSectionId || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to resend invitation email");

      const nowIso = new Date().toISOString();
      await updateDoc(doc(db, "auditions", item.id), {
        inviteSentAt: nowIso,
        updatedAt: nowIso,
      });

      toast.success(`Onboarding invitation email resent to ${item.email}!`);
    } catch (err) {
      console.error("Resend invite error:", err);
      toast.error("Failed to resend invite: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setActionInProgress(null);
    }
  };

  const handleUpdateStatus = async (item: Audition, newStatus: AuditionStatus) => {
    if (newStatus === "accepted") {
      await handleAcceptApplication(item);
      return;
    }
    setActionInProgress(item.id);
    try {
      await updateDoc(doc(db, "auditions", item.id), {
        status: newStatus,
        updatedAt: new Date().toISOString(),
      });
      toast.success(`Audition status updated to ${newStatus}.`);
    } catch (err) {
      console.error("Error updating audition status:", err);
      toast.error("Failed to update status.");
    } finally {
      setActionInProgress(null);
    }
  };

  const handleSaveNotes = async (id: string) => {
    setActionInProgress(id);
    try {
      await updateDoc(doc(db, "auditions", id), {
        reviewerNotes: noteDraft,
        updatedAt: new Date().toISOString(),
      });
      toast.success("Reviewer notes saved.");
      setEditingNotesId(null);
    } catch (err) {
      console.error("Error saving reviewer notes:", err);
      toast.error("Failed to save reviewer notes.");
    } finally {
      setActionInProgress(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this audition record?")) {
      return;
    }
    setActionInProgress(id);
    try {
      await deleteDoc(doc(db, "auditions", id));
      toast.success("Audition record deleted.");
    } catch (err) {
      console.error("Error deleting audition:", err);
      toast.error("Failed to delete record.");
    } finally {
      setActionInProgress(null);
    }
  };

  // Metrics
  const totalCount = auditions.length;
  const newCount = auditions.filter((a) => a.status === "new").length;
  const invitedCount = auditions.filter((a) => a.status === "invited_to_rehearsal").length;
  const acceptedCount = auditions.filter((a) => a.status === "accepted").length;

  const filtered = auditions.filter((a) => {
    const matchesStatus = statusFilter === "all" || a.status === statusFilter;
    const matchesSection =
      sectionFilter === "all" ||
      a.targetSectionId?.toLowerCase() === sectionFilter.toLowerCase();
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      a.name.toLowerCase().includes(q) ||
      a.email.toLowerCase().includes(q) ||
      a.primaryInstrument.toLowerCase().includes(q) ||
      (a.secondaryInstruments && a.secondaryInstruments.toLowerCase().includes(q)) ||
      (a.bioNotes && a.bioNotes.toLowerCase().includes(q));
    return matchesStatus && matchesSection && matchesSearch;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <PortalBreadcrumb className="mb-2" />
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight flex items-center gap-2.5">
          <UserPlus className="w-6 h-6 text-yellow-400" />
          <span>Musician Applications & Auditions</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Review prospective brass and percussion applicant profiles, invite musicians to rehearsals, and manage section recruitment.
        </p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Total Applications
          </span>
          <span className="text-2xl font-black text-white">{totalCount}</span>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900 border border-amber-500/30">
          <span className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider block">
            New Submissions
          </span>
          <span className="text-2xl font-black text-amber-400">{newCount}</span>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900 border border-yellow-500/30">
          <span className="text-[11px] font-semibold text-yellow-400 uppercase tracking-wider block">
            Invited to Rehearsal
          </span>
          <span className="text-2xl font-black text-yellow-400">{invitedCount}</span>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900 border border-emerald-500/30">
          <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider block">
            Accepted to Roster
          </span>
          <span className="text-2xl font-black text-emerald-400">{acceptedCount}</span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-slate-900 p-3 rounded-2xl border border-slate-800">
        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {[
            { id: "all", label: "All" },
            { id: "new", label: `New (${newCount})` },
            { id: "under_review", label: "Under Review" },
            { id: "invited_to_rehearsal", label: "Invited" },
            { id: "accepted", label: "Accepted" },
            { id: "declined", label: "Declined" },
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

        {/* Section & Search Filters */}
        <div className="flex items-center gap-2">
          <select
            value={sectionFilter}
            onChange={(e) => setSectionFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-yellow-400"
          >
            <option value="all">All Sections</option>
            {sections.map((sec) => (
              <option key={sec.id} value={sec.id}>
                {sec.name}
              </option>
            ))}
          </select>

          <div className="relative min-w-[180px]">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search applicant..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400"
            />
          </div>
        </div>
      </div>

      {/* Applications List */}
      {filtered.length === 0 ? (
        <div className="p-12 text-center bg-slate-900/40 rounded-2xl border border-slate-800 text-slate-500 text-xs">
          No audition applications match your current filters.
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
                    : item.status === "invited_to_rehearsal"
                    ? "bg-slate-900/90 border-yellow-400/40"
                    : item.status === "accepted"
                    ? "bg-slate-900/80 border-emerald-500/40"
                    : "bg-slate-900/60 border-slate-800"
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5">
                  {/* Left info column */}
                  <div className="space-y-3 flex-1">
                    {/* Header line: Name, Instrument, Status */}
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h3 className="text-base font-black text-white uppercase tracking-tight">
                        {item.name}
                      </h3>

                      <span className="px-2.5 py-0.5 rounded-md bg-yellow-400/10 text-yellow-400 font-bold text-xs border border-yellow-400/30 flex items-center gap-1">
                        <Music className="w-3 h-3" />
                        {item.primaryInstrument}
                      </span>

                      {item.targetSectionId && (
                        <span className="px-2.5 py-0.5 rounded-md bg-slate-800 text-slate-300 font-semibold text-[11px] border border-slate-700 capitalize">
                          {item.targetSectionId}
                        </span>
                      )}

                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                          item.status === "new"
                            ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                            : item.status === "invited_to_rehearsal"
                            ? "bg-yellow-400/10 text-yellow-400 border border-yellow-400/30"
                            : item.status === "accepted"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                            : item.status === "under_review"
                            ? "bg-blue-500/10 text-blue-400 border border-blue-500/30"
                            : "bg-rose-500/10 text-rose-400 border border-rose-500/30"
                        }`}
                      >
                        {item.status.replace(/_/g, " ")}
                      </span>

                      {item.createdAt && (
                        <span className="text-[11px] text-slate-500 font-mono ml-auto">
                          Applied: {new Date(item.createdAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>

                    {/* Contact row */}
                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
                      <a
                        href={`mailto:${item.email}`}
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
                      {item.experienceLevel && (
                        <span className="flex items-center gap-1.5 text-slate-300">
                          <Award className="w-3.5 h-3.5 text-yellow-400/80" />
                          <span>{item.experienceLevel}</span>
                        </span>
                      )}
                      {item.secondaryInstruments && (
                        <span className="text-slate-500">
                          Also plays: <span className="text-slate-300">{item.secondaryInstruments}</span>
                        </span>
                      )}
                    </div>

                    {/* Bio note */}
                    {item.bioNotes && (
                      <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 text-xs text-slate-300 leading-relaxed">
                        <p className="font-semibold text-slate-400 text-[11px] uppercase tracking-wider mb-1">
                          Applicant Statement:
                        </p>
                        {item.bioNotes}
                      </div>
                    )}

                    {/* Media / Sample Link */}
                    {item.sampleLinks && (
                      <div className="flex items-center gap-2 pt-0.5">
                        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                          Audition Sample:
                        </span>
                        <a
                          href={item.sampleLinks}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-yellow-400 hover:underline font-medium"
                        >
                          <span>Open Clip</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}

                    {/* Onboarding & Invite Link (if accepted) */}
                    {item.status === "accepted" && (
                      <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 font-bold text-emerald-400">
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Accepted to Roster &bull; Onboarding Active</span>
                          </div>
                          {item.inviteSentAt && (
                            <span className="text-[11px] text-slate-400 font-mono">
                              Invite Sent: {new Date(item.inviteSentAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>

                        {item.inviteToken && (
                          <div className="flex flex-wrap items-center gap-2 pt-1">
                            <span className="text-[11px] text-slate-400 font-medium">Claim Link:</span>
                            <code className="text-[11px] bg-slate-950 px-2 py-0.5 rounded border border-emerald-500/30 font-mono text-emerald-300 select-all">
                              /claim?token={item.inviteToken}
                            </code>
                            <button
                              type="button"
                              onClick={() => handleCopyOnboardingLink(item)}
                              className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1 transition shadow-sm"
                            >
                              <Copy className="w-3 h-3 text-yellow-400" />
                              <span>Copy Link</span>
                            </button>
                            <button
                              type="button"
                              disabled={isProcessing}
                              onClick={() => handleResendInviteEmail(item)}
                              className="px-2.5 py-1 rounded-lg bg-yellow-400/15 hover:bg-yellow-400/25 text-yellow-300 border border-yellow-400/30 text-xs font-semibold flex items-center gap-1 transition disabled:opacity-50 shadow-sm"
                            >
                              <Send className="w-3 h-3" />
                              <span>Resend Email</span>
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Reviewer Notes Thread */}
                    <div className="pt-2">
                      {isEditingNote ? (
                        <div className="space-y-2 bg-slate-950/90 p-3 rounded-xl border border-slate-800">
                          <label className="block text-[11px] font-bold uppercase tracking-wider text-yellow-400">
                            Section Leader / Reviewer Notes
                          </label>
                          <textarea
                            rows={2}
                            value={noteDraft}
                            onChange={(e) => setNoteDraft(e.target.value)}
                            placeholder="Add notes about tone, sight reading, or rehearsal attendance..."
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
                              {item.reviewerNotes ? (
                                <span className="text-slate-300">{item.reviewerNotes}</span>
                              ) : (
                                <span className="italic text-slate-600">No reviewer notes logged</span>
                              )}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingNotesId(item.id);
                              setNoteDraft(item.reviewerNotes || "");
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
                  <div className="flex flex-row lg:flex-col items-stretch gap-1.5 shrink-0 border-t lg:border-t-0 lg:border-l border-slate-800 pt-3 lg:pt-0 lg:pl-4 min-w-[170px]">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                      Status Workflow
                    </span>

                    {/* Under Review */}
                    {item.status === "new" && (
                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={() => handleUpdateStatus(item, "under_review")}
                        className="px-3 py-1.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 text-xs font-bold transition flex items-center justify-center gap-1.5"
                      >
                        <Clock className="w-3.5 h-3.5" />
                        <span>Under Review</span>
                      </button>
                    )}

                    {/* Invite to Rehearsal */}
                    {item.status !== "invited_to_rehearsal" && (
                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={() => handleUpdateStatus(item, "invited_to_rehearsal")}
                        className="px-3 py-1.5 rounded-xl bg-yellow-400/10 hover:bg-yellow-400/20 text-yellow-400 border border-yellow-400/30 text-xs font-bold transition flex items-center justify-center gap-1.5"
                      >
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Invite to Rehearsal</span>
                      </button>
                    )}

                    {/* Accept to Roster & Send Onboarding Link */}
                    {item.status !== "accepted" ? (
                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={() => handleAcceptApplication(item)}
                        className="px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold transition flex items-center justify-center gap-1.5"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Accept to Roster</span>
                      </button>
                    ) : (
                      <div className="space-y-1">
                        <button
                          type="button"
                          onClick={() => handleCopyOnboardingLink(item)}
                          className="w-full px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm"
                        >
                          <Copy className="w-3 h-3 text-yellow-400" />
                          <span>Copy Link</span>
                        </button>
                        <button
                          type="button"
                          disabled={isProcessing}
                          onClick={() => handleResendInviteEmail(item)}
                          className="w-full px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition flex items-center justify-center gap-1.5"
                        >
                          <Send className="w-3 h-3 text-slate-400" />
                          <span>Resend Email</span>
                        </button>
                      </div>
                    )}

                    {/* Decline */}
                    {item.status !== "declined" && (
                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={() => handleUpdateStatus(item, "declined")}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-rose-400 border border-slate-700 text-xs font-medium transition flex items-center justify-center gap-1.5"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Decline</span>
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
                      <span>Remove Record</span>
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
