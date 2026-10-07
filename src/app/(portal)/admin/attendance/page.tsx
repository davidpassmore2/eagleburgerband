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
import { GigRsvpSchema, type GigRsvp } from "@/lib/schema/rsvp";
import { 
  Users, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Calendar, 
  ArrowRight, 
  Loader2, 
  Music,
  Search,
  X,
  ArrowUpDown,
  MapPin,
  Clock
} from "lucide-react";
import AccessDenied from "@/components/portal/AccessDenied";

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
  callTime?: string;
}

type MusicianRsvp = GigRsvp;

export default function SectionAttendanceAdminPage() {
  const { profile, loading: authLoading } = useAuth();
  const [sections, setSections] = useState<BandSection[]>([]);
  const [gigs, setGigs] = useState<GigSummary[]>([]);
  const [allRsvps, setAllRsvps] = useState<MusicianRsvp[]>([]);
  const [selectedGigId, setSelectedGigId] = useState<string>("");
  const [loading, setLoading] = useState(true);

  // Event List Search & Filter State
  const [eventSearch, setEventSearch] = useState("");
  const [eventFilter, setEventFilter] = useState<"all" | "upcoming" | "past">("all");
  const [sortAsc, setSortAsc] = useState(true);

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
            date: data.date || "TBD",
            status: data.status || "confirmed",
            title: data.publicDetails?.title || data.internalLogistics?.title || data.title || d.id,
            venue: data.publicDetails?.venue || data.venue || "TBD",
            callTime: data.internalLogistics?.callTime || data.callTime || data.schedule?.callTime || "",
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
          const parsed = GigRsvpSchema.safeParse({ gigId: selectedGigId, uid: d.id, ...d.data() });
          if (parsed.success) {
            rList.push(parsed.data);
          }
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

  // Filtered & Sorted Gigs for the right-hand column selector
  const filteredGigs = useMemo(() => {
    const todayStr = new Date().toISOString().split("T")[0];
    const q = eventSearch.toLowerCase().trim();

    const filtered = gigs.filter((g) => {
      if (q) {
        const matchesTitle = g.title.toLowerCase().includes(q);
        const matchesVenue = (g.venue || "").toLowerCase().includes(q);
        const matchesDate = g.date.toLowerCase().includes(q);
        if (!matchesTitle && !matchesVenue && !matchesDate) return false;
      }

      if (eventFilter === "upcoming") {
        if (g.date === "TBD") return true;
        return g.date >= todayStr;
      }
      if (eventFilter === "past") {
        if (g.date === "TBD") return false;
        return g.date < todayStr;
      }

      return true;
    });

    return filtered.slice().sort((a, b) => {
      const cmp = a.date.localeCompare(b.date);
      return sortAsc ? cmp : -cmp;
    });
  }, [gigs, eventSearch, eventFilter, sortAsc]);

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-400 gap-2 text-xs">
        <Loader2 className="w-4 h-4 animate-spin text-yellow-400" />
        Aggregating quorum statistics...
      </div>
    );
  }

  // Type-safe permission check
  const hasAccess = Boolean(profile) && (canManageGigs(profile) || canManageSections(profile));

  if (!hasAccess) {
    return (
      <AccessDenied 
        title="Leadership Access Required"
        message="Musician leadership privileges (Administrator, Section Leader, Gig Manager, or Membership Manager) required to view section attendance analytics." 
      />
    );
  }

  const selectedGig = gigs.find((g) => g.id === selectedGigId);
  const totalSections = sectionQuorumAnalysis.length;
  const metCount = sectionQuorumAnalysis.filter((s) => s.status === "met").length;
  const warningCount = sectionQuorumAnalysis.filter((s) => s.status === "warning").length;
  const criticalCount = sectionQuorumAnalysis.filter((s) => s.status === "critical").length;

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
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

      {/* Main Studio Grid: Left 8 cols for Attendance Analytics, Right 4 cols for Vertical Event Selector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (8 cols): Active Gig Overview + KPI Summary + Section Breakdown */}
        <div className="lg:col-span-8 space-y-6">
          {/* Active Event Summary Header */}
          {selectedGig ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-yellow-400 bg-yellow-400/10 px-2 py-0.5 rounded border border-yellow-400/20">
                      Active Event
                    </span>
                    <span className="text-xs font-mono text-slate-400">{selectedGig.date}</span>
                    {selectedGig.status && (
                      <span className="text-[10px] font-mono uppercase text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                        {selectedGig.status}
                      </span>
                    )}
                  </div>
                  <h2 className="text-xl font-bold text-white">{selectedGig.title}</h2>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/portal/gigs/${selectedGig.id}`}
                    target="_blank"
                    className="text-xs text-slate-400 hover:text-yellow-400 flex items-center gap-1 transition"
                  >
                    <span>View Call Sheet</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 text-xs">
                <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
                  <span className="text-[10px] text-slate-500 uppercase block font-semibold">Venue</span>
                  <span className="font-semibold text-slate-200 truncate block mt-0.5">{selectedGig.venue || "TBD"}</span>
                </div>
                <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
                  <span className="text-[10px] text-slate-500 uppercase block font-semibold">Call Time</span>
                  <span className="font-semibold text-yellow-400 truncate block mt-0.5">{selectedGig.callTime || "TBD"}</span>
                </div>
                <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
                  <span className="text-[10px] text-slate-500 uppercase block font-semibold">Sections Met</span>
                  <span className="font-semibold text-emerald-400 truncate block mt-0.5">{metCount} of {totalSections}</span>
                </div>
                <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
                  <span className="text-[10px] text-slate-500 uppercase block font-semibold">Confirmed RSVPs</span>
                  <span className="font-semibold text-white truncate block mt-0.5">{allRsvps.filter(r => r.status === "attending").length} Musicians</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center text-slate-400 text-xs">
              No performance event selected. Choose an event from the list on the right.
            </div>
          )}

          {/* Overall Quorum Health Dashboard */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

        {/* Right Column (4 cols): Sticky Performance Events Selector Column */}
        <div className="lg:col-span-4 lg:sticky lg:top-4 space-y-3">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-yellow-400" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-white">
                  Performance Events
                </h2>
              </div>
              <span className="text-[10px] font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                {filteredGigs.length} {filteredGigs.length === 1 ? "Event" : "Events"}
              </span>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Search gigs or venues..."
                value={eventSearch}
                onChange={(e) => setEventSearch(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400 font-sans"
              />
              {eventSearch && (
                <button
                  type="button"
                  onClick={() => setEventSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter Tabs & Sort Toggle */}
            <div className="flex items-center justify-between gap-1 pt-0.5">
              <div className="inline-flex bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-[11px]">
                {(["all", "upcoming", "past"] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setEventFilter(tab)}
                    className={`px-2.5 py-1 rounded-md font-semibold capitalize transition ${
                      eventFilter === tab
                        ? "bg-yellow-400 text-slate-950 shadow-sm"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setSortAsc((prev) => !prev)}
                className="text-[11px] flex items-center gap-1 text-slate-400 hover:text-yellow-400 px-2 py-1 rounded-lg bg-slate-950 border border-slate-800 transition"
                title={`Sort by Date (${sortAsc ? "Oldest First" : "Newest First"})`}
              >
                <ArrowUpDown className="w-3 h-3" />
                <span className="font-mono text-[10px]">{sortAsc ? "Asc" : "Desc"}</span>
              </button>
            </div>

            {/* Vertical Scroll List */}
            <div className="space-y-2 overflow-y-auto max-h-[calc(100vh-320px)] min-h-[220px] pr-1 scrollbar-thin">
              {filteredGigs.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-500 italic bg-slate-950/40 rounded-xl border border-slate-800/50">
                  No performance events match the criteria.
                </div>
              ) : (
                filteredGigs.map((gig) => {
                  const isSelected = gig.id === selectedGigId;
                  return (
                    <button
                      key={gig.id}
                      type="button"
                      onClick={() => setSelectedGigId(gig.id)}
                      className={`w-full text-left p-3 rounded-xl border transition flex flex-col gap-1.5 ${
                        isSelected
                          ? "bg-slate-800 border-yellow-400 shadow-md ring-1 ring-yellow-400/40 text-white"
                          : "bg-slate-950/70 border-slate-800 hover:bg-slate-800/50 hover:border-slate-700 text-slate-300"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-[10px] font-mono font-bold ${isSelected ? "text-yellow-400" : "text-yellow-400/80"}`}>
                          {gig.date}
                        </span>
                        {gig.callTime && (
                          <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5 text-slate-500" />
                            {gig.callTime}
                          </span>
                        )}
                      </div>

                      <div className="font-bold text-xs leading-snug line-clamp-2">
                        {gig.title}
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-0.5">
                        <span className="truncate flex items-center gap-1 max-w-[190px]">
                          <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                          <span className="truncate">{gig.venue || "Venue TBD"}</span>
                        </span>

                        {isSelected && (
                          <span className="text-[9px] font-mono uppercase bg-yellow-400 text-slate-950 font-bold px-1.5 py-0.5 rounded shrink-0">
                            Selected
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}