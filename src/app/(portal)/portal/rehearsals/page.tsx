"use client";

import React, { useState, useEffect, useMemo, useTransition } from "react";
import Link from "next/link";
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
  deleteDoc,
  collectionGroup,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/lib/context/AuthContext";
import {
  RehearsalConfig,
  RehearsalConfigSchema,
  RehearsalLocation,
  RehearsalLocationSchema,
  RehearsalSession,
  RehearsalSessionSchema,
  RehearsalRsvp,
  RehearsalRsvpSchema,
  RehearsalComment,
  RsvpStatus,
} from "@/lib/schema/rehearsal";
import { BlackoutDate, BlackoutDateSchema } from "@/lib/schema/blackout";
import {
  getUpcomingRehearsalDates,
  getRehearsalAttendanceStats,
  getBlackoutsForDate,
} from "@/lib/rehearsal/rehearsalHelpers";
import { toast } from "@/lib/context/ToastContext";
import PortalBreadcrumb from "@/components/portal/PortalBreadcrumb";
import RehearsalMapPicker from "@/components/portal/RehearsalMapPicker";
import RehearsalBlackoutCalendar from "@/components/portal/RehearsalBlackoutCalendar";
import {
  Music2,
  Calendar,
  MapPin,
  Clock,
  Users,
  CheckCircle2,
  XCircle,
  HelpCircle,
  AlertTriangle,
  MessageSquare,
  Send,
  Plus,
  Save,
  Compass,
  Palmtree,
  Settings,
  ChevronRight,
  Loader2,
  Check,
  Building,
  Navigation,
  ExternalLink,
  ShieldAlert,
} from "lucide-react";

const PITTSBURGH_DEFAULT_LOCATIONS: RehearsalLocation[] = [
  {
    id: "loc_allegheny_commons",
    name: "Allegheny Commons East Park",
    address: "Arch St & W Ohio St",
    city: "Pittsburgh, PA",
    lat: 40.4533,
    lng: -80.0076,
    parkingNotes: "Free street parking along East Commons & Arch St.",
    accessNotes: "Open park grounds. In case of rain, shelter under the large trees or gazebo.",
    isDefault: true,
    comments: [
      {
        id: "comm_1",
        authorUid: "band_director",
        authorName: "Band Director",
        text: "Great natural acoustics near the fountain walkway. Bring clip-on stands.",
        createdAt: new Date().toISOString(),
      },
    ],
    createdBy: "admin",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "loc_mattress_factory",
    name: "Mattress Factory Courtyard",
    address: "500 Sampsonia Way",
    city: "Pittsburgh, PA",
    lat: 40.4572,
    lng: -80.0125,
    parkingNotes: "Museum parking lot across Jacksonia St.",
    accessNotes: "Enter courtyard through side iron gate.",
    isDefault: false,
    comments: [],
    createdBy: "admin",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "loc_millvale_riverfront",
    name: "Millvale Riverfront Pavilion",
    address: "River Front Dr, Millvale",
    city: "Pittsburgh, PA",
    lat: 40.4812,
    lng: -79.9751,
    parkingNotes: "Ample paved lot adjacent to trail.",
    accessNotes: "Covered pavilion with electrical outlets.",
    isDefault: false,
    comments: [],
    createdBy: "admin",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export default function RehearsalsPage() {
  const { profile } = useAuth();
  const [, startTransition] = useTransition();

  // Active Tab
  const [activeTab, setActiveTab] = useState<"schedule" | "locations" | "blackouts" | "settings">(
    "schedule"
  );

  // Firestore Realtime State
  const [config, setConfig] = useState<RehearsalConfig>(() => RehearsalConfigSchema.parse({}));
  const [locations, setLocations] = useState<RehearsalLocation[]>([]);
  const [sessions, setSessions] = useState<RehearsalSession[]>([]);
  const [rsvps, setRsvps] = useState<RehearsalRsvp[]>([]);
  const [blackouts, setBlackouts] = useState<BlackoutDate[]>([]);
  const [loading, setLoading] = useState(true);

  // Selected Location for Map Picker
  const [selectedLocationId, setSelectedLocationId] = useState<string>("");

  // Comment state for individual practice
  const [practiceCommentText, setPracticeCommentText] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  // Cancellation Modal State
  const [cancelModalSession, setCancelModalSession] = useState<RehearsalSession | null>(null);
  const [cancelReasonText, setCancelReasonText] = useState("");
  const [isProcessingCancel, setIsProcessingCancel] = useState(false);

  // Schedule Settings Form State
  const [settingsForm, setSettingsForm] = useState<RehearsalConfig>(config);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // 1. Subscribe to Firestore collections
  useEffect(() => {
    // Config listener
    const unsubConfig = onSnapshot(doc(db, "rehearsal_settings", "config"), (snapshot) => {
      if (snapshot.exists()) {
        const parsed = RehearsalConfigSchema.safeParse(snapshot.data());
        if (parsed.success) {
          setConfig(parsed.data);
          setSettingsForm(parsed.data);
        }
      }
    });

    // Locations listener
    const unsubLocations = onSnapshot(collection(db, "rehearsal_locations"), (snapshot) => {
      const list: RehearsalLocation[] = [];
      snapshot.forEach((d) => {
        const parsed = RehearsalLocationSchema.safeParse({ id: d.id, ...d.data() });
        if (parsed.success) list.push(parsed.data);
      });
      if (list.length > 0) {
        list.sort((a, b) => (b.isDefault ? 1 : 0) - (a.isDefault ? 1 : 0));
        setLocations(list);
      } else {
        setLocations(PITTSBURGH_DEFAULT_LOCATIONS);
      }
    });

    // Rehearsal Sessions listener
    const unsubSessions = onSnapshot(collection(db, "rehearsals"), (snapshot) => {
      const list: RehearsalSession[] = [];
      snapshot.forEach((d) => {
        const parsed = RehearsalSessionSchema.safeParse({ id: d.id, ...d.data() });
        if (parsed.success) list.push(parsed.data);
      });
      list.sort((a, b) => a.date.localeCompare(b.date));
      setSessions(list);
    });

    // All-member Blackouts listener
    const unsubBlackouts = onSnapshot(collectionGroup(db, "blackouts"), (snapshot) => {
      const list: BlackoutDate[] = [];
      snapshot.forEach((d) => {
        const parsed = BlackoutDateSchema.safeParse({ id: d.id, ...d.data() });
        if (parsed.success) list.push(parsed.data);
      });
      setBlackouts(list);
      setLoading(false);
    });

    return () => {
      unsubConfig();
      unsubLocations();
      unsubSessions();
      unsubBlackouts();
    };
  }, []);

  // Compute upcoming dates from weekly config
  const upcomingScheduleDates = useMemo(() => {
    return getUpcomingRehearsalDates(config, 8);
  }, [config]);

  // Primary active rehearsal session (next upcoming)
  const activeRehearsal = useMemo<RehearsalSession>(() => {
    const nextDate = upcomingScheduleDates[0]?.dateStr || new Date().toISOString().split("T")[0];
    const existing = sessions.find((s) => s.date === nextDate);
    if (existing) return existing;

    // Default virtual session based on config
    const defaultLoc =
      locations.find((l) => l.id === config.defaultLocationId || l.isDefault) || locations[0];

    return {
      id: `rehearsal_${nextDate}`,
      date: nextDate,
      startTime: config.startTime,
      endTime: config.endTime,
      title: `${config.dayName} Band Rehearsal`,
      locationId: defaultLoc?.id || "",
      locationName: defaultLoc?.name || config.defaultLocationName,
      locationAddress: defaultLoc?.address || config.defaultLocationAddress,
      lat: defaultLoc?.lat || config.defaultLat,
      lng: defaultLoc?.lng || config.defaultLng,
      locationNotes: defaultLoc?.parkingNotes || "",
      isCancelled: false,
      cancellationReason: "",
      cancelledBy: "",
      cancelledAt: "",
      agenda: config.agendaNotes,
      comments: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }, [upcomingScheduleDates, sessions, locations, config]);

  // Listen to RSVPs for the active rehearsal
  useEffect(() => {
    if (!activeRehearsal?.id) return;
    const unsubRsvps = onSnapshot(
      collection(db, "rehearsals", activeRehearsal.id, "rsvps"),
      (snapshot) => {
        const list: RehearsalRsvp[] = [];
        snapshot.forEach((d) => {
          const parsed = RehearsalRsvpSchema.safeParse(d.data());
          if (parsed.success) list.push(parsed.data);
        });
        setRsvps(list);
      }
    );
    return () => unsubRsvps();
  }, [activeRehearsal?.id]);

  // Attendance statistics
  const attendanceStats = useMemo(() => {
    return getRehearsalAttendanceStats(rsvps, 14);
  }, [rsvps]);

  // Blackouts conflicting with the active rehearsal
  const activeDateBlackouts = useMemo(() => {
    if (!activeRehearsal?.date) return [];
    return getBlackoutsForDate(activeRehearsal.date, blackouts);
  }, [activeRehearsal?.date, blackouts]);

  // Current user's RSVP status for active rehearsal
  const myRsvp = useMemo(() => {
    if (!profile?.uid) return null;
    return rsvps.find((r) => r.uid === profile.uid);
  }, [rsvps, profile?.uid]);

  // Handlers
  const handleRsvp = async (status: RsvpStatus, note = "") => {
    if (!profile?.uid) {
      toast.error("Please sign in to RSVP.");
      return;
    }

    try {
      // Ensure rehearsal doc exists
      await setDoc(
        doc(db, "rehearsals", activeRehearsal.id),
        {
          ...activeRehearsal,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      // Save user RSVP
      const rsvpData: RehearsalRsvp = {
        rehearsalId: activeRehearsal.id,
        uid: profile.uid,
        displayName: profile.displayName || profile.realName || "Band Member",
        sectionId: profile.sectionId || "",
        sectionName: profile.sectionId || "General",
        instrument: profile.selectedInstrument || profile.instruments?.[0] || "",
        status,
        notes: note,
        updatedAt: new Date().toISOString(),
      };

      await setDoc(doc(db, "rehearsals", activeRehearsal.id, "rsvps", profile.uid), rsvpData);
      toast.success(`RSVP updated: ${status.toUpperCase()}`);
    } catch (err) {
      toast.error("Failed to update RSVP: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleToggleCancelRehearsal = async (session: RehearsalSession) => {
    if (!session.isCancelled) {
      // Open modal to get cancellation reason
      setCancelModalSession(session);
      setCancelReasonText("");
    } else {
      // Reactivate rehearsal
      try {
        await updateDoc(doc(db, "rehearsals", session.id), {
          isCancelled: false,
          cancellationReason: "",
          cancelledBy: "",
          cancelledAt: "",
          updatedAt: new Date().toISOString(),
        });
        toast.success("Rehearsal reactivated.");
      } catch (err) {
        toast.error("Failed to reactivate: " + (err instanceof Error ? err.message : String(err)));
      }
    }
  };

  const handleConfirmCancel = async () => {
    if (!cancelModalSession) return;
    setIsProcessingCancel(true);
    try {
      await setDoc(
        doc(db, "rehearsals", cancelModalSession.id),
        {
          ...cancelModalSession,
          isCancelled: true,
          cancellationReason: cancelReasonText.trim() || "Cancelled by band leadership",
          cancelledBy: profile?.displayName || "Leadership",
          cancelledAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
      toast.info("Rehearsal marked as cancelled.");
      setCancelModalSession(null);
    } catch (err) {
      toast.error("Failed to cancel: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsProcessingCancel(false);
    }
  };

  const handlePostPracticeComment = async () => {
    if (!practiceCommentText.trim() || !profile) return;
    setIsSubmittingComment(true);
    try {
      const newComment: RehearsalComment = {
        id: Math.random().toString(36).substring(2, 9),
        authorUid: profile.uid,
        authorName: profile.displayName || "Musician",
        text: practiceCommentText.trim(),
        createdAt: new Date().toISOString(),
      };

      const updatedComments = [...(activeRehearsal.comments || []), newComment];

      await setDoc(
        doc(db, "rehearsals", activeRehearsal.id),
        {
          ...activeRehearsal,
          comments: updatedComments,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      setPracticeCommentText("");
      toast.success("Practice comment posted.");
    } catch (err) {
      toast.error("Failed to post comment: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleSaveLocation = async (locData: Partial<RehearsalLocation>) => {
    const locId = locData.id || `loc_${Date.now()}`;
    const newLoc: RehearsalLocation = {
      id: locId,
      name: locData.name || "Rehearsal Ground",
      address: locData.address || "",
      city: locData.city || "Pittsburgh, PA",
      lat: locData.lat || 40.4533,
      lng: locData.lng || -80.0076,
      parkingNotes: locData.parkingNotes || "",
      accessNotes: locData.accessNotes || "",
      isDefault: Boolean(locData.isDefault),
      comments: locData.comments || [],
      createdBy: profile?.uid || "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await setDoc(doc(db, "rehearsal_locations", locId), newLoc);
  };

  const handleAddLocationComment = async (locId: string, commentText: string) => {
    const loc = locations.find((l) => l.id === locId);
    if (!loc || !profile) return;

    const newComment: RehearsalComment = {
      id: Math.random().toString(36).substring(2, 9),
      authorUid: profile.uid,
      authorName: profile.displayName || "Musician",
      text: commentText,
      createdAt: new Date().toISOString(),
    };

    await updateDoc(doc(db, "rehearsal_locations", locId), {
      comments: [...(loc.comments || []), newComment],
      updatedAt: new Date().toISOString(),
    });
  };

  const handleDeleteLocation = async (locId: string) => {
    if (!window.confirm("Are you sure you want to remove this rehearsal location?")) return;
    try {
      await deleteDoc(doc(db, "rehearsal_locations", locId));
      toast.success("Location removed.");
    } catch (err) {
      toast.error("Failed to delete location: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    try {
      const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      const updatedConfig: RehearsalConfig = {
        ...settingsForm,
        dayName: days[settingsForm.dayOfWeek] || "Tuesday",
        updatedAt: new Date().toISOString(),
        updatedBy: profile?.displayName || "Admin",
      };

      await setDoc(doc(db, "rehearsal_settings", "config"), updatedConfig);
      setConfig(updatedConfig);
      toast.success("Weekly rehearsal schedule updated!");
    } catch (err) {
      toast.error("Failed to update schedule: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsSavingSettings(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      <PortalBreadcrumb className="mb-2" />

      {/* Rehearsal Hub Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-yellow-400/10 text-yellow-400 border border-yellow-400/20">
              Musician Portal
            </span>
            <span className="text-xs font-mono text-slate-400 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-yellow-400" /> Weekly {config.dayName}s @{" "}
              {config.startTime}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2 mt-1">
            <Music2 className="text-yellow-400 w-6 h-6" /> Band Rehearsals &amp; Practice Hub
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-0.5">
            Coordinate weekly downbeats, log attendance plans, drop practice location pins, and check member availability.
          </p>
        </div>

        {/* Action button */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Link
            href="/portal/gigs"
            className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 transition flex items-center gap-1.5"
          >
            <Calendar className="w-3.5 h-3.5 text-yellow-400" />
            <span>Gig Calendar</span>
          </Link>
        </div>
      </div>

      {/* Primary Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-800">
        <button
          type="button"
          onClick={() => startTransition(() => setActiveTab("schedule"))}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 shrink-0 ${
            activeTab === "schedule"
              ? "bg-yellow-400 text-slate-950 shadow-md"
              : "text-slate-400 hover:text-white hover:bg-slate-900"
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Practice Schedule &amp; RSVPs</span>
        </button>

        <button
          type="button"
          onClick={() => startTransition(() => setActiveTab("locations"))}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 shrink-0 ${
            activeTab === "locations"
              ? "bg-yellow-400 text-slate-950 shadow-md"
              : "text-slate-400 hover:text-white hover:bg-slate-900"
          }`}
        >
          <MapPin className="w-4 h-4" />
          <span>Locations &amp; Map Pins</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono bg-black/20">
            {locations.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => startTransition(() => setActiveTab("blackouts"))}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 shrink-0 ${
            activeTab === "blackouts"
              ? "bg-yellow-400 text-slate-950 shadow-md"
              : "text-slate-400 hover:text-white hover:bg-slate-900"
          }`}
        >
          <Palmtree className="w-4 h-4" />
          <span>All-Member Blackout Calendar</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono bg-black/20">
            {blackouts.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => startTransition(() => setActiveTab("settings"))}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 shrink-0 ${
            activeTab === "settings"
              ? "bg-yellow-400 text-slate-950 shadow-md"
              : "text-slate-400 hover:text-white hover:bg-slate-900"
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>Weekly Recurring Settings</span>
        </button>
      </div>

      {/* TAB 1: PRACTICE SCHEDULE & ATTENDANCE */}
      {activeTab === "schedule" && (
        <div className="space-y-6">
          {/* Active / Next Upcoming Rehearsal Hero Card */}
          <div
            className={`border rounded-2xl p-5 sm:p-6 space-y-5 transition shadow-xl ${
              activeRehearsal.isCancelled
                ? "bg-red-950/20 border-red-500/30"
                : "bg-slate-900 border-slate-800"
            }`}
          >
            {/* Top row */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-800/80 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-yellow-400/20 text-yellow-300 border border-yellow-400/30">
                    Next Band Downbeat
                  </span>
                  {activeRehearsal.isCancelled ? (
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-red-500 text-white flex items-center gap-1 shadow-xs">
                      <XCircle className="w-3 h-3" /> Rehearsal Cancelled
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> On Schedule
                    </span>
                  )}
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-white mt-1">
                  {new Date(activeRehearsal.date + "T12:00:00").toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </h2>
              </div>

              {/* Cancel Rehearsal Button */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleToggleCancelRehearsal(activeRehearsal)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition border flex items-center gap-1.5 ${
                    activeRehearsal.isCancelled
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20"
                      : "bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500/20"
                  }`}
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>
                    {activeRehearsal.isCancelled ? "Reactivate Practice" : "Cancel Rehearsal"}
                  </span>
                </button>
              </div>
            </div>

            {/* Cancellation Notice Banner if Cancelled */}
            {activeRehearsal.isCancelled && (
              <div className="bg-red-950/60 border border-red-500/40 rounded-xl p-4 text-xs text-red-200 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-bold text-sm text-red-100 block">
                    This practice session has been cancelled.
                  </span>
                  <p>
                    <strong>Reason:</strong>{" "}
                    {activeRehearsal.cancellationReason || "No specific reason provided."}
                  </p>
                  {activeRehearsal.cancelledBy && (
                    <span className="text-[10px] font-mono text-red-300 block">
                      Cancelled by {activeRehearsal.cancelledBy}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Logistics & Location Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5 space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Time &amp; Warm-Up
                </span>
                <div className="text-sm font-bold text-white flex items-center gap-2">
                  <Clock className="w-4 h-4 text-yellow-400" />
                  <span>
                    {activeRehearsal.startTime} – {activeRehearsal.endTime}
                  </span>
                </div>
                {activeRehearsal.agenda && (
                  <p className="text-xs text-slate-300 pt-1 border-t border-slate-800/80">
                    {activeRehearsal.agenda}
                  </p>
                )}
              </div>

              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5 space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Practice Location &amp; Map Pin
                </span>
                <div className="text-sm font-bold text-white flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-yellow-400" />
                  <span>{activeRehearsal.locationName}</span>
                </div>
                {activeRehearsal.locationAddress && (
                  <p className="text-xs text-slate-400">{activeRehearsal.locationAddress}</p>
                )}
                {activeRehearsal.lat && activeRehearsal.lng && (
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${activeRehearsal.lat},${activeRehearsal.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] font-semibold text-yellow-400 hover:underline flex items-center gap-1 pt-1"
                  >
                    <Navigation className="w-3 h-3" />
                    <span>Get Directions</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>

            {/* Member Attendance Action Bar */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div>
                  <span className="text-xs font-bold text-white uppercase tracking-wider block">
                    My Attendance Plan:
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Let section leaders and organizers know if you will be present for roll call.
                  </span>
                </div>

                {myRsvp && (
                  <span
                    className={`text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wider border font-mono ${
                      myRsvp.status === "attending"
                        ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                        : myRsvp.status === "probable"
                        ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40"
                        : myRsvp.status === "declined"
                        ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                        : "bg-amber-500/20 text-amber-300 border-amber-500/40"
                    }`}
                  >
                    Current: {myRsvp.status}
                  </span>
                )}
              </div>

              {/* 4 RSVP Status Buttons */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => handleRsvp("attending")}
                  className={`p-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 border ${
                    myRsvp?.status === "attending"
                      ? "bg-emerald-500 text-slate-950 border-emerald-500 shadow-md"
                      : "bg-slate-900 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/10"
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Attending (In)</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleRsvp("probable")}
                  className={`p-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 border ${
                    myRsvp?.status === "probable"
                      ? "bg-cyan-500 text-slate-950 border-cyan-500 shadow-md"
                      : "bg-slate-900 text-cyan-400 border-cyan-500/20 hover:bg-cyan-500/10"
                  }`}
                >
                  <Clock className="w-4 h-4" />
                  <span>Probable</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleRsvp("tentative")}
                  className={`p-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 border ${
                    myRsvp?.status === "tentative"
                      ? "bg-amber-400 text-slate-950 border-amber-400 shadow-md"
                      : "bg-slate-900 text-amber-400 border-amber-500/20 hover:bg-amber-500/10"
                  }`}
                >
                  <HelpCircle className="w-4 h-4" />
                  <span>Tentative</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleRsvp("declined")}
                  className={`p-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 border ${
                    myRsvp?.status === "declined"
                      ? "bg-rose-500 text-white border-rose-500 shadow-md"
                      : "bg-slate-900 text-rose-400 border-rose-500/20 hover:bg-rose-500/10"
                  }`}
                >
                  <XCircle className="w-4 h-4" />
                  <span>Declined (Out)</span>
                </button>
              </div>
            </div>

            {/* Quorum & Attendance Breakdown */}
            <div className="space-y-3 pt-2 border-t border-slate-800/80">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-yellow-400" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    Projected Quorum &amp; Attendance:
                  </span>
                  <span className="text-xs font-mono font-bold text-amber-400">
                    {attendanceStats.projectedHeadcount} Projected Musician
                    {attendanceStats.projectedHeadcount === 1 ? "" : "s"}
                  </span>
                </div>

                <div className="flex items-center gap-3 text-xs text-slate-400">
                  <span className="text-emerald-400 font-bold">
                    {attendanceStats.attending} In
                  </span>
                  <span className="text-cyan-400 font-bold">
                    {attendanceStats.probable} Probable
                  </span>
                  <span className="text-amber-400 font-bold">
                    {attendanceStats.tentative} Tentative
                  </span>
                  <span className="text-rose-400 font-bold">
                    {attendanceStats.declined} Out
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                <div
                  className={`h-full transition-all duration-300 ${
                    attendanceStats.isQuorumMet ? "bg-emerald-400" : "bg-yellow-400"
                  }`}
                  style={{ width: `${attendanceStats.quorumPercentage}%` }}
                />
              </div>

              {/* Conflict notice if blackouts overlap */}
              {activeDateBlackouts.length > 0 && (
                <div className="text-[11px] text-amber-400 bg-amber-950/20 border border-amber-500/20 rounded-xl p-2.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Palmtree className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      {activeDateBlackouts.length} band member
                      {activeDateBlackouts.length === 1 ? "" : "s"} scheduled out of town on this date:{" "}
                      <strong>
                        {activeDateBlackouts.map((b) => b.userName.split(" ")[0]).join(", ")}
                      </strong>
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveTab("blackouts")}
                    className="underline hover:text-white shrink-0 ml-2 font-semibold"
                  >
                    View Blackout Calendar
                  </button>
                </div>
              )}
            </div>

            {/* Individual Practice Comments Thread */}
            <div className="space-y-3 pt-3 border-t border-slate-800">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-yellow-400" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Practice Discussion &amp; Notes ({(activeRehearsal.comments || []).length})
                </span>
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {(activeRehearsal.comments || []).length === 0 ? (
                  <div className="text-xs text-slate-500 py-2">
                    No comments yet for this practice session. Post music requests, rideshare notes, or questions below.
                  </div>
                ) : (
                  (activeRehearsal.comments || []).map((c) => (
                    <div
                      key={c.id}
                      className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 space-y-1 text-xs"
                    >
                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <strong className="text-white">{c.authorName}</strong>
                        <span>{new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <p className="text-slate-300">{c.text}</p>
                    </div>
                  ))
                )}
              </div>

              {/* Comment Input */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Leave a note on this practice..."
                  value={practiceCommentText}
                  onChange={(e) => setPracticeCommentText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handlePostPracticeComment();
                    }
                  }}
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400"
                />
                <button
                  type="button"
                  disabled={isSubmittingComment || !practiceCommentText.trim()}
                  onClick={handlePostPracticeComment}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-yellow-400 text-slate-950 hover:bg-yellow-300 disabled:opacity-40 transition flex items-center gap-1.5 shrink-0"
                >
                  {isSubmittingComment ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  <span>Post</span>
                </button>
              </div>
            </div>
          </div>

          {/* Upcoming Rehearsals Queue */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-yellow-400" />
                  Upcoming Rehearsal Schedule Queue
                </h3>
                <p className="text-xs text-slate-400">
                  Calculated from your recurring {config.dayName} schedule.
                </p>
              </div>
              <span className="text-xs font-mono text-slate-500">
                {upcomingScheduleDates.length} Upcoming Dates
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {upcomingScheduleDates.map((item, idx) => {
                const sessionRecord = sessions.find((s) => s.date === item.dateStr);
                const isCancelled = sessionRecord?.isCancelled;
                const isFirst = idx === 0;

                return (
                  <div
                    key={item.dateStr}
                    className={`border rounded-xl p-3.5 flex items-center justify-between transition ${
                      isCancelled
                        ? "bg-red-950/20 border-red-500/30 opacity-70"
                        : isFirst
                        ? "bg-slate-950 border-yellow-400/30 shadow-xs"
                        : "bg-slate-950/60 border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">
                          {item.formattedDate}
                        </span>
                        {isCancelled && (
                          <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-red-500 text-white">
                            Cancelled
                          </span>
                        )}
                        {isFirst && !isCancelled && (
                          <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-yellow-400/20 text-yellow-300 font-mono">
                            Next
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-2">
                        <Clock className="w-3 h-3 text-slate-500" />
                        <span>{item.time}</span>
                        <span>&bull;</span>
                        <MapPin className="w-3 h-3 text-slate-500" />
                        <span className="truncate max-w-40">
                          {sessionRecord?.locationName || config.defaultLocationName}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500 font-mono">
                        {item.dateStr}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: LOCATIONS & LEAFLET MAP PINS */}
      {activeTab === "locations" && (
        <RehearsalMapPicker
          locations={locations}
          selectedLocationId={selectedLocationId || locations[0]?.id}
          onSelectLocation={(loc) => setSelectedLocationId(loc.id)}
          onSaveLocation={handleSaveLocation}
          onAddLocationComment={handleAddLocationComment}
          onDeleteLocation={handleDeleteLocation}
        />
      )}

      {/* TAB 3: ALL-MEMBER BLACKOUT CALENDAR */}
      {activeTab === "blackouts" && (
        <RehearsalBlackoutCalendar
          rehearsals={sessions}
          blackouts={blackouts}
        />
      )}

      {/* TAB 4: RECURRING SCHEDULE SETTINGS */}
      {activeTab === "settings" && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 max-w-2xl shadow-xl">
          <div className="border-b border-slate-800 pb-3">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-yellow-400/10 text-yellow-400 border border-yellow-400/20">
              Admin &amp; Operations
            </span>
            <h2 className="text-lg font-bold text-white mt-1">
              Weekly Recurring Rehearsal Schedule
            </h2>
            <p className="text-xs text-slate-400">
              Configure the default rehearsal day, times, and venue for the band.
            </p>
          </div>

          <form onSubmit={handleSaveSettings} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300 block">
                Rehearsal Day of Week
              </label>
              <select
                value={settingsForm.dayOfWeek}
                onChange={(e) =>
                  setSettingsForm({ ...settingsForm, dayOfWeek: Number(e.target.value) })
                }
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400"
              >
                <option value={0}>Sunday</option>
                <option value={1}>Monday</option>
                <option value={2}>Tuesday (Standard)</option>
                <option value={3}>Wednesday</option>
                <option value={4}>Thursday</option>
                <option value={5}>Friday</option>
                <option value={6}>Saturday</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300 block">Start Time</label>
                <input
                  type="time"
                  value={settingsForm.startTime}
                  onChange={(e) => setSettingsForm({ ...settingsForm, startTime: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300 block">End Time</label>
                <input
                  type="time"
                  value={settingsForm.endTime}
                  onChange={(e) => setSettingsForm({ ...settingsForm, endTime: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300 block">
                Default Practice Location
              </label>
              <select
                value={settingsForm.defaultLocationId}
                onChange={(e) => {
                  const loc = locations.find((l) => l.id === e.target.value);
                  setSettingsForm({
                    ...settingsForm,
                    defaultLocationId: e.target.value,
                    defaultLocationName: loc?.name || settingsForm.defaultLocationName,
                    defaultLocationAddress: loc?.address || settingsForm.defaultLocationAddress,
                    defaultLat: loc?.lat || settingsForm.defaultLat,
                    defaultLng: loc?.lng || settingsForm.defaultLng,
                  });
                }}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400"
              >
                <option value="">-- Choose Saved Location --</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name} ({loc.address || loc.city})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300 block">
                Standard Call &amp; Agenda Instructions
              </label>
              <textarea
                rows={3}
                value={settingsForm.agendaNotes}
                onChange={(e) => setSettingsForm({ ...settingsForm, agendaNotes: e.target.value })}
                placeholder="Warm-up guidelines, gear instructions, stands requirements..."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400 resize-none"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSavingSettings}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-950 bg-yellow-400 hover:bg-yellow-300 transition flex items-center gap-2 shadow-md disabled:opacity-50"
              >
                {isSavingSettings ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>Save Recurring Schedule</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Cancellation Reason Modal */}
      {cancelModalSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-red-500/40 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-red-500/15 text-red-400 border border-red-500/30">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-base font-bold text-white">Cancel Band Rehearsal</h4>
                <p className="text-xs text-slate-400">
                  For{" "}
                  {new Date(cancelModalSession.date + "T12:00:00").toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "short",
                    day: "numeric",
                  })}
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 block">
                Reason for Cancellation *
              </label>
              <textarea
                rows={3}
                value={cancelReasonText}
                onChange={(e) => setCancelReasonText(e.target.value)}
                placeholder="e.g. Inclement weather / heavy rain, Holiday break, Section leader conflict..."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-400 resize-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setCancelModalSession(null)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition"
              >
                Keep Rehearsal
              </button>
              <button
                type="button"
                disabled={isProcessingCancel}
                onClick={handleConfirmCancel}
                className="px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-500 transition flex items-center gap-1.5 shadow-md disabled:opacity-50"
              >
                {isProcessingCancel ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <XCircle className="w-3.5 h-3.5" />
                )}
                <span>Confirm Cancellation</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

