"use client";

import React, { useEffect, useState, useMemo } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/lib/context/AuthContext";
import { canManageShirtSizes } from "@/lib/auth/permissions";
import { User, UserSchema, SHIRT_SIZES, ShirtSize } from "@/lib/schema/user";
import { Section, SectionSchema } from "@/lib/schema/section";
import AccessDenied from "@/components/portal/AccessDenied";
import PortalBreadcrumb from "@/components/portal/PortalBreadcrumb";
import { downloadFile } from "@/lib/portal/rosterDataIo";
import { toast } from "@/lib/context/ToastContext";
import {
  Shirt,
  Download,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Search,
  Users,
  AlertCircle,
  Sparkles,
} from "lucide-react";

type SortField = "name" | "shirtSize" | "section" | "status";
type SortDirection = "asc" | "desc";

// Sizing order index for logical sorting
const SIZE_ORDER: Record<string, number> = {
  XS: 1,
  S: 2,
  M: 3,
  L: 4,
  XL: 5,
  XXL: 6,
};

function escapeCsvCell(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n") || value.includes("\r")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export default function ShirtSizesAdminPage() {
  const { profile, loading: authLoading } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);

  // Search and filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [sizeFilter, setSizeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("active");

  // Sorting state
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  // Subscribe to Users & Sections
  useEffect(() => {
    const unsubUsers = onSnapshot(collection(db, "users"), (snapshot) => {
      const parsedList: User[] = [];
      snapshot.forEach((docSnap) => {
        const raw = { uid: docSnap.id, ...docSnap.data() };
        const parsed = UserSchema.safeParse(raw);
        if (parsed.success) {
          parsedList.push(parsed.data);
        } else {
          parsedList.push(raw as User);
        }
      });
      setUsers(parsedList);
      setLoading(false);
    });

    const unsubSections = onSnapshot(collection(db, "sections"), (snapshot) => {
      const parsedSecs: Section[] = [];
      snapshot.forEach((docSnap) => {
        const raw = { id: docSnap.id, ...docSnap.data() };
        const parsed = SectionSchema.safeParse(raw);
        if (parsed.success) {
          parsedSecs.push(parsed.data);
        } else {
          parsedSecs.push(raw as Section);
        }
      });
      setSections(parsedSecs);
    });

    return () => {
      unsubUsers();
      unsubSections();
    };
  }, []);

  const sectionNameMap = useMemo(() => {
    const map = new Map<string, string>();
    sections.forEach((sec) => {
      map.set(sec.id, sec.name);
    });
    return map;
  }, [sections]);

  // Overall counts across ensemble (active users)
  const sizeMetrics = useMemo(() => {
    const metrics: Record<string, number> = {
      XS: 0,
      S: 0,
      M: 0,
      L: 0,
      XL: 0,
      XXL: 0,
      unspecified: 0,
      total: 0,
    };

    const targetUsers = statusFilter === "all" 
      ? users 
      : users.filter((u) => (u.status || "active") === statusFilter);

    metrics.total = targetUsers.length;

    targetUsers.forEach((u) => {
      const size = (u.shirtSize || "").trim().toUpperCase();
      if (size && metrics[size] !== undefined) {
        metrics[size] += 1;
      } else {
        metrics.unspecified += 1;
      }
    });

    return metrics;
  }, [users, statusFilter]);

  // Filtered members list
  const filteredUsers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return users.filter((u) => {
      // Status filter
      if (statusFilter !== "all" && (u.status || "active") !== statusFilter) {
        return false;
      }

      // Size filter
      if (sizeFilter !== "all") {
        const uSize = (u.shirtSize || "").trim().toUpperCase();
        if (sizeFilter === "unspecified") {
          if (uSize && SHIRT_SIZES.includes(uSize as ShirtSize)) {
            return false;
          }
        } else if (uSize !== sizeFilter) {
          return false;
        }
      }

      // Search query (name, realName, email, section)
      if (query) {
        const dName = (u.displayName || "").toLowerCase();
        const rName = (u.realName || "").toLowerCase();
        const email = (u.email || "").toLowerCase();
        const secName = (u.sectionId ? sectionNameMap.get(u.sectionId) || u.sectionId : "").toLowerCase();
        return (
          dName.includes(query) ||
          rName.includes(query) ||
          email.includes(query) ||
          secName.includes(query)
        );
      }

      return true;
    });
  }, [users, searchQuery, sizeFilter, statusFilter, sectionNameMap]);

  // Sorted members list
  const sortedUsers = useMemo(() => {
    return [...filteredUsers].sort((a, b) => {
      let comparison = 0;

      if (sortField === "name") {
        const nameA = (a.displayName || a.realName || a.email || "").toLowerCase();
        const nameB = (b.displayName || b.realName || b.email || "").toLowerCase();
        comparison = nameA.localeCompare(nameB);
      } else if (sortField === "shirtSize") {
        const sizeA = (a.shirtSize || "").trim().toUpperCase();
        const sizeB = (b.shirtSize || "").trim().toUpperCase();
        const rankA = SIZE_ORDER[sizeA] || 999;
        const rankB = SIZE_ORDER[sizeB] || 999;
        if (rankA !== rankB) {
          comparison = rankA - rankB;
        } else {
          comparison = (a.displayName || "").localeCompare(b.displayName || "");
        }
      } else if (sortField === "section") {
        const secA = (a.sectionId ? sectionNameMap.get(a.sectionId) || a.sectionId : "").toLowerCase();
        const secB = (b.sectionId ? sectionNameMap.get(b.sectionId) || b.sectionId : "").toLowerCase();
        comparison = secA.localeCompare(secB);
      } else if (sortField === "status") {
        const statusA = (a.status || "active").toLowerCase();
        const statusB = (b.status || "active").toLowerCase();
        comparison = statusA.localeCompare(statusB);
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [filteredUsers, sortField, sortDirection, sectionNameMap]);

  const handleToggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // CSV Export
  const handleExportCsv = () => {
    if (sortedUsers.length === 0) {
      toast.error("No members to export.");
      return;
    }

    // Breakdown for export summary
    const exportCounts: Record<string, number> = {
      XS: 0,
      S: 0,
      M: 0,
      L: 0,
      XL: 0,
      XXL: 0,
      unspecified: 0,
    };

    const rows: string[] = ["Member Name,Shirt Size"];

    sortedUsers.forEach((u) => {
      const memberName = u.displayName || u.realName || u.email || "Musician";
      const rawSize = (u.shirtSize || "").trim().toUpperCase();
      const finalSize = SHIRT_SIZES.includes(rawSize as ShirtSize) ? rawSize : "Not specified";

      if (rawSize && exportCounts[rawSize] !== undefined) {
        exportCounts[rawSize] += 1;
      } else {
        exportCounts.unspecified += 1;
      }

      rows.push(`${escapeCsvCell(memberName)},${escapeCsvCell(finalSize)}`);
    });

    // Summary cell at the bottom of the table
    const summaryCellText = `XS: ${exportCounts.XS} | S: ${exportCounts.S} | M: ${exportCounts.M} | L: ${exportCounts.L} | XL: ${exportCounts.XL} | XXL: ${exportCounts.XXL} | Unspecified: ${exportCounts.unspecified} (Total: ${sortedUsers.length})`;
    rows.push(`${escapeCsvCell("Total Summary")},${escapeCsvCell(summaryCellText)}`);

    const csvContent = rows.join("\r\n");
    const dateStr = new Date().toISOString().split("T")[0];
    const filename = `eagleburger-shirt-sizes-${dateStr}.csv`;

    downloadFile(csvContent, filename, "text/csv;charset=utf-8;");
    toast.success(`Exported ${sortedUsers.length} member shirt sizes to CSV!`);
  };

  if (!authLoading && !canManageShirtSizes(profile)) {
    return <AccessDenied message="Only Community Managers and Band Administrators can manage member apparel preferences." />;
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <PortalBreadcrumb className="mb-2" />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400/10 text-amber-400 flex items-center justify-center border border-amber-400/20 shadow-xs">
              <Shirt className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                Member Shirt Sizes
              </h1>
              <p className="text-xs sm:text-sm text-slate-400">
                Community apparel roster &amp; merchandise fulfillment management
              </p>
            </div>
          </div>
        </div>

        {/* Quick Export Button in Header */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={loading || sortedUsers.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV ({sortedUsers.length})</span>
          </button>
        </div>
      </div>

      {/* Apparel Summary Breakdown Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {/* Total Members */}
        <div 
          onClick={() => setSizeFilter("all")}
          className={`p-3.5 rounded-xl border transition cursor-pointer ${
            sizeFilter === "all"
              ? "bg-amber-400/10 border-amber-400/50 ring-1 ring-amber-400/30"
              : "bg-slate-900/60 border-slate-800 hover:border-slate-700"
          }`}
        >
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Total</span>
            <Users className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-xl font-black text-white">{sizeMetrics.total}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">All Members</div>
        </div>

        {/* Sizes XS through XXL */}
        {SHIRT_SIZES.map((sz) => {
          const isSelected = sizeFilter === sz;
          const count = sizeMetrics[sz] || 0;
          return (
            <div
              key={sz}
              onClick={() => setSizeFilter(isSelected ? "all" : sz)}
              className={`p-3.5 rounded-xl border transition cursor-pointer ${
                isSelected
                  ? "bg-amber-400/15 border-amber-400/80 ring-1 ring-amber-400/40"
                  : "bg-slate-900/60 border-slate-800 hover:border-slate-700"
              }`}
            >
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-[11px] font-mono font-bold text-amber-300 uppercase">{sz}</span>
                <Shirt className="w-3.5 h-3.5 text-amber-400/70" />
              </div>
              <div className="text-xl font-black text-white">{count}</div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                {sizeMetrics.total > 0 ? Math.round((count / sizeMetrics.total) * 100) : 0}% of band
              </div>
            </div>
          );
        })}

        {/* Unspecified / Missing */}
        <div
          onClick={() => setSizeFilter(sizeFilter === "unspecified" ? "all" : "unspecified")}
          className={`p-3.5 rounded-xl border transition cursor-pointer ${
            sizeFilter === "unspecified"
              ? "bg-rose-500/15 border-rose-400/80 ring-1 ring-rose-400/40"
              : "bg-slate-900/60 border-slate-800 hover:border-slate-700"
          }`}
        >
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-semibold text-rose-400 uppercase tracking-wider">Unset</span>
            <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
          </div>
          <div className="text-xl font-black text-white">{sizeMetrics.unspecified}</div>
          <div className="text-[10px] text-rose-300/70 mt-0.5">Needs Size</div>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/40 p-3 rounded-2xl border border-slate-800">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search member name, email, or section..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Status Filter */}
          <div className="flex items-center gap-1 bg-slate-950/80 border border-slate-800 rounded-xl p-1">
            {(["active", "all"] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition cursor-pointer capitalize ${
                  statusFilter === st
                    ? "bg-amber-400 text-slate-950"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {st === "all" ? "All Statuses" : "Active Only"}
              </button>
            ))}
          </div>

          {/* Clear Filters */}
          {(searchQuery || sizeFilter !== "all" || statusFilter !== "active") && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setSizeFilter("all");
                setStatusFilter("active");
              }}
              className="text-xs text-slate-400 hover:text-amber-300 underline px-2 cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                {/* Column: Member Name */}
                <th
                  onClick={() => handleToggleSort("name")}
                  className="p-4 cursor-pointer hover:bg-slate-900 transition select-none group"
                  title="Sort by Member Name"
                >
                  <div className="flex items-center gap-1.5">
                    <span className={sortField === "name" ? "text-amber-400 font-bold" : "group-hover:text-white"}>
                      Member Name
                    </span>
                    {sortField === "name" ? (
                      sortDirection === "asc" ? (
                        <ArrowUp className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      ) : (
                        <ArrowDown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      )
                    ) : (
                      <ArrowUpDown className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-400 opacity-60 group-hover:opacity-100 transition shrink-0" />
                    )}
                  </div>
                </th>

                {/* Column: Shirt Size */}
                <th
                  onClick={() => handleToggleSort("shirtSize")}
                  className="p-4 cursor-pointer hover:bg-slate-900 transition select-none group"
                  title="Sort by Shirt Size"
                >
                  <div className="flex items-center gap-1.5">
                    <span className={sortField === "shirtSize" ? "text-amber-400 font-bold" : "group-hover:text-white"}>
                      Shirt Size
                    </span>
                    {sortField === "shirtSize" ? (
                      sortDirection === "asc" ? (
                        <ArrowUp className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      ) : (
                        <ArrowDown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      )
                    ) : (
                      <ArrowUpDown className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-400 opacity-60 group-hover:opacity-100 transition shrink-0" />
                    )}
                  </div>
                </th>

                {/* Column: Assigned Section */}
                <th
                  onClick={() => handleToggleSort("section")}
                  className="p-4 cursor-pointer hover:bg-slate-900 transition select-none group"
                  title="Sort by Section"
                >
                  <div className="flex items-center gap-1.5">
                    <span className={sortField === "section" ? "text-amber-400 font-bold" : "group-hover:text-white"}>
                      Assigned Section
                    </span>
                    {sortField === "section" ? (
                      sortDirection === "asc" ? (
                        <ArrowUp className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      ) : (
                        <ArrowDown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      )
                    ) : (
                      <ArrowUpDown className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-400 opacity-60 group-hover:opacity-100 transition shrink-0" />
                    )}
                  </div>
                </th>

                {/* Column: Status */}
                <th
                  onClick={() => handleToggleSort("status")}
                  className="p-4 cursor-pointer hover:bg-slate-900 transition select-none group"
                  title="Sort by Status"
                >
                  <div className="flex items-center gap-1.5">
                    <span className={sortField === "status" ? "text-amber-400 font-bold" : "group-hover:text-white"}>
                      Status
                    </span>
                    {sortField === "status" ? (
                      sortDirection === "asc" ? (
                        <ArrowUp className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      ) : (
                        <ArrowDown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      )
                    ) : (
                      <ArrowUpDown className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-400 opacity-60 group-hover:opacity-100 transition shrink-0" />
                    )}
                  </div>
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-500">
                    Loading member apparel preferences...
                  </td>
                </tr>
              ) : sortedUsers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-500">
                    No members found matching the selected filters.
                  </td>
                </tr>
              ) : (
                sortedUsers.map((u) => {
                  const rawSize = (u.shirtSize || "").trim().toUpperCase();
                  const isConfiguredSize = SHIRT_SIZES.includes(rawSize as ShirtSize);
                  const sectionName = u.sectionId ? sectionNameMap.get(u.sectionId) || u.sectionId : "General Ensemble";
                  const status = u.status || "active";

                  return (
                    <tr key={u.uid} className="hover:bg-slate-800/30 transition">
                      {/* Name */}
                      <td className="p-4">
                        <div className="font-bold text-white flex items-center gap-2 flex-wrap">
                          <span>{u.displayName || "Musician"}</span>
                          {u.realName && u.realName !== u.displayName && (
                            <span className="text-[11px] text-slate-400 font-normal">
                              ({u.realName})
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                          {u.email}
                        </div>
                      </td>

                      {/* Shirt Size */}
                      <td className="p-4">
                        {isConfiguredSize ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-mono font-bold text-xs bg-amber-400/10 text-amber-300 border border-amber-400/20">
                            <Shirt className="w-3 h-3 text-amber-400" />
                            {rawSize}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-800 text-slate-400 border border-slate-700/60">
                            <AlertCircle className="w-3 h-3 text-slate-500" />
                            Unspecified
                          </span>
                        )}
                      </td>

                      {/* Section */}
                      <td className="p-4 text-slate-300 font-medium">
                        {sectionName}
                      </td>

                      {/* Status */}
                      <td className="p-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold capitalize border ${
                            status === "active"
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                              : status === "pending"
                              ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                              : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              status === "active"
                                ? "bg-emerald-400"
                                : status === "pending"
                                ? "bg-amber-400"
                                : "bg-rose-400"
                            }`}
                          />
                          {status}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Action Bar Below the Table: CSV Export */}
      <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
        <div className="text-xs text-slate-400 text-center sm:text-left space-y-0.5">
          <p className="font-semibold text-slate-300 flex items-center justify-center sm:justify-start gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Merchandise Ordering &amp; Apparel Export</span>
          </p>
          <p className="text-[11px] text-slate-400">
            Export a clean CSV with member names and shirt sizes, including a complete fulfillment summary breakdown.
          </p>
        </div>

        <button
          type="button"
          onClick={handleExportCsv}
          disabled={loading || sortedUsers.length === 0}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
        >
          <Download className="w-4 h-4" />
          <span>Export Shirt Sizes (.csv)</span>
        </button>
      </div>
    </div>
  );
}

