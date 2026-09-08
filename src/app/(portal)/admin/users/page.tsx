"use client";

import React, { useEffect, useState } from "react";
import { collection, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/lib/context/AuthContext";
import { isAdmin } from "@/lib/auth/permissions";
import { User, UserSchema } from "@/lib/schema/user";
import { Section, SectionSchema } from "@/lib/schema/section";
import { Role } from "@/lib/auth/permissions";
import { ShieldAlert, Check, UserCog, Search } from "lucide-react";

type UserRecord = User & {
  status?: string;
  onboardingStatus?: string;
};

const ALL_ROLES: Role[] = [
  "admin",
  "web_manager",
  "gig_manager",
  "catalog_manager",
  "community_manager",
  "treasurer",
  "section_leader",
  "member",
];

export default function UsersAdminPage() {
  const { profile, loading: authLoading } = useAuth();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

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

  if (authLoading) return <div className="p-8 text-slate-400">Verifying administrator authorization...</div>;
  if (!isAdmin(profile)) {
    return (
      <div className="p-8 text-amber-400 flex items-center gap-3">
        <ShieldAlert className="w-6 h-6 shrink-0" />
        <span>Administrator clearance required to access User & Role Studio.</span>
      </div>
    );
  }

  const handleToggleRole = async (user: UserRecord, role: Role) => {
    const currentRoles = (user.roles || []) as Role[];
    const updatedRoles = currentRoles.includes(role)
      ? currentRoles.filter((r) => r !== role)
      : [...currentRoles, role];

    await updateDoc(doc(db, "users", user.uid), {
      roles: updatedRoles,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleUpdateSection = async (userId: string, sectionId: string) => {
    await updateDoc(doc(db, "users", userId), {
      sectionId,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleUpdateStatus = async (userId: string, status: string) => {
    await updateDoc(doc(db, "users", userId), {
      onboardingStatus: status,
      status: status,
      updatedAt: new Date().toISOString(),
    });
  };

  const filteredUsers = users.filter((u) => {
    const name = u.displayName || "";
    const email = u.email || "";
    const query = searchQuery.toLowerCase();
    return name.toLowerCase().includes(query) || email.toLowerCase().includes(query);
  });

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <UserCog className="text-yellow-400 w-6 h-6" /> User & Role Management Studio
          </h1>
          <p className="text-slate-400 text-sm">
            Assign studio permissions, adjust section assignments, and verify member onboarding status.
          </p>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white"
          />
        </div>
      </div>

      <div className="space-y-4">
        {filteredUsers.map((member) => (
          <div
            key={member.uid}
            className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 hover:border-slate-700 transition"
          >
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <div className="font-bold text-base text-white flex items-center gap-2">
                  {member.displayName || "Unnamed Performer"}
                  <span className="text-xs font-mono text-slate-400 font-normal">({member.email})</span>
                </div>
                <div className="text-[11px] font-mono text-slate-500">UID: {member.uid}</div>
              </div>

              <div className="flex items-center gap-3">
                <select
                  value={member.sectionId || ""}
                  onChange={(e) => handleUpdateSection(member.uid, e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-xs text-white"
                >
                  <option value="">-- No Section --</option>
                  {sections.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>

                <select
                  value={member.onboardingStatus || member.status || "pending"}
                  onChange={(e) => handleUpdateStatus(member.uid, e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-xs text-white"
                >
                  <option value="pending">Pending</option>
                  <option value="profile_created">Profile Created</option>
                  <option value="completed">Completed</option>
                  <option value="active">Active</option>
                </select>
              </div>
            </div>

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
                      onClick={() => handleToggleRole(member, role)}
                      className={`px-2.5 py-1 rounded text-[11px] font-semibold transition border flex items-center gap-1 ${
                        hasRoleActive
                          ? "bg-yellow-400 text-slate-950 border-yellow-400 font-bold"
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
        ))}
      </div>
    </div>
  );
}