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
import { canManageGigs } from "@/lib/auth/permissions";
import { User } from "@/lib/schema/user";
import { 
  Calendar, 
  MapPin, 
  DollarSign, 
  Plus, 
  Trash2, 
  ExternalLink, 
  Loader2, 
  ShieldAlert, 
  X, 
  Check 
} from "lucide-react";
import DatePicker from "@/components/ui/DatePicker";
import TimePicker from "@/components/ui/TimePicker";

interface GigItem {
  id: string;
  slug: string;
  date: string;
  status: "confirmed" | "draft" | "completed" | "cancelled";
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
    attire?: string;
    compensation?: number;
    parkingNotes?: string;
  };
  rsvpSummary?: {
    attendingCount: number;
    declinedCount: number;
  };
}

export default function GigsAdminStudioPage() {
  const { profile, loading: authLoading } = useAuth();
  const [gigs, setGigs] = useState<GigItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    date: "",
    status: "draft" as GigItem["status"],
    venue: "",
    venueAddress: "",
    callTime: "5:00 PM",
    downbeat: "6:00 PM",
    attire: "Eagleburger Yellows & Black",
    compensation: 50,
    description: "",
  });

  useEffect(() => {
    if (authLoading) return;

    const unsub = onSnapshot(
      collection(db, "gigs"),
      (snap) => {
        const list: GigItem[] = [];
        snap.forEach((d) => list.push({ id: d.id, ...d.data() } as GigItem));
        list.sort((a, b) => b.date.localeCompare(a.date));
        setGigs(list);
        setLoading(false);
      },
      (err) => {
        console.error("Gigs listener error:", err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [authLoading]);

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-400 gap-2 text-xs">
        <Loader2 className="w-4 h-4 animate-spin text-yellow-400" />
        Loading band performances...
      </div>
    );
  }

  if (!canManageGigs(profile as unknown as User)) {
    return (
      <div className="p-8 text-rose-400 text-xs font-semibold flex items-center gap-2">
        <ShieldAlert className="w-4 h-4" />
        Manager or Admin privileges required to access the Gig Management Studio.
      </div>
    );
  }

  const handleCreateGig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.date) return;

    setIsSaving(true);
    try {
      const gigId = `gig_${formData.date}_${formData.title.toLowerCase().replace(/[^a-z0-9]/g, "_")}`;
      const slug = `${formData.date}-${formData.title.toLowerCase().replace(/[^a-z0-9]/g, "-")}`;

      const payload = {
        id: gigId,
        slug,
        date: formData.date,
        status: formData.status,
        publicDetails: {
          title: formData.title.trim(),
          venue: formData.venue.trim(),
          venueAddress: formData.venueAddress.trim(),
          description: formData.description.trim(),
        },
        internalLogistics: {
          title: formData.title.trim(),
          callTime: formData.callTime.trim(),
          downbeat: formData.downbeat.trim(),
          attire: formData.attire.trim(),
          compensation: Number(formData.compensation) || 0,
        },
        rsvpSummary: { attendingCount: 0, declinedCount: 0 },
        setlist: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await setDoc(doc(db, "gigs", gigId), payload, { merge: true });
      setIsCreating(false);
      setFormData({
        title: "",
        date: "",
        status: "draft",
        venue: "",
        venueAddress: "",
        callTime: "5:00 PM",
        downbeat: "6:00 PM",
        attire: "Eagleburger Yellows & Black",
        compensation: 50,
        description: "",
      });
    } catch (err) {
      alert("Failed to create gig: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteGig = async (id: string, title: string) => {
    if (!confirm(`Delete performance "${title}" and all its call sheets?`)) return;
    try {
      await deleteDoc(doc(db, "gigs", id));
    } catch (err) {
      alert("Failed to delete gig: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-yellow-400 bg-slate-950 px-2.5 py-0.5 rounded border border-slate-800">
              Admin Studio
            </span>
            <span className="text-xs font-mono text-slate-400">
              {gigs.length} Performance(s)
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Gig Studio</h1>
          <p className="text-xs text-slate-400">
            Publish call sheets, assign logistics, set compensation, and track musician attendance.
          </p>
        </div>

        {!isCreating && (
          <button
            type="button"
            onClick={() => setIsCreating(true)}
            className="bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition shadow shrink-0"
          >
            <Plus className="w-4 h-4" /> Create New Gig
          </button>
        )}
      </div>

      {isCreating && (
        <form
          onSubmit={handleCreateGig}
          className="bg-slate-900 border border-yellow-400/30 rounded-2xl p-5 space-y-4 shadow-xl"
        >
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-yellow-400" /> New Performance Call Sheet
            </h2>
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">Gig Title *</label>
              <input
                type="text"
                required
                placeholder="e.g. Penn Avenue Porchfest Finale"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400"
              />
            </div>

            <div>
              <DatePicker
                label="Date"
                required
                value={formData.date}
                onChange={(date) => setFormData({ ...formData, date })}
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as GigItem["status"] })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400"
              >
                <option value="draft">Draft (Unpublished)</option>
                <option value="confirmed">Confirmed & Dispatched</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">Venue Name</label>
              <input
                type="text"
                placeholder="e.g. 43rd & Butler Street Stage"
                value={formData.venue}
                onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">Venue Address / Intersection</label>
              <input
                type="text"
                placeholder="e.g. 43rd & Butler, Pittsburgh, PA"
                value={formData.venueAddress}
                onChange={(e) => setFormData({ ...formData, venueAddress: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <TimePicker
                label="Call Time"
                value={formData.callTime}
                onChange={(callTime) => setFormData({ ...formData, callTime })}
              />
            </div>
            <div>
              <TimePicker
                label="Downbeat"
                value={formData.downbeat}
                onChange={(downbeat) => setFormData({ ...formData, downbeat })}
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">Musician Compensation ($)</label>
              <input
                type="number"
                value={formData.compensation}
                onChange={(e) => setFormData({ ...formData, compensation: parseInt(e.target.value, 10) || 0 })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="px-3 py-1.5 text-xs text-slate-400 hover:text-white transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold px-4 py-1.5 rounded-lg text-xs flex items-center gap-1 transition disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              {isSaving ? "Saving..." : "Create Performance"}
            </button>
          </div>
        </form>
      )}

      {/* Gig Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {gigs.map((g) => (
          <div
            key={g.id}
            className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 space-y-4 shadow transition flex flex-col justify-between"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className={`text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                  g.status === "confirmed"
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                    : g.status === "completed"
                    ? "bg-slate-800 text-slate-400 border-slate-700"
                    : "bg-yellow-500/10 text-yellow-400 border-yellow-500/30"
                }`}>
                  {g.status}
                </span>
                <button
                  type="button"
                  onClick={() => handleDeleteGig(g.id, g.publicDetails?.title || g.id)}
                  className="text-slate-500 hover:text-rose-400 p-1 rounded transition"
                  title="Delete gig"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <h2 className="text-base font-bold text-white truncate">
                {g.publicDetails?.title || g.id}
              </h2>

              <div className="space-y-1 text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
                  <span>{g.date}</span>
                </div>
                {g.publicDetails?.venue && (
                  <div className="flex items-center gap-2 truncate">
                    <MapPin className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
                    <span className="truncate">{g.publicDetails.venue}</span>
                  </div>
                )}
                {g.internalLogistics?.compensation ? (
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
                    <span>${g.internalLogistics.compensation} per musician</span>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
              <span className="text-[11px] text-slate-500 font-mono">
                ID: {g.id}
              </span>
              <Link
                href={`/portal/gigs/${g.id}`}
                className="text-xs font-bold text-yellow-400 hover:text-yellow-300 flex items-center gap-1"
              >
                <span>Call Sheet</span>
                <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}