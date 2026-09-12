"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import {
  Award,
  CheckCircle2,
  TrendingUp,
  DollarSign,
  CalendarCheck,
  Music,
  ShieldCheck,
  ArrowUpRight,
  Smartphone,
  ChevronRight
} from "lucide-react";
import { User } from "@/lib/schema/user";
import { AttendanceStatus } from "./PortalDayEventsModal";

type AnalyticsGig = {
  id: string;
  date: string;
  status: string;
  internalLogistics?: {
    compensation?: number;
    payPerMusician?: number;
  };
};

interface MemberAnalyticsCardProps {
  profile: User | null;
  gigs: AnalyticsGig[];
  userRsvps: Record<string, AttendanceStatus>;
  earnings: { paid: number; unpaid: number };
  tuneCount: number | null;
  suggestionCount: number | null;
}

export default function MemberAnalyticsCard({
  profile,
  gigs,
  userRsvps,
  earnings,
  tuneCount,
  suggestionCount,
}: MemberAnalyticsCardProps) {
  const todayStr = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }, []);

  // Compute analytics
  const analytics = useMemo(() => {
    // Past completed or elapsed gigs (not cancelled)
    const pastGigs = gigs.filter(
      (g) => g.status !== "cancelled" && (g.status === "completed" || g.date < todayStr)
    );

    // Upcoming gigs (not cancelled, not completed)
    const upcomingGigs = gigs.filter(
      (g) => g.status !== "cancelled" && g.status !== "completed" && g.date >= todayStr
    );

    // Gigs attended
    let attendedPastCount = 0;
    let declinedPastCount = 0;
    let tentativePastCount = 0;

    pastGigs.forEach((gig) => {
      const status = userRsvps[gig.id];
      if (status === "attending") attendedPastCount++;
      else if (status === "declined") declinedPastCount++;
      else if (status === "tentative") tentativePastCount++;
    });

    // Upcoming attendance counts
    const confirmedUpcomingCount = upcomingGigs.filter(
      (g) => userRsvps[g.id] === "attending"
    ).length;
    const unansweredUpcomingCount = upcomingGigs.filter(
      (g) => !userRsvps[g.id]
    ).length;

    // Reliability score (based on completed past gigs with member responses)
    const pastAnswered = attendedPastCount + declinedPastCount;
    const reliabilityRate =
      pastGigs.length > 0
        ? Math.round((attendedPastCount / Math.max(1, pastAnswered || pastGigs.length)) * 100)
        : 100;

    // Average compensation per attended gig
    const totalEarnings = earnings.paid + earnings.unpaid;
    const avgEarningsPerGig =
      attendedPastCount > 0 ? Math.round(totalEarnings / attendedPastCount) : 0;

    return {
      pastGigsCount: pastGigs.length,
      attendedPastCount,
      declinedPastCount,
      tentativePastCount,
      upcomingGigsCount: upcomingGigs.length,
      confirmedUpcomingCount,
      unansweredUpcomingCount,
      reliabilityRate,
      totalEarnings,
      avgEarningsPerGig,
    };
  }, [gigs, userRsvps, todayStr, earnings]);

  // Standing tier description
  const reliabilityBadge = useMemo(() => {
    const rate = analytics.reliabilityRate;
    if (rate >= 90) {
      return {
        label: "Ironclad Roster",
        colorClass: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
        description: "Exemplary reliability. Frontline priority for stage rosters.",
      };
    } else if (rate >= 75) {
      return {
        label: "High Reliability",
        colorClass: "bg-sky-500/15 text-sky-400 border-sky-500/30",
        description: "Consistent performer with active attendance records.",
      };
    } else if (rate >= 50) {
      return {
        label: "Active Musician",
        colorClass: "bg-amber-500/15 text-amber-400 border-amber-500/30",
        description: "Active contributor with balanced availability.",
      };
    } else {
      return {
        label: "Growing Record",
        colorClass: "bg-purple-500/15 text-purple-400 border-purple-500/30",
        description: "Establishing season performance history.",
      };
    }
  }, [analytics.reliabilityRate]);

  return (
    <div
      suppressHydrationWarning
      style={{
        backgroundColor: "var(--ebb-surface)",
        borderColor: "var(--ebb-border)",
      }}
      className="border rounded-2xl p-5 sm:p-6 shadow-xl transition-colors space-y-5"
    >
      {/* Analytics Card Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div
            suppressHydrationWarning
            style={{
              backgroundColor: "var(--ebb-surface-muted)",
              borderColor: "var(--ebb-border)",
              color: "var(--ebb-primary)",
            }}
            className="w-10 h-10 rounded-2xl border flex items-center justify-center shrink-0 shadow-sm"
          >
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base sm:text-lg font-black text-white">
                Member Season Analytics &amp; Standing
              </h3>
              <span
                className={`text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${reliabilityBadge.colorClass}`}
              >
                {reliabilityBadge.label}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Personal performance telemetry, call sheet reliability, and season compensation.
            </p>
          </div>
        </div>

        {/* Section / Instrument Info */}
        <div className="flex items-center gap-2 text-xs">
          <div
            suppressHydrationWarning
            style={{
              backgroundColor: "var(--ebb-surface-muted)",
              borderColor: "var(--ebb-border)",
            }}
            className="border rounded-xl px-3 py-1.5 flex items-center gap-2"
          >
            <ShieldCheck className="w-3.5 h-3.5" style={{ color: "var(--ebb-primary)" }} />
            <span className="text-slate-300 font-semibold capitalize">
              {profile?.sectionId || "General Roster"}
            </span>
            {profile?.instruments && profile.instruments.length > 0 && (
              <span className="text-[11px] text-slate-400 hidden sm:inline">
                ({profile.instruments.join(", ")})
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Primary Telemetry Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Metric 1: Gigs Attended */}
        <div
          suppressHydrationWarning
          style={{
            backgroundColor: "var(--ebb-surface-muted)",
            borderColor: "var(--ebb-border)",
          }}
          className="border rounded-xl p-3.5 sm:p-4 space-y-1 transition hover:brightness-105"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase font-bold text-slate-400 flex items-center gap-1">
              <CalendarCheck className="w-3 h-3 text-emerald-400" /> Shows Played
            </span>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
              Historical
            </span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-black text-white">
              {analytics.attendedPastCount}
            </span>
            <span className="text-xs text-slate-400">
              / {analytics.pastGigsCount} completed
            </span>
          </div>
          <p className="text-[11px] text-slate-400 leading-tight">
            Stage appearances across festival, parade, and concert dates.
          </p>
        </div>

        {/* Metric 2: Attendance Reliability */}
        <div
          suppressHydrationWarning
          style={{
            backgroundColor: "var(--ebb-surface-muted)",
            borderColor: "var(--ebb-border)",
          }}
          className="border rounded-xl p-3.5 sm:p-4 space-y-1 transition hover:brightness-105"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase font-bold text-slate-400 flex items-center gap-1">
              <Award className="w-3 h-3 text-yellow-400" /> Reliability Rate
            </span>
            <span className="text-[10px] font-mono text-yellow-400 bg-yellow-500/10 px-1.5 py-0.5 rounded">
              Score
            </span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-black text-white">
              {analytics.reliabilityRate}%
            </span>
          </div>
          <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden mt-1">
            <div
              className="bg-yellow-400 h-full rounded-full transition-all duration-500"
              style={{ width: `${analytics.reliabilityRate}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-400 leading-tight">
            {reliabilityBadge.description}
          </p>
        </div>

        {/* Metric 3: Upcoming Commitment */}
        <div
          suppressHydrationWarning
          style={{
            backgroundColor: "var(--ebb-surface-muted)",
            borderColor: "var(--ebb-border)",
          }}
          className="border rounded-xl p-3.5 sm:p-4 space-y-1 transition hover:brightness-105"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase font-bold text-slate-400 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-sky-400" /> Upcoming Roster
            </span>
            <span className="text-[10px] font-mono text-sky-400 bg-sky-500/10 px-1.5 py-0.5 rounded">
              Upcoming
            </span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-black text-white">
              {analytics.confirmedUpcomingCount}
            </span>
            <span className="text-xs text-slate-400">
              / {analytics.upcomingGigsCount} confirmed
            </span>
          </div>
          <p className="text-[11px] text-slate-400 leading-tight">
            {analytics.unansweredUpcomingCount > 0 ? (
              <span className="text-amber-400 font-semibold">
                {analytics.unansweredUpcomingCount} gig(s) awaiting your response
              </span>
            ) : (
              <span className="text-emerald-400 font-semibold">
                All upcoming RSVPs up to date
              </span>
            )}
          </p>
        </div>

        {/* Metric 4: Total Season Earnings */}
        <div
          suppressHydrationWarning
          style={{
            backgroundColor: "var(--ebb-surface-muted)",
            borderColor: "var(--ebb-border)",
          }}
          className="border rounded-xl p-3.5 sm:p-4 space-y-1 transition hover:brightness-105"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase font-bold text-slate-400 flex items-center gap-1">
              <DollarSign className="w-3 h-3 text-emerald-400" /> Compensation
            </span>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
              Season
            </span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-black text-white">
              ${analytics.totalEarnings}
            </span>
            {analytics.avgEarningsPerGig > 0 && (
              <span className="text-[10px] text-slate-400 font-mono">
                (~${analytics.avgEarningsPerGig}/gig)
              </span>
            )}
          </div>
          <div className="text-[11px] text-slate-400 flex items-center gap-2">
            <span>Paid: <strong className="text-emerald-400">${earnings.paid}</strong></span>
            <span>•</span>
            <span>Pending: <strong style={{ color: "var(--ebb-primary)" }}>${earnings.unpaid}</strong></span>
          </div>
        </div>
      </div>

      {/* Secondary Engagement & Quick Audit Footer */}
      <div 
        suppressHydrationWarning
        style={{ borderColor: "var(--ebb-border)" }}
        className="pt-4 border-t flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
      >
        <div className="flex items-center gap-4 flex-wrap text-slate-400">
          <div className="flex items-center gap-1.5">
            <Music className="w-3.5 h-3.5 text-slate-500" />
            <span>Vault Repertoire:</span>
            <strong className="text-white">
              {tuneCount !== null ? `${tuneCount} Master Charts` : "Loading..."}
            </strong>
          </div>

          {suggestionCount !== null && (
            <div className="flex items-center gap-1.5">
              <span>Peer Pitches:</span>
              <strong className="text-white">{suggestionCount} Ideas</strong>
            </div>
          )}

          <div className="flex items-center gap-1.5">
            <Smartphone className="w-3.5 h-3.5 text-slate-500" />
            <span>SMS Dispatch:</span>
            <strong className={profile?.phone && profile?.smsConsent ? "text-emerald-400" : "text-amber-400"}>
              {profile?.phone && profile?.smsConsent ? "Active & Enrolled" : "Needs Setup"}
            </strong>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/portal/profile"
            className="text-slate-300 hover:text-white font-semibold flex items-center gap-1 hover:underline"
          >
            <span>Update Musician Profile</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
          <Link
            href="/portal/gigs"
            className="text-yellow-400 hover:text-yellow-300 font-semibold flex items-center gap-0.5 ml-2"
          >
            <span>Full Gig Roster</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}

