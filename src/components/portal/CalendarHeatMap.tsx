"use client";

import React, { useMemo, useState } from "react";
import { PortalMetricEvent } from "@/lib/schema/metrics";
import { 
  Calendar as CalendarIcon, 
  Eye, 
  MousePointerClick, 
  Layers,
  Info
} from "lucide-react";

export type HeatMapMode = "all" | "views" | "interactions";

interface CalendarHeatMapProps {
  events: PortalMetricEvent[];
  weeksCount?: number; // default 16 weeks (~4 months)
  selectedDate: string | null;
  onSelectDate: (dateKey: string | null) => void;
  title?: string;
}

interface DayData {
  date: Date;
  dateKey: string; // "YYYY-MM-DD"
  dayOfWeek: number; // 0 (Sun) - 6 (Sat)
  views: number;
  interactions: number;
  total: number;
  events: PortalMetricEvent[];
}

export default function CalendarHeatMap({
  events,
  weeksCount = 16,
  selectedDate,
  onSelectDate,
  title = "Activity Calendar Heat Map",
}: CalendarHeatMapProps) {
  const [mode, setMode] = useState<HeatMapMode>("all");
  const [hoveredDay, setHoveredDay] = useState<DayData | null>(null);

  // Group events by dateKey
  const eventMap = useMemo(() => {
    const map = new Map<string, { views: number; interactions: number; list: PortalMetricEvent[] }>();
    events.forEach((ev) => {
      const key = ev.dateKey || (ev.timestamp ? ev.timestamp.slice(0, 10) : "");
      if (!key) return;

      const current = map.get(key) || { views: 0, interactions: 0, list: [] };
      if (ev.type === "route_view") {
        current.views++;
      } else {
        current.interactions++;
      }
      current.list.push(ev);
      map.set(key, current);
    });
    return map;
  }, [events]);

  // Build grid of weeks leading up to today
  const { weeks, monthLabels, totalActiveDays, busiestDay } = useMemo(() => {
    const today = new Date();
    // Normalize to end of day
    today.setHours(23, 59, 59, 999);

    const totalDays = weeksCount * 7;
    // Calculate start date: align to Sunday
    const start = new Date(today);
    start.setDate(today.getDate() - totalDays + (6 - today.getDay()));
    start.setHours(0, 0, 0, 0);

    const allDays: DayData[] = [];
    const cur = new Date(start);

    let highestVal = 0;
    let activeDays = 0;
    let peakDay: { dateKey: string; count: number } | null = null;

    while (cur <= today) {
      const y = cur.getFullYear();
      const m = String(cur.getMonth() + 1).padStart(2, "0");
      const d = String(cur.getDate()).padStart(2, "0");
      const key = `${y}-${m}-${d}`;
      const counts = eventMap.get(key) || { views: 0, interactions: 0, list: [] };

      const dayObj: DayData = {
        date: new Date(cur),
        dateKey: key,
        dayOfWeek: cur.getDay(),
        views: counts.views,
        interactions: counts.interactions,
        total: counts.views + counts.interactions,
        events: counts.list,
      };

      const val = mode === "all" ? dayObj.total : mode === "views" ? dayObj.views : dayObj.interactions;
      if (val > 0) activeDays++;
      if (val > highestVal) {
        highestVal = val;
        peakDay = { dateKey: key, count: val };
      }

      allDays.push(dayObj);
      cur.setDate(cur.getDate() + 1);
    }

    // Partition into columns of 7 days (Sun to Sat)
    const weeksList: DayData[][] = [];
    let currentWeek: DayData[] = [];

    allDays.forEach((day) => {
      currentWeek.push(day);
      if (day.dayOfWeek === 6) {
        weeksList.push(currentWeek);
        currentWeek = [];
      }
    });
    if (currentWeek.length > 0) {
      weeksList.push(currentWeek);
    }

    // Determine month headers along the top
    const months: { label: string; weekIndex: number }[] = [];
    let lastMonth = -1;
    weeksList.forEach((wk, idx) => {
      const firstInWeek = wk[0]?.date;
      if (firstInWeek && firstInWeek.getMonth() !== lastMonth) {
        lastMonth = firstInWeek.getMonth();
        months.push({
          label: firstInWeek.toLocaleString("en-US", { month: "short" }),
          weekIndex: idx,
        });
      }
    });

    return {
      weeks: weeksList,
      monthLabels: months,
      maxVal: Math.max(highestVal, 4),
      totalActiveDays: activeDays,
      busiestDay: peakDay,
    };
  }, [weeksCount, eventMap, mode]);

  // Color intensity scale based on mode
  const getCellColor = (count: number) => {
    if (count === 0) {
      return "bg-slate-900/60 border border-slate-800/60 hover:border-slate-600";
    }

    if (mode === "interactions") {
      // Amber/Gold palette for changes made
      if (count <= 1) return "bg-amber-950/70 border border-amber-800/70 text-amber-300";
      if (count <= 3) return "bg-amber-700/80 border border-amber-600/80 text-amber-200";
      if (count <= 6) return "bg-amber-500 border border-amber-400 text-amber-950 font-bold";
      return "bg-yellow-400 border border-yellow-300 text-slate-950 font-extrabold shadow-sm shadow-amber-500/20";
    }

    if (mode === "views") {
      // Blue/Cyan palette for route views
      if (count <= 2) return "bg-blue-950/70 border border-blue-800/70 text-blue-300";
      if (count <= 5) return "bg-blue-700/80 border border-blue-600/80 text-blue-200";
      if (count <= 9) return "bg-blue-500 border border-blue-400 text-white font-bold";
      return "bg-cyan-400 border border-cyan-300 text-slate-950 font-extrabold shadow-sm shadow-cyan-500/20";
    }

    // Default "all" activity: Emerald palette
    if (count <= 2) return "bg-emerald-950/70 border border-emerald-800/70 text-emerald-300";
    if (count <= 5) return "bg-emerald-700/80 border border-emerald-600/80 text-emerald-200";
    if (count <= 9) return "bg-emerald-500 border border-emerald-400 text-slate-950 font-bold";
    return "bg-emerald-400 border border-emerald-300 text-slate-950 font-extrabold shadow-sm shadow-emerald-500/20";
  };

  const getMetricValue = (day: DayData) => {
    if (mode === "views") return day.views;
    if (mode === "interactions") return day.interactions;
    return day.total;
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-5 shadow-xl backdrop-blur-sm">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-yellow-400" />
            <h3 className="font-semibold text-white text-base">{title}</h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Daily frequency of member navigation and operational changes across the portal.
          </p>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center bg-slate-950/80 p-1 rounded-xl border border-slate-800/90 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setMode("all")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              mode === "all"
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Combined</span>
          </button>
          <button
            type="button"
            onClick={() => setMode("views")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              mode === "views"
                ? "bg-blue-500/20 text-blue-300 border border-blue-500/40 shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Route Views</span>
          </button>
          <button
            type="button"
            onClick={() => setMode("interactions")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              mode === "interactions"
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <MousePointerClick className="w-3.5 h-3.5" />
            <span>Changes Made</span>
          </button>
        </div>
      </div>

      {/* Heat Map Grid Container */}
      <div className="pt-4 overflow-x-auto pb-2">
        <div className="min-w-[620px]">
          {/* Month labels bar */}
          <div className="flex pl-8 mb-1.5 text-[11px] font-medium text-slate-400 select-none">
            {monthLabels.map((m, i) => (
              <div
                key={i}
                style={{
                  width: `${(weeks.length > 0 ? (100 / weeks.length) : 0) * (i < monthLabels.length - 1 ? monthLabels[i + 1].weekIndex - m.weekIndex : weeks.length - m.weekIndex)}%`,
                }}
                className="truncate"
              >
                {m.label}
              </div>
            ))}
          </div>

          {/* Grid Rows: 7 days of the week */}
          <div className="flex">
            {/* Day of Week Labels */}
            <div className="flex flex-col justify-between pr-2.5 text-[10px] text-slate-500 select-none font-mono py-0.5 w-8">
              <span>Sun</span>
              <span>Tue</span>
              <span>Thu</span>
              <span>Sat</span>
            </div>

            {/* Weeks Columns */}
            <div className="flex gap-1.5 flex-1">
              {weeks.map((week, weekIdx) => (
                <div key={weekIdx} className="flex flex-col gap-1.5 flex-1">
                  {/* Fill empty slots if first week starts mid-week */}
                  {Array.from({ length: 7 }).map((_, dayOfWeek) => {
                    const day = week.find((d) => d.dayOfWeek === dayOfWeek);
                    if (!day) {
                      return <div key={dayOfWeek} className="w-3.5 h-3.5 opacity-0" />;
                    }

                    const val = getMetricValue(day);
                    const isSelected = selectedDate === day.dateKey;
                    const isHovered = hoveredDay?.dateKey === day.dateKey;

                    return (
                      <button
                        key={dayOfWeek}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            onSelectDate(null);
                          } else {
                            onSelectDate(day.dateKey);
                          }
                        }}
                        onMouseEnter={() => setHoveredDay(day)}
                        onMouseLeave={() => setHoveredDay(null)}
                        aria-label={`${day.dateKey}: ${val} ${mode}`}
                        className={`w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-sm transition-all relative group cursor-pointer ${getCellColor(
                          val
                        )} ${
                          isSelected
                            ? "ring-2 ring-yellow-400 ring-offset-1 ring-offset-slate-950 scale-125 z-10"
                            : isHovered
                            ? "scale-110 z-10"
                            : ""
                        }`}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Tooltip & Details Strip */}
      <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        {hoveredDay ? (
          <div className="flex items-center gap-3 text-slate-300">
            <span className="font-semibold text-white">
              {hoveredDay.date.toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
            <span className="text-slate-500">•</span>
            <span className="text-blue-400">
              <Eye className="w-3 h-3 inline mr-1" />
              {hoveredDay.views} view{hoveredDay.views === 1 ? "" : "s"}
            </span>
            <span className="text-slate-500">•</span>
            <span className="text-amber-400">
              <MousePointerClick className="w-3 h-3 inline mr-1" />
              {hoveredDay.interactions} change{hoveredDay.interactions === 1 ? "" : "s"}
            </span>
            <span className="text-slate-500 text-[11px] font-mono">
              (Click cell to filter feed)
            </span>
          </div>
        ) : selectedDate ? (
          <div className="flex items-center gap-2 text-yellow-400">
            <Info className="w-3.5 h-3.5" />
            <span>
              Filtered to <strong>{selectedDate}</strong>. Click cell or &quot;Clear Filter&quot; to restore full history.
            </span>
            <button
              type="button"
              onClick={() => onSelectDate(null)}
              className="text-xs text-slate-400 hover:text-white underline ml-1 cursor-pointer"
            >
              Clear filter
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-4 text-slate-400">
            <span>
              <strong>{totalActiveDays}</strong> active day{totalActiveDays === 1 ? "" : "s"} in past {weeksCount} weeks
            </span>
            {busiestDay && (
              <>
                <span className="text-slate-600">•</span>
                <span>
                  Peak: <strong>{busiestDay.count}</strong> on {busiestDay.dateKey}
                </span>
              </>
            )}
          </div>
        )}

        {/* Intensity Legend */}
        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 self-end sm:self-auto">
          <span>Less</span>
          <div className="w-3 h-3 rounded-sm bg-slate-900 border border-slate-800" />
          <div
            className={`w-3 h-3 rounded-sm ${
              mode === "interactions"
                ? "bg-amber-950 border border-amber-800"
                : mode === "views"
                ? "bg-blue-950 border border-blue-800"
                : "bg-emerald-950 border border-emerald-800"
            }`}
          />
          <div
            className={`w-3 h-3 rounded-sm ${
              mode === "interactions"
                ? "bg-amber-700 border border-amber-600"
                : mode === "views"
                ? "bg-blue-700 border border-blue-600"
                : "bg-emerald-700 border border-emerald-600"
            }`}
          />
          <div
            className={`w-3 h-3 rounded-sm ${
              mode === "interactions"
                ? "bg-amber-500"
                : mode === "views"
                ? "bg-blue-500"
                : "bg-emerald-500"
            }`}
          />
          <div
            className={`w-3 h-3 rounded-sm ${
              mode === "interactions"
                ? "bg-yellow-400"
                : mode === "views"
                ? "bg-cyan-400"
                : "bg-emerald-400"
            }`}
          />
          <span>More</span>
        </div>
      </div>
    </div>
  );
}
