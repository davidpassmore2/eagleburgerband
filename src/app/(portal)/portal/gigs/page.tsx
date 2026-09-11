"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { 
  Calendar, 
  MapPin, 
  Clock, 
  ArrowRight, 
  Users 
} from "lucide-react";

type GigItem = {
  id: string;
  date: string;
  status: string;
  publicDetails?: {
    title: string;
    venue: string;
  };
  internalLogistics?: {
    title: string;
    callTime: string;
    unloadingAddress: string;
  };
  rsvpSummary?: {
    attendingCount: number;
    declinedCount: number;
  };
  [key: string]: unknown;
};

export default function PortalGigsListPage() {
  const [gigs, setGigs] = useState<GigItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "gigs"), (snap) => {
      const list: GigItem[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as GigItem);
      });
      // Sort by date ascending (soonest first)
      list.sort((a, b) => (a.date || "").localeCompare(b.date || ""));
      setGigs(list);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  if (loading) return <div className="p-8 text-slate-400">Loading gig schedule...</div>;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="border-b border-slate-800 pb-5">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Calendar className="text-yellow-400 w-6 h-6" /> Band Performance Schedule
        </h1>
        <p className="text-slate-400 text-sm">
          Select an upcoming performance to view call sheets, parking logistics, and submit your RSVP.
        </p>
      </div>

      <div className="space-y-3">
        {gigs.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-500 text-sm">
            No gigs scheduled currently.
          </div>
        ) : (
          gigs.map((g) => {
            const title = g.internalLogistics?.title || g.publicDetails?.title || "Untitled Performance";
            const venue = g.publicDetails?.venue || g.internalLogistics?.unloadingAddress || "Pittsburgh, PA";
            const callTime = g.internalLogistics?.callTime || "TBD";

            return (
              <div
                key={g.id}
                className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-lg">{title}</span>
                    <span className="text-[10px] font-mono uppercase bg-slate-950 px-2 py-0.5 rounded border border-slate-800 text-yellow-400">
                      {g.status}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
                    <span className="flex items-center gap-1 font-mono text-slate-300">
                      <Calendar className="w-3.5 h-3.5 text-yellow-400" />
                      {g.date}
                    </span>
                    <span className="flex items-center gap-1 font-mono text-slate-300">
                      <Clock className="w-3.5 h-3.5 text-yellow-400" />
                      Call: {callTime}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-500" />
                      {venue}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  {g.rsvpSummary && (
                    <div className="hidden sm:flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded border border-emerald-500/20 font-mono">
                      <Users className="w-3.5 h-3.5" />
                      <span>{g.rsvpSummary.attendingCount || 0} In</span>
                    </div>
                  )}

                  <Link
                    href={`/portal/gigs/${g.id}`}
                    className="bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold px-3.5 py-2 rounded-lg text-xs transition flex items-center gap-1.5"
                  >
                    View Call Sheet <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}