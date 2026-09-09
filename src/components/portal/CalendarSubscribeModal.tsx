"use client";

import React, { useState, useEffect } from "react";
import { doc, getDoc, setDoc, collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/lib/context/AuthContext";
import { formatIcalDate, parseDateTime, escapeIcalText } from "@/lib/calendar/ical";
import { 
  Calendar as CalendarIcon, 
  X, 
  Copy, 
  Check, 
  RefreshCw, 
  Smartphone, 
  Download, 
  HelpCircle, 
  Loader2 
} from "lucide-react";

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

export default function CalendarSubscribeModal({ isOpen, onClose }: Props) {
  const { profile } = useAuth();
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeToken, setActiveToken] = useState<string>("");

  const uid = profile?.uid;

  useEffect(() => {
    if (!isOpen || !uid) return;

    const resolveToken = async () => {
      const profileToken = (profile as Record<string, unknown>).calendarToken as string | undefined;
      if (profileToken && profileToken.trim().length > 0) {
        setActiveToken(profileToken);
        return;
      }

      try {
        const snap = await getDoc(doc(db, "users", uid));
        if (snap.exists() && snap.data().calendarToken) {
          setActiveToken(snap.data().calendarToken);
          return;
        }

        const newToken = (typeof crypto !== "undefined" && crypto.randomUUID)
          ? crypto.randomUUID().replace(/-/g, "")
          : Math.random().toString(36).substring(2) + Date.now().toString(36);

        await setDoc(
          doc(db, "users", uid),
          {
            calendarToken: newToken,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
        setActiveToken(newToken);
      } catch (err) {
        console.error("Failed to initialize calendar token:", err);
      }
    };

    resolveToken();
  }, [isOpen, uid, profile]);

  if (!isOpen || !profile) return null;

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const httpsUrl = activeToken ? `${baseUrl}/api/calendar/${activeToken}` : "";
  const webcalUrl = httpsUrl.replace(/^https?:\/\//i, "webcal://");

  const handleCopyLink = () => {
    if (!activeToken) return;
    navigator.clipboard.writeText(webcalUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Build the .ICS directly using the active browser Firestore session
  const handleDownloadIcs = async () => {
    if (!uid) return;
    setDownloading(true);

    try {
      const gigsSnap = await getDocs(collection(db, "gigs"));
      const eventsIcal: string[] = [];

      for (const gigDoc of gigsSnap.docs) {
        const gigData = gigDoc.data();
        const gigId = gigDoc.id;

        const rsvpsSnap = await getDocs(collection(db, "gigs", gigId, "rsvps"));
        let isAttending = false;

        rsvpsSnap.forEach((r) => {
          if (r.id === uid && r.data().status === "attending") {
            isAttending = true;
          }
        });

        if (!isAttending) continue;

        const title = gigData.internalLogistics?.title || gigData.publicDetails?.title || "Eagleburger Gig";
        const dateStr = gigData.date;
        const callTime = gigData.internalLogistics?.callTime || "TBD";
        const downbeat = gigData.internalLogistics?.downbeat || "TBD";
        const location =
          gigData.internalLogistics?.unloadingAddress || gigData.publicDetails?.venueAddress || "Pittsburgh, PA";
        const attire = gigData.internalLogistics?.attire || "Eagleburger Yellows & Black";
        const notes = gigData.internalLogistics?.parkingNotes || "";

        const start = parseDateTime(dateStr, callTime !== "TBD" ? callTime : downbeat);
        const end = new Date(start.getTime() + 3 * 60 * 60 * 1000);

        const description = [
          `CALL SHEET: ${title}`,
          `Call Time: ${callTime}`,
          `Downbeat: ${downbeat}`,
          `Uniform: ${attire}`,
          notes ? `Parking/Logistics: ${notes}` : "",
        ]
          .filter(Boolean)
          .join("\n");

        const eventBlock = [
          "BEGIN:VEVENT",
          `UID:${gigId}-${uid}@eagleburger.org`,
          `DTSTAMP:${formatIcalDate(new Date())}`,
          `DTSTART:${formatIcalDate(start)}`,
          `DTEND:${formatIcalDate(end)}`,
          `SUMMARY:${escapeIcalText(title)}`,
          `LOCATION:${escapeIcalText(location)}`,
          `DESCRIPTION:${escapeIcalText(description)}`,
          "STATUS:CONFIRMED",
          "END:VEVENT",
        ].join("\r\n");

        eventsIcal.push(eventBlock);
      }

      const performerName = profile.displayName || "Performer";
      const icalContent = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Eagleburger Band//Gig Dispatch System//EN",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        `X-WR-CALNAME:Eagleburger - ${performerName}`,
        "X-WR-TIMEZONE:America/New_York",
        ...eventsIcal,
        "END:VCALENDAR",
      ].join("\r\n");

      const blob = new Blob([icalContent], { type: "text/calendar;charset=utf-8" });
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      const safeName = performerName.toLowerCase().replace(/[^a-z0-9]/g, "-");
      link.download = `eagleburger-${safeName}.ics`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      alert("Failed to build calendar: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setDownloading(false);
    }
  };

  const handleSubscribePhone = () => {
    if (!activeToken) return;
    window.location.href = webcalUrl;
  };

  const handleRegenerateToken = async () => {
    if (!uid) return;
    if (!confirm("Regenerating your token will invalidate any calendars already subscribed. Continue?")) return;

    setRefreshing(true);
    const newToken = (typeof crypto !== "undefined" && crypto.randomUUID)
      ? crypto.randomUUID().replace(/-/g, "")
      : Math.random().toString(36).substring(2) + Date.now().toString(36);

    try {
      await setDoc(
        doc(db, "users", uid),
        {
          calendarToken: newToken,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
      setActiveToken(newToken);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl space-y-4 p-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-yellow-400" />
            <h2 className="text-base font-bold text-white">Live Gig Calendar Feed</h2>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-slate-300">
          Subscribe once, and any gig you mark <strong>&quot;In&quot;</strong> on will automatically sync to your iPhone, Google Calendar, or Mac Calendar with call times, addresses, and attire.
        </p>

        {/* Action Controls */}
        <div className="space-y-3">
          <div>
            <label className="block text-[11px] uppercase font-bold text-slate-400 mb-1">
              Your Personal Subscription URL (WebCal)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={activeToken ? webcalUrl : "Generating your secure link..."}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 font-mono select-all focus:outline-none"
              />
              <button
                type="button"
                onClick={handleCopyLink}
                disabled={!activeToken || refreshing}
                className="bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold px-3 py-2 rounded-lg text-xs flex items-center gap-1 shrink-0 transition disabled:opacity-50"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
          </div>

          {/* Direct Actions */}
          <div className="grid grid-cols-2 gap-2 pt-2">
            <button
              type="button"
              onClick={handleSubscribePhone}
              disabled={!activeToken || refreshing}
              className="bg-slate-800 hover:bg-slate-700 text-white font-semibold py-2 px-3 rounded-lg text-xs flex items-center justify-center gap-1.5 border border-slate-700 transition disabled:opacity-50"
            >
              <Smartphone className="w-3.5 h-3.5 text-yellow-400" />
              Subscribe on Phone
            </button>

            <button
              type="button"
              onClick={handleDownloadIcs}
              disabled={downloading}
              className="bg-slate-800 hover:bg-slate-700 text-white font-semibold py-2 px-3 rounded-lg text-xs flex items-center justify-center gap-1.5 border border-slate-700 transition disabled:opacity-50"
            >
              {downloading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-yellow-400" />
              ) : (
                <Download className="w-3.5 h-3.5 text-yellow-400" />
              )}
              {downloading ? "Building .ICS..." : "Download .ICS File"}
            </button>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-3 text-slate-400 text-[11px] space-y-1.5">
          <div className="font-bold text-slate-300 flex items-center gap-1">
            <HelpCircle className="w-3.5 h-3.5 text-yellow-400" /> Adding to your calendar:
          </div>
          <ul className="list-disc list-inside space-y-1 pl-1">
            <li><strong>iPhone / Apple Calendar:</strong> Tap &quot;Subscribe on Phone&quot; or paste the copied link into <em>Settings &gt; Calendar &gt; Accounts &gt; Add Subscribed Calendar</em>.</li>
            <li><strong>Google Calendar:</strong> Open Google Calendar web &gt; <em>Other Calendars (+) &gt; From URL</em> &gt; paste the link.</li>
          </ul>
        </div>

        {/* Footer Reset */}
        <div className="flex justify-between items-center pt-2 border-t border-slate-800 text-[11px]">
          <button
            type="button"
            onClick={handleRegenerateToken}
            disabled={refreshing}
            className="text-slate-500 hover:text-slate-300 flex items-center gap-1 transition"
          >
            <RefreshCw className={`w-3 h-3 ${refreshing ? "animate-spin" : ""}`} /> Reset calendar URL
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 font-bold hover:bg-slate-700 transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}