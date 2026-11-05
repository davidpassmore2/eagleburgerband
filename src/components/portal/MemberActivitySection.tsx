"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { Suggestion } from "@/lib/schema/suggestion";
import { Donation } from "@/lib/schema/donation";
import { Reimbursement } from "@/lib/schema/reimbursement";
import { Comment } from "@/lib/schema/comment";
import { useUserBlackouts } from "@/lib/portal/useUserBlackouts";
import {
  Sparkles,
  Lightbulb,
  HeartHandshake,
  Gift,
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
  CalendarOff,
  Receipt,
  MessageSquare,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Activity,
  ArrowRight,
} from "lucide-react";

export type ActivityItemType = "suggestion" | "cause" | "rsvp" | "reimbursement" | "blackout" | "comment";

export interface ActivityItem {
  id: string;
  type: ActivityItemType;
  categoryGroup: "suggestions" | "causes" | "actions";
  title: string;
  subtitle?: string;
  statusLabel: string;
  statusColor: string;
  timestamp: string; // ISO string for sorting
  href: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
}

interface MemberActivitySectionProps {
  uid: string;
  gigs?: {
    id: string;
    date: string;
    status: string;
    internalLogistics?: { title?: string; callTime?: string };
    publicDetails?: { title?: string; venue?: string };
  }[];
  userRsvps?: Record<string, string | null>;
}

function formatRelativeTime(dateStr: string): string {
  if (!dateStr) return "";
  try {
    const time = new Date(dateStr).getTime();
    if (isNaN(time)) return dateStr;
    const diffMs = Date.now() - time;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHours = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSec < 60) return "Just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;

    return new Date(dateStr).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export default function MemberActivitySection({
  uid,
  gigs = [],
  userRsvps = {},
}: MemberActivitySectionProps) {
  const [activeFilter, setActiveFilter] = useState<"all" | "suggestions" | "causes" | "actions">("all");
  const [isExpanded, setIsExpanded] = useState(false);

  // Firestore listener states
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [causes, setCauses] = useState<Donation[]>([]);
  const [reimbursements, setReimbursements] = useState<Reimbursement[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const { blackouts } = useUserBlackouts();

  // 1. Listen to member's song/tune suggestions
  useEffect(() => {
    if (!uid) return;
    const q = query(collection(db, "suggestions"), where("authorUid", "==", uid));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list: Suggestion[] = [];
        snap.forEach((d) => {
          list.push({ id: d.id, ...d.data() } as Suggestion);
        });
        setSuggestions(list);
      },
      (err) => console.warn("Notice: MemberActivity suggestions subscriber note:", err)
    );
    return () => unsub();
  }, [uid]);

  // 2. Listen to member's charitable cause suggestions
  useEffect(() => {
    if (!uid) return;
    const q = query(collection(db, "donations"), where("suggestedByUid", "==", uid));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list: Donation[] = [];
        snap.forEach((d) => {
          list.push({ id: d.id, ...d.data() } as Donation);
        });
        setCauses(list);
      },
      (err) => console.warn("Notice: MemberActivity causes subscriber note:", err)
    );
    return () => unsub();
  }, [uid]);

  // 3. Listen to member's expense reimbursements
  useEffect(() => {
    if (!uid) return;
    const q = query(collection(db, "reimbursements"), where("applicantUid", "==", uid));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list: Reimbursement[] = [];
        snap.forEach((d) => {
          list.push({ id: d.id, ...d.data() } as Reimbursement);
        });
        setReimbursements(list);
      },
      (err) => console.warn("Notice: MemberActivity reimbursements subscriber note:", err)
    );
    return () => unsub();
  }, [uid]);

  // 4. Listen to member's discussion comments
  useEffect(() => {
    if (!uid) return;
    const q = query(collection(db, "comments"), where("authorUid", "==", uid));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list: Comment[] = [];
        snap.forEach((d) => {
          list.push({ id: d.id, ...d.data() } as Comment);
        });
        setComments(list);
      },
      (err) => console.warn("Notice: MemberActivity comments subscriber note:", err)
    );
    return () => unsub();
  }, [uid]);

  // Synthesize Unified Activity Feed
  const allActivities = useMemo<ActivityItem[]>(() => {
    const feed: ActivityItem[] = [];

    // Map Song Suggestions
    suggestions.forEach((sug) => {
      let statusColor = "bg-amber-500/15 text-amber-300 border-amber-500/30";
      let statusLabel = "Submitted";
      if (sug.status === "accepted" || sug.status === "approved") {
        statusColor = "bg-emerald-500/15 text-emerald-300 border-emerald-500/30";
        statusLabel = "Accepted";
      } else if (sug.status === "implemented") {
        statusColor = "bg-purple-500/15 text-purple-300 border-purple-500/30";
        statusLabel = "Implemented";
      } else if (sug.status === "declined" || sug.status === "shelved") {
        statusColor = "bg-rose-500/15 text-rose-300 border-rose-500/30";
        statusLabel = "Declined";
      } else if (sug.status === "under_review" || sug.status === "in_review") {
        statusColor = "bg-blue-500/15 text-blue-300 border-blue-500/30";
        statusLabel = "In Review";
      }

      feed.push({
        id: `sug_${sug.id}`,
        type: "suggestion",
        categoryGroup: "suggestions",
        title: `Pitched Song: "${sug.title}"`,
        subtitle: sug.originalArtist ? `Artist: ${sug.originalArtist}` : sug.description || undefined,
        statusLabel,
        statusColor,
        timestamp: sug.createdAt || sug.updatedAt || new Date().toISOString(),
        href: "/admin/suggestions",
        icon: Lightbulb,
        iconBg: "bg-amber-500/10 border-amber-500/25",
        iconColor: "text-amber-400",
      });
    });

    // Map Charitable Causes
    causes.forEach((cause) => {
      const isCompleted = cause.status === "completed";
      feed.push({
        id: `cause_${cause.id}`,
        type: "cause",
        categoryGroup: "causes",
        title: `Band Gift Suggestion: ${cause.organizationName}`,
        subtitle: isCompleted
          ? `Awarded Band Gift of $${cause.amount.toFixed(2)}${cause.giftsGivenCount ? ` (${cause.giftsGivenCount} gifts)` : ""}`
          : cause.targetAmount > 0
          ? `Proposed Gift Amount: $${cause.targetAmount.toLocaleString()} • ${cause.causeDescription || "Awaiting member priority voting"}`
          : cause.causeDescription || "Awaiting member priority voting",
        statusLabel: isCompleted ? "Band Gift Awarded" : "Voting Queue",
        statusColor: isCompleted
          ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
          : "bg-yellow-400/15 text-yellow-300 border-yellow-400/30",
        timestamp: cause.createdAt || cause.updatedAt || new Date().toISOString(),
        href: "/portal/finance?tab=giving",
        icon: HeartHandshake,
        iconBg: "bg-purple-500/10 border-purple-500/25",
        iconColor: "text-purple-400",
      });
    });

    // Map Gig RSVPs (from props gigs + userRsvps)
    gigs.forEach((gig) => {
      const rsvp = userRsvps[gig.id];
      if (!rsvp) return;

      const gigTitle = gig.internalLogistics?.title || gig.publicDetails?.title || `Gig on ${gig.date}`;
      let statusLabel = "Attending";
      let statusColor = "bg-emerald-500/15 text-emerald-300 border-emerald-500/30";
      let icon = CheckCircle2;
      let iconColor = "text-emerald-400";
      let iconBg = "bg-emerald-500/10 border-emerald-500/25";

      if (rsvp === "declined") {
        statusLabel = "Declined";
        statusColor = "bg-rose-500/15 text-rose-300 border-rose-500/30";
        icon = XCircle;
        iconColor = "text-rose-400";
        iconBg = "bg-rose-500/10 border-rose-500/25";
      } else if (rsvp === "tentative" || rsvp === "probable") {
        statusLabel = "Tentative";
        statusColor = "bg-amber-500/15 text-amber-300 border-amber-500/30";
        icon = Clock;
        iconColor = "text-amber-400";
        iconBg = "bg-amber-500/10 border-amber-500/25";
      }

      feed.push({
        id: `rsvp_${gig.id}`,
        type: "rsvp",
        categoryGroup: "actions",
        title: `RSVP: ${statusLabel} for ${gigTitle}`,
        subtitle: `Performance Date: ${gig.date}${gig.internalLogistics?.callTime ? ` • Call Time: ${gig.internalLogistics.callTime}` : ""}`,
        statusLabel,
        statusColor,
        timestamp: gig.date, // Gigs are dated
        href: `/portal/gigs/${gig.id}`,
        icon,
        iconBg,
        iconColor,
      });
    });

    // Map Expense Reimbursements
    reimbursements.forEach((rem) => {
      let statusColor = "bg-amber-500/15 text-amber-300 border-amber-500/30";
      let statusLabel = "Submitted";
      if (rem.status === "paid") {
        statusColor = "bg-emerald-500/15 text-emerald-300 border-emerald-500/30";
        statusLabel = "Paid";
      } else if (rem.status === "approved") {
        statusColor = "bg-blue-500/15 text-blue-300 border-blue-500/30";
        statusLabel = "Approved";
      } else if (rem.status === "rejected") {
        statusColor = "bg-rose-500/15 text-rose-300 border-rose-500/30";
        statusLabel = "Rejected";
      }

      feed.push({
        id: `rem_${rem.id}`,
        type: "reimbursement",
        categoryGroup: "actions",
        title: `Expense Claim: $${rem.amount.toFixed(2)}`,
        subtitle: `${rem.description} • Paid via ${rem.paymentMethod.toUpperCase()}`,
        statusLabel,
        statusColor,
        timestamp: rem.createdAt || rem.expenseDate || new Date().toISOString(),
        href: "/portal/reimbursements",
        icon: Receipt,
        iconBg: "bg-emerald-500/10 border-emerald-500/25",
        iconColor: "text-emerald-400",
      });
    });

    // Map Blackout Dates
    blackouts.forEach((bo) => {
      feed.push({
        id: `bo_${bo.id}`,
        type: "blackout",
        categoryGroup: "actions",
        title: `Declared Blackout: ${bo.startDate} to ${bo.endDate}`,
        subtitle: bo.reason ? `Reason: ${bo.reason}` : "Marked unavailable for performances",
        statusLabel: "Unavailable",
        statusColor: "bg-slate-800 text-slate-300 border-slate-700",
        timestamp: bo.createdAt || bo.startDate || new Date().toISOString(),
        href: "/portal/availability",
        icon: CalendarOff,
        iconBg: "bg-slate-800/60 border-slate-700/60",
        iconColor: "text-slate-400",
      });
    });

    // Map Comments
    comments.forEach((cm) => {
      feed.push({
        id: `cm_${cm.id}`,
        type: "comment",
        categoryGroup: "actions",
        title: `Posted Comment on ${cm.targetType.replace(/_/g, " ")}`,
        subtitle: `"${cm.content.length > 75 ? cm.content.slice(0, 75) + "…" : cm.content}"`,
        statusLabel: "Commented",
        statusColor: "bg-sky-500/15 text-sky-300 border-sky-500/30",
        timestamp: cm.createdAt || new Date().toISOString(),
        href: cm.targetType === "cause" ? "/portal/finance?tab=giving" : cm.targetType === "gig" ? `/portal/gigs/${cm.targetId}` : "/portal/library",
        icon: MessageSquare,
        iconBg: "bg-sky-500/10 border-sky-500/25",
        iconColor: "text-sky-400",
      });
    });

    // Sort newest to oldest
    feed.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return feed;
  }, [suggestions, causes, gigs, userRsvps, reimbursements, blackouts, comments]);

  // Counts per filter category
  const counts = useMemo(() => {
    return {
      all: allActivities.length,
      suggestions: allActivities.filter((a) => a.categoryGroup === "suggestions").length,
      causes: allActivities.filter((a) => a.categoryGroup === "causes").length,
      actions: allActivities.filter((a) => a.categoryGroup === "actions").length,
    };
  }, [allActivities]);

  // Filtered view
  const filteredActivities = useMemo(() => {
    if (activeFilter === "all") return allActivities;
    return allActivities.filter((item) => item.categoryGroup === activeFilter);
  }, [allActivities, activeFilter]);

  const visibleActivities = isExpanded ? filteredActivities : filteredActivities.slice(0, 6);

  return (
    <div
      suppressHydrationWarning
      style={{
        backgroundColor: "var(--ebb-surface)",
        borderColor: "var(--ebb-border)",
      }}
      className="border rounded-2xl p-5 sm:p-6 shadow-xl space-y-5 transition-colors"
    >
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/5">
        <div>
          <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
            <Activity className="w-4 h-4 text-yellow-400" />
            <span>My Activity</span>
            {counts.all > 0 && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-yellow-400/15 text-yellow-300 border border-yellow-400/30 font-bold">
                {counts.all}
              </span>
            )}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Your personal history of song pitches, cause suggestions, and band participation.
          </p>
        </div>

        {/* Quick Action Navigation Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href="/admin/suggestions"
            className="px-3 py-1.5 rounded-xl bg-yellow-400/15 hover:bg-yellow-400/25 text-yellow-300 border border-yellow-400/30 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <Lightbulb className="w-3.5 h-3.5 text-yellow-400" />
            <span>Pitch a Song</span>
          </Link>

          <Link
            href="/portal/finance?tab=giving"
            className="px-3 py-1.5 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/30 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <HeartHandshake className="w-3.5 h-3.5 text-purple-400" />
            <span>Suggest Band Gift</span>
          </Link>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          type="button"
          onClick={() => {
            setActiveFilter("all");
            setIsExpanded(false);
          }}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 border ${
            activeFilter === "all"
              ? "bg-yellow-400 text-slate-950 border-yellow-400 shadow-sm"
              : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
          }`}
        >
          All Activity ({counts.all})
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveFilter("suggestions");
            setIsExpanded(false);
          }}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 border ${
            activeFilter === "suggestions"
              ? "bg-yellow-400 text-slate-950 border-yellow-400 shadow-sm"
              : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
          }`}
        >
          Song Pitches ({counts.suggestions})
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveFilter("causes");
            setIsExpanded(false);
          }}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 border ${
            activeFilter === "causes"
              ? "bg-yellow-400 text-slate-950 border-yellow-400 shadow-sm"
              : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
          }`}
        >
          Band Gifts Suggested ({counts.causes})
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveFilter("actions");
            setIsExpanded(false);
          }}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 border ${
            activeFilter === "actions"
              ? "bg-yellow-400 text-slate-950 border-yellow-400 shadow-sm"
              : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
          }`}
        >
          Actions &amp; RSVPs ({counts.actions})
        </button>
      </div>

      {/* Activity Timeline List */}
      {filteredActivities.length === 0 ? (
        <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-8 text-center space-y-3">
          <Activity className="w-8 h-8 mx-auto text-slate-600" />
          <div className="text-sm font-bold text-white">No activity found in this category</div>
          <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
            {activeFilter === "suggestions"
              ? "You haven't pitched any songs or tunes yet. Have a great melody or arrangement idea for the band? Pitch one to the catalog!"
              : activeFilter === "causes"
              ? "You haven't suggested any Band Gifts yet. Know an inspiring Pittsburgh non-profit or grassroots project? Suggest a Band Gift for the band to support!"
              : activeFilter === "actions"
              ? "No recent RSVP actions, expense reimbursements, or blackout dates recorded."
              : "Get active in the band! Pitch song ideas, champion grassroots causes, and keep your gig RSVPs up to date."}
          </p>
          <div className="pt-2 flex items-center justify-center gap-3">
            {activeFilter === "suggestions" ? (
              <Link
                href="/admin/suggestions"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold text-xs uppercase tracking-wider transition"
              >
                <span>Pitch a Song Now</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            ) : activeFilter === "causes" ? (
              <Link
                href="/portal/finance?tab=giving"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-500 hover:bg-purple-400 text-white font-bold text-xs uppercase tracking-wider transition"
              >
                <span>Suggest a Band Gift</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            ) : (
              <a
                href="#schedule-section"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold text-xs uppercase tracking-wider transition"
              >
                <span>Check Gig Schedule</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-2.5">
          {visibleActivities.map((item) => {
            const Icon = item.icon;
            const formattedTime = formatRelativeTime(item.timestamp);

            return (
              <Link
                key={item.id}
                href={item.href}
                className="p-3.5 sm:p-4 rounded-xl bg-slate-950/80 hover:bg-slate-900 border border-slate-800/80 hover:border-slate-700 transition flex items-center justify-between gap-4 group block"
              >
                <div className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
                  {/* Category Icon */}
                  <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 mt-0.5 sm:mt-0 ${item.iconBg} ${item.iconColor}`}>
                    <Icon className="w-4 h-4" />
                  </div>

                  {/* Title & Subtitle */}
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs sm:text-sm font-bold text-white group-hover:text-yellow-400 transition-colors truncate">
                        {item.title}
                      </span>
                    </div>

                    {item.subtitle && (
                      <p className="text-[11px] sm:text-xs text-slate-400 truncate leading-relaxed">
                        {item.subtitle}
                      </p>
                    )}
                  </div>
                </div>

                {/* Right: Status Pill & Timestamp */}
                <div className="flex items-center gap-3 shrink-0 text-right">
                  <div className="flex flex-col items-end gap-1">
                    <span className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full border uppercase font-bold ${item.statusColor}`}>
                      {item.statusLabel}
                    </span>
                    {formattedTime && (
                      <span className="text-[10px] font-mono text-slate-500">
                        {formattedTime}
                      </span>
                    )}
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-yellow-400 transition-colors hidden sm:block" />
                </div>
              </Link>
            );
          })}

          {/* Show More / Show Less Toggle */}
          {filteredActivities.length > 6 && (
            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => setIsExpanded((prev) => !prev)}
                className="px-4 py-2 rounded-xl bg-slate-950 hover:bg-slate-900 border border-slate-800 text-xs font-bold text-slate-300 hover:text-white transition inline-flex items-center gap-1.5 cursor-pointer"
              >
                {isExpanded ? (
                  <>
                    <ChevronUp className="w-3.5 h-3.5" />
                    <span>Show Less</span>
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-3.5 h-3.5" />
                    <span>Show All {filteredActivities.length} Activities</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
