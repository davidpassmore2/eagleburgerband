"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  setDoc,
  doc,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/lib/context/AuthContext";
import {
  Reimbursement,
  ReimbursementSchema,
  ExpenseCategoryEnum,
} from "@/lib/schema/reimbursement";
import {
  Receipt,
  PlusCircle,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  DollarSign,
  Settings,
  X,
  Loader2,
  ExternalLink,
  CreditCard,
} from "lucide-react";
import DatePicker from "@/components/ui/DatePicker";

const CATEGORY_LABELS: Record<string, string> = {
  gear_repairs: "Gear & Repairs",
  travel_fuel: "Travel & Fuel",
  food_beverage: "Food & Beverage",
  rehearsal_space: "Rehearsal Space",
  merchandise: "Merchandise",
  admin_software: "Admin & Software",
  sheet_music: "Sheet Music & Charts",
  uniforms_attire: "Uniforms & Attire",
  other: "Other Expense",
};

interface GigOption {
  id: string;
  title: string;
  date: string;
}

export default function MemberReimbursementsPage() {
  const { profile, loading: authLoading } = useAuth();
  const [reimbursements, setReimbursements] = useState<Reimbursement[]>([]);
  const [gigs, setGigs] = useState<GigOption[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("all");

  // Form State
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<string>("gear_repairs");
  const [expenseDate, setExpenseDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [description, setDescription] = useState("");
  const [selectedGigId, setSelectedGigId] = useState("");
  const [receiptUrl, setReceiptUrl] = useState("");
  const [receiptNote, setReceiptNote] = useState("");
  const [payoutMethod, setPayoutMethod] = useState<string>("venmo");
  const [paymentHandle, setPaymentHandle] = useState("");
  const [saveHandleToProfile, setSaveHandleToProfile] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Account Preferences Modal State
  const [prefMethod, setPrefMethod] = useState("venmo");
  const [prefVenmo, setPrefVenmo] = useState("");
  const [prefPaypal, setPrefPaypal] = useState("");
  const [prefZelle, setPrefZelle] = useState("");
  const [prefNotes, setPrefNotes] = useState("");
  const [isSavingAccount, setIsSavingAccount] = useState(false);

  const handleOpenAccountModal = () => {
    const prefs = profile?.payoutPreferences;
    if (prefs) {
      setPrefMethod(prefs.preferredMethod || "venmo");
      setPrefVenmo(prefs.venmoHandle || "");
      setPrefPaypal(prefs.paypalEmail || "");
      setPrefZelle(prefs.zelleIdentifier || "");
      setPrefNotes(prefs.notes || "");
    }
    setIsAccountModalOpen(true);
  };

  const handleOpenCreateModal = () => {
    const prefs = profile?.payoutPreferences;
    if (prefs) {
      const method = prefs.preferredMethod || "venmo";
      setPayoutMethod(method);
      if (method === "venmo") setPaymentHandle(prefs.venmoHandle || "");
      else if (method === "paypal") setPaymentHandle(prefs.paypalEmail || "");
      else if (method === "zelle") setPaymentHandle(prefs.zelleIdentifier || "");
    }
    setFormError(null);
    setIsCreateModalOpen(true);
  };


  // Listen to member's personal reimbursements
  useEffect(() => {
    if (!profile?.uid) return;

    const q = query(
      collection(db, "reimbursements"),
      where("applicantUid", "==", profile.uid),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const list: Reimbursement[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...docSnap.data() } as Reimbursement);
        });
        setReimbursements(list);
        setLoadingRequests(false);
      },
      (err) => {
        console.warn("Reimbursements subscriber note:", err);
        setLoadingRequests(false);
      }
    );

    return () => unsub();
  }, [profile]);

  // Listen to recent/upcoming gigs for optional tagging
  useEffect(() => {
    const qGigs = query(collection(db, "gigs"), orderBy("date", "desc"));
    const unsubGigs = onSnapshot(qGigs, (snap) => {
      const gigOpts: GigOption[] = [];
      snap.forEach((d) => {
        const data = d.data();
        const title = data.internalLogistics?.title || data.publicDetails?.title || "Band Gig";
        gigOpts.push({ id: d.id, title, date: data.date || "" });
      });
      setGigs(gigOpts.slice(0, 30));
    });

    return () => unsubGigs();
  }, []);

  // Update payment handle dynamically if user changes payout method in form
  const handlePayoutMethodChange = (newMethod: string) => {
    setPayoutMethod(newMethod);
    const prefs = profile?.payoutPreferences;
    if (prefs) {
      if (newMethod === "venmo") setPaymentHandle(prefs.venmoHandle || "");
      else if (newMethod === "paypal") setPaymentHandle(prefs.paypalEmail || "");
      else if (newMethod === "zelle") setPaymentHandle(prefs.zelleIdentifier || "");
      else setPaymentHandle("");
    }
  };

  // Submit Reimbursement Request
  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.uid) return;

    setFormError(null);
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setFormError("Please enter a valid dollar amount greater than $0.00.");
      return;
    }
    if (!description.trim()) {
      setFormError("Please enter a brief description of the expense.");
      return;
    }
    if (!paymentHandle.trim() && payoutMethod !== "check") {
      setFormError(`Please enter your ${payoutMethod === "venmo" ? "Venmo username" : payoutMethod === "paypal" ? "PayPal email" : "payout account"} handle.`);
      return;
    }

    setIsSubmitting(true);
    try {
      const newId = `reimb_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const selectedGig = gigs.find((g) => g.id === selectedGigId);

      const dataToValidate = {
        id: newId,
        applicantUid: profile.uid,
        applicantName: profile.displayName || "Musician",
        applicantEmail: profile.email || "",
        applicantSectionId: profile.sectionId || null,
        amount: Number(parsedAmount.toFixed(2)),
        description: description.trim(),
        category,
        expenseDate,
        gigId: selectedGigId || null,
        gigTitle: selectedGig ? selectedGig.title : null,
        receiptUrl: receiptUrl.trim(),
        receiptNote: receiptNote.trim(),
        paymentMethod: payoutMethod,
        paymentHandle: paymentHandle.trim(),
        status: "submitted",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const validated = ReimbursementSchema.parse(dataToValidate);
      await setDoc(doc(db, "reimbursements", newId), validated);

      // Optionally update user's profile preferences if checked
      if (saveHandleToProfile && profile.uid) {
        const updatePayload: Record<string, string> = {
          "payoutPreferences.preferredMethod": payoutMethod,
        };
        if (payoutMethod === "venmo") updatePayload["payoutPreferences.venmoHandle"] = paymentHandle.trim();
        else if (payoutMethod === "paypal") updatePayload["payoutPreferences.paypalEmail"] = paymentHandle.trim();
        else if (payoutMethod === "zelle") updatePayload["payoutPreferences.zelleIdentifier"] = paymentHandle.trim();
        await updateDoc(doc(db, "users", profile.uid), updatePayload);
      }

      // Reset form
      setAmount("");
      setDescription("");
      setReceiptUrl("");
      setReceiptNote("");
      setIsCreateModalOpen(false);
    } catch (err) {
      console.error("Failed to submit reimbursement:", err);
      setFormError(err instanceof Error ? err.message : "Failed to submit request.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Save Account Preferences from inline modal
  const handleSaveAccountPreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.uid) return;
    setIsSavingAccount(true);

    try {
      await updateDoc(doc(db, "users", profile.uid), {
        payoutPreferences: {
          preferredMethod: prefMethod,
          venmoHandle: prefVenmo.trim(),
          paypalEmail: prefPaypal.trim(),
          zelleIdentifier: prefZelle.trim(),
          notes: prefNotes.trim(),
        },
        updatedAt: new Date().toISOString(),
      });
      setIsAccountModalOpen(false);
    } catch (err) {
      alert("Failed to save payout preferences: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsSavingAccount(false);
    }
  };

  // Metrics calculations
  const stats = useMemo(() => {
    let totalRequested = 0;
    let totalPaid = 0;
    let totalPending = 0;

    reimbursements.forEach((r) => {
      totalRequested += r.amount;
      if (r.status === "paid") {
        totalPaid += r.amount;
      } else if (r.status === "submitted" || r.status === "approved") {
        totalPending += r.amount;
      }
    });

    return { totalRequested, totalPaid, totalPending };
  }, [reimbursements]);

  // Filtered requests
  const filteredList = useMemo(() => {
    if (filterStatus === "all") return reimbursements;
    return reimbursements.filter((r) => r.status === filterStatus);
  }, [reimbursements, filterStatus]);

  if (authLoading || loadingRequests) {
    return (
      <div className="p-8 text-center text-slate-400 flex items-center justify-center min-h-[50vh]">
        <div className="space-y-2">
          <div className="w-8 h-8 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-mono">Loading reimbursement workstation...</p>
        </div>
      </div>
    );
  }

  const activeMethod = profile?.payoutPreferences?.preferredMethod || "venmo";
  const activeHandle =
    activeMethod === "venmo"
      ? profile?.payoutPreferences?.venmoHandle
      : activeMethod === "paypal"
      ? profile?.payoutPreferences?.paypalEmail
      : profile?.payoutPreferences?.zelleIdentifier;

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      {/* Top Header */}
      <div
        suppressHydrationWarning
        style={{
          backgroundColor: "var(--ebb-surface)",
          borderColor: "var(--ebb-border)",
        }}
        className="border rounded-2xl p-5 sm:p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-xl transition-colors"
      >
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span
              suppressHydrationWarning
              style={{
                backgroundColor: "var(--ebb-surface-muted)",
                borderColor: "var(--ebb-border)",
                color: "var(--ebb-primary)",
              }}
              className="text-xs font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded border"
            >
              Musician Treasury
            </span>
            <span className="text-xs font-mono text-slate-400">
              {reimbursements.length} Requests Filed
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-2.5">
            <Receipt className="w-7 h-7 text-yellow-400" />
            <span>Expense Reimbursements &amp; Payouts</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Submit out-of-pocket band purchases, track disbursement status, and manage your Venmo &amp; PayPal payout accounts.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto shrink-0">
          <button
            type="button"
            onClick={handleOpenAccountModal}
            suppressHydrationWarning
            style={{
              backgroundColor: "var(--ebb-surface-muted)",
              borderColor: "var(--ebb-border)",
            }}
            className="text-slate-300 hover:text-white border px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition flex-1 md:flex-initial shadow-sm"
          >
            <Settings className="w-4 h-4 text-yellow-400" />
            <span>Payout Accounts</span>
          </button>

          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold px-4 py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 transition shadow flex-1 md:flex-initial"
          >
            <PlusCircle className="w-4 h-4" />
            <span>New Expense Request</span>
          </button>
        </div>
      </div>

      {/* Overview Telemetry & Account Quick Status Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Pending Balance */}
        <div
          suppressHydrationWarning
          style={{
            backgroundColor: "var(--ebb-surface)",
            borderColor: "var(--ebb-border)",
          }}
          className="border rounded-2xl p-4 space-y-1 shadow transition-colors"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase font-bold text-slate-400 flex items-center gap-1">
              <Clock className="w-3 h-3 text-amber-400" /> Awaiting Payout
            </span>
            <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">
              Pending
            </span>
          </div>
          <div className="text-2xl font-black text-white">${stats.totalPending.toFixed(2)}</div>
          <p className="text-[11px] text-slate-400">
            Approved or under review by Treasurer.
          </p>
        </div>

        {/* Metric 2: Settled Reimbursed */}
        <div
          suppressHydrationWarning
          style={{
            backgroundColor: "var(--ebb-surface)",
            borderColor: "var(--ebb-border)",
          }}
          className="border rounded-2xl p-4 space-y-1 shadow transition-colors"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase font-bold text-slate-400 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Total Reimbursed
            </span>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
              Settled
            </span>
          </div>
          <div className="text-2xl font-black text-emerald-400">${stats.totalPaid.toFixed(2)}</div>
          <p className="text-[11px] text-slate-400">
            Successfully disbursed to your account.
          </p>
        </div>

        {/* Metric 3: Cumulative Requested */}
        <div
          suppressHydrationWarning
          style={{
            backgroundColor: "var(--ebb-surface)",
            borderColor: "var(--ebb-border)",
          }}
          className="border rounded-2xl p-4 space-y-1 shadow transition-colors"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase font-bold text-slate-400 flex items-center gap-1">
              <DollarSign className="w-3 h-3 text-slate-400" /> All-Time Filed
            </span>
            <span className="text-[10px] font-mono text-slate-400 bg-white/5 px-1.5 py-0.5 rounded">
              Lifetime
            </span>
          </div>
          <div className="text-2xl font-black text-white">${stats.totalRequested.toFixed(2)}</div>
          <p className="text-[11px] text-slate-400">
            Across {reimbursements.length} submitted claim(s).
          </p>
        </div>

        {/* Metric 4: Payout Handle Status Card */}
        <div
          suppressHydrationWarning
          style={{
            backgroundColor: "var(--ebb-surface)",
            borderColor: "var(--ebb-border)",
          }}
          className="border rounded-2xl p-4 flex flex-col justify-between shadow transition-colors"
        >
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase font-bold text-slate-400 flex items-center gap-1">
                <CreditCard className="w-3 h-3 text-yellow-400" /> Payout Destination
              </span>
              <button
                type="button"
                onClick={handleOpenAccountModal}
                className="text-[10px] text-yellow-400 hover:underline font-bold"
              >
                Edit
              </button>
            </div>
            <div className="font-bold text-white text-sm flex items-center gap-1.5 capitalize">
              <span>{activeMethod}</span>
              {activeHandle ? (
                <span className="text-emerald-400 font-mono text-xs font-normal">
                  ({activeHandle})
                </span>
              ) : (
                <span className="text-amber-400 font-normal text-xs">(Setup Needed)</span>
              )}
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            Disbursements will be routed directly to this handle.
          </p>
        </div>
      </div>

      {/* Main Request History Log Section */}
      <div className="space-y-4">
        {/* Filter Navigation Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono uppercase font-bold text-slate-400">Filter:</span>
            <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/10 flex-wrap">
              {[
                { id: "all", label: "All Requests" },
                { id: "submitted", label: "Submitted" },
                { id: "approved", label: "Approved" },
                { id: "paid", label: "Paid" },
                { id: "rejected", label: "Rejected" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilterStatus(tab.id)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                    filterStatus === tab.id
                      ? "bg-yellow-400 text-slate-950 font-bold shadow"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <span className="text-xs font-mono text-slate-500">
            Showing {filteredList.length} of {reimbursements.length} records
          </span>
        </div>

        {/* Requests List */}
        {filteredList.length === 0 ? (
          <div
            suppressHydrationWarning
            style={{
              backgroundColor: "var(--ebb-surface)",
              borderColor: "var(--ebb-border)",
            }}
            className="border rounded-2xl p-12 text-center text-slate-400 text-xs shadow space-y-3"
          >
            <Receipt className="w-10 h-10 text-slate-600 mx-auto" />
            <div>
              <div className="text-sm font-bold text-white">No Expense Requests Found</div>
              <p className="text-slate-400 mt-1">
                {filterStatus === "all"
                  ? "You haven't submitted any expense reimbursement requests yet."
                  : `No requests with status '${filterStatus}'.`}
              </p>
            </div>
            <button
              type="button"
              onClick={handleOpenCreateModal}
              className="bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs inline-flex items-center gap-1.5 transition shadow"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Submit Your First Request</span>
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredList.map((r) => {
              const categoryLabel = CATEGORY_LABELS[r.category] || r.category;

              return (
                <div
                  key={r.id}
                  suppressHydrationWarning
                  style={{
                    backgroundColor: "var(--ebb-surface)",
                    borderColor: "var(--ebb-border)",
                  }}
                  className="border rounded-2xl p-5 shadow transition-colors space-y-3 hover:brightness-105"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-mono font-bold text-slate-400">
                          {r.expenseDate}
                        </span>
                        <span
                          suppressHydrationWarning
                          style={{
                            backgroundColor: "var(--ebb-surface-muted)",
                            borderColor: "var(--ebb-border)",
                            color: "var(--ebb-primary)",
                          }}
                          className="text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded border"
                        >
                          {categoryLabel}
                        </span>
                        {r.gigTitle && (
                          <span className="text-[10px] font-mono bg-white/5 text-slate-300 px-2 py-0.5 rounded border border-white/10">
                            Gig: {r.gigTitle}
                          </span>
                        )}
                      </div>
                      <h3 className="text-base font-bold text-white">{r.description}</h3>
                    </div>

                    <div className="flex items-center gap-4 shrink-0 self-end sm:self-auto">
                      <div className="text-right">
                        <div className="text-xl font-black text-white">${r.amount.toFixed(2)}</div>
                        <div className="text-[10px] text-slate-400 font-mono uppercase">
                          Via {r.paymentMethod} {r.paymentHandle ? `(${r.paymentHandle})` : ""}
                        </div>
                      </div>

                      {/* Status Badges */}
                      <div>
                        {r.status === "submitted" && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                            <Clock className="w-3.5 h-3.5" /> In Review
                          </span>
                        )}
                        {r.status === "approved" && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-sky-500/10 text-sky-400 border border-sky-500/30">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Approved
                          </span>
                        )}
                        {r.status === "paid" && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-sm">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Paid &amp; Settled
                          </span>
                        )}
                        {r.status === "rejected" && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30">
                            <XCircle className="w-3.5 h-3.5" /> Rejected
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Metadata, Receipt & Treasurer Review Row */}
                  {(r.reviewNotes || r.payoutReference || r.receiptUrl || r.receiptNote) && (
                    <div className="pt-2 border-t border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                      <div className="space-y-1">
                        {r.status === "paid" && (
                          <div className="text-emerald-400 font-mono text-[11px] flex items-center gap-1.5">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>
                              Disbursed {r.paidAt ? new Date(r.paidAt).toLocaleDateString() : ""}
                              {r.payoutReference ? ` • Reference: ${r.payoutReference}` : ""}
                            </span>
                          </div>
                        )}
                        {r.reviewNotes && (
                          <div className="text-slate-300 text-[11px]">
                            <strong className="text-yellow-400">Treasurer Note:</strong> {r.reviewNotes}
                          </div>
                        )}
                        {r.receiptNote && (
                          <div className="text-slate-400 text-[11px]">
                            <strong>Receipt Note:</strong> {r.receiptNote}
                          </div>
                        )}
                      </div>

                      {r.receiptUrl && (
                        <a
                          href={r.receiptUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-yellow-400 hover:text-yellow-300 font-semibold flex items-center gap-1 shrink-0 hover:underline"
                        >
                          <span>View Attached Receipt</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* New Reimbursement Request Modal */}
      {isCreateModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setIsCreateModalOpen(false)}
        >
          <div
            suppressHydrationWarning
            style={{
              backgroundColor: "var(--ebb-surface)",
              borderColor: "var(--ebb-border)",
            }}
            className="border rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              suppressHydrationWarning
              style={{ borderColor: "var(--ebb-border)" }}
              className="flex items-center justify-between p-4 sm:p-5 border-b shrink-0"
            >
              <div className="flex items-center gap-2.5">
                <div
                  suppressHydrationWarning
                  style={{
                    backgroundColor: "var(--ebb-surface-muted)",
                    borderColor: "var(--ebb-border)",
                    color: "var(--ebb-primary)",
                  }}
                  className="w-9 h-9 rounded-xl border flex items-center justify-center shrink-0"
                >
                  <Receipt className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-white">
                    Submit Expense Reimbursement
                  </h2>
                  <p className="text-xs text-slate-400">
                    File a claim for band expenses to be reviewed by the Treasurer.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form Content */}
            <form onSubmit={handleSubmitRequest} className="p-4 sm:p-5 overflow-y-auto space-y-4">
              {formError && (
                <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-xl p-3 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Amount & Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Amount ($ USD) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-slate-500 font-bold text-xs">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      style={{
                        backgroundColor: "var(--ebb-surface-muted)",
                        borderColor: "var(--ebb-border)",
                      }}
                      className="w-full border rounded-xl pl-7 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400 font-mono text-base font-bold"
                    />
                  </div>
                </div>

                <div>
                  <DatePicker
                    label="Date Incurred"
                    required
                    value={expenseDate}
                    onChange={(date) => setExpenseDate(date)}
                  />
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Expense Category *
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  style={{
                    backgroundColor: "var(--ebb-surface-muted)",
                    borderColor: "var(--ebb-border)",
                  }}
                  className="w-full border rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400"
                >
                  {ExpenseCategoryEnum.options.map((cat) => (
                    <option key={cat} value={cat} className="bg-slate-900 text-white">
                      {CATEGORY_LABELS[cat] || cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Description of Purchase / Expense *
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="e.g. Bass drum head replacement and tuning key purchased for Mattress Factory gig"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  style={{
                    backgroundColor: "var(--ebb-surface-muted)",
                    borderColor: "var(--ebb-border)",
                  }}
                  className="w-full border rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400 resize-none"
                />
              </div>

              {/* Associated Gig (Optional) */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center justify-between">
                  <span>Associated Performance / Event (Optional)</span>
                  <span className="text-[10px] text-slate-500">Links expense to gig ledger</span>
                </label>
                <select
                  value={selectedGigId}
                  onChange={(e) => setSelectedGigId(e.target.value)}
                  style={{
                    backgroundColor: "var(--ebb-surface-muted)",
                    borderColor: "var(--ebb-border)",
                  }}
                  className="w-full border rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400"
                >
                  <option value="" className="bg-slate-900 text-slate-400">
                    -- General Band Expense (No specific gig) --
                  </option>
                  {gigs.map((g) => (
                    <option key={g.id} value={g.id} className="bg-slate-900 text-white">
                      {g.date} &bull; {g.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Receipt URL / Notes */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-300">
                  Receipt Image URL or Drive Link (Optional)
                </label>
                <input
                  type="url"
                  placeholder="https://drive.google.com/... or receipt link"
                  value={receiptUrl}
                  onChange={(e) => setReceiptUrl(e.target.value)}
                  style={{
                    backgroundColor: "var(--ebb-surface-muted)",
                    borderColor: "var(--ebb-border)",
                  }}
                  className="w-full border rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400"
                />
                <input
                  type="text"
                  placeholder="Receipt store name, order number, or notes..."
                  value={receiptNote}
                  onChange={(e) => setReceiptNote(e.target.value)}
                  style={{
                    backgroundColor: "var(--ebb-surface-muted)",
                    borderColor: "var(--ebb-border)",
                  }}
                  className="w-full border rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400"
                />
              </div>

              {/* Payout Destination */}
              <div className="pt-2 border-t border-white/10 space-y-2">
                <label className="block text-xs font-semibold text-slate-300">
                  Payout Method &amp; Destination *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "venmo", label: "Venmo" },
                    { id: "paypal", label: "PayPal" },
                    { id: "zelle", label: "Zelle" },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => handlePayoutMethodChange(m.id)}
                      className={`py-1.5 px-2 rounded-lg text-xs font-bold border transition ${
                        payoutMethod === m.id
                          ? "bg-yellow-400/20 text-yellow-300 border-yellow-400/50"
                          : "bg-white/5 border-white/10 text-slate-400 hover:text-white"
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>

                <div>
                  <input
                    type="text"
                    required
                    placeholder={
                      payoutMethod === "venmo"
                        ? "@VenmoUsername"
                        : payoutMethod === "paypal"
                        ? "PayPal Account Email"
                        : "Zelle Phone / Email"
                    }
                    value={paymentHandle}
                    onChange={(e) => setPaymentHandle(e.target.value)}
                    style={{
                      backgroundColor: "var(--ebb-surface-muted)",
                      borderColor: "var(--ebb-border)",
                    }}
                    className="w-full border rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400 font-mono"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="saveToProfile"
                    checked={saveHandleToProfile}
                    onChange={(e) => setSaveHandleToProfile(e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-slate-700 bg-slate-900 text-yellow-400 focus:ring-yellow-400"
                  />
                  <label htmlFor="saveToProfile" className="text-[11px] text-slate-400 cursor-pointer">
                    Save this payout destination to my profile for future claims
                  </label>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-white/10 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-slate-300 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold px-5 py-2 rounded-xl text-xs flex items-center gap-1.5 transition shadow disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Submitting Claim...</span>
                    </>
                  ) : (
                    <>
                      <Receipt className="w-3.5 h-3.5" />
                      <span>Submit Claim</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payout Account Settings Quick Modal */}
      {isAccountModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setIsAccountModalOpen(false)}
        >
          <div
            suppressHydrationWarning
            style={{
              backgroundColor: "var(--ebb-surface)",
              borderColor: "var(--ebb-border)",
            }}
            className="border rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              suppressHydrationWarning
              style={{ borderColor: "var(--ebb-border)" }}
              className="flex items-center justify-between p-4 border-b shrink-0"
            >
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-yellow-400" />
                <h2 className="text-base font-bold text-white">Payout Account Settings</h2>
              </div>
              <button
                type="button"
                onClick={() => setIsAccountModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAccountPreferences} className="p-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Primary Payment Preference
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "venmo", label: "Venmo" },
                    { id: "paypal", label: "PayPal" },
                    { id: "zelle", label: "Zelle" },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setPrefMethod(m.id)}
                      className={`py-1.5 px-2 rounded-lg text-xs font-bold border transition ${
                        prefMethod === m.id
                          ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/50"
                          : "bg-white/5 border-white/10 text-slate-400 hover:text-white"
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Venmo Username (@handle)
                </label>
                <input
                  type="text"
                  placeholder="@username"
                  value={prefVenmo}
                  onChange={(e) => setPrefVenmo(e.target.value)}
                  style={{
                    backgroundColor: "var(--ebb-surface-muted)",
                    borderColor: "var(--ebb-border)",
                  }}
                  className="w-full border rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  PayPal Account Email
                </label>
                <input
                  type="email"
                  placeholder="musician@example.com"
                  value={prefPaypal}
                  onChange={(e) => setPrefPaypal(e.target.value)}
                  style={{
                    backgroundColor: "var(--ebb-surface-muted)",
                    borderColor: "var(--ebb-border)",
                  }}
                  className="w-full border rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Zelle Phone / Email
                </label>
                <input
                  type="text"
                  placeholder="Phone or email registered with Zelle"
                  value={prefZelle}
                  onChange={(e) => setPrefZelle(e.target.value)}
                  style={{
                    backgroundColor: "var(--ebb-surface-muted)",
                    borderColor: "var(--ebb-border)",
                  }}
                  className="w-full border rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Mailing Address or Check Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="Mailing address for physical check disbursements..."
                  value={prefNotes}
                  onChange={(e) => setPrefNotes(e.target.value)}
                  style={{
                    backgroundColor: "var(--ebb-surface-muted)",
                    borderColor: "var(--ebb-border)",
                  }}
                  className="w-full border rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400 resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAccountModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-slate-300 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingAccount}
                  className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition shadow disabled:opacity-50"
                >
                  {isSavingAccount ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  )}
                  <span>Save Account Details</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

