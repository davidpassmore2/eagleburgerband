"use client";

import React, { useEffect, useState } from "react";
import { collection, onSnapshot, doc, setDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/lib/context/AuthContext";
import { canManageGigs } from "@/lib/auth/permissions";
import { Contact2, ShieldAlert, Plus, Edit2, Trash2, Check, X, Mail, Phone, Building2 } from "lucide-react";
import { z } from "zod";

const ClientContactSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Name is required"),
  organization: z.string().default(""),
  email: z.string().email("Valid email required").or(z.literal("")),
  phone: z.string().default(""),
  notes: z.string().default(""),
  totalGigsBooked: z.number().default(0),
  lastContactedAt: z.string().default(() => new Date().toISOString()),
  createdAt: z.string().default(() => new Date().toISOString()),
});

type ClientContact = z.infer<typeof ClientContactSchema>;

export default function ContactsAdminPage() {
  const { profile, loading: authLoading } = useAuth();
  const [contacts, setContacts] = useState<ClientContact[]>([]);
  const [editingContact, setEditingContact] = useState<ClientContact | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const [formData, setFormData] = useState<Partial<ClientContact>>({
    name: "",
    organization: "",
    email: "",
    phone: "",
    notes: "",
    totalGigsBooked: 0,
  });

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "contacts"), (snap) => {
      const list: ClientContact[] = [];
      snap.forEach((d) => {
        const parsed = ClientContactSchema.safeParse(d.data());
        if (parsed.success) list.push(parsed.data);
      });
      list.sort((a, b) => a.name.localeCompare(b.name));
      setContacts(list);
    });

    return () => unsub();
  }, []);

  if (authLoading) return <div className="p-8 text-slate-400">Checking credentials...</div>;
  if (!canManageGigs(profile)) {
    return (
      <div className="p-8 text-amber-400 flex items-center gap-3">
        <ShieldAlert className="w-6 h-6 shrink-0" />
        <span>Gig Manager or Administrator permissions required to access Client CRM.</span>
      </div>
    );
  }

  const handleStartCreate = () => {
    setEditingContact(null);
    setIsCreating(true);
    setFormData({
      id: `contact_${Date.now()}`,
      name: "",
      organization: "",
      email: "",
      phone: "",
      notes: "",
      totalGigsBooked: 0,
    });
  };

  const handleEdit = (contact: ClientContact) => {
    setEditingContact(contact);
    setIsCreating(false);
    setFormData({ ...contact });
  };

  const handleSave = async () => {
    if (!formData.name?.trim()) return;

    const payload = {
      ...formData,
      id: formData.id || `contact_${Date.now()}`,
      lastContactedAt: new Date().toISOString(),
      createdAt: formData.createdAt || new Date().toISOString(),
    };

    const parsed = ClientContactSchema.parse(payload);

    if (isCreating) {
      await setDoc(doc(db, "contacts", parsed.id), parsed);
    } else if (editingContact) {
      await updateDoc(doc(db, "contacts", parsed.id), parsed);
    }

    setEditingContact(null);
    setIsCreating(false);
  };

  const handleDelete = async (contactId: string) => {
    if (!confirm("Are you sure you want to delete this contact?")) return;
    await deleteDoc(doc(db, "contacts", contactId));
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Contact2 className="text-yellow-400 w-6 h-6" /> Client CRM & Contacts
          </h1>
          <p className="text-slate-400 text-sm">
            Maintain venue coordinators, community festival planners, and client history.
          </p>
        </div>
        {!editingContact && !isCreating && (
          <button
            onClick={handleStartCreate}
            className="flex items-center gap-2 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold px-4 py-2 rounded text-xs transition shadow"
          >
            <Plus className="w-4 h-4" /> Add Client Contact
          </button>
        )}
      </div>

      {/* Editor Modal / Drawer */}
      {(isCreating || editingContact) && (
        <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 space-y-4 shadow-xl">
          <div className="flex justify-between items-center border-b border-slate-800 pb-3">
            <h2 className="text-lg font-bold text-white">
              {isCreating ? "Add New Contact" : `Editing: ${editingContact?.name}`}
            </h2>
            <button
              onClick={() => {
                setEditingContact(null);
                setIsCreating(false);
              }}
              className="text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">
                Contact Full Name
              </label>
              <input
                type="text"
                value={formData.name || ""}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Rachel Adams"
                className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">
                Organization / Venue
              </label>
              <input
                type="text"
                value={formData.organization || ""}
                onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                placeholder="e.g. Three Rivers Arts Festival"
                className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-xs text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={formData.email || ""}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="radams@traf.org"
                className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                value={formData.phone || ""}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="(412) 555-0199"
                className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">
                Lifetime Gigs Booked
              </label>
              <input
                type="number"
                value={formData.totalGigsBooked ?? 0}
                onChange={(e) => setFormData({ ...formData, totalGigsBooked: parseInt(e.target.value) || 0 })}
                className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-xs text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">
              Institutional Notes & Preferences
            </label>
            <textarea
              rows={3}
              value={formData.notes || ""}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Prefers high-energy street sets near Stanwix stage. Invoices net-30 through foundation portal."
              className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-xs text-white"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => {
                setEditingContact(null);
                setIsCreating(false);
              }}
              className="px-4 py-2 text-xs text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-1.5 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold px-4 py-2 rounded text-xs transition shadow"
            >
              <Check className="w-4 h-4" /> Save Contact
            </button>
          </div>
        </div>
      )}

      {/* Directory Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-x-auto shadow">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
            <tr>
              <th className="p-4">Contact & Organization</th>
              <th className="p-4">Communications</th>
              <th className="p-4">Gigs Booked</th>
              <th className="p-4">Notes</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {contacts.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-6 text-center text-slate-500">
                  No contacts recorded yet. Add your first client above.
                </td>
              </tr>
            ) : (
              contacts.map((c) => (
                <tr key={c.id} className="hover:bg-slate-800/30 transition">
                  <td className="p-4">
                    <div className="font-bold text-white text-sm">{c.name}</div>
                    {c.organization && (
                      <div className="text-slate-400 flex items-center gap-1 mt-0.5">
                        <Building2 className="w-3 h-3 text-slate-500" />
                        {c.organization}
                      </div>
                    )}
                  </td>
                  <td className="p-4 space-y-1">
                    {c.email && (
                      <div className="flex items-center gap-1.5 text-slate-300">
                        <Mail className="w-3 h-3 text-yellow-400" />
                        <a href={`mailto:${c.email}`} className="hover:underline">{c.email}</a>
                      </div>
                    )}
                    {c.phone && (
                      <div className="flex items-center gap-1.5 text-slate-400">
                        <Phone className="w-3 h-3 text-slate-500" />
                        <span>{c.phone}</span>
                      </div>
                    )}
                  </td>
                  <td className="p-4">
                    <span className="font-mono font-bold text-white bg-slate-950 px-2.5 py-1 rounded border border-slate-800">
                      {c.totalGigsBooked}
                    </span>
                  </td>
                  <td className="p-4 max-w-xs">
                    <p className="line-clamp-2 text-slate-400 text-[11px] leading-relaxed">
                      {c.notes || "No notes logged."}
                    </p>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleEdit(c)}
                        className="p-1.5 text-slate-400 hover:text-yellow-400 rounded hover:bg-slate-800 transition"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(c.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-400 rounded hover:bg-slate-800 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}