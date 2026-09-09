"use client";

import React, { useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { diffLogistics, LogisticsFields, FieldDiff } from "@/lib/logistics/diff";
import LogisticsChangeModal from "./LogisticsChangeModal";
import { 
  Edit3, 
  X, 
  Save, 
  Loader2 
} from "lucide-react";

type Props = {
  gigId: string;
  initialDate: string;
  initialLogistics: LogisticsFields & { title?: string };
  confirmedCount: number;
  managerName: string;
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
};

export default function EditGigLogisticsModal({
  gigId,
  initialDate,
  initialLogistics,
  confirmedCount,
  managerName,
  isOpen,
  onClose,
  onSaved,
}: Props) {
  const [title, setTitle] = useState<string>(() => initialLogistics?.title || "");
  const [date, setDate] = useState<string>(() => initialDate || "");
  const [callTime, setCallTime] = useState<string>(() => initialLogistics?.callTime || "");
  const [downbeat, setDownbeat] = useState<string>(() => initialLogistics?.downbeat || "");
  const [attire, setAttire] = useState<string>(() => initialLogistics?.attire || "");
  const [unloadingAddress, setUnloadingAddress] = useState<string>(() => initialLogistics?.unloadingAddress || "");
  const [parkingNotes, setParkingNotes] = useState<string>(() => initialLogistics?.parkingNotes || "");
  const [compensation, setCompensation] = useState<number>(() => Number(initialLogistics?.compensation) || 0);

  const [pendingDiffs, setPendingDiffs] = useState<FieldDiff[]>([]);
  const [isDiffModalOpen, setIsDiffModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const oldValues: LogisticsFields = {
      date: initialDate || "",
      callTime: initialLogistics?.callTime || "",
      downbeat: initialLogistics?.downbeat || "",
      attire: initialLogistics?.attire || "",
      unloadingAddress: initialLogistics?.unloadingAddress || "",
      parkingNotes: initialLogistics?.parkingNotes || "",
      compensation: Number(initialLogistics?.compensation) || 0,
    };

    const newValues: LogisticsFields = {
      date: date || "",
      callTime: callTime.trim(),
      downbeat: downbeat.trim(),
      attire: attire.trim(),
      unloadingAddress: unloadingAddress.trim(),
      parkingNotes: parkingNotes.trim(),
      compensation: Number(compensation) || 0,
    };

    const calculatedDiffs = diffLogistics(oldValues, newValues);

    if (calculatedDiffs.length > 0) {
      setPendingDiffs(calculatedDiffs);
      setIsDiffModalOpen(true);
    } else {
      executeSave(false, []);
    }
  };

  const executeSave = async (broadcast: boolean, diffsToBroadcast = pendingDiffs) => {
    setSaving(true);
    try {
      await updateDoc(doc(db, "gigs", gigId), {
        date,
        "internalLogistics.title": title.trim(),
        "internalLogistics.callTime": callTime.trim(),
        "internalLogistics.downbeat": downbeat.trim(),
        "internalLogistics.attire": attire.trim(),
        "internalLogistics.unloadingAddress": unloadingAddress.trim(),
        "internalLogistics.parkingNotes": parkingNotes.trim(),
        "internalLogistics.compensation": Number(compensation) || 0,
        updatedAt: new Date().toISOString(),
      });

      if (broadcast && diffsToBroadcast.length > 0) {
        await fetch("/api/webhooks/logistics-alert", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            gigId,
            gigTitle: title,
            gigDate: date,
            diffs: diffsToBroadcast,
            confirmedRecipientsCount: confirmedCount,
            initiatedBy: managerName,
          }),
        });
      }

      if (onSaved) onSaved();
      setIsDiffModalOpen(false);
      onClose();
    } catch (err) {
      alert("Failed to save changes: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
          {/* Header */}
          <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
            <div className="flex items-center gap-2">
              <Edit3 className="w-5 h-5 text-yellow-400" />
              <div>
                <h2 className="text-base font-bold text-white">Edit Gig Logistics</h2>
                <p className="text-xs text-slate-400">Updates will reflect immediately on the call sheet.</p>
              </div>
            </div>
            <button type="button" onClick={onClose} className="text-slate-400 hover:text-white p-1">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Edit Form */}
          <form onSubmit={handleFormSubmit} className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
            <div>
              <label className="block text-slate-400 uppercase font-bold mb-1">Performance Title</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white font-semibold focus:outline-none focus:border-yellow-400"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-400 uppercase font-bold mb-1">Performance Date</label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white font-mono focus:outline-none focus:border-yellow-400"
                />
              </div>

              <div>
                <label className="block text-slate-400 uppercase font-bold mb-1">Musician Call Time</label>
                <input
                  type="text"
                  required
                  value={callTime}
                  onChange={(e) => setCallTime(e.target.value)}
                  placeholder="e.g. 5:30 PM"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white font-mono focus:outline-none focus:border-yellow-400"
                />
              </div>

              <div>
                <label className="block text-slate-400 uppercase font-bold mb-1">Downbeat</label>
                <input
                  type="text"
                  required
                  value={downbeat}
                  onChange={(e) => setDownbeat(e.target.value)}
                  placeholder="e.g. 6:30 PM"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white font-mono focus:outline-none focus:border-yellow-400"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 uppercase font-bold mb-1">Attire / Uniform</label>
                <input
                  type="text"
                  required
                  value={attire}
                  onChange={(e) => setAttire(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-yellow-400"
                />
              </div>

              <div>
                <label className="block text-slate-400 uppercase font-bold mb-1">Musician Pay ($)</label>
                <input
                  type="number"
                  min="0"
                  value={compensation}
                  onChange={(e) => setCompensation(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white font-mono focus:outline-none focus:border-yellow-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-400 uppercase font-bold mb-1">Unloading Address</label>
              <input
                type="text"
                required
                value={unloadingAddress}
                onChange={(e) => setUnloadingAddress(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-yellow-400"
              />
            </div>

            <div>
              <label className="block text-slate-400 uppercase font-bold mb-1">Parking & Access Notes</label>
              <textarea
                rows={3}
                value={parkingNotes}
                onChange={(e) => setParkingNotes(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-yellow-400"
              />
            </div>

            <div className="p-3 bg-slate-950 border-t border-slate-800 flex justify-end gap-2 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      </div>

      {isDiffModalOpen && (
        <LogisticsChangeModal
          isOpen={isDiffModalOpen}
          onClose={() => setIsDiffModalOpen(false)}
          gigTitle={title}
          gigDate={date}
          diffs={pendingDiffs}
          confirmedCount={confirmedCount}
          onConfirm={async (broadcast) => {
            await executeSave(broadcast, pendingDiffs);
          }}
        />
      )}
    </>
  );
}