"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  collection, 
  doc, 
  onSnapshot, 
  setDoc 
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/lib/context/AuthContext";
import { 
  Setlist, 
  SetlistCategory, 
  SetlistTuneItem,
  isReusableSetlistTemplate,
  isDuplicateSetlistTitle
} from "@/lib/schema/setlist";
import { 
  X, 
  ListMusic, 
  Plus, 
  Trash2, 
  ArrowUp, 
  ArrowDown, 
  Check, 
  Search, 
  Clock, 
  Layers, 
  Loader2, 
  Music, 
  Copy,
  BookmarkPlus
} from "lucide-react";

interface SongItem {
  id: string;
  title: string;
  artist?: string;
  keySignature?: string;
  tempoBpm?: number;
  driveLink?: string;
}

interface GigTarget {
  id: string;
  date: string;
  title?: string;
  setlistName?: string;
  setlistTitle?: string;
  publicDetails?: { title?: string; venue?: string };
  internalLogistics?: {
    title?: string;
    setlistId?: string;
    setlistName?: string;
    setlistTitle?: string;
  };
  setlistId?: string;
  setlist?: SetlistTuneItem[] | unknown[];
}

interface Props {
  gig: GigTarget;
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

const CATEGORY_LABELS: Record<SetlistCategory, { label: string; color: string }> = {
  parade: { label: "Parade", color: "bg-amber-500/20 text-amber-300 border-amber-500/30" },
  festival: { label: "Festival", color: "bg-sky-500/20 text-sky-300 border-sky-500/30" },
  street_revelry: { label: "Street Revelry", color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" },
  ceremony: { label: "Ceremonial", color: "bg-purple-500/20 text-purple-300 border-purple-500/30" },
  concert: { label: "Concert", color: "bg-rose-500/20 text-rose-300 border-rose-500/30" },
  custom: { label: "Custom", color: "bg-slate-500/20 text-slate-300 border-slate-500/30" },
};

function generateId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

function GigSetlistAssignmentModalInner({
  gig,
  onClose,
  onSaved,
}: {
  gig: GigTarget;
  onClose: () => void;
  onSaved?: () => void;
}) {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<"choose" | "create">("choose");
  const [reusableSetlists, setReusableSetlists] = useState<Setlist[]>([]);
  const [catalog, setCatalog] = useState<SongItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Search & filter for Choose tab
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const gigTitle = gig.internalLogistics?.title || gig.publicDetails?.title || `Gig ${gig.id.slice(0, 6)}`;
  const [assignedId, setAssignedId] = useState(
    gig.setlistId || gig.internalLogistics?.setlistId || ""
  );
  const [assignedName, setAssignedName] = useState(
    gig.setlistName ||
    gig.setlistTitle ||
    gig.internalLogistics?.setlistName ||
    gig.internalLogistics?.setlistTitle ||
    ""
  );

  // State for Create tab
  const [newSetlistName, setNewSetlistName] = useState(`${gigTitle} Unique Setlist`);
  const [newCategory, setNewCategory] = useState<SetlistCategory>("parade");
  const [newTargetDuration, setNewTargetDuration] = useState(45);
  const [saveAsReusable, setSaveAsReusable] = useState(true);
  const [newTunes, setNewTunes] = useState<SetlistTuneItem[]>(() => {
    if (Array.isArray(gig.setlist) && gig.setlist.length > 0) {
      return (gig.setlist as SetlistTuneItem[]).map((t, idx) => ({
        id: t.id || generateId("tune"),
        songId: t.songId || t.tuneId || `song_${idx}`,
        tuneId: t.tuneId || t.songId || `song_${idx}`,
        title: t.title || "Untitled",
        artist: t.artist || "",
        keySignature: t.keySignature || "Bb",
        tempoBpm: t.tempoBpm || 120,
        notes: t.notes || "",
        customNotes: t.customNotes || "",
        driveLink: t.driveLink || "",
        transitionType: t.transitionType || "standard_pause",
      }));
    }
    return [];
  });
  const [catalogSearch, setCatalogSearch] = useState("");

  // Fetch reusable setlists and songs catalog
  useEffect(() => {

    const unsubSetlists = onSnapshot(
      collection(db, "setlists"),
      (snap) => {
        const list: Setlist[] = [];
        const seenIds = new Set<string>();
        snap.forEach((d) => {
          const data = d.data();
          // Filter for templates / reusable setlists (exclude gig stage view docs)
          if (isReusableSetlistTemplate(d.id, data) && !seenIds.has(d.id)) {
            seenIds.add(d.id);
            list.push({ id: d.id, ...data } as Setlist);
          }
        });
        list.sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0) || (a.name || a.title || "").localeCompare(b.name || b.title || ""));
        setReusableSetlists(list);
        setLoading(false);
      },
      (err) => console.warn("Notice: setlists fetch note:", err)
    );

    const unsubCatalog = onSnapshot(
      collection(db, "songs"),
      (snap) => {
        const list: SongItem[] = [];
        snap.forEach((d) => {
          const data = d.data();
          list.push({
            id: d.id,
            title: data.title || "Untitled Chart",
            artist: data.artist || "",
            keySignature: data.keySignature || "Bb",
            tempoBpm: data.tempoBpm || 120,
            driveLink: data.driveLink || "",
          });
        });
        list.sort((a, b) => a.title.localeCompare(b.title));
        setCatalog(list);
      },
      (err) => console.warn("Notice: songs fetch note:", err)
    );

    return () => {
      unsubSetlists();
      unsubCatalog();
    };
  }, []);

  // Filtered reusable setlists
  const filteredSetlists = useMemo(() => {
    return reusableSetlists.filter((s) => {
      const name = s.name || s.title || "";
      const matchesSearch =
        name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.tags && s.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase())));
      if (!matchesSearch) return false;
      if (categoryFilter !== "all" && s.category !== categoryFilter) return false;
      return true;
    });
  }, [reusableSetlists, searchQuery, categoryFilter]);

  // Filtered catalog songs for Create tab
  const filteredCatalog = useMemo(() => {
    if (!catalogSearch.trim()) return catalog;
    const q = catalogSearch.toLowerCase();
    return catalog.filter(
      (s) => s.title.toLowerCase().includes(q) || (s.artist && s.artist.toLowerCase().includes(q))
    );
  }, [catalog, catalogSearch]);

  // Check if title already exists in reusable library
  const isDuplicateCreateTitle = useMemo(() => {
    const trimmed = newSetlistName.trim();
    if (!trimmed || !saveAsReusable) return false;
    return isDuplicateSetlistTitle(trimmed, reusableSetlists);
  }, [newSetlistName, saveAsReusable, reusableSetlists]);

  // Remove setlist from gig, resetting to an empty setlist
  const handleRemoveSetlist = async () => {
    if (!confirm(`Are you sure you want to remove the setlist from "${gigTitle}"? This gig will have an empty setlist.`)) {
      return;
    }
    setSaving(true);
    try {
      // 1. Clear setlist fields on gig document
      await setDoc(
        doc(db, "gigs", gig.id),
        {
          setlistId: null,
          setlistName: "",
          setlistTitle: "",
          internalLogistics: {
            setlistId: null,
            setlistName: "",
            setlistTitle: "",
          },
          setlist: [],
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      // 2. Clear gig stage view document
      await setDoc(
        doc(db, "setlists", gig.id),
        {
          gigId: gig.id,
          isTemplate: false,
          templateId: null,
          templateName: "",
          name: "",
          title: "",
          tunes: [],
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      // 3. Remove gig.id from previous reusable setlist if it was linked
      if (assignedId) {
        const sl = reusableSetlists.find((s) => s.id === assignedId);
        if (sl && Array.isArray(sl.assignedGigIds) && sl.assignedGigIds.includes(gig.id)) {
          const updatedAssigned = sl.assignedGigIds.filter((id) => id !== gig.id);
          await setDoc(
            doc(db, "setlists", assignedId),
            {
              assignedGigIds: updatedAssigned,
              updatedAt: new Date().toISOString(),
            },
            { merge: true }
          );
        }
      }

      setAssignedId("");
      setAssignedName("");
      setNewTunes([]);
      setNewSetlistName(`${gigTitle} Unique Setlist`);

      if (onSaved) onSaved();
    } catch (err) {
      alert("Failed to remove setlist: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setSaving(false);
    }
  };

  // 1-Click Assign an Existing Reusable Setlist
  const handleAssignExistingSetlist = async (setlist: Setlist) => {
    setSaving(true);
    try {
      const tunes = setlist.tunes || setlist.items || [];
      const title = setlist.name || setlist.title || "Untitled Setlist";

      // If previous setlist was from reusable library and different from current, unlink gig
      if (assignedId && assignedId !== setlist.id) {
        const prevSl = reusableSetlists.find((s) => s.id === assignedId);
        if (prevSl && Array.isArray(prevSl.assignedGigIds) && prevSl.assignedGigIds.includes(gig.id)) {
          const updatedPrev = prevSl.assignedGigIds.filter((id) => id !== gig.id);
          await setDoc(
            doc(db, "setlists", assignedId),
            {
              assignedGigIds: updatedPrev,
              updatedAt: new Date().toISOString(),
            },
            { merge: true }
          );
        }
      }

      // 1. Update the gig document with persistent setlistId and title
      await setDoc(
        doc(db, "gigs", gig.id),
        {
          setlistId: setlist.id,
          setlistName: title,
          setlistTitle: title,
          internalLogistics: {
            setlistId: setlist.id,
            setlistName: title,
            setlistTitle: title,
          },
          setlist: tunes,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      // 2. Update gig setlist document for stage view (/portal/perform/[gigId])
      await setDoc(
        doc(db, "setlists", gig.id),
        {
          gigId: gig.id,
          isTemplate: false,
          templateId: setlist.id,
          templateName: title,
          name: title,
          title,
          tunes,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      // 3. Update the reusable setlist document usage statistics
      const currentAssigned = setlist.assignedGigIds || [];
      const updatedAssigned = currentAssigned.includes(gig.id)
        ? currentAssigned
        : [...currentAssigned, gig.id];
      const newUsageCount = (setlist.usageCount || 0) + 1;

      await setDoc(
        doc(db, "setlists", setlist.id),
        {
          assignedGigIds: updatedAssigned,
          usageCount: newUsageCount,
          lastUsedDate: gig.date || new Date().toISOString().split("T")[0],
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      setAssignedId(setlist.id);
      setAssignedName(title);

      if (onSaved) onSaved();
      onClose();
    } catch (err) {
      alert("Failed to assign setlist: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setSaving(false);
    }
  };

  // Clone an existing setlist into the Create Tab to customize
  const handleCloneIntoCreateTab = (setlist: Setlist) => {
    const baseName = (setlist.name || setlist.title || "Setlist").trim();
    let initialCloneName = `${baseName} (${gigTitle})`;
    let counter = 2;
    while (isDuplicateSetlistTitle(initialCloneName, reusableSetlists)) {
      initialCloneName = `${baseName} (${gigTitle} ${counter})`;
      counter++;
    }
    setNewSetlistName(initialCloneName);
    setNewCategory(setlist.category);
    setNewTargetDuration(setlist.targetDurationMinutes || 45);
    setNewTunes([...(setlist.tunes || setlist.items || [])]);
    setActiveTab("create");
  };

  // Add song to new tunes list
  const handleAddSongToNewTunes = (song: SongItem) => {
    const newItem: SetlistTuneItem = {
      id: generateId(song.id),
      songId: song.id,
      tuneId: song.id,
      title: song.title,
      artist: song.artist || "",
      keySignature: song.keySignature || "Bb",
      tempoBpm: song.tempoBpm || 120,
      notes: "",
      customNotes: "",
      driveLink: song.driveLink || "",
      transitionType: "standard_pause",
    };
    setNewTunes([...newTunes, newItem]);
  };

  // Remove tune from new tunes list
  const handleRemoveTune = (idx: number) => {
    setNewTunes(newTunes.filter((_, i) => i !== idx));
  };

  // Move tune up or down
  const handleMoveTune = (idx: number, direction: "up" | "down") => {
    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= newTunes.length) return;
    const updated = [...newTunes];
    const item = updated[idx];
    updated[idx] = updated[targetIdx];
    updated[targetIdx] = item;
    setNewTunes(updated);
  };

  // Update tune property
  const handleUpdateTune = (
    idx: number,
    prop: keyof SetlistTuneItem,
    val: SetlistTuneItem[keyof SetlistTuneItem]
  ) => {
    const updated = [...newTunes];
    updated[idx] = { ...updated[idx], [prop]: val };
    setNewTunes(updated);
  };

  // Save new setlist and assign to gig
  const handleSaveAndAssignNew = async () => {
    const targetTitle = newSetlistName.trim();
    if (!targetTitle) {
      alert("Please give this setlist a title.");
      return;
    }
    if (newTunes.length === 0) {
      alert("Please add at least one chart to the setlist.");
      return;
    }

    if (saveAsReusable && isDuplicateSetlistTitle(targetTitle, reusableSetlists)) {
      alert(`A setlist named "${targetTitle}" already exists in the reusable library. Please choose a unique title.`);
      return;
    }

    setSaving(true);
    try {
      let createdTemplateId = "";

      if (saveAsReusable) {
        // Create new reusable setlist in library
        createdTemplateId = generateId("setlist");
        const templateData: Setlist = {
          id: createdTemplateId,
          name: targetTitle,
          title: targetTitle,
          description: `Created for ${gigTitle}`,
          category: newCategory,
          tunes: newTunes,
          items: newTunes,
          targetDurationMinutes: newTargetDuration,
          tags: ["Gig Created"],
          assignedGigIds: [gig.id],
          usageCount: 1,
          lastUsedDate: gig.date || new Date().toISOString().split("T")[0],
          isTemplate: true,
          gigId: "",
          createdByUid: profile?.uid || "",
          createdByName: profile?.displayName || "Gig Manager",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await setDoc(doc(db, "setlists", createdTemplateId), templateData);
      }

      // Update gig document with persistent setlistId and title
      const title = newSetlistName.trim();
      await setDoc(
        doc(db, "gigs", gig.id),
        {
          setlistId: createdTemplateId || null,
          setlistName: title,
          setlistTitle: title,
          internalLogistics: {
            setlistId: createdTemplateId || null,
            setlistName: title,
            setlistTitle: title,
          },
          setlist: newTunes,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      // Update stage view document (/portal/perform/[gigId])
      await setDoc(
        doc(db, "setlists", gig.id),
        {
          gigId: gig.id,
          isTemplate: false,
          templateId: createdTemplateId || "",
          templateName: title,
          name: title,
          title,
          tunes: newTunes,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      // If previous setlist was from reusable library and different from current, unlink gig
      if (assignedId && assignedId !== createdTemplateId) {
        const prevSl = reusableSetlists.find((s) => s.id === assignedId);
        if (prevSl && Array.isArray(prevSl.assignedGigIds) && prevSl.assignedGigIds.includes(gig.id)) {
          const updatedPrev = prevSl.assignedGigIds.filter((id) => id !== gig.id);
          await setDoc(
            doc(db, "setlists", assignedId),
            {
              assignedGigIds: updatedPrev,
              updatedAt: new Date().toISOString(),
            },
            { merge: true }
          );
        }
      }

      setAssignedId(createdTemplateId || "");
      setAssignedName(targetTitle);

      if (onSaved) onSaved();
      onClose();
    } catch (err) {
      alert("Failed to save and assign setlist: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div 
        className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between gap-3 bg-slate-950/60">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 rounded-2xl bg-yellow-400/10 border border-yellow-400/20 text-yellow-400 shrink-0">
              <ListMusic className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-black text-white truncate">
                Manage Gig Setlist
              </h2>
              <p className="text-xs text-slate-400 truncate flex items-center gap-2">
                <span className="font-semibold text-slate-300">{gigTitle}</span>
                <span>•</span>
                <span className="font-mono text-yellow-400">{gig.date}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 px-5 pt-3 gap-6">
          <button
            type="button"
            onClick={() => setActiveTab("choose")}
            className={`pb-3 text-xs font-bold transition flex items-center gap-2 border-b-2 -mb-px cursor-pointer ${
              activeTab === "choose"
                ? "border-yellow-400 text-yellow-400"
                : "border-transparent text-slate-400 hover:text-white"
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Use Saved Setlist</span>
            <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
              {reusableSetlists.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("create")}
            className={`pb-3 text-xs font-bold transition flex items-center gap-2 border-b-2 -mb-px cursor-pointer ${
              activeTab === "create"
                ? "border-yellow-400 text-yellow-400"
                : "border-transparent text-slate-400 hover:text-white"
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>Build Unique Setlist</span>
          </button>
        </div>

        {/* Tab 1: Choose Existing Reusable Setlist */}
        {activeTab === "choose" && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 [scrollbar-width:thin]">
            {/* Active Assigned Setlist Banner */}
            {(assignedId || assignedName) && (
              <div className="bg-yellow-400/10 border border-yellow-400/30 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-yellow-400 text-slate-950 shrink-0">
                    <ListMusic className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono uppercase font-bold text-yellow-400 block tracking-wider">
                      Currently Assigned Setlist
                    </span>
                    <h3 className="text-sm font-bold text-white">
                      {assignedName ||
                        (assignedId &&
                          reusableSetlists.find((s) => s.id === assignedId)?.name) ||
                        "Unique Performance Setlist"}
                    </h3>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 rounded-xl">
                    ACTIVE
                  </span>
                  <button
                    type="button"
                    onClick={handleRemoveSetlist}
                    disabled={saving}
                    className="text-xs font-bold text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition cursor-pointer"
                    title="Remove this setlist and reset gig to an empty setlist"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Remove Setlist</span>
                  </button>
                </div>
              </div>
            )}

            {/* Search & Category Filter */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="text"
                  placeholder="Search available setlists by name, category, tag..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400 font-semibold"
                />
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                {["all", "parade", "festival", "stage", "party", "acoustic"].map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategoryFilter(cat)}
                    className={`text-[11px] px-2.5 py-1.5 rounded-xl font-bold uppercase font-mono tracking-wider transition border shrink-0 ${
                      categoryFilter === cat
                        ? "bg-yellow-400 text-slate-950 border-yellow-400"
                        : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center p-12 text-slate-400 gap-2 text-xs">
                <Loader2 className="w-4 h-4 animate-spin text-yellow-400" />
                Loading reusable setlist catalog...
              </div>
            ) : filteredSetlists.length === 0 ? (
              <div className="p-12 text-center border border-dashed border-slate-800 rounded-2xl space-y-3">
                <Music className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-xs text-slate-400">No reusable setlists match your search.</p>
                <button
                  type="button"
                  onClick={() => setActiveTab("create")}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-yellow-400 text-slate-950 text-xs font-bold hover:bg-yellow-300 transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create a New Setlist Now</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredSetlists.map((sl) => {
                  const tunes = sl.tunes || sl.items || [];
                  const isCurrent =
                    Boolean(assignedId && assignedId === sl.id) ||
                    Boolean(assignedName && (sl.name === assignedName || sl.title === assignedName));
                  const catMeta = CATEGORY_LABELS[sl.category] || { label: sl.category, color: "bg-slate-800 text-slate-300 border-slate-700" };

                  return (
                    <div
                      key={sl.id}
                      className={`border rounded-2xl p-4 space-y-3 transition flex flex-col justify-between ${
                        isCurrent
                          ? "bg-yellow-400/5 border-yellow-400/50 shadow-md"
                          : "bg-slate-950/70 border-slate-800 hover:border-slate-700"
                      }`}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className={`text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded border ${catMeta.color}`}>
                            {catMeta.label}
                          </span>
                          <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-400">
                            <Clock className="w-3 h-3 text-slate-500" />
                            <span>{sl.targetDurationMinutes || 45}m</span>
                            <span className="text-slate-600">•</span>
                            <span className="text-white font-bold">{tunes.length} charts</span>
                          </div>
                        </div>

                        <div className="flex items-start justify-between gap-2">
                          <h3 className="text-sm font-bold text-white leading-snug">
                            {sl.name || sl.title}
                          </h3>
                          {isCurrent && (
                            <span className="text-[10px] font-mono font-bold uppercase text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded shrink-0">
                              Active
                            </span>
                          )}
                        </div>

                        {/* Tune preview chips */}
                        <div className="flex flex-wrap gap-1 pt-1">
                          {tunes.slice(0, 4).map((t, idx) => (
                            <span
                              key={idx}
                              className="text-[10px] font-mono bg-slate-900 border border-slate-800 text-slate-300 px-2 py-0.5 rounded truncate max-w-[140px]"
                            >
                              {idx + 1}. {t.title}
                            </span>
                          ))}
                          {tunes.length > 4 && (
                            <span className="text-[10px] font-mono text-slate-500 px-1 py-0.5">
                              +{tunes.length - 4} more
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => handleCloneIntoCreateTab(sl)}
                          className="text-[11px] font-semibold text-slate-400 hover:text-white flex items-center gap-1 transition"
                          title="Copy these tunes to customize a new setlist for this gig"
                        >
                          <Copy className="w-3 h-3 text-yellow-400" />
                          <span>Customize Copy</span>
                        </button>

                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => handleAssignExistingSetlist(sl)}
                          className={`text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition ${
                            isCurrent
                              ? "bg-slate-800 text-slate-300 hover:bg-slate-700"
                              : "bg-yellow-400 text-slate-950 hover:bg-yellow-300 shadow-sm"
                          }`}
                        >
                          {saving ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Check className="w-3.5 h-3.5" />
                          )}
                          <span>{isCurrent ? "Re-apply Sequence" : "Assign to Gig"}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Build Unique Setlist for this Gig */}
        {activeTab === "create" && (
          <div className="flex-1 overflow-hidden flex flex-col p-4 sm:p-6 space-y-4">
            {/* Top status bar if gig already has a setlist or tunes */}
            {(assignedId || assignedName || newTunes.length > 0) && (
              <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-2.5 text-xs min-w-0">
                  <ListMusic className="w-4 h-4 text-yellow-400 shrink-0" />
                  <span className="text-slate-300 truncate">
                    {assignedName ? (
                      <>Currently assigned: <strong className="text-white font-bold">{assignedName}</strong></>
                    ) : (
                      <>Sequence draft: <strong className="text-white font-bold">{newTunes.length} charts</strong></>
                    )}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {(assignedId || assignedName) && (
                    <button
                      type="button"
                      onClick={handleRemoveSetlist}
                      disabled={saving}
                      className="text-xs font-semibold text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 px-2.5 py-1.5 rounded-xl flex items-center gap-1.5 transition cursor-pointer"
                      title="Clear this setlist and leave gig with an empty setlist"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove from Gig</span>
                    </button>
                  )}
                  {newTunes.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setNewTunes([]);
                        setNewSetlistName(`${gigTitle} Unique Setlist`);
                      }}
                      className="text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 px-2.5 py-1.5 rounded-xl transition cursor-pointer"
                      title="Clear sequence to start completely fresh"
                    >
                      Clear Charts (Start Fresh)
                    </button>
                  )}
                </div>
              </div>
            )}
            {/* Top configuration inputs */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 space-y-3 shrink-0">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-[11px] font-mono uppercase font-bold text-slate-400 block mb-1">
                    Setlist Name
                  </label>
                  <input
                    type="text"
                    value={newSetlistName}
                    onChange={(e) => setNewSetlistName(e.target.value)}
                    placeholder="e.g. Bloomfield Parade High-Energy Sequence"
                    className={`w-full bg-slate-900 border rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none font-semibold ${
                      isDuplicateCreateTitle
                        ? "border-rose-500 focus:border-rose-400"
                        : "border-slate-800 focus:border-yellow-400"
                    }`}
                  />
                  {isDuplicateCreateTitle && (
                    <p className="text-[11px] text-rose-400 font-semibold mt-1">
                      A reusable setlist with this title already exists in the library. Please enter a unique title.
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-[11px] font-mono uppercase font-bold text-slate-400 block mb-1">
                    Category
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as SetlistCategory)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400 font-semibold"
                  >
                    <option value="parade">Parade & Marching</option>
                    <option value="festival">Festival Stage</option>
                    <option value="street_revelry">Street Revelry</option>
                    <option value="party">Party / Beer Garden</option>
                    <option value="acoustic">Acoustic Porchfest</option>
                    <option value="concert">Concert Showcase</option>
                    <option value="custom">Custom Lineup</option>
                  </select>
                </div>
              </div>

              {/* Save as Reusable Checkbox */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <BookmarkPlus className="w-4 h-4 text-yellow-400 shrink-0" />
                  <div>
                    <span className="text-xs font-bold text-white block">
                      Save as Reusable Setlist for Future Gigs
                    </span>
                    <span className="text-[11px] text-slate-400 block">
                      Stores this setlist in the band&apos;s reusable library, tracks reuse stats, and makes it available to other gigs.
                    </span>
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={saveAsReusable}
                    onChange={(e) => setSaveAsReusable(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-yellow-400"></div>
                </label>
              </div>
            </div>

            {/* Split layout: Sequence Builder (Left) vs Catalog Picker (Right) */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 overflow-hidden min-h-[300px]">
              {/* Sequence Builder (7 cols) */}
              <div className="lg:col-span-7 flex flex-col bg-slate-950/50 border border-slate-800 rounded-2xl p-3 overflow-hidden">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800/80 mb-2">
                  <span className="text-xs font-bold text-white flex items-center gap-2">
                    <ListMusic className="w-4 h-4 text-yellow-400" />
                    <span>Sequence Run Order ({newTunes.length} charts)</span>
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    Use arrows to reorder
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto space-y-2 pr-1 [scrollbar-width:thin]">
                  {newTunes.length === 0 ? (
                    <div className="p-8 text-center border border-dashed border-slate-800 rounded-xl text-xs text-slate-400">
                      No charts added yet. Search and click &quot;+ Add&quot; from the catalog on the right.
                    </div>
                  ) : (
                    newTunes.map((tune, idx) => (
                      <div
                        key={tune.id || idx}
                        className="bg-slate-900 border border-slate-800 rounded-xl p-3 space-y-2 hover:border-slate-700 transition"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-mono text-xs font-black text-yellow-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                              #{idx + 1}
                            </span>
                            <div className="truncate">
                              <span className="text-xs font-bold text-white truncate block">
                                {tune.title}
                              </span>
                              {tune.artist && (
                                <span className="text-[10px] text-slate-400 truncate block">
                                  {tune.artist}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => handleMoveTune(idx, "up")}
                              className="p-1 rounded text-slate-400 hover:text-white disabled:opacity-20 transition"
                              title="Move up"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={idx === newTunes.length - 1}
                              onClick={() => handleMoveTune(idx, "down")}
                              className="p-1 rounded text-slate-400 hover:text-white disabled:opacity-20 transition"
                              title="Move down"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveTune(idx)}
                              className="p-1 rounded text-slate-500 hover:text-rose-400 transition ml-1"
                              title="Remove chart"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Tune Options: Key, Tempo, Segue, Note */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 border-t border-slate-800/60 text-xs">
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-slate-500 uppercase font-mono">Key:</span>
                            <input
                              type="text"
                              value={tune.keySignature || ""}
                              onChange={(e) => handleUpdateTune(idx, "keySignature", e.target.value)}
                              placeholder="Bb"
                              className="bg-slate-950 border border-slate-800 rounded px-1.5 py-0.5 text-[11px] text-white w-14 text-center font-mono focus:outline-none focus:border-yellow-400"
                            />
                          </div>

                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-slate-500 uppercase font-mono">BPM:</span>
                            <input
                              type="number"
                              value={tune.tempoBpm || 120}
                              onChange={(e) => handleUpdateTune(idx, "tempoBpm", parseInt(e.target.value, 10) || 120)}
                              className="bg-slate-950 border border-slate-800 rounded px-1.5 py-0.5 text-[11px] text-white w-16 text-center font-mono focus:outline-none focus:border-yellow-400"
                            />
                          </div>

                          <div>
                            <input
                              type="text"
                              value={tune.notes || ""}
                              onChange={(e) => handleUpdateTune(idx, "notes", e.target.value)}
                              placeholder="Notes: e.g. Solo feature..."
                              className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-0.5 text-[11px] text-slate-200 placeholder-slate-600 focus:outline-none focus:border-yellow-400"
                            />
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Repertoire Catalog Picker (5 cols) */}
              <div className="lg:col-span-5 flex flex-col bg-slate-950/50 border border-slate-800 rounded-2xl p-3 overflow-hidden">
                <div className="pb-2 border-b border-slate-800/80 mb-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
                    <input
                      type="text"
                      placeholder="Search repertoire catalog..."
                      value={catalogSearch}
                      onChange={(e) => setCatalogSearch(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400 font-semibold"
                    />
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 [scrollbar-width:thin]">
                  {filteredCatalog.map((song) => (
                    <div
                      key={song.id}
                      className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl p-2.5 flex items-center justify-between gap-2 transition"
                    >
                      <div className="truncate">
                        <span className="text-xs font-bold text-white block truncate">
                          {song.title}
                        </span>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                          <span>{song.keySignature || "Bb"}</span>
                          <span>•</span>
                          <span>{song.tempoBpm || 120} BPM</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleAddSongToNewTunes(song)}
                        className="bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold px-2 py-1 rounded-lg text-xs flex items-center gap-1 transition shrink-0"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom Save & Assign Button */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-800 shrink-0">
              <span className="text-xs text-slate-400 font-mono">
                {newTunes.length} charts ready for assignment
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={saving || newTunes.length === 0 || !newSetlistName.trim() || isDuplicateCreateTitle}
                  onClick={handleSaveAndAssignNew}
                  className="bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition shadow-sm disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  <span>Save & Assign to Gig</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function GigSetlistAssignmentModal({
  gig,
  isOpen,
  onClose,
  onSaved,
}: Props) {
  if (!isOpen) return null;
  return (
    <GigSetlistAssignmentModalInner
      key={gig.id}
      gig={gig}
      onClose={onClose}
      onSaved={onSaved}
    />
  );
}

