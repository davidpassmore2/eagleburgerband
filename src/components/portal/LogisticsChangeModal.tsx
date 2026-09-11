"use client";

import React, { useState } from "react";
import { FieldDiff } from "@/lib/logistics/diff";
import { 
  BellRing, 
  X, 
  Send, 
  AlertTriangle, 
  Loader2, 
  EyeOff 
} from "lucide-react";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  gigTitle: string;
  gigDate: string;
  diffs: FieldDiff[];
  confirmedCount: number;
  onConfirm: (broadcast: boolean) => Promise<void>;
};

export default function LogisticsChangeModal({
  isOpen,
  onClose,
  gigTitle,
  gigDate,
  diffs,
  confirmedCount,
  onConfirm,
}: Props) {
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleAction = async (broadcast: boolean) => {
    setSubmitting(true);
    try {
      await onConfirm(broadcast);
      onClose();
    } catch (err) {
      alert("Failed to process update: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/85 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl space-y-4">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center gap-2">
            <BellRing className="w-5 h-5 text-yellow-400" />
            <div>
              <h2 className="text-base font-bold text-white">Logistics Changes Detected</h2>
              <p className="text-xs text-slate-400 truncate max-w-xs">{gigTitle} {gigDate && `• ${gigDate}`}</p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            disabled={submitting}
            className="text-slate-400 hover:text-white p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Diff Content */}
        <div className="p-5 space-y-4 text-xs">
          <div className="bg-amber-950/30 border border-amber-900/50 rounded-xl p-3.5 flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-amber-200/90 leading-relaxed">
              You modified key performance details. Would you like to save quietly, or broadcast an instant notification to all{" "}
              <strong className="text-white font-mono">{confirmedCount}</strong> confirmed musician(s)?
            </p>
          </div>

          <div className="border border-slate-800 rounded-xl overflow-hidden">
            <div className="p-2.5 bg-slate-950 border-b border-slate-800 font-bold uppercase tracking-wider text-slate-400 text-[10px]">
              Modified Fields ({diffs.length})
            </div>
            <div className="divide-y divide-slate-800/60 bg-slate-900 max-h-60 overflow-y-auto">
              {diffs.map((d) => (
                <div key={d.field} className="p-3 space-y-1">
                  <div className="font-bold text-white uppercase text-[11px]">{d.label}</div>
                  <div className="flex items-center gap-2 font-mono text-xs">
                    <span className="text-rose-400 bg-rose-950/40 border border-rose-900/40 px-2 py-0.5 rounded line-through truncate max-w-[180px]">
                      {d.oldValue}
                    </span>
                    <span className="text-slate-500">➔</span>
                    <span className="text-emerald-400 bg-emerald-950/40 border border-emerald-900/40 px-2 py-0.5 rounded font-bold truncate max-w-[180px]">
                      {d.newValue}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex flex-col sm:flex-row justify-end gap-2">
          <button
            type="button"
            disabled={submitting}
            onClick={() => handleAction(false)}
            className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border border-slate-700 transition disabled:opacity-50"
          >
            <EyeOff className="w-3.5 h-3.5 text-slate-400" />
            Save Silently
          </button>

          <button
            type="button"
            disabled={submitting}
            onClick={() => handleAction(true)}
            className="bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 transition disabled:opacity-50 shadow-lg"
          >
            {submitting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            {submitting ? "Broadcasting..." : "Save & Broadcast Alert"}
          </button>
        </div>
      </div>
    </div>
  );
}