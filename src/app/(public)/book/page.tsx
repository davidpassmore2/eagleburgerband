"use client";

import React, { useState } from "react";
import Link from "next/link";
import { collection, addDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { 
  Calendar, 
  Clock, 
  MapPin, 
  DollarSign, 
  Send, 
  CheckCircle2, 
  Sparkles,
  ArrowLeft
} from "lucide-react";

export default function PublicBookingPage() {
  const [clientName, setClientName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [organization, setOrganization] = useState("");
  const [eventTitle, setEventTitle] = useState("");
  const [eventType, setEventType] = useState("Festival / Community Event");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [venue, setVenue] = useState("");
  const [venueAddress, setVenueAddress] = useState("");
  const [budget, setBudget] = useState("");
  const [message, setMessage] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await addDoc(collection(db, "inquiries"), {
        clientName: clientName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        organization: organization.trim(),
        eventTitle: eventTitle.trim(),
        eventType,
        date,
        startTime: startTime.trim(),
        venue: venue.trim(),
        venueAddress: venueAddress.trim(),
        budget: Number(budget) || 0,
        message: message.trim(),
        status: "pending",
        createdAt: new Date().toISOString(),
      });

      setSubmitted(true);
    } catch (err) {
      alert("Failed to submit inquiry: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-8 text-center space-y-5 shadow-2xl">
          <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto text-emerald-400">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-extrabold text-white">Inquiry Received!</h1>
            <p className="text-sm text-slate-400">
              Thanks for reaching out, <strong className="text-white">{clientName}</strong>. Our band managers have received your details for <strong>{eventTitle}</strong> and will follow up shortly.
            </p>
          </div>
          <div className="pt-2">
            <Link
              href="/"
              className="inline-flex items-center gap-2 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold px-5 py-2.5 rounded-xl text-xs transition"
            >
              <ArrowLeft className="w-4 h-4" /> Return to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-12 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Page Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-3 py-1 rounded-full text-xs font-mono font-bold text-yellow-400 uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" /> Book Eagleburger
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white">
            Performance Inquiry & Booking
          </h1>
          <p className="text-sm text-slate-400 max-w-lg mx-auto">
            Bring brass and percussion to your street festival, parade, block party, or private function. Submit event logistics below.
          </p>
        </div>

        {/* Inquiry Form */}
        <form
          onSubmit={handleSubmit}
          className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6 shadow-xl text-xs"
        >
          {/* Contact Details */}
          <div className="space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-yellow-400 border-b border-slate-800 pb-2">
              1. Contact Information
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-400 font-bold uppercase tracking-wider mb-1">
                  Your Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Jane Smith"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-yellow-400"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-bold uppercase tracking-wider mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="jane@example.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-yellow-400"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-bold uppercase tracking-wider mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(412) 555-0199"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-yellow-400"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-bold uppercase tracking-wider mb-1">
                  Organization / Sponsor (Optional)
                </label>
                <input
                  type="text"
                  value={organization}
                  onChange={(e) => setOrganization(e.target.value)}
                  placeholder="Neighborhood Arts Guild"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-yellow-400"
                />
              </div>
            </div>
          </div>

          {/* Event Details */}
          <div className="space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-yellow-400 border-b border-slate-800 pb-2">
              2. Event Logistics
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-slate-400 font-bold uppercase tracking-wider mb-1">
                  Event Name or Occasion *
                </label>
                <input
                  type="text"
                  required
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  placeholder="Bloomfield Street Carnival"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-yellow-400"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-bold uppercase tracking-wider mb-1">
                  Event Type
                </label>
                <select
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-yellow-400 font-semibold"
                >
                  <option value="Festival / Community Event">Festival / Community Event</option>
                  <option value="Parade / Procession">Parade / Procession</option>
                  <option value="Private Party / Function">Private Party / Function</option>
                  <option value="Wedding / Reception">Wedding / Reception</option>
                  <option value="Civic / Fundraiser">Civic / Fundraiser</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-bold uppercase tracking-wider mb-1">
                  Requested Date *
                </label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white font-mono focus:outline-none focus:border-yellow-400"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-bold uppercase tracking-wider mb-1">
                  Performance / Downbeat Time
                </label>
                <input
                  type="text"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  placeholder="6:30 PM - 8:00 PM"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-yellow-400"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-bold uppercase tracking-wider mb-1">
                  Allocated Entertainment Budget ($)
                </label>
                <div className="relative">
                  <DollarSign className="w-3.5 h-3.5 absolute left-2.5 top-3 text-slate-500" />
                  <input
                    type="number"
                    min="0"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    placeholder="1000"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-2.5 text-white font-mono focus:outline-none focus:border-yellow-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-bold uppercase tracking-wider mb-1">
                  Venue Setting *
                </label>
                <input
                  type="text"
                  required
                  value={venue}
                  onChange={(e) => setVenue(e.target.value)}
                  placeholder="Stage at Penn & 45th"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-yellow-400"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-bold uppercase tracking-wider mb-1">
                  Venue Street Address / City
                </label>
                <input
                  type="text"
                  value={venueAddress}
                  onChange={(e) => setVenueAddress(e.target.value)}
                  placeholder="Pittsburgh, PA 15224"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-yellow-400"
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <label className="block text-slate-400 font-bold uppercase tracking-wider">
              Additional Details / Description
            </label>
            <textarea
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Acoustic setup, parade route, sound expectations, etc..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:outline-none focus:border-yellow-400"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-extrabold py-3.5 px-4 rounded-xl text-sm flex items-center justify-center gap-2 transition disabled:opacity-50 shadow-lg"
            >
              <Send className="w-4 h-4" />
              {submitting ? "Transmitting Inquiry..." : "Submit Booking Inquiry"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}