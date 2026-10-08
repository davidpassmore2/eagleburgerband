"use client";

import React, { useState } from "react";
import { User } from "@/lib/schema/user";
import { Section } from "@/lib/schema/section";
import { 
  X, 
  Download, 
  FileSpreadsheet, 
  FileCode, 
  CheckCircle2, 
  Users, 
  ShieldCheck 
} from "lucide-react";
import { 
  exportRosterToCsv, 
  exportRosterToJson, 
  downloadFile 
} from "@/lib/portal/rosterDataIo";
import { toast } from "@/lib/context/ToastContext";

interface RosterExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: User[];
  sections: Section[];
}

export default function RosterExportModal({
  isOpen,
  onClose,
  users,
  sections,
}: RosterExportModalProps) {
  const [format, setFormat] = useState<"csv" | "json">("csv");
  const [isExporting, setIsExporting] = useState(false);

  if (!isOpen) return null;

  const dateSlug = new Date().toISOString().split("T")[0];

  const handleExport = () => {
    setIsExporting(true);
    try {
      if (format === "csv") {
        const csvContent = exportRosterToCsv(users, sections);
        downloadFile(csvContent, `eagleburger-roster-${dateSlug}.csv`, "text/csv;charset=utf-8;");
        toast.success(`Exported ${users.length} roster members as CSV!`);
      } else {
        const jsonContent = exportRosterToJson(users, sections);
        downloadFile(jsonContent, `eagleburger-roster-${dateSlug}.json`, "application/json;charset=utf-8;");
        toast.success(`Exported ${users.length} roster members as JSON!`);
      }
      onClose();
    } catch (err) {
      toast.error("Export failed: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative space-y-6">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-yellow-400/10 border border-yellow-400/20 text-yellow-400 flex items-center justify-center shrink-0">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase font-bold text-yellow-400 tracking-wider">
                Roster Backup &amp; Migration
              </span>
              <h2 className="text-xl font-bold text-white font-arvo">
                Download Band Roster
              </h2>
            </div>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed pt-1">
            Export current musicians, section assignments, roles, instruments, and contact info to transfer to production or store as an offline archive.
          </p>
        </div>

        {/* Summary Card */}
        <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-300">
            <Users className="w-4 h-4 text-yellow-400" />
            <span>Total Members to Export:</span>
          </div>
          <span className="font-mono font-bold text-white text-sm bg-slate-900 px-2.5 py-0.5 rounded-lg border border-slate-800">
            {users.length}
          </span>
        </div>

        {/* Format Selection Cards */}
        <div className="space-y-2">
          <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-300">
            Select Export Format
          </label>
          <div className="grid grid-cols-2 gap-3">
            {/* CSV Option */}
            <button
              type="button"
              onClick={() => setFormat("csv")}
              className={`p-4 rounded-2xl border text-left transition flex flex-col justify-between space-y-2 cursor-pointer ${
                format === "csv"
                  ? "bg-yellow-400/10 border-yellow-400/50 text-white shadow-md shadow-yellow-400/5"
                  : "bg-slate-950/50 border-slate-800 text-slate-400 hover:border-slate-700"
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <FileSpreadsheet className={`w-6 h-6 ${format === "csv" ? "text-yellow-400" : "text-slate-500"}`} />
                {format === "csv" && <CheckCircle2 className="w-4 h-4 text-yellow-400" />}
              </div>
              <div>
                <div className="font-bold text-xs text-white">CSV Spreadsheet</div>
                <div className="text-[10px] text-slate-400 pt-0.5 leading-tight">
                  Excel, Google Sheets &amp; Numbers compatible
                </div>
              </div>
            </button>

            {/* JSON Option */}
            <button
              type="button"
              onClick={() => setFormat("json")}
              className={`p-4 rounded-2xl border text-left transition flex flex-col justify-between space-y-2 cursor-pointer ${
                format === "json"
                  ? "bg-yellow-400/10 border-yellow-400/50 text-white shadow-md shadow-yellow-400/5"
                  : "bg-slate-950/50 border-slate-800 text-slate-400 hover:border-slate-700"
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <FileCode className={`w-6 h-6 ${format === "json" ? "text-yellow-400" : "text-slate-500"}`} />
                {format === "json" && <CheckCircle2 className="w-4 h-4 text-yellow-400" />}
              </div>
              <div>
                <div className="font-bold text-xs text-white">Full JSON Package</div>
                <div className="text-[10px] text-slate-400 pt-0.5 leading-tight">
                  Database restore &amp; production migration format
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Informational Callout */}
        <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-[11px] text-slate-400 space-y-1">
          <div className="flex items-center gap-1.5 font-bold text-slate-300">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Target Filename</span>
          </div>
          <p className="font-mono text-[10px] text-yellow-300">
            eagleburger-roster-{dateSlug}.{format}
          </p>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isExporting || users.length === 0}
            onClick={handleExport}
            className="px-5 py-2.5 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-black text-xs uppercase tracking-wider transition flex items-center gap-2 shadow cursor-pointer disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>Download {format.toUpperCase()}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

