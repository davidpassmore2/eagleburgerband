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
  Sparkles,
} from "lucide-react";
import DatePicker from "@/components/ui/DatePicker";
import TimePicker from "@/components/ui/TimePicker";

function cleanString(val: string): string {
  if (!val) return "";
  const trimmed = val.trim();
  return DOMPurify.sanitize(trimmed, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
}

interface BookingFormSectionProps {
  headline?: string;
  subheadline?: string;
  badgeText?: string;
  defaultEventType?: string;
  buttonText?: string;
  compact?: boolean;
}

export default function BookingFormSection({
  headline = "Book the Eagleburger Band",
  subheadline = "Tell us about your event. We will check band availability, outline performance options, and follow up promptly.",
  badgeText = "Direct Event Inquiry",
  defaultEventType = "Community Parade & Festival",
  buttonText = "Submit Booking Request",
  compact = false,
}: BookingFormSectionProps) {
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
    eventType: defaultEventType,
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
          setErrorMessage("Please wait a moment before sending another booking inquiry.");
          return;
        }
      }
    } catch {
      // Ignore sessionStorage access limits
    }

    // 4. Strict Zod Schema Validation
    const parsed = BookingInputSchema.safeParse(formData);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      parsed.error.issues.forEach((issue) => {
        const path = issue.path[0]?.toString();
        if (path && !fieldErrors[path]) {
          fieldErrors[path] = issue.message;
        }
      });
      setErrors(fieldErrors);
      setErrorMessage("Please review and resolve the highlighted fields below.");
      return;
    }

    setIsSubmitting(true);

    try {
      // 5. Sanitize Strings via DOMPurify
      const validData = parsed.data;
      const sanitizedClientName = cleanString(validData.clientName);
      const sanitizedOrganization = cleanString(validData.organization || "");
      const sanitizedEmail = cleanString(validData.email);
      const sanitizedPhone = cleanString(validData.phone || "");
      const sanitizedEventTitle = cleanString(validData.eventTitle);
      const sanitizedEventType = cleanString(validData.eventType);
      const sanitizedDate = cleanString(validData.date);
      const sanitizedStartTime = cleanString(validData.startTime || "");
      const sanitizedVenue = cleanString(validData.venue || "");
      const sanitizedVenueAddress = cleanString(validData.venueAddress || "");
      const sanitizedMessage = cleanString(validData.message || "");

      // 6. Construct Verified Lead Schema Payload
      const leadPayload: Omit<Lead, "id"> = LeadSchema.omit({ id: true }).parse({
        clientName: sanitizedClientName,
        organization: sanitizedOrganization || undefined,
        email: sanitizedEmail,
        phone: sanitizedPhone || undefined,
        eventTitle: sanitizedEventTitle,
        eventType: sanitizedEventType,
        date: sanitizedDate,
        startTime: sanitizedStartTime || undefined,
        venue: sanitizedVenue || undefined,
        venueAddress: sanitizedVenueAddress || undefined,
        budget: validData.budget ? Number(validData.budget) : undefined,
        message: sanitizedMessage || undefined,
        status: "new",
        source: "website_booking_form",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // 7. Write to Inquiries and Booking Leads Collections
      await Promise.all([
        addDoc(collection(db, "inquiries"), leadPayload),
        addDoc(collection(db, "booking_leads"), leadPayload),
      ]);

      // Record rate limit timestamp
      try {
        sessionStorage.setItem("ebb_last_booking_submit", Date.now().toString());
      } catch {
        // Ignore
      }

      setIsSubmitted(true);
    } catch (err: unknown) {
      console.error("Booking submission failure:", err);
      setErrorMessage("We could not send your request due to a network or server issue. Please email us directly or try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className={`max-w-3xl mx-auto px-4 ${compact ? "py-6" : "py-12"}`}>
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 sm:p-12 text-center space-y-6 shadow-2xl animate-in fade-in duration-300">
          <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-full flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <span className="text-xs font-mono font-bold text-yellow-400 uppercase tracking-widest bg-slate-950 px-3 py-1 rounded-full border border-slate-800">
              Inquiry Received
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight">
              Thank You, {formData.clientName}!
            </h2>
            <p className="text-slate-300 text-sm sm:text-base max-w-lg mx-auto leading-relaxed">
              We have received your booking inquiry for <strong className="text-yellow-400">{formData.eventTitle || "your event"}</strong> on <strong className="text-white">{formData.date}</strong>.
            </p>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 sm:p-6 text-left max-w-md mx-auto text-xs space-y-2.5">
            <div className="font-mono text-slate-500 uppercase tracking-wider text-[10px]">What Happens Next?</div>
            <div className="flex items-start gap-2.5 text-slate-300">
              <span className="text-yellow-400 font-bold">1.</span>
              <span>Our Gig Coordinator checks ensemble availability for your requested date & downbeat time.</span>
            </div>
            <div className="flex items-start gap-2.5 text-slate-300">
              <span className="text-yellow-400 font-bold">2.</span>
              <span>We will reply to <strong className="text-white">{formData.email}</strong> within 24–48 hours with performance options and quote details.</span>
            </div>
          </div>

          <div className="pt-2">
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
                  eventType: defaultEventType,
                  date: "",
                  startTime: "",
                  venue: "",
                  venueAddress: "",
                  budget: "",
                  message: "",
                });
              }}
              className="text-xs font-semibold text-slate-400 hover:text-yellow-400 transition"
            >
              Submit Another Inquiry &rarr;
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`max-w-4xl mx-auto px-4 sm:px-6 ${compact ? "py-6" : "py-12"} space-y-8`}>
      {/* Section Header */}
      <div className="text-center space-y-3">
        {badgeText && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-yellow-400/10 border border-yellow-400/30 text-yellow-400 text-xs font-mono font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{badgeText}</span>
          </div>
        )}
        <h2 className="text-2xl sm:text-4xl font-black text-white uppercase tracking-tight">
          {headline}
        </h2>
        {subheadline && (
          <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed">
            {subheadline}
          </p>
        )}
      </div>

      {/* Booking Form Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl space-y-6">
        {errorMessage && (
          <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-center gap-3 text-rose-300 text-xs sm:text-sm animate-in fade-in">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6" noValidate>
          {/* Honeypot field (hidden from humans, catches scrapers) */}
          <div style={{ position: "absolute", left: "-9999px", opacity: 0, height: 0, overflow: "hidden" }} aria-hidden="true">
            <label htmlFor="company_website_url">Do not fill this field</label>
            <input
              type="text"
              id="company_website_url"
              name="company_website_url"
              tabIndex={-1}
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
              autoComplete="off"
            />
          </div>

          {/* 1. Contact Information */}
          <div className="space-y-4">
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-yellow-400 border-b border-slate-800 pb-2">
              1. Your Contact Details
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-500" />
                  Your Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Jane Doe"
                  value={formData.clientName}
                  onChange={(e) => {
                    setFormData({ ...formData, clientName: e.target.value });
                    clearFieldError("clientName");
                  }}
                  className={`w-full bg-slate-950 border rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none transition ${
                    errors.clientName ? "border-rose-500 ring-1 ring-rose-500/20" : "border-slate-800 focus:border-yellow-400"
                  }`}
                />
                {errors.clientName && (
                  <p className="text-[11px] text-rose-400 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {errors.clientName}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  Organization / Group
                </label>
                <input
                  type="text"
                  placeholder="e.g. Bloomfield Neighborhood Assoc."
                  value={formData.organization}
                  onChange={(e) => {
                    setFormData({ ...formData, organization: e.target.value });
                    clearFieldError("organization");
                  }}
                  className={`w-full bg-slate-950 border rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none transition ${
                    errors.organization ? "border-rose-500" : "border-slate-800 focus:border-yellow-400"
                  }`}
                />
                {errors.organization && (
                  <p className="text-[11px] text-rose-400">{errors.organization}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-500" />
                  Email Address <span className="text-rose-400">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="jane@example.com"
                  value={formData.email}
                  onChange={(e) => {
                    setFormData({ ...formData, email: e.target.value });
                    clearFieldError("email");
                  }}
                  className={`w-full bg-slate-950 border rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none transition ${
                    errors.email ? "border-rose-500 ring-1 ring-rose-500/20" : "border-slate-800 focus:border-yellow-400"
                  }`}
                />
                {errors.email && (
                  <p className="text-[11px] text-rose-400 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {errors.email}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-500" />
                  Phone Number
                </label>
                <input
                  type="tel"
                  placeholder="(412) 555-0199"
                  value={formData.phone}
                  onChange={(e) => {
                    setFormData({ ...formData, phone: e.target.value });
                    clearFieldError("phone");
                  }}
                  className={`w-full bg-slate-950 border rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none transition ${
                    errors.phone ? "border-rose-500" : "border-slate-800 focus:border-yellow-400"
                  }`}
                />
                {errors.phone && (
                  <p className="text-[11px] text-rose-400">{errors.phone}</p>
                )}
              </div>
            </div>
          </div>

          {/* 2. Event Details */}
          <div className="space-y-4">
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-yellow-400 border-b border-slate-800 pb-2">
              2. Event Specifics
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Event Title / Occasion <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Bloomfield Halloween Parade"
                  value={formData.eventTitle}
                  onChange={(e) => {
                    setFormData({ ...formData, eventTitle: e.target.value });
                    clearFieldError("eventTitle");
                  }}
                  className={`w-full bg-slate-950 border rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none transition ${
                    errors.eventTitle ? "border-rose-500 ring-1 ring-rose-500/20" : "border-slate-800 focus:border-yellow-400"
                  }`}
                />
                {errors.eventTitle && (
                  <p className="text-[11px] text-rose-400 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {errors.eventTitle}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Event Format / Type
                </label>
                <select
                  value={formData.eventType}
                  onChange={(e) => {
                    setFormData({ ...formData, eventType: e.target.value });
                    clearFieldError("eventType");
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-yellow-400"
                >
                  <option value="Community Parade & Festival">Community Parade & Festival</option>
                  <option value="Street Fair / Block Party">Street Fair / Block Party</option>
                  <option value="Private Celebration / Wedding">Private Celebration / Wedding</option>
                  <option value="Corporate Event / Gala">Corporate Event / Gala</option>
                  <option value="Music Venue / Concert">Music Venue / Concert</option>
                  <option value="Non-Profit / Fundraiser">Non-Profit / Fundraiser</option>
                  <option value="Other">Other Format</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Target Performance Date <span className="text-rose-400">*</span>
                </label>
                <DatePicker
                  value={formData.date}
                  onChange={(val) => {
                    setFormData({ ...formData, date: val });
                    clearFieldError("date");
                  }}
                  placeholder="Select event date"
                  className="w-full"
                />
                {errors.date && (
                  <p className="text-[11px] text-rose-400 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {errors.date}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Target Downbeat / Call Time
                </label>
                <TimePicker
                  value={formData.startTime}
                  onChange={(val) => {
                    setFormData({ ...formData, startTime: val });
                    clearFieldError("startTime");
                  }}
                  placeholder="e.g. 2:00 PM"
                  className="w-full"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-500" />
                  Venue / Location Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Liberty Avenue Parade Route"
                  value={formData.venue}
                  onChange={(e) => {
                    setFormData({ ...formData, venue: e.target.value });
                    clearFieldError("venue");
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-slate-500" />
                  Estimated Budget / Honorarium (\$)
                </label>
                <input
                  type="number"
                  min={0}
                  placeholder="e.g. 1500"
                  value={formData.budget}
                  onChange={(e) => {
                    setFormData({ ...formData, budget: e.target.value });
                    clearFieldError("budget");
                  }}
                  className={`w-full bg-slate-950 border rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none transition ${
                    errors.budget ? "border-rose-500" : "border-slate-800 focus:border-yellow-400"
                  }`}
                />
                {errors.budget && (
                  <p className="text-[11px] text-rose-400">{errors.budget}</p>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Additional Event Notes & Logistical Questions
              </label>
              <textarea
                rows={3}
                placeholder="Tell us about performance duration, parade length, marching vs stationary, or specific tune requests..."
                value={formData.message}
                onChange={(e) => {
                  setFormData({ ...formData, message: e.target.value });
                  clearFieldError("message");
                }}
                className={`w-full bg-slate-950 border rounded-2xl p-3.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none transition ${
                  errors.message ? "border-rose-500" : "border-slate-800 focus:border-yellow-400"
                }`}
              />
              {errors.message && (
                <p className="text-[11px] text-rose-400">{errors.message}</p>
              )}
            </div>
          </div>

          {/* Submit Button & Security Guarantee */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-800/80">
            <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Direct inquiry routed to band management with zero third-party agent fees.</span>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-black px-8 py-3.5 rounded-2xl text-xs sm:text-sm uppercase tracking-wider transition shadow-lg shadow-yellow-400/20 flex items-center justify-center gap-2 disabled:opacity-50 hover:scale-105 active:scale-95"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>{buttonText}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

