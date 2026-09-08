"use client";

import React, { useEffect, useState } from "react";
import { collection, onSnapshot, doc, updateDoc, setDoc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/lib/context/AuthContext";
import { canManageGigs } from "@/lib/auth/permissions";
import { Inbox, ShieldAlert, CheckCircle2, ArrowRight, Trash2, Mail, Phone, Calendar, Clock } from "lucide-react";
import { z } from "zod";
import { GigSchema } from "@/lib/schema/gig";

const LeadSchema = z.object({
  id: z.string(),
  contactName: z.string(),
  organization: z.string().default(""),
  email: z.string().email().or(z.literal("")),
  phone: z.string().default(""),
  eventDate: z.string(),
  eventTitle: z.string(),
  venue: z.string(),
  estimatedBudget: z.number().default(0),
  notes: z.string().default(""),
  status: z.enum(["new", "contacted", "converted", "declined"]).default("new"),
  createdAt: z.string().default(() => new Date().toISOString()),
});

type Lead = z.infer<typeof LeadSchema>;

export default function InquiriesAdminPage() {
  const { profile, loading: authLoading } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "inquiries"), (snap) => {
      const list: Lead[] = [];
      snap.forEach((d) => {
        const parsed = LeadSchema.safeParse(d.data());
        if (parsed.success) list.push(parsed.data);
      });
      list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      setLeads(list);
    });

    return () => unsub();
  }, []);

  if (authLoading) return <div className="p-8 text-slate-400">Verifying access...</div>;
  if (!canManageGigs(profile)) {
    return (
      <div className="p-8 text-amber-400 flex items-center gap-3">
        <ShieldAlert className="w-6 h-6 shrink-0" />
        <span>Gig Manager or Administrator permissions required to triage booking leads.</span>
      </div>
    );
  }

  const handleUpdateStatus = async (leadId: string, status: Lead["status"]) => {
    await updateDoc(doc(db, "inquiries", leadId), { status });
  };

  const handlePromoteToGig = async (lead: Lead) => {
    if (!confirm(`Promote "${lead.eventTitle}" to a tentative gig in the production schedule?`)) return;

    const newGigId = `gig_${Date.now()}`;
    const newGig = GigSchema.parse({
      id: newGigId,
      date: lead.eventDate,
      status: "tentative",
      publicDetails: {
        title: lead.eventTitle,
        venue: lead.venue,
        city: "Pittsburgh, PA",
        description: lead.notes || "Inbound booking performance",
        admission: "TBA",
        facebookEventUrl: "",
        ticketUrl: "",
      },
      internalLogistics: {
        title: lead.eventTitle,
        callTime: "TBA",
        downbeat: "TBA",
        unloadingAddress: lead.venue,
        parkingInstructions: "Pending coordinator details.",
        attire: "Band Standard Yellows",
        payPerMusician: 0,
        setlistId: "",
        description: `Lead Contact: ${lead.contactName} (${lead.email} | ${lead.phone}). Budget discussed: $${lead.estimatedBudget}`,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    await setDoc(doc(db, "gigs", newGigId), newGig);
    await updateDoc(doc(db, "inquiries", lead.id), { status: "converted" });
    alert(`Lead promoted! New gig created with ID: ${newGigId}`);
  };

  const handleDelete = async (leadId: string) => {
    if (!confirm("Are you sure you want to delete this lead?")) return;
    await deleteDoc(doc(db, "inquiries", leadId));
  };

  const filteredLeads = statusFilter === "all"
    ? leads
    : leads.filter((l) => l.status === statusFilter);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Inbox className="text-yellow-400 w-6 h-6" /> Booking Leads Inbox
          </h1>
          <p className="text-slate-400 text-sm">
            Triage client inquiries, update outreach status, and promote confirmed dates directly to the Gig Schedule.
          </p>
        </div>

        {/* Filter Controls */}
        <div className="flex items-center gap-2">
          {["all", "new", "contacted", "converted", "declined"].map((filter) => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={`px-3 py-1.5 rounded text-xs font-semibold uppercase tracking-wider transition ${
                statusFilter === filter
                  ? "bg-yellow-400 text-slate-950 font-bold"
                  : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* Leads List */}
      <div className="space-y-4">
        {filteredLeads.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-500 text-sm">
            No booking leads matching &ldquo;{statusFilter}&rdquo;.
          </div>
        ) : (
          filteredLeads.map((lead) => {
            const statusBadges: Record<string, string> = {
              new: "bg-blue-500/10 text-blue-400 border-blue-500/20",
              contacted: "bg-amber-500/10 text-amber-400 border-amber-500/20",
              converted: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
              declined: "bg-rose-500/10 text-rose-400 border-rose-500/20",
            };

            return (
              <div
                key={lead.id}
                className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition flex flex-col md:flex-row justify-between gap-6"
              >
                <div className="space-y-3 flex-1">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${statusBadges[lead.status]}`}>
                      {lead.status}
                    </span>
                    <span className="text-xs font-mono text-slate-400 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-yellow-400" />
                      Requested Date: <strong className="text-white">{lead.eventDate}</strong>
                    </span>
                    {lead.estimatedBudget > 0 && (
                      <span className="text-xs font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 px-2 py-0.5 rounded">
                        Est. Budget: ${lead.estimatedBudget}
                      </span>
                    )}
                  </div>

                  <div>
                    <h3 className="text-lg font-black text-white">{lead.eventTitle}</h3>
                    <div className="text-xs text-slate-400 mt-0.5">
                      Venue: <span className="text-slate-200">{lead.venue}</span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed bg-slate-950 p-3 rounded-lg border border-slate-800">
                    {lead.notes || "No additional event details provided."}
                  </p>

                  <div className="flex flex-wrap gap-4 text-xs text-slate-400 pt-1">
                    <span className="font-semibold text-slate-300">
                      Client: {lead.contactName} {lead.organization && `(${lead.organization})`}
                    </span>
                    {lead.email && (
                      <a href={`mailto:${lead.email}`} className="flex items-center gap-1 hover:text-yellow-400">
                        <Mail className="w-3 h-3" /> {lead.email}
                      </a>
                    )}
                    {lead.phone && (
                      <span className="flex items-center gap-1 text-slate-400">
                        <Phone className="w-3 h-3" /> {lead.phone}
                      </span>
                    )}
                  </div>
                </div>

                {/* Lead Actions */}
                <div className="flex md:flex-col justify-between items-end gap-3 shrink-0 border-t md:border-t-0 md:border-l border-slate-800 pt-3 md:pt-0 md:pl-6">
                  <div className="flex items-center gap-2">
                    <select
                      value={lead.status}
                      onChange={(e) => handleUpdateStatus(lead.id, e.target.value as Lead["status"])}
                      className="bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-xs text-white"
                    >
                      <option value="new">New</option>
                      <option value="contacted">Contacted</option>
                      <option value="converted">Converted</option>
                      <option value="declined">Declined</option>
                    </select>

                    <button
                      onClick={() => handleDelete(lead.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-400 rounded hover:bg-slate-800 transition"
                      title="Delete Lead"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {lead.status !== "converted" && (
                    <button
                      onClick={() => handlePromoteToGig(lead)}
                      className="flex items-center gap-1.5 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold px-3 py-1.5 rounded text-xs transition shadow"
                    >
                      Promote to Gig <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}