"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  deleteDoc,
  updateDoc,
  query,
  orderBy,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/lib/context/AuthContext";
import { canManageFinances, canManageGiving } from "@/lib/auth/permissions";
import {
  Reimbursement,
  ReimbursementSchema,
  ExpenseCategoryEnum,
  PayoutMethodEnum,
  ExpenseCategory,
  PayoutMethod,
} from "@/lib/schema/reimbursement";
import {
  Donation,
  DonationSchema,
  DonationCategory,
  DonationCategoryEnum,
  DonationStatus,
  calculateDonationPriorityScore,
} from "@/lib/schema/donation";
import { Transaction, TransactionSchema } from "@/lib/schema/transaction";
import { TreasuryConfig, TreasuryConfigSchema } from "@/lib/schema/treasury";
import { User, UserSchema } from "@/lib/schema/user";
import { toast } from "@/lib/context/ToastContext";
import PortalBreadcrumb from "@/components/portal/PortalBreadcrumb";
import DatePicker from "@/components/ui/DatePicker";
import CommentsStream from "@/components/portal/CommentsStream";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Receipt,
  HeartHandshake,
  FileText,
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
  Award,
  Trash2,
  Gift,
  Minus,
  Plus,
  Edit3,
  ChevronDown,
  MessageSquare,
  Globe,
  Lock,
  Eye,
  EyeOff,
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
  const isGivingManager = Boolean(profile && canManageGiving(profile));

  // Active Tab synchronized with ?tab=
  const tabParam = searchParams.get("tab") as FinanceTab;
  const activeTab: FinanceTab =
    tabParam && ["treasury", "reimbursements", "giving", "ledger"].includes(tabParam)
      ? tabParam
      : "treasury";

  const switchTab = (tab: FinanceTab) => {
    router.replace(`/portal/finance?tab=${tab}`, { scroll: false });
  };

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
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
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

    // 7. Cause Discussion Comments Count
    const qComments = query(collection(db, "comments"), where("targetType", "==", "cause"));
    const unsubComments = onSnapshot(qComments, (snap) => {
      const counts: Record<string, number> = {};
      snap.forEach((d) => {
        const data = d.data();
        const tId = data.targetId;
        if (tId) {
          counts[tId] = (counts[tId] || 0) + 1;
        }
      });
      setCommentCounts(counts);
    });

    return () => {
      unsubTreasury();
      unsubTx();
      unsubReimb();
      unsubDonations();
      unsubGigs();
      unsubUsers();
      unsubComments();
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

  // Manager: Add / Record Band Gift Modal (Consolidated)
  const [isNewGiftModalOpen, setIsNewGiftModalOpen] = useState(false);
  const [newGiftOrgName, setNewGiftOrgName] = useState("");
  const [newGiftDesc, setNewGiftDesc] = useState("");
  const [newGiftWebsite, setNewGiftWebsite] = useState("");
  const [newGiftCategory, setNewGiftCategory] = useState<DonationCategory>("community_aid");
  const [newGiftTargetAmount, setNewGiftTargetAmount] = useState("250");
  const [newGiftStatus, setNewGiftStatus] = useState<DonationStatus>("completed");
  const [newGiftFiscalYear, setNewGiftFiscalYear] = useState(() => String(new Date().getFullYear()));
  const [newGiftDate, setNewGiftDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [newGiftAmount, setNewGiftAmount] = useState("100");
  const [newGiftImpactNote, setNewGiftImpactNote] = useState("");
  const [newGiftNotes, setNewGiftNotes] = useState("");
  const [newGiftAttributedMemberUid, setNewGiftAttributedMemberUid] = useState("");
  const [newGiftIsPublic, setNewGiftIsPublic] = useState(true);
  const [newGiftShowAmountPublicly, setNewGiftShowAmountPublicly] = useState(false);
  const [newGiftGiftsGiven, setNewGiftGiftsGiven] = useState("1");
  const [isSubmittingNewGift, setIsSubmittingNewGift] = useState(false);

  // Manager: Edit Band Gift Modal State
  const [editingGift, setEditingGift] = useState<Donation | null>(null);
  const [editOrgName, setEditOrgName] = useState("");
  const [editCategory, setEditCategory] = useState<DonationCategory>("community_aid");
  const [editDesc, setEditDesc] = useState("");
  const [editWebsite, setEditWebsite] = useState("");
  const [editStatus, setEditStatus] = useState<DonationStatus>("completed");
  const [editAmount, setEditAmount] = useState("0");
  const [editTargetAmount, setEditTargetAmount] = useState("0");
  const [editDate, setEditDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [editFiscalYear, setEditFiscalYear] = useState(() => String(new Date().getFullYear()));
  const [editGiftsGivenCount, setEditGiftsGivenCount] = useState<number>(0);
  const [editAttributedMemberUid, setEditAttributedMemberUid] = useState("");
  const [editPublicImpactNote, setEditPublicImpactNote] = useState("");
  const [editInternalNotes, setEditInternalNotes] = useState("");
  const [editIsPublic, setEditIsPublic] = useState(true);
  const [editShowAmountPublicly, setEditShowAmountPublicly] = useState(false);
  const [isSavingEditGift, setIsSavingEditGift] = useState(false);

  // Giving Sub-Tabs: "suggestions" vs "gifts"
  const [givingSubTab, setGivingSubTab] = useState<"suggestions" | "gifts">("suggestions");
  const [givingGiftsCategory, setGivingGiftsCategory] = useState<string>("all");

  // Priority Voting & Sorting State
  const [ratingInProgressId, setRatingInProgressId] = useState<string | null>(null);
  const [suggestSortOrder, setSuggestSortOrder] = useState<"rank" | "recent">("rank");

  // Gifts Given Retroactive Adjust State
  const [adjustGiftsCause, setAdjustGiftsCause] = useState<Donation | null>(null);
  const [adjustGiftsCount, setAdjustGiftsCount] = useState<number>(0);
  const [isAdjustingGifts, setIsAdjustingGifts] = useState(false);

  // Cause Comments & Discussion Stream State
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});

  const toggleComments = (causeId: string) => {
    setExpandedComments((prev) => ({
      ...prev,
      [causeId]: !prev[causeId],
    }));
  };

  // Manager: Approve Cause & Confirm Donation State
  const [causeToApprove, setCauseToApprove] = useState<Donation | null>(null);
  const [confirmAmount, setConfirmAmount] = useState<string>("100");
  const [confirmDate, setConfirmDate] = useState<string>(() => new Date().toISOString().split("T")[0]);
  const [confirmFiscalYear, setConfirmFiscalYear] = useState<string>(() => String(new Date().getFullYear()));
  const [confirmGiftsCount, setConfirmGiftsCount] = useState<number>(1);
  const [confirmImpactNote, setConfirmImpactNote] = useState<string>("");
  const [confirmNotes, setConfirmNotes] = useState<string>("");
  const [confirmIsPublic, setConfirmIsPublic] = useState<boolean>(true);
  const [confirmShowAmountPublicly, setConfirmShowAmountPublicly] = useState<boolean>(false);
  const [isConfirmingDonation, setIsConfirmingDonation] = useState<boolean>(false);



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
        category: reimbCategory as ExpenseCategory,
        expenseDate: reimbDate,
        gigId: reimbGigId || null,
        gigTitle: selectedGig ? selectedGig.title : null,
        receiptUrl: reimbReceiptUrl.trim(),
        receiptNote: reimbReceiptNote.trim(),
        paymentMethod: reimbPayoutMethod as PayoutMethod,
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
        showAmountPublicly: false,
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
        ratings: {},
        ratingAverage: 0,
        ratingCount: 0,
        giftsGivenCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const validated = DonationSchema.parse(payload);
      await setDoc(doc(db, "donations", id), validated);

      toast.success("Band Gift suggested! Your suggestion is now live for member priority ranking & discussion.");
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

  // Member: Rate Cause Priority (1-10)
  const handleRateCausePriority = async (cause: Donation, score: number) => {
    if (!profile) {
      toast.error("You must be logged in to rank causes.");
      return;
    }
    setRatingInProgressId(cause.id);
    try {
      const existingRatings = cause.ratings || {};
      const newRatings: Record<string, number> = {
        ...existingRatings,
        [profile.uid]: score,
      };
      const { average, count } = calculateDonationPriorityScore(newRatings);

      await updateDoc(doc(db, "donations", cause.id), {
        ratings: newRatings,
        ratingAverage: average,
        ratingCount: count,
        updatedAt: new Date().toISOString(),
      });

      toast.success(`Priority score ${score}/10 recorded for ${cause.organizationName}.`);
    } catch (err) {
      toast.error("Failed to save priority rating: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setRatingInProgressId(null);
    }
  };

  // Manager: Open New Band Gift Modal
  const handleOpenNewGiftModal = () => {
    setNewGiftOrgName("");
    setNewGiftDesc("");
    setNewGiftWebsite("");
    setNewGiftCategory("community_aid");
    setNewGiftTargetAmount("250");
    setNewGiftStatus("completed");
    setNewGiftFiscalYear(String(new Date().getFullYear()));
    setNewGiftDate(new Date().toISOString().split("T")[0]);
    setNewGiftAmount("100");
    setNewGiftImpactNote("");
    setNewGiftNotes("");
    setNewGiftAttributedMemberUid("");
    setNewGiftIsPublic(true);
    setNewGiftShowAmountPublicly(false);
    setNewGiftGiftsGiven("1");
    setIsNewGiftModalOpen(true);
  };

  // Manager: Create New Band Gift (Suggested or Completed)
  const handleCreateNewGift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGiftOrgName.trim()) {
      toast.error("Please enter an organization or cause name.");
      return;
    }

    const targetAmt = parseFloat(newGiftTargetAmount) || 0;
    const directAmt = parseFloat(newGiftAmount) || 0;
    if (newGiftStatus === "completed" && (isNaN(directAmt) || directAmt < 0)) {
      toast.error("Please enter a valid gift amount.");
      return;
    }

    setIsSubmittingNewGift(true);
    try {
      const id = `donation_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      let suggestedByName = profile?.displayName || "Giving Manager";
      let suggestedByUid: string | null = profile?.uid || null;
      let submittedOnBehalf = false;

      if (newGiftAttributedMemberUid) {
        const member = rosterMembers.find((u) => u.uid === newGiftAttributedMemberUid);
        if (member) {
          suggestedByName = member.displayName || member.realName || "Musician";
          suggestedByUid = member.uid;
          submittedOnBehalf = true;
        }
      }

      const giftsGivenNum = Math.max(0, parseInt(newGiftGiftsGiven, 10) || (newGiftStatus === "completed" ? 1 : 0));

      const payload: Donation = {
        id,
        organizationName: newGiftOrgName.trim(),
        causeDescription: newGiftDesc.trim(),
        websiteUrl: newGiftWebsite.trim(),
        category: newGiftCategory,
        amount: newGiftStatus === "completed" ? Number(directAmt.toFixed(2)) : 0,
        targetAmount: targetAmt > 0 ? Number(targetAmt.toFixed(2)) : (newGiftStatus === "completed" ? Number(directAmt.toFixed(2)) : 250),
        dateDonated: newGiftStatus === "completed" ? newGiftDate : new Date().toISOString().split("T")[0],
        fiscalYear: newGiftFiscalYear,
        status: newGiftStatus,
        isPublic: newGiftStatus === "completed" ? newGiftIsPublic : false,
        showAmountPublicly: newGiftStatus === "completed" ? newGiftShowAmountPublicly : false,
        publicImpactNote: newGiftImpactNote.trim(),
        notes: newGiftNotes.trim(),
        suggestedByUid,
        suggestedByName,
        submittedByUid: profile?.uid || null,
        submittedByName: profile?.displayName || "Giving Manager",
        submittedOnBehalf,
        rationale: newGiftDesc.trim(),
        reviewedByUid: newGiftStatus === "completed" ? (profile?.uid || null) : null,
        reviewedByName: newGiftStatus === "completed" ? (profile?.displayName || "Giving Manager") : "",
        reviewedAt: newGiftStatus === "completed" ? new Date().toISOString() : null,
        ratings: {},
        ratingAverage: 0,
        ratingCount: 0,
        giftsGivenCount: giftsGivenNum,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const validated = DonationSchema.parse(payload);
      await setDoc(doc(db, "donations", id), validated);

      toast.success(
        newGiftStatus === "suggested"
          ? `Added "${newGiftOrgName.trim()}" to member priority voting.`
          : `Recorded "${newGiftOrgName.trim()}" as an awarded Band Gift.`
      );

      setIsNewGiftModalOpen(false);
    } catch (err) {
      toast.error("Failed to create Band Gift: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsSubmittingNewGift(false);
    }
  };

  // Manager: Open Modal to Edit Any Band Gift
  const handleOpenEditGift = (gift: Donation) => {
    setEditingGift(gift);
    setEditOrgName(gift.organizationName);
    setEditCategory(gift.category || "community_aid");
    setEditDesc(gift.causeDescription || gift.rationale || "");
    setEditWebsite(gift.websiteUrl || "");
    setEditStatus(gift.status);
    setEditAmount(String(gift.amount ?? 0));
    setEditTargetAmount(String(gift.targetAmount ?? 0));
    setEditDate(gift.dateDonated || new Date().toISOString().split("T")[0]);
    setEditFiscalYear(gift.fiscalYear || String(new Date().getFullYear()));
    setEditGiftsGivenCount(gift.giftsGivenCount ?? (gift.status === "completed" ? 1 : 0));
    setEditAttributedMemberUid(gift.suggestedByUid || "");
    setEditPublicImpactNote(gift.publicImpactNote || "");
    setEditInternalNotes(gift.notes || "");
    setEditIsPublic(gift.isPublic ?? true);
    setEditShowAmountPublicly(gift.showAmountPublicly ?? false);
  };

  // Manager: Save Edited Band Gift
  const handleSaveEditGift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGift) return;
    if (!editOrgName.trim()) {
      toast.error("Please enter an organization name.");
      return;
    }

    const numAmount = parseFloat(editAmount);
    const numTarget = parseFloat(editTargetAmount);
    if (isNaN(numAmount) || numAmount < 0) {
      toast.error("Please enter a valid gift amount.");
      return;
    }

    setIsSavingEditGift(true);
    try {
      let suggestedByName = editingGift.suggestedByName;
      let suggestedByUid = editingGift.suggestedByUid;
      let submittedOnBehalf = editingGift.submittedOnBehalf ?? false;

      if (editAttributedMemberUid && editAttributedMemberUid !== editingGift.suggestedByUid) {
        const member = rosterMembers.find((u) => u.uid === editAttributedMemberUid);
        if (member) {
          suggestedByName = member.displayName || member.realName || "Musician";
          suggestedByUid = member.uid;
          submittedOnBehalf = true;
        }
      }

      const updatePayload: Record<string, unknown> = {
        organizationName: editOrgName.trim(),
        category: editCategory,
        causeDescription: editDesc.trim(),
        rationale: editDesc.trim(),
        websiteUrl: editWebsite.trim(),
        status: editStatus,
        amount: Number(numAmount.toFixed(2)),
        targetAmount: isNaN(numTarget) ? 0 : Number(numTarget.toFixed(2)),
        dateDonated: editDate,
        fiscalYear: editFiscalYear,
        giftsGivenCount: Math.max(0, editGiftsGivenCount),
        publicImpactNote: editPublicImpactNote.trim(),
        notes: editInternalNotes.trim(),
        isPublic: editIsPublic,
        showAmountPublicly: editShowAmountPublicly,
        suggestedByUid,
        suggestedByName,
        submittedOnBehalf,
        updatedAt: new Date().toISOString(),
      };

      if (editStatus === "completed" && editingGift.status !== "completed") {
        updatePayload.reviewedByUid = profile?.uid || null;
        updatePayload.reviewedByName = profile?.displayName || "Giving Manager";
        updatePayload.reviewedAt = new Date().toISOString();
      }

      await updateDoc(doc(db, "donations", editingGift.id), updatePayload);
      toast.success(`Updated Band Gift for "${editOrgName.trim()}".`);
      setEditingGift(null);
    } catch (err) {
      toast.error("Failed to update Band Gift: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsSavingEditGift(false);
    }
  };

  // Community Manager / Admin: Delete / Dismiss Suggestion
  const handleDeleteSuggestion = async (cause: Donation) => {
    if (!confirm(`Are you sure you want to dismiss and delete the suggestion for "${cause.organizationName}"?`)) {
      return;
    }
    try {
      await deleteDoc(doc(db, "donations", cause.id));
      toast.success(`Removed suggestion for "${cause.organizationName}".`);
    } catch (err) {
      toast.error("Failed to delete suggestion: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  // Community Manager / Admin / Treasurer: Delete or Dismiss Band Gift
  const handleDeleteBandGift = async (gift: Donation) => {
    if (
      !confirm(
        `Are you sure you want to delete or dismiss the Band Gift for "${gift.organizationName}"? This will permanently remove it from the Band Gifts directory and public website.`
      )
    ) {
      return;
    }
    try {
      await deleteDoc(doc(db, "donations", gift.id));
      toast.success(`Deleted Band Gift for "${gift.organizationName}".`);
    } catch (err) {
      toast.error("Failed to delete Band Gift: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  // One-Click Admin Toggles for Band Gifts Public Visibility
  const handleToggleGiftPublic = async (ben: Donation) => {
    try {
      const next = !ben.isPublic;
      await updateDoc(doc(db, "donations", ben.id), {
        isPublic: next,
        updatedAt: new Date().toISOString(),
      });
      toast.success(`"${ben.organizationName}" is now ${next ? "listed on the public Giving page" : "internal only"}.`);
    } catch (err) {
      toast.error("Failed to update visibility: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleToggleGiftAmountPublic = async (ben: Donation) => {
    try {
      const next = !ben.showAmountPublicly;
      await updateDoc(doc(db, "donations", ben.id), {
        showAmountPublicly: next,
        updatedAt: new Date().toISOString(),
      });
      toast.success(
        `Dollar amount for "${ben.organizationName}" is now ${next ? "shown publicly" : "hidden publicly"}.`
      );
    } catch (err) {
      toast.error("Failed to update amount visibility: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  // Community Manager / Admin: Adjust Gifts Given Retroactively
  const handleOpenAdjustGifts = (cause: Donation) => {
    setAdjustGiftsCause(cause);
    setAdjustGiftsCount(cause.giftsGivenCount || 0);
  };

  const handleSaveAdjustGifts = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustGiftsCause) return;
    setIsAdjustingGifts(true);
    try {
      const nextCount = Math.max(0, adjustGiftsCount);
      await updateDoc(doc(db, "donations", adjustGiftsCause.id), {
        giftsGivenCount: nextCount,
        updatedAt: new Date().toISOString(),
      });
      toast.success(`Updated gifts given to ${nextCount} for ${adjustGiftsCause.organizationName}.`);
      setAdjustGiftsCause(null);
    } catch (err) {
      toast.error("Failed to update gifts count: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsAdjustingGifts(false);
    }
  };

  const handleQuickAddGift = async (cause: Donation, delta: number) => {
    const current = cause.giftsGivenCount || 0;
    const next = Math.max(0, current + delta);
    try {
      await updateDoc(doc(db, "donations", cause.id), {
        giftsGivenCount: next,
        updatedAt: new Date().toISOString(),
      });
      toast.success(`${delta > 0 ? "Recorded gift" : "Adjusted gifts"} for ${cause.organizationName} (${next} total).`);
    } catch (err) {
      toast.error("Failed to adjust gift count: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  // Community Manager / Admin: Open Modal to Approve Cause & Confirm Donation Amount
  const handleOpenApproveModal = (cause: Donation) => {
    setCauseToApprove(cause);
    const initialAmt = cause.targetAmount > 0 ? String(cause.targetAmount) : (cause.amount > 0 ? String(cause.amount) : "100");
    setConfirmAmount(initialAmt);
    setConfirmDate(new Date().toISOString().split("T")[0]);
    setConfirmFiscalYear(String(new Date().getFullYear()));
    setConfirmGiftsCount(Math.max(1, (cause.giftsGivenCount || 0) + 1));
    setConfirmImpactNote(cause.publicImpactNote || "");
    setConfirmNotes(cause.notes || "");
    setConfirmIsPublic(cause.isPublic ?? true);
    setConfirmShowAmountPublicly(cause.showAmountPublicly ?? false);
  };

  const handleConfirmApproveAndDonate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!causeToApprove) return;

    const numAmount = parseFloat(confirmAmount);
    if (isNaN(numAmount) || numAmount < 0) {
      toast.error("Please enter a valid gift amount.");
      return;
    }

    setIsConfirmingDonation(true);
    try {
      const updatedGifts = Math.max(1, confirmGiftsCount);

      await updateDoc(doc(db, "donations", causeToApprove.id), {
        status: "completed",
        amount: Number(numAmount.toFixed(2)),
        targetAmount: causeToApprove.targetAmount > 0 ? causeToApprove.targetAmount : Number(numAmount.toFixed(2)),
        dateDonated: confirmDate,
        fiscalYear: confirmFiscalYear,
        giftsGivenCount: updatedGifts,
        isPublic: confirmIsPublic,
        showAmountPublicly: confirmShowAmountPublicly,
        publicImpactNote: confirmImpactNote.trim(),
        notes: confirmNotes.trim(),
        reviewedByName: profile?.displayName || "Giving Manager",
        reviewedByUid: profile?.uid || null,
        reviewedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      toast.success(
        `Approved "${causeToApprove.organizationName}" and activated Band Gift of $${numAmount.toFixed(2)}.`
      );
      setCauseToApprove(null);
    } catch (err) {
      toast.error("Failed to approve and activate Band Gift: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsConfirmingDonation(false);
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

  // Manager or Applicant: Delete / Withdraw Reimbursement
  const handleDeleteReimbursement = async (reimb: Reimbursement) => {
    const isSelf = reimb.applicantUid === profile?.uid || reimb.submittedByUid === profile?.uid;
    const confirmMsg = isManager
      ? `Are you sure you want to permanently delete the reimbursement claim of $${reimb.amount.toFixed(2)} for "${reimb.applicantName}" (${reimb.description})?${
          reimb.transactionId ? " Note: This will also remove the linked expense entry from the ledger." : ""
        }`
      : `Are you sure you want to withdraw and delete your reimbursement claim of $${reimb.amount.toFixed(2)} (${reimb.description})?`;

    if (!window.confirm(confirmMsg)) return;

    try {
      const batch = writeBatch(db);
      batch.delete(doc(db, "reimbursements", reimb.id));

      if (reimb.transactionId && isManager) {
        batch.delete(doc(db, "transactions", reimb.transactionId));
      }

      await batch.commit();
      toast.success(
        isSelf && !isManager
          ? `Withdrew reimbursement claim for $${reimb.amount.toFixed(2)}.`
          : `Deleted reimbursement claim for "${reimb.applicantName}".`
      );
    } catch (err) {
      toast.error("Failed to delete reimbursement: " + (err instanceof Error ? err.message : String(err)));
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

  // Manager: Delete Transaction / Expense
  const handleDeleteTransaction = async (tx: Transaction) => {
    if (
      !window.confirm(
        `Are you sure you want to delete this ledger entry "${tx.description}" ($${tx.amount.toFixed(2)})? This will affect the treasury net balance.`
      )
    )
      return;
    try {
      const batch = writeBatch(db);
      batch.delete(doc(db, "transactions", tx.id));

      const linkedReimb = reimbursements.find((r) => r.transactionId === tx.id);
      if (linkedReimb) {
        batch.update(doc(db, "reimbursements", linkedReimb.id), {
          status: "approved",
          transactionId: null,
          paidAt: null,
          payoutReference: "",
          updatedAt: new Date().toISOString(),
        });
      }

      await batch.commit();
      toast.success(`Transaction "${tx.description}" removed from ledger.`);
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

  // Ranked Suggested Causes
  const rankedSuggestedCauses = useMemo(() => {
    const list = donations.filter((d) => d.status === "suggested");

    if (suggestSortOrder === "recent") {
      return [...list].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    }

    return [...list].sort((a, b) => {
      const avgA = a.ratingAverage || 0;
      const avgB = b.ratingAverage || 0;
      if (avgB !== avgA) {
        return avgB - avgA;
      }
      const countA = a.ratingCount || 0;
      const countB = b.ratingCount || 0;
      if (countB !== countA) {
        return countB - countA;
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [donations, suggestSortOrder]);

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

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-right">
                        <div
                          className={`text-sm font-bold font-mono ${
                            tx.type === "income" ? "text-emerald-400" : "text-rose-400"
                          }`}
                        >
                          {tx.type === "income" ? "+" : "-"}${tx.amount.toFixed(2)}
                        </div>
                      </div>
                      {isManager && (
                        <button
                          type="button"
                          onClick={() => handleDeleteTransaction(tx)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                          title="Delete transaction / expense"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
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

                          {isManager && (
                            <button
                              type="button"
                              onClick={() => handleDeleteReimbursement(reimb)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                              title="Delete reimbursement claim"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
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

                    <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                      <div className="text-right">
                        <div className="text-base font-black text-white font-mono">
                          ${reimb.amount.toFixed(2)}
                        </div>
                      </div>

                      {(reimb.status === "submitted" || reimb.status === "rejected" || isManager) && (
                        <button
                          type="button"
                          onClick={() => handleDeleteReimbursement(reimb)}
                          className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-rose-500/15 text-slate-400 hover:text-rose-300 border border-white/5 hover:border-rose-500/30 text-xs transition cursor-pointer flex items-center gap-1.5"
                          title={reimb.status === "submitted" ? "Withdraw this submitted claim" : "Delete this claim"}
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                          <span className="text-[11px] font-bold">
                            {reimb.status === "submitted" ? "Withdraw" : "Delete"}
                          </span>
                        </button>
                      )}
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
                Band Gifts &amp; Community Philanthropy
              </h2>
              <p className="text-xs text-slate-400">
                Suggest grassroots causes for band contributions, vote on priorities, and celebrate awarded Band Gifts.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setIsSuggestModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold text-xs uppercase tracking-wider transition cursor-pointer shadow-lg shadow-yellow-400/10"
              >
                <HeartHandshake className="w-4 h-4" />
                <span>Suggest a Band Gift</span>
              </button>

              {isGivingManager && (
                <button
                  type="button"
                  onClick={handleOpenNewGiftModal}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 font-bold text-xs uppercase tracking-wider transition cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>+ New Band Gift</span>
                </button>
              )}
            </div>
          </div>

          {/* Giving Sub-Tab Switcher */}
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <button
              type="button"
              onClick={() => setGivingSubTab("suggestions")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                givingSubTab === "suggestions"
                  ? "bg-yellow-400 text-slate-950 shadow-md shadow-yellow-400/10"
                  : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>Gift Suggestions</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
                givingSubTab === "suggestions" ? "bg-slate-950 text-yellow-400 font-bold" : "bg-slate-800 text-slate-300"
              }`}>
                {rankedSuggestedCauses.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setGivingSubTab("gifts")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                givingSubTab === "gifts"
                  ? "bg-yellow-400 text-slate-950 shadow-md shadow-yellow-400/10"
                  : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
              }`}
            >
              <Gift className="w-4 h-4" />
              <span>Awarded Band Gifts</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
                givingSubTab === "gifts" ? "bg-slate-950 text-yellow-400 font-bold" : "bg-slate-800 text-slate-300"
              }`}>
                {donations.filter((d) => d.status === "completed").length}
              </span>
            </button>
          </div>

          {givingSubTab === "suggestions" && (
            /* Member Suggestions Showcase & Priority Ranking */
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-tight flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-yellow-400" />
                  <span>Member-Suggested Causes &amp; Priority Ranking ({rankedSuggestedCauses.length})</span>
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Band members vote on priority (1-10) to guide how band charitable contributions are allocated.
                </p>
              </div>

              {/* Sort Switch */}
              <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-xl p-1 shrink-0">
                <button
                  type="button"
                  onClick={() => setSuggestSortOrder("rank")}
                  className={`px-3 py-1 text-[11px] font-bold rounded-lg transition ${
                    suggestSortOrder === "rank"
                      ? "bg-yellow-400 text-slate-950"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Priority Rank
                </button>
                <button
                  type="button"
                  onClick={() => setSuggestSortOrder("recent")}
                  className={`px-3 py-1 text-[11px] font-bold rounded-lg transition ${
                    suggestSortOrder === "recent"
                      ? "bg-yellow-400 text-slate-950"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Newest
                </button>
              </div>
            </div>

            {rankedSuggestedCauses.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-500 font-mono">
                No active member suggestions awaiting review. Have a grassroots cause you love? Suggest one above!
              </div>
            ) : (
              <div className="space-y-4">
                {rankedSuggestedCauses.map((sug, index) => {
                  const ratingCount = sug.ratingCount || 0;
                  const ratingAvg = sug.ratingAverage || 0;
                  const hasVotes = ratingCount > 0;
                  const overallRank = hasVotes ? index + 1 : null;
                  const myRating = (profile?.uid && sug.ratings) ? sug.ratings[profile.uid] : undefined;
                  const isRatingThis = ratingInProgressId === sug.id;
                  const giftsCount = sug.giftsGivenCount || 0;

                  return (
                    <div
                      key={sug.id}
                      className="p-5 sm:p-6 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-4 relative shadow-lg hover:border-slate-700/80 transition"
                    >
                      {/* Top Header Row: Rank Badge, Cause Details, Gifts Given, Score */}
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-3 border-b border-slate-800/60">
                        <div className="flex items-start sm:items-center gap-3 flex-wrap">
                          {/* Rank Badge */}
                          {overallRank === 1 ? (
                            <span className="inline-flex items-center gap-1.5 text-xs font-mono px-3 py-1 rounded-full bg-yellow-400/20 text-yellow-300 border border-yellow-400/40 uppercase font-black shrink-0 shadow-sm shadow-yellow-400/10">
                              <Award className="w-4 h-4 text-yellow-400" />
                              <span>Rank #1 Priority</span>
                            </span>
                          ) : overallRank ? (
                            <span className="inline-flex items-center gap-1.5 text-xs font-mono px-3 py-1 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 uppercase font-bold shrink-0">
                              <span>Rank #{overallRank} Priority</span>
                            </span>
                          ) : (
                            <span className="text-xs font-mono px-3 py-1 rounded-full bg-slate-800/60 text-slate-400 border border-slate-700/60 uppercase font-medium shrink-0">
                              Needs Votes
                            </span>
                          )}

                          {/* Organization Name */}
                          <h4 className="text-base sm:text-lg font-bold text-white tracking-tight">
                            {sug.organizationName}
                          </h4>

                          {/* Category Badge */}
                          <span className="capitalize font-mono text-[11px] px-2.5 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-slate-300">
                            {sug.category.replace(/_/g, " ")}
                          </span>

                          {/* Website Link */}
                          {sug.websiteUrl && (
                            <a
                              href={sug.websiteUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-400 hover:text-blue-300 hover:underline inline-flex items-center gap-1 font-mono"
                            >
                              <span>Website</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>

                        {/* Right Header: Gifts Given Tracker & Aggregated Priority */}
                        <div className="flex items-center gap-3 flex-wrap self-end lg:self-center">
                          {/* Gifts Given Badge & Stepper */}
                          <div className="inline-flex items-center gap-2 bg-slate-900/90 border border-slate-800 px-3 py-1.5 rounded-xl text-xs">
                            <Gift className="w-4 h-4 text-yellow-400 shrink-0" />
                            <span className="font-mono font-bold text-white">
                              <strong className="text-yellow-400">{giftsCount}</strong>{" "}
                              <span className="text-slate-400 text-[11px]">
                                {giftsCount === 1 ? "Gift Given" : "Gifts Given"}
                              </span>
                            </span>

                            {isGivingManager && (
                              <div className="flex items-center gap-1 ml-1.5 pl-2 border-l border-slate-800">
                                <button
                                  type="button"
                                  disabled={giftsCount <= 0}
                                  onClick={() => handleQuickAddGift(sug, -1)}
                                  className="w-5 h-5 rounded flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
                                  title="Decrease gifts given by 1"
                                >
                                  <Minus className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleQuickAddGift(sug, 1)}
                                  className="w-5 h-5 rounded flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
                                  title="Add 1 gift given"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleOpenAdjustGifts(sug)}
                                  className="ml-1 p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-yellow-400 transition cursor-pointer"
                                  title="Set exact number of gifts given retroactively"
                                >
                                  <Edit3 className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Aggregated Score Badge */}
                          <div className="bg-slate-900/90 border border-slate-800 px-3 py-1.5 rounded-xl text-xs font-mono">
                            <span className="text-slate-400">Score: </span>
                            {hasVotes ? (
                              <>
                                <strong className="text-yellow-400 font-bold">{ratingAvg.toFixed(1)}</strong>
                                <span className="text-slate-400 text-[11px]"> / 10</span>
                                <span className="text-slate-500 text-[10px] ml-1.5">
                                  ({ratingCount} {ratingCount === 1 ? "vote" : "votes"})
                                </span>
                              </>
                            ) : (
                              <span className="text-slate-500">Unvoted</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Middle: Rationale & Attribution */}
                      <div className="space-y-2">
                        <p className="text-xs sm:text-sm text-slate-200 leading-relaxed italic bg-slate-900/40 p-3 rounded-xl border border-slate-800/40">
                          &ldquo;{sug.rationale || sug.causeDescription}&rdquo;
                        </p>

                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] text-slate-400">
                          <div>
                            Suggested by <strong className="text-yellow-400">{sug.suggestedByName || "Bandmate"}</strong>
                            {sug.targetAmount > 0 ? (
                              <span className="ml-2 font-mono text-slate-400 inline-flex items-center gap-1 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                                <span>Proposed Gift:</span>
                                <strong className="text-yellow-400 font-bold">${sug.targetAmount.toLocaleString()}</strong>
                              </span>
                            ) : (
                              <span className="ml-2 font-mono text-slate-500">• Proposed Gift: None specified</span>
                            )}
                          </div>
                          {sug.createdAt && (
                            <span className="text-slate-500 font-mono">
                              Submitted {new Date(sug.createdAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Visual Priority Meter */}
                      <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800/80">
                        <div
                          className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(100, (ratingAvg / 10) * 100)}%` }}
                        />
                      </div>

                      {/* Bottom Row: 1-10 Priority Rank Buttons & Manager Controls */}
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-1">
                        {/* 1-10 Priority Buttons */}
                        <div className="space-y-1.5 flex-1 max-w-xl">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-400 font-mono font-medium">
                              Your Priority Rating:
                            </span>
                            {myRating ? (
                              <span className="text-yellow-400 font-bold font-mono text-xs">
                                Voted {myRating} / 10 Priority
                              </span>
                            ) : (
                              <span className="text-slate-500 font-mono text-[11px]">
                                Rate 1 (lowest) to 10 (highest priority)
                              </span>
                            )}
                          </div>

                          <div className="grid grid-cols-10 gap-1 sm:gap-1.5">
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => {
                              const isSelected = myRating === num;
                              return (
                                <button
                                  key={num}
                                  type="button"
                                  disabled={isRatingThis}
                                  onClick={() => handleRateCausePriority(sug, num)}
                                  className={`py-1.5 rounded-lg text-center font-mono text-xs font-bold transition cursor-pointer ${
                                    isSelected
                                      ? "bg-yellow-400 text-slate-950 shadow-md shadow-yellow-400/20 ring-2 ring-yellow-300 scale-105"
                                      : "bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-800"
                                  } disabled:opacity-40`}
                                >
                                  {num}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Actions Row: Discussion Toggle & Manager Controls */}
                        <div className="flex items-center gap-2 self-end md:self-center shrink-0 flex-wrap">
                          {/* Discussion Stream Toggle Button (Visible to all members) */}
                          <button
                            type="button"
                            onClick={() => toggleComments(sug.id)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition inline-flex items-center gap-1.5 cursor-pointer ${
                              expandedComments[sug.id]
                                ? "bg-yellow-400/20 text-yellow-300 border border-yellow-400/40"
                                : "text-slate-400 hover:text-white bg-slate-900 border border-slate-800 hover:border-slate-700"
                            }`}
                          >
                            <MessageSquare className="w-3.5 h-3.5 text-yellow-400" />
                            <span>
                              {commentCounts[sug.id] && commentCounts[sug.id] > 0
                                ? `Comments (${commentCounts[sug.id]})`
                                : "Discussion"}
                            </span>
                            <ChevronDown
                              className={`w-3.5 h-3.5 transition-transform duration-200 ${
                                expandedComments[sug.id] ? "rotate-180" : ""
                              }`}
                            />
                          </button>

                          {/* Manager Actions (Edit, Approve & Activate, Dismiss, Adjust Gifts) */}
                          {isGivingManager && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleOpenEditGift(sug)}
                                className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-yellow-400 border border-slate-800 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition"
                                title="Edit gift suggestion details"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                                <span>Edit</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleOpenAdjustGifts(sug)}
                                className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition"
                                title="Set exact gifts given count retroactively"
                              >
                                <Gift className="w-3.5 h-3.5 text-yellow-400" />
                                <span>Gifts: {giftsCount}</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDeleteSuggestion(sug)}
                                className="px-3 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition"
                                title="Dismiss and remove suggestion"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Dismiss</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleOpenApproveModal(sug)}
                                className="px-3.5 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 text-xs font-bold cursor-pointer transition inline-flex items-center gap-1.5"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Approve &amp; Activate</span>
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Collapsible Comments Stream */}
                      {expandedComments[sug.id] && (
                        <div className="pt-3 border-t border-slate-800/80 animate-in fade-in duration-150">
                          <CommentsStream
                            targetType="cause"
                            targetId={sug.id}
                            targetTitle={sug.organizationName}
                            compact
                            onCommentCountChange={(count) => {
                              setCommentCounts((prev) => ({ ...prev, [sug.id]: count }));
                            }}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          )}

          {/* TAB CONTENT: BAND GIFTS DIRECTORY */}
          {givingSubTab === "gifts" && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-tight flex items-center gap-2">
                    <Gift className="w-4 h-4 text-yellow-400" />
                    <span>Band Gifts Directory ({donations.filter((d) => d.status === "completed").length})</span>
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Grassroots organizations and local causes awarded Band Gifts funded by performance proceeds.
                  </p>
                </div>

                {/* Search & Category Filter */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={givingSearchQuery}
                      onChange={(e) => setGivingSearchQuery(e.target.value)}
                      placeholder="Search band gifts..."
                      className="pl-8 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400"
                    />
                  </div>

                  <select
                    value={givingGiftsCategory}
                    onChange={(e) => setGivingGiftsCategory(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-yellow-400"
                  >
                    <option value="all">All Categories</option>
                    {DonationCategoryEnum.options.map((cat) => (
                      <option key={cat} value={cat}>
                        {DONATION_CATEGORY_LABELS[cat]?.label || cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {filteredDonations
                .filter((d) => d.status === "completed")
                .filter((d) => givingGiftsCategory === "all" || d.category === givingGiftsCategory)
                .length === 0 ? (
                <div className="text-center py-12 text-xs text-slate-500 font-mono bg-slate-950/60 rounded-2xl border border-slate-800">
                  <Gift className="w-8 h-8 mx-auto text-slate-600 mb-2" />
                  No completed Band Gifts found matching your criteria.
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredDonations
                    .filter((d) => d.status === "completed")
                    .filter((d) => givingGiftsCategory === "all" || d.category === givingGiftsCategory)
                    .map((ben) => {
                      const catBadge = DONATION_CATEGORY_LABELS[ben.category] || {
                        label: ben.category,
                        color: "bg-slate-800 text-slate-300 border-slate-700",
                      };
                      return (
                        <div
                          key={ben.id}
                          className="bg-slate-950 border border-slate-800/80 hover:border-slate-700 rounded-2xl p-5 sm:p-6 space-y-4 shadow-lg transition"
                        >
                          {/* Card Header Row */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/60">
                            <div className="flex items-center gap-2.5 flex-wrap">
                              <span className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full border uppercase font-bold ${catBadge.color}`}>
                                {catBadge.label}
                              </span>
                              <span className="text-xs font-mono text-slate-400 px-2 py-0.5 bg-slate-900 border border-slate-800 rounded-full">
                                FY {ben.fiscalYear}
                              </span>

                              {/* Confirmed Band Gift Amount Badge */}
                              <span className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                                ${ben.amount.toFixed(2)} Band Gift
                              </span>
                            </div>

                            {/* Cumulative Gifts Tracker & Retroactive Stepper */}
                            <div className="flex items-center gap-2">
                              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/25 text-purple-300 text-xs font-mono font-bold">
                                <Gift className="w-3.5 h-3.5" />
                                <span>{ben.giftsGivenCount || 1} {(ben.giftsGivenCount || 1) === 1 ? "Gift Given" : "Gifts Given"}</span>
                              </div>

                              {isGivingManager && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenAdjustGifts(ben)}
                                  className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-yellow-400 border border-slate-800 font-mono transition flex items-center gap-1 cursor-pointer"
                                  title="Adjust gifts given retroactively"
                                >
                                  <Edit3 className="w-3 h-3" />
                                  <span>Adjust</span>
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Body: Org Name, Descriptions, Notes */}
                          <div className="space-y-2">
                            <div className="flex items-start justify-between gap-3">
                              <h4 className="text-lg font-bold text-white tracking-tight">
                                {ben.organizationName}
                              </h4>
                              {ben.websiteUrl && (
                                <a
                                  href={ben.websiteUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-blue-400 hover:underline inline-flex items-center gap-1 font-mono shrink-0"
                                >
                                  <span>Website</span>
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              )}
                            </div>

                            {ben.causeDescription && (
                              <p className="text-xs text-slate-300 leading-relaxed">
                                {ben.causeDescription}
                              </p>
                            )}

                            {ben.publicImpactNote && (
                              <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-yellow-300/90 flex items-start gap-2">
                                <Sparkles className="w-3.5 h-3.5 text-yellow-400 shrink-0 mt-0.5" />
                                <span className="leading-snug"><strong>Public Impact:</strong> {ben.publicImpactNote}</span>
                              </div>
                            )}

                            {ben.suggestedByName && (
                              <div className="text-[11px] text-slate-400 pt-1 font-mono">
                                Suggested by: <span className="text-yellow-400 font-bold">{ben.suggestedByName}</span>
                              </div>
                            )}

                            {isGivingManager && ben.notes && (
                              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 text-xs text-slate-400 flex items-start gap-2">
                                <FileText className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                                <span className="leading-snug"><strong className="text-slate-300">Internal Audit Notes:</strong> {ben.notes}</span>
                              </div>
                            )}
                          </div>

                          {/* Footer & Admin Visibility Toggles */}
                          {isGivingManager && (
                            <div className="pt-3 border-t border-slate-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/40 p-3 rounded-xl border border-slate-800/40">
                              <span className="text-[11px] font-mono text-slate-400 uppercase font-bold">
                                Public Website Controls:
                              </span>

                              <div className="flex flex-wrap items-center gap-2">
                                {/* Edit Band Gift */}
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditGift(ben)}
                                  className="px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer bg-slate-800 hover:bg-slate-700 text-yellow-400 border border-slate-700"
                                  title="Edit gift details, amounts, notes, and public visibility"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                  <span>Edit Gift &amp; Notes</span>
                                </button>

                                {/* Toggle isPublic */}
                                <button
                                  type="button"
                                  onClick={() => handleToggleGiftPublic(ben)}
                                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                                    ben.isPublic
                                      ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25"
                                      : "bg-slate-800 text-slate-400 border border-slate-700 hover:text-white"
                                  }`}
                                  title="Toggle whether this gift is displayed on the public Community Giving page"
                                >
                                  {ben.isPublic ? <Globe className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                                  <span>{ben.isPublic ? "Public on Giving Page" : "Internal Only"}</span>
                                </button>

                                {/* Toggle showAmountPublicly */}
                                <button
                                  type="button"
                                  onClick={() => handleToggleGiftAmountPublic(ben)}
                                  disabled={!ben.isPublic}
                                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                                    ben.showAmountPublicly
                                      ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25"
                                      : "bg-slate-800 text-slate-400 border border-slate-700 hover:text-white"
                                  }`}
                                  title="Toggle whether the dollar amount is visible to the public or masked"
                                >
                                  {ben.showAmountPublicly ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                                  <span>{ben.showAmountPublicly ? "Amount Shown ($)" : "Amount Hidden"}</span>
                                </button>

                                {/* Delete / Dismiss Band Gift */}
                                <button
                                  type="button"
                                  onClick={() => handleDeleteBandGift(ben)}
                                  className="px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 ml-auto sm:ml-0"
                                  title="Delete or dismiss this Band Gift record"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>Delete Gift</span>
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          )}
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
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setTempBaseline(treasuryConfig.startingBalance || 0);
                    setTempBaselineDate(treasuryConfig.startingDate || new Date().toISOString().split("T")[0]);
                    setIsBaselineModalOpen(true);
                  }}
                  className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs uppercase tracking-wider transition cursor-pointer shadow"
                  title="Adjust audited baseline starting balance and effective rollover date"
                >
                  <Coins className="w-4 h-4 text-yellow-400" />
                  <span>Adjust Baseline</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsRecordTxModalOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold text-xs uppercase tracking-wider transition cursor-pointer shadow-lg shadow-yellow-400/10"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Record Transaction</span>
                </button>
              </div>
            )}
          </div>

          {/* Treasury Baseline & Reconciliation Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Baseline Starting Balance */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2 shadow-lg">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Coins className="w-3.5 h-3.5 text-yellow-400" />
                  Starting Baseline
                </span>
                {isManager && (
                  <button
                    type="button"
                    onClick={() => {
                      setTempBaseline(treasuryConfig.startingBalance || 0);
                      setTempBaselineDate(treasuryConfig.startingDate || new Date().toISOString().split("T")[0]);
                      setIsBaselineModalOpen(true);
                    }}
                    className="text-xs font-bold text-yellow-400 hover:text-yellow-300 transition cursor-pointer"
                  >
                    Adjust
                  </button>
                )}
              </div>
              <div className="text-2xl font-black text-white font-mono">
                ${startingBal.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </div>
              <div className="text-[11px] font-mono text-slate-500">
                Effective: {treasuryConfig.startingDate || "2026-01-01"}
              </div>
            </div>

            {/* Total Inflows */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2 shadow-lg">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                Ledger Inflows
              </span>
              <div className="text-2xl font-black text-emerald-400 font-mono">
                +${totalInflows.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </div>
              <div className="text-[11px] font-mono text-slate-500">
                Revenues, gigs &amp; deposits
              </div>
            </div>

            {/* Total Outflows */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2 shadow-lg">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
                Ledger Outflows
              </span>
              <div className="text-2xl font-black text-rose-400 font-mono">
                -${totalOutflows.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </div>
              <div className="text-[11px] font-mono text-slate-500">
                Payouts, expenses &amp; giving
              </div>
            </div>

            {/* Net Treasury Balance */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2 shadow-lg bg-gradient-to-br from-slate-900 to-slate-950">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-yellow-400" />
                Net Treasury Reserve
              </span>
              <div className={`text-2xl font-black font-mono ${currentBalance >= 0 ? "text-white" : "text-rose-400"}`}>
                ${currentBalance.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </div>
              <div className="text-[11px] font-mono text-slate-500">
                Baseline + Inflows - Outflows
              </div>
            </div>
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
                              onClick={() => handleDeleteTransaction(tx)}
                              className="text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg p-1.5 transition cursor-pointer inline-flex items-center justify-center"
                              title="Delete transaction / expense"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
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
                  Suggest a Band Gift
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
                    Proposed Gift Amount ($ USD)
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
                  {isSubmittingSuggestion ? "Submitting..." : "Submit Gift Suggestion"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* {/* ------------------------------------------------------------- */}
      {/* MODAL: ADD OR RECORD BAND GIFT (CONSOLIDATED)                 */}
      {/* ------------------------------------------------------------- */}
      {isNewGiftModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-black text-white uppercase tracking-tight">
                  Add or Record Band Gift
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsNewGiftModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateNewGift} className="space-y-4">
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs space-y-2">
                <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-slate-300">
                  Target Destination / Status *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewGiftStatus("suggested")}
                    className={`p-2.5 rounded-xl border text-left transition ${
                      newGiftStatus === "suggested"
                        ? "bg-yellow-400/15 border-yellow-400 text-yellow-300 font-bold"
                        : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
                    }`}
                  >
                    <div className="text-xs">Queue for Voting</div>
                    <div className="text-[10px] text-slate-500 font-normal">Members rank 1-10</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewGiftStatus("completed")}
                    className={`p-2.5 rounded-xl border text-left transition ${
                      newGiftStatus === "completed"
                        ? "bg-emerald-500/15 border-emerald-400 text-emerald-300 font-bold"
                        : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
                    }`}
                  >
                    <div className="text-xs">Awarded Band Gift</div>
                    <div className="text-[10px] text-slate-500 font-normal">Immediate band grant</div>
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-slate-300">
                  Organization / Grassroots Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Bloomfield Community Garden, Women's Center & Shelter"
                  value={newGiftOrgName}
                  onChange={(e) => setNewGiftOrgName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400 font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-slate-300">
                    Category *
                  </label>
                  <select
                    value={newGiftCategory}
                    onChange={(e) => setNewGiftCategory(e.target.value as DonationCategory)}
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
                    {newGiftStatus === "completed" ? "Awarded Gift Amount ($ USD) *" : "Proposed Gift Amount ($ USD)"}
                  </label>
                  <input
                    type="number"
                    step="1"
                    placeholder="250"
                    value={newGiftStatus === "completed" ? newGiftAmount : newGiftTargetAmount}
                    onChange={(e) => {
                      if (newGiftStatus === "completed") {
                        setNewGiftAmount(e.target.value);
                      } else {
                        setNewGiftTargetAmount(e.target.value);
                      }
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400 font-mono"
                  />
                </div>
              </div>

              {newGiftStatus === "completed" && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <DatePicker
                      label="Date Donated *"
                      value={newGiftDate}
                      onChange={(d) => setNewGiftDate(d)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-slate-300">
                      Fiscal Year *
                    </label>
                    <input
                      type="text"
                      value={newGiftFiscalYear}
                      onChange={(e) => setNewGiftFiscalYear(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400 font-mono"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-slate-300">
                  Website / Social Link
                </label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={newGiftWebsite}
                  onChange={(e) => setNewGiftWebsite(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-slate-300">
                  Attributed Member (Optional)
                </label>
                <select
                  value={newGiftAttributedMemberUid}
                  onChange={(e) => setNewGiftAttributedMemberUid(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400"
                >
                  <option value="">-- Seeded by Management (No specific member) --</option>
                  {rosterMembers.map((m) => (
                    <option key={m.uid} value={m.uid}>
                      {m.displayName || m.realName || "Musician"}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-slate-300">
                  Gifts Previously Given (Retroactive Count)
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={newGiftGiftsGiven}
                  onChange={(e) => setNewGiftGiftsGiven(e.target.value)}
                  placeholder="1"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400 font-mono"
                />
                <p className="text-[10px] text-slate-500">
                  Track gifts previously given to this cause before adding it to the hub.
                </p>
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-slate-300">
                  Cause Description / Community Rationale *
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="Explain why this organization aligns with our community mission..."
                  value={newGiftDesc}
                  onChange={(e) => setNewGiftDesc(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-yellow-400 leading-relaxed"
                />
              </div>

              {newGiftStatus === "completed" && (
                <>
                  <div className="space-y-1">
                    <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-slate-300">
                      Public Impact Note
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Funded 5 youth brass band instruments for summer camp"
                      value={newGiftImpactNote}
                      onChange={(e) => setNewGiftImpactNote(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-slate-300">
                      Internal Check Reference / Audit Notes
                    </label>
                    <input
                      type="text"
                      placeholder="Check #1042, Venmo confirmation, treasurer notes..."
                      value={newGiftNotes}
                      onChange={(e) => setNewGiftNotes(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400"
                    />
                  </div>

                  <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                    <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-300">
                      Public Website Listing &amp; Privacy
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg bg-slate-900 border border-slate-800/80">
                        <input
                          type="checkbox"
                          checked={newGiftIsPublic}
                          onChange={(e) => setNewGiftIsPublic(e.target.checked)}
                          className="rounded border-slate-700 text-yellow-400 focus:ring-yellow-400"
                        />
                        <span className="text-xs text-slate-300">List on Public Giving Page</span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg bg-slate-900 border border-slate-800/80">
                        <input
                          type="checkbox"
                          checked={newGiftShowAmountPublicly}
                          onChange={(e) => setNewGiftShowAmountPublicly(e.target.checked)}
                          className="rounded border-slate-700 text-yellow-400 focus:ring-yellow-400"
                        />
                        <span className="text-xs text-slate-300">Show Gift Dollar Amount ($)</span>
                      </label>
                    </div>
                  </div>
                </>
              )}

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewGiftModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingNewGift}
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black uppercase tracking-wider transition disabled:opacity-50"
                >
                  {isSubmittingNewGift ? "Saving..." : newGiftStatus === "suggested" ? "Add to Voting Queue" : "Award Band Gift"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: APPROVE CAUSE & CONFIRM DONATION                       */}
      {/* ------------------------------------------------------------- */}
      {causeToApprove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-black text-white uppercase tracking-tight">
                  Approve &amp; Activate Band Gift
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setCauseToApprove(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Cause Overview Banner */}
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h4 className="text-base font-bold text-white tracking-tight">{causeToApprove.organizationName}</h4>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Category: <span className="capitalize text-slate-300 font-mono">{causeToApprove.category.replace(/_/g, " ")}</span>
                    {causeToApprove.suggestedByName && (
                      <span className="ml-2">• Suggested by <strong className="text-yellow-400">{causeToApprove.suggestedByName}</strong></span>
                    )}
                  </div>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 uppercase font-bold shrink-0">
                  Activation Review
                </span>
              </div>

              {/* Proposed vs Confirmed Callout */}
              <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800/80 flex items-center justify-between">
                <span className="text-xs text-slate-400 font-mono">Proposed Gift Amount:</span>
                <span className="text-sm font-mono font-bold text-yellow-400">
                  {causeToApprove.targetAmount > 0 ? `$${causeToApprove.targetAmount.toLocaleString()}` : "Not specified"}
                </span>
              </div>
            </div>

            <form onSubmit={handleConfirmApproveAndDonate} className="space-y-4">
              {/* Confirmed Amount */}
              <div className="space-y-1">
                <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-slate-300">
                  Awarded Gift Amount ($ USD) *
                </label>
                <div className="relative">
                  <DollarSign className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    placeholder="250.00"
                    value={confirmAmount}
                    onChange={(e) => setConfirmAmount(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-base text-white focus:outline-none focus:border-yellow-400 font-mono font-bold"
                  />
                </div>
                <p className="text-[10px] text-slate-500">
                  Verify and confirm the actual donation amount authorized from the band fund.
                </p>
              </div>

              {/* Date Donated & Fiscal Year */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-slate-300">
                    Donation Date *
                  </label>
                  <DatePicker
                    value={confirmDate}
                    onChange={(d) => setConfirmDate(d)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-slate-300">
                    Fiscal Year *
                  </label>
                  <input
                    type="text"
                    required
                    value={confirmFiscalYear}
                    onChange={(e) => setConfirmFiscalYear(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400 font-mono font-bold"
                  />
                </div>
              </div>

              {/* Cumulative Gifts Given */}
              <div className="space-y-1">
                <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-slate-300">
                  Cumulative Gifts Given (Including this grant)
                </label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    disabled={confirmGiftsCount <= 1}
                    onClick={() => setConfirmGiftsCount((c) => Math.max(1, c - 1))}
                    className="w-10 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold flex items-center justify-center disabled:opacity-40 transition cursor-pointer"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    required
                    value={confirmGiftsCount}
                    onChange={(e) => setConfirmGiftsCount(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-center text-sm font-mono font-bold text-yellow-400 focus:outline-none focus:border-yellow-400"
                  />
                  <button
                    type="button"
                    onClick={() => setConfirmGiftsCount((c) => c + 1)}
                    className="w-10 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold flex items-center justify-center transition cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-[10px] text-slate-500">
                  Automatically increments to account for this newly activated gift.
                </p>
              </div>

              {/* Public Impact Note */}
              <div className="space-y-1">
                <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-slate-300">
                  Public Impact Note (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Band donation sponsored youth music lessons and instruments"
                  value={confirmImpactNote}
                  onChange={(e) => setConfirmImpactNote(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400"
                />
              </div>

              {/* Internal Review Notes */}
              <div className="space-y-1">
                <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-slate-300">
                  Internal Notes / Check Reference (Optional)
                </label>
                <input
                  type="text"
                  placeholder="Check #1042, Venmo confirmation, treasurer approval notes..."
                  value={confirmNotes}
                  onChange={(e) => setConfirmNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400"
                />
              </div>

              {/* Public Website Listing & Privacy */}
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-300">
                  Public Website Listing &amp; Privacy
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg bg-slate-900 border border-slate-800/80">
                    <input
                      type="checkbox"
                      checked={confirmIsPublic}
                      onChange={(e) => setConfirmIsPublic(e.target.checked)}
                      className="rounded border-slate-700 text-yellow-400 focus:ring-yellow-400"
                    />
                    <span className="text-xs text-slate-300">List on Public Giving Page</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg bg-slate-900 border border-slate-800/80">
                    <input
                      type="checkbox"
                      checked={confirmShowAmountPublicly}
                      onChange={(e) => setConfirmShowAmountPublicly(e.target.checked)}
                      className="rounded border-slate-700 text-yellow-400 focus:ring-yellow-400"
                    />
                    <span className="text-xs text-slate-300">Show Gift Dollar Amount ($)</span>
                  </label>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCauseToApprove(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isConfirmingDonation}
                  className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black uppercase tracking-wider transition disabled:opacity-50 inline-flex items-center gap-1.5 shadow-lg shadow-emerald-500/10 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isConfirmingDonation ? "Recording..." : "Confirm & Activate Band Gift"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: ADJUST GIFTS GIVEN RETROACTIVELY                       */}
      {/* ------------------------------------------------------------- */}
      {adjustGiftsCause && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Gift className="w-5 h-5 text-yellow-400" />
                <h3 className="text-base font-black text-white uppercase tracking-tight">
                  Adjust Gifts Given
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setAdjustGiftsCause(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-1">
              <div className="text-sm font-bold text-white">{adjustGiftsCause.organizationName}</div>
              <p className="text-xs text-slate-400">
                Track the cumulative number of gifts or grants received by this organization from the band. Update this count retroactively for prior donations.
              </p>
            </div>

            <form onSubmit={handleSaveAdjustGifts} className="space-y-4">
              <div className="space-y-2">
                <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-slate-300">
                  Total Gifts Given
                </label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    disabled={adjustGiftsCount <= 0}
                    onClick={() => setAdjustGiftsCount((c) => Math.max(0, c - 1))}
                    className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold flex items-center justify-center disabled:opacity-40 transition cursor-pointer"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    required
                    value={adjustGiftsCount}
                    onChange={(e) => setAdjustGiftsCount(Math.max(0, parseInt(e.target.value, 10) || 0))}
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-center text-lg font-mono font-bold text-yellow-400 focus:outline-none focus:border-yellow-400"
                  />
                  <button
                    type="button"
                    onClick={() => setAdjustGiftsCount((c) => c + 1)}
                    className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold flex items-center justify-center transition cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAdjustGiftsCause(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAdjustingGifts}
                  className="px-5 py-2 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-slate-950 text-xs font-black uppercase tracking-wider transition disabled:opacity-50"
                >
                  {isAdjustingGifts ? "Saving..." : "Save Gifts Count"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* {/* ------------------------------------------------------------- */}
      {/* MODAL: EDIT BAND GIFT (SUGGESTED OR AWARDED)                  */}
      {/* ------------------------------------------------------------- */}
      {editingGift && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Gift className="w-5 h-5 text-yellow-400" />
                <h3 className="text-base font-black text-white uppercase tracking-tight">
                  Edit Band Gift
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingGift(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditGift} className="space-y-4">
              {/* Status Switcher */}
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs space-y-2">
                <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-slate-300">
                  Status &amp; Lifecycle *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditStatus("suggested")}
                    className={`p-2.5 rounded-xl border text-left transition ${
                      editStatus === "suggested"
                        ? "bg-yellow-400/15 border-yellow-400 text-yellow-300 font-bold"
                        : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
                    }`}
                  >
                    <div className="text-xs">Gift Suggestion</div>
                    <div className="text-[10px] text-slate-500 font-normal">Voting queue</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditStatus("completed")}
                    className={`p-2.5 rounded-xl border text-left transition ${
                      editStatus === "completed"
                        ? "bg-emerald-500/15 border-emerald-400 text-emerald-300 font-bold"
                        : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
                    }`}
                  >
                    <div className="text-xs">Awarded Band Gift</div>
                    <div className="text-[10px] text-slate-500 font-normal">Completed grant</div>
                  </button>
                </div>
              </div>

              {/* Organization Name */}
              <div className="space-y-1">
                <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-slate-300">
                  Organization / Grassroots Name *
                </label>
                <input
                  type="text"
                  required
                  value={editOrgName}
                  onChange={(e) => setEditOrgName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400 font-bold"
                />
              </div>

              {/* Category & Amounts */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-slate-300">
                    Category *
                  </label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value as DonationCategory)}
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
                    Awarded Amount ($ USD)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editAmount}
                    onChange={(e) => setEditAmount(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400 font-mono font-bold"
                  />
                </div>
              </div>

              {/* Target Amount & Date */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-slate-300">
                    Proposed Target ($ USD)
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    value={editTargetAmount}
                    onChange={(e) => setEditTargetAmount(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <DatePicker
                    label="Award / Donation Date"
                    value={editDate}
                    onChange={(d) => setEditDate(d)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400"
                  />
                </div>
              </div>

              {/* Fiscal Year & Cumulative Gifts */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-slate-300">
                    Fiscal Year
                  </label>
                  <input
                    type="text"
                    value={editFiscalYear}
                    onChange={(e) => setEditFiscalYear(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-slate-300">
                    Cumulative Gifts Given
                  </label>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={editGiftsGivenCount <= 0}
                      onClick={() => setEditGiftsGivenCount((c) => Math.max(0, c - 1))}
                      className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold flex items-center justify-center disabled:opacity-40 transition cursor-pointer"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={editGiftsGivenCount}
                      onChange={(e) => setEditGiftsGivenCount(Math.max(0, parseInt(e.target.value, 10) || 0))}
                      className="flex-1 bg-slate-950 border border-slate-800 rounded-xl py-1.5 px-2 text-center text-xs font-mono font-bold text-yellow-400 focus:outline-none focus:border-yellow-400"
                    />
                    <button
                      type="button"
                      onClick={() => setEditGiftsGivenCount((c) => c + 1)}
                      className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold flex items-center justify-center transition cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Website */}
              <div className="space-y-1">
                <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-slate-300">
                  Website / Social Link
                </label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={editWebsite}
                  onChange={(e) => setEditWebsite(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400"
                />
              </div>

              {/* Attributed Member */}
              <div className="space-y-1">
                <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-slate-300">
                  Attributed Member (Optional)
                </label>
                <select
                  value={editAttributedMemberUid}
                  onChange={(e) => setEditAttributedMemberUid(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400"
                >
                  <option value="">-- No specific member attributed --</option>
                  {rosterMembers.map((m) => (
                    <option key={m.uid} value={m.uid}>
                      {m.displayName || m.realName || "Musician"}
                    </option>
                  ))}
                </select>
              </div>

              {/* Rationale / Description */}
              <div className="space-y-1">
                <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-slate-300">
                  Cause Description / Community Rationale
                </label>
                <textarea
                  rows={2}
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-yellow-400 leading-relaxed"
                />
              </div>

              {/* Public Impact Note */}
              <div className="space-y-1">
                <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-slate-300">
                  Public Impact Note (Shown on Public/Portal Directory)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Sponsored instruments for after-school youth band..."
                  value={editPublicImpactNote}
                  onChange={(e) => setEditPublicImpactNote(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400"
                />
              </div>

              {/* Internal Check Reference / Audit Notes */}
              <div className="space-y-1">
                <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-slate-300">
                  Internal Check Reference / Audit Notes
                </label>
                <input
                  type="text"
                  placeholder="Check #1042, Venmo confirmation, treasurer notes..."
                  value={editInternalNotes}
                  onChange={(e) => setEditInternalNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400"
                />
              </div>

              {/* Public Website Listing & Privacy */}
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-300">
                  Public Website Listing &amp; Privacy
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg bg-slate-900 border border-slate-800/80">
                    <input
                      type="checkbox"
                      checked={editIsPublic}
                      onChange={(e) => setEditIsPublic(e.target.checked)}
                      className="rounded border-slate-700 text-yellow-400 focus:ring-yellow-400"
                    />
                    <span className="text-xs text-slate-300">List on Public Giving Page</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg bg-slate-900 border border-slate-800/80">
                    <input
                      type="checkbox"
                      checked={editShowAmountPublicly}
                      onChange={(e) => setEditShowAmountPublicly(e.target.checked)}
                      className="rounded border-slate-700 text-yellow-400 focus:ring-yellow-400"
                    />
                    <span className="text-xs text-slate-300">Show Gift Dollar Amount ($)</span>
                  </label>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingGift(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingEditGift}
                  className="px-5 py-2 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-slate-950 text-xs font-black uppercase tracking-wider transition disabled:opacity-50 cursor-pointer shadow-lg shadow-yellow-400/10"
                >
                  {isSavingEditGift ? "Saving..." : "Save Band Gift Changes"}
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

