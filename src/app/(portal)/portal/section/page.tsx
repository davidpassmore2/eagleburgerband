"use client";

import React, { useEffect, useState } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/lib/context/AuthContext";
import { isSectionLeader } from "@/lib/auth/permissions";
import { Gig, GigSchema } from "@/lib/schema/gig";
import { Section, SectionSchema } from "@/lib/schema/section";
import { User, UserSchema } from "@/lib/schema/user";
import { CalendarCheck, ShieldAlert, CheckCircle2, HelpCircle, XCircle } from "lucide-react";

interface MemberRsvpRecord {
  user: User;
  status: "attending" | "tentative" | "declined" | "pending";
}

export default function SectionAttendancePage() {
  const { profile, loading: authLoading } = useAuth();
  const [sections, setSections] = useState<Section[]>([]);
  const [selectedSectionId, setSelectedSectionId] = useState<string>("");
  const [upcomingGigs, setUpcomingGigs] = useState<Gig[]>([]);
  const [selectedGigId, setSelectedGigId] = useState<string>("");
  const [rosterStatus, setRosterStatus] = useState<MemberRsvpRecord[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    async function initData() {
      try {
        const sectionsSnap = await getDocs(collection(db, "sections"));
        const secList: Section[] = [];
        sectionsSnap.forEach((d) => {
          const parsed = SectionSchema.safeParse(d.data());
          if (parsed.success) secList.push(parsed.data);
        });
        secList.sort((a, b) => a.order - b.order);
        setSections(secList);

        const defaultSec = profile?.sectionId || secList[0]?.id || "";
        setSelectedSectionId(defaultSec);

        const today = new Date().toISOString().split("T")[0];
        const gigsQ = query(collection(db, "gigs"), where("date", ">=", today));
        const gigsSnap = await getDocs(gigsQ);
        const gList: Gig[] = [];
        gigsSnap.forEach((d) => {
          const parsed = GigSchema.safeParse(d.data());
          if (parsed.success) gList.push(parsed.data);
        });
        gList.sort((a, b) => a.date.localeCompare(b.date));
        setUpcomingGigs(gList);

        if (gList.length > 0) {
          setSelectedGigId(gList[0].id);
        }
      } catch (err) {
        console.error("Failed to load section attendance dependencies:", err);
      } finally {
        setLoadingData(false);
      }
    }

    initData();
  }, [profile]);

  useEffect(() => {
    async function resolveSectionRsvp() {
      if (!selectedSectionId || !selectedGigId) return;

      const usersSnap = await getDocs(collection(db, "users"));
      const sectionMembers: User[] = [];
      usersSnap.forEach((d) => {
        const parsed = UserSchema.safeParse(d.data());
        if (parsed.success && parsed.data.sectionId === selectedSectionId) {
          sectionMembers.push(parsed.data);
        }
      });

      const rsvpsSnap = await getDocs(collection(db, `gigs/${selectedGigId}/rsvps`));
      const rsvpMap = new Map<string, "attending" | "tentative" | "declined">();
      rsvpsSnap.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.status) {
          rsvpMap.set(docSnap.id, data.status);
        }
      });

      const records: MemberRsvpRecord[] = sectionMembers.map((u) => ({
        user: u,
        status: rsvpMap.get(u.uid) || "pending",
      }));

      setRosterStatus(records);
    }

    resolveSectionRsvp();
  }, [selectedSectionId, selectedGigId]);

  if (authLoading || loadingData) {
    return <div className="p-8 text-slate-400">Loading section attendance matrix...</div>;
  }

  if (!isSectionLeader(profile, selectedSectionId)) {
    return (
      <div className="p-8 text-amber-400 flex items-center gap-3">
        <ShieldAlert className="w-6 h-6" />
        <span>Section Leader clearance required for attendance monitoring.</span>
      </div>
    );
  }

  const attendingCount = rosterStatus.filter((r) => r.status === "attending").length;
  const tentativeCount = rosterStatus.filter((r) => r.status === "tentative").length;
  const declinedCount = rosterStatus.filter((r) => r.status === "declined").length;
  const pendingCount = rosterStatus.filter((r) => r.status === "pending").length;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <CalendarCheck className="text-yellow-400" /> Section Attendance Matrix
          </h1>
          <p className="text-slate-400 text-sm">
            Monitor real-time downbeat headcount and instrument coverage for upcoming calls.
          </p>
        </div>

        {/* Selectors */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedSectionId}
            onChange={(e) => setSelectedSectionId(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-xs text-white"
          >
            {sections.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          <select
            value={selectedGigId}
            onChange={(e) => setSelectedGigId(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-xs text-white font-mono"
          >
            {upcomingGigs.map((g) => (
              <option key={g.id} value={g.id}>
                {g.date} - {g.internalLogistics.title || g.publicDetails.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Headcount Stat Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center gap-3">
          <CheckCircle2 className="w-8 h-8 text-emerald-400" />
          <div>
            <div className="text-2xl font-black text-white">{attendingCount}</div>
            <div className="text-[11px] text-slate-400 uppercase font-semibold">Attending</div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center gap-3">
          <HelpCircle className="w-8 h-8 text-amber-400" />
          <div>
            <div className="text-2xl font-black text-white">{tentativeCount}</div>
            <div className="text-[11px] text-slate-400 uppercase font-semibold">Tentative</div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center gap-3">
          <XCircle className="w-8 h-8 text-rose-400" />
          <div>
            <div className="text-2xl font-black text-white">{declinedCount}</div>
            <div className="text-[11px] text-slate-400 uppercase font-semibold">Declined</div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-dashed border-slate-600 flex items-center justify-center font-black text-slate-400 text-xs">
            ?
          </div>
          <div>
            <div className="text-2xl font-black text-white">{pendingCount}</div>
            <div className="text-[11px] text-slate-400 uppercase font-semibold">Pending RSVP</div>
          </div>
        </div>
      </div>

      {/* Section Roster Breakdown */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
            <tr>
              <th className="p-4">Performer</th>
              <th className="p-4">Primary Instruments</th>
              <th className="p-4">RSVP Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {rosterStatus.length === 0 ? (
              <tr>
                <td colSpan={3} className="p-6 text-center text-slate-500">
                  No musicians currently assigned to this section.
                </td>
              </tr>
            ) : (
              rosterStatus.map((record) => {
                const badgeStyles: Record<string, string> = {
                  attending: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
                  tentative: "bg-amber-500/10 text-amber-400 border-amber-500/20",
                  declined: "bg-rose-500/10 text-rose-400 border-rose-500/20",
                  pending: "bg-slate-800 text-slate-400 border-slate-700",
                };

                return (
                  <tr key={record.user.uid} className="hover:bg-slate-800/30 transition">
                    <td className="p-4 font-bold text-white">
                      {record.user.displayName}
                    </td>
                    <td className="p-4 text-slate-400 font-mono text-[11px]">
                      {record.user.instruments?.join(", ") || "Ensemble Performer"}
                    </td>
                    <td className="p-4">
                      <span
                        className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider border ${
                          badgeStyles[record.status]
                        }`}
                      >
                        {record.status}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}