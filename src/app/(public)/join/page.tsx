"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { collection, addDoc, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import {
  AuditionInputSchema,
  AuditionSchema,
} from "@/lib/schema/audition";
import DOMPurify from "dompurify";
import {
  Music,
  User,
  Mail,
  Phone,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Sparkles,
  Link2,
  Calendar,
  Layers,
  Award,
} from "lucide-react";

function cleanString(val: string): string {
  if (!val) return "";
  const trimmed = val.trim();
  return DOMPurify.sanitize(trimmed, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
}

interface SectionOption {
  id: string;
  name: string;
}

const DEFAULT_SECTIONS: SectionOption[] = [
  { id: "percussion", name: "Drumline & Percussion" },
  { id: "sousaphones", name: "Sousaphones & Tubas" },
  { id: "trombones", name: "Trombones" },
  { id: "trumpets", name: "Trumpets" },
  { id: "saxophones", name: "Saxophones & Woodwinds" },
  { id: "auxiliary", name: "Auxiliary & Visuals" },
];

export default function JoinBandPage() {
  const mountTimeRef = useRef<number>(0);
  useEffect(() => {
    mountTimeRef.current = Date.now();
  }, []);

  const [sections, setSections] = useState<SectionOption[]>(DEFAULT_SECTIONS);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    primaryInstrument: "",
    targetSectionId: "percussion",
    secondaryInstruments: "",
    experienceLevel: "High School / College Marching",
    sampleLinks: "",
    availability: "Weekly rehearsals and weekend gigs",
    bioNotes: "",
  });

  // Anti-bot honeypot
  const [honeypot, setHoneypot] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function loadSections() {
      try {
        const snap = await getDocs(collection(db, "sections"));
        if (!snap.empty) {
          const list: SectionOption[] = [];
          snap.forEach((d) => {
            const data = d.data();
            list.push({ id: d.id, name: data.name || d.id });
          });
          if (list.length > 0) {
            setSections(list);
          }
        }
      } catch (err) {
        console.warn("Could not load dynamic sections, using defaults:", err);
      }
    }
    loadSections();
  }, []);

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

    // Honeypot trap check
    if (honeypot.trim()) {
      setIsSubmitting(true);
      setTimeout(() => {
        setIsSubmitting(false);
        setIsSubmitted(true);
      }, 500);
      return;
    }

    // Submission time throttle (< 1.5s is likely automated)
    const elapsed = Date.now() - mountTimeRef.current;
    if (elapsed < 1500) {
      setErrorMessage("Please take a moment before submitting your application.");
      return;
    }

    // Clean text fields
    const cleanedPayload = {
      name: cleanString(formData.name),
      email: cleanString(formData.email),
      phone: cleanString(formData.phone),
      primaryInstrument: cleanString(formData.primaryInstrument),
      targetSectionId: formData.targetSectionId,
      secondaryInstruments: cleanString(formData.secondaryInstruments),
      experienceLevel: cleanString(formData.experienceLevel),
      sampleLinks: cleanString(formData.sampleLinks),
      availability: cleanString(formData.availability),
      bioNotes: cleanString(formData.bioNotes),
    };

    // Validate with Zod
    const result = AuditionInputSchema.safeParse(cleanedPayload);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        const field = issue.path[0] as string;
        if (field && !fieldErrors[field]) {
          fieldErrors[field] = issue.message;
        }
      });
      setErrors(fieldErrors);
      setErrorMessage("Please review and fix the highlighted fields.");
      return;
    }

    setIsSubmitting(true);

    try {
      const validatedDoc = AuditionSchema.parse({
        name: result.data.name,
        email: result.data.email,
        phone: result.data.phone,
        primaryInstrument: result.data.primaryInstrument,
        targetSectionId: result.data.targetSectionId || "",
        secondaryInstruments: result.data.secondaryInstruments || "",
        experienceLevel: result.data.experienceLevel,
        sampleLinks: result.data.sampleLinks || "",
        availability: result.data.availability || "",
        bioNotes: result.data.bioNotes,
        status: "new",
        assignedLeaderUid: "",
        reviewerNotes: "",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const docToSave = { ...validatedDoc };
      delete (docToSave as { id?: string }).id;
      await addDoc(collection(db, "auditions"), docToSave);

      setIsSubmitted(true);
    } catch (err: unknown) {
      console.error("Audition application submission error:", err);
      const e = err as { message?: string };
      setErrorMessage(e.message || "Failed to submit audition request. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      phone: "",
      primaryInstrument: "",
      targetSectionId: "percussion",
      secondaryInstruments: "",
      experienceLevel: "High School / College Marching",
      sampleLinks: "",
      availability: "Weekly rehearsals and weekend gigs",
      bioNotes: "",
    });
    setErrors({});
    setIsSubmitted(false);
    setErrorMessage("");
    mountTimeRef.current = Date.now();
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
      {/* Hero Header */}
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-400/10 border border-yellow-400/30 text-yellow-400 text-xs font-semibold uppercase tracking-wider">
          <Music className="w-3.5 h-3.5" />
          <span>Musician Recruitment</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-black text-white uppercase tracking-tight">
          Join the Eagleburger Band
        </h1>
        <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
          Do you play brass or battery percussion? We are always looking for passionate, energetic musicians to blow the roof off Pittsburgh’s streets, parades, and festivals.
        </p>
      </div>

      {/* Info Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
          <div className="w-10 h-10 rounded-xl bg-yellow-400/10 border border-yellow-400/30 flex items-center justify-center text-yellow-400">
            <Layers className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">100% Acoustic & Mobile</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            No cords, amps, or stages. We march through crowds, dance down streets, and perform in dynamic open-air spaces.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
          <div className="w-10 h-10 rounded-xl bg-yellow-400/10 border border-yellow-400/30 flex items-center justify-center text-yellow-400">
            <Calendar className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Rehearsals & Gigs</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Weekly sectionals and full ensemble rehearsals in Pittsburgh. Gigs range from major holiday parades to art walks and private bashes.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
          <div className="w-10 h-10 rounded-xl bg-yellow-400/10 border border-yellow-400/30 flex items-center justify-center text-yellow-400">
            <Award className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Welcoming Culture</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            From former college marching band vets to seasoned brass players and street drummers, we value camaraderie, groove, and heart.
          </p>
        </div>
      </div>

      {/* Audition Application Form Container */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-xl backdrop-blur-sm">
        {isSubmitted ? (
          <div className="py-12 text-center space-y-5">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div className="space-y-2 max-w-lg mx-auto">
              <h3 className="text-2xl font-black text-white uppercase tracking-tight">
                Audition Request Received!
              </h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Thank you for your interest in playing with the Eagleburger Band! Your application has been dispatched to our section leaders. We will review your background and reach out to <span className="text-yellow-400 font-semibold">{formData.email}</span> with upcoming rehearsal dates and details.
              </p>
            </div>
            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/gigs"
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-slate-950 text-xs font-bold transition"
              >
                Catch Us Live &rarr;
              </Link>
              <button
                type="button"
                onClick={resetForm}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition border border-slate-700"
              >
                Submit Another Application
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Honeypot */}
            <div className="hidden" aria-hidden="true">
              <label htmlFor="hp_audition_field">Do not fill this</label>
              <input
                id="hp_audition_field"
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

            {/* Step 1: Personal Info */}
            <div className="border-b border-slate-800/80 pb-6 space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-yellow-400">
                1. Contact Information
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                    Full Name *
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Jordan Miller"
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
                      placeholder="jordan@example.com"
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

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                    Phone Number *
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <input
                      type="tel"
                      required
                      placeholder="(412) 555-0144"
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
              </div>
            </div>

            {/* Step 2: Instrument & Section */}
            <div className="border-b border-slate-800/80 pb-6 space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-yellow-400">
                2. Musical Instruments & Section
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                    Primary Instrument *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Trombone, Sousaphone, Snare"
                    value={formData.primaryInstrument}
                    onChange={(e) => {
                      setFormData((prev) => ({ ...prev, primaryInstrument: e.target.value }));
                      clearFieldError("primaryInstrument");
                    }}
                    className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 transition ${
                      errors.primaryInstrument
                        ? "border-rose-500 focus:ring-rose-500"
                        : "border-slate-800 focus:border-yellow-400 focus:ring-yellow-400"
                    }`}
                  />
                  {errors.primaryInstrument && (
                    <p className="text-[11px] text-rose-400 font-medium">{errors.primaryInstrument}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                    Target Section *
                  </label>
                  <select
                    value={formData.targetSectionId}
                    onChange={(e) => {
                      setFormData((prev) => ({ ...prev, targetSectionId: e.target.value }));
                      clearFieldError("targetSectionId");
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-white focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 transition"
                  >
                    {sections.map((sec) => (
                      <option key={sec.id} value={sec.id} className="bg-slate-900 text-white">
                        {sec.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                    Secondary Instruments <span className="text-slate-500 normal-case">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Baritone, Bass Drum"
                    value={formData.secondaryInstruments}
                    onChange={(e) => {
                      setFormData((prev) => ({ ...prev, secondaryInstruments: e.target.value }));
                      clearFieldError("secondaryInstruments");
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 transition"
                  />
                </div>
              </div>

              {/* Experience Level */}
              <div className="space-y-1.5 pt-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Experience Level *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                  {[
                    "High School / College Marching",
                    "Community Band / Brass Band",
                    "Semi-Pro / Professional",
                    "Self-Taught / Intermediate",
                  ].map((lvl) => {
                    const isSelected = formData.experienceLevel === lvl;
                    return (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => {
                          setFormData((prev) => ({ ...prev, experienceLevel: lvl }));
                          clearFieldError("experienceLevel");
                        }}
                        className={`px-3 py-2.5 rounded-xl border text-xs font-medium text-center transition ${
                          isSelected
                            ? "bg-yellow-400 text-slate-950 border-yellow-400 font-bold shadow-md shadow-yellow-400/20"
                            : "bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700"
                        }`}
                      >
                        {lvl}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Step 3: Audition Samples & Notes */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-yellow-400">
                3. Samples & Musical Background
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                    Video or Audio Link <span className="text-slate-500 normal-case">(Optional)</span>
                  </label>
                  <div className="relative">
                    <Link2 className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <input
                      type="url"
                      placeholder="YouTube, SoundCloud, Google Drive URL"
                      value={formData.sampleLinks}
                      onChange={(e) => {
                        setFormData((prev) => ({ ...prev, sampleLinks: e.target.value }));
                        clearFieldError("sampleLinks");
                      }}
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 transition"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                    Availability & Transportation
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Can make Tuesday rehearsals & weekend gigs"
                    value={formData.availability}
                    onChange={(e) => {
                      setFormData((prev) => ({ ...prev, availability: e.target.value }));
                      clearFieldError("availability");
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 transition"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Tell Us About Yourself *
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Share your musical journey, why you want to play with the Eagleburger Band, or what kind of street tunes you love..."
                  value={formData.bioNotes}
                  onChange={(e) => {
                    setFormData((prev) => ({ ...prev, bioNotes: e.target.value }));
                    clearFieldError("bioNotes");
                  }}
                  className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 transition resize-y ${
                    errors.bioNotes
                      ? "border-rose-500 focus:ring-rose-500"
                      : "border-slate-800 focus:border-yellow-400 focus:ring-yellow-400"
                  }`}
                />
                {errors.bioNotes && <p className="text-[11px] text-rose-400 font-medium">{errors.bioNotes}</p>}
              </div>
            </div>

            {/* Submit */}
            <div className="pt-4 flex items-center justify-end">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:w-auto px-8 py-3 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition shadow-lg shadow-yellow-400/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Submitting Application...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Submit Audition Request</span>
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

