"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  updateDoc, 
  doc, 
  addDoc 
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/lib/context/AuthContext";
import { canManageGigs } from "@/lib/auth/permissions";
import { 
  Inbox, 
  Calendar, 
  MapPin, 
  DollarSign, 
  Mail, 
  Phone, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  ArrowRight, 
  Building2,
  Sparkles
} from "lucide-react";

type Inquiry = {
  id: string;
  clientName: string;
  email: string;
  phone?: string;
  organization?: string;
  eventTitle: string;
  eventType: string;
  date: string;
  startTime?: string;
  venue: string;
  venueAddress?: string;
  budget?: number;
  message?: string;
  status: "pending" | "contacted" | "accepted" | "rejected";
  createdAt: string;
};

export default function InquiriesInboxPage() {
  const router = useRouter();
  const { profile, loading: authLoading } = useAuth();
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [convertingId, setConvertingId] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, "inquiries"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const list: Inquiry[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as Inquiry);
      });
      setInquiries(list);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  if (authLoading || loading) {
    return <div className="p-8 text-slate-400">Loading booking inquiries inbox...</div>;
  }

  if (!canManageGigs(profile)) {
    return <div className="p-8 text-rose-400">Manager permissions required to view client inquiries.</div>;
  }

  const handleUpdateStatus = async (id: string, status: Inquiry["status"]) => {
    try {
      await updateDoc(doc(db, "inquiries", id), {
        status,
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      alert("Failed to update status: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleConvertToGig = async (inq: Inquiry) => {
    if (!confirm(`Convert "${inq.eventTitle}" into a draft band gig?`)) return;

    setConvertingId(inq.id);
    try {
      // 1. Create a gig record from inquiry details
      const newGigRef = await addDoc(collection(db, "gigs"), {
        date: inq.date,
        status: "draft",
        publicDetails: {
          title: inq.eventTitle,
          venue: inq.venue,
          venueAddress: inq.venueAddress || inq.venue,
          description: inq.message || `Client: ${inq.clientName} (${inq.organization || "Private"})`,
        },
        internalLogistics: {
          title: inq.eventTitle,
          callTime: inq.startTime ? `${inq.startTime} (Call TBD)` : "TBD",
          downbeat: inq.startTime || "TBD",
          attire: "Eagleburger Yellows & Black",
          unloadingAddress: inq.venueAddress || inq.venue,
          parkingNotes: "Coordinates pending client confirmation.",
          compensation: inq.budget || 0,
          description: `Client Contact: ${inq.clientName} | ${inq.email} | ${inq.phone || "N/A"}`,
        },
        financials: {
          totalFee: inq.budget || 0,
          settlementType: "equal_split",
          bandFundCut: 0,
          payouts: {},
          notes: `Originating from booking inquiry: ${inq.id}`,
        },
        rsvpSummary: {
          attendingCount: 0,
          declinedCount: 0,
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // 2. Mark inquiry as accepted
      await updateDoc(doc(db, "inquiries", inq.id), {
        status: "accepted",
        convertedGigId: newGigRef.id,
        updatedAt: new Date().toISOString(),
      });

      // 3. Navigate directly to newly created gig call sheet
      router.push(`/portal/gigs/${newGigRef.id}`);
    } catch (err) {
      alert("Failed to convert inquiry: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setConvertingId(null);
    }
  };

  const pendingCount = inquiries.filter((i) => i.status === "pending").length;

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-yellow-400 bg-slate-950 px-2.5 py-0.5 rounded border border-slate-800">
              Gig Inquiries
            </span>
            {pendingCount > 0 && (
              <span className="text-xs font-mono text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20 font-bold">
                {pendingCount} Pending Review
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Client Booking Pipeline</h1>
          <p className="text-xs text-slate-400">
            Review inbound booking requests, respond to prospective clients, and convert gigs into active call sheets.
          </p>
        </div>

        <a
          href="/book"
          target="_blank"
          rel="noopener noreferrer"
          className="bg-slate-950 hover:bg-slate-800 text-yellow-400 border border-slate-800 px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
        >
          <Sparkles className="w-3.5 h-3.5" /> View Public Booking Page
        </a>
      </div>

      {/* Inquiries List */}
      {inquiries.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center text-slate-500 text-xs">
          No booking inquiries received yet.
        </div>
      ) : (
        <div className="space-y-4">
          {inquiries.map((inq) => (
            <div
              key={inq.id}
              className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 shadow-sm"
            >
              {/* Row Header */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-800 pb-3">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-mono font-bold text-yellow-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                      {inq.date || "Date Pending"}
                    </span>
                    <h2 className="text-base font-bold text-white">{inq.eventTitle}</h2>
                    <span className="text-[11px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                      {inq.eventType}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5 text-slate-500" />
                      {inq.organization ? `${inq.organization} (${inq.clientName})` : inq.clientName}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-500" />
                      {inq.venue}
                    </span>
                    {inq.budget ? (
                      <span className="flex items-center gap-0.5 text-emerald-400 font-mono font-semibold">
                        <DollarSign className="w-3.5 h-3.5" />
                        {inq.budget}
                      </span>
                    ) : null}
                  </div>
                </div>

                {/* Status Dropdown */}
                <div className="flex items-center gap-2">
                  <select
                    value={inq.status}
                    onChange={(e) => handleUpdateStatus(inq.id, e.target.value as Inquiry["status"])}
                    className={`rounded-lg px-2.5 py-1 text-xs font-bold border focus:outline-none ${
                      inq.status === "pending"
                        ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                        : inq.status === "accepted"
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                        : inq.status === "contacted"
                        ? "bg-sky-500/10 text-sky-400 border-sky-500/30"
                        : "bg-rose-500/10 text-rose-400 border-rose-500/30"
                    }`}
                  >
                    <option value="pending">Pending</option>
                    <option value="contacted">Contacted</option>
                    <option value="accepted">Accepted / Booked</option>
                    <option value="rejected">Declined</option>
                  </select>
                </div>
              </div>

              {/* Message / Details Body */}
              {inq.message && (
                <div className="bg-slate-950 border border-slate-800/80 rounded-lg p-3 text-xs text-slate-300">
                  <span className="text-[10px] font-mono uppercase text-slate-500 font-bold block mb-1">
                    Client Note:
                  </span>
                  {inq.message}
                </div>
              )}

              {/* Action Bar */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pt-1 text-xs">
                <div className="flex flex-wrap items-center gap-3">
                  <a
                    href={`mailto:${inq.email}?subject=Eagleburger Band Performance: ${encodeURIComponent(
                      inq.eventTitle
                    )}`}
                    className="text-slate-400 hover:text-white flex items-center gap-1 transition"
                  >
                    <Mail className="w-3.5 h-3.5 text-yellow-400" /> {inq.email}
                  </a>
                  {inq.phone && (
                    <a
                      href={`tel:${inq.phone}`}
                      className="text-slate-400 hover:text-white flex items-center gap-1 transition"
                    >
                      <Phone className="w-3.5 h-3.5 text-yellow-400" /> {inq.phone}
                    </a>
                  )}
                </div>

                {inq.status !== "accepted" && (
                  <button
                    type="button"
                    disabled={convertingId === inq.id}
                    onClick={() => handleConvertToGig(inq)}
                    className="bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold px-3.5 py-1.5 rounded-lg text-xs flex items-center gap-1.5 transition disabled:opacity-50 shadow"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    {convertingId === inq.id ? "Converting..." : "Convert to Gig & Call Sheet"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}