"use client";

import React, { useEffect, useState } from "react";
import { 
  collection, 
  onSnapshot, 
  doc, 
  updateDoc, 
  deleteDoc, 
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
  ShieldAlert, 
  Clock, 
  ArrowRightCircle, 
  Trash2, 
  Building 
} from "lucide-react";

export type InquiryStatus = "new" | "reviewed" | "quoted" | "converted" | "declined";

export type InquiryRecord = {
  id: string;
  contactName: string;
  organization?: string;
  email: string;
  phone?: string;
  eventTitle: string;
  eventDate: string;
  callTime?: string;
  venue: string;
  estimatedBudget?: number;
  notes?: string;
  status: InquiryStatus;
  createdAt: string;
  updatedAt: string;
  [key: string]: unknown;
};

export default function InquiriesTriagePage() {
  const { profile, loading: authLoading } = useAuth();
  const [inquiries, setInquiries] = useState<InquiryRecord[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [convertingId, setConvertingId] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "inquiries"), (snap) => {
      const list: InquiryRecord[] = [];
      snap.forEach((d) => {
        const raw = d.data();
        list.push({
          id: d.id,
          contactName: typeof raw.contactName === "string" ? raw.contactName : "Anonymous Client",
          organization: typeof raw.organization === "string" ? raw.organization : "",
          email: typeof raw.email === "string" ? raw.email : "",
          phone: typeof raw.phone === "string" ? raw.phone : "",
          eventTitle: typeof raw.eventTitle === "string" ? raw.eventTitle : "Untitled Event",
          eventDate: typeof raw.eventDate === "string" ? raw.eventDate : "",
          callTime: typeof raw.callTime === "string" ? raw.callTime : "",
          venue: typeof raw.venue === "string" ? raw.venue : "",
          estimatedBudget: typeof raw.estimatedBudget === "number" ? raw.estimatedBudget : 0,
          notes: typeof raw.notes === "string" ? raw.notes : "",
          status: (raw.status as InquiryStatus) || "new",
          createdAt: typeof raw.createdAt === "string" ? raw.createdAt : new Date().toISOString(),
          updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : new Date().toISOString(),
          ...raw,
        });
      });
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setInquiries(list);
    });

    return () => unsub();
  }, []);

  if (authLoading) return <div className="p-8 text-slate-400">Verifying booking clearance...</div>;
  if (!canManageGigs(profile)) {
    return (
      <div className="p-8 text-amber-400 flex items-center gap-3">
        <ShieldAlert className="w-6 h-6 shrink-0" />
        <span>Gig Manager or Administrator authorization required.</span>
      </div>
    );
  }

  const handleUpdateStatus = async (inquiryId: string, status: InquiryStatus) => {
    await updateDoc(doc(db, "inquiries", inquiryId), {
      status,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleDeleteInquiry = async (inquiryId: string) => {
    if (confirm("Delete this inquiry record?")) {
      await deleteDoc(doc(db, "inquiries", inquiryId));
    }
  };

  const handleConvertToGig = async (inquiry: InquiryRecord) => {
    setConvertingId(inquiry.id);

    try {
      // 1. Create client contact record
      const contactRef = await addDoc(collection(db, "contacts"), {
        schemaVersion: 1,
        name: inquiry.contactName,
        organization: inquiry.organization || "",
        email: inquiry.email,
        phone: inquiry.phone || "",
        notes: `Inquiry conversion: ${inquiry.eventTitle} (${inquiry.eventDate})`,
        totalGigsBooked: 1,
        metrics: {
          gigsOffered: 1,
          gigsAccepted: 1,
          totalCompensation: inquiry.estimatedBudget || 0,
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // 2. Provision draft gig record
      await addDoc(collection(db, "gigs"), {
        schemaVersion: 1,
        date: inquiry.eventDate,
        status: "draft",
        isPubliclyVisible: false,
        origin: "inquiry_conversion",
        contactId: contactRef.id,
        publicDetails: {
          title: inquiry.eventTitle,
          venue: inquiry.venue,
          venueAddress: inquiry.venue,
          startTime: inquiry.callTime || "19:00",
          endTime: "21:00",
          description: inquiry.notes || "High energy outdoor street brass performance!",
        },
        internalLogistics: {
          title: inquiry.eventTitle,
          callTime: inquiry.callTime || "18:00",
          downbeat: inquiry.callTime || "19:00",
          attire: "Yellow & Polka Dots",
          unloadingAddress: inquiry.venue,
          parkingNotes: "Coordinate arrival with client contact.",
          compensation: inquiry.estimatedBudget || 0,
          paymentType: "band_fund",
          description: inquiry.notes || "",
        },
        rsvpSummary: { attendingCount: 0, declinedCount: 0 },
        metadata: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // 3. Update inquiry status to converted
      await updateDoc(doc(db, "inquiries", inquiry.id), {
        status: "converted",
        updatedAt: new Date().toISOString(),
      });
    } catch (err: unknown) {
      alert("Error converting inquiry: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setConvertingId(null);
    }
  };

  const filtered = inquiries.filter((inq) => {
    if (filterStatus === "all") return true;
    return inq.status === filterStatus;
  });

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Inbox className="text-yellow-400 w-6 h-6" /> Booking Inquiries & Triage
          </h1>
          <p className="text-slate-400 text-sm">
            Review inbound public performance requests and convert leads directly into draft gigs.
          </p>
        </div>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
        >
          <option value="all">All Inquiries ({inquiries.length})</option>
          <option value="new">New</option>
          <option value="reviewed">Reviewed</option>
          <option value="quoted">Quoted</option>
          <option value="converted">Converted</option>
          <option value="declined">Declined</option>
        </select>
      </div>

      <div className="space-y-4">
        {filtered.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-500 text-sm">
            No performance inquiries in this category.
          </div>
        ) : (
          filtered.map((inq) => (
            <div
              key={inq.id}
              className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 hover:border-slate-700 transition"
            >
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-base text-white">{inq.eventTitle}</h3>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase border ${
                        inq.status === "new"
                          ? "bg-yellow-400/10 text-yellow-400 border-yellow-400/30"
                          : inq.status === "converted"
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                          : inq.status === "declined"
                          ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
                          : "bg-blue-500/10 text-blue-400 border-blue-500/30"
                      }`}
                    >
                      {inq.status}
                    </span>
                  </div>

                  <div className="text-xs text-slate-400 flex flex-wrap items-center gap-3 mt-1">
                    <span className="text-white font-medium">{inq.contactName}</span>
                    {inq.organization && (
                      <span className="flex items-center gap-1 text-yellow-400">
                        <Building className="w-3 h-3" /> {inq.organization}
                      </span>
                    )}
                    <span className="flex items-center gap-1 font-mono">
                      <Mail className="w-3 h-3 text-slate-500" /> {inq.email}
                    </span>
                    {inq.phone && (
                      <span className="flex items-center gap-1 font-mono">
                        <Phone className="w-3.5 h-3.5 text-slate-500" /> {inq.phone}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={inq.status}
                    onChange={(e) => handleUpdateStatus(inq.id, e.target.value as InquiryStatus)}
                    className="bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-xs text-white"
                  >
                    <option value="new">New</option>
                    <option value="reviewed">Reviewed</option>
                    <option value="quoted">Quoted</option>
                    <option value="converted">Converted</option>
                    <option value="declined">Declined</option>
                  </select>

                  {inq.status !== "converted" && (
                    <button
                      type="button"
                      disabled={convertingId === inq.id}
                      onClick={() => handleConvertToGig(inq)}
                      className="bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold px-3 py-1 rounded text-xs transition flex items-center gap-1 disabled:opacity-50"
                    >
                      <ArrowRightCircle className="w-3.5 h-3.5" />
                      {convertingId === inq.id ? "Converting..." : "Convert to Gig"}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleDeleteInquiry(inq.id)}
                    className="text-slate-500 hover:text-rose-400 p-1 rounded transition"
                    title="Delete Inquiry"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Event Details Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs">
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">Event Date</span>
                  <span className="text-white font-semibold flex items-center gap-1 mt-0.5">
                    <Calendar className="w-3.5 h-3.5 text-yellow-400" />
                    {inq.eventDate}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">Time</span>
                  <span className="text-white font-semibold flex items-center gap-1 mt-0.5">
                    <Clock className="w-3.5 h-3.5 text-yellow-400" />
                    {inq.callTime || "Not specified"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">Venue / Location</span>
                  <span className="text-white font-semibold flex items-center gap-1 mt-0.5 truncate">
                    <MapPin className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
                    {inq.venue}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">Budget</span>
                  <span className="text-emerald-400 font-bold flex items-center gap-1 mt-0.5">
                    <DollarSign className="w-3.5 h-3.5" />
                    {inq.estimatedBudget ? `$${inq.estimatedBudget}` : "Unspecified"}
                  </span>
                </div>
              </div>

              {inq.notes && (
                <div className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-2.5 rounded border border-slate-800/60">
                  <strong className="text-slate-400">Notes from Client:</strong> {inq.notes}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}