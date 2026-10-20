"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { Section, SectionSchema } from "@/lib/schema/section";
import { GigRsvpSchema, GigRsvp } from "@/lib/schema/rsvp";
import {
  X,
  Users,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Copy,
  Check,
  Music,
  MapPin,
  Clock,
  Radio,
  ExternalLink,
  Loader2,
  Send,
  UserCheck,
} from "lucide-react";

export interface GigReadinessItem {
  id: string;
  date: string;
  status?: string;
  publicDetails?: {
    title?: string;
    venue?: string;
    venueAddress?: string;
  };
  internalLogistics?: {
    title?: string;
    callTime?: string;
    downbeat?: string;
    unloadingAddress?: string;
  };
}

interface GigReadinessDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  gig: GigReadinessItem | null;
}

export default function GigReadinessDrawer({
  isOpen,
  onClose,
  gig,
}: GigReadinessDrawerProps) {
  const [sections, setSections] = useState<Section[]>([]);
  const [rsvps, setRsvps] = useState<GigRsvp[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedBlast, setCopiedBlast] = useState(false);

  // Close on Escape key press
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Subscribe to Sections
  useEffect(() => {
    if (!isOpen) return;

    const unsub = onSnapshot(
      collection(db, "sections"),
      (snap) => {
        const list: Section[] = [];
        snap.forEach((d) => {
          const parsed = SectionSchema.safeParse({ id: d.id, ...d.data() });
          if (parsed.success) {
            list.push(parsed.data);
          } else {
            // Safe fallback
            const raw = d.data();
            list.push({
              schemaVersion: 1,
              id: d.id,
              name: raw.name || d.id,
              description: raw.description || "",
              notes: raw.notes || "",
              instruments: Array.isArray(raw.instruments) ? raw.instruments : [],
              leaderUid: raw.leaderUid || "",
              leaderName: raw.leaderName || "",
              leaderUids: Array.isArray(raw.leaderUids) ? raw.leaderUids : [],
              memberUids: Array.isArray(raw.memberUids) ? raw.memberUids : [],
              order: typeof raw.order === "number" ? raw.order : 0,
              minRecommended: typeof raw.minRecommended === "number" ? raw.minRecommended : 1,
              metadata: {},
              createdAt: raw.createdAt || new Date().toISOString(),
              updatedAt: raw.updatedAt || new Date().toISOString(),
            });
          }
        });
        list.sort((a, b) => a.order - b.order);
        setSections(list);
      },
      (err) => console.warn("Notice: sections fetch note:", err)
    );

    return () => unsub();
  }, [isOpen]);

  // Subscribe to RSVPs for the specific Gig
  useEffect(() => {
    if (!isOpen || !gig?.id) {
      setRsvps([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsub = onSnapshot(
      collection(db, "gigs", gig.id, "rsvps"),
      (snap) => {
        const list: GigRsvp[] = [];
        snap.forEach((d) => {
          const parsed = GigRsvpSchema.safeParse({ gigId: gig.id, uid: d.id, ...d.data() });
          if (parsed.success) {
            list.push(parsed.data);
          }
        });
        setRsvps(list);
        setLoading(false);
      },
      (err) => {
        console.warn("Notice: rsvps fetch note:", err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [isOpen, gig?.id]);

  // Calculate Section Quorum Analysis
  const quorumAnalysis = useMemo(() => {
    if (!gig || sections.length === 0) return [];

    return sections.map((sec) => {
      const confirmed = rsvps.filter((r) => r.sectionId === sec.id && r.status === "attending");
      const probable = rsvps.filter((r) => r.sectionId === sec.id && r.status === "probable");
      const tentative = rsvps.filter((r) => r.sectionId === sec.id && r.status === "tentative");
      const declined = rsvps.filter((r) => r.sectionId === sec.id && r.status === "declined");

      const min = sec.minRecommended || 1;
      const committed = confirmed.length + probable.length;

      let status: "met" | "warning" | "critical" = "critical";
      if (committed >= min) {
        status = "met";
      } else if (committed + tentative.length >= min) {
        status = "warning";
      }

      return {
        section: sec,
        minRecommended: min,
        confirmed,
        probable,
        tentative,
        declined,
        committedCount: committed,
        deficit: Math.max(0, min - committed),
        status,
      };
    });
  }, [sections, rsvps, gig]);

  const totalSections = quorumAnalysis.length;
  const metCount = quorumAnalysis.filter((s) => s.status === "met").length;
  const warningCount = quorumAnalysis.filter((s) => s.status === "warning").length;
  const criticalCount = quorumAnalysis.filter((s) => s.status === "critical").length;
  const totalConfirmed = rsvps.filter((r) => r.status === "attending").length;
  const totalProbable = rsvps.filter((r) => r.status === "probable").length;

  // Generate and Copy Section Callout Message
  const handleCopyCallout = () => {
    if (!gig) return;
    const title = gig.internalLogistics?.title || gig.publicDetails?.title || "Upcoming Gig";
    const date = gig.date || "TBD";
    const venue = gig.publicDetails?.venue || gig.internalLogistics?.unloadingAddress || "Location TBD";
    const callTime = gig.internalLogistics?.callTime || "TBD";

    const warnings = quorumAnalysis.filter((s) => s.status !== "met");

    const lines = [
      `🚨 SECTION ROSTER AUDIT: ${title} (${date})`,
      `📍 Venue: ${venue} | Call: ${callTime}`,
      `👥 Total Committed: ${totalConfirmed + totalProbable} (${totalConfirmed} In${totalProbable > 0 ? `, ${totalProbable} Probable` : ""})`,
      "",
      warnings.length > 0 ? "⚠️ SECTIONS NEEDING MUSICIANS / SUBS:" : "✅ All instrument sections have met full quorum!",
      ...warnings.map((w) =>
        w.status === "critical"
          ? `• ${w.section.name}: DEFICIT (-${w.deficit}) — only ${w.committedCount} committed (target: ${w.minRecommended})`
          : `• ${w.section.name}: PENDING BUFFER — ${w.committedCount} committed + ${w.tentative.length} tentative (target: ${w.minRecommended})`
      ),
      "",
      "Please update your RSVP status on the portal ASAP if you can play!",
    ];

    navigator.clipboard.writeText(lines.join("\n"));
    setCopiedBlast(true);
    setTimeout(() => setCopiedBlast(false), 2500);
  };

  if (!isOpen || !gig) return null;

  const gigTitle = gig.internalLogistics?.title || gig.publicDetails?.title || "Performance Event";
  const venue = gig.publicDetails?.venue || gig.internalLogistics?.unloadingAddress || "Location TBD";
  const callTime = gig.internalLogistics?.callTime || "TBD";
  const downbeat = gig.internalLogistics?.downbeat || "TBD";

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Dimmed Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-Over Drawer Container */}
      <div className="relative w-full max-w-2xl bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col z-50 h-full overflow-hidden animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 bg-slate-950/80 flex items-start justify-between gap-4 shrink-0">
          <div className="space-y-1.5 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-yellow-400 bg-yellow-400/10 px-2 py-0.5 rounded border border-yellow-400/30 flex items-center gap-1.5">
                <Users className="w-3 h-3" /> Section Readiness
              </span>
              <span className="text-xs font-mono font-bold text-slate-300 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                {gig.date}
              </span>
              {gig.status && (
                <span className="text-[10px] font-mono uppercase text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                  {gig.status}
                </span>
              )}
            </div>
            <h2 className="text-lg sm:text-xl font-extrabold text-white truncate">{gigTitle}</h2>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-yellow-400" />
                Call: <strong className="text-slate-200">{callTime}</strong> | Downbeat:{" "}
                <strong className="text-slate-200">{downbeat}</strong>
              </span>
              <span className="flex items-center gap-1 truncate">
                <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span className="truncate">{venue}</span>
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition shrink-0"
            title="Close drawer (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6 text-xs">
          {/* Quick Action Bar */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleCopyCallout}
              className="bg-slate-800 hover:bg-slate-700 text-yellow-400 border border-slate-700 font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer shadow-sm"
              title="Copy formatted section shortage report to clipboard for texting or WhatsApp"
            >
              {copiedBlast ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied Needs Blast!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Needs Blast</span>
                </>
              )}
            </button>

            <Link
              href={`/portal/checkin/${gig.id}`}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer shadow-sm"
              title="Open day-of roll call kiosk for this performance"
            >
              <UserCheck className="w-3.5 h-3.5 text-yellow-400" />
              <span>Roll Call Kiosk</span>
            </Link>

            <Link
              href={`/portal/gigs/${gig.id}`}
              target="_blank"
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer shadow-sm"
              title="View full musician call sheet"
            >
              <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
              <span>Call Sheet</span>
            </Link>
          </div>

          {/* Quorum KPI Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 space-y-0.5 shadow-sm">
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">
                Total Sections
              </span>
              <div className="text-xl font-black text-white flex items-center gap-1.5">
                <Users className="w-4 h-4 text-yellow-400" />
                {totalSections}
              </div>
            </div>

            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 space-y-0.5 shadow-sm">
              <span className="text-[10px] text-emerald-400 uppercase font-bold tracking-wider block">
                Quorum Met
              </span>
              <div className="text-xl font-black text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                {metCount}
              </div>
            </div>

            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 space-y-0.5 shadow-sm">
              <span className="text-[10px] text-yellow-400 uppercase font-bold tracking-wider block">
                Buffer Pending
              </span>
              <div className="text-xl font-black text-yellow-400 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-yellow-400" />
                {warningCount}
              </div>
            </div>

            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 space-y-0.5 shadow-sm">
              <span className="text-[10px] text-rose-400 uppercase font-bold tracking-wider block">
                Critical Deficit
              </span>
              <div className="text-xl font-black text-rose-400 flex items-center gap-1.5">
                <XCircle className="w-4 h-4 text-rose-400" />
                {criticalCount}
              </div>
            </div>
          </div>

          {/* Committed Musicians Headline */}
          <div className="bg-slate-950/50 border border-slate-800/80 rounded-xl p-3.5 flex items-center justify-between">
            <span className="text-xs text-slate-400">
              Total Committed Strength:
            </span>
            <span className="font-mono font-bold text-white text-xs">
              <strong className="text-emerald-400 text-sm">{totalConfirmed}</strong> In
              {totalProbable > 0 && (
                <>
                  {" "}
                  + <strong className="text-cyan-400">{totalProbable}</strong> Probable
                </>
              )}{" "}
              across ensemble
            </span>
          </div>

          {/* Section-by-Section Breakdown */}
          {loading ? (
            <div className="flex items-center justify-center p-12 text-slate-400 gap-2 text-xs">
              <Loader2 className="w-4 h-4 animate-spin text-yellow-400" />
              Loading section attendance &amp; RSVPs...
            </div>
          ) : (
            <div className="space-y-3.5">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Section Acoustic Coverage
                </h3>
                <span className="text-[11px] text-slate-500 font-mono">
                  {metCount} of {totalSections} met
                </span>
              </div>

              {quorumAnalysis.map((item) => (
                <div
                  key={item.section.id}
                  className={`bg-slate-950 border rounded-2xl p-4 space-y-3.5 transition shadow-sm ${
                    item.status === "met"
                      ? "border-emerald-500/30"
                      : item.status === "warning"
                      ? "border-yellow-400/40"
                      : "border-rose-500/40"
                  }`}
                >
                  {/* Section Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-white text-sm flex items-center gap-2">
                        <Music className="w-4 h-4 text-yellow-400 shrink-0" />
                        {item.section.name}
                      </h4>
                      <span className="text-[11px] text-slate-400">
                        Section Leader: {item.section.leaderName || "Unassigned"}
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

                  {/* Quorum Progress Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] font-mono text-slate-400">
                      <span>
                        Committed: <strong className="text-white">{item.committedCount}</strong>{" "}
                        ({item.confirmed.length} In
                        {item.probable.length > 0 ? ` + ${item.probable.length} Prob` : ""})
                      </span>
                      <span>Target: {item.minRecommended}</span>
                    </div>
                    <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          item.status === "met"
                            ? "bg-emerald-400"
                            : item.status === "warning"
                            ? "bg-yellow-400"
                            : "bg-rose-500"
                        }`}
                        style={{
                          width: `${Math.min(
                            100,
                            (item.committedCount / item.minRecommended) * 100
                          )}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Musician Roster Lists */}
                  <div className="space-y-2 pt-2 border-t border-slate-900 text-xs">
                    {/* Confirmed Musicians */}
                    {item.confirmed.length > 0 && (
                      <div className="space-y-1">
                        <span className="text-[10px] uppercase font-bold text-emerald-400 block">
                          Confirmed In ({item.confirmed.length})
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {item.confirmed.map((m) => (
                            <span
                              key={m.uid}
                              className="bg-slate-900 text-slate-200 px-2 py-0.5 rounded text-[11px] border border-slate-800"
                            >
                              {m.displayName}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Probable Musicians */}
                    {item.probable.length > 0 && (
                      <div className="space-y-1">
                        <span className="text-[10px] uppercase font-bold text-cyan-400 block">
                          Probable ({item.probable.length})
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {item.probable.map((m) => (
                            <span
                              key={m.uid}
                              className="bg-slate-900 text-cyan-300 px-2 py-0.5 rounded text-[11px] border border-cyan-500/30"
                            >
                              {m.displayName}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Tentative Musicians */}
                    {item.tentative.length > 0 && (
                      <div className="space-y-1">
                        <span className="text-[10px] uppercase font-bold text-yellow-400 block">
                          Tentative ({item.tentative.length})
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {item.tentative.map((m) => (
                            <span
                              key={m.uid}
                              className="bg-slate-900 text-yellow-300 px-2 py-0.5 rounded text-[11px] border border-yellow-500/30"
                            >
                              {m.displayName}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Declined Musicians */}
                    {item.declined.length > 0 && (
                      <div className="space-y-1">
                        <span className="text-[10px] uppercase font-bold text-slate-500 block">
                          Declined ({item.declined.length})
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {item.declined.map((m) => (
                            <span
                              key={m.uid}
                              className="bg-slate-900 text-slate-500 px-2 py-0.5 rounded text-[11px] border border-slate-800 line-through"
                            >
                              {m.displayName}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Empty State */}
                    {item.confirmed.length === 0 &&
                      item.probable.length === 0 &&
                      item.tentative.length === 0 &&
                      item.declined.length === 0 && (
                        <p className="text-[11px] text-slate-500 italic">
                          No member RSVPs recorded for this section yet.
                        </p>
                      )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-slate-500">
            Real-time acoustic quorum analysis
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold transition text-xs cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

