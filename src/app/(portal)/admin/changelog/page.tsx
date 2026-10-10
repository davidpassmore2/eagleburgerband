"use client";

import React, { useState, useMemo } from "react";
import { useAuth } from "@/lib/context/AuthContext";
import { canViewChangelog } from "@/lib/auth/permissions";
import { STAGE_CHANGELOG } from "@/lib/data/changelogData";
import AccessDenied from "@/components/portal/AccessDenied";
import PortalBreadcrumb from "@/components/portal/PortalBreadcrumb";
import {
  History,
  Search,
  Milestone,
  Sparkles,
  ArrowUpDown,
  CheckCircle2,
  Layers,
  ChevronDown,
  ChevronRight,
  Filter,
} from "lucide-react";

export default function StageChangelogPage() {
  const { profile, loading: authLoading } = useAuth();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");
  const [collapsedStages, setCollapsedStages] = useState<Record<number, boolean>>({});

  // Unique categories for filtering
  const categories = useMemo(() => {
    const set = new Set<string>();
    STAGE_CHANGELOG.forEach((item) => {
      if (item.category) set.add(item.category);
    });
    return Array.from(set).sort();
  }, []);

  // Filtered and sorted stages
  const filteredStages = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    const list = STAGE_CHANGELOG.filter((item) => {
      // Category filter
      if (selectedCategory !== "all" && item.category !== selectedCategory) {
        return false;
      }

      // Search query (matches stage number, title, category, or bullet points)
      if (q) {
        const stageNumStr = String(item.stage);
        const titleMatch = item.title.toLowerCase().includes(q);
        const categoryMatch = item.category?.toLowerCase().includes(q);
        const bulletMatch = item.accomplishments.some((b) => b.toLowerCase().includes(q));

        if (!stageNumStr.includes(q) && !titleMatch && !categoryMatch && !bulletMatch) {
          return false;
        }
      }

      return true;
    });

    return [...list].sort((a, b) => {
      return sortOrder === "desc" ? b.stage - a.stage : a.stage - b.stage;
    });
  }, [searchQuery, selectedCategory, sortOrder]);

  const toggleStageCollapse = (stageNum: number) => {
    setCollapsedStages((prev) => ({
      ...prev,
      [stageNum]: !prev[stageNum],
    }));
  };

  const handleExpandAll = () => {
    setCollapsedStages({});
  };

  const handleCollapseAll = () => {
    const allCollapsed: Record<number, boolean> = {};
    STAGE_CHANGELOG.forEach((item) => {
      allCollapsed[item.stage] = true;
    });
    setCollapsedStages(allCollapsed);
  };

  if (!authLoading && !canViewChangelog(profile)) {
    return <AccessDenied message="You do not have permission to view the system changelog." />;
  }

  const latestStage = STAGE_CHANGELOG.length > 0 ? STAGE_CHANGELOG[0].stage : 0;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <PortalBreadcrumb className="mb-2" />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400/10 text-amber-400 flex items-center justify-center border border-amber-400/20 shadow-xs">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                Stage Changelog
              </h1>
              <p className="text-xs sm:text-sm text-slate-400">
                Complete platform release milestones &amp; architectural accomplishments
              </p>
            </div>
          </div>
        </div>

        {/* Quick Summary Pill */}
        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-xl bg-amber-400/10 text-amber-300 border border-amber-400/20 font-mono text-xs font-bold flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Current: Stage {latestStage} Complete</span>
          </span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Total Stages
            </div>
            <div className="text-2xl font-black text-white mt-0.5">{STAGE_CHANGELOG.length}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Stages 1 through {latestStage}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-400/10 text-amber-400 flex items-center justify-center border border-amber-400/20">
            <Milestone className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Latest Release
            </div>
            <div className="text-2xl font-black text-amber-300 mt-0.5">Stage {latestStage}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Universal Breadcrumbs &amp; Apparel</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-400/10 text-amber-400 flex items-center justify-center border border-amber-400/20">
            <Sparkles className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Active Filters
            </div>
            <div className="text-2xl font-black text-white mt-0.5">{filteredStages.length}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Matching Stages Shown</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-800 text-slate-300 flex items-center justify-center border border-slate-700">
            <Layers className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-slate-900/40 p-3 rounded-2xl border border-slate-800">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search by stage number, title, or accomplishment keyword..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Category Dropdown */}
          <div className="flex items-center gap-1.5 bg-slate-950/80 border border-slate-800 rounded-xl px-2.5 py-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-transparent text-xs text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="all" className="bg-slate-900 text-slate-200">
                All Categories ({STAGE_CHANGELOG.length})
              </option>
              {categories.map((cat) => (
                <option key={cat} value={cat} className="bg-slate-900 text-slate-200">
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Sort Order Toggle */}
          <button
            type="button"
            onClick={() => setSortOrder((prev) => (prev === "desc" ? "asc" : "desc"))}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs font-medium text-slate-300 hover:text-white hover:border-slate-700 transition cursor-pointer"
            title="Toggle sort direction"
          >
            <ArrowUpDown className="w-3.5 h-3.5 text-amber-400" />
            <span>{sortOrder === "desc" ? "Newest First" : "Oldest First"}</span>
          </button>

          {/* Expand / Collapse Actions */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleExpandAll}
              className="text-[11px] text-slate-400 hover:text-white px-2 py-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
            >
              Expand All
            </button>
            <button
              type="button"
              onClick={handleCollapseAll}
              className="text-[11px] text-slate-400 hover:text-white px-2 py-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
            >
              Collapse All
            </button>
          </div>

          {/* Reset Filters */}
          {(searchQuery || selectedCategory !== "all") && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setSelectedCategory("all");
              }}
              className="text-xs text-slate-400 hover:text-amber-300 underline px-1 cursor-pointer"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Stage Items List */}
      <div className="space-y-3">
        {filteredStages.length === 0 ? (
          <div className="p-12 text-center bg-slate-900/40 border border-slate-800 rounded-2xl text-slate-500 text-xs">
            No stages found matching &ldquo;{searchQuery}&rdquo;.
          </div>
        ) : (
          filteredStages.map((item) => {
            const isCollapsed = Boolean(collapsedStages[item.stage]);

            return (
              <div
                key={item.stage}
                className="bg-slate-900/50 hover:bg-slate-900/70 border border-slate-800 hover:border-slate-700 rounded-2xl transition duration-150 overflow-hidden shadow-xs"
              >
                {/* Stage Header */}
                <div
                  onClick={() => toggleStageCollapse(item.stage)}
                  className="p-4 sm:p-5 flex items-start sm:items-center justify-between gap-3 cursor-pointer select-none"
                >
                  <div className="flex items-start sm:items-center gap-3 flex-1 min-w-0">
                    <button
                      type="button"
                      className="p-1 text-slate-400 hover:text-white transition mt-0.5 sm:mt-0"
                      aria-label={isCollapsed ? "Expand" : "Collapse"}
                    >
                      {isCollapsed ? (
                        <ChevronRight className="w-4 h-4 text-slate-500" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-amber-400" />
                      )}
                    </button>

                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2.5 py-1 rounded-lg font-mono font-black text-xs bg-amber-400/10 text-amber-300 border border-amber-400/20 shrink-0">
                        Stage {item.stage}
                      </span>
                      {item.category && (
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 border border-slate-700 shrink-0">
                          {item.category}
                        </span>
                      )}
                      <h2 className="text-sm font-bold text-white tracking-tight break-words">
                        {item.title}
                      </h2>
                    </div>
                  </div>

                  <span className="text-[11px] text-slate-500 shrink-0 hidden sm:inline">
                    {item.accomplishments.length} accomplishments
                  </span>
                </div>

                {/* Accomplishments Body */}
                {!isCollapsed && (
                  <div className="px-5 pb-5 pt-1 border-t border-slate-800/60 bg-slate-950/30">
                    <ul className="space-y-2 mt-3">
                      {item.accomplishments.map((bullet, idx) => (
                        <li key={idx} className="flex items-start gap-2.5 text-xs text-slate-300 leading-relaxed">
                          <CheckCircle2 className="w-3.5 h-3.5 text-amber-400/80 shrink-0 mt-0.5" />
                          <span>{bullet}</span>
                        </li>
                      ))}
                    </ul>
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
