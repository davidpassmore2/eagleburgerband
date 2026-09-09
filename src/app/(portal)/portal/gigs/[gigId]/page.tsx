"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  doc,
  onSnapshot,
  setDoc,
  collection,
  getDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/lib/context/AuthContext";
import {
  Clock,
  MapPin,
  Users,
  ListMusic,
  DollarSign,
  ArrowLeft,
  Check,
  X,
  HelpCircle,
  Loader2,
  AlertCircle,
} from "lucide-react";

interface SetlistItem {
  id: string;
  title: string;
  artist?: string;
  keySignature?: string;
}

interface SetGroup {
  id: string;
  setName: string;
  items: SetlistItem[];
}

interface GigDetail {
  id: string;
  date: string;
  status: string;
  publicDetails?: {
    title: string;
    venue: string;
    venueAddress?: string;
    description?: string;
  };
  internalLogistics?: {
    title: string;
    callTime: string;
    downbeat: string;
    attire?: string;
    unloadingAddress?: string;
    parkingNotes?: string;
    compensation?: number;
    description?: string;
  };
  setlist?: SetGroup[];
}

interface MusicianRsvp {
  uid: string;
  displayName: string;
  sectionId?: string;
  status: "attending" | "declined" | "tentative";
  notes?: string;
}

export default function MusicianGigDetailPage() {
  const router = useRouter();
  const rawParams = useParams();

  const gigId = Array.isArray(rawParams?.gigId)
    ? rawParams.gigId[0]
    : (rawParams?.gigId as string) || "";

  const { firebaseUser, profile } = useAuth();
  const [gig, setGig] = useState<GigDetail | null>(null);
  const [rsvps, setRsvps] = useState<MusicianRsvp[]>([]);
  // Only start in loading state if gigId exists to fetch
  const [loading, setLoading] = useState(Boolean(gigId));
  const [error, setError] = useState<string | null>(null);
  const [isUpdatingRsvp, setIsUpdatingRsvp] = useState(false);

  useEffect(() => {
    if (!gigId) return;

    let isMounted = true;

    // 1. Initial direct fetch guarantees loading flag clears immediately
    const fetchDirect = async () => {
      try {
        const gigRef = doc(db, "gigs", gigId);
        const gigSnap = await getDoc(gigRef);

        if (isMounted) {
          if (gigSnap.exists()) {
            setGig({ id: gigSnap.id, ...gigSnap.data() } as GigDetail);
          } else {
            setGig(null);
          }
          setLoading(false);
        }
      } catch (err) {
        console.error("Direct gig fetch error:", err);
        if (isMounted) {
          setError(err instanceof Error ? err.message : String(err));
          setLoading(false);
        }
      }
    };

    fetchDirect();

    // 2. Real-time listener for gig updates
    const unsubGig = onSnapshot(
      doc(db, "gigs", gigId),
      (snap) => {
        if (isMounted) {
          if (snap.exists()) {
            setGig({ id: snap.id, ...snap.data() } as GigDetail);
          } else {
            setGig(null);
          }
          setLoading(false);
        }
      },
      (err) => {
        console.error("Snapshot error on gig:", err);
        if (isMounted) {
          setLoading(false);
        }
      },
    );

    // 3. Real-time listener for RSVP subcollection
    const unsubRsvps = onSnapshot(
      collection(db, "gigs", gigId, "rsvps"),
      (snap) => {
        if (isMounted) {
          const list: MusicianRsvp[] = [];
          snap.forEach((d) => list.push(d.data() as MusicianRsvp));
          setRsvps(list);
        }
      },
      (err) => {
        console.warn("Snapshot error on RSVPs subcollection:", err);
      },
    );

    return () => {
      isMounted = false;
      unsubGig();
      unsubRsvps();
    };
  }, [gigId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-400 gap-2 text-xs">
        <Loader2 className="w-4 h-4 animate-spin text-yellow-400" />
        Loading call sheet...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 max-w-xl mx-auto text-center space-y-4">
        <div className="inline-flex p-3 rounded-full bg-rose-500/10 text-rose-400 mb-2">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-white font-bold text-sm">
          Failed to load performance call sheet
        </h2>
        <p className="text-xs text-slate-400">{error}</p>
        <button
          type="button"
          onClick={() => router.push("/portal")}
          className="bg-slate-800 hover:bg-slate-700 text-white font-semibold px-4 py-2 rounded-xl text-xs inline-flex items-center gap-1.5 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Return to Portal
        </button>
      </div>
    );
  }

  if (!gig) {
    return (
      <div className="p-8 max-w-xl mx-auto text-center space-y-4">
        <div className="text-slate-400 text-xs">
          Gig with ID{" "}
          <span className="font-mono text-yellow-400">&quot;{gigId}&quot;</span>{" "}
          not found in database.
        </div>
        <button
          type="button"
          onClick={() => router.push("/portal")}
          className="bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs inline-flex items-center gap-1.5 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Return to Home Base
        </button>
      </div>
    );
  }

  const myRsvp = rsvps.find((r) => r.uid === firebaseUser?.uid);

  const handleRsvpChange = async (
    status: "attending" | "declined" | "tentative",
  ) => {
    if (!firebaseUser || !gigId) return;
    setIsUpdatingRsvp(true);

    try {
      const rsvpRef = doc(db, "gigs", gigId, "rsvps", firebaseUser.uid);
      await setDoc(
        rsvpRef,
        {
          uid: firebaseUser.uid,
          displayName:
            profile?.displayName || firebaseUser.displayName || "Musician",
          email: firebaseUser.email,
          sectionId: profile?.sectionId || "unassigned",
          status,
          updatedAt: new Date().toISOString(),
        },
        { merge: true },
      );
    } catch (err) {
      alert(
        "Failed to update RSVP: " +
          (err instanceof Error ? err.message : String(err)),
      );
    } finally {
      setIsUpdatingRsvp(false);
    }
  };

  const attendingCount = rsvps.filter((r) => r.status === "attending").length;
  const tentativeCount = rsvps.filter((r) => r.status === "tentative").length;
  const declinedCount = rsvps.filter((r) => r.status === "declined").length;

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      {/* Return Navigation */}
      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => router.push("/portal")}
          className="text-slate-400 hover:text-white text-xs flex items-center gap-1.5 transition"
        >
          <ArrowLeft className="w-4 h-4" /> Return to Home Base
        </button>
        <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded border border-yellow-400/30 bg-yellow-400/10 text-yellow-300">
          Status: {gig.status}
        </span>
      </div>

      {/* Headline & RSVP Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-2xl">
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-black text-white">
            {gig.internalLogistics?.title || gig.publicDetails?.title}
          </h1>
          <p className="text-xs text-slate-400 max-w-xl">
            {gig.internalLogistics?.description ||
              gig.publicDetails?.description}
          </p>
        </div>

        <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl w-full md:w-auto shrink-0 space-y-2">
          <div className="text-[11px] font-semibold text-slate-400 flex items-center justify-between">
            <span>Your Performance RSVP</span>
            {isUpdatingRsvp && (
              <Loader2 className="w-3 h-3 animate-spin text-yellow-400" />
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={isUpdatingRsvp}
              onClick={() => handleRsvpChange("attending")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition ${
                myRsvp?.status === "attending"
                  ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20"
                  : "bg-slate-900 text-slate-300 hover:bg-slate-800"
              }`}
            >
              <Check className="w-3.5 h-3.5" /> In
            </button>
            <button
              type="button"
              disabled={isUpdatingRsvp}
              onClick={() => handleRsvpChange("tentative")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition ${
                myRsvp?.status === "tentative"
                  ? "bg-yellow-400 text-slate-950 shadow-md shadow-yellow-400/20"
                  : "bg-slate-900 text-slate-300 hover:bg-slate-800"
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5" /> Tentative
            </button>
            <button
              type="button"
              disabled={isUpdatingRsvp}
              onClick={() => handleRsvpChange("declined")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition ${
                myRsvp?.status === "declined"
                  ? "bg-rose-500 text-white shadow-md shadow-rose-500/20"
                  : "bg-slate-900 text-slate-300 hover:bg-slate-800"
              }`}
            >
              <X className="w-3.5 h-3.5" /> Out
            </button>
          </div>
        </div>
      </div>

      {/* Logistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 shadow-md">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <Clock className="w-4 h-4 text-yellow-400" /> Timeline & Schedule
          </div>
          <div className="space-y-1.5 text-xs text-slate-300">
            <div>
              <strong className="text-white">Date:</strong> {gig.date}
            </div>
            <div>
              <strong className="text-white">Call Time:</strong>{" "}
              {gig.internalLogistics?.callTime || "TBD"}
            </div>
            <div>
              <strong className="text-white">Downbeat:</strong>{" "}
              {gig.internalLogistics?.downbeat || "TBD"}
            </div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 shadow-md">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-yellow-400" /> Location & Load-In
          </div>
          <div className="space-y-1.5 text-xs text-slate-300">
            <div>
              <strong className="text-white">Venue:</strong>{" "}
              {gig.publicDetails?.venue}
            </div>
            <div>
              <strong className="text-white">Address:</strong>{" "}
              {gig.publicDetails?.venueAddress}
            </div>
            <div>
              <strong className="text-white">Unloading:</strong>{" "}
              {gig.internalLogistics?.unloadingAddress || "Front Entrance"}
            </div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 shadow-md">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-yellow-400" /> Attire & Payout
          </div>
          <div className="space-y-1.5 text-xs text-slate-300">
            <div>
              <strong className="text-white">Attire:</strong>{" "}
              {gig.internalLogistics?.attire || "Yellows & Black"}
            </div>
            <div>
              <strong className="text-white">Est. Payout:</strong>{" "}
              {gig.internalLogistics?.compensation
                ? `$${gig.internalLogistics.compensation}`
                : "Volunteer / Band Fund"}
            </div>
            <div>
              <strong className="text-white">Parking:</strong>{" "}
              {gig.internalLogistics?.parkingNotes || "Street parking"}
            </div>
          </div>
        </div>
      </div>

      {/* Quorum Breakdown */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-md">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Users className="w-4 h-4 text-yellow-400" /> Section Quorum & RSVPs
          </h2>
          <div className="flex items-center gap-3 text-xs font-mono">
            <span className="text-emerald-400 font-bold">
              {attendingCount} In
            </span>
            <span className="text-yellow-400 font-bold">
              {tentativeCount} Tentative
            </span>
            <span className="text-rose-400 font-bold">{declinedCount} Out</span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
          {rsvps.map((rsvp) => (
            <div
              key={rsvp.uid}
              className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs flex items-center justify-between"
            >
              <div className="truncate pr-2">
                <div className="font-bold text-white truncate">
                  {rsvp.displayName}
                </div>
                <div className="text-[10px] text-slate-500 capitalize">
                  {rsvp.sectionId}
                </div>
              </div>
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${
                  rsvp.status === "attending"
                    ? "bg-emerald-400"
                    : rsvp.status === "tentative"
                      ? "bg-yellow-400"
                      : "bg-rose-500"
                }`}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Setlist */}
      {gig.setlist && gig.setlist.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-md">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <ListMusic className="w-4 h-4 text-yellow-400" /> Repertoire Setlist
          </h2>
          <div className="space-y-4">
            {gig.setlist.map((group) => (
              <div key={group.id} className="space-y-2">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  {group.setName}
                </div>
                <div className="space-y-1.5">
                  {group.items.map((song, i) => (
                    <div
                      key={song.id || i}
                      className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-yellow-400 font-mono text-[11px]">
                          #{i + 1}
                        </span>
                        <span className="font-bold text-white">
                          {song.title}
                        </span>
                        {song.artist && (
                          <span className="text-slate-500 text-[11px]">
                            ({song.artist})
                          </span>
                        )}
                      </div>
                      {song.keySignature && (
                        <span className="text-[10px] font-mono bg-slate-900 border border-slate-800 px-2 py-0.5 rounded text-slate-400">
                          {song.keySignature}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
