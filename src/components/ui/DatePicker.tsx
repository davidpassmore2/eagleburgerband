"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X, RotateCcw } from "lucide-react";

export interface DatePickerProps {
  value: string; // YYYY-MM-DD
  onChange: (date: string) => void;
  placeholder?: string;
  label?: string;
  minDate?: string;
  maxDate?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  id?: string;
  name?: string;
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

function formatDateForDisplay(dateStr: string): string {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length !== 3) return dateStr;
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10) - 1;
  const d = parseInt(parts[2], 10);
  const date = new Date(y, m, d);
  if (isNaN(date.getTime())) return dateStr;

  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function DatePicker({
  value,
  onChange,
  placeholder = "Select date...",
  label,
  minDate,
  maxDate,
  disabled = false,
  required = false,
  className = "",
  id,
  name,
}: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize view date based on current value or today
  const [viewDate, setViewDate] = useState(() => {
    if (value) {
      const parts = value.split("-");
      if (parts.length === 3) {
        return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, 1);
      }
    }
    return new Date();
  });

  const handleToggle = () => {
    if (disabled) return;
    if (!isOpen && value) {
      const parts = value.split("-");
      if (parts.length === 3) {
        setViewDate(new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, 1));
      }
    }
    setIsOpen(!isOpen);
  };

  // Close when clicking outside or pressing Escape
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setIsOpen(false);
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
  }, [isOpen]);

  const viewYear = viewDate.getFullYear();
  const viewMonth = viewDate.getMonth();

  const handlePrevMonth = () => {
    setViewDate(new Date(viewYear, viewMonth - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(viewYear, viewMonth + 1, 1));
  };

  const handleYearChange = (year: number) => {
    setViewDate(new Date(year, viewMonth, 1));
  };

  const handleMonthChange = (month: number) => {
    setViewDate(new Date(viewYear, month, 1));
  };

  const handleTodayClick = () => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, "0");
    const d = String(today.getDate()).padStart(2, "0");
    const dateStr = `${y}-${m}-${d}`;

    if (minDate && dateStr < minDate) return;
    if (maxDate && dateStr > maxDate) return;

    onChange(dateStr);
    setViewDate(new Date(y, today.getMonth(), 1));
    setIsOpen(false);
  };

  const handleSelectDay = (day: number) => {
    const y = viewYear;
    const m = String(viewMonth + 1).padStart(2, "0");
    const d = String(day).padStart(2, "0");
    const dateStr = `${y}-${m}-${d}`;

    if (minDate && dateStr < minDate) return;
    if (maxDate && dateStr > maxDate) return;

    onChange(dateStr);
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
      isSelected: boolean;
      isToday: boolean;
    }[] = [];

    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

    // Leading days
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      const prevMonthDate = new Date(viewYear, viewMonth - 1, d);
      const prevStr = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      cells.push({
        day: d,
        isCurrentMonth: false,
        dateStr: prevStr,
        isDisabled: true,
        isSelected: false,
        isToday: prevStr === todayStr,
      });
    }

    // Days in current month
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const isDisabled = Boolean(
        (minDate && dateStr < minDate) || (maxDate && dateStr > maxDate)
      );
      cells.push({
        day: d,
        isCurrentMonth: true,
        dateStr,
        isDisabled,
        isSelected: value === dateStr,
        isToday: dateStr === todayStr,
      });
    }

    // Trailing days to fill standard 35 or 42 cell grid
    const totalCells = cells.length <= 35 ? 35 : 42;
    const remaining = totalCells - cells.length;
    for (let d = 1; d <= remaining; d++) {
      const nextMonthDate = new Date(viewYear, viewMonth + 1, d);
      const nextStr = `${nextMonthDate.getFullYear()}-${String(nextMonthDate.getMonth() + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      cells.push({
        day: d,
        isCurrentMonth: false,
        dateStr: nextStr,
        isDisabled: true,
        isSelected: false,
        isToday: nextStr === todayStr,
      });
    }

    return cells;
  }, [viewYear, viewMonth, value, minDate, maxDate]);

  // Year options (-5 to +5 years)
  const yearOptions = useMemo(() => {
    const currentY = new Date().getFullYear();
    const years: number[] = [];
    for (let y = currentY - 5; y <= currentY + 5; y++) {
      years.push(y);
    }
    return years;
  }, []);

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && (
        <label htmlFor={id} className="text-[11px] font-semibold text-slate-300 block mb-1">
          {label} {required && <span className="text-amber-400">*</span>}
        </label>
      )}

      {/* Hidden native input for form compatibility */}
      <input
        type="hidden"
        name={name}
        id={id}
        value={value}
        required={required}
      />

      {/* Trigger Button */}
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
          <CalendarIcon className="w-4 h-4 text-amber-400 shrink-0" />
          {value ? (
            <span className="font-medium text-white truncate">
              {formatDateForDisplay(value)}
            </span>
          ) : (
            <span className="text-slate-500 font-normal">{placeholder}</span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0 ml-2">
          {value && !required && !disabled && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange("");
              }}
              className="p-1 text-slate-500 hover:text-white rounded-md transition"
              title="Clear date"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Popover Calendar */}
      {isOpen && (
        <div className="absolute z-50 mt-1.5 w-72 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-3.5 space-y-3 animate-in fade-in zoom-in-95 duration-100">
          {/* Calendar Header */}
          <div className="flex items-center justify-between gap-1">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="Previous month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-1.5">
              <select
                value={viewMonth}
                onChange={(e) => handleMonthChange(parseInt(e.target.value, 10))}
                className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-amber-400 cursor-pointer"
              >
                {MONTHS.map((name, idx) => (
                  <option key={name} value={idx}>
                    {name}
                  </option>
                ))}
              </select>

              <select
                value={viewYear}
                onChange={(e) => handleYearChange(parseInt(e.target.value, 10))}
                className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-amber-400 cursor-pointer font-mono"
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="Next month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Weekday Headers */}
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
          <div className="grid grid-cols-7 gap-1">
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

              return (
                <button
                  key={cell.dateStr}
                  type="button"
                  disabled={cell.isDisabled}
                  onClick={() => handleSelectDay(cell.day)}
                  className={`h-8 rounded-lg text-xs font-semibold flex items-center justify-center transition relative ${
                    cell.isSelected
                      ? "bg-amber-400 text-slate-950 font-bold shadow-md"
                      : cell.isToday
                      ? "bg-slate-800 text-amber-400 border border-amber-400/40 hover:bg-amber-400 hover:text-slate-950"
                      : "text-slate-200 hover:bg-slate-800 hover:text-white"
                  } ${cell.isDisabled ? "opacity-30 cursor-not-allowed hover:bg-transparent" : "cursor-pointer"}`}
                >
                  {cell.day}
                  {cell.isToday && !cell.isSelected && (
                    <span className="absolute bottom-1 w-1 h-1 rounded-full bg-amber-400" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Quick Actions Footer */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs">
            <button
              type="button"
              onClick={handleTodayClick}
              className="text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1 transition"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Today</span>
            </button>

            {value && !required && (
              <button
                type="button"
                onClick={() => {
                  onChange("");
                  setIsOpen(false);
                }}
                className="text-slate-400 hover:text-white transition"
              >
                Clear
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-white font-semibold transition"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

