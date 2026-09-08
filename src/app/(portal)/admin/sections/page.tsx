"use client";

import React, { useEffect, useState } from "react";
import { collection, onSnapshot, doc, updateDoc, setDoc, deleteDoc, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { Section, SectionSchema } from "@/lib/schema/section";
import { User } from "@/lib/schema/user";
import { useAuth } from "@/lib/context/AuthContext";
import { canManageSections } from "@/lib/auth/permissions";
import { Layers, ShieldAlert, Plus, Edit2, Trash2, Check, X } from "lucide-react";

export default function SectionsAdminPage() {
  const { profile, loading: authLoading } = useAuth();
  const [sections, setSections] = useState<Section[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [editingSection, setEditingSection] = useState<Section | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState<Partial<Section>>({
    name: "",
    description: "",
    instruments: [],
    leaderUids: [],
    memberUids: [],
    order: 0,
  });

  useEffect(() => {
    const unsubSections = onSnapshot(collection(db, "sections"), (snap) => {
      const list: Section[] = [];
      snap.forEach((d) => {
        const parsed = SectionSchema.safeParse(d.data());
        if (parsed.success) list.push(parsed.data);
      });
      list.sort((a, b) => a.order - b.order);
      setSections(list);
    });

    const loadUsers = async () => {
      const snap = await getDocs(collection(db, "users"));
      const users: User[] = [];
      snap.forEach((d) => users.push(d.data() as User));
      setAllUsers(users);
    };

    loadUsers();
    return () => unsubSections();
  }, []);

  if (authLoading) return <div className="p-8 text-slate-400">Verifying access...</div>;
  if (!canManageSections(profile)) {
    return (
      <div className="p-8 text-amber-400 flex items-center gap-3">
        <ShieldAlert className="w-6 h-6" />
        <span>Administrator permission required to manage band sections.</span>
      </div>
    );
  }

  const handleEdit = (section: Section) => {
    setEditingSection(section);
    setIsCreating(false);
    setFormData({ ...section });
  };

  const handleStartCreate = () => {
    setEditingSection(null);
    setIsCreating(true);
    setFormData({
      id: `sec_${Date.now()}`,
      name: "",
      description: "",
      instruments: [],
      leaderUids: [],
      memberUids: [],
      order: sections.length + 1,
    });
  };

  const handleSave = async () => {
    if (!formData.name?.trim()) return;

    if (isCreating) {
      const newSection = SectionSchema.parse({
        ...formData,
        id: formData.id || `sec_${Date.now()}`,
        updatedAt: new Date().toISOString(),
      });
      await setDoc(doc(db, "sections", newSection.id), newSection);
    } else if (editingSection) {
      const updated = SectionSchema.parse({
        ...editingSection,
        ...formData,
        updatedAt: new Date().toISOString(),
      });
      await updateDoc(doc(db, "sections", updated.id), updated);
    }

    // Synchronize sectionId on allocated members
    if (formData.memberUids) {
      for (const uid of formData.memberUids) {
        await updateDoc(doc(db, "users", uid), {
          sectionId: formData.id || editingSection?.id,
        }).catch(() => {});
      }
    }

    setEditingSection(null);
    setIsCreating(false);
  };

  const handleDelete = async (sectionId: string) => {
    if (!confirm("Are you sure you want to delete this section?")) return;
    await deleteDoc(doc(db, "sections", sectionId));
  };

  const toggleLeader = (uid: string) => {
    const current = new Set(formData.leaderUids || []);
    if (current.has(uid)) current.delete(uid);
    else current.add(uid);
    setFormData({ ...formData, leaderUids: Array.from(current) });
  };

  const toggleMember = (uid: string) => {
    const current = new Set(formData.memberUids || []);
    if (current.has(uid)) current.delete(uid);
    else current.add(uid);
    setFormData({ ...formData, memberUids: Array.from(current) });
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Layers className="text-yellow-400" />
            Band Section Administration
          </h1>
          <p className="text-slate-400 text-sm">
            Organize ensemble sections, staging descriptions, section leaders, and performer rosters.
          </p>
        </div>
        {!editingSection && !isCreating && (
          <button
            onClick={handleStartCreate}
            className="flex items-center gap-2 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-semibold px-4 py-2 rounded transition"
          >
            <Plus className="w-4 h-4" /> Add Section
          </button>
        )}
      </div>

      {/* Editor Drawer / Form */}
      {(isCreating || editingSection) && (
        <div className="bg-slate-900 border border-slate-700 rounded-lg p-6 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-white">
              {isCreating ? "Create New Section" : `Editing: ${editingSection?.name}`}
            </h2>
            <button
              onClick={() => {
                setEditingSection(null);
                setIsCreating(false);
              }}
              className="text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs uppercase font-semibold text-slate-400 mb-1">
                Section Name
              </label>
              <input
                type="text"
                value={formData.name || ""}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Low Brass"
                className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white"
              />
            </div>
            <div>
              <label className="block text-xs uppercase font-semibold text-slate-400 mb-1">
                Display Order
              </label>
              <input
                type="number"
                value={formData.order ?? 0}
                onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
                className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs uppercase font-semibold text-slate-400 mb-1">
              Description & Staging Notes
            </label>
            <textarea
              value={formData.description || ""}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Operational responsibilities, expected instruments, and parade position notes..."
              rows={3}
              className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white"
            />
          </div>

          <div>
            <label className="block text-xs uppercase font-semibold text-slate-400 mb-1">
              Expected Instruments (comma-separated)
            </label>
            <input
              type="text"
              value={(formData.instruments || []).join(", ")}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  instruments: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                })
              }
              placeholder="Sousaphone, Tuba, Baritone Horn"
              className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white"
            />
          </div>

          {/* Member & Section Leader Allocation */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <h3 className="text-sm font-semibold text-slate-300">Assign Section Leaders & Members</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-2 bg-slate-950 rounded border border-slate-800">
              {allUsers.map((user) => {
                const isMember = (formData.memberUids || []).includes(user.uid);
                const isLeader = (formData.leaderUids || []).includes(user.uid);
                return (
                  <div
                    key={user.uid}
                    className={`p-2 rounded border text-xs flex flex-col justify-between gap-1 transition ${
                      isMember ? "border-yellow-400/50 bg-slate-900" : "border-slate-800 opacity-60"
                    }`}
                  >
                    <div className="font-semibold text-white">{user.displayName}</div>
                    <div className="flex gap-2 mt-1">
                      <button
                        type="button"
                        onClick={() => toggleMember(user.uid)}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          isMember ? "bg-yellow-400 text-slate-950" : "bg-slate-800 text-slate-300"
                        }`}
                      >
                        {isMember ? "Member ✓" : "+ Member"}
                      </button>
                      {isMember && (
                        <button
                          type="button"
                          onClick={() => toggleLeader(user.uid)}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            isLeader ? "bg-purple-600 text-white" : "bg-slate-800 text-slate-400"
                          }`}
                        >
                          {isLeader ? "Leader ★" : "+ Leader"}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              onClick={() => {
                setEditingSection(null);
                setIsCreating(false);
              }}
              className="px-4 py-2 text-slate-400 hover:text-white transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-2 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold px-4 py-2 rounded transition"
            >
              <Check className="w-4 h-4" /> Save Section
            </button>
          </div>
        </div>
      )}

      {/* Sections List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sections.map((section) => {
          const leaders = allUsers.filter((u) => section.leaderUids.includes(u.uid));
          const members = allUsers.filter((u) => section.memberUids.includes(u.uid));

          return (
            <div
              key={section.id}
              className="bg-slate-900 border border-slate-800 rounded-lg p-5 flex flex-col justify-between space-y-4 hover:border-slate-700 transition"
            >
              <div>
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      {section.name}
                      <span className="text-xs bg-slate-800 text-slate-400 font-mono px-2 py-0.5 rounded">
                        #{section.order}
                      </span>
                    </h3>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(section)}
                      className="p-1.5 text-slate-400 hover:text-yellow-400 rounded hover:bg-slate-800 transition"
                      title="Edit Section"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(section.id)}
                      className="p-1.5 text-slate-400 hover:text-red-400 rounded hover:bg-slate-800 transition"
                      title="Delete Section"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <p className="text-xs text-slate-400 mb-3 leading-relaxed">
                  {section.description || "No description provided."}
                </p>

                {section.instruments.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {section.instruments.map((inst) => (
                      <span
                        key={inst}
                        className="text-[11px] bg-slate-800/80 text-yellow-400/90 px-2 py-0.5 rounded"
                      >
                        {inst}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="border-t border-slate-800/80 pt-3 text-xs space-y-1">
                <div className="text-slate-400">
                  <strong className="text-slate-300">Leaders:</strong>{" "}
                  {leaders.length > 0
                    ? leaders.map((l) => l.displayName).join(", ")
                    : "None assigned"}
                </div>
                <div className="text-slate-400">
                  <strong className="text-slate-300">Roster ({members.length}):</strong>{" "}
                  {members.length > 0
                    ? members.map((m) => m.displayName).join(", ")
                    : "No members assigned"}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}