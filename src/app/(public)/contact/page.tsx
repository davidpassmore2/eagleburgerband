"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { collection, addDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import {
  GeneralInquiryInputSchema,
  GeneralInquirySchema,
  GeneralInquiryCategory,
} from "@/lib/schema/generalInquiry";
import DOMPurify from "dompurify";
import {
  Mail,
  User,
  Phone,
  Send,
  CheckCircle2,
  Loader2,
  AlertCircle,
  HelpCircle,
  Newspaper,
  HeartHandshake,
  ShoppingBag,
  Calendar,
  Music2,
} from "lucide-react";

function cleanString(val: string): string {
  if (!val) return "";
  const trimmed = val.trim();
  return DOMPurify.sanitize(trimmed, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
}

export default function ContactPage() {
  const mountTimeRef = useRef<number>(0);
  useEffect(() => {
    mountTimeRef.current = Date.now();
  }, []);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    category: "general" as GeneralInquiryCategory,
    subject: "",
    message: "",
  });

  // Anti-bot honeypot
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

    // Honeypot check
    if (honeypot.trim()) {
      setIsSubmitting(true);
      setTimeout(() => {
        setIsSubmitting(false);
        setIsSubmitted(true);
      }, 500);
      return;
    }

    // Time threshold check (< 1.5s is likely automated)
    const elapsed = Date.now() - mountTimeRef.current;
    if (elapsed < 1500) {
      setErrorMessage("Please take a moment before submitting.");
      return;
    }

    // Sanitize
    const cleanedPayload = {
      name: cleanString(formData.name),
      email: cleanString(formData.email),
      phone: cleanString(formData.phone),
      category: formData.category,
      subject: cleanString(formData.subject),
      message: cleanString(formData.message),
    };

    // Validate with Zod
    const result = GeneralInquiryInputSchema.safeParse(cleanedPayload);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        const field = issue.path[0] as string;
        if (field && !fieldErrors[field]) {
          fieldErrors[field] = issue.message;
        }
      });
      setErrors(fieldErrors);
      setErrorMessage("Please correct the highlighted errors before submitting.");
      return;
    }

    setIsSubmitting(true);

    try {
      const validatedDoc = GeneralInquirySchema.parse({
        name: result.data.name,
        email: result.data.email,
        phone: result.data.phone || "",
        category: result.data.category,
        subject: result.data.subject,
        message: result.data.message,
        status: "new",
        assignedToUid: "",
        internalNotes: "",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const docToSave = { ...validatedDoc };
      delete (docToSave as { id?: string }).id;
      await addDoc(collection(db, "contact_messages"), docToSave);

      setIsSubmitted(true);
    } catch (err: unknown) {
      console.error("Contact message submission error:", err);
      const e = err as { message?: string };
      setErrorMessage(e.message || "Failed to submit message. Please try again or reach out directly.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      phone: "",
      category: "general",
      subject: "",
      message: "",
    });
    setErrors({});
    setIsSubmitted(false);
    setErrorMessage("");
    mountTimeRef.current = Date.now();
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
      {/* Header */}
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-400/10 border border-yellow-400/30 text-yellow-400 text-xs font-semibold uppercase tracking-wider">
          <Mail className="w-3.5 h-3.5" />
          <span>Get in Touch</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-white uppercase tracking-tight">
          Contact the Eagleburger Band
        </h1>
        <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
          Have a question about our community appearances, press inquiries, merchandise, or general feedback? Send us a message and our team will get back to you.
        </p>
      </div>

      {/* Alternative Quick Paths Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link
          href="/book"
          className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-yellow-400/50 hover:bg-slate-900 transition flex items-start gap-4 group"
        >
          <div className="w-10 h-10 rounded-xl bg-yellow-400/10 border border-yellow-400/30 flex items-center justify-center text-yellow-400 shrink-0 group-hover:scale-105 transition-transform">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white group-hover:text-yellow-400 transition-colors">
              Looking to Book the Band? &rarr;
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Planning a parade, street festival, wedding, or block party? Use our dedicated Booking Inquiry form for availability and pricing.
            </p>
          </div>
        </Link>

        <Link
          href="/join"
          className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-yellow-400/50 hover:bg-slate-900 transition flex items-start gap-4 group"
        >
          <div className="w-10 h-10 rounded-xl bg-yellow-400/10 border border-yellow-400/30 flex items-center justify-center text-yellow-400 shrink-0 group-hover:scale-105 transition-transform">
            <Music2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white group-hover:text-yellow-400 transition-colors">
              Interested in Playing With Us? &rarr;
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Brass musician or percussionist? Check out our rehearsal schedule and submit an audition request to join our ranks.
            </p>
          </div>
        </Link>
      </div>

      {/* Main Contact Form Container */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-xl backdrop-blur-sm">
        {isSubmitted ? (
          <div className="py-12 text-center space-y-5">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div className="space-y-2 max-w-md mx-auto">
              <h3 className="text-xl font-black text-white uppercase tracking-tight">
                Message Received!
              </h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Thank you for reaching out to the Eagleburger Band. A band representative will review your message and respond to <span className="text-yellow-400 font-semibold">{formData.email}</span> shortly.
              </p>
            </div>
            <div className="pt-4">
              <button
                type="button"
                onClick={resetForm}
                className="px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition border border-slate-700"
              >
                Send Another Message
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Honeypot */}
            <div className="hidden" aria-hidden="true">
              <label htmlFor="hp_field">Do not fill this field</label>
              <input
                id="hp_field"
                type="text"
                tabIndex={-1}
                autoComplete="off"
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
              />
            </div>

            {errorMessage && (
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-3">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Category Selector */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                Inquiry Category *
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {[
                  { id: "general", label: "General", icon: HelpCircle },
                  { id: "press", label: "Press & Media", icon: Newspaper },
                  { id: "community", label: "Community", icon: HeartHandshake },
                  { id: "merch", label: "Merchandise", icon: ShoppingBag },
                ].map((cat) => {
                  const Icon = cat.icon;
                  const isSelected = formData.category === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        setFormData((prev) => ({ ...prev, category: cat.id as GeneralInquiryCategory }));
                        clearFieldError("category");
                      }}
                      className={`px-3 py-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition ${
                        isSelected
                          ? "bg-yellow-400 text-slate-950 border-yellow-400 font-bold shadow-md shadow-yellow-400/20"
                          : "bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700"
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5 shrink-0" />
                      <span>{cat.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Name and Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Your Full Name *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Alex Henderson"
                    value={formData.name}
                    onChange={(e) => {
                      setFormData((prev) => ({ ...prev, name: e.target.value }));
                      clearFieldError("name");
                    }}
                    className={`w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-950/80 border text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 transition ${
                      errors.name
                        ? "border-rose-500 focus:ring-rose-500"
                        : "border-slate-800 focus:border-yellow-400 focus:ring-yellow-400"
                    }`}
                  />
                </div>
                {errors.name && <p className="text-[11px] text-rose-400 font-medium">{errors.name}</p>}
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Email Address *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    placeholder="e.g. alex@example.com"
                    value={formData.email}
                    onChange={(e) => {
                      setFormData((prev) => ({ ...prev, email: e.target.value }));
                      clearFieldError("email");
                    }}
                    className={`w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-950/80 border text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 transition ${
                      errors.email
                        ? "border-rose-500 focus:ring-rose-500"
                        : "border-slate-800 focus:border-yellow-400 focus:ring-yellow-400"
                    }`}
                  />
                </div>
                {errors.email && <p className="text-[11px] text-rose-400 font-medium">{errors.email}</p>}
              </div>
            </div>

            {/* Phone and Subject */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Phone Number <span className="text-slate-500 normal-case">(Optional)</span>
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="tel"
                    placeholder="e.g. (412) 555-0199"
                    value={formData.phone}
                    onChange={(e) => {
                      setFormData((prev) => ({ ...prev, phone: e.target.value }));
                      clearFieldError("phone");
                    }}
                    className={`w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-950/80 border text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 transition ${
                      errors.phone
                        ? "border-rose-500 focus:ring-rose-500"
                        : "border-slate-800 focus:border-yellow-400 focus:ring-yellow-400"
                    }`}
                  />
                </div>
                {errors.phone && <p className="text-[11px] text-rose-400 font-medium">{errors.phone}</p>}
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Subject *
                </label>
                <input
                  type="text"
                  required
                  placeholder="What can we help you with?"
                  value={formData.subject}
                  onChange={(e) => {
                    setFormData((prev) => ({ ...prev, subject: e.target.value }));
                    clearFieldError("subject");
                  }}
                  className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 transition ${
                    errors.subject
                      ? "border-rose-500 focus:ring-rose-500"
                      : "border-slate-800 focus:border-yellow-400 focus:ring-yellow-400"
                  }`}
                />
                {errors.subject && <p className="text-[11px] text-rose-400 font-medium">{errors.subject}</p>}
              </div>
            </div>

            {/* Message Body */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                Message *
              </label>
              <textarea
                rows={5}
                required
                placeholder="Write your message here..."
                value={formData.message}
                onChange={(e) => {
                  setFormData((prev) => ({ ...prev, message: e.target.value }));
                  clearFieldError("message");
                }}
                className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 transition resize-y ${
                  errors.message
                    ? "border-rose-500 focus:ring-rose-500"
                    : "border-slate-800 focus:border-yellow-400 focus:ring-yellow-400"
                }`}
              />
              {errors.message && <p className="text-[11px] text-rose-400 font-medium">{errors.message}</p>}
            </div>

            {/* Submit Button */}
            <div className="pt-2 flex items-center justify-end">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition shadow-lg shadow-yellow-400/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Sending Message...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Send Message</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
