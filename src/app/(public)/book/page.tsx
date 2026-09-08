"use client";

import React, { useState } from "react";
import { collection, addDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { 
  Calendar, 
  Clock, 
  MapPin, 
  DollarSign, 
  Mail, 
  Phone, 
  Send, 
  CheckCircle2, 
  Music2, 
  Building 
} from "lucide-react";

export default function BookingPage() {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    contactName: "",
    organization: "",
    email: "",
    phone: "",
    eventTitle: "",
    eventDate: "",
    callTime: "",
    venue: "",
    estimatedBudget: "",
    notes: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await addDoc(collection(db, "inquiries"), {
        contactName: form.contactName.trim(),
        organization: form.organization.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        eventTitle: form.eventTitle.trim(),
        eventDate: form.eventDate,
        callTime: form.callTime.trim() || undefined,
        venue: form.venue.trim(),
        estimatedBudget: form.estimatedBudget ? Number(form.estimatedBudget) : 0,
        notes: form.notes.trim(),
        status: "new",
        schemaVersion: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      setSubmitted(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to submit booking inquiry.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-12 space-y-8">
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 bg-yellow-400/10 text-yellow-400 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border border-yellow-400/20">
          <Music2 className="w-4 h-4" /> Live Performance Requests
        </div>
        <h1 className="text-4xl font-extrabold text-white tracking-tight">Book The Eagleburger Band</h1>
        <p className="text-slate-400 text-sm max-w-xl mx-auto">
          Pittsburgh’s mobile brass and percussion street orchestra for parades, festivals, block parties, and private events.
        </p>
      </div>

      {submitted ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-4 shadow-xl">
          <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
          <h2 className="text-2xl font-bold text-white">Inquiry Received!</h2>
          <p className="text-slate-400 text-sm max-w-md mx-auto">
            Thanks for reaching out! Our Gig Coordinator will review our calendar and follow up via email with availability and staging details.
          </p>
          <button
            type="button"
            onClick={() => {
              setSubmitted(false);
              setForm({
                contactName: "",
                organization: "",
                email: "",
                phone: "",
                eventTitle: "",
                eventDate: "",
                callTime: "",
                venue: "",
                estimatedBudget: "",
                notes: "",
              });
            }}
            className="text-xs text-yellow-400 hover:text-yellow-300 font-semibold underline underline-offset-4"
          >
            Submit another performance request
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6 shadow-xl">
          {error && (
            <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs p-3.5 rounded-lg">
              {error}
            </div>
          )}

          {/* Contact Details */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-2">
              1. Your Contact Info
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Your Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Caitlin Sparks"
                  value={form.contactName}
                  onChange={(e) => setForm({ ...form, contactName: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-400"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-slate-500" /> Organization or Venue
                </label>
                <input
                  type="text"
                  placeholder="e.g. Mattress Factory Museum"
                  value={form.organization}
                  onChange={(e) => setForm({ ...form, organization: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-400"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-500" /> Email Address *
                </label>
                <input
                  type="email"
                  required
                  placeholder="caitlin@example.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-400"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-500" /> Phone Number
                </label>
                <input
                  type="tel"
                  placeholder="(412) 555-0100"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-400"
                />
              </div>
            </div>
          </div>

          {/* Event Details */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-2">
              2. Event & Performance Logistics
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2 space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Event Title or Occasion *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Garden Party Kickoff, Street Fest Parade"
                  value={form.eventTitle}
                  onChange={(e) => setForm({ ...form, eventTitle: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-400"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" /> Proposed Date *
                </label>
                <input
                  type="date"
                  required
                  value={form.eventDate}
                  onChange={(e) => setForm({ ...form, eventDate: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-400"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-500" /> Approximate Performance Time
                </label>
                <input
                  type="text"
                  placeholder="e.g. 6:30 PM - 8:00 PM"
                  value={form.callTime}
                  onChange={(e) => setForm({ ...form, callTime: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-400"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-500" /> Location / Neighborhood *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sampsonia Way, North Side"
                  value={form.venue}
                  onChange={(e) => setForm({ ...form, venue: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-400"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-slate-500" /> Estimated Band Budget ($)
                </label>
                <input
                  type="number"
                  min="0"
                  step="50"
                  placeholder="e.g. 800"
                  value={form.estimatedBudget}
                  onChange={(e) => setForm({ ...form, estimatedBudget: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-400"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Additional Details (Staging, Parade Route, Acoustic vs Outdoor, etc.)
              </label>
              <textarea
                rows={3}
                placeholder="Share any details about marching vs stationary, crowd expectations, or performance length..."
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-400 resize-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold py-3 rounded-lg text-sm transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {submitting ? (
              <span>Sending Inquiry...</span>
            ) : (
              <>
                <Send className="w-4 h-4" /> Submit Performance Inquiry
              </>
            )}
          </button>
        </form>
      )}
    </div>
  );
}