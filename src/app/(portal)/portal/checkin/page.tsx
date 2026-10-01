"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  setDoc,
  doc,
  getDocs,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/lib/context/AuthContext";
import { canManageGigs, canManageSections, isAdmin } from "@/lib/auth/permissions";
import { User } from "@/lib/schema/user";
import {
  CheckInSchema,
  CheckInRecord,
  CheckInStatus,
} from "@/lib/schema/attendance";
import {
  CheckCircle2,
  Clock,
  MapPin,
  Calendar,
  Flame,
  Award,
  ArrowRight,
  Loader2,
  Users,
  ChevronRight,
  CheckCheck,
  XCircle,
  HelpCircle,
  Radio,
} from "lucide-react";

interface GigItem {
  id: string;
  date: string;
  status: string;
  publicDetails?: {
    title: string;
    venue: string;
  };
  internalLogistics?: {
    title: string;
    callTime: string;
    downbeat: string;
    unloadingAddress: string;
  };
}

export default function MemberSelfCheckInPage() {
  const { profile, firebaseUser, loading: authLoading } = useAuth();
  const currentUserId = firebaseUser?.uid || profile?.uid || "";
  const userProfile = profile as unknown as User;
  const isLeader = Boolean(
    userProfile && (canManageGigs(userProfile) || canManageSections(userProfile) || isAdmin(userProfile))
  );

  const [gigs, setGigs] = useState<GigItem[]>([]);
  const [userCheckIns, setUserCheckIns] = useState<Record<string, CheckInRecord>>({});
  const [loading, setLoading] = useState(true);
  const [checkingInId, setCheckingInId] = useState<string | null>(null);
  const [checkInSuccess, setCheckInSuccess] = useState<string | null>(null);

  // Subscribe to all gigs
  useEffect(() => {
    if (authLoading || !currentUserId) return;

    const q = query(collection(db, "gigs"), orderBy("date", "desc"));
    const unsubGigs = onSnapshot(
      q,
      async (snap) => {
        const gigList: GigItem[] = [];
        snap.forEach((d) => {
          gigList.push({ id: d.id, ...d.data() } as GigItem);
        });
        setGigs(gigList);

        // Fetch user's individual check-ins across these gigs
        const checkInMap: Record<string, CheckInRecord> = {};
        await Promise.all(
          gigList.map(async (gig) => {
            try {
              const checkInSnap = await getDocs(collection(db, "gigs", gig.id, "checkins"));
              checkInSnap.forEach((cDoc) => {
                if (cDoc.id === currentUserId) {
                  const parsed = CheckInSchema.safeParse({ id: cDoc.id, gigId: gig.id, ...cDoc.data() });
                  if (parsed.success) {
                    checkInMap[gig.id] = parsed.data;
                  }
                }
              });
            } catch (err) {
              console.warn(`Notice: checkin read note for ${gig.id}:`, err);
            }
          })
        );

        setUserCheckIns(checkInMap);
        setLoading(false);
      },
      (err) => {
        console.error("Error loading gigs for member check-in:", err);
        setLoading(false);
      }
    );

    return () => unsubGigs();
  }, [authLoading, currentUserId]);

  // Determine active/today's gig or nearest upcoming gig
  const activeGig = useMemo(() => {
    const todayStr = new Date().toISOString().split("T")[0];
    // Exact match for today
    const exactToday = gigs.find((g) => g.date === todayStr);
    if (exactToday) return exactToday;

    // Or the nearest upcoming gig (future date)
    const upcoming = gigs
      .filter((g) => g.date >= todayStr)
      .sort((a, b) => a.date.localeCompare(b.date));
    return upcoming[0] || gigs[0] || null;
  }, [gigs]);

  // Attendance metrics calculation
  const metrics = useMemo(() => {
    let attendedCount = 0;
    let lateCount = 0;
    let excusedCount = 0;
    let missedCount = 0;
    let currentStreak = 0;

    // Past gigs sorted chronologically
    const todayStr = new Date().toISOString().split("T")[0];
    const pastGigs = gigs
      .filter((g) => g.date <= todayStr)
      .sort((a, b) => b.date.localeCompare(a.date));

    let streakActive = true;

    pastGigs.forEach((gig) => {
      const record = userCheckIns[gig.id];
      if (record?.status === "checked_in") {
        attendedCount++;
        if (streakActive) currentStreak++;
      } else if (record?.status === "late") {
        lateCount++;
        if (streakActive) currentStreak++;
      } else if (record?.status === "excused") {
        excusedCount++;
        // Excused does not break streak
      } else {
        missedCount++;
        streakActive = false;
      }
    });

    const totalEvaluated = attendedCount + lateCount + missedCount;
    const ratePercent = totalEvaluated > 0 ? Math.round(((attendedCount + lateCount) / totalEvaluated) * 100) : 100;

    return {
      attendedCount,
      lateCount,
      excusedCount,
      missedCount,
      currentStreak,
      ratePercent,
    };
  }, [gigs, userCheckIns]);

  // One-tap self check-in handler
  const handleSelfCheckIn = async (gig: GigItem) => {
    if (!currentUserId) return;
    setCheckingInId(gig.id);

    try {
      const payload: CheckInRecord = {
        uid: currentUserId,
        gigId: gig.id,
        displayName: userProfile?.displayName || "Band Member",
        section: userProfile?.sectionId || "General",
        status: "checked_in",
        checkInTime: new Date().toISOString(),
        isSub: false,
        subbingFor: "",
        notes: "Self check-in via mobile portal",
        checkInMethod: "self_kiosk",
        updatedAt: new Date().toISOString(),
      };

      const validated = CheckInSchema.parse(payload);
      await setDoc(doc(db, "gigs", gig.id, "checkins", currentUserId), validated, { merge: true });

      setUserCheckIns((prev) => ({
        ...prev,
        [gig.id]: validated,
      }));

      setCheckInSuccess(gig.id);
      setTimeout(() => setCheckInSuccess(null), 4000);
    } catch (err) {
      console.error("Failed to submit check-in:", err);
      alert("Check-in error: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setCheckingInId(null);
    }
  };

  const getStatusBadge = (status?: CheckInStatus) => {
    switch (status) {
      case "checked_in":
        return (
          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded flex items-center gap-1 font-mono">
            <CheckCheck className="w-3 h-3" /> Checked In
          </span>
        );
      case "late":
        return (
          <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded flex items-center gap-1 font-mono">
            <Clock className="w-3 h-3" /> Late Arrival
          </span>
        );
      case "excused":
        return (
          <span className="text-[10px] font-bold text-sky-400 bg-sky-500/10 border border-sky-500/20 px-2 py-0.5 rounded flex items-center gap-1 font-mono">
            <HelpCircle className="w-3 h-3" /> Excused
          </span>
        );
      case "no_show":
        return (
          <span className="text-[10px] font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded flex items-center gap-1 font-mono">
            <XCircle className="w-3 h-3" /> Absent
          </span>
        );
      default:
        return (
          <span className="text-[10px] font-bold text-slate-500 bg-slate-800 border border-slate-700 px-2 py-0.5 rounded flex items-center gap-1 font-mono">
            Pending Downbeat
          </span>
        );
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-400 gap-2 text-xs">
        <Loader2 className="w-4 h-4 animate-spin text-yellow-400" />
        Syncing attendance ledger & downbeat status...
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6 pb-20">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-yellow-400 bg-slate-950 px-2.5 py-0.5 rounded border border-slate-800">
              Downbeat Operations
            </span>
            <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Self-Service Ready
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-2.5">
            <CheckCircle2 className="w-7 h-7 text-yellow-400" /> My Attendance &amp; Check-In
          </h1>
          <p className="text-xs text-slate-400">
            Confirm your on-site arrival at rehearsals and shows, track your participation streaks, and review your attendance record.
          </p>
        </div>

        {/* Leadership Switcher */}
        {isLeader && (
          <Link
            href="/admin/checkin"
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition shadow shrink-0"
          >
            <Users className="w-4 h-4 text-yellow-400" />
            <span>Section Roll Call Kiosk</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        )}
      </div>

      {/* Active Gig / Today's Call Sheet Check-In Hero Card */}
      {activeGig && (
        <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border-2 border-yellow-400/40 rounded-2xl p-5 sm:p-6 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-400/5 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 relative z-10">
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-mono font-bold text-yellow-400 bg-yellow-400/10 border border-yellow-400/30 px-2.5 py-0.5 rounded-lg flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5 text-yellow-400 animate-pulse" />
                  Active Call Sheet
                </span>
                <span className="text-xs font-mono text-slate-400">Date: {activeGig.date}</span>
                {getStatusBadge(userCheckIns[activeGig.id]?.status)}
              </div>

              <h2 className="text-xl sm:text-2xl font-black text-white">
                {activeGig.internalLogistics?.title || activeGig.publicDetails?.title || "Upcoming Band Gig"}
              </h2>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-300">
                <div className="flex items-center gap-1 text-slate-400">
                  <Clock className="w-3.5 h-3.5 text-yellow-400" />
                  <span>Call: <strong className="text-white">{activeGig.internalLogistics?.callTime || "TBD"}</strong></span>
                  <span className="mx-1">•</span>
                  <span>Downbeat: <strong className="text-white">{activeGig.internalLogistics?.downbeat || "TBD"}</strong></span>
                </div>

                <div className="flex items-center gap-1 text-slate-400">
                  <MapPin className="w-3.5 h-3.5 text-slate-500" />
                  <span className="truncate max-w-xs">{activeGig.publicDetails?.venue || activeGig.internalLogistics?.unloadingAddress || "Location TBD"}</span>
                </div>
              </div>
            </div>

            {/* Check-In Action Button */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
              {userCheckIns[activeGig.id]?.status === "checked_in" ? (
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-5 py-3 text-center sm:text-right space-y-0.5">
                  <div className="text-xs font-bold text-emerald-400 flex items-center justify-center sm:justify-end gap-1.5">
                    <CheckCheck className="w-4 h-4" /> You Are Checked In
                  </div>
                  <div className="text-[11px] font-mono text-slate-400">
                    Recorded at {new Date(userCheckIns[activeGig.id]?.checkInTime || "").toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={checkingInId === activeGig.id}
                  onClick={() => handleSelfCheckIn(activeGig)}
                  className="bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-black px-6 py-3.5 rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition shadow-lg shadow-yellow-400/10 disabled:opacity-50 cursor-pointer"
                >
                  {checkingInId === activeGig.id ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Recording Arrival...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" /> Check In Now (I Am On Site)
                    </>
                  )}
                </button>
              )}

              <Link
                href={`/portal/gigs/${activeGig.id}`}
                className="bg-slate-950/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 px-4 py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition"
              >
                <span>Call Sheet</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {checkInSuccess === activeGig.id && (
            <div className="mt-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-2 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              Arrival logged successfully! Your section leader and gig coordinator have been notified.
            </div>
          )}
        </div>
      )}

      {/* Attendance Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-1 shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-mono uppercase font-bold">Attendance Rate</span>
            <Award className="w-4 h-4 text-yellow-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white">{metrics.ratePercent}%</div>
          <div className="text-[11px] text-slate-400">Historical show reliability</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-1 shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-mono uppercase font-bold">Current Streak</span>
            <Flame className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-400 flex items-center gap-1">
            {metrics.currentStreak}
            <span className="text-xs font-normal text-slate-400">shows</span>
          </div>
          <div className="text-[11px] text-slate-400">Consecutive performances</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-1 shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-mono uppercase font-bold">Shows Performed</span>
            <CheckCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-400">{metrics.attendedCount}</div>
          <div className="text-[11px] text-slate-400">Total checked-in gigs</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-1 shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-mono uppercase font-bold">Excused Absences</span>
            <HelpCircle className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-sky-400">{metrics.excusedCount}</div>
          <div className="text-[11px] text-slate-400">Recorded with prior notice</div>
        </div>
      </div>

      {/* Attendance History Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-yellow-400" />
              Performance &amp; Rehearsal Ledger
            </h2>
            <p className="text-xs text-slate-400">
              Verified downbeat check-in records and call sheet arrivals across the band calendar.
            </p>
          </div>
          <span className="text-xs font-mono text-slate-400">
            {gigs.length} Events Total
          </span>
        </div>

        <div className="divide-y divide-slate-800/80">
          {gigs.map((gig) => {
            const checkIn = userCheckIns[gig.id];
            const title = gig.internalLogistics?.title || gig.publicDetails?.title || "Eagleburger Event";
            const venue = gig.publicDetails?.venue || gig.internalLogistics?.unloadingAddress || "Location TBD";
            const isCheckedIn = checkIn?.status === "checked_in";

            return (
              <div
                key={gig.id}
                className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-950/40 px-2 rounded-xl transition"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-mono font-bold text-yellow-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                      {gig.date}
                    </span>
                    <span className="text-xs font-bold text-white truncate">{title}</span>
                    {getStatusBadge(checkIn?.status)}
                  </div>

                  <div className="flex items-center gap-3 text-[11px] text-slate-400">
                    <span>Venue: {venue}</span>
                    {gig.internalLogistics?.callTime && (
                      <span>• Call: {gig.internalLogistics.callTime}</span>
                    )}
                    {checkIn?.checkInTime && (
                      <span className="text-emerald-400 font-mono">
                        • Checked in: {new Date(checkIn.checkInTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                  {!isCheckedIn && (
                    <button
                      type="button"
                      disabled={checkingInId === gig.id}
                      onClick={() => handleSelfCheckIn(gig)}
                      className="bg-yellow-400/10 hover:bg-yellow-400/20 text-yellow-400 border border-yellow-400/30 px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                      {checkingInId === gig.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      )}
                      <span>Self Check-In</span>
                    </button>
                  )}

                  <Link
                    href={`/portal/gigs/${gig.id}`}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                    title="View Gig Details"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
