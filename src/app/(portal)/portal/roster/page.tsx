"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import PortalBreadcrumb from "@/components/portal/PortalBreadcrumb";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/lib/context/AuthContext";
import { Section, SectionSchema } from "@/lib/schema/section";
import {
  Users,
  Search,
  Mail,
  Phone,
  Shield,
  Music,
  BadgeCheck,
  EyeOff,
  ShieldCheck,
} from "lucide-react";

type MemberRecord = {
  uid: string;
  email: string;
  displayName?: string;
  roles?: string[];
  sectionId?: string;
  instruments?: string[];
  phone?: string;
  hideEmailInRoster?: boolean;
  hidePhoneInRoster?: boolean;
  onboardingStatus?: string;
  status?: string;
  [key: string]: unknown;
};

export default function MemberRosterPage() {
  const { profile, loading: authLoading } = useAuth();
  const [users, setUsers] = useState<MemberRecord[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSection, setSelectedSection] = useState<string>("all");

  useEffect(() => {
    const unsubUsers = onSnapshot(collection(db, "users"), (snap) => {
      const list: MemberRecord[] = [];
      snap.forEach((d) => {
        const raw = d.data() as MemberRecord;
        list.push({
          uid: raw.uid || d.id,
          email: raw.email || "",
          displayName: raw.displayName || "",
          roles: Array.isArray(raw.roles) ? raw.roles : [],
          sectionId: raw.sectionId || "",
          instruments: Array.isArray(raw.instruments) ? raw.instruments : [],
          phone: typeof raw.phone === "string" ? raw.phone : undefined,
          hideEmailInRoster: Boolean(raw.hideEmailInRoster),
          hidePhoneInRoster: Boolean(raw.hidePhoneInRoster),
          onboardingStatus:
            typeof raw.onboardingStatus === "string"
              ? raw.onboardingStatus
              : undefined,
          status: typeof raw.status === "string" ? raw.status : undefined,
        });
      });
      list.sort((a, b) =>
        (a.displayName || "").localeCompare(b.displayName || ""),
      );
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

  if (authLoading)
    return <div className="p-8 text-slate-400">Loading band directory...</div>;
  if (!profile)
    return (
      <div className="p-8 text-slate-400">
        Please sign in to access the member roster.
      </div>
    );

  const sectionMap = new Map(sections.map((s) => [s.id, s.name]));

  const isLeaderViewer = Boolean(
    profile && (
      profile.roles?.some((r) =>
        ["admin", "gig_manager", "section_leader", "membership_manager"].includes(r)
      )
    )
  );

  const filteredUsers = users.filter((u) => {
    const name = u.displayName || "";
    const email = u.email || "";
    const instruments = u.instruments || [];
    const query = searchQuery.toLowerCase().trim();

    const matchesSection =
      selectedSection === "all" || u.sectionId === selectedSection;

    if (!query) {
      return matchesSection;
    }

    const isSelf = profile.uid === u.uid;
    const canSearchContact = isLeaderViewer || isSelf;

    const matchesName = name.toLowerCase().includes(query);
    const matchesEmail = (!u.hideEmailInRoster || canSearchContact) && email.toLowerCase().includes(query);
    const matchesPhone = Boolean(u.phone) && (!u.hidePhoneInRoster || canSearchContact) && (u.phone?.toLowerCase().includes(query) ?? false);
    const matchesInstruments = instruments.some((inst) => inst.toLowerCase().includes(query));

    const matchesSearch = matchesName || matchesEmail || matchesPhone || matchesInstruments;

    return matchesSearch && matchesSection;
  });

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-5">
        <div>
          <PortalBreadcrumb className="mb-2" />
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Users className="text-yellow-400 w-6 h-6" /> Band Roster Directory
          </h1>
          <p className="text-slate-400 text-sm">
            Contact information, instrument parts, and section affiliations for
            Eagleburger performers.
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
            const sectionName = member.sectionId
              ? sectionMap.get(member.sectionId)
              : "Unassigned";
            const isVerified =
              member.onboardingStatus === "completed" ||
              member.status === "active";
            const memberInstruments = member.instruments || [];
            const isSelf = profile.uid === member.uid;
            const canViewPrivateDetails = isLeaderViewer || isSelf;

            return (
              <div
                key={member.uid}
                className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition flex flex-col justify-between space-y-4 shadow"
              >
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-bold text-base text-white flex items-center gap-1.5">
                        {member.displayName || "Unnamed Performer"}
                        {member.roles?.includes("admin") && (
                          <span title="Band Administrator">
                            <Shield className="w-3.5 h-3.5 text-yellow-400" />
                          </span>
                        )}
                        {(member.hideEmailInRoster || member.hidePhoneInRoster) && (
                          <span
                            title="Member has privacy enabled for contact details in directory"
                            className="text-slate-500"
                          >
                            <EyeOff className="w-3 h-3 text-slate-500" />
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] font-mono text-yellow-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800 inline-block mt-1">
                        {sectionName}
                      </span>
                    </div>

                    {isVerified ? (
                      <span title="Active Verified Member">
                        <BadgeCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                      </span>
                    ) : (
                      <span className="text-[10px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 uppercase font-semibold">
                        Pending
                      </span>
                    )}
                  </div>

                  {/* Instruments */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {memberInstruments.length > 0 ? (
                      memberInstruments.map((inst, idx) => (
                        <span
                          key={idx}
                          className="bg-slate-950 text-slate-300 text-[11px] px-2 py-0.5 rounded border border-slate-800 flex items-center gap-1"
                        >
                          <Music className="w-3 h-3 text-slate-500" />
                          {inst}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-slate-600 italic">
                        No instruments listed
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5 pt-3 border-t border-slate-800 text-xs text-slate-400 font-mono">
                  {/* Email row */}
                  {member.hideEmailInRoster && !canViewPrivateDetails ? (
                    <div className="flex items-center gap-2 text-slate-500 italic">
                      <Mail className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                      <span className="flex items-center gap-1 font-sans text-[11px]">
                        <span>Email Private</span>
                        <EyeOff className="w-3 h-3 text-slate-600" />
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-1.5">
                      <div className="flex items-center gap-2 truncate">
                        <Mail className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <a
                          href={`mailto:${member.email}`}
                          className="hover:text-yellow-400 transition truncate"
                        >
                          {member.email}
                        </a>
                      </div>
                      {member.hideEmailInRoster && canViewPrivateDetails && (
                        <span
                          title="This member set their email as private in the directory. Visible to you as leadership/self."
                          className="text-[9px] font-sans font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded shrink-0 flex items-center gap-1"
                        >
                          <EyeOff className="w-2.5 h-2.5" />
                          <span>Private</span>
                        </span>
                      )}
                    </div>
                  )}

                  {/* Phone row */}
                  {member.phone && (
                    member.hidePhoneInRoster && !canViewPrivateDetails ? (
                      <div className="flex items-center gap-2 text-slate-500 italic">
                        <Phone className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                        <span className="flex items-center gap-1 font-sans text-[11px]">
                          <span>Phone Private</span>
                          <EyeOff className="w-3 h-3 text-slate-600" />
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-1.5">
                        <div className="flex items-center gap-2">
                          <Phone className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <a href={`tel:${member.phone}`} className="hover:text-yellow-400 transition">
                            {member.phone}
                          </a>
                        </div>
                        {member.hidePhoneInRoster && canViewPrivateDetails && (
                          <span
                            title="This member set their phone as private in the directory. Visible to you as leadership/self."
                            className="text-[9px] font-sans font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded shrink-0 flex items-center gap-1"
                          >
                            <EyeOff className="w-2.5 h-2.5" />
                            <span>Private</span>
                          </span>
                        )}
                      </div>
                    )
                  )}

                  {/* Self Quick Link to Profile */}
                  {isSelf && (
                    <div className="pt-1 flex items-center justify-end">
                      <Link
                        href="/portal/profile"
                        className="text-[10px] text-amber-400/80 hover:text-amber-300 font-sans flex items-center gap-1 transition"
                      >
                        <ShieldCheck className="w-3 h-3" />
                        <span>Edit My Privacy</span>
                      </Link>
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
