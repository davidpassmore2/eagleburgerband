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
  updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/lib/context/AuthContext";
import { canManageFinances } from "@/lib/auth/permissions";
import { User } from "@/lib/schema/user";
import { Reimbursement } from "@/lib/schema/reimbursement";
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
  Copy,
  Check,
  ExternalLink,
  Clock,
  XCircle,
} from "lucide-react";
import DatePicker from "@/components/ui/DatePicker";

export type TransactionType = "income" | "expense" | "payout";

export type ExpenseCategory =
  | "food_beverage"
  | "travel_fuel"
  | "gear_repairs"
  | "rehearsal_space"
  | "merchandise"
  | "admin_software"
  | "sheet_music"
  | "uniforms_attire"
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
  { value: "sheet_music", label: "Sheet Music & Arrangements", icon: Music },
  { value: "uniforms_attire", label: "Uniforms & Band Attire", icon: Layers },
  { value: "merchandise", label: "Band Merch & Production", icon: Layers },
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

  // Main tab: Ledger vs Reimbursements
  const [activeMainTab, setActiveMainTab] = useState<"ledger" | "reimbursements">("ledger");

  // Reimbursements Queue State
  const [reimbursements, setReimbursements] = useState<Reimbursement[]>([]);
  const [reimbursementFilter, setReimbursementFilter] = useState<
    "all" | "submitted" | "approved" | "paid" | "rejected"
  >("submitted");
  const [reimbursementToPay, setReimbursementToPay] = useState<Reimbursement | null>(null);
  const [reimbursementToReject, setReimbursementToReject] = useState<Reimbursement | null>(null);
  const [payoutReference, setPayoutReference] = useState("");
  const [payoutDate, setPayoutDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [rejectReason, setRejectReason] = useState("");
  const [isProcessingReimbursement, setIsProcessingReimbursement] = useState(false);
  const [copiedHandleId, setCopiedHandleId] = useState<string | null>(null);

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

    const qReimb = query(collection(db, "reimbursements"), orderBy("createdAt", "desc"));
    const unsubReimb = onSnapshot(
      qReimb,
      (snap) => {
        const list: Reimbursement[] = [];
        snap.forEach((d) => {
          list.push({ id: d.id, ...d.data() } as Reimbursement);
        });
        setReimbursements(list);
      },
      (err) => console.warn("Reimbursements subscriber note:", err)
    );

    return () => {
      unsubTx();
      unsubGigs();
      unsubReimb();
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

  const pendingReimbursementsCount = useMemo(() => {
    return reimbursements.filter((r) => r.status === "submitted" || r.status === "approved").length;
  }, [reimbursements]);

  const pendingReimbursementsTotal = useMemo(() => {
    return reimbursements
      .filter((r) => r.status === "submitted")
      .reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
  }, [reimbursements]);

  const approvedReimbursementsTotal = useMemo(() => {
    return reimbursements
      .filter((r) => r.status === "approved")
      .reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
  }, [reimbursements]);

  const paidReimbursementsTotal = useMemo(() => {
    return reimbursements
      .filter((r) => r.status === "paid")
      .reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
  }, [reimbursements]);

  const filteredReimbursements = useMemo(() => {
    if (reimbursementFilter === "all") return reimbursements;
    return reimbursements.filter((r) => r.status === reimbursementFilter);
  }, [reimbursements, reimbursementFilter]);


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

  const handleCopyHandle = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHandleId(id);
    setTimeout(() => setCopiedHandleId(null), 2000);
  };

  const handleApproveReimbursement = async (reimb: Reimbursement) => {
    try {
      await updateDoc(doc(db, "reimbursements", reimb.id), {
        status: "approved",
        reviewedByName: profile?.displayName || "Treasurer",
        reviewedByUid: profile?.uid || null,
        reviewedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      alert("Failed to approve claim: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleConfirmReject = async () => {
    if (!reimbursementToReject) return;
    if (!rejectReason.trim()) {
      alert("Please provide a reason for rejecting this claim.");
      return;
    }
    setIsProcessingReimbursement(true);
    try {
      await updateDoc(doc(db, "reimbursements", reimbursementToReject.id), {
        status: "rejected",
        reviewNotes: rejectReason.trim(),
        reviewedByName: profile?.displayName || "Treasurer",
        reviewedByUid: profile?.uid || null,
        reviewedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      setReimbursementToReject(null);
      setRejectReason("");
    } catch (err) {
      alert("Failed to reject claim: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsProcessingReimbursement(false);
    }
  };

  const handleConfirmPay = async () => {
    if (!reimbursementToPay) return;
    setIsProcessingReimbursement(true);
    try {
      const batch = writeBatch(db);
      const timestamp = new Date().toISOString();
      const txId = `tx_reimb_${reimbursementToPay.id}_${Date.now()}`;

      // 1. Create expense transaction in ledger
      batch.set(doc(db, "transactions", txId), {
        id: txId,
        type: "expense",
        category: reimbursementToPay.category,
        amount: Number(Number(reimbursementToPay.amount).toFixed(2)),
        description: `Reimbursement: ${reimbursementToPay.applicantName} - ${reimbursementToPay.description.slice(0, 45)}`,
        date: payoutDate || timestamp.split("T")[0],
        gigId: reimbursementToPay.gigId || null,
        gigTitle: reimbursementToPay.gigTitle || null,
        recordedBy: profile?.displayName || "Treasurer",
        notes: `Reimbursed via ${reimbursementToPay.paymentMethod.toUpperCase()}${
          reimbursementToPay.paymentHandle ? ` (${reimbursementToPay.paymentHandle})` : ""
        }${
          payoutReference.trim() ? ` [Ref: ${payoutReference.trim()}]` : ""
        }. Claim ID: ${reimbursementToPay.id}`.trim(),
        createdAt: timestamp,
      });

      // 2. Mark reimbursement as paid
      batch.update(doc(db, "reimbursements", reimbursementToPay.id), {
        status: "paid",
        paidAt: timestamp,
        reviewedByName: profile?.displayName || "Treasurer",
        reviewedByUid: profile?.uid || null,
        payoutReference: payoutReference.trim() || "",
        transactionId: txId,
        updatedAt: timestamp,
      });

      await batch.commit();
      setReimbursementToPay(null);
      setPayoutReference("");
    } catch (err) {
      alert("Failed to record payout: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsProcessingReimbursement(false);
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
          {activeMainTab === "ledger" ? (
            <>
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
            </>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-slate-400 hidden sm:inline">
                Review, approve, and disburse member claims
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Main View Navigation Tabs */}
      <div className="flex border-b border-slate-800 gap-6">
        <button
          type="button"
          onClick={() => setActiveMainTab("ledger")}
          className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition ${
            activeMainTab === "ledger"
              ? "border-yellow-400 text-yellow-400"
              : "border-transparent text-slate-400 hover:text-white"
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>Ledger & Settlements</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveMainTab("reimbursements")}
          className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition relative ${
            activeMainTab === "reimbursements"
              ? "border-yellow-400 text-yellow-400"
              : "border-transparent text-slate-400 hover:text-white"
          }`}
        >
          <DollarSign className="w-4 h-4" />
          <span>Member Reimbursements</span>
          {pendingReimbursementsCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
              {pendingReimbursementsCount} pending
            </span>
          )}
        </button>
      </div>

      {activeMainTab === "ledger" && (
        <>
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
    </>
  )}


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
                <DatePicker
                  label="Baseline Date"
                  required
                  value={tempStartingDate}
                  onChange={(d) => setTempStartingDate(d)}
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

      {activeMainTab === "ledger" && (
        <>
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
              <DatePicker
                label="Date"
                required
                value={txDate}
                onChange={(d) => setTxDate(d)}
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
    </>
  )}

  {activeMainTab === "reimbursements" && (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Reimbursement Overview Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-mono uppercase font-bold tracking-wider">Awaiting Review</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-400">
            ${pendingReimbursementsTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] font-mono text-slate-400">
            {reimbursements.filter((r) => r.status === "submitted").length} claims pending review
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-mono uppercase font-bold tracking-wider">Ready to Disburse</span>
            <CheckCircle2 className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-blue-400">
            ${approvedReimbursementsTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] font-mono text-slate-400">
            {reimbursements.filter((r) => r.status === "approved").length} approved awaiting payout
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-mono uppercase font-bold tracking-wider">Total Disbursed</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-400">
            ${paidReimbursementsTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] font-mono text-slate-400">
            {reimbursements.filter((r) => r.status === "paid").length} fulfilled & synced to ledger
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-mono uppercase font-bold tracking-wider">All Submissions</span>
            <Receipt className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white">
            {reimbursements.length}
          </div>
          <div className="text-[10px] font-mono text-slate-500">
            {reimbursements.filter((r) => r.status === "rejected").length} claims declined
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1 bg-slate-900 border border-slate-800 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setReimbursementFilter("submitted")}
            className={`text-xs px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 ${
              reimbursementFilter === "submitted"
                ? "bg-amber-500 text-slate-950 shadow"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <span>Pending Review</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-slate-950/40">
              {reimbursements.filter((r) => r.status === "submitted").length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setReimbursementFilter("approved")}
            className={`text-xs px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 ${
              reimbursementFilter === "approved"
                ? "bg-blue-500 text-white shadow"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <span>Approved</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-slate-950/40">
              {reimbursements.filter((r) => r.status === "approved").length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setReimbursementFilter("paid")}
            className={`text-xs px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 ${
              reimbursementFilter === "paid"
                ? "bg-emerald-500 text-slate-950 shadow"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <span>Paid</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-slate-950/40">
              {reimbursements.filter((r) => r.status === "paid").length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setReimbursementFilter("rejected")}
            className={`text-xs px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 ${
              reimbursementFilter === "rejected"
                ? "bg-rose-500 text-white shadow"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <span>Rejected</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-slate-950/40">
              {reimbursements.filter((r) => r.status === "rejected").length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setReimbursementFilter("all")}
            className={`text-xs px-3 py-1.5 rounded-lg font-bold transition ${
              reimbursementFilter === "all"
                ? "bg-yellow-400 text-slate-950"
                : "text-slate-400 hover:text-white"
            }`}
          >
            All Claims ({reimbursements.length})
          </button>
        </div>

        <div className="text-xs font-mono text-slate-400">
          Showing {filteredReimbursements.length} claims
        </div>
      </div>

      {/* Claims Queue List */}
      <div className="space-y-4">
        {filteredReimbursements.map((claim) => {
          const isPending = claim.status === "submitted";
          const isApproved = claim.status === "approved";
          const isPaid = claim.status === "paid";
          const isRejected = claim.status === "rejected";

          return (
            <div
              key={claim.id}
              className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4 transition"
            >
              {/* Top Bar: Applicant Info & Amount & Status */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-white">
                      {claim.applicantName}
                    </span>
                    {claim.applicantEmail && (
                      <span className="text-xs text-slate-400">({claim.applicantEmail})</span>
                    )}
                    <span className="text-[11px] font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                      Claim ID: #{claim.id.slice(-6)}
                    </span>
                    <span className="text-xs text-slate-500">
                      • Submitted {claim.createdAt.split("T")[0]}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-yellow-400/10 text-yellow-400 border border-yellow-400/20 font-bold">
                      {claim.category.replace(/_/g, " ")}
                    </span>
                    <span className="text-xs text-slate-400">
                      Expense Date: {claim.expenseDate}
                    </span>
                    {claim.gigTitle && (
                      <span className="text-xs text-slate-300 font-medium bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                        Gig: {claim.gigTitle}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 sm:text-right">
                  <div>
                    <div className="text-2xl font-black text-white font-mono">
                      ${claim.amount.toFixed(2)}
                    </div>
                    <div className="text-[10px] font-mono text-slate-400">
                      USD Requested
                    </div>
                  </div>

                  <div>
                    {isPending && (
                      <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                        <Clock className="w-3.5 h-3.5" /> Pending Review
                      </span>
                    )}
                    {isApproved && (
                      <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-bold bg-blue-500/10 text-blue-400 border border-blue-500/30">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Approved
                      </span>
                    )}
                    {isPaid && (
                      <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                        <Check className="w-3.5 h-3.5" /> Paid
                      </span>
                    )}
                    {isRejected && (
                      <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30">
                        <XCircle className="w-3.5 h-3.5" /> Rejected
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Description & Receipt Details */}
              <div className="space-y-2">
                <div className="text-xs text-slate-200 leading-relaxed font-medium">
                  {claim.description}
                </div>

                <div className="flex items-center gap-4 flex-wrap text-xs">
                  {claim.receiptUrl && (
                    <a
                      href={claim.receiptUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-yellow-400 hover:text-yellow-300 font-semibold underline underline-offset-2"
                    >
                      <Receipt className="w-3.5 h-3.5" />
                      <span>View Itemized Receipt</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                  {claim.receiptNote && (
                    <span className="text-slate-400 text-xs italic">
                      Receipt Note: &ldquo;{claim.receiptNote}&rdquo;
                    </span>
                  )}
                </div>
              </div>

              {/* Payout Destination Account Box */}
              <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-yellow-400/10 border border-yellow-400/20 text-yellow-400 flex items-center justify-center font-bold shrink-0">
                    <DollarSign className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[11px] font-mono uppercase text-slate-400 font-bold">
                      Disbursement Account ({claim.paymentMethod.toUpperCase()})
                    </div>
                    <div className="text-xs font-mono font-bold text-white flex items-center gap-2">
                      <span>{claim.paymentHandle || "No account handle provided"}</span>
                      {claim.paymentHandle && (
                        <button
                          type="button"
                          onClick={() => handleCopyHandle(claim.paymentHandle, claim.id)}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-[10px] font-mono border border-slate-800 transition"
                          title="Copy account handle"
                        >
                          {copiedHandleId === claim.id ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-400" />
                              <span className="text-emerald-400">Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3 text-slate-400" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Audit metadata if paid or rejected */}
                {isPaid && (
                  <div className="text-right text-[11px] font-mono text-emerald-400/90 space-y-0.5">
                    <div>Paid on {claim.paidAt ? claim.paidAt.split("T")[0] : "Recorded"} by {claim.reviewedByName || "Treasurer"}</div>
                    {claim.payoutReference && (
                      <div className="text-slate-400">Ref: {claim.payoutReference}</div>
                    )}
                    {claim.transactionId && (
                      <div className="text-slate-500">Ledger ID: {claim.transactionId}</div>
                    )}
                  </div>
                )}

                {isRejected && (
                  <div className="text-right text-[11px] font-mono text-rose-400 space-y-0.5 max-w-sm">
                    <div>Declined by {claim.reviewedByName || "Treasurer"}</div>
                    {claim.reviewNotes && (
                      <div className="text-rose-300 font-sans italic">
                        &ldquo;{claim.reviewNotes}&rdquo;
                      </div>
                    )}
                  </div>
                )}

                {isApproved && (
                  <div className="text-right text-[11px] font-mono text-blue-400 space-y-0.5">
                    <div>Approved by {claim.reviewedByName || "Treasurer"}</div>
                    <div className="text-slate-400">Awaiting disbursement by Treasurer</div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              {(isPending || isApproved) && (
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                  {isPending && (
                    <button
                      type="button"
                      onClick={() => handleApproveReimbursement(claim)}
                      className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-3.5 py-1.5 rounded-xl text-xs flex items-center gap-1.5 transition shadow"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Approve Claim</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setReimbursementToPay(claim);
                      setPayoutReference("");
                      setPayoutDate(new Date().toISOString().split("T")[0]);
                    }}
                    className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-4 py-1.5 rounded-xl text-xs flex items-center gap-1.5 transition shadow"
                  >
                    <DollarSign className="w-3.5 h-3.5" />
                    <span>Disburse Payout & Record in Ledger</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setReimbursementToReject(claim);
                      setRejectReason("");
                    }}
                    className="bg-slate-950 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 border border-slate-800 hover:border-rose-800/50 font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 transition"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Reject</span>
                  </button>
                </div>
              )}
            </div>
          );
        })}

        {filteredReimbursements.length === 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center space-y-3">
            <Receipt className="w-10 h-10 text-slate-600 mx-auto" />
            <h4 className="text-sm font-bold text-white">No Reimbursement Requests Found</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {reimbursementFilter === "all"
                ? "Band members have not filed any expense reimbursement claims yet."
                : `There are currently no reimbursement requests with status "${reimbursementFilter}".`}
            </p>
          </div>
        )}
      </div>
    </div>
  )}

  {/* Reimbursement Mark as Paid Modal */}
  {reimbursementToPay && (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-lg w-full space-y-4 shadow-2xl animate-in fade-in">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-400" /> Disburse Reimbursement
            </h3>
            <p className="text-xs text-slate-400">
              Confirm payout to {reimbursementToPay.applicantName} and synchronize with Band Treasury.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setReimbursementToPay(null)}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-400">Amount Due:</span>
            <span className="text-lg font-mono font-bold text-emerald-400">
              ${reimbursementToPay.amount.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-400">Payment Channel:</span>
            <span className="font-mono font-bold uppercase text-slate-200">
              {reimbursementToPay.paymentMethod}
            </span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-400">Account Handle / Identifier:</span>
            <div className="flex items-center gap-1.5 font-mono text-yellow-400 font-semibold">
              <span>{reimbursementToPay.paymentHandle || "Not specified"}</span>
              {reimbursementToPay.paymentHandle && (
                <button
                  type="button"
                  onClick={() => handleCopyHandle(reimbursementToPay.paymentHandle, "modal")}
                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                  title="Copy Handle"
                >
                  {copiedHandleId === "modal" ? (
                    <Check className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <DatePicker
              label="Payment Date"
              required
              value={payoutDate}
              onChange={(d) => setPayoutDate(d)}
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Payment Reference / Confirmation # (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Venmo tx #839104, Check #1055, or bank memo"
              value={payoutReference}
              onChange={(e) => setPayoutReference(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400 font-mono"
            />
          </div>

          <div className="bg-emerald-950/20 border border-emerald-500/20 rounded-xl p-3 text-[11px] text-emerald-300 flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>
              Confirming this payout will automatically generate an <strong>expense transaction</strong> in the financial ledger, deducting <strong>${reimbursementToPay.amount.toFixed(2)}</strong> from the current band treasury fund.
            </span>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
          <button
            type="button"
            onClick={() => setReimbursementToPay(null)}
            className="px-3 py-2 text-xs text-slate-400 hover:text-white"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isProcessingReimbursement}
            onClick={handleConfirmPay}
            className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition disabled:opacity-50 shadow"
          >
            {isProcessingReimbursement ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5" />
            )}
            <span>Disburse & Record in Ledger</span>
          </button>
        </div>
      </div>
    </div>
  )}

  {/* Reimbursement Reject Modal */}
  {reimbursementToReject && (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl animate-in fade-in">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <XCircle className="w-5 h-5 text-rose-400" /> Decline Reimbursement Claim
            </h3>
            <p className="text-xs text-slate-400">
              Claim #{reimbursementToReject.id.slice(-6)} • ${reimbursementToReject.amount.toFixed(2)} from {reimbursementToReject.applicantName}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setReimbursementToReject(null)}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Reason for Declining *
            </label>
            <textarea
              rows={3}
              required
              placeholder="Please explain why this expense is not approved (e.g. missing itemized receipt, duplicate claim, expense not authorized)..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-rose-400 placeholder-slate-600"
            />
          </div>

          <div className="text-[11px] text-slate-400">
            The member will see this reason in their reimbursement history portal.
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
          <button
            type="button"
            onClick={() => setReimbursementToReject(null)}
            className="px-3 py-2 text-xs text-slate-400 hover:text-white"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isProcessingReimbursement || !rejectReason.trim()}
            onClick={handleConfirmReject}
            className="bg-rose-500 hover:bg-rose-400 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition disabled:opacity-50 shadow"
          >
            {isProcessingReimbursement ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <XCircle className="w-3.5 h-3.5" />
            )}
            <span>Confirm Rejection</span>
          </button>
        </div>
      </div>
    </div>
  )}
</div>
);
}
