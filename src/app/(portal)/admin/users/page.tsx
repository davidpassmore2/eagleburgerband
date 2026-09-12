"use client";

import React, { useEffect, useState, useMemo } from "react";
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
import { isAdmin, Role } from "@/lib/auth/permissions";
import { User, UserSchema, RoleEnum } from "@/lib/schema/user";
import { Section, SectionSchema } from "@/lib/schema/section";
import { logAdminAction } from "@/lib/logging/adminLogger";
import {
  ShieldAlert,
  Check,
  UserCog,
  Search,
  Trash2,
  UserX,
  UserCheck,
  AlertTriangle,
  X,
  Loader2,
  ShieldCheck,
  History,
  Users,
} from "lucide-react";

type UserRecord = User & {
  status?: "active" | "inactive" | "pending";
  onboardingStatus?: string;
};

const ALL_ROLES: Role[] = RoleEnum.options;

export default function UsersAdminPage() {
  const { profile, loading: authLoading } = useAuth();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive" | "pending">("all");

  // Purge Modal State
  const [purgeTarget, setPurgeTarget] = useState<UserRecord | null>(null);
  const [purgeConfirmText, setPurgeConfirmText] = useState("");
  const [isPurging, setIsPurging] = useState(false);
  const [actionInProgressId, setActionInProgressId] = useState<string | null>(null);

  useEffect(() => {
    const unsubUsers = onSnapshot(collection(db, "users"), (snap) => {
      const list: UserRecord[] = [];
      snap.forEach((d) => {
        const raw = d.data();
        const parsed = UserSchema.safeParse(raw);
        if (parsed.success) {
          list.push({ ...parsed.data, ...raw } as UserRecord);
        } else {
          list.push(raw as UserRecord);
        }
      });
      list.sort((a, b) => (a.displayName || "").localeCompare(b.displayName || ""));
      setUsers(list);
    });

    const unsubSec = onSnapshot(collection(db, "sections"), (snap) => {
      const list: Section[] = [];
      snap.forEach((d) => {
        const parsed = SectionSchema.safeParse(d.data());
        if (parsed.success) list.push(parsed.data);
      });
      list.sort((a, b) => a.order - b.order);
      setSections(list);
    });

    return () => {
      unsubUsers();
      unsubSec();
    };
  }, []);

  // Filtered list based on status filter and search query
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const name = u.displayName || "";
      const email = u.email || "";
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        name.toLowerCase().includes(query) || email.toLowerCase().includes(query);

      if (!matchesSearch) return false;

      const userStatus = u.status || "active";
      if (statusFilter === "all") return true;
      if (statusFilter === "active") return userStatus === "active";
      if (statusFilter === "inactive") return userStatus === "inactive";
      if (statusFilter === "pending") return userStatus === "pending";
      return true;
    });
  }, [users, searchQuery, statusFilter]);

  // Counts for tabs
  const counts = useMemo(() => {
    let active = 0;
    let inactive = 0;
    let pending = 0;
    users.forEach((u) => {
      const st = u.status || "active";
      if (st === "active") active++;
      else if (st === "inactive") inactive++;
      else if (st === "pending") pending++;
    });
    return { all: users.length, active, inactive, pending };
  }, [users]);

  if (authLoading) {
    return <div className="p-8 text-slate-400">Verifying administrator authorization...</div>;
  }

  if (!isAdmin(profile)) {
    return (
      <div className="p-8 text-amber-400 flex items-center gap-3">
        <ShieldAlert className="w-6 h-6 shrink-0" />
        <span>Administrator clearance required to access User & Role Studio.</span>
      </div>
    );
  }

  const handleToggleRole = async (user: UserRecord, role: Role) => {
    if (!profile) return;
    setActionInProgressId(user.uid);
    const currentRoles = (user.roles || []) as Role[];
    const isAdding = !currentRoles.includes(role);
    const updatedRoles = isAdding
      ? [...currentRoles, role]
      : currentRoles.filter((r) => r !== role);

    try {
      await updateDoc(doc(db, "users", user.uid), {
        roles: updatedRoles,
        updatedAt: new Date().toISOString(),
      });

      await logAdminAction({
        action: "role_updated",
        category: "personnel",
        actor: {
          uid: profile.uid,
          displayName: profile.displayName || "Admin",
          email: profile.email || "",
        },
        targetId: user.uid,
        targetName: user.displayName || user.email,
        description: `Admin ${profile.displayName || profile.email} ${
          isAdding ? "granted" : "revoked"
        } role '${role}' for ${user.displayName || user.email}.`,
        metadata: {
          role,
          change: isAdding ? "added" : "removed",
          previousRoles: currentRoles,
          newRoles: updatedRoles,
        },
      });
    } catch (err) {
      console.error("Failed to update role:", err);
      alert("Failed to update role: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setActionInProgressId(null);
    }
  };

  const handleUpdateSection = async (userId: string, sectionId: string) => {
    if (!profile) return;
    const targetUser = users.find((u) => u.uid === userId);
    const sectionObj = sections.find((s) => s.id === sectionId);
    setActionInProgressId(userId);

    try {
      await updateDoc(doc(db, "users", userId), {
        sectionId: sectionId || null,
        updatedAt: new Date().toISOString(),
      });

      await logAdminAction({
        action: "section_assigned",
        category: "personnel",
        actor: {
          uid: profile.uid,
          displayName: profile.displayName || "Admin",
          email: profile.email || "",
        },
        targetId: userId,
        targetName: targetUser?.displayName || "Member",
        description: `Admin ${profile.displayName || profile.email} assigned ${
          targetUser?.displayName || "Member"
        } to section '${sectionObj?.name || "None"}'.`,
        metadata: {
          sectionId: sectionId || null,
          sectionName: sectionObj?.name || null,
        },
      });
    } catch (err) {
      console.error("Failed to update section:", err);
    } finally {
      setActionInProgressId(null);
    }
  };

  const handleUpdateStatus = async (
    userId: string,
    newStatus: "active" | "inactive" | "pending"
  ) => {
    if (!profile) return;
    const targetUser = users.find((u) => u.uid === userId);
    setActionInProgressId(userId);

    try {
      await updateDoc(doc(db, "users", userId), {
        status: newStatus,
        updatedAt: new Date().toISOString(),
      });

      const actionType =
        newStatus === "inactive"
          ? "member_deactivated"
          : newStatus === "active"
          ? "member_reactivated"
          : "status_updated";

      await logAdminAction({
        action: actionType,
        category: "personnel",
        actor: {
          uid: profile.uid,
          displayName: profile.displayName || "Admin",
          email: profile.email || "",
        },
        targetId: userId,
        targetName: targetUser?.displayName || "Member",
        description: `Admin ${profile.displayName || profile.email} set status to '${newStatus}' for ${
          targetUser?.displayName || targetUser?.email || "Member"
        }.`,
        metadata: {
          previousStatus: targetUser?.status || "unknown",
          newStatus,
        },
      });
    } catch (err) {
      console.error("Failed to update status:", err);
      alert("Failed to update status: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setActionInProgressId(null);
    }
  };

  const handleExecutePurge = async () => {
    if (!profile || !purgeTarget) return;

    setIsPurging(true);
    try {
      const targetUid = purgeTarget.uid;
      const targetName = purgeTarget.displayName || purgeTarget.email;
      const targetEmail = purgeTarget.email;

      // 1. Permanently remove user doc
      await deleteDoc(doc(db, "users", targetUid));

      // 2. Write high-severity audit log
      await logAdminAction({
        action: "member_purged",
        category: "personnel",
        actor: {
          uid: profile.uid,
          displayName: profile.displayName || "Admin",
          email: profile.email || "",
        },
        targetId: targetUid,
        targetName,
        description: `CRITICAL: Administrator ${profile.displayName || profile.email} PERMANENTLY PURGED member record for ${targetName} (${targetEmail}).`,
        metadata: {
          purgedUid: targetUid,
          purgedEmail: targetEmail,
          purgedRoles: purgeTarget.roles || [],
          purgedSectionId: purgeTarget.sectionId || null,
        },
      });

      setPurgeTarget(null);
      setPurgeConfirmText("");
    } catch (err) {
      console.error("Failed to purge user:", err);
      alert("Error purging user record: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsPurging(false);
    }
  };

  const isPurgeNameMatch =
    purgeTarget &&
    (purgeConfirmText.trim().toLowerCase() ===
      (purgeTarget.displayName || purgeTarget.email).trim().toLowerCase() ||
      purgeConfirmText.trim().toLowerCase() === purgeTarget.email.trim().toLowerCase());

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Studio Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-yellow-400/10 text-yellow-400 border border-yellow-400/20">
              Admin Studio
            </span>
            <span className="text-xs font-mono text-slate-400 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> RBAC & Lifecycle
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2 mt-1">
            <UserCog className="text-yellow-400 w-6 h-6" /> User & Role Management Studio
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-0.5">
            Assign studio permissions, adjust section assignments, manage deactivations, and purge records.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <Link
            href="/admin/audit-log"
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-700 transition flex items-center gap-2 shadow-sm"
          >
            <History className="w-4 h-4 text-amber-400" />
            <span>Audit Log</span>
          </Link>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900/60 border border-slate-800 rounded-2xl p-3">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setStatusFilter("all")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              statusFilter === "all"
                ? "bg-yellow-400 text-slate-950 shadow-sm"
                : "text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>All</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/20 font-mono">
              {counts.all}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter("active")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              statusFilter === "active"
                ? "bg-emerald-500 text-slate-950 shadow-sm"
                : "text-slate-400 hover:text-emerald-400 hover:bg-slate-800"
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Active</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/20 font-mono">
              {counts.active}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter("inactive")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              statusFilter === "inactive"
                ? "bg-red-500 text-white shadow-sm"
                : "text-slate-400 hover:text-red-400 hover:bg-slate-800"
            }`}
          >
            <UserX className="w-3.5 h-3.5" />
            <span>Inactive</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/20 font-mono">
              {counts.inactive}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter("pending")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              statusFilter === "pending"
                ? "bg-amber-400 text-slate-950 shadow-sm"
                : "text-slate-400 hover:text-amber-400 hover:bg-slate-800"
            }`}
          >
            <span>Pending</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/20 font-mono">
              {counts.pending}
            </span>
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400"
          />
        </div>
      </div>

      {/* User Cards */}
      <div className="space-y-4">
        {filteredUsers.length === 0 ? (
          <div className="p-12 text-center text-slate-500 bg-slate-900/40 rounded-2xl border border-slate-800 text-xs">
            No performers found matching the current criteria.
          </div>
        ) : (
          filteredUsers.map((member) => {
            const memberStatus = member.status || "active";
            const isSelf = profile ? member.uid === profile.uid : false;
            const isBusy = actionInProgressId === member.uid;

            return (
              <div
                key={member.uid}
                className={`border rounded-2xl p-5 space-y-4 transition ${
                  memberStatus === "inactive"
                    ? "bg-slate-950/60 border-slate-800/60 opacity-80 hover:opacity-100"
                    : "bg-slate-900 border-slate-800 hover:border-slate-700"
                }`}
              >
                {/* Member Top Row */}
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3">
                  <div>
                    <div className="font-bold text-base text-white flex items-center gap-2.5 flex-wrap">
                      <span>{member.displayName || "Unnamed Performer"}</span>
                      <span className="text-xs font-mono text-slate-400 font-normal">
                        ({member.email})
                      </span>

                      {/* Status Badge */}
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                          memberStatus === "active"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : memberStatus === "inactive"
                            ? "bg-red-500/10 text-red-400 border border-red-500/20"
                            : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                        }`}
                      >
                        {memberStatus}
                      </span>

                      {isSelf && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                          You
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                      UID: {member.uid}
                    </div>
                  </div>

                  {/* Section, Status Selector, and Actions */}
                  <div className="flex flex-wrap items-center gap-2.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-slate-400">Section:</span>
                      <select
                        value={member.sectionId || ""}
                        disabled={isBusy}
                        onChange={(e) => handleUpdateSection(member.uid, e.target.value)}
                        className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white disabled:opacity-50"
                      >
                        <option value="">-- No Section --</option>
                        {sections.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Quick Deactivate / Reactivate Action */}
                    {memberStatus === "active" ? (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => handleUpdateStatus(member.uid, "inactive")}
                        className="px-3 py-1 rounded-lg text-xs font-semibold text-red-400 border border-red-500/30 hover:bg-red-500/10 transition flex items-center gap-1.5 disabled:opacity-50"
                        title="Deactivate this member"
                      >
                        <UserX className="w-3.5 h-3.5" />
                        <span>Deactivate</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => handleUpdateStatus(member.uid, "active")}
                        className="px-3 py-1 rounded-lg text-xs font-semibold text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/10 transition flex items-center gap-1.5 disabled:opacity-50"
                        title="Reactivate this member"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>Reactivate</span>
                      </button>
                    )}

                    {/* Purge Member (Admin only, cannot purge self) */}
                    {!isSelf && (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => {
                          setPurgeTarget(member);
                          setPurgeConfirmText("");
                        }}
                        className="px-3 py-1 rounded-lg text-xs font-semibold text-red-400 hover:text-white bg-red-950/40 hover:bg-red-600 border border-red-800/40 hover:border-red-600 transition flex items-center gap-1.5 disabled:opacity-50"
                        title="Permanently purge member record from database"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Purge</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Assigned RBAC Roles */}
                <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                    Assigned RBAC Roles & Privileges:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {ALL_ROLES.map((role) => {
                      const hasRoleActive = member.roles?.includes(role);
                      return (
                        <button
                          key={role}
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleToggleRole(member, role)}
                          className={`px-2.5 py-1 rounded text-[11px] font-semibold transition border flex items-center gap-1 disabled:opacity-50 ${
                            hasRoleActive
                              ? "bg-yellow-400 text-slate-950 border-yellow-400 font-bold shadow-xs"
                              : "bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-600"
                          }`}
                        >
                          {hasRoleActive && <Check className="w-3 h-3" />}
                          {role}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Confirmation Modal for Permanent Purge */}
      {purgeTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="bg-slate-900 border border-red-500/40 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-red-500/15 text-red-400 border border-red-500/30">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Permanently Purge Member</h3>
                  <p className="text-xs text-red-400 font-mono">Irreversible Administrative Action</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPurgeTarget(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-slate-300 space-y-3 bg-red-950/20 border border-red-500/20 rounded-xl p-4">
              <p className="font-semibold text-red-300">
                You are about to permanently purge the user record for:
              </p>
              <div className="text-sm font-bold text-white">
                {purgeTarget.displayName || purgeTarget.email}
                <span className="block text-xs font-mono font-normal text-slate-400">
                  {purgeTarget.email} &bull; {purgeTarget.uid}
                </span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-slate-300 pt-1">
                <li>This removes the musician profile document from Firestore.</li>
                <li>The user will lose all RBAC roles, preferences, and portal access.</li>
                <li>This action will be logged in the immutable Admin Audit Log.</li>
              </ul>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 block">
                To confirm, type{" "}
                <span className="text-amber-300 font-mono select-all">
                  {purgeTarget.displayName || purgeTarget.email}
                </span>{" "}
                below:
              </label>
              <input
                type="text"
                value={purgeConfirmText}
                onChange={(e) => setPurgeConfirmText(e.target.value)}
                placeholder="Type member name or email to confirm..."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500 transition"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setPurgeTarget(null)}
                disabled={isPurging}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecutePurge}
                disabled={!isPurgeNameMatch || isPurging}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-500 transition flex items-center gap-2 shadow-lg disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isPurging ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Purging Record...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Purge Member Document</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}