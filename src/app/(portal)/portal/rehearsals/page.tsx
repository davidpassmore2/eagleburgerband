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
import { User, UserSchema } from "@/lib/schema/user";
import { Section, SectionSchema } from "@/lib/schema/section";
import {
  getUpcomingRehearsalDates,
  getRehearsalAttendanceStats,
  getBlackoutsForDate,
} from "@/lib/rehearsal/rehearsalHelpers";
import {
  formatNonMilitaryTime,
  formatTimeRange,
  formatFriendlyDate,
  formatEasternTimestamp,
  isEventInPast,
} from "@/lib/utils/dateTimeFormat";
import { toast } from "@/lib/context/ToastContext";
import PortalBreadcrumb from "@/components/portal/PortalBreadcrumb";
import RehearsalMapPicker from "@/components/portal/RehearsalMapPicker";
import RehearsalBlackoutCalendar from "@/components/portal/RehearsalBlackoutCalendar";
import { isDateInUserBlackout } from "@/lib/portal/useUserBlackouts";
import InMyBlackoutChip from "@/components/portal/InMyBlackoutChip";
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
  Search,
  Layers,
  ListFilter,
  Tag,
  UserCheck,
  UserX,
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
  const [users, setUsers] = useState<User[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);

  // Roster Filter & View State
  const [rosterStatusFilter, setRosterStatusFilter] = useState<
    "all" | "attending" | "probable" | "tentative" | "declined" | "blackout" | "no_response"
  >("all");
  const [rosterSearch, setRosterSearch] = useState("");
  const [rosterViewMode, setRosterViewMode] = useState<"by_section" | "flat">("by_section");

  // User RSVP Note Input (null when unmodified from saved myRsvp.notes)
  const [userRsvpNote, setUserRsvpNote] = useState<string | null>(null);

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

    // Active band members listener
    const unsubUsers = onSnapshot(collection(db, "users"), (snapshot) => {
      const list: User[] = [];
      snapshot.forEach((d) => {
        const parsed = UserSchema.safeParse({ uid: d.id, ...d.data() });
        if (parsed.success && parsed.data.status === "active") {
          list.push(parsed.data);
        }
      });
      list.sort((a, b) => (a.displayName || a.realName || "").localeCompare(b.displayName || b.realName || ""));
      setUsers(list);
    });

    // Instrument sections listener
    const unsubSections = onSnapshot(collection(db, "sections"), (snapshot) => {
      const list: Section[] = [];
      snapshot.forEach((d) => {
        const parsed = SectionSchema.safeParse({ id: d.id, ...d.data() });
        if (parsed.success) list.push(parsed.data);
      });
      list.sort((a, b) => (a.order || 0) - (b.order || 0));
      setSections(list);
    });

    return () => {
      unsubConfig();
      unsubLocations();
      unsubSessions();
      unsubBlackouts();
      unsubUsers();
      unsubSections();
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

  // Current user's blackouts
  const myBlackouts = useMemo(() => {
    if (!profile?.uid) return [];
    return blackouts.filter((b) => b.uid === profile.uid);
  }, [blackouts, profile]);

  // Blackouts conflicting with the active rehearsal
  const activeDateBlackouts = useMemo(() => {
    if (!activeRehearsal.date) return [];
    return getBlackoutsForDate(activeRehearsal.date, blackouts);
  }, [activeRehearsal.date, blackouts]);

  // Whether active rehearsal falls in current user's blackout
  const isMyRehearsalBlackout = useMemo(() => {
    if (!profile?.uid || !activeRehearsal.date) return false;
    return isDateInUserBlackout(activeRehearsal.date, myBlackouts);
  }, [activeRehearsal, myBlackouts, profile]);

  const isRehearsalPast = useMemo(() => {
    return isEventInPast(activeRehearsal?.date, activeRehearsal?.endTime);
  }, [activeRehearsal]);

  // Current user's RSVP status for active rehearsal
  const myRsvp = useMemo(() => {
    if (!profile?.uid) return null;
    return rsvps.find((r) => r.uid === profile.uid);
  }, [rsvps, profile]);

  const effectiveRsvpNote = userRsvpNote !== null ? userRsvpNote : (myRsvp?.notes || "");

  // Handlers
  const handleRsvp = async (status: RsvpStatus, note?: string) => {
    if (!profile?.uid) {
      toast.error("Please sign in to RSVP.");
      return;
    }
    if (isRehearsalPast) {
      toast.error("RSVP cannot be updated for rehearsals that are in the past.");
      return;
    }
    if (isMyRehearsalBlackout) {
      toast.error("Cannot RSVP during your blackout period.");
      return;
    }

    const noteToSave = note !== undefined ? note : effectiveRsvpNote;
    setUserRsvpNote(noteToSave);

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
        notes: noteToSave,
        updatedAt: new Date().toISOString(),
      };

      await setDoc(doc(db, "rehearsals", activeRehearsal.id, "rsvps", profile.uid), rsvpData);
      toast.success(`RSVP updated: ${status.toUpperCase()}`);
    } catch (err) {
      toast.error("Failed to update RSVP: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  // Full Roster Entry Interface
  interface RosterMemberPlan {
    uid: string;
    displayName: string;
    sectionId: string;
    sectionName: string;
    instrument: string;
    status: RsvpStatus | "blackout" | "no_response";
    notes?: string;
    updatedAt?: string;
    hasBlackoutConflict: boolean;
    blackoutReason?: string;
    isCurrentUser: boolean;
  }

  // Enriched full roster (merging active directory with recorded rehearsal RSVPs)
  const allRosterEntries = useMemo<RosterMemberPlan[]>(() => {
    const list: RosterMemberPlan[] = [];
    const rsvpMap = new Map<string, RehearsalRsvp>();
    rsvps.forEach((r) => rsvpMap.set(r.uid, r));

    const secNameMap = new Map<string, string>();
    sections.forEach((s) => secNameMap.set(s.id.toLowerCase(), s.name));

    // 1. Process active users in the band directory
    if (users.length > 0) {
      users.forEach((u) => {
        const userRsvp = rsvpMap.get(u.uid);
        const userBlackout = activeDateBlackouts.find((b) => b.uid === u.uid);

        const secId = (u.sectionId || userRsvp?.sectionId || "general").toLowerCase();
        const secName =
          secNameMap.get(secId) || userRsvp?.sectionName || u.sectionId || "General Roster";
        const instrument =
          u.selectedInstrument || u.instruments?.[0] || userRsvp?.instrument || "";

        let status: RsvpStatus | "blackout" | "no_response";
        if (userRsvp) {
          if (userRsvp.status === "declined" && userBlackout) {
            status = "blackout";
          } else {
            status = userRsvp.status;
          }
        } else if (userBlackout) {
          status = "blackout";
        } else {
          status = "no_response";
        }

        list.push({
          uid: u.uid,
          displayName: u.displayName || u.realName || "Musician",
          sectionId: secId,
          sectionName: secName,
          instrument,
          status,
          notes: userRsvp?.notes,
          updatedAt: userRsvp?.updatedAt,
          hasBlackoutConflict: Boolean(userBlackout),
          blackoutReason: userBlackout?.reason,
          isCurrentUser: u.uid === profile?.uid,
        });

        rsvpMap.delete(u.uid);
      });
    }

    // 2. Include any additional RSVPs (guests/directors without user directory record)
    rsvpMap.forEach((r) => {
      const userBlackout = activeDateBlackouts.find((b) => b.uid === r.uid);
      const secId = (r.sectionId || "general").toLowerCase();
      const secName = secNameMap.get(secId) || r.sectionName || "General Roster";

      let status: RsvpStatus | "blackout" | "no_response";
      if (r.status === "declined" && userBlackout) {
        status = "blackout";
      } else {
        status = r.status;
      }

      list.push({
        uid: r.uid,
        displayName: r.displayName || "Musician",
        sectionId: secId,
        sectionName: secName,
        instrument: r.instrument || "",
        status,
        notes: r.notes,
        updatedAt: r.updatedAt,
        hasBlackoutConflict: Boolean(userBlackout),
        blackoutReason: userBlackout?.reason,
        isCurrentUser: r.uid === profile?.uid,
      });
    });

    return list;
  }, [rsvps, users, sections, activeDateBlackouts, profile?.uid]);

  // Response breakdown totals
  const rosterCounts = useMemo(() => {
    let attending = 0;
    let probable = 0;
    let tentative = 0;
    let declined = 0;
    let blackout = 0;
    let noResponse = 0;

    allRosterEntries.forEach((m) => {
      if (m.status === "attending") attending++;
      else if (m.status === "probable") probable++;
      else if (m.status === "tentative") tentative++;
      else if (m.status === "declined") declined++;
      else if (m.status === "blackout" || m.hasBlackoutConflict) blackout++;
      else noResponse++;
    });

    return {
      total: allRosterEntries.length,
      responded: rsvps.length,
      attending,
      probable,
      tentative,
      declined,
      blackout,
      noResponse,
    };
  }, [allRosterEntries, rsvps.length]);

  // Filtered roster by status and search text
  const filteredRoster = useMemo(() => {
    return allRosterEntries.filter((m) => {
      if (rosterStatusFilter === "attending" && m.status !== "attending") return false;
      if (rosterStatusFilter === "probable" && m.status !== "probable") return false;
      if (rosterStatusFilter === "tentative" && m.status !== "tentative") return false;
      if (rosterStatusFilter === "declined" && m.status !== "declined") return false;
      if (rosterStatusFilter === "blackout" && m.status !== "blackout" && !m.hasBlackoutConflict) return false;
      if (rosterStatusFilter === "no_response" && m.status !== "no_response") return false;

      if (rosterSearch.trim()) {
        const query = rosterSearch.toLowerCase();
        const matchesName = m.displayName.toLowerCase().includes(query);
        const matchesInstrument = m.instrument.toLowerCase().includes(query);
        const matchesSection = m.sectionName.toLowerCase().includes(query);
        const matchesNote = (m.notes || "").toLowerCase().includes(query);
        return matchesName || matchesInstrument || matchesSection || matchesNote;
      }

      return true;
    });
  }, [allRosterEntries, rosterStatusFilter, rosterSearch]);

  // Group filtered roster by instrument section
  const rosterBySection = useMemo(() => {
    const definedSecs =
      sections.length > 0
        ? sections
        : [
            { id: "percussion", name: "Percussion", order: 1 },
            { id: "sousaphones", name: "Sousaphones", order: 2 },
            { id: "trombones", name: "Trombones", order: 3 },
            { id: "trumpets", name: "Trumpets", order: 4 },
            { id: "saxophones", name: "Saxophones & Woodwinds", order: 5 },
            { id: "auxiliary", name: "Auxiliary & Visuals", order: 6 },
          ];

    const groups: {
      sectionId: string;
      sectionName: string;
      leaderName?: string;
      members: RosterMemberPlan[];
      attendingCount: number;
      projectedCount: number;
    }[] = [];

    definedSecs.forEach((sec) => {
      const sectionMembers = filteredRoster.filter(
        (m) => m.sectionId === sec.id.toLowerCase()
      );
      if (sectionMembers.length > 0 || (!rosterSearch.trim() && rosterStatusFilter === "all")) {
        const attendingCount = sectionMembers.filter((m) => m.status === "attending").length;
        const probableCount = sectionMembers.filter((m) => m.status === "probable").length;
        groups.push({
          sectionId: sec.id,
          sectionName: sec.name,
          leaderName: "leaderName" in sec ? (sec.leaderName as string) : undefined,
          members: sectionMembers,
          attendingCount,
          projectedCount: attendingCount + probableCount,
        });
      }
    });

    const otherMembers = filteredRoster.filter(
      (m) => !definedSecs.some((sec) => sec.id.toLowerCase() === m.sectionId)
    );
    if (otherMembers.length > 0) {
      const attendingCount = otherMembers.filter((m) => m.status === "attending").length;
      const probableCount = otherMembers.filter((m) => m.status === "probable").length;
      groups.push({
        sectionId: "general",
        sectionName: "General Roster / Other",
        members: otherMembers,
        attendingCount,
        projectedCount: attendingCount + probableCount,
      });
    }

    return groups;
  }, [sections, filteredRoster, rosterSearch, rosterStatusFilter]);

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
      toast.success("Rehearsal note posted.");
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
              {formatNonMilitaryTime(config.startTime, true)}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2 mt-1">
            <Music2 className="text-yellow-400 w-6 h-6" /> Band Rehearsals Hub
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-0.5">
            Coordinate weekly downbeats, log attendance plans, drop rehearsal location pins, and check member availability.
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
          <span>Rehearsal Schedule &amp; RSVPs</span>
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
                <div className="flex items-center gap-2 flex-wrap">
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
                  {isMyRehearsalBlackout && <InMyBlackoutChip />}
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-white mt-1">
                  {formatFriendlyDate(activeRehearsal.date, {
                    includeDayOfWeek: true,
                    includeYear: true,
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
                    {activeRehearsal.isCancelled ? "Reactivate Rehearsal" : "Cancel Rehearsal"}
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
                    This rehearsal session has been cancelled.
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
                    {formatTimeRange(activeRehearsal.startTime, activeRehearsal.endTime, true)}
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
                  Rehearsal Location &amp; Map Pin
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
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white uppercase tracking-wider block">
                      My Attendance Plan:
                    </span>
                    {isMyRehearsalBlackout && <InMyBlackoutChip />}
                  </div>
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
                  disabled={isMyRehearsalBlackout || isRehearsalPast}
                  title={
                    isRehearsalPast
                      ? "Rehearsal is in the past"
                      : isMyRehearsalBlackout
                      ? "in my blackout"
                      : undefined
                  }
                  onClick={() => handleRsvp("attending")}
                  className={`p-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 border disabled:opacity-40 disabled:cursor-not-allowed ${
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
                  disabled={isMyRehearsalBlackout || isRehearsalPast}
                  title={
                    isRehearsalPast
                      ? "Rehearsal is in the past"
                      : isMyRehearsalBlackout
                      ? "in my blackout"
                      : undefined
                  }
                  onClick={() => handleRsvp("probable")}
                  className={`p-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 border disabled:opacity-40 disabled:cursor-not-allowed ${
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
                  disabled={isMyRehearsalBlackout || isRehearsalPast}
                  title={
                    isRehearsalPast
                      ? "Rehearsal is in the past"
                      : isMyRehearsalBlackout
                      ? "in my blackout"
                      : undefined
                  }
                  onClick={() => handleRsvp("tentative")}
                  className={`p-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 border disabled:opacity-40 disabled:cursor-not-allowed ${
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
                  disabled={isMyRehearsalBlackout || isRehearsalPast}
                  title={
                    isRehearsalPast
                      ? "Rehearsal is in the past"
                      : isMyRehearsalBlackout
                      ? "in my blackout"
                      : undefined
                  }
                  onClick={() => handleRsvp("declined")}
                  className={`p-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 border disabled:opacity-40 disabled:cursor-not-allowed ${
                    myRsvp?.status === "declined"
                      ? "bg-rose-500 text-white border-rose-500 shadow-md"
                      : "bg-slate-900 text-rose-400 border-rose-500/20 hover:bg-rose-500/10"
                  }`}
                >
                  <XCircle className="w-4 h-4" />
                  <span>Declined (Out)</span>
                </button>
              </div>

              {/* Optional Personal Note Input */}
              <div className="flex items-center gap-2 pt-2 border-t border-slate-900">
                <input
                  type="text"
                  placeholder={
                    isRehearsalPast
                      ? "Rehearsal is in the past"
                      : isMyRehearsalBlackout
                      ? "RSVP locked during your blackout period"
                      : "Add note or call-time reason (e.g. Arriving 15 min late, bringing extra stands)..."
                  }
                  value={effectiveRsvpNote}
                  disabled={isMyRehearsalBlackout || isRehearsalPast}
                  onChange={(e) => setUserRsvpNote(e.target.value)}
                  onBlur={() => {
                    if (!isMyRehearsalBlackout && !isRehearsalPast && myRsvp && effectiveRsvpNote !== (myRsvp.notes || "")) {
                      handleRsvp(myRsvp.status, effectiveRsvpNote);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (!isMyRehearsalBlackout && !isRehearsalPast && myRsvp) handleRsvp(myRsvp.status, effectiveRsvpNote);
                    }
                  }}
                  className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400 disabled:opacity-40 disabled:cursor-not-allowed"
                />
                {!isMyRehearsalBlackout && !isRehearsalPast && myRsvp && effectiveRsvpNote !== (myRsvp.notes || "") && (
                  <button
                    type="button"
                    onClick={() => handleRsvp(myRsvp.status, effectiveRsvpNote)}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-yellow-400 text-slate-950 hover:bg-yellow-300 transition shrink-0"
                  >
                    Save Note
                  </button>
                )}
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
                  {activeDateBlackouts.length > 0 && (
                    <span className="text-amber-400 font-bold flex items-center gap-1">
                      <Palmtree className="w-3 h-3 shrink-0" />
                      {activeDateBlackouts.length} Blackout
                    </span>
                  )}
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

            {/* Member Attendance Roster & Section Coverage */}
            <div className="space-y-4 pt-3 border-t border-slate-800">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2 uppercase tracking-wider">
                    <Users className="w-4 h-4 text-yellow-400" />
                    <span>Member Attendance Roster &amp; Roll Call</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {rosterCounts.attending} confirmed in, {rosterCounts.probable} probable, {rosterCounts.declined} out
                    {rosterCounts.blackout > 0 && `, ${rosterCounts.blackout} in blackout`}
                    {rosterCounts.noResponse > 0 && ` (${rosterCounts.noResponse} awaiting RSVP)`}.
                  </p>
                </div>

                {/* View Mode Toggle */}
                <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 p-1 rounded-xl self-stretch sm:self-auto justify-end">
                  <button
                    type="button"
                    onClick={() => setRosterViewMode("by_section")}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
                      rosterViewMode === "by_section"
                        ? "bg-yellow-400 text-slate-950 font-bold"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>By Section</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRosterViewMode("flat")}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
                      rosterViewMode === "flat"
                        ? "bg-yellow-400 text-slate-950 font-bold"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <ListFilter className="w-3.5 h-3.5" />
                    <span>All Musicians ({rosterCounts.total})</span>
                  </button>
                </div>
              </div>

              {/* Filter Tabs & Search Bar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                {/* Status Filter Chips */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none text-xs">
                  <button
                    type="button"
                    onClick={() => setRosterStatusFilter("all")}
                    className={`px-2.5 py-1 rounded-lg font-semibold whitespace-nowrap transition border ${
                      rosterStatusFilter === "all"
                        ? "bg-slate-200 text-slate-950 border-white font-bold"
                        : "bg-slate-950 text-slate-400 border-slate-800 hover:text-white"
                    }`}
                  >
                    All ({rosterCounts.total})
                  </button>

                  <button
                    type="button"
                    onClick={() => setRosterStatusFilter("attending")}
                    className={`px-2.5 py-1 rounded-lg font-semibold whitespace-nowrap transition border ${
                      rosterStatusFilter === "attending"
                        ? "bg-emerald-500 text-slate-950 border-emerald-400 font-bold"
                        : "bg-emerald-950/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"
                    }`}
                  >
                    In ({rosterCounts.attending})
                  </button>

                  <button
                    type="button"
                    onClick={() => setRosterStatusFilter("probable")}
                    className={`px-2.5 py-1 rounded-lg font-semibold whitespace-nowrap transition border ${
                      rosterStatusFilter === "probable"
                        ? "bg-cyan-500 text-slate-950 border-cyan-400 font-bold"
                        : "bg-cyan-950/20 text-cyan-400 border-cyan-500/30 hover:bg-cyan-500/10"
                    }`}
                  >
                    Probable ({rosterCounts.probable})
                  </button>

                  <button
                    type="button"
                    onClick={() => setRosterStatusFilter("tentative")}
                    className={`px-2.5 py-1 rounded-lg font-semibold whitespace-nowrap transition border ${
                      rosterStatusFilter === "tentative"
                        ? "bg-amber-400 text-slate-950 border-amber-300 font-bold"
                        : "bg-amber-950/20 text-amber-400 border-amber-500/30 hover:bg-amber-500/10"
                    }`}
                  >
                    Tentative ({rosterCounts.tentative})
                  </button>

                  <button
                    type="button"
                    onClick={() => setRosterStatusFilter("declined")}
                    className={`px-2.5 py-1 rounded-lg font-semibold whitespace-nowrap transition border ${
                      rosterStatusFilter === "declined"
                        ? "bg-rose-500 text-white border-rose-400 font-bold"
                        : "bg-rose-950/20 text-rose-400 border-rose-500/30 hover:bg-rose-500/10"
                    }`}
                  >
                    Out ({rosterCounts.declined})
                  </button>

                  <button
                    type="button"
                    onClick={() => setRosterStatusFilter("blackout")}
                    className={`px-2.5 py-1 rounded-lg font-semibold whitespace-nowrap transition border flex items-center gap-1.5 ${
                      rosterStatusFilter === "blackout"
                        ? "bg-amber-500 text-slate-950 border-amber-400 font-bold"
                        : "bg-amber-950/20 text-amber-400 border-amber-500/30 hover:bg-amber-500/10"
                    }`}
                  >
                    <Palmtree className="w-3.5 h-3.5 shrink-0" />
                    <span>Blackout ({rosterCounts.blackout})</span>
                  </button>

                  {rosterCounts.noResponse > 0 && (
                    <button
                      type="button"
                      onClick={() => setRosterStatusFilter("no_response")}
                      className={`px-2.5 py-1 rounded-lg font-semibold whitespace-nowrap transition border ${
                        rosterStatusFilter === "no_response"
                          ? "bg-slate-700 text-white border-slate-600 font-bold"
                          : "bg-slate-950 text-slate-500 border-slate-800 hover:text-slate-300"
                      }`}
                    >
                      Awaiting ({rosterCounts.noResponse})
                    </button>
                  )}
                </div>

                {/* Search Input */}
                <div className="relative min-w-[200px]">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search name, instrument, note..."
                    value={rosterSearch}
                    onChange={(e) => setRosterSearch(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400"
                  />
                  {rosterSearch && (
                    <button
                      type="button"
                      onClick={() => setRosterSearch("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white text-xs"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>

              {/* Roster Cards Output */}
              {filteredRoster.length === 0 ? (
                <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-6 text-center space-y-2">
                  <UserX className="w-6 h-6 text-slate-500 mx-auto" />
                  <p className="text-xs text-slate-400">
                    No musicians match your current filter ({rosterStatusFilter !== "all" ? rosterStatusFilter : "all"}).
                  </p>
                  {(rosterStatusFilter !== "all" || rosterSearch) && (
                    <button
                      type="button"
                      onClick={() => {
                        setRosterStatusFilter("all");
                        setRosterSearch("");
                      }}
                      className="text-xs text-yellow-400 hover:underline font-semibold"
                    >
                      Reset filters to view all members
                    </button>
                  )}
                </div>
              ) : rosterViewMode === "by_section" ? (
                <div className="space-y-3.5">
                  {rosterBySection.map((sec) => (
                    <div
                      key={sec.sectionId}
                      className="bg-slate-950/80 border border-slate-800/90 rounded-2xl p-3.5 space-y-2.5"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-900 pb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white uppercase tracking-wider">
                            {sec.sectionName}
                          </span>
                          {sec.leaderName && (
                            <span className="text-[10px] text-slate-500">
                              (Lead: {sec.leaderName})
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-lg">
                            {sec.attendingCount} In {sec.projectedCount > sec.attendingCount && `(${sec.projectedCount} proj)`}
                          </span>
                        </div>
                      </div>

                      {sec.members.length === 0 ? (
                        <p className="text-[11px] text-slate-600 italic py-1">
                          No section members currently matched.
                        </p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                          {sec.members.map((m) => (
                            <div
                              key={m.uid}
                              className={`border rounded-xl p-2.5 space-y-1.5 transition ${
                                m.isCurrentUser
                                  ? "bg-slate-900 border-yellow-400/40 ring-1 ring-yellow-400/20 shadow-xs"
                                  : "bg-slate-900/60 border-slate-800 hover:border-slate-700"
                              }`}
                            >
                              <div className="flex items-start justify-between gap-1.5">
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-bold text-xs text-white truncate">
                                      {m.displayName}
                                    </span>
                                    {m.isCurrentUser && (
                                      <span className="text-[9px] font-mono font-bold uppercase px-1.5 py-0.2 rounded bg-yellow-400/20 text-yellow-300 border border-yellow-400/30">
                                        You
                                      </span>
                                    )}
                                  </div>
                                  {m.instrument && (
                                    <span className="text-[10px] text-slate-400 block truncate">
                                      {m.instrument}
                                    </span>
                                  )}
                                </div>

                                <span
                                  className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase shrink-0 border flex items-center gap-1 ${
                                    m.status === "attending"
                                      ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                                      : m.status === "probable"
                                      ? "bg-cyan-500/15 text-cyan-300 border-cyan-500/30"
                                      : m.status === "tentative"
                                      ? "bg-amber-400/15 text-amber-300 border-amber-400/30"
                                      : m.status === "declined"
                                      ? "bg-rose-500/15 text-rose-300 border-rose-500/30"
                                      : m.status === "blackout"
                                      ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                                      : "bg-slate-800 text-slate-400 border-slate-700"
                                  }`}
                                >
                                  {m.status === "blackout" && <Palmtree className="w-2.5 h-2.5 shrink-0" />}
                                  <span>
                                    {m.status === "attending"
                                      ? "In"
                                      : m.status === "probable"
                                      ? "Probable"
                                      : m.status === "tentative"
                                      ? "Tentative"
                                      : m.status === "declined"
                                      ? "Out"
                                      : m.status === "blackout"
                                      ? "Blackout"
                                      : "Awaiting"}
                                  </span>
                                </span>
                              </div>

                              {m.notes && (
                                <div className="text-[11px] text-slate-300 bg-slate-950/80 border border-slate-800 rounded-lg px-2 py-1 italic">
                                  &ldquo;{m.notes}&rdquo;
                                </div>
                              )}

                              {m.hasBlackoutConflict && (
                                <div className="text-[10px] text-amber-400 bg-amber-950/30 border border-amber-500/20 rounded px-1.5 py-0.5 flex items-center gap-1">
                                  <Palmtree className="w-2.5 h-2.5 shrink-0" />
                                  <span className="truncate">
                                    Blackout: {m.blackoutReason || "Out of town"}
                                  </span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {filteredRoster.map((m) => (
                    <div
                      key={m.uid}
                      className={`border rounded-xl p-3 space-y-1.5 transition ${
                        m.isCurrentUser
                          ? "bg-slate-900 border-yellow-400/40 ring-1 ring-yellow-400/20 shadow-xs"
                          : "bg-slate-950/70 border-slate-800 hover:border-slate-700"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-1.5">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-xs text-white truncate">
                              {m.displayName}
                            </span>
                            {m.isCurrentUser && (
                              <span className="text-[9px] font-mono font-bold uppercase px-1.5 py-0.2 rounded bg-yellow-400/20 text-yellow-300 border border-yellow-400/30">
                                You
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-400 block truncate">
                            {m.instrument ? `${m.instrument} • ` : ""}{m.sectionName}
                          </span>
                        </div>

                        <span
                          className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase shrink-0 border flex items-center gap-1 ${
                            m.status === "attending"
                              ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                              : m.status === "probable"
                              ? "bg-cyan-500/15 text-cyan-300 border-cyan-500/30"
                              : m.status === "tentative"
                              ? "bg-amber-400/15 text-amber-300 border-amber-400/30"
                              : m.status === "declined"
                              ? "bg-rose-500/15 text-rose-300 border-rose-500/30"
                              : m.status === "blackout"
                              ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                              : "bg-slate-800 text-slate-400 border-slate-700"
                          }`}
                        >
                          {m.status === "blackout" && <Palmtree className="w-2.5 h-2.5 shrink-0" />}
                          <span>
                            {m.status === "attending"
                              ? "In"
                              : m.status === "probable"
                              ? "Probable"
                              : m.status === "tentative"
                              ? "Tentative"
                              : m.status === "declined"
                              ? "Out"
                              : m.status === "blackout"
                              ? "Blackout"
                              : "Awaiting"}
                          </span>
                        </span>
                      </div>

                      {m.notes && (
                        <div className="text-[11px] text-slate-300 bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 italic">
                          &ldquo;{m.notes}&rdquo;
                        </div>
                      )}

                      {m.hasBlackoutConflict && (
                        <div className="text-[10px] text-amber-400 bg-amber-950/30 border border-amber-500/20 rounded px-1.5 py-0.5 flex items-center gap-1">
                          <Palmtree className="w-2.5 h-2.5 shrink-0" />
                          <span className="truncate">
                            Blackout: {m.blackoutReason || "Out of town"}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Individual Rehearsal Comments Thread */}
            <div className="space-y-3 pt-3 border-t border-slate-800">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-yellow-400" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Rehearsal Discussion &amp; Notes ({(activeRehearsal.comments || []).length})
                </span>
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {(activeRehearsal.comments || []).length === 0 ? (
                  <div className="text-xs text-slate-500 py-2">
                    No comments yet for this rehearsal. Post music requests, rideshare notes, or questions below.
                  </div>
                ) : (
                  (activeRehearsal.comments || []).map((c) => (
                    <div
                      key={c.id}
                      className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 space-y-1 text-xs"
                    >
                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <strong className="text-white">{c.authorName}</strong>
                        <span>{formatEasternTimestamp(c.createdAt)}</span>
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
                  placeholder="Leave a note on this rehearsal..."
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
                const isItemBlackedOut = isDateInUserBlackout(item.dateStr, myBlackouts);

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
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-white">
                          {item.formattedDate}
                        </span>
                        {isItemBlackedOut && <InMyBlackoutChip size="sm" />}
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
                Default Rehearsal Location
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
                  {formatFriendlyDate(cancelModalSession.date, {
                    includeDayOfWeek: true,
                    includeYear: false,
                    shortMonth: true,
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

