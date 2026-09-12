"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { Clock, X, Check } from "lucide-react";

export interface TimePickerProps {
  value: string;
  onChange: (time: string) => void;
  placeholder?: string;
  label?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  id?: string;
  name?: string;
}

const COMMON_GIG_TIMES = [
  "10:00 AM",
  "11:00 AM",
  "12:00 PM",
  "1:00 PM",
  "2:00 PM",
  "3:00 PM",
  "4:00 PM",
  "5:00 PM",
  "5:30 PM",
  "6:00 PM",
  "6:30 PM",
  "7:00 PM",
  "7:30 PM",
  "8:00 PM",
  "8:30 PM",
  "9:00 PM",
];

const HOURS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];
const MINUTES = ["00", "15", "30", "45"];

function parseTimeToSegments(raw: string): { hour: string; minute: string; period: "AM" | "PM" } {
  if (!raw || raw.trim().toUpperCase() === "TBD") {
    return { hour: "6", minute: "00", period: "PM" };
  }

  const trimmed = raw.trim();
  // Check 12-hour format with AM/PM e.g. "5:30 PM" or "05:30pm"
  const match12 = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (match12) {
    let h = parseInt(match12[1], 10);
    if (h < 1) h = 12;
    if (h > 12) h = 12;
    const m = match12[2];
    const p = match12[3].toUpperCase() as "AM" | "PM";
    return { hour: String(h), minute: m, period: p };
  }

  // Check 24-hour format e.g. "18:30"
  const match24 = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (match24) {
    const rawH = parseInt(match24[1], 10);
    const m = match24[2];
    if (rawH === 0) return { hour: "12", minute: m, period: "AM" };
    if (rawH < 12) return { hour: String(rawH), minute: m, period: "AM" };
    if (rawH === 12) return { hour: "12", minute: m, period: "PM" };
    return { hour: String(rawH - 12), minute: m, period: "PM" };
  }

  return { hour: "6", minute: "00", period: "PM" };
}

export default function TimePicker({
  value,
  onChange,
  placeholder = "e.g. 5:30 PM",
  label,
  disabled = false,
  required = false,
  className = "",
  id,
  name,
}: TimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Local segmented builder state
  const initialSegments = useMemo(() => parseTimeToSegments(value), [value]);
  const [selHour, setSelHour] = useState(initialSegments.hour);
  const [selMinute, setSelMinute] = useState(initialSegments.minute);
  const [selPeriod, setSelPeriod] = useState<"AM" | "PM">(initialSegments.period);

  const handleToggle = () => {
    if (disabled) return;
    if (!isOpen) {
      const parsed = parseTimeToSegments(value);
      setSelHour(parsed.hour);
      setSelMinute(parsed.minute);
      setSelPeriod(parsed.period);
    }
    setIsOpen(!isOpen);
  };

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setIsOpen(false);
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

  const handleApplyCustomTime = () => {
    const formatted = `${selHour}:${selMinute} ${selPeriod}`;
    onChange(formatted);
    setIsOpen(false);
  };

  const handleSelectPreset = (preset: string) => {
    onChange(preset);
    const parsed = parseTimeToSegments(preset);
    setSelHour(parsed.hour);
    setSelMinute(parsed.minute);
    setSelPeriod(parsed.period);
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && (
        <label htmlFor={id} className="text-[11px] font-semibold text-slate-300 block mb-1">
          {label} {required && <span className="text-amber-400">*</span>}
        </label>
      )}

      {/* Hidden input for HTML form submission */}
      <input
        type="hidden"
        name={name}
        id={id}
        value={value}
        required={required}
      />

      {/* Trigger & Input Bar */}
      <div
        className={`w-full bg-slate-950 border rounded-xl px-3 py-2 text-xs flex items-center justify-between transition select-none shadow-xs ${
          disabled
            ? "opacity-50 cursor-not-allowed border-slate-800"
            : isOpen
            ? "border-amber-400 ring-1 ring-amber-400/20"
            : "border-slate-800 hover:border-slate-700"
        }`}
      >
        <div
          onClick={handleToggle}
          className="flex items-center gap-2 text-white flex-1 cursor-pointer truncate"
        >
          <Clock className="w-4 h-4 text-amber-400 shrink-0" />
          {value ? (
            <span className="font-semibold text-white font-mono">{value}</span>
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
              title="Clear time"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Popover */}
      {isOpen && (
        <div className="absolute z-50 mt-1.5 w-72 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-4 space-y-4 animate-in fade-in zoom-in-95 duration-100">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-400" /> Select Time
            </span>
            <span className="text-xs font-mono font-bold text-amber-400">
              {selHour}:{selMinute} {selPeriod}
            </span>
          </div>

          {/* Granular Segment Selectors */}
          <div className="space-y-2">
            <div className="grid grid-cols-3 gap-2">
              {/* Hours */}
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                  Hour
                </span>
                <select
                  value={selHour}
                  onChange={(e) => setSelHour(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-amber-400 cursor-pointer"
                >
                  {HOURS.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>

              {/* Minutes */}
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                  Minute
                </span>
                <select
                  value={selMinute}
                  onChange={(e) => setSelMinute(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-amber-400 cursor-pointer"
                >
                  {MINUTES.map((m) => (
                    <option key={m} value={m}>
                      :{m}
                    </option>
                  ))}
                </select>
              </div>

              {/* AM / PM Toggle */}
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                  AM / PM
                </span>
                <div className="grid grid-cols-2 gap-1 bg-slate-950 border border-slate-700 rounded-lg p-0.5">
                  <button
                    type="button"
                    onClick={() => setSelPeriod("AM")}
                    className={`py-1 text-[11px] font-bold rounded transition ${
                      selPeriod === "AM"
                        ? "bg-amber-400 text-slate-950"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    AM
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelPeriod("PM")}
                    className={`py-1 text-[11px] font-bold rounded transition ${
                      selPeriod === "PM"
                        ? "bg-amber-400 text-slate-950"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    PM
                  </button>
                </div>
              </div>
            </div>

            {/* Set Custom Time Button */}
            <button
              type="button"
              onClick={handleApplyCustomTime}
              className="w-full bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold py-1.5 rounded-lg text-xs flex items-center justify-center gap-1.5 transition shadow-sm"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Set Time ({selHour}:{selMinute} {selPeriod})</span>
            </button>
          </div>

          {/* Quick Common Presets Grid */}
          <div className="space-y-1.5 pt-2 border-t border-slate-800">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Quick Gig Presets:
            </span>
            <div className="grid grid-cols-4 gap-1.5 max-h-32 overflow-y-auto pr-0.5">
              {COMMON_GIG_TIMES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => handleSelectPreset(t)}
                  className={`px-1.5 py-1 text-[11px] font-mono rounded-lg transition border text-center ${
                    value === t
                      ? "bg-amber-400/20 text-amber-300 border-amber-400/50 font-bold"
                      : "bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs">
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
              className="ml-auto text-slate-400 hover:text-white font-semibold transition"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

