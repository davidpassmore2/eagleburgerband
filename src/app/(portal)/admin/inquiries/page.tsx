"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
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
import { toast } from "@/lib/context/ToastContext";
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
  Search,
  CheckCircle2,
  ExternalLink,
  Sparkles,
  Archive,
  ChevronRight,
} from "lucide-react";

export interface BookingInquiry {
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
  status: "new" | "pending" | "reviewing" | "contacted" | "quoted" | "confirmed" | "converted" | "declined";
  convertedGigId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export function isLeadConverted(inq: BookingInquiry): boolean {
  return inq.status === "converted" || inq.status === "confirmed" || Boolean(inq.convertedGigId);
}

export default function InquiriesAdminPage() {
  const { profile, loading: authLoading } = useAuth();
  const [inquiries, setInquiries] = useState<BookingInquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("active");
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

  // Compute live category counts
  const counts = useMemo(() => {
    let active = 0;
    let pending = 0;
    let contacted = 0;
    let converted = 0;
    let declined = 0;

    inquiries.forEach((inq) => {
      const isConv = isLeadConverted(inq);
      if (isConv) {
        converted++;
      } else if (inq.status === "declined") {
        declined++;
      } else {
        active++;
        if (inq.status === "new" || inq.status === "pending" || inq.status === "reviewing") {
          pending++;
        } else if (inq.status === "contacted" || inq.status === "quoted") {
          contacted++;
        }
      }
    });

    return { active, all: inquiries.length, pending, contacted, converted, declined };
  }, [inquiries]);

  // Filter leads based on selected tab and search query
  const filtered = useMemo(() => {
    return inquiries.filter((inq) => {
      const isConv = isLeadConverted(inq);

      // Status filter
      if (filterStatus === "active" && (isConv || inq.status === "declined")) return false;
      if (filterStatus === "converted" && !isConv) return false;
      if (filterStatus === "declined" && inq.status !== "declined") return false;
      if (filterStatus === "pending" && (isConv || inq.status === "declined" || (inq.status !== "new" && inq.status !== "pending" && inq.status !== "reviewing"))) return false;
      if (filterStatus === "contacted" && (isConv || inq.status === "declined" || (inq.status !== "contacted" && inq.status !== "quoted"))) return false;

      // Search filter
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        inq.clientName.toLowerCase().includes(q) ||
        inq.eventTitle.toLowerCase().includes(q) ||
        inq.venue.toLowerCase().includes(q) ||
        (inq.organization || "").toLowerCase().includes(q) ||
        (inq.convertedGigId || "").toLowerCase().includes(q)
      );
    });
  }, [inquiries, filterStatus, searchQuery]);

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
          status,
          updatedAt: new Date().toISOString(),
        });
      } catch {
        // silent fallback if lead does not exist in booking_leads
      }
      toast.success(`Inquiry status updated to ${status}.`);
    } catch (err) {
      toast.error("Failed to update status: " + (err instanceof Error ? err.message : String(err)));
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
      toast.success("Inquiry deleted.");
    } catch (err) {
      toast.error("Failed to delete inquiry: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleConvertToGig = async (inq: BookingInquiry) => {
    if (!confirm(`Convert "${inq.eventTitle}" into a Performance Gig on the band calendar?`)) return;
    setConvertingId(inq.id);

    try {
      const gigId = `gig_${inq.date}_${inq.eventTitle.toLowerCase().replace(/[^a-z0-9]/g, "_")}`;
      const slug = `${inq.date}-${inq.eventTitle.toLowerCase().replace(/[^a-z0-9]/g, "-")}`;

      const newGig = {
        id: gigId,
        slug,
        date: inq.date,
        status: "tentative",
        publicDetails: {
          title: inq.eventTitle,
          venue: inq.venue,
          venueAddress: inq.venueAddress || "",
          description: inq.message || `Booking inquiry via ${inq.clientName} (${inq.organization || "Private"})`,
          isPublic: false,
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
        status: "converted",
        convertedGigId: gigId,
        updatedAt: new Date().toISOString(),
      });
      try {
        await updateDoc(doc(db, "booking_leads", inq.id), {
          status: "converted",
          convertedGigId: gigId,
          updatedAt: new Date().toISOString(),
        });
      } catch {
        // silent fallback
      }

      // Dispatch initial availability request email (filtering blackouts & hiatus)
      try {
        const dispatchRes = await fetch("/api/email/gig-availability", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            gigId,
            gigTitle: inq.eventTitle,
            date: inq.date,
            callTime: inq.startTime || "TBD",
            downbeat: inq.startTime || "TBD",
            venue: inq.venue,
            address: inq.venueAddress || inq.venue || "",
            notes: inq.message || "",
            actorUid: profile?.uid,
          }),
        });
        const dispatchData = await dispatchRes.json();
        if (dispatchRes.ok && dispatchData.success) {
          const recCount = dispatchData.recipientCount || 0;
          const boCount = dispatchData.blackedOutCount || 0;
          const hiCount = dispatchData.hiatusCount || 0;
          toast.success(
            `Converted to gig! Availability request sent to ${recCount} member(s) (${boCount} blacked out, ${hiCount} on hiatus skipped).`
          );
        } else {
          toast.success(`Converted to gig: ${inq.eventTitle}. Lead moved to Converted archive.`);
        }
      } catch (dispErr) {
        console.warn("Notice: availability dispatch post conversion:", dispErr);
        toast.success(`Converted to gig: ${inq.eventTitle}. Lead moved to Converted archive.`);
      }
    } catch (err) {
      toast.error("Failed to convert into gig: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setConvertingId(null);
    }
  };

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
              {counts.active} Open Lead{counts.active === 1 ? "" : "s"} &bull; {counts.converted} Converted
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Booking Leads & Intake</h1>
          <p className="text-xs text-slate-400">
            Triage incoming public gig inquiries, manage client proposals, and promote approved leads directly to performance gigs.
          </p>
        </div>

        <Link
          href="/admin/gigs"
          className="text-xs px-3.5 py-2 rounded-xl border font-bold flex items-center gap-1.5 transition hover:brightness-110 shadow-sm shrink-0"
          style={{
            backgroundColor: "var(--ebb-surface-muted)",
            borderColor: "var(--ebb-border)",
            color: "#f8fafc",
          }}
        >
          <Calendar className="w-3.5 h-3.5 text-yellow-400" />
          <span>Gig Management Studio</span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
        </Link>
      </div>

      {/* Filter Tabs and Search Bar */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search leads by client, event title, venue, or gig ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400 font-semibold"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-white text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Filter Status Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 shrink-0 text-xs">
            {[
              { id: "active", label: "Active Leads", count: counts.active },
              { id: "all", label: "All", count: counts.all },
              { id: "pending", label: "Pending", count: counts.pending },
              { id: "contacted", label: "Contacted", count: counts.contacted },
              { id: "converted", label: "Converted to Gig", count: counts.converted },
              { id: "declined", label: "Declined", count: counts.declined },
            ].map(({ id, label, count }) => {
              const isSelected = filterStatus === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setFilterStatus(id)}
                  className={`px-3 py-1.5 rounded-xl font-bold transition border flex items-center gap-1.5 cursor-pointer shrink-0 ${
                    isSelected
                      ? "bg-yellow-400 text-slate-950 border-yellow-400 shadow-sm"
                      : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
                  }`}
                >
                  <span>{label}</span>
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                      isSelected
                        ? "bg-slate-950 text-yellow-400 font-bold"
                        : "bg-slate-800 text-slate-400"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {filterStatus === "active" && counts.converted > 0 && (
          <div className="flex items-center justify-between text-xs px-3 py-2 rounded-xl bg-slate-900/60 border border-slate-800/80 text-slate-400">
            <span>
              Showing open leads only. <strong>{counts.converted}</strong> lead{counts.converted === 1 ? " is" : "s are"} already converted to gigs.
            </span>
            <button
              type="button"
              onClick={() => setFilterStatus("converted")}
              className="text-amber-400 hover:underline font-semibold flex items-center gap-1 cursor-pointer"
            >
              <span>View Converted Leads</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>

      {/* Inquiry Cards List */}
      {filtered.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-500 text-xs flex flex-col items-center justify-center gap-2">
          <Inbox className="w-6 h-6 text-slate-600" />
          <span>No booking inquiries found matching the selected filter ({filterStatus}).</span>
          {filterStatus !== "all" && (
            <button
              type="button"
              onClick={() => setFilterStatus("all")}
              className="text-amber-400 hover:underline font-semibold mt-1 cursor-pointer"
            >
              View all leads ({counts.all})
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((inq) => {
            const converted = isLeadConverted(inq);

            return (
              <div
                key={inq.id}
                className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 space-y-4 shadow transition"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {converted ? (
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded border bg-emerald-500/10 text-emerald-400 border-emerald-500/30 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Converted to Gig</span>
                        </span>
                      ) : inq.status === "declined" ? (
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded border bg-rose-500/10 text-rose-400 border-rose-500/30">
                          Declined
                        </span>
                      ) : inq.status === "contacted" || inq.status === "quoted" ? (
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded border bg-blue-500/10 text-blue-400 border-blue-500/30">
                          {inq.status === "quoted" ? "Quoted" : "Contacted"}
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded border bg-yellow-500/10 text-yellow-400 border-yellow-500/30">
                          {inq.status === "reviewing" ? "Reviewing" : "New / Pending"}
                        </span>
                      )}

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

                  <div className="flex items-center gap-2 self-start shrink-0">
                    {converted ? (
                      <Link
                        href={inq.convertedGigId ? `/admin/gigs?search=${encodeURIComponent(inq.eventTitle)}` : "/admin/gigs"}
                        className="bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/30 text-emerald-300 font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 transition shadow-sm"
                        title="View this performance in the Gig Management Studio"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>View Gig in Studio</span>
                        <ExternalLink className="w-3 h-3 text-emerald-400" />
                      </Link>
                    ) : (
                      <button
                        type="button"
                        disabled={convertingId === inq.id}
                        onClick={() => handleConvertToGig(inq)}
                        className="bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold px-3.5 py-1.5 rounded-xl text-xs flex items-center gap-1.5 transition disabled:opacity-50 shadow-sm cursor-pointer"
                        title="Promote to draft gig on portal calendar"
                      >
                        {convertingId === inq.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <ArrowRight className="w-3.5 h-3.5" />
                        )}
                        <span>Promote to Gig</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleDeleteInquiry(inq.id, inq.eventTitle)}
                      className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition cursor-pointer"
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

                {/* Converted Gig Reference Banner */}
                {converted && inq.convertedGigId && (
                  <div className="text-xs bg-emerald-950/30 border border-emerald-900/50 text-emerald-300 px-3.5 py-2 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>
                        Promoted to Gig: <strong className="font-mono text-emerald-200">{inq.convertedGigId}</strong>
                      </span>
                    </div>
                    <Link
                      href={`/admin/gigs?search=${encodeURIComponent(inq.eventTitle)}`}
                      className="text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1 text-xs shrink-0 underline"
                    >
                      <span>Open Gig Studio</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
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
                    {[
                      { key: "pending", label: "Pending" },
                      { key: "contacted", label: "Contacted" },
                      { key: "converted", label: "Converted" },
                      { key: "declined", label: "Declined" },
                    ].map(({ key, label }) => {
                      const isSelected =
                        key === "converted"
                          ? converted
                          : key === "pending"
                          ? (inq.status === "new" || inq.status === "pending" || inq.status === "reviewing") && !converted
                          : inq.status === key;

                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => {
                            if (key === "converted" && !converted) {
                              handleConvertToGig(inq);
                            } else {
                              handleUpdateStatus(inq.id, key as any);
                            }
                          }}
                          className={`text-[11px] px-2.5 py-0.5 rounded-lg capitalize font-bold transition border cursor-pointer ${
                            isSelected
                              ? "bg-slate-800 text-white border-slate-700 shadow-sm"
                              : "bg-slate-950 text-slate-500 border-slate-800 hover:text-slate-300"
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}