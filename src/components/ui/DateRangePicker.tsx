"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  X,
  Check,
  RotateCcw,
  Sparkles,
} from "lucide-react";

export interface DateRangePickerProps {
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  onChange: (range: { startDate: string; endDate: string }) => void;
  placeholder?: string;
  label?: string;
  minDate?: string;
  maxDate?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
}

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS = [
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

function formatShortDate(dateStr: string): string {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length !== 3) return dateStr;
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10) - 1;
  const d = parseInt(parts[2], 10);
  const date = new Date(y, m, d);
  if (isNaN(date.getTime())) return dateStr;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function calculateDaysBetween(startStr: string, endStr: string): number {
  if (!startStr || !endStr) return 0;
  const s = new Date(startStr);
  const e = new Date(endStr);
  const diffTime = e.getTime() - s.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  return diffDays > 0 ? diffDays : 1;
}

export default function DateRangePicker({
  startDate,
  endDate,
  onChange,
  placeholder = "Select blackout date range...",
  label,
  minDate,
  maxDate,
  disabled = false,
  className = "",
  id,
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Selection step state: 'none' (idle), 'selecting_end' (clicked start, picking end)
  const [tempStart, setTempStart] = useState<string | null>(startDate || null);
  const [tempEnd, setTempEnd] = useState<string | null>(endDate || null);
  const [hoverDate, setHoverDate] = useState<string | null>(null);

  // Initialize view date
  const [viewDate, setViewDate] = useState(() => {
    const base = startDate || endDate;
    if (base) {
      const parts = base.split("-");
      if (parts.length === 3) {
        return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, 1);
      }
    }
    return new Date();
  });

  const handleToggle = () => {
    if (disabled) return;
    if (!isOpen) {
      setTempStart(startDate || null);
      setTempEnd(endDate || null);
      setHoverDate(null);
      const base = startDate || endDate;
      if (base) {
        const parts = base.split("-");
        if (parts.length === 3) {
          setViewDate(new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, 1));
        }
      }
    }
    setIsOpen(!isOpen);
  };

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        // Reset temp to props
        setTempStart(startDate || null);
        setTempEnd(endDate || null);
        setHoverDate(null);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setIsOpen(false);
        setTempStart(startDate || null);
        setTempEnd(endDate || null);
        setHoverDate(null);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, startDate, endDate]);

  const viewYear = viewDate.getFullYear();
  const viewMonth = viewDate.getMonth();

  const handlePrevMonth = () => {
    setViewDate(new Date(viewYear, viewMonth - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(viewYear, viewMonth + 1, 1));
  };

  // Day click logic
  const handleDayClick = (dateStr: string) => {
    if (!tempStart || (tempStart && tempEnd)) {
      // First click: start a new selection
      setTempStart(dateStr);
      setTempEnd(null);
    } else {
      // Second click: finish selection
      let finalStart = tempStart;
      let finalEnd = dateStr;
      if (finalEnd < finalStart) {
        finalStart = dateStr;
        finalEnd = tempStart;
      }
      setTempStart(finalStart);
      setTempEnd(finalEnd);
      onChange({ startDate: finalStart, endDate: finalEnd });
    }
  };

  const handleApply = () => {
    if (tempStart) {
      const finalEnd = tempEnd || tempStart;
      onChange({ startDate: tempStart, endDate: finalEnd });
      setIsOpen(false);
    }
  };

  // Quick Presets
  const applyPreset = (daysOffset: number, countDays: number = 1) => {
    const today = new Date();
    const start = new Date(today);
    start.setDate(today.getDate() + daysOffset);

    const end = new Date(start);
    end.setDate(start.getDate() + countDays - 1);

    const startStr = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-${String(start.getDate()).padStart(2, "0")}`;
    const endStr = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, "0")}-${String(end.getDate()).padStart(2, "0")}`;

    setTempStart(startStr);
    setTempEnd(endStr);
    onChange({ startDate: startStr, endDate: endStr });
    setViewDate(new Date(start.getFullYear(), start.getMonth(), 1));
    setIsOpen(false);
  };

  const applyThisWeekend = () => {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Sun, 6 = Sat
    const daysUntilSaturday = (6 - dayOfWeek + 7) % 7;

    const saturday = new Date(today);
    saturday.setDate(today.getDate() + daysUntilSaturday);

    const sunday = new Date(saturday);
    sunday.setDate(saturday.getDate() + 1);

    const startStr = `${saturday.getFullYear()}-${String(saturday.getMonth() + 1).padStart(2, "0")}-${String(saturday.getDate()).padStart(2, "0")}`;
    const endStr = `${sunday.getFullYear()}-${String(sunday.getMonth() + 1).padStart(2, "0")}-${String(sunday.getDate()).padStart(2, "0")}`;

    setTempStart(startStr);
    setTempEnd(endStr);
    onChange({ startDate: startStr, endDate: endStr });
    setViewDate(new Date(saturday.getFullYear(), saturday.getMonth(), 1));
    setIsOpen(false);
  };

  // Build calendar matrix
  const calendarDays = useMemo(() => {
    const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

    const cells: {
      day: number;
      isCurrentMonth: boolean;
      dateStr: string;
      isDisabled: boolean;
      isRangeStart: boolean;
      isRangeEnd: boolean;
      isInRange: boolean;
      isToday: boolean;
    }[] = [];

    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

    // Computed effective start & end for visual preview
    let effectiveStart = tempStart;
    let effectiveEnd = tempEnd;
    if (tempStart && !tempEnd && hoverDate) {
      if (hoverDate >= tempStart) {
        effectiveEnd = hoverDate;
      } else {
        effectiveStart = hoverDate;
        effectiveEnd = tempStart;
      }
    }

    // Leading days from prev month
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      const prevDate = new Date(viewYear, viewMonth - 1, d);
      const prevStr = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      cells.push({
        day: d,
        isCurrentMonth: false,
        dateStr: prevStr,
        isDisabled: true,
        isRangeStart: false,
        isRangeEnd: false,
        isInRange: false,
        isToday: prevStr === todayStr,
      });
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const isDisabled = Boolean(
        (minDate && dateStr < minDate) || (maxDate && dateStr > maxDate)
      );

      const isRangeStart = Boolean(effectiveStart && dateStr === effectiveStart);
      const isRangeEnd = Boolean(effectiveEnd && dateStr === effectiveEnd);
      const isInRange = Boolean(
        effectiveStart &&
          effectiveEnd &&
          dateStr > effectiveStart &&
          dateStr < effectiveEnd
      );

      cells.push({
        day: d,
        isCurrentMonth: true,
        dateStr,
        isDisabled,
        isRangeStart,
        isRangeEnd,
        isInRange,
        isToday: dateStr === todayStr,
      });
    }

    // Trailing days
    const totalCells = cells.length <= 35 ? 35 : 42;
    const remaining = totalCells - cells.length;
    for (let d = 1; d <= remaining; d++) {
      const nextDate = new Date(viewYear, viewMonth + 1, d);
      const nextStr = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      cells.push({
        day: d,
        isCurrentMonth: false,
        dateStr: nextStr,
        isDisabled: true,
        isRangeStart: false,
        isRangeEnd: false,
        isInRange: false,
        isToday: nextStr === todayStr,
      });
    }

    return cells;
  }, [viewYear, viewMonth, tempStart, tempEnd, hoverDate, minDate, maxDate]);

  // Display text summary
  const summaryDisplay = useMemo(() => {
    if (!startDate) return null;
    const formattedStart = formatShortDate(startDate);
    const effectiveEndDate = endDate || startDate;
    const formattedEnd = formatShortDate(effectiveEndDate);

    if (startDate === effectiveEndDate) {
      return `Single Day: ${formattedStart}`;
    }

    const dayCount = calculateDaysBetween(startDate, effectiveEndDate);
    return `${formattedStart} → ${formattedEnd} (${dayCount} ${dayCount === 1 ? "day" : "days"})`;
  }, [startDate, endDate]);

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && (
        <label htmlFor={id} className="text-[11px] font-semibold text-slate-300 block mb-1">
          {label}
        </label>
      )}

      {/* Trigger Bar */}
      <div
        onClick={handleToggle}
        className={`w-full bg-slate-950 border rounded-xl px-3 py-2 text-xs flex items-center justify-between cursor-pointer transition select-none shadow-xs ${
          disabled
            ? "opacity-50 cursor-not-allowed border-slate-800"
            : isOpen
            ? "border-amber-400 ring-1 ring-amber-400/20"
            : "border-slate-800 hover:border-slate-700"
        }`}
      >
        <div className="flex items-center gap-2 text-white truncate">
          <CalendarRange className="w-4 h-4 text-amber-400 shrink-0" />
          {summaryDisplay ? (
            <span className="font-semibold text-white truncate">{summaryDisplay}</span>
          ) : (
            <span className="text-slate-500 font-normal">{placeholder}</span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0 ml-2">
          {startDate && !disabled && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setTempStart(null);
                setTempEnd(null);
                onChange({ startDate: "", endDate: "" });
              }}
              className="p-1 text-slate-500 hover:text-white rounded-md transition"
              title="Clear date range"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Range Popover */}
      {isOpen && (
        <div className="absolute z-50 mt-1.5 w-80 sm:w-88 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-4 space-y-3.5 animate-in fade-in zoom-in-95 duration-100">
          {/* Presets Row */}
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Quick Range Presets:
            </span>
            <div className="flex flex-wrap gap-1">
              <button
                type="button"
                onClick={() => applyPreset(0, 1)}
                className="px-2 py-1 text-[11px] rounded-lg bg-slate-950 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-600 transition"
              >
                Today Only
              </button>
              <button
                type="button"
                onClick={applyThisWeekend}
                className="px-2 py-1 text-[11px] rounded-lg bg-slate-950 border border-slate-800 text-amber-300 hover:text-white hover:border-slate-600 transition flex items-center gap-1"
              >
                <Sparkles className="w-3 h-3 text-amber-400" />
                This Weekend
              </button>
              <button
                type="button"
                onClick={() => applyPreset(0, 7)}
                className="px-2 py-1 text-[11px] rounded-lg bg-slate-950 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-600 transition"
              >
                Next 7 Days
              </button>
              <button
                type="button"
                onClick={() => applyPreset(0, 14)}
                className="px-2 py-1 text-[11px] rounded-lg bg-slate-950 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-600 transition"
              >
                Next 14 Days
              </button>
            </div>
          </div>

          {/* Month Navigation */}
          <div className="flex items-center justify-between border-t border-slate-800 pt-2.5">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="Previous month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="text-xs font-bold text-white flex items-center gap-1">
              <span>{MONTHS[viewMonth]}</span>
              <span className="text-amber-400 font-mono">{viewYear}</span>
            </span>

            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="Next month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Weekday Labels */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {WEEKDAYS.map((wd) => (
              <span
                key={wd}
                className="text-[10px] font-bold uppercase tracking-wider text-slate-400 py-1"
              >
                {wd}
              </span>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-y-1 gap-x-0.5">
            {calendarDays.map((cell, idx) => {
              if (!cell.isCurrentMonth) {
                return (
                  <div
                    key={`empty_${idx}`}
                    className="h-8 flex items-center justify-center text-[11px] text-slate-700 select-none"
                  >
                    {cell.day}
                  </div>
                );
              }

              const isStartAndEnd = cell.isRangeStart && cell.isRangeEnd;

              return (
                <button
                  key={cell.dateStr}
                  type="button"
                  disabled={cell.isDisabled}
                  onClick={() => handleDayClick(cell.dateStr)}
                  onMouseEnter={() => setHoverDate(cell.dateStr)}
                  className={`h-8 text-xs font-semibold flex items-center justify-center transition cursor-pointer relative ${
                    isStartAndEnd
                      ? "bg-amber-400 text-slate-950 font-bold rounded-lg shadow-sm"
                      : cell.isRangeStart
                      ? "bg-amber-400 text-slate-950 font-bold rounded-l-lg shadow-xs"
                      : cell.isRangeEnd
                      ? "bg-amber-400 text-slate-950 font-bold rounded-r-lg shadow-xs"
                      : cell.isInRange
                      ? "bg-amber-400/20 text-amber-200"
                      : cell.isToday
                      ? "bg-slate-800 text-amber-400 border border-amber-400/30 rounded-lg hover:bg-slate-700"
                      : "text-slate-300 hover:bg-slate-800 rounded-lg"
                  } ${cell.isDisabled ? "opacity-30 cursor-not-allowed" : ""}`}
                >
                  {cell.day}
                  {cell.isToday && !cell.isRangeStart && !cell.isRangeEnd && (
                    <span className="absolute bottom-1 w-1 h-1 rounded-full bg-amber-400" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Selected Range Feedback */}
          {tempStart && (
            <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between text-xs text-slate-300">
              <div>
                <span className="text-[10px] text-slate-400 uppercase block">Selected:</span>
                <span className="font-bold text-white">
                  {formatShortDate(tempStart)}
                  {tempEnd && tempEnd !== tempStart && ` → ${formatShortDate(tempEnd)}`}
                  {tempStart && !tempEnd && " (Click second date to complete range)"}
                </span>
              </div>
              {tempStart && tempEnd && (
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 font-bold">
                  {calculateDaysBetween(tempStart, tempEnd)} days
                </span>
              )}
            </div>
          )}

          {/* Action Footer */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => {
                setTempStart(null);
                setTempEnd(null);
                setHoverDate(null);
                onChange({ startDate: "", endDate: "" });
              }}
              className="text-slate-400 hover:text-white transition flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-3 py-1.5 text-slate-400 hover:text-white rounded-lg transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApply}
                disabled={!tempStart}
                className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold px-3.5 py-1.5 rounded-lg flex items-center gap-1 transition shadow-sm disabled:opacity-50"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Confirm Range</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

