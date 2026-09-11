"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  deleteDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/lib/context/AuthContext";
import { canManageGiving } from "@/lib/auth/permissions";
import { User } from "@/lib/schema/user";
import {
  Donation,
  DonationCategory,
  DonationCategoryEnum,
  DonationSchema,
} from "@/lib/schema/donation";
import {
  HeartHandshake,
  Plus,
  Search,
  DollarSign,
  Building,
  Calendar,
  ExternalLink,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  Check,
  X,
  Loader2,
  ShieldAlert,
  Sparkles,
  Heart,
  Globe,
  Tag,
  Filter,
} from "lucide-react";

const CATEGORY_LABELS: Record<DonationCategory, { label: string; color: string }> = {
  arts_music: { label: "Arts & Music Access", color: "bg-purple-500/10 text-purple-400 border-purple-500/30" },
  community_aid: { label: "Community Aid", color: "bg-blue-500/10 text-blue-400 border-blue-500/30" },
  youth_education: { label: "Youth & Education", color: "bg-amber-500/10 text-amber-400 border-amber-500/30" },
  hunger_relief: { label: "Hunger Relief", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" },
  environment: { label: "Parks & Environment", color: "bg-teal-500/10 text-teal-400 border-teal-500/30" },
  other: { label: "General Cause", color: "bg-slate-500/10 text-slate-400 border-slate-500/30" },
};

export default function CharitableGivingAdminPage() {
  const { profile, loading: authLoading } = useAuth();
  const [donations, setDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedYear, setSelectedYear] = useState<string>("all");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDonation, setEditingDonation] = useState<Donation | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form Fields
  const [formOrgName, setFormOrgName] = useState("");
  const [formCauseDesc, setFormCauseDesc] = useState("");
  const [formWebsiteUrl, setFormWebsiteUrl] = useState("");
  const [formCategory, setFormCategory] = useState<DonationCategory>("community_aid");
  const [formAmount, setFormAmount] = useState<number>(100);
  const [formDate, setFormDate] = useState(new Date().toISOString().split("T")[0]);
  const [formYear, setFormYear] = useState(new Date().getFullYear().toString());
  const [formIsPublic, setFormIsPublic] = useState(true);
  const [formPublicImpact, setFormPublicImpact] = useState("");
  const [formNotes, setFormNotes] = useState("");

  useEffect(() => {
    if (authLoading) return;

    const unsub = onSnapshot(
      collection(db, "donations"),
      (snap) => {
        const list: Donation[] = [];
        snap.forEach((d) => {
          const parsed = DonationSchema.safeParse({ ...d.data(), id: d.id });
          if (parsed.success) {
            list.push(parsed.data);
          } else {
            console.warn("Donation parsing error on doc:", d.id, parsed.error);
          }
        });
        list.sort((a, b) => b.dateDonated.localeCompare(a.dateDonated));
        setDonations(list);
        setLoading(false);
      },
      (err) => {
        console.error("Failed to load donations:", err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [authLoading]);

  // Aggregate Metrics
  const metrics = useMemo(() => {
    const currentYear = new Date().getFullYear().toString();
    const totalAmount = donations.reduce((sum, d) => sum + (d.amount || 0), 0);
    const yearTotal = donations
      .filter((d) => d.fiscalYear === currentYear || d.dateDonated.startsWith(currentYear))
      .reduce((sum, d) => sum + (d.amount || 0), 0);
    const uniqueOrgs = new Set(donations.map((d) => d.organizationName.toLowerCase().trim())).size;
    const publicCount = donations.filter((d) => d.isPublic).length;

    return {
      totalAmount,
      yearTotal,
      uniqueOrgs,
      publicCount,
    };
  }, [donations]);

  // Unique Fiscal Years for filter
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    donations.forEach((d) => {
      if (d.fiscalYear) years.add(d.fiscalYear);
      if (d.dateDonated) years.add(d.dateDonated.slice(0, 4));
    });
    return Array.from(years).sort().reverse();
  }, [donations]);

  // Filtered List
  const filteredDonations = useMemo(() => {
    return donations.filter((d) => {
      const matchesSearch =
        d.organizationName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.causeDescription.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.publicImpactNote.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.notes.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCat = selectedCategory === "all" || d.category === selectedCategory;
      const matchesYear =
        selectedYear === "all" ||
        d.fiscalYear === selectedYear ||
        d.dateDonated.startsWith(selectedYear);

      return matchesSearch && matchesCat && matchesYear;
    });
  }, [donations, searchQuery, selectedCategory, selectedYear]);

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-400 gap-2 text-xs">
        <Loader2 className="w-4 h-4 animate-spin text-yellow-400" />
        Loading Charitable Giving Studio...
      </div>
    );
  }

  const userProfile = profile as unknown as User;
  if (!userProfile || !canManageGiving(userProfile)) {
    return (
      <div className="p-8 text-rose-400 text-xs font-semibold flex items-center gap-2">
        <ShieldAlert className="w-4 h-4" />
        Treasurer or Admin privileges required to manage charitable donations.
      </div>
    );
  }

  const openCreateModal = () => {
    setEditingDonation(null);
    setFormOrgName("");
    setFormCauseDesc("");
    setFormWebsiteUrl("");
    setFormCategory("community_aid");
    setFormAmount(100);
    setFormDate(new Date().toISOString().split("T")[0]);
    setFormYear(new Date().getFullYear().toString());
    setFormIsPublic(true);
    setFormPublicImpact("");
    setFormNotes("");
    setIsModalOpen(true);
  };

  const openEditModal = (donation: Donation) => {
    setEditingDonation(donation);
    setFormOrgName(donation.organizationName);
    setFormCauseDesc(donation.causeDescription);
    setFormWebsiteUrl(donation.websiteUrl);
    setFormCategory(donation.category);
    setFormAmount(donation.amount);
    setFormDate(donation.dateDonated);
    setFormYear(donation.fiscalYear);
    setFormIsPublic(donation.isPublic);
    setFormPublicImpact(donation.publicImpactNote);
    setFormNotes(donation.notes);
    setIsModalOpen(true);
  };

  const handleSaveDonation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formOrgName.trim()) return;
    setIsSubmitting(true);

    try {
      const id = editingDonation ? editingDonation.id : crypto.randomUUID();
      const payload: Donation = {
        id,
        organizationName: formOrgName.trim(),
        causeDescription: formCauseDesc.trim(),
        websiteUrl: formWebsiteUrl.trim(),
        category: formCategory,
        amount: Number(formAmount) || 0,
        dateDonated: formDate,
        fiscalYear: formYear || formDate.slice(0, 4),
        isPublic: formIsPublic,
        publicImpactNote: formPublicImpact.trim(),
        notes: formNotes.trim(),
        createdAt: editingDonation?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const validated = DonationSchema.parse(payload);
      await setDoc(doc(db, "donations", id), validated, { merge: true });
      setIsModalOpen(false);
    } catch (err) {
      alert("Failed to save donation record: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleVisibility = async (donation: Donation) => {
    try {
      await updateDoc(doc(db, "donations", donation.id), {
        isPublic: !donation.isPublic,
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      alert("Failed to update visibility: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleDeleteDonation = async (donation: Donation) => {
    if (!confirm(`Are you sure you want to delete the donation record for "${donation.organizationName}"?`)) {
      return;
    }
    try {
      await deleteDoc(doc(db, "donations", donation.id));
    } catch (err) {
      alert("Failed to delete record: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-yellow-400 bg-slate-950 px-2.5 py-0.5 rounded border border-slate-800">
              Community Philanthropy
            </span>
            <span className="text-xs font-mono text-slate-400">
              Treasurer Stewardship
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-2.5">
            <HeartHandshake className="w-7 h-7 text-yellow-400" /> Charitable Giving & Donations
          </h1>
          <p className="text-xs text-slate-400 max-w-2xl">
            Track ensemble contributions to worthy causes, manage recipient organizations, and curate what is showcased on the public{" "}
            <a
              href="/giving"
              target="_blank"
              rel="noopener noreferrer"
              className="text-yellow-400 hover:underline font-mono inline-flex items-center gap-1"
            >
              /giving <ExternalLink className="w-3 h-3" />
            </a>{" "}
            page (where dollar amounts remain strictly confidential).
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 transition shadow-md shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Record New Donation</span>
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow space-y-1">
          <div className="text-[11px] font-mono uppercase text-slate-400 flex items-center gap-1.5">
            <DollarSign className="w-3.5 h-3.5 text-emerald-400" /> Lifetime Donated
          </div>
          <div className="text-2xl font-extrabold text-white">
            ${metrics.totalAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-slate-500 font-mono">Confidential aggregate</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow space-y-1">
          <div className="text-[11px] font-mono uppercase text-slate-400 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-yellow-400" /> {new Date().getFullYear()} Season Total
          </div>
          <div className="text-2xl font-extrabold text-yellow-400">
            ${metrics.yearTotal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-slate-500 font-mono">Current fiscal year</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow space-y-1">
          <div className="text-[11px] font-mono uppercase text-slate-400 flex items-center gap-1.5">
            <Building className="w-3.5 h-3.5 text-purple-400" /> Causes Supported
          </div>
          <div className="text-2xl font-extrabold text-white">{metrics.uniqueOrgs}</div>
          <div className="text-[10px] text-slate-500 font-mono">Distinct community beneficiaries</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow space-y-1">
          <div className="text-[11px] font-mono uppercase text-slate-400 flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5 text-blue-400" /> Public Showcases
          </div>
          <div className="text-2xl font-extrabold text-emerald-400">{metrics.publicCount}</div>
          <div className="text-[10px] text-slate-500 font-mono">Live on /giving (amounts hidden)</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row gap-3 items-center justify-between shadow">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by organization or cause..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white focus:outline-none focus:border-yellow-400"
          />
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto overflow-x-auto">
          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 shrink-0">
            <Tag className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-transparent text-xs text-white focus:outline-none"
            >
              <option value="all" className="bg-slate-900">All Categories</option>
              {DonationCategoryEnum.options.map((cat) => (
                <option key={cat} value={cat} className="bg-slate-900">
                  {CATEGORY_LABELS[cat]?.label || cat}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 shrink-0">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="bg-transparent text-xs text-white focus:outline-none"
            >
              <option value="all" className="bg-slate-900">All Years</option>
              {availableYears.map((yr) => (
                <option key={yr} value={yr} className="bg-slate-900">{yr}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Donations Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <Heart className="w-4 h-4 text-rose-400" /> Donations Ledger ({filteredDonations.length})
          </div>
          <span className="text-[10px] font-mono text-slate-500">
            Internal Financial Record
          </span>
        </div>

        {filteredDonations.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs space-y-2">
            <HeartHandshake className="w-8 h-8 mx-auto text-slate-600" />
            <div>No charitable donation records matching your filters.</div>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/80 overflow-x-auto">
            {filteredDonations.map((donation) => {
              const catConfig = CATEGORY_LABELS[donation.category] || CATEGORY_LABELS.other;

              return (
                <div
                  key={donation.id}
                  className="p-4 hover:bg-slate-800/40 transition flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 min-w-0 max-w-xl">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-extrabold text-sm text-white">{donation.organizationName}</span>
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${catConfig.color}`}>
                        {catConfig.label}
                      </span>
                      {donation.websiteUrl && (
                        <a
                          href={donation.websiteUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] text-yellow-400 hover:underline flex items-center gap-0.5 shrink-0"
                        >
                          Website <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      )}
                    </div>

                    {donation.causeDescription && (
                      <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                        {donation.causeDescription}
                      </p>
                    )}

                    {donation.publicImpactNote && (
                      <div className="text-[11px] font-mono text-yellow-300/90 flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-yellow-400 shrink-0" />
                        <span>{donation.publicImpactNote}</span>
                      </div>
                    )}

                    {donation.notes && (
                      <div className="text-[10px] font-mono text-slate-500">
                        Treasurer Notes: {donation.notes}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-4 shrink-0 justify-between md:justify-end">
                    {/* Amount & Date */}
                    <div className="text-right">
                      <div className="text-sm font-extrabold font-mono text-emerald-400">
                        ${donation.amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <div className="text-[10px] font-mono text-slate-500">
                        {donation.dateDonated} (FY {donation.fiscalYear})
                      </div>
                    </div>

                    {/* Public Visibility Toggle */}
                    <button
                      type="button"
                      onClick={() => handleToggleVisibility(donation)}
                      className={`text-[11px] font-bold px-2.5 py-1.5 rounded-xl border flex items-center gap-1.5 transition ${
                        donation.isPublic
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20"
                          : "bg-slate-950 text-slate-500 border-slate-800 hover:text-slate-300"
                      }`}
                      title={donation.isPublic ? "Visible on /giving page" : "Private internal only"}
                    >
                      {donation.isPublic ? (
                        <>
                          <Eye className="w-3.5 h-3.5" />
                          <span>Public</span>
                        </>
                      ) : (
                        <>
                          <EyeOff className="w-3.5 h-3.5" />
                          <span>Hidden</span>
                        </>
                      )}
                    </button>

                    {/* Actions */}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openEditModal(donation)}
                        className="p-1.5 text-slate-400 hover:text-yellow-400 transition rounded-lg hover:bg-slate-800"
                        title="Edit donation"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteDonation(donation)}
                        className="p-1.5 text-slate-400 hover:text-rose-400 transition rounded-lg hover:bg-slate-800"
                        title="Delete donation"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Record / Edit Donation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <HeartHandshake className="w-5 h-5 text-yellow-400" />
                <h3 className="text-base font-extrabold text-white">
                  {editingDonation ? "Edit Charitable Donation" : "Record Charitable Donation"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDonation} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                    Beneficiary Organization Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Greater Pittsburgh Community Food Bank"
                    value={formOrgName}
                    onChange={(e) => setFormOrgName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                    Cause Category
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as DonationCategory)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400"
                  >
                    {DonationCategoryEnum.options.map((cat) => (
                      <option key={cat} value={cat}>
                        {CATEGORY_LABELS[cat]?.label || cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                    Official Website URL
                  </label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={formWebsiteUrl}
                    onChange={(e) => setFormWebsiteUrl(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                    Donation Amount ($ USD) *
                  </label>
                  <div className="relative">
                    <DollarSign className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      required
                      value={formAmount}
                      onChange={(e) => setFormAmount(parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-yellow-400"
                    />
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">Hidden on public /giving page</span>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                    Date Donated
                  </label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => {
                      setFormDate(e.target.value);
                      if (e.target.value) setFormYear(e.target.value.slice(0, 4));
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                    Cause & Organization Mission Description
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Describe their mission and impact in the community..."
                    value={formCauseDesc}
                    onChange={(e) => setFormCauseDesc(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-yellow-400"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                    Public Impact Note (Optional Highlight)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Sponsored youth summer brass camp scholarships"
                    value={formPublicImpact}
                    onChange={(e) => setFormPublicImpact(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                    Internal Treasurer Notes (Private)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Check #1042, approved in annual general meeting"
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400"
                  />
                </div>

                <div className="sm:col-span-2 flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="isPublic"
                    checked={formIsPublic}
                    onChange={(e) => setFormIsPublic(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-800 bg-slate-950 text-yellow-400 focus:ring-0 cursor-pointer"
                  />
                  <label htmlFor="isPublic" className="text-xs text-slate-300 cursor-pointer">
                    Showcase this organization on the public <span className="text-yellow-400 font-mono">/giving</span> page (amount remains confidential)
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  <span>{isSubmitting ? "Saving..." : "Save Donation"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

