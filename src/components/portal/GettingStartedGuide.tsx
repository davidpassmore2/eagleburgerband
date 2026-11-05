"use client";

import React, { useSyncExternalStore } from "react";
import Link from "next/link";
import {
  Compass,
  ChevronDown,
  ChevronUp,
  User,
  Calendar,
  CalendarOff,
  Music,
  HeartHandshake,
  Receipt,
  ArrowRight,
  Sparkles,
  CheckCircle2,
} from "lucide-react";

interface GuideTopic {
  id: string;
  title: string;
  category: string;
  icon: React.ComponentType<{ className?: string }>;
  accentColor: string;
  badge: string;
  summary: string;
  actions: string[];
  linkHref: string;
  linkLabel: string;
}

const GUIDE_TOPICS: GuideTopic[] = [
  {
    id: "profile-contact",
    title: "Profile, Contacts & T-Shirt",
    category: "Step 1: Your Info",
    icon: User,
    accentColor: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    badge: "Essential",
    summary:
      "Keep your musician dossier current so gig managers, section leaders, and quartermasters have what they need.",
    actions: [
      "Fill out display name, instruments, and bio",
      "Enter your phone number & enable SMS dispatch alerts",
      "Set your band t-shirt & merchandise size for uniform orders",
      "Add emergency contact and dietary preferences",
    ],
    linkHref: "/portal/profile",
    linkLabel: "Edit My Profile & Sizing",
  },
  {
    id: "gigs-attendance",
    title: "Gigs, Rehearsals & Attendance",
    category: "Step 2: Commitments",
    icon: Calendar,
    accentColor: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    badge: "Core Duty",
    summary:
      "Never miss a downbeat. Review calls, check section quorum, and submit fast 1-click RSVPs.",
    actions: [
      "Submit 1-click RSVPs (In, Probable, Maybe, Out) for upcoming gigs",
      "Inspect live Call Sheets with load-in times, downbeat & venue maps",
      "Review rehearsal schedules and soundcheck agendas",
      "Launch day-of roll call kiosks when arriving at show sites",
    ],
    linkHref: "/portal/gigs",
    linkLabel: "View Upcoming Gigs",
  },
  {
    id: "calendar-blackouts",
    title: "Calendar Sync & Blackouts",
    category: "Step 3: Availability",
    icon: CalendarOff,
    accentColor: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    badge: "Scheduling",
    summary:
      "Sync band events to your personal phone calendar and declare blackout windows before rosters finalize.",
    actions: [
      "Subscribe your phone/Google Calendar/iCal to live gig feeds",
      "Declare blackout dates in advance for vacations and conflicts",
      "Prevent scheduling surprises before gigs are booked",
      "Submit seasonal hiatus requests if stepping away temporarily",
    ],
    linkHref: "/portal/availability",
    linkLabel: "Manage Blackout Dates",
  },
  {
    id: "music-catalog",
    title: "Song Catalog & Music Pitches",
    category: "Step 4: Repertoire",
    icon: Music,
    accentColor: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
    badge: "Creative",
    summary:
      "Explore the band's repertoire library and pitch fresh arrangements or crowd favorites.",
    actions: [
      "Access sheet music, charts, and instrument parts",
      "Listen to practice reference audio tracks and study setlists",
      "Pitch new song suggestions to the band catalog review queue",
      "Engage in arrangement discussions with fellow musicians",
    ],
    linkHref: "/portal/music",
    linkLabel: "Explore Music Catalog",
  },
  {
    id: "giving-voting",
    title: "Band Gifts & Member Voting",
    category: "Step 5: Community",
    icon: HeartHandshake,
    accentColor: "text-purple-400 bg-purple-500/10 border-purple-500/20",
    badge: "Philanthropy",
    summary:
      "Direct the band's charitable giving toward grassroots Pittsburgh non-profits and community causes.",
    actions: [
      "Suggest local causes and charitable organizations for Band Gifts",
      "Cast your 1–10 priority ranking votes on member cause proposals",
      "Leave comments, reply to discussions, and like suggestions",
      "Track completed Band Gifts and public community contributions",
    ],
    linkHref: "/portal/finance?tab=giving",
    linkLabel: "Suggest & Vote on Band Gifts",
  },
  {
    id: "expenses-treasury",
    title: "Expense Claims & Reimbursements",
    category: "Step 6: Treasury",
    icon: Receipt,
    accentColor: "text-rose-400 bg-rose-500/10 border-rose-500/20",
    badge: "Finance",
    summary:
      "Get paid back swiftly for approved out-of-pocket band expenses like repairs, travel fuel, or food.",
    actions: [
      "Submit expense claims with photo receipts or digital invoices",
      "Track review status (Submitted, Approved, Paid) in real-time",
      "Receive direct reimbursements via Venmo, PayPal, Zelle, or Check",
      "Withdraw or edit pending reimbursement claims at any time",
    ],
    linkHref: "/portal/finance?tab=reimbursements",
    linkLabel: "Submit Expense Claim",
  },
];

function subscribeGuideState(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("ebb_guide_toggle", callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener("ebb_guide_toggle", callback);
    window.removeEventListener("storage", callback);
  };
}

function getGuideSnapshot() {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem("ebb_member_guide_open") === "true";
  } catch {
    return false;
  }
}

function getServerGuideSnapshot() {
  return false;
}

export default function GettingStartedGuide() {
  const isOpen = useSyncExternalStore(
    subscribeGuideState,
    getGuideSnapshot,
    getServerGuideSnapshot
  );

  const toggleOpen = () => {
    const nextState = !isOpen;
    try {
      localStorage.setItem("ebb_member_guide_open", String(nextState));
      window.dispatchEvent(new Event("ebb_guide_toggle"));
    } catch {
      // Ignore storage errors
    }
  };

  return (
    <div
      suppressHydrationWarning
      style={{
        backgroundColor: "var(--ebb-surface)",
        borderColor: "var(--ebb-border)",
      }}
      className="border rounded-2xl shadow-xl transition-all duration-300 overflow-hidden"
    >
      {/* Header Bar / Toggle Header */}
      <div
        onClick={toggleOpen}
        className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 cursor-pointer hover:bg-white/[0.02] transition select-none"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div
            suppressHydrationWarning
            style={{
              backgroundColor: "var(--ebb-surface-muted)",
              borderColor: "var(--ebb-border)",
              color: "var(--ebb-primary)",
            }}
            className="w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 shadow-sm"
          >
            <Compass className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm sm:text-base font-extrabold text-white truncate">
                Member Getting Started Guide
              </h2>
              <span className="text-[10px] font-mono uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-yellow-400/15 text-yellow-300 border border-yellow-400/30">
                Workstation Orientation
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">
              Essential guide for all band members: profiles, gigs, calendar sync, blackouts, song pitches, giving &amp; reimbursements.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center shrink-0 pt-1 sm:pt-0">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleOpen();
            }}
            suppressHydrationWarning
            style={{
              backgroundColor: "var(--ebb-surface-muted)",
              borderColor: "var(--ebb-border)",
            }}
            className="px-3 py-1.5 rounded-xl border text-xs font-bold text-slate-300 hover:text-white transition flex items-center gap-1.5 shadow-sm"
            aria-expanded={isOpen}
          >
            <span>{isOpen ? "Hide Guide" : "Explore Guide"}</span>
            {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Expanded Content Grid */}
      {isOpen && (
        <div className="p-4 sm:p-6 border-t border-white/5 space-y-6 animate-fadeIn">
          {/* Quick Welcome Callout */}
          <div
            suppressHydrationWarning
            style={{
              backgroundColor: "var(--ebb-surface-muted)",
              borderColor: "var(--ebb-border)",
            }}
            className="border rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
          >
            <div className="space-y-1">
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" style={{ color: "var(--ebb-primary)" }} />
                <span>Welcome to the Eagleburger Band Musician Workstation!</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                As a member, you have direct tools to participate in rehearsals, pitch music, vote on band contributions, and keep your schedule synchronized. Follow the six core activities below:
              </p>
            </div>
          </div>

          {/* 6-Card Responsive Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {GUIDE_TOPICS.map((topic) => {
              const IconComponent = topic.icon;
              return (
                <div
                  key={topic.id}
                  suppressHydrationWarning
                  style={{
                    backgroundColor: "var(--ebb-surface-muted)",
                    borderColor: "var(--ebb-border)",
                  }}
                  className="border rounded-2xl p-4 sm:p-5 flex flex-col justify-between space-y-4 hover:border-slate-700 transition shadow-sm group"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div
                        className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${topic.accentColor}`}
                      >
                        <IconComponent className="w-4 h-4" />
                      </div>
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded border border-white/10 bg-white/5 text-slate-400">
                        {topic.badge}
                      </span>
                    </div>

                    <div>
                      <div className="text-[11px] font-mono text-slate-400 uppercase font-bold tracking-wider">
                        {topic.category}
                      </div>
                      <h3 className="text-sm sm:text-base font-bold text-white mt-0.5">
                        {topic.title}
                      </h3>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                        {topic.summary}
                      </p>
                    </div>

                    {/* Bullet Points */}
                    <div className="space-y-1.5 pt-2 border-t border-white/5">
                      {topic.actions.map((act, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs text-slate-300">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                          <span className="leading-tight">{act}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Action Link Button */}
                  <div className="pt-3 border-t border-white/5">
                    <Link
                      href={topic.linkHref}
                      className="w-full text-xs font-bold py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-white flex items-center justify-between transition group-hover:text-yellow-400"
                    >
                      <span>{topic.linkLabel}</span>
                      <ArrowRight className="w-3.5 h-3.5 transition group-hover:translate-x-0.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer Assistance Note */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 text-xs text-slate-400 border-t border-white/5">
            <span>
              Need section guidance or instrument assistance? Reach out to your section leader in the roster.
            </span>
            <Link
              href="/portal/section"
              className="text-xs font-bold text-yellow-400 hover:text-yellow-300 flex items-center gap-1 hover:underline shrink-0"
            >
              <span>View Section Contacts</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
