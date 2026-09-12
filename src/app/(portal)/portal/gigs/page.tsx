"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  collection,
  onSnapshot,
  getDocs,
  doc,
  setDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/lib/context/AuthContext";
import PortalMonthCalendar, { MonthCalendarGig } from "@/components/portal/PortalMonthCalendar";
import CalendarSubscribeModal from "@/components/portal/CalendarSubscribeModal";
import { AttendanceStatus } from "@/components/portal/PortalDayEventsModal";
import {
  Calendar,
  CalendarDays,
  List,
  MapPin,
  Clock,
  ArrowRight,
  Users,
  PlaySquare,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Check,
  Filter,
} from "lucide-react";

type GigItem = MonthCalendarGig & {
  publicDetails?: {
    title: string;
    venue: string;
    venueAddress?: string;
    description?: string;
  };
  internalLogistics?: {
    title: string;
    callTime: string;
    downbeat: string;
    attire: string;
    unloadingAddress: string;
    notes?: string;
    payPerMusician?: number;
    compensation?: number;
  };
  rsvpSummary?: {
    attendingCount: number;
    declinedCount: number;
  };
};

export default function PortalGigsListPage() {
  const { profile } = useAuth();
  const [gigs, setGigs] = useState<GigItem[]>([]);
  const [userRsvps, setUserRsvps] = useState<Record<string, AttendanceStatus>>({});
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [filterType, setFilterType] = useState<"all" | "upcoming" | "past">("upcoming");
  const [isUpdatingRsvp, setIsUpdatingRsvp] = useState(false);
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "gigs"), (snap) => {
      const list: GigItem[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as GigItem);
      });
      // Sort by date ascending (soonest first)
      list.sort((a, b) => (a.date || "").localeCompare(b.date || ""));
      setGigs(list);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  // Fetch logged-in user's personal RSVPs
  useEffect(() => {
    if (!profile) return;

    const fetchUserRsvps = async () => {
      const map: Record<string, AttendanceStatus> = {};
      for (const gig of gigs) {
        try {
          const rsvpDocSnap = await getDocs(collection(db, "gigs", gig.id, "rsvps"));
          rsvpDocSnap.forEach((docSnap) => {
            if (docSnap.id === profile.uid) {
              map[gig.id] = (docSnap.data().status as AttendanceStatus) || "tentative";
            }
          });
        } catch (err) {
          console.error("Error fetching user rsvp for gig", gig.id, err);
        }
      }
      setUserRsvps(map);
    };

    if (gigs.length > 0) {
      fetchUserRsvps();
    }
  }, [gigs, profile]);

  // Handle in-line and calendar modal RSVP changes
  const handleRsvpChange = async (gigId: string, status: AttendanceStatus) => {
    if (!profile?.uid || !gigId) return;
    setIsUpdatingRsvp(true);

    // Optimistic update
    setUserRsvps((prev) => ({ ...prev, [gigId]: status }));

    try {
      const rsvpRef = doc(db, "gigs", gigId, "rsvps", profile.uid);
      await setDoc(
        rsvpRef,
        {
          uid: profile.uid,
          displayName: profile.displayName || "Musician",
          email: profile.email,
          sectionId: profile.sectionId || "unassigned",
          status,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    } catch (err) {
      console.error("Failed to update RSVP:", err);
      alert("Could not update RSVP. Please try again.");
    } finally {
      setIsUpdatingRsvp(false);
    }
  };

  const todayStr = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }, []);

  // Filtered gigs for list view
  const filteredGigs = useMemo(() => {
    if (filterType === "upcoming") {
      return gigs.filter((g) => g.status !== "cancelled" && g.date >= todayStr);
    }
    if (filterType === "past") {
      return gigs.filter((g) => g.status === "completed" || g.date < todayStr);
    }
    return gigs;
  }, [gigs, filterType, todayStr]);

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-400 flex items-center justify-center min-h-[50vh]">
        <div className="space-y-2">
          <div className="w-8 h-8 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-mono">Loading band performance schedule...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      {/* Page Header */}
      <div
        suppressHydrationWarning
        style={{
          backgroundColor: "var(--ebb-surface)",
          borderColor: "var(--ebb-border)",
        }}
        className="border rounded-2xl p-5 sm:p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-xl transition-colors"
      >
        <div>
          <div className="flex items-center gap-2">
            <span
              suppressHydrationWarning
              style={{
                backgroundColor: "var(--ebb-surface-muted)",
                borderColor: "var(--ebb-border)",
                color: "var(--ebb-primary)",
              }}
              className="text-xs font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded border"
            >
              Master Schedule
            </span>
            <span className="text-xs font-mono text-slate-400">
              {gigs.length} Total Performances
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-1 flex items-center gap-2">
            <Calendar className="text-yellow-400 w-6 h-6" /> Band Performance Schedule
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Select an upcoming performance to view call sheets, downbeats, attire, and submit your RSVP.
          </p>
        </div>

        {/* Controls: Feed Sync & View Mode Tab Selector */}
        <div className="flex flex-wrap items-center gap-2 shrink-0 self-stretch sm:self-auto">
          <button
            type="button"
            onClick={() => setIsCalendarModalOpen(true)}
            suppressHydrationWarning
            style={{
              backgroundColor: "var(--ebb-surface-muted)",
              borderColor: "var(--ebb-border)",
            }}
            className="text-slate-300 hover:text-white border px-3.5 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition shadow-sm flex-1 sm:flex-initial"
            title="Subscribe to iCal / Google / Apple Calendar feed"
          >
            <Calendar className="w-3.5 h-3.5 text-yellow-400" />
            <span>Sync Feed</span>
          </button>

          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-black/40 border border-white/10 flex-1 sm:flex-initial">
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`flex-1 sm:flex-initial px-3.5 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition ${
                viewMode === "list"
                  ? "bg-yellow-400 text-slate-950 shadow"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <List className="w-4 h-4" />
              <span>List View</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode("calendar")}
              className={`flex-1 sm:flex-initial px-3.5 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition ${
                viewMode === "calendar"
                  ? "bg-yellow-400 text-slate-950 shadow"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <CalendarDays className="w-4 h-4" />
              <span>Calendar View</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {viewMode === "calendar" ? (
        // Calendar View Tab
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between px-1">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-yellow-400" />
                <span>Monthly Performance Grid</span>
              </h2>
              <p className="text-xs text-slate-400">
                Click any performance day to inspect venue logistics and update your RSVP.
              </p>
            </div>
          </div>

          <PortalMonthCalendar
            gigs={gigs}
            userRsvps={userRsvps}
            onRsvpChange={handleRsvpChange}
            isUpdatingRsvp={isUpdatingRsvp}
            variant="expanded"
          />
        </div>
      ) : (
        // List View Tab
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* List Sub-filter bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-slate-500" />
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setFilterType("upcoming")}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                    filterType === "upcoming"
                      ? "bg-white/10 text-white font-bold"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Upcoming Gigs
                </button>
                <button
                  type="button"
                  onClick={() => setFilterType("all")}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                    filterType === "all"
                      ? "bg-white/10 text-white font-bold"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  All Gigs ({gigs.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterType("past")}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                    filterType === "past"
                      ? "bg-white/10 text-white font-bold"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Past Shows
                </button>
              </div>
            </div>

            <span className="text-xs font-mono text-slate-500">
              Showing {filteredGigs.length} {filteredGigs.length === 1 ? "performance" : "performances"}
            </span>
          </div>

          {/* Gigs List */}
          <div className="space-y-3">
            {filteredGigs.length === 0 ? (
              <div
                suppressHydrationWarning
                style={{
                  backgroundColor: "var(--ebb-surface)",
                  borderColor: "var(--ebb-border)",
                }}
                className="border rounded-2xl p-8 text-center text-slate-400 text-xs shadow"
              >
                No performances match the selected filter.
              </div>
            ) : (
              filteredGigs.map((g) => {
                const title =
                  g.internalLogistics?.title || g.publicDetails?.title || "Untitled Performance";
                const venue =
                  g.publicDetails?.venue || g.internalLogistics?.unloadingAddress || "Pittsburgh, PA";
                const callTime = g.internalLogistics?.callTime || "TBD";
                const downbeat = g.internalLogistics?.downbeat || "TBD";
                const myRsvp = userRsvps[g.id];
                const isCancelled = g.status === "cancelled";

                return (
                  <div
                    key={g.id}
                    suppressHydrationWarning
                    style={{
                      backgroundColor: "var(--ebb-surface)",
                      borderColor: "var(--ebb-border)",
                    }}
                    className="border rounded-2xl p-4 sm:p-5 transition flex flex-col space-y-3 group shadow hover:brightness-105"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            suppressHydrationWarning
                            style={{
                              backgroundColor: "var(--ebb-surface-muted)",
                              borderColor: "var(--ebb-border)",
                              color: "var(--ebb-primary)",
                            }}
                            className="text-xs font-mono font-bold px-2 py-0.5 rounded border"
                          >
                            {g.date}
                          </span>
                          <span className="font-bold text-white text-base sm:text-lg truncate">
                            {title}
                          </span>
                          <span className="text-[10px] font-mono uppercase bg-slate-950 px-2 py-0.5 rounded border border-slate-800 text-yellow-400">
                            {g.status}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-400">
                          <span className="flex items-center gap-1 font-mono text-slate-300">
                            <Clock className="w-3.5 h-3.5 text-yellow-400" />
                            Call: <strong className="text-white">{callTime}</strong>
                            {downbeat !== "TBD" && (
                              <>
                                <span className="text-slate-600">|</span>
                                Downbeat: <strong className="text-white">{downbeat}</strong>
                              </>
                            )}
                          </span>
                          <span className="flex items-center gap-1 truncate">
                            <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                            <span className="truncate">{venue}</span>
                          </span>
                        </div>
                      </div>

                      {/* Right Action Cluster */}
                      <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-auto">
                        {g.rsvpSummary && (
                          <div className="hidden sm:flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-xl border border-emerald-500/20 font-mono">
                            <Users className="w-3.5 h-3.5" />
                            <span>{g.rsvpSummary.attendingCount || 0} In</span>
                          </div>
                        )}

                        {!isCancelled && (
                          <Link
                            href={`/portal/perform/${g.id}`}
                            className="bg-slate-950 hover:bg-slate-800 text-yellow-400 border border-slate-800 hover:border-yellow-400/40 px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1 transition"
                            title="Launch Stage Teleprompter"
                          >
                            <PlaySquare className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Stage View</span>
                          </Link>
                        )}

                        <Link
                          href={`/portal/gigs/${g.id}`}
                          className="bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold px-3.5 py-2 rounded-xl text-xs transition flex items-center gap-1.5 shadow"
                        >
                          <span>Call Sheet</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>

                    {/* Quick In-line RSVP selector */}
                    {!isCancelled && (
                      <div className="pt-2 border-t border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-400 text-[11px] font-mono">My RSVP:</span>
                          {myRsvp === "attending" && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-lg">
                              <CheckCircle2 className="w-3 h-3" /> Confirmed In
                            </span>
                          )}
                          {myRsvp === "declined" && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-lg">
                              <XCircle className="w-3 h-3" /> Out
                            </span>
                          )}
                          {myRsvp === "tentative" && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-lg">
                              <HelpCircle className="w-3 h-3" /> Tentative
                            </span>
                          )}
                          {!myRsvp && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-lg">
                              RSVP Needed
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            disabled={isUpdatingRsvp}
                            onClick={() => handleRsvpChange(g.id, "attending")}
                            className={`px-2 py-1 rounded-lg text-[11px] font-bold transition flex items-center gap-1 ${
                              myRsvp === "attending"
                                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                                : "bg-white/5 hover:bg-emerald-500/10 text-slate-400 hover:text-emerald-300"
                            }`}
                          >
                            <Check className="w-3 h-3 text-emerald-400" /> In
                          </button>
                          <button
                            type="button"
                            disabled={isUpdatingRsvp}
                            onClick={() => handleRsvpChange(g.id, "tentative")}
                            className={`px-2 py-1 rounded-lg text-[11px] font-bold transition flex items-center gap-1 ${
                              myRsvp === "tentative"
                                ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                                : "bg-white/5 hover:bg-amber-500/10 text-slate-400 hover:text-amber-300"
                            }`}
                          >
                            <HelpCircle className="w-3 h-3 text-amber-400" /> Maybe
                          </button>
                          <button
                            type="button"
                            disabled={isUpdatingRsvp}
                            onClick={() => handleRsvpChange(g.id, "declined")}
                            className={`px-2 py-1 rounded-lg text-[11px] font-bold transition flex items-center gap-1 ${
                              myRsvp === "declined"
                                ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                                : "bg-white/5 hover:bg-rose-500/10 text-slate-400 hover:text-rose-300"
                            }`}
                          >
                            <XCircle className="w-3 h-3 text-rose-400" /> Out
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Calendar Subscription Feed Modal */}
      <CalendarSubscribeModal
        isOpen={isCalendarModalOpen}
        onClose={() => setIsCalendarModalOpen(false)}
      />
    </div>
  );
}