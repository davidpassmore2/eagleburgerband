"use client";

import React, { useEffect, useState, useMemo } from "react";
import { collection, onSnapshot, doc, updateDoc, setDoc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/lib/context/AuthContext";
import { canManageRoster } from "@/lib/auth/permissions";
import Link from "next/link";
import { User, UserSchema, RoleEnum } from "@/lib/schema/user";
import { Section, SectionSchema } from "@/lib/schema/section";
import { Invite, InviteSchema, InviteStatus } from "@/lib/schema/invite";
import { toast } from "@/lib/context/ToastContext";
import { 
  Users, 
  UserPlus, 
  Copy, 
  Mail, 
  CheckCircle2, 
  Clock, 
  Ban, 
  Trash2, 
  RotateCcw, 
  Search, 
  Sparkles,
  Loader2,
  X
} from "lucide-react";
import AccessDenied from "@/components/portal/AccessDenied";
import { z } from "zod";

type Role = z.infer<typeof RoleEnum>;

const ALL_ROLES: Role[] = [
  "admin",
  "web_manager",
  "gig_manager",
  "catalog_manager",
  "setlist_manager",
  "community_manager",
  "treasurer",
  "section_leader",
  "membership_manager",
  "asset_manager",
  "member",
  "guest",
];

function formatTimestamp(isoStr?: string | null): string {
  if (!isoStr) return "—";
  try {
    const d = new Date(isoStr);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return isoStr;
  }
}

export default function RosterAdminPage() {
  const { profile, loading: authLoading } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<"roster" | "invitations">("roster");

  // Invitations filter & search state
  const [inviteFilter, setInviteFilter] = useState<"all" | InviteStatus>("all");
  const [inviteSearch, setInviteSearch] = useState("");

  // Create invite modal state
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteSection, setInviteSection] = useState("");
  const [inviteInstruments, setInviteInstruments] = useState("");
  const [inviteNotes, setInviteNotes] = useState("");
  const [inviteRoles] = useState<Role[]>(["member"]);
  const [lastCreatedInvite, setLastCreatedInvite] = useState<{
    email: string;
    name: string;
    token: string;
    link: string;
  } | null>(null);
  const [sendingInviteToken, setSendingInviteToken] = useState<string | null>(null);

  useEffect(() => {
    const unsubUsers = onSnapshot(collection(db, "users"), (snap) => {
      const list: User[] = [];
      snap.forEach((d) => {
        const parsed = UserSchema.safeParse({ uid: d.id, ...d.data() });
        if (parsed.success) list.push(parsed.data);
      });
      setUsers(list);
    });

    const unsubSections = onSnapshot(collection(db, "sections"), (snap) => {
      const list: Section[] = [];
      snap.forEach((d) => {
        const parsed = SectionSchema.safeParse({ id: d.id, ...d.data() });
        if (parsed.success) list.push(parsed.data);
      });
      setSections(list);
    });

    const unsubInvites = onSnapshot(collection(db, "invites"), (snap) => {
      const list: Invite[] = [];
      snap.forEach((d) => {
        const parsed = InviteSchema.safeParse({ token: d.id, ...d.data() });
        if (parsed.success) list.push(parsed.data);
      });
      // Sort newest first
      list.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
      setInvites(list);
    });

    return () => {
      unsubUsers();
      unsubSections();
      unsubInvites();
    };
  }, []);

  // Filtered & grouped invitations
  const pendingInvitesCount = useMemo(
    () => invites.filter((i) => i.status === "pending").length,
    [invites]
  );
  const claimedInvitesCount = useMemo(
    () => invites.filter((i) => i.status === "claimed").length,
    [invites]
  );
  const revokedInvitesCount = useMemo(
    () => invites.filter((i) => i.status === "revoked").length,
    [invites]
  );

  const filteredInvites = useMemo(() => {
    return invites.filter((inv) => {
      if (inviteFilter !== "all" && inv.status !== inviteFilter) {
        return false;
      }
      if (inviteSearch.trim()) {
        const q = inviteSearch.toLowerCase().trim();
        const secName = sections.find((s) => s.id === inv.sectionId)?.name.toLowerCase() || "";
        const matches =
          (inv.displayName || "").toLowerCase().includes(q) ||
          (inv.email || "").toLowerCase().includes(q) ||
          (inv.notes || "").toLowerCase().includes(q) ||
          (inv.instruments || []).some((i) => i.toLowerCase().includes(q)) ||
          secName.includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [invites, inviteFilter, inviteSearch, sections]);

  if (authLoading) return <div className="p-8 text-slate-400">Verifying credentials...</div>;
  if (!canManageRoster(profile)) {
    return (
      <AccessDenied
        title="Roster Clearance Required"
        message="Administrator or Membership Manager clearance required to manage band roster and invitations."
      />
    );
  }

  const handleToggleRole = async (user: User, roleToToggle: Role) => {
    const currentRoles = new Set(user.roles || []);
    if (currentRoles.has(roleToToggle)) {
      currentRoles.delete(roleToToggle);
    } else {
      currentRoles.add(roleToToggle);
    }
    await updateDoc(doc(db, "users", user.uid), {
      roles: Array.from(currentRoles),
    });
  };

  const handleUpdateSection = async (user: User, newSectionId: string) => {
    await updateDoc(doc(db, "users", user.uid), {
      sectionId: newSectionId === "" ? null : newSectionId,
    });
  };

  const handleCreateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !inviteName.trim()) return;

    try {
      const token = `inv_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      const payload = {
        token,
        email: inviteEmail.trim().toLowerCase(),
        displayName: inviteName.trim(),
        sectionId: inviteSection || null,
        instruments: inviteInstruments
          ? inviteInstruments.split(",").map((i) => i.trim()).filter(Boolean)
          : [],
        notes: inviteNotes.trim(),
        roles: inviteRoles,
        status: "pending" as const,
        createdAt: new Date().toISOString(),
      };

      const validated = InviteSchema.parse(payload);
      await setDoc(doc(db, "invites", token), validated);

      const link = `${window.location.origin}/claim?token=${token}`;
      setLastCreatedInvite({
        email: inviteEmail.trim(),
        name: inviteName.trim(),
        token,
        link,
      });
      setShowInviteModal(false);
      setInviteEmail("");
      setInviteName("");
      setInviteSection("");
      setInviteInstruments("");
      setInviteNotes("");
      toast.success("Onboarding link generated!");
    } catch (err) {
      toast.error("Failed to generate invite: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleCopyInviteLink = (inv: Invite) => {
    const link = `${window.location.origin}/claim?token=${inv.token}`;
    navigator.clipboard.writeText(link);
    toast.success(`Claim link for ${inv.displayName || inv.email} copied to clipboard!`);
  };

  const handleSendInviteEmail = async (inv: {
    token: string;
    email: string;
    displayName?: string;
    name?: string;
    sectionId?: string | null;
    instruments?: string[];
    notes?: string;
  }) => {
    const token = inv.token;
    const recipientEmail = inv.email;
    const musicianName = inv.displayName || inv.name || "";
    const sectionName = inv.sectionId
      ? sections.find((s) => s.id === inv.sectionId)?.name || inv.sectionId
      : "";
    const instruments = Array.isArray(inv.instruments) ? inv.instruments : [];
    const notes = inv.notes || "";

    setSendingInviteToken(token);
    try {
      const res = await fetch("/api/email/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          recipientEmail,
          musicianName,
          sectionName,
          instruments,
          notes,
          actorUid: profile?.uid,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to dispatch invitation email");
      }

      if (data.mocked) {
        toast.success(`[Mock] Invitation email generated for ${recipientEmail}`);
      } else {
        toast.success(`Invitation email delivered to ${recipientEmail}`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setSendingInviteToken(null);
    }
  };

  const handleRevokeInvite = async (inv: Invite) => {
    try {
      await updateDoc(doc(db, "invites", inv.token), {
        status: "revoked",
        revokedAt: new Date().toISOString(),
      });
      toast.success(`Invitation for ${inv.displayName || inv.email} cancelled.`);
    } catch (err) {
      toast.error("Failed to cancel invitation: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleRestoreInvite = async (inv: Invite) => {
    try {
      await updateDoc(doc(db, "invites", inv.token), {
        status: "pending",
        revokedAt: null,
      });
      toast.success(`Invitation for ${inv.displayName || inv.email} re-activated.`);
    } catch (err) {
      toast.error("Failed to restore invitation: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleDeleteInvite = async (inv: Invite) => {
    if (!window.confirm(`Permanently remove invitation for ${inv.displayName || inv.email}?`)) {
      return;
    }
    try {
      await deleteDoc(doc(db, "invites", inv.token));
      toast.success("Invitation removed.");
    } catch (err) {
      toast.error("Failed to delete invitation: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Users className="text-yellow-400" /> Band Roster & Invitations
          </h1>
          <p className="text-slate-400 text-sm">
            Review active ensemble members, modify assigned sections, configure RBAC permissions, and manage onboarding invitations.
          </p>
        </div>
        <button
          onClick={() => setShowInviteModal(true)}
          className="flex items-center gap-2 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold px-4 py-2 rounded-xl text-sm transition shadow cursor-pointer shrink-0"
        >
          <UserPlus className="w-4 h-4" /> Issue Invite Link
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab("roster")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeTab === "roster"
              ? "bg-yellow-400 text-slate-950 shadow"
              : "text-slate-400 hover:text-white hover:bg-slate-800"
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Active Ensemble ({users.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("invitations")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeTab === "invitations"
              ? "bg-yellow-400 text-slate-950 shadow"
              : "text-slate-400 hover:text-white hover:bg-slate-800"
          }`}
        >
          <Mail className="w-4 h-4" />
          <span>Invitations ({invites.length})</span>
          {pendingInvitesCount > 0 && (
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
              activeTab === "invitations"
                ? "bg-slate-950 text-yellow-400"
                : "bg-amber-400/20 text-amber-300 border border-amber-400/30"
            }`}>
              {pendingInvitesCount} pending
            </span>
          )}
        </button>
      </div>

      {/* Toast-style Alert for Last Created Invite */}
      {lastCreatedInvite && (
        <div className="bg-emerald-950/80 border border-emerald-500/50 p-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-emerald-200 shadow-lg">
          <div className="space-y-1">
            <div className="font-semibold text-white flex items-center gap-1.5">
              <span>Onboarding token created for {lastCreatedInvite.name} ({lastCreatedInvite.email})</span>
            </div>
            <div className="text-[11px] text-emerald-300/80 font-mono break-all">{lastCreatedInvite.link}</div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => {
                navigator.clipboard.writeText(lastCreatedInvite.link);
                toast.success("Copied onboarding link to clipboard!");
              }}
              className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-1.5 rounded-lg transition cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" /> Copy Link
            </button>
            <button
              type="button"
              disabled={sendingInviteToken === lastCreatedInvite.token}
              onClick={() => handleSendInviteEmail({
                token: lastCreatedInvite.token,
                email: lastCreatedInvite.email,
                displayName: lastCreatedInvite.name,
              })}
              className="flex items-center gap-1.5 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold px-3 py-1.5 rounded-lg transition shadow disabled:opacity-50 cursor-pointer"
            >
              {sendingInviteToken === lastCreatedInvite.token ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Mail className="w-3.5 h-3.5" />
              )}
              <span>Send Invitation Email</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB 1: ACTIVE ROSTER */}
      {activeTab === "roster" && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-x-auto shadow">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="p-4">Performer</th>
                <th className="p-4">Assigned Section</th>
                <th className="p-4">Stacked Roles (RBAC)</th>
                <th className="p-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {users.map((u) => (
                <tr key={u.uid} className="hover:bg-slate-800/30 transition">
                  <td className="p-4">
                    <div className="font-bold text-white">{u.displayName}</div>
                    <div className="text-[11px] text-slate-500">{u.email}</div>
                    <div className="text-[10px] text-yellow-400/80 font-mono mt-0.5">
                      {u.instruments.join(", ") || "No instruments logged"}
                    </div>
                  </td>
                  <td className="p-4">
                    <select
                      value={u.sectionId || ""}
                      onChange={(e) => handleUpdateSection(u, e.target.value)}
                      className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-yellow-400"
                    >
                      <option value="">(Unassigned)</option>
                      {sections.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-wrap gap-1 max-w-md">
                      {ALL_ROLES.map((r) => {
                        const hasThisRole = (u.roles || []).includes(r);
                        return (
                          <button
                            key={r}
                            onClick={() => handleToggleRole(u, r)}
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold transition cursor-pointer ${
                              hasThisRole
                                ? "bg-yellow-400 text-slate-950 font-bold"
                                : "bg-slate-800 text-slate-500 hover:text-slate-300"
                            }`}
                          >
                            {r} {hasThisRole && "✓"}
                          </button>
                        );
                      })}
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase font-mono text-[10px] font-bold">
                      {u.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 2: INVITATIONS TRACKER */}
      {activeTab === "invitations" && (
        <div className="space-y-4">
          {/* Metrics Overview Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
              <span className="text-xs text-slate-400">Total Issued</span>
              <p className="text-xl font-bold text-white font-mono">{invites.length}</p>
            </div>
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-1">
              <span className="text-xs text-amber-300 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> Pending
              </span>
              <p className="text-xl font-bold text-amber-400 font-mono">{pendingInvitesCount}</p>
            </div>
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-1">
              <span className="text-xs text-emerald-300 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Accepted
              </span>
              <p className="text-xl font-bold text-emerald-400 font-mono">{claimedInvitesCount}</p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Ban className="w-3.5 h-3.5 text-rose-400" /> Cancelled
              </span>
              <p className="text-xl font-bold text-rose-400 font-mono">{revokedInvitesCount}</p>
            </div>
          </div>

          {/* Filter & Search Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-2xl border border-slate-800">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search by name, email, section, or notes..."
                value={inviteSearch}
                onChange={(e) => setInviteSearch(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400"
              />
              {inviteSearch && (
                <button
                  type="button"
                  onClick={() => setInviteSearch("")}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
              <button
                type="button"
                onClick={() => setInviteFilter("all")}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer shrink-0 ${
                  inviteFilter === "all"
                    ? "bg-white text-slate-950 font-bold"
                    : "bg-slate-950 text-slate-400 hover:text-white border border-slate-800"
                }`}
              >
                All ({invites.length})
              </button>
              <button
                type="button"
                onClick={() => setInviteFilter("pending")}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer shrink-0 ${
                  inviteFilter === "pending"
                    ? "bg-amber-400 text-slate-950 font-bold"
                    : "bg-slate-950 text-amber-400/80 hover:text-amber-300 border border-slate-800"
                }`}
              >
                Pending ({pendingInvitesCount})
              </button>
              <button
                type="button"
                onClick={() => setInviteFilter("claimed")}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer shrink-0 ${
                  inviteFilter === "claimed"
                    ? "bg-emerald-400 text-slate-950 font-bold"
                    : "bg-slate-950 text-emerald-400/80 hover:text-emerald-300 border border-slate-800"
                }`}
              >
                Accepted ({claimedInvitesCount})
              </button>
              <button
                type="button"
                onClick={() => setInviteFilter("revoked")}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer shrink-0 ${
                  inviteFilter === "revoked"
                    ? "bg-rose-500 text-white font-bold"
                    : "bg-slate-950 text-rose-400/80 hover:text-rose-300 border border-slate-800"
                }`}
              >
                Cancelled ({revokedInvitesCount})
              </button>
            </div>
          </div>

          {/* Invitations Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-x-auto shadow">
            {filteredInvites.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <Mail className="w-10 h-10 text-slate-600 mx-auto" />
                <h3 className="text-base font-bold text-white">No invitations found</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  {inviteSearch
                    ? "No invitations match your current search query."
                    : "No onboarding invitations match the selected filter."}
                </p>
                <button
                  type="button"
                  onClick={() => setShowInviteModal(true)}
                  className="inline-flex items-center gap-1.5 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs transition cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" /> Issue New Invitation
                </button>
              </div>
            ) : (
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                  <tr>
                    <th className="p-4">Recipient</th>
                    <th className="p-4">Section & Instruments</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Timeline</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredInvites.map((inv) => {
                    const sectionName =
                      sections.find((s) => s.id === inv.sectionId)?.name ||
                      (inv.sectionId ? inv.sectionId.toUpperCase() : "General Roster");

                    return (
                      <tr key={inv.token} className="hover:bg-slate-800/30 transition">
                        {/* Recipient info */}
                        <td className="p-4">
                          <div className="font-bold text-white">{inv.displayName || "Musician"}</div>
                          <div className="text-[11px] text-slate-400 font-mono">{inv.email}</div>
                          {inv.notes && (
                            <div className="text-[10px] text-slate-500 italic mt-1 line-clamp-1">
                              Note: {inv.notes}
                            </div>
                          )}
                        </td>

                        {/* Section & Instruments */}
                        <td className="p-4">
                          <span className="font-semibold text-yellow-400 bg-yellow-400/10 px-2 py-0.5 rounded border border-yellow-400/20 text-[11px]">
                            {sectionName}
                          </span>
                          {inv.instruments && inv.instruments.length > 0 && (
                            <div className="text-[10px] text-slate-400 mt-1 flex flex-wrap gap-1">
                              {inv.instruments.map((inst) => (
                                <span key={inst} className="bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
                                  {inst}
                                </span>
                              ))}
                            </div>
                          )}
                        </td>

                        {/* Status Badge */}
                        <td className="p-4">
                          {inv.status === "claimed" && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold text-[10px] uppercase">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Accepted</span>
                            </span>
                          )}
                          {inv.status === "pending" && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-400/10 text-amber-300 border border-amber-400/20 font-bold text-[10px] uppercase">
                              <Clock className="w-3.5 h-3.5 animate-pulse" />
                              <span>Pending</span>
                            </span>
                          )}
                          {inv.status === "revoked" && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 font-bold text-[10px] uppercase">
                              <Ban className="w-3.5 h-3.5" />
                              <span>Cancelled</span>
                            </span>
                          )}
                        </td>

                        {/* Timeline */}
                        <td className="p-4 text-[11px] text-slate-400 space-y-0.5">
                          <div>Issued: <span className="text-slate-300">{formatTimestamp(inv.createdAt)}</span></div>
                          {inv.lastEmailSentAt ? (
                            <div className="text-amber-400 flex items-center gap-1 font-medium">
                              <Mail className="w-3 h-3 text-amber-400 shrink-0" />
                              <span>Sent: {formatTimestamp(inv.lastEmailSentAt)}</span>
                            </div>
                          ) : (
                            <div className="text-slate-500 italic">Email: Not sent</div>
                          )}
                          {inv.status === "claimed" && inv.claimedAt && (
                            <div className="text-emerald-400">
                              Claimed: <span>{formatTimestamp(inv.claimedAt)}</span>
                            </div>
                          )}
                          {inv.status === "revoked" && inv.revokedAt && (
                            <div className="text-rose-400">
                              Revoked: <span>{formatTimestamp(inv.revokedAt)}</span>
                            </div>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {inv.status === "pending" && (
                              <>
                                <button
                                  type="button"
                                  disabled={sendingInviteToken === inv.token}
                                  onClick={() => handleSendInviteEmail(inv)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-yellow-400/10 hover:bg-yellow-400/20 text-yellow-400 border border-yellow-400/20 text-xs font-semibold transition cursor-pointer disabled:opacity-50"
                                  title="Dispatch official invitation email"
                                >
                                  {sendingInviteToken === inv.token ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <Mail className="w-3.5 h-3.5" />
                                  )}
                                  <span>{inv.lastEmailSentAt ? "Resend" : "Send Email"}</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleCopyInviteLink(inv)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition cursor-pointer"
                                  title="Copy Onboarding Claim Link"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                  <span>Link</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRevokeInvite(inv)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-semibold transition cursor-pointer"
                                  title="Cancel and revoke this invitation link"
                                >
                                  <Ban className="w-3.5 h-3.5" />
                                  <span>Cancel</span>
                                </button>
                              </>
                            )}

                            {inv.status === "revoked" && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleRestoreInvite(inv)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 text-xs font-semibold transition cursor-pointer"
                                  title="Restore and re-activate invitation"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                  <span>Re-activate</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteInvite(inv)}
                                  className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                                  title="Delete Invitation"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            )}

                            {inv.status === "claimed" && (
                              <span className="text-[11px] text-slate-500 italic">
                                Active on Roster
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-yellow-400" />
                <span>Create Musician Onboarding Token</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowInviteModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateInvite} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Performer Full Name *</label>
                <input
                  type="text"
                  required
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  placeholder="e.g. Jordan Miles"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Performer Email *</label>
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="performer@example.com"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Pre-Assigned Section</label>
                <select
                  value={inviteSection}
                  onChange={(e) => setInviteSection(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-yellow-400"
                >
                  <option value="">(Assign Later / General Roster)</option>
                  {sections.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Instruments (Comma Separated)</label>
                <input
                  type="text"
                  value={inviteInstruments}
                  onChange={(e) => setInviteInstruments(e.target.value)}
                  placeholder="e.g. Tenor Trombone, Bass Trombone"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Internal Note (Optional)</label>
                <input
                  type="text"
                  value={inviteNotes}
                  onChange={(e) => setInviteNotes(e.target.value)}
                  placeholder="e.g. Met at Porchfest, joining for fall parades"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs transition cursor-pointer shadow"
                >
                  Generate Onboarding Link
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}