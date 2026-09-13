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
  Check,
  Navigation,
  Edit3
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
    showExternalDirections?: boolean;
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
  const [editingGig, setEditingGig] = useState<GigItem | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    date: "",
    status: "draft" as GigItem["status"],
    venue: "",
    venueAddress: "",
    showExternalDirections: true,
    callTime: "5:00 PM",
    downbeat: "6:00 PM",
    attire: "Eagleburger Yellows & Black",
    compensation: 50,
    description: "",
  });

  const [editFormData, setEditFormData] = useState({
    title: "",
    date: "",
    status: "draft" as GigItem["status"],
    venue: "",
    venueAddress: "",
    showExternalDirections: true,
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
          showExternalDirections: formData.showExternalDirections,
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
        showExternalDirections: true,
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

  const handleToggleNavigation = async (gigId: string, currentVal: boolean | undefined) => {
    try {
      const gigRef = doc(db, "gigs", gigId);
      await setDoc(
        gigRef,
        {
          publicDetails: {
            showExternalDirections: currentVal === false ? true : false,
          },
        },
        { merge: true }
      );
    } catch (err) {
      alert("Failed to update navigation setting: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleOpenEdit = (gig: GigItem) => {
    setEditingGig(gig);
    setEditFormData({
      title: gig.publicDetails?.title || gig.id,
      date: gig.date || "",
      status: gig.status || "draft",
      venue: gig.publicDetails?.venue || "",
      venueAddress: gig.publicDetails?.venueAddress || "",
      showExternalDirections: gig.publicDetails?.showExternalDirections !== false,
      callTime: gig.internalLogistics?.callTime || "5:00 PM",
      downbeat: gig.internalLogistics?.downbeat || "6:00 PM",
      attire: gig.internalLogistics?.attire || "Eagleburger Yellows & Black",
      compensation: gig.internalLogistics?.compensation ?? 50,
      description: gig.publicDetails?.description || "",
    });
  };

  const handleUpdateGig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGig) return;

    setIsSaving(true);
    try {
      await setDoc(
        doc(db, "gigs", editingGig.id),
        {
          date: editFormData.date,
          status: editFormData.status,
          publicDetails: {
            title: editFormData.title.trim(),
            venue: editFormData.venue.trim(),
            venueAddress: editFormData.venueAddress.trim(),
            description: editFormData.description.trim(),
            showExternalDirections: editFormData.showExternalDirections,
          },
          internalLogistics: {
            title: editFormData.title.trim(),
            callTime: editFormData.callTime.trim(),
            downbeat: editFormData.downbeat.trim(),
            attire: editFormData.attire.trim(),
            compensation: Number(editFormData.compensation) || 0,
          },
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
      setEditingGig(null);
    } catch (err) {
      alert("Failed to update gig: " + (err instanceof Error ? err.message : String(err)));
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

          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Navigation className="w-4 h-4 text-yellow-400 shrink-0" />
              <div>
                <span className="text-xs font-semibold text-slate-200 block">
                  1-Click External Navigation
                </span>
                <span className="text-[11px] text-slate-400 block">
                  Show &quot;Open in Google Maps&quot; and &quot;Open in Apple Maps&quot; buttons on the public event page map
                </span>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={formData.showExternalDirections}
                onChange={(e) => setFormData({ ...formData, showExternalDirections: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-yellow-400"></div>
            </label>
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

      {/* Edit Gig Modal */}
      {editingGig && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 overflow-y-auto">
          <form
            onSubmit={handleUpdateGig}
            className="bg-slate-900 border border-yellow-400/40 rounded-2xl p-5 space-y-4 shadow-2xl max-w-2xl w-full my-8"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-yellow-400" /> Edit Performance: {editingGig.id}
              </h2>
              <button
                type="button"
                onClick={() => setEditingGig(null)}
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
                  value={editFormData.title}
                  onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400"
                />
              </div>

              <div>
                <DatePicker
                  label="Date"
                  required
                  value={editFormData.date}
                  onChange={(date) => setEditFormData({ ...editFormData, date })}
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">Status</label>
                <select
                  value={editFormData.status}
                  onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value as GigItem["status"] })}
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
                  value={editFormData.venue}
                  onChange={(e) => setEditFormData({ ...editFormData, venue: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">Venue Address / Intersection</label>
                <input
                  type="text"
                  placeholder="e.g. 43rd & Butler, Pittsburgh, PA"
                  value={editFormData.venueAddress}
                  onChange={(e) => setEditFormData({ ...editFormData, venueAddress: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400"
                />
              </div>
            </div>

            {/* 1-Click Navigation Toggle in Edit Modal */}
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Navigation className="w-4 h-4 text-yellow-400 shrink-0" />
                <div>
                  <span className="text-xs font-semibold text-slate-200 block">
                    1-Click External Navigation
                  </span>
                  <span className="text-[11px] text-slate-400 block">
                    Show &quot;Open in Google Maps&quot; and &quot;Open in Apple Maps&quot; buttons on the public event page map
                  </span>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={editFormData.showExternalDirections}
                  onChange={(e) => setEditFormData({ ...editFormData, showExternalDirections: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-yellow-400"></div>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <TimePicker
                  label="Call Time"
                  value={editFormData.callTime}
                  onChange={(callTime) => setEditFormData({ ...editFormData, callTime })}
                />
              </div>
              <div>
                <TimePicker
                  label="Downbeat"
                  value={editFormData.downbeat}
                  onChange={(downbeat) => setEditFormData({ ...editFormData, downbeat })}
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">Musician Compensation ($)</label>
                <input
                  type="number"
                  value={editFormData.compensation}
                  onChange={(e) => setEditFormData({ ...editFormData, compensation: parseInt(e.target.value, 10) || 0 })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setEditingGig(null)}
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
                {isSaving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
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
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(g)}
                    className="text-slate-500 hover:text-yellow-400 p-1 rounded transition"
                    title="Edit performance details & map navigation"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteGig(g.id, g.publicDetails?.title || g.id)}
                    className="text-slate-500 hover:text-rose-400 p-1 rounded transition"
                    title="Delete gig"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
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

              {/* 1-Click External Navigation Toggle */}
              <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800/60">
                <span className="text-[11px] text-slate-400 flex items-center gap-1.5">
                  <Navigation className="w-3 h-3 text-yellow-400 shrink-0" />
                  1-Click Navigation:
                </span>
                <button
                  type="button"
                  onClick={() => handleToggleNavigation(g.id, g.publicDetails?.showExternalDirections)}
                  title={
                    g.publicDetails?.showExternalDirections !== false
                      ? "Directions buttons visible on public map. Click to toggle OFF."
                      : "Directions buttons hidden on public map. Click to toggle ON."
                  }
                  className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border transition flex items-center gap-1 ${
                    g.publicDetails?.showExternalDirections !== false
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20"
                      : "bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700"
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${g.publicDetails?.showExternalDirections !== false ? "bg-emerald-400" : "bg-slate-500"}`}></span>
                  {g.publicDetails?.showExternalDirections !== false ? "ENABLED" : "DISABLED"}
                </button>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
              <Link
                href={`/gigs/${g.id}`}
                target="_blank"
                className="text-xs font-semibold text-slate-400 hover:text-white flex items-center gap-1 transition"
                title="View public event landing page"
              >
                <span>Public Page</span>
                <ExternalLink className="w-3 h-3 text-slate-500" />
              </Link>
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