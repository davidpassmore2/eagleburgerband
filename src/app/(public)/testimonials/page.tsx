"use client";

import React, { useState, useEffect, useRef } from "react";
import { collection, onSnapshot, addDoc, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import {
  Testimonial,
  TestimonialInputSchema,
  TestimonialSchema,
} from "@/lib/schema/testimonial";
import DOMPurify from "dompurify";
import {
  Star,
  Quote,
  MessageSquareHeart,
  PlusCircle,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Sparkles,
  X,
  Send,
} from "lucide-react";

function cleanString(val: string): string {
  if (!val) return "";
  const trimmed = val.trim();
  return DOMPurify.sanitize(trimmed, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
}

export default function TestimonialsPublicPage() {
  const mountTimeRef = useRef<number>(0);
  useEffect(() => {
    mountTimeRef.current = Date.now();
  }, []);

  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTag, setSelectedTag] = useState<string>("all");

  // Submission Modal state
  const [showFormModal, setShowFormModal] = useState(false);
  const [formData, setFormData] = useState({
    authorName: "",
    roleOrEvent: "",
    organization: "",
    email: "",
    quote: "",
    rating: 5,
    eventDate: "",
    tag: "Community Event",
    permissionToPublish: true,
  });

  // Anti-bot honeypot
  const [honeypot, setHoneypot] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    // Listen for approved & featured testimonials
    const q = query(
      collection(db, "testimonials"),
      where("status", "in", ["approved", "featured"])
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const list: Testimonial[] = [];
        snap.forEach((d) => {
          list.push({ id: d.id, ...d.data() } as Testimonial);
        });
        // Sort featured first, then newest
        list.sort((a, b) => {
          if (a.status === "featured" && b.status !== "featured") return -1;
          if (b.status === "featured" && a.status !== "featured") return 1;
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateB - dateA;
        });
        setTestimonials(list);
        setLoading(false);
      },
      (err) => {
        console.warn("Public testimonials listener notice:", err);
        setLoading(false);
      }
    );

    return () => unsub();
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

  const handleFormSubmit = async (e: React.FormEvent) => {
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

    // Submission speed throttle
    const elapsed = Date.now() - mountTimeRef.current;
    if (elapsed < 1500) {
      setErrorMessage("Please take a moment before submitting your review.");
      return;
    }

    const cleanedPayload = {
      authorName: cleanString(formData.authorName),
      roleOrEvent: cleanString(formData.roleOrEvent),
      organization: cleanString(formData.organization),
      email: cleanString(formData.email),
      quote: cleanString(formData.quote),
      rating: Number(formData.rating),
      eventDate: cleanString(formData.eventDate),
      tag: cleanString(formData.tag),
      permissionToPublish: formData.permissionToPublish,
    };

    const result = TestimonialInputSchema.safeParse(cleanedPayload);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        const field = issue.path[0] as string;
        if (field && !fieldErrors[field]) {
          fieldErrors[field] = issue.message;
        }
      });
      setErrors(fieldErrors);
      setErrorMessage("Please fix the errors indicated below.");
      return;
    }

    setIsSubmitting(true);

    try {
      const validatedDoc = TestimonialSchema.parse({
        authorName: result.data.authorName,
        roleOrEvent: result.data.roleOrEvent || "",
        organization: result.data.organization || "",
        email: result.data.email,
        quote: result.data.quote,
        rating: result.data.rating,
        eventDate: result.data.eventDate || "",
        tag: result.data.tag || "Community Event",
        permissionToPublish: true,
        status: "pending",
        notes: "",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const docToSave = { ...validatedDoc };
      delete (docToSave as { id?: string }).id;
      await addDoc(collection(db, "testimonials"), docToSave);

      setIsSubmitted(true);
    } catch (err: unknown) {
      console.error("Testimonial submission error:", err);
      const e = err as { message?: string };
      setErrorMessage(e.message || "Failed to submit testimonial. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      authorName: "",
      roleOrEvent: "",
      organization: "",
      email: "",
      quote: "",
      rating: 5,
      eventDate: "",
      tag: "Community Event",
      permissionToPublish: true,
    });
    setErrors({});
    setIsSubmitted(false);
    setErrorMessage("");
    setShowFormModal(false);
    mountTimeRef.current = Date.now();
  };

  const filteredTestimonials =
    selectedTag === "all"
      ? testimonials
      : testimonials.filter(
          (t) => t.tag?.toLowerCase() === selectedTag.toLowerCase()
        );

  const tags = ["all", "Festival", "Parade", "Community Event", "Wedding", "Private Event"];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-slate-800">
        <div className="space-y-3 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-400/10 border border-yellow-400/30 text-yellow-400 text-xs font-semibold uppercase tracking-wider">
            <MessageSquareHeart className="w-3.5 h-3.5" />
            <span>Audience & Client Reviews</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-white uppercase tracking-tight">
            What People Say
          </h1>
          <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
            From thunderous street parades to festival stages and private parties, here is what event organizers and spectators have to say about the Eagleburger Band.
          </p>
        </div>

        <div>
          <button
            type="button"
            onClick={() => {
              setIsSubmitted(false);
              setShowFormModal(true);
            }}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition shadow-lg shadow-yellow-400/20"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Leave a Review</span>
          </button>
        </div>
      </div>

      {/* Tag Filters */}
      <div className="flex flex-wrap items-center gap-2 pt-2">
        {tags.map((tag) => {
          const isSelected = selectedTag === tag;
          return (
            <button
              key={tag}
              type="button"
              onClick={() => setSelectedTag(tag)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition capitalize ${
                isSelected
                  ? "bg-yellow-400 text-slate-950 shadow-md shadow-yellow-400/20 font-bold"
                  : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700"
              }`}
            >
              {tag === "all" ? "All Reviews" : tag}
            </button>
          );
        })}
      </div>

      {/* Testimonials Grid */}
      {loading ? (
        <div className="flex items-center justify-center p-16 text-slate-400 gap-2 text-xs">
          <Loader2 className="w-4 h-4 animate-spin text-yellow-400" />
          <span>Loading testimonials...</span>
        </div>
      ) : filteredTestimonials.length === 0 ? (
        <div className="p-12 text-center bg-slate-900/40 rounded-3xl border border-slate-800/80 space-y-4 max-w-lg mx-auto">
          <Quote className="w-10 h-10 text-slate-600 mx-auto" />
          <p className="text-slate-300 text-sm font-semibold">
            No testimonials found for this filter.
          </p>
          <p className="text-slate-500 text-xs">
            Have you caught the Eagleburger Band live or booked us for an event? Be the first to share your thoughts!
          </p>
          <button
            type="button"
            onClick={() => setShowFormModal(true)}
            className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-yellow-400 text-xs font-bold transition border border-slate-700 inline-block"
          >
            Share Your Experience
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTestimonials.map((t) => (
            <div
              key={t.id}
              className={`p-6 rounded-3xl border flex flex-col justify-between transition-all group ${
                t.status === "featured"
                  ? "bg-gradient-to-br from-slate-900 via-slate-900/90 to-yellow-950/20 border-yellow-400/40 shadow-xl shadow-yellow-500/5"
                  : "bg-slate-900/70 border-slate-800 hover:border-slate-700"
              }`}
            >
              <div className="space-y-4">
                {/* Header Row: Stars & Badge */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1 text-yellow-400">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${
                          i < (t.rating || 5)
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-slate-700"
                        }`}
                      />
                    ))}
                  </div>
                  {t.tag && (
                    <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-[10px] font-semibold text-slate-300 border border-slate-700">
                      {t.tag}
                    </span>
                  )}
                </div>

                {/* Quote Body */}
                <p className="text-slate-200 text-sm leading-relaxed italic relative">
                  &ldquo;{t.quote}&rdquo;
                </p>
              </div>

              {/* Author Footer */}
              <div className="pt-6 mt-6 border-t border-slate-800/80 flex items-center justify-between gap-3 text-xs">
                <div>
                  <h4 className="font-bold text-white text-xs">{t.authorName}</h4>
                  {(t.roleOrEvent || t.organization) && (
                    <p className="text-[11px] text-slate-400">
                      {[t.roleOrEvent, t.organization].filter(Boolean).join(" &bull; ")}
                    </p>
                  )}
                </div>
                {t.status === "featured" && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-mono text-yellow-400 font-bold bg-yellow-400/10 px-2 py-0.5 rounded border border-yellow-400/20">
                    <Sparkles className="w-2.5 h-2.5" /> Featured
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Submission Modal Dialog */}
      {showFormModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setShowFormModal(false)}
              className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
              aria-label="Close dialog"
            >
              <X className="w-5 h-5" />
            </button>

            {isSubmitted ? (
              <div className="py-8 text-center space-y-4">
                <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-black text-white uppercase tracking-tight">
                  Thank You for Your Review!
                </h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                  Your testimonial has been submitted to the Eagleburger Band management team for approval. Once reviewed, it will be published to the public gallery.
                </p>
                <div className="pt-3">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-6 py-2.5 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-slate-950 text-xs font-bold transition"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleFormSubmit} className="space-y-5">
                {/* Modal Title */}
                <div className="space-y-1">
                  <h3 className="text-xl font-black text-white uppercase tracking-tight">
                    Submit a Testimonial
                  </h3>
                  <p className="text-xs text-slate-400">
                    Share your experience attending or booking an Eagleburger Band performance.
                  </p>
                </div>

                {/* Honeypot */}
                <div className="hidden" aria-hidden="true">
                  <input
                    type="text"
                    tabIndex={-1}
                    value={honeypot}
                    onChange={(e) => setHoneypot(e.target.value)}
                  />
                </div>

                {errorMessage && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                {/* Rating Selector */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                    Rating *
                  </label>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setFormData((prev) => ({ ...prev, rating: star }))}
                        className="p-1 focus:outline-none transition hover:scale-110"
                      >
                        <Star
                          className={`w-6 h-6 ${
                            star <= formData.rating
                              ? "fill-yellow-400 text-yellow-400"
                              : "text-slate-700 hover:text-yellow-400/50"
                          }`}
                        />
                      </button>
                    ))}
                    <span className="text-xs text-slate-400 ml-2 font-mono">
                      {formData.rating} / 5 Stars
                    </span>
                  </div>
                </div>

                {/* Quote */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                    Your Review / Quote *
                  </label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Tell us about the crowd reaction, musical energy, or working with the band..."
                    value={formData.quote}
                    onChange={(e) => {
                      setFormData((prev) => ({ ...prev, quote: e.target.value }));
                      clearFieldError("quote");
                    }}
                    className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 transition resize-y ${
                      errors.quote
                        ? "border-rose-500 focus:ring-rose-500"
                        : "border-slate-800 focus:border-yellow-400 focus:ring-yellow-400"
                    }`}
                  />
                  {errors.quote && <p className="text-[11px] text-rose-400 font-medium">{errors.quote}</p>}
                </div>

                {/* Author Name and Email */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                      Your Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Maria Sanchez"
                      value={formData.authorName}
                      onChange={(e) => {
                        setFormData((prev) => ({ ...prev, authorName: e.target.value }));
                        clearFieldError("authorName");
                      }}
                      className={`w-full px-3.5 py-2 rounded-xl bg-slate-950/80 border text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 transition ${
                        errors.authorName
                          ? "border-rose-500 focus:ring-rose-500"
                          : "border-slate-800 focus:border-yellow-400 focus:ring-yellow-400"
                      }`}
                    />
                    {errors.authorName && (
                      <p className="text-[11px] text-rose-400 font-medium">{errors.authorName}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                      Email Address * <span className="text-slate-500 normal-case">(Kept private)</span>
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="maria@example.com"
                      value={formData.email}
                      onChange={(e) => {
                        setFormData((prev) => ({ ...prev, email: e.target.value }));
                        clearFieldError("email");
                      }}
                      className={`w-full px-3.5 py-2 rounded-xl bg-slate-950/80 border text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 transition ${
                        errors.email
                          ? "border-rose-500 focus:ring-rose-500"
                          : "border-slate-800 focus:border-yellow-400 focus:ring-yellow-400"
                      }`}
                    />
                    {errors.email && (
                      <p className="text-[11px] text-rose-400 font-medium">{errors.email}</p>
                    )}
                  </div>
                </div>

                {/* Role and Event / Organization */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                      Role or Relation <span className="text-slate-500 normal-case">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Festival Director, Bride, Spectator"
                      value={formData.roleOrEvent}
                      onChange={(e) => {
                        setFormData((prev) => ({ ...prev, roleOrEvent: e.target.value }));
                        clearFieldError("roleOrEvent");
                      }}
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 transition"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                      Event / Organization <span className="text-slate-500 normal-case">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Bloomfield Parade"
                      value={formData.organization}
                      onChange={(e) => {
                        setFormData((prev) => ({ ...prev, organization: e.target.value }));
                        clearFieldError("organization");
                      }}
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 transition"
                    />
                  </div>
                </div>

                {/* Event Category Tag */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                    Category Tag
                  </label>
                  <select
                    value={formData.tag}
                    onChange={(e) => setFormData((prev) => ({ ...prev, tag: e.target.value }))}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-white focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 transition"
                  >
                    <option value="Community Event">Community Event</option>
                    <option value="Parade">Parade</option>
                    <option value="Festival">Festival</option>
                    <option value="Wedding">Wedding</option>
                    <option value="Private Event">Private Event</option>
                  </select>
                </div>

                {/* Permission Consent Checkbox */}
                <div className="pt-2">
                  <label className="flex items-start gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={formData.permissionToPublish}
                      onChange={(e) => {
                        setFormData((prev) => ({ ...prev, permissionToPublish: e.target.checked }));
                        clearFieldError("permissionToPublish");
                      }}
                      className="mt-0.5 rounded bg-slate-950 border-slate-800 text-yellow-400 focus:ring-yellow-400 w-4 h-4"
                    />
                    <span className="text-[11px] text-slate-400 leading-tight">
                      I grant the Eagleburger Band permission to display this review and my name publicly on their website and promotional channels.
                    </span>
                  </label>
                  {errors.permissionToPublish && (
                    <p className="text-[11px] text-rose-400 font-medium mt-1">
                      {errors.permissionToPublish}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="pt-3 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowFormModal(false)}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-2.5 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center gap-2 transition shadow-lg shadow-yellow-400/20 disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Submitting...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Post Review</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

