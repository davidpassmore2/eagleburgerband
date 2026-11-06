"use client";

import React, { useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/lib/context/AuthContext";
import {
  Donation,
  DonationCategory,
  DonationCategoryEnum,
  DonationStatus,
  DonationStatusEnum,
} from "@/lib/schema/donation";
import { User } from "@/lib/schema/user";
import { toast } from "@/lib/context/ToastContext";
import DatePicker from "@/components/ui/DatePicker";
import {
  Gift,
  X,
  Sparkles,
} from "lucide-react";

interface EditBandGiftModalProps {
  gift: Donation | null;
  onClose: () => void;
  rosterMembers: User[];
  canManageGiving: boolean;
}

export default function EditBandGiftModal(props: EditBandGiftModalProps) {
  if (!props.gift) return null;
  return <EditBandGiftModalForm key={props.gift.id} {...props} gift={props.gift} />;
}

function EditBandGiftModalForm({
  gift,
  onClose,
  rosterMembers,
  canManageGiving,
}: {
  gift: Donation;
  onClose: () => void;
  rosterMembers: User[];
  canManageGiving: boolean;
}) {
  const { profile } = useAuth();

  const [editOrgName, setEditOrgName] = useState(() => gift.organizationName || "");
  const [editCategory, setEditCategory] = useState<DonationCategory>(() => gift.category || "community_aid");
  const [editDesc, setEditDesc] = useState(() => gift.causeDescription || gift.rationale || "");
  const [editWebsite, setEditWebsite] = useState(() => gift.websiteUrl || "");
  const [editOrgMission, setEditOrgMission] = useState(() => gift.organizationMission || "");
  const [editStatus, setEditStatus] = useState<DonationStatus>(() => gift.status || "completed");
  const [editAmount, setEditAmount] = useState(() => (gift.amount !== undefined ? String(gift.amount) : "0"));
  const [editTargetAmount, setEditTargetAmount] = useState(() => (gift.targetAmount !== undefined ? String(gift.targetAmount) : "0"));
  const [editDate, setEditDate] = useState(() => gift.dateDonated || new Date().toISOString().split("T")[0]);
  const [editDateSubmitted, setEditDateSubmitted] = useState(
    () => gift.dateSubmitted || (gift.createdAt ? gift.createdAt.split("T")[0] : gift.dateDonated) || new Date().toISOString().split("T")[0]
  );
  const [editFiscalYear, setEditFiscalYear] = useState(() => gift.fiscalYear || String(new Date().getFullYear()));
  const [editGiftsGivenCount, setEditGiftsGivenCount] = useState<number>(() => gift.giftsGivenCount ?? (gift.status === "completed" ? 1 : 0));
  const [editAttributedMemberUid, setEditAttributedMemberUid] = useState(() => gift.suggestedByUid || "");
  const [editPublicImpactNote, setEditPublicImpactNote] = useState(() => gift.publicImpactNote || "");
  const [editInternalNotes, setEditInternalNotes] = useState(() => gift.notes || "");
  const [editIsPublic, setEditIsPublic] = useState(() => (gift.isPublic !== undefined ? gift.isPublic : true));
  const [editShowAmountPublicly, setEditShowAmountPublicly] = useState(() => (gift.showAmountPublicly !== undefined ? gift.showAmountPublicly : false));
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
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

    setIsSaving(true);
    try {
      let suggestedByName = gift.suggestedByName;
      let suggestedByUid = gift.suggestedByUid;
      let submittedOnBehalf = gift.submittedOnBehalf ?? false;

      if (editAttributedMemberUid && editAttributedMemberUid !== gift.suggestedByUid) {
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
        organizationMission: editOrgMission.trim(),
        status: editStatus,
        amount: Number(numAmount.toFixed(2)),
        targetAmount: isNaN(numTarget) ? 0 : Number(numTarget.toFixed(2)),
        dateDonated: editDate,
        dateSubmitted: editDateSubmitted,
        fiscalYear: editFiscalYear.trim() || String(new Date().getFullYear()),
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

      if (editStatus === "completed" && gift.status !== "completed") {
        updatePayload.reviewedByUid = profile?.uid || null;
        updatePayload.reviewedByName = profile?.displayName || "Giving Manager";
        updatePayload.reviewedAt = new Date().toISOString();
      }

      await updateDoc(doc(db, "donations", gift.id), updatePayload);
      toast.success(`Updated Band Gift for "${editOrgName.trim()}".`);
      onClose();
    } catch (err) {
      toast.error("Failed to update Band Gift: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsSaving(false);
    }
  };

  return (
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
            onClick={onClose}
            className="text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          {/* Status Switcher */}
          <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs space-y-2">
            <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-slate-300">
              Workflow Status
            </label>
            <div className="grid grid-cols-3 gap-2">
              {DonationStatusEnum.options.map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setEditStatus(st)}
                  className={`py-1.5 px-2 rounded-lg font-bold capitalize transition border text-center ${
                    editStatus === st
                      ? "bg-yellow-400 border-yellow-400 text-slate-950 shadow-md"
                      : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700"
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-400">
              {editStatus === "completed" && "Completed: Included in Band Gifts directory and counted in giving metrics."}
              {editStatus === "suggested" && "Suggested: Visible in member voting list for future gift allocations."}
              {editStatus === "approved" && "Approved: Scheduled for upcoming distribution."}
              {editStatus === "archived" && "Archived: Hidden from active directories and member voting."}
            </p>
          </div>

          {/* Org Name */}
          <div className="space-y-1">
            <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-slate-300">
              Organization / Recipient Name *
            </label>
            <input
              type="text"
              required
              value={editOrgName}
              onChange={(e) => setEditOrgName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400"
            />
          </div>

          {/* Category */}
          <div className="space-y-1">
            <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-slate-300">
              Category
            </label>
            <select
              value={editCategory}
              onChange={(e) => setEditCategory(e.target.value as DonationCategory)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400"
            >
              {DonationCategoryEnum.options.map((cat) => (
                <option key={cat} value={cat}>
                  {cat.replace("_", " ").toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          {/* Amounts & Count */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-slate-300">
                Amount Given ($)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={editAmount}
                onChange={(e) => setEditAmount(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-yellow-400"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-slate-300">
                Target / Goal ($)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={editTargetAmount}
                onChange={(e) => setEditTargetAmount(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-yellow-400"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-slate-300">
                Gifts Given Count
              </label>
              <input
                type="number"
                min="0"
                value={editGiftsGivenCount}
                onChange={(e) => setEditGiftsGivenCount(parseInt(e.target.value) || 0)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-yellow-400"
              />
            </div>
          </div>

          {/* Dates & Fiscal Year */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-slate-300">
                Date Gift Given
              </label>
              <DatePicker
                value={editDate}
                onChange={(d) => setEditDate(d)}
                placeholder="YYYY-MM-DD"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-slate-300">
                Date Recorded / Submitted
              </label>
              <DatePicker
                value={editDateSubmitted}
                onChange={(d) => setEditDateSubmitted(d)}
                placeholder="YYYY-MM-DD"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-slate-300">
                Fiscal Year
              </label>
              <input
                type="text"
                value={editFiscalYear}
                onChange={(e) => setEditFiscalYear(e.target.value)}
                placeholder="2026"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-yellow-400"
              />
            </div>
          </div>

          {/* Website */}
          <div className="space-y-1">
            <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-slate-300">
              Recipient Website URL
            </label>
            <input
              type="url"
              placeholder="https://..."
              value={editWebsite}
              onChange={(e) => setEditWebsite(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400"
            />
          </div>

          {/* Cause Description / Rationale */}
          <div className="space-y-1">
            <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-slate-300">
              Cause Description / Rationale
            </label>
            <textarea
              rows={3}
              placeholder="What this organization does or why the band chose them..."
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-yellow-400 leading-relaxed"
            />
          </div>

          {/* Org Mission */}
          <div className="space-y-1">
            <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-slate-300">
              Organization Mission
            </label>
            <textarea
              rows={3}
              placeholder="Description of the organization's core mission to inspire public and band support..."
              value={editOrgMission}
              onChange={(e) => setEditOrgMission(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-yellow-400 leading-relaxed"
            />
          </div>

          {/* Public Impact Note */}
          <div className="space-y-1">
            <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-slate-300">
              Public Impact Note / Notes
            </label>
            <textarea
              rows={3}
              placeholder="How this gift helped, specific programs funded, or community outcomes..."
              value={editPublicImpactNote}
              onChange={(e) => setEditPublicImpactNote(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-yellow-400 leading-relaxed"
            />
          </div>

          {/* Member Attribution */}
          {canManageGiving && (
            <div className="space-y-1">
              <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-slate-300">
                Attributed Band Member
              </label>
              <select
                value={editAttributedMemberUid}
                onChange={(e) => setEditAttributedMemberUid(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400"
              >
                <option value="">-- Band Discretionary Fund (No Individual Member) --</option>
                {rosterMembers.map((m) => (
                  <option key={m.uid} value={m.uid}>
                    {m.displayName || m.realName || "Musician"} ({m.instruments?.[0] || m.sectionId || "Ensemble"})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Internal Notes */}
          <div className="space-y-1">
            <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-slate-300">
              Internal Audit Notes (Private to Managers)
            </label>
            <textarea
              rows={2}
              placeholder="Check #, Venmo confirmation ID, vote tally details..."
              value={editInternalNotes}
              onChange={(e) => setEditInternalNotes(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-300 focus:outline-none focus:border-yellow-400 leading-relaxed"
            />
          </div>

          {/* Public Visibility Controls */}
          {canManageGiving && (
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
              <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-yellow-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Public Website Controls</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editIsPublic}
                  onChange={(e) => setEditIsPublic(e.target.checked)}
                  className="rounded bg-slate-900 border-slate-700 text-yellow-400 focus:ring-0"
                />
                <span className="text-xs text-white">Publish this Band Gift to the public website (/giving)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editShowAmountPublicly}
                  onChange={(e) => setEditShowAmountPublicly(e.target.checked)}
                  className="rounded bg-slate-900 border-slate-700 text-yellow-400 focus:ring-0"
                />
                <span className="text-xs text-white">Display the exact dollar amount publicly</span>
              </label>
            </div>
          )}

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-slate-950 text-xs font-black uppercase tracking-wider transition disabled:opacity-50 cursor-pointer shadow-lg shadow-yellow-400/10"
            >
              {isSaving ? "Saving..." : "Save Band Gift Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
