"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { 
  Calendar, 
  MapPin, 
  ExternalLink, 
  Send, 
  Ticket, 
  History
} from "lucide-react";

interface PublicGig {
  id: string;
  date: string;
  title: string;
  venue: string;
  city: string;
  description: string;
  admission: string;
  facebookEventUrl?: string;
  ticketUrl?: string;
}

export default function PublicGigsPage() {
  const [gigs, setGigs] = useState<PublicGig[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPast, setShowPast] = useState(false);

  useEffect(() => {
    // Query only confirmed public gigs
    const gigsQuery = query(
      collection(db, "gigs"),
      where("status", "==", "confirmed")
    );

    const unsub = onSnapshot(
      gigsQuery,
      (snap) => {
        const list: PublicGig[] = [];
        snap.forEach((doc) => {
          const data = doc.data();
          const pub = data.publicDetails || {};
          // Strict Privacy Boundary: never expose internal logistics, call sheets, or musician pay
          if (pub.isPublic !== false) {
            list.push({
              id: doc.id,
              date: data.date || "",
              title: pub.title || "Eagleburger Performance",
              venue: pub.venue || "TBA",
              city: pub.city || "Pittsburgh, PA",
              description: pub.description || "",
              admission: pub.admission || "Free",
              facebookEventUrl: pub.facebookEventUrl || "",
              ticketUrl: pub.ticketUrl || "",
            });
          }
        });

        // Sort by date
        list.sort((a, b) => (a.date > b.date ? 1 : -1));
        setGigs(list);
        setLoading(false);
      },
      (err) => {
        console.warn("Error loading public gigs:", err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, []);

  const todayStr = new Date().toISOString().split("T")[0];
  const upcomingGigs = gigs.filter((g) => !g.date || g.date >= todayStr);
  const pastGigs = gigs.filter((g) => g.date && g.date < todayStr).reverse();

  const displayGigs = showPast ? pastGigs : upcomingGigs;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
      {/* Page Header */}
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <div className="inline-flex items-center gap-2 bg-yellow-400/10 border border-yellow-400/30 text-yellow-400 text-xs font-black uppercase tracking-widest px-4 py-1.5 rounded-full">
          <Calendar className="w-3.5 h-3.5" />
          Live Performance Schedule
        </div>
        <h1 className="text-4xl sm:text-5xl font-black text-white uppercase tracking-tight">
          Where to Catch the Band
        </h1>
        <p className="text-sm sm:text-base text-slate-400 leading-relaxed font-medium">
          Parades, street rallies, outdoor festivals, and community celebrations across the Greater Pittsburgh area. All acoustic, high-decibel, and open to the public.
        </p>

        {/* Toggle between Upcoming and Past */}
        <div className="pt-2 flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => setShowPast(false)}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition ${
              !showPast
                ? "bg-yellow-400 text-slate-950 shadow-lg shadow-yellow-400/20"
                : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
            }`}
          >
            Upcoming Appearances ({upcomingGigs.length})
          </button>
          <button
            type="button"
            onClick={() => setShowPast(true)}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition flex items-center gap-1.5 ${
              showPast
                ? "bg-yellow-400 text-slate-950 shadow-lg shadow-yellow-400/20"
                : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
            }`}
          >
            <History className="w-3.5 h-3.5" />
            Past Highlights ({pastGigs.length})
          </button>
        </div>
      </div>

      {/* Gigs List */}
      <div className="max-w-4xl mx-auto space-y-6">
        {loading ? (
          <div className="text-center py-16 space-y-3">
            <div className="w-8 h-8 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
              Loading Performance Feed...
            </p>
          </div>
        ) : displayGigs.length === 0 ? (
          <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-12 text-center space-y-4">
            <Calendar className="w-12 h-12 text-slate-600 mx-auto" />
            <h3 className="text-lg font-black text-white uppercase tracking-wide">
              {showPast ? "No Past Appearances Logged Yet" : "No Upcoming Public Shows Scheduled Right Now"}
            </h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
              {showPast
                ? "Past parade archives will populate here as the season progresses."
                : "We are actively booking and finalizing dates for the upcoming parade season. Inquire today to bring Eagleburger to your community event!"}
            </p>
            {!showPast && (
              <Link
                href="/book"
                className="inline-flex items-center gap-2 bg-yellow-400 text-slate-950 font-bold px-6 py-3 rounded-xl text-xs uppercase tracking-wider hover:bg-yellow-300 transition shadow-lg"
              >
                <Send className="w-4 h-4" />
                Book the Band for Your Event
              </Link>
            )}
          </div>
        ) : (
          displayGigs.map((gig) => {
            const dateObj = gig.date ? new Date(`${gig.date}T00:00:00`) : null;
            const monthStr = dateObj ? dateObj.toLocaleDateString("en-US", { month: "short" }) : "TBA";
            const dayStr = dateObj ? dateObj.toLocaleDateString("en-US", { day: "2-digit" }) : "";
            const weekdayStr = dateObj ? dateObj.toLocaleDateString("en-US", { weekday: "long" }) : "";

            return (
              <div
                key={gig.id}
                className="bg-slate-900/70 border border-slate-800 hover:border-yellow-400/40 rounded-2xl p-6 sm:p-8 transition-all hover:shadow-xl hover:shadow-yellow-400/5 flex flex-col md:flex-row md:items-center justify-between gap-6"
              >
                {/* Date Badge */}
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-yellow-400 text-slate-950 flex flex-col items-center justify-center shrink-0 shadow-lg shadow-yellow-400/10">
                    <span className="text-[11px] font-black uppercase tracking-wider leading-tight">
                      {monthStr}
                    </span>
                    <span className="text-2xl font-black leading-none">
                      {dayStr}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-yellow-400">
                      {weekdayStr}
                    </span>
                    <h3 className="text-xl font-black text-white uppercase tracking-tight">
                      {gig.title}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
                      <MapPin className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
                      <span>{gig.venue} &bull; {gig.city}</span>
                    </div>
                  </div>
                </div>

                {/* Description & Links */}
                <div className="md:max-w-xs space-y-3">
                  {gig.description && (
                    <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                      {gig.description}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <span className="inline-block bg-slate-800/80 text-slate-300 border border-slate-700/60 px-2.5 py-1 rounded-lg text-[11px] font-semibold">
                      Admission: {gig.admission}
                    </span>

                    {gig.facebookEventUrl && (
                      <a
                        href={gig.facebookEventUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-yellow-400 hover:underline bg-yellow-400/10 px-2.5 py-1 rounded-lg border border-yellow-400/20"
                      >
                        Event Link <ExternalLink className="w-3 h-3" />
                      </a>
                    )}

                    {gig.ticketUrl && (
                      <a
                        href={gig.ticketUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-yellow-400 hover:underline bg-yellow-400/10 px-2.5 py-1 rounded-lg border border-yellow-400/20"
                      >
                        Tickets <Ticket className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Booking CTA Footer Box */}
      <div className="max-w-4xl mx-auto bg-slate-900/40 border border-slate-800 rounded-3xl p-8 text-center space-y-4">
        <h3 className="text-2xl font-black text-white uppercase tracking-tight">
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
