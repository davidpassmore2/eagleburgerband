"use client";

import React, { useEffect, useState, useMemo, use } from "react";
import Link from "next/link";
import { 
  collection, 
  doc, 
  onSnapshot, 
  setDoc, 
  updateDoc,
  getDoc,
  deleteField 
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/lib/context/AuthContext";
import { 
  CheckCircle2, 
  Clock, 
  ArrowLeft, 
  Loader2, 
  Search, 
  Plus, 
  UserMinus, 
  Users, 
  Radio,
  MapPin
} from "lucide-react";
import { toast } from "@/lib/context/ToastContext";
import { 
  CheckInSchema, 
  type CheckInRecord, 
  type CheckInStatus 
} from "@/lib/schema/checkin";

type CheckInDoc = CheckInRecord;

interface MusicianProfile {
  uid: string;
  displayName: string;
  section: string;
}

const DEFAULT_SECTIONS = [
  "All",
  "Trumpet",
  "Trombone",
  "Saxophone",
  "Sousaphone",
  "Percussion",
  "General",
];

export default function DayOfCheckInKioskPage({
  params,
}: {
  params: Promise<{ gigId: string }>;
}) {
  const resolvedParams = use(params);
  const gigId = resolvedParams.gigId;
  const { profile, firebaseUser, loading: authLoading } = useAuth();
  const currentUid = firebaseUser?.uid || profile?.uid || "";

  const [gigTitle, setGigTitle] = useState("Performance Roll Call");
  const [gigDate, setGigDate] = useState("");
  const [callTime, setCallTime] = useState("");

  const [musicians, setMusicians] = useState<MusicianProfile[]>([]);
  const [checkins, setCheckins] = useState<Record<string, CheckInDoc>>({});
  const [loading, setLoading] = useState(true);
  const [selectedSection, setSelectedSection] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");

  const myCheckin = currentUid ? checkins[currentUid] : undefined;

  // Sub Form State
  const [isAddingSub, setIsAddingSub] = useState(false);
  const [subName, setSubName] = useState("");
  const [subSection, setSubSection] = useState("Trumpet");

  // 1. Fetch Gig Details
  useEffect(() => {
    if (!gigId) return;
    const fetchGig = async () => {
      const gDoc = await getDoc(doc(db, "gigs", gigId));
      if (gDoc.exists()) {
        const data = gDoc.data();
        setGigTitle(data.internalLogistics?.title || data.publicDetails?.title || "Performance");
        setGigDate(data.date || "");
        setCallTime(data.internalLogistics?.callTime || "TBD");
      }
    };
    fetchGig();
  }, [gigId]);

  // 2. Fetch Musicians & Real-Time Check-Ins
  useEffect(() => {
    if (!gigId) return;

    const unsubUsers = onSnapshot(
      collection(db, "users"),
      (snap) => {
        const list: MusicianProfile[] = [];
        snap.forEach((d) => {
          const u = d.data();
          list.push({
            uid: d.id,
            displayName: u.displayName || u.name || "Musician",
            section: u.primarySection || u.section || "General",
          });
        });
        list.sort((a, b) => a.displayName.localeCompare(b.displayName));
        setMusicians(list);
      },
      (err) => console.warn("Notice: users fetch note:", err)
    );

    const unsubCheckins = onSnapshot(
      collection(db, "gigs", gigId, "checkins"),
      (snap) => {
        const map: Record<string, CheckInDoc> = {};
        snap.forEach((d) => {
          const parsed = CheckInSchema.safeParse({ id: d.id, gigId, ...d.data() });
          if (parsed.success) {
            map[d.id] = parsed.data;
          }
        });
        setCheckins(map);
        setLoading(false);
      },
      (err) => {
        console.error("Error loading checkins:", err);
        setLoading(false);
      }
    );

    return () => {
      unsubUsers();
      unsubCheckins();
    };
  }, [gigId]);

  const handleSetStatus = async (
    targetUid: string,
    displayName: string,
    section: string,
    newStatus: CheckInStatus,
    isSub = false
  ) => {
    try {
      const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      const isPresent = newStatus === "checked_in" || newStatus === "late";

      const record: Record<string, unknown> = {
        uid: targetUid,
        gigId,
        displayName,
        section,
        status: newStatus,
        checkInTime: isPresent ? now : deleteField(),
        isSub,
        checkInMethod: targetUid === currentUid ? "self_kiosk" : "section_leader",
        updatedAt: new Date().toISOString(),
      };

      await setDoc(doc(db, "gigs", gigId, "checkins", targetUid), record, { merge: true });
      toast.success(`Check-in updated for ${displayName}.`);
    } catch (err) {
      toast.error("Failed to update check-in: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleUpdateUserSection = async (uid: string, newSection: string, isSub = false) => {
    try {
      // 1. Update live checkin subcollection
      await setDoc(
        doc(db, "gigs", gigId, "checkins", uid),
        { section: newSection },
        { merge: true }
      );

      // 2. If it's a permanent band member, update their user record as well
      if (!isSub) {
        await updateDoc(doc(db, "users", uid), {
          primarySection: newSection,
          section: newSection,
        });
      }
    } catch (err) {
      console.warn("Failed updating user section:", err);
    }
  };

  const handleAddSub = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subName.trim()) return;

    const subUid = `sub_${Date.now()}`;
    await handleSetStatus(subUid, `${subName.trim()} (Sub)`, subSection, "checked_in", true);
    setSubName("");
    setIsAddingSub(false);
  };

  // Combine roster members and external subs (preferring checkin section if set)
  const allAttendees = useMemo(() => {
    const combined: (MusicianProfile & { isSub?: boolean })[] = musicians.map((m) => ({
      ...m,
      section: checkins[m.uid]?.section || m.section,
    }));

    Object.values(checkins).forEach((c) => {
      if (c.isSub && !combined.some((m) => m.uid === c.uid)) {
        combined.push({
          uid: c.uid,
          displayName: c.displayName,
          section: c.section,
          isSub: true,
        });
      }
    });

    return combined;
  }, [musicians, checkins]);

  // Section list: guarantee standard sections exist plus any custom sections
  const sectionsList = useMemo(() => {
    const set = new Set<string>(DEFAULT_SECTIONS);
    allAttendees.forEach((m) => set.add(m.section));
    return Array.from(set);
  }, [allAttendees]);

  const filteredAttendees = allAttendees.filter((m) => {
    const matchesSection = selectedSection === "All" || m.section === selectedSection;
    const matchesSearch = m.displayName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSection && matchesSearch;
  });

  const presentCount = Object.values(checkins).filter(
    (c) => c.status === "checked_in" || c.status === "late"
  ).length;

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-400 gap-2 text-xs">
        <Loader2 className="w-4 h-4 animate-spin text-yellow-400" />
        Connecting to live roll call...
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-6 max-w-4xl mx-auto space-y-4 pb-20">
      {/* Header Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link
              href="/admin/checkin"
              className="p-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:text-white transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
            </Link>
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-yellow-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
              Downbeat Roll Call
            </span>
            <span className="text-xs font-mono text-emerald-400 flex items-center gap-1">
              <Radio className="w-3 h-3 animate-pulse text-emerald-400" /> Live
            </span>
          </div>

          <h1 className="text-xl sm:text-2xl font-extrabold text-white">{gigTitle}</h1>
          <div className="text-xs font-mono text-slate-400 flex items-center gap-2">
            <span>{gigDate}</span>
            <span>•</span>
            <span>Call: {callTime}</span>
          </div>
        </div>

        {/* Headcount Stat Pill */}
        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          <div className="bg-slate-950 border border-slate-800 px-4 py-2 rounded-xl text-center">
            <div className="text-[10px] font-mono text-slate-400 uppercase font-bold">On Site</div>
            <div className="text-xl font-black text-emerald-400 leading-none mt-0.5">
              {presentCount} <span className="text-xs font-normal text-slate-500">/ {allAttendees.length}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsAddingSub(!isAddingSub)}
            className="bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold px-3 py-2 rounded-xl text-xs flex items-center gap-1 transition shadow"
          >
            <Plus className="w-4 h-4" /> <span>Add Sub</span>
          </button>
        </div>
      </div>

      {/* Self-Service Check-In Banner for Current User */}
      {currentUid && (
        <div className="space-y-2">
          {!myCheckin || myCheckin.status === "no_show" ? (
            <div className="bg-gradient-to-r from-yellow-500/10 via-amber-500/15 to-yellow-500/10 border-2 border-yellow-400/50 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-yellow-400" />
                  <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-yellow-400">
                    Day-of-Show Self Check-In
                  </span>
                </div>
                <h2 className="text-base sm:text-lg font-black text-white">
                  Are you on site, {profile?.displayName || "Musician"}?
                </h2>
                <p className="text-xs text-slate-300">
                  Tap to confirm your arrival with section leaders and log attendance for today&apos;s call ({callTime}).
                </p>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                <button
                  type="button"
                  onClick={() =>
                    handleSetStatus(
                      currentUid,
                      profile?.displayName || "Musician",
                      profile?.sectionId || "General",
                      "checked_in"
                    )
                  }
                  className="flex-1 sm:flex-none bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-5 py-3 rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition active:scale-95 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>I&apos;M ON SITE</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleSetStatus(
                      currentUid,
                      profile?.displayName || "Musician",
                      profile?.sectionId || "General",
                      "late"
                    )
                  }
                  className="bg-slate-900 hover:bg-slate-800 text-amber-300 font-bold px-3.5 py-3 rounded-xl text-xs flex items-center justify-center gap-1.5 border border-slate-700 transition cursor-pointer"
                >
                  <Clock className="w-4 h-4" />
                  <span>RUNNING LATE</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-mono font-bold uppercase text-emerald-400 flex items-center gap-1.5">
                    <span>You Are Checked In</span>
                    <span className="text-[10px] bg-emerald-900/60 border border-emerald-700/60 px-2 py-0.5 rounded-full font-bold">
                      ✓ CONFIRMED
                    </span>
                  </div>
                  <p className="text-xs text-slate-200 font-medium mt-0.5">
                    Logged as {myCheckin.status === "late" ? "Late Arrival" : "On Site"} at {myCheckin.checkInTime || "Call Time"} • Section: {myCheckin.section}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() =>
                  handleSetStatus(
                    currentUid,
                    profile?.displayName || "Musician",
                    profile?.sectionId || "General",
                    "no_show"
                  )
                }
                className="text-[11px] font-mono text-slate-400 hover:text-rose-400 transition underline underline-offset-2"
              >
                Undo check-in
              </button>
            </div>
          )}
        </div>
      )}

      {/* Inline Sub Form */}
      {isAddingSub && (
        <form
          onSubmit={handleAddSub}
          className="bg-slate-900 border border-yellow-400/30 rounded-2xl p-4 space-y-3 shadow-xl"
        >
          <div className="text-xs font-bold text-white flex items-center gap-1.5">
            <Users className="w-4 h-4 text-yellow-400" /> Quick-Check Substitute Musician
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              required
              placeholder="Guest / Substitute Name"
              value={subName}
              onChange={(e) => setSubName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400"
            />
            <select
              value={subSection}
              onChange={(e) => setSubSection(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400"
            >
              <option value="Trumpet">Trumpet</option>
              <option value="Trombone">Trombone</option>
              <option value="Saxophone">Saxophone</option>
              <option value="Sousaphone">Sousaphone</option>
              <option value="Percussion">Percussion</option>
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsAddingSub(false)}
              className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold px-3 py-1.5 rounded-lg text-xs"
            >
              Check In Sub
            </button>
          </div>
        </form>
      )}

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-2.5" />
          <input
            type="text"
            placeholder="Search musician by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400"
          />
        </div>

        {/* Guaranteed Section Filter Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 shrink-0">
          {sectionsList.map((sec) => (
            <button
              key={sec}
              onClick={() => setSelectedSection(sec)}
              className={`text-xs px-3 py-1.5 rounded-xl font-bold transition border shrink-0 ${
                selectedSection === sec
                  ? "bg-yellow-400 text-slate-950 border-yellow-400 shadow"
                  : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              {sec}
            </button>
          ))}
        </div>
      </div>

      {/* Roster Roll Call List */}
      <div className="space-y-2">
        {filteredAttendees.map((musician) => {
          const currentRecord = checkins[musician.uid];
          const status = currentRecord?.status;
          const isCurrentUser = musician.uid === currentUid;

          return (
            <div
              key={musician.uid}
              className={`border rounded-xl p-3 flex items-center justify-between gap-3 transition ${
                isCurrentUser ? "ring-1 ring-yellow-400/30 " : ""
              }${
                status === "checked_in"
                  ? "border-emerald-500/40 bg-slate-900/90"
                  : status === "late"
                  ? "border-amber-500/40 bg-slate-900/90"
                  : status === "no_show"
                  ? "border-rose-500/40 bg-slate-900/70 opacity-75"
                  : isCurrentUser
                  ? "border-yellow-400/40 bg-slate-900"
                  : "border-slate-800 bg-slate-900"
              }`}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white text-xs sm:text-sm truncate">
                    {musician.displayName}
                  </span>
                  {isCurrentUser && (
                    <span className="text-[9px] font-mono font-bold text-yellow-400 bg-yellow-400/20 px-1.5 py-0.5 rounded border border-yellow-400/40">
                      YOU
                    </span>
                  )}
                  {musician.isSub && (
                    <span className="text-[9px] font-mono font-bold text-yellow-400 bg-yellow-400/10 px-1.5 py-0.5 rounded border border-yellow-400/30">
                      SUB
                    </span>
                  )}
                </div>

                <div className="text-[11px] font-mono text-slate-400 flex items-center gap-2 mt-0.5">
                  {/* Inline Section Selector */}
                  <select
                    value={musician.section}
                    onChange={(e) =>
                      handleUpdateUserSection(musician.uid, e.target.value, Boolean(musician.isSub))
                    }
                    className="bg-slate-950 border border-slate-800 rounded px-1.5 py-0.5 text-[10px] text-yellow-400 focus:outline-none focus:border-yellow-400 cursor-pointer"
                  >
                    <option value="General">General</option>
                    <option value="Trumpet">Trumpet</option>
                    <option value="Trombone">Trombone</option>
                    <option value="Saxophone">Saxophone</option>
                    <option value="Sousaphone">Sousaphone</option>
                    <option value="Percussion">Percussion</option>
                  </select>

                  {currentRecord?.checkInTime && (
                    <>
                      <span>•</span>
                      <span className="text-emerald-400">{currentRecord.checkInTime}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() =>
                    handleSetStatus(
                      musician.uid,
                      musician.displayName,
                      musician.section,
                      "checked_in",
                      Boolean(musician.isSub)
                    )
                  }
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                    status === "checked_in"
                      ? "bg-emerald-500 text-slate-950 shadow"
                      : "bg-slate-950 text-slate-400 hover:text-emerald-400 border border-slate-800"
                  }`}
                  title="Mark Present"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Here</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    handleSetStatus(
                      musician.uid,
                      musician.displayName,
                      musician.section,
                      "late",
                      Boolean(musician.isSub)
                    )
                  }
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                    status === "late"
                      ? "bg-amber-400 text-slate-950 shadow"
                      : "bg-slate-950 text-slate-400 hover:text-amber-400 border border-slate-800"
                  }`}
                  title="Mark Late"
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Late</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    handleSetStatus(
                      musician.uid,
                      musician.displayName,
                      musician.section,
                      "no_show",
                      Boolean(musician.isSub)
                    )
                  }
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                    status === "no_show"
                      ? "bg-rose-500 text-white shadow"
                      : "bg-slate-950 text-slate-400 hover:text-rose-400 border border-slate-800"
                  }`}
                  title="Mark Absent"
                >
                  <UserMinus className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Out</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}