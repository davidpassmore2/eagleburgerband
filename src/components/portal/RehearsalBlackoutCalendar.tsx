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

export default function RehearsalBlackoutCalendar({
  rehearsals,
  blackouts,
  onSelectRehearsal,
}: RehearsalBlackoutCalendarProps) {
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedDayInfo, setSelectedDayInfo] = useState<{
    dateStr: string;
    dayRehearsal?: RehearsalSession;
    dayBlackouts: BlackoutDate[];
  } | null>(null);

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  // Month navigation
  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Calendar matrix calculation
  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay(); // 0 = Sun
    const totalDaysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const days: Array<{
      dayNumber: number;
      dateStr: string;
      isCurrentMonth: boolean;
      isToday: boolean;
    }> = [];

    const todayStr = new Date().toISOString().split("T")[0];

    // Previous month padding
    const prevMonthDays = new Date(currentYear, currentMonth, 0).getDate();
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const prevD = prevMonthDays - i;
      const prevM = currentMonth === 0 ? 12 : currentMonth;
      const prevY = currentMonth === 0 ? currentYear - 1 : currentYear;
      const dateStr = `${prevY}-${String(prevM).padStart(2, "0")}-${String(prevD).padStart(2, "0")}`;
      days.push({
        dayNumber: prevD,
        dateStr,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
      });
    }

    // Current month days
    for (let d = 1; d <= totalDaysInMonth; d++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      days.push({
        dayNumber: d,
        dateStr,
        isCurrentMonth: true,
        isToday: dateStr === todayStr,
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
        isToday: dateStr === todayStr,
      });
    }

    return days;
  }, [currentYear, currentMonth]);

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

  const monthLabel = currentDate.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="space-y-4">
      {/* Calendar Header Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-yellow-400/10 text-yellow-400 border border-yellow-400/20 flex items-center gap-1">
              <Palmtree className="w-3 h-3 text-emerald-400" /> Availability & Blackouts
            </span>
            <span className="text-xs text-slate-400 font-mono">
              {blackouts.length} Active Blackout Windows
            </span>
          </div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-yellow-400" />
            Rehearsal & Musician Blackout Calendar
          </h3>
          <p className="text-xs text-slate-400">
            View scheduled band rehearsals alongside member out-of-town blackouts to gauge rehearsal quorum.
          </p>
        </div>

        {/* Month Navigation Controls */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          <button
            type="button"
            onClick={handleToday}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition"
          >
            Today
          </button>
          <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-xl p-1">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              title="Previous month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-bold text-white px-2 min-w-32 text-center">
              {monthLabel}
            </span>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              title="Next month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Month KPI Strip */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3">
          <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <Music className="w-3 h-3 text-yellow-400" /> Rehearsals in {monthLabel.split(" ")[0]}
          </div>
          <div className="text-lg font-bold text-white font-mono mt-0.5">
            {monthStats.rehearsalCount}
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3">
          <div className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> Rehearsals with Blackouts
          </div>
          <div className="text-lg font-bold text-amber-400 font-mono mt-0.5">
            {monthStats.conflictsCount}
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3">
          <div className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
            <Palmtree className="w-3 h-3" /> Total Registered Blackouts
          </div>
          <div className="text-lg font-bold text-emerald-400 font-mono mt-0.5">
            {monthStats.totalBlackoutRecords}
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {/* Day-of-week header */}
        <div className="grid grid-cols-7 border-b border-slate-800 bg-slate-950/70 text-center text-[11px] font-bold text-slate-400 uppercase tracking-wider py-2">
          <span>Sun</span>
          <span>Mon</span>
          <span>Tue</span>
          <span>Wed</span>
          <span>Thu</span>
          <span>Fri</span>
          <span>Sat</span>
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7 divide-x divide-y divide-slate-800/60">
          {calendarDays.map((cell) => {
            const dayRehearsal = rehearsals.find((r) => r.date === cell.dateStr);
            const dayBlackouts = getBlackoutsForDate(cell.dateStr, blackouts);
            const isClickable = Boolean(dayRehearsal || dayBlackouts.length > 0);

            return (
              <div
                key={cell.dateStr}
                onClick={() => {
                  if (isClickable) {
                    setSelectedDayInfo({
                      dateStr: cell.dateStr,
                      dayRehearsal,
                      dayBlackouts,
                    });
                  }
                }}
                className={`min-h-[100px] p-2 flex flex-col justify-between transition group ${
                  cell.isCurrentMonth ? "bg-slate-900" : "bg-slate-950/40 opacity-40"
                } ${cell.isToday ? "ring-2 ring-yellow-400/50 inset-0" : ""} ${
                  isClickable ? "cursor-pointer hover:bg-slate-800/50" : ""
                }`}
              >
                {/* Day Number and Badges */}
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-mono font-bold ${
                      cell.isToday
                        ? "text-yellow-400 bg-yellow-400/20 px-1.5 py-0.2 rounded"
                        : "text-slate-400"
                    }`}
                  >
                    {cell.dayNumber}
                  </span>

                  {dayBlackouts.length > 0 && (
                    <span
                      className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-0.5"
                      title={`${dayBlackouts.length} musicians away`}
                    >
                      <Palmtree className="w-2.5 h-2.5" />
                      <span>{dayBlackouts.length}</span>
                    </span>
                  )}
                </div>

                {/* Day Events */}
                <div className="space-y-1 my-1">
                  {dayRehearsal && (
                    <div
                      className={`p-1 rounded text-[10px] font-medium leading-tight border transition ${
                        dayRehearsal.isCancelled
                          ? "bg-red-950/40 text-red-300 border-red-500/30 line-through"
                          : "bg-yellow-400/15 text-yellow-300 border-yellow-400/30 font-bold"
                      }`}
                    >
                      <div className="flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5 shrink-0" />
                        <span className="truncate">{formatNonMilitaryTime(dayRehearsal.startTime, false)} Rehearsal</span>
                      </div>
                    </div>
                  )}

                  {/* Blackout summary names preview */}
                  {dayBlackouts.length > 0 && (
                    <div className="text-[9px] text-slate-400 truncate">
                      {dayBlackouts.map((b) => b.userName.split(" ")[0]).join(", ")}
                    </div>
                  )}
                </div>

                {/* Bottom hint */}
                <div className="h-1" />
              </div>
            );
          })}
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

