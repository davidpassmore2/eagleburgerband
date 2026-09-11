"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { doc, onSnapshot, collection, query, where, getDocs, limit } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { ContentPage, ContentPageSchema } from "@/lib/schema/page";
import { 
  Music, 
  Calendar, 
  Send, 
  Zap, 
  Sparkles, 
  MapPin, 
  ArrowRight,
  Drum,
  Users
} from "lucide-react";

const ICON_MAP: Record<string, React.ReactNode> = {
  Zap: <Zap className="w-6 h-6 text-yellow-400" />,
  Music: <Music className="w-6 h-6 text-yellow-400" />,
  Drum: <Drum className="w-6 h-6 text-yellow-400" />,
  Users: <Users className="w-6 h-6 text-yellow-400" />,
  Calendar: <Calendar className="w-6 h-6 text-yellow-400" />,
};

interface PublicGigSummary {
  id: string;
  date: string;
  title: string;
  venue: string;
  city: string;
  admission: string;
}

export default function PublicHomePage() {
  const [pageData, setPageData] = useState<ContentPage | null>(null);
  const [upcomingGigs, setUpcomingGigs] = useState<PublicGigSummary[]>([]);

  useEffect(() => {
    // 1. Listen for Headless CMS Home Page Content
    const unsub = onSnapshot(
      doc(db, "content_pages", "home"),
      (snap) => {
        if (snap.exists()) {
          const parsed = ContentPageSchema.safeParse(snap.data());
          if (parsed.success) {
            setPageData(parsed.data);
          }
        }
      },
      (err) => {
        console.warn("CMS Home Page load error (falling back to defaults):", err);
      }
    );

    // 2. Query Public Gigs for Preview
    const loadGigs = async () => {
      try {
        const gigsQuery = query(
          collection(db, "gigs"),
          where("status", "==", "confirmed"),
          limit(3)
        );
        const gigSnap = await getDocs(gigsQuery);
        const list: PublicGigSummary[] = [];
        gigSnap.forEach((d) => {
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
      } catch (e) {
        console.warn("Could not load preview gigs:", e);
      }
    };

    loadGigs();
    return () => unsub();
  }, []);

  // Helper to get embed URL from youtube watch link
  const getEmbedUrl = (url: string) => {
    if (url.includes("watch?v=")) {
      const id = url.split("watch?v=")[1]?.split("&")[0];
      return `https://www.youtube-nocookie.com/embed/${id}`;
    }
    if (url.includes("youtu.be/")) {
      const id = url.split("youtu.be/")[1]?.split("?")[0];
      return `https://www.youtube-nocookie.com/embed/${id}`;
    }
    return url;
  };

  const heroSection = pageData?.sections?.find((s) => s.type === "hero")?.hero;
  const mediaSection = pageData?.sections?.find((s) => s.type === "media_highlight")?.mediaHighlight;
  const featuresSection = pageData?.sections?.find((s) => s.type === "features")?.features;

  const seo = pageData?.seo;
  const seoTitle = seo?.metaTitle?.trim() || "Eagleburger Band | Pittsburgh High-Energy Street Brass";
  const seoDesc = seo?.metaDescription?.trim() || pageData?.description || "The Eagleburger Band brings high-energy acoustic street brass and drum powerhouse excitement to parades, festivals, and celebrations across Western PA.";
  const keywords = seo?.keywords?.trim() || "brass band, pittsburgh street music, mobile brass, parade band, live music pittsburgh";
  const canonicalUrl = seo?.canonicalUrl?.trim() || "https://eagleburgerband.com";
  const ogImage = seo?.ogImageUrl?.trim() || "";
  const ogType = seo?.ogType || "website";
  const robots = seo?.noIndex
    ? "noindex, nofollow"
    : seo?.noFollow
    ? "index, nofollow"
    : "index, follow";

  const jsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "MusicGroup",
    name: "Eagleburger Band",
    url: "https://eagleburgerband.com",
    genre: "Brass Band / Street Music",
    description: seoDesc,
    sameAs: [
      "https://www.youtube.com/@eagleburgerband",
      "https://www.instagram.com/eagleburgerband",
    ],
  });

  return (
    <div className="space-y-20 pb-20" suppressHydrationWarning>
      <title>{seoTitle}</title>
      <meta name="description" content={seoDesc} />
      {keywords && <meta name="keywords" content={keywords} />}
      <meta name="robots" content={robots} />
      <link rel="canonical" href={canonicalUrl} />
      <meta property="og:title" content={seoTitle} />
      <meta property="og:description" content={seoDesc} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:type" content={ogType} />
      {ogImage && <meta property="og:image" content={ogImage} />}
      <meta name="twitter:card" content={ogImage ? "summary_large_image" : "summary"} />
      <meta name="twitter:title" content={seoTitle} />
      <meta name="twitter:description" content={seoDesc} />
      {ogImage && <meta name="twitter:image" content={ogImage} />}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd }}
      />

      {/* 1. HERO SECTION */}
      <section 
        className="relative overflow-hidden pt-12 md:pt-20 pb-16 px-4 sm:px-6 lg:px-8 border-b border-slate-900 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-yellow-950/20 via-slate-950 to-slate-950"
        suppressHydrationWarning
      >
        <div className="max-w-5xl mx-auto text-center space-y-6" suppressHydrationWarning>
          <div className="inline-flex items-center gap-2 bg-yellow-400/10 border border-yellow-400/30 text-yellow-400 text-xs font-black uppercase tracking-widest px-4 py-1.5 rounded-full shadow-inner">
            <Sparkles className="w-3.5 h-3.5" />
            {heroSection?.badgeText || "Acoustic Brass & Percussion Battery"}
          </div>

          <h1 className="text-4xl sm:text-6xl md:text-7xl font-black text-white uppercase tracking-tight leading-[1.08]">
            {heroSection?.headline || (
              <>
                Pittsburgh&apos;s High-Energy <br />
                <span className="text-yellow-400 underline decoration-yellow-500/50 decoration-wavy decoration-from-font">
                  Street Brass
                </span>{" "}
                Powerhouse
              </>
            )}
          </h1>

          <p className="max-w-2xl mx-auto text-slate-300 text-base sm:text-lg leading-relaxed font-medium">
            {heroSection?.subheadline ||
              "Bringing high-stepping brass fanfares, infectious street percussion, and unstoppable parade energy directly to crowds across Western Pennsylvania."}
          </p>

          <div 
            className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4"
            suppressHydrationWarning
          >
            <Link
              href={heroSection?.ctaHref || "/book"}
              suppressHydrationWarning
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-black px-8 py-4 rounded-xl text-sm uppercase tracking-wider transition-all shadow-xl shadow-yellow-400/20 hover:scale-105 active:scale-95"
            >
              <Send className="w-4 h-4" />
              {heroSection?.ctaText || "Book the Band"}
            </Link>

            <Link
              href={heroSection?.secondaryCtaHref || "/gigs"}
              suppressHydrationWarning
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-yellow-400/50 text-white font-bold px-8 py-4 rounded-xl text-sm transition-all"
            >
              <Calendar className="w-4 h-4 text-yellow-400" />
              {heroSection?.secondaryCtaText || "Upcoming Shows"}
            </Link>
          </div>
        </div>
      </section>

      {/* 2. MEDIA HIGHLIGHT: GREENFIELD HOLIDAY PARADE */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8" suppressHydrationWarning>
        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl space-y-6" suppressHydrationWarning>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-800/80 pb-6">
            <div>
              <span className="text-xs font-extrabold uppercase text-yellow-400 tracking-widest block mb-1">
                Live Performance Showcase
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight">
                {mediaSection?.title || "Live on the March"}
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 max-w-md">
              {mediaSection?.description ||
                "Watch the Eagleburger Band marching in full stride — battery percussion and horns in high step."}
            </p>
          </div>

          {/* YouTube Video Player Embed */}
          <div className="relative aspect-video w-full rounded-2xl overflow-hidden shadow-2xl border border-slate-700/60 bg-black">
            <iframe
              src={getEmbedUrl(mediaSection?.url || "https://www.youtube.com/watch?v=v0x-fut30wE")}
              title={mediaSection?.caption || "Greenfield Holiday Parade Performance"}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="absolute inset-0 w-full h-full"
            />
          </div>

          <div className="flex items-center justify-between text-xs text-slate-400 pt-2" suppressHydrationWarning>
            <span className="font-semibold text-slate-300">
              📍 {mediaSection?.caption || "Greenfield Holiday Parade — Pittsburgh, PA"}
            </span>
            <a
              href="https://www.youtube.com/watch?v=v0x-fut30wE"
              target="_blank"
              rel="noopener noreferrer"
              suppressHydrationWarning
              className="text-yellow-400 hover:underline inline-flex items-center gap-1 font-bold"
            >
              Watch on YouTube &rarr;
            </a>
          </div>
        </div>
      </section>

      {/* 3. PERFORMANCE FEATURES (WHY BOOK US) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" suppressHydrationWarning>
        <div className="text-center max-w-2xl mx-auto space-y-3 mb-12">
          <span className="text-xs font-extrabold uppercase text-yellow-400 tracking-widest">
            Acoustic Versatility
          </span>
          <h2 className="text-3xl font-black text-white uppercase tracking-tight">
            {featuresSection?.title || "Why Event Organizers Choose Eagleburger"}
          </h2>
          <p className="text-sm text-slate-400">
            {featuresSection?.subtitle || "Mobile, acoustic, and ready to play anywhere with zero setup delay."}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {(featuresSection?.items || [
            {
              icon: "Zap",
              title: "100% Mobile & Acoustic",
              description: "No stage, cables, generators, or PA systems required. We play while marching, dancing, and mingling directly with crowds.",
            },
            {
              icon: "Drum",
              title: "Massive Brass & Drumline Sound",
              description: "Sousaphones, trombones, trumpets, saxophones, and marching drums delivering high-decibel acoustic excitement.",
            },
            {
              icon: "Calendar",
              title: "Parades, Festivals & Celebrations",
              description: "Civic parades, street festivals, beer gardens, wedding send-offs, and community block parties across Western PA.",
            },
          ]).map((item, idx) => (
            <div
              key={idx}
              className="bg-slate-900/40 border border-slate-800 hover:border-yellow-400/40 rounded-2xl p-6 transition-all hover:translate-y-[-2px] space-y-4"
            >
              <div className="w-12 h-12 rounded-xl bg-yellow-400/10 border border-yellow-400/20 flex items-center justify-center">
                {ICON_MAP[item.icon] || <Music className="w-6 h-6 text-yellow-400" />}
              </div>
              <h3 className="text-lg font-black text-white uppercase tracking-wide">
                {item.title}
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* 4. UPCOMING SHOWS PREVIEW */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" suppressHydrationWarning>
        <div className="bg-slate-900/30 border border-slate-800/80 rounded-3xl p-8 sm:p-10 space-y-6" suppressHydrationWarning>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
            <div>
              <span className="text-xs font-black uppercase text-yellow-400 tracking-widest block mb-1">
                Live Calendar
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight">
                Upcoming Public Shows
              </h2>
            </div>
            <Link
              href="/gigs"
              suppressHydrationWarning
              className="inline-flex items-center gap-1.5 text-xs font-bold text-yellow-400 hover:text-yellow-300 transition-colors"
            >
              View Full Schedule <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {upcomingGigs.length === 0 ? (
            <div className="text-center py-10 space-y-2">
              <Calendar className="w-10 h-10 text-slate-600 mx-auto" />
              <p className="text-sm font-semibold text-slate-400">
                New parade dates and festival appearances are currently being finalized!
              </p>
              <p className="text-xs text-slate-500">
                Check back soon or inquire directly to book the ensemble for your event.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6" suppressHydrationWarning>
              {upcomingGigs.map((g) => (
                <div
                  key={g.id}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 flex flex-col justify-between"
                  suppressHydrationWarning
                >
                  <div className="space-y-2">
                    <span className="inline-block px-2.5 py-0.5 rounded-full bg-yellow-400/10 text-yellow-400 border border-yellow-400/20 text-[10px] font-black uppercase tracking-wider">
                      {g.date}
                    </span>
                    <h3 className="text-base font-extrabold text-white leading-snug">
                      {g.title}
                    </h3>
                    <div className="flex items-center gap-1 text-xs text-slate-400">
                      <MapPin className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
                      <span>{g.venue}, {g.city}</span>
                    </div>
                  </div>
                  <div className="border-t border-slate-800/80 pt-3 flex items-center justify-between text-xs text-slate-400">
                    <span>Admission: {g.admission}</span>
                    <Link 
                      href="/gigs" 
                      suppressHydrationWarning
                      className="text-yellow-400 font-bold hover:underline"
                    >
                      Details &rarr;
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 5. INBOUND BOOKING CALL-TO-ACTION BANNER */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8" suppressHydrationWarning>
        <div 
          className="relative overflow-hidden bg-gradient-to-r from-yellow-500 to-yellow-400 rounded-3xl p-8 sm:p-12 text-slate-950 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-8"
          suppressHydrationWarning
        >
          <div className="space-y-3 text-center md:text-left">
            <span className="text-xs font-black uppercase tracking-widest text-slate-900 bg-yellow-300/60 px-3 py-1 rounded-full">
              Booking Fall 2026 & Spring 2027
            </span>
            <h2 className="text-3xl sm:text-4xl font-black uppercase tracking-tight">
              Ready to Electrify Your Event?
            </h2>
            <p className="text-sm font-semibold text-slate-900 max-w-lg">
              Parades, community festivals, block parties, and corporate rallies. Tell us about your date and our gig coordinator will be in touch.
            </p>
          </div>

          <Link
            href="/book"
            suppressHydrationWarning
            className="shrink-0 inline-flex items-center gap-2 bg-slate-950 hover:bg-slate-900 text-white font-black px-8 py-4 rounded-2xl text-sm uppercase tracking-wider transition-all shadow-xl hover:scale-105 active:scale-95"
          >
            <Send className="w-4 h-4 text-yellow-400" />
            Book the Band Now
          </Link>
        </div>
      </section>
    </div>
  );
}
