"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/lib/context/AuthContext";
import { canManageGigs } from "@/lib/auth/permissions";
import { User } from "@/lib/schema/user";
import { 
  Calendar, 
  MapPin, 
  Ticket, 
  ExternalLink, 
  ArrowLeft, 
  Share2, 
  Check, 
  Send,
  Sparkles,
  Music2,
  Navigation,
  Link2,
  Mail
} from "lucide-react";
import { SocialIcon } from "@/components/ui/SocialIcon";
import AddToCalendarButton from "@/components/public/AddToCalendarButton";

// Dynamically import Leaflet Map with SSR disabled for Next.js 16 App Router & Turbopack safety
const EventVenueMap = dynamic(
  () => import("@/components/public/EventVenueMap"),
  {
    ssr: false,
    loading: () => (
      <div className="bg-slate-900 border border-slate-800 rounded-3xl h-80 flex items-center justify-center text-xs text-slate-500 font-mono animate-pulse">
        Loading OpenStreetMap...
      </div>
    ),
  }
);

interface GigData {
  id: string;
  date: string;
  status: string;
  publicDetails: {
    title: string;
    venue: string;
    address?: string;
    coordinates?: { lat: number; lng: number };
    city: string;
    description: string;
    admission: string;
    facebookEventUrl?: string;
    ticketUrl?: string;
    isPublic: boolean;
    showExternalDirections?: boolean;
  };
}

export default function PublicGigDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const gigId = resolvedParams.id;

  const { profile } = useAuth();
  const [gig, setGig] = useState<GigData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isTogglingDirections, setIsTogglingDirections] = useState(false);

  const handleToggleDirections = async () => {
    if (!gig) return;
    setIsTogglingDirections(true);
    try {
      const current = gig.publicDetails.showExternalDirections !== false;
      await setDoc(
        doc(db, "gigs", gig.id),
        {
          publicDetails: {
            showExternalDirections: !current,
          },
        },
        { merge: true }
      );
    } catch (err) {
      alert("Failed to toggle navigation: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsTogglingDirections(false);
    }
  };

  useEffect(() => {
    if (!gigId) return;

    const unsub = onSnapshot(
      doc(db, "gigs", gigId),
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          const pub = data.publicDetails || {};

          // Enforce strict privacy guardrail: only allow public view if isPublic !== false
          if (pub.isPublic !== false) {
            setGig({
              id: docSnap.id,
              date: data.date || "",
              status: data.status || "confirmed",
              publicDetails: {
                title: pub.title || data.title || "Eagleburger Band Appearance",
                venue: pub.venue || data.venue || "TBA",
                address: pub.address || pub.venueAddress || data.venueAddress || "",
                coordinates: pub.coordinates || data.coordinates,
                city: pub.city || data.city || "Pittsburgh, PA",
                description: pub.description || "",
                admission: pub.admission || "Free",
                facebookEventUrl: pub.facebookEventUrl || "",
                ticketUrl: pub.ticketUrl || "",
                isPublic: pub.isPublic !== false,
                showExternalDirections: pub.showExternalDirections !== false,
              },
            });
          } else {
            setGig(null);
          }
        } else {
          setGig(null);
        }
        setLoading(false);
      },
      (err) => {
        console.warn("Error fetching gig:", err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [gigId]);

  const handleCopyShareLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-24 text-center space-y-4">
        <div className="w-10 h-10 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
          Loading Event Details...
        </p>
      </div>
    );
  }

  if (!gig) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-20 text-center space-y-6">
        <div className="w-16 h-16 rounded-full bg-yellow-400/10 border border-yellow-400/20 text-yellow-400 flex items-center justify-center mx-auto">
          <Calendar className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-black text-white uppercase tracking-tight">
            Event Not Found or Private
          </h1>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            This performance may have concluded, been rescheduled, or is an unlisted rehearsal.
          </p>
        </div>
        <Link
          href="/gigs"
          className="inline-flex items-center gap-2 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-black px-6 py-3 rounded-xl text-xs uppercase tracking-wider transition shadow-lg"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Live Performance Schedule
        </Link>
      </div>
    );
  }

  const { publicDetails, date } = gig;
  const dateObj = date ? new Date(`${date}T00:00:00`) : null;
  const monthStr = dateObj ? dateObj.toLocaleDateString("en-US", { month: "short" }) : "TBA";
  const dayStr = dateObj ? dateObj.toLocaleDateString("en-US", { day: "2-digit" }) : "";
  const weekdayStr = dateObj ? dateObj.toLocaleDateString("en-US", { weekday: "long" }) : "";
  const yearStr = dateObj ? dateObj.getFullYear() : "";

  const pageUrl = typeof window !== "undefined" ? window.location.href : "";
  const shareTitle = encodeURIComponent(`${publicDetails.title} with the Eagleburger Band`);
  const facebookShareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(pageUrl)}`;
  const blueskyShareUrl = `https://bsky.app/intent/compose?text=${encodeURIComponent(`${publicDetails.title} with the Eagleburger Band: ${pageUrl}`)}`;
  const emailShareUrl = `mailto:?subject=${shareTitle}&body=Check out this upcoming appearance with the Eagleburger Band: ${encodeURIComponent(pageUrl)}`;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
      {/* Top Navigation Breadcrumb */}
      <div>
        <Link
          href="/gigs"
          className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-yellow-400 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Performance Schedule</span>
        </Link>
      </div>

      {/* Gig Manager / Admin Live Quick-Toggle Bar */}
      {canManageGigs(profile as unknown as User) && (
        <div className="bg-yellow-400/10 border border-yellow-400/30 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-yellow-400/20 text-yellow-400 flex items-center justify-center shrink-0">
              <Navigation className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-black uppercase tracking-wider text-yellow-400">
                  Gig Manager Control
                </span>
                <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                  publicDetails.showExternalDirections
                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                    : "bg-slate-800 text-slate-400 border-slate-700"
                }`}>
                  {publicDetails.showExternalDirections ? "1-Click Nav: ENABLED" : "1-Click Nav: DISABLED"}
                </span>
              </div>
              <span className="text-slate-300 text-[11px] block mt-0.5">
                {publicDetails.showExternalDirections
                  ? "Google & Apple Maps navigation buttons are visible on the public map below."
                  : "Google & Apple Maps navigation buttons are hidden from the public map below."}
              </span>
            </div>
          </div>
          <button
            type="button"
            disabled={isTogglingDirections}
            onClick={handleToggleDirections}
            className={`px-3.5 py-1.5 rounded-xl font-bold text-xs uppercase tracking-wider transition shrink-0 ${
              publicDetails.showExternalDirections
                ? "bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
                : "bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-black shadow-md shadow-yellow-400/10"
            }`}
          >
            {publicDetails.showExternalDirections ? "Disable Navigation Buttons" : "Enable Navigation Buttons"}
          </button>
        </div>
      )}

      {/* Hero Header Card */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl space-y-8">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-800/80">
          <div className="flex items-start gap-5">
            {/* Prominent Date Badge */}
            <div className="w-20 h-20 rounded-2xl bg-yellow-400 text-slate-950 flex flex-col items-center justify-center shrink-0 shadow-xl shadow-yellow-400/20">
              <span className="text-xs font-black uppercase tracking-wider leading-tight">
                {monthStr}
              </span>
              <span className="text-3xl font-black leading-none">{dayStr}</span>
              <span className="text-[10px] font-bold text-slate-800">{yearStr}</span>
            </div>

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-mono font-bold uppercase text-yellow-400 tracking-wider">
                  {weekdayStr}
                </span>
                <span className="text-slate-600">&bull;</span>
                <span className="text-[11px] font-semibold bg-slate-800 text-slate-300 border border-slate-700 px-2.5 py-0.5 rounded-full">
                  Admission: {publicDetails.admission}
                </span>
              </div>

              <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white uppercase tracking-tight">
                {publicDetails.title}
              </h1>

              <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-300 font-medium pt-1">
                <MapPin className="w-4 h-4 text-yellow-400 shrink-0" />
                <span>
                  {publicDetails.venue} &bull; {publicDetails.city}
                </span>
              </div>
            </div>
          </div>

          {/* Top Quick Actions */}
          <div className="flex flex-wrap items-center gap-3">
            <AddToCalendarButton
              event={{
                id: gig.id,
                title: publicDetails.title,
                date: gig.date,
                venue: publicDetails.venue,
                city: publicDetails.city,
                description: publicDetails.description,
                eventUrl: pageUrl,
              }}
              buttonVariant="primary"
            />

            {publicDetails.ticketUrl && (
              <a
                href={publicDetails.ticketUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 bg-yellow-400/10 hover:bg-yellow-400/20 text-yellow-400 border border-yellow-400/30 font-bold px-4 py-2.5 rounded-xl text-xs uppercase tracking-wider transition"
              >
                <span>Get Tickets</span>
                <Ticket className="w-3.5 h-3.5" />
              </a>
            )}

            {publicDetails.facebookEventUrl && (
              <a
                href={publicDetails.facebookEventUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 font-bold px-4 py-2.5 rounded-xl text-xs uppercase tracking-wider transition"
              >
                <span>Facebook Event</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        </div>

        {/* Event Description & Highlights */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="space-y-3">
              <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-yellow-400 flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                <span>About this Appearance</span>
              </h2>
              {publicDetails.description ? (
                <p className="text-sm sm:text-base text-slate-300 leading-relaxed whitespace-pre-line font-normal">
                  {publicDetails.description}
                </p>
              ) : (
                <p className="text-sm text-slate-400 italic">
                  Join the Eagleburger Band for high-octane street brass and drumline rhythms at {publicDetails.venue}.
                </p>
              )}
            </div>

            {/* Brass Band Expectation Card */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-5 flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-yellow-400/10 border border-yellow-400/20 text-yellow-400 flex items-center justify-center shrink-0 mt-0.5">
                <Music2 className="w-5 h-5" />
              </div>
              <div className="space-y-1 text-xs">
                <h3 className="font-bold text-white uppercase tracking-wide">
                  100% Mobile & Acoustic Street Brass
                </h3>
                <p className="text-slate-400 leading-relaxed">
                  No electrical cords, stages, or soundboards. We roam freely through crowds, plazas, and parade routes bringing raw acoustic brass energy up close.
                </p>
              </div>
            </div>
          </div>

          {/* Social Share Card */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-6 space-y-4 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-yellow-400">
                <Share2 className="w-4 h-4" />
                <span>Spread the Word</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Invite friends and share this performance on social media or in group chats.
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={handleCopyShareLink}
                className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold py-2.5 px-4 rounded-xl text-xs transition border border-slate-700"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span className="text-emerald-400">Link Copied!</span>
                  </>
                ) : (
                  <>
                    <Link2 className="w-4 h-4 text-slate-400" />
                    <span>Copy Shareable Link</span>
                  </>
                )}
              </button>

              <div className="grid grid-cols-3 gap-2 pt-1">
                <a
                  href={facebookShareUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl bg-slate-900 hover:bg-blue-600/20 text-slate-300 hover:text-blue-400 border border-slate-800 hover:border-blue-500/40 text-xs font-semibold transition"
                >
                  <SocialIcon platform="facebook" className="w-3.5 h-3.5 shrink-0" />
                  <span>Facebook</span>
                </a>
                <a
                  href={blueskyShareUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl bg-slate-900 hover:bg-sky-500/20 text-slate-300 hover:text-sky-400 border border-slate-800 hover:border-sky-400/40 text-xs font-semibold transition"
                >
                  <SocialIcon platform="bluesky" className="w-3.5 h-3.5 shrink-0 text-sky-400" />
                  <span>Bluesky</span>
                </a>
                <a
                  href={emailShareUrl}
                  className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl bg-slate-900 hover:bg-yellow-400/20 text-slate-300 hover:text-yellow-400 border border-slate-800 hover:border-yellow-400/40 text-xs font-semibold transition"
                >
                  <Mail className="w-3.5 h-3.5 shrink-0 text-yellow-400" />
                  <span>Email</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive OpenStreetMap Leaflet Map */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight">
            Venue & Directions
          </h2>
          <span className="text-xs text-slate-400 font-medium">
            Powered by OpenStreetMap
          </span>
        </div>

        <EventVenueMap
          venue={publicDetails.venue}
          address={publicDetails.address}
          city={publicDetails.city}
          coordinates={publicDetails.coordinates}
          showExternalDirections={publicDetails.showExternalDirections !== false}
        />
      </div>

      {/* Booking CTA Card */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-8 sm:p-12 text-center space-y-4">
        <h3 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight">
          Want Eagleburger at Your Parade or Festival?
        </h3>
        <p className="text-xs sm:text-sm text-slate-400 max-w-lg mx-auto leading-relaxed">
          We bring high-decibel horns, drum cadences, and street choreography to events across Western PA. Let our gig manager know about your date!
        </p>
        <Link
          href="/book"
          className="inline-flex items-center gap-2 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-black px-6 py-3 rounded-xl text-xs uppercase tracking-wider transition shadow-lg shadow-yellow-400/20"
        >
          <Send className="w-3.5 h-3.5" />
          Request Booking Availability
        </Link>
      </div>
    </div>
  );
}

