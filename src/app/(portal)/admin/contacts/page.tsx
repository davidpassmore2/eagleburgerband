"use client";

import React, { useEffect, useState } from "react";
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
import Link from "next/link";
import { 
  Users2, 
  Mail, 
  Phone, 
  Building, 
  MapPin, 
  Plus, 
  Trash2, 
  Search, 
  Loader2, 
  ShieldAlert, 
  X, 
  Check 
} from "lucide-react";

interface ContactEntry {
  id: string;
  name: string;
  organization?: string;
  roleTitle?: string;
  email: string;
  phone?: string;
  category: "venue" | "festival" | "parade" | "community" | "vendor";
  address?: string;
  venueSpecs?: {
    powerAvailable: boolean;
    parkingNotes?: string;
    loadInInstructions?: string;
  };
  notes?: string;
  updatedAt?: string;
}

export default function ContactsCRMAdminPage() {
  const { profile, loading: authLoading } = useAuth();
  const [contacts, setContacts] = useState<ContactEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [isCreating, setIsCreating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    organization: "",
    roleTitle: "Event Coordinator",
    email: "",
    phone: "",
    category: "venue" as ContactEntry["category"],
    address: "",
    powerAvailable: true,
    parkingNotes: "Street or dedicated loading bay",
    loadInInstructions: "",
    notes: "",
  });

  useEffect(() => {
    if (authLoading) return;

    const unsub = onSnapshot(
      collection(db, "contacts"),
      (snap) => {
        const list: ContactEntry[] = [];
        snap.forEach((d) => {
          list.push({ id: d.id, ...d.data() } as ContactEntry);
        });
        list.sort((a, b) => a.name.localeCompare(b.name));
        setContacts(list);
        setLoading(false);
      },
      (err) => {
        console.error("Failed to load contacts:", err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [authLoading]);

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-400 gap-2 text-xs">
        <Loader2 className="w-4 h-4 animate-spin text-yellow-400" />
        Loading client directory...
      </div>
    );
  }

  const userProfile = profile as unknown as User;
  if (!userProfile || !canManageGigs(userProfile)) {
    return (
      <div className="p-8 text-rose-400 text-xs font-semibold flex items-center gap-2">
        <ShieldAlert className="w-4 h-4" />
        Manager privileges required to view and edit client and venue contacts.
      </div>
    );
  }

  const handleCreateContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim()) return;

    setIsSaving(true);
    try {
      const contactId = `contact_${Date.now()}`;
      const payload: ContactEntry = {
        id: contactId,
        name: formData.name.trim(),
        organization: formData.organization.trim(),
        roleTitle: formData.roleTitle.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        category: formData.category,
        address: formData.address.trim(),
        venueSpecs: {
          powerAvailable: formData.powerAvailable,
          parkingNotes: formData.parkingNotes.trim(),
          loadInInstructions: formData.loadInInstructions.trim(),
        },
        notes: formData.notes.trim(),
        updatedAt: new Date().toISOString(),
      };

      await setDoc(doc(db, "contacts", contactId), payload, { merge: true });
      setIsCreating(false);
      setFormData({
        name: "",
        organization: "",
        roleTitle: "Event Coordinator",
        email: "",
        phone: "",
        category: "venue",
        address: "",
        powerAvailable: true,
        parkingNotes: "Street or dedicated loading bay",
        loadInInstructions: "",
        notes: "",
      });
    } catch (err) {
      alert("Failed to save contact: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteContact = async (id: string, name: string) => {
    if (!confirm(`Delete contact card for "${name}"?`)) return;
    try {
      await deleteDoc(doc(db, "contacts", id));
    } catch (err) {
      alert("Failed to delete contact: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  const filtered = contacts.filter((c) => {
    const matchesCategory = selectedCategory === "all" || c.category === selectedCategory;
    const matchesSearch =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.organization || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.address || "").toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      {/* Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-yellow-400 bg-slate-950 px-2.5 py-0.5 rounded border border-slate-800">
              Admin Studio
            </span>
            <span className="text-xs font-mono text-slate-400">
              {contacts.length} Contact{contacts.length === 1 ? "" : "s"}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Client CRM & Venues</h1>
          <p className="text-xs text-slate-400">
            Maintain event liaisons, venue logistics, acoustic access, and client directories.
          </p>
        </div>

        {!isCreating && (
          <button
            type="button"
            onClick={() => setIsCreating(true)}
            className="bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition shadow shrink-0"
          >
            <Plus className="w-4 h-4" /> Add New Contact
          </button>
        )}
      </div>

      {/* Creation Modal / Form */}
      {isCreating && (
        <form
          onSubmit={handleCreateContact}
          className="bg-slate-900 border border-yellow-400/30 rounded-2xl p-5 space-y-4 shadow-2xl"
        >
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Users2 className="w-4 h-4 text-yellow-400" /> Add Client or Venue Liaison
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
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">Contact Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Maya Lin"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">Organization / Venue</label>
              <input
                type="text"
                placeholder="e.g. Three Rivers Arts Festival"
                value={formData.organization}
                onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as ContactEntry["category"] })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400 capitalize"
              >
                <option value="venue">Venue</option>
                <option value="festival">Festival</option>
                <option value="parade">Parade</option>
                <option value="community">Community</option>
                <option value="vendor">Vendor</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">Email *</label>
              <input
                type="email"
                required
                placeholder="liaison@event.org"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">Phone</label>
              <input
                type="tel"
                placeholder="412-555-0199"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">Role Title</label>
              <input
                type="text"
                placeholder="Event Producer / Site Lead"
                value={formData.roleTitle}
                onChange={(e) => setFormData({ ...formData, roleTitle: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">Physical Address / Stage Spot</label>
              <input
                type="text"
                placeholder="Street address or intersection"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">Load-In / Stage Instructions</label>
              <input
                type="text"
                placeholder="Alley ramp entrance, check in at security"
                value={formData.loadInInstructions}
                onChange={(e) => setFormData({ ...formData, loadInInstructions: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="powerAvailable"
              checked={formData.powerAvailable}
              onChange={(e) => setFormData({ ...formData, powerAvailable: e.target.checked })}
              className="w-4 h-4 rounded border-slate-800 bg-slate-950 text-yellow-400"
            />
            <label htmlFor="powerAvailable" className="text-xs text-slate-300 font-semibold cursor-pointer">
              AC Power / PA Available On-Site
            </label>
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
              {isSaving ? "Saving..." : "Save Contact"}
            </button>
          </div>
        </form>
      )}

      {/* Search & Category Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search contacts by name, venue, organization, or address..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400 font-semibold"
          />
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 shrink-0">
          {["all", "venue", "festival", "parade", "community", "vendor"].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`text-xs px-3 py-1.5 rounded-xl font-bold capitalize transition border ${
                selectedCategory === cat
                  ? "bg-yellow-400 text-slate-950 border-yellow-400"
                  : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Contact Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((contact) => (
          <div
            key={contact.id}
            className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 space-y-4 shadow transition flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded border border-slate-800 bg-slate-950 text-yellow-400">
                    {contact.category}
                  </span>
                  <h3 className="font-bold text-white text-base pt-1">{contact.name}</h3>
                  {contact.organization && (
                    <div className="text-xs font-semibold text-slate-300 flex items-center gap-1">
                      <Building className="w-3.5 h-3.5 text-slate-500" />
                      {contact.organization}
                    </div>
                  )}
                  {contact.roleTitle && (
                    <div className="text-[11px] text-slate-500">{contact.roleTitle}</div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => handleDeleteContact(contact.id, contact.name)}
                  className="text-slate-500 hover:text-rose-400 p-1 rounded transition"
                  title="Delete contact"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Contact Directs */}
              <div className="space-y-1.5 pt-2 border-t border-slate-800 text-xs">
                <a
                  href={`mailto:${contact.email}`}
                  className="text-slate-300 hover:text-white flex items-center gap-2 truncate transition"
                >
                  <Mail className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
                  <span className="truncate">{contact.email}</span>
                </a>
                {contact.phone && (
                  <a
                    href={`tel:${contact.phone}`}
                    className="text-slate-300 hover:text-white flex items-center gap-2 transition"
                  >
                    <Phone className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
                    <span>{contact.phone}</span>
                  </a>
                )}
                {contact.address && (
                  <div className="text-slate-400 flex items-center gap-2 truncate">
                    <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span className="truncate">{contact.address}</span>
                  </div>
                )}
              </div>

              {/* Venue Specs */}
              {contact.venueSpecs && (
                <div className="bg-slate-950 border border-slate-800/80 p-2.5 rounded-xl space-y-1 text-[11px]">
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Power Available:</span>
                    <span className={contact.venueSpecs.powerAvailable ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
                      {contact.venueSpecs.powerAvailable ? "Yes" : "Acoustic Only"}
                    </span>
                  </div>
                  {contact.venueSpecs.loadInInstructions && (
                    <div className="text-slate-400">
                      <strong className="text-slate-300">Load-in:</strong> {contact.venueSpecs.loadInInstructions}
                    </div>
                  )}
                </div>
              )}

              <div className="pt-2">
                <Link
                  href={`/admin/notifications?template=contact_thank_you&contactId=${contact.id}&email=${encodeURIComponent(contact.email)}&name=${encodeURIComponent(contact.name)}`}
                  className="w-full text-center py-1.5 px-3 rounded-xl text-xs font-bold bg-yellow-400/10 hover:bg-yellow-400 text-yellow-400 hover:text-slate-950 border border-yellow-400/30 transition flex items-center justify-center gap-1.5"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Thank Organizer / Email</span>
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}