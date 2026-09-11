"use client";

import React, { useEffect, useState, useMemo } from "react";
import { 
  collection, 
  onSnapshot, 
  addDoc
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/lib/context/AuthContext";
import { canManageGigs } from "@/lib/auth/permissions";
import { User } from "@/lib/schema/user";
import { 
  Send, 
  Calendar, 
  Users, 
  Shirt, 
  MapPin, 
  Clock, 
  Loader2, 
  ShieldAlert, 
  History, 
  Copy, 
  Check, 
  Sparkles,
  FileText
} from "lucide-react";

interface GigSummary {
  id: string;
  title: string;
  date: string;
  venue?: string;
  callTime?: string;
  performanceTime?: string;
  locationDetails?: string;
}

interface MusicianRsvp {
  uid: string;
  displayName: string;
  status: string;
}

interface DispatchRecord {
  id: string;
  gigId: string;
  sentAt: string;
  sentByName: string;
  subject: string;
  uniformBrief: string;
  callTimeBrief: string;
  logisticsBrief: string;
  recipientCount: number;
}

export default function DispatchStudioPage() {
  const { profile, loading: authLoading } = useAuth();
  const [gigs, setGigs] = useState<GigSummary[]>([]);
  const [selectedGigId, setSelectedGigId] = useState<string>("");
  const [rsvps, setRsvps] = useState<MusicianRsvp[]>([]);
  const [dispatchHistory, setDispatchHistory] = useState<DispatchRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);

  // Dispatch Form Fields
  const [uniformBrief, setUniformBrief] = useState("Eagleburger black t-shirt, dark trousers/jeans, comfortable brass marching shoes.");
  const [callTimeBrief, setCallTimeBrief] = useState("Call time: 45 min before downbeat for warm-up and chart run-through.");
  const [logisticsBrief, setLogisticsBrief] = useState("Instrument trunk staging near loading dock. Street parking available on side streets.");

  // 1. Listen to Gigs
  useEffect(() => {
    if (authLoading) return;

    const unsubGigs = onSnapshot(
      collection(db, "gigs"),
      (snap) => {
        const gList: GigSummary[] = [];
        snap.forEach((d) => {
          const data = d.data();
          gList.push({
            id: d.id,
            title: data.title || data.publicDetails?.title || `Gig ${d.id.slice(0, 6)}`,
            date: data.date || "TBD",
            venue: data.venue || data.publicDetails?.venue || "TBD",
            callTime: data.callTime || data.schedule?.callTime || "TBD",
            performanceTime: data.performanceTime || data.schedule?.performanceTime || "TBD",
            locationDetails: data.locationDetails || data.internalLogistics?.location || "",
          });
        });
        gList.sort((a, b) => a.date.localeCompare(b.date));
        setGigs(gList);
        if (gList.length > 0 && !selectedGigId) {
          setSelectedGigId(gList[0].id);
        }
        setLoading(false);
      },
      (err) => {
        console.error("Failed to load gigs for dispatch:", err);
        setLoading(false);
      }
    );

    return () => unsubGigs();
  }, [authLoading, selectedGigId]);

  // 2. Listen to RSVPs for selected gig
  useEffect(() => {
    if (!selectedGigId) return;

    const unsubRsvps = onSnapshot(
      collection(db, "gigs", selectedGigId, "rsvps"),
      (snap) => {
        const rList: MusicianRsvp[] = [];
        snap.forEach((d) => {
          const data = d.data();
          rList.push({
            uid: d.id,
            displayName: data.displayName || data.name || "Musician",
            status: data.status || "attending",
          });
        });
        setRsvps(rList);
      },
      (err) => console.warn("Notice: gig rsvps dispatch:", err)
    );

    // 3. Listen to Dispatch History for this gig
    const unsubHistory = onSnapshot(
      collection(db, "gigs", selectedGigId, "dispatches"),
      (snap) => {
        const hist: DispatchRecord[] = [];
        snap.forEach((d) => {
          const data = d.data();
          hist.push({
            id: d.id,
            gigId: selectedGigId,
            sentAt: data.sentAt || "",
            sentByName: data.sentByName || "Manager",
            subject: data.subject || "",
            uniformBrief: data.uniformBrief || "",
            callTimeBrief: data.callTimeBrief || "",
            logisticsBrief: data.logisticsBrief || "",
            recipientCount: typeof data.recipientCount === "number" ? data.recipientCount : 0,
          });
        });
        hist.sort((a, b) => b.sentAt.localeCompare(a.sentAt));
        setDispatchHistory(hist);
      },
      (err) => console.warn("Notice: dispatch history fetch:", err)
    );

    return () => {
      unsubRsvps();
      unsubHistory();
    };
  }, [selectedGigId]);

  const selectedGig = gigs.find((g) => g.id === selectedGigId);
  const attendingMusicians = useMemo(() => rsvps.filter((r) => r.status === "attending"), [rsvps]);
  const tentativeMusicians = useMemo(() => rsvps.filter((r) => r.status === "tentative"), [rsvps]);

  // Generated Text Brief for copying / emailing
  const generatedCallSheet = useMemo(() => {
    if (!selectedGig) return "";
    return `🎺 EAGLEBURGER CALL SHEET BRIEF: ${selectedGig.title.toUpperCase()}
==================================================
Date: ${selectedGig.date}
Venue: ${selectedGig.venue || "TBD"}
Schedule: ${callTimeBrief}

UNIFORM / ATTIRE:
${uniformBrief}

PARKING & LOGISTICS:
${logisticsBrief}

CONFIRMED ATTENDEES (${attendingMusicians.length}):
${attendingMusicians.map((m) => `• ${m.displayName}`).join("\n")}
==================================================
Questions or late changes? Contact Band Management.`;
  }, [selectedGig, uniformBrief, callTimeBrief, logisticsBrief, attendingMusicians]);

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-400 gap-2 text-xs">
        <Loader2 className="w-4 h-4 animate-spin text-yellow-400" />
        Loading Call Sheet Dispatch Studio...
      </div>
    );
  }

  const userProfile = profile as unknown as User;
  if (!userProfile || !canManageGigs(userProfile)) {
    return (
      <div className="p-8 text-rose-400 text-xs font-semibold flex items-center gap-2">
        <ShieldAlert className="w-4 h-4" />
        Gig Manager privileges required to dispatch musician call sheets.
      </div>
    );
  }

  const handleCopyClipboard = async () => {
    try {
      await navigator.clipboard.writeText(generatedCallSheet);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      alert("Failed to copy call sheet to clipboard.");
    }
  };

  const handleSendDispatch = async () => {
    if (!selectedGigId || !selectedGig) return;
    setSending(true);
    try {
      const payload = {
        gigId: selectedGigId,
        sentAt: new Date().toISOString(),
        sentByName: profile?.displayName || "Band Manager",
        subject: `Call Sheet: ${selectedGig.title}`,
        uniformBrief,
        callTimeBrief,
        logisticsBrief,
        recipientCount: attendingMusicians.length,
      };

      await addDoc(collection(db, "gigs", selectedGigId, "dispatches"), payload);
      setSentSuccess(true);
      setTimeout(() => setSentSuccess(false), 3000);
    } catch (err) {
      alert("Failed to record dispatch: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      {/* Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-yellow-400 bg-slate-950 px-2.5 py-0.5 rounded border border-slate-800">
              Stage 20 Studio
            </span>
            <span className="text-xs font-mono text-slate-400">
              Logistics Broadcast
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Call Sheet Dispatch</h1>
          <p className="text-xs text-slate-400">
            Generate and broadcast production digests, dress codes, and arrival instructions to confirmed musicians.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopyClipboard}
            className="bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 transition"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? "Copied!" : "Copy Digest"}</span>
          </button>

          <button
            type="button"
            disabled={sending || attendingMusicians.length === 0}
            onClick={handleSendDispatch}
            className="bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition shadow disabled:opacity-50"
          >
            {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : sentSuccess ? <Check className="w-3.5 h-3.5" /> : <Send className="w-3.5 h-3.5" />}
            <span>{sending ? "Broadcasting..." : sentSuccess ? "Dispatched!" : "Dispatch to Roster"}</span>
          </button>
        </div>
      </div>

      {/* Gig Picker Tabs */}
      <div className="space-y-2">
        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
          Select Performance Event
        </label>
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
          {gigs.map((gig) => {
            const isSelected = gig.id === selectedGigId;
            return (
              <button
                key={gig.id}
                type="button"
                onClick={() => setSelectedGigId(gig.id)}
                className={`text-xs px-3.5 py-2 rounded-xl font-bold transition flex items-center gap-2 border shrink-0 text-left ${
                  isSelected
                    ? "bg-slate-800 text-white border-yellow-400/80 shadow-md"
                    : "bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200"
                }`}
              >
                <Calendar className={`w-3.5 h-3.5 ${isSelected ? "text-yellow-400" : "text-slate-500"}`} />
                <div>
                  <div className="font-bold truncate max-w-[170px]">{gig.title}</div>
                  <div className="text-[10px] font-mono text-slate-500">{gig.date}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Grid: Digest Builder & Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Input Builder */}
        <div className="lg:col-span-6 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <FileText className="w-4 h-4 text-yellow-400" /> Briefing Parameters
            </h2>

            <div>
              <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5 mb-1">
                <Clock className="w-3.5 h-3.5 text-yellow-400" /> Call Time & Schedule
              </label>
              <textarea
                rows={2}
                value={callTimeBrief}
                onChange={(e) => setCallTimeBrief(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-yellow-400 font-sans"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5 mb-1">
                <Shirt className="w-3.5 h-3.5 text-emerald-400" /> Uniform & Attire Standards
              </label>
              <textarea
                rows={2}
                value={uniformBrief}
                onChange={(e) => setUniformBrief(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-yellow-400 font-sans"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5 mb-1">
                <MapPin className="w-3.5 h-3.5 text-rose-400" /> Parking, Load-In & Venue Access
              </label>
              <textarea
                rows={3}
                value={logisticsBrief}
                onChange={(e) => setLogisticsBrief(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-yellow-400 font-sans"
              />
            </div>
          </div>

          {/* Recipient Audience Stats */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-yellow-400" />
              <div>
                <div className="text-xs font-bold text-white">Target Recipients</div>
                <div className="text-[11px] text-slate-400">
                  {attendingMusicians.length} confirmed attending
                  {tentativeMusicians.length > 0 && ` • ${tentativeMusicians.length} tentative`}
                </div>
              </div>
            </div>

            <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/30">
              {attendingMusicians.length} Musician{attendingMusicians.length === 1 ? "" : "s"}
            </span>
          </div>
        </div>

        {/* Right Column: Live Digest Preview & History */}
        <div className="lg:col-span-6 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 shadow">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-yellow-400" /> Formatted Digest Preview
              </span>
              <span className="text-[10px] font-mono text-slate-500">Live Markdown Preview</span>
            </div>

            <pre className="bg-slate-950 border border-slate-800/80 rounded-xl p-4 text-[11px] font-mono text-slate-300 whitespace-pre-wrap leading-relaxed overflow-x-auto">
              {generatedCallSheet}
            </pre>
          </div>

          {/* Dispatch Log / History */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 shadow">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <History className="w-4 h-4 text-slate-400" /> Dispatch History
            </h2>

            {dispatchHistory.length === 0 ? (
              <div className="text-xs text-slate-500 italic py-2">
                No recorded dispatches broadcast for this gig yet.
              </div>
            ) : (
              <div className="divide-y divide-slate-800 text-xs">
                {dispatchHistory.map((item) => (
                  <div key={item.id} className="py-2.5 flex items-center justify-between gap-2">
                    <div>
                      <div className="font-bold text-white">{item.subject}</div>
                      <div className="text-[10px] font-mono text-slate-500">
                        Dispatched by {item.sentByName} • {new Date(item.sentAt).toLocaleDateString()} at {new Date(item.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800 shrink-0">
                      {item.recipientCount} sent
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}