"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import {
  Calendar,
  Clock,
  MapPin,
  Sparkles,
  CheckCircle2,
  XCircle,
  HelpCircle,
  PlaySquare,
  ArrowRight,
  X,
  Loader2,
  AlertCircle
} from "lucide-react";

export type AttendanceStatus = "attending" | "declined" | "tentative";

export type DayModalGig = {
  id: string;
  date: string;
  status: string;
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
    parkingInstructions?: string;
    notes?: string;
    payPerMusician?: number;
  };
};

interface PortalDayEventsModalProps {
  isOpen: boolean;
  onClose: () => void;
  dateString: string;
  gigs: DayModalGig[];
  userRsvps: Record<string, AttendanceStatus>;
  onRsvpChange?: (gigId: string, status: AttendanceStatus) => Promise<void>;
  isUpdatingRsvp?: boolean;
}

export default function PortalDayEventsModal({
  isOpen,
  onClose,
  dateString,
  gigs,
  userRsvps,
  onRsvpChange,
  isUpdatingRsvp = false,
}: PortalDayEventsModalProps) {
  // Handle ESC key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Format date nicely: e.g., "Saturday, September 25, 2026"
  const formattedDate = (() => {
    try {
      if (!dateString) return "Scheduled Events";
      const parts = dateString.split("-");
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        const d = new Date(year, month, day);
        return d.toLocaleDateString("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
          year: "numeric",
        });
      }
      return dateString;
    } catch {
      return dateString;
    }
  })();

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        suppressHydrationWarning
        style={{
          backgroundColor: "var(--ebb-surface)",
          borderColor: "var(--ebb-border)",
        }}
        className="border rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div 
          suppressHydrationWarning
          style={{ borderColor: "var(--ebb-border)" }}
          className="flex items-center justify-between p-4 sm:p-5 border-b shrink-0"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div 
              suppressHydrationWarning
              style={{ 
                backgroundColor: "var(--ebb-surface-muted)", 
                borderColor: "var(--ebb-border)",
                color: "var(--ebb-primary)"
              }}
              className="w-9 h-9 rounded-xl border flex items-center justify-center shrink-0"
            >
              <Calendar className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-extrabold text-white truncate">
                {formattedDate}
              </h2>
              <p className="text-xs text-slate-400">
                {gigs.length} {gigs.length === 1 ? "Performance Scheduled" : "Performances Scheduled"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Gig List Container */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
          {gigs.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs">
              No gigs scheduled for this date.
            </div>
          ) : (
            gigs.map((gig) => {
              const title =
                gig.internalLogistics?.title ||
                gig.publicDetails?.title ||
                "Eagleburger Band Gig";
              const venue =
                gig.publicDetails?.venue ||
                gig.internalLogistics?.unloadingAddress ||
                "Venue TBD";
              const address =
                gig.publicDetails?.venueAddress ||
                gig.internalLogistics?.unloadingAddress;
              const callTime = gig.internalLogistics?.callTime || "TBD";
              const downbeat = gig.internalLogistics?.downbeat || "TBD";
              const attire = gig.internalLogistics?.attire || "Band Standard";
              const userRsvp = userRsvps[gig.id];
              const isCancelled = gig.status === "cancelled";

              return (
                <div
                  key={gig.id}
                  suppressHydrationWarning
                  style={{
                    backgroundColor: "var(--ebb-surface-muted)",
                    borderColor: "var(--ebb-border)",
                  }}
                  className="border rounded-xl p-4 sm:p-5 space-y-4 shadow-sm"
                >
                  {/* Gig Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span 
                          suppressHydrationWarning
                          style={{
                            borderColor: "var(--ebb-border)",
                            color: "var(--ebb-primary)"
                          }}
                          className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded border bg-black/30"
                        >
                          {gig.status}
                        </span>
                        {isCancelled && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                            Cancelled
                          </span>
                        )}
                      </div>
                      <h3 className="text-base font-bold text-white mt-1">
                        {title}
                      </h3>
                    </div>

                    {/* Stage View Quick Button */}
                    {!isCancelled && (
                      <Link
                        href={`/portal/perform/${gig.id}`}
                        onClick={onClose}
                        className="bg-yellow-400 hover:bg-yellow-300 text-slate-950 px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 shrink-0 transition shadow"
                        title="Launch Stage View Teleprompter"
                      >
                        <PlaySquare className="w-3.5 h-3.5" />
                        <span>Stage View</span>
                      </Link>
                    )}
                  </div>

                  {/* Gig Key Logistics Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-300">
                    <div className="flex items-start gap-2 bg-black/20 p-2.5 rounded-lg border border-white/5">
                      <Clock className="w-3.5 h-3.5 text-yellow-400 shrink-0 mt-0.5" />
                      <div>
                        <div className="text-[10px] uppercase font-bold text-slate-400 font-mono">
                          Schedule Times
                        </div>
                        <div>
                          Call: <strong className="text-white">{callTime}</strong>
                        </div>
                        <div>
                          Downbeat: <strong className="text-white">{downbeat}</strong>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start gap-2 bg-black/20 p-2.5 rounded-lg border border-white/5">
                      <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <div className="text-[10px] uppercase font-bold text-slate-400 font-mono">
                          Location / Stage
                        </div>
                        <div className="font-semibold text-white truncate">{venue}</div>
                        {address && address !== venue && (
                          <div className="text-[11px] text-slate-400 truncate">{address}</div>
                        )}
                      </div>
                    </div>

                    <div className="sm:col-span-2 flex items-start gap-2 bg-black/20 p-2.5 rounded-lg border border-white/5">
                      <Sparkles className="w-3.5 h-3.5 text-purple-400 shrink-0 mt-0.5" />
                      <div>
                        <div className="text-[10px] uppercase font-bold text-slate-400 font-mono">
                          Attire &amp; Uniform
                        </div>
                        <div className="text-white">{attire}</div>
                      </div>
                    </div>
                  </div>

                  {/* Interactive RSVP Action Controls */}
                  {!isCancelled && (
                    <div className="pt-2 border-t border-white/10 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-300 flex items-center gap-1.5">
                          <span>My Attendance RSVP:</span>
                          {userRsvp === "attending" && (
                            <span className="text-emerald-400 font-bold flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Confirmed In
                            </span>
                          )}
                          {userRsvp === "tentative" && (
                            <span className="text-amber-400 font-bold flex items-center gap-1">
                              <HelpCircle className="w-3.5 h-3.5" /> Tentative
                            </span>
                          )}
                          {userRsvp === "declined" && (
                            <span className="text-rose-400 font-bold flex items-center gap-1">
                              <XCircle className="w-3.5 h-3.5" /> Declined Out
                            </span>
                          )}
                          {!userRsvp && (
                            <span className="text-slate-400 flex items-center gap-1">
                              <AlertCircle className="w-3.5 h-3.5" /> Response Needed
                            </span>
                          )}
                        </span>
                        {isUpdatingRsvp && (
                          <span className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
                            <Loader2 className="w-3 h-3 animate-spin" /> Saving...
                          </span>
                        )}
                      </div>

                      {/* 1-Click RSVP Button Selector */}
                      {onRsvpChange && (
                        <div className="grid grid-cols-3 gap-2">
                          <button
                            type="button"
                            disabled={isUpdatingRsvp}
                            onClick={() => onRsvpChange(gig.id, "attending")}
                            className={`py-2 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition border ${
                              userRsvp === "attending"
                                ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-sm"
                                : "bg-black/30 hover:bg-emerald-500/10 text-slate-300 hover:text-emerald-300 border-white/10"
                            }`}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            <span>In / Attend</span>
                          </button>

                          <button
                            type="button"
                            disabled={isUpdatingRsvp}
                            onClick={() => onRsvpChange(gig.id, "tentative")}
                            className={`py-2 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition border ${
                              userRsvp === "tentative"
                                ? "bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm"
                                : "bg-black/30 hover:bg-amber-500/10 text-slate-300 hover:text-amber-300 border-white/10"
                            }`}
                          >
                            <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
                            <span>Tentative</span>
                          </button>

                          <button
                            type="button"
                            disabled={isUpdatingRsvp}
                            onClick={() => onRsvpChange(gig.id, "declined")}
                            className={`py-2 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition border ${
                              userRsvp === "declined"
                                ? "bg-rose-500/20 text-rose-300 border-rose-500/50 shadow-sm"
                                : "bg-black/30 hover:bg-rose-500/10 text-slate-300 hover:text-rose-300 border-white/10"
                            }`}
                          >
                            <XCircle className="w-3.5 h-3.5 text-rose-400" />
                            <span>Out / Can&apos;t</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Direct Link to Full Call Sheet */}
                  <div className="pt-2 flex justify-end">
                    <Link
                      href={`/portal/gigs/${gig.id}`}
                      onClick={onClose}
                      className="text-xs font-bold text-slate-300 hover:text-white flex items-center gap-1 hover:underline"
                    >
                      <span>Full Call Sheet &amp; Logistics</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div 
          suppressHydrationWarning
          style={{ borderColor: "var(--ebb-border)" }}
          className="p-4 border-t flex justify-end shrink-0"
        >
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

