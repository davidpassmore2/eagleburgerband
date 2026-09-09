"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { collection, query, orderBy, onSnapshot, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/lib/context/AuthContext";
import { canManageGigs } from "@/lib/auth/permissions";
import CalendarSubscribeModal from "@/components/portal/CalendarSubscribeModal";
import {
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ArrowRight,
  Sparkles,
  Music2,
  Calendar as CalendarIcon,
  Inbox
} from "lucide-react";

type AttendanceStatus = "attending" | "declined" | "tentative";

type Gig = {
  id: string;
  date: string;
  status: string;
  publicDetails?: {
    title: string;
    venue: string;
    venueAddress?: string;
  };
  internalLogistics?: {
    title: string;
    callTime: string;
    downbeat: string;
    attire: string;
    unloadingAddress: string;
    compensation?: number;
  };
  rsvpSummary?: {
    attendingCount: number;
    declinedCount: number;
  };
};

export default function MusicianPortalOverviewPage() {
  const { profile, loading: authLoading } = useAuth();
  const [gigs, setGigs] = useState<Gig[]>([]);
  const [userRsvps, setUserRsvps] = useState<Record<string, AttendanceStatus>>({});
  const [loadingGigs, setLoadingGigs] = useState(true);
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);

  useEffect(() => {
    const q = query(collection(db, "gigs"), orderBy("date", "asc"));
    const unsubGigs = onSnapshot(q, (snapshot) => {
      const gigList: Gig[] = [];
      snapshot.forEach((doc) => {
        gigList.push({ id: doc.id, ...doc.data() } as Gig);
      });
      setGigs(gigList);
      setLoadingGigs(false);
    });

    return () => unsubGigs();
  }, []);

  useEffect(() => {
    if (!profile) return;

    const fetchUserRsvps = async () => {
      const map: Record<string, AttendanceStatus> = {};
      for (const gig of gigs) {
        try {
          const rsvpDocSnap = await getDocs(collection(db, "gigs", gig.id, "rsvps"));
          rsvpDocSnap.forEach((docSnap) => {
            if (docSnap.id === profile.uid) {
              map[gig.id] = (docSnap.data().status as AttendanceStatus) || "tentative";
            }
          });
        } catch (err) {
          console.error("Error fetching user rsvp for gig", gig.id, err);
        }
      }
      setUserRsvps(map);
    };

    if (gigs.length > 0) {
      fetchUserRsvps();
    }
  }, [gigs, profile]);

  if (authLoading || loadingGigs) {
    return <div className="p-8 text-slate-400">Loading your performance schedule...</div>;
  }

  const upcomingGigs = gigs.filter((g) => g.status !== "cancelled" && g.status !== "completed");
  const confirmedCount = Object.values(userRsvps).filter((s) => s === "attending").length;

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      {/* Welcome & Quick Action Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-yellow-400 bg-slate-950 px-2.5 py-0.5 rounded border border-slate-800">
              Musician Portal
            </span>
            <span className="text-xs font-mono text-emerald-400 flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Live Dispatch Active
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
            Welcome back, {profile?.displayName || "Musician"}
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            You are confirmed for <strong className="text-emerald-400">{confirmedCount}</strong> upcoming{" "}
            {confirmedCount === 1 ? "performance" : "performances"}.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {canManageGigs(profile) && (
            <Link
              href="/portal/inquiries"
              className="bg-slate-950 hover:bg-slate-800 text-yellow-400 border border-slate-800 hover:border-slate-700 px-3.5 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition flex-1 md:flex-initial"
            >
              <Inbox className="w-3.5 h-3.5" /> Inquiries
            </Link>
          )}

          <button
            type="button"
            onClick={() => setIsCalendarModalOpen(true)}
            className="bg-slate-950 hover:bg-slate-800 text-yellow-400 border border-slate-800 hover:border-slate-700 px-3.5 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition flex-1 md:flex-initial"
          >
            <CalendarIcon className="w-3.5 h-3.5" /> Sync Calendar
          </button>

          <Link
            href="/portal/library"
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition border border-slate-700 flex-1 md:flex-initial"
          >
            <Music2 className="w-3.5 h-3.5 text-yellow-400" /> Chart Catalog
          </Link>
        </div>
      </div>

      {/* Upcoming Performance Schedule List */}
      <div className="space-y-4">
        <div className="flex justify-between items-center px-1">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Calendar className="w-4 h-4 text-yellow-400" /> Upcoming Gigs & Call Sheets
          </h2>
          <span className="text-xs font-mono text-slate-500">
            {upcomingGigs.length} scheduled
          </span>
        </div>

        {upcomingGigs.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-500 text-xs">
            No upcoming gigs scheduled at this time. Check back soon!
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {upcomingGigs.map((gig) => {
              const status = userRsvps[gig.id];
              const title = gig.internalLogistics?.title || gig.publicDetails?.title || "Eagleburger Gig";
              const venue = gig.publicDetails?.venue || gig.internalLogistics?.unloadingAddress || "TBD";
              const callTime = gig.internalLogistics?.callTime || "TBD";
              const downbeat = gig.internalLogistics?.downbeat || "TBD";

              return (
                <Link
                  key={gig.id}
                  href={`/portal/gigs/${gig.id}`}
                  className="bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 rounded-xl p-4 sm:p-5 transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 group"
                >
                  <div className="space-y-2 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-mono font-bold text-yellow-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                        {gig.date}
                      </span>
                      <span className="text-xs font-bold text-white group-hover:text-yellow-400 transition truncate">
                        {title}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        Call: <strong className="text-slate-200">{callTime}</strong> | Downbeat:{" "}
                        <strong className="text-slate-200">{downbeat}</strong>
                      </span>
                      <span className="flex items-center gap-1 truncate">
                        <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span className="truncate">{venue}</span>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800/80">
                    <div>
                      {status === "attending" && (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg">
                          <CheckCircle2 className="w-3.5 h-3.5" /> You&apos;re In
                        </span>
                      )}
                      {status === "declined" && (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2.5 py-1 rounded-lg">
                          <XCircle className="w-3.5 h-3.5" /> Out
                        </span>
                      )}
                      {status === "tentative" && (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-lg">
                          <HelpCircle className="w-3.5 h-3.5" /> Tentative
                        </span>
                      )}
                      {!status && (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-400 bg-slate-950 border border-slate-800 px-2.5 py-1 rounded-lg">
                          RSVP Needed
                        </span>
                      )}
                    </div>

                    <span className="text-slate-500 group-hover:text-white transition flex items-center gap-0.5 text-xs font-semibold">
                      Call Sheet <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Calendar Subscription Modal */}
      <CalendarSubscribeModal
        isOpen={isCalendarModalOpen}
        onClose={() => setIsCalendarModalOpen(false)}
      />
    </div>
  );
}