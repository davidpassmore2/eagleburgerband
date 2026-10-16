"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  deleteDoc,
  updateDoc,
  query,
  orderBy,
  getDoc,
  getDocs,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/lib/context/AuthContext";
import { canManageFinances } from "@/lib/auth/permissions";
import {
  Reimbursement,
  ReimbursementSchema,
  ExpenseCategoryEnum,
  PayoutMethodEnum,
} from "@/lib/schema/reimbursement";
import {
  Donation,
  DonationSchema,
  DonationCategory,
  DonationCategoryEnum,
} from "@/lib/schema/donation";
import { Transaction, TransactionSchema } from "@/lib/schema/transaction";
import { TreasuryConfig, TreasuryConfigSchema } from "@/lib/schema/treasury";
import { User, UserSchema } from "@/lib/schema/user";
import { toast } from "@/lib/context/ToastContext";
import PortalBreadcrumb from "@/components/portal/PortalBreadcrumb";
import DatePicker from "@/components/ui/DatePicker";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Receipt,
  HeartHandshake,
  BookOpen,
  PlusCircle,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Search,
  Filter,
  ExternalLink,
  ShieldCheck,
  Building,
  UserCheck,
  Calendar,
  Sparkles,
  UtensilsCrossed,
  Truck,
  Wrench,
  Music,
  Briefcase,
  Layers,
  Coins,
  Split,
  ChevronRight,
  HelpCircle,
  Check,
  Copy,
  Users,
  X,
  CreditCard,
  Settings,
} from "lucide-react";

export const CATEGORY_LABELS: Record<string, string> = {
  food_beverage: "Food & Beverage",
  travel_fuel: "Travel & Fuel",
  gear_repairs: "Gear & Repairs",
  rehearsal_space: "Rehearsal Rental",
  merchandise: "Merchandise",
  admin_software: "Software & Web Admin",
  sheet_music: "Sheet Music & Charts",
  uniforms_attire: "Uniforms & Band Attire",
  charitable_giving: "Charitable Philanthropy",
  other: "Other Expense",
};

export const DONATION_CATEGORY_LABELS: Record<DonationCategory, { label: string; color: string }> = {
  arts_music: { label: "Arts & Music Access", color: "bg-purple-500/10 text-purple-400 border-purple-500/30" },
  community_aid: { label: "Community Aid", color: "bg-blue-500/10 text-blue-400 border-blue-500/30" },
  youth_education: { label: "Youth & Education", color: "bg-amber-500/10 text-amber-400 border-amber-500/30" },
  hunger_relief: { label: "Hunger Relief", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" },
  environment: { label: "Parks & Environment", color: "bg-teal-500/10 text-teal-400 border-teal-500/30" },
  other: { label: "General Cause", color: "bg-slate-500/10 text-slate-400 border-slate-500/30" },
};

interface GigOption {
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

type FinanceTab = "treasury" | "reimbursements" | "giving" | "ledger";

function FinanceHubContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { profile, loading: authLoading } = useAuth();
  const isManager = Boolean(profile && canManageFinances(profile));

  // Active Tab synchronized with ?tab=
  const initialTab = (searchParams.get("tab") as FinanceTab) || "treasury";
  const [activeTab, setActiveTab] = useState<FinanceTab>(initialTab);

  const switchTab = (tab: FinanceTab) => {
    setActiveTab(tab);
    router.replace(`/portal/finance?tab=${tab}`, { scroll: false });
  };

  useEffect(() => {
    const tabParam = searchParams.get("tab") as FinanceTab;
    if (tabParam && ["treasury", "reimbursements", "giving", "ledger"].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  // Data States
  const [treasuryConfig, setTreasuryConfig] = useState<TreasuryConfig>({
    startingBalance: 0,
    startingDate: new Date().toISOString().split("T")[0],
    lastUpdated: new Date().toISOString(),
    notes: "Band Treasury Starting Balance",
    schemaVersion: 1,
  });
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [reimbursements, setReimbursements] = useState<Reimbursement[]>([]);
  const [donations, setDonations] = useState<Donation[]>([]);
  const [gigs, setGigs] = useState<GigOption[]>([]);
  const [rosterMembers, setRosterMembers] = useState<User[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Subscriptions
  useEffect(() => {
    if (authLoading) return;

    // 1. Treasury Baseline
    const unsubTreasury = onSnapshot(doc(db, "settings", "treasury"), (snap) => {
      if (snap.exists()) {
        const parsed = TreasuryConfigSchema.safeParse(snap.data());
        if (parsed.success) setTreasuryConfig(parsed.data);
      }
    });

    // 2. Transactions
    const qTx = query(collection(db, "transactions"), orderBy("date", "desc"));
    const unsubTx = onSnapshot(qTx, (snap) => {
      const list: Transaction[] = [];
      snap.forEach((d) => {
        const parsed = TransactionSchema.safeParse({ id: d.id, ...d.data() });
        if (parsed.success) list.push(parsed.data);
      });
      setTransactions(list);
      setLoadingData(false);
    });

    // 3. Reimbursements
    const qReimb = query(collection(db, "reimbursements"), orderBy("createdAt", "desc"));
    const unsubReimb = onSnapshot(qReimb, (snap) => {
      const list: Reimbursement[] = [];
      snap.forEach((d) => {
        const parsed = ReimbursementSchema.safeParse({ id: d.id, ...d.data() });
        if (parsed.success) list.push(parsed.data);
      });
      setReimbursements(list);
    });

    // 4. Donations & Suggestions
    const qDonations = query(collection(db, "donations"), orderBy("createdAt", "desc"));
    const unsubDonations = onSnapshot(qDonations, (snap) => {
      const list: Donation[] = [];
      snap.forEach((d) => {
        const parsed = DonationSchema.safeParse({ id: d.id, ...d.data() });
        if (parsed.success) list.push(parsed.data);
      });
      setDonations(list);
    });

    // 5. Gigs
    const unsubGigs = onSnapshot(collection(db, "gigs"), (snap) => {
      const list: GigOption[] = [];
      snap.forEach((d) => {
        const data = d.data();
        list.push({
          id: d.id,
          title: data.title || "Band Gig",
          date: data.date || "",
          guarantee: typeof data.guarantee === "number" ? data.guarantee : 0,
          isSettled: Boolean(data.isSettled),
        });
      });
      list.sort((a, b) => b.date.localeCompare(a.date));
      setGigs(list);
    });

    // 6. Roster Users (for manager submission on behalf of)
    const unsubUsers = onSnapshot(collection(db, "users"), (snap) => {
      const list: User[] = [];
      snap.forEach((d) => {
        const parsed = UserSchema.safeParse({ uid: d.id, ...d.data() });
        if (parsed.success && parsed.data.status !== "inactive") {
          list.push(parsed.data);
        }
      });
      list.sort((a, b) => (a.displayName || "").localeCompare(b.displayName || ""));
      setRosterMembers(list);
    });

    return () => {
      unsubTreasury();
      unsubTx();
      unsubReimb();
      unsubDonations();
      unsubGigs();
      unsubUsers();
    };
  }, [authLoading]);

  // Derived Financial Metrics
  const startingBal = treasuryConfig.startingBalance || 0;
  const totalInflows = useMemo(
    () => transactions.filter((t) => t.type === "income").reduce((acc, t) => acc + (t.amount || 0), 0),
    [transactions]
  );
  const totalOutflows = useMemo(
    () => transactions.filter((t) => t.type === "expense" || t.type === "payout").reduce((acc, t) => acc + (t.amount || 0), 0),
    [transactions]
  );
  const currentBalance = useMemo(
    () => startingBal + totalInflows - totalOutflows,
    [startingBal, totalInflows, totalOutflows]
  );
  const totalPhilanthropy = useMemo(
    () =>
      donations
        .filter((d) => d.status === "completed")
        .reduce((acc, d) => acc + (d.amount || 0), 0),
    [donations]
  );
  const totalOpenReimbursements = useMemo(
    () =>
      reimbursements
        .filter((r) => r.status === "submitted" || r.status === "approved")
        .reduce((acc, r) => acc + (r.amount || 0), 0),
    [reimbursements]
  );

  // Member's Own Reimbursements
  const myReimbursements = useMemo(
    () => (profile ? reimbursements.filter((r) => r.applicantUid === profile.uid) : []),
    [reimbursements, profile]
  );

  // -------------------------------------------------------------
  // MODALS STATE
  // -------------------------------------------------------------
  // Reimbursement Modal
  const [isReimbModalOpen, setIsReimbModalOpen] = useState(false);
  const [isOnBehalfMode, setIsOnBehalfMode] = useState(false);
  const [selectedBehalfMemberUid, setSelectedBehalfMemberUid] = useState("");
  const [reimbAmount, setReimbAmount] = useState("");
  const [reimbCategory, setReimbCategory] = useState<string>("gear_repairs");
  const [reimbDate, setReimbDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [reimbDescription, setReimbDescription] = useState("");
  const [reimbGigId, setReimbGigId] = useState("");
  const [reimbReceiptUrl, setReimbReceiptUrl] = useState("");
  const [reimbReceiptNote, setReimbReceiptNote] = useState("");
  const [reimbPayoutMethod, setReimbPayoutMethod] = useState<string>("venmo");
  const [reimbPayoutHandle, setReimbPayoutHandle] = useState("");
  const [isSubmittingReimb, setIsSubmittingReimb] = useState(false);

  // Suggest Donation Modal
  const [isSuggestModalOpen, setIsSuggestModalOpen] = useState(false);
  const [suggestOrgName, setSuggestOrgName] = useState("");
  const [suggestWebsite, setSuggestWebsite] = useState("");
  const [suggestCategory, setSuggestCategory] = useState<DonationCategory>("community_aid");
  const [suggestTargetAmount, setSuggestTargetAmount] = useState("");
  const [suggestRationale, setSuggestRationale] = useState("");
  const [isSubmittingSuggestion, setIsSubmittingSuggestion] = useState(false);

  // Manager Direct Donation Modal
  const [isRecordDonationModalOpen, setIsRecordDonationModalOpen] = useState(false);
  const [recOrgName, setRecOrgName] = useState("");
  const [recCauseDesc, setRecCauseDesc] = useState("");
  const [recWebsite, setRecWebsite] = useState("");
  const [recCategory, setRecCategory] = useState<DonationCategory>("community_aid");
  const [recAmount, setRecAmount] = useState("100");
  const [recDate, setRecDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [recFiscalYear, setRecFiscalYear] = useState(() => String(new Date().getFullYear()));
  const [recIsPublic, setRecIsPublic] = useState(true);
  const [recImpactNote, setRecImpactNote] = useState("");
  const [recInternalNotes, setRecInternalNotes] = useState("");
  const [recAttributedMemberUid, setRecAttributedMemberUid] = useState("");
  const [isRecordingDonation, setIsRecordingDonation] = useState(false);

  // Manager Starting Balance Modal
  const [isBaselineModalOpen, setIsBaselineModalOpen] = useState(false);
  const [tempBaseline, setTempBaseline] = useState(0);
  const [tempBaselineDate, setTempBaselineDate] = useState("");
  const [isSavingBaseline, setIsSavingBaseline] = useState(false);

  // Manager Record Transaction Modal
  const [isRecordTxModalOpen, setIsRecordTxModalOpen] = useState(false);
  const [txType, setTxType] = useState<"expense" | "income">("expense");
  const [txAmount, setTxAmount] = useState("");
  const [txCategory, setTxCategory] = useState("food_beverage");
  const [txDescription, setTxDescription] = useState("");
  const [txDate, setTxDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [txGigId, setTxGigId] = useState("");
  const [txNotes, setTxNotes] = useState("");
  const [isSubmittingTx, setIsSubmittingTx] = useState(false);

  // Manager Settlement Modal
  const [settlementGig, setSettlementGig] = useState<GigOption | null>(null);
  const [settlementAttendees, setSettlementAttendees] = useState<MusicianCheckIn[]>([]);
  const [loadingAttendees, setLoadingAttendees] = useState(false);
  const [settlementPool, setSettlementPool] = useState("0");
  const [disbursementModel, setDisbursementModel] = useState<"band_fund" | "equal_split" | "hybrid">("band_fund");
  const [hybridRetainedFee, setHybridRetainedFee] = useState("50");
  const [settlementNotes, setSettlementNotes] = useState("");
  const [isCommittingSettlement, setIsCommittingSettlement] = useState(false);

  // Reimbursement Review Actions State
  const [reimbToPay, setReimbToPay] = useState<Reimbursement | null>(null);
  const [reimbToReject, setReimbToReject] = useState<Reimbursement | null>(null);
  const [payReference, setPayReference] = useState("");
  const [payDate, setPayDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [rejectReason, setRejectReason] = useState("");
  const [isReviewingReimb, setIsReviewingReimb] = useState(false);

  // Filters
  const [reimbStatusFilter, setReimbStatusFilter] = useState<string>("all");
  const [givingSearchQuery, setGivingSearchQuery] = useState("");
  const [givingCategoryFilter, setGivingCategoryFilter] = useState<string>("all");
  const [ledgerSearch, setLedgerSearch] = useState("");
  const [ledgerTypeFilter, setLedgerTypeFilter] = useState<string>("all");

  // Open Create Reimbursement
  const openCreateReimbursementModal = (onBehalf = false) => {
    setIsOnBehalfMode(onBehalf);
    setSelectedBehalfMemberUid("");
    setReimbAmount("");
    setReimbCategory("gear_repairs");
    setReimbDate(new Date().toISOString().split("T")[0]);
    setReimbDescription("");
    setReimbGigId("");
    setReimbReceiptUrl("");
    setReimbReceiptNote("");
    if (!onBehalf && profile) {
      setReimbPayoutMethod(profile.payoutPreferences?.preferredMethod || "venmo");
      const handle =
        profile.payoutPreferences?.preferredMethod === "paypal"
          ? profile.payoutPreferences.paypalEmail
          : profile.payoutPreferences?.preferredMethod === "zelle"
          ? profile.payoutPreferences.zelleIdentifier
          : profile.payoutPreferences?.venmoHandle || "";
      setReimbPayoutHandle(handle);
    } else {
      setReimbPayoutMethod("venmo");
      setReimbPayoutHandle("");
    }
    setIsReimbModalOpen(true);
  };

  // When manager changes selected musician in On-Behalf modal
  const handleSelectBehalfMember = (uid: string) => {
    setSelectedBehalfMemberUid(uid);
    const m = rosterMembers.find((user) => user.uid === uid);
    if (m) {
      setReimbPayoutMethod(m.payoutPreferences?.preferredMethod || "venmo");
      const handle =
        m.payoutPreferences?.preferredMethod === "paypal"
          ? m.payoutPreferences.paypalEmail
          : m.payoutPreferences?.preferredMethod === "zelle"
          ? m.payoutPreferences.zelleIdentifier
          : m.payoutPreferences?.venmoHandle || "";
      setReimbPayoutHandle(handle);
    }
  };

  // Submit Reimbursement Handler
  const handleSubmitReimbursement = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(reimbAmount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error("Please enter a valid expense amount.");
      return;
    }
    if (!reimbDescription.trim()) {
      toast.error("Please enter an expense description.");
      return;
    }

    let applicantUid = profile?.uid || "";
    let applicantName = profile?.displayName || "Musician";
    let applicantEmail = profile?.email || "";
    let applicantSectionId = profile?.sectionId || null;
    let submittedByUid: string | null = null;
    let submittedByName: string | null = null;
    let submittedOnBehalf = false;

    if (isOnBehalfMode) {
      if (!selectedBehalfMemberUid) {
        toast.error("Please select a musician from the roster.");
        return;
      }
      const targetUser = rosterMembers.find((u) => u.uid === selectedBehalfMemberUid);
      if (!targetUser) {
        toast.error("Selected musician was not found.");
        return;
      }
      applicantUid = targetUser.uid;
      applicantName = targetUser.displayName || targetUser.realName || "Musician";
      applicantEmail = targetUser.email || "";
      applicantSectionId = targetUser.sectionId || null;
      submittedByUid = profile?.uid || null;
      submittedByName = profile?.displayName || "Manager";
      submittedOnBehalf = true;
    }

    setIsSubmittingReimb(true);
    try {
      const id = `reimb_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const selectedGig = gigs.find((g) => g.id === reimbGigId);

      const payload: Reimbursement = {
        id,
        applicantUid,
        applicantName,
        applicantEmail,
        applicantSectionId,
        submittedByUid,
        submittedByName,
        submittedOnBehalf,
        amount: Number(numAmount.toFixed(2)),
        description: reimbDescription.trim(),
        category: reimbCategory as any,
        expenseDate: reimbDate,
        gigId: reimbGigId || null,
        gigTitle: selectedGig ? selectedGig.title : null,
        receiptUrl: reimbReceiptUrl.trim(),
        receiptNote: reimbReceiptNote.trim(),
        paymentMethod: reimbPayoutMethod as any,
        paymentHandle: reimbPayoutHandle.trim(),
        status: "submitted",
        reviewNotes: "",
        reviewedByUid: null,
        reviewedByName: null,
        reviewedAt: null,
        paidAt: null,
        transactionId: null,
        payoutReference: "",
        schemaVersion: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const validated = ReimbursementSchema.parse(payload);
      await setDoc(doc(db, "reimbursements", id), validated);

      toast.success(
        submittedOnBehalf
          ? `Reimbursement recorded on behalf of ${applicantName}.`
          : "Reimbursement claim submitted successfully!"
      );
      setIsReimbModalOpen(false);
    } catch (err) {
      toast.error("Failed to submit reimbursement: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsSubmittingReimb(false);
    }
  };

  // Submit Charitable Suggestion Handler
  const handleSubmitSuggestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!suggestOrgName.trim()) {
      toast.error("Please provide an organization or cause name.");
      return;
    }
    if (!suggestRationale.trim()) {
      toast.error("Please explain why the band should support this cause.");
      return;
    }

    setIsSubmittingSuggestion(true);
    try {
      const id = `donation_sug_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const targetNum = parseFloat(suggestTargetAmount) || 0;

      const payload: Donation = {
        id,
        organizationName: suggestOrgName.trim(),
        causeDescription: suggestRationale.trim(),
        websiteUrl: suggestWebsite.trim(),
        category: suggestCategory,
        amount: 0,
        targetAmount: targetNum,
        dateDonated: new Date().toISOString().split("T")[0],
        fiscalYear: String(new Date().getFullYear()),
        status: "suggested",
        isPublic: false,
        publicImpactNote: "",
        notes: "",
        suggestedByUid: profile?.uid || null,
        suggestedByName: profile?.displayName || "Musician",
        submittedByUid: null,
        submittedByName: "",
        submittedOnBehalf: false,
        rationale: suggestRationale.trim(),
        reviewedByUid: null,
        reviewedByName: null,
        reviewedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const validated = DonationSchema.parse(payload);
      await setDoc(doc(db, "donations", id), validated);

      toast.success("Charitable suggestion submitted! Thank you for helping our community.");
      setIsSuggestModalOpen(false);
      setSuggestOrgName("");
      setSuggestWebsite("");
      setSuggestTargetAmount("");
      setSuggestRationale("");
    } catch (err) {
      toast.error("Failed to submit suggestion: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsSubmittingSuggestion(false);
    }
  };

  // Manager: Record Direct Donation
  const handleRecordDonation = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(recAmount);
    if (isNaN(numAmount) || numAmount < 0) {
      toast.error("Please enter a valid donation amount.");
      return;
    }
    if (!recOrgName.trim()) {
      toast.error("Please enter an organization name.");
      return;
    }

    setIsRecordingDonation(true);
    try {
      const id = `donation_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      let suggestedByName = "";
      let suggestedByUid: string | null = null;
      let submittedOnBehalf = false;

      if (recAttributedMemberUid) {
        const member = rosterMembers.find((u) => u.uid === recAttributedMemberUid);
        if (member) {
          suggestedByName = member.displayName || member.realName || "Musician";
          suggestedByUid = member.uid;
          submittedOnBehalf = true;
        }
      }

      const payload: Donation = {
        id,
        organizationName: recOrgName.trim(),
        causeDescription: recCauseDesc.trim(),
        websiteUrl: recWebsite.trim(),
        category: recCategory,
        amount: Number(numAmount.toFixed(2)),
        targetAmount: Number(numAmount.toFixed(2)),
        dateDonated: recDate,
        fiscalYear: recFiscalYear,
        status: "completed",
        isPublic: recIsPublic,
        publicImpactNote: recImpactNote.trim(),
        notes: recInternalNotes.trim(),
        suggestedByUid,
        suggestedByName,
        submittedByUid: profile?.uid || null,
        submittedByName: profile?.displayName || "Treasurer",
        submittedOnBehalf,
        rationale: recCauseDesc.trim(),
        reviewedByUid: profile?.uid || null,
        reviewedByName: profile?.displayName || "Treasurer",
        reviewedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const validated = DonationSchema.parse(payload);
      await setDoc(doc(db, "donations", id), validated);

      toast.success("Charitable donation recorded.");
      setIsRecordDonationModalOpen(false);
      setRecOrgName("");
      setRecCauseDesc("");
      setRecWebsite("");
      setRecAmount("100");
      setRecImpactNote("");
      setRecInternalNotes("");
      setRecAttributedMemberUid("");
    } catch (err) {
      toast.error("Failed to record donation: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsRecordingDonation(false);
    }
  };

  // Manager: Approve Reimbursement
  const handleApproveReimbursement = async (reimb: Reimbursement) => {
    try {
      await updateDoc(doc(db, "reimbursements", reimb.id), {
        status: "approved",
        reviewedByName: profile?.displayName || "Treasurer",
        reviewedByUid: profile?.uid || null,
        reviewedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      toast.success(`Approved claim for ${reimb.applicantName}.`);
    } catch (err) {
      toast.error("Failed to approve claim: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  // Manager: Confirm Reject Reimbursement
  const handleConfirmReject = async () => {
    if (!reimbToReject) return;
    if (!rejectReason.trim()) {
      toast.error("Please provide a reason for rejecting this claim.");
      return;
    }
    setIsReviewingReimb(true);
    try {
      await updateDoc(doc(db, "reimbursements", reimbToReject.id), {
        status: "rejected",
        reviewNotes: rejectReason.trim(),
        reviewedByName: profile?.displayName || "Treasurer",
        reviewedByUid: profile?.uid || null,
        reviewedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      setReimbToReject(null);
      setRejectReason("");
      toast.success("Reimbursement claim marked as rejected.");
    } catch (err) {
      toast.error("Failed to reject claim: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsReviewingReimb(false);
    }
  };

  // Manager: Confirm Pay Out Reimbursement
  const handleConfirmPayOut = async () => {
    if (!reimbToPay) return;
    setIsReviewingReimb(true);
    try {
      const batch = writeBatch(db);
      const timestamp = new Date().toISOString();
      const txId = `tx_reimb_${reimbToPay.id}_${Date.now()}`;

      // 1. Ledger Transaction
      const txPayload = {
        id: txId,
        type: "expense",
        category: reimbToPay.category,
        amount: Number(reimbToPay.amount.toFixed(2)),
        description: `Reimbursement: ${reimbToPay.applicantName} - ${reimbToPay.description.slice(0, 40)}`,
        date: payDate || timestamp.split("T")[0],
        gigId: reimbToPay.gigId || null,
        gigTitle: reimbToPay.gigTitle || null,
        recordedBy: profile?.displayName || "Treasurer",
        notes: payReference ? `Payout Ref: ${payReference}` : "Paid via Reimbursement Hub",
        schemaVersion: 1,
        createdAt: timestamp,
      };
      batch.set(doc(db, "transactions", txId), txPayload);

      // 2. Mark Reimbursement Paid
      batch.update(doc(db, "reimbursements", reimbToPay.id), {
        status: "paid",
        paidAt: timestamp,
        payoutReference: payReference.trim() || "Completed",
        transactionId: txId,
        reviewedByName: profile?.displayName || "Treasurer",
        reviewedByUid: profile?.uid || null,
        reviewedAt: timestamp,
        updatedAt: timestamp,
      });

      await batch.commit();
      toast.success(`Payout recorded for ${reimbToPay.applicantName}!`);
      setReimbToPay(null);
      setPayReference("");
    } catch (err) {
      toast.error("Failed to complete payout: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsReviewingReimb(false);
    }
  };

  // Manager: Save Baseline
  const handleSaveBaseline = async () => {
    setIsSavingBaseline(true);
    try {
      const payload: TreasuryConfig = {
        startingBalance: Number(tempBaseline.toFixed(2)),
        startingDate: tempBaselineDate || new Date().toISOString().split("T")[0],
        lastUpdated: new Date().toISOString(),
        notes: "Audited starting balance",
        schemaVersion: 1,
      };
      await setDoc(doc(db, "settings", "treasury"), payload);
      setTreasuryConfig(payload);
      toast.success("Treasury baseline balance updated.");
      setIsBaselineModalOpen(false);
    } catch (err) {
      toast.error("Failed to update baseline: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsSavingBaseline(false);
    }
  };

  // Manager: Add Manual Transaction
  const handleRecordTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(txAmount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error("Please enter a valid transaction amount.");
      return;
    }
    if (!txDescription.trim()) {
      toast.error("Please enter a transaction description.");
      return;
    }

    setIsSubmittingTx(true);
    try {
      const txId = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const selectedGig = gigs.find((g) => g.id === txGigId);

      const payload = {
        id: txId,
        type: txType,
        category: txCategory,
        amount: Number(numAmount.toFixed(2)),
        description: txDescription.trim(),
        date: txDate,
        gigId: txGigId || null,
        gigTitle: selectedGig ? selectedGig.title : null,
        recordedBy: profile?.displayName || "Treasurer",
        notes: txNotes.trim() ? txNotes.trim() : null,
        schemaVersion: 1,
        createdAt: new Date().toISOString(),
      };

      await setDoc(doc(db, "transactions", txId), payload);
      toast.success("Transaction entry recorded.");
      setIsRecordTxModalOpen(false);
      setTxAmount("");
      setTxDescription("");
      setTxNotes("");
      setTxGigId("");
    } catch (err) {
      toast.error("Failed to record entry: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsSubmittingTx(false);
    }
  };

  // Manager: Delete Transaction
  const handleDeleteTransaction = async (txId: string) => {
    if (!window.confirm("Are you sure you want to delete this ledger transaction? This will affect the net balance.")) return;
    try {
      await deleteDoc(doc(db, "transactions", txId));
      toast.success("Transaction removed from ledger.");
    } catch (err) {
      toast.error("Failed to delete transaction: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  // Filtered Ledger
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      const matchesSearch =
        !ledgerSearch ||
        t.description.toLowerCase().includes(ledgerSearch.toLowerCase()) ||
        (t.notes && t.notes.toLowerCase().includes(ledgerSearch.toLowerCase())) ||
        (t.gigTitle && t.gigTitle.toLowerCase().includes(ledgerSearch.toLowerCase()));
      const matchesType = ledgerTypeFilter === "all" || t.type === ledgerTypeFilter;
      return matchesSearch && matchesType;
    });
  }, [transactions, ledgerSearch, ledgerTypeFilter]);

  // Filtered Donations
  const filteredDonations = useMemo(() => {
    return donations.filter((d) => {
      const matchesSearch =
        !givingSearchQuery ||
        d.organizationName.toLowerCase().includes(givingSearchQuery.toLowerCase()) ||
        d.causeDescription.toLowerCase().includes(givingSearchQuery.toLowerCase()) ||
        d.publicImpactNote.toLowerCase().includes(givingSearchQuery.toLowerCase());
      const matchesCategory = givingCategoryFilter === "all" || d.category === givingCategoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [donations, givingSearchQuery, givingCategoryFilter]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Universal Breadcrumb */}
      <PortalBreadcrumb className="mb-2" />

      {/* Main Finance Header */}
      <div className="relative overflow-hidden rounded-3xl bg-slate-900/80 border border-slate-800 p-6 sm:p-8 backdrop-blur shadow-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-yellow-400/10 border border-yellow-400/30 text-yellow-400 flex items-center justify-center shrink-0 shadow-inner">
              <DollarSign className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-yellow-400/10 text-yellow-400 border border-yellow-400/20">
                  Treasury &amp; Finance Hub
                </span>
                {isManager ? (
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" />
                    <span>Treasurer Controls Active</span>
                  </span>
                ) : (
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                    Musician Portal View
                  </span>
                )}
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight">
                Eagleburger Band Financial Hub
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 max-w-2xl leading-relaxed">
                Centralized band treasury overview, musician expense reimbursements, charitable giving, and operational ledger.
              </p>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={() => openCreateReimbursementModal(false)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold text-xs uppercase tracking-wider transition shadow-lg shadow-yellow-400/10 cursor-pointer"
            >
              <Receipt className="w-4 h-4" />
              <span>Submit Reimbursement</span>
            </button>
            <button
              type="button"
              onClick={() => setIsSuggestModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs uppercase tracking-wider transition cursor-pointer"
            >
              <HeartHandshake className="w-4 h-4 text-rose-400" />
              <span>Suggest Cause</span>
            </button>
            {isManager && (
              <button
                type="button"
                onClick={() => openCreateReimbursementModal(true)}
                className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/30 font-bold text-xs uppercase tracking-wider transition cursor-pointer"
              >
                <Users className="w-4 h-4" />
                <span>Submit on Behalf</span>
              </button>
            )}
          </div>
        </div>

        {/* Tab Navigation Bar */}
        <div className="mt-8 pt-4 border-t border-slate-800/80 flex items-center gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => switchTab("treasury")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              activeTab === "treasury"
                ? "bg-yellow-400 text-slate-950 shadow-md font-black"
                : "text-slate-400 hover:text-white hover:bg-slate-800/60"
            }`}
          >
            <DollarSign className="w-4 h-4" />
            <span>Treasury Overview</span>
          </button>

          <button
            type="button"
            onClick={() => switchTab("reimbursements")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              activeTab === "reimbursements"
                ? "bg-yellow-400 text-slate-950 shadow-md font-black"
                : "text-slate-400 hover:text-white hover:bg-slate-800/60"
            }`}
          >
            <Receipt className="w-4 h-4" />
            <span>Expense Reimbursements</span>
            {isManager && reimbursements.filter((r) => r.status === "submitted").length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-rose-500 text-white font-bold">
                {reimbursements.filter((r) => r.status === "submitted").length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => switchTab("giving")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              activeTab === "giving"
                ? "bg-yellow-400 text-slate-950 shadow-md font-black"
                : "text-slate-400 hover:text-white hover:bg-slate-800/60"
            }`}
          >
            <HeartHandshake className="w-4 h-4" />
            <span>Charitable Giving</span>
            {donations.filter((d) => d.status === "suggested").length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-blue-500 text-white font-bold">
                {donations.filter((d) => d.status === "suggested").length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => switchTab("ledger")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              activeTab === "ledger"
                ? "bg-yellow-400 text-slate-950 shadow-md font-black"
                : "text-slate-400 hover:text-white hover:bg-slate-800/60"
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Financial Ledger</span>
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* TAB 1: TREASURY OVERVIEW                                      */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "treasury" && (
        <div className="space-y-6">
          {/* Key Metric Tiles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Operating Balance */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2 relative overflow-hidden shadow-lg">
              <div className="flex items-center justify-between text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
                <span>Band Fund Reserve</span>
                <DollarSign className="w-4 h-4 text-yellow-400" />
              </div>
              <div className="text-3xl font-black text-white font-mono tracking-tight">
                ${currentBalance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <p className="text-[11px] text-slate-400">
                Operating reserve after baseline, gig payouts, and reimbursed receipts.
              </p>
            </div>

            {/* Total Inflows */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2 relative overflow-hidden shadow-lg">
              <div className="flex items-center justify-between text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
                <span>Total Inflows</span>
                <TrendingUp className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-3xl font-black text-emerald-400 font-mono tracking-tight">
                +${totalInflows.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <p className="text-[11px] text-slate-400">
                Gig performance fees, merchandise sales, and tip contributions.
              </p>
            </div>

            {/* Total Outflows */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2 relative overflow-hidden shadow-lg">
              <div className="flex items-center justify-between text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
                <span>Total Expenses</span>
                <TrendingDown className="w-4 h-4 text-rose-400" />
              </div>
              <div className="text-3xl font-black text-rose-400 font-mono tracking-tight">
                -${totalOutflows.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <p className="text-[11px] text-slate-400">
                Equipment repairs, travel gas, band lunch, practice space, and uniforms.
              </p>
            </div>

            {/* Philanthropy */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2 relative overflow-hidden shadow-lg">
              <div className="flex items-center justify-between text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
                <span>Community Giving</span>
                <HeartHandshake className="w-4 h-4 text-purple-400" />
              </div>
              <div className="text-3xl font-black text-purple-400 font-mono tracking-tight">
                ${totalPhilanthropy.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <p className="text-[11px] text-slate-400">
                Philanthropic donations disbursed to Pittsburgh grassroots organizations.
              </p>
            </div>
          </div>

          {/* Baseline & Manager Operations Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Baseline Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-lg md:col-span-1">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-black text-white uppercase tracking-tight flex items-center gap-2">
                  <Coins className="w-4 h-4 text-yellow-400" />
                  <span>Treasury Baseline</span>
                </h2>
                {isManager && (
                  <button
                    type="button"
                    onClick={() => {
                      setTempBaseline(treasuryConfig.startingBalance || 0);
                      setTempBaselineDate(treasuryConfig.startingDate || new Date().toISOString().split("T")[0]);
                      setIsBaselineModalOpen(true);
                    }}
                    className="text-xs font-bold text-yellow-400 hover:underline cursor-pointer"
                  >
                    Adjust
                  </button>
                )}
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 space-y-2">
                <div className="text-xs text-slate-400">Baseline Starting Balance</div>
                <div className="text-2xl font-black text-white font-mono">
                  ${(treasuryConfig.startingBalance || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </div>
                <div className="text-[11px] text-slate-500 font-mono">
                  Effective Since: {treasuryConfig.startingDate || "2026-01-01"}
                </div>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">
                The baseline represents the verified audited cash and checking reserve established at season rollover.
              </p>
            </div>

            {/* Quick Actions & Settlement Hub */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-lg md:col-span-2">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-black text-white uppercase tracking-tight flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-yellow-400" />
                  <span>Treasury Operations &amp; Settlements</span>
                </h2>
                <span className="text-xs font-mono text-slate-400">
                  Disbursement Ready
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">Expense Reimbursements</span>
                    <Receipt className="w-4 h-4 text-yellow-400" />
                  </div>
                  <p className="text-xs text-slate-400">
                    {totalOpenReimbursements > 0
                      ? `$${totalOpenReimbursements.toFixed(2)} pending in review queue.`
                      : "No pending member expense claims."}
                  </p>
                  <button
                    type="button"
                    onClick={() => switchTab("reimbursements")}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-yellow-400 hover:underline pt-1 cursor-pointer"
                  >
                    <span>View Reimbursement Queue</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">Philanthropic Grants</span>
                    <HeartHandshake className="w-4 h-4 text-purple-400" />
                  </div>
                  <p className="text-xs text-slate-400">
                    {donations.filter((d) => d.status === "suggested").length > 0
                      ? `${donations.filter((d) => d.status === "suggested").length} community causes suggested by bandmates.`
                      : "All member suggestions triaged."}
                  </p>
                  <button
                    type="button"
                    onClick={() => switchTab("giving")}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-purple-400 hover:underline pt-1 cursor-pointer"
                  >
                    <span>Explore Giving &amp; Suggestions</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {isManager && (
                <div className="pt-2 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsRecordTxModalOpen(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold border border-slate-700 cursor-pointer"
                  >
                    <PlusCircle className="w-4 h-4 text-yellow-400" />
                    <span>Record Manual Transaction</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Recent Ledger Preview */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-lg">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black text-white uppercase tracking-tight flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-yellow-400" />
                <span>Recent Financial Activity</span>
              </h2>
              <button
                type="button"
                onClick={() => switchTab("ledger")}
                className="text-xs font-bold text-yellow-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>View Complete Ledger ({transactions.length})</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {transactions.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-500 font-mono">
                No ledger transactions recorded yet.
              </div>
            ) : (
              <div className="divide-y divide-slate-800/80">
                {transactions.slice(0, 5).map((tx) => (
                  <div key={tx.id} className="py-3 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                          tx.type === "income"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                        }`}
                      >
                        {tx.type === "income" ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white truncate">{tx.description}</div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-2">
                          <span>{tx.date}</span>
                          <span>•</span>
                          <span className="capitalize">{tx.category.replace(/_/g, " ")}</span>
                          {tx.gigTitle && (
                            <>
                              <span>•</span>
                              <span className="text-yellow-400 truncate">{tx.gigTitle}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div
                        className={`text-sm font-bold font-mono ${
                          tx.type === "income" ? "text-emerald-400" : "text-rose-400"
                        }`}
                      >
                        {tx.type === "income" ? "+" : "-"}${tx.amount.toFixed(2)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 2: EXPENSE REIMBURSEMENTS                                */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "reimbursements" && (
        <div className="space-y-6">
          {/* Header Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-white uppercase tracking-tight">
                Expense Reimbursements
              </h2>
              <p className="text-xs text-slate-400">
                Submit claims with your Display Name, attach receipts, and track direct disbursement status.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => openCreateReimbursementModal(false)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold text-xs uppercase tracking-wider transition cursor-pointer shadow-lg shadow-yellow-400/10"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Submit My Receipt</span>
              </button>

              {isManager && (
                <button
                  type="button"
                  onClick={() => openCreateReimbursementModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/30 font-bold text-xs uppercase tracking-wider transition cursor-pointer"
                >
                  <Users className="w-4 h-4" />
                  <span>Submit on Behalf</span>
                </button>
              )}
            </div>
          </div>

          {/* Manager Review Queue (Visible only to treasurers/admins) */}
          {isManager && (
            <div className="bg-slate-900 border border-purple-500/30 rounded-2xl p-6 space-y-4 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-purple-400" />
                  <h3 className="text-sm font-black text-white uppercase tracking-tight">
                    Treasurer Review &amp; Payout Queue
                  </h3>
                </div>

                {/* Filter Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                  {["all", "submitted", "approved", "paid", "rejected"].map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setReimbStatusFilter(st)}
                      className={`px-2.5 py-1 rounded-lg font-mono capitalize transition cursor-pointer ${
                        reimbStatusFilter === st
                          ? "bg-purple-500 text-white font-bold"
                          : "bg-slate-800 text-slate-400 hover:text-white"
                      }`}
                    >
                      {st} ({st === "all" ? reimbursements.length : reimbursements.filter((r) => r.status === st).length})
                    </button>
                  ))}
                </div>
              </div>

              {reimbursements.filter((r) => reimbStatusFilter === "all" || r.status === reimbStatusFilter).length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-500 font-mono">
                  No claims found matching this status filter.
                </div>
              ) : (
                <div className="divide-y divide-slate-800/80">
                  {reimbursements
                    .filter((r) => reimbStatusFilter === "all" || r.status === reimbStatusFilter)
                    .map((reimb) => (
                      <div key={reimb.id} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-1.5 min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-white text-sm">
                              {reimb.applicantName}
                            </span>
                            {reimb.submittedOnBehalf && (
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/15 text-purple-300 border border-purple-500/30">
                                Submitted by {reimb.submittedByName || "Manager"}
                              </span>
                            )}
                            <span
                              className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                                reimb.status === "paid"
                                  ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                                  : reimb.status === "approved"
                                  ? "bg-blue-500/15 text-blue-400 border border-blue-500/30"
                                  : reimb.status === "rejected"
                                  ? "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                                  : "bg-yellow-400/15 text-yellow-300 border border-yellow-400/30"
                              }`}
                            >
                              {reimb.status}
                            </span>
                          </div>

                          <div className="text-xs text-slate-300 leading-relaxed">
                            {reimb.description}
                          </div>

                          <div className="flex items-center gap-3 text-[11px] text-slate-400 flex-wrap">
                            <span>Date: {reimb.expenseDate}</span>
                            <span>•</span>
                            <span>Category: {CATEGORY_LABELS[reimb.category] || reimb.category}</span>
                            <span>•</span>
                            <span className="text-yellow-400">
                              Method: {reimb.paymentMethod.toUpperCase()} ({reimb.paymentHandle || "No handle"})
                            </span>
                            {reimb.receiptUrl && (
                              <>
                                <span>•</span>
                                <a
                                  href={reimb.receiptUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-400 hover:underline inline-flex items-center gap-1"
                                >
                                  <span>View Receipt</span>
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Amount & Actions */}
                        <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
                          <div className="text-right">
                            <div className="text-base font-black text-white font-mono">
                              ${reimb.amount.toFixed(2)}
                            </div>
                          </div>

                          {reimb.status === "submitted" && (
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleApproveReimbursement(reimb)}
                                className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition cursor-pointer"
                              >
                                Approve
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setReimbToReject(reimb);
                                  setRejectReason("");
                                }}
                                className="px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-bold transition cursor-pointer"
                              >
                                Reject
                              </button>
                            </div>
                          )}

                          {reimb.status === "approved" && (
                            <button
                              type="button"
                              onClick={() => {
                                setReimbToPay(reimb);
                                setPayReference("");
                              }}
                              className="px-3 py-1.5 rounded-lg bg-yellow-400 hover:bg-yellow-300 text-slate-950 text-xs font-black uppercase tracking-wider transition cursor-pointer"
                            >
                              Pay Out
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}

          {/* Member's Personal Reimbursements History */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-lg">
            <h3 className="text-sm font-black text-white uppercase tracking-tight flex items-center gap-2">
              <Receipt className="w-4 h-4 text-yellow-400" />
              <span>My Reimbursement Claims ({myReimbursements.length})</span>
            </h3>

            {myReimbursements.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-500 font-mono">
                You have not submitted any expense reimbursement claims yet.
              </div>
            ) : (
              <div className="divide-y divide-slate-800/80">
                {myReimbursements.map((reimb) => (
                  <div key={reimb.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-white">{reimb.description}</span>
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                            reimb.status === "paid"
                              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                              : reimb.status === "approved"
                              ? "bg-blue-500/15 text-blue-400 border border-blue-500/30"
                              : reimb.status === "rejected"
                              ? "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                              : "bg-yellow-400/15 text-yellow-300 border border-yellow-400/30"
                          }`}
                        >
                          {reimb.status}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 flex items-center gap-2 flex-wrap">
                        <span>Submitted by: {reimb.applicantName}</span>
                        <span>•</span>
                        <span>{reimb.expenseDate}</span>
                        <span>•</span>
                        <span>{CATEGORY_LABELS[reimb.category] || reimb.category}</span>
                        <span>•</span>
                        <span>Payout: {reimb.paymentMethod.toUpperCase()}</span>
                      </div>
                      {reimb.reviewNotes && (
                        <div className="text-xs text-rose-300/90 bg-rose-500/10 p-2 rounded-lg border border-rose-500/20 mt-1">
                          Review Note: {reimb.reviewNotes}
                        </div>
                      )}
                      {reimb.payoutReference && (
                        <div className="text-xs text-emerald-300/90 font-mono">
                          Disbursement Ref: {reimb.payoutReference}
                        </div>
                      )}
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-base font-black text-white font-mono">
                        ${reimb.amount.toFixed(2)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 3: CHARITABLE GIVING & SUGGESTIONS                       */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "giving" && (
        <div className="space-y-6">
          {/* Header Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-white uppercase tracking-tight">
                Charitable Philanthropy &amp; Community Causes
              </h2>
              <p className="text-xs text-slate-400">
                Explore grassroots organizations the band funds, and suggest new causes with your Display Name.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsSuggestModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold text-xs uppercase tracking-wider transition cursor-pointer shadow-lg shadow-yellow-400/10"
              >
                <HeartHandshake className="w-4 h-4" />
                <span>Suggest a Charitable Cause</span>
              </button>

              {isManager && (
                <button
                  type="button"
                  onClick={() => setIsRecordDonationModalOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/30 font-bold text-xs uppercase tracking-wider transition cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Record Direct Donation</span>
                </button>
              )}
            </div>
          </div>

          {/* Member Suggestions Showcase / Triage */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-white uppercase tracking-tight flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-yellow-400" />
                <span>Causes Suggested by Band Members ({donations.filter((d) => d.status === "suggested").length})</span>
              </h3>
            </div>

            {donations.filter((d) => d.status === "suggested").length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-500 font-mono">
                No active member suggestions awaiting review. Have a cause you love? Suggest one above!
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {donations
                  .filter((d) => d.status === "suggested")
                  .map((sug) => (
                    <div
                      key={sug.id}
                      className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 space-y-2.5 relative"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-sm font-bold text-white">{sug.organizationName}</div>
                          <div className="text-[11px] text-slate-400">
                            Suggested by <strong className="text-yellow-400">{sug.suggestedByName || "Bandmate"}</strong>
                          </div>
                        </div>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/15 text-blue-400 border border-blue-500/30 uppercase font-bold">
                          Suggestion
                        </span>
                      </div>

                      <p className="text-xs text-slate-300 leading-relaxed italic">
                        &ldquo;{sug.rationale || sug.causeDescription}&rdquo;
                      </p>

                      <div className="flex items-center justify-between pt-1 text-[11px] text-slate-400">
                        <span className="capitalize">{sug.category.replace(/_/g, " ")}</span>
                        {sug.websiteUrl && (
                          <a
                            href={sug.websiteUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:underline inline-flex items-center gap-1"
                          >
                            <span>Website</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>

                      {isManager && (
                        <div className="pt-2 border-t border-slate-800 flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                await updateDoc(doc(db, "donations", sug.id), {
                                  status: "completed",
                                  reviewedByName: profile?.displayName || "Treasurer",
                                  reviewedByUid: profile?.uid || null,
                                  reviewedAt: new Date().toISOString(),
                                  updatedAt: new Date().toISOString(),
                                });
                                toast.success(`Approved and activated donation for ${sug.organizationName}.`);
                              } catch (err) {
                                toast.error("Failed to approve suggestion.");
                              }
                            }}
                            className="px-2.5 py-1 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-bold cursor-pointer"
                          >
                            Approve &amp; Activate
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* Supported Beneficiaries Directory */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h3 className="text-sm font-black text-white uppercase tracking-tight flex items-center gap-2">
                <Building className="w-4 h-4 text-yellow-400" />
                <span>Supported Beneficiaries ({donations.filter((d) => d.status === "completed").length})</span>
              </h3>

              {/* Search & Filter */}
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={givingSearchQuery}
                    onChange={(e) => setGivingSearchQuery(e.target.value)}
                    placeholder="Search causes..."
                    className="pl-8 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400"
                  />
                </div>
              </div>
            </div>

            {filteredDonations.filter((d) => d.status === "completed").length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-500 font-mono">
                No active beneficiary organizations found matching search criteria.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredDonations
                  .filter((d) => d.status === "completed")
                  .map((ben) => {
                    const catBadge = DONATION_CATEGORY_LABELS[ben.category] || {
                      label: ben.category,
                      color: "bg-slate-800 text-slate-300 border-slate-700",
                    };
                    return (
                      <div
                        key={ben.id}
                        className="bg-slate-950 border border-slate-800/80 rounded-2xl p-5 space-y-3 flex flex-col justify-between shadow-md"
                      >
                        <div className="space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <span className={`text-[10px] font-mono px-2 py-0.5 rounded border uppercase font-bold ${catBadge.color}`}>
                              {catBadge.label}
                            </span>
                            <span className="text-[11px] font-mono text-slate-500">{ben.fiscalYear}</span>
                          </div>

                          <h4 className="text-base font-bold text-white">{ben.organizationName}</h4>

                          <p className="text-xs text-slate-300 leading-relaxed line-clamp-3">
                            {ben.publicImpactNote || ben.causeDescription}
                          </p>

                          {ben.suggestedByName && (
                            <div className="text-[11px] text-slate-400">
                              Suggested by: <span className="text-yellow-400 font-bold">{ben.suggestedByName}</span>
                            </div>
                          )}
                        </div>

                        <div className="pt-3 border-t border-slate-900 flex items-center justify-between text-xs">
                          {isManager ? (
                            <span className="font-mono font-bold text-emerald-400">${ben.amount.toFixed(2)}</span>
                          ) : (
                            <span className="text-[11px] text-slate-500">Funded Partner</span>
                          )}

                          {ben.websiteUrl && (
                            <a
                              href={ben.websiteUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-400 hover:underline inline-flex items-center gap-1"
                            >
                              <span>Website</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 4: FINANCIAL LEDGER                                      */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "ledger" && (
        <div className="space-y-6">
          {/* Header & Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-white uppercase tracking-tight">
                General Financial Ledger
              </h2>
              <p className="text-xs text-slate-400">
                Transparent chronological ledger of all band revenues, disbursements, and receipts.
              </p>
            </div>

            {isManager && (
              <button
                type="button"
                onClick={() => setIsRecordTxModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold text-xs uppercase tracking-wider transition cursor-pointer shadow-lg shadow-yellow-400/10"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Record Transaction</span>
              </button>
            )}
          </div>

          {/* Ledger Table & Filters Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
            {/* Filter Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={ledgerSearch}
                    onChange={(e) => setLedgerSearch(e.target.value)}
                    placeholder="Search ledger..."
                    className="pl-8 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400"
                  />
                </div>

                <div className="flex items-center gap-1 text-xs">
                  {["all", "income", "expense"].map((tp) => (
                    <button
                      key={tp}
                      type="button"
                      onClick={() => setLedgerTypeFilter(tp)}
                      className={`px-3 py-1 rounded-lg capitalize transition cursor-pointer font-bold ${
                        ledgerTypeFilter === tp
                          ? "bg-yellow-400 text-slate-950"
                          : "bg-slate-800 text-slate-400 hover:text-white"
                      }`}
                    >
                      {tp}
                    </button>
                  ))}
                </div>
              </div>

              <div className="text-xs font-mono text-slate-400">
                Showing {filteredTransactions.length} of {transactions.length} entries
              </div>
            </div>

            {/* Table */}
            {filteredTransactions.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-500 font-mono">
                No ledger transactions found matching filters.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400">
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Description</th>
                      <th className="py-2.5 px-3">Category</th>
                      <th className="py-2.5 px-3">Recorded By</th>
                      <th className="py-2.5 px-3 text-right">Amount</th>
                      {isManager && <th className="py-2.5 px-3 text-center">Action</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {filteredTransactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-800/30 transition">
                        <td className="py-3 px-3 font-mono text-slate-400 whitespace-nowrap">{tx.date}</td>
                        <td className="py-3 px-3">
                          <div className="font-bold text-white">{tx.description}</div>
                          {tx.notes && <div className="text-[11px] text-slate-400">{tx.notes}</div>}
                          {tx.gigTitle && <div className="text-[11px] text-yellow-400/90">{tx.gigTitle}</div>}
                        </td>
                        <td className="py-3 px-3">
                          <span className="capitalize font-mono text-[11px] px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-300">
                            {tx.category.replace(/_/g, " ")}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-400 font-mono text-[11px]">{tx.recordedBy}</td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-sm whitespace-nowrap">
                          <span className={tx.type === "income" ? "text-emerald-400" : "text-rose-400"}>
                            {tx.type === "income" ? "+" : "-"}${tx.amount.toFixed(2)}
                          </span>
                        </td>
                        {isManager && (
                          <td className="py-3 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleDeleteTransaction(tx.id)}
                              className="text-slate-500 hover:text-rose-400 transition p-1 cursor-pointer"
                              title="Delete transaction"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: SUBMIT REIMBURSEMENT (SELF OR ON BEHALF)               */}
      {/* ------------------------------------------------------------- */}
      {isReimbModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-yellow-400" />
                <h3 className="text-base font-black text-white uppercase tracking-tight">
                  {isOnBehalfMode ? "Submit on Behalf of Musician" : "Submit Expense Reimbursement"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsReimbModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitReimbursement} className="space-y-4">
              {/* Member Selection if in On-Behalf Mode */}
              {isOnBehalfMode ? (
                <div className="space-y-1 p-3 bg-purple-500/10 border border-purple-500/30 rounded-xl">
                  <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-purple-300">
                    Select Musician to Reimburse *
                  </label>
                  <select
                    value={selectedBehalfMemberUid}
                    onChange={(e) => handleSelectBehalfMember(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-400"
                  >
                    <option value="">-- Choose active band member --</option>
                    {rosterMembers.map((m) => (
                      <option key={m.uid} value={m.uid}>
                        {m.displayName || m.realName || "Musician"} ({m.email})
                      </option>
                    ))}
                  </select>
                  <div className="text-[10px] text-purple-300/80 pt-1">
                    This submission will be recorded as submitted by <strong className="text-white">{profile?.displayName}</strong> on behalf of this musician.
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs flex items-center justify-between">
                  <span className="text-slate-400">Claimant:</span>
                  <span className="font-bold text-yellow-400">{profile?.displayName || "Musician"}</span>
                </div>
              )}

              {/* Amount & Date */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-slate-300">
                    Amount ($ USD) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    placeholder="45.50"
                    value={reimbAmount}
                    onChange={(e) => setReimbAmount(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-400 font-mono font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <DatePicker
                    label="Expense Date *"
                    value={reimbDate}
                    onChange={setReimbDate}
                  />
                </div>
              </div>

              {/* Category */}
              <div className="space-y-1">
                <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-slate-300">
                  Category *
                </label>
                <select
                  value={reimbCategory}
                  onChange={(e) => setReimbCategory(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400"
                >
                  {ExpenseCategoryEnum.options.map((cat) => (
                    <option key={cat} value={cat}>
                      {CATEGORY_LABELS[cat] || cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-slate-300">
                  Expense Description *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Drum heads replacement, gaffer tape, band lunch, etc."
                  value={reimbDescription}
                  onChange={(e) => setReimbDescription(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400"
                />
              </div>

              {/* Related Gig */}
              <div className="space-y-1">
                <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-slate-300">
                  Associated Gig (Optional)
                </label>
                <select
                  value={reimbGigId}
                  onChange={(e) => setReimbGigId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400"
                >
                  <option value="">-- No specific gig / general rehearsal expense --</option>
                  {gigs.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.date} — {g.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Receipt URL / Note */}
              <div className="space-y-1">
                <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-slate-300">
                  Receipt Photo or Drive Link
                </label>
                <input
                  type="url"
                  placeholder="https://drive.google.com/... or image link"
                  value={reimbReceiptUrl}
                  onChange={(e) => setReimbReceiptUrl(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400"
                />
              </div>

              {/* Payout Details */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="space-y-1">
                  <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-slate-300">
                    Payout Method
                  </label>
                  <select
                    value={reimbPayoutMethod}
                    onChange={(e) => setReimbPayoutMethod(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400 uppercase"
                  >
                    {PayoutMethodEnum.options.map((m) => (
                      <option key={m} value={m}>
                        {m.toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-slate-300">
                    Handle / Payee ID
                  </label>
                  <input
                    type="text"
                    placeholder="@username or email"
                    value={reimbPayoutHandle}
                    onChange={(e) => setReimbPayoutHandle(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsReimbModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReimb}
                  className="px-5 py-2 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-slate-950 text-xs font-black uppercase tracking-wider transition disabled:opacity-50"
                >
                  {isSubmittingReimb ? "Recording..." : isOnBehalfMode ? "Submit on Behalf" : "Submit Receipt Claim"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: SUGGEST A CHARITABLE CAUSE                             */}
      {/* ------------------------------------------------------------- */}
      {isSuggestModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <HeartHandshake className="w-5 h-5 text-rose-400" />
                <h3 className="text-base font-black text-white uppercase tracking-tight">
                  Suggest a Charitable Cause
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsSuggestModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitSuggestion} className="space-y-4">
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs flex items-center justify-between">
                <span className="text-slate-400">Suggested By:</span>
                <span className="font-bold text-yellow-400">{profile?.displayName || "Musician"}</span>
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-slate-300">
                  Organization / Grassroots Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Pittsburgh Youth Symphony Orchestra, 412 Food Rescue"
                  value={suggestOrgName}
                  onChange={(e) => setSuggestOrgName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400 font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-slate-300">
                    Category *
                  </label>
                  <select
                    value={suggestCategory}
                    onChange={(e) => setSuggestCategory(e.target.value as DonationCategory)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400"
                  >
                    {DonationCategoryEnum.options.map((cat) => (
                      <option key={cat} value={cat}>
                        {DONATION_CATEGORY_LABELS[cat]?.label || cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-slate-300">
                    Suggested Target ($ USD)
                  </label>
                  <input
                    type="number"
                    step="25"
                    placeholder="250"
                    value={suggestTargetAmount}
                    onChange={(e) => setSuggestTargetAmount(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400 font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-slate-300">
                  Website / Social Link
                </label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={suggestWebsite}
                  onChange={(e) => setSuggestWebsite(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-slate-300">
                  Why Should the Band Support This Cause? *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Explain their impact on the community, local connections, or why this cause is meaningful to you..."
                  value={suggestRationale}
                  onChange={(e) => setSuggestRationale(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-yellow-400 leading-relaxed"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsSuggestModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingSuggestion}
                  className="px-5 py-2 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-slate-950 text-xs font-black uppercase tracking-wider transition disabled:opacity-50"
                >
                  {isSubmittingSuggestion ? "Submitting..." : "Submit Suggestion"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: MANAGER RECORD DIRECT DONATION                         */}
      {/* ------------------------------------------------------------- */}
      {isRecordDonationModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <HeartHandshake className="w-5 h-5 text-purple-400" />
                <h3 className="text-base font-black text-white uppercase tracking-tight">
                  Record Band Philanthropic Donation
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsRecordDonationModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRecordDonation} className="space-y-4">
              <div className="space-y-1">
                <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-slate-300">
                  Attributed Musician Suggestion (Optional)
                </label>
                <select
                  value={recAttributedMemberUid}
                  onChange={(e) => setRecAttributedMemberUid(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400"
                >
                  <option value="">-- General band grant (no specific member attribution) --</option>
                  {rosterMembers.map((m) => (
                    <option key={m.uid} value={m.uid}>
                      Suggested by {m.displayName || m.realName || "Musician"}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-slate-300">
                  Beneficiary Organization Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Pittsburgh Arts Coalition"
                  value={recOrgName}
                  onChange={(e) => setRecOrgName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400 font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-slate-300">
                    Amount ($ USD) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={recAmount}
                    onChange={(e) => setRecAmount(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400 font-mono font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <DatePicker
                    label="Date Donated *"
                    value={recDate}
                    onChange={setRecDate}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-slate-300">
                    Category *
                  </label>
                  <select
                    value={recCategory}
                    onChange={(e) => setRecCategory(e.target.value as DonationCategory)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400"
                  >
                    {DonationCategoryEnum.options.map((cat) => (
                      <option key={cat} value={cat}>
                        {DONATION_CATEGORY_LABELS[cat]?.label || cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-slate-300">
                    Fiscal Year
                  </label>
                  <input
                    type="text"
                    value={recFiscalYear}
                    onChange={(e) => setRecFiscalYear(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400 font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-slate-300">
                  Website URL
                </label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={recWebsite}
                  onChange={(e) => setRecWebsite(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-slate-300">
                  Public Impact Note (Shown on Public/Portal Directory)
                </label>
                <input
                  type="text"
                  placeholder="Funding 10 instruments for after-school band program..."
                  value={recImpactNote}
                  onChange={(e) => setRecImpactNote(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-slate-300">
                  Internal Check Reference / Audit Notes
                </label>
                <input
                  type="text"
                  placeholder="Check #1042 or Venmo transaction link..."
                  value={recInternalNotes}
                  onChange={(e) => setRecInternalNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsRecordDonationModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isRecordingDonation}
                  className="px-5 py-2 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-slate-950 text-xs font-black uppercase tracking-wider transition disabled:opacity-50"
                >
                  {isRecordingDonation ? "Recording..." : "Record Donation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: MANAGER PAY OUT REIMBURSEMENT                          */}
      {/* ------------------------------------------------------------- */}
      {reimbToPay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-base font-black text-white uppercase tracking-tight">
              Record Reimbursement Payout
            </h3>
            <p className="text-xs text-slate-400">
              Disbursing <strong className="text-yellow-400 font-mono">${reimbToPay.amount.toFixed(2)}</strong> to{" "}
              <strong className="text-white">{reimbToPay.applicantName}</strong> via{" "}
              <strong className="uppercase">{reimbToPay.paymentMethod}</strong> ({reimbToPay.paymentHandle || "Handle not listed"}).
            </p>

            <div className="space-y-3 pt-2">
              <DatePicker
                label="Payout Date"
                value={payDate}
                onChange={setPayDate}
              />

              <div className="space-y-1">
                <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-slate-300">
                  Transaction / Payment Reference
                </label>
                <input
                  type="text"
                  placeholder="e.g. Venmo ID #99281, Check #1043"
                  value={payReference}
                  onChange={(e) => setPayReference(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400"
                />
              </div>
            </div>

            <div className="pt-3 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setReimbToPay(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isReviewingReimb}
                onClick={handleConfirmPayOut}
                className="px-5 py-2 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-slate-950 text-xs font-black uppercase tracking-wider transition disabled:opacity-50"
              >
                {isReviewingReimb ? "Recording..." : "Confirm & Record Payout"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: MANAGER REJECT REIMBURSEMENT                           */}
      {/* ------------------------------------------------------------- */}
      {reimbToReject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-base font-black text-white uppercase tracking-tight">
              Reject Reimbursement Claim
            </h3>
            <p className="text-xs text-slate-400">
              Provide feedback for <strong className="text-white">{reimbToReject.applicantName}</strong> explaining why this expense cannot be reimbursed by the band fund.
            </p>

            <div className="space-y-1 pt-1">
              <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-slate-300">
                Rejection Reason / Note *
              </label>
              <textarea
                required
                rows={3}
                placeholder="Missing receipt image, personal expense, duplicate claim, etc."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-yellow-400 leading-relaxed"
              />
            </div>

            <div className="pt-3 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setReimbToReject(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isReviewingReimb}
                onClick={handleConfirmReject}
                className="px-5 py-2 rounded-xl bg-rose-500 hover:bg-rose-400 text-white text-xs font-black uppercase tracking-wider transition disabled:opacity-50"
              >
                {isReviewingReimb ? "Updating..." : "Confirm Rejection"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: MANAGER ADJUST BASELINE                                */}
      {/* ------------------------------------------------------------- */}
      {isBaselineModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-base font-black text-white uppercase tracking-tight">
              Adjust Treasury Baseline
            </h3>
            <p className="text-xs text-slate-400">
              Establish the starting reserve balance and effective rollover date for the band operating fund.
            </p>

            <div className="space-y-3 pt-2">
              <div className="space-y-1">
                <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-slate-300">
                  Starting Balance ($ USD)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={tempBaseline}
                  onChange={(e) => setTempBaseline(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-400 font-mono font-bold"
                />
              </div>

              <DatePicker
                label="Baseline Effective Date"
                value={tempBaselineDate}
                onChange={setTempBaselineDate}
              />
            </div>

            <div className="pt-3 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsBaselineModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSavingBaseline}
                onClick={handleSaveBaseline}
                className="px-5 py-2 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-slate-950 text-xs font-black uppercase tracking-wider transition disabled:opacity-50"
              >
                {isSavingBaseline ? "Saving..." : "Save Baseline"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: MANAGER RECORD TRANSACTION                             */}
      {/* ------------------------------------------------------------- */}
      {isRecordTxModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-base font-black text-white uppercase tracking-tight">
                Record Financial Ledger Entry
              </h3>
              <button
                type="button"
                onClick={() => setIsRecordTxModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRecordTransaction} className="space-y-4">
              <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setTxType("expense")}
                  className={`flex-1 py-1.5 rounded-lg transition text-center flex items-center justify-center gap-1.5 ${
                    txType === "expense" ? "bg-rose-500 text-white font-bold" : "text-slate-400 hover:text-white"
                  }`}
                >
                  <TrendingDown className="w-3.5 h-3.5" />
                  <span>Expense (Outflow)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTxType("income")}
                  className={`flex-1 py-1.5 rounded-lg transition text-center flex items-center justify-center gap-1.5 ${
                    txType === "income" ? "bg-emerald-500 text-white font-bold" : "text-slate-400 hover:text-white"
                  }`}
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>Revenue (Inflow)</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-slate-300">
                    Amount ($ USD) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    placeholder="120.00"
                    value={txAmount}
                    onChange={(e) => setTxAmount(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-400 font-mono font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <DatePicker
                    label="Transaction Date *"
                    value={txDate}
                    onChange={setTxDate}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-slate-300">
                  Category *
                </label>
                <select
                  value={txCategory}
                  onChange={(e) => setTxCategory(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400"
                >
                  {txType === "income" ? (
                    <>
                      <option value="gig_fee">Gig Performance Fee / Deposit</option>
                      <option value="tips_donations">Crowd Tips &amp; Fan Donations</option>
                      <option value="merch_sales">Merchandise Sales</option>
                      <option value="sponsorship">Sponsorship &amp; Grants</option>
                      <option value="other">Other Inflow</option>
                    </>
                  ) : (
                    <>
                      <option value="food_beverage">Food &amp; Beverage / Band Lunch</option>
                      <option value="travel_fuel">Travel, Fuel &amp; Parking</option>
                      <option value="gear_repairs">Gear &amp; Equipment Repairs</option>
                      <option value="rehearsal_space">Rehearsal Rental</option>
                      <option value="sheet_music">Sheet Music &amp; Arrangements</option>
                      <option value="uniforms_attire">Uniforms &amp; Attire</option>
                      <option value="merchandise">Merch Production</option>
                      <option value="admin_software">Software &amp; Web Admin</option>
                      <option value="charitable_giving">Charitable Philanthropy</option>
                      <option value="other">Other Expense</option>
                    </>
                  )}
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-slate-300">
                  Description *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Shadyside Arts Fest Guarantee, New bass drum head"
                  value={txDescription}
                  onChange={(e) => setTxDescription(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-slate-300">
                  Associated Gig (Optional)
                </label>
                <select
                  value={txGigId}
                  onChange={(e) => setTxGigId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400"
                >
                  <option value="">-- No specific gig --</option>
                  {gigs.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.date} — {g.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-slate-300">
                  Audit Notes / Reference (Optional)
                </label>
                <input
                  type="text"
                  placeholder="Check #, receipt ID, or payer details"
                  value={txNotes}
                  onChange={(e) => setTxNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsRecordTxModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingTx}
                  className="px-5 py-2 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-slate-950 text-xs font-black uppercase tracking-wider transition disabled:opacity-50"
                >
                  {isSubmittingTx ? "Saving..." : "Record Transaction"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CentralizedFinancePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[70vh] flex items-center justify-center text-xs text-slate-400 font-mono">
          Loading Financial Hub &amp; Treasury...
        </div>
      }
    >
      <FinanceHubContent />
    </Suspense>
  );
}

