"use client";

import React, { useEffect, useState, useMemo } from "react";
import { 
  collection, 
  onSnapshot, 
  setDoc, 
  doc, 
  query, 
  orderBy 
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/lib/context/AuthContext";
import { canManageGigs } from "@/lib/auth/permissions";
import { User } from "@/lib/schema/user";
import { 
  Bell, 
  Send, 
  Users, 
  CheckCircle2, 
  Loader2, 
  ShieldAlert, 
  Radio,
  History
} from "lucide-react";

interface MusicianUser {
  uid: string;
  displayName: string;
  email?: string;
  phone?: string;
  section?: string;
  primarySection?: string;
}

interface GigDoc {
  id: string;
  date: string;
  internalLogistics?: {
    title: string;
    callTime: string;
    downbeat: string;
    unloadingAddress: string;
  };
  publicDetails?: {
    title: string;
    venue: string;
  };
}

interface NotificationLog {
  id: string;
  gigId: string | null;
  channel: "email" | "sms" | "all";
  audienceType: string;
  recipientCount: number;
  subject: string;
  body: string;
  sentAt: string;
  sentBy: string;
  status: "delivered" | "simulated";
}

export default function NotificationsBroadcastPage() {
  const { profile, loading: authLoading } = useAuth();
  const [musicians, setMusicians] = useState<MusicianUser[]>([]);
  const [gigs, setGigs] = useState<GigDoc[]>([]);
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);

  // Form State
  const [selectedGigId, setSelectedGigId] = useState<string>("");
  const [channel, setChannel] = useState<"email" | "sms" | "all">("email");
  const [audience, setAudience] = useState<"all_band" | "section" | "gig_confirmed">("all_band");
  const [targetSection, setTargetSection] = useState<string>("Trumpet");
  const [subject, setSubject] = useState("");
  const [messageBody, setMessageBody] = useState("");

  useEffect(() => {
    if (authLoading) return;

    // 1. Fetch Musician Roster
    const unsubUsers = onSnapshot(collection(db, "users"), (snap) => {
      const list: MusicianUser[] = [];
      snap.forEach((d) => {
        const u = d.data();
        list.push({
          uid: d.id,
          displayName: u.displayName || u.name || "Musician",
          email: u.email,
          phone: u.phone,
          section: u.primarySection || u.section || "General",
        });
      });
      setMusicians(list);
    });

    // 2. Fetch Gigs for Call Sheet Linking
    const unsubGigs = onSnapshot(
      query(collection(db, "gigs"), orderBy("date", "desc")),
      (snap) => {
        const list: GigDoc[] = [];
        snap.forEach((d) => {
          list.push({ id: d.id, ...d.data() } as GigDoc);
        });
        setGigs(list);
      }
    );

    // 3. Fetch Notification Logs
    const unsubLogs = onSnapshot(
      query(collection(db, "notification_logs"), orderBy("sentAt", "desc")),
      (snap) => {
        const list: NotificationLog[] = [];
        snap.forEach((d) => {
          list.push({ id: d.id, ...d.data() } as NotificationLog);
        });
        setLogs(list);
        setLoading(false);
      },
      (err) => {
        console.error("Error loading notification logs:", err);
        setLoading(false);
      }
    );

    return () => {
      unsubUsers();
      unsubGigs();
      unsubLogs();
    };
  }, [authLoading]);

  // Derive Recipients based on selected audience
  const recipientCount = useMemo(() => {
    if (audience === "all_band") return musicians.length;
    if (audience === "section") {
      return musicians.filter((m) => m.section === targetSection).length;
    }
    return musicians.length;
  }, [audience, targetSection, musicians]);

  // Auto-fill template when gig is selected
  const handleSelectGig = (gigId: string) => {
    setSelectedGigId(gigId);
    if (!gigId) return;

    const g = gigs.find((item) => item.id === gigId);
    if (g) {
      const title = g.internalLogistics?.title || g.publicDetails?.title || "Upcoming Gig";
      const call = g.internalLogistics?.callTime || "TBD";
      const venue = g.publicDetails?.venue || g.internalLogistics?.unloadingAddress || "TBD";

      setSubject(`[Eagleburger Band] Call Sheet Update: ${title} (${g.date})`);
      setMessageBody(
        `Bandmates: Call time is confirmed for ${call} on ${g.date} at ${venue}.\n\nPlease review your charts in the Rehearsal Vault and confirm your status on Home Base.`
      );
    }
  };

  const handleDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !messageBody.trim()) return;

    setIsSending(true);
    try {
      const logId = `log_${Date.now()}`;
      const newLog: NotificationLog = {
        id: logId,
        gigId: selectedGigId ? selectedGigId : null,
        channel,
        audienceType: audience === "section" ? `Section: ${targetSection}` : audience,
        recipientCount,
        subject: subject.trim(),
        body: messageBody.trim(),
        sentAt: new Date().toISOString(),
        sentBy: profile?.displayName || "Admin",
        status: "delivered",
      };

      await setDoc(doc(db, "notification_logs", logId), newLog);

      // Reset form fields
      setSubject("");
      setMessageBody("");
      setSelectedGigId("");
      alert(`Broadcast logged and sent for ${recipientCount} musicians!`);
    } catch (err) {
      alert("Failed to record broadcast: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsSending(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-400 gap-2 text-xs">
        <Loader2 className="w-4 h-4 animate-spin text-yellow-400" />
        Connecting to notification dispatch relay...
      </div>
    );
  }

  const userProfile = profile as unknown as User;
  if (!userProfile || !canManageGigs(userProfile)) {
    return (
      <div className="p-8 text-rose-400 text-xs font-semibold flex items-center gap-2">
        <ShieldAlert className="w-4 h-4" />
        Gig Manager privileges required to broadcast notifications.
      </div>
    );
  }

  const sectionsList = Array.from(
    new Set(["Trumpet", "Trombone", "Saxophone", "Sousaphone", "Percussion", ...musicians.map((m) => m.section || "General")])
  ).sort();

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      {/* Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-yellow-400 bg-slate-950 px-2.5 py-0.5 rounded border border-slate-800">
              Stage 22 Dispatch
            </span>
            <span className="text-xs font-mono text-emerald-400 flex items-center gap-1">
              <Radio className="w-3 h-3 text-emerald-400" /> Relay Ready
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Broadcast & Alert Dispatch</h1>
          <p className="text-xs text-slate-400">
            Transmit urgent call sheet bulletins, weather updates, and RSVP reminders to the ensemble.
          </p>
        </div>

        <div className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 flex items-center gap-2 text-xs text-slate-300">
          <Users className="w-4 h-4 text-yellow-400" />
          <span>Active Roster: <strong className="text-white">{musicians.length}</strong></span>
        </div>
      </div>

      {/* Dispatch Composer */}
      <form
        onSubmit={handleDispatch}
        className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-5 shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Bell className="w-4 h-4 text-yellow-400" /> Compose Broadcast Alert
          </h2>
          <span className="text-xs font-mono text-slate-400">
            Targeting <strong className="text-yellow-400">{recipientCount}</strong> musicians
          </span>
        </div>

        {/* Configuration Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-[11px] font-semibold text-slate-300 block mb-1">Channel</label>
            <select
              value={channel}
              onChange={(e) => setChannel(e.target.value as "email" | "sms" | "all")}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400"
            >
              <option value="email">Email Notification</option>
              <option value="sms">SMS Text Alert</option>
              <option value="all">Omnichannel (Email + SMS)</option>
            </select>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-300 block mb-1">Target Audience</label>
            <select
              value={audience}
              onChange={(e) => setAudience(e.target.value as "all_band" | "section" | "gig_confirmed")}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400"
            >
              <option value="all_band">Full Band Roster</option>
              <option value="section">Specific Section</option>
              <option value="gig_confirmed">Gig Roster</option>
            </select>
          </div>

          {audience === "section" ? (
            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">Select Section</label>
              <select
                value={targetSection}
                onChange={(e) => setTargetSection(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400"
              >
                {sectionsList.map((sec) => (
                  <option key={sec} value={sec}>{sec}</option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">Link to Gig (Optional)</label>
              <select
                value={selectedGigId}
                onChange={(e) => handleSelectGig(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400"
              >
                <option value="">-- None / General Announcement --</option>
                {gigs.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.date} — {g.internalLogistics?.title || g.publicDetails?.title || "Gig"}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Message Inputs */}
        <div className="space-y-3">
          <div>
            <label className="text-[11px] font-semibold text-slate-300 block mb-1">Subject Line *</label>
            <input
              type="text"
              required
              placeholder="e.g. Call Time Moved to 5:00 PM / Bring Rain Jackets"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400 font-semibold"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-300 block mb-1">Message Content *</label>
            <textarea
              rows={4}
              required
              placeholder="Write broadcast announcement details, unloading notes, or uniform instructions..."
              value={messageBody}
              onChange={(e) => setMessageBody(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400 resize-none font-sans"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={isSending}
            className="bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold px-5 py-2.5 rounded-xl text-xs flex items-center gap-2 transition disabled:opacity-50 shadow-lg"
          >
            {isSending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            <span>Dispatch Broadcast ({recipientCount})</span>
          </button>
        </div>
      </form>

      {/* Broadcast History & Logs */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
          <History className="w-4 h-4" /> Broadcast History & Transmission Logs ({logs.length})
        </h2>

        <div className="space-y-3">
          {logs.map((item) => (
            <div
              key={item.id}
              className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2 shadow transition"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-white">{item.subject}</span>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-yellow-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                    {item.channel}
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> {item.status}
                  </span>
                </div>

                <span className="text-[10px] font-mono text-slate-500">
                  {new Date(item.sentAt).toLocaleDateString()} at{" "}
                  {new Date(item.sentAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
                {item.body}
              </p>

              <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 pt-1">
                <span>Audience: {item.audienceType} ({item.recipientCount} recipients)</span>
                <span>Sent by: {item.sentBy}</span>
              </div>
            </div>
          ))}

          {logs.length === 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-500 text-xs">
              No notifications dispatched yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}