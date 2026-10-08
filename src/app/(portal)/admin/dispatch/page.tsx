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
import { DispatchRecord, DispatchSchema } from "@/lib/schema/dispatch";
import { toast } from "@/lib/context/ToastContext";
import Link from "next/link";
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
  FileText,
  Mail,
  Search,
  X,
  ArrowUpDown,
  ExternalLink
} from "lucide-react";

interface GigSummary {
  id: string;
  title: string;
  date: string;
  venue?: string;
  callTime?: string;
  performanceTime?: string;
  locationDetails?: string;
  status?: string;
}

interface MusicianRsvp {
  uid: string;
  displayName: string;
  status: string;
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
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailSending, setEmailSending] = useState(false);
  const [usersMap, setUsersMap] = useState<Record<string, { email: string; displayName: string }>>({});

  // Event List Search & Filter State
  const [eventSearch, setEventSearch] = useState("");
  const [eventFilter, setEventFilter] = useState<"all" | "upcoming" | "past">("all");
  const [sortAsc, setSortAsc] = useState(true);

  // Dispatch Form Fields
  const [uniformBrief, setUniformBrief] = useState("Eagleburger black t-shirt, dark trousers/jeans, comfortable brass marching shoes.");
  const [callTimeBrief, setCallTimeBrief] = useState("Call time: 45 min before downbeat for warm-up and chart run-through.");
  const [logisticsBrief, setLogisticsBrief] = useState("Instrument trunk staging near loading dock. Street parking available on side streets.");

  // Listen to Users to resolve emails for confirmed musicians
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "users"), (snap) => {
      const map: Record<string, { email: string; displayName: string }> = {};
      snap.forEach((d) => {
        const u = d.data();
        if (u.email) {
          map[d.id] = {
            email: u.email,
            displayName: u.displayName || u.name || "Musician",
          };
        }
      });
      setUsersMap(map);
    });
    return () => unsub();
  }, []);

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
            title: data.title || data.publicDetails?.title || data.internalLogistics?.title || `Gig ${d.id.slice(0, 6)}`,
            date: data.date || "TBD",
            venue: data.venue || data.publicDetails?.venue || "TBD",
            callTime: data.internalLogistics?.callTime || data.callTime || data.schedule?.callTime || "TBD",
            performanceTime: data.internalLogistics?.downbeat || data.performanceTime || data.schedule?.performanceTime || "TBD",
            locationDetails: data.locationDetails || data.internalLogistics?.unloadingAddress || data.internalLogistics?.parkingInstructions || "",
            status: data.status || "confirmed",
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
          const parsed = DispatchSchema.safeParse({ id: d.id, ...d.data() });
          if (parsed.success) {
            hist.push(parsed.data);
          } else {
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
          }
        });
        hist.sort((a, b) => (b.sentAt || "").localeCompare(a.sentAt || ""));
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

  const attendingMusicianEmails = useMemo(() => {
    return attendingMusicians
      .map((m) => usersMap[m.uid]?.email)
      .filter((em): em is string => Boolean(em && em.includes("@")));
  }, [attendingMusicians, usersMap]);

  // Filtered & Sorted Gigs for the right-hand column selector
  const filteredGigs = useMemo(() => {
    const todayStr = new Date().toISOString().split("T")[0];
    const q = eventSearch.toLowerCase().trim();

    const filtered = gigs.filter((g) => {
      if (q) {
        const matchesTitle = g.title.toLowerCase().includes(q);
        const matchesVenue = (g.venue || "").toLowerCase().includes(q);
        const matchesDate = g.date.toLowerCase().includes(q);
        if (!matchesTitle && !matchesVenue && !matchesDate) return false;
      }

      if (eventFilter === "upcoming") {
        if (g.date === "TBD") return true;
        return g.date >= todayStr;
      }
      if (eventFilter === "past") {
        if (g.date === "TBD") return false;
        return g.date < todayStr;
      }

      return true;
    });

    return filtered.slice().sort((a, b) => {
      const cmp = a.date.localeCompare(b.date);
      return sortAsc ? cmp : -cmp;
    });
  }, [gigs, eventSearch, eventFilter, sortAsc]);

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
      toast.success("Call sheet copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy call sheet to clipboard.");
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

      const validated = DispatchSchema.parse(payload);
      await addDoc(collection(db, "gigs", selectedGigId, "dispatches"), validated);
      setSentSuccess(true);
      toast.success("Dispatch call sheet recorded successfully!");
      setTimeout(() => setSentSuccess(false), 3000);
    } catch (err) {
      toast.error("Failed to record dispatch: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setSending(false);
    }
  };

  const handleSendEmailCallSheet = async () => {
    if (!selectedGig || attendingMusicianEmails.length === 0) return;
    setEmailSending(true);
    try {
      const res = await fetch("/api/email/call-sheet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gigId: selectedGig.id,
          gigTitle: selectedGig.title,
          date: selectedGig.date,
          callTime: selectedGig.callTime || callTimeBrief || "TBD",
          downbeat: selectedGig.performanceTime || "TBD",
          venue: selectedGig.venue || "TBD",
          address: selectedGig.locationDetails || logisticsBrief || "",
          attire: uniformBrief,
          notes: logisticsBrief,
          setlistUrl: `/portal/perform/${selectedGig.id}`,
          recipientEmails: attendingMusicianEmails,
          actorUid: profile?.uid,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to dispatch call sheet emails");
      }

      if (data.mocked) {
        toast.success(`[Mock] Email call sheet simulated for ${attendingMusicianEmails.length} attendees.`);
      } else {
        toast.success(`Email call sheet sent to ${attendingMusicianEmails.length} musicians!`);
      }
      setShowEmailModal(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setEmailSending(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
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

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={attendingMusicians.length === 0}
            onClick={() => setShowEmailModal(true)}
            className="bg-slate-900 hover:bg-slate-800 text-yellow-400 border border-yellow-400/30 font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 transition shadow disabled:opacity-50 cursor-pointer"
            title="Dispatch formatted email call sheet to confirmed attendees"
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Email Call Sheet ({attendingMusicians.length})</span>
          </button>

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

      {/* Main Studio Grid: Left 8 cols for Dispatch Studio, Right 4 cols for Vertical Event Selector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (8 cols): Active Gig Overview + Parameters + Preview + History */}
        <div className="lg:col-span-8 space-y-6">
          {/* Active Event Summary Header */}
          {selectedGig ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-yellow-400 bg-yellow-400/10 px-2 py-0.5 rounded border border-yellow-400/20">
                      Active Event
                    </span>
                    <span className="text-xs font-mono text-slate-400">{selectedGig.date}</span>
                    {selectedGig.status && (
                      <span className="text-[10px] font-mono uppercase text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                        {selectedGig.status}
                      </span>
                    )}
                  </div>
                  <h2 className="text-xl font-bold text-white">{selectedGig.title}</h2>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/portal/gigs`}
                    target="_blank"
                    className="text-xs text-slate-400 hover:text-yellow-400 flex items-center gap-1 transition"
                  >
                    <span>View Calendar</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 text-xs">
                <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
                  <span className="text-[10px] text-slate-500 uppercase block font-semibold">Venue</span>
                  <span className="font-semibold text-slate-200 truncate block mt-0.5">{selectedGig.venue || "TBD"}</span>
                </div>
                <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
                  <span className="text-[10px] text-slate-500 uppercase block font-semibold">Call Time</span>
                  <span className="font-semibold text-yellow-400 truncate block mt-0.5">{selectedGig.callTime || "TBD"}</span>
                </div>
                <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
                  <span className="text-[10px] text-slate-500 uppercase block font-semibold">Performance</span>
                  <span className="font-semibold text-slate-200 truncate block mt-0.5">{selectedGig.performanceTime || "TBD"}</span>
                </div>
                <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
                  <span className="text-[10px] text-slate-500 uppercase block font-semibold">Confirmed</span>
                  <span className="font-semibold text-emerald-400 truncate block mt-0.5">{attendingMusicians.length} Musicians</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center text-slate-400 text-xs">
              No performance event selected. Choose an event from the list on the right.
            </div>
          )}

          {/* Sub-grid: Form Inputs on Left subcolumn, Digest Preview & History on Right subcolumn */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            {/* Input Builder & Audience */}
            <div className="space-y-4">
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
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex items-center justify-between shadow">
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

            {/* Live Digest Preview & History */}
            <div className="space-y-4">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 shadow">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-yellow-400" /> Formatted Digest Preview
                  </span>
                  <span className="text-[10px] font-mono text-slate-500">Live Markdown Preview</span>
                </div>

                <pre className="bg-slate-950 border border-slate-800/80 rounded-xl p-4 text-[11px] font-mono text-slate-300 whitespace-pre-wrap leading-relaxed overflow-x-auto max-h-[280px]">
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
                  <div className="divide-y divide-slate-800 text-xs max-h-[160px] overflow-y-auto pr-1">
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

        {/* Right Column (4 cols): Sticky Performance Events Selector Column */}
        <div className="lg:col-span-4 lg:sticky lg:top-4 space-y-3">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-yellow-400" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-white">
                  Performance Events
                </h2>
              </div>
              <span className="text-[10px] font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                {filteredGigs.length} {filteredGigs.length === 1 ? "Event" : "Events"}
              </span>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Search gigs or venues..."
                value={eventSearch}
                onChange={(e) => setEventSearch(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400 font-sans"
              />
              {eventSearch && (
                <button
                  type="button"
                  onClick={() => setEventSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter Tabs & Sort Toggle */}
            <div className="flex items-center justify-between gap-1 pt-0.5">
              <div className="inline-flex bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-[11px]">
                {(["all", "upcoming", "past"] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setEventFilter(tab)}
                    className={`px-2.5 py-1 rounded-md font-semibold capitalize transition ${
                      eventFilter === tab
                        ? "bg-yellow-400 text-slate-950 shadow-sm"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setSortAsc((prev) => !prev)}
                className="text-[11px] flex items-center gap-1 text-slate-400 hover:text-yellow-400 px-2 py-1 rounded-lg bg-slate-950 border border-slate-800 transition"
                title={`Sort by Date (${sortAsc ? "Oldest First" : "Newest First"})`}
              >
                <ArrowUpDown className="w-3 h-3" />
                <span className="font-mono text-[10px]">{sortAsc ? "Asc" : "Desc"}</span>
              </button>
            </div>

            {/* Vertical Scroll List */}
            <div className="space-y-2 overflow-y-auto max-h-[calc(100vh-320px)] min-h-[220px] pr-1 scrollbar-thin">
              {filteredGigs.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-500 italic bg-slate-950/40 rounded-xl border border-slate-800/50">
                  No performance events match the criteria.
                </div>
              ) : (
                filteredGigs.map((gig) => {
                  const isSelected = gig.id === selectedGigId;
                  return (
                    <button
                      key={gig.id}
                      type="button"
                      onClick={() => setSelectedGigId(gig.id)}
                      className={`w-full text-left p-3 rounded-xl border transition flex flex-col gap-1.5 ${
                        isSelected
                          ? "bg-slate-800 border-yellow-400 shadow-md ring-1 ring-yellow-400/40 text-white"
                          : "bg-slate-950/70 border-slate-800 hover:bg-slate-800/50 hover:border-slate-700 text-slate-300"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-[10px] font-mono font-bold ${isSelected ? "text-yellow-400" : "text-yellow-400/80"}`}>
                          {gig.date}
                        </span>
                        {gig.callTime && gig.callTime !== "TBD" && (
                          <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5 text-slate-500" />
                            {gig.callTime}
                          </span>
                        )}
                      </div>

                      <div className="font-bold text-xs leading-snug line-clamp-2">
                        {gig.title}
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-0.5">
                        <span className="truncate flex items-center gap-1 max-w-[190px]">
                          <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                          <span className="truncate">{gig.venue || "Venue TBD"}</span>
                        </span>

                        {isSelected && (
                          <span className="text-[9px] font-mono uppercase bg-yellow-400 text-slate-950 font-bold px-1.5 py-0.5 rounded shrink-0">
                            Selected
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Email Call Sheet Modal */}
      {showEmailModal && selectedGig && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-lg w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Mail className="w-4 h-4 text-yellow-400" />
                <span>Email Call Sheet to Confirmed Attendees</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowEmailModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                <div className="font-bold text-white text-sm">{selectedGig.title}</div>
                <div className="text-slate-400 flex items-center gap-2">
                  <span>📅 {selectedGig.date}</span>
                  <span>📍 {selectedGig.venue || "Venue TBD"}</span>
                </div>
                <div className="text-yellow-400 font-mono text-[11px] pt-1">
                  Call: {selectedGig.callTime || "TBD"} &bull; Downbeat: {selectedGig.performanceTime || "TBD"}
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1 uppercase text-[10px]">
                  Recipients ({attendingMusicianEmails.length} with verified emails)
                </label>
                <div className="max-h-32 overflow-y-auto bg-slate-950 p-2.5 rounded-xl border border-slate-800 space-y-1 font-mono text-[11px]">
                  {attendingMusicians.map((m) => {
                    const email = usersMap[m.uid]?.email;
                    return (
                      <div key={m.uid} className="flex items-center justify-between">
                        <span className="text-white">{m.displayName}</span>
                        <span className={email ? "text-slate-400" : "text-rose-400"}>
                          {email || "No email on profile"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-amber-500/10 border border-amber-500/20 text-amber-300 p-2.5 rounded-xl text-[11px] leading-relaxed">
                ℹ️ Each confirmed musician will receive a branded HTML call sheet with staging directions, attire instructions, downbeat times, and a one-click link to the Music Vault repertoire.
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowEmailModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={emailSending || attendingMusicianEmails.length === 0}
                onClick={handleSendEmailCallSheet}
                className="bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition shadow disabled:opacity-50 cursor-pointer"
              >
                {emailSending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                <span>{emailSending ? "Sending Call Sheets..." : `Send to ${attendingMusicianEmails.length} Musicians`}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}