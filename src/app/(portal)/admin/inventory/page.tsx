"use client";

import React, { useEffect, useState } from "react";
import { 
  collection, 
  onSnapshot, 
  setDoc, 
  deleteDoc, 
  updateDoc, 
  doc 
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/lib/context/AuthContext";
import { canManageSections, canManageGigs } from "@/lib/auth/permissions";
import { User } from "@/lib/schema/user";
import { 
  Package, 
  Plus, 
  Trash2, 
  Search, 
  Loader2, 
  ShieldAlert, 
  X, 
  Check, 
  UserCheck, 
  Wrench, 
  Volume2, 
  Flag, 
  ShieldCheck,
  Tag
} from "lucide-react";

export type AssetCategory = "instrument" | "harness" | "audio_pa" | "banner_merch" | "hardware";
export type AssetCondition = "excellent" | "good" | "needs_repair" | "retired";

interface InventoryItem {
  id: string;
  name: string;
  category: AssetCategory;
  serialNumber?: string;
  condition: AssetCondition;
  assignedToUid?: string;
  assignedToName?: string;
  locationNotes?: string;
  updatedAt: string;
}

interface MusicianOption {
  uid: string;
  displayName: string;
}

export default function InventoryAdminPage() {
  const { profile, loading: authLoading } = useAuth();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [musicians, setMusicians] = useState<MusicianOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [isCreating, setIsCreating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // New Item Form State
  const [formData, setFormData] = useState({
    name: "",
    category: "instrument" as AssetCategory,
    serialNumber: "",
    condition: "good" as AssetCondition,
    assignedToUid: "",
    locationNotes: "",
  });

  // 1. Fetch Inventory Items
  useEffect(() => {
    if (authLoading) return;

    const unsubInventory = onSnapshot(
      collection(db, "inventory"),
      (snap) => {
        const list: InventoryItem[] = [];
        snap.forEach((d) => {
          const data = d.data();
          list.push({
            id: d.id,
            name: data.name || "Unnamed Item",
            category: data.category || "instrument",
            serialNumber: data.serialNumber || "",
            condition: data.condition || "good",
            assignedToUid: data.assignedToUid || "",
            assignedToName: data.assignedToName || "",
            locationNotes: data.locationNotes || "",
            updatedAt: data.updatedAt || "",
          });
        });
        list.sort((a, b) => a.name.localeCompare(b.name));
        setItems(list);
        setLoading(false);
      },
      (err) => {
        console.error("Error loading inventory:", err);
        setLoading(false);
      }
    );

    // 2. Fetch Musicians for Assignment Picklists
    const unsubUsers = onSnapshot(
      collection(db, "users"),
      (snap) => {
        const mList: MusicianOption[] = [];
        snap.forEach((d) => {
          const u = d.data();
          mList.push({
            uid: d.id,
            displayName: u.displayName || u.name || "Musician",
          });
        });
        mList.sort((a, b) => a.displayName.localeCompare(b.displayName));
        setMusicians(mList);
      },
      (err) => console.warn("Notice loading musician profiles:", err)
    );

    return () => {
      unsubInventory();
      unsubUsers();
    };
  }, [authLoading]);

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-400 gap-2 text-xs">
        <Loader2 className="w-4 h-4 animate-spin text-yellow-400" />
        Cataloging band inventory & assets...
      </div>
    );
  }

  const userProfile = profile as unknown as User;
  const hasAccess = Boolean(userProfile && (canManageSections(userProfile) || canManageGigs(userProfile)));

  if (!hasAccess) {
    return (
      <div className="p-8 text-rose-400 text-xs font-semibold flex items-center gap-2">
        <ShieldAlert className="w-4 h-4" />
        Section Leader or Gig Manager privileges required to view or adjust band equipment.
      </div>
    );
  }

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    setIsSaving(true);
    try {
      const itemId = `asset_${Date.now()}`;
      const assignedMusician = musicians.find((m) => m.uid === formData.assignedToUid);

      const payload: InventoryItem = {
        id: itemId,
        name: formData.name.trim(),
        category: formData.category,
        serialNumber: formData.serialNumber.trim(),
        condition: formData.condition,
        assignedToUid: formData.assignedToUid || "",
        assignedToName: assignedMusician ? assignedMusician.displayName : "",
        locationNotes: formData.locationNotes.trim(),
        updatedAt: new Date().toISOString(),
      };

      await setDoc(doc(db, "inventory", itemId), payload, { merge: true });
      setIsCreating(false);
      setFormData({
        name: "",
        category: "instrument",
        serialNumber: "",
        condition: "good",
        assignedToUid: "",
        locationNotes: "",
      });
    } catch (err) {
      alert("Failed to record equipment: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsSaving(false);
    }
  };

  const handleAssignmentChange = async (itemId: string, uid: string) => {
    try {
      const assignedMusician = musicians.find((m) => m.uid === uid);
      await updateDoc(doc(db, "inventory", itemId), {
        assignedToUid: uid || "",
        assignedToName: assignedMusician ? assignedMusician.displayName : "",
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      alert("Failed to update gear assignment: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleConditionChange = async (itemId: string, condition: AssetCondition) => {
    try {
      await updateDoc(doc(db, "inventory", itemId), {
        condition,
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      alert("Failed to update item condition: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleDeleteItem = async (id: string, name: string) => {
    if (!confirm(`Delete asset record for "${name}"?`)) return;
    try {
      await deleteDoc(doc(db, "inventory", id));
    } catch (err) {
      alert("Failed to remove item: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  const filteredItems = items.filter((item) => {
    const matchesCategory = selectedCategory === "all" || item.category === selectedCategory;
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.assignedToName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.serialNumber || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.locationNotes || "").toLowerCase().includes(searchQuery.toLowerCase());

    return matchesCategory && matchesSearch;
  });

  const getCategoryIcon = (cat: AssetCategory) => {
    switch (cat) {
      case "instrument":
        return <Tag className="w-3.5 h-3.5 text-yellow-400" />;
      case "harness":
        return <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />;
      case "audio_pa":
        return <Volume2 className="w-3.5 h-3.5 text-emerald-400" />;
      case "banner_merch":
        return <Flag className="w-3.5 h-3.5 text-rose-400" />;
      default:
        return <Wrench className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      {/* Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-yellow-400 bg-slate-950 px-2.5 py-0.5 rounded border border-slate-800">
              Stage 20 Studio
            </span>
            <span className="text-xs font-mono text-slate-400">
              {items.length} Registered Asset{items.length === 1 ? "" : "s"}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Equipment & Assets</h1>
          <p className="text-xs text-slate-400">
            Track band-owned brass, percussion harnesses, mobile PA gear, and member custody.
          </p>
        </div>

        {!isCreating && (
          <button
            type="button"
            onClick={() => setIsCreating(true)}
            className="bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition shadow shrink-0"
          >
            <Plus className="w-4 h-4" /> Add New Asset
          </button>
        )}
      </div>

      {/* Creation Modal / Inline Form */}
      {isCreating && (
        <form
          onSubmit={handleCreateItem}
          className="bg-slate-900 border border-yellow-400/30 rounded-2xl p-5 space-y-4 shadow-2xl"
        >
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Package className="w-4 h-4 text-yellow-400" /> Register Equipment
            </h2>
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">Asset Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Conn Fiberglass Sousaphone"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as AssetCategory })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400"
              >
                <option value="instrument">Instrument (Brass / Horn)</option>
                <option value="harness">Drum Harness / Carrier</option>
                <option value="audio_pa">Audio / Mobile PA</option>
                <option value="banner_merch">Banner / Merch Trunk</option>
                <option value="hardware">Hardware / Stands</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">Serial Number / Tag</label>
              <input
                type="text"
                placeholder="e.g. SN-884210"
                value={formData.serialNumber}
                onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">Condition</label>
              <select
                value={formData.condition}
                onChange={(e) => setFormData({ ...formData, condition: e.target.value as AssetCondition })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400"
              >
                <option value="excellent">Excellent / Gig Ready</option>
                <option value="good">Good / Functional</option>
                <option value="needs_repair">Needs Repair</option>
                <option value="retired">Retired / Storage</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">Assigned Musician</label>
              <select
                value={formData.assignedToUid}
                onChange={(e) => setFormData({ ...formData, assignedToUid: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400"
              >
                <option value="">-- Ensemble Storage / Unassigned --</option>
                {musicians.map((m) => (
                  <option key={m.uid} value={m.uid}>
                    {m.displayName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">Location / Storage Notes</label>
              <input
                type="text"
                placeholder="e.g. Band Trailer Shelf 2"
                value={formData.locationNotes}
                onChange={(e) => setFormData({ ...formData, locationNotes: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="px-3 py-1.5 text-xs text-slate-400 hover:text-white transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold px-4 py-1.5 rounded-lg text-xs flex items-center gap-1 transition disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              <span>{isSaving ? "Saving..." : "Save Equipment"}</span>
            </button>
          </div>
        </form>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search assets by name, member, serial number, or storage location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400 font-semibold"
          />
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 shrink-0">
          {[
            { key: "all", label: "All Gear" },
            { key: "instrument", label: "Instruments" },
            { key: "harness", label: "Harnesses" },
            { key: "audio_pa", label: "PA & Audio" },
            { key: "banner_merch", label: "Banners/Merch" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setSelectedCategory(tab.key)}
              className={`text-xs px-3 py-1.5 rounded-xl font-bold transition border ${
                selectedCategory === tab.key
                  ? "bg-yellow-400 text-slate-950 border-yellow-400"
                  : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Equipment Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredItems.map((item) => (
          <div
            key={item.id}
            className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 space-y-4 shadow transition flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="p-2 rounded-xl bg-slate-950 border border-slate-800">
                    {getCategoryIcon(item.category)}
                  </span>
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                    {item.category.replace("_", " ")}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => handleDeleteItem(item.id, item.name)}
                  className="text-slate-500 hover:text-rose-400 p-1 rounded transition"
                  title="Remove asset record"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div>
                <h3 className="font-bold text-white text-base leading-snug">{item.name}</h3>
                {item.serialNumber && (
                  <div className="text-[11px] font-mono text-slate-500 pt-0.5">
                    Serial: <span className="text-slate-300">{item.serialNumber}</span>
                  </div>
                )}
              </div>

              {/* Assignment Selector */}
              <div className="space-y-1 bg-slate-950/80 border border-slate-800/80 p-3 rounded-xl">
                <span className="text-[10px] font-mono uppercase font-bold text-slate-500 flex items-center gap-1">
                  <UserCheck className="w-3.5 h-3.5 text-yellow-400" /> Custody / Assigned Musician
                </span>
                <select
                  value={item.assignedToUid || ""}
                  onChange={(e) => handleAssignmentChange(item.id, e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-white font-semibold focus:outline-none focus:border-yellow-400"
                >
                  <option value="">-- Band Trailer / Storage --</option>
                  {musicians.map((m) => (
                    <option key={m.uid} value={m.uid}>
                      {m.displayName}
                    </option>
                  ))}
                </select>
              </div>

              {item.locationNotes && (
                <div className="text-[11px] text-slate-400 italic">
                  Location: {item.locationNotes}
                </div>
              )}
            </div>

            {/* Condition Toggler Footer */}
            <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
              <span className="text-[10px] font-mono text-slate-500 uppercase">Condition</span>
              <select
                value={item.condition}
                onChange={(e) => handleConditionChange(item.id, e.target.value as AssetCondition)}
                className={`text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-1 rounded-lg border focus:outline-none cursor-pointer ${
                  item.condition === "excellent"
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                    : item.condition === "good"
                    ? "bg-blue-500/10 text-blue-400 border-blue-500/30"
                    : item.condition === "needs_repair"
                    ? "bg-yellow-400/10 text-yellow-400 border-yellow-400/30"
                    : "bg-rose-500/10 text-rose-400 border-rose-500/30"
                }`}
              >
                <option value="excellent" className="bg-slate-900 text-emerald-400">Excellent</option>
                <option value="good" className="bg-slate-900 text-blue-400">Good</option>
                <option value="needs_repair" className="bg-slate-900 text-yellow-400">Needs Repair</option>
                <option value="retired" className="bg-slate-900 text-rose-400">Retired</option>
              </select>
            </div>
          </div>
        ))}
      </div>

      {filteredItems.length === 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-400 space-y-2">
          <Package className="w-8 h-8 mx-auto text-slate-600" />
          <p className="text-xs font-semibold">No equipment matching this query.</p>
        </div>
      )}
    </div>
  );
}