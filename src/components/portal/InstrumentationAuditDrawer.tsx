"use client";

import React, { useState } from "react";
import { 
  X, 
  CheckCircle2, 
  AlertTriangle, 
  Copy, 
  Check, 
  Music2, 
  Flame 
} from "lucide-react";

export type AuditPerformer = {
  uid: string;
  displayName: string;
  sectionId?: string;
  instruments?: string[];
  status: "attending" | "declined" | "tentative";
};

export type SectionData = {
  id: string;
  name: string;
  minRecommended?: number;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  gigTitle: string;
  gigDate: string;
  sections: SectionData[];
  performers: AuditPerformer[];
};

export default function InstrumentationAuditDrawer({
  isOpen,
  onClose,
  gigTitle,
  gigDate,
  sections,
  performers,
}: Props) {
  const [copiedBlast, setCopiedBlast] = useState(false);

  if (!isOpen) return null;

  const attendingPerformers = performers.filter((p) => p.status === "attending");

  // Aggregate instrument counts
  const instrumentCounts: Record<string, number> = {};
  const sectionCounts: Record<string, number> = {};

  attendingPerformers.forEach((p) => {
    const secId = p.sectionId || "unassigned";
    sectionCounts[secId] = (sectionCounts[secId] || 0) + 1;

    if (Array.isArray(p.instruments) && p.instruments.length > 0) {
      p.instruments.forEach((inst) => {
        const clean = inst.trim();
        if (clean) {
          instrumentCounts[clean] = (instrumentCounts[clean] || 0) + 1;
        }
      });
    } else {
      instrumentCounts["Unspecified"] = (instrumentCounts["Unspecified"] || 0) + 1;
    }
  });

  // Evaluate section health warnings
  const warnings: { section: string; message: string; severity: "warning" | "danger" }[] = [];

  sections.forEach((sec) => {
    const count = sectionCounts[sec.id] || 0;
    const min = sec.minRecommended ?? 2;

    if (count === 0) {
      warnings.push({
        section: sec.name,
        message: `No players confirmed! Critical gap.`,
        severity: "danger",
      });
    } else if (count < min) {
      warnings.push({
        section: sec.name,
        message: `Only ${count} confirmed (recommended: ${min}+).`,
        severity: "warning",
      });
    }
  });

  const handleCopySectionCallout = () => {
    const lines = [
      `🚨 SECTION ROSTER AUDIT: ${gigTitle} (${gigDate})`,
      `👥 Total Confirmed: ${attendingPerformers.length}`,
      "",
      warnings.length > 0 ? "⚠️ SECTIONS NEEDING PLAYERS / SUBS:" : "✅ All sections met baseline minimums!",
      ...warnings.map((w) => `• ${w.section}: ${w.message}`),
      "",
      "Please update your RSVP status on the portal ASAP if you can make it!",
    ];

    navigator.clipboard.writeText(lines.join("\n"));
    setCopiedBlast(true);
    setTimeout(() => setCopiedBlast(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl space-y-4">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-amber-400" />
            <div>
              <h2 className="text-base font-bold text-white">Section Instrumentation Audit</h2>
              <p className="text-xs text-slate-400 truncate max-w-sm">{gigTitle}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
          {/* Quick Roster Status Summary */}
          <div className="flex items-center justify-between bg-slate-950 border border-slate-800 rounded-xl p-4">
            <div className="space-y-0.5">
              <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold block">
                Total Playing Strength
              </span>
              <div className="text-2xl font-extrabold text-white font-mono">
                {attendingPerformers.length}{" "}
                <span className="text-xs font-normal text-slate-400">musicians confirmed</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleCopySectionCallout}
              className="bg-slate-800 hover:bg-slate-700 text-yellow-400 border border-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition"
            >
              {copiedBlast ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" /> Copied Callout
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" /> Copy Section Callout
                </>
              )}
            </button>
          </div>

          {/* Section Gap Alerts */}
          {warnings.length > 0 ? (
            <div className="bg-rose-950/30 border border-rose-900/50 rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-1.5 text-rose-400 font-bold text-xs">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                Roster Alerts & Shortages
              </div>
              <div className="space-y-1 pl-5">
                {warnings.map((w, idx) => (
                  <div key={idx} className="text-slate-300">
                    <strong className="text-white">{w.section}</strong>: {w.message}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-emerald-950/30 border border-emerald-900/50 rounded-xl p-3 flex items-center gap-2 text-emerald-400">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>All sections have met minimum recommended instrument coverage!</span>
            </div>
          )}

          {/* Section Breakdown Grid */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Section Breakdown
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {sections.map((sec) => {
                const count = sectionCounts[sec.id] || 0;
                const min = sec.minRecommended ?? 2;
                const isShort = count < min;

                return (
                  <div
                    key={sec.id}
                    className={`p-3 rounded-xl border flex items-center justify-between ${
                      count === 0
                        ? "bg-rose-950/20 border-rose-900/40 text-rose-300"
                        : isShort
                        ? "bg-amber-950/20 border-amber-900/40 text-amber-300"
                        : "bg-slate-950 border-slate-800 text-slate-200"
                    }`}
                  >
                    <div>
                      <div className="font-bold text-white text-xs">{sec.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        Target: {min}+ players
                      </div>
                    </div>
                    <span
                      className={`text-sm font-mono font-extrabold px-2.5 py-0.5 rounded ${
                        count === 0
                          ? "bg-rose-900/40 text-rose-400"
                          : isShort
                          ? "bg-amber-900/40 text-amber-400"
                          : "bg-emerald-950 text-emerald-400 border border-emerald-900/50"
                      }`}
                    >
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Distinct Instruments Tallied */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Specific Instrument Counts
            </span>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(instrumentCounts).map(([inst, count]) => (
                <span
                  key={inst}
                  className="bg-slate-950 border border-slate-800 text-slate-300 px-2.5 py-1 rounded-lg text-xs font-mono flex items-center gap-1.5"
                >
                  <Music2 className="w-3 h-3 text-yellow-400" />
                  {inst}: <strong className="text-white">{count}</strong>
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold transition text-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}