"use client";

import React, { useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { 
  DollarSign, 
  X, 
  Save, 
  Calculator, 
  CheckCircle2, 
  Clock, 
  Wallet
} from "lucide-react";

export type PerformerPayoutRecord = {
  uid: string;
  displayName: string;
  amount: number;
  paymentStatus: "unpaid" | "paid";
  paymentMethod: "venmo" | "cash" | "bank_transfer" | "other";
  paidAt?: string | null;
};

export type GigFinancials = {
  totalFee: number;
  settlementType: "band_fund" | "equal_split" | "fixed_guarantee";
  bandFundCut: number;
  fixedPerformerAmount?: number;
  payouts: Record<string, PerformerPayoutRecord>;
  notes?: string;
};

type AttendingPerformer = {
  uid: string;
  displayName: string;
};

type Props = {
  gigId: string;
  gigTitle: string;
  attendingPerformers: AttendingPerformer[];
  initialFinancials?: GigFinancials;
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
};

export default function GigFinanceModal({
  gigId,
  gigTitle,
  attendingPerformers,
  initialFinancials,
  isOpen,
  onClose,
  onSaved,
}: Props) {
  const [totalFee, setTotalFee] = useState<number>(initialFinancials?.totalFee ?? 0);
  const [settlementType, setSettlementType] = useState<"band_fund" | "equal_split" | "fixed_guarantee">(
    initialFinancials?.settlementType ?? "equal_split"
  );
  const [bandFundCut, setBandFundCut] = useState<number>(initialFinancials?.bandFundCut ?? 0);
  const [fixedAmount, setFixedAmount] = useState<number>(initialFinancials?.fixedPerformerAmount ?? 0);
  const [notes, setNotes] = useState<string>(initialFinancials?.notes ?? "");
  const [payouts, setPayouts] = useState<Record<string, PerformerPayoutRecord>>(() => {
    return initialFinancials?.payouts ?? {};
  });
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const calculatePerformerCut = (): number => {
    const count = attendingPerformers.length;
    if (count === 0) return 0;

    if (settlementType === "band_fund") return 0;
    if (settlementType === "fixed_guarantee") return fixedAmount;

    const distributable = Math.max(0, totalFee - bandFundCut);
    return Math.round((distributable / count) * 100) / 100;
  };

  const currentCut = calculatePerformerCut();

  const handleApplyCalculatedCuts = () => {
    const updated: Record<string, PerformerPayoutRecord> = { ...payouts };

    attendingPerformers.forEach((p) => {
      const existing = updated[p.uid];
      updated[p.uid] = {
        uid: p.uid,
        displayName: p.displayName,
        amount: currentCut,
        paymentStatus: existing ? existing.paymentStatus : "unpaid",
        paymentMethod: existing ? existing.paymentMethod : "venmo",
        paidAt: existing?.paidAt || null,
      };
    });

    setPayouts(updated);
  };

  const handleTogglePlayerStatus = (uid: string) => {
    const current = payouts[uid];
    const newStatus = current?.paymentStatus === "paid" ? "unpaid" : "paid";

    setPayouts({
      ...payouts,
      [uid]: {
        uid,
        displayName: current?.displayName || "Musician",
        amount: current?.amount ?? currentCut,
        paymentStatus: newStatus,
        paymentMethod: current?.paymentMethod || "venmo",
        paidAt: newStatus === "paid" ? new Date().toISOString() : null,
      },
    });
  };

  const handleMethodChange = (uid: string, method: "venmo" | "cash" | "bank_transfer" | "other") => {
    const current = payouts[uid];
    setPayouts({
      ...payouts,
      [uid]: {
        uid,
        displayName: current?.displayName || "Musician",
        amount: current?.amount ?? currentCut,
        paymentStatus: current?.paymentStatus || "unpaid",
        paymentMethod: method,
        paidAt: current?.paidAt || null,
      },
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Sanitize payouts to strip any undefined values
      const sanitizedPayouts: Record<string, PerformerPayoutRecord> = {};
      Object.entries(payouts).forEach(([key, record]) => {
        sanitizedPayouts[key] = {
          uid: record.uid,
          displayName: record.displayName || "Musician",
          amount: Number(record.amount) || 0,
          paymentStatus: record.paymentStatus || "unpaid",
          paymentMethod: record.paymentMethod || "venmo",
          paidAt: record.paidAt || null,
        };
      });

      const payload: Record<string, unknown> = {
        totalFee: Number(totalFee) || 0,
        settlementType,
        bandFundCut: Number(bandFundCut) || 0,
        payouts: sanitizedPayouts,
        notes: notes.trim(),
      };

      if (settlementType === "fixed_guarantee") {
        payload.fixedPerformerAmount = Number(fixedAmount) || 0;
      }

      await updateDoc(doc(db, "gigs", gigId), {
        financials: payload,
        "internalLogistics.compensation": settlementType === "band_fund" ? 0 : currentCut,
        updatedAt: new Date().toISOString(),
      });

      if (onSaved) onSaved();
      onClose();
    } catch (err) {
      alert("Failed to save financials: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setSaving(false);
    }
  };

  const totalPaidOut = Object.values(payouts).reduce(
    (sum, p) => (p.paymentStatus === "paid" ? sum + p.amount : sum),
    0
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-yellow-400" />
            <div>
              <h2 className="text-base font-bold text-white">Gig Financial Ledger & Payouts</h2>
              <p className="text-xs text-slate-400 truncate max-w-md">{gigTitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={handleSave}
              className="bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold px-3.5 py-1.5 rounded-lg text-xs flex items-center gap-1.5 transition disabled:opacity-50"
            >
              <Save className="w-4 h-4" /> {saving ? "Saving..." : "Save Financials"}
            </button>
            <button type="button" onClick={onClose} className="text-slate-400 hover:text-white p-1">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
          {/* Top Calculation Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-950 border border-slate-800 rounded-xl p-4">
            <div>
              <label className="block text-slate-400 uppercase font-bold mb-1">Total Client Fee ($)</label>
              <div className="relative">
                <DollarSign className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500" />
                <input
                  type="number"
                  min="0"
                  value={totalFee || ""}
                  onChange={(e) => setTotalFee(Number(e.target.value))}
                  placeholder="0"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-3 py-2 text-white font-mono font-bold focus:outline-none focus:border-yellow-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-400 uppercase font-bold mb-1">Settlement Split Model</label>
              <select
                value={settlementType}
                onChange={(e) => setSettlementType(e.target.value as "band_fund" | "equal_split" | "fixed_guarantee")}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white focus:outline-none focus:border-yellow-400 font-semibold"
              >
                <option value="equal_split">Equal Split (After Band Cut)</option>
                <option value="band_fund">100% Band Fund Deposit</option>
                <option value="fixed_guarantee">Fixed Dollar Guarantee</option>
              </select>
            </div>

            {settlementType === "equal_split" && (
              <div>
                <label className="block text-slate-400 uppercase font-bold mb-1">Band Fund Retention ($)</label>
                <div className="relative">
                  <DollarSign className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500" />
                  <input
                    type="number"
                    min="0"
                    value={bandFundCut || ""}
                    onChange={(e) => setBandFundCut(Number(e.target.value))}
                    placeholder="0"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-3 py-2 text-white font-mono focus:outline-none focus:border-yellow-400"
                  />
                </div>
              </div>
            )}

            {settlementType === "fixed_guarantee" && (
              <div>
                <label className="block text-slate-400 uppercase font-bold mb-1">Per Musician Flat Pay ($)</label>
                <div className="relative">
                  <DollarSign className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500" />
                  <input
                    type="number"
                    min="0"
                    value={fixedAmount || ""}
                    onChange={(e) => setFixedAmount(Number(e.target.value))}
                    placeholder="0"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-3 py-2 text-white font-mono focus:outline-none focus:border-yellow-400"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Settlement Summary Strip */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-950/60 border border-slate-800 rounded-xl p-4">
            <div className="space-y-1">
              <span className="text-slate-400 text-[11px] uppercase tracking-wider block">Calculated Performer Cut</span>
              <div className="text-xl font-extrabold text-emerald-400 font-mono">
                ${currentCut.toFixed(2)}
                <span className="text-xs text-slate-500 font-sans font-normal ml-1.5">
                  ({attendingPerformers.length} confirmed performers)
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleApplyCalculatedCuts}
                className="bg-slate-800 hover:bg-slate-700 text-yellow-400 border border-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition"
              >
                <Calculator className="w-3.5 h-3.5" /> Apply Cut to All Attendees
              </button>
            </div>
          </div>

          {/* Individual Payout Ledger Table */}
          <div className="border border-slate-800 rounded-xl overflow-hidden">
            <div className="p-3 bg-slate-950 border-b border-slate-800 flex justify-between items-center">
              <span className="font-bold text-white uppercase tracking-wider text-[11px]">
                Confirmed Musician Payouts
              </span>
              <span className="font-mono text-slate-400 text-[11px]">
                Disbursed: <strong className="text-emerald-400">${totalPaidOut.toFixed(2)}</strong>
              </span>
            </div>

            {attendingPerformers.length === 0 ? (
              <div className="p-6 text-center text-slate-500">
                No musicians are confirmed &quot;In&quot; on the roster for this gig yet.
              </div>
            ) : (
              <div className="divide-y divide-slate-800/60">
                {attendingPerformers.map((player) => {
                  const record = payouts[player.uid] || {
                    uid: player.uid,
                    displayName: player.displayName,
                    amount: currentCut,
                    paymentStatus: "unpaid",
                    paymentMethod: "venmo",
                    paidAt: null,
                  };

                  const isPaid = record.paymentStatus === "paid";

                  return (
                    <div
                      key={player.uid}
                      className="p-3 bg-slate-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:bg-slate-800/40 transition"
                    >
                      <div>
                        <div className="font-bold text-white text-xs">{player.displayName}</div>
                        <div className="text-slate-500 font-mono text-[10px]">
                          {isPaid ? `Settled (${record.paymentMethod})` : "Pending Disbursement"}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                        {/* Cut Input */}
                        <div className="flex items-center gap-1 font-mono text-xs text-white">
                          <span className="text-slate-500">$</span>
                          <input
                            type="number"
                            value={record.amount}
                            onChange={(e) =>
                              setPayouts({
                                ...payouts,
                                [player.uid]: { ...record, amount: Number(e.target.value) },
                              })
                            }
                            className="w-16 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-right focus:outline-none focus:border-yellow-400"
                          />
                        </div>

                        {/* Payment Method */}
                        <select
                          value={record.paymentMethod}
                          onChange={(e) =>
                            handleMethodChange(
                              player.uid,
                              e.target.value as "venmo" | "cash" | "bank_transfer" | "other"
                            )
                          }
                          className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-[11px] text-slate-300 focus:outline-none focus:border-yellow-400"
                        >
                          <option value="venmo">Venmo</option>
                          <option value="cash">Cash</option>
                          <option value="bank_transfer">Direct Transfer</option>
                          <option value="other">Other</option>
                        </select>

                        {/* Status Toggle Button */}
                        <button
                          type="button"
                          onClick={() => handleTogglePlayerStatus(player.uid)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 border ${
                            isPaid
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20"
                              : "bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700"
                          }`}
                        >
                          {isPaid ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Paid
                            </>
                          ) : (
                            <>
                              <Clock className="w-3.5 h-3.5 text-slate-500" /> Mark Paid
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Settlement / Accounting Notes */}
          <div>
            <label className="block text-slate-400 uppercase font-bold mb-1">Financial Notes / Check Details</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Check #4029 received from organizer, deposited to band checking on Monday."
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white focus:outline-none focus:border-yellow-400"
            />
          </div>
        </div>
      </div>
    </div>
  );
}