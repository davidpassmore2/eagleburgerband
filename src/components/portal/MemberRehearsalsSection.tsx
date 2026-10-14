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
  formatTimeRange,
  formatFriendlyDate,
} from "@/lib/utils/dateTimeFormat";
import { toast } from "@/lib/context/ToastContext";
import {
  Music2,
  MapPin,
  Clock,
  Users,
  CheckCircle2,
  XCircle,
  HelpCircle,
  AlertTriangle,
  ExternalLink,
  Check,
} from "lucide-react";
import { useUserBlackouts } from "@/lib/portal/useUserBlackouts";
import InMyBlackoutChip from "@/components/portal/InMyBlackoutChip";

export default function MemberRehearsalsSection() {
  const { profile } = useAuth();
  const { isDateInBlackout } = useUserBlackouts();
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
  }, [rsvps, profile]);

  const isBlackedOut = isDateInBlackout(activeRehearsal?.date);

  const handleRsvpChange = async (status: RsvpStatus) => {
    if (!profile?.uid || isBlackedOut) {
      if (isBlackedOut) {
        toast.error("Cannot RSVP during your blackout period.");
      } else {
        toast.error("Please sign in to update RSVP.");
      }
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
    <>
      <div
        suppressHydrationWarning
        style={{
          backgroundColor: "var(--ebb-surface)",
          borderColor: "var(--ebb-border)",
        }}
        className={`border rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden transition-colors flex flex-col justify-between ${
          activeRehearsal.isCancelled ? "bg-red-950/20 border-red-500/30" : ""
        }`}
      >
        {/* Subtle accent glow */}
        <div
          className="absolute -top-12 -right-12 w-48 h-48 rounded-full blur-3xl opacity-10 pointer-events-none"
          style={{ backgroundColor: "var(--ebb-primary)" }}
        />

        <div className="space-y-4 relative z-10 flex-1">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                suppressHydrationWarning
                style={{
                  backgroundColor: "var(--ebb-surface-muted)",
                  borderColor: "var(--ebb-border)",
                  color: "var(--ebb-primary)",
                }}
                className="text-xs font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded border"
              >
                Next Rehearsal
              </span>
              <span className="text-xs font-mono text-slate-300 font-bold">
                {formatFriendlyDate(activeRehearsal.date, {
                  includeDayOfWeek: true,
                  includeYear: false,
                  shortMonth: true,
                })}
              </span>
              {activeRehearsal.isCancelled ? (
                <span className="text-xs font-mono font-bold text-red-300 bg-red-500/20 border border-red-500/30 px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                  <XCircle className="w-3 h-3 text-red-400" />
                  <span>Cancelled</span>
                </span>
              ) : (
                <span className="text-xs font-mono font-bold text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 rounded-full flex items-center gap-1.5 shadow-sm">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  <span>On Schedule</span>
                </span>
              )}
              {isBlackedOut && <InMyBlackoutChip />}
            </div>

            <h3 className="text-xl sm:text-2xl font-black text-white truncate">
              {activeRehearsal.title || `${config.dayName} Band Rehearsal`}
            </h3>

            {activeRehearsal.isCancelled && (
              <div className="text-xs text-red-200 bg-red-950/60 border border-red-500/30 rounded-xl p-2.5">
                <strong>Cancellation Notice:</strong> {activeRehearsal.cancellationReason || "Cancelled by leadership."}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-y-1.5 gap-x-3 text-xs text-slate-300">
              <span className="flex items-center gap-1.5 bg-black/20 px-2.5 py-1 rounded-lg border border-white/5">
                <Clock className="w-3.5 h-3.5 text-yellow-400" />
                <span>{formatTimeRange(activeRehearsal.startTime, activeRehearsal.endTime, true)}</span>
              </span>

              <span className="flex items-center gap-1.5 bg-black/20 px-2.5 py-1 rounded-lg border border-white/5 truncate max-w-full">
                <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="truncate">{activeRehearsal.locationName}</span>
                {activeRehearsal.lat && activeRehearsal.lng && (
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${activeRehearsal.lat},${activeRehearsal.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-yellow-400 hover:text-yellow-300 p-0.5 ml-0.5"
                    title="Get directions"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </span>

              <span className="flex items-center gap-1.5 bg-black/20 px-2.5 py-1 rounded-lg border border-white/5">
                <Users className="w-3.5 h-3.5 text-cyan-400" />
                <span>
                  {stats.attending} In / {stats.projectedHeadcount} Proj ({stats.quorumPercentage}% Quorum)
                </span>
              </span>
            </div>
          </div>

          {/* Quick 1-Click RSVP on Rehearsal */}
          <div className="bg-black/30 p-2.5 rounded-xl border border-white/10 space-y-1.5">
            <div className="text-[10px] font-mono uppercase font-bold text-slate-400 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <span>My Attendance Plan</span>
                {isBlackedOut && <InMyBlackoutChip size="sm" />}
              </span>
              {myRsvp?.status === "attending" && (
                <span className="text-emerald-400 font-bold">Confirmed In</span>
              )}
              {myRsvp?.status === "probable" && (
                <span className="text-cyan-400 font-bold">Probable</span>
              )}
              {myRsvp?.status === "tentative" && (
                <span className="text-amber-400 font-bold">Tentative</span>
              )}
              {myRsvp?.status === "declined" && (
                <span className="text-rose-400 font-bold">Declined</span>
              )}
              {!myRsvp?.status && (
                <span className="text-amber-400 font-bold animate-pulse">Required</span>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              <button
                type="button"
                disabled={isUpdatingRsvp || isBlackedOut}
                title={isBlackedOut ? "in my blackout" : undefined}
                onClick={() => handleRsvpChange("attending")}
                className={`px-2 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed ${
                  myRsvp?.status === "attending"
                    ? "bg-emerald-500 text-slate-950 shadow"
                    : "bg-white/5 hover:bg-emerald-500/20 text-slate-300"
                }`}
              >
                <Check className="w-3 h-3" /> In
              </button>
              <button
                type="button"
                disabled={isUpdatingRsvp || isBlackedOut}
                title={isBlackedOut ? "in my blackout" : undefined}
                onClick={() => handleRsvpChange("probable")}
                className={`px-2 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed ${
                  myRsvp?.status === "probable"
                    ? "bg-cyan-500 text-slate-950 shadow"
                    : "bg-white/5 hover:bg-cyan-500/20 text-slate-300"
                }`}
              >
                <Clock className="w-3 h-3" /> Probable
              </button>
              <button
                type="button"
                disabled={isUpdatingRsvp || isBlackedOut}
                title={isBlackedOut ? "in my blackout" : undefined}
                onClick={() => handleRsvpChange("tentative")}
                className={`px-2 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed ${
                  myRsvp?.status === "tentative"
                    ? "bg-amber-400 text-slate-950 shadow"
                    : "bg-white/5 hover:bg-amber-400/20 text-slate-300"
                }`}
              >
                <HelpCircle className="w-3 h-3" /> Maybe
              </button>
              <button
                type="button"
                disabled={isUpdatingRsvp || isBlackedOut}
                title={isBlackedOut ? "in my blackout" : undefined}
                onClick={() => handleRsvpChange("declined")}
                className={`px-2 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed ${
                  myRsvp?.status === "declined"
                    ? "bg-rose-500 text-white shadow"
                    : "bg-white/5 hover:bg-rose-500/20 text-slate-300"
                }`}
              >
                <XCircle className="w-3 h-3" /> Out
              </button>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-3 border-t border-white/5 relative z-10 mt-4">
          <Link
            href="/portal/rehearsals"
            className="flex-1 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold px-3 py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 transition shadow"
          >
            <Music2 className="w-3.5 h-3.5" />
            <span>Rehearsal Hub</span>
          </Link>

          <button
            type="button"
            onClick={handleCancelRehearsal}
            className={`flex-1 border text-slate-200 hover:text-white px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition ${
              activeRehearsal.isCancelled
                ? "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                : "bg-black/20 hover:bg-red-500/10 hover:text-red-300 border-white/10"
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>{activeRehearsal.isCancelled ? "Reactivate" : "Cancel Rehearsal"}</span>
          </button>
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
    </>
  );
}

