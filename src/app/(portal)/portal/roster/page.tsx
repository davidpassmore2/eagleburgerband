"use client";

import React, { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/lib/context/AuthContext";
import { User, UserSchema } from "@/lib/schema/user";
import { Section, SectionSchema } from "@/lib/schema/section";
import { 
  Users, 
  Search, 
  Mail, 
  Phone, 
  Shield, 
  Music, 
  BadgeCheck 
} from "lucide-react";

export default function MemberRosterPage() {
  const { profile, loading: authLoading } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSection, setSelectedSection] = useState<string>("all");

  useEffect(() => {
    const unsubUsers = onSnapshot(collection(db, "users"), (snap) => {
      const list: User[] = [];
      snap.forEach((d) => {
        const parsed = UserSchema.safeParse(d.data());
        if (parsed.success) list.push(parsed.data);
      });
      list.sort((a, b) => a.displayName.localeCompare(b.displayName));
      setUsers(list);
    });

    const unsubSections = onSnapshot(collection(db, "sections"), (snap) => {
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
      unsubSections();
    };
  }, []);

  if (authLoading) return <div className="p-8 text-slate-400">Loading band directory...</div>;
  if (!profile) return <div className="p-8 text-slate-400">Please sign in to access the member roster.</div>;

  const sectionMap = new Map(sections.map((s) => [s.id, s.name]));

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.instruments?.some((inst) => inst.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesSection = selectedSection === "all" || u.sectionId === selectedSection;

    return matchesSearch && matchesSection;
  });

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Users className="text-yellow-400 w-6 h-6" /> Band Roster Directory
          </h1>
          <p className="text-slate-400 text-sm">
            Contact information, instrument parts, and section affiliations for Eagleburger performers.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search member or instrument..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500"
            />
          </div>

          <select
            value={selectedSection}
            onChange={(e) => setSelectedSection(e.target.value)}
            className="w-full sm:w-auto bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
          >
            <option value="all">All Sections ({users.length})</option>
            {sections.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredUsers.length === 0 ? (
          <div className="col-span-full bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-500 text-sm">
            No performers found matching search criteria.
          </div>
        ) : (
          filteredUsers.map((member) => {
            const sectionName = member.sectionId ? sectionMap.get(member.sectionId) : "Unassigned";

            return (
              <div
                key={member.uid}
                className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition flex flex-col justify-between space-y-4 shadow"
              >
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-bold text-base text-white flex items-center gap-1.5">
                        {member.displayName}
                        {member.roles.includes("admin") && (
                          <Shield className="w-3.5 h-3.5 text-yellow-400" title="Band Administrator" />
                        )}
                      </div>
                      <span className="text-[11px] font-mono text-yellow-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800 inline-block mt-1">
                        {sectionName}
                      </span>
                    </div>

                    {member.onboardingStatus === "completed" ? (
                      <BadgeCheck className="w-4 h-4 text-emerald-400 shrink-0" title="Active Verified Member" />
                    ) : (
                      <span className="text-[10px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 uppercase font-semibold">
                        Pending
                      </span>
                    )}
                  </div>

                  {/* Instruments */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {member.instruments && member.instruments.length > 0 ? (
                      member.instruments.map((inst, idx) => (
                        <span
                          key={idx}
                          className="bg-slate-950 text-slate-300 text-[11px] px-2 py-0.5 rounded border border-slate-800 flex items-center gap-1"
                        >
                          <Music className="w-3 h-3 text-slate-500" />
                          {inst}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-slate-600 italic">No instruments listed</span>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5 pt-3 border-t border-slate-800 text-xs text-slate-400 font-mono">
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-slate-500" />
                    <a href={`mailto:${member.email}`} className="hover:text-yellow-400 transition truncate">
                      {member.email}
                    </a>
                  </div>
                  {member.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-slate-500" />
                      <span>{member.phone}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}