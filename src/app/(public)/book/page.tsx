"use client";

import React, { useState } from "react";
import { collection, addDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { LeadSchema } from "@/lib/schema/lead";
import { 
  Calendar, 
  Clock, 
  MapPin, 
  DollarSign, 
  Mail, 
  User, 
  Phone, 
  Send, 
  CheckCircle2, 
  Loader2 
} from "lucide-react";

export default function BookingPage() {
  const [formData, setFormData] = useState({
    clientName: "",
    organization: "",
    email: "",
    phone: "",
    eventTitle: "",
    eventType: "Community Parade & Festival",
    date: "",
    startTime: "",
    venue: "",
    venueAddress: "",
    budget: "",
    message: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const payload = {
        clientName: formData.clientName.trim(),
        organization: formData.organization.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        eventTitle: formData.eventTitle.trim(),
        eventType: formData.eventType,
        date: formData.date,
        startTime: formData.startTime,
        venue: formData.venue.trim(),
        venueAddress: formData.venueAddress.trim(),
        budget: formData.budget ? Number(formData.budget) : null,
        message: formData.message.trim(),
        status: "new" as const,
        notes: "",
        schemaVersion: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Validate against LeadSchema contract
      const validated = LeadSchema.safeParse(payload);
      const dataToSave = validated.success ? validated.data : payload;

      // Write to booking_leads (Stage 25 contract)
      await addDoc(collection(db, "booking_leads"), dataToSave);

      // Also mirror to inquiries for backward compatibility
      await addDoc(collection(db, "inquiries"), {
        ...dataToSave,
        status: "pending",
      });

      setIsSubmitted(true);
    } catch (err) {
      console.error("Booking submission failed:", err);
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to submit booking inquiry. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center space-y-4 shadow-2xl">
          <CheckCircle2 className="w-12 h-12 text-yellow-400 mx-auto" />
          <h2 className="text-2xl font-extrabold text-white">Inquiry Received!</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            Thank you for considering the Eagleburger Band. Our booking team reviews dates and section availability weekly. We will follow up via email shortly.
          </p>
          <button
            type="button"
            onClick={() => {
              setIsSubmitted(false);
              setFormData({
                clientName: "",
                organization: "",
                email: "",
                phone: "",
                eventTitle: "",
                eventType: "Community Parade & Festival",
                date: "",
                startTime: "",
                venue: "",
                venueAddress: "",
                budget: "",
                message: "",
              });
            }}
            className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-2.5 rounded-xl text-xs transition"
          >
            Submit Another Request
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-12 space-y-8">
      <div className="text-center space-y-3">
        <span className="text-xs font-mono font-bold uppercase tracking-widest text-yellow-400 bg-yellow-400/10 px-3 py-1 rounded-full border border-yellow-400/20">
          Book The Band
        </span>
        <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
          Bring the Brass & Beats to Your Event
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto">
          Parades, street festivals, porchfests, and community celebrations. Fill out the details below to check our calendar and mobilize the ensemble.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl"
      >
        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
            {errorMessage}
          </div>
        )}

        {/* Contact Info */}
        <div className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Contact Information
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                Your Name *
              </label>
              <div className="relative">
                <User className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  placeholder="Jane Doe"
                  value={formData.clientName}
                  onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                Organization / Affiliation
              </label>
              <input
                type="text"
                placeholder="e.g. Bloomfield Development Corp"
                value={formData.organization}
                onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                Email Address *
              </label>
              <div className="relative">
                <Mail className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  placeholder="jane@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                Phone Number
              </label>
              <div className="relative">
                <Phone className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
                <input
                  type="tel"
                  placeholder="412-555-0199"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Event Info */}
        <div className="space-y-3 pt-4 border-t border-slate-800">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Event Details
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                Event Title *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Penn Avenue Parade"
                value={formData.eventTitle}
                onChange={(e) => setFormData({ ...formData, eventTitle: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                Event Format
              </label>
              <select
                value={formData.eventType}
                onChange={(e) => setFormData({ ...formData, eventType: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400"
              >
                <option value="Community Parade & Festival">Community Parade & Festival</option>
                <option value="Stage / Beer Garden Performance">Stage / Beer Garden Performance</option>
                <option value="Porchfest / Street Stroll">Porchfest / Street Stroll</option>
                <option value="Athletic / Cheering Station">Athletic / Cheering Station</option>
                <option value="Private Celebration">Private Celebration</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                Event Date *
              </label>
              <div className="relative">
                <Calendar className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
                <input
                  type="date"
                  required
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                Start Time / Step-Off
              </label>
              <div className="relative">
                <Clock className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="e.g. 5:30 PM"
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                Venue or Route Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Millvale Riverfront Park"
                value={formData.venue}
                onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                Venue Address or Cross Streets
              </label>
              <div className="relative">
                <MapPin className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="e.g. Grant & North Ave, Pittsburgh, PA"
                  value={formData.venueAddress}
                  onChange={(e) => setFormData({ ...formData, venueAddress: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400"
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                Offered Budget / Band Stipend ($ USD)
              </label>
              <div className="relative">
                <DollarSign className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
                <input
                  type="number"
                  placeholder="e.g. 1200"
                  value={formData.budget}
                  onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Message */}
        <div className="space-y-2 pt-4 border-t border-slate-800">
          <label className="text-[11px] font-semibold text-slate-300 block">
            Additional Notes & Route Logistics
          </label>
          <textarea
            rows={3}
            placeholder="Tell us about the performance location, marching distance, acoustic preferences, and timeline..."
            value={formData.message}
            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400 resize-none"
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold py-3 rounded-xl text-xs flex items-center justify-center gap-2 transition disabled:opacity-50 shadow-lg"
        >
          {isSubmitting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
          {isSubmitting ? "Submitting Inquiry..." : "Submit Performance Inquiry"}
        </button>
      </form>
    </div>
  );
}