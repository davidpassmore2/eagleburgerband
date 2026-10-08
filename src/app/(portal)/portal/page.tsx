"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  collection,
  query,
  orderBy,
  where,
  limit,
  onSnapshot,
  getDocs,
  doc,
  setDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/lib/context/AuthContext";
import { canManageGigs } from "@/lib/auth/permissions";
import { useTheme } from "@/lib/context/ThemeContext";
import CalendarSubscribeModal from "@/components/portal/CalendarSubscribeModal";
import PortalThemeModal from "@/components/portal/PortalThemeModal";
import PortalMonthCalendar from "@/components/portal/PortalMonthCalendar";
import MemberAnalyticsCard from "@/components/portal/MemberAnalyticsCard";
import PortalPwaCard from "@/components/portal/PortalPwaCard";
import { AttendanceStatus } from "@/components/portal/PortalDayEventsModal";
import { toast } from "@/lib/context/ToastContext";
import { NotificationSchema, AppNotification } from "@/lib/schema/notification";
import { GigRsvpSchema } from "@/lib/schema/rsvp";
import {
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Bell,
  ArrowRight,
  Sparkles,
  Music2,
  Music,
  Lightbulb,
  Calendar as CalendarIcon,
  CalendarOff,
  PlaySquare,
  Inbox,
  Palette,
  Smartphone,
  AlertCircle,
  AlertTriangle,
  Shield,
  Layers,
  Check,
  ChevronRight,
  Receipt,
  UserMinus,
  DollarSign,
  Megaphone,
} from "lucide-react";

type Gig = {
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
    notes?: string;
    payPerMusician?: number;
    compensation?: number;
  };
  setlistRef?: string;
  isCancelled?: boolean;
  rsvpSummary?: {
    attendingCount: number;
    declinedCount: number;
  };
};

interface LedgerRecord {
  gigId: string;
  distributions?: {
    uid: string;
    amount: number;
    paidStatus: "unpaid" | "cash" | "venmo" | "check";
  }[];
}

export default function MusicianPortalOverviewPage() {
  const { profile, loading: authLoading } = useAuth();
  const { activePortalScheme } = useTheme();
  const [gigs, setGigs] = useState<Gig[]>([]);
  const [userRsvps, setUserRsvps] = useState<Record<string, AttendanceStatus>>({});
  const [ledgers, setLedgers] = useState<LedgerRecord[]>([]);
  const [tuneCount, setTuneCount] = useState<number | null>(null);
  const [suggestionCount, setSuggestionCount] = useState<number | null>(null);
  const [loadingGigs, setLoadingGigs] = useState(true);
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);
  const [isUpdatingRsvp, setIsUpdatingRsvp] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState<AppNotification[]>([]);
  const [personalReimbursements, setPersonalReimbursements] = useState<{ pending: number; paid: number }>({
    pending: 0,
    paid: 0,
  });

  useEffect(() => {
    const q = query(collection(db, "gigs"), orderBy("date", "asc"));
    const unsubGigs = onSnapshot(q, (snapshot) => {
      const gigList: Gig[] = [];
      snapshot.forEach((docSnap) => {
        gigList.push({ id: docSnap.id, ...docSnap.data() } as Gig);
      });
      setGigs(gigList);
      setLoadingGigs(false);
    });

    // Listen to financial ledgers to compute personal earnings
    const unsubLedgers = onSnapshot(
      collection(db, "gig_ledgers"),
      (snapshot) => {
        const list: LedgerRecord[] = [];
        snapshot.forEach((docSnap) => {
          list.push(docSnap.data() as LedgerRecord);
        });
        setLedgers(list);
      },
      (err) => console.warn("Notice: ledger subscriber note:", err)
    );

    // Listen to active repertoire charts
    const unsubTunes = onSnapshot(
      collection(db, "tunes"),
      (snapshot) => {
        setTuneCount(snapshot.size);
      },
      (err) => console.warn("Notice: tunes subscriber note:", err)
    );

    // Listen to song proposals
    const unsubSuggestions = onSnapshot(
      collection(db, "suggestions"),
      (snapshot) => {
        setSuggestionCount(snapshot.size);
      },
      (err) => console.warn("Notice: suggestions subscriber note:", err)
    );

    return () => {
      unsubGigs();
      unsubLedgers();
      unsubTunes();
      unsubSuggestions();
    };
  }, []);

  // Listen to personal reimbursements and notifications
  useEffect(() => {
    if (!profile?.uid) return;

    // Listen to personal reimbursements
    const qReimburse = query(
      collection(db, "reimbursements"),
      where("applicantUid", "==", profile.uid)
    );
    const unsubReimburse = onSnapshot(
      qReimburse,
      (snapshot) => {
        let pending = 0;
        let paid = 0;
        snapshot.forEach((d) => {
          const data = d.data();
          const amt = Number(data.amount) || 0;
          if (data.status === "paid") {
            paid += amt;
          } else if (data.status === "submitted" || data.status === "approved") {
            pending += amt;
          }
        });
        setPersonalReimbursements({ pending, paid });
      },
      (err) => console.warn("Notice: reimbursements subscriber note:", err)
    );

    // Listen to dispatches & notifications
    const qNotifs = query(collection(db, "notifications"), orderBy("createdAt", "desc"), limit(25));
    const unsubNotifs = onSnapshot(
      qNotifs,
      (snapshot) => {
        const unread: AppNotification[] = [];
        snapshot.forEach((d) => {
          const parsed = NotificationSchema.safeParse({ id: d.id, ...d.data() });
          if (parsed.success) {
            const n = parsed.data;
            const isForMe =
              n.recipientUid === "all" ||
              n.recipientUid === profile.uid ||
              (profile.sectionId && n.recipientUid === `section:${profile.sectionId}`) ||
              (profile.roles && profile.roles.some((r) => n.recipientUid === `role:${r}`));
            const isRead = (n.readUids || []).includes(profile.uid);
            if (isForMe && !isRead) {
              unread.push(n);
            }
          }
        });
        setUnreadNotifications(unread);
      },
      (err) => console.warn("Notice: notifications subscriber note:", err)
    );

    return () => {
      unsubReimburse();
      unsubNotifs();
    };
  }, [profile?.uid, profile?.sectionId, profile?.roles]);

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

  // Handle in-line and modal RSVP updates
  const handleRsvpChange = async (
    gigId: string,
    status: AttendanceStatus
  ) => {
    if (!profile?.uid || !gigId) return;
    setIsUpdatingRsvp(true);

    // Optimistic update
    setUserRsvps((prev) => ({ ...prev, [gigId]: status }));

    try {
      const validated = GigRsvpSchema.parse({
        gigId,
        uid: profile.uid,
        displayName: profile.displayName || "Musician",
        sectionId: profile.sectionId || "",
        status,
        notes: "",
        updatedAt: new Date().toISOString(),
      });

      const rsvpRef = doc(db, "gigs", gigId, "rsvps", profile.uid);
      await setDoc(rsvpRef, validated, { merge: true });
      toast.success(`RSVP updated: ${status}.`);
    } catch (err) {
      console.error("Failed to update RSVP:", err);
      toast.error("Could not update RSVP. Please check your connection and try again.");
    } finally {
      setIsUpdatingRsvp(false);
    }
  };

  // Derived personal financial earnings
  const personalEarnings = useMemo(() => {
    if (!profile) return { paid: 0, unpaid: 0 };
    let paid = 0;
    let unpaid = 0;

    ledgers.forEach((l) => {
      if (Array.isArray(l.distributions)) {
        const mySplit = l.distributions.find((d) => d.uid === profile.uid);
        if (mySplit) {
          if (mySplit.paidStatus === "unpaid") {
            unpaid += mySplit.amount;
          } else {
            paid += mySplit.amount;
          }
        }
      }
    });

    return { paid, unpaid };
  }, [ledgers, profile]);

  // Filter upcoming gigs and next immediate performance
  const todayStr = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }, []);

  const upcomingGigs = useMemo(() => {
    return gigs.filter(
      (g) => g.status !== "cancelled" && g.status !== "completed" && g.date >= todayStr
    );
  }, [gigs, todayStr]);

  const confirmedCount = useMemo(() => {
    return upcomingGigs.filter((g) => userRsvps[g.id] === "attending").length;
  }, [upcomingGigs, userRsvps]);

  const unansweredGigs = useMemo(() => {
    return upcomingGigs.filter((g) => !userRsvps[g.id]);
  }, [upcomingGigs, userRsvps]);

  const nextGig = upcomingGigs.length > 0 ? upcomingGigs[0] : null;

  const countdownText = useMemo(() => {
    if (!nextGig) return null;
    const gigDate = nextGig.date; // "YYYY-MM-DD"
    const callTime = nextGig.internalLogistics?.callTime || "18:00";
    const [year, month, day] = gigDate.split("-").map(Number);
    if (!year || !month || !day) return null;

    let hours = 18;
    let minutes = 0;
    const timeMatch = callTime.match(/(\d+):(\d+)\s*(AM|PM)?/i);
    if (timeMatch) {
      let h = parseInt(timeMatch[1], 10);
      const m = parseInt(timeMatch[2], 10);
      const meridian = timeMatch[3]?.toUpperCase();
      if (meridian === "PM" && h < 12) h += 12;
      if (meridian === "AM" && h === 12) h = 0;
      hours = h;
      minutes = m;
    }

    const targetDate = new Date(year, month - 1, day, hours, minutes);
    const now = new Date();
    const diffMs = targetDate.getTime() - now.getTime();

    if (diffMs <= 0 && diffMs > -4 * 3600 * 1000) {
      return "Live Today / On Call Now!";
    }
    if (diffMs <= -4 * 3600 * 1000) {
      return "Gig in Progress";
    }

    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    const remainingHours = diffHours % 24;

    if (diffDays === 0) {
      return `Today: Call in ${diffHours}h ${Math.floor((diffMs / (1000 * 60)) % 60)}m`;
    }
    if (diffDays === 1) {
      return `Tomorrow: Call in ${diffHours}h`;
    }
    return `${diffDays} Days, ${remainingHours} Hours`;
  }, [nextGig]);

  if (authLoading || loadingGigs) {
    return (
      <div className="p-8 text-center text-slate-400 flex items-center justify-center min-h-[50vh]">
        <div className="space-y-2">
          <div className="w-8 h-8 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-mono">Loading your musician workstation...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      {/* 1. Header & Welcome Bar */}
      <div
        suppressHydrationWarning
        style={{
          backgroundColor: "var(--ebb-surface)",
          borderColor: "var(--ebb-border)",
        }}
        className="border rounded-2xl p-5 sm:p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-xl transition-colors duration-300"
      >
        <div>
          <div className="flex items-center gap-2">
            <span
              suppressHydrationWarning
              style={{
                backgroundColor: "var(--ebb-surface-muted)",
                borderColor: "var(--ebb-border)",
                color: "var(--ebb-primary)",
              }}
              className="text-xs font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded border"
            >
              Musician Portal
            </span>
            <span className="text-xs font-mono text-emerald-400 flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Live Dispatch
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
            Welcome, {profile?.displayName || "Musician"}
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Confirmed for <strong className="text-emerald-400">{confirmedCount}</strong> of{" "}
            {upcomingGigs.length} upcoming {upcomingGigs.length === 1 ? "performance" : "performances"}.
            {unansweredGigs.length > 0 && (
              <span className="text-amber-400 ml-1.5 font-semibold">
                (⚡ {unansweredGigs.length} awaiting your response)
              </span>
            )}
          </p>
        </div>

        {/* Quick Utilities in Header */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <button
            type="button"
            suppressHydrationWarning
            onClick={() => setIsCalendarModalOpen(true)}
            style={{
              backgroundColor: "var(--ebb-surface-muted)",
              borderColor: "var(--ebb-border)",
            }}
            className="text-slate-300 hover:text-white border px-3.5 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition flex-1 md:flex-initial shadow-sm"
          >
            <CalendarIcon className="w-3.5 h-3.5" /> Sync Calendar
          </button>

          <button
            type="button"
            suppressHydrationWarning
            onClick={() => setIsThemeModalOpen(true)}
            style={{
              backgroundColor: "var(--ebb-surface-muted)",
              borderColor: "var(--ebb-border)",
            }}
            className="text-slate-300 hover:text-white border px-3.5 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition flex-1 md:flex-initial shadow-sm"
          >
            <Palette className="w-3.5 h-3.5" style={{ color: "var(--ebb-primary)" }} />
            <span>Theme: {activePortalScheme.name}</span>
          </button>
        </div>
      </div>

      {/* 2. Action Needed Urgent Alert (if any) - Alert Branding */}
      {unansweredGigs.length > 0 && (
        <div
          suppressHydrationWarning
          className="border border-rose-500/40 bg-rose-950/25 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md shadow-rose-950/20"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-500/15 text-rose-400 border border-rose-500/30 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                <span>Action Needed: {unansweredGigs.length} Upcoming {unansweredGigs.length === 1 ? "Gig Needs" : "Gigs Need"} Your RSVP</span>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold">
                  Call Sheet Lock
                </span>
              </div>
              <p className="text-xs text-rose-200/80 mt-0.5">
                Section rosters are currently finalizing downbeat personnel for {unansweredGigs.map(g => g.publicDetails?.title || g.internalLogistics?.title || "Upcoming Show").slice(0, 2).join(", ")}.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <a
              href="#schedule-section"
              className="bg-rose-500 hover:bg-rose-400 text-slate-950 font-bold px-3.5 py-1.5 rounded-xl text-xs flex items-center gap-1 transition shadow"
            >
              <span>Review &amp; RSVP Now</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      )}

      {/* 3. Next Performance Spotlight Hero */}
      {nextGig && (
        <div
          suppressHydrationWarning
          style={{
            backgroundColor: "var(--ebb-surface)",
            borderColor: "var(--ebb-border)",
          }}
          className="border rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden transition-colors"
        >
          {/* Subtle accent glow */}
          <div 
            className="absolute -top-12 -right-12 w-48 h-48 rounded-full blur-3xl opacity-10 pointer-events-none"
            style={{ backgroundColor: "var(--ebb-primary)" }}
          />

          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5 relative z-10">
            <div className="space-y-2 max-w-2xl">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  suppressHydrationWarning
                  style={{
                    backgroundColor: "var(--ebb-surface-muted)",
                    borderColor: "var(--ebb-border)",
                    color: "var(--ebb-primary)",
                  }}
                  className="text-xs font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded border"
                >
                  Next Performance
                </span>
                <span className="text-xs font-mono text-slate-300 font-bold">
                  {nextGig.date}
                </span>
                {countdownText && (
                  <span className="text-xs font-mono font-bold text-yellow-300 bg-yellow-400/15 border border-yellow-400/30 px-2.5 py-0.5 rounded-full flex items-center gap-1.5 shadow-sm">
                    <Clock className="w-3 h-3 text-yellow-400" />
                    <span>{countdownText}</span>
                  </span>
                )}
              </div>

              <h2 className="text-xl sm:text-2xl font-black text-white">
                {nextGig.internalLogistics?.title || nextGig.publicDetails?.title || "Eagleburger Gig"}
              </h2>

              <div className="flex flex-wrap items-center gap-y-1.5 gap-x-4 text-xs text-slate-300">
                <span className="flex items-center gap-1.5 bg-black/20 px-2.5 py-1 rounded-lg border border-white/5">
                  <Clock className="w-3.5 h-3.5 text-yellow-400" />
                  Call: <strong className="text-white">{nextGig.internalLogistics?.callTime || "TBD"}</strong>
                  <span className="text-slate-500">|</span>
                  Downbeat: <strong className="text-white">{nextGig.internalLogistics?.downbeat || "TBD"}</strong>
                </span>

                <span className="flex items-center gap-1.5 bg-black/20 px-2.5 py-1 rounded-lg border border-white/5">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{nextGig.publicDetails?.venue || nextGig.internalLogistics?.unloadingAddress || "TBD"}</span>
                </span>

                {nextGig.internalLogistics?.attire && (
                  <span className="flex items-center gap-1.5 bg-black/20 px-2.5 py-1 rounded-lg border border-white/5">
                    <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                    <span>{nextGig.internalLogistics.attire}</span>
                  </span>
                )}
              </div>
            </div>

            {/* Quick 1-Click RSVP on Spotlight + Action Links */}
            <div className="flex flex-col sm:flex-row lg:flex-col items-stretch gap-2.5 w-full lg:w-auto shrink-0 pt-3 lg:pt-0 border-t lg:border-t-0 border-white/5">
              {/* RSVP status buttons */}
              <div className="bg-black/30 p-2 rounded-xl border border-white/10 space-y-1.5">
                <div className="text-[10px] font-mono uppercase font-bold text-slate-400 flex items-center justify-between">
                  <span>My Spotlight RSVP</span>
                  {userRsvps[nextGig.id] === "attending" && (
                    <span className="text-emerald-400 font-bold">Confirmed In</span>
                  )}
                  {userRsvps[nextGig.id] === "tentative" && (
                    <span className="text-amber-400 font-bold">Tentative</span>
                  )}
                  {userRsvps[nextGig.id] === "declined" && (
                    <span className="text-rose-400 font-bold">Declined</span>
                  )}
                  {!userRsvps[nextGig.id] && (
                    <span className="text-amber-400 font-bold animate-pulse">Required</span>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    disabled={isUpdatingRsvp}
                    onClick={() => handleRsvpChange(nextGig.id, "attending")}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 ${
                      userRsvps[nextGig.id] === "attending"
                        ? "bg-emerald-500 text-slate-950 shadow"
                        : "bg-white/5 hover:bg-emerald-500/20 text-slate-300"
                    }`}
                  >
                    <Check className="w-3 h-3" /> In
                  </button>
                  <button
                    type="button"
                    disabled={isUpdatingRsvp}
                    onClick={() => handleRsvpChange(nextGig.id, "tentative")}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 ${
                      userRsvps[nextGig.id] === "tentative"
                        ? "bg-amber-400 text-slate-950 shadow"
                        : "bg-white/5 hover:bg-amber-400/20 text-slate-300"
                    }`}
                  >
                    <HelpCircle className="w-3 h-3" /> Maybe
                  </button>
                  <button
                    type="button"
                    disabled={isUpdatingRsvp}
                    onClick={() => handleRsvpChange(nextGig.id, "declined")}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 ${
                      userRsvps[nextGig.id] === "declined"
                        ? "bg-rose-500 text-white shadow"
                        : "bg-white/5 hover:bg-rose-500/20 text-slate-300"
                    }`}
                  >
                    <XCircle className="w-3 h-3" /> Out
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <Link
                  href={`/portal/perform/${nextGig.id}`}
                  className="flex-1 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold px-3 py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 transition shadow"
                >
                  <PlaySquare className="w-3.5 h-3.5" />
                  <span>Stage View</span>
                </Link>

                <Link
                  href={`/portal/gigs/${nextGig.id}`}
                  suppressHydrationWarning
                  style={{
                    backgroundColor: "var(--ebb-surface-muted)",
                    borderColor: "var(--ebb-border)",
                  }}
                  className="flex-1 border text-slate-200 hover:text-white px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition"
                >
                  <span>Call Sheet</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Musician Standing & Financial Status Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Metric 1: Performance Attendance Standing */}
        <div
          suppressHydrationWarning
          style={{
            backgroundColor: "var(--ebb-surface)",
            borderColor: "var(--ebb-border)",
          }}
          className="border rounded-2xl p-4 shadow-sm flex items-center justify-between gap-3 transition-colors"
        >
          <div className="space-y-0.5">
            <span className="text-[10px] font-mono uppercase font-bold text-slate-400">
              Season Commitment
            </span>
            <div className="text-sm font-black text-white flex items-center gap-1.5">
              <span>{confirmedCount} / {upcomingGigs.length} Confirmed</span>
            </div>
            <p className="text-[11px] text-slate-400">
              {unansweredGigs.length > 0 ? (
                <span className="text-amber-400 font-bold">{unansweredGigs.length} RSVP(s) pending</span>
              ) : (
                <span className="text-emerald-400 font-semibold">100% responded</span>
              )}
            </p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>

        {/* Metric 2: Gig Distributions & Payouts */}
        <Link
          href="/portal/gigs"
          suppressHydrationWarning
          style={{
            backgroundColor: "var(--ebb-surface)",
            borderColor: "var(--ebb-border)",
          }}
          className="border rounded-2xl p-4 shadow-sm flex items-center justify-between gap-3 transition hover:border-yellow-400/50 group"
        >
          <div className="space-y-0.5">
            <span className="text-[10px] font-mono uppercase font-bold text-slate-400 flex items-center gap-1">
              <span>Gig Earnings</span>
              <ChevronRight className="w-3 h-3 text-slate-500 group-hover:text-yellow-400 transition" />
            </span>
            <div className="text-sm font-black text-white flex items-center gap-1.5">
              <span className="text-emerald-400">${personalEarnings.paid.toFixed(2)}</span>
              <span className="text-xs text-slate-400 font-normal">paid</span>
            </div>
            <p className="text-[11px] text-slate-400">
              {personalEarnings.unpaid > 0 ? (
                <span className="text-yellow-400 font-bold">${personalEarnings.unpaid.toFixed(2)} pending</span>
              ) : (
                "All distributions settled"
              )}
            </p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-yellow-400/10 text-yellow-400 border border-yellow-400/20 flex items-center justify-center shrink-0">
            <DollarSign className="w-4 h-4" />
          </div>
        </Link>

        {/* Metric 3: Expense Reimbursements */}
        <Link
          href="/portal/reimbursements"
          suppressHydrationWarning
          style={{
            backgroundColor: "var(--ebb-surface)",
            borderColor: "var(--ebb-border)",
          }}
          className="border rounded-2xl p-4 shadow-sm flex items-center justify-between gap-3 transition hover:border-emerald-500/50 group"
        >
          <div className="space-y-0.5">
            <span className="text-[10px] font-mono uppercase font-bold text-slate-400 flex items-center gap-1">
              <span>Reimbursements</span>
              <ChevronRight className="w-3 h-3 text-slate-500 group-hover:text-emerald-400 transition" />
            </span>
            <div className="text-sm font-black text-white flex items-center gap-1.5">
              <span className="text-emerald-400">${personalReimbursements.paid.toFixed(2)}</span>
              <span className="text-xs text-slate-400 font-normal">reimbursed</span>
            </div>
            <p className="text-[11px] text-slate-400">
              {personalReimbursements.pending > 0 ? (
                <span className="text-amber-400 font-bold">${personalReimbursements.pending.toFixed(2)} in review</span>
              ) : (
                "No pending claims"
              )}
            </p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0">
            <Receipt className="w-4 h-4" />
          </div>
        </Link>
      </div>

      {/* Unread Broadcast Alert */}
      {unreadNotifications.length > 0 && (
        <div
          suppressHydrationWarning
          style={{
            backgroundColor: "var(--ebb-surface-muted)",
            borderColor: "var(--ebb-border)",
          }}
          className="border border-purple-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md bg-purple-950/20 animate-fadeIn"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-500/15 text-purple-300 border border-purple-500/30 flex items-center justify-center shrink-0">
              <Megaphone className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                <span>
                  Band Broadcast: {unreadNotifications.length} Unread {unreadNotifications.length === 1 ? "Notice" : "Notices"}
                </span>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 font-bold">
                  Dispatch
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5 line-clamp-1">
                Latest: <strong>{unreadNotifications[0].title}</strong> &mdash; {unreadNotifications[0].message}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/portal/notifications"
              className="bg-purple-500 hover:bg-purple-400 text-slate-950 font-bold px-3.5 py-1.5 rounded-xl text-xs flex items-center gap-1 transition shadow"
            >
              <span>View Dispatches</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}

      {/* Inactive Member Notice */}
      {profile?.status === "inactive" && (
        <div className="bg-amber-500/10 border border-amber-500/25 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-amber-200">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl shrink-0 mt-0.5 sm:mt-0">
              <UserMinus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                Membership Inactive
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30">
                  Departed / Inactive
                </span>
              </h2>
              <p className="text-xs text-amber-200/80 mt-1">
                Your account is currently inactive. You are not scheduled for active call sheets or gig distributions. Past attendance and payout records remain preserved.
              </p>
            </div>
          </div>
          <Link
            href="/portal/profile"
            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 transition shrink-0 self-end sm:self-center"
          >
            Review Status
          </Link>
        </div>
      )}

      {/* 4. Thematic & Functional Action Hubs */}
      <div className="space-y-3">
        <div className="px-1 flex items-center justify-between">
          <h2 className="text-xs font-mono uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5" style={{ color: "var(--ebb-primary)" }} /> Musician Functional Hubs
          </h2>
          <span className="text-[11px] text-slate-500">Quick Access Workstations</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Hub 1: Performance & Logistics */}
          <div
            suppressHydrationWarning
            style={{
              backgroundColor: "var(--ebb-surface)",
              borderColor: "var(--ebb-border)",
            }}
            className="border rounded-2xl p-5 shadow flex flex-col justify-between space-y-4 transition-colors"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div
                  suppressHydrationWarning
                  style={{
                    backgroundColor: "var(--ebb-surface-muted)",
                    borderColor: "var(--ebb-border)",
                    color: "var(--ebb-primary)",
                  }}
                  className="w-9 h-9 rounded-xl border flex items-center justify-center shadow-sm"
                >
                  <Calendar className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-mono text-slate-400 uppercase font-bold">
                  Schedule
                </span>
              </div>
              <h3 className="font-extrabold text-sm sm:text-base text-white">
                Performance Logistics
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Coordinate call times, sync live feed to mobile devices, and declare blackout dates.
              </p>
            </div>

            <div className="space-y-1.5 pt-2 border-t border-white/5">
              <Link
                href="/portal/availability"
                className="w-full text-slate-300 hover:text-white p-2 rounded-xl text-xs font-semibold flex items-center justify-between hover:bg-white/5 transition"
              >
                <span className="flex items-center gap-2">
                  <CalendarOff className="w-3.5 h-3.5 text-slate-400" />
                  <span>Blackout Dates Calendar</span>
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
              </Link>

              <button
                type="button"
                onClick={() => setIsCalendarModalOpen(true)}
                className="w-full text-slate-300 hover:text-white p-2 rounded-xl text-xs font-semibold flex items-center justify-between hover:bg-white/5 transition text-left"
              >
                <span className="flex items-center gap-2">
                  <CalendarIcon className="w-3.5 h-3.5 text-slate-400" />
                  <span>Subscribe to iCal / Phone</span>
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
              </button>

              {canManageGigs(profile) && (
                <Link
                  href="/admin/inquiries"
                  className="w-full text-slate-300 hover:text-white p-2 rounded-xl text-xs font-semibold flex items-center justify-between hover:bg-white/5 transition"
                >
                  <span className="flex items-center gap-2">
                    <Inbox className="w-3.5 h-3.5 text-yellow-400" />
                    <span>Client Inquiries Pipeline</span>
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                </Link>
              )}
            </div>
          </div>

          {/* Hub 2: Repertoire & Music Vault */}
          <div
            suppressHydrationWarning
            style={{
              backgroundColor: "var(--ebb-surface)",
              borderColor: "var(--ebb-border)",
            }}
            className="border rounded-2xl p-5 shadow flex flex-col justify-between space-y-4 transition-colors"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div
                  suppressHydrationWarning
                  style={{
                    backgroundColor: "var(--ebb-surface-muted)",
                    borderColor: "var(--ebb-border)",
                    color: "var(--ebb-primary)",
                  }}
                  className="w-9 h-9 rounded-xl border flex items-center justify-center shadow-sm"
                >
                  <Music2 className="w-4 h-4" />
                </div>
                <div className="flex items-center gap-1.5">
                  {tuneCount !== null && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/5 text-yellow-400 border border-white/10 font-bold">
                      {tuneCount} Charts
                    </span>
                  )}
                </div>
              </div>
              <h3 className="font-extrabold text-sm sm:text-base text-white">
                Repertoire &amp; Music Vault
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Access master horn charts, download parts, submit new tunes, and vote on peer suggestions.
              </p>
            </div>

            <div className="space-y-1.5 pt-2 border-t border-white/5">
              <Link
                href="/portal/library"
                className="w-full text-slate-300 hover:text-white p-2 rounded-xl text-xs font-semibold flex items-center justify-between hover:bg-white/5 transition"
              >
                <span className="flex items-center gap-2">
                  <Music className="w-3.5 h-3.5 text-slate-400" />
                  <span>Master Chart Catalog</span>
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
              </Link>

              <Link
                href="/admin/suggestions"
                className="w-full text-slate-300 hover:text-white p-2 rounded-xl text-xs font-semibold flex items-center justify-between hover:bg-white/5 transition"
              >
                <span className="flex items-center gap-2">
                  <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                  <span>Pitch or Vote on Songs</span>
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
              </Link>

              <Link
                href="/portal/library"
                className="w-full text-slate-300 hover:text-white p-2 rounded-xl text-xs font-semibold flex items-center justify-between hover:bg-white/5 transition"
              >
                <span className="flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                  <span>Submit New Arrangement</span>
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
              </Link>
            </div>
          </div>

          {/* Hub 3: Musician Space & Operations */}
          <div
            suppressHydrationWarning
            style={{
              backgroundColor: "var(--ebb-surface)",
              borderColor: "var(--ebb-border)",
            }}
            className="border rounded-2xl p-5 shadow flex flex-col justify-between space-y-4 transition-colors"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div
                  suppressHydrationWarning
                  style={{
                    backgroundColor: "var(--ebb-surface-muted)",
                    borderColor: "var(--ebb-border)",
                    color: "var(--ebb-primary)",
                  }}
                  className="w-9 h-9 rounded-xl border flex items-center justify-center shadow-sm"
                >
                  <Shield className="w-4 h-4" />
                </div>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border font-bold ${
                  profile?.phone && profile?.smsConsent 
                    ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" 
                    : "bg-amber-500/15 text-amber-400 border-amber-500/30"
                }`}>
                  {profile?.phone && profile?.smsConsent ? "SMS Active" : "SMS Pending"}
                </span>
              </div>
              <h3 className="font-extrabold text-sm sm:text-base text-white">
                Operations &amp; Section
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Manage your phone alerts, contact section mates, and customize your portal visual appearance.
              </p>
            </div>

            <div className="space-y-1.5 pt-2 border-t border-white/5">
              <Link
                href="/portal/notifications"
                className="w-full text-slate-300 hover:text-white p-2 rounded-xl text-xs font-semibold flex items-center justify-between hover:bg-white/5 transition"
              >
                <span className="flex items-center gap-2">
                  <Bell className="w-3.5 h-3.5 text-yellow-400" />
                  <span>Notifications &amp; Dispatch Feed</span>
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
              </Link>

              <Link
                href="/portal/profile"
                className="w-full text-slate-300 hover:text-white p-2 rounded-xl text-xs font-semibold flex items-center justify-between hover:bg-white/5 transition"
              >
                <span className="flex items-center gap-2">
                  <Smartphone className="w-3.5 h-3.5 text-slate-400" />
                  <span>SMS Briefings &amp; Phone Setup</span>
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
              </Link>

              <Link
                href="/portal/reimbursements"
                className="w-full text-slate-300 hover:text-white p-2 rounded-xl text-xs font-semibold flex items-center justify-between hover:bg-white/5 transition"
              >
                <span className="flex items-center gap-2">
                  <Receipt className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Expense Reimbursements</span>
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
              </Link>

              <Link
                href="/portal/section"
                className="w-full text-slate-300 hover:text-white p-2 rounded-xl text-xs font-semibold flex items-center justify-between hover:bg-white/5 transition"
              >
                <span className="flex items-center gap-2">
                  <Shield className="w-3.5 h-3.5 text-slate-400" />
                  <span>Section Roster &amp; Contacts</span>
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
              </Link>

              <button
                type="button"
                onClick={() => setIsThemeModalOpen(true)}
                className="w-full text-slate-300 hover:text-white p-2 rounded-xl text-xs font-semibold flex items-center justify-between hover:bg-white/5 transition text-left"
              >
                <span className="flex items-center gap-2">
                  <Palette className="w-3.5 h-3.5 text-slate-400" />
                  <span>Visual Theme Scheme</span>
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Interactive Schedule & Month-View Calendar Grid */}
      <div id="schedule-section" className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <Calendar className="w-4 h-4" style={{ color: "var(--ebb-primary)" }} />
              <span>Upcoming Performance Schedule</span>
            </h2>
            <p className="text-xs text-slate-400">
              Interactive schedule queue and month-view calendar with call times and 1-click RSVP.
            </p>
          </div>
          <Link
            href="/portal/gigs"
            className="text-xs font-bold text-slate-300 hover:text-white flex items-center gap-1 hover:underline"
          >
            <span>View Full Band Calendar</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* 2-Column Responsive Grid: Schedule Queue (Left) + Month Calendar (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left Column: Upcoming Gigs Queue */}
          <div className="lg:col-span-7 space-y-3">
            {upcomingGigs.length === 0 ? (
              <div
                suppressHydrationWarning
                style={{
                  backgroundColor: "var(--ebb-surface)",
                  borderColor: "var(--ebb-border)",
                }}
                className="border rounded-2xl p-8 text-center text-slate-400 text-xs shadow"
              >
                No upcoming gigs currently scheduled. Enjoy the downtime or check back soon!
              </div>
            ) : (
              upcomingGigs.map((gig) => {
                const status = userRsvps[gig.id];
                const title =
                  gig.internalLogistics?.title || gig.publicDetails?.title || "Eagleburger Gig";
                const venue =
                  gig.publicDetails?.venue || gig.internalLogistics?.unloadingAddress || "TBD";
                const callTime = gig.internalLogistics?.callTime || "TBD";
                const downbeat = gig.internalLogistics?.downbeat || "TBD";

                return (
                  <div
                    key={gig.id}
                    suppressHydrationWarning
                    style={{
                      backgroundColor: "var(--ebb-surface)",
                      borderColor: "var(--ebb-border)",
                    }}
                    className="border rounded-2xl p-4 sm:p-5 transition flex flex-col space-y-3 group shadow hover:brightness-105"
                  >
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="space-y-1.5 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            suppressHydrationWarning
                            style={{
                              backgroundColor: "var(--ebb-surface-muted)",
                              borderColor: "var(--ebb-border)",
                              color: "var(--ebb-primary)",
                            }}
                            className="text-xs font-mono font-bold px-2 py-0.5 rounded border"
                          >
                            {gig.date}
                          </span>
                          <Link
                            href={`/portal/gigs/${gig.id}`}
                            className="text-sm font-bold text-white hover:text-yellow-400 transition truncate"
                          >
                            {title}
                          </Link>
                        </div>

                        <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-xs text-slate-400">
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

                      {/* Call Sheet & Stage View links */}
                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                        <Link
                          href={`/portal/perform/${gig.id}`}
                          className="bg-slate-950 hover:bg-slate-800 text-yellow-400 border border-slate-800 hover:border-yellow-400/40 p-2 rounded-xl text-xs font-bold flex items-center gap-1 transition"
                          title="Launch Stage Teleprompter"
                        >
                          <PlaySquare className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Stage View</span>
                        </Link>

                        <Link
                          href={`/portal/gigs/${gig.id}`}
                          className="text-slate-400 hover:text-white transition flex items-center gap-0.5 text-xs font-semibold p-1.5"
                        >
                          <span>Call Sheet</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>

                    {/* In-Line 1-Click RSVP Quick Action Bar */}
                    <div className="pt-2 border-t border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-400 text-[11px] font-mono">My RSVP:</span>
                        {status === "attending" && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-lg">
                            <CheckCircle2 className="w-3 h-3" /> Confirmed In
                          </span>
                        )}
                        {status === "declined" && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-lg">
                            <XCircle className="w-3 h-3" /> Out
                          </span>
                        )}
                        {status === "tentative" && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-lg">
                            <HelpCircle className="w-3 h-3" /> Tentative
                          </span>
                        )}
                        {!status && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-lg animate-pulse">
                            RSVP Needed
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          disabled={isUpdatingRsvp}
                          onClick={() => handleRsvpChange(gig.id, "attending")}
                          className={`px-2 py-1 rounded-lg text-[11px] font-bold transition flex items-center gap-1 ${
                            status === "attending"
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                              : "bg-white/5 hover:bg-emerald-500/10 text-slate-400 hover:text-emerald-300"
                          }`}
                        >
                          <Check className="w-3 h-3 text-emerald-400" /> In
                        </button>
                        <button
                          type="button"
                          disabled={isUpdatingRsvp}
                          onClick={() => handleRsvpChange(gig.id, "tentative")}
                          className={`px-2 py-1 rounded-lg text-[11px] font-bold transition flex items-center gap-1 ${
                            status === "tentative"
                              ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                              : "bg-white/5 hover:bg-amber-500/10 text-slate-400 hover:text-amber-300"
                          }`}
                        >
                          <HelpCircle className="w-3 h-3 text-amber-400" /> Maybe
                        </button>
                        <button
                          type="button"
                          disabled={isUpdatingRsvp}
                          onClick={() => handleRsvpChange(gig.id, "declined")}
                          className={`px-2 py-1 rounded-lg text-[11px] font-bold transition flex items-center gap-1 ${
                            status === "declined"
                              ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                              : "bg-white/5 hover:bg-rose-500/10 text-slate-400 hover:text-rose-300"
                          }`}
                        >
                          <XCircle className="w-3 h-3 text-rose-400" /> Out
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Right Column: Month-View Calendar Widget */}
          <div className="lg:col-span-5">
            <PortalMonthCalendar
              gigs={gigs}
              userRsvps={userRsvps}
              onRsvpChange={handleRsvpChange}
              isUpdatingRsvp={isUpdatingRsvp}
            />
          </div>
        </div>
      </div>

      {/* 6. Member Analytics & Season Record Card */}
      <MemberAnalyticsCard
        profile={profile}
        gigs={gigs}
        userRsvps={userRsvps}
        earnings={personalEarnings}
        tuneCount={tuneCount}
        suggestionCount={suggestionCount}
      />

      {/* 7. Musician PWA Status & Installation Card (Bottom Section) */}
      <PortalPwaCard />

      {/* Modal Launches */}
      <CalendarSubscribeModal
        isOpen={isCalendarModalOpen}
        onClose={() => setIsCalendarModalOpen(false)}
      />

      <PortalThemeModal
        isOpen={isThemeModalOpen}
        onClose={() => setIsThemeModalOpen(false)}
      />
    </div>
  );
}