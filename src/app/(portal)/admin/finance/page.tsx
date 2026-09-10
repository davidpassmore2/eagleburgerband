"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  deleteDoc,
  query,
  orderBy,
  getDoc,
  getDocs,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/lib/context/AuthContext";
import { canManageFinances } from "@/lib/auth/permissions";
import { User } from "@/lib/schema/user";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  PlusCircle,
  Receipt,
  UtensilsCrossed,
  Truck,
  Wrench,
  Music,
  Briefcase,
  Layers,
  Calendar,
  Loader2,
  ShieldAlert,
  Trash2,
  Sliders,
  CheckCircle2,
  Coins,
  Building,
  Users,
  Percent,
  X,
  Split,
} from "lucide-react";

export type TransactionType = "income" | "expense" | "payout";

export type ExpenseCategory =
  | "food_beverage"
  | "travel_fuel"
  | "gear_repairs"
  | "rehearsal_space"
  | "merchandise"
  | "admin_software"
  | "other";

export type IncomeCategory =
  | "gig_fee"
  | "merch_sales"
  | "tips_donations"
  | "sponsorship"
  | "other";

export interface TransactionRecord {
  id: string;
  type: TransactionType;
  category: ExpenseCategory | IncomeCategory | "musician_payout";
  amount: number;
  description: string;
  date: string;
  gigId?: string | null;
  gigTitle?: string | null;
  recordedBy: string;
  notes?: string | null;
  createdAt: string;
}

export interface TreasuryConfig {
  startingBalance: number;
  startingDate: string;
  lastUpdated?: string;
}

interface GigSummary {
  id: string;
  title: string;
  date: string;
  guarantee?: number;
  isSettled?: boolean;
}

interface MusicianCheckIn {
  userId: string;
  name: string;
  section: string;
  instrument?: string;
  includedInPayout: boolean;
}

interface RosterMemberRecord {
  status?: string;
  displayName?: string;
  name?: string;
  section?: string;
  instrument?: string;
}

type DisbursementModel = "band_fund" | "equal_split" | "hybrid";

const EXPENSE_CATEGORIES: { value: ExpenseCategory; label: string; icon: typeof UtensilsCrossed }[] = [
  { value: "food_beverage", label: "Band Lunch / Food & Drinks", icon: UtensilsCrossed },
  { value: "travel_fuel", label: "Travel, Gas & Parking", icon: Truck },
  { value: "gear_repairs", label: "Gear, Drums & Equipment Repairs", icon: Wrench },
  { value: "rehearsal_space", label: "Rehearsal Rental / Practice Space", icon: Music },
  { value: "merchandise", label: "Band Merch & Uniform Production", icon: Layers },
  { value: "admin_software", label: "Software & Web Admin Subscriptions", icon: Briefcase },
  { value: "other", label: "Other Operating Expense", icon: Receipt },
];

const INCOME_CATEGORIES: { value: IncomeCategory; label: string }[] = [
  { value: "gig_fee", label: "Gig Performance Guarantee / Deposit" },
  { value: "tips_donations", label: "Crowd Tips & Fan Donations" },
  { value: "merch_sales", label: "Merchandise & Physical Sales" },
  { value: "sponsorship", label: "Sponsorship & Grants" },
  { value: "other", label: "Other Inflow" },
];

export default function FinancialLedgerPage() {
  const { profile, loading: authLoading } = useAuth();

  const [treasuryConfig, setTreasuryConfig] = useState<TreasuryConfig>({
    startingBalance: 0,
    startingDate: new Date().toISOString().split("T")[0],
  });
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [gigs, setGigs] = useState<GigSummary[]>([]);
  const [loading, setLoading] = useState(true);

  // Baseline Modal
  const [showStartingBalanceModal, setShowStartingBalanceModal] = useState(false);
  const [tempStartingBalance, setTempStartingBalance] = useState<number>(0);
  const [tempStartingDate, setTempStartingDate] = useState("");

  // Record Transaction Form
  const [isAddingTransaction, setIsAddingTransaction] = useState(false);
  const [txType, setTxType] = useState<"expense" | "income">("expense");
  const [txAmount, setTxAmount] = useState<string>("0.00");
  const [txCategory, setTxCategory] = useState<string>("food_beverage");
  const [txDescription, setTxDescription] = useState("");
  const [txDate, setTxDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [txGigId, setTxGigId] = useState<string>("");
  const [txNotes, setTxNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Settlement Modal State
  const [settlementGig, setSettlementGig] = useState<GigSummary | null>(null);
  const [settlementAttendees, setSettlementAttendees] = useState<MusicianCheckIn[]>([]);
  const [loadingAttendees, setLoadingAttendees] = useState(false);
  const [totalPool, setTotalPool] = useState<string>("0");
  const [disbursementModel, setDisbursementModel] = useState<DisbursementModel>("band_fund");
  const [hybridRetainedFee, setHybridRetainedFee] = useState<string>("50");
  const [settlementNotes, setSettlementNotes] = useState("");
  const [committingSettlement, setCommittingSettlement] = useState(false);

  // Filter
  const [filterType, setFilterType] = useState<"all" | "income" | "expense">("all");

  useEffect(() => {
    if (authLoading) return;

    const fetchConfig = async () => {
      try {
        const docRef = doc(db, "settings", "treasury");
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data() as TreasuryConfig;
          setTreasuryConfig(data);
          setTempStartingBalance(data.startingBalance || 0);
          setTempStartingDate(data.startingDate || new Date().toISOString().split("T")[0]);
        }
      } catch (err) {
        console.error("Failed fetching treasury settings:", err);
      }
    };

    fetchConfig();

    const qTx = query(collection(db, "transactions"), orderBy("date", "desc"));
    const unsubTx = onSnapshot(
      qTx,
      (snap) => {
        const list: TransactionRecord[] = [];
        snap.forEach((d) => {
          list.push({ id: d.id, ...d.data() } as TransactionRecord);
        });
        setTransactions(list);
        setLoading(false);
      },
      (err) => {
        console.error("Error loading transactions:", err);
        setLoading(false);
      }
    );

    const unsubGigs = onSnapshot(
      query(collection(db, "gigs"), orderBy("date", "desc")),
      (snap) => {
        const list: GigSummary[] = [];
        snap.forEach((d) => {
          const data = d.data();
          list.push({
            id: d.id,
            title: data.internalLogistics?.title || data.publicDetails?.title || "Gig",
            date: data.date || "",
            guarantee: data.internalLogistics?.compensation?.guarantee || 0,
            isSettled: data.isSettled || false,
          });
        });
        setGigs(list);
      }
    );

    return () => {
      unsubTx();
      unsubGigs();
    };
  }, [authLoading]);

  // Open Settlement Modal for selected gig
  const openSettlementModal = async (gig: GigSummary) => {
    setSettlementGig(gig);
    setTotalPool(String(gig.guarantee || 0));
    setDisbursementModel("band_fund");
    setSettlementNotes("");
    setLoadingAttendees(true);

    try {
      // Fetch kiosk check-ins first
      const checkInsRef = collection(db, "gigs", gig.id, "checkins");
      const checkInSnaps = await getDocs(checkInsRef);
      const attendees: MusicianCheckIn[] = [];

      checkInSnaps.forEach((d) => {
        const cData = d.data();
        attendees.push({
          userId: d.id,
          name: cData.displayName || cData.name || "Musician",
          section: cData.section || "Brass/Rhythm",
          instrument: cData.instrument || "",
          includedInPayout: true,
        });
      });

      // Fallback: Check gig roster confirmation if kiosk checkins are empty
      if (attendees.length === 0) {
        const gigDoc = await getDoc(doc(db, "gigs", gig.id));
        if (gigDoc.exists()) {
          const gData = gigDoc.data();
          if (gData.roster) {
            const rosterEntries = Object.entries(
              gData.roster as Record<string, RosterMemberRecord>
            );
            rosterEntries.forEach(([uid, rData]) => {
              if (rData.status === "confirmed" || rData.status === "present") {
                attendees.push({
                  userId: uid,
                  name: rData.displayName || rData.name || "Musician",
                  section: rData.section || "Band",
                  instrument: rData.instrument || "",
                  includedInPayout: true,
                });
              }
            });
          }
        }
      }

      setSettlementAttendees(attendees);
    } catch (err) {
      console.error("Failed to load attendees:", err);
    } finally {
      setLoadingAttendees(false);
    }
  };

  // Calculations
  const totalIncome = useMemo(() => {
    return transactions
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);
  }, [transactions]);

  const totalExpenses = useMemo(() => {
    return transactions
      .filter((t) => t.type === "expense" || t.type === "payout")
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);
  }, [transactions]);

  const currentTreasuryNet = useMemo(() => {
    return (treasuryConfig.startingBalance || 0) + totalIncome - totalExpenses;
  }, [treasuryConfig.startingBalance, totalIncome, totalExpenses]);

  const filteredTransactions = useMemo(() => {
    if (filterType === "all") return transactions;
    return transactions.filter((t) => t.type === filterType);
  }, [transactions, filterType]);

  const unsettledGigs = useMemo(() => {
    return gigs.filter((g) => !g.isSettled);
  }, [gigs]);

  // Modal Split Calculations
  const numericPool = Math.max(0, parseFloat(totalPool) || 0);
  const eligibleMusicians = settlementAttendees.filter((m) => m.includedInPayout);
  const eligibleCount = eligibleMusicians.length;

  const { bandTreasuryRetained, perMusicianPayout, distributedMusicianTotal } = useMemo(() => {
    if (disbursementModel === "band_fund") {
      return {
        bandTreasuryRetained: numericPool,
        perMusicianPayout: 0,
        distributedMusicianTotal: 0,
      };
    }

    if (disbursementModel === "equal_split") {
      if (eligibleCount === 0) {
        return {
          bandTreasuryRetained: numericPool,
          perMusicianPayout: 0,
          distributedMusicianTotal: 0,
        };
      }
      const rawCut = numericPool / eligibleCount;
      const cut = Math.floor(rawCut * 100) / 100;
      const totalCut = cut * eligibleCount;
      const remainder = Number((numericPool - totalCut).toFixed(2));
      return {
        bandTreasuryRetained: remainder,
        perMusicianPayout: cut,
        distributedMusicianTotal: totalCut,
      };
    }

    // Hybrid
    const retained = Math.min(numericPool, Math.max(0, parseFloat(hybridRetainedFee) || 0));
    const distributable = numericPool - retained;
    if (eligibleCount === 0) {
      return {
        bandTreasuryRetained: numericPool,
        perMusicianPayout: 0,
        distributedMusicianTotal: 0,
      };
    }
    const rawCut = distributable / eligibleCount;
    const cut = Math.floor(rawCut * 100) / 100;
    const totalCut = cut * eligibleCount;
    const finalRetained = Number((numericPool - totalCut).toFixed(2));
    return {
      bandTreasuryRetained: finalRetained,
      perMusicianPayout: cut,
      distributedMusicianTotal: totalCut,
    };
  }, [disbursementModel, numericPool, eligibleCount, hybridRetainedFee]);

  const toggleMusicianPayout = (userId: string) => {
    setSettlementAttendees((prev) =>
      prev.map((m) => (m.userId === userId ? { ...m, includedInPayout: !m.includedInPayout } : m))
    );
  };

  const handleSaveStartingBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const config: TreasuryConfig = {
        startingBalance: Number(tempStartingBalance) || 0,
        startingDate: tempStartingDate || new Date().toISOString().split("T")[0],
        lastUpdated: new Date().toISOString(),
      };
      await setDoc(doc(db, "settings", "treasury"), config, { merge: true });
      setTreasuryConfig(config);
      setShowStartingBalanceModal(false);
    } catch (err) {
      alert("Failed to save starting balance: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleCreateTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!txAmount || Number(txAmount) <= 0) {
      alert("Please provide a valid dollar amount");
      return;
    }
    if (!txDescription.trim()) {
      alert("Please provide a short description");
      return;
    }

    setSubmitting(true);
    try {
      const txId = `tx_${Date.now()}`;
      const selectedGig = gigs.find((g) => g.id === txGigId);

      const record: TransactionRecord = {
        id: txId,
        type: txType,
        category: txCategory as TransactionRecord["category"],
        amount: Number(parseFloat(txAmount).toFixed(2)),
        description: txDescription.trim(),
        date: txDate,
        gigId: txGigId || null,
        gigTitle: selectedGig ? selectedGig.title : null,
        recordedBy: profile?.displayName || "Admin",
        notes: txNotes.trim() ? txNotes.trim() : null,
        createdAt: new Date().toISOString(),
      };

      await setDoc(doc(db, "transactions", txId), record);

      setTxAmount("0.00");
      setTxDescription("");
      setTxNotes("");
      setTxGigId("");
      setIsAddingTransaction(false);
    } catch (err) {
      alert("Failed to record entry: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setSubmitting(false);
    }
  };

  const handleExecuteSettlement = async () => {
    if (!settlementGig) return;

    setCommittingSettlement(true);
    try {
      const batch = writeBatch(db);
      const timestamp = new Date().toISOString();
      const settlementDate = settlementGig.date || timestamp.split("T")[0];

      // 1. Write total inflow transaction to ledger
      const revenueTxId = `tx_gig_inflow_${settlementGig.id}_${Date.now()}`;
      batch.set(doc(db, "transactions", revenueTxId), {
        id: revenueTxId,
        type: "income",
        category: "gig_fee",
        amount: numericPool,
        description: `Revenue: ${settlementGig.title}`,
        date: settlementDate,
        gigId: settlementGig.id,
        gigTitle: settlementGig.title,
        recordedBy: profile?.displayName || "Admin",
        notes: `Total gig payout pool collected. Model: ${disbursementModel}. ${settlementNotes}`.trim(),
        createdAt: timestamp,
      });

      // 2. Write individual musician payout distributions if split
      if (perMusicianPayout > 0) {
        eligibleMusicians.forEach((musician) => {
          const payoutTxId = `tx_payout_${settlementGig.id}_${musician.userId}_${Date.now()}`;
          batch.set(doc(db, "transactions", payoutTxId), {
            id: payoutTxId,
            type: "payout",
            category: "musician_payout",
            amount: perMusicianPayout,
            description: `Musician Payout: ${musician.name}`,
            date: settlementDate,
            gigId: settlementGig.id,
            gigTitle: settlementGig.title,
            recordedBy: profile?.displayName || "Admin",
            notes: `Disbursed to ${musician.name} (${musician.section}) for ${settlementGig.title}`,
            createdAt: timestamp,
          });
        });
      }

      // 3. Mark Gig document as settled
      batch.set(
        doc(db, "gigs", settlementGig.id),
        {
          isSettled: true,
          settlementDetails: {
            settledAt: timestamp,
            settledBy: profile?.displayName || "Admin",
            totalPool: numericPool,
            disbursementModel,
            retainedTreasury: bandTreasuryRetained,
            perMusicianPayout,
            paidCount: eligibleCount,
            notes: settlementNotes || null,
          },
        },
        { merge: true }
      );

      await batch.commit();
      setSettlementGig(null);
    } catch (err) {
      alert("Failed to commit settlement: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setCommittingSettlement(false);
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    if (!confirm("Remove this transaction record from the ledger?")) return;
    try {
      await deleteDoc(doc(db, "transactions", id));
    } catch (err) {
      alert("Error deleting record: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-400 gap-2 text-xs">
        <Loader2 className="w-4 h-4 animate-spin text-yellow-400" />
        Auditing band treasury ledger...
      </div>
    );
  }

  const userProfile = profile as unknown as User;
  if (!userProfile || !canManageFinances(userProfile)) {
    return (
      <div className="p-8 text-rose-400 text-xs font-semibold flex items-center gap-2">
        <ShieldAlert className="w-4 h-4" />
        Treasurer or Admin credentials required to access the Financial Ledger.
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      {/* Top Header Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-yellow-400 bg-slate-950 px-2.5 py-0.5 rounded border border-slate-800">
              Stage 24 Treasury
            </span>
            <span className="text-xs font-mono text-slate-400">
              Active Fund: Eagleburger Band Operating Reserve
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
            Band Fund & Financial Ledger
          </h1>
          <p className="text-xs text-slate-400">
            Track retained gig revenue, baseline balances, food & lunch receipts, maintenance, and operating expenses.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <button
            type="button"
            onClick={() => setShowStartingBalanceModal(true)}
            className="flex-1 md:flex-initial bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition"
          >
            <Sliders className="w-3.5 h-3.5 text-yellow-400" />
            <span>Set Opening Balance</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setIsAddingTransaction(!isAddingTransaction);
              setTxType("expense");
              setTxCategory("food_beverage");
            }}
            className="flex-1 md:flex-initial bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 transition shadow-lg"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Record Transaction</span>
          </button>
        </div>
      </div>

      {/* Treasury Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-mono uppercase font-bold tracking-wider">Current Treasury</span>
            <Coins className="w-4 h-4 text-yellow-400" />
          </div>
          <div className={`text-2xl sm:text-3xl font-black ${currentTreasuryNet >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
            ${currentTreasuryNet.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] font-mono text-slate-500">
            Baseline (${(treasuryConfig.startingBalance || 0).toFixed(2)}) + Net Inflows
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-mono uppercase font-bold tracking-wider">Total Income</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white">
            ${totalIncome.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] font-mono text-emerald-400/80">
            Deposited into General Fund
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-mono uppercase font-bold tracking-wider">Total Expenses</span>
            <TrendingDown className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white">
            ${totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] font-mono text-rose-400/80">
            Operating Costs, Food & Repairs
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-mono uppercase font-bold tracking-wider">Opening Baseline</span>
            <DollarSign className="w-4 h-4 text-slate-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-300">
            ${(treasuryConfig.startingBalance || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] font-mono text-slate-500">
            Established: {treasuryConfig.startingDate || "Inception"}
          </div>
        </div>
      </div>

      {/* Gig Settlement Action Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-yellow-400/10 border border-yellow-400/30 text-yellow-400 flex items-center justify-center font-bold shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-white flex items-center gap-2">
              <span>Gig Closeout & Settlement</span>
              {unsettledGigs.length > 0 && (
                <span className="bg-yellow-400/20 text-yellow-400 text-[10px] px-2 py-0.5 rounded-full font-mono font-semibold">
                  {unsettledGigs.length} pending
                </span>
              )}
            </div>
            <div className="text-[11px] text-slate-400">
              Disburse fees to the Band Treasury, split cuts across checked-in musicians, or apply a hybrid model.
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            defaultValue=""
            onChange={(e) => {
              const selected = gigs.find((g) => g.id === e.target.value);
              if (selected) {
                openSettlementModal(selected);
                e.target.value = "";
              }
            }}
            className="w-full md:w-64 bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-yellow-400 transition"
          >
            <option value="" disabled>
              Select Gig to Settle...
            </option>
            {gigs.map((g) => (
              <option key={g.id} value={g.id}>
                {g.isSettled ? "✓ [Settled] " : "• "} {g.date} — {g.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Starting Balance Modal */}
      {showStartingBalanceModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveStartingBalance}
            className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl"
          >
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-yellow-400" /> Configure Starting Fund Baseline
              </h3>
              <p className="text-xs text-slate-400">
                Establish the historical band fund balance to calibrate the ledger calculation.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Starting Balance ($ USD)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs text-slate-500 font-mono">$</span>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={tempStartingBalance}
                    onChange={(e) => setTempStartingBalance(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-7 pr-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Baseline Date
                </label>
                <input
                  type="date"
                  required
                  value={tempStartingDate}
                  onChange={(e) => setTempStartingDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400 font-mono"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowStartingBalanceModal(false)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs transition shadow"
              >
                Save Baseline
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Gig Settlement Modal */}
      {settlementGig && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-5 sm:p-6 space-y-5 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <div className="text-[10px] font-mono uppercase font-bold text-yellow-400">
                  Gig Closeout & Settlement
                </div>
                <h3 className="text-lg font-black text-white">{settlementGig.title}</h3>
                <div className="text-xs text-slate-400 font-mono">{settlementGig.date}</div>
              </div>
              <button
                onClick={() => setSettlementGig(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Inflow Pool */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300 block">
                Total Collected Amount ($ USD)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs text-slate-500 font-mono">$</span>
                <input
                  type="number"
                  step="0.01"
                  value={totalPool}
                  onChange={(e) => setTotalPool(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-7 pr-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400 font-mono"
                />
              </div>
            </div>

            {/* Payout Model Selector */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 block">
                Disbursement Strategy
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <button
                  type="button"
                  onClick={() => setDisbursementModel("band_fund")}
                  className={`p-3 rounded-xl border text-left transition ${
                    disbursementModel === "band_fund"
                      ? "border-yellow-400 bg-yellow-400/10 text-white"
                      : "border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700"
                  }`}
                >
                  <Building className="w-4 h-4 text-yellow-400 mb-1" />
                  <div className="text-xs font-bold text-white">100% Band Fund</div>
                  <div className="text-[10px] text-slate-400">Retain all in treasury</div>
                </button>

                <button
                  type="button"
                  onClick={() => setDisbursementModel("equal_split")}
                  className={`p-3 rounded-xl border text-left transition ${
                    disbursementModel === "equal_split"
                      ? "border-yellow-400 bg-yellow-400/10 text-white"
                      : "border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700"
                  }`}
                >
                  <Users className="w-4 h-4 text-yellow-400 mb-1" />
                  <div className="text-xs font-bold text-white">Equal Split</div>
                  <div className="text-[10px] text-slate-400">Divided by attendees</div>
                </button>

                <button
                  type="button"
                  onClick={() => setDisbursementModel("hybrid")}
                  className={`p-3 rounded-xl border text-left transition ${
                    disbursementModel === "hybrid"
                      ? "border-yellow-400 bg-yellow-400/10 text-white"
                      : "border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700"
                  }`}
                >
                  <Percent className="w-4 h-4 text-yellow-400 mb-1" />
                  <div className="text-xs font-bold text-white">Hybrid Cut</div>
                  <div className="text-[10px] text-slate-400">Band fee + remainder split</div>
                </button>
              </div>
            </div>

            {/* Hybrid Input */}
            {disbursementModel === "hybrid" && (
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                <label className="text-xs font-semibold text-slate-300 block">
                  Band Reserve Cut ($ USD)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs text-slate-500 font-mono">$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={hybridRetainedFee}
                    onChange={(e) => setHybridRetainedFee(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-7 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-yellow-400 font-mono"
                  />
                </div>
              </div>
            )}

            {/* Attendance Roster */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-300">
                  Confirmed Players ({eligibleCount} of {settlementAttendees.length} receiving cut)
                </span>
              </div>

              {loadingAttendees ? (
                <div className="p-4 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-yellow-400" />
                  Fetching check-ins...
                </div>
              ) : settlementAttendees.length === 0 ? (
                <div className="p-3 text-center text-[11px] text-slate-500 bg-slate-950 rounded-xl border border-slate-800">
                  No check-ins recorded. Payouts will default entirely to the treasury.
                </div>
              ) : (
                <div className="max-h-40 overflow-y-auto divide-y divide-slate-800/60 bg-slate-950 border border-slate-800 rounded-xl p-2 pr-3 [scrollbar-width:thin]">
                  {settlementAttendees.map((m) => (
                    <div key={m.userId} className="py-1.5 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-semibold text-white">{m.name}</span>
                        <span className="text-[10px] text-slate-500 font-mono ml-2">
                          {m.section}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleMusicianPayout(m.userId)}
                        className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold transition ${
                          m.includedInPayout
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                            : "bg-slate-800 text-slate-500"
                        }`}
                      >
                        {m.includedInPayout ? "Included" : "Excluded"}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Calculations Summary */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 font-mono text-xs space-y-1.5">
              <div className="flex justify-between text-slate-400">
                <span>Band Treasury Retained:</span>
                <span className="text-emerald-400 font-bold">${bandTreasuryRetained.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Per-Musician Payout:</span>
                <span className="text-yellow-400 font-bold">${perMusicianPayout.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-800">
                <span>Total Musician Outflow:</span>
                <span>${distributedMusicianTotal.toFixed(2)}</span>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                Settlement Memo / Notes
              </label>
              <input
                type="text"
                placeholder="e.g. Paid via client check #1042"
                value={settlementNotes}
                onChange={(e) => setSettlementNotes(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400 placeholder-slate-600"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setSettlementGig(null)}
                className="px-3 py-2 text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteSettlement}
                disabled={committingSettlement}
                className="bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition disabled:opacity-50 shadow"
              >
                {committingSettlement ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                )}
                <span>Commit Settlement</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Entry Form */}
      {isAddingTransaction && (
        <form
          onSubmit={handleCreateTransaction}
          className="bg-slate-900 border border-yellow-400/40 rounded-2xl p-5 sm:p-6 space-y-4 shadow-2xl transition animate-in fade-in duration-200"
        >
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <PlusCircle className="w-4 h-4 text-yellow-400" /> Record Ledger Entry
            </h2>
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setTxType("expense");
                  setTxCategory("food_beverage");
                }}
                className={`text-xs px-3 py-1 rounded-lg font-bold transition ${
                  txType === "expense"
                    ? "bg-rose-500 text-white shadow"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Expense (Outflow)
              </button>
              <button
                type="button"
                onClick={() => {
                  setTxType("income");
                  setTxCategory("gig_fee");
                }}
                className={`text-xs px-3 py-1 rounded-lg font-bold transition ${
                  txType === "income"
                    ? "bg-emerald-500 text-slate-950 shadow"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Income (Inflow)
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">Amount ($) *</label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-xs text-slate-500 font-mono">$</span>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={txAmount}
                  onChange={(e) => setTxAmount(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-7 pr-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">Category *</label>
              <select
                value={txCategory}
                onChange={(e) => setTxCategory(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400"
              >
                {txType === "expense"
                  ? EXPENSE_CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))
                  : INCOME_CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">Date *</label>
              <input
                type="date"
                required
                value={txDate}
                onChange={(e) => setTxDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">Description *</label>
              <input
                type="text"
                required
                placeholder={txType === "expense" ? "e.g. Post-parade team tacos & soda" : "e.g. Bloomfield Festival deposit check"}
                value={txDescription}
                onChange={(e) => setTxDescription(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400 font-semibold"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">Associated Gig (Optional)</label>
              <select
                value={txGigId}
                onChange={(e) => setTxGigId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400"
              >
                <option value="">-- None / General Band Operations --</option>
                {gigs.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.date} — {g.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-300 block mb-1">Internal Notes & Receipt Details</label>
            <input
              type="text"
              placeholder="e.g. Paid on Dave's card, Venmo reimbursed from band fund"
              value={txNotes}
              onChange={(e) => setTxNotes(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsAddingTransaction(false)}
              className="px-3 py-2 text-xs text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition disabled:opacity-50 shadow"
            >
              {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              <span>Save Entry</span>
            </button>
          </div>
        </form>
      )}

      {/* Ledger Filter & Search Bar */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 p-1 rounded-xl">
          <button
            onClick={() => setFilterType("all")}
            className={`text-xs px-3 py-1.5 rounded-lg font-bold transition ${
              filterType === "all" ? "bg-yellow-400 text-slate-950" : "text-slate-400 hover:text-white"
            }`}
          >
            All Activity ({transactions.length})
          </button>
          <button
            onClick={() => setFilterType("income")}
            className={`text-xs px-3 py-1.5 rounded-lg font-bold transition ${
              filterType === "income" ? "bg-emerald-500 text-slate-950" : "text-slate-400 hover:text-emerald-400"
            }`}
          >
            Inflows
          </button>
          <button
            onClick={() => setFilterType("expense")}
            className={`text-xs px-3 py-1.5 rounded-lg font-bold transition ${
              filterType === "expense" ? "bg-rose-500 text-white" : "text-slate-400 hover:text-rose-400"
            }`}
          >
            Expenses & Payouts
          </button>
        </div>

        <div className="text-xs font-mono text-slate-400">
          Showing {filteredTransactions.length} entries
        </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/70 font-mono text-[10px] uppercase text-slate-400">
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Description & Notes</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-4">Associated Gig</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredTransactions.map((t) => {
                const isExpense = t.type === "expense" || t.type === "payout";
                const matchingGig = gigs.find((g) => g.id === t.gigId);

                return (
                  <tr key={t.id} className="hover:bg-slate-800/50 transition">
                    <td className="py-3 px-4 font-mono text-slate-300 whitespace-nowrap">
                      {t.date}
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-bold text-white text-xs">{t.description}</div>
                      {t.notes && <div className="text-[11px] text-slate-400">{t.notes}</div>}
                    </td>

                    <td className="py-3 px-3">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-300 uppercase">
                        {t.category.replace(/_/g, " ")}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-slate-400 text-xs">
                      {matchingGig ? (
                        <button
                          type="button"
                          onClick={() => openSettlementModal(matchingGig)}
                          className="text-yellow-400/90 hover:text-yellow-300 font-medium truncate max-w-[180px] flex items-center gap-1 text-left"
                          title="View / Re-settle Gig"
                        >
                          <span className="truncate">{t.gigTitle || matchingGig.title}</span>
                          <Split className="w-3 h-3 shrink-0 opacity-60" />
                        </button>
                      ) : t.gigTitle ? (
                        <span className="text-yellow-400/90 font-medium truncate max-w-[180px] block">
                          {t.gigTitle}
                        </span>
                      ) : (
                        <span className="text-slate-600 font-mono text-[11px]">General Band Fund</span>
                      )}
                    </td>

                    <td className={`py-3 px-4 font-mono font-bold text-right text-xs whitespace-nowrap ${isExpense ? "text-rose-400" : "text-emerald-400"}`}>
                      {isExpense ? "-" : "+"}${Number(t.amount || 0).toFixed(2)}
                    </td>

                    <td className="py-3 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleDeleteTransaction(t.id)}
                        className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-slate-950 transition"
                        title="Delete entry"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}

              {filteredTransactions.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500 text-xs">
                    No transactions recorded yet. Click <strong>Record Transaction</strong> to log an expense or deposit.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}