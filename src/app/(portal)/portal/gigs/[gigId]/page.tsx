"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { 
  doc, 
  onSnapshot, 
  updateDoc, 
  collection, 
  getDocs,
  setDoc
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/lib/context/AuthContext";
import { canManageGigs } from "@/lib/auth/permissions";
import SetlistBuilderModal, { PerformanceSet } from "@/components/portal/SetlistBuilderModal";
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Shirt, 
  DollarSign, 
  CheckCircle2, 
  XCircle, 
  HelpCircle, 
  Users, 
  Navigation,
  Music2,
  AlertCircle,
  ListMusic,
  FileText,
  Edit3
} from "lucide-react";

type AttendanceStatus = "attending" | "declined" | "tentative";

type PerformerRsvp = {
  uid: string;
  displayName?: string;
  email?: string;
  sectionId?: string;
  instruments?: string[];
  status: AttendanceStatus;
  notes?: string;
  updatedAt: string;
};

type UserProfile = {
  uid: string;
  displayName?: string;
  name?: string;
  email?: string;
  sectionId?: string;
  instruments?: string[];
  [key: string]: unknown;
};

type GigDetails = {
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
    attire: string;
    unloadingAddress: string;
    parkingNotes: string;
    compensation?: number;
    description?: string;
  };
  setlist?: PerformanceSet[];
  rsvpSummary?: {
    attendingCount: number;
    declinedCount: number;
  };
  [key: string]: unknown;
};

type SectionInfo = {
  id: string;
  name: string;
  order: number;
};

export default function GigCallSheetPage() {
  const { gigId } = useParams() as { gigId: string };
  const { profile, loading: authLoading } = useAuth();

  const [gig, setGig] = useState<GigDetails | null>(null);
  const [rsvps, setRsvps] = useState<PerformerRsvp[]>([]);
  const [sections, setSections] = useState<SectionInfo[]>([]);
  const [userMap, setUserMap] = useState<Record<string, UserProfile>>({});
  const [optimisticStatus, setOptimisticStatus] = useState<AttendanceStatus | null>(null);
  const [updating, setUpdating] = useState(false);
  const [isSetlistModalOpen, setIsSetlistModalOpen] = useState(false);

  // Subscribe to Gig, RSVPs, Sections, and Users directory
  useEffect(() => {
    if (!gigId) return;

    const unsubGig = onSnapshot(doc(db, "gigs", gigId), (snap) => {
      if (snap.exists()) {
        setGig({ id: snap.id, ...snap.data() } as GigDetails);
      }
    });

    const unsubRsvps = onSnapshot(collection(db, "gigs", gigId, "rsvps"), (snap) => {
      const list: PerformerRsvp[] = [];
      snap.forEach((d) => {
        const raw = d.data();
        list.push({
          uid: raw.uid || d.id,
          displayName: raw.displayName,
          email: raw.email || "",
          sectionId: raw.sectionId || "",
          instruments: Array.isArray(raw.instruments) ? raw.instruments : [],
          status: (raw.status as AttendanceStatus) || "tentative",
          notes: raw.notes || "",
          updatedAt: raw.updatedAt || new Date().toISOString(),
        });
      });
      setRsvps(list);
      setOptimisticStatus(null);
    });

    const unsubUsers = onSnapshot(collection(db, "users"), (snap) => {
      const map: Record<string, UserProfile> = {};
      snap.forEach((d) => {
        const data = d.data();
        map[d.id] = { uid: d.id, ...data };
      });
      setUserMap(map);
    });

    const fetchSections = async () => {
      const snap = await getDocs(collection(db, "sections"));
      const list: SectionInfo[] = [];
      snap.forEach((d) => {
        const data = d.data();
        list.push({ id: d.id, name: data.name || "Section", order: data.order ?? 99 });
      });
      list.sort((a, b) => a.order - b.order);
      setSections(list);
    };

    fetchSections();

    return () => {
      unsubGig();
      unsubRsvps();
      unsubUsers();
    };
  }, [gigId]);

  // Derived user attendance status
  const userStatus: AttendanceStatus | null =
    optimisticStatus ??
    (rsvps.find((r) => r.uid === profile?.uid)?.status as AttendanceStatus | undefined) ??
    null;

  if (authLoading) return <div className="p-8 text-slate-400">Loading call sheet...</div>;
  if (!profile) return <div className="p-8 text-slate-400">Please sign in to access gig logistics.</div>;
  if (!gig) return <div className="p-8 text-slate-400">Gig record not found.</div>;

  const getEffectiveName = (uid: string, fallbackName?: string): string => {
    const fromUsers = userMap[uid]?.displayName || userMap[uid]?.name;
    if (fromUsers && fromUsers !== "Eagleburger Member") return fromUsers;
    if (fallbackName && fallbackName !== "Eagleburger Member") return fallbackName;
    if (profile && profile.uid === uid) {
      const current = (profile as Record<string, unknown>).displayName || (profile as Record<string, unknown>).name;
      if (typeof current === "string" && current.trim()) return current;
    }
    const email = userMap[uid]?.email || (profile?.uid === uid ? profile?.email : undefined);
    if (email) return email.split("@")[0];
    return "Musician";
  };

  const getEffectiveSectionId = (rsvp: PerformerRsvp): string => {
    return userMap[rsvp.uid]?.sectionId || rsvp.sectionId || (profile?.uid === rsvp.uid ? profile?.sectionId : "") || "";
  };

  const getEffectiveInstruments = (rsvp: PerformerRsvp): string[] => {
    const fromUsers = userMap[rsvp.uid]?.instruments;
    if (Array.isArray(fromUsers) && fromUsers.length > 0) return fromUsers;
    if (Array.isArray(rsvp.instruments) && rsvp.instruments.length > 0) return rsvp.instruments;
    return [];
  };

  const handleSetRsvp = async (status: AttendanceStatus) => {
    if (!profile || updating) return;
    setUpdating(true);
    setOptimisticStatus(status);

    try {
      const resolvedName =
        (profile as Record<string, unknown>).displayName ||
        (profile as Record<string, unknown>).name ||
        userMap[profile.uid]?.displayName ||
        userMap[profile.uid]?.name ||
        profile.email?.split("@")[0] ||
        "Musician";

      const rsvpDocRef = doc(db, "gigs", gigId, "rsvps", profile.uid);
      await setDoc(
        rsvpDocRef,
        {
          uid: profile.uid,
          displayName: resolvedName,
          email: profile.email || "",
          sectionId: profile.sectionId || userMap[profile.uid]?.sectionId || "",
          instruments: profile.instruments || userMap[profile.uid]?.instruments || [],
          status,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      const attending =
        rsvps.filter((r) => (r.uid === profile.uid ? status === "attending" : r.status === "attending")).length +
        (rsvps.every((r) => r.uid !== profile.uid) && status === "attending" ? 1 : 0);
      const declined =
        rsvps.filter((r) => (r.uid === profile.uid ? status === "declined" : r.status === "declined")).length +
        (rsvps.every((r) => r.uid !== profile.uid) && status === "declined" ? 1 : 0);

      await updateDoc(doc(db, "gigs", gigId), {
        rsvpSummary: {
          attendingCount: attending,
          declinedCount: declined,
        },
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.error("Failed to update RSVP", err);
      setOptimisticStatus(null);
    } finally {
      setUpdating(false);
    }
  };

  const logistics = gig.internalLogistics || {
    title: gig.publicDetails?.title || "Eagleburger Performance",
    callTime: "TBD",
    downbeat: "TBD",
    attire: "Eagleburger Yellows & Black",
    unloadingAddress: gig.publicDetails?.venueAddress || gig.publicDetails?.venue || "Pittsburgh, PA",
    parkingNotes: "Street parking or check nearby lots.",
    compensation: 0,
    description: "",
  };

  // Merge optimistic local RSVP into the list
  const effectiveRsvps: PerformerRsvp[] = rsvps.map((r) => {
    if (profile && r.uid === profile.uid && optimisticStatus) {
      return { ...r, status: optimisticStatus };
    }
    return r;
  });

  if (profile && optimisticStatus && !effectiveRsvps.some((r) => r.uid === profile.uid)) {
    effectiveRsvps.push({
      uid: profile.uid,
      displayName:
        ((profile as Record<string, unknown>).displayName as string) ||
        ((profile as Record<string, unknown>).name as string) ||
        userMap[profile.uid]?.displayName ||
        userMap[profile.uid]?.name ||
        profile.email?.split("@")[0] ||
        "Musician",
      email: profile.email || "",
      sectionId: profile.sectionId || userMap[profile.uid]?.sectionId || "",
      instruments: profile.instruments || userMap[profile.uid]?.instruments || [],
      status: optimisticStatus,
      updatedAt: new Date().toISOString(),
    });
  }

  const attendingPlayers = effectiveRsvps.filter((r) => r.status === "attending");
  const declinedPlayers = effectiveRsvps.filter((r) => r.status === "declined");
  const tentativePlayers = effectiveRsvps.filter((r) => r.status === "tentative");

  const setlist = gig.setlist || [];
  const mapsQuery = encodeURIComponent(logistics.unloadingAddress);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Call Sheet Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-yellow-400 bg-slate-950 px-2.5 py-0.5 rounded border border-slate-800">
                Official Call Sheet
              </span>
              <span className="text-xs font-mono text-slate-500 uppercase">
                Status: {gig.status}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
              {logistics.title}
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 flex items-center gap-1.5 mt-1">
              <MapPin className="w-4 h-4 text-yellow-400 shrink-0" />
              {gig.publicDetails?.venue || logistics.unloadingAddress}
            </p>
          </div>

          <a
            href={`https://www.google.com/maps/search/?api=1&query=${mapsQuery}`}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-slate-800 hover:bg-slate-700 text-white font-semibold px-3 py-2 rounded-lg text-xs flex items-center gap-1.5 transition border border-slate-700"
          >
            <Navigation className="w-4 h-4 text-yellow-400" />
            Open in Google Maps
          </a>
        </div>

        {/* Performer RSVP Action Banner */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <span className="text-xs font-bold text-white uppercase tracking-wider block">
              Your Performance Commitment
            </span>
            <span className="text-xs text-slate-400">
              {userStatus === "attending" && "You are confirmed for this performance."}
              {userStatus === "declined" && "You marked yourself as unable to play."}
              {userStatus === "tentative" && "You marked yourself as tentative."}
              {!userStatus && "Please record your availability for roster balancing."}
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              disabled={updating}
              onClick={() => handleSetRsvp("attending")}
              className={`flex-1 sm:flex-none px-3.5 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 border ${
                userStatus === "attending"
                  ? "bg-emerald-500 text-slate-950 border-emerald-400"
                  : "bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700"
              }`}
            >
              <CheckCircle2 className="w-4 h-4" /> In
            </button>

            <button
              type="button"
              disabled={updating}
              onClick={() => handleSetRsvp("tentative")}
              className={`flex-1 sm:flex-none px-3.5 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 border ${
                userStatus === "tentative"
                  ? "bg-amber-400 text-slate-950 border-amber-300"
                  : "bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700"
              }`}
            >
              <HelpCircle className="w-4 h-4" /> Maybe
            </button>

            <button
              type="button"
              disabled={updating}
              onClick={() => handleSetRsvp("declined")}
              className={`flex-1 sm:flex-none px-3.5 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 border ${
                userStatus === "declined"
                  ? "bg-rose-500 text-white border-rose-400"
                  : "bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700"
              }`}
            >
              <XCircle className="w-4 h-4" /> Out
            </button>
          </div>
        </div>
      </div>

      {/* Setlist Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <ListMusic className="w-5 h-5 text-yellow-400" />
            <h2 className="text-base font-bold text-white">Live Gig Setlist</h2>
          </div>

          {canManageGigs(profile) && (
            <button
              type="button"
              onClick={() => setIsSetlistModalOpen(true)}
              className="bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 transition"
            >
              <Edit3 className="w-3.5 h-3.5" /> Manage Setlist
            </button>
          )}
        </div>

        {setlist.length === 0 || setlist.every((s) => s.items.length === 0) ? (
          <div className="text-center py-6 text-slate-500 text-xs flex items-center justify-center gap-2">
            <AlertCircle className="w-4 h-4" />
            No setlist published for this performance yet.
          </div>
        ) : (
          <div className="space-y-4">
            {setlist.map((set) => (
              <div key={set.id} className="bg-slate-950 border border-slate-800/80 rounded-xl p-4 space-y-2.5">
                <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                  <span className="text-xs font-bold text-yellow-400 uppercase tracking-wider">
                    {set.setName}
                  </span>
                  <span className="text-[10px] font-mono text-slate-500 font-bold">
                    {set.items.length} tunes
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {set.items.map((item, idx) => (
                    <div
                      key={item.id}
                      className="bg-slate-900 border border-slate-800/80 rounded-lg p-2.5 flex items-start justify-between gap-2"
                    >
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-mono font-bold text-yellow-400">
                            {idx + 1}.
                          </span>
                          <span className="text-xs font-bold text-white truncate">
                            {item.title}
                          </span>
                          {item.keySignature && (
                            <span className="text-[10px] font-mono font-bold text-yellow-400 bg-slate-950 px-1.5 py-0.2 rounded border border-slate-800">
                              {item.keySignature}
                            </span>
                          )}
                        </div>

                        {item.artist && (
                          <span className="text-[10px] text-slate-400 block truncate">
                            {item.artist}
                          </span>
                        )}

                        {item.performanceNote && (
                          <div className="text-[10px] text-amber-300/90 font-mono bg-amber-400/10 px-1.5 py-0.5 rounded mt-1 border border-amber-400/20">
                            {item.performanceNote}
                          </div>
                        )}
                      </div>

                      {item.driveLink && (
                        <a
                          href={item.driveLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-yellow-400 hover:text-yellow-300 p-1 bg-slate-950 border border-slate-800 rounded transition shrink-0"
                          title="Open Chart PDF"
                        >
                          <FileText className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Logistics & Staging Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Timing & Financials */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-2 flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-yellow-400" /> Timing & Pay
          </h2>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Date:</span>
              <span className="text-white font-semibold font-mono flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-500" /> {gig.date}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Musician Call Time:</span>
              <span className="text-yellow-400 font-bold font-mono">{logistics.callTime}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Performance Downbeat:</span>
              <span className="text-white font-bold font-mono">{logistics.downbeat}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-400">Musician Pay:</span>
              <span className="text-emerald-400 font-bold flex items-center gap-0.5">
                <DollarSign className="w-3.5 h-3.5" />
                {logistics.compensation ? `${logistics.compensation}` : "Band Fund"}
              </span>
            </div>
          </div>
        </div>

        {/* Uniform & Parking */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-2 flex items-center gap-1.5">
            <Shirt className="w-4 h-4 text-yellow-400" /> Attire & Load-In
          </h2>
          <div className="space-y-2 text-xs">
            <div>
              <span className="text-slate-400 block text-[11px] uppercase">Uniform / Attire:</span>
              <span className="text-white font-medium mt-0.5 block">{logistics.attire}</span>
            </div>
            <div className="pt-2 border-t border-slate-800/60">
              <span className="text-slate-400 block text-[11px] uppercase">Unloading Location:</span>
              <span className="text-white font-mono mt-0.5 block">{logistics.unloadingAddress}</span>
            </div>
            <div className="pt-2 border-t border-slate-800/60">
              <span className="text-slate-400 block text-[11px] uppercase">Parking Guidance:</span>
              <span className="text-slate-300 mt-0.5 block">{logistics.parkingNotes}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmed Section Roster */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-yellow-400" />
            <h2 className="text-base font-bold text-white">Live Performance Roster</h2>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20 font-bold">
              {attendingPlayers.length} Confirmed
            </span>
            <span className="bg-amber-400/10 text-amber-400 px-2 py-0.5 rounded border border-amber-400/20 font-bold">
              {tentativePlayers.length} Maybe
            </span>
            <span className="bg-slate-800 text-slate-400 px-2 py-0.5 rounded border border-slate-700">
              {declinedPlayers.length} Out
            </span>
          </div>
        </div>

        {attendingPlayers.length === 0 ? (
          <div className="text-center py-6 text-slate-500 text-xs flex items-center justify-center gap-2">
            <AlertCircle className="w-4 h-4" />
            No performers confirmed yet. Be the first to confirm attendance above!
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {/* Defined Sections */}
            {sections.map((sec) => {
              const secPlayers = attendingPlayers.filter((p) => getEffectiveSectionId(p) === sec.id);
              if (secPlayers.length === 0) return null;

              return (
                <div key={sec.id} className="bg-slate-950 border border-slate-800 rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-1.5">
                    <span className="text-xs font-bold text-yellow-400">{sec.name}</span>
                    <span className="text-[10px] font-mono text-slate-500 font-bold">
                      {secPlayers.length}
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {secPlayers.map((player) => {
                      const name = getEffectiveName(player.uid, player.displayName);
                      const insts = getEffectiveInstruments(player);

                      return (
                        <div key={player.uid} className="text-xs text-white flex items-center justify-between">
                          <span className="font-medium truncate">{name}</span>
                          {insts.length > 0 && (
                            <span className="text-[10px] font-mono text-slate-400 flex items-center gap-0.5">
                              <Music2 className="w-2.5 h-2.5 text-slate-500" />
                              {insts[0]}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* Unassigned Performers Fallback */}
            {(() => {
              const knownSectionIds = new Set(sections.map((s) => s.id));
              const unassigned = attendingPlayers.filter(
                (p) => !getEffectiveSectionId(p) || !knownSectionIds.has(getEffectiveSectionId(p))
              );

              if (unassigned.length === 0) return null;

              return (
                <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-1.5">
                    <span className="text-xs font-bold text-slate-300">General / Unassigned</span>
                    <span className="text-[10px] font-mono text-slate-500 font-bold">
                      {unassigned.length}
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {unassigned.map((player) => {
                      const name = getEffectiveName(player.uid, player.displayName);
                      const insts = getEffectiveInstruments(player);

                      return (
                        <div key={player.uid} className="text-xs text-white flex items-center justify-between">
                          <span className="font-medium truncate">{name}</span>
                          {insts.length > 0 && (
                            <span className="text-[10px] font-mono text-slate-400 flex items-center gap-0.5">
                              <Music2 className="w-2.5 h-2.5 text-slate-500" />
                              {insts[0]}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* Setlist Builder Modal */}
      {isSetlistModalOpen && (
        <SetlistBuilderModal
          gigId={gig.id}
          initialSets={gig.setlist}
          isOpen={isSetlistModalOpen}
          onClose={() => setIsSetlistModalOpen(false)}
        />
      )}
    </div>
  );
}