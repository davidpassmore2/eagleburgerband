"use client";

import React, { useState, useRef, useEffect } from "react";
import { Calendar, ChevronDown, Download, ExternalLink } from "lucide-react";

interface AddToCalendarButtonProps {
  event: {
    id: string;
    title: string;
    date: string; // YYYY-MM-DD
    venue: string;
    city: string;
    description?: string;
    eventUrl?: string;
  };
  className?: string;
  buttonVariant?: "primary" | "secondary" | "subtle";
}

export default function AddToCalendarButton({
  event,
  className = "",
  buttonVariant = "secondary",
}: AddToCalendarButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Format dates for Google Calendar and iCal
  // If no time is specified, default to 18:00 - 21:00 on the gig date
  const cleanDate = event.date.replace(/-/g, "");
  const gcalStart = `${cleanDate}T180000`;
  const gcalEnd = `${cleanDate}T210000`;
  const fullLocation = [event.venue, event.city].filter(Boolean).join(", ");
  const eventDescription = [
    event.description || "Live performance by the Eagleburger Band.",
    event.eventUrl ? `More details: ${event.eventUrl}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  // Google Calendar URL
  const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
    event.title
  )}&dates=${gcalStart}/${gcalEnd}&details=${encodeURIComponent(
    eventDescription
  )}&location=${encodeURIComponent(fullLocation)}`;

  // Download iCal (.ics) file for Apple Calendar, Outlook, and mobile devices
  const handleDownloadIcs = () => {
    const now = new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    const icsStart = `${cleanDate}T180000`;
    const icsEnd = `${cleanDate}T210000`;

    const icsData = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Eagleburger Band//Live Events//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "BEGIN:VEVENT",
      `UID:gig-${event.id}@eagleburgerband.com`,
      `DTSTAMP:${now}`,
      `DTSTART:${icsStart}`,
      `DTEND:${icsEnd}`,
      `SUMMARY:${event.title.replace(/[,;]/g, " ")}`,
      `DESCRIPTION:${eventDescription.replace(/\n/g, "\\n")}`,
      `LOCATION:${fullLocation.replace(/[,;]/g, " ")}`,
      event.eventUrl ? `URL:${event.eventUrl}` : "",
      "STATUS:CONFIRMED",
      "END:VEVENT",
      "END:VCALENDAR",
    ]
      .filter(Boolean)
      .join("\r\n");

    const blob = new Blob([icsData], { type: "text/calendar;charset=utf-8" });
    const link = document.createElement("a");
    link.href = window.URL.createObjectURL(blob);
    const fileName = `${event.title.toLowerCase().replace(/[^a-z0-9]/g, "-")}.ics`;
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setIsOpen(false);
  };

  const getButtonStyles = () => {
    if (buttonVariant === "primary") {
      return "bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-black shadow-lg shadow-yellow-400/20";
    }
    if (buttonVariant === "subtle") {
      return "bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/80 font-bold";
    }
    return "bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-yellow-400/40 text-slate-200 hover:text-white font-bold";
  };

  return (
    <div ref={dropdownRef} className={`relative inline-block text-left ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs uppercase tracking-wider transition ${getButtonStyles()}`}
        aria-expanded={isOpen}
      >
        <Calendar className="w-3.5 h-3.5 text-yellow-400" />
        <span>Add to Calendar</span>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 sm:left-0 sm:right-auto mt-2 w-56 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl z-50 overflow-hidden animate-in fade-in-50 zoom-in-95 duration-100">
          <div className="p-2 space-y-1">
            <a
              href={googleCalendarUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setIsOpen(false)}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-200 hover:text-yellow-400 hover:bg-slate-800/80 transition"
            >
              <div className="flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                <span>Google Calendar</span>
              </div>
              <ExternalLink className="w-3 h-3 text-slate-500" />
            </a>

            <button
              type="button"
              onClick={handleDownloadIcs}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-200 hover:text-yellow-400 hover:bg-slate-800/80 transition"
            >
              <div className="flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span>Apple / Outlook (.ics)</span>
              </div>
              <Download className="w-3 h-3 text-slate-500" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

