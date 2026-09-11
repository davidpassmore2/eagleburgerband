"use client";

import React, { useEffect, useState } from "react";
import { collection, onSnapshot, doc, updateDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/lib/context/AuthContext";
import { canManageRoster } from "@/lib/auth/permissions";
import { User, UserSchema, RoleEnum } from "@/lib/schema/user";
import { Section, SectionSchema } from "@/lib/schema/section";
import { Users, ShieldAlert, UserPlus, Copy } from "lucide-react";
import { z } from "zod";

type Role = z.infer<typeof RoleEnum>;

const ALL_ROLES: Role[] = [
  "admin",
  "web_manager",
  "gig_manager",
  "catalog_manager",
  "community_manager",
  "treasurer",
  "section_leader",
  "member",
  "guest",
];

export default function RosterAdminPage() {
  const { profile, loading: authLoading } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteSection, setInviteSection] = useState("");
  const [inviteRoles] = useState<Role[]>(["member"]);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  useEffect(() => {
    const unsubUsers = onSnapshot(collection(db, "users"), (snap) => {
      const list: User[] = [];
      snap.forEach((d) => {
        const parsed = UserSchema.safeParse(d.data());
        if (parsed.success) list.push(parsed.data);
      });
      setUsers(list);
    });

    const unsubSections = onSnapshot(collection(db, "sections"), (snap) => {
      const list: Section[] = [];
      snap.forEach((d) => {
        const parsed = SectionSchema.safeParse(d.data());
        if (parsed.success) list.push(parsed.data);
      });
      setSections(list);
    });

    return () => {
      unsubUsers();
      unsubSections();
    };
  }, []);

  if (authLoading) return <div className="p-8 text-slate-400">Verifying credentials...</div>;
  if (!canManageRoster(profile)) {
    return (
      <div className="p-8 text-amber-400 flex items-center gap-3">
        <ShieldAlert className="w-6 h-6" />
        <span>Administrator clearance required to manage band roster and invitations.</span>
      </div>
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

    const token = `inv_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    await setDoc(doc(db, "invites", token), {
      token,
      email: inviteEmail.trim().toLowerCase(),
      displayName: inviteName.trim(),
      sectionId: inviteSection || null,
      roles: inviteRoles,
      status: "pending",
      createdAt: new Date().toISOString(),
    });

    setCopiedToken(`${window.location.origin}/claim?token=${token}`);
    setShowInviteModal(false);
    setInviteEmail("");
    setInviteName("");
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Users className="text-yellow-400" /> Band Roster & Invitations
          </h1>
          <p className="text-slate-400 text-sm">
            Review active ensemble members, modify assigned sections, configure RBAC permissions, and issue onboarding claim tokens.
          </p>
        </div>
        <button
          onClick={() => setShowInviteModal(true)}
          className="flex items-center gap-2 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold px-4 py-2 rounded text-sm transition"
        >
          <UserPlus className="w-4 h-4" /> Issue Invite Link
        </button>
      </div>

      {copiedToken && (
        <div className="bg-emerald-950/80 border border-emerald-500/50 p-4 rounded-lg flex items-center justify-between text-xs text-emerald-200">
          <span>Invite token generated! Share this link with the performer: <strong className="font-mono text-white">{copiedToken}</strong></span>
          <button
            onClick={() => {
              navigator.clipboard.writeText(copiedToken);
              alert("Copied onboarding link to clipboard!");
            }}
            className="flex items-center gap-1 bg-emerald-500 text-slate-950 font-bold px-2 py-1 rounded hover:bg-emerald-400 transition"
          >
            <Copy className="w-3.5 h-3.5" /> Copy Link
          </button>
        </div>
      )}

      {/* Roster Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-x-auto shadow">
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
                    className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white"
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
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold transition ${
                            hasThisRole
                              ? "bg-yellow-400/90 text-slate-950 font-bold"
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
                  <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase font-mono text-[10px]">
                    {u.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 max-w-md w-full space-y-4 shadow-xl">
            <h3 className="text-lg font-bold text-white">Create Musician Onboarding Token</h3>
            <form onSubmit={handleCreateInvite} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Performer Full Name</label>
                <input
                  type="text"
                  required
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  placeholder="e.g. Jordan Miles"
                  className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Performer Email</label>
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="performer@example.com"
                  className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Pre-Assigned Section</label>
                <select
                  value={inviteSection}
                  onChange={(e) => setInviteSection(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-xs text-white"
                >
                  <option value="">(Assign Later)</option>
                  {sections.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold px-4 py-2 rounded text-xs transition"
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