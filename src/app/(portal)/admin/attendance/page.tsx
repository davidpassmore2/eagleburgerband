"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { 
  collection, 
  onSnapshot 
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/lib/context/AuthContext";
import { canManageGigs, canManageSections } from "@/lib/auth/permissions";
import { User } from "@/lib/schema/user";
import { 
  Users, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Calendar, 
  ArrowRight, 
  Loader2, 
  ShieldAlert, 
  Music
} from "lucide-react";

interface BandSection {
  id: string;
  name: string;
  order: number;
  minRecommended: number;
  leaderName?: string;
}

interface GigSummary {
  id: string;
  date: string;
  status: string;
  title: string;
  venue: string;
}

interface MusicianRsvp {
  gigId: string;
  uid: string;
  displayName: string;
  sectionId?: string;
  status: "attending" | "declined" | "tentative";
}

export default function SectionAttendanceAdminPage() {
  const { profile, loading: authLoading } = useAuth();
  const [sections, setSections] = useState<BandSection[]>([]);
  const [gigs, setGigs] = useState<GigSummary[]>([]);
  const [allRsvps, setAllRsvps] = useState<MusicianRsvp[]>([]);
  const [selectedGigId, setSelectedGigId] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    // 1. Fetch Sections
    const unsubSections = onSnapshot(
      collection(db, "sections"),
      (snap) => {
        const sList: BandSection[] = [];
        snap.forEach((d) => {
          sList.push({ id: d.id, ...d.data() } as BandSection);
        });
        sList.sort((a, b) => (a.order || 0) - (b.order || 0));
        setSections(sList);
      },
      (err) => console.error("Failed to load sections:", err)
    );

    // 2. Fetch Gigs (sort ascending by upcoming date)
    const unsubGigs = onSnapshot(
      collection(db, "gigs"),
      (snap) => {
        const gList: GigSummary[] = [];
        snap.forEach((d) => {
          const data = d.data();
          gList.push({
            id: d.id,
            date: data.date,
            status: data.status,
            title: data.publicDetails?.title || data.internalLogistics?.title || d.id,
            venue: data.publicDetails?.venue || "",
          });
        });
        gList.sort((a, b) => a.date.localeCompare(b.date));
        setGigs(gList);

        if (gList.length === 0) {
          setLoading(false);
        } else {
          setSelectedGigId((prev) => prev || gList[0].id);
        }
      },
      (err) => {
        console.error("Failed to load gigs:", err);
        setLoading(false);
      }
    );

    return () => {
      unsubSections();
      unsubGigs();
    };
  }, [authLoading]);

  // 3. Listen to RSVPs for the selected gig
  useEffect(() => {
    if (!selectedGigId) {
      return;
    }

    const unsubRsvps = onSnapshot(
      collection(db, "gigs", selectedGigId, "rsvps"),
      (snap) => {
        const rList: MusicianRsvp[] = [];
        snap.forEach((d) => {
          rList.push({ gigId: selectedGigId, ...d.data() } as MusicianRsvp);
        });
        setAllRsvps(rList);
        setLoading(false);
      },
      (err) => {
        console.warn("Error fetching gig RSVPs:", err);
        setLoading(false);
      }
    );

    return () => unsubRsvps();
  }, [selectedGigId]);

  // Calculate Section Breakdown for the selected Gig
  const sectionQuorumAnalysis = useMemo(() => {
    if (!selectedGigId) return [];

    return sections.map((sec) => {
      const confirmedMusicians = allRsvps.filter(
        (r) => r.sectionId === sec.id && r.status === "attending"
      );
      const tentativeMusicians = allRsvps.filter(
        (r) => r.sectionId === sec.id && r.status === "tentative"
      );
      const declinedMusicians = allRsvps.filter(
        (r) => r.sectionId === sec.id && r.status === "declined"
      );

      const min = sec.minRecommended || 1;
      const count = confirmedMusicians.length;
      let status: "met" | "warning" | "critical" = "critical";

      if (count >= min) {
        status = "met";
      } else if (count + tentativeMusicians.length >= min) {
        status = "warning";
      }

      return {
        section: sec,
        minRecommended: min,
        confirmed: confirmedMusicians,
        tentative: tentativeMusicians,
        declined: declinedMusicians,
        confirmedCount: count,
        deficit: Math.max(0, min - count),
        status,
      };
    });
  }, [sections, allRsvps, selectedGigId]);

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-400 gap-2 text-xs">
        <Loader2 className="w-4 h-4 animate-spin text-yellow-400" />
        Aggregating quorum statistics...
      </div>
    );
  }

  // Type-safe permission check
  const userProfile = profile as unknown as User;
  const hasAccess = 
    Boolean(userProfile) && (
      canManageGigs(userProfile) || 
      canManageSections(userProfile)
    );

  if (!hasAccess) {
    return (
      <div className="p-8 text-rose-400 text-xs font-semibold flex items-center gap-2">
        <ShieldAlert className="w-4 h-4" />
        Musician leadership privileges required to view section attendance analytics.
      </div>
    );
  }

  const selectedGig = gigs.find((g) => g.id === selectedGigId);
  const totalSections = sectionQuorumAnalysis.length;
  const metCount = sectionQuorumAnalysis.filter((s) => s.status === "met").length;
  const warningCount = sectionQuorumAnalysis.filter((s) => s.status === "warning").length;
  const criticalCount = sectionQuorumAnalysis.filter((s) => s.status === "critical").length;

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      {/* Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-yellow-400 bg-slate-950 px-2.5 py-0.5 rounded border border-slate-800">
              Admin Studio
            </span>
            <span className="text-xs font-mono text-slate-400">
              Quorum Analytics
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Section Attendance</h1>
          <p className="text-xs text-slate-400">
            Real-time acoustic readiness and musician quorum monitoring across the ensemble.
          </p>
        </div>

        {selectedGig && (
          <Link
            href={`/portal/gigs/${selectedGig.id}`}
            className="bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition shadow shrink-0"
          >
            <span>Open Call Sheet</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        )}
      </div>

      {/* Gig Picker Tabs */}
      <div className="space-y-2">
        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
          Select Performance Event
        </label>
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
          {gigs.map((gig) => {
            const isSelected = gig.id === selectedGigId;
            return (
              <button
                key={gig.id}
                type="button"
                onClick={() => setSelectedGigId(gig.id)}
                className={`text-xs px-3.5 py-2 rounded-xl font-bold transition flex items-center gap-2 border shrink-0 text-left ${
                  isSelected
                    ? "bg-slate-800 text-white border-yellow-400/80 shadow-md"
                    : "bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200"
                }`}
              >
                <Calendar className={`w-3.5 h-3.5 ${isSelected ? "text-yellow-400" : "text-slate-500"}`} />
                <div>
                  <div className="font-bold truncate max-w-[160px]">{gig.title}</div>
                  <div className="text-[10px] font-mono text-slate-500">{gig.date}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Overall Quorum Health Dashboard */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1 shadow">
          <span className="text-[11px] text-slate-400 uppercase font-semibold">Total Sections</span>
          <div className="text-2xl font-black text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-yellow-400" />
            {totalSections}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1 shadow">
          <span className="text-[11px] text-emerald-400 uppercase font-semibold">Quorum Met</span>
          <div className="text-2xl font-black text-emerald-400 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            {metCount}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1 shadow">
          <span className="text-[11px] text-yellow-400 uppercase font-semibold">Tentative Buffer</span>
          <div className="text-2xl font-black text-yellow-400 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-400" />
            {warningCount}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1 shadow">
          <span className="text-[11px] text-rose-400 uppercase font-semibold">Critical Deficit</span>
          <div className="text-2xl font-black text-rose-400 flex items-center gap-2">
            <XCircle className="w-5 h-5 text-rose-400" />
            {criticalCount}
          </div>
        </div>
      </div>

      {/* Section-by-Section Quorum Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sectionQuorumAnalysis.map((item) => (
          <div
            key={item.section.id}
            className={`bg-slate-900 border rounded-2xl p-5 space-y-4 shadow transition flex flex-col justify-between ${
              item.status === "met"
                ? "border-emerald-500/30"
                : item.status === "warning"
                ? "border-yellow-400/40"
                : "border-rose-500/40"
            }`}
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-bold text-white text-sm flex items-center gap-2">
                    <Music className="w-4 h-4 text-yellow-400 shrink-0" />
                    {item.section.name}
                  </h3>
                  <span className="text-[11px] text-slate-400">
                    Leader: {item.section.leaderName || "Unassigned"}
                  </span>
                </div>

                <span
                  className={`text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded border shrink-0 ${
                    item.status === "met"
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                      : item.status === "warning"
                      ? "bg-yellow-400/10 text-yellow-400 border-yellow-400/30"
                      : "bg-rose-500/10 text-rose-400 border-rose-500/30"
                  }`}
                >
                  {item.status === "met"
                    ? "Quorum Met"
                    : item.status === "warning"
                    ? "Pending Buffer"
                    : `Deficit (-${item.deficit})`}
                </span>
              </div>

              {/* Progress Quorum Bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] font-mono text-slate-400">
                  <span>Confirmed: {item.confirmedCount}</span>
                  <span>Required: {item.minRecommended}</span>
                </div>
                <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      item.status === "met"
                        ? "bg-emerald-400"
                        : item.status === "warning"
                        ? "bg-yellow-400"
                        : "bg-rose-500"
                    }`}
                    style={{
                      width: `${Math.min(100, (item.confirmedCount / item.minRecommended) * 100)}%`,
                    }}
                  />
                </div>
              </div>

              {/* Musician Name Lists */}
              <div className="space-y-2 pt-2 border-t border-slate-800/80 text-xs">
                {item.confirmed.length > 0 && (
                  <div>
                    <span className="text-[10px] uppercase font-bold text-emerald-400 block mb-0.5">
                      Confirmed ({item.confirmed.length})
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {item.confirmed.map((m) => (
                        <span
                          key={m.uid}
                          className="bg-slate-950 text-slate-300 px-2 py-0.5 rounded text-[11px] border border-slate-800"
                        >
                          {m.displayName}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {item.tentative.length > 0 && (
                  <div>
                    <span className="text-[10px] uppercase font-bold text-yellow-400 block mb-0.5">
                      Tentative ({item.tentative.length})
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {item.tentative.map((m) => (
                        <span
                          key={m.uid}
                          className="bg-slate-950 text-slate-400 px-2 py-0.5 rounded text-[11px] border border-slate-800"
                        >
                          {m.displayName}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {item.declined.length > 0 && (
                  <div>
                    <span className="text-[10px] uppercase font-bold text-rose-400 block mb-0.5">
                      Declined ({item.declined.length})
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {item.declined.map((m) => (
                        <span
                          key={m.uid}
                          className="bg-slate-950 text-slate-500 px-2 py-0.5 rounded text-[11px] border border-slate-800 line-through"
                        >
                          {m.displayName}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {item.confirmed.length === 0 && item.tentative.length === 0 && (
                  <div className="text-[11px] text-rose-400 italic">
                    No musicians confirmed yet for this section.
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}