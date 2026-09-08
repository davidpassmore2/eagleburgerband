"use client";

import React, { useEffect, useState } from "react";
import { collection, onSnapshot, doc, setDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/lib/context/AuthContext";
import { canManageGigs } from "@/lib/auth/permissions";
import { Gig, GigSchema } from "@/lib/schema/gig";
import { 
  CalendarDays, 
  ShieldAlert, 
  Plus, 
  Edit2, 
  Trash2, 
  Check, 
  X, 
  Clock, 
  MapPin, 
  Shirt, 
  DollarSign, 
  Globe 
} from "lucide-react";

interface FormState {
  id: string;
  date: string;
  status: Gig["status"];
  publicDetails: {
    title: string;
    venue: string;
    city: string;
    description: string;
    admission: string;
    facebookEventUrl: string;
    ticketUrl: string;
  };
  internalLogistics: {
    title: string;
    callTime: string;
    downbeat: string;
    unloadingAddress: string;
    parkingInstructions: string;
    attire: string;
    payPerMusician: number;
    setlistId: string;
    description: string;
  };
}

const DEFAULT_FORM: FormState = {
  id: "",
  date: new Date().toISOString().split("T")[0],
  status: "confirmed",
  publicDetails: {
    title: "",
    venue: "",
    city: "Pittsburgh, PA",
    description: "",
    admission: "Free",
    facebookEventUrl: "",
    ticketUrl: "",
  },
  internalLogistics: {
    title: "",
    callTime: "18:00",
    downbeat: "19:00",
    unloadingAddress: "",
    parkingInstructions: "",
    attire: "Eagleburger Uniform - Bright Yellows & Brass Polish",
    payPerMusician: 0,
    setlistId: "",
    description: "",
  },
};

const statusColors: Record<string, string> = {
  lead: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  tentative: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  confirmed: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  completed: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  cancelled: "bg-rose-500/10 text-rose-400 border-rose-500/20",
  archived: "bg-slate-700/30 text-slate-400 border-slate-700/40",
};

export default function GigsAdminPage() {
  const { profile, loading: authLoading } = useAuth();
  const [gigs, setGigs] = useState<Gig[]>([]);
  const [editingGig, setEditingGig] = useState<Gig | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [activeTab, setActiveTab] = useState<"logistics" | "public">("logistics");
  const [formData, setFormData] = useState<FormState>(DEFAULT_FORM);

  useEffect(() => {
    const unsubGigs = onSnapshot(collection(db, "gigs"), (snap) => {
      const list: Gig[] = [];
      snap.forEach((d) => {
        const parsed = GigSchema.safeParse(d.data());
        if (parsed.success) list.push(parsed.data);
      });
      list.sort((a, b) => b.date.localeCompare(a.date));
      setGigs(list);
    });

    return () => unsubGigs();
  }, []);

  if (authLoading) return <div className="p-8 text-slate-400">Verifying authorization...</div>;
  if (!canManageGigs(profile)) {
    return (
      <div className="p-8 text-amber-400 flex items-center gap-3">
        <ShieldAlert className="w-6 h-6 shrink-0" />
        <span>Gig Manager or Administrator permissions required to manage performances.</span>
      </div>
    );
  }

  const handleStartCreate = () => {
    setEditingGig(null);
    setIsCreating(true);
    setFormData({
      ...DEFAULT_FORM,
      id: `gig_${Date.now()}`,
      date: new Date().toISOString().split("T")[0],
    });
  };

  const handleEdit = (gig: Gig) => {
    setEditingGig(gig);
    setIsCreating(false);

    const pub = (gig.publicDetails || {}) as Record<string, unknown>;
    const log = (gig.internalLogistics || {}) as Record<string, unknown>;

    setFormData({
      id: gig.id,
      date: gig.date,
      status: gig.status,
      publicDetails: {
        title: typeof pub.title === "string" ? pub.title : "",
        venue: typeof pub.venue === "string" ? pub.venue : "",
        city: typeof pub.city === "string" ? pub.city : "Pittsburgh, PA",
        description: typeof pub.description === "string" ? pub.description : "",
        admission: typeof pub.admission === "string" ? pub.admission : "Free",
        facebookEventUrl: typeof pub.facebookEventUrl === "string" ? pub.facebookEventUrl : "",
        ticketUrl: typeof pub.ticketUrl === "string" ? pub.ticketUrl : "",
      },
      internalLogistics: {
        title: typeof log.title === "string" ? log.title : "",
        callTime: typeof log.callTime === "string" ? log.callTime : "18:00",
        downbeat: typeof log.downbeat === "string" ? log.downbeat : "19:00",
        unloadingAddress: typeof log.unloadingAddress === "string" ? log.unloadingAddress : "",
        parkingInstructions: typeof log.parkingInstructions === "string" ? log.parkingInstructions : "",
        attire: typeof log.attire === "string" ? log.attire : "",
        payPerMusician: typeof log.payPerMusician === "number" ? log.payPerMusician : 0,
        setlistId: typeof log.setlistId === "string" ? log.setlistId : "",
        description: typeof log.description === "string" ? log.description : "",
      },
    });
  };

  const handleSave = async () => {
    if (!formData.date.trim()) return;

    const gigId = formData.id || `gig_${Date.now()}`;
    const rawPayload: Record<string, unknown> = {
      id: gigId,
      date: formData.date,
      status: formData.status,
      publicDetails: formData.publicDetails,
      internalLogistics: formData.internalLogistics,
      schemaVersion: 1,
      createdAt: editingGig?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const parsed = GigSchema.safeParse(rawPayload);
    if (!parsed.success) {
      console.error("Gig validation errors:", parsed.error);
      alert("Please check all required fields.");
      return;
    }

    const gigDocRef = doc(db, "gigs", gigId);
    if (isCreating) {
      await setDoc(gigDocRef, parsed.data);
    } else {
      await updateDoc(gigDocRef, parsed.data as Record<string, unknown>);
    }

    setEditingGig(null);
    setIsCreating(false);
  };

  const handleDelete = async (gigId: string) => {
    if (!confirm("Are you sure you want to delete this performance?")) return;
    await deleteDoc(doc(db, "gigs", gigId));
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <CalendarDays className="text-yellow-400" /> Gig Management Studio
          </h1>
          <p className="text-slate-400 text-sm">
            Maintain performance schedules, internal production call times, attire, and public listings.
          </p>
        </div>
        {!editingGig && !isCreating && (
          <button
            onClick={handleStartCreate}
            className="flex items-center gap-2 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold px-4 py-2 rounded text-xs transition shadow"
          >
            <Plus className="w-4 h-4" /> Add Performance
          </button>
        )}
      </div>

      {(isCreating || editingGig) && (
        <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 space-y-5 shadow-2xl">
          <div className="flex justify-between items-center border-b border-slate-800 pb-3">
            <div>
              <h2 className="text-lg font-bold text-white">
                {isCreating
                  ? "Schedule New Performance"
                  : `Edit Gig: ${formData.internalLogistics.title || formData.publicDetails.title || "Untitled"}`}
              </h2>
              <span className="text-xs text-slate-400 font-mono">ID: {formData.id}</span>
            </div>
            <button
              onClick={() => {
                setEditingGig(null);
                setIsCreating(false);
              }}
              className="text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Date</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as Gig["status"] })}
                className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-xs text-white"
              >
                <option value="lead">Lead / Inbound</option>
                <option value="tentative">Tentative / Hold</option>
                <option value="confirmed">Confirmed Performance</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
                <option value="archived">Archived</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Setlist ID</label>
              <input
                type="text"
                placeholder="e.g. set_honk_fest_2026"
                value={formData.internalLogistics.setlistId}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    internalLogistics: {
                      ...formData.internalLogistics,
                      setlistId: e.target.value,
                    },
                  })
                }
                className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-xs text-white font-mono"
              />
            </div>
          </div>

          <div className="flex border-b border-slate-800">
            <button
              type="button"
              onClick={() => setActiveTab("logistics")}
              className={`px-4 py-2 text-xs font-bold transition border-b-2 flex items-center gap-1.5 ${
                activeTab === "logistics"
                  ? "border-yellow-400 text-yellow-400"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <Clock className="w-3.5 h-3.5" /> Internal Band Logistics
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("public")}
              className={`px-4 py-2 text-xs font-bold transition border-b-2 flex items-center gap-1.5 ${
                activeTab === "public"
                  ? "border-yellow-400 text-yellow-400"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <Globe className="w-3.5 h-3.5" /> Public Marketing Details
            </button>
          </div>

          {activeTab === "logistics" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">
                    Internal Gig Title
                  </label>
                  <input
                    type="text"
                    value={formData.internalLogistics.title}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        internalLogistics: {
                          ...formData.internalLogistics,
                          title: e.target.value,
                        },
                      })
                    }
                    placeholder="e.g. Mattress Factory Garden Gig"
                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">
                    Pay Per Musician ($)
                  </label>
                  <input
                    type="number"
                    value={formData.internalLogistics.payPerMusician}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        internalLogistics: {
                          ...formData.internalLogistics,
                          payPerMusician: parseFloat(e.target.value) || 0,
                        },
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-xs text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">
                    Musician Call Time
                  </label>
                  <input
                    type="text"
                    value={formData.internalLogistics.callTime}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        internalLogistics: {
                          ...formData.internalLogistics,
                          callTime: e.target.value,
                        },
                      })
                    }
                    placeholder="e.g. 5:30 PM"
                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">
                    Show Downbeat
                  </label>
                  <input
                    type="text"
                    value={formData.internalLogistics.downbeat}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        internalLogistics: {
                          ...formData.internalLogistics,
                          downbeat: e.target.value,
                        },
                      })
                    }
                    placeholder="e.g. 6:30 PM"
                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-xs text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">
                    Unloading Dock & Staging Address
                  </label>
                  <input
                    type="text"
                    value={formData.internalLogistics.unloadingAddress}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        internalLogistics: {
                          ...formData.internalLogistics,
                          unloadingAddress: e.target.value,
                        },
                      })
                    }
                    placeholder="500 Sampsonia Way (Courtyard Gate)"
                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">
                    Attire & Uniform Specification
                  </label>
                  <input
                    type="text"
                    value={formData.internalLogistics.attire}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        internalLogistics: {
                          ...formData.internalLogistics,
                          attire: e.target.value,
                        },
                      })
                    }
                    placeholder="Band Yellows & Black Pants"
                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">
                  Parking & Production Directives
                </label>
                <textarea
                  rows={2}
                  value={formData.internalLogistics.parkingInstructions}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      internalLogistics: {
                        ...formData.internalLogistics,
                        parkingInstructions: e.target.value,
                      },
                    })
                  }
                  placeholder="Street parking available on Jacksonia. Do not park in museum van spot."
                  className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-xs text-white"
                />
              </div>
            </div>
          )}

          {activeTab === "public" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">
                    Public Performance Title
                  </label>
                  <input
                    type="text"
                    value={formData.publicDetails.title}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        publicDetails: {
                          ...formData.publicDetails,
                          title: e.target.value,
                        },
                      })
                    }
                    placeholder="Mattress Factory Garden Party"
                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">
                    Venue Name
                  </label>
                  <input
                    type="text"
                    value={formData.publicDetails.venue}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        publicDetails: {
                          ...formData.publicDetails,
                          venue: e.target.value,
                        },
                      })
                    }
                    placeholder="Mattress Factory Museum"
                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-xs text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">
                    City / Neighborhood
                  </label>
                  <input
                    type="text"
                    value={formData.publicDetails.city}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        publicDetails: {
                          ...formData.publicDetails,
                          city: e.target.value,
                        },
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">
                    Admission
                  </label>
                  <input
                    type="text"
                    value={formData.publicDetails.admission}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        publicDetails: {
                          ...formData.publicDetails,
                          admission: e.target.value,
                        },
                      })
                    }
                    placeholder="Free / $10"
                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">
                    Ticket / RSVP URL
                  </label>
                  <input
                    type="url"
                    value={formData.publicDetails.ticketUrl}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        publicDetails: {
                          ...formData.publicDetails,
                          ticketUrl: e.target.value,
                        },
                      })
                    }
                    placeholder="https://..."
                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">
                  Public Event Description
                </label>
                <textarea
                  rows={3}
                  value={formData.publicDetails.description}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      publicDetails: {
                        ...formData.publicDetails,
                        description: e.target.value,
                      },
                    })
                  }
                  placeholder="Public event promotion displayed on homepage calendar..."
                  className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-xs text-white"
                />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              onClick={() => {
                setEditingGig(null);
                setIsCreating(false);
              }}
              className="px-4 py-2 text-xs text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-1.5 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold px-5 py-2 rounded text-xs transition shadow"
            >
              <Check className="w-4 h-4" /> Save Performance
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {gigs.map((gig) => {
          const pub = gig.publicDetails as Record<string, unknown> | undefined;
          const log = gig.internalLogistics as Record<string, unknown> | undefined;

          const pay = typeof log?.payPerMusician === "number" ? log.payPerMusician : 0;
          const gigTitle = (typeof log?.title === "string" && log.title) || (typeof pub?.title === "string" && pub.title) || "Untitled Performance";
          const gigVenue = (typeof pub?.venue === "string" && pub.venue) || (typeof log?.unloadingAddress === "string" && log.unloadingAddress) || "Location TBA";
          const gigCall = typeof log?.callTime === "string" ? log.callTime : "TBA";
          const gigBeat = typeof log?.downbeat === "string" ? log.downbeat : "TBA";
          const gigAttire = typeof log?.attire === "string" ? log.attire : "";

          return (
            <div
              key={gig.id}
              className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
            >
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2.5">
                  <span className="font-mono text-xs text-yellow-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                    {gig.date}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                      statusColors[gig.status] || "bg-slate-800 text-slate-300 border-slate-700"
                    }`}
                  >
                    {gig.status}
                  </span>
                  {pay > 0 && (
                    <span className="text-[10px] font-semibold text-emerald-400 flex items-center">
                      <DollarSign className="w-3 h-3" />
                      {pay}/player
                    </span>
                  )}
                </div>

                <div className="font-bold text-base text-white">
                  {gigTitle}
                </div>

                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-500" />
                    {gigVenue}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    Call: {gigCall} | Beat: {gigBeat}
                  </span>
                  {gigAttire && (
                    <span className="flex items-center gap-1">
                      <Shirt className="w-3.5 h-3.5 text-slate-500" />
                      {gigAttire}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center">
                <button
                  onClick={() => handleEdit(gig)}
                  className="p-2 text-slate-400 hover:text-yellow-400 rounded hover:bg-slate-800 transition"
                  title="Edit Gig Logistics"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(gig.id)}
                  className="p-2 text-slate-400 hover:text-rose-400 rounded hover:bg-slate-800 transition"
                  title="Delete Gig"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}