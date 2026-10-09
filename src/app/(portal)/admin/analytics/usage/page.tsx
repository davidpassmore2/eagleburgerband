"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { collection, onSnapshot, doc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/lib/context/AuthContext";
import { isAdmin } from "@/lib/auth/permissions";
import { 
  PortalMetricEvent, 
  PortalMetricEventSchema, 
  PortalMetricsConfig,
  PortalMetricsConfigSchema,
  DEFAULT_PORTAL_METRICS_CONFIG 
} from "@/lib/schema/metrics";
import { 
  setMetricsCaptureEnabled, 
  resetPortalMetrics,
  isAdminOnlyRoute,
  isAdminOnlyTool
} from "@/lib/metrics/usageTracker";
import { WORKSPACE_TOOLS, ToolCategory } from "@/lib/portal/workspaceRegistry";
import CalendarHeatMap from "@/components/portal/CalendarHeatMap";
import { toast } from "@/lib/context/ToastContext";
import PortalBreadcrumb from "@/components/portal/PortalBreadcrumb";
import { 
  Activity, 
  Eye, 
  MousePointerClick, 
  Users, 
  RotateCcw, 
  Power, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  ArrowLeft, 
  Flame, 
  ShieldAlert, 
  ExternalLink
} from "lucide-react";

export default function PortalUsageMetricsPage() {
  const { profile, loading: authLoading } = useAuth();

  // Metrics State
  const [config, setConfig] = useState<PortalMetricsConfig>(DEFAULT_PORTAL_METRICS_CONFIG);
  const [events, setEvents] = useState<PortalMetricEvent[]>([]);

  // User Roster State for Member Filter
  const [rosterUsers, setRosterUsers] = useState<{ uid: string; displayName: string; email: string; role: string }[]>([]);

  // Filtering & View State
  const [selectedMemberUid, setSelectedMemberUid] = useState<string>("all");
  const [selectedDateFilter, setSelectedDateFilter] = useState<string | null>(null);
  const [toolCategoryFilter, setToolCategoryFilter] = useState<ToolCategory | "all">("all");
  const [toolAdoptionFilter, setToolAdoptionFilter] = useState<"all" | "active" | "unused">("all");
  const [toolSortOrder, setToolSortOrder] = useState<"most_used" | "least_used" | "alphabetical">("least_used");

  // Reset Confirmation Modal State
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isTogglingCapture, setIsTogglingCapture] = useState(false);

  // 1. Subscribe to Metrics Config
  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, "portal_metrics_config", "global"),
      (snapshot) => {
        if (snapshot.exists()) {
          const parsed = PortalMetricsConfigSchema.safeParse(snapshot.data());
          if (parsed.success) {
            setConfig(parsed.data);
          }
        }
      },
      (err) => {
        console.error("Failed to load metrics config:", err);
      }
    );
    return () => unsub();
  }, []);

  // 2. Subscribe to Users Roster for member filtering
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "users"),
      (snapshot) => {
        const list: { uid: string; displayName: string; email: string; role: string }[] = [];
        snapshot.forEach((d) => {
          const raw = d.data();
          list.push({
            uid: d.id,
            displayName: raw.displayName || raw.name || "Musician",
            email: raw.email || "",
            role: (raw.roles && raw.roles[0]) || raw.role || "member",
          });
        });
        setRosterUsers(list);
      },
      (err) => {
        console.error("Failed to load users roster:", err);
      }
    );
    return () => unsub();
  }, []);

  // 3. Subscribe to Metrics Events
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "portal_metrics_events"),
      (snapshot) => {
        const rawEvents: PortalMetricEvent[] = [];
        snapshot.forEach((d) => {
          const parsed = PortalMetricEventSchema.safeParse(d.data());
          if (parsed.success) {
            rawEvents.push(parsed.data);
          }
        });

        // Sort descending by timestamp
        rawEvents.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setEvents(rawEvents);
      },
      (err) => {
        console.error("Failed to load metrics events:", err);
      }
    );
    return () => unsub();
  }, []);

  // Apply reset cutoff filter: drop events recorded before config.lastResetAt and exclude admin-only routes/tools
  const activeEvents = useMemo(() => {
    const rawList = config.lastResetAt
      ? events.filter((ev) => new Date(ev.timestamp).getTime() >= new Date(config.lastResetAt!).getTime())
      : events;

    return rawList.filter(
      (ev) =>
        !isAdminOnlyRoute(ev.pathname) &&
        ev.toolId !== "portal-usage" &&
        ev.toolId !== "admin-log" &&
        ev.toolId !== "users"
    );
  }, [events, config.lastResetAt]);

  // Filter events by selected member
  const memberFilteredEvents = useMemo(() => {
    if (selectedMemberUid === "all") return activeEvents;
    return activeEvents.filter((ev) => ev.userId === selectedMemberUid);
  }, [activeEvents, selectedMemberUid]);

  // Apply date filter if a cell was clicked on the calendar heat map
  const finalFilteredEvents = useMemo(() => {
    if (!selectedDateFilter) return memberFilteredEvents;
    return memberFilteredEvents.filter((ev) => (ev.dateKey || ev.timestamp.slice(0, 10)) === selectedDateFilter);
  }, [memberFilteredEvents, selectedDateFilter]);

  // High-level summary telemetry counters
  const summaryCounters = useMemo(() => {
    const totalViews = memberFilteredEvents.filter((e) => e.type === "route_view").length;
    const totalInteractions = memberFilteredEvents.filter((e) => e.type === "interaction").length;
    const uniqueMembers = new Set(memberFilteredEvents.map((e) => e.userId)).size;

    // Distinct dates
    const distinctDates = new Set(memberFilteredEvents.map((e) => e.dateKey || e.timestamp.slice(0, 10))).size;

    return {
      totalViews,
      totalInteractions,
      uniqueMembers,
      distinctDates,
      totalActivity: totalViews + totalInteractions,
    };
  }, [memberFilteredEvents]);

  // Functionality Adoption Audit: Map non-admin WORKSPACE_TOOLS to their usage statistics
  const toolAdoptionList = useMemo(() => {
    return WORKSPACE_TOOLS
      .filter((tool) => !isAdminOnlyTool(tool))
      .map((tool) => {
      // Find all events for this tool
      const toolEvents = memberFilteredEvents.filter((ev) => {
        if (ev.toolId && ev.toolId === tool.id) return true;
        if (ev.pathname && (ev.pathname === tool.href || ev.pathname.startsWith(tool.href + "/"))) return true;
        return false;
      });

      const views = toolEvents.filter((e) => e.type === "route_view").length;
      const interactions = toolEvents.filter((e) => e.type === "interaction").length;
      const uniqueUsers = new Set(toolEvents.map((e) => e.userId)).size;

      const lastEvent = toolEvents[0]; // already sorted desc
      const lastAccessed = lastEvent ? lastEvent.timestamp : null;

      // Classify adoption status
      let adoptionStatus: "high" | "moderate" | "unused" = "unused";
      if (views === 0 && interactions === 0) {
        adoptionStatus = "unused";
      } else if (interactions >= 3 || views >= 10 || uniqueUsers >= 3) {
        adoptionStatus = "high";
      } else {
        adoptionStatus = "moderate";
      }

      return {
        tool,
        views,
        interactions,
        totalActivity: views + interactions,
        uniqueUsers,
        lastAccessed,
        adoptionStatus,
      };
    });
  }, [memberFilteredEvents]);

  // Filtered & sorted tool adoption list
  const filteredTools = useMemo(() => {
    return toolAdoptionList
      .filter((item) => {
        if (toolCategoryFilter !== "all" && item.tool.category !== toolCategoryFilter) return false;
        if (toolAdoptionFilter === "active" && item.adoptionStatus === "unused") return false;
        if (toolAdoptionFilter === "unused" && item.adoptionStatus !== "unused") return false;
        return true;
      })
      .sort((a, b) => {
        if (toolSortOrder === "least_used") {
          // Zero activity first, then ascending activity
          if (a.totalActivity !== b.totalActivity) return a.totalActivity - b.totalActivity;
          return a.tool.title.localeCompare(b.tool.title);
        }
        if (toolSortOrder === "most_used") {
          return b.totalActivity - a.totalActivity;
        }
        return a.tool.title.localeCompare(b.tool.title);
      });
  }, [toolAdoptionList, toolCategoryFilter, toolAdoptionFilter, toolSortOrder]);

  // Unused tools count for quick warning banner
  const unusedToolsCount = useMemo(() => {
    return toolAdoptionList.filter((t) => t.adoptionStatus === "unused").length;
  }, [toolAdoptionList]);

  // Handle capture toggle
  const handleToggleCapture = async () => {
    setIsTogglingCapture(true);
    const nextState = !config.captureEnabled;
    try {
      await setMetricsCaptureEnabled(nextState);
      toast.success(nextState ? "Portal metric capture enabled." : "Portal metric capture paused.");
    } catch (err) {
      console.error("Failed to toggle metric capture:", err);
      toast.error("Failed to update capture setting.");
    } finally {
      setIsTogglingCapture(false);
    }
  };

  // Handle reset execution
  const handleExecuteReset = async () => {
    if (!profile?.uid) return;
    setIsResetting(true);
    try {
      await resetPortalMetrics({
        uid: profile.uid,
        displayName: profile.displayName || "Administrator",
      });
      setSelectedDateFilter(null);
      setIsResetModalOpen(false);
      toast.success("Portal metrics have been reset successfully.");
    } catch (err) {
      console.error("Failed to reset metrics:", err);
      toast.error("Failed to reset metrics.");
    } finally {
      setIsResetting(false);
    }
  };

  // RBAC Guard
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAdmin(profile)) {
    return (
      <div className="max-w-2xl mx-auto my-12 p-8 bg-slate-900 border border-red-500/30 rounded-2xl text-center">
        <ShieldAlert className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Administrator Access Required</h2>
        <p className="text-sm text-slate-400 mb-6">
          Portal Usage Metrics telemetry is strictly restricted to Portal Administrators.
        </p>
        <Link
          href="/portal"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 text-slate-200 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Return to Musician Portal
        </Link>
      </div>
    );
  }

  const selectedMemberObj = rosterUsers.find((u) => u.uid === selectedMemberUid);

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-16">
      {/* Top Breadcrumb & Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <PortalBreadcrumb className="mb-2" />
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-400/20 to-amber-600/20 border border-yellow-400/30 flex items-center justify-center text-yellow-400 shadow-lg">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Portal Usage Metrics</h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Track member route navigation, operational interactions, and evaluate feature adoption.
              </p>
            </div>
          </div>
        </div>

        {/* Global Administrative Controls Bar */}
        <div className="flex items-center flex-wrap gap-3">
          {/* Capture Toggle Button */}
          <button
            type="button"
            onClick={handleToggleCapture}
            disabled={isTogglingCapture}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all shadow-md cursor-pointer ${
              config.captureEnabled
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30"
                : "bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30"
            }`}
          >
            <Power className={`w-4 h-4 ${config.captureEnabled ? "text-emerald-400" : "text-amber-400"}`} />
            <span>
              {config.captureEnabled ? "Capture Active" : "Capture Paused"}
            </span>
          </button>

          {/* Reset Metrics Button */}
          <button
            type="button"
            onClick={() => setIsResetModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-red-500/10 text-red-300 border border-red-500/30 hover:bg-red-500/20 hover:border-red-500/50 transition-all shadow-md cursor-pointer"
          >
            <RotateCcw className="w-4 h-4 text-red-400" />
            <span>Reset Metrics</span>
          </button>
        </div>
      </div>

      {/* Telemetry Status Strip */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 text-slate-300">
          <span className={`w-2 h-2 rounded-full ${config.captureEnabled ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`} />
          <span>
            Telemetry Engine Status:{" "}
            <strong className={config.captureEnabled ? "text-emerald-400" : "text-amber-400"}>
              {config.captureEnabled ? "Live Recording (Route views & interactions enabled)" : "Disabled (No events recorded)"}
            </strong>
          </span>
        </div>
        {config.lastResetAt ? (
          <div className="text-slate-400 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span>
              Last reset:{" "}
              <strong className="text-slate-200">
                {new Date(config.lastResetAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </strong>
              {config.resetByName ? ` by ${config.resetByName}` : ""}
            </span>
          </div>
        ) : (
          <span className="text-slate-500 text-[11px]">No prior resets recorded</span>
        )}
      </div>

      {/* Overall Telemetry Counters Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Route Views */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Route Views
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Eye className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">
              {summaryCounters.totalViews.toLocaleString()}
            </span>
            <span className="text-xs text-slate-500">navigations</span>
          </div>
        </div>

        {/* Total Changes / Interactions */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Changes Made
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <MousePointerClick className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">
              {summaryCounters.totalInteractions.toLocaleString()}
            </span>
            <span className="text-xs text-slate-500">interactions</span>
          </div>
        </div>

        {/* Active Members */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Active Musicians
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">
              {summaryCounters.uniqueMembers}
            </span>
            <span className="text-xs text-slate-500">
              {selectedMemberUid === "all" ? `of ${rosterUsers.length || 0} rostered` : "selected member"}
            </span>
          </div>
        </div>

        {/* Unused Functionality Alert */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Unused Features
            </span>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              unusedToolsCount > 0
                ? "bg-red-500/10 border border-red-500/20 text-red-400"
                : "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
            }`}>
              {unusedToolsCount > 0 ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className={`text-3xl font-extrabold ${unusedToolsCount > 0 ? "text-amber-400" : "text-emerald-400"}`}>
              {unusedToolsCount}
            </span>
            <span className="text-xs text-slate-500">
              tools with 0 activity
            </span>
          </div>
        </div>
      </div>

      {/* Member Filter & Scope Switcher Bar */}
      <div className="bg-slate-900/90 border border-slate-800/90 rounded-2xl p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-yellow-400 uppercase tracking-wider">
            Telemetry Scope
          </span>
          <h3 className="text-base font-semibold text-white mt-0.5">
            {selectedMemberUid === "all"
              ? "Overall Band-Wide Activity (All Members)"
              : `Individual Member Telemetry: ${selectedMemberObj?.displayName || selectedMemberUid}`}
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Switch between aggregate ensemble metrics and individual musician adoption profiles.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={() => {
              setSelectedMemberUid("all");
              setSelectedDateFilter(null);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
              selectedMemberUid === "all"
                ? "bg-yellow-400 text-slate-950 font-bold shadow-md shadow-yellow-400/20"
                : "bg-slate-800/80 text-slate-300 hover:text-white"
            }`}
          >
            All Members (Overall)
          </button>

          {/* Member Search / Selector Dropdown */}
          <div className="relative min-w-[220px]">
            <select
              value={selectedMemberUid}
              onChange={(e) => {
                setSelectedMemberUid(e.target.value);
                setSelectedDateFilter(null);
              }}
              aria-label="Filter by member"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-yellow-400 cursor-pointer"
            >
              <option value="all">Select Individual Musician...</option>
              {rosterUsers.map((u) => (
                <option key={u.uid} value={u.uid}>
                  {u.displayName} ({u.role})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Calendar Heat Map */}
      <CalendarHeatMap
        events={memberFilteredEvents}
        weeksCount={16}
        selectedDate={selectedDateFilter}
        onSelectDate={setSelectedDateFilter}
        title={
          selectedMemberUid === "all"
            ? "Portal Activity Heat Map (Overall Ensemble)"
            : `Activity Heat Map: ${selectedMemberObj?.displayName || "Musician"}`
        }
      />

      {/* Functionality Adoption & Route Utilization Assessment */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-yellow-400" />
              <h2 className="text-lg font-bold text-white">Functionality Adoption & Route Utilization</h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Audit which portal tools are heavily utilized and identify unused functionality.
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Adoption Status Filters */}
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setToolAdoptionFilter("all")}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                  toolAdoptionFilter === "all" ? "bg-slate-800 text-white" : "text-slate-400 hover:text-white"
                }`}
              >
                All Tools ({toolAdoptionList.length})
              </button>
              <button
                type="button"
                onClick={() => setToolAdoptionFilter("active")}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                  toolAdoptionFilter === "active" ? "bg-emerald-500/20 text-emerald-300" : "text-slate-400 hover:text-white"
                }`}
              >
                Active Only ({toolAdoptionList.length - unusedToolsCount})
              </button>
              <button
                type="button"
                onClick={() => setToolAdoptionFilter("unused")}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                  toolAdoptionFilter === "unused" ? "bg-red-500/20 text-red-300" : "text-slate-400 hover:text-white"
                }`}
              >
                Unused / Zero ({unusedToolsCount})
              </button>
            </div>

            {/* Category Filter Selector */}
            <select
              value={toolCategoryFilter}
              onChange={(e) => setToolCategoryFilter(e.target.value as ToolCategory | "all")}
              aria-label="Filter tools by category"
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-yellow-400 cursor-pointer"
            >
              <option value="all">All Categories</option>
              <option value="Performances & Logistics">Performances & Logistics</option>
              <option value="Personnel & Attendance">Personnel & Attendance</option>
              <option value="Music & Repertoire">Music & Repertoire</option>
              <option value="Website & Intake">Website & Intake</option>
              <option value="Finance">Finance</option>
              <option value="Business & Admin">Business & Admin</option>
            </select>

            {/* Sort Order Selector */}
            <select
              value={toolSortOrder}
              onChange={(e) => setToolSortOrder(e.target.value as "most_used" | "least_used" | "alphabetical")}
              aria-label="Sort tools order"
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-yellow-400 cursor-pointer"
            >
              <option value="least_used">Least Used First (0-Activity)</option>
              <option value="most_used">Most Used First</option>
              <option value="alphabetical">Alphabetical</option>
            </select>
          </div>
        </div>

        {/* Tools Adoption Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTools.map((item) => {
            const IconComponent = item.tool.icon;
            const isUnused = item.adoptionStatus === "unused";
            const isHigh = item.adoptionStatus === "high";

            return (
              <div
                key={item.tool.id}
                className={`border rounded-2xl p-4 transition-all flex flex-col justify-between ${
                  isUnused
                    ? "bg-red-950/10 border-red-500/20 hover:border-red-500/40"
                    : isHigh
                    ? "bg-slate-900/90 border-emerald-500/30 hover:border-emerald-500/50 shadow-sm"
                    : "bg-slate-900/60 border-slate-800 hover:border-slate-700"
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                        isUnused
                          ? "bg-red-500/10 text-red-400"
                          : isHigh
                          ? "bg-emerald-500/10 text-emerald-400"
                          : "bg-slate-800 text-slate-300"
                      }`}>
                        <IconComponent className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-white leading-tight">
                          {item.tool.title}
                        </h4>
                        <span className="text-[11px] text-slate-500 font-mono">
                          {item.tool.href}
                        </span>
                      </div>
                    </div>

                    {/* Adoption Pill */}
                    {isUnused ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/20 text-red-300 border border-red-500/30 shrink-0">
                        Zero Usage
                      </span>
                    ) : isHigh ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0">
                        High Usage
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-800 text-slate-300 shrink-0">
                        Moderate
                      </span>
                    )}
                  </div>

                  <div className="mt-1 text-[11px] text-slate-400">
                    Category: <span className="text-slate-300">{item.tool.category}</span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <span className="text-blue-400 flex items-center gap-1" title="Route Views">
                      <Eye className="w-3.5 h-3.5" />
                      <strong>{item.views}</strong> views
                    </span>
                    <span className="text-amber-400 flex items-center gap-1" title="Changes Made">
                      <MousePointerClick className="w-3.5 h-3.5" />
                      <strong>{item.interactions}</strong> changes
                    </span>
                  </div>

                  <Link
                    href={item.tool.href}
                    className="text-xs text-yellow-400 hover:text-yellow-300 flex items-center gap-1 group"
                  >
                    <span>Visit</span>
                    <ExternalLink className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Granular Activity Feed / Telemetry Log */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div>
            <h3 className="font-semibold text-white text-base">Recent Telemetry Activity Stream</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Chronological log of route navigations and operational changes.
              {selectedDateFilter && (
                <span className="text-yellow-400 ml-1">
                  Filtered to <strong>{selectedDateFilter}</strong>.
                </span>
              )}
            </p>
          </div>
          {selectedDateFilter && (
            <button
              type="button"
              onClick={() => setSelectedDateFilter(null)}
              className="text-xs px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              Clear date filter
            </button>
          )}
        </div>

        {finalFilteredEvents.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-xs">
            No telemetry events recorded for this selection.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3 font-semibold">Timestamp</th>
                  <th className="py-2.5 px-3 font-semibold">Musician</th>
                  <th className="py-2.5 px-3 font-semibold">Event Type</th>
                  <th className="py-2.5 px-3 font-semibold">Tool / Route</th>
                  <th className="py-2.5 px-3 font-semibold">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {finalFilteredEvents.slice(0, 50).map((ev) => (
                  <tr key={ev.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                      {new Date(ev.timestamp).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span className="font-medium text-white">{ev.userName}</span>
                      <span className="text-[10px] text-slate-500 ml-1.5">({ev.userRole})</span>
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      {ev.type === "route_view" ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/10 text-blue-300 border border-blue-500/20">
                          <Eye className="w-3 h-3" /> Route View
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                          <MousePointerClick className="w-3 h-3" /> Change / Interaction
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="font-semibold text-slate-200">{ev.toolTitle || ev.pathname}</span>
                      <span className="block text-[10px] text-slate-500 font-mono">{ev.pathname}</span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-400">
                      {ev.details || ev.action}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {finalFilteredEvents.length > 50 && (
              <div className="py-3 text-center text-slate-500 text-[11px]">
                Showing latest 50 events of {finalFilteredEvents.length} total.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Reset Confirmation Modal */}
      {isResetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-red-500/40 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-400">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Reset Portal Usage Metrics?</h3>
                <p className="text-xs text-slate-400">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Resetting metrics will permanently purge all recorded route view counts and interaction telemetry. All calendar heat maps, adoption rankings, and activity histories will start fresh from now.
            </p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsResetModalOpen(false)}
                disabled={isResetting}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteReset}
                disabled={isResetting}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-600/30 transition-all cursor-pointer"
              >
                {isResetting && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                <span>Confirm Reset</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
