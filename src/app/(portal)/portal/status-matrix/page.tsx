"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import PortalBreadcrumb from "@/components/portal/PortalBreadcrumb";
import {
  Workflow,
  Layers,
  Calendar,
  CalendarOff,
  UserCheck,
  CheckCircle2,
  HelpCircle,
  XCircle,
  AlertCircle,
  Clock,
  Sparkles,
  ArrowRight,
  Search,
  Check,
  Palmtree,
  Send,
  Users,
  ShieldCheck,
  Flame,
  Info,
  ChevronRight,
  ExternalLink,
  Calculator,
  Sliders,
  Bell,
  Archive,
  RefreshCw,
} from "lucide-react";

export type MatrixTab =
  | "all"
  | "lifecycle"
  | "leads"
  | "gigs"
  | "rsvps"
  | "members"
  | "automation"
  | "calculator";

interface StatusDefinition {
  code: string;
  label: string;
  category: "lead" | "gig" | "rsvp" | "member";
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  phase: string;
  actor: string;
  summary: string;
  impact: string;
  nextSteps: string;
  automation?: string;
}

const STATUS_DATA: StatusDefinition[] = [
  // --- LEAD STATUSES ---
  {
    code: "new",
    label: "New",
    category: "lead",
    badgeBg: "rgba(59, 130, 246, 0.15)",
    badgeBorder: "rgba(59, 130, 246, 0.4)",
    badgeText: "#60a5fa",
    phase: "Intake & Proposal",
    actor: "Public Host / Manager / Member",
    summary: "Freshly submitted booking inquiry or suggested performance opportunity awaiting review.",
    impact: "Unreviewed by band management. No musician notifications or calendar holds.",
    nextSteps: "Gig manager evaluates date viability, logistics, and band schedule.",
    automation: "Manager alert sent on submission via booking intake form.",
  },
  {
    code: "reviewing",
    label: "Reviewing",
    category: "lead",
    badgeBg: "rgba(234, 179, 8, 0.15)",
    badgeBorder: "rgba(234, 179, 8, 0.4)",
    badgeText: "#facc15",
    phase: "Evaluation",
    actor: "Gig Manager / Leadership",
    summary: "Manager is actively assessing venue, downbeat, compensation, and calendar fit.",
    impact: "Active inquiry undergoing logistical diligence. Band schedule hold pending.",
    nextSteps: "Gig manager reaches out to the client or generates a performance quote.",
  },
  {
    code: "contacted",
    label: "Contacted",
    category: "lead",
    badgeBg: "rgba(168, 85, 247, 0.15)",
    badgeBorder: "rgba(168, 85, 247, 0.4)",
    badgeText: "#c084fc",
    phase: "Client Dialogue",
    actor: "Gig Manager",
    summary: "Initial dialogue established with event organizer to align on call time and compensation.",
    impact: "Client response awaited before drafting firm performance terms.",
    nextSteps: "Send formal financial quote or convert if details are settled.",
  },
  {
    code: "quoted",
    label: "Quoted",
    category: "lead",
    badgeBg: "rgba(14, 165, 233, 0.15)",
    badgeBorder: "rgba(14, 165, 233, 0.4)",
    badgeText: "#38bdf8",
    phase: "Negotiation",
    actor: "Gig Manager / Treasurer",
    summary: "Official compensation quote and contractual requirements delivered to the event organizer.",
    impact: "Awaiting client agreement or contract signature.",
    nextSteps: "Upon agreement, manager converts lead into an active band gig.",
  },
  {
    code: "converted",
    label: "Converted",
    category: "lead",
    badgeBg: "rgba(34, 197, 94, 0.15)",
    badgeBorder: "rgba(34, 197, 94, 0.4)",
    badgeText: "#4ade80",
    phase: "Handoff to Production",
    actor: "Gig Manager",
    summary: "Lead has successfully transitioned into a full Performance record on the band calendar.",
    impact: "Lead is finalized. A linked Gig record is created with draft/tentative status.",
    nextSteps: "Band musicians are queried for availability via automated dispatch.",
    automation: "Initial availability dispatch automatically triggered to active non-blackout members.",
  },
  {
    code: "declined",
    label: "Declined",
    category: "lead",
    badgeBg: "rgba(239, 68, 68, 0.15)",
    badgeBorder: "rgba(239, 68, 68, 0.4)",
    badgeText: "#f87171",
    phase: "Closed",
    actor: "Gig Manager / Client",
    summary: "Lead was declined due to scheduling conflict, inadequate budget, or client withdrawal.",
    impact: "Archived in Booking Leads CRM. No further action taken.",
    nextSteps: "Opportunity archived for year-end reporting and CRM history.",
  },

  // --- GIG STATUSES ---
  {
    code: "lead / draft",
    label: "Lead / Draft",
    category: "gig",
    badgeBg: "rgba(100, 116, 139, 0.15)",
    badgeBorder: "rgba(100, 116, 139, 0.4)",
    badgeText: "#94a3b8",
    phase: "Pre-Production",
    actor: "Gig Manager",
    summary: "Private staging gig record. Logistical details are being drafted prior to member polling.",
    impact: "Hidden or marked unannounced. No member notifications sent yet.",
    nextSteps: "Manager finalizes staging, uniform, and times, then changes status to Tentative.",
  },
  {
    code: "tentative",
    label: "Tentative",
    category: "gig",
    badgeBg: "rgba(245, 158, 11, 0.15)",
    badgeBorder: "rgba(245, 158, 11, 0.4)",
    badgeText: "#fbbf24",
    phase: "Availability Polling",
    actor: "Gig Manager & Band Musicians",
    summary: "Gig is announced to the band! Active musicians are requested to mark their attendance availability.",
    impact: "Visible on member calendars and dashboards. Headcounts tracked per section.",
    nextSteps: "Members RSVP (In, Probable, Maybe, Out). Coordinators evaluate section quorum.",
    automation: "Initial Availability Dispatch email sent to all active musicians (skipping hiatus & blackouts).",
  },
  {
    code: "confirmed",
    label: "Confirmed",
    category: "gig",
    badgeBg: "rgba(16, 185, 129, 0.15)",
    badgeBorder: "rgba(16, 185, 129, 0.4)",
    badgeText: "#34d399",
    phase: "Locked Performance",
    actor: "Gig Manager",
    summary: "Gig is locked! Section instrumentation quorum has been achieved (In + Probable >= Quorum).",
    impact: "Appears as confirmed on public site & member iCal feeds. Call sheets and staging locked.",
    nextSteps: "Confirmation dispatch sent. Setlists prepared in Setlist Studio. Downbeat check-in prepared.",
    automation: "Confirmation Dispatch sent automatically to all musicians marked 'In' or 'Probable'.",
  },
  {
    code: "completed",
    label: "Completed",
    category: "gig",
    badgeBg: "rgba(99, 102, 241, 0.15)",
    badgeBorder: "rgba(99, 102, 241, 0.4)",
    badgeText: "#818cf8",
    phase: "Post-Production",
    actor: "Gig Manager & Treasurer",
    summary: "Performance has concluded! Downbeat check-ins recorded and verified.",
    impact: "Performance moves to past gigs archive. Attendance logged for member tallies.",
    nextSteps: "Treasurer reviews check-in roll and distributes member compensation / payouts.",
  },
  {
    code: "cancelled",
    label: "Cancelled",
    category: "gig",
    badgeBg: "rgba(239, 68, 68, 0.15)",
    badgeBorder: "rgba(239, 68, 68, 0.4)",
    badgeText: "#f87171",
    phase: "Terminated",
    actor: "Gig Manager / Event Host",
    summary: "Performance called off due to inclement weather, client cancellation, or ensemble quorum failure.",
    impact: "Removed from active calendar. Marked cancelled across member feeds.",
    nextSteps: "Cancellation broadcast sent to committed musicians. Calendar event retracted.",
    automation: "Emergency cancellation broadcast dispatched if sudden call-off occurs.",
  },
  {
    code: "archived",
    label: "Archived",
    category: "gig",
    badgeBg: "rgba(71, 85, 105, 0.15)",
    badgeBorder: "rgba(71, 85, 105, 0.4)",
    badgeText: "#64748b",
    phase: "Historical Archive",
    actor: "Admin / System",
    summary: "Concluded gig archived for historical record and repertoire analytics.",
    impact: "Read-only historical record. Repertoire play counts tallied.",
    nextSteps: "Historical reference only.",
  },

  // --- RSVP STATUSES ---
  {
    code: "attending",
    label: "In (Attending)",
    category: "rsvp",
    badgeBg: "rgba(16, 185, 129, 0.15)",
    badgeBorder: "rgba(16, 185, 129, 0.4)",
    badgeText: "#34d399",
    phase: "Committed",
    actor: "Band Musician",
    summary: "100% committed to perform. Will be on site for call time and downbeat.",
    impact: "Counts directly toward section instrumentation quorum. Added to confirmed roster.",
    nextSteps: "Included in Confirmation Dispatch and future call sheet updates.",
    automation: "Receives Confirmation Dispatch and subsequent gig updates.",
  },
  {
    code: "probable",
    label: "Probable (Likely In)",
    category: "rsvp",
    badgeBg: "rgba(14, 165, 233, 0.15)",
    badgeBorder: "rgba(14, 165, 233, 0.4)",
    badgeText: "#38bdf8",
    phase: "High Probability",
    actor: "Band Musician",
    summary: "Strong intent to perform (approx. 80-90% certainty), pending minor personal/work confirmation.",
    impact: "CRITICAL: Counts toward Available Playing Strength for Gig Confirmation! (In + Probable >= Quorum).",
    nextSteps: "Coordinators can confirm gigs with confidence. Included in Confirmed Dispatches.",
    automation: "Receives Confirmation Dispatch and subsequent gig updates alongside 'In' members.",
  },
  {
    code: "tentative",
    label: "Tentative (Maybe)",
    category: "rsvp",
    badgeBg: "rgba(245, 158, 11, 0.15)",
    badgeBorder: "rgba(245, 158, 11, 0.4)",
    badgeText: "#fbbf24",
    phase: "Unconfirmed",
    actor: "Band Musician",
    summary: "Significant schedule uncertainty (50/50). Musician cannot guarantee availability yet.",
    impact: "Does NOT count toward Playing Strength quorum. Kept on notification loop for polling.",
    nextSteps: "Musician updates RSVP to 'In', 'Probable', or 'Out' as schedule crystallizes.",
    automation: "Excluded from Confirmed Dispatches until promoted to Probable or In.",
  },
  {
    code: "declined",
    label: "Out (Declined)",
    category: "rsvp",
    badgeBg: "rgba(239, 68, 68, 0.15)",
    badgeBorder: "rgba(239, 68, 68, 0.4)",
    badgeText: "#f87171",
    phase: "Unavailable",
    actor: "Band Musician",
    summary: "Musician is unable to perform on this date / time.",
    impact: "Zero availability. Section leader alerted if instrument vacancy threatens section coverage.",
    nextSteps: "Musician may leave a private note explaining absence if desired.",
    automation: "Excluded from all future call sheet and confirmation dispatches for this gig.",
  },

  // --- MEMBER STATUSES ---
  {
    code: "active",
    label: "Active Duty",
    category: "member",
    badgeBg: "rgba(16, 185, 129, 0.15)",
    badgeBorder: "rgba(16, 185, 129, 0.4)",
    badgeText: "#34d399",
    phase: "Active Regular",
    actor: "Musician & Leadership",
    summary: "Standard active performing member. Available for gigs, rehearsals, and street parades.",
    impact: "Receives all availability dispatch requests, rehearsals, and band-wide alerts.",
    nextSteps: "Keep blackout dates updated on /portal/availability.",
    automation: "Included in all initial gig availability dispatches (unless date is blacked out).",
  },
  {
    code: "hiatus",
    label: "Hiatus Mode",
    category: "member",
    badgeBg: "rgba(168, 85, 247, 0.15)",
    badgeBorder: "rgba(168, 85, 247, 0.4)",
    badgeText: "#c084fc",
    phase: "Temporary Leave",
    actor: "Musician (Self) or Manager",
    summary: "Member is temporarily taking a break from band activities (work, travel, family, injury).",
    impact: "COMPLETE DISPATCH MUTE: System automatically suppresses all gig availability emails and call sheets.",
    nextSteps: "Full portal access retained (music charts, vault, roster). Can return to Active with 1 click.",
    automation: "100% excluded from automated gig availability and call sheet dispatches.",
  },
  {
    code: "pending",
    label: "Pending Onboarding",
    category: "member",
    badgeBg: "rgba(234, 179, 8, 0.15)",
    badgeBorder: "rgba(234, 179, 8, 0.4)",
    badgeText: "#facc15",
    phase: "Audition / Setup",
    actor: "Membership Manager",
    summary: "Prospective player who applied or auditioned; pending account confirmation and instrument assignment.",
    impact: "Limited portal access until role is approved by admin or section leader.",
    nextSteps: "Membership manager approves role, assigns section, and marks Active.",
  },
  {
    code: "inactive",
    label: "Inactive / Emeritus",
    category: "member",
    badgeBg: "rgba(100, 116, 139, 0.15)",
    badgeBorder: "rgba(100, 116, 139, 0.4)",
    badgeText: "#94a3b8",
    phase: "Alumni",
    actor: "Admin / Membership Manager",
    summary: "Former player or alumni who has stepped down permanently from the active ensemble.",
    impact: "No performance dispatch emails or active roster assignments.",
    nextSteps: "Account retained for alumni historical credits.",
  },
];

export default function StatusMatrixGuidePage() {
  const [activeTab, setActiveTab] = useState<MatrixTab>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Interactive Quorum Calculator state
  const [inCount, setInCount] = useState(12);
  const [probableCount, setProbableCount] = useState(3);
  const [tentativeCount, setTentativeCount] = useState(4);
  const [declinedCount, setDeclinedCount] = useState(5);
  const [quorumTarget, setQuorumTarget] = useState(14);

  const playingStrength = inCount + probableCount;
  const isQuorumAchieved = playingStrength >= quorumTarget;

  // Filter status definitions based on tab and search
  const filteredStatuses = useMemo(() => {
    return STATUS_DATA.filter((item) => {
      // Tab filter
      if (activeTab === "leads" && item.category !== "lead") return false;
      if (activeTab === "gigs" && item.category !== "gig") return false;
      if (activeTab === "rsvps" && item.category !== "rsvp") return false;
      if (activeTab === "members" && item.category !== "member") return false;
      if (activeTab === "automation" && !item.automation) return false;

      // Search query
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        item.code.toLowerCase().includes(q) ||
        item.label.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.phase.toLowerCase().includes(q) ||
        item.summary.toLowerCase().includes(q) ||
        item.impact.toLowerCase().includes(q) ||
        item.nextSteps.toLowerCase().includes(q) ||
        (item.automation && item.automation.toLowerCase().includes(q))
      );
    });
  }, [activeTab, searchQuery]);

  return (
    <div className="space-y-8 pb-16 max-w-7xl mx-auto px-4 sm:px-6">
      {/* Top Breadcrumb & Navigation */}
      <div className="flex items-center justify-between gap-4 pt-2">
        <PortalBreadcrumb />

        <div className="flex items-center gap-2">
          <Link
            href="/portal/gigs"
            className="text-xs px-3 py-1.5 rounded-xl border font-semibold flex items-center gap-1.5 transition hover:brightness-110 shadow-sm"
            style={{
              backgroundColor: "var(--ebb-surface)",
              borderColor: "var(--ebb-border)",
              color: "#cbd5e1",
            }}
          >
            <Calendar className="w-3.5 h-3.5 text-sky-400" />
            <span>My Gigs</span>
          </Link>
          <Link
            href="/portal/availability"
            className="text-xs px-3 py-1.5 rounded-xl border font-semibold flex items-center gap-1.5 transition hover:brightness-110 shadow-sm"
            style={{
              backgroundColor: "var(--ebb-surface)",
              borderColor: "var(--ebb-border)",
              color: "#cbd5e1",
            }}
          >
            <CalendarOff className="w-3.5 h-3.5 text-amber-400" />
            <span>My Blackouts</span>
          </Link>
        </div>
      </div>

      {/* Hero Header */}
      <div
        className="rounded-3xl border p-6 sm:p-8 relative overflow-hidden shadow-xl"
        style={{
          backgroundColor: "var(--ebb-surface)",
          borderColor: "var(--ebb-border)",
        }}
      >
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-sky-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-semibold"
            style={{
              backgroundColor: "rgba(245, 158, 11, 0.12)",
              borderColor: "rgba(245, 158, 11, 0.3)",
              color: "#fbbf24",
            }}
          >
            <Workflow className="w-3.5 h-3.5" />
            <span>Band Operations & Logistics Standard</span>
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white">
              Status Matrix & Lifecycle Guide
            </h1>
            <p className="text-sm sm:text-base text-slate-300 max-w-3xl leading-relaxed">
              The official reference for how the Eagleburger Band coordinates performances—from
              initial booking inquiries (<strong>Leads</strong>) to converted <strong>Gigs</strong>,
              musician availability polling, the <strong>4-State RSVP system</strong>, and automated
              call sheet dispatches.
            </p>
          </div>

          {/* Quick Stat Metric Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-xs">
            <div
              className="border rounded-2xl p-3.5 space-y-1"
              style={{
                backgroundColor: "var(--ebb-surface-muted)",
                borderColor: "var(--ebb-border)",
              }}
            >
              <div className="text-slate-400 font-medium flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-blue-400" />
                <span>Lead Pipeline</span>
              </div>
              <div className="text-lg font-bold text-white">6 Statuses</div>
              <div className="text-[11px] text-slate-400">New → Converted</div>
            </div>

            <div
              className="border rounded-2xl p-3.5 space-y-1"
              style={{
                backgroundColor: "var(--ebb-surface-muted)",
                borderColor: "var(--ebb-border)",
              }}
            >
              <div className="text-slate-400 font-medium flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-amber-400" />
                <span>Gig Production</span>
              </div>
              <div className="text-lg font-bold text-white">6 Statuses</div>
              <div className="text-[11px] text-slate-400">Tentative → Confirmed</div>
            </div>

            <div
              className="border rounded-2xl p-3.5 space-y-1"
              style={{
                backgroundColor: "var(--ebb-surface-muted)",
                borderColor: "var(--ebb-border)",
              }}
            >
              <div className="text-slate-400 font-medium flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Member RSVPs</span>
              </div>
              <div className="text-lg font-bold text-white">4 States</div>
              <div className="text-[11px] text-emerald-400 font-medium">In + Probable = Quorum</div>
            </div>

            <div
              className="border rounded-2xl p-3.5 space-y-1"
              style={{
                backgroundColor: "var(--ebb-surface-muted)",
                borderColor: "var(--ebb-border)",
              }}
            >
              <div className="text-slate-400 font-medium flex items-center gap-1.5">
                <Palmtree className="w-3.5 h-3.5 text-purple-400" />
                <span>Member Hiatus</span>
              </div>
              <div className="text-lg font-bold text-white">Auto-Shield</div>
              <div className="text-[11px] text-slate-400">Suppresses Dispatches</div>
            </div>
          </div>
        </div>
      </div>

      {/* Visual Lifecycle Flowchart */}
      <div
        className="rounded-3xl border p-6 sm:p-7 shadow-lg space-y-6"
        style={{
          backgroundColor: "var(--ebb-surface)",
          borderColor: "var(--ebb-border)",
        }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-4" style={{ borderColor: "var(--ebb-border)" }}>
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Workflow className="w-5 h-5 text-amber-400" />
              <span>The End-to-End Performance Lifecycle</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              How an inquiry transforms step-by-step into a fully staffed downbeat performance.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setActiveTab("calculator")}
            className="text-xs px-3 py-1.5 rounded-xl border font-bold flex items-center gap-1.5 transition hover:brightness-125 self-start sm:self-auto"
            style={{
              backgroundColor: "rgba(245, 158, 11, 0.15)",
              borderColor: "rgba(245, 158, 11, 0.35)",
              color: "#fbbf24",
            }}
          >
            <Calculator className="w-3.5 h-3.5" />
            <span>Try Quorum Calculator</span>
          </button>
        </div>

        {/* Responsive Step Chain */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3.5 relative">
          {/* Step 1 */}
          <div
            className="rounded-2xl border p-4 space-y-2 flex flex-col justify-between"
            style={{
              backgroundColor: "var(--ebb-surface-muted)",
              borderColor: "var(--ebb-border)",
            }}
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider font-mono text-blue-400 px-2 py-0.5 rounded-md bg-blue-500/10">
                  Step 1
                </span>
                <span className="text-[11px] text-slate-500">Intake</span>
              </div>
              <h3 className="text-sm font-bold text-white">Lead Proposal</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Public booking form, client email, or member suggestion enters the Lead pipeline.
              </p>
            </div>
            <div className="text-[11px] text-slate-400 font-mono pt-2 border-t border-slate-800">
              Statuses: <span className="text-blue-300">new</span>, <span className="text-amber-300">reviewing</span>
            </div>
          </div>

          {/* Step 2 */}
          <div
            className="rounded-2xl border p-4 space-y-2 flex flex-col justify-between"
            style={{
              backgroundColor: "var(--ebb-surface-muted)",
              borderColor: "var(--ebb-border)",
            }}
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider font-mono text-purple-400 px-2 py-0.5 rounded-md bg-purple-500/10">
                  Step 2
                </span>
                <span className="text-[11px] text-slate-500">Handoff</span>
              </div>
              <h3 className="text-sm font-bold text-white">Lead to Gig</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Gig Manager marks Lead as <strong>Converted</strong>. A linked Gig is created in <strong>Tentative</strong> status.
              </p>
            </div>
            <div className="text-[11px] text-slate-400 font-mono pt-2 border-t border-slate-800">
              Lead: <span className="text-emerald-300">converted</span> → Gig: <span className="text-amber-300">tentative</span>
            </div>
          </div>

          {/* Step 3 */}
          <div
            className="rounded-2xl border p-4 space-y-2 flex flex-col justify-between"
            style={{
              backgroundColor: "var(--ebb-surface-muted)",
              borderColor: "var(--ebb-border)",
            }}
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider font-mono text-amber-400 px-2 py-0.5 rounded-md bg-amber-500/10">
                  Step 3
                </span>
                <span className="text-[11px] text-slate-500">Polling</span>
              </div>
              <h3 className="text-sm font-bold text-white">Availability Dispatch</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Automated email asks musicians to RSVP. Members with <strong>blackout dates</strong> or on <strong>hiatus</strong> are excluded.
              </p>
            </div>
            <div className="text-[11px] text-slate-400 font-mono pt-2 border-t border-slate-800">
              Dispatch: <span className="text-sky-300">Initial Poll</span>
            </div>
          </div>

          {/* Step 4 */}
          <div
            className="rounded-2xl border p-4 space-y-2 flex flex-col justify-between"
            style={{
              backgroundColor: "var(--ebb-surface-muted)",
              borderColor: "rgba(16, 185, 129, 0.4)",
            }}
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider font-mono text-emerald-400 px-2 py-0.5 rounded-md bg-emerald-500/10">
                  Step 4
                </span>
                <span className="text-[11px] text-emerald-400 font-semibold">Key Rule</span>
              </div>
              <h3 className="text-sm font-bold text-white">Quorum & Probable</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Musicians RSVP. Managers confirm gig once:
                <br />
                <span className="text-emerald-300 font-semibold font-mono text-[11px]">
                  Strength = In + Probable ≥ Quorum
                </span>
              </p>
            </div>
            <div className="text-[11px] text-slate-400 font-mono pt-2 border-t border-slate-800">
              RSVP: <span className="text-emerald-300">In</span> + <span className="text-sky-300">Probable</span>
            </div>
          </div>

          {/* Step 5 */}
          <div
            className="rounded-2xl border p-4 space-y-2 flex flex-col justify-between"
            style={{
              backgroundColor: "var(--ebb-surface-muted)",
              borderColor: "var(--ebb-border)",
            }}
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider font-mono text-indigo-400 px-2 py-0.5 rounded-md bg-indigo-500/10">
                  Step 5
                </span>
                <span className="text-[11px] text-slate-500">Lock</span>
              </div>
              <h3 className="text-sm font-bold text-white">Confirmed Dispatch</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Gig status updated to <strong>Confirmed</strong>. Confirmation Dispatch automatically goes out to <strong>In</strong> & <strong>Probable</strong> musicians.
              </p>
            </div>
            <div className="text-[11px] text-slate-400 font-mono pt-2 border-t border-slate-800">
              Gig: <span className="text-emerald-300">confirmed</span> (iCal Sync)
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Tabs and Search Filter */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
            {[
              { id: "all", label: "All Matrices" },
              { id: "leads", label: "1. Lead Pipeline" },
              { id: "gigs", label: "2. Gig Lifecycle" },
              { id: "rsvps", label: "3. 4-State RSVPs" },
              { id: "members", label: "4. Member & Hiatus" },
              { id: "automation", label: "5. Dispatches" },
              { id: "calculator", label: "Quorum Calculator" },
            ].map((tab) => {
              const isSelected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as MatrixTab)}
                  style={
                    isSelected
                      ? {
                          backgroundColor: "var(--ebb-primary)",
                          color: "#020617",
                          borderColor: "var(--ebb-primary)",
                        }
                      : {
                          backgroundColor: "var(--ebb-surface)",
                          borderColor: "var(--ebb-border)",
                          color: "#94a3b8",
                        }
                  }
                  className="px-3.5 py-1.5 rounded-xl font-bold transition shrink-0 border shadow-sm"
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Search Box */}
          {activeTab !== "calculator" && (
            <div className="relative min-w-[240px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Filter by status, role, trigger..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  backgroundColor: "var(--ebb-surface)",
                  borderColor: "var(--ebb-border)",
                }}
                className="w-full border rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder-slate-500 focus:outline-none shadow-sm"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
                >
                  ✕
                </button>
              )}
            </div>
          )}
        </div>

        {/* Tab: Interactive Quorum Calculator */}
        {activeTab === "calculator" ? (
          <div
            className="rounded-3xl border p-6 sm:p-8 space-y-6 shadow-xl"
            style={{
              backgroundColor: "var(--ebb-surface)",
              borderColor: "var(--ebb-border)",
            }}
          >
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Calculator className="w-5 h-5 text-amber-400" />
                <span>Interactive Quorum & Playing Strength Calculator</span>
              </h3>
              <p className="text-xs sm:text-sm text-slate-300">
                Test how the <strong>Probable</strong> RSVP state impacts gig viability and quorum
                calculations for section coverage.
              </p>
            </div>

            {/* Quorum Math Banner */}
            <div
              className="p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
              style={{
                backgroundColor: isQuorumAchieved
                  ? "rgba(16, 185, 129, 0.1)"
                  : "rgba(239, 68, 68, 0.1)",
                borderColor: isQuorumAchieved
                  ? "rgba(16, 185, 129, 0.3)"
                  : "rgba(239, 68, 68, 0.3)",
              }}
            >
              <div className="space-y-1">
                <div className="text-xs uppercase font-mono tracking-wider font-bold text-slate-400">
                  Calculated Playing Strength Formula
                </div>
                <div className="text-xl sm:text-2xl font-black font-mono text-white flex items-center gap-2">
                  <span className="text-emerald-400">{inCount} In</span>
                  <span className="text-slate-500">+</span>
                  <span className="text-sky-400">{probableCount} Probable</span>
                  <span className="text-slate-500">=</span>
                  <span className={isQuorumAchieved ? "text-emerald-400" : "text-amber-400"}>
                    {playingStrength} Playing Strength
                  </span>
                </div>
              </div>

              <div
                className="px-4 py-2 rounded-xl text-xs font-bold border flex items-center gap-2"
                style={{
                  backgroundColor: isQuorumAchieved
                    ? "rgba(16, 185, 129, 0.2)"
                    : "rgba(239, 68, 68, 0.2)",
                  borderColor: isQuorumAchieved
                    ? "rgba(16, 185, 129, 0.5)"
                    : "rgba(239, 68, 68, 0.5)",
                  color: isQuorumAchieved ? "#34d399" : "#f87171",
                }}
              >
                {isQuorumAchieved ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>QUORUM MET ({playingStrength} / {quorumTarget} Target)</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4" />
                    <span>BELOW QUORUM ({playingStrength} / {quorumTarget} Target)</span>
                  </>
                )}
              </div>
            </div>

            {/* Sliders and Controls Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 text-xs">
              {/* Target Quorum */}
              <div
                className="p-4 rounded-2xl border space-y-3"
                style={{
                  backgroundColor: "var(--ebb-surface-muted)",
                  borderColor: "var(--ebb-border)",
                }}
              >
                <div className="flex items-center justify-between font-bold text-slate-300">
                  <span>Target Quorum</span>
                  <span className="text-amber-400 font-mono text-sm">{quorumTarget}</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="30"
                  value={quorumTarget}
                  onChange={(e) => setQuorumTarget(parseInt(e.target.value))}
                  className="w-full accent-amber-500"
                />
                <p className="text-[11px] text-slate-400">
                  Minimum musicians required to balance band instrumentation.
                </p>
              </div>

              {/* In (Attending) */}
              <div
                className="p-4 rounded-2xl border space-y-3"
                style={{
                  backgroundColor: "var(--ebb-surface-muted)",
                  borderColor: "rgba(16, 185, 129, 0.3)",
                }}
              >
                <div className="flex items-center justify-between font-bold text-emerald-400">
                  <span>In (Attending)</span>
                  <span className="font-mono text-sm">{inCount}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="30"
                  value={inCount}
                  onChange={(e) => setInCount(parseInt(e.target.value))}
                  className="w-full accent-emerald-500"
                />
                <p className="text-[11px] text-slate-400">
                  100% committed musicians. Fully counted towards strength.
                </p>
              </div>

              {/* Probable */}
              <div
                className="p-4 rounded-2xl border space-y-3"
                style={{
                  backgroundColor: "var(--ebb-surface-muted)",
                  borderColor: "rgba(14, 165, 233, 0.3)",
                }}
              >
                <div className="flex items-center justify-between font-bold text-sky-400">
                  <span>Probable (Likely)</span>
                  <span className="font-mono text-sm">{probableCount}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="15"
                  value={probableCount}
                  onChange={(e) => setProbableCount(parseInt(e.target.value))}
                  className="w-full accent-sky-500"
                />
                <p className="text-[11px] text-slate-400">
                  80%+ likely. <strong>Counted toward quorum</strong> to enable fast confirmation!
                </p>
              </div>

              {/* Tentative */}
              <div
                className="p-4 rounded-2xl border space-y-3"
                style={{
                  backgroundColor: "var(--ebb-surface-muted)",
                  borderColor: "var(--ebb-border)",
                }}
              >
                <div className="flex items-center justify-between font-bold text-amber-400">
                  <span>Tentative (Maybe)</span>
                  <span className="font-mono text-sm">{tentativeCount}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="15"
                  value={tentativeCount}
                  onChange={(e) => setTentativeCount(parseInt(e.target.value))}
                  className="w-full accent-amber-500"
                />
                <p className="text-[11px] text-slate-400">
                  Unsure / 50-50. <em>Not counted</em> in quorum playing strength.
                </p>
              </div>

              {/* Declined */}
              <div
                className="p-4 rounded-2xl border space-y-3"
                style={{
                  backgroundColor: "var(--ebb-surface-muted)",
                  borderColor: "var(--ebb-border)",
                }}
              >
                <div className="flex items-center justify-between font-bold text-red-400">
                  <span>Out (Declined)</span>
                  <span className="font-mono text-sm">{declinedCount}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="20"
                  value={declinedCount}
                  onChange={(e) => setDeclinedCount(parseInt(e.target.value))}
                  className="w-full accent-red-500"
                />
                <p className="text-[11px] text-slate-400">
                  Unavailable. Section leader may need to recruit subs.
                </p>
              </div>
            </div>

            {/* Explanation Note */}
            <div
              className="p-4 rounded-2xl border flex items-start gap-3 text-xs text-slate-300"
              style={{
                backgroundColor: "rgba(14, 165, 233, 0.08)",
                borderColor: "rgba(14, 165, 233, 0.25)",
              }}
            >
              <Info className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-bold text-sky-300">Why Probable is Essential:</span>
                <p className="text-slate-300 leading-relaxed">
                  Community musicians balance professional careers and personal lives. Waiting for 100% &ldquo;In&rdquo;
                  RSVPs often delays booking confirmations until clients take their business elsewhere. By combining
                  <strong>In</strong> and <strong>Probable</strong>, gig coordinators can lock performances days earlier
                  while maintaining complete confidence in section instrumentation balance.
                </p>
              </div>
            </div>
          </div>
        ) : (
          /* Cards Grid of Status Definitions */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredStatuses.map((item) => {
              return (
                <div
                  key={`${item.category}-${item.code}`}
                  className="rounded-2xl border p-5 flex flex-col justify-between space-y-4 shadow-sm transition hover:brightness-105"
                  style={{
                    backgroundColor: "var(--ebb-surface)",
                    borderColor: "var(--ebb-border)",
                  }}
                >
                  <div className="space-y-3">
                    {/* Header: Category + Badge */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider font-mono text-slate-400">
                        {item.category === "lead" && "Booking Lead"}
                        {item.category === "gig" && "Performance Gig"}
                        {item.category === "rsvp" && "Musician RSVP"}
                        {item.category === "member" && "Member Account"}
                      </span>

                      <span
                        className="px-2.5 py-0.5 rounded-full text-xs font-bold border font-mono"
                        style={{
                          backgroundColor: item.badgeBg,
                          borderColor: item.badgeBorder,
                          color: item.badgeText,
                        }}
                      >
                        {item.label}
                      </span>
                    </div>

                    {/* Title & Phase */}
                    <div>
                      <h3 className="text-base font-bold text-white flex items-center gap-1.5">
                        <span className="font-mono text-amber-400 text-xs">`{item.code}`</span>
                      </h3>
                      <div className="text-xs text-slate-400 font-medium mt-0.5">
                        Phase: <span className="text-slate-200">{item.phase}</span> · By: <span className="text-slate-300">{item.actor}</span>
                      </div>
                    </div>

                    {/* Summary */}
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {item.summary}
                    </p>

                    {/* Operational Impact */}
                    <div
                      className="p-3 rounded-xl border text-[11px] space-y-1"
                      style={{
                        backgroundColor: "var(--ebb-surface-muted)",
                        borderColor: "var(--ebb-border)",
                      }}
                    >
                      <div className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">
                        Operational Impact
                      </div>
                      <div className="text-slate-300 leading-relaxed">
                        {item.impact}
                      </div>
                    </div>

                    {/* Automation Trigger */}
                    {item.automation && (
                      <div
                        className="p-2.5 rounded-xl border text-[11px] flex items-start gap-2"
                        style={{
                          backgroundColor: "rgba(59, 130, 246, 0.08)",
                          borderColor: "rgba(59, 130, 246, 0.25)",
                          color: "#93c5fd",
                        }}
                      >
                        <Bell className="w-3.5 h-3.5 shrink-0 mt-0.5 text-blue-400" />
                        <span><strong>Automation:</strong> {item.automation}</span>
                      </div>
                    )}
                  </div>

                  {/* Footer / Next Steps */}
                  <div className="pt-3 border-t border-slate-800/80 text-[11px] text-slate-400">
                    <span className="font-bold text-slate-400">Next Action:</span>{" "}
                    <span className="text-slate-300">{item.nextSteps}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Operational Rules & Guardrails Section */}
      <div
        className="rounded-3xl border p-6 sm:p-8 space-y-6 shadow-xl"
        style={{
          backgroundColor: "var(--ebb-surface)",
          borderColor: "var(--ebb-border)",
        }}
      >
        <div className="border-b pb-4" style={{ borderColor: "var(--ebb-border)" }}>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <span>Essential Operational Rules & Automated Dispatches</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Understanding the automated email rules, hiatus shields, and blackout date filters.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-xs text-slate-300">
          {/* Rule 1: Initial Availability Dispatch */}
          <div
            className="p-4 rounded-2xl border space-y-3"
            style={{
              backgroundColor: "var(--ebb-surface-muted)",
              borderColor: "var(--ebb-border)",
            }}
          >
            <div className="flex items-center gap-2 font-bold text-white text-sm">
              <Send className="w-4 h-4 text-sky-400" />
              <span>1. Initial Availability Poll</span>
            </div>
            <p className="leading-relaxed text-slate-300">
              When a Gig is converted from a Lead or created in <strong>Tentative</strong> status,
              an initial dispatch email goes out to band members requesting them to mark their availability.
            </p>
            <div className="p-2.5 rounded-xl border bg-slate-900/50 border-slate-800 space-y-1">
              <div className="font-bold text-slate-400 text-[10px] uppercase">Automated Filter:</div>
              <p className="text-[11px] text-slate-300">
                Musicians who have recorded a <strong>Blackout Date</strong> for that day OR are in
                <strong> Hiatus</strong> mode are automatically excluded from the recipient list.
              </p>
            </div>
          </div>

          {/* Rule 2: Confirmation Dispatch */}
          <div
            className="p-4 rounded-2xl border space-y-3"
            style={{
              backgroundColor: "var(--ebb-surface-muted)",
              borderColor: "var(--ebb-border)",
            }}
          >
            <div className="flex items-center gap-2 font-bold text-white text-sm">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>2. Confirmation Dispatch</span>
            </div>
            <p className="leading-relaxed text-slate-300">
              When the Gig Manager confirms the performance, a dedicated <strong>Confirmation Dispatch</strong> email
              is broadcast directly to musicians who marked their availability as <strong>&ldquo;In&rdquo;</strong> or
              <strong>&ldquo;Probable&rdquo;</strong>.
            </p>
            <div className="p-2.5 rounded-xl border bg-slate-900/50 border-slate-800 space-y-1">
              <div className="font-bold text-slate-400 text-[10px] uppercase">Roster Lock:</div>
              <p className="text-[11px] text-slate-300">
                Thereafter, all call sheet updates, staging reminders, and uniform notes go strictly to the confirmed roster.
              </p>
            </div>
          </div>

          {/* Rule 3: Member Hiatus Shield */}
          <div
            className="p-4 rounded-2xl border space-y-3"
            style={{
              backgroundColor: "var(--ebb-surface-muted)",
              borderColor: "var(--ebb-border)",
            }}
          >
            <div className="flex items-center gap-2 font-bold text-white text-sm">
              <Palmtree className="w-4 h-4 text-purple-400" />
              <span>3. Member Hiatus Shield</span>
            </div>
            <p className="leading-relaxed text-slate-300">
              Members can toggle their account status to <strong>Hiatus</strong> when taking personal leave,
              dealing with injury, or travelling.
            </p>
            <div className="p-2.5 rounded-xl border bg-slate-900/50 border-slate-800 space-y-1">
              <div className="font-bold text-slate-400 text-[10px] uppercase">Zero Spam Guarantee:</div>
              <p className="text-[11px] text-slate-300">
                Hiatus members never receive gig availability emails or dispatches. Full chart vault and roster access remain active.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Frequently Asked Questions */}
      <div
        className="rounded-3xl border p-6 sm:p-8 space-y-5 shadow-xl"
        style={{
          backgroundColor: "var(--ebb-surface)",
          borderColor: "var(--ebb-border)",
        }}
      >
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-amber-400" />
          <span>Frequently Asked Questions</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div
            className="p-4 rounded-2xl border space-y-2"
            style={{
              backgroundColor: "var(--ebb-surface-muted)",
              borderColor: "var(--ebb-border)",
            }}
          >
            <h4 className="font-bold text-white text-sm">
              Why did we introduce the &ldquo;Probable&rdquo; RSVP status?
            </h4>
            <p className="text-slate-300 leading-relaxed">
              Previously, musicians had to choose between &ldquo;Attending&rdquo; and &ldquo;Tentative&rdquo;.
              Many musicians held off committing until 48 hours prior, preventing coordinators from confirming
              the gig with the client. &ldquo;Probable&rdquo; signals 80-90% certainty, giving managers the confidence
              to count you toward the quorum while accommodating minor work contingencies.
            </p>
          </div>

          <div
            className="p-4 rounded-2xl border space-y-2"
            style={{
              backgroundColor: "var(--ebb-surface-muted)",
              borderColor: "var(--ebb-border)",
            }}
          >
            <h4 className="font-bold text-white text-sm">
              If I am marked &ldquo;Probable&rdquo;, will I receive the Call Sheet email?
            </h4>
            <p className="text-slate-300 leading-relaxed">
              Yes! Both &ldquo;In&rdquo; (Attending) and &ldquo;Probable&rdquo; musicians are included on the confirmed
              recipient list for call sheets, uniform directions, staging addresses, and setlist announcements.
            </p>
          </div>

          <div
            className="p-4 rounded-2xl border space-y-2"
            style={{
              backgroundColor: "var(--ebb-surface-muted)",
              borderColor: "var(--ebb-border)",
            }}
          >
            <h4 className="font-bold text-white text-sm">
              What is the difference between Hiatus and Blackout Dates?
            </h4>
            <p className="text-slate-300 leading-relaxed">
              <strong>Blackout Dates</strong> are specific dates or date ranges (e.g., family vacation July 4-10)
              logged on your availability calendar. <strong>Hiatus Mode</strong> is an ongoing account state that
              mutes all performance inquiries until you toggle it back on.
            </p>
          </div>

          <div
            className="p-4 rounded-2xl border space-y-2"
            style={{
              backgroundColor: "var(--ebb-surface-muted)",
              borderColor: "var(--ebb-border)",
            }}
          >
            <h4 className="font-bold text-white text-sm">
              How do I subscribe the band calendar to my phone?
            </h4>
            <p className="text-slate-300 leading-relaxed">
              Head to <Link href="/portal/gigs" className="text-amber-400 underline font-semibold">Gig Central</Link> and
              click &ldquo;Subscribe to Calendar&rdquo;. You will receive an Apple Calendar / Google Calendar feed that
              automatically keeps your phone in sync as gig call times or statuses change.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

