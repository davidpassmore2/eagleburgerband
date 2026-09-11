"use client";

import React, { useEffect, useState } from "react";
import { 
  collection, 
  onSnapshot, 
  doc, 
  updateDoc, 
  deleteDoc,
  setDoc
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/lib/context/AuthContext";
import { canManageGigs } from "@/lib/auth/permissions";
import { User } from "@/lib/schema/user";
import { 
  Inbox, 
  Mail, 
  Phone, 
  Calendar, 
  MapPin, 
  DollarSign, 
  ArrowRight, 
  Trash2, 
  Loader2, 
  ShieldAlert,
  Search
} from "lucide-react";

interface BookingInquiry {
  id: string;
  clientName: string;
  organization?: string;
  email: string;
  phone?: string;
  eventTitle: string;
  eventType: string;
  date: string;
  startTime?: string;
  venue: string;
  venueAddress?: string;
  budget?: number;
  message?: string;
  status: "pending" | "contacted" | "confirmed" | "declined";
  createdAt?: string;
  updatedAt?: string;
}

export default function InquiriesAdminPage() {
  const { profile, loading: authLoading } = useAuth();
  const [inquiries, setInquiries] = useState<BookingInquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [convertingId, setConvertingId] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;

    const unsub = onSnapshot(
      collection(db, "inquiries"),
      (snap) => {
        const list: BookingInquiry[] = [];
        snap.forEach((d) => {
          list.push({ id: d.id, ...d.data() } as BookingInquiry);
        });
        list.sort((a, b) => {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateB - dateA;
        });
        setInquiries(list);
        setLoading(false);
      },
      (err) => {
        console.error("Inquiries listener error:", err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [authLoading]);

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-400 gap-2 text-xs">
        <Loader2 className="w-4 h-4 animate-spin text-yellow-400" />
        Loading booking leads...
      </div>
    );
  }

  if (!canManageGigs(profile as unknown as User)) {
    return (
      <div className="p-8 text-rose-400 text-xs font-semibold flex items-center gap-2">
        <ShieldAlert className="w-4 h-4" />
        Manager or Admin privileges required to manage booking inquiries.
      </div>
    );
  }

  const handleUpdateStatus = async (id: string, status: BookingInquiry["status"]) => {
    try {
      await updateDoc(doc(db, "inquiries", id), {
        status,
        updatedAt: new Date().toISOString(),
      });
      try {
        await updateDoc(doc(db, "booking_leads", id), {
          status: status === "confirmed" ? "converted" : status,
          updatedAt: new Date().toISOString(),
        });
      } catch {
        // silent fallback if lead does not exist in booking_leads
      }
    } catch (err) {
      alert("Failed to update status: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleDeleteInquiry = async (id: string, title: string) => {
    if (!confirm(`Delete inquiry for "${title}"?`)) return;
    try {
      await deleteDoc(doc(db, "inquiries", id));
      try {
        await deleteDoc(doc(db, "booking_leads", id));
      } catch {
        // silent fallback
      }
    } catch (err) {
      alert("Failed to delete inquiry: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleConvertToGig = async (inq: BookingInquiry) => {
    if (!confirm(`Convert "${inq.eventTitle}" into a Draft Gig on the band calendar?`)) return;
    setConvertingId(inq.id);

    try {
      const gigId = `gig_${inq.date}_${inq.eventTitle.toLowerCase().replace(/[^a-z0-9]/g, "_")}`;
      const slug = `${inq.date}-${inq.eventTitle.toLowerCase().replace(/[^a-z0-9]/g, "-")}`;

      const newGig = {
        id: gigId,
        slug,
        date: inq.date,
        status: "draft",
        publicDetails: {
          title: inq.eventTitle,
          venue: inq.venue,
          venueAddress: inq.venueAddress || "",
          description: inq.message || `Booking inquiry via ${inq.clientName} (${inq.organization || "Private"})`,
        },
        internalLogistics: {
          title: inq.eventTitle,
          callTime: inq.startTime || "TBD",
          downbeat: inq.startTime || "TBD",
          attire: "Eagleburger Yellows & Black",
          unloadingAddress: inq.venueAddress || inq.venue,
          parkingNotes: "Street parking or venue lot",
          compensation: inq.budget ? Math.floor(inq.budget / 10) : 0,
          description: inq.message || "",
        },
        financials: {
          totalFee: inq.budget || 0,
          settlementType: "equal_split",
          bandFundCut: inq.budget ? Math.floor(inq.budget * 0.15) : 0,
          payouts: {},
          notes: `Converted from booking lead (${inq.clientName} - ${inq.email})`,
        },
        setlist: [],
        rsvpSummary: { attendingCount: 0, declinedCount: 0 },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await setDoc(doc(db, "gigs", gigId), newGig, { merge: true });
      await updateDoc(doc(db, "inquiries", inq.id), {
        status: "confirmed",
        convertedGigId: gigId,
        updatedAt: new Date().toISOString(),
      });

      alert(`Draft gig created: ${inq.eventTitle}`);
    } catch (err) {
      alert("Failed to convert into gig: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setConvertingId(null);
    }
  };

  const filtered = inquiries.filter((inq) => {
    const matchesStatus = filterStatus === "all" || inq.status === filterStatus;
    const matchesSearch =
      inq.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inq.eventTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inq.venue.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (inq.organization || "").toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      {/* Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-yellow-400 bg-slate-950 px-2.5 py-0.5 rounded border border-slate-800">
              Admin Studio
            </span>
            <span className="text-xs font-mono text-slate-400">
              {inquiries.length} Inquir{inquiries.length === 1 ? "y" : "ies"}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Booking Leads</h1>
          <p className="text-xs text-slate-400">
            Review incoming public gig requests, update client statuses, and promote leads directly to drafts.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search leads by client, event title, or venue..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400 font-semibold"
          />
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 shrink-0">
          {["all", "pending", "contacted", "confirmed", "declined"].map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`text-xs px-3 py-1.5 rounded-xl font-bold capitalize transition border ${
                filterStatus === st
                  ? "bg-yellow-400 text-slate-950 border-yellow-400"
                  : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Inquiry Cards List */}
      {filtered.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-500 text-xs flex flex-col items-center justify-center gap-2">
          <Inbox className="w-6 h-6 text-slate-600" />
          No booking inquiries found matching the selected filters.
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((inq) => (
            <div
              key={inq.id}
              className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 space-y-4 shadow transition"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded border ${
                      inq.status === "confirmed"
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                        : inq.status === "declined"
                        ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
                        : inq.status === "contacted"
                        ? "bg-blue-500/10 text-blue-400 border-blue-500/30"
                        : "bg-yellow-500/10 text-yellow-400 border-yellow-500/30"
                    }`}>
                      {inq.status}
                    </span>
                    <span className="text-xs text-slate-500 font-mono">
                      {inq.eventType}
                    </span>
                  </div>
                  <h2 className="text-lg font-bold text-white">{inq.eventTitle}</h2>
                  <div className="text-xs text-slate-400">
                    <strong className="text-slate-300">{inq.clientName}</strong>
                    {inq.organization ? ` (${inq.organization})` : ""}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 self-start shrink-0">
                  <button
                    type="button"
                    disabled={convertingId === inq.id}
                    onClick={() => handleConvertToGig(inq)}
                    className="bg-slate-950 hover:bg-slate-800 border border-slate-800 text-yellow-400 font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1 transition disabled:opacity-50"
                    title="Promote to draft gig on portal calendar"
                  >
                    {convertingId === inq.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <ArrowRight className="w-3.5 h-3.5" />
                    )}
                    <span>Promote to Gig</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteInquiry(inq.id, inq.eventTitle)}
                    className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition"
                    title="Delete lead"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Event Logistics Preview */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-slate-300 bg-slate-950 p-3 rounded-xl border border-slate-800/80">
                <div className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
                  <span>{inq.date} {inq.startTime ? `at ${inq.startTime}` : ""}</span>
                </div>
                <div className="flex items-center gap-2 truncate">
                  <MapPin className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
                  <span className="truncate">{inq.venue}</span>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
                  <span>{inq.budget ? `$${inq.budget} offered` : "Budget unstated"}</span>
                </div>
              </div>

              {inq.message && (
                <div className="text-xs text-slate-400 leading-relaxed bg-slate-950/40 p-3 rounded-xl border border-slate-800/50">
                  <strong className="text-slate-300 block mb-0.5">Client Note:</strong>
                  {inq.message}
                </div>
              )}

              {/* Status and Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/80">
                <div className="flex items-center gap-3 text-xs text-slate-400">
                  <a href={`mailto:${inq.email}`} className="flex items-center gap-1 hover:text-white transition">
                    <Mail className="w-3.5 h-3.5 text-yellow-400" /> {inq.email}
                  </a>
                  {inq.phone && (
                    <a href={`tel:${inq.phone}`} className="flex items-center gap-1 hover:text-white transition">
                      <Phone className="w-3.5 h-3.5 text-yellow-400" /> {inq.phone}
                    </a>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mr-1">
                    Set Status:
                  </span>
                  {(["pending", "contacted", "confirmed", "declined"] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => handleUpdateStatus(inq.id, st)}
                      className={`text-[11px] px-2.5 py-0.5 rounded-lg capitalize font-bold transition border ${
                        inq.status === st
                          ? "bg-slate-800 text-white border-slate-700"
                          : "bg-slate-950 text-slate-500 border-slate-800 hover:text-slate-300"
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}