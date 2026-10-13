"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/lib/context/AuthContext";
import {
  RehearsalConfig,
  RehearsalConfigSchema,
  RehearsalSession,
  RehearsalSessionSchema,
  RehearsalRsvp,
  RehearsalRsvpSchema,
  RsvpStatus,
} from "@/lib/schema/rehearsal";
import {
  getUpcomingRehearsalDates,
  getRehearsalAttendanceStats,
} from "@/lib/rehearsal/rehearsalHelpers";
import {
  formatNonMilitaryTime,
  formatTimeRange,
  formatFriendlyDate,
} from "@/lib/utils/dateTimeFormat";
import { toast } from "@/lib/context/ToastContext";
import {
  Music2,
  Calendar,
  MapPin,
  Clock,
  Users,
  CheckCircle2,
  XCircle,
  HelpCircle,
  AlertTriangle,
  MessageSquare,
  Navigation,
  ExternalLink,
  ChevronRight,
  Palmtree,
  Settings,
  Compass,
  Check,
} from "lucide-react";

export default function MemberRehearsalsSection() {
  const { profile } = useAuth();
  const [config, setConfig] = useState<RehearsalConfig>(() => RehearsalConfigSchema.parse({}));
  const [sessions, setSessions] = useState<RehearsalSession[]>([]);
  const [rsvps, setRsvps] = useState<RehearsalRsvp[]>([]);
  const [isUpdatingRsvp, setIsUpdatingRsvp] = useState(false);

  // Cancel prompt modal state
  const [showCancelPrompt, setShowCancelPrompt] = useState(false);
  const [cancelReasonInput, setCancelReasonInput] = useState("");

  // 1. Subscribe to config and sessions
  useEffect(() => {
    const unsubConfig = onSnapshot(doc(db, "rehearsal_settings", "config"), (snapshot) => {
      if (snapshot.exists()) {
        const parsed = RehearsalConfigSchema.safeParse(snapshot.data());
        if (parsed.success) setConfig(parsed.data);
      }
    });

    const unsubSessions = onSnapshot(collection(db, "rehearsals"), (snapshot) => {
      const list: RehearsalSession[] = [];
      snapshot.forEach((d) => {
        const parsed = RehearsalSessionSchema.safeParse({ id: d.id, ...d.data() });
        if (parsed.success) list.push(parsed.data);
      });
      setSessions(list);
    });

    return () => {
      unsubConfig();
      unsubSessions();
    };
  }, []);

  // Compute next upcoming rehearsal date
  const upcomingDates = useMemo(() => {
    return getUpcomingRehearsalDates(config, 4);
  }, [config]);

  const activeRehearsal = useMemo<RehearsalSession>(() => {
    const nextDate = upcomingDates[0]?.dateStr || new Date().toISOString().split("T")[0];
    const existing = sessions.find((s) => s.date === nextDate);
    if (existing) return existing;

    return {
      id: `rehearsal_${nextDate}`,
      date: nextDate,
      startTime: config.startTime,
      endTime: config.endTime,
      title: `${config.dayName} Band Rehearsal`,
      locationId: config.defaultLocationId || "",
      locationName: config.defaultLocationName,
      locationAddress: config.defaultLocationAddress,
      lat: config.defaultLat,
      lng: config.defaultLng,
      locationNotes: "",
      isCancelled: false,
      cancellationReason: "",
      cancelledBy: "",
      cancelledAt: "",
      agenda: config.agendaNotes,
      comments: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }, [upcomingDates, sessions, config]);

  // Subscribe to RSVPs for next rehearsal
  useEffect(() => {
    if (!activeRehearsal?.id) return;
    const unsubRsvps = onSnapshot(
      collection(db, "rehearsals", activeRehearsal.id, "rsvps"),
      (snapshot) => {
        const list: RehearsalRsvp[] = [];
        snapshot.forEach((d) => {
          const parsed = RehearsalRsvpSchema.safeParse(d.data());
          if (parsed.success) list.push(parsed.data);
        });
        setRsvps(list);
      }
    );
    return () => unsubRsvps();
  }, [activeRehearsal?.id]);

  // Attendance stats
  const stats = useMemo(() => {
    return getRehearsalAttendanceStats(rsvps, 14);
  }, [rsvps]);

  const myRsvp = useMemo(() => {
    if (!profile?.uid) return null;
    return rsvps.find((r) => r.uid === profile.uid);
  }, [rsvps, profile?.uid]);

  const handleRsvpChange = async (status: RsvpStatus) => {
    if (!profile?.uid) {
      toast.error("Please sign in to update RSVP.");
      return;
    }
    setIsUpdatingRsvp(true);
    try {
      // Ensure session exists
      await setDoc(
        doc(db, "rehearsals", activeRehearsal.id),
        { ...activeRehearsal, updatedAt: new Date().toISOString() },
        { merge: true }
      );

      const rsvpData: RehearsalRsvp = {
        rehearsalId: activeRehearsal.id,
        uid: profile.uid,
        displayName: profile.displayName || profile.realName || "Band Member",
        sectionId: profile.sectionId || "",
        sectionName: profile.sectionId || "General",
        instrument: profile.selectedInstrument || profile.instruments?.[0] || "",
        status,
        notes: "",
        updatedAt: new Date().toISOString(),
      };

      await setDoc(doc(db, "rehearsals", activeRehearsal.id, "rsvps", profile.uid), rsvpData);
      toast.success(`Rehearsal attendance set to ${status.toUpperCase()}`);
    } catch (err) {
      toast.error("Failed to update: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsUpdatingRsvp(false);
    }
  };

  const handleCancelRehearsal = async () => {
    if (!activeRehearsal) return;
    if (activeRehearsal.isCancelled) {
      // Reactivate
      try {
        await updateDoc(doc(db, "rehearsals", activeRehearsal.id), {
          isCancelled: false,
          cancellationReason: "",
          cancelledBy: "",
          cancelledAt: "",
          updatedAt: new Date().toISOString(),
        });
        toast.success("Rehearsal reactivated!");
      } catch (err) {
        toast.error("Failed to reactivate: " + (err instanceof Error ? err.message : String(err)));
      }
    } else {
      setShowCancelPrompt(true);
      setCancelReasonInput("");
    }
  };

  const handleConfirmCancellation = async () => {
    try {
      await setDoc(
        doc(db, "rehearsals", activeRehearsal.id),
        {
          ...activeRehearsal,
          isCancelled: true,
          cancellationReason: cancelReasonInput.trim() || "Cancelled by leadership",
          cancelledBy: profile?.displayName || "Leadership",
          cancelledAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
      toast.info("Rehearsal cancelled.");
      setShowCancelPrompt(false);
    } catch (err) {
      toast.error("Failed to cancel: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  return (
    <div className="space-y-3">
      {/* Section Header */}
      <div className="px-1 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div>
          <h2 className="text-xs font-mono uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1.5">
            <Music2 className="w-3.5 h-3.5" style={{ color: "var(--ebb-primary)" }} /> Band Rehearsals &amp; Practice
          </h2>
          <span className="text-[11px] text-slate-500">
            Weekly {config.dayName} Downbeats @ {formatNonMilitaryTime(config.startTime, true)}, Locations &amp; Member Attendance
          </span>
        </div>

        <Link
          href="/portal/rehearsals"
          className="text-xs font-bold text-yellow-400 hover:text-yellow-300 flex items-center gap-1 transition"
        >
          <span>Open Full Rehearsal Hub</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Feature Links Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Link
          href="/portal/rehearsals"
          className="bg-slate-900/80 hover:bg-slate-800 border border-slate-800 p-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white flex items-center gap-2 transition"
        >
          <Clock className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
          <span className="truncate">Schedule &amp; RSVPs</span>
        </Link>

        <Link
          href="/portal/rehearsals"
          className="bg-slate-900/80 hover:bg-slate-800 border border-slate-800 p-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white flex items-center gap-2 transition"
        >
          <Compass className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <span className="truncate">Locations &amp; Pins</span>
        </Link>

        <Link
          href="/portal/rehearsals"
          className="bg-slate-900/80 hover:bg-slate-800 border border-slate-800 p-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white flex items-center gap-2 transition"
        >
          <Palmtree className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span className="truncate">Blackout Calendar</span>
        </Link>

        <Link
          href="/portal/rehearsals"
          className="bg-slate-900/80 hover:bg-slate-800 border border-slate-800 p-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white flex items-center gap-2 transition"
        >
          <Settings className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span className="truncate">Weekly Settings</span>
        </Link>
      </div>

      {/* Next Upcoming Rehearsal Card */}
      <div
        className={`border rounded-2xl p-5 space-y-4 shadow transition ${
          activeRehearsal.isCancelled
            ? "bg-red-950/20 border-red-500/30"
            : "bg-slate-900 border-slate-800"
        }`}
      >
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-yellow-400/10 text-yellow-400 border border-yellow-400/20">
                Next Scheduled Practice
              </span>
              {activeRehearsal.isCancelled ? (
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-red-500 text-white flex items-center gap-1 shadow-xs">
                  <XCircle className="w-3 h-3" /> Cancelled
                </span>
              ) : (
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Active
                </span>
              )}
            </div>

            <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              {formatFriendlyDate(activeRehearsal.date, {
                includeDayOfWeek: true,
                includeYear: false,
                shortMonth: true,
              })}
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCancelRehearsal}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition border flex items-center gap-1 ${
                activeRehearsal.isCancelled
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20"
                  : "bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500/20"
              }`}
            >
              <AlertTriangle className="w-3 h-3" />
              <span>{activeRehearsal.isCancelled ? "Reactivate" : "Cancel Practice"}</span>
            </button>

            <Link
              href="/portal/rehearsals"
              className="px-3 py-1 rounded-lg text-xs font-bold text-slate-950 bg-yellow-400 hover:bg-yellow-300 transition flex items-center gap-1"
            >
              <span>Details</span>
              <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {activeRehearsal.isCancelled && (
          <div className="text-xs text-red-200 bg-red-950/40 border border-red-500/20 rounded-xl p-3">
            <strong>Cancellation Notice:</strong>{" "}
            {activeRehearsal.cancellationReason || "Cancelled by leadership."}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 flex items-center gap-2.5">
            <Clock className="w-4 h-4 text-yellow-400 shrink-0" />
            <div>
              <span className="text-[10px] font-mono text-slate-400 uppercase block">Time</span>
              <span className="font-bold text-white">
                {formatTimeRange(activeRehearsal.startTime, activeRehearsal.endTime, true)}
              </span>
            </div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 truncate">
              <MapPin className="w-4 h-4 text-yellow-400 shrink-0" />
              <div className="truncate">
                <span className="text-[10px] font-mono text-slate-400 uppercase block">Grounds</span>
                <span className="font-bold text-white truncate block">
                  {activeRehearsal.locationName}
                </span>
              </div>
            </div>
            {activeRehearsal.lat && activeRehearsal.lng && (
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${activeRehearsal.lat},${activeRehearsal.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-yellow-400 hover:text-yellow-300 p-1"
                title="Get directions"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        </div>

        {/* 1-Click Quick Attendance Strip */}
        <div className="pt-2 border-t border-slate-800/80 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400 font-mono text-[11px]">My Plan:</span>
            {myRsvp?.status === "attending" && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-lg">
                <CheckCircle2 className="w-3 h-3" /> In
              </span>
            )}
            {myRsvp?.status === "probable" && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded-lg">
                <Clock className="w-3 h-3" /> Probable
              </span>
            )}
            {myRsvp?.status === "declined" && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-lg">
                <XCircle className="w-3 h-3" /> Out
              </span>
            )}
            {myRsvp?.status === "tentative" && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-lg">
                <HelpCircle className="w-3 h-3" /> Tentative
              </span>
            )}
            {!myRsvp?.status && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-lg">
                Set Plan
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              disabled={isUpdatingRsvp}
              onClick={() => handleRsvpChange("attending")}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                myRsvp?.status === "attending"
                  ? "bg-emerald-500 text-slate-950 font-bold"
                  : "bg-slate-950 text-slate-300 hover:text-emerald-400 border border-slate-800"
              }`}
            >
              <Check className="w-3 h-3" /> In
            </button>

            <button
              type="button"
              disabled={isUpdatingRsvp}
              onClick={() => handleRsvpChange("probable")}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                myRsvp?.status === "probable"
                  ? "bg-cyan-500 text-slate-950 font-bold"
                  : "bg-slate-950 text-slate-300 hover:text-cyan-400 border border-slate-800"
              }`}
            >
              Probable
            </button>

            <button
              type="button"
              disabled={isUpdatingRsvp}
              onClick={() => handleRsvpChange("tentative")}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                myRsvp?.status === "tentative"
                  ? "bg-amber-400 text-slate-950 font-bold"
                  : "bg-slate-950 text-slate-300 hover:text-amber-400 border border-slate-800"
              }`}
            >
              Tentative
            </button>

            <button
              type="button"
              disabled={isUpdatingRsvp}
              onClick={() => handleRsvpChange("declined")}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                myRsvp?.status === "declined"
                  ? "bg-rose-500 text-white font-bold"
                  : "bg-slate-950 text-slate-300 hover:text-rose-400 border border-slate-800"
              }`}
            >
              Out
            </button>
          </div>
        </div>

        {/* Projected quorum bar */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
            <span>
              Projected Quorum: <strong className="text-white">{stats.projectedHeadcount}</strong> /{" "}
              {stats.targetQuorum} Musicians
            </span>
            <span className={stats.isQuorumMet ? "text-emerald-400 font-bold" : "text-yellow-400"}>
              {stats.quorumPercentage}% Quorum
            </span>
          </div>
          <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden border border-slate-800">
            <div
              className={`h-full transition-all duration-300 ${
                stats.isQuorumMet ? "bg-emerald-400" : "bg-yellow-400"
              }`}
              style={{ width: `${stats.quorumPercentage}%` }}
            />
          </div>
        </div>

        {/* Confirmed Attending Members Roll Call Preview */}
        <div className="space-y-2 pt-2 border-t border-slate-800/80">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-white flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-yellow-400" />
              <span>
                Attending Roll Call ({rsvps.filter((r) => r.status === "attending").length} Confirmed)
              </span>
            </span>
            <Link
              href="/portal/rehearsals"
              className="text-[11px] text-yellow-400 hover:text-yellow-300 font-semibold flex items-center gap-1 transition"
            >
              <span>View Roster ({rsvps.length})</span>
              <ChevronRight className="w-3 h-3" />
            </Link>
          </div>

          {rsvps.filter((r) => r.status === "attending" || r.status === "probable").length === 0 ? (
            <div className="text-[11px] text-slate-500 bg-slate-950/60 border border-slate-800 rounded-xl p-2.5 text-center">
              No musicians confirmed yet. Tap your attendance above to check in!
            </div>
          ) : (
            <div className="flex items-center gap-1.5 flex-wrap">
              {rsvps
                .filter((r) => r.status === "attending" || r.status === "probable")
                .map((r) => (
                  <span
                    key={r.uid}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs border ${
                      r.status === "attending"
                        ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/20"
                        : "bg-cyan-500/10 text-cyan-300 border-cyan-500/20"
                    }`}
                  >
                    <span className="font-semibold">{r.displayName}</span>
                    {r.instrument && (
                      <span className="text-[10px] text-slate-400">({r.instrument})</span>
                    )}
                    {r.status === "probable" && (
                      <span className="text-[9px] font-mono text-cyan-400 font-bold uppercase">(Prob)</span>
                    )}
                  </span>
                ))}
            </div>
          )}
        </div>
      </div>

      {/* Cancel Reason Dialog */}
      {showCancelPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-red-500/40 rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center gap-2 text-red-400">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h4 className="font-bold text-white text-sm">Cancel Upcoming Rehearsal</h4>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-300 block">Cancellation Reason:</label>
              <input
                type="text"
                placeholder="e.g. Rain / storms, Holiday break..."
                value={cancelReasonInput}
                onChange={(e) => setCancelReasonInput(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-400"
              />
            </div>
            <div className="flex justify-end gap-2 pt-1 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowCancelPrompt(false)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-400 hover:text-white"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleConfirmCancellation}
                className="px-4 py-1.5 text-xs font-bold bg-red-600 hover:bg-red-500 text-white rounded-xl shadow-md"
              >
                Confirm Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

