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
  MessageSquare,
  Navigation,
  Plus,
  ExternalLink,
  Heart,
  Landmark,
} from "lucide-react";
import CommentsStream from "@/components/portal/CommentsStream";
import { canManageGigs, canManageSetlists } from "@/lib/auth/permissions";
import { User } from "@/lib/schema/user";
import { SetlistTuneItem } from "@/lib/schema/setlist";
import GigSetlistAssignmentModal from "@/components/portal/GigSetlistAssignmentModal";
import { GigCompensationType } from "@/lib/schema/gig";
import { toast } from "@/lib/context/ToastContext";

interface SetlistItem {
  id: string;
  title: string;
  artist?: string;
  keySignature?: string;
  tempoBpm?: number;
  notes?: string;
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
    showExternalDirections?: boolean;
  };
  internalLogistics?: {
    title: string;
    callTime: string;
    downbeat: string;
    attire?: string;
    unloadingAddress?: string;
    parkingNotes?: string;
    compensation?: number;
    compensationType?: GigCompensationType;
    description?: string;
    setlistId?: string;
    setlistName?: string;
    setlistTitle?: string;
  };
  financials?: {
    totalFee?: number;
    compensationType?: GigCompensationType;
    settlementType?: string;
    bandFundCut?: number;
    fixedPerformerAmount?: number;
    payouts?: Record<string, unknown>;
    notes?: string;
  };
  setlistId?: string;
  setlistName?: string;
  setlistTitle?: string;
  setlist?: (SetGroup | SetlistTuneItem)[];
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
  const [stageSetlistInfo, setStageSetlistInfo] = useState<{
    templateName?: string;
    templateId?: string;
    name?: string;
    title?: string;
  } | null>(null);
  const [rsvps, setRsvps] = useState<MusicianRsvp[]>([]);
  // Only start in loading state if gigId exists to fetch
  const [loading, setLoading] = useState(Boolean(gigId));
  const [error, setError] = useState<string | null>(null);
  const [isUpdatingRsvp, setIsUpdatingRsvp] = useState(false);
  const [isTogglingNav, setIsTogglingNav] = useState(false);
  const [isManagingSetlist, setIsManagingSetlist] = useState(false);

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

    // 4. Real-time listener for stage view setlist document
    const unsubStageSetlist = onSnapshot(
      doc(db, "setlists", gigId),
      (snap) => {
        if (isMounted) {
          if (snap.exists()) {
            setStageSetlistInfo(
              snap.data() as {
                templateName?: string;
                templateId?: string;
                name?: string;
                title?: string;
              }
            );
          } else {
            setStageSetlistInfo(null);
          }
        }
      },
      (err) => {
        console.warn("Notice: stage setlist listener note:", err);
      }
    );

    return () => {
      isMounted = false;
      unsubGig();
      unsubRsvps();
      unsubStageSetlist();
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
      toast.success(`RSVP updated: ${status}.`);
    } catch (err) {
      toast.error(
        "Failed to update RSVP: " +
          (err instanceof Error ? err.message : String(err)),
      );
    } finally {
      setIsUpdatingRsvp(false);
    }
  };

  const handleToggleNavigation = async () => {
    if (!gig) return;
    setIsTogglingNav(true);
    try {
      const current = gig.publicDetails?.showExternalDirections !== false;
      await setDoc(
        doc(db, "gigs", gig.id),
        {
          publicDetails: {
            showExternalDirections: !current,
          },
        },
        { merge: true }
      );
      toast.success("Navigation setting updated.");
    } catch (err) {
      toast.error(
        "Failed to update navigation setting: " +
          (err instanceof Error ? err.message : String(err)),
      );
    } finally {
      setIsTogglingNav(false);
    }
  };

  const attendingCount = rsvps.filter((r) => r.status === "attending").length;
  const tentativeCount = rsvps.filter((r) => r.status === "tentative").length;
  const declinedCount = rsvps.filter((r) => r.status === "declined").length;

  const canManage = profile
    ? canManageGigs(profile as User) || canManageSetlists(profile as User)
    : false;

  const hasSetlist = Array.isArray(gig.setlist) && gig.setlist.length > 0;
  const isFlatSetlist =
    hasSetlist && "title" in (gig.setlist![0] as Record<string, unknown>);

  const effectiveSetlistName =
    gig.setlistName ||
    gig.setlistTitle ||
    gig.internalLogistics?.setlistName ||
    gig.internalLogistics?.setlistTitle ||
    stageSetlistInfo?.templateName ||
    stageSetlistInfo?.name ||
    stageSetlistInfo?.title ||
    (!isFlatSetlist &&
    gig.setlist &&
    gig.setlist.length > 0 &&
    typeof gig.setlist[0] === "object" &&
    gig.setlist[0] !== null &&
    "setName" in gig.setlist[0]
      ? (gig.setlist[0] as SetGroup).setName
      : "");

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

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 shadow-md flex flex-col justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2 mb-3">
              <MapPin className="w-4 h-4 text-yellow-400" /> Location & Load-In
            </div>
            <div className="space-y-1.5 text-xs text-slate-300">
              <div>
                <strong className="text-white">Venue:</strong>{" "}
                {gig.publicDetails?.venue || "TBD"}
              </div>
              <div>
                <strong className="text-white">Address:</strong>{" "}
                {gig.publicDetails?.venueAddress || "TBD"}
              </div>
              <div>
                <strong className="text-white">Unloading:</strong>{" "}
                {gig.internalLogistics?.unloadingAddress || "Front Entrance"}
              </div>
            </div>
          </div>

          {canManageGigs(profile as unknown as User) && (
            <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Navigation className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
                Public 1-Click Navigation:
              </span>
              <button
                type="button"
                disabled={isTogglingNav}
                onClick={handleToggleNavigation}
                title={
                  gig.publicDetails?.showExternalDirections !== false
                    ? "External directions buttons visible on public event map. Click to toggle OFF."
                    : "External directions buttons hidden on public event map. Click to toggle ON."
                }
                className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold border transition flex items-center gap-1.5 ${
                  gig.publicDetails?.showExternalDirections !== false
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20"
                    : "bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700"
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${gig.publicDetails?.showExternalDirections !== false ? "bg-emerald-400" : "bg-slate-500"}`}></span>
                {gig.publicDetails?.showExternalDirections !== false ? "ENABLED" : "DISABLED"}
              </button>
            </div>
          )}
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3.5 shadow-md">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-yellow-400" /> Attire & Compensation
            </span>
            {(() => {
              const compType =
                gig.internalLogistics?.compensationType ||
                gig.financials?.compensationType ||
                ((Number(gig.internalLogistics?.compensation) || 0) > 0 ? "individual" : "community");
              if (compType === "community") {
                return (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-sky-500/10 text-sky-400 border border-sky-500/20">
                    <Heart className="w-3 h-3" /> Community
                  </span>
                );
              }
              if (compType === "band_fund") {
                return (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    <Landmark className="w-3 h-3" /> Band Fund
                  </span>
                );
              }
              return (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <DollarSign className="w-3 h-3" /> Individual Payout
                </span>
              );
            })()}
          </div>

          <div className="space-y-2 text-xs text-slate-300">
            <div>
              <strong className="text-white">Attire:</strong>{" "}
              {gig.internalLogistics?.attire || "Yellows & Black"}
            </div>

            {(() => {
              const compType =
                gig.internalLogistics?.compensationType ||
                gig.financials?.compensationType ||
                ((Number(gig.internalLogistics?.compensation) || 0) > 0 ? "individual" : "community");

              if (compType === "community") {
                return (
                  <div className="p-2.5 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-start gap-2">
                    <Heart className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-sky-300 block">Civic / Community Performance</span>
                      <span className="text-[11px] text-sky-400/90 block">
                        $0 client intake. Band members volunteer their sound and energy for community festivals and causes ($0 musician payout).
                      </span>
                    </div>
                  </div>
                );
              }

              if (compType === "band_fund") {
                const fee = gig.financials?.totalFee || gig.financials?.bandFundCut || 0;
                return (
                  <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-2">
                    <Landmark className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-amber-300 block">100% to Band Fund</span>
                      <span className="text-[11px] text-amber-400/90 block">
                        {fee > 0 ? `$${fee} performance fee` : "All performance fee proceeds"} go directly to the band treasury to finance instrument repairs, sheet music, sound equipment, and tour travel ($0 individual payout).
                      </span>
                    </div>
                  </div>
                );
              }

              const payout = gig.internalLogistics?.compensation || gig.financials?.fixedPerformerAmount || 0;
              const totalFee = gig.financials?.totalFee || 0;
              return (
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-2">
                  <DollarSign className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-emerald-300 block">Individual Musician Payout</span>
                    <span className="text-[11px] text-emerald-400/90 block">
                      ${payout} estimated payout per participating musician{totalFee > 0 ? ` (out of $${totalFee} total event fee)` : ""}.
                    </span>
                  </div>
                </div>
              );
            })()}

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

      {/* Setlist Section */}
      {hasSetlist ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-md">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
            <div className="flex items-center gap-2 flex-wrap">
              <ListMusic className="w-4 h-4 text-yellow-400 shrink-0" />
              <h2 className="text-sm font-bold text-white">Repertoire Setlist</h2>
              {effectiveSetlistName && (
                <span className="text-xs font-bold text-yellow-300 bg-yellow-400/10 border border-yellow-400/30 px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 shrink-0" />
                  {effectiveSetlistName}
                </span>
              )}
              <span className="text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700 px-2 py-0.5 rounded-full font-bold">
                {isFlatSetlist
                  ? `${gig.setlist!.length} Tunes`
                  : `${gig.setlist!.length} Sets`}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={`/portal/perform/${gig.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
              >
                <ExternalLink className="w-3.5 h-3.5 text-yellow-400" /> Stage View
              </a>
              {canManage && (
                <button
                  type="button"
                  onClick={() => setIsManagingSetlist(true)}
                  className="bg-yellow-400 hover:bg-yellow-300 text-slate-950 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-sm"
                >
                  <ListMusic className="w-3.5 h-3.5" /> Manage Setlist
                </button>
              )}
            </div>
          </div>

          {isFlatSetlist ? (
            <div className="space-y-1.5">
              {(gig.setlist as SetlistTuneItem[]).map((song, i) => (
                <div
                  key={song.id || song.tuneId || i}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-yellow-400 font-mono text-[11px] font-bold w-6">
                      #{i + 1}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white">{song.title}</span>
                        {song.artist && (
                          <span className="text-slate-500 text-[11px]">
                            ({song.artist})
                          </span>
                        )}
                        {song.transitionType === "direct_segue" && (
                          <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider bg-emerald-950/40 border border-emerald-800/40 px-1.5 py-0.5 rounded">
                            &gt; SEGUE
                          </span>
                        )}
                      </div>
                      {song.notes && (
                        <p className="text-[11px] text-yellow-300/80 italic mt-0.5">
                          Cue: {song.notes}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {song.tempoBpm && (
                      <span className="text-[10px] font-mono text-slate-400 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded">
                        {song.tempoBpm} BPM
                      </span>
                    )}
                    {song.keySignature && (
                      <span className="text-[10px] font-mono font-bold text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 px-2 py-0.5 rounded">
                        {song.keySignature}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {(gig.setlist as SetGroup[]).map((group, gIdx) => (
                <div key={group.id || gIdx} className="space-y-2">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                    <span>{group.setName || `Set ${gIdx + 1}`}</span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      ({group.items?.length || 0} tunes)
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {(group.items || []).map((song: SetlistItem, i: number) => (
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
                        <div className="flex items-center gap-2">
                          {song.tempoBpm && (
                            <span className="text-[10px] font-mono text-slate-400 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded">
                              {song.tempoBpm} BPM
                            </span>
                          )}
                          {song.keySignature && (
                            <span className="text-[10px] font-mono bg-slate-900 border border-slate-800 px-2 py-0.5 rounded text-slate-400">
                              {song.keySignature}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : canManage ? (
        <div className="bg-slate-900 border border-dashed border-slate-800 hover:border-slate-700 transition rounded-2xl p-6 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-yellow-400/10 text-yellow-400">
              <ListMusic className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Repertoire Setlist</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                No setlist has been assigned to this gig yet. Choose an existing reusable setlist or craft a custom order.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsManagingSetlist(true)}
            className="bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition shrink-0 shadow-md shadow-yellow-400/10"
          >
            <Plus className="w-4 h-4" /> Assign or Create Setlist
          </button>
        </div>
      ) : null}

      {/* Gig Discussion Stream */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-md">
        <div>
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-yellow-400" /> Musician Discussion & Gig Notes
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Coordinate carpools, confirm gear/attire, ask questions, or leave notes for bandmates regarding this performance.
          </p>
        </div>
        <CommentsStream
          targetType="gig"
          targetId={gigId}
          targetTitle={gig.internalLogistics?.title || gig.publicDetails?.title || "Gig Discussion"}
        />
      </div>

      {/* Setlist Assignment & Creator Modal */}
      {isManagingSetlist && gig && (
        <GigSetlistAssignmentModal
          gig={gig}
          isOpen={isManagingSetlist}
          onClose={() => setIsManagingSetlist(false)}
          onSaved={() => setIsManagingSetlist(false)}
        />
      )}
    </div>
  );
}
