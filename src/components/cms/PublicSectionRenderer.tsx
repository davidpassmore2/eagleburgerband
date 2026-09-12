"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { collection, query, where, getDocs, limit } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { ContentSection } from "@/lib/schema/page";
import { sanitizeHtml } from "@/components/cms/WysiwygEditor";
import BookingFormSection from "@/components/public/BookingFormSection";
import { 
  Sparkles, 
  Send, 
  Calendar, 
  Music, 
  Zap, 
  Drum, 
  Users, 
  ArrowRight, 
  Star, 
  ChevronDown, 
  MapPin,
  HelpCircle,
  Quote
} from "lucide-react";

const ICON_MAP: Record<string, React.ReactNode> = {
  Zap: <Zap className="w-6 h-6 text-yellow-400" />,
  Music: <Music className="w-6 h-6 text-yellow-400" />,
  Drum: <Drum className="w-6 h-6 text-yellow-400" />,
  Users: <Users className="w-6 h-6 text-yellow-400" />,
  Calendar: <Calendar className="w-6 h-6 text-yellow-400" />,
  Sparkles: <Sparkles className="w-6 h-6 text-yellow-400" />,
};

interface PublicGigSummary {
  id: string;
  date: string;
  title: string;
  venue: string;
  city: string;
  admission: string;
}

function getEmbedUrl(url: string) {
  if (url.includes("watch?v=")) {
    const id = url.split("watch?v=")[1]?.split("&")[0];
    return `https://www.youtube-nocookie.com/embed/${id}`;
  }
  if (url.includes("youtu.be/")) {
    const id = url.split("youtu.be/")[1]?.split("?")[0];
    return `https://www.youtube-nocookie.com/embed/${id}`;
  }
  return url;
}

export default function PublicSectionRenderer({
  section,
}: {
  section: ContentSection;
}) {
  // Visibility guard
  if (section.isVisible === false) {
    return null;
  }

  // Background and padding presets
  const paddingClass =
    section.padding === "compact"
      ? "py-8"
      : section.padding === "generous"
      ? "py-20 sm:py-28"
      : "py-12 sm:py-16";

  const backgroundClass =
    section.background === "surface"
      ? "bg-slate-900/60 border-y border-slate-800/80"
      : section.background === "gradient"
      ? "bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 border-y border-slate-800/80"
      : section.background === "muted"
      ? "bg-slate-950/80"
      : "";

  return (
    <div className={`relative ${backgroundClass} ${paddingClass}`}>
      {/* 1. HERO SECTION */}
      {section.type === "hero" && section.hero && (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          {section.hero.badgeText && (
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-yellow-400/10 border border-yellow-400/30 text-yellow-400 text-xs font-mono font-bold uppercase tracking-wider shadow-inner">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{section.hero.badgeText}</span>
            </div>
          )}

          <h1 className="text-4xl sm:text-6xl md:text-7xl font-black text-white uppercase tracking-tight leading-[1.08]">
            {section.hero.headline}
          </h1>

          {section.hero.subheadline && (
            <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed font-medium">
              {section.hero.subheadline}
            </p>
          )}

          {(section.hero.ctaText || section.hero.secondaryCtaText) && (
            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
              {section.hero.ctaText && (
                <Link
                  href={section.hero.ctaHref || "/book"}
                  suppressHydrationWarning
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-black px-8 py-4 rounded-xl text-sm uppercase tracking-wider transition-all shadow-xl shadow-yellow-400/20 hover:scale-105 active:scale-95"
                >
                  <Send className="w-4 h-4" />
                  {section.hero.ctaText}
                </Link>
              )}
              {section.hero.secondaryCtaText && (
                <Link
                  href={section.hero.secondaryCtaHref || "/gigs"}
                  suppressHydrationWarning
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-yellow-400/50 text-white font-bold px-8 py-4 rounded-xl text-sm transition-all"
                >
                  <Calendar className="w-4 h-4 text-yellow-400" />
                  {section.hero.secondaryCtaText}
                </Link>
              )}
            </div>
          )}
        </div>
      )}

      {/* 2. RICH TEXT SECTION */}
      {section.type === "rich_text" && section.richText && (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div
            className={`bg-slate-900/40 border border-slate-800/80 rounded-3xl p-6 sm:p-10 space-y-6 ${
              section.richText.alignment === "center" ? "text-center" : "text-left"
            }`}
          >
            {section.richText.title && (
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white uppercase tracking-tight">
                {section.richText.title}
              </h2>
            )}

            <div
              className="prose prose-invert prose-yellow max-w-none text-xs sm:text-sm text-slate-300 leading-relaxed
                [&>h2]:text-xl [&>h2]:font-extrabold [&>h2]:text-white [&>h2]:mt-6 [&>h2]:mb-3
                [&>h3]:text-base [&>h3]:font-bold [&>h3]:text-yellow-400 [&>h3]:mt-4 [&>h3]:mb-2
                [&>p]:mb-4 [&>p]:leading-relaxed
                [&>ul]:list-disc [&>ul]:pl-5 [&>ul]:mb-4 [&>ul>li]:mb-1
                [&>ol]:list-decimal [&>ol]:pl-5 [&>ol]:mb-4 [&>ol>li]:mb-1
                [&>blockquote]:border-l-2 [&>blockquote]:border-yellow-400 [&>blockquote]:pl-4 [&>blockquote]:italic [&>blockquote]:text-slate-400
                [&>a]:text-yellow-400 [&>a]:underline [&>a]:hover:text-yellow-300"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(section.richText.body) }}
            />
          </div>
        </div>
      )}

      {/* 3. MEDIA HIGHLIGHT SECTION */}
      {section.type === "media_highlight" && section.mediaHighlight && (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl space-y-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-800/80 pb-6">
              <div>
                <span className="text-xs font-extrabold uppercase text-yellow-400 tracking-widest block mb-1">
                  Live Performance Feature
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight">
                  {section.mediaHighlight.title}
                </h2>
              </div>
              {section.mediaHighlight.description && (
                <p className="text-xs sm:text-sm text-slate-400 max-w-md">
                  {section.mediaHighlight.description}
                </p>
              )}
            </div>

            <div className="relative aspect-video w-full rounded-2xl overflow-hidden shadow-2xl border border-slate-700/60 bg-black">
              <iframe
                src={getEmbedUrl(section.mediaHighlight.url)}
                title={section.mediaHighlight.caption || "Performance Showcase"}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="absolute inset-0 w-full h-full"
              />
            </div>

            {section.mediaHighlight.caption && (
              <div className="text-xs text-slate-400 pt-1 flex items-center justify-between">
                <span>📍 {section.mediaHighlight.caption}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. FEATURES SECTION */}
      {section.type === "features" && section.features && (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="text-center space-y-3">
            <h2 className="text-2xl sm:text-4xl font-black text-white uppercase tracking-tight">
              {section.features.title}
            </h2>
            {section.features.subtitle && (
              <p className="text-sm sm:text-base text-slate-400 max-w-xl mx-auto">
                {section.features.subtitle}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {section.features.items.map((item, idx) => (
              <div
                key={idx}
                className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4 hover:border-yellow-400/40 transition-colors shadow-lg group"
              >
                <div className="w-12 h-12 rounded-2xl bg-yellow-400/10 border border-yellow-400/30 flex items-center justify-center text-yellow-400 group-hover:scale-110 transition-transform">
                  {ICON_MAP[item.icon] || <Zap className="w-6 h-6 text-yellow-400" />}
                </div>
                <h3 className="text-lg font-bold text-white uppercase tracking-wide">
                  {item.title}
                </h3>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. GIG FEED PREVIEW SECTION */}
      {section.type === "gig_feed_preview" && section.gigFeedPreview && (
        <GigFeedSectionComponent config={section.gigFeedPreview} />
      )}

      {/* 6. BOOKING FORM PRESET SECTION */}
      {section.type === "booking_form" && (
        <BookingFormSection
          headline={section.bookingForm?.headline}
          subheadline={section.bookingForm?.subheadline}
          badgeText={section.bookingForm?.badgeText}
          defaultEventType={section.bookingForm?.defaultEventType}
          buttonText={section.bookingForm?.buttonText}
        />
      )}

      {/* 7. TESTIMONIALS SECTION */}
      {section.type === "testimonials" && section.testimonials && (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="text-center space-y-3">
            <span className="text-xs font-mono font-bold uppercase tracking-widest text-yellow-400 bg-yellow-400/10 px-3 py-1 rounded-full border border-yellow-400/20">
              Community Voices
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-white uppercase tracking-tight">
              {section.testimonials.title}
            </h2>
            {section.testimonials.subtitle && (
              <p className="text-sm sm:text-base text-slate-400 max-w-xl mx-auto">
                {section.testimonials.subtitle}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {section.testimonials.items.map((item, idx) => (
              <div
                key={idx}
                className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4 relative shadow-lg"
              >
                <Quote className="w-8 h-8 text-yellow-400/20 absolute top-6 right-6" />
                <div className="flex items-center gap-1 text-yellow-400">
                  {Array.from({ length: item.rating || 5 }).map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-sm sm:text-base text-slate-200 italic leading-relaxed">
                  &quot;{item.quote}&quot;
                </p>
                <div className="pt-2 border-t border-slate-800/80">
                  <div className="font-bold text-white text-xs sm:text-sm">{item.author}</div>
                  {item.roleOrEvent && (
                    <div className="text-xs text-slate-400">{item.roleOrEvent}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 8. FAQ ACCORDION SECTION */}
      {section.type === "faq" && section.faq && (
        <FaqSectionComponent config={section.faq} />
      )}

      {/* 9. CALL TO ACTION BANNER */}
      {section.type === "cta_banner" && section.ctaBanner && (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div
            className={`rounded-3xl p-8 sm:p-14 text-center space-y-6 shadow-2xl relative overflow-hidden ${
              section.ctaBanner.variant === "primary"
                ? "bg-yellow-400 text-slate-950"
                : section.ctaBanner.variant === "gradient"
                ? "bg-gradient-to-r from-yellow-500 via-amber-400 to-yellow-400 text-slate-950"
                : "bg-slate-900 border border-slate-800 text-white"
            }`}
          >
            {section.ctaBanner.badgeText && (
              <div
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-wider ${
                  section.ctaBanner.variant === "dark"
                    ? "bg-yellow-400/10 text-yellow-400 border border-yellow-400/20"
                    : "bg-black/10 text-slate-950 border border-black/15"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{section.ctaBanner.badgeText}</span>
              </div>
            )}

            <h2 className="text-3xl sm:text-5xl font-black uppercase tracking-tight leading-tight">
              {section.ctaBanner.headline}
            </h2>

            {section.ctaBanner.subheadline && (
              <p
                className={`text-sm sm:text-base max-w-2xl mx-auto leading-relaxed ${
                  section.ctaBanner.variant === "dark" ? "text-slate-300" : "text-slate-900 font-medium"
                }`}
              >
                {section.ctaBanner.subheadline}
              </p>
            )}

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href={section.ctaBanner.buttonHref || "/book"}
                suppressHydrationWarning
                className={`px-8 py-4 rounded-xl text-xs sm:text-sm font-black uppercase tracking-wider transition shadow-lg hover:scale-105 active:scale-95 flex items-center gap-2 ${
                  section.ctaBanner.variant === "dark"
                    ? "bg-yellow-400 text-slate-950 hover:bg-yellow-300 shadow-yellow-400/20"
                    : "bg-slate-950 text-white hover:bg-slate-900 shadow-black/30"
                }`}
              >
                <Send className="w-4 h-4" />
                <span>{section.ctaBanner.buttonText}</span>
              </Link>
              {section.ctaBanner.secondaryButtonText && (
                <Link
                  href={section.ctaBanner.secondaryButtonHref || "/gigs"}
                  suppressHydrationWarning
                  className={`px-6 py-4 rounded-xl text-xs sm:text-sm font-bold uppercase tracking-wider transition ${
                    section.ctaBanner.variant === "dark"
                      ? "text-slate-300 hover:text-white border border-slate-700"
                      : "text-slate-900 hover:text-black border border-slate-950/20"
                  }`}
                >
                  {section.ctaBanner.secondaryButtonText}
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 10. STATS COUNTER SECTION */}
      {section.type === "stats_counter" && section.statsCounter && (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-4xl font-black text-white uppercase tracking-tight">
              {section.statsCounter.title}
            </h2>
            {section.statsCounter.subtitle && (
              <p className="text-sm sm:text-base text-slate-400 max-w-xl mx-auto">
                {section.statsCounter.subtitle}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            {section.statsCounter.metrics.map((metric, idx) => (
              <div
                key={idx}
                className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 text-center space-y-2 hover:border-yellow-400/40 transition shadow-lg"
              >
                <div className="text-3xl sm:text-5xl font-black text-yellow-400 font-mono tracking-tight">
                  {metric.value}
                </div>
                <div className="text-xs sm:text-sm font-bold text-white uppercase tracking-wide">
                  {metric.label}
                </div>
                {metric.description && (
                  <div className="text-[11px] text-slate-400 leading-tight">
                    {metric.description}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Sub-component: GigFeedSectionComponent
function GigFeedSectionComponent({
  config,
}: {
  config: { title: string; maxItems: number; ctaText: string; ctaHref: string };
}) {
  const [upcomingGigs, setUpcomingGigs] = useState<PublicGigSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadGigs = async () => {
      try {
        const q = query(
          collection(db, "gigs"),
          where("status", "==", "confirmed"),
          limit(config.maxItems || 3)
        );
        const snap = await getDocs(q);
        const list: PublicGigSummary[] = [];
        snap.forEach((d) => {
          const data = d.data();
          if (data.publicDetails && data.publicDetails.isPublic !== false) {
            list.push({
              id: d.id,
              date: data.date || "TBA",
              title: data.publicDetails.title || "Eagleburger Performance",
              venue: data.publicDetails.venue || "TBA",
              city: data.publicDetails.city || "Pittsburgh, PA",
              admission: data.publicDetails.admission || "Free",
            });
          }
        });
        setUpcomingGigs(list);
      } catch (err) {
        console.warn("Could not load preview gigs:", err);
      } finally {
        setLoading(false);
      }
    };
    loadGigs();
  }, [config.maxItems]);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <span className="text-xs font-mono font-bold uppercase text-yellow-400 tracking-wider">
            Public Shows & Appearances
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight">
            {config.title || "Upcoming Performances"}
          </h2>
        </div>

        <Link
          href={config.ctaHref || "/gigs"}
          suppressHydrationWarning
          className="text-xs font-bold text-yellow-400 hover:text-yellow-300 flex items-center gap-1.5 transition self-start sm:self-end"
        >
          <span>{config.ctaText || "View Full Performance Schedule"}</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {loading ? (
          Array.from({ length: config.maxItems || 3 }).map((_, i) => (
            <div key={i} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 h-40 animate-pulse" />
          ))
        ) : upcomingGigs.length === 0 ? (
          <div className="col-span-full bg-slate-900/60 border border-slate-800 rounded-3xl p-8 text-center text-slate-500 text-xs">
            No public performances currently scheduled. Check back soon or request a booking!
          </div>
        ) : (
          upcomingGigs.map((gig) => (
            <div
              key={gig.id}
              className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 flex flex-col justify-between gap-4 hover:border-yellow-400/40 transition-colors shadow-lg group"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-yellow-400 font-bold bg-yellow-400/10 px-2.5 py-0.5 rounded-full border border-yellow-400/20">
                    {gig.date}
                  </span>
                  <span className="text-slate-500">{gig.admission}</span>
                </div>
                <h3 className="text-base font-bold text-white group-hover:text-yellow-400 transition-colors">
                  {gig.title}
                </h3>
              </div>

              <div className="text-xs text-slate-400 flex items-center gap-1.5 pt-2 border-t border-slate-800/80">
                <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span className="truncate">{gig.venue}, {gig.city}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// Sub-component: FaqSectionComponent
function FaqSectionComponent({
  config,
}: {
  config: { title: string; subtitle?: string; items: { question: string; answer: string; category?: string }[] };
}) {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  const toggle = (idx: number) => {
    setOpenIdx((prev) => (prev === idx ? null : idx));
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-yellow-400/10 border border-yellow-400/20 text-yellow-400 text-xs font-mono font-bold uppercase tracking-wider">
          <HelpCircle className="w-3.5 h-3.5" />
          <span>Event Coordination</span>
        </div>
        <h2 className="text-2xl sm:text-4xl font-black text-white uppercase tracking-tight">
          {config.title}
        </h2>
        {config.subtitle && (
          <p className="text-sm sm:text-base text-slate-400 max-w-lg mx-auto">
            {config.subtitle}
          </p>
        )}
      </div>

      <div className="space-y-3">
        {config.items.map((item, idx) => {
          const isOpen = openIdx === idx;

          return (
            <div
              key={idx}
              className={`bg-slate-900/60 border rounded-2xl overflow-hidden transition-colors ${
                isOpen ? "border-yellow-400/40" : "border-slate-800 hover:border-slate-700"
              }`}
            >
              <button
                type="button"
                onClick={() => toggle(idx)}
                className="w-full p-5 text-left flex items-center justify-between gap-4 text-white font-bold text-sm sm:text-base"
              >
                <span>{item.question}</span>
                <ChevronDown
                  className={`w-4 h-4 text-yellow-400 shrink-0 transition-transform duration-200 ${
                    isOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {isOpen && (
                <div className="px-5 pb-5 text-xs sm:text-sm text-slate-300 leading-relaxed border-t border-slate-800/60 pt-3 animate-in fade-in duration-150">
                  {item.answer}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

