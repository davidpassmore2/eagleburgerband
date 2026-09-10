"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { 
  collection, 
  onSnapshot, 
  setDoc, 
  deleteDoc, 
  doc 
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/lib/context/AuthContext";
import { 
  CalendarOff, 
  Plus, 
  Trash2, 
  ArrowLeft, 
  Loader2, 
  Check, 
  Calendar as CalendarIcon,
  Clock
} from "lucide-react";

interface MusicianBlackout {
  id: string;
  startDate: string;
  endDate: string;
  reason?: string;
  createdAt: string;
}

export default function MusicianAvailabilityPage() {
  const { firebaseUser, profile, loading: authLoading } = useAuth();
  const [blackouts, setBlackouts] = useState<MusicianBlackout[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    startDate: "",
    endDate: "",
    reason: "",
  });

  useEffect(() => {
    if (authLoading || !firebaseUser) return;

    const unsub = onSnapshot(
      collection(db, "users", firebaseUser.uid, "blackouts"),
      (snap) => {
        const list: MusicianBlackout[] = [];
        snap.forEach((d) => {
          const data = d.data();
          list.push({
            id: d.id,
            startDate: data.startDate || "",
            endDate: data.endDate || data.startDate || "",
            reason: data.reason || "",
            createdAt: data.createdAt || "",
          });
        });
        list.sort((a, b) => a.startDate.localeCompare(b.startDate));
        setBlackouts(list);
        setLoading(false);
      },
      (err) => {
        console.error("Error loading blackouts:", err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [authLoading, firebaseUser]);

  const handleCreateBlackout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser || !formData.startDate) return;

    setSaving(true);
    try {
      const blackoutId = `bo_${Date.now()}`;
      const payload = {
        id: blackoutId,
        uid: firebaseUser.uid,
        userName: profile?.displayName || firebaseUser.displayName || "Musician",
        startDate: formData.startDate,
        endDate: formData.endDate || formData.startDate,
        reason: formData.reason.trim(),
        createdAt: new Date().toISOString(),
      };

      await setDoc(doc(db, "users", firebaseUser.uid, "blackouts", blackoutId), payload);
      setIsAdding(false);
      setFormData({ startDate: "", endDate: "", reason: "" });
    } catch (err) {
      alert("Failed to save blackout: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!firebaseUser || !confirm("Remove this blackout period?")) return;
    try {
      await deleteDoc(doc(db, "users", firebaseUser.uid, "blackouts", id));
    } catch (err) {
      alert("Failed to delete blackout: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-400 gap-2 text-xs">
        <Loader2 className="w-4 h-4 animate-spin text-yellow-400" />
        Loading your availability profile...
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link
              href="/portal"
              className="p-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:text-white transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
            </Link>
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-yellow-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
              Musician Availability
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-white">Blackout Dates & Conflicts</h1>
          <p className="text-xs text-slate-400">
            Keep section leaders informed when you are out of town or unavailable for gigs and rehearsals.
          </p>
        </div>

        {!isAdding && (
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition shadow shrink-0"
          >
            <Plus className="w-4 h-4" /> Add Blackout Dates
          </button>
        )}
      </div>

      {/* Form */}
      {isAdding && (
        <form
          onSubmit={handleCreateBlackout}
          className="bg-slate-900 border border-yellow-400/30 rounded-2xl p-5 space-y-4 shadow-2xl"
        >
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <CalendarOff className="w-4 h-4 text-yellow-400" /> New Blackout Range
            </h2>
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="text-slate-400 hover:text-white text-xs"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">Start Date *</label>
              <input
                type="date"
                required
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">End Date (optional)</label>
              <input
                type="date"
                value={formData.endDate}
                min={formData.startDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-300 block mb-1">Reason / Note (optional)</label>
            <input
              type="text"
              placeholder="e.g. Out of town, wedding gig, family travel"
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-3 py-1.5 text-xs text-slate-400 hover:text-white transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold px-4 py-1.5 rounded-lg text-xs flex items-center gap-1 transition disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              <span>Save Blackout</span>
            </button>
          </div>
        </form>
      )}

      {/* Blackouts List */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
          <Clock className="w-3.5 h-3.5" /> Scheduled Unavailable Dates ({blackouts.length})
        </h2>

        {blackouts.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-2 text-slate-400">
            <CalendarIcon className="w-8 h-8 mx-auto text-slate-600" />
            <p className="text-xs font-semibold">No blackout dates on your calendar.</p>
            <p className="text-[11px] text-slate-500">You are currently marked as available for upcoming performance calls.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {blackouts.map((bo) => (
              <div
                key={bo.id}
                className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between gap-3 shadow transition hover:border-slate-700"
              >
                <div className="space-y-1">
                  <div className="text-xs font-mono font-bold text-yellow-400 flex items-center gap-1.5">
                    <CalendarOff className="w-3.5 h-3.5 text-rose-400" />
                    <span>
                      {bo.startDate}
                      {bo.endDate && bo.endDate !== bo.startDate && ` → ${bo.endDate}`}
                    </span>
                  </div>
                  {bo.reason && (
                    <div className="text-xs text-slate-300 font-semibold">{bo.reason}</div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => handleDelete(bo.id)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-950 transition border border-transparent hover:border-slate-800"
                  title="Remove blackout"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}