"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { 
  collection, 
  query,
  orderBy,
  onSnapshot, 
  setDoc, 
  deleteDoc, 
  doc,
  getDocs,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/lib/context/AuthContext";
import { BlackoutDateSchema, BlackoutDate } from "@/lib/schema/blackout";
import { toast } from "@/lib/context/ToastContext";
import ConfirmDialog from "@/components/portal/ConfirmDialog";
import { dispatchPortalInteraction } from "@/lib/metrics/usageTracker";
import PortalBreadcrumb from "@/components/portal/PortalBreadcrumb";
import { 
  CalendarOff, 
  Plus, 
  Trash2, 
  ArrowLeft, 
  Loader2, 
  Check, 
  Calendar as CalendarIcon,
  Clock,
  AlertTriangle,
  MapPin,
  ChevronLeft,
  ChevronRight,
  List,
  Palmtree,
  PlayCircle,
  PauseCircle,
  CheckCircle2,
} from "lucide-react";
import DateRangePicker from "@/components/ui/DateRangePicker";

interface ScheduledGig {
  id: string;
  date: string;
  status: string;
  title: string;
  venue: string;
}

export default function MusicianAvailabilityPage() {
  const { firebaseUser, profile, loading: authLoading } = useAuth();
  const [blackouts, setBlackouts] = useState<BlackoutDate[]>([]);
  const [gigs, setGigs] = useState<ScheduledGig[]>([]);
  const [userRsvps, setUserRsvps] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  
  // Calendar navigation state
  const [currentMonthDate, setCurrentMonthDate] = useState<Date>(() => new Date());

  // Confirm delete dialog state
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [formData, setFormData] = useState({
    startDate: "",
    endDate: "",
    reason: "",
  });

  const [togglingHiatus, setTogglingHiatus] = useState(false);
  const isOnHiatus = Boolean(profile?.onHiatus || profile?.status === "hiatus");

  const handleToggleHiatus = async () => {
    if (!firebaseUser) return;
    setTogglingHiatus(true);
    const nextVal = !isOnHiatus;
    try {
      await updateDoc(doc(db, "users", firebaseUser.uid), {
        onHiatus: nextVal,
        status: nextVal ? "hiatus" : "active",
        updatedAt: new Date().toISOString(),
      });
      dispatchPortalInteraction(
        "toggle_hiatus",
        nextVal ? "Member entered hiatus mode" : "Member resumed active status",
        { onHiatus: nextVal }
      );
      toast.success(
        nextVal
          ? "🌴 Hiatus mode enabled. You will not receive gig dispatch emails."
          : "⚡ Welcome back! Active member status restored. You will now receive gig dispatches."
      );
    } catch (err) {
      toast.error("Failed to update status: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setTogglingHiatus(false);
    }
  };

  // 1. Subscribe to user's blackout dates
  useEffect(() => {
    if (authLoading || !firebaseUser) return;

    const unsub = onSnapshot(
      collection(db, "users", firebaseUser.uid, "blackouts"),
      (snap) => {
        const list: BlackoutDate[] = [];
        snap.forEach((d) => {
          const parsed = BlackoutDateSchema.safeParse({ id: d.id, ...d.data() });
          if (parsed.success) {
            list.push(parsed.data);
          } else {
            const data = d.data();
            list.push({
              id: d.id,
              uid: firebaseUser.uid,
              userName: data.userName || "Musician",
              startDate: data.startDate || "",
              endDate: data.endDate || data.startDate || "",
              reason: data.reason || "",
              createdAt: data.createdAt || "",
            });
          }
        });
        list.sort((a, b) => a.startDate.localeCompare(b.startDate));
        setBlackouts(list);
        setLoading(false);
      },
      (err) => {
        console.error("Error loading blackouts:", err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [authLoading, firebaseUser]);

  // 2. Subscribe to scheduled band gigs
  useEffect(() => {
    const q = query(collection(db, "gigs"), orderBy("date", "asc"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const gigList: ScheduledGig[] = [];
        snap.forEach((d) => {
          const raw = d.data();
          gigList.push({
            id: d.id,
            date: raw.date || "",
            status: raw.status || "confirmed",
            title: raw.internalLogistics?.title || raw.publicDetails?.title || "Eagleburger Gig",
            venue: raw.publicDetails?.venue || raw.internalLogistics?.unloadingAddress || "TBD",
          });
        });
        setGigs(gigList);
      },
      (err) => console.warn("Notice: gigs subscriber note on availability:", err)
    );

    return () => unsub();
  }, []);

  // 3. Fetch user's RSVPs for scheduled gigs
  useEffect(() => {
    if (!firebaseUser || gigs.length === 0) return;

    const fetchRsvps = async () => {
      const map: Record<string, string> = {};
      for (const gig of gigs) {
        try {
          const rsvpDocSnap = await getDocs(collection(db, "gigs", gig.id, "rsvps"));
          rsvpDocSnap.forEach((docSnap) => {
            if (docSnap.id === firebaseUser.uid) {
              map[gig.id] = (docSnap.data().status as string) || "tentative";
            }
          });
        } catch (err) {
          console.error("Error fetching user rsvp for gig", gig.id, err);
        }
      }
      setUserRsvps(map);
    };

    fetchRsvps();
  }, [firebaseUser, gigs]);

  // Conflict calculation for form inputs
  const formConflicts = useMemo(() => {
    if (!formData.startDate) return [];
    const start = formData.startDate;
    const end = formData.endDate || formData.startDate;
    return gigs.filter(
      (g) => g.status !== "cancelled" && g.date >= start && g.date <= end
    );
  }, [formData.startDate, formData.endDate, gigs]);

  // Conflict calculation for existing blackouts
  const getBlackoutConflicts = (bo: BlackoutDate) => {
    const start = bo.startDate;
    const end = bo.endDate || bo.startDate;
    return gigs.filter(
      (g) => g.status !== "cancelled" && g.date >= start && g.date <= end
    );
  };

  const handleCreateBlackout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser || !formData.startDate) return;

    setSaving(true);
    try {
      const blackoutId = `bo_${Date.now()}`;
      const payload = {
        id: blackoutId,
        uid: firebaseUser.uid,
        userName: profile?.displayName || firebaseUser.displayName || "Musician",
        startDate: formData.startDate,
        endDate: formData.endDate || formData.startDate,
        reason: formData.reason.trim(),
        createdAt: new Date().toISOString(),
      };

      const validated = BlackoutDateSchema.parse(payload);
      await setDoc(doc(db, "users", firebaseUser.uid, "blackouts", blackoutId), validated);
      dispatchPortalInteraction("add_blackout", `Added blackout date ${formData.startDate}`, { startDate: formData.startDate, endDate: formData.endDate });
      
      if (formConflicts.length > 0) {
        toast.info(
          `Blackout period added. Note: You have ${formConflicts.length} conflicting gig(s) in this window.`
        );
      } else {
        toast.success("Blackout period added.");
      }

      setIsAdding(false);
      setFormData({ startDate: "", endDate: "", reason: "" });
    } catch (err) {
      toast.error("Failed to save blackout: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setSaving(false);
    }
  };

  const executeDelete = async () => {
    if (!firebaseUser || !deleteTargetId) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, "users", firebaseUser.uid, "blackouts", deleteTargetId));
      dispatchPortalInteraction("delete_blackout", `Removed blackout date`, { blackoutId: deleteTargetId });
      toast.success("Blackout period removed.");
      setDeleteTargetId(null);
    } catch (err) {
      toast.error("Failed to delete blackout: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsDeleting(false);
    }
  };

  // Calendar calculations
  const calendarDays = useMemo(() => {
    const year = currentMonthDate.getFullYear();
    const month = currentMonthDate.getMonth();
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days: { dateStr: string; dayNum: number; isCurrentMonth: boolean }[] = [];

    // Preceding month padding
    const prevMonthDays = new Date(year, month, 0).getDate();
    for (let i = firstDayOfMonth - 1; i >= 0; i--) {
      const d = prevMonthDays - i;
      const mStr = String(month).padStart(2, "0"); // month is 0-indexed so previous month index is month
      const dStr = String(d).padStart(2, "0");
      days.push({
        dateStr: `${month === 0 ? year - 1 : year}-${mStr === "00" ? "12" : mStr}-${dStr}`,
        dayNum: d,
        isCurrentMonth: false,
      });
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const mStr = String(month + 1).padStart(2, "0");
      const dStr = String(d).padStart(2, "0");
      days.push({
        dateStr: `${year}-${mStr}-${dStr}`,
        dayNum: d,
        isCurrentMonth: true,
      });
    }

    // Trailing padding to make multiple of 7
    const remaining = (7 - (days.length % 7)) % 7;
    for (let d = 1; d <= remaining; d++) {
      const nextMonth = month + 2;
      const nextYear = nextMonth > 12 ? year + 1 : year;
      const mStr = String(nextMonth > 12 ? 1 : nextMonth).padStart(2, "0");
      const dStr = String(d).padStart(2, "0");
      days.push({
        dateStr: `${nextYear}-${mStr}-${dStr}`,
        dayNum: d,
        isCurrentMonth: false,
      });
    }

    return days;
  }, [currentMonthDate]);

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-400 gap-2 text-xs">
        <Loader2 className="w-4 h-4 animate-spin text-yellow-400" />
        Loading your availability profile...
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-xl">
        <div className="space-y-1">
          <PortalBreadcrumb className="mb-2" />
          <div className="flex items-center gap-2">
            <Link
              href="/portal"
              className="p-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:text-white transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
            </Link>
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-yellow-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
              Musician Availability
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-white">Blackout Dates &amp; Conflict Engine</h1>
          <p className="text-xs text-slate-400">
            Keep section leaders informed when you are out of town. Automatic detection alerts you if blackouts clash with scheduled gigs.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
          {/* View Mode Toggle */}
          <div className="bg-slate-950 border border-slate-800 p-1 rounded-xl flex items-center gap-1">
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                viewMode === "list"
                  ? "bg-yellow-400 text-slate-950 shadow"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>List</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("calendar")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                viewMode === "calendar"
                  ? "bg-yellow-400 text-slate-950 shadow"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <CalendarIcon className="w-3.5 h-3.5" />
              <span>Calendar</span>
            </button>
          </div>

          {!isAdding && (
            <button
              type="button"
              onClick={() => setIsAdding(true)}
              className="bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition shadow shrink-0"
            >
              <Plus className="w-4 h-4" /> Add Blackout
            </button>
          )}
        </div>
      </div>

      {/* Musician Hiatus Mode Banner */}
      <div
        className={`rounded-2xl p-5 border transition shadow-lg ${
          isOnHiatus
            ? "bg-amber-950/30 border-amber-500/40 text-amber-200"
            : "bg-slate-900 border-slate-800 text-slate-300"
        }`}
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <div
              className={`p-2.5 rounded-xl border shrink-0 ${
                isOnHiatus
                  ? "bg-amber-500/20 border-amber-500/30 text-amber-400"
                  : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
              }`}
            >
              {isOnHiatus ? <Palmtree className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
            </div>
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono uppercase tracking-wider font-bold">
                  Member Dispatch Status:
                </span>
                <span
                  className={`text-[11px] font-bold font-mono px-2 py-0.5 rounded border uppercase ${
                    isOnHiatus
                      ? "bg-amber-500/20 border-amber-500/40 text-amber-300"
                      : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                  }`}
                >
                  {isOnHiatus ? "🌴 On Hiatus (Muted)" : "⚡ Active Musician"}
                </span>
              </div>
              <p className="text-xs leading-relaxed text-slate-400">
                {isOnHiatus
                  ? "You are currently on Hiatus. You will receive ZERO gig availability requests, confirmations, or call sheet dispatches. You can resume active duty whenever you are ready."
                  : "You are currently an active performer receiving all gig announcements, availability roll calls, and confirmed call sheets. If you need temporary time away, enable hiatus mode."}
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={togglingHiatus}
            onClick={handleToggleHiatus}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 cursor-pointer disabled:opacity-50 ${
              isOnHiatus
                ? "bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold shadow-lg shadow-emerald-500/20"
                : "bg-slate-800 hover:bg-amber-500/20 hover:text-amber-300 hover:border-amber-500/30 text-slate-300 border border-slate-700"
            }`}
          >
            {togglingHiatus ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : isOnHiatus ? (
              <>
                <PlayCircle className="w-4 h-4" />
                <span>Resume Active Status</span>
              </>
            ) : (
              <>
                <Palmtree className="w-4 h-4 text-amber-400" />
                <span>Go On Hiatus</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Add Blackout Form with Live Conflict Warning */}
      {isAdding && (
        <form
          onSubmit={handleCreateBlackout}
          className="bg-slate-900 border border-yellow-400/30 rounded-2xl p-5 space-y-4 shadow-2xl animate-fadeIn"
        >
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <CalendarOff className="w-4 h-4 text-yellow-400" /> Declare Blackout Range
            </h2>
            <button
              type="button"
              onClick={() => {
                setIsAdding(false);
                setFormData({ startDate: "", endDate: "", reason: "" });
              }}
              className="text-slate-400 hover:text-white text-xs"
            >
              Cancel
            </button>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-300 block mb-1">
              Blackout Date Range *
            </label>
            <DateRangePicker
              startDate={formData.startDate}
              endDate={formData.endDate}
              onChange={({ startDate, endDate }) =>
                setFormData({ ...formData, startDate, endDate })
              }
              placeholder="Select date range or single day..."
            />
          </div>

          {/* Live Conflict Warning Box */}
          {formConflicts.length > 0 && (
            <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-4 space-y-2 text-rose-200 animate-fadeIn">
              <div className="flex items-center gap-2 text-xs font-bold text-rose-300">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>
                  Gig Conflict Detected: You have {formConflicts.length} scheduled band{" "}
                  {formConflicts.length === 1 ? "performance" : "performances"} in this window!
                </span>
              </div>
              <p className="text-[11px] text-rose-200/80">
                Declaring this blackout will flag an absence for section leaders on the roster.
              </p>
              <div className="space-y-1.5 pt-1">
                {formConflicts.map((gig) => {
                  const rsvp = userRsvps[gig.id];
                  return (
                    <div
                      key={gig.id}
                      className="bg-slate-950/70 border border-rose-500/20 rounded-lg p-2 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-bold text-white flex items-center gap-2">
                          <span>{gig.title}</span>
                          <span className="text-[10px] font-mono text-yellow-400">{gig.date}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-slate-500" />
                          <span>{gig.venue}</span>
                        </div>
                      </div>
                      <div className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-white/5 border border-white/10">
                        {rsvp === "attending" ? (
                          <span className="text-emerald-400">Attending</span>
                        ) : rsvp === "declined" ? (
                          <span className="text-rose-400">Declined</span>
                        ) : (
                          <span className="text-amber-400">No RSVP</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div>
            <label className="text-[11px] font-semibold text-slate-300 block mb-1">
              Reason / Note (optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Out of town, wedding gig, family travel"
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => {
                setIsAdding(false);
                setFormData({ startDate: "", endDate: "", reason: "" });
              }}
              className="px-3 py-1.5 text-xs text-slate-400 hover:text-white transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className={`font-bold px-4 py-1.5 rounded-lg text-xs flex items-center gap-1 transition disabled:opacity-50 ${
                formConflicts.length > 0
                  ? "bg-rose-500 hover:bg-rose-600 text-white"
                  : "bg-yellow-400 hover:bg-yellow-300 text-slate-950"
              }`}
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              <span>{formConflicts.length > 0 ? "Save with Conflict" : "Save Blackout"}</span>
            </button>
          </div>
        </form>
      )}

      {/* Mode 1: Calendar Grid View */}
      {viewMode === "calendar" && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4 shadow-xl">
          {/* Calendar Header with Navigation */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-yellow-400" />
                <span>
                  {currentMonthDate.toLocaleString("default", { month: "long", year: "numeric" })}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Click any date to prefill a blackout range or inspect conflicts.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  setCurrentMonthDate(
                    new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() - 1, 1)
                  )
                }
                className="p-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-400 hover:text-white transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setCurrentMonthDate(new Date())}
                className="px-2.5 py-1 text-xs font-bold text-slate-300 hover:text-white bg-slate-950 border border-slate-800 rounded-lg transition"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() =>
                  setCurrentMonthDate(
                    new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() + 1, 1)
                  )
                }
                className="p-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-400 hover:text-white transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Color Legend */}
          <div className="flex flex-wrap items-center gap-3 text-xs bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-slate-300">
            <span className="text-[11px] font-mono uppercase font-bold text-slate-500">Legend:</span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-400" /> Band Gig
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" /> Confirmed Attending
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-400" /> Blackout Date
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 ring-2 ring-rose-500" /> Gig Conflict
            </span>
          </div>

          {/* Day of Week Headers */}
          <div className="grid grid-cols-7 gap-1 text-center font-mono text-[11px] font-bold text-slate-400 pb-1">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div key={day} className="py-1">
                {day}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
            {calendarDays.map((day, idx) => {
              const dayGigs = gigs.filter((g) => g.date === day.dateStr && g.status !== "cancelled");
              const dayBlackouts = blackouts.filter(
                (bo) =>
                  day.dateStr >= bo.startDate &&
                  day.dateStr <= (bo.endDate || bo.startDate)
              );
              const hasGig = dayGigs.length > 0;
              const hasBlackout = dayBlackouts.length > 0;
              const hasConflict = hasGig && hasBlackout;

              let cellStyle = "bg-slate-950 border-slate-800/80 text-slate-300";
              if (hasConflict) {
                cellStyle = "bg-rose-500/20 border-rose-500/60 text-rose-200 ring-1 ring-rose-500/40";
              } else if (hasBlackout) {
                cellStyle = "bg-rose-500/10 border-rose-500/30 text-rose-300";
              } else if (hasGig) {
                const isAttending = dayGigs.some((g) => userRsvps[g.id] === "attending" || userRsvps[g.id] === "probable");
                cellStyle = isAttending
                  ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-200"
                  : "bg-yellow-400/15 border-yellow-400/40 text-yellow-200";
              }

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setFormData({
                      startDate: day.dateStr,
                      endDate: day.dateStr,
                      reason: "",
                    });
                    setIsAdding(true);
                  }}
                  className={`min-h-[70px] sm:min-h-[85px] p-1.5 sm:p-2 rounded-xl border text-left flex flex-col justify-between transition hover:border-yellow-400/60 hover:brightness-110 cursor-pointer ${cellStyle} ${
                    !day.isCurrentMonth ? "opacity-35" : ""
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold">{day.dayNum}</span>
                    {hasConflict && (
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
                    )}
                  </div>

                  <div className="space-y-1">
                    {dayGigs.map((g) => (
                      <div
                        key={g.id}
                        className="text-[9px] font-bold truncate rounded px-1 py-0.5 bg-black/40 border border-white/10"
                        title={`${g.title} at ${g.venue}`}
                      >
                        🎺 {g.title}
                      </div>
                    ))}
                    {dayBlackouts.map((bo) => (
                      <div
                        key={bo.id}
                        className="text-[9px] font-bold truncate rounded px-1 py-0.5 bg-rose-500/30 text-rose-200 border border-rose-500/40"
                        title={bo.reason || "Blackout date"}
                      >
                        ⛔ {bo.reason || "Unavailable"}
                      </div>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Mode 2: List View (Scheduled Blackouts) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <Clock className="w-3.5 h-3.5" /> Scheduled Unavailable Dates ({blackouts.length})
          </h2>
          {blackouts.length > 0 && (
            <span className="text-[11px] text-slate-500">
              {blackouts.filter((b) => getBlackoutConflicts(b).length > 0).length} conflicting window(s)
            </span>
          )}
        </div>

        {blackouts.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-2 text-slate-400">
            <CalendarIcon className="w-8 h-8 mx-auto text-slate-600" />
            <p className="text-xs font-semibold">No blackout dates on your calendar.</p>
            <p className="text-[11px] text-slate-500">
              You are currently marked as available for upcoming performance calls.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {blackouts.map((bo) => {
              const conflicts = getBlackoutConflicts(bo);
              const hasConflict = conflicts.length > 0;

              return (
                <div
                  key={bo.id}
                  className={`bg-slate-900 border rounded-xl p-4 flex flex-col justify-between space-y-3 shadow transition ${
                    hasConflict
                      ? "border-rose-500/40 hover:border-rose-500/60"
                      : "border-slate-800 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="text-xs font-mono font-bold text-yellow-400 flex items-center gap-1.5">
                        <CalendarOff className="w-3.5 h-3.5 text-rose-400" />
                        <span>
                          {bo.startDate}
                          {bo.endDate && bo.endDate !== bo.startDate && ` → ${bo.endDate}`}
                        </span>
                      </div>
                      {bo.reason && (
                        <div className="text-xs text-slate-300 font-semibold">{bo.reason}</div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => setDeleteTargetId(bo.id)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-950 transition border border-transparent hover:border-slate-800 shrink-0"
                      title="Remove blackout"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Conflict Notice if any scheduled gig overlaps */}
                  {hasConflict && (
                    <div className="pt-2 border-t border-rose-500/20 text-rose-300 text-[11px] space-y-1">
                      <div className="font-bold flex items-center gap-1 text-rose-400">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Conflicts with {conflicts.length} Gig(s):</span>
                      </div>
                      {conflicts.map((g) => (
                        <div key={g.id} className="text-slate-300 pl-4">
                          • <strong className="text-white">{g.title}</strong> on {g.date} ({g.venue})
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Confirm Delete Dialog (replaces raw confirm()) */}
      <ConfirmDialog
        isOpen={Boolean(deleteTargetId)}
        title="Remove Blackout Period?"
        description="Are you sure you want to remove this blackout window? Your availability status for upcoming performances during this date range will revert to open."
        confirmLabel="Remove Blackout"
        confirmVariant="danger"
        loading={isDeleting}
        onConfirm={executeDelete}
        onCancel={() => setDeleteTargetId(null)}
      />
    </div>
  );
}