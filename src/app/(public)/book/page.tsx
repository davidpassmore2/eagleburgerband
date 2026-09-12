"use client";

import React, { useState, useRef, useEffect } from "react";
import { collection, addDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { BookingInputSchema, LeadSchema, Lead } from "@/lib/schema/lead";
import DOMPurify from "dompurify";
import { 
  MapPin, 
  DollarSign, 
  Mail, 
  User, 
  Phone, 
  Send, 
  CheckCircle2, 
  Loader2,
  AlertCircle,
  ShieldCheck,
} from "lucide-react";
import DatePicker from "@/components/ui/DatePicker";
import TimePicker from "@/components/ui/TimePicker";

function cleanString(val: string): string {
  if (!val) return "";
  const trimmed = val.trim();
  return DOMPurify.sanitize(trimmed, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
}

export default function BookingPage() {
  const mountTimeRef = useRef<number>(0);
  useEffect(() => {
    mountTimeRef.current = Date.now();
  }, []);
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

  // Anti-bot honeypot field
  const [honeypot, setHoneypot] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const clearFieldError = (field: string) => {
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setErrors({});

    // 1. Anti-bot Honeypot Detection
    if (honeypot.trim()) {
      console.warn("Honeypot trap triggered by automated submission.");
      // Fake success without persisting to prevent scraping / DB bloat
      setIsSubmitting(true);
      setTimeout(() => {
        setIsSubmitting(false);
        setIsSubmitted(true);
      }, 500);
      return;
    }

    // 2. Sub-second Headless Bot Heuristic (< 1.5s)
    const elapsedMs = mountTimeRef.current > 0 ? Date.now() - mountTimeRef.current : 2000;
    if (elapsedMs < 1500) {
      console.warn("Automated bot submission detected via timing heuristic.");
      setIsSubmitting(true);
      setTimeout(() => {
        setIsSubmitting(false);
        setIsSubmitted(true);
      }, 500);
      return;
    }

    // 3. Client-Side Cooldown / Rate Limiting (15 seconds)
    try {
      const lastSubmit = sessionStorage.getItem("ebb_last_booking_submit");
      if (lastSubmit) {
        const lastSubmitTime = parseInt(lastSubmit, 10);
        if (Date.now() - lastSubmitTime < 15000) {
          setErrorMessage("Please wait a moment before submitting another inquiry.");
          return;
        }
      }
    } catch {
      // Ignore sessionStorage availability errors
    }

    // 4. Parse budget number if provided
    let parsedBudget: number | null = null;
    if (formData.budget.trim()) {
      const bNum = Number(formData.budget);
      if (isNaN(bNum)) {
        setErrors({ budget: "Please enter a valid numeric budget amount." });
        setErrorMessage("Please correct the highlighted errors.");
        return;
      }
      parsedBudget = bNum;
    }

    // 5. Build raw input object for validation
    const candidateInput = {
      clientName: cleanString(formData.clientName),
      organization: cleanString(formData.organization),
      email: cleanString(formData.email),
      phone: cleanString(formData.phone),
      eventTitle: cleanString(formData.eventTitle),
      eventType: formData.eventType,
      date: formData.date,
      startTime: cleanString(formData.startTime),
      venue: cleanString(formData.venue),
      venueAddress: cleanString(formData.venueAddress),
      budget: parsedBudget,
      message: cleanString(formData.message),
    };

    // 6. Strict Zod Validation
    const validationResult = BookingInputSchema.safeParse(candidateInput);
    if (!validationResult.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of validationResult.error.issues) {
        const fieldName = String(issue.path[0]);
        if (!fieldErrors[fieldName]) {
          fieldErrors[fieldName] = issue.message;
        }
      }
      setErrors(fieldErrors);
      setErrorMessage("Please correct the errors indicated below before submitting.");
      return;
    }

    setIsSubmitting(true);

    try {
      const validData = validationResult.data;
      const nowIso = new Date().toISOString();

      // 7. Schema Invariance: Construct Lead payload matching LeadSchema
      const payload: Lead = LeadSchema.parse({
        id: "",
        clientName: validData.clientName,
        organization: validData.organization,
        email: validData.email,
        phone: validData.phone,
        eventTitle: validData.eventTitle,
        eventType: validData.eventType,
        date: validData.date,
        startTime: validData.startTime,
        venue: validData.venue,
        venueAddress: validData.venueAddress,
        budget: validData.budget ?? null,
        message: validData.message,
        status: "new",
        notes: "",
        schemaVersion: 1,
        createdAt: nowIso,
        updatedAt: nowIso,
      });

      // Write to booking_leads
      await addDoc(collection(db, "booking_leads"), payload);

      // Mirror to inquiries for backward compatibility
      await addDoc(collection(db, "inquiries"), {
        ...payload,
        status: "pending",
      });

      // Record rate limit timestamp
      try {
        sessionStorage.setItem("ebb_last_booking_submit", Date.now().toString());
      } catch {
        // Ignore
      }

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
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center space-y-5 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
          <div className="w-16 h-16 rounded-2xl bg-yellow-400/10 border border-yellow-400/30 flex items-center justify-center mx-auto text-yellow-400">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-extrabold text-white">Inquiry Received!</h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              Thank you for reaching out to the Eagleburger Band! Our booking team reviews dates and musician availability weekly. We will follow up with you via email shortly.
            </p>
          </div>
          <div className="p-3 bg-slate-950 border border-slate-800/80 rounded-xl text-[11px] text-slate-400 flex items-center justify-center gap-1.5 font-mono">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Encrypted & Verified Submission</span>
          </div>
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
              setHoneypot("");
              setErrors({});
              mountTimeRef.current = Date.now();
            }}
            className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-2.5 rounded-xl text-xs transition shadow-sm"
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
        noValidate
        className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl relative"
      >
        {/* Anti-bot Honeypot Input (Invisible to humans and screen readers) */}
        <div style={{ position: "absolute", left: "-9999px", opacity: 0, height: 0, width: 0, overflow: "hidden" }}>
          <label htmlFor="company_website_url">Company Website URL</label>
          <input
            id="company_website_url"
            type="text"
            name="company_website_url"
            value={honeypot}
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            onChange={(e) => setHoneypot(e.target.value)}
          />
        </div>

        {errorMessage && (
          <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Contact Info */}
        <div className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Contact Information
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Your Name */}
            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                Your Name <span className="text-yellow-400">*</span>
              </label>
              <div className="relative">
                <User className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Jane Doe"
                  value={formData.clientName}
                  onChange={(e) => {
                    setFormData({ ...formData, clientName: e.target.value });
                    clearFieldError("clientName");
                  }}
                  className={`w-full bg-slate-950 border rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none transition ${
                    errors.clientName
                      ? "border-rose-500 focus:border-rose-400 ring-1 ring-rose-500/20"
                      : "border-slate-800 focus:border-yellow-400"
                  }`}
                />
              </div>
              {errors.clientName && (
                <p className="text-[11px] text-rose-400 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  <span>{errors.clientName}</span>
                </p>
              )}
            </div>

            {/* Organization */}
            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                Organization / Affiliation
              </label>
              <input
                type="text"
                placeholder="e.g. Bloomfield Development Corp"
                value={formData.organization}
                onChange={(e) => {
                  setFormData({ ...formData, organization: e.target.value });
                  clearFieldError("organization");
                }}
                className={`w-full bg-slate-950 border rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none transition ${
                  errors.organization
                    ? "border-rose-500 focus:border-rose-400 ring-1 ring-rose-500/20"
                    : "border-slate-800 focus:border-yellow-400"
                }`}
              />
              {errors.organization && (
                <p className="text-[11px] text-rose-400 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  <span>{errors.organization}</span>
                </p>
              )}
            </div>

            {/* Email Address */}
            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                Email Address <span className="text-yellow-400">*</span>
              </label>
              <div className="relative">
                <Mail className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
                <input
                  type="email"
                  placeholder="jane@example.com"
                  value={formData.email}
                  onChange={(e) => {
                    setFormData({ ...formData, email: e.target.value });
                    clearFieldError("email");
                  }}
                  className={`w-full bg-slate-950 border rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none transition ${
                    errors.email
                      ? "border-rose-500 focus:border-rose-400 ring-1 ring-rose-500/20"
                      : "border-slate-800 focus:border-yellow-400"
                  }`}
                />
              </div>
              {errors.email && (
                <p className="text-[11px] text-rose-400 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  <span>{errors.email}</span>
                </p>
              )}
            </div>

            {/* Phone Number */}
            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                Phone Number <span className="text-yellow-400">*</span>
              </label>
              <div className="relative">
                <Phone className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
                <input
                  type="tel"
                  placeholder="412-555-0199"
                  value={formData.phone}
                  onChange={(e) => {
                    setFormData({ ...formData, phone: e.target.value });
                    clearFieldError("phone");
                  }}
                  className={`w-full bg-slate-950 border rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none transition ${
                    errors.phone
                      ? "border-rose-500 focus:border-rose-400 ring-1 ring-rose-500/20"
                      : "border-slate-800 focus:border-yellow-400"
                  }`}
                />
              </div>
              {errors.phone && (
                <p className="text-[11px] text-rose-400 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  <span>{errors.phone}</span>
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Event Info */}
        <div className="space-y-3 pt-4 border-t border-slate-800">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Event Details
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Event Title */}
            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                Event Title <span className="text-yellow-400">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Penn Avenue Parade"
                value={formData.eventTitle}
                onChange={(e) => {
                  setFormData({ ...formData, eventTitle: e.target.value });
                  clearFieldError("eventTitle");
                }}
                className={`w-full bg-slate-950 border rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none transition ${
                  errors.eventTitle
                    ? "border-rose-500 focus:border-rose-400 ring-1 ring-rose-500/20"
                    : "border-slate-800 focus:border-yellow-400"
                }`}
              />
              {errors.eventTitle && (
                <p className="text-[11px] text-rose-400 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  <span>{errors.eventTitle}</span>
                </p>
              )}
            </div>

            {/* Event Format */}
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

            {/* Event Date */}
            <div>
              <DatePicker
                label="Event Date"
                required
                value={formData.date}
                onChange={(date) => {
                  setFormData({ ...formData, date });
                  clearFieldError("date");
                }}
              />
              {errors.date && (
                <p className="text-[11px] text-rose-400 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  <span>{errors.date}</span>
                </p>
              )}
            </div>

            {/* Start Time */}
            <div>
              <TimePicker
                label="Start Time / Step-Off"
                value={formData.startTime}
                onChange={(startTime) => {
                  setFormData({ ...formData, startTime });
                  clearFieldError("startTime");
                }}
              />
              {errors.startTime && (
                <p className="text-[11px] text-rose-400 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  <span>{errors.startTime}</span>
                </p>
              )}
            </div>

            {/* Venue */}
            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                Venue or Route Name <span className="text-yellow-400">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Millvale Riverfront Park"
                value={formData.venue}
                onChange={(e) => {
                  setFormData({ ...formData, venue: e.target.value });
                  clearFieldError("venue");
                }}
                className={`w-full bg-slate-950 border rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none transition ${
                  errors.venue
                    ? "border-rose-500 focus:border-rose-400 ring-1 ring-rose-500/20"
                    : "border-slate-800 focus:border-yellow-400"
                }`}
              />
              {errors.venue && (
                <p className="text-[11px] text-rose-400 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  <span>{errors.venue}</span>
                </p>
              )}
            </div>

            {/* Venue Address */}
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
                  onChange={(e) => {
                    setFormData({ ...formData, venueAddress: e.target.value });
                    clearFieldError("venueAddress");
                  }}
                  className={`w-full bg-slate-950 border rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none transition ${
                    errors.venueAddress
                      ? "border-rose-500 focus:border-rose-400 ring-1 ring-rose-500/20"
                      : "border-slate-800 focus:border-yellow-400"
                  }`}
                />
              </div>
              {errors.venueAddress && (
                <p className="text-[11px] text-rose-400 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  <span>{errors.venueAddress}</span>
                </p>
              )}
            </div>

            {/* Budget */}
            <div className="sm:col-span-2">
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                Offered Budget / Band Stipend ($ USD)
              </label>
              <div className="relative">
                <DollarSign className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
                <input
                  type="number"
                  min={0}
                  step={25}
                  placeholder="e.g. 1200"
                  value={formData.budget}
                  onChange={(e) => {
                    setFormData({ ...formData, budget: e.target.value });
                    clearFieldError("budget");
                  }}
                  className={`w-full bg-slate-950 border rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none transition ${
                    errors.budget
                      ? "border-rose-500 focus:border-rose-400 ring-1 ring-rose-500/20"
                      : "border-slate-800 focus:border-yellow-400"
                  }`}
                />
              </div>
              {errors.budget && (
                <p className="text-[11px] text-rose-400 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  <span>{errors.budget}</span>
                </p>
              )}
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
            maxLength={2000}
            placeholder="Tell us about the performance location, marching distance, acoustic preferences, and timeline..."
            value={formData.message}
            onChange={(e) => {
              setFormData({ ...formData, message: e.target.value });
              clearFieldError("message");
            }}
            className={`w-full bg-slate-950 border rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none resize-none transition ${
              errors.message
                ? "border-rose-500 focus:border-rose-400 ring-1 ring-rose-500/20"
                : "border-slate-800 focus:border-yellow-400"
            }`}
          />
          {errors.message && (
            <p className="text-[11px] text-rose-400 mt-1 flex items-center gap-1">
              <AlertCircle className="w-3 h-3 shrink-0" />
              <span>{errors.message}</span>
            </p>
          )}
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