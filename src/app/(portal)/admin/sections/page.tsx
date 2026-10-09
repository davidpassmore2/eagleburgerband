"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
  collection,
  onSnapshot,
  doc,
  setDoc,
  deleteDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/lib/context/AuthContext";
import { canManageSections } from "@/lib/auth/permissions";
import { User, UserSchema } from "@/lib/schema/user";
import {
  SectionSchema,
  DEFAULT_SECTION_INSTRUMENTS,
} from "@/lib/schema/section";
import { toast } from "@/lib/context/ToastContext";
import AccessDenied from "@/components/portal/AccessDenied";
import PortalBreadcrumb from "@/components/portal/PortalBreadcrumb";
import {
  Users,
  Loader2,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Music,
  Star,
  Sparkles,
  UserPlus,
  Sliders,
  ChevronRight,
} from "lucide-react";

export interface SectionData {
  id: string;
  name: string;
  order: number;
  minRecommended?: number;
  instruments?: string[];
  leaderUid?: string;
  leaderName?: string;
  leaderUids?: string[];
  notes?: string;
}

export default function SectionsAdminPage() {
  const { profile, loading: authLoading } = useAuth();
  const [sections, setSections] = useState<SectionData[]>([]);
  const [rawUsers, setRawUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Form Editing State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<SectionData>>({
    id: "",
    name: "",
    order: 1,
    minRecommended: 2,
    instruments: [],
    leaderUids: [],
    notes: "",
  });
  const [formInstrumentInput, setFormInstrumentInput] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Manage Member Instruments Modal State
  const [managingSectionId, setManagingSectionId] = useState<string | null>(null);
  const [modalNewInstrument, setModalNewInstrument] = useState("");
  const [selectedUserToAdd, setSelectedUserToAdd] = useState("");

  // Deduplicate users by UID to prevent duplicate key hydration and render warnings
  const uniqueUsers = useMemo(() => {
    const map = new Map<string, User>();
    for (const u of rawUsers) {
      if (u.uid && !map.has(u.uid)) {
        map.set(u.uid, u);
      }
    }
    return Array.from(map.values()).sort((a, b) =>
      (a.displayName || "").localeCompare(b.displayName || "")
    );
  }, [rawUsers]);

  // Currently open managing section
  const activeManagingSection = useMemo(() => {
    return sections.find((s) => s.id === managingSectionId) || null;
  }, [sections, managingSectionId]);

  // Section members for modal
  const activeSectionMembers = useMemo(() => {
    if (!activeManagingSection) return [];
    return uniqueUsers.filter((u) => u.sectionId === activeManagingSection.id);
  }, [uniqueUsers, activeManagingSection]);

  // Non-section members for adding
  const nonSectionMembers = useMemo(() => {
    if (!activeManagingSection) return [];
    return uniqueUsers.filter((u) => u.sectionId !== activeManagingSection.id);
  }, [uniqueUsers, activeManagingSection]);

  // Firestore real-time listeners for sections and roster users
  useEffect(() => {
    if (authLoading) return;

    const unsubSections = onSnapshot(
      collection(db, "sections"),
      (snap) => {
        const list: SectionData[] = [];
        snap.forEach((d) => {
          const parsed = SectionSchema.safeParse({ id: d.id, ...d.data() });
          if (parsed.success) {
            list.push({
              id: parsed.data.id,
              name: parsed.data.name,
              order: parsed.data.order,
              minRecommended: parsed.data.minRecommended,
              instruments: parsed.data.instruments || [],
              leaderUid: parsed.data.leaderUid,
              leaderName: parsed.data.leaderName,
              leaderUids: parsed.data.leaderUids,
              notes: parsed.data.notes,
            });
          }
        });
        list.sort((a, b) => (a.order || 0) - (b.order || 0));
        setSections(list);
        setLoading(false);
      },
      (err) => {
        console.error("Failed to load sections:", err);
        setLoading(false);
      }
    );

    const unsubUsers = onSnapshot(
      collection(db, "users"),
      (snap) => {
        const uList: User[] = [];
        snap.forEach((d) => {
          const parsed = UserSchema.safeParse({ uid: d.id, ...d.data() });
          if (parsed.success) {
            uList.push(parsed.data);
          }
        });
        setRawUsers(uList);
      },
      (err) => {
        console.error("Failed to load users:", err);
      }
    );

    return () => {
      unsubSections();
      unsubUsers();
    };
  }, [authLoading]);

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-400 gap-2 text-xs">
        <Loader2 className="w-4 h-4 animate-spin text-yellow-400" />
        Loading sections and roster data...
      </div>
    );
  }

  if (!canManageSections(profile)) {
    return (
      <AccessDenied
        title="Section Management Restricted"
        message="Administrator, Section Leader, or Membership Manager privileges required to manage band sections."
      />
    );
  }

  const handleStartCreate = () => {
    setEditingId("new");
    setFormData({
      id: "",
      name: "",
      order: sections.length + 1,
      minRecommended: 2,
      instruments: [],
      leaderUids: [],
      notes: "",
    });
    setFormInstrumentInput("");
  };

  const handleStartEdit = (section: SectionData) => {
    setEditingId(section.id);
    const existingLeaders = section.leaderUids
      ? [...section.leaderUids]
      : section.leaderUid
      ? [section.leaderUid]
      : [];

    setFormData({
      ...section,
      instruments: section.instruments || [],
      leaderUids: existingLeaders,
    });
    setFormInstrumentInput("");
  };

  const handleCancel = () => {
    setEditingId(null);
    setFormData({});
    setFormInstrumentInput("");
  };

  const toggleLeader = (uid: string) => {
    const current = new Set(formData.leaderUids || []);
    if (current.has(uid)) {
      current.delete(uid);
    } else {
      current.add(uid);
    }
    setFormData({ ...formData, leaderUids: Array.from(current) });
  };

  const handleAddFormInstrument = () => {
    const trimmed = formInstrumentInput.trim();
    if (!trimmed) return;
    const current = formData.instruments || [];
    if (!current.includes(trimmed)) {
      setFormData({ ...formData, instruments: [...current, trimmed] });
    }
    setFormInstrumentInput("");
  };

  const handleRemoveFormInstrument = (inst: string) => {
    setFormData({
      ...formData,
      instruments: (formData.instruments || []).filter((i) => i !== inst),
    });
  };

  const handleApplyPresetToForm = () => {
    const lookup = (formData.id || formData.name || "").toLowerCase().replace(/[^a-z]/g, "");
    const matchedKey = Object.keys(DEFAULT_SECTION_INSTRUMENTS).find(
      (k) => lookup.includes(k) || k.includes(lookup)
    );

    if (matchedKey && DEFAULT_SECTION_INSTRUMENTS[matchedKey]) {
      const preset = DEFAULT_SECTION_INSTRUMENTS[matchedKey];
      const merged = Array.from(new Set([...(formData.instruments || []), ...preset]));
      setFormData({ ...formData, instruments: merged });
      toast.success(`Applied ${preset.length} default instruments from preset (${matchedKey}).`);
    } else {
      toast.info("No matching default instrument preset found for this section slug.");
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim()) return;

    const targetId =
      editingId === "new"
        ? formData.id?.trim().toLowerCase().replace(/\s+/g, "_") ||
          formData.name.trim().toLowerCase().replace(/\s+/g, "_")
        : editingId;

    if (!targetId) return;

    setIsSaving(true);
    try {
      const primaryLeaderUid = formData.leaderUids?.[0] || "";
      const primaryLeader = uniqueUsers.find((u) => u.uid === primaryLeaderUid);

      const payload: SectionData = {
        id: targetId,
        name: formData.name.trim(),
        order: Number(formData.order) || 1,
        minRecommended: Number(formData.minRecommended) || 1,
        instruments: formData.instruments || [],
        leaderUids: formData.leaderUids || [],
        leaderUid: primaryLeaderUid,
        leaderName: primaryLeader?.displayName || "",
        notes: formData.notes?.trim() || "",
      };

      await setDoc(doc(db, "sections", targetId), payload, { merge: true });
      toast.success("Section saved successfully!");
      setEditingId(null);
      setFormData({});
      setFormInstrumentInput("");
    } catch (err) {
      toast.error(
        "Failed to save section: " +
          (err instanceof Error ? err.message : String(err))
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete section "${name}"? This cannot be undone.`)) return;
    try {
      await deleteDoc(doc(db, "sections", id));
      toast.success(`Section "${name}" deleted.`);
      if (editingId === id) handleCancel();
      if (managingSectionId === id) setManagingSectionId(null);
    } catch (err) {
      toast.error(
        "Failed to delete section: " +
          (err instanceof Error ? err.message : String(err))
      );
    }
  };

  // Direct Section Instruments Operations (inside Modal or Section Cards)
  const handleAddInstrumentToSection = async (sectionId: string, instName: string) => {
    const trimmed = instName.trim();
    if (!trimmed) return;
    const sec = sections.find((s) => s.id === sectionId);
    if (!sec) return;
    const current = sec.instruments || [];
    if (current.includes(trimmed)) {
      toast.info(`"${trimmed}" is already in this section.`);
      return;
    }
    const updated = [...current, trimmed];
    try {
      await updateDoc(doc(db, "sections", sectionId), {
        instruments: updated,
        updatedAt: new Date().toISOString(),
      });
      toast.success(`Added "${trimmed}" to ${sec.name}`);
    } catch (err) {
      toast.error("Failed to add instrument: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleRemoveInstrumentFromSection = async (sectionId: string, instName: string) => {
    const sec = sections.find((s) => s.id === sectionId);
    if (!sec) return;
    const updated = (sec.instruments || []).filter((i) => i !== instName);
    try {
      await updateDoc(doc(db, "sections", sectionId), {
        instruments: updated,
        updatedAt: new Date().toISOString(),
      });
      toast.success(`Removed "${instName}" from ${sec.name}`);
    } catch (err) {
      toast.error("Failed to remove instrument: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleApplyPresetToActiveSection = async () => {
    if (!activeManagingSection) return;
    const lookup = (activeManagingSection.id || activeManagingSection.name).toLowerCase().replace(/[^a-z]/g, "");
    const matchedKey = Object.keys(DEFAULT_SECTION_INSTRUMENTS).find(
      (k) => lookup.includes(k) || k.includes(lookup)
    );

    if (matchedKey && DEFAULT_SECTION_INSTRUMENTS[matchedKey]) {
      const preset = DEFAULT_SECTION_INSTRUMENTS[matchedKey];
      const merged = Array.from(new Set([...(activeManagingSection.instruments || []), ...preset]));
      try {
        await updateDoc(doc(db, "sections", activeManagingSection.id), {
          instruments: merged,
          updatedAt: new Date().toISOString(),
        });
        toast.success(`Applied ${preset.length} preset instruments for ${activeManagingSection.name}`);
      } catch (err) {
        toast.error("Failed to apply preset: " + (err instanceof Error ? err.message : String(err)));
      }
    } else {
      toast.info("No automatic instrument preset matched for this section.");
    }
  };

  // Member-to-Section & Member Instruments Operations
  const handleToggleMemberInstrument = async (user: User, instrument: string) => {
    const current = new Set(user.instruments || []);
    let nextSelected = user.selectedInstrument || "";

    if (current.has(instrument)) {
      current.delete(instrument);
      if (nextSelected === instrument) {
        nextSelected = Array.from(current)[0] || "";
      }
    } else {
      current.add(instrument);
      if (!nextSelected) {
        nextSelected = instrument;
      }
    }

    const updatedList = Array.from(current);
    try {
      await updateDoc(doc(db, "users", user.uid), {
        instruments: updatedList,
        selectedInstrument: nextSelected,
        updatedAt: new Date().toISOString(),
      });
      toast.success(`Updated instruments for ${user.displayName || "member"}`);
    } catch (err) {
      toast.error("Failed to update instruments: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleSetMemberSelectedInstrument = async (user: User, instrument: string) => {
    const current = new Set(user.instruments || []);
    current.add(instrument);
    const updatedList = [instrument, ...Array.from(current).filter((i) => i !== instrument)];

    try {
      await updateDoc(doc(db, "users", user.uid), {
        selectedInstrument: instrument,
        instruments: updatedList,
        updatedAt: new Date().toISOString(),
      });
      toast.success(`Set active instrument to "${instrument}" for ${user.displayName}`);
    } catch (err) {
      toast.error("Failed to update active instrument: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleAssignUserToSection = async () => {
    if (!activeManagingSection || !selectedUserToAdd) return;
    const targetUser = uniqueUsers.find((u) => u.uid === selectedUserToAdd);
    if (!targetUser) return;

    try {
      await updateDoc(doc(db, "users", selectedUserToAdd), {
        sectionId: activeManagingSection.id,
        updatedAt: new Date().toISOString(),
      });
      toast.success(`Assigned ${targetUser.displayName} to ${activeManagingSection.name}`);
      setSelectedUserToAdd("");
    } catch (err) {
      toast.error("Failed to assign member: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleRemoveUserFromSection = async (user: User) => {
    if (!activeManagingSection) return;
    if (!confirm(`Remove ${user.displayName} from ${activeManagingSection.name}?`)) return;

    try {
      await updateDoc(doc(db, "users", user.uid), {
        sectionId: null,
        updatedAt: new Date().toISOString(),
      });
      toast.success(`Removed ${user.displayName} from section.`);
    } catch (err) {
      toast.error("Failed to unassign member: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      <PortalBreadcrumb className="mb-2" />

      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-yellow-400 bg-slate-950 px-2.5 py-0.5 rounded border border-slate-800">
              Admin Studio
            </span>
            <span className="text-xs font-mono text-slate-400">
              {sections.length} Section(s)
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
            Section Studio
          </h1>
          <p className="text-xs text-slate-400">
            Define instrument sections, configure section instrument catalogs, assign instruments to members, and manage leader roles.
          </p>
        </div>

        {editingId === null && (
          <button
            type="button"
            onClick={handleStartCreate}
            className="bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition shadow shrink-0"
          >
            <Plus className="w-4 h-4" /> Add Section
          </button>
        )}
      </div>

      {/* Inline Create / Edit Drawer */}
      {editingId !== null && (
        <form
          onSubmit={handleSave}
          className="bg-slate-900 border border-yellow-400/40 rounded-2xl p-5 space-y-4 shadow-xl"
        >
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Music className="w-4 h-4 text-yellow-400" />
              {editingId === "new" ? "New Section Profile" : `Edit Section: ${formData.name}`}
            </h2>
            <button
              type="button"
              onClick={handleCancel}
              className="text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                Section Name *
              </label>
              <input
                type="text"
                required
                value={formData.name || ""}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="e.g. Sousaphones & Tubas"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                Document ID / Slug
              </label>
              <input
                type="text"
                disabled={editingId !== "new"}
                value={formData.id || ""}
                onChange={(e) =>
                  setFormData({ ...formData, id: e.target.value })
                }
                placeholder="e.g. sousaphones"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400 disabled:opacity-50"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                  Sort Order
                </label>
                <input
                  type="number"
                  value={formData.order || 1}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      order: parseInt(e.target.value, 10) || 1,
                    })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                  Min Quorum
                </label>
                <input
                  type="number"
                  value={formData.minRecommended || 2}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      minRecommended: parseInt(e.target.value, 10) || 1,
                    })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-300 block mb-1">
              Section Notes / Logistics
            </label>
            <input
              type="text"
              value={formData.notes || ""}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              placeholder="e.g. Carries groove tempo, battery cymbals, bass drums, and snares."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400"
            />
          </div>

          {/* Section Instruments Catalog Editor */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-[11px] font-semibold text-slate-300 block">
                  Section Instruments Catalog
                </label>
                <p className="text-[10px] text-slate-500">
                  Instruments available for members in this section to select and be assigned.
                </p>
              </div>
              <button
                type="button"
                onClick={handleApplyPresetToForm}
                className="text-[11px] text-yellow-400 hover:text-yellow-300 flex items-center gap-1 font-semibold"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Apply standard preset</span>
              </button>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={formInstrumentInput}
                onChange={(e) => setFormInstrumentInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddFormInstrument();
                  }
                }}
                placeholder="e.g. Bass Trombone, Snare Drum..."
                className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400"
              />
              <button
                type="button"
                onClick={handleAddFormInstrument}
                className="bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition"
              >
                <Plus className="w-3.5 h-3.5" /> Add
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5 pt-1">
              {(formData.instruments || []).map((inst) => (
                <span
                  key={inst}
                  className="bg-slate-950 border border-slate-800 text-yellow-300 text-xs px-2.5 py-1 rounded-lg flex items-center gap-1.5"
                >
                  <Music className="w-3 h-3 text-yellow-400" />
                  <span>{inst}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveFormInstrument(inst)}
                    className="text-slate-500 hover:text-rose-400 transition"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              {(formData.instruments || []).length === 0 && (
                <span className="text-[11px] text-slate-500 italic">
                  No instruments added yet. Type an instrument name above or click &ldquo;Apply standard preset&rdquo;.
                </span>
              )}
            </div>
          </div>

          {/* Section Leaders Assignment */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <label className="text-[11px] font-semibold text-slate-300 block">
              Designate Section Leaders (Select from roster)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-h-48 overflow-y-auto p-2 bg-slate-950 rounded-xl border border-slate-800">
              {uniqueUsers.map((user, idx) => {
                const isLeader = (formData.leaderUids || []).includes(user.uid);
                const isMember = user.sectionId === (formData.id || editingId);

                return (
                  <div
                    key={`${user.uid}-${idx}`}
                    onClick={() => toggleLeader(user.uid)}
                    className={`cursor-pointer p-2 rounded-lg border text-xs flex flex-col justify-between gap-1 transition select-none ${
                      isLeader
                        ? "border-yellow-400 bg-yellow-400/10 text-white"
                        : isMember
                        ? "border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-600"
                        : "border-slate-800 bg-slate-950 text-slate-500 hover:text-slate-400 opacity-60"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-bold truncate">
                        {user.displayName || "Unnamed"}
                      </span>
                      {isLeader && (
                        <Check className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
                      )}
                    </div>
                    <span className="text-[10px] text-slate-500 truncate">
                      {user.selectedInstrument || user.instruments?.[0] || user.sectionId || "musician"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={handleCancel}
              className="px-3 py-1.5 text-xs text-slate-400 hover:text-white transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold px-4 py-1.5 rounded-lg text-xs flex items-center gap-1 transition disabled:opacity-50"
            >
              {isSaving ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Check className="w-3.5 h-3.5" />
              )}
              {isSaving ? "Saving..." : "Save Section"}
            </button>
          </div>
        </form>
      )}

      {/* Sections Grid Display */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {sections.map((section) => {
          const sectionMembers = uniqueUsers.filter(
            (u) => u.sectionId === section.id
          );
          const instrumentsList = section.instruments || [];

          return (
            <div
              key={section.id}
              className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 space-y-4 shadow-lg flex flex-col justify-between transition"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold bg-slate-950 text-yellow-400 border border-slate-800 px-2 py-0.5 rounded">
                      #{section.order}
                    </span>
                    <h3 className="font-bold text-white text-base">
                      {section.name}
                    </h3>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleStartEdit(section)}
                      className="text-slate-500 hover:text-white p-1 rounded transition"
                      title="Edit Section"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(section.id, section.name)}
                      className="text-slate-500 hover:text-rose-400 p-1 rounded transition"
                      title="Delete Section"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {section.notes && (
                  <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">
                    {section.notes}
                  </p>
                )}

                <div className="flex flex-wrap gap-2 text-[11px] text-slate-400">
                  <div className="flex items-center gap-1 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                    <Users className="w-3 h-3 text-slate-500" />
                    <span className="text-slate-300 font-semibold">{sectionMembers.length}</span>
                    <span>rostered</span>
                  </div>
                  <div className="bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                    <span>Min Quorum: {section.minRecommended || 2}</span>
                  </div>
                </div>

                {/* Instruments Pool Display */}
                <div className="space-y-1.5 pt-1 border-t border-slate-800/60">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-slate-300 flex items-center gap-1">
                      <Music className="w-3 h-3 text-yellow-400" />
                      Instruments ({instrumentsList.length})
                    </span>
                    <button
                      type="button"
                      onClick={() => setManagingSectionId(section.id)}
                      className="text-yellow-400 hover:text-yellow-300 text-[10px] font-bold"
                    >
                      Manage
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                    {instrumentsList.map((inst) => (
                      <span
                        key={inst}
                        className="text-[11px] px-2 py-0.5 rounded-md bg-slate-950 border border-slate-800 text-slate-300 font-medium"
                      >
                        {inst}
                      </span>
                    ))}
                    {instrumentsList.length === 0 && (
                      <span className="text-[10px] text-slate-500 italic">
                        No instruments registered
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Bottom Actions & Leader */}
              <div className="space-y-3 pt-3 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={() => setManagingSectionId(section.id)}
                  className="w-full bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-yellow-400/40 text-white rounded-xl py-2 px-3 text-xs font-bold flex items-center justify-center gap-2 transition shadow-sm"
                >
                  <Sliders className="w-3.5 h-3.5 text-yellow-400" />
                  <span>Assign Instruments &amp; Members</span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                </button>

                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="text-[11px] text-slate-500">Section Leader:</span>
                  <span className="font-semibold text-yellow-400 truncate max-w-[170px]">
                    {section.leaderName || section.leaderUid || "Unassigned"}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* MANAGE MEMBER INSTRUMENTS MODAL */}
      {activeManagingSection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-yellow-400/10 text-yellow-400 border border-yellow-400/20 flex items-center justify-center font-bold">
                  <Music className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <span>{activeManagingSection.name}</span>
                    <span className="text-xs font-mono font-normal text-slate-400">
                      ({activeSectionMembers.length} rostered)
                    </span>
                  </h2>
                  <p className="text-xs text-slate-400">
                    Manage instrument catalog and assign member instruments for this section.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setManagingSectionId(null);
                  setModalNewInstrument("");
                  setSelectedUserToAdd("");
                }}
                className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content - Scrollable */}
            <div className="p-5 overflow-y-auto space-y-6 flex-1">
              {/* Block 1: Section Instrument Catalog */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                  <div>
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                      <Music className="w-3.5 h-3.5 text-yellow-400" />
                      Section Instruments Pool ({activeManagingSection.instruments?.length || 0})
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Add all instrument variants played within this section.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleApplyPresetToActiveSection}
                    className="text-xs text-yellow-400 hover:text-yellow-300 font-semibold flex items-center gap-1 self-start sm:self-auto"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Apply Standard Preset</span>
                  </button>
                </div>

                {/* Add Instrument Input */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={modalNewInstrument}
                    onChange={(e) => setModalNewInstrument(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        if (modalNewInstrument.trim()) {
                          handleAddInstrumentToSection(activeManagingSection.id, modalNewInstrument);
                          setModalNewInstrument("");
                        }
                      }
                    }}
                    placeholder="e.g. Bass Trombone, Crotales, Piccolo..."
                    className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (modalNewInstrument.trim()) {
                        handleAddInstrumentToSection(activeManagingSection.id, modalNewInstrument);
                        setModalNewInstrument("");
                      }
                    }}
                    className="bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1 transition"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Instrument
                  </button>
                </div>

                {/* Active Section Instruments List */}
                <div className="flex flex-wrap gap-2 pt-1">
                  {(activeManagingSection.instruments || []).map((inst) => (
                    <span
                      key={inst}
                      className="bg-slate-900 border border-slate-700 text-white text-xs px-3 py-1.5 rounded-xl flex items-center gap-2 shadow-xs"
                    >
                      <Music className="w-3 h-3 text-yellow-400 shrink-0" />
                      <span className="font-medium">{inst}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveInstrumentFromSection(activeManagingSection.id, inst)}
                        title={`Remove ${inst}`}
                        className="text-slate-500 hover:text-rose-400 p-0.5 rounded transition"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  {(activeManagingSection.instruments || []).length === 0 && (
                    <div className="text-xs text-slate-500 italic py-2">
                      No instruments defined in this section catalog yet. Add instruments above or apply standard presets.
                    </div>
                  )}
                </div>
              </div>

              {/* Block 2: Quick Assign Member to Section */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                      <UserPlus className="w-3.5 h-3.5 text-yellow-400" />
                      Assign Musician to {activeManagingSection.name}
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Roster an unassigned member or transfer a musician into this section.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <select
                    value={selectedUserToAdd}
                    onChange={(e) => setSelectedUserToAdd(e.target.value)}
                    className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-yellow-400"
                  >
                    <option value="">-- Choose Musician from Roster --</option>
                    {nonSectionMembers.map((u) => (
                      <option key={u.uid} value={u.uid}>
                        {u.displayName} {u.realName ? `(${u.realName})` : ""} - {u.sectionId ? `Current: ${u.sectionId}` : "Unassigned"}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleAssignUserToSection}
                    disabled={!selectedUserToAdd}
                    className="bg-slate-800 hover:bg-slate-700 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 transition disabled:opacity-40"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Assign to Section</span>
                  </button>
                </div>
              </div>

              {/* Block 3: Section Members Roster & Instrument Assignments */}
              <div className="space-y-3">
                <div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-yellow-400" />
                    Rostered Members &amp; Instrument Assignments ({activeSectionMembers.length})
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Assign instruments to each musician. Check instruments they play, and click &ldquo;Set Active&rdquo; or the star icon to set their active gig instrument.
                  </p>
                </div>

                {activeSectionMembers.length === 0 ? (
                  <div className="bg-slate-950 border border-slate-800 rounded-2xl p-8 text-center text-xs text-slate-500">
                    No musicians are currently assigned to this section. Use the dropdown above to add members.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {activeSectionMembers.map((member) => {
                      const memberInstruments = member.instruments || [];
                      const activeInst = member.selectedInstrument || memberInstruments[0] || "";

                      return (
                        <div
                          key={member.uid}
                          className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3"
                        >
                          {/* Member Header */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-sm text-white">
                                  {member.displayName}
                                </span>
                                {member.realName && member.realName !== member.displayName && (
                                  <span className="text-xs text-slate-400 font-normal">
                                    (Legal: {member.realName})
                                  </span>
                                )}
                                <span className="text-[10px] font-mono text-slate-500">
                                  {member.email}
                                </span>
                              </div>

                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[11px] text-slate-400">Active Instrument:</span>
                                {activeInst ? (
                                  <span className="text-xs font-bold text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 px-2 py-0.5 rounded-md flex items-center gap-1">
                                    <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                                    {activeInst}
                                  </span>
                                ) : (
                                  <span className="text-xs text-slate-500 italic">None selected</span>
                                )}
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleRemoveUserFromSection(member)}
                              className="text-slate-500 hover:text-rose-400 text-xs self-start sm:self-auto transition flex items-center gap-1"
                              title="Unassign from section"
                            >
                              <X className="w-3.5 h-3.5" />
                              <span>Remove from section</span>
                            </button>
                          </div>

                          {/* Instrument Qualifications & Toggles */}
                          <div className="space-y-1.5">
                            <span className="text-[11px] font-semibold text-slate-400 block">
                              Assigned Section Instruments:
                            </span>

                            <div className="flex flex-wrap gap-2">
                              {(activeManagingSection.instruments || []).map((inst) => {
                                const isAssigned = memberInstruments.includes(inst);
                                const isCurrentActive = activeInst === inst;

                                return (
                                  <div
                                    key={inst}
                                    className={`text-xs rounded-xl border p-1.5 px-2.5 flex items-center gap-2 transition ${
                                      isAssigned
                                        ? "bg-slate-900 border-yellow-400/40 text-white"
                                        : "bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-300 hover:border-slate-700"
                                    }`}
                                  >
                                    <button
                                      type="button"
                                      onClick={() => handleToggleMemberInstrument(member, inst)}
                                      className="flex items-center gap-1.5 font-medium"
                                      title={isAssigned ? "Click to unassign" : "Click to assign"}
                                    >
                                      <div
                                        className={`w-3.5 h-3.5 rounded flex items-center justify-center border ${
                                          isAssigned
                                            ? "bg-yellow-400 border-yellow-400 text-slate-950"
                                            : "border-slate-700"
                                        }`}
                                      >
                                        {isAssigned && <Check className="w-2.5 h-2.5 stroke-3" />}
                                      </div>
                                      <span>{inst}</span>
                                    </button>

                                    {isAssigned && (
                                      <button
                                        type="button"
                                        onClick={() => handleSetMemberSelectedInstrument(member, inst)}
                                        title={isCurrentActive ? "Active gig instrument" : "Set as active gig instrument"}
                                        className={`p-1 rounded-md transition ${
                                          isCurrentActive
                                            ? "text-yellow-400 bg-yellow-400/10"
                                            : "text-slate-500 hover:text-yellow-400"
                                        }`}
                                      >
                                        <Star
                                          className={`w-3 h-3 ${
                                            isCurrentActive ? "fill-yellow-400 text-yellow-400" : ""
                                          }`}
                                        />
                                      </button>
                                    )}
                                  </div>
                                );
                              })}

                              {(activeManagingSection.instruments || []).length === 0 && (
                                <span className="text-xs text-slate-500 italic">
                                  Define instruments in the section catalog above to assign them to musicians.
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setManagingSectionId(null);
                  setModalNewInstrument("");
                  setSelectedUserToAdd("");
                }}
                className="bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold px-5 py-2 rounded-xl text-xs transition"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}