"use client";

import React, { useState, useMemo } from "react";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  AlertTriangle,
  Palmtree,
  CheckCircle2,
  Users,
  Music,
  MapPin,
  X,
  Info,
} from "lucide-react";
import { BlackoutDate } from "@/lib/schema/blackout";
import { RehearsalSession } from "@/lib/schema/rehearsal";
import { getBlackoutsForDate } from "@/lib/rehearsal/rehearsalHelpers";
import {
  formatNonMilitaryTime,
  formatTimeRange,
  formatFriendlyDate,
} from "@/lib/utils/dateTimeFormat";

interface RehearsalBlackoutCalendarProps {
  rehearsals: RehearsalSession[];
  blackouts: BlackoutDate[];
  onSelectRehearsal?: (rehearsal: RehearsalSession) => void;
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

export default function RehearsalBlackoutCalendar({
  rehearsals,
  blackouts,
  onSelectRehearsal,
}: RehearsalBlackoutCalendarProps) {
  const today = useMemo(() => new Date(), []);
  const todayDateStr = useMemo(() => {
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, "0");
    const d = String(today.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }, [today]);

  const [activeDate, setActiveDate] = useState(() => {
    // If there is an upcoming rehearsal, start at that month
    const nowStr = today.toISOString().split("T")[0];
    const nextRehearsal = rehearsals.find((r) => r.date >= nowStr && !r.isCancelled);
    if (nextRehearsal) {
      const parts = nextRehearsal.date.split("-");
      if (parts.length === 3) {
        return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, 1);
      }
    }
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });

  const [selectedDayInfo, setSelectedDayInfo] = useState<{
    dateStr: string;
    dayRehearsal?: RehearsalSession;
    dayBlackouts: BlackoutDate[];
  } | null>(null);

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
    rehearsals.forEach((r) => {
      if (r.date) {
        const y = parseInt(r.date.split("-")[0], 10);
        if (!isNaN(y)) set.add(y);
      }
    });
    blackouts.forEach((b) => {
      if (b.startDate) {
        const y = parseInt(b.startDate.split("-")[0], 10);
        if (!isNaN(y)) set.add(y);
      }
    });
    return Array.from(set).sort((a, b) => a - b);
  }, [rehearsals, blackouts, today]);

  // Month navigation
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

  // Calendar matrix calculation
  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay(); // 0 = Sun
    const totalDaysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();
    const days: Array<{
      dayNumber: number;
      dateStr: string;
      isCurrentMonth: boolean;
      isToday: boolean;
    }> = [];

    // Previous month padding
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const prevD = daysInPrevMonth - i;
      const prevM = currentMonth === 0 ? 12 : currentMonth;
      const prevY = currentMonth === 0 ? currentYear - 1 : currentYear;
      const dateStr = `${prevY}-${String(prevM).padStart(2, "0")}-${String(prevD).padStart(2, "0")}`;
      days.push({
        dayNumber: prevD,
        dateStr,
        isCurrentMonth: false,
        isToday: dateStr === todayDateStr,
      });
    }

    // Current month days
    for (let d = 1; d <= totalDaysInMonth; d++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      days.push({
        dayNumber: d,
        dateStr,
        isCurrentMonth: true,
        isToday: dateStr === todayDateStr,
      });
    }

    // Trailing padding to fill complete grid rows (multiple of 7)
    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const nextM = currentMonth + 2 > 12 ? 1 : currentMonth + 2;
      const nextY = currentMonth + 2 > 12 ? currentYear + 1 : currentYear;
      const dateStr = `${nextY}-${String(nextM).padStart(2, "0")}-${String(i).padStart(2, "0")}`;
      days.push({
        dayNumber: i,
        dateStr,
        isCurrentMonth: false,
        isToday: dateStr === todayDateStr,
      });
    }

    return days;
  }, [currentYear, currentMonth, todayDateStr]);

  // Month Statistics
  const monthStats = useMemo(() => {
    const monthRehearsals = rehearsals.filter((r) => {
      const parts = r.date.split("-");
      return parseInt(parts[0], 10) === currentYear && parseInt(parts[1], 10) === currentMonth + 1;
    });

    let rehearsalsWithBlackoutConflicts = 0;
    monthRehearsals.forEach((r) => {
      const bos = getBlackoutsForDate(r.date, blackouts);
      if (bos.length > 0) rehearsalsWithBlackoutConflicts++;
    });

    return {
      rehearsalCount: monthRehearsals.length,
      conflictsCount: rehearsalsWithBlackoutConflicts,
      totalBlackoutRecords: blackouts.length,
    };
  }, [rehearsals, blackouts, currentYear, currentMonth]);

  const monthLabel = MONTH_NAMES[currentMonth] + " " + currentYear;

  return (
    <div className="space-y-4">
      {/* Calendar Header with Month/Year Dropdowns & Date Controls */}
      <div
        suppressHydrationWarning
        style={{
          backgroundColor: "var(--ebb-surface)",
          borderColor: "var(--ebb-border)",
        }}
        className="border rounded-2xl p-4 sm:p-5 shadow flex flex-col justify-between"
      >
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

            <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-yellow-400/10 text-yellow-400 border border-yellow-400/20 hidden md:inline-flex items-center gap-1">
              <Palmtree className="w-3 h-3 text-emerald-400" /> Availability & Blackouts
            </span>
          </div>

          {/* Right: Today Button + Prev/Next Buttons */}
          <div className="flex items-center gap-1.5 flex-wrap">
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
          {calendarDays.map((cell) => {
            const dayRehearsal = rehearsals.find((r) => r.date === cell.dateStr);
            const dayBlackouts = getBlackoutsForDate(cell.dateStr, blackouts);
            const hasActivity = Boolean(dayRehearsal || dayBlackouts.length > 0);

            return (
              <button
                key={cell.dateStr}
                type="button"
                onClick={() => {
                  setSelectedDayInfo({
                    dateStr: cell.dateStr,
                    dayRehearsal,
                    dayBlackouts,
                  });
                }}
                className={`group relative rounded-xl transition select-none min-h-[5.5rem] sm:min-h-[6.5rem] p-1.5 sm:p-2 flex flex-col items-start justify-start border border-white/5 text-left ${
                  !cell.isCurrentMonth
                    ? "opacity-30 hover:opacity-50"
                    : "opacity-100"
                } ${
                  hasActivity
                    ? "cursor-pointer hover:bg-white/10 ring-1 ring-white/10 hover:ring-white/30"
                    : "cursor-pointer hover:bg-white/5"
                } ${
                  cell.isToday
                    ? "font-black bg-white/5 ring-1 ring-yellow-400/50"
                    : ""
                }`}
                title={
                  hasActivity
                    ? `${cell.dateStr}: ${dayRehearsal ? "Rehearsal scheduled. " : ""}${dayBlackouts.length} blackout(s). Click to view details`
                    : cell.dateStr
                }
              >
                {/* Cell Header: Day Number and Indicators */}
                <div className="flex items-center justify-between w-full mb-1">
                  <span
                    className={`text-xs sm:text-sm font-mono ${
                      cell.isToday
                        ? "text-yellow-400 font-bold"
                        : cell.isCurrentMonth
                        ? "text-slate-200 font-bold"
                        : "text-slate-500"
                    }`}
                  >
                    {cell.dayNumber}
                  </span>

                  {dayBlackouts.length > 0 && (
                    <span
                      className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-0.5"
                      title={`${dayBlackouts.length} musicians on blackout`}
                    >
                      <Palmtree className="w-2.5 h-2.5 text-amber-400" />
                      <span>{dayBlackouts.length}</span>
                    </span>
                  )}
                </div>

                {/* Day Content Badges */}
                <div className="w-full space-y-1 overflow-hidden mt-0.5">
                  {dayRehearsal && (
                    <div
                      className={`w-full text-left truncate text-[10px] sm:text-xs font-semibold px-1.5 py-0.5 rounded border transition-transform group-hover:scale-[1.02] flex items-center justify-between gap-1 ${
                        dayRehearsal.isCancelled
                          ? "bg-red-950/40 text-red-300 border-red-500/30 line-through"
                          : "bg-yellow-400/20 text-yellow-300 border-yellow-400/40"
                      }`}
                    >
                      <span className="truncate flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5 shrink-0" />
                        <span>{formatNonMilitaryTime(dayRehearsal.startTime, false)}</span>
                      </span>
                    </div>
                  )}

                  {/* Blackout Member Name Badges */}
                  {dayBlackouts.length > 0 && (
                    <div className="w-full truncate text-[9px] font-mono text-slate-400 group-hover:text-slate-300 px-0.5">
                      {dayBlackouts.slice(0, 2).map((b) => b.userName.split(" ")[0]).join(", ")}
                      {dayBlackouts.length > 2 && ` +${dayBlackouts.length - 2}`}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Month KPI Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div
          suppressHydrationWarning
          style={{
            backgroundColor: "var(--ebb-surface)",
            borderColor: "var(--ebb-border)",
          }}
          className="border rounded-xl p-3 shadow-xs"
        >
          <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <Music className="w-3 h-3 text-yellow-400" /> Rehearsals in {MONTH_NAMES[currentMonth]}
          </div>
          <div className="text-lg font-bold text-white font-mono mt-0.5">
            {monthStats.rehearsalCount}
          </div>
        </div>

        <div
          suppressHydrationWarning
          style={{
            backgroundColor: "var(--ebb-surface)",
            borderColor: "var(--ebb-border)",
          }}
          className="border rounded-xl p-3 shadow-xs"
        >
          <div className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> Rehearsals with Blackouts
          </div>
          <div className="text-lg font-bold text-amber-400 font-mono mt-0.5">
            {monthStats.conflictsCount}
          </div>
        </div>

        <div
          suppressHydrationWarning
          style={{
            backgroundColor: "var(--ebb-surface)",
            borderColor: "var(--ebb-border)",
          }}
          className="border rounded-xl p-3 shadow-xs"
        >
          <div className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
            <Palmtree className="w-3 h-3" /> Total Registered Blackouts
          </div>
          <div className="text-lg font-bold text-emerald-400 font-mono mt-0.5">
            {monthStats.totalBlackoutRecords}
          </div>
        </div>
      </div>

      {/* Selected Day Details Modal / Drawer */}
      {selectedDayInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-[10px] font-mono text-yellow-400 uppercase tracking-wider block">
                  Date Detail Inspection
                </span>
                <h4 className="text-base font-bold text-white flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4 text-yellow-400" />
                  {formatFriendlyDate(selectedDayInfo.dateStr, {
                    includeDayOfWeek: true,
                    includeYear: true,
                  })}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDayInfo(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Rehearsal Status */}
            {selectedDayInfo.dayRehearsal ? (
              <div
                className={`p-3 rounded-xl border space-y-1.5 ${
                  selectedDayInfo.dayRehearsal.isCancelled
                    ? "bg-red-950/30 border-red-500/30 text-red-300"
                    : "bg-yellow-400/10 border-yellow-400/30 text-white"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm">
                    {selectedDayInfo.dayRehearsal.title}
                  </span>
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                      selectedDayInfo.dayRehearsal.isCancelled
                        ? "bg-red-500 text-white"
                        : "bg-yellow-400 text-slate-950"
                    }`}
                  >
                    {selectedDayInfo.dayRehearsal.isCancelled ? "Cancelled" : "Scheduled"}
                  </span>
                </div>
                <div className="text-xs text-slate-300 flex items-center gap-1.5">
                  <Clock className="w-3 h-3 text-yellow-400" />
                  <span>
                    {formatTimeRange(
                      selectedDayInfo.dayRehearsal.startTime,
                      selectedDayInfo.dayRehearsal.endTime,
                      true
                    )}
                  </span>
                </div>
                {selectedDayInfo.dayRehearsal.locationName && (
                  <div className="text-xs text-slate-300 flex items-center gap-1.5">
                    <MapPin className="w-3 h-3 text-yellow-400" />
                    <span>{selectedDayInfo.dayRehearsal.locationName}</span>
                  </div>
                )}
                {selectedDayInfo.dayRehearsal.isCancelled && (
                  <div className="text-xs text-red-300 bg-red-950/60 p-2 rounded-lg mt-1">
                    <strong>Reason:</strong> {selectedDayInfo.dayRehearsal.cancellationReason || "No reason specified"}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-xs text-slate-400 bg-slate-950/60 border border-slate-800 rounded-xl p-3">
                No band rehearsal scheduled for this day.
              </div>
            )}

            {/* Blackout List */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Palmtree className="w-3.5 h-3.5 text-emerald-400" />
                Musicians Out of Town ({selectedDayInfo.dayBlackouts.length}):
              </span>

              {selectedDayInfo.dayBlackouts.length === 0 ? (
                <div className="text-xs text-emerald-400 bg-emerald-950/20 border border-emerald-500/20 rounded-xl p-3 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>All band members currently available on this date!</span>
                </div>
              ) : (
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {selectedDayInfo.dayBlackouts.map((b) => (
                    <div
                      key={b.id}
                      className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 flex items-start justify-between gap-2"
                    >
                      <div>
                        <span className="text-xs font-bold text-white block">
                          {b.userName}
                        </span>
                        {b.reason && (
                          <span className="text-[11px] text-slate-400 block">{b.reason}</span>
                        )}
                      </div>
                      <span className="text-[10px] font-mono text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20 shrink-0">
                        Unavailable
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedDayInfo(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 text-white hover:bg-slate-700 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

