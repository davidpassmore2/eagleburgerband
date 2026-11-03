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
  Loader2,
  ExternalLink,
  CheckCircle2,
  Globe
} from "lucide-react";
import { toast } from "@/lib/context/ToastContext";

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
  const [feedMode, setFeedMode] = useState<"mine" | "all">("mine");
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false);

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
  const queryString = feedMode === "all" ? "?mode=all" : "";
  const httpsUrl = activeToken ? `${baseUrl}/api/calendar/${activeToken}${queryString}` : "";
  const webcalUrl = httpsUrl.replace(/^https?:\/\//i, "webcal://");

  const googleCalendarUrl = `https://calendar.google.com/calendar/render?cid=${encodeURIComponent(webcalUrl)}`;
  const outlookCalendarUrl = `https://outlook.live.com/calendar/0/addcalendar?url=${encodeURIComponent(webcalUrl)}`;

  const handleCopyLink = () => {
    if (!activeToken) return;
    navigator.clipboard.writeText(webcalUrl);
    setCopied(true);
    toast.success("Calendar subscription URL copied to clipboard!");
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

        if (gigData.status === "cancelled" || gigData.status === "archived") {
          continue;
        }

        if (feedMode === "mine") {
          const rsvpsSnap = await getDocs(collection(db, "gigs", gigId, "rsvps"));
          let isAttending = false;

          rsvpsSnap.forEach((r) => {
            const status = r.data().status;
            if (r.id === uid && (status === "attending" || status === "probable")) {
              isAttending = true;
            }
          });

          if (!isAttending) continue;
        }

        const title = gigData.internalLogistics?.title || gigData.publicDetails?.title || "Eagleburger Gig";
        const dateStr = gigData.date;
        const callTime = gigData.internalLogistics?.callTime || "TBD";
        const downbeat = gigData.internalLogistics?.downbeat || "TBD";
        const location = gigData.internalLogistics?.unloadingAddress || gigData.publicDetails?.venueAddress || "Pittsburgh, PA";
        const attire = gigData.internalLogistics?.attire || "Eagleburger Yellows & Black";
        const notes = gigData.internalLogistics?.parkingNotes || "";
        const portalUrl = `${baseUrl}/portal/gigs/${gigId}`;

        const start = parseDateTime(dateStr, callTime !== "TBD" ? callTime : downbeat);
        const end = new Date(start.getTime() + 3 * 60 * 60 * 1000);

        const description = [
          `CALL SHEET: ${title}`,
          `Call Time: ${callTime}`,
          `Downbeat: ${downbeat}`,
          `Uniform: ${attire}`,
          notes ? `Parking/Logistics: ${notes}` : "",
          `Call Sheet Details: ${portalUrl}`,
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
          `URL:${portalUrl}`,
          "STATUS:CONFIRMED",
          "END:VEVENT",
        ].join("\r\n");

        eventsIcal.push(eventBlock);
      }

      const performerName = profile.displayName || "Performer";
      const calName = feedMode === "all" ? "Eagleburger Band - Full Schedule" : `Eagleburger - ${performerName}`;

      const icalContent = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Eagleburger Band//Gig Dispatch System//EN",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        `X-WR-CALNAME:${calName}`,
        "X-WR-TIMEZONE:America/New_York",
        ...eventsIcal,
        "END:VCALENDAR",
      ].join("\r\n");

      const blob = new Blob([icalContent], { type: "text/calendar;charset=utf-8" });
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      const safeName = performerName.toLowerCase().replace(/[^a-z0-9]/g, "-");
      link.download = `eagleburger-${safeName}${feedMode === "all" ? "-full" : ""}.ics`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
      toast.success("Calendar file (.ICS) downloaded!");
    } catch (err) {
      toast.error("Failed to build calendar: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setDownloading(false);
    }
  };

  const handleSubscribePhone = () => {
    if (!activeToken) return;
    window.location.href = webcalUrl;
  };

  const handleConfirmRegenerateToken = async () => {
    if (!uid) return;
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
      setShowRegenerateConfirm(false);
      toast.success("Calendar token regenerated. Previous subscription links are now invalidated.");
    } catch (err) {
      toast.error("Failed to regenerate token: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-xs">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl space-y-4 p-5 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-400/10 text-amber-400 border border-amber-400/20">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Live Gig Calendar Feed</h2>
              <p className="text-[11px] text-slate-400">Subscribe once to sync call times, addresses, and attire</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feed Scope Switcher */}
        <div className="space-y-1.5">
          <label className="block text-[11px] uppercase font-bold text-slate-400">
            Feed Subscription Mode
          </label>
          <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setFeedMode("mine")}
              className={`py-1.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                feedMode === "mine"
                  ? "bg-amber-400 text-slate-950 shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>My Gigs (In &amp; Probable)</span>
            </button>
            <button
              type="button"
              onClick={() => setFeedMode("all")}
              className={`py-1.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                feedMode === "all"
                  ? "bg-amber-400 text-slate-950 shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>All Band Gigs</span>
            </button>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            {feedMode === "mine"
              ? "Syncs only gigs where you have RSVP'd In or Probable. Excludes gigs you declined or haven't answered."
              : "Syncs the complete Eagleburger schedule regardless of your personal RSVP state."}
          </p>
        </div>

        {/* URL Box */}
        <div className="space-y-1.5">
          <label className="block text-[11px] uppercase font-bold text-slate-400">
            Your Personal Subscription URL (WebCal)
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={activeToken ? webcalUrl : "Generating your secure link..."}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 font-mono select-all focus:outline-none"
            />
            <button
              type="button"
              onClick={handleCopyLink}
              disabled={!activeToken || refreshing}
              className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 shrink-0 transition disabled:opacity-50 cursor-pointer shadow-sm"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>

        {/* 1-Click Launchers Grid */}
        <div className="space-y-1.5 pt-1">
          <label className="block text-[11px] uppercase font-bold text-slate-400">
            1-Click Calendar Setup
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button
              type="button"
              onClick={handleSubscribePhone}
              disabled={!activeToken || refreshing}
              className="bg-slate-800 hover:bg-slate-700 text-white font-semibold py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 border border-slate-700 transition disabled:opacity-50 cursor-pointer"
              title="Open native Apple Calendar on iOS / Mac"
            >
              <Smartphone className="w-3.5 h-3.5 text-amber-400" />
              <span>Apple / iOS</span>
            </button>

            <a
              href={activeToken ? googleCalendarUrl : "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-slate-800 hover:bg-slate-700 text-white font-semibold py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 border border-slate-700 transition cursor-pointer text-center"
              title="Open Google Calendar web subscription"
            >
              <ExternalLink className="w-3.5 h-3.5 text-sky-400" />
              <span>Google Cal</span>
            </a>

            <a
              href={activeToken ? outlookCalendarUrl : "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-slate-800 hover:bg-slate-700 text-white font-semibold py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 border border-slate-700 transition cursor-pointer text-center"
              title="Open Outlook 365 web subscription"
            >
              <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
              <span>Outlook</span>
            </a>
          </div>

          <div className="pt-1 text-center">
            <button
              type="button"
              onClick={handleDownloadIcs}
              disabled={downloading}
              className="text-slate-400 hover:text-white text-xs inline-flex items-center gap-1.5 font-medium transition cursor-pointer"
            >
              {downloading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
              ) : (
                <Download className="w-3.5 h-3.5 text-amber-400" />
              )}
              <span>{downloading ? "Building .ICS file..." : "Or download static .ICS file"}</span>
            </button>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-3 text-slate-400 text-[11px] space-y-1.5">
          <div className="font-bold text-slate-300 flex items-center gap-1">
            <HelpCircle className="w-3.5 h-3.5 text-amber-400" /> Subscription Notes:
          </div>
          <ul className="list-disc list-inside space-y-1 pl-1">
            <li><strong>Live Updates:</strong> Call times, downbeats, venue notes, and attire updates will refresh automatically on your calendar.</li>
            <li><strong>RSVP Sync:</strong> When you mark a gig <strong>In</strong> or <strong>Probable</strong>, it appears on your subscribed feed on the next sync.</li>
          </ul>
        </div>

        {/* Token Regeneration Inline Dialog */}
        {showRegenerateConfirm ? (
          <div className="p-3 bg-red-950/40 border border-red-900/60 rounded-xl text-xs text-red-200 space-y-2">
            <p className="font-semibold">Reset Calendar URL?</p>
            <p className="text-[11px] text-red-300/80">
              Generating a new link will break any existing subscriptions on your devices. You will need to re-subscribe with the new link.
            </p>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowRegenerateConfirm(false)}
                className="px-2.5 py-1 text-xs text-slate-400 hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRegenerateToken}
                disabled={refreshing}
                className="px-3 py-1 text-xs font-bold bg-red-600 hover:bg-red-500 text-white rounded-lg cursor-pointer"
              >
                {refreshing ? "Resetting..." : "Confirm Reset"}
              </button>
            </div>
          </div>
        ) : null}

        {/* Footer */}
        <div className="flex justify-between items-center pt-2 border-t border-slate-800 text-[11px]">
          {!showRegenerateConfirm && (
            <button
              type="button"
              onClick={() => setShowRegenerateConfirm(true)}
              disabled={refreshing}
              className="text-slate-500 hover:text-slate-300 flex items-center gap-1 transition cursor-pointer"
            >
              <RefreshCw className={`w-3 h-3 ${refreshing ? "animate-spin" : ""}`} /> Reset calendar link
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 text-slate-300 font-bold hover:bg-slate-700 transition cursor-pointer ml-auto"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}