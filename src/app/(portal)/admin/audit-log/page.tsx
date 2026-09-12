"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/lib/context/AuthContext";
import { isAdmin } from "@/lib/auth/permissions";
import {
  AdminLog,
  AdminLogSchema,
  AdminLogCategory,
} from "@/lib/schema/adminLog";
import {
  ShieldAlert,
  History,
  Search,
  UserCog,
  ChevronDown,
  ChevronUp,
  UserX,
  UserCheck,
  Trash2,
  Lock,
  Layers,
  ArrowLeft,
  Clock,
  User,
} from "lucide-react";

const CATEGORIES: { id: AdminLogCategory | "all"; label: string }[] = [
  { id: "all", label: "All Categories" },
  { id: "personnel", label: "Personnel & Roster" },
  { id: "finance", label: "Financial & Payouts" },
  { id: "logistics", label: "Gigs & Logistics" },
  { id: "system", label: "System & Security" },
];

export default function AdminAuditLogPage() {
  const { profile, loading: authLoading } = useAuth();
  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<AdminLogCategory | "all">("all");
  const [selectedAction, setSelectedAction] = useState<string>("all");
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "admin_logs"),
      (snapshot) => {
        const records: AdminLog[] = [];
        snapshot.forEach((docSnap) => {
          const raw = docSnap.data();
          const parsed = AdminLogSchema.safeParse(raw);
          if (parsed.success) {
            records.push(parsed.data);
          } else {
            records.push({
              id: docSnap.id,
              action: "system_config",
              category: "personnel",
              actorUid: raw.actorUid || "",
              actorName: raw.actorName || "Unknown",
              actorEmail: raw.actorEmail || "",
              targetId: raw.targetId || null,
              targetName: raw.targetName || null,
              description: raw.description || "Unparsed admin action",
              metadata: raw.metadata || {},
              timestamp: raw.timestamp || new Date().toISOString(),
            });
          }
        });

        // Sort descending by timestamp in memory
        records.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setLogs(records);
        setLoadingLogs(false);
      },
      (err) => {
        console.error("Error listening to admin_logs:", err);
        setLoadingLogs(false);
      }
    );

    return () => unsub();
  }, []);

  // Filtered log items
  const filteredLogs = useMemo(() => {
    return logs.filter((item) => {
      // Category filter
      if (selectedCategory !== "all" && item.category !== selectedCategory) {
        return false;
      }

      // Action type filter
      if (selectedAction !== "all" && item.action !== selectedAction) {
        return false;
      }

      // Search term
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesDesc = item.description.toLowerCase().includes(q);
        const matchesActor =
          item.actorName.toLowerCase().includes(q) || item.actorEmail.toLowerCase().includes(q);
        const matchesTarget =
          (item.targetName || "").toLowerCase().includes(q) ||
          (item.targetId || "").toLowerCase().includes(q);
        return matchesDesc || matchesActor || matchesTarget;
      }

      return true;
    });
  }, [logs, selectedCategory, selectedAction, searchQuery]);

  // Unique actions for the action dropdown
  const uniqueActions = useMemo(() => {
    const set = new Set<string>();
    logs.forEach((l) => set.add(l.action));
    return Array.from(set).sort();
  }, [logs]);

  // Quick Telemetry Counters
  const telemetry = useMemo(() => {
    let purges = 0;
    let deactivations = 0;
    let reactivations = 0;
    let roleChanges = 0;

    logs.forEach((l) => {
      if (l.action === "member_purged") purges++;
      else if (l.action === "member_deactivated" || l.action === "member_self_deactivated")
        deactivations++;
      else if (l.action === "member_reactivated") reactivations++;
      else if (l.action === "role_updated") roleChanges++;
    });

    return { purges, deactivations, reactivations, roleChanges, total: logs.length };
  }, [logs]);

  if (authLoading) {
    return <div className="p-8 text-slate-400">Verifying administrator authorization...</div>;
  }

  if (!isAdmin(profile)) {
    return (
      <div className="p-8 text-amber-400 flex items-center gap-3">
        <ShieldAlert className="w-6 h-6 shrink-0" />
        <span>Administrator clearance required to view Band Audit Logs.</span>
      </div>
    );
  }

  const getActionBadge = (action: string) => {
    switch (action) {
      case "member_purged":
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/30">
            <Trash2 className="w-3 h-3" /> Purged
          </span>
        );
      case "member_deactivated":
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/30">
            <UserX className="w-3 h-3" /> Deactivated
          </span>
        );
      case "member_self_deactivated":
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-400 border border-orange-500/30">
            <UserX className="w-3 h-3" /> Self-Departed
          </span>
        );
      case "member_reactivated":
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <UserCheck className="w-3 h-3" /> Reactivated
          </span>
        );
      case "role_updated":
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
            <Lock className="w-3 h-3" /> Roles Updated
          </span>
        );
      case "section_assigned":
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/30">
            <Layers className="w-3 h-3" /> Section Assigned
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
            {action.replace(/_/g, " ")}
          </span>
        );
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin/users"
              className="text-xs font-mono text-slate-400 hover:text-white flex items-center gap-1 transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to User Studio
            </Link>
            <span className="text-slate-600">&bull;</span>
            <span className="text-xs font-mono text-yellow-400 uppercase font-bold tracking-wider">
              Audit Telemetry
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2 mt-1">
            <History className="text-yellow-400 w-6 h-6" /> Administrative Audit Log
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-0.5">
            Immutable tracking of member lifecycle changes, role assignments, departures, and purges.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/admin/users"
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-700 transition flex items-center gap-2 shadow-sm"
          >
            <UserCog className="w-4 h-4 text-yellow-400" />
            <span>Manage Users</span>
          </Link>
        </div>
      </div>

      {/* Telemetry Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-1">
          <span className="text-[11px] font-mono text-slate-400 uppercase">Total Log Entries</span>
          <div className="text-2xl font-bold text-white">{telemetry.total}</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-1">
          <span className="text-[11px] font-mono text-orange-400 uppercase">Deactivations</span>
          <div className="text-2xl font-bold text-orange-400">{telemetry.deactivations}</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-1">
          <span className="text-[11px] font-mono text-indigo-400 uppercase">Role Adjustments</span>
          <div className="text-2xl font-bold text-indigo-400">{telemetry.roleChanges}</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-1">
          <span className="text-[11px] font-mono text-red-400 uppercase">Permanent Purges</span>
          <div className="text-2xl font-bold text-red-400">{telemetry.purges}</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-3">
        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 ${
                selectedCategory === cat.id
                  ? "bg-yellow-400 text-slate-950 shadow-sm"
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Action Type & Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 border-t border-slate-800/80">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-medium">Filter Action:</span>
            <select
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-yellow-400"
            >
              <option value="all">All Actions ({logs.length})</option>
              {uniqueActions.map((act) => (
                <option key={act} value={act}>
                  {act}
                </option>
              ))}
            </select>
          </div>

          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search description, actor, or target..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400"
            />
          </div>
        </div>
      </div>

      {/* Logs Feed */}
      <div className="space-y-3">
        {loadingLogs ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            Streaming audit records from Cloud Firestore...
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-12 text-center text-slate-500 bg-slate-900/40 rounded-2xl border border-slate-800 text-xs">
            No audit records match the selected filter criteria.
          </div>
        ) : (
          filteredLogs.map((log) => {
            const isExpanded = expandedLogId === log.id;
            const hasMetadata =
              log.metadata &&
              typeof log.metadata === "object" &&
              Object.keys(log.metadata).length > 0;

            const formattedTime = new Date(log.timestamp).toLocaleString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
              hour: "numeric",
              minute: "2-digit",
              second: "2-digit",
              hour12: true,
            });

            return (
              <div
                key={log.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-4.5 space-y-3 hover:border-slate-700 transition"
              >
                {/* Header row */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    {getActionBadge(log.action)}
                    <span className="text-[11px] font-mono text-slate-400 uppercase px-2 py-0.5 rounded bg-slate-950 border border-slate-800">
                      {log.category}
                    </span>
                    {log.targetName && (
                      <span className="text-xs font-semibold text-amber-300">
                        Target: {log.targetName}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-slate-400 text-[11px] font-mono shrink-0">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    <span>{formattedTime}</span>
                  </div>
                </div>

                {/* Description */}
                <p className="text-xs sm:text-sm text-slate-200 font-medium leading-relaxed">
                  {log.description}
                </p>

                {/* Actor info & Metadata Toggle */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pt-2 border-t border-slate-800/60 text-[11px] text-slate-400">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="flex items-center gap-1 text-slate-300 font-semibold">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      {log.actorName}
                    </span>
                    {log.actorEmail && (
                      <span className="font-mono text-slate-500">({log.actorEmail})</span>
                    )}
                    {log.actorUid && (
                      <span className="font-mono text-slate-600 text-[10px]">
                        UID: {log.actorUid.slice(0, 8)}...
                      </span>
                    )}
                  </div>

                  {hasMetadata && (
                    <button
                      type="button"
                      onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                      className="text-xs text-yellow-400 hover:text-yellow-300 transition flex items-center gap-1 font-mono"
                    >
                      <span>{isExpanded ? "Hide Metadata" : "View Metadata"}</span>
                      {isExpanded ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </button>
                  )}
                </div>

                {/* Expanded Metadata JSON */}
                {isExpanded && hasMetadata && (
                  <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1 animate-in fade-in duration-150">
                    <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">
                      Payload Metadata:
                    </span>
                    <pre className="text-[11px] font-mono text-emerald-400 whitespace-pre-wrap overflow-x-auto p-1">
                      {JSON.stringify(log.metadata, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
