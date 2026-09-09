"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
  collection,
  onSnapshot,
  doc,
  setDoc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/lib/context/AuthContext";
import { canManageSections } from "@/lib/auth/permissions";
import { User } from "@/lib/schema/user";
import {
  Users,
  ShieldAlert,
  Loader2,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Music,
} from "lucide-react";

export interface SectionData {
  id: string;
  name: string;
  order: number;
  minRecommended?: number;
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
    leaderUids: [],
    notes: "",
  });
  const [isSaving, setIsSaving] = useState(false);

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

  // Firestore real-time listeners for sections and roster users
  useEffect(() => {
    if (authLoading) return;

    const unsubSections = onSnapshot(
      collection(db, "sections"),
      (snap) => {
        const list: SectionData[] = [];
        snap.forEach((d) => {
          list.push({ id: d.id, ...d.data() } as SectionData);
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
          uList.push({ uid: d.id, ...d.data() } as unknown as User);
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
      <div className="p-8 text-rose-400 text-xs font-semibold flex items-center gap-2">
        <ShieldAlert className="w-4 h-4" />
        Administrator privileges required to manage band sections.
      </div>
    );
  }

  const handleStartCreate = () => {
    setEditingId("new");
    setFormData({
      id: "",
      name: "",
      order: sections.length + 1,
      minRecommended: 2,
      leaderUids: [],
      notes: "",
    });
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
      leaderUids: existingLeaders,
    });
  };

  const handleCancel = () => {
    setEditingId(null);
    setFormData({});
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
        leaderUids: formData.leaderUids || [],
        leaderUid: primaryLeaderUid,
        leaderName: primaryLeader?.displayName || "",
        notes: formData.notes?.trim() || "",
      };

      await setDoc(doc(db, "sections", targetId), payload, { merge: true });
      setEditingId(null);
      setFormData({});
    } catch (err) {
      alert(
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
      if (editingId === id) handleCancel();
    } catch (err) {
      alert(
        "Failed to delete section: " +
          (err instanceof Error ? err.message : String(err))
      );
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
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
            Define instrument sections, quorum thresholds, and section leader assignments.
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
                Section Name
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

          {/* Section Leaders Assignment */}
          <div className="space-y-2">
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
                      {user.instruments?.[0] || user.sectionId || "musician"}
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {sections.map((section) => {
          const sectionMembers = uniqueUsers.filter(
            (u) => u.sectionId === section.id
          );

          return (
            <div
              key={section.id}
              className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 space-y-3 shadow-lg flex flex-col justify-between transition"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold bg-slate-950 text-yellow-400 border border-slate-800 px-2 py-0.5 rounded">
                      #{section.order}
                    </span>
                    <h3 className="font-bold text-white text-sm">
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

                <div className="pt-1 flex flex-wrap gap-2 text-[11px] text-slate-400">
                  <div className="flex items-center gap-1 bg-slate-950 px-2 py-1 rounded border border-slate-800">
                    <Users className="w-3 h-3 text-slate-500" />
                    <span>{sectionMembers.length} rostered</span>
                  </div>
                  <div className="bg-slate-950 px-2 py-1 rounded border border-slate-800">
                    <span>Min Quorum: {section.minRecommended || 2}</span>
                  </div>
                </div>
              </div>

              {/* Leader Callout */}
              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                <span className="text-[11px] text-slate-500">Leader:</span>
                <span className="font-semibold text-yellow-400 truncate max-w-[180px]">
                  {section.leaderName || section.leaderUid || "Unassigned"}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}