"use client";

import React, { useState, useMemo } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Sparkles,
  RotateCcw,
  Rss,
} from "lucide-react";
import PortalDayEventsModal, {
  AttendanceStatus,
  DayModalGig,
} from "./PortalDayEventsModal";
import CalendarSubscribeModal from "./CalendarSubscribeModal";

export interface MonthCalendarGig extends DayModalGig {
  isCancelled?: boolean;
}

interface PortalMonthCalendarProps {
  gigs: MonthCalendarGig[];
  userRsvps: Record<string, AttendanceStatus>;
  onRsvpChange?: (gigId: string, status: AttendanceStatus) => Promise<void>;
  isUpdatingRsvp?: boolean;
  variant?: "compact" | "expanded";
  className?: string;
}

const WEEKDAY_NAMES = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export default function PortalMonthCalendar({
  gigs,
  userRsvps,
  onRsvpChange,
  isUpdatingRsvp,
  variant = "compact",
  className = "",
}: PortalMonthCalendarProps) {
  // Determine default initial month: current month, or the month of the first upcoming gig if later
  const today = useMemo(() => new Date(), []);
  const todayDateStr = useMemo(() => {
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, "0");
    const d = String(today.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }, [today]);

  const [activeDate, setActiveDate] = useState(() => {
    // If there is an upcoming gig this month or in future, find the first one
    const nowStr = today.toISOString().split("T")[0];
    const nextGig = gigs.find((g) => g.date >= nowStr && g.status !== "cancelled");
    if (nextGig) {
      const parts = nextGig.date.split("-");
      if (parts.length === 3) {
        return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, 1);
      }
    }
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFeedModalOpen, setIsFeedModalOpen] = useState(false);

  // Month navigation
  const currentYear = activeDate.getFullYear();
  const currentMonth = activeDate.getMonth();

  // Compute available years for dropdown selection
  const availableYears = useMemo(() => {
    const currentY = today.getFullYear();
    const set = new Set<number>([
      currentY - 3,
      currentY - 2,
      currentY - 1,
      currentY,
      currentY + 1,
      currentY + 2,
      currentY + 3,
      currentY + 4,
    ]);
    gigs.forEach((g) => {
      if (g.date) {
        const y = parseInt(g.date.split("-")[0], 10);
        if (!isNaN(y)) set.add(y);
      }
    });
    return Array.from(set).sort((a, b) => a - b);
  }, [gigs, today]);

  const handleMonthChange = (newMonth: number) => {
    setActiveDate(new Date(currentYear, newMonth, 1));
  };

  const handleYearChange = (newYear: number) => {
    setActiveDate(new Date(newYear, currentMonth, 1));
  };

  const handlePrevMonth = () => {
    setActiveDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const handleNextMonth = () => {
    setActiveDate(new Date(currentYear, currentMonth + 1, 1));
  };

  const handleGoToday = () => {
    setActiveDate(new Date(today.getFullYear(), today.getMonth(), 1));
  };

  // Group gigs by date string "YYYY-MM-DD"
  const gigsByDate = useMemo(() => {
    const map = new Map<string, MonthCalendarGig[]>();
    gigs.forEach((gig) => {
      if (!gig.date) return;
      const list = map.get(gig.date) || [];
      list.push(gig);
      map.set(gig.date, list);
    });
    return map;
  }, [gigs]);

  // Calendar cells computation
  const calendarCells = useMemo(() => {
    const cells: {
      dateStr: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      gigs: MonthCalendarGig[];
    }[] = [];

    // First day of current month (0: Sunday .. 6: Saturday)
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
    const daysInCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

    // Previous month filler days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      const dateStr = `${prevYear}-${String(prevMonth + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
      cells.push({
        dateStr,
        dayNumber: dayNum,
        isCurrentMonth: false,
        isToday: dateStr === todayDateStr,
        gigs: gigsByDate.get(dateStr) || [],
      });
    }

    // Current month days
    for (let dayNum = 1; dayNum <= daysInCurrentMonth; dayNum++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
      cells.push({
        dateStr,
        dayNumber: dayNum,
        isCurrentMonth: true,
        isToday: dateStr === todayDateStr,
        gigs: gigsByDate.get(dateStr) || [],
      });
    }

    // Next month filler days (fill up to total multiples of 7)
    const totalCells = Math.ceil(cells.length / 7) * 7;
    const remaining = totalCells - cells.length;
    for (let dayNum = 1; dayNum <= remaining; dayNum++) {
      const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
      const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;
      const dateStr = `${nextYear}-${String(nextMonth + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
      cells.push({
        dateStr,
        dayNumber: dayNum,
        isCurrentMonth: false,
        isToday: dateStr === todayDateStr,
        gigs: gigsByDate.get(dateStr) || [],
      });
    }

    return cells;
  }, [currentYear, currentMonth, todayDateStr, gigsByDate]);

  // Click handler for day cell
  const handleDayClick = (dateStr: string, dayGigs: MonthCalendarGig[]) => {
    if (dayGigs.length > 0) {
      setSelectedDate(dateStr);
      setIsModalOpen(true);
    }
  };

  // Selected day's gigs for modal
  const selectedDayGigs = useMemo(() => {
    if (!selectedDate) return [];
    return gigsByDate.get(selectedDate) || [];
  }, [selectedDate, gigsByDate]);

  return (
    <div
      suppressHydrationWarning
      style={{
        backgroundColor: "var(--ebb-surface)",
        borderColor: "var(--ebb-border)",
      }}
      className={`border rounded-2xl p-4 sm:p-5 shadow transition-colors flex flex-col justify-between ${className}`}
    >
      <div>
        {/* Calendar Header with Expanded Date Controls & Feed Modal Launcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 mb-3 border-b border-white/5">
          {/* Left: Icon + Month Dropdown + Year Dropdown */}
          <div className="flex items-center gap-2 flex-wrap">
            <div
              suppressHydrationWarning
              style={{
                backgroundColor: "var(--ebb-surface-muted)",
                borderColor: "var(--ebb-border)",
                color: "var(--ebb-primary)",
              }}
              className="w-8 h-8 rounded-lg border flex items-center justify-center shrink-0"
            >
              <CalendarIcon className="w-4 h-4" />
            </div>

            {/* Month Select Dropdown */}
            <select
              value={currentMonth}
              onChange={(e) => handleMonthChange(parseInt(e.target.value, 10))}
              aria-label="Select month"
              className="bg-black/40 hover:bg-black/60 border border-white/10 hover:border-white/20 rounded-lg px-2.5 py-1 text-xs sm:text-sm font-extrabold text-white cursor-pointer focus:outline-none focus:ring-1 focus:ring-yellow-400 transition"
            >
              {MONTH_NAMES.map((name, idx) => (
                <option key={name} value={idx} className="bg-slate-900 text-white">
                  {name}
                </option>
              ))}
            </select>

            {/* Year Select Dropdown */}
            <select
              value={currentYear}
              onChange={(e) => handleYearChange(parseInt(e.target.value, 10))}
              aria-label="Select year"
              className="bg-black/40 hover:bg-black/60 border border-white/10 hover:border-white/20 rounded-lg px-2 py-1 text-xs sm:text-sm font-extrabold text-white cursor-pointer focus:outline-none focus:ring-1 focus:ring-yellow-400 transition"
            >
              {availableYears.map((yr) => (
                <option key={yr} value={yr} className="bg-slate-900 text-white">
                  {yr}
                </option>
              ))}
            </select>
          </div>

          {/* Right: Feed Sync Button + Today Button + Prev/Next Buttons */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Manage Calendar Feed Button */}
            <button
              type="button"
              onClick={() => setIsFeedModalOpen(true)}
              className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-yellow-400/10 hover:bg-yellow-400/20 text-yellow-400 border border-yellow-400/30 flex items-center gap-1.5 transition"
              title="Subscribe to iCal / Google / Apple Calendar feed"
            >
              <Rss className="w-3.5 h-3.5" />
              <span>Sync Feed</span>
            </button>

            {/* Today Reset Button */}
            <button
              type="button"
              onClick={handleGoToday}
              className={`text-xs font-bold px-2.5 py-1 rounded-lg transition flex items-center gap-1 border ${
                currentYear === today.getFullYear() && currentMonth === today.getMonth()
                  ? "bg-white/5 border-white/5 text-slate-400 cursor-default"
                  : "bg-white/10 hover:bg-white/20 border-white/10 text-white hover:text-yellow-400 shadow-sm"
              }`}
              title="Reset date controls to today's active month"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Today</span>
            </button>

            {/* Prev Month */}
            <button
              type="button"
              onClick={handlePrevMonth}
              aria-label="Previous Month"
              className="p-1.5 rounded-lg border border-white/5 hover:border-white/15 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Next Month */}
            <button
              type="button"
              onClick={handleNextMonth}
              aria-label="Next Month"
              className="p-1.5 rounded-lg border border-white/5 hover:border-white/15 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Days of Week Row */}
        <div className="grid grid-cols-7 gap-1 text-center mb-1.5">
          {WEEKDAY_NAMES.map((name) => (
            <div
              key={name}
              className="text-[10px] sm:text-xs font-mono font-bold uppercase text-slate-400 py-1"
            >
              {name}
            </div>
          ))}
        </div>

        {/* Month Day Grid */}
        <div className="grid grid-cols-7 gap-1 sm:gap-1.5 text-center">
          {calendarCells.map((cell) => {
            const hasGigs = cell.gigs.length > 0;
            
            return (
              <button
                key={cell.dateStr}
                type="button"
                disabled={!hasGigs}
                onClick={() => handleDayClick(cell.dateStr, cell.gigs)}
                className={`group relative rounded-xl transition select-none ${
                  variant === "expanded"
                    ? "min-h-[5.5rem] sm:min-h-[6.5rem] p-1.5 sm:p-2 flex flex-col items-start justify-start border border-white/5"
                    : "h-10 sm:h-11 p-1 flex flex-col items-center justify-center"
                } ${
                  !cell.isCurrentMonth
                    ? "opacity-30 hover:opacity-50"
                    : "opacity-100"
                } ${
                  hasGigs
                    ? "cursor-pointer hover:bg-white/10 ring-1 ring-white/10 hover:ring-white/30"
                    : "cursor-default"
                } ${
                  cell.isToday
                    ? "font-black bg-white/5 ring-1 ring-yellow-400/50"
                    : ""
                }`}
                title={
                  hasGigs
                    ? `${cell.gigs.length} gig(s) on ${cell.dateStr} - Click to view details`
                    : cell.dateStr
                }
              >
                {variant === "expanded" ? (
                  // Expanded Cell View
                  <>
                    <div className="flex items-center justify-between w-full mb-1">
                      <span
                        className={`text-xs sm:text-sm ${
                          cell.isToday
                            ? "text-yellow-400 font-bold"
                            : cell.isCurrentMonth
                            ? "text-slate-200 font-bold"
                            : "text-slate-500"
                        }`}
                      >
                        {cell.dayNumber}
                      </span>
                      {hasGigs && (
                        <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded-full bg-white/10 text-slate-300">
                          {cell.gigs.length} {cell.gigs.length === 1 ? "gig" : "gigs"}
                        </span>
                      )}
                    </div>

                    {hasGigs && (
                      <div className="w-full space-y-1 overflow-hidden">
                        {cell.gigs.map((gig) => {
                          const rsvp = userRsvps[gig.id];
                          const title =
                            gig.internalLogistics?.title || gig.publicDetails?.title || "Gig";
                          let pillColor = "bg-sky-500/20 text-sky-300 border-sky-500/30";
                          if (rsvp === "attending")
                            pillColor = "bg-emerald-500/20 text-emerald-300 border-emerald-500/40";
                          else if (rsvp === "tentative")
                            pillColor = "bg-amber-500/20 text-amber-300 border-amber-500/40";
                          else if (rsvp === "declined")
                            pillColor = "bg-rose-500/20 text-rose-300 border-rose-500/40";

                          return (
                            <div
                              key={gig.id}
                              className={`w-full text-left truncate text-[10px] sm:text-xs font-semibold px-1.5 py-0.5 rounded border transition-transform group-hover:scale-[1.02] ${pillColor}`}
                              title={`${title} - Click for call sheet & RSVP`}
                            >
                              {title}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                ) : (
                  // Compact Cell View
                  <>
                    <span
                      className={`text-xs ${
                        cell.isToday
                          ? "text-yellow-400 font-bold"
                          : cell.isCurrentMonth
                          ? "text-slate-200"
                          : "text-slate-500"
                      }`}
                    >
                      {cell.dayNumber}
                    </span>

                    {hasGigs && (
                      <div className="flex items-center gap-0.5 mt-0.5">
                        {cell.gigs.slice(0, 3).map((gig, idx) => {
                          const rsvp = userRsvps[gig.id];
                          let dotColor = "bg-sky-400";
                          if (rsvp === "attending") dotColor = "bg-emerald-400";
                          else if (rsvp === "tentative") dotColor = "bg-amber-400";
                          else if (rsvp === "declined") dotColor = "bg-rose-400";

                          return (
                            <span
                              key={idx}
                              className={`w-1.5 h-1.5 rounded-full ${dotColor} transition-transform group-hover:scale-125`}
                            />
                          );
                        })}
                        {cell.gigs.length > 3 && (
                          <span className="text-[8px] text-slate-400 font-mono leading-none">
                            +
                          </span>
                        )}
                      </div>
                    )}
                  </>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Calendar Bottom Legend & Summary */}
      <div className="pt-3 mt-3 border-t border-white/5 flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono text-slate-400">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
            <span>RSVP In</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
            <span>Tentative</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-rose-400 inline-block" />
            <span>Out</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-sky-400 inline-block" />
            <span>Needed</span>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsFeedModalOpen(true)}
            className="text-yellow-400 hover:text-yellow-300 font-semibold flex items-center gap-1 hover:underline"
          >
            <Rss className="w-3 h-3" />
            <span>Manage Calendar Feed</span>
          </button>
          <span className="text-slate-500 text-[9px] flex items-center gap-1">
            <Sparkles className="w-2.5 h-2.5 text-yellow-400" /> Click date for call sheet
          </span>
        </div>
      </div>

      {/* Interactive Day-Events Modal */}
      <PortalDayEventsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        dateString={selectedDate || ""}
        gigs={selectedDayGigs}
        userRsvps={userRsvps}
        onRsvpChange={onRsvpChange}
        isUpdatingRsvp={isUpdatingRsvp}
      />

      {/* Calendar Subscription Feed Modal */}
      <CalendarSubscribeModal
        isOpen={isFeedModalOpen}
        onClose={() => setIsFeedModalOpen(false)}
      />
    </div>
  );
}
