"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { collection, query, where, getDocs, doc, setDoc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/lib/context/AuthContext";
import { WORKSPACE_TOOLS } from "@/lib/portal/workspaceRegistry";
import { hasRole } from "@/lib/auth/permissions";
import { Gig, GigSchema } from "@/lib/schema/gig";
import { Calendar, Clock, MapPin, Shirt, CheckCircle2, HelpCircle, XCircle, ExternalLink } from "lucide-react";

export default function PortalHomePage() {
  const { profile, firebaseUser } = useAuth();
  const [nextGig, setNextGig] = useState<Gig | null>(null);
  const [currentRsvp, setCurrentRsvp] = useState<string | null>(null);
  const [loadingGig, setLoadingGig] = useState(true);

  useEffect(() => {
    async function loadNextGig() {
      try {
        const today = new Date().toISOString().split("T")[0];
        const q = query(
          collection(db, "gigs"),
          where("date", ">=", today)
        );
        const snap = await getDocs(q);
        const gigs: Gig[] = [];
        snap.forEach((d) => {
          const parsed = GigSchema.safeParse(d.data());
          if (parsed.success && parsed.data.status === "confirmed") {
            gigs.push(parsed.data);
          }
        });
        gigs.sort((a, b) => a.date.localeCompare(b.date));

        if (gigs.length > 0) {
          const gig = gigs[0];
          setNextGig(gig);

          if (firebaseUser) {
            const rsvpDoc = await getDoc(doc(db, `gigs/${gig.id}/rsvps`, firebaseUser.uid));
            if (rsvpDoc.exists()) {
              setCurrentRsvp(rsvpDoc.data().status);
            }
          }
        }
      } catch (err) {
        console.error("Error loading next performance:", err);
      } finally {
        setLoadingGig(false);
      }
    }

    loadNextGig();
  }, [firebaseUser]);

  const handleRsvp = async (status: "attending" | "tentative" | "declined") => {
    if (!nextGig || !firebaseUser) return;
    setCurrentRsvp(status);
    await setDoc(doc(db, `gigs/${nextGig.id}/rsvps`, firebaseUser.uid), {
      status,
      uid: firebaseUser.uid,
      displayName: profile?.displayName || firebaseUser.displayName || "Musician",
      sectionId: profile?.sectionId || null,
      updatedAt: new Date().toISOString(),
    });
  };

  const authorizedTools = WORKSPACE_TOOLS.filter((tool) =>
    tool.requiredRoles.some((role) => hasRole(profile, role))
  );

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      {/* Welcome Banner */}
      <div className="border-b border-slate-800 pb-5">
        <h1 className="text-2xl font-black text-white tracking-tight">
          Welcome back, {profile?.displayName?.split(" ")[0] || "Musician"}
        </h1>
        <p className="text-sm text-slate-400">
          Instrument: {profile?.instruments?.join(", ") || "General Ensemble"} • Section: {profile?.sectionId || "Unassigned"}
        </p>
      </div>

      {/* Next Performance Hero Timeline */}
      <div className="bg-slate-900 border border-yellow-500/30 rounded-xl p-6 relative overflow-hidden shadow-lg">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <span className="text-xs font-bold uppercase tracking-wider text-yellow-400 flex items-center gap-1.5">
            <Calendar className="w-4 h-4" /> Next Performance Call
          </span>
          {nextGig && (
            <span className="text-xs bg-yellow-400/10 text-yellow-300 font-mono px-2.5 py-0.5 rounded border border-yellow-400/20">
              {nextGig.date}
            </span>
          )}
        </div>

        {loadingGig ? (
          <div className="py-8 text-sm text-slate-400">Loading performance schedule...</div>
        ) : nextGig ? (
          <div className="pt-4 space-y-6">
            <div>
              <h2 className="text-xl font-black text-white">
                {nextGig.internalLogistics.title || nextGig.publicDetails.title}
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                {nextGig.internalLogistics.description || nextGig.publicDetails.description}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 flex items-start gap-2.5">
                <Clock className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-white">Call Time / Downbeat</div>
                  <div className="text-slate-400">
                    Call: {nextGig.internalLogistics.callTime || "TBA"} • Beat: {nextGig.internalLogistics.downbeat || "TBA"}
                  </div>
                </div>
              </div>

              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-white">Location & Dock</div>
                  <div className="text-slate-400 line-clamp-1">{nextGig.publicDetails.venue}</div>
                  <div className="text-[11px] text-slate-500 line-clamp-1">{nextGig.internalLogistics.unloadingAddress}</div>
                </div>
              </div>

              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 flex items-start gap-2.5">
                <Shirt className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-white">Uniform Attire</div>
                  <div className="text-slate-400">{nextGig.internalLogistics.attire || "Band Standard"}</div>
                </div>
              </div>

              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 flex items-start gap-2.5">
                <ExternalLink className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-white">Performance Setlist</div>
                  <div className="text-slate-400">{nextGig.internalLogistics.setlistId ? "Charts Attached" : "Setlist Pending"}</div>
                </div>
              </div>
            </div>

            {/* Attendance RSVP Bar */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-800">
              <span className="text-xs font-semibold text-slate-300">Your Attendance Response:</span>
              <div className="flex gap-2 w-full sm:w-auto">
                <button
                  onClick={() => handleRsvp("attending")}
                  className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 rounded text-xs font-bold transition ${
                    currentRsvp === "attending"
                      ? "bg-emerald-500 text-slate-950 shadow"
                      : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" /> Attending
                </button>
                <button
                  onClick={() => handleRsvp("tentative")}
                  className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 rounded text-xs font-bold transition ${
                    currentRsvp === "tentative"
                      ? "bg-amber-500 text-slate-950 shadow"
                      : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                  }`}
                >
                  <HelpCircle className="w-4 h-4" /> Tentative
                </button>
                <button
                  onClick={() => handleRsvp("declined")}
                  className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 rounded text-xs font-bold transition ${
                    currentRsvp === "declined"
                      ? "bg-rose-500 text-slate-950 shadow"
                      : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                  }`}
                >
                  <XCircle className="w-4 h-4" /> Decline
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-8 text-center text-sm text-slate-400">
            No confirmed upcoming performances scheduled right now. Check back soon!
          </div>
        )}
      </div>

      {/* Operational Tools Grid */}
      <div className="space-y-4">
        <h3 className="text-base font-bold text-white tracking-wide uppercase text-xs text-slate-400">
          Your Management Workspaces
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {authorizedTools.map((tool) => {
            const Icon = tool.icon;
            return (
              <Link
                key={tool.id}
                href={tool.href}
                className="bg-slate-900 border border-slate-800 hover:border-yellow-400/50 p-5 rounded-xl transition flex flex-col justify-between group shadow-sm hover:shadow-md"
              >
                <div className="space-y-3">
                  <div className="w-9 h-9 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center group-hover:border-yellow-400/40 text-yellow-400 transition">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-sm text-white group-hover:text-yellow-400 transition">
                      {tool.title}
                    </div>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      {tool.description}
                    </p>
                  </div>
                </div>
                <div className="text-[11px] font-semibold text-yellow-400/80 pt-4 flex items-center gap-1 group-hover:translate-x-0.5 transition">
                  Launch Studio &rarr;
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}