"use client";

import React, { useEffect, useState, useMemo } from "react";
import { 
  collection, 
  onSnapshot, 
  setDoc, 
  doc 
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/lib/context/AuthContext";
import { canManageGigs } from "@/lib/auth/permissions";
import { User } from "@/lib/schema/user";
import { 
  DollarSign, 
  Calendar, 
  Users, 
  PieChart, 
  Save, 
  Check, 
  Loader2, 
  ShieldAlert, 
  Receipt,
  Wallet,
  Coins
} from "lucide-react";

interface GigSummary {
  id: string;
  title: string;
  date: string;
}

interface MusicianRsvp {
  uid: string;
  displayName: string;
  status: string;
}

type PaidStatus = "unpaid" | "cash" | "venmo" | "check";

interface MusicianDistribution {
  uid: string;
  name: string;
  amount: number;
  paidStatus: PaidStatus;
  paidAt?: string;
}

interface GigLedgerDoc {
  gigId: string;
  payoutGross: number;
  tipsGross: number;
  expensesTotal: number;
  bandFundCut: number;
  netMusicianPool: number;
  perMusicianPayout: number;
  distributions: MusicianDistribution[];
  updatedAt: string;
}

export default function FinancialLedgerPage() {
  const { profile, loading: authLoading } = useAuth();
  const [gigs, setGigs] = useState<GigSummary[]>([]);
  const [selectedGigId, setSelectedGigId] = useState<string>("");
  const [rsvps, setRsvps] = useState<MusicianRsvp[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Financial Ledger Form State
  const [payoutGross, setPayoutGross] = useState<number>(600);
  const [tipsGross, setTipsGross] = useState<number>(150);
  const [expensesTotal, setExpensesTotal] = useState<number>(50);
  const [bandFundPercent, setBandFundPercent] = useState<number>(10);

  // Track only user-toggled payment statuses keyed by UID
  const [payoutStatuses, setPayoutStatuses] = useState<Record<string, { paidStatus: PaidStatus; paidAt?: string }>>({});

  // 1. Fetch Gigs
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
        console.error("Error loading gigs for ledger:", err);
        setLoading(false);
      }
    );

    return () => unsubGigs();
  }, [authLoading, selectedGigId]);

  // 2. Listen to RSVPs for the selected gig
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
            displayName: data.displayName || data.name || "Band Member",
            status: data.status || "attending",
          });
        });
        setRsvps(rList);
      },
      (err) => console.warn("Notice: gig rsvps error:", err)
    );

    return () => unsubRsvps();
  }, [selectedGigId]);

  // 3. Listen to Existing Ledger for this gig
  useEffect(() => {
    if (!selectedGigId) return;

    const unsubLedger = onSnapshot(
      doc(db, "gig_ledgers", selectedGigId),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as GigLedgerDoc;
          setPayoutGross(data.payoutGross ?? 600);
          setTipsGross(data.tipsGross ?? 0);
          setExpensesTotal(data.expensesTotal ?? 0);

          const statusMap: Record<string, { paidStatus: PaidStatus; paidAt?: string }> = {};
          if (Array.isArray(data.distributions)) {
            data.distributions.forEach((item) => {
              statusMap[item.uid] = {
                paidStatus: item.paidStatus || "unpaid",
                paidAt: item.paidAt,
              };
            });
          }
          setPayoutStatuses(statusMap);
        } else {
          setPayoutGross(600);
          setTipsGross(120);
          setExpensesTotal(0);
          setPayoutStatuses({});
        }
      },
      (err) => console.warn("Ledger record fetch note:", err)
    );

    return () => unsubLedger();
  }, [selectedGigId]);

  // Derived Attendees (status === "attending")
  const attendingMusicians = useMemo(() => {
    return rsvps.filter((r) => r.status === "attending");
  }, [rsvps]);

  // Pure Math Calculations
  const grossTotal = Math.max(0, payoutGross + tipsGross);
  const netAfterExpenses = Math.max(0, grossTotal - expensesTotal);
  const bandCutAmount = Math.round((netAfterExpenses * bandFundPercent) / 100);
  const netPool = Math.max(0, netAfterExpenses - bandCutAmount);
  const headcount = attendingMusicians.length > 0 ? attendingMusicians.length : 1;
  const calculatedPerHead = attendingMusicians.length > 0 ? Math.floor(netPool / headcount) : 0;

  // Derive final distributions without any useEffect or state synchronization
  const activeDistributions = useMemo(() => {
    return attendingMusicians.map((musician) => {
      const saved = payoutStatuses[musician.uid];
      return {
        uid: musician.uid,
        name: musician.displayName,
        amount: calculatedPerHead,
        paidStatus: saved?.paidStatus || ("unpaid" as PaidStatus),
        paidAt: saved?.paidAt,
      };
    });
  }, [attendingMusicians, payoutStatuses, calculatedPerHead]);

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-400 gap-2 text-xs">
        <Loader2 className="w-4 h-4 animate-spin text-yellow-400" />
        Loading Financial Studio & Ledgers...
      </div>
    );
  }

  const userProfile = profile as unknown as User;
  if (!userProfile || !canManageGigs(userProfile)) {
    return (
      <div className="p-8 text-rose-400 text-xs font-semibold flex items-center gap-2">
        <ShieldAlert className="w-4 h-4" />
        Manager privileges required to access the financial ledger and musician payouts.
      </div>
    );
  }

  const handleStatusToggle = (uid: string, newStatus: PaidStatus) => {
    setPayoutStatuses((prev) => ({
      ...prev,
      [uid]: {
        paidStatus: newStatus,
        paidAt: newStatus !== "unpaid" ? new Date().toISOString() : undefined,
      },
    }));
  };

  const handleSaveLedger = async () => {
    if (!selectedGigId) return;
    setSaving(true);
    try {
      // Strip undefined fields so Firestore accepts the write
      const sanitizedDistributions = activeDistributions.map((d) => ({
        uid: d.uid,
        name: d.name,
        amount: d.amount,
        paidStatus: d.paidStatus,
        ...(d.paidAt ? { paidAt: d.paidAt } : {}),
      }));

      const payload: GigLedgerDoc = {
        gigId: selectedGigId,
        payoutGross: Number(payoutGross) || 0,
        tipsGross: Number(tipsGross) || 0,
        expensesTotal: Number(expensesTotal) || 0,
        bandFundCut: Number(bandCutAmount) || 0,
        netMusicianPool: Number(netPool) || 0,
        perMusicianPayout: Number(calculatedPerHead) || 0,
        distributions: sanitizedDistributions,
        updatedAt: new Date().toISOString(),
      };

      await setDoc(doc(db, "gig_ledgers", selectedGigId), payload, { merge: true });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    } catch (err) {
      alert("Failed to save ledger: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setSaving(false);
    }
  };

  const totalDistributedPaid = activeDistributions
    .filter((d) => d.paidStatus !== "unpaid")
    .reduce((acc, curr) => acc + curr.amount, 0);

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
              Treasurer & Payouts
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Financial Ledger</h1>
          <p className="text-xs text-slate-400">
            Audit performance fees, tip bucket splits, band fund cuts, and musician payout statuses.
          </p>
        </div>

        <button
          type="button"
          disabled={saving}
          onClick={handleSaveLedger}
          className="bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition shadow disabled:opacity-50 shrink-0"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : savedSuccess ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
          <span>{saving ? "Updating..." : savedSuccess ? "Ledger Saved!" : "Save Ledger"}</span>
        </button>
      </div>

      {/* Gig Picker Tabs */}
      <div className="space-y-2">
        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
          Target Gig Ledger
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

      {/* Financial Split Inputs & Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Performance Guarantee */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2 shadow">
          <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
            <DollarSign className="w-3.5 h-3.5 text-yellow-400" /> Performance Fee
          </span>
          <div className="flex items-center gap-1">
            <span className="text-xl font-bold text-slate-500">$</span>
            <input
              type="number"
              min="0"
              step="25"
              value={payoutGross}
              onChange={(e) => setPayoutGross(Number(e.target.value) || 0)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-lg font-black text-white w-full focus:outline-none focus:border-yellow-400"
            />
          </div>
        </div>

        {/* Tip Bucket */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2 shadow">
          <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
            <Coins className="w-3.5 h-3.5 text-emerald-400" /> Tip Bucket Gross
          </span>
          <div className="flex items-center gap-1">
            <span className="text-xl font-bold text-slate-500">$</span>
            <input
              type="number"
              min="0"
              step="5"
              value={tipsGross}
              onChange={(e) => setTipsGross(Number(e.target.value) || 0)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-lg font-black text-white w-full focus:outline-none focus:border-yellow-400"
            />
          </div>
        </div>

        {/* Expenses */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2 shadow">
          <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
            <Receipt className="w-3.5 h-3.5 text-rose-400" /> Gig Expenses
          </span>
          <div className="flex items-center gap-1">
            <span className="text-xl font-bold text-slate-500">$</span>
            <input
              type="number"
              min="0"
              step="10"
              value={expensesTotal}
              onChange={(e) => setExpensesTotal(Number(e.target.value) || 0)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-lg font-black text-white w-full focus:outline-none focus:border-yellow-400"
            />
          </div>
        </div>

        {/* Band Reserve Cut */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2 shadow">
          <div className="flex justify-between items-center text-[11px] font-semibold text-slate-400">
            <span className="flex items-center gap-1.5">
              <PieChart className="w-3.5 h-3.5 text-blue-400" /> Band Reserve
            </span>
            <span className="font-mono text-yellow-400 font-bold">{bandFundPercent}%</span>
          </div>
          <div className="flex items-center gap-2 pt-2">
            <input
              type="range"
              min="0"
              max="50"
              step="5"
              value={bandFundPercent}
              onChange={(e) => setBandFundPercent(Number(e.target.value))}
              className="w-full accent-yellow-400 cursor-pointer"
            />
          </div>
          <div className="text-[10px] font-mono text-slate-400 text-right">
            Retained: <strong className="text-white font-bold">${bandCutAmount}</strong>
          </div>
        </div>
      </div>

      {/* Summary Banner */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="space-y-0.5 text-center sm:text-left">
          <span className="text-[11px] font-mono uppercase font-bold text-slate-500">
            Total Net Musician Pool
          </span>
          <div className="text-3xl font-black text-emerald-400">${netPool}</div>
        </div>

        <div className="flex items-center gap-6 text-center sm:text-right">
          <div>
            <span className="text-[11px] font-mono uppercase text-slate-500 block">Attending Roster</span>
            <div className="text-xl font-extrabold text-white flex items-center gap-1.5 justify-center sm:justify-end">
              <Users className="w-4 h-4 text-yellow-400" /> {activeDistributions.length} Musicians
            </div>
          </div>

          <div className="border-l border-slate-800 pl-6">
            <span className="text-[11px] font-mono uppercase text-slate-500 block">Per-Musician Payout</span>
            <div className="text-2xl font-black text-yellow-400">
              ${calculatedPerHead} <span className="text-xs text-slate-500 font-normal">/ person</span>
            </div>
          </div>
        </div>
      </div>

      {/* Musician Distribution Roster */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <Wallet className="w-4 h-4 text-yellow-400" /> Roster Payout Distribution
          </h2>
          <span className="text-[11px] font-mono text-slate-400">
            Paid: <strong className="text-emerald-400">${totalDistributedPaid}</strong> of ${netPool}
          </span>
        </div>

        {activeDistributions.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-500 space-y-1">
            <p>No musicians marked as &ldquo;attending&rdquo; on this gig call sheet yet.</p>
            <p className="text-[11px] text-slate-600">
              RSVPs from the gig call sheet automatically populate here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/60">
            {activeDistributions.map((m, idx) => (
              <div
                key={m.uid}
                className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-slate-950 border border-slate-800 text-slate-400 text-[10px] font-mono font-bold flex items-center justify-center">
                    {idx + 1}
                  </span>
                  <div>
                    <div className="font-bold text-white">{m.name}</div>
                    <div className="text-[10px] font-mono text-yellow-400 font-semibold">
                      Calculated Payout: ${m.amount}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 self-end sm:self-auto">
                  {(["unpaid", "venmo", "cash", "check"] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => handleStatusToggle(m.uid, st)}
                      className={`text-[11px] font-bold px-2.5 py-1 rounded-lg capitalize transition border ${
                        m.paidStatus === st
                          ? st === "unpaid"
                            ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
                            : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                          : "bg-slate-950 text-slate-500 border-slate-800 hover:text-slate-300"
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}