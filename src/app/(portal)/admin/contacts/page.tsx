"use client";

import React, { useEffect, useState } from "react";
import { 
  collection, 
  onSnapshot, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc 
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/lib/context/AuthContext";
import { canManageGigs } from "@/lib/auth/permissions";
import { 
  Contact2, 
  Search, 
  Plus, 
  Mail, 
  Phone, 
  Building, 
  ShieldAlert, 
  Calendar, 
  Trash2, 
  Edit3, 
  X, 
  Save 
} from "lucide-react";

export type ContactRecord = {
  id: string;
  name: string;
  organization?: string;
  email?: string;
  phone?: string;
  notes?: string;
  totalGigsBooked?: number;
  metrics?: {
    gigsOffered?: number;
    gigsAccepted?: number;
    totalCompensation?: number;
  };
  schemaVersion?: number;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
};

export default function ContactsCrmPage() {
  const { profile, loading: authLoading } = useAuth();
  const [contacts, setContacts] = useState<ContactRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingContact, setEditingContact] = useState<Partial<ContactRecord> | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "contacts"), (snap) => {
      const list: ContactRecord[] = [];
      snap.forEach((d) => {
        const raw = d.data();
        list.push({
          id: d.id,
          name: typeof raw.name === "string" ? raw.name : "Unnamed Client",
          organization: typeof raw.organization === "string" ? raw.organization : "",
          email: typeof raw.email === "string" ? raw.email : "",
          phone: typeof raw.phone === "string" ? raw.phone : "",
          notes: typeof raw.notes === "string" ? raw.notes : "",
          totalGigsBooked: typeof raw.totalGigsBooked === "number" ? raw.totalGigsBooked : (raw.metrics?.gigsAccepted ?? 0),
          metrics: raw.metrics,
          ...raw,
        });
      });
      list.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
      setContacts(list);
    });

    return () => unsub();
  }, []);

  if (authLoading) return <div className="p-8 text-slate-400">Verifying CRM clearance...</div>;
  if (!canManageGigs(profile)) {
    return (
      <div className="p-8 text-amber-400 flex items-center gap-3">
        <ShieldAlert className="w-6 h-6 shrink-0" />
        <span>Gig Manager or Administrator authorization required.</span>
      </div>
    );
  }

  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingContact?.name) return;

    if (editingContact.id) {
      await updateDoc(doc(db, "contacts", editingContact.id), {
        name: editingContact.name,
        organization: editingContact.organization || "",
        email: editingContact.email || "",
        phone: editingContact.phone || "",
        notes: editingContact.notes || "",
        updatedAt: new Date().toISOString(),
      });
    } else {
      await addDoc(collection(db, "contacts"), {
        schemaVersion: 1,
        name: editingContact.name,
        organization: editingContact.organization || "",
        email: editingContact.email || "",
        phone: editingContact.phone || "",
        notes: editingContact.notes || "",
        totalGigsBooked: 0,
        metrics: {
          gigsOffered: 0,
          gigsAccepted: 0,
          totalCompensation: 0,
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    setIsModalOpen(false);
    setEditingContact(null);
  };

  const handleDeleteContact = async (contactId: string) => {
    if (confirm("Are you sure you want to delete this client contact record?")) {
      await deleteDoc(doc(db, "contacts", contactId));
    }
  };

  const filteredContacts = contacts.filter((c) => {
    const q = searchQuery.toLowerCase();
    const name = c.name || "";
    const org = c.organization || "";
    const email = c.email || "";
    return (
      name.toLowerCase().includes(q) ||
      org.toLowerCase().includes(q) ||
      email.toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Contact2 className="text-yellow-400 w-6 h-6" /> Client CRM & Rolodex
          </h1>
          <p className="text-slate-400 text-sm">
            Manage performance client relationships, institutional venue notes, and booking history.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search clients, orgs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white"
            />
          </div>

          <button
            type="button"
            onClick={() => {
              setEditingContact({ name: "", organization: "", email: "", phone: "", notes: "" });
              setIsModalOpen(true);
            }}
            className="w-full sm:w-auto bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold px-3 py-1.5 rounded-lg text-xs transition flex items-center justify-center gap-1.5 shrink-0"
          >
            <Plus className="w-4 h-4" /> New Client
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredContacts.length === 0 ? (
          <div className="col-span-full bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-500 text-sm">
            No client contacts found matching your search.
          </div>
        ) : (
          filteredContacts.map((contact) => (
            <div
              key={contact.id}
              className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition flex flex-col justify-between space-y-4 shadow"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-base text-white">{contact.name}</h3>
                    {contact.organization && (
                      <p className="text-xs text-yellow-400 flex items-center gap-1 mt-0.5">
                        <Building className="w-3 h-3" /> {contact.organization}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingContact(contact);
                        setIsModalOpen(true);
                      }}
                      className="text-slate-400 hover:text-white p-1 rounded transition"
                      title="Edit Contact"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteContact(contact.id)}
                      className="text-slate-500 hover:text-rose-400 p-1 rounded transition"
                      title="Delete Contact"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {contact.notes && (
                  <p className="text-xs text-slate-300 bg-slate-950 p-2.5 rounded border border-slate-800/80 leading-relaxed line-clamp-3">
                    {contact.notes}
                  </p>
                )}
              </div>

              <div className="pt-3 border-t border-slate-800 text-xs text-slate-400 space-y-1 font-mono">
                {contact.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <a href={`mailto:${contact.email}`} className="hover:text-yellow-400 truncate">
                      {contact.email}
                    </a>
                  </div>
                )}
                {contact.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span>{contact.phone}</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-slate-600" />
                    Booked Gigs:{" "}
                    <strong className="text-slate-300">
                      {contact.totalGigsBooked ?? contact.metrics?.gigsAccepted ?? 0}
                    </strong>
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Edit / New Client Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-lg font-bold text-white">
                {editingContact?.id ? "Edit Client Contact" : "Add New Client Contact"}
              </h2>
              <button
                type="button"
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingContact(null);
                }}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveContact} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Contact Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Caitlin Sparks"
                  value={editingContact?.name || ""}
                  onChange={(e) => setEditingContact({ ...editingContact, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-400"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Organization or Venue</label>
                <input
                  type="text"
                  placeholder="e.g. Mattress Factory Museum"
                  value={editingContact?.organization || ""}
                  onChange={(e) => setEditingContact({ ...editingContact, organization: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-400"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Email Address</label>
                  <input
                    type="email"
                    placeholder="events@example.com"
                    value={editingContact?.email || ""}
                    onChange={(e) => setEditingContact({ ...editingContact, email: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-400"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Phone</label>
                  <input
                    type="tel"
                    placeholder="(412) 555-0100"
                    value={editingContact?.phone || ""}
                    onChange={(e) => setEditingContact({ ...editingContact, phone: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-400"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Institutional Notes / History</label>
                <textarea
                  rows={3}
                  placeholder="Special invoicing terms, preferred contact times, load-in gate instructions..."
                  value={editingContact?.notes || ""}
                  onChange={(e) => setEditingContact({ ...editingContact, notes: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-400 resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingContact(null);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold px-4 py-2 rounded-lg text-xs transition flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" /> Save Contact
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}