"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { 
  collection, 
  onSnapshot, 
  setDoc, 
  deleteDoc,
  doc, 
  updateDoc 
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/lib/context/AuthContext";
import { canManageSetlists } from "@/lib/auth/permissions";
import { User } from "@/lib/schema/user";
import { 
  Setlist, 
  SetlistSchema, 
  SetlistCategory, 
  SetlistTuneItem,
  isReusableSetlistTemplate,
  isDuplicateSetlistTitle
} from "@/lib/schema/setlist";
import { 
  Music, 
  Plus, 
  Trash2, 
  ArrowUp, 
  ArrowDown, 
  Save, 
  ExternalLink, 
  Calendar, 
  PlaySquare, 
  Loader2, 
  ShieldAlert,
  Search,
  Check,
  Flame,
  Copy,
  FolderPlus,
  Send,
  Layers,
  Clock,
  CheckCircle2,
  X,
  SlidersHorizontal
} from "lucide-react";

interface SongItem {
  id: string;
  title: string;
  artist?: string;
  keySignature?: string;
  tempoBpm?: number;
  driveLink?: string;
  status?: string;
}

interface GigSummary {
  id: string;
  title: string;
  date: string;
  status?: string;
  venue?: string;
  setlistId?: string;
}

const CATEGORY_LABELS: Record<SetlistCategory, { label: string; color: string }> = {
  parade: { label: "Parade & Marching", color: "bg-amber-500/20 text-amber-300 border-amber-500/30" },
  festival: { label: "Festival Stage", color: "bg-sky-500/20 text-sky-300 border-sky-500/30" },
  street_revelry: { label: "Street Revelry", color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" },
  ceremony: { label: "Ceremonial / Fanfare", color: "bg-purple-500/20 text-purple-300 border-purple-500/30" },
  concert: { label: "Concert Showcase", color: "bg-rose-500/20 text-rose-300 border-rose-500/30" },
  custom: { label: "Custom Lineup", color: "bg-slate-500/20 text-slate-300 border-slate-500/30" },
};

function generateUniqueId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

export default function SetlistStudioPage() {
  const { profile, loading: authLoading } = useAuth();
  const [gigs, setGigs] = useState<GigSummary[]>([]);
  const [catalog, setCatalog] = useState<SongItem[]>([]);
  const [savedSetlists, setSavedSetlists] = useState<Setlist[]>([]);
  const [activeTab, setActiveTab] = useState<"library" | "gigs">("library");

  // Selection & Active Gig State
  const [selectedGigId, setSelectedGigId] = useState<string>("");
  const [gigSetlistTunes, setGigSetlistTunes] = useState<SetlistTuneItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Search & Filter
  const [searchLibraryQuery, setSearchLibraryQuery] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("all");
  const [searchCatalogQuery, setSearchCatalogQuery] = useState("");

  // Editor Modal State for Reusable Setlists
  const [editingSetlist, setEditingSetlist] = useState<Partial<Setlist> | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  // Assign to Gig Modal State
  const [assigningSetlist, setAssigningSetlist] = useState<Setlist | null>(null);
  const [targetGigIdToAssign, setTargetGigIdToAssign] = useState<string>("");
  const [isAssigning, setIsAssigning] = useState(false);

  const editingTitle = editingSetlist?.name?.trim() || "";
  const editingId = editingSetlist?.id;
  const isDuplicateEditorTitle = useMemo(() => {
    if (!editingTitle) return false;
    return isDuplicateSetlistTitle(editingTitle, savedSetlists, editingId);
  }, [editingTitle, savedSetlists, editingId]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // 1. Fetch available gigs
  useEffect(() => {
    if (authLoading) return;

    const unsubGigs = onSnapshot(
      collection(db, "gigs"),
      (snap) => {
        const gList: GigSummary[] = [];
        snap.forEach((d) => {
          const data = d.data();
          const title = data.internalLogistics?.title || data.publicDetails?.title || data.title || `Gig ${d.id.slice(0, 6)}`;
          const venue = data.publicDetails?.venue || data.venue || "";
          const setlistId = data.internalLogistics?.setlistId || data.setlistId || "";
          gList.push({
            id: d.id,
            title,
            date: data.date || "TBD",
            status: data.status || "confirmed",
            venue,
            setlistId,
          });
        });
        gList.sort((a, b) => b.date.localeCompare(a.date));
        setGigs(gList);
        if (gList.length > 0 && !selectedGigId) {
          setSelectedGigId(gList[0].id);
        }
      },
      (err) => console.error("Error loading gigs:", err)
    );

    // 2. Fetch song catalog
    const unsubSongs = onSnapshot(
      collection(db, "songs"),
      (snap) => {
        const sList: SongItem[] = [];
        snap.forEach((d) => {
          const data = d.data();
          sList.push({
            id: d.id,
            title: data.title || "Untitled",
            artist: data.artist || "",
            keySignature: data.keySignature || data.key || "Bb",
            tempoBpm: typeof data.tempoBpm === "number" ? data.tempoBpm : 120,
            driveLink: data.driveLink || "",
            status: data.status || "",
          });
        });
        sList.sort((a, b) => a.title.localeCompare(b.title));
        setCatalog(sList);
      },
      (err) => console.error("Error loading songs:", err)
    );

    // 3. Fetch saved reusable setlists
    const unsubSetlists = onSnapshot(
      collection(db, "setlists"),
      (snap) => {
        const list: Setlist[] = [];
        const seenIds = new Set<string>();
        snap.forEach((d) => {
          const data = d.data();
          // Filter out gig-specific direct snapshots if they are not reusable templates
          if (isReusableSetlistTemplate(d.id, data) && !seenIds.has(d.id)) {
            seenIds.add(d.id);
            const parsed = SetlistSchema.safeParse({ id: d.id, ...data });
            if (parsed.success) {
              list.push(parsed.data);
            } else {
              // Safe fallback
              list.push({
                id: d.id,
                name: data.name || data.title || "Untitled Setlist",
                title: data.title || data.name || "",
                description: data.description || "",
                category: data.category || "parade",
                tunes: Array.isArray(data.tunes) ? data.tunes : Array.isArray(data.items) ? data.items : [],
                items: Array.isArray(data.items) ? data.items : Array.isArray(data.tunes) ? data.tunes : [],
                targetDurationMinutes: data.targetDurationMinutes || 45,
                tags: Array.isArray(data.tags) ? data.tags : [],
                assignedGigIds: Array.isArray(data.assignedGigIds) ? data.assignedGigIds : [],
                usageCount: typeof data.usageCount === "number" ? data.usageCount : 0,
                lastUsedDate: data.lastUsedDate || null,
                isTemplate: true,
                templateId: "",
                templateName: "",
                gigId: "",
                createdByUid: data.createdByUid || "",
                createdByName: data.createdByName || "",
                createdAt: data.createdAt || new Date().toISOString(),
                updatedAt: data.updatedAt || new Date().toISOString(),
              });
            }
          }
        });
        list.sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0) || a.name.localeCompare(b.name));
        setSavedSetlists(list);
        setLoading(false);
      },
      (err) => {
        console.error("Error loading setlists:", err);
        setLoading(false);
      }
    );

    return () => {
      unsubGigs();
      unsubSongs();
      unsubSetlists();
    };
  }, [authLoading, selectedGigId]);

  // 4. Listen to existing setlist for the selected gig
  useEffect(() => {
    if (!selectedGigId) return;

    const unsubSetlist = onSnapshot(
      doc(db, "setlists", selectedGigId),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          const rawTunes = Array.isArray(data.tunes) ? data.tunes : Array.isArray(data.items) ? data.items : [];
          setGigSetlistTunes(rawTunes);
        } else {
          setGigSetlistTunes([]);
        }
      },
      (err) => console.warn("Notice: gig setlist snapshot note:", err)
    );

    return () => unsubSetlist();
  }, [selectedGigId]);

  const userProfile = profile as unknown as User;
  const hasAccess = Boolean(userProfile && canManageSetlists(userProfile));

  // Metrics for saved setlists
  const metrics = useMemo(() => {
    const totalSetlists = savedSetlists.length;
    const totalDeployments = savedSetlists.reduce((acc, s) => acc + (s.usageCount || s.assignedGigIds?.length || 0), 0);
    const mostReused = savedSetlists.length > 0 ? savedSetlists[0] : null;
    const totalUniqueTunesInSets = new Set(
      savedSetlists.flatMap((s) => (s.tunes || []).map((t) => t.songId || t.title))
    ).size;

    return {
      totalSetlists,
      totalDeployments,
      mostReusedTitle: mostReused?.name || "None Yet",
      mostReusedCount: mostReused?.usageCount || 0,
      totalUniqueTunesInSets,
    };
  }, [savedSetlists]);

  // Filtered reusable setlists
  const filteredSetlists = useMemo(() => {
    return savedSetlists.filter((s) => {
      const matchesSearch = 
        s.name.toLowerCase().includes(searchLibraryQuery.toLowerCase()) ||
        s.description.toLowerCase().includes(searchLibraryQuery.toLowerCase()) ||
        (s.tags || []).some((t) => t.toLowerCase().includes(searchLibraryQuery.toLowerCase())) ||
        (s.tunes || []).some((t) => t.title.toLowerCase().includes(searchLibraryQuery.toLowerCase()));

      const matchesCategory = selectedCategoryFilter === "all" || s.category === selectedCategoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [savedSetlists, searchLibraryQuery, selectedCategoryFilter]);

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-400 gap-2 text-xs">
        <Loader2 className="w-4 h-4 animate-spin text-yellow-400" />
        Loading Setlist Studio & Reusable Library...
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="p-8 text-rose-400 text-xs font-semibold flex items-center gap-2">
        <ShieldAlert className="w-4 h-4" />
        Setlist Manager, Music Librarian, or Gig Manager privileges required to curate setlists.
      </div>
    );
  }

  // Handle open editor to create new reusable setlist
  const handleOpenCreateSetlist = () => {
    setEditingSetlist({
      id: generateUniqueId("setlist"),
      name: "New Setlist",
      description: "",
      category: "parade",
      targetDurationMinutes: 45,
      tags: [],
      tunes: [],
      isTemplate: true,
      usageCount: 0,
      assignedGigIds: [],
    });
    setSearchCatalogQuery("");
    setIsEditorOpen(true);
  };

  // Handle open editor for existing setlist
  const handleOpenEditSetlist = (setlist: Setlist) => {
    setEditingSetlist({ ...setlist });
    setSearchCatalogQuery("");
    setIsEditorOpen(true);
  };

  // Handle duplicate setlist
  const handleDuplicateSetlist = async (setlist: Setlist) => {
    try {
      const baseName = (setlist.name || setlist.title || "Setlist").trim();
      let copyName = `${baseName} (Copy)`;
      let counter = 2;
      while (isDuplicateSetlistTitle(copyName, savedSetlists)) {
        copyName = `${baseName} (Copy ${counter})`;
        counter++;
      }
      const newId = generateUniqueId("setlist");
      const duplicateData: Setlist = {
        ...setlist,
        id: newId,
        name: copyName,
        title: copyName,
        assignedGigIds: [],
        usageCount: 0,
        lastUsedDate: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await setDoc(doc(db, "setlists", newId), duplicateData);
      showToast(`Duplicated "${copyName}" to library!`);
    } catch (err) {
      alert("Failed to duplicate: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  // Handle delete setlist
  const handleDeleteSetlist = async (setlistId: string, name: string) => {
    if (!confirm(`Are you sure you want to delete the setlist "${name}" from the reusable library?`)) {
      return;
    }
    try {
      await deleteDoc(doc(db, "setlists", setlistId));
      showToast(`Deleted "${name}"`);
    } catch (err) {
      alert("Failed to delete setlist: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  // Handle save from within Setlist Editor modal
  const handleSaveEditor = async () => {
    if (!editingSetlist?.name?.trim()) {
      alert("Please provide a setlist name.");
      return;
    }

    const trimmedTitle = editingSetlist.name.trim();
    if (isDuplicateSetlistTitle(trimmedTitle, savedSetlists, editingSetlist.id)) {
      alert(`A setlist named "${trimmedTitle}" already exists in the reusable library. Please choose a unique title.`);
      return;
    }

    setSaving(true);
    try {
      const setlistId = editingSetlist.id || generateUniqueId("setlist");
      const payload: Partial<Setlist> = {
        ...editingSetlist,
        id: setlistId,
        name: trimmedTitle,
        title: trimmedTitle,
        isTemplate: true,
        createdByUid: editingSetlist.createdByUid || profile?.uid || "",
        createdByName: editingSetlist.createdByName || profile?.displayName || "Setlist Manager",
        updatedAt: new Date().toISOString(),
      };

      await setDoc(doc(db, "setlists", setlistId), payload, { merge: true });
      setIsEditorOpen(false);
      setEditingSetlist(null);
      showToast(`Saved setlist "${payload.name}" to library!`);
    } catch (err) {
      alert("Failed to save setlist: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setSaving(false);
    }
  };

  // Add tune into active editor
  const handleAddTuneToEditor = (song: SongItem) => {
    if (!editingSetlist) return;
    const currentTunes = editingSetlist.tunes || [];
    const newTune: SetlistTuneItem = {
      id: generateUniqueId(song.id),
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
    setEditingSetlist({
      ...editingSetlist,
      tunes: [...currentTunes, newTune],
    });
  };

  // Remove tune from editor
  const handleRemoveTuneFromEditor = (tuneIdx: number) => {
    if (!editingSetlist?.tunes) return;
    const updated = editingSetlist.tunes.filter((_, idx) => idx !== tuneIdx);
    setEditingSetlist({ ...editingSetlist, tunes: updated });
  };

  // Reorder tune in editor
  const handleMoveTuneInEditor = (index: number, direction: "up" | "down") => {
    if (!editingSetlist?.tunes) return;
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= editingSetlist.tunes.length) return;

    const updated = [...editingSetlist.tunes];
    const item = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = item;
    setEditingSetlist({ ...editingSetlist, tunes: updated });
  };

  // Update note/transition in editor
  const handleUpdateTuneProp = (idx: number, prop: keyof SetlistTuneItem, value: SetlistTuneItem[keyof SetlistTuneItem]) => {
    if (!editingSetlist?.tunes) return;
    const updated = [...editingSetlist.tunes];
    updated[idx] = { ...updated[idx], [prop]: value };
    setEditingSetlist({ ...editingSetlist, tunes: updated });
  };

  // Open Assign to Gig Modal
  const handleOpenAssignModal = (setlist: Setlist) => {
    setAssigningSetlist(setlist);
    setTargetGigIdToAssign(gigs[0]?.id || "");
  };

  // Execute Assign to Gig
  const handleConfirmAssignToGig = async () => {
    if (!assigningSetlist || !targetGigIdToAssign) return;
    setIsAssigning(true);
    try {
      const targetGig = gigs.find((g) => g.id === targetGigIdToAssign);
      const gigTitle = targetGig?.title || `Gig ${targetGigIdToAssign.slice(0, 6)}`;

      // 1. Update the gig document with setlist reference and snapshot
      await updateDoc(doc(db, "gigs", targetGigIdToAssign), {
        "internalLogistics.setlistId": assigningSetlist.id,
        setlistId: assigningSetlist.id,
        setlist: assigningSetlist.tunes,
        updatedAt: new Date().toISOString(),
      });

      // 2. Update gig setlist document for stage view
      await setDoc(doc(db, "setlists", targetGigIdToAssign), {
        gigId: targetGigIdToAssign,
        isTemplate: false,
        templateId: assigningSetlist.id,
        templateName: assigningSetlist.name,
        name: assigningSetlist.name,
        title: assigningSetlist.name,
        tunes: assigningSetlist.tunes,
        updatedAt: new Date().toISOString(),
      }, { merge: true });

      // 3. Update the reusable setlist document usage statistics
      const currentAssigned = assigningSetlist.assignedGigIds || [];
      const updatedAssigned = currentAssigned.includes(targetGigIdToAssign)
        ? currentAssigned
        : [...currentAssigned, targetGigIdToAssign];
      const newUsageCount = (assigningSetlist.usageCount || 0) + 1;

      await updateDoc(doc(db, "setlists", assigningSetlist.id), {
        assignedGigIds: updatedAssigned,
        usageCount: newUsageCount,
        lastUsedDate: targetGig?.date || new Date().toISOString().split("T")[0],
        updatedAt: new Date().toISOString(),
      });

      showToast(`Assigned "${assigningSetlist.name}" to "${gigTitle}"!`);
      setAssigningSetlist(null);
    } catch (err) {
      alert("Failed to assign setlist: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsAssigning(false);
    }
  };

  // Load a reusable setlist into the active Gig Setlist tab
  const handleLoadTemplateIntoGig = (templateId: string) => {
    const selectedTemplate = savedSetlists.find((s) => s.id === templateId);
    if (!selectedTemplate) return;
    if (gigSetlistTunes.length > 0 && !confirm(`Replace current gig sequence with "${selectedTemplate.name}"?`)) {
      return;
    }
    setGigSetlistTunes([...selectedTemplate.tunes]);
    showToast(`Loaded "${selectedTemplate.name}" into current gig! Remember to save.`);
  };

  // Save current gig sequence as a new Reusable Setlist
  const handleSaveGigAsReusableSetlist = async () => {
    if (gigSetlistTunes.length === 0) {
      alert("Add at least one tune to save as a reusable setlist.");
      return;
    }
    const selectedGig = gigs.find((g) => g.id === selectedGigId);
    const suggestedName = selectedGig ? `${selectedGig.title} Sequence` : "New Reusable Setlist";
    const name = prompt("Enter a name for this reusable setlist:", suggestedName);
    if (!name?.trim()) return;

    const trimmedName = name.trim();
    if (isDuplicateSetlistTitle(trimmedName, savedSetlists)) {
      alert(`A setlist named "${trimmedName}" already exists in the reusable library. Please choose a unique title.`);
      return;
    }

    setSaving(true);
    try {
      const newId = generateUniqueId("setlist");
      const newSetlist: Setlist = {
        id: newId,
        name: trimmedName,
        title: trimmedName,
        description: `Curated for ${selectedGig?.title || "Band performance"}`,
        category: "parade",
        tunes: gigSetlistTunes,
        items: gigSetlistTunes,
        targetDurationMinutes: 45,
        tags: ["Gig Sequence"],
        assignedGigIds: selectedGigId ? [selectedGigId] : [],
        usageCount: selectedGigId ? 1 : 0,
        lastUsedDate: selectedGig?.date || null,
        isTemplate: true,
        gigId: "",
        createdByUid: profile?.uid || "",
        createdByName: profile?.displayName || "Setlist Manager",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await setDoc(doc(db, "setlists", newId), newSetlist);
      showToast(`Saved "${name}" into the Reusable Setlist Library!`);
    } catch (err) {
      alert("Failed to save setlist: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setSaving(false);
    }
  };

  // Save Gig Setlist directly to Firestore
  const handleSaveGigSetlist = async () => {
    if (!selectedGigId) return;
    setSaving(true);
    try {
      await setDoc(
        doc(db, "setlists", selectedGigId),
        {
          gigId: selectedGigId,
          isTemplate: false,
          tunes: gigSetlistTunes,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      await updateDoc(doc(db, "gigs", selectedGigId), {
        setlist: gigSetlistTunes,
        updatedAt: new Date().toISOString(),
      });

      setSavedSuccess(true);
      showToast("Saved setlist directly to gig call sheet and stage view!");
      setTimeout(() => setSavedSuccess(false), 2500);
    } catch (err) {
      alert("Failed to save gig setlist: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setSaving(false);
    }
  };

  const selectedGig = gigs.find((g) => g.id === selectedGigId);

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-500 text-slate-950 font-bold px-4 py-2.5 rounded-2xl shadow-2xl flex items-center gap-2 border border-emerald-400 animate-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="w-4 h-4" />
          <span className="text-xs">{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div 
        style={{ backgroundColor: "var(--ebb-surface)", borderColor: "var(--ebb-border)" }}
        className="border rounded-3xl p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-xl"
      >
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span 
              style={{ backgroundColor: "var(--ebb-primary)", color: "#0f172a" }}
              className="text-xs font-mono font-black uppercase tracking-wider px-2.5 py-0.5 rounded shadow-sm"
            >
              Setlist Manager Studio
            </span>
            <span className="text-xs font-mono text-slate-400">
              Reusable Repertoire Sequencing
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Setlist Studio & Library</h1>
          <p className="text-xs text-slate-400">
            Curate reusable performance setlists, select charts from the catalog, assign sequences across gigs, and monitor setlist circulation.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleOpenCreateSetlist}
            style={{ backgroundColor: "var(--ebb-primary)", color: "#0f172a" }}
            className="font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition shadow hover:brightness-110 cursor-pointer"
          >
            <FolderPlus className="w-4 h-4" />
            <span>Create Reusable Setlist</span>
          </button>
        </div>
      </div>

      {/* 4-KPI Analytics Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div 
          style={{ backgroundColor: "var(--ebb-surface)", borderColor: "var(--ebb-border)" }}
          className="border rounded-2xl p-4 shadow-md flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-400/10 text-amber-400 border border-amber-400/20 flex items-center justify-center shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium">Reusable Setlists</div>
            <div className="text-xl font-black text-white">{metrics.totalSetlists}</div>
          </div>
        </div>

        <div 
          style={{ backgroundColor: "var(--ebb-surface)", borderColor: "var(--ebb-border)" }}
          className="border rounded-2xl p-4 shadow-md flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-400/10 text-emerald-400 border border-emerald-400/20 flex items-center justify-center shrink-0">
            <Send className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium">Gig Deployments</div>
            <div className="text-xl font-black text-emerald-400">{metrics.totalDeployments}</div>
          </div>
        </div>

        <div 
          style={{ backgroundColor: "var(--ebb-surface)", borderColor: "var(--ebb-border)" }}
          className="border rounded-2xl p-4 shadow-md flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-xl bg-purple-400/10 text-purple-400 border border-purple-400/20 flex items-center justify-center shrink-0">
            <Flame className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-xs text-slate-400 font-medium">Top Reused Setlist</div>
            <div className="text-sm font-black text-white truncate" title={metrics.mostReusedTitle}>
              {metrics.mostReusedTitle}
            </div>
            <div className="text-[10px] text-purple-400 font-mono">
              Used {metrics.mostReusedCount} time{metrics.mostReusedCount === 1 ? "" : "s"}
            </div>
          </div>
        </div>

        <div 
          style={{ backgroundColor: "var(--ebb-surface)", borderColor: "var(--ebb-border)" }}
          className="border rounded-2xl p-4 shadow-md flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-xl bg-sky-400/10 text-sky-400 border border-sky-400/20 flex items-center justify-center shrink-0">
            <Music className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium">Charts in Circulation</div>
            <div className="text-xl font-black text-sky-400">{metrics.totalUniqueTunesInSets}</div>
          </div>
        </div>
      </div>

      {/* Main View Switcher Tabs */}
      <div 
        style={{ borderColor: "var(--ebb-border)" }}
        className="flex items-center gap-2 border-b pb-2"
      >
        <button
          type="button"
          onClick={() => setActiveTab("library")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeTab === "library"
              ? "bg-yellow-400 text-slate-950 shadow-sm"
              : "text-slate-400 hover:text-white hover:bg-slate-800/40"
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Reusable Setlist Library ({savedSetlists.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("gigs")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeTab === "gigs"
              ? "bg-yellow-400 text-slate-950 shadow-sm"
              : "text-slate-400 hover:text-white hover:bg-slate-800/40"
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Gig-Specific Sequences ({gigs.length})</span>
        </button>
      </div>

      {/* =========================================================================
          TAB 1: REUSABLE SETLIST LIBRARY
          ========================================================================= */}
      {activeTab === "library" && (
        <div className="space-y-4">
          {/* Controls & Filter Bar */}
          <div 
            style={{ backgroundColor: "var(--ebb-surface)", borderColor: "var(--ebb-border)" }}
            className="border rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-3 shadow-md"
          >
            {/* Search */}
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search setlists, tunes, or tags..."
                value={searchLibraryQuery}
                onChange={(e) => setSearchLibraryQuery(e.target.value)}
                style={{ backgroundColor: "var(--ebb-surface-muted)", borderColor: "var(--ebb-border)" }}
                className="w-full border rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400 font-medium"
              />
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 flex-wrap w-full md:w-auto">
              <button
                type="button"
                onClick={() => setSelectedCategoryFilter("all")}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                  selectedCategoryFilter === "all"
                    ? "bg-yellow-400 text-slate-950"
                    : "text-slate-400 hover:text-white bg-slate-800/50"
                }`}
              >
                All Categories
              </button>
              {(Object.keys(CATEGORY_LABELS) as SetlistCategory[]).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategoryFilter(cat)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                    selectedCategoryFilter === cat
                      ? "bg-yellow-400 text-slate-950"
                      : "text-slate-400 hover:text-white bg-slate-800/50"
                  }`}
                >
                  {CATEGORY_LABELS[cat].label}
                </button>
              ))}
            </div>
          </div>

          {/* Setlist Cards Grid */}
          {filteredSetlists.length === 0 ? (
            <div 
              style={{ backgroundColor: "var(--ebb-surface)", borderColor: "var(--ebb-border)" }}
              className="border rounded-3xl p-12 text-center space-y-3"
            >
              <Music className="w-10 h-10 text-slate-500 mx-auto" />
              <h3 className="text-base font-bold text-white">No reusable setlists found</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                No setlists match your search or filter. Create a new reusable setlist or clear your search parameters.
              </p>
              <button
                type="button"
                onClick={handleOpenCreateSetlist}
                className="bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs transition inline-flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Create First Setlist
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredSetlists.map((setlist) => {
                const tunes = setlist.tunes || [];
                const catMeta = CATEGORY_LABELS[setlist.category] || CATEGORY_LABELS.parade;
                const isFrequent = (setlist.usageCount || 0) >= 2;

                return (
                  <div
                    key={setlist.id}
                    style={{ backgroundColor: "var(--ebb-surface)", borderColor: "var(--ebb-border)" }}
                    className="border rounded-2xl p-5 shadow-lg flex flex-col justify-between space-y-4 hover:border-slate-600 transition"
                  >
                    <div className="space-y-3">
                      {/* Top Badges & Title */}
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${catMeta.color}`}>
                              {catMeta.label}
                            </span>
                            {isFrequent && (
                              <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                                <Flame className="w-3 h-3 text-amber-400" />
                                Reused {setlist.usageCount}x
                              </span>
                            )}
                            <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              ~{setlist.targetDurationMinutes || 45} min
                            </span>
                          </div>
                          <h3 className="text-lg font-bold text-white leading-tight">
                            {setlist.name}
                          </h3>
                        </div>

                        {/* Usage Pill */}
                        <div className="text-right shrink-0">
                          <span className="text-xs font-mono font-bold text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 px-2.5 py-1 rounded-lg">
                            {tunes.length} Chart{tunes.length === 1 ? "" : "s"}
                          </span>
                        </div>
                      </div>

                      {setlist.description && (
                        <p className="text-xs text-slate-400 line-clamp-2">
                          {setlist.description}
                        </p>
                      )}

                      {/* Tune Sequence Chips Preview */}
                      <div className="space-y-1.5">
                        <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider font-semibold">
                          Tune Lineup:
                        </div>
                        <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                          {tunes.map((t, idx) => (
                            <span
                              key={t.id || idx}
                              style={{ backgroundColor: "var(--ebb-surface-muted)", borderColor: "var(--ebb-border)" }}
                              className="text-[11px] px-2 py-0.5 rounded-md border text-slate-200 flex items-center gap-1 font-medium"
                            >
                              <span className="text-[9px] text-yellow-400 font-mono">{idx + 1}.</span>
                              <span className="truncate max-w-[130px]">{t.title}</span>
                              {t.keySignature && (
                                <span className="text-[9px] text-slate-400 font-mono">({t.keySignature})</span>
                              )}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Assigned Gigs History */}
                      {setlist.assignedGigIds && setlist.assignedGigIds.length > 0 && (
                        <div className="pt-2 border-t border-slate-800/60 text-[11px]">
                          <span className="text-slate-400 font-medium">Assigned to: </span>
                          <span className="text-slate-300 font-mono">
                            {setlist.assignedGigIds.map((id) => {
                              const g = gigs.find((gig) => gig.id === id);
                              return g?.title || id;
                            }).slice(0, 3).join(", ")}
                            {setlist.assignedGigIds.length > 3 && ` +${setlist.assignedGigIds.length - 3} more`}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Action Bar */}
                    <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenAssignModal(setlist)}
                          className="bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1 transition shadow cursor-pointer"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Assign to Gig</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenEditSetlist(setlist)}
                          className="bg-slate-800 hover:bg-slate-700 text-white font-semibold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1 transition border border-slate-700 cursor-pointer"
                        >
                          <SlidersHorizontal className="w-3.5 h-3.5 text-yellow-400" />
                          <span>Edit</span>
                        </button>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleDuplicateSetlist(setlist)}
                          title="Duplicate this setlist"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-700 transition cursor-pointer"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteSetlist(setlist.id, setlist.name)}
                          title="Delete setlist"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 bg-slate-800/60 hover:bg-slate-700 transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          TAB 2: GIG-SPECIFIC SEQUENCES & ACTIVE CALL SHEET DISPATCH
          ========================================================================= */}
      {activeTab === "gigs" && (
        <div className="space-y-4">
          {/* Gig Selector Toolbar */}
          <div 
            style={{ backgroundColor: "var(--ebb-surface)", borderColor: "var(--ebb-border)" }}
            className="border rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-md"
          >
            <div className="flex items-center gap-3 w-full md:w-auto">
              <label htmlFor="gig-selector" className="text-xs font-bold text-slate-300 uppercase tracking-wider shrink-0">
                Active Gig:
              </label>
              <select
                id="gig-selector"
                value={selectedGigId}
                onChange={(e) => setSelectedGigId(e.target.value)}
                style={{ backgroundColor: "var(--ebb-surface-muted)", borderColor: "var(--ebb-border)" }}
                className="w-full md:w-80 border rounded-xl px-3 py-1.5 text-xs text-white font-semibold focus:outline-none focus:border-yellow-400"
              >
                {gigs.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.date} — {g.title} {g.venue ? `(${g.venue})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 flex-wrap w-full md:w-auto justify-end">
              {/* Template quick loader */}
              <div className="flex items-center gap-1.5">
                <select
                  id="template-quick-loader"
                  onChange={(e) => {
                    if (e.target.value) {
                      handleLoadTemplateIntoGig(e.target.value);
                      e.target.value = "";
                    }
                  }}
                  defaultValue=""
                  style={{ backgroundColor: "var(--ebb-surface-muted)", borderColor: "var(--ebb-border)" }}
                  className="border rounded-xl px-3 py-1.5 text-xs text-yellow-400 font-semibold focus:outline-none cursor-pointer"
                >
                  <option value="" disabled>Load from Reusable Setlist...</option>
                  {savedSetlists.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.tunes?.length || 0} charts)
                    </option>
                  ))}
                </select>
              </div>

              {selectedGigId && (
                <Link
                  href={`/portal/perform/${selectedGigId}`}
                  target="_blank"
                  className="bg-slate-900 hover:bg-slate-800 text-yellow-400 border border-yellow-400/40 font-bold px-3.5 py-1.5 rounded-xl text-xs flex items-center gap-1.5 transition shadow"
                >
                  <PlaySquare className="w-3.5 h-3.5" />
                  <span>Stage Mode</span>
                  <ExternalLink className="w-3 h-3 text-slate-500" />
                </Link>
              )}

              <button
                type="button"
                onClick={handleSaveGigAsReusableSetlist}
                className="bg-slate-800 hover:bg-slate-700 text-white font-semibold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1 transition border border-slate-700 cursor-pointer"
                title="Save this gig sequence into the library so other gigs can reuse it"
              >
                <FolderPlus className="w-3.5 h-3.5 text-yellow-400" />
                <span>Save as Reusable</span>
              </button>

              <button
                type="button"
                disabled={saving}
                onClick={handleSaveGigSetlist}
                className="bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold px-4 py-1.5 rounded-xl text-xs flex items-center gap-1.5 transition shadow disabled:opacity-50 cursor-pointer"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                <span>{savedSuccess ? "Saved!" : "Save Gig Setlist"}</span>
              </button>
            </div>
          </div>

          {/* Gig Sequence Workspace Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Active Gig Setlist Sequence (7 cols) */}
            <div 
              style={{ backgroundColor: "var(--ebb-surface)", borderColor: "var(--ebb-border)" }}
              className="lg:col-span-7 border rounded-3xl p-5 shadow-xl flex flex-col space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Music className="w-4 h-4 text-yellow-400" />
                  <h2 className="text-base font-bold text-white">Gig Setlist Sequence</h2>
                  <span className="text-xs font-mono text-slate-400">
                    ({gigSetlistTunes.length} chart{gigSetlistTunes.length === 1 ? "" : "s"})
                  </span>
                </div>
                <div className="text-xs text-slate-400 font-mono">
                  {selectedGig?.date}
                </div>
              </div>

              {gigSetlistTunes.length === 0 ? (
                <div className="text-center py-12 space-y-2 border border-dashed border-slate-800 rounded-2xl">
                  <p className="text-xs text-slate-400">No tunes scheduled for this gig yet.</p>
                  <p className="text-[11px] text-slate-500">
                    Pick a chart from the library on the right or select a Reusable Setlist above to populate.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1 [scrollbar-width:thin]">
                  {gigSetlistTunes.map((item, index) => (
                    <div
                      key={item.id || index}
                      style={{ backgroundColor: "var(--ebb-surface-muted)", borderColor: "var(--ebb-border)" }}
                      className="border rounded-2xl p-3 flex items-center justify-between gap-3 group hover:border-slate-600 transition"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-6 h-6 rounded-lg bg-black/40 text-yellow-400 font-mono font-bold text-xs flex items-center justify-center shrink-0">
                          {index + 1}
                        </span>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-white truncate">{item.title}</span>
                            {item.keySignature && (
                              <span className="text-[10px] font-mono text-yellow-400 bg-black/30 px-1.5 py-0.2 rounded border border-white/5">
                                {item.keySignature}
                              </span>
                            )}
                            {item.tempoBpm && (
                              <span className="text-[10px] font-mono text-slate-400">
                                {item.tempoBpm} BPM
                              </span>
                            )}
                          </div>
                          {item.notes && (
                            <p className="text-[11px] text-slate-400 truncate mt-0.5">
                              Note: {item.notes}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={() => {
                            const updated = [...gigSetlistTunes];
                            const temp = updated[index];
                            updated[index] = updated[index - 1];
                            updated[index - 1] = temp;
                            setGigSetlistTunes(updated);
                          }}
                          className="p-1 rounded text-slate-400 hover:text-white disabled:opacity-20 transition"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={index === gigSetlistTunes.length - 1}
                          onClick={() => {
                            const updated = [...gigSetlistTunes];
                            const temp = updated[index];
                            updated[index] = updated[index + 1];
                            updated[index + 1] = temp;
                            setGigSetlistTunes(updated);
                          }}
                          className="p-1 rounded text-slate-400 hover:text-white disabled:opacity-20 transition"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setGigSetlistTunes(gigSetlistTunes.filter((_, i) => i !== index))}
                          className="p-1 rounded text-slate-400 hover:text-rose-400 transition ml-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right: Master Song Catalog Picker (5 cols) */}
            <div 
              style={{ backgroundColor: "var(--ebb-surface)", borderColor: "var(--ebb-border)" }}
              className="lg:col-span-5 border rounded-3xl p-5 shadow-xl flex flex-col space-y-3"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Search className="w-4 h-4 text-yellow-400" />
                  <h3 className="text-sm font-bold text-white">Add Charts to Gig</h3>
                </div>
                <span className="text-xs font-mono text-slate-400">{catalog.length} available</span>
              </div>

              <input
                type="text"
                placeholder="Search catalog..."
                value={searchCatalogQuery}
                onChange={(e) => setSearchCatalogQuery(e.target.value)}
                style={{ backgroundColor: "var(--ebb-surface-muted)", borderColor: "var(--ebb-border)" }}
                className="w-full border rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400 font-medium"
              />

              <div className="space-y-1.5 max-h-[55vh] overflow-y-auto pr-1 [scrollbar-width:thin]">
                {catalog
                  .filter((c) =>
                    c.title.toLowerCase().includes(searchCatalogQuery.toLowerCase()) ||
                    (c.artist || "").toLowerCase().includes(searchCatalogQuery.toLowerCase())
                  )
                  .map((song) => (
                    <div
                      key={song.id}
                      style={{ backgroundColor: "var(--ebb-surface-muted)", borderColor: "var(--ebb-border)" }}
                      className="border rounded-xl p-2.5 flex items-center justify-between gap-2 hover:border-slate-600 transition"
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white truncate">{song.title}</div>
                        <div className="text-[10px] text-slate-400 font-mono flex items-center gap-2 mt-0.5">
                          <span>Key: {song.keySignature || "Bb"}</span>
                          <span>{song.tempoBpm || 120} BPM</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          const newTune: SetlistTuneItem = {
                            id: generateUniqueId(song.id),
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
                          setGigSetlistTunes([...gigSetlistTunes, newTune]);
                        }}
                        className="bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold px-2 py-1 rounded-lg text-xs flex items-center gap-1 transition shrink-0 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 1: REUSABLE SETLIST EDITOR (CREATE / EDIT)
          ========================================================================= */}
      {isEditorOpen && editingSetlist && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div 
            style={{ backgroundColor: "var(--ebb-surface)", borderColor: "var(--ebb-border)" }}
            className="border rounded-3xl w-full max-w-5xl h-[88vh] flex flex-col overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200"
          >
            {/* Modal Header */}
            <div 
              style={{ backgroundColor: "var(--ebb-surface-muted)", borderColor: "var(--ebb-border)" }}
              className="p-5 border-b flex items-center justify-between gap-4 shrink-0"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-yellow-400/20 text-yellow-400 flex items-center justify-center font-bold">
                  <Music className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-black text-white">
                    {editingSetlist.name ? `Curate: ${editingSetlist.name}` : "Create Reusable Setlist"}
                  </h2>
                  <p className="text-xs text-slate-400">
                    Select tunes from the catalog, sequence order, and save to the ensemble library.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSaveEditor}
                  disabled={saving || isDuplicateEditorTitle || !editingSetlist.name?.trim()}
                  className="bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition shadow disabled:opacity-50 cursor-pointer"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>Save to Library</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditorOpen(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Body: Dual Column */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden divide-y lg:divide-y-0 lg:divide-x divide-slate-800">
              {/* Left Column: Setlist Metadata & Sequence (7 cols) */}
              <div className="lg:col-span-7 flex flex-col h-full overflow-hidden p-5 space-y-4">
                {/* Meta Inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 shrink-0">
                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">
                      Setlist Title
                    </label>
                    <input
                      type="text"
                      value={editingSetlist.name || ""}
                      onChange={(e) => setEditingSetlist({ ...editingSetlist, name: e.target.value })}
                      placeholder="e.g. Bloomfield Parade Opener"
                      style={{ backgroundColor: "var(--ebb-surface-muted)", borderColor: "var(--ebb-border)" }}
                      className={`w-full border rounded-xl px-3 py-1.5 text-xs text-white font-bold focus:outline-none ${
                        isDuplicateEditorTitle ? "border-rose-500 focus:border-rose-400" : "focus:border-yellow-400"
                      }`}
                    />
                    {isDuplicateEditorTitle && (
                      <p className="text-[11px] text-rose-400 font-semibold mt-1">
                        A setlist with this title already exists in the reusable library. Please choose a unique title.
                      </p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">
                      Category
                    </label>
                    <select
                      value={editingSetlist.category || "parade"}
                      onChange={(e) => setEditingSetlist({ ...editingSetlist, category: e.target.value as SetlistCategory })}
                      style={{ backgroundColor: "var(--ebb-surface-muted)", borderColor: "var(--ebb-border)" }}
                      className="w-full border rounded-xl px-3 py-1.5 text-xs text-white font-semibold focus:outline-none"
                    >
                      {(Object.keys(CATEGORY_LABELS) as SetlistCategory[]).map((cat) => (
                        <option key={cat} value={cat}>
                          {CATEGORY_LABELS[cat].label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 shrink-0">
                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">
                      Description / Vibe
                    </label>
                    <input
                      type="text"
                      value={editingSetlist.description || ""}
                      onChange={(e) => setEditingSetlist({ ...editingSetlist, description: e.target.value })}
                      placeholder="Audience profile, venue notes, or gig type..."
                      style={{ backgroundColor: "var(--ebb-surface-muted)", borderColor: "var(--ebb-border)" }}
                      className="w-full border rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-yellow-400"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">
                      Target Duration (Min)
                    </label>
                    <input
                      type="number"
                      value={editingSetlist.targetDurationMinutes || 45}
                      onChange={(e) => setEditingSetlist({ ...editingSetlist, targetDurationMinutes: Number(e.target.value) || 45 })}
                      style={{ backgroundColor: "var(--ebb-surface-muted)", borderColor: "var(--ebb-border)" }}
                      className="w-full border rounded-xl px-3 py-1.5 text-xs text-white font-mono focus:outline-none"
                    />
                  </div>
                </div>

                {/* Tunes Sequence Header */}
                <div className="flex items-center justify-between border-t border-slate-800 pt-3 shrink-0">
                  <span className="text-xs font-bold text-slate-300">
                    Sequence Order ({(editingSetlist.tunes || []).length} tunes)
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">
                    Drag/reorder using arrows
                  </span>
                </div>

                {/* Sequence List */}
                <div className="flex-1 overflow-y-auto space-y-2 pr-1 [scrollbar-width:thin]">
                  {(editingSetlist.tunes || []).length === 0 ? (
                    <div className="p-8 text-center border border-dashed border-slate-800 rounded-2xl text-xs text-slate-400">
                      No charts added yet. Search and click &quot;+ Add&quot; on the catalog panel on the right.
                    </div>
                  ) : (
                    (editingSetlist.tunes || []).map((tune, idx) => (
                      <div
                        key={tune.id || idx}
                        style={{ backgroundColor: "var(--ebb-surface-muted)", borderColor: "var(--ebb-border)" }}
                        className="border rounded-2xl p-3 space-y-2 hover:border-slate-600 transition"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="w-6 h-6 rounded-lg bg-black/40 text-yellow-400 font-mono font-bold text-xs flex items-center justify-center shrink-0">
                              {idx + 1}
                            </span>
                            <span className="text-xs font-bold text-white truncate">{tune.title}</span>
                            <span className="text-[10px] font-mono text-yellow-400 bg-black/30 px-1.5 py-0.2 rounded border border-white/5">
                              {tune.keySignature}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400">
                              {tune.tempoBpm} BPM
                            </span>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => handleMoveTuneInEditor(idx, "up")}
                              className="p-1 rounded text-slate-400 hover:text-white disabled:opacity-20 transition"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={idx === (editingSetlist.tunes || []).length - 1}
                              onClick={() => handleMoveTuneInEditor(idx, "down")}
                              className="p-1 rounded text-slate-400 hover:text-white disabled:opacity-20 transition"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveTuneFromEditor(idx)}
                              className="p-1 rounded text-slate-400 hover:text-rose-400 transition ml-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Transition & Note Row */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-mono text-slate-400 shrink-0">Transition:</span>
                            <select
                              value={tune.transitionType || "standard_pause"}
                              onChange={(e) => handleUpdateTuneProp(idx, "transitionType", e.target.value)}
                              className="bg-black/30 border border-slate-700 rounded px-2 py-0.5 text-[11px] text-slate-200 focus:outline-none w-full"
                            >
                              <option value="standard_pause">Standard Pause</option>
                              <option value="direct_segue">Direct Segue</option>
                              <option value="drum_roll">Drum Roll Bridge</option>
                              <option value="vamp">Vamp to Cue</option>
                            </select>
                          </div>

                          <div>
                            <input
                              type="text"
                              placeholder="Notes (e.g. Kristin trumpet solo)..."
                              value={tune.notes || ""}
                              onChange={(e) => handleUpdateTuneProp(idx, "notes", e.target.value)}
                              className="bg-black/30 border border-slate-700 rounded px-2 py-0.5 text-[11px] text-slate-200 focus:outline-none w-full"
                            />
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Right Column: Chart Catalog Browser (5 cols) */}
              <div className="lg:col-span-5 flex flex-col h-full overflow-hidden p-5 space-y-3 bg-black/20">
                <div className="flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2">
                    <Music className="w-4 h-4 text-yellow-400" />
                    <h3 className="text-sm font-bold text-white">Select from Catalog</h3>
                  </div>
                  <span className="text-xs font-mono text-slate-400">{catalog.length} Charts</span>
                </div>

                <input
                  type="text"
                  placeholder="Filter charts..."
                  value={searchCatalogQuery}
                  onChange={(e) => setSearchCatalogQuery(e.target.value)}
                  style={{ backgroundColor: "var(--ebb-surface-muted)", borderColor: "var(--ebb-border)" }}
                  className="w-full border rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400 font-medium shrink-0"
                />

                <div className="flex-1 overflow-y-auto space-y-2 pr-1 [scrollbar-width:thin]">
                  {catalog
                    .filter((c) =>
                      c.title.toLowerCase().includes(searchCatalogQuery.toLowerCase()) ||
                      (c.artist || "").toLowerCase().includes(searchCatalogQuery.toLowerCase())
                    )
                    .map((song) => (
                      <div
                        key={song.id}
                        style={{ backgroundColor: "var(--ebb-surface-muted)", borderColor: "var(--ebb-border)" }}
                        className="border rounded-xl p-2.5 flex items-center justify-between gap-2 hover:border-slate-600 transition"
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-white truncate">{song.title}</div>
                          <div className="text-[10px] text-slate-400 font-mono flex items-center gap-2 mt-0.5">
                            <span>Key: {song.keySignature || "Bb"}</span>
                            <span>{song.tempoBpm || 120} BPM</span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleAddTuneToEditor(song)}
                          className="bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold px-2 py-1 rounded-lg text-xs flex items-center gap-1 transition shrink-0 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" /> Add
                        </button>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 2: ASSIGN REUSABLE SETLIST TO GIG MODAL
          ========================================================================= */}
      {assigningSetlist && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div 
            style={{ backgroundColor: "var(--ebb-surface)", borderColor: "var(--ebb-border)" }}
            className="border rounded-3xl w-full max-w-md p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95 duration-200"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Send className="w-5 h-5 text-yellow-400" />
                <h3 className="text-base font-bold text-white">Assign Setlist to Gig</h3>
              </div>
              <button
                type="button"
                onClick={() => setAssigningSetlist(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
                <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Selected Setlist</div>
                <div className="text-sm font-bold text-white">{assigningSetlist.name}</div>
                <div className="text-xs text-yellow-400 font-mono">
                  {assigningSetlist.tunes?.length || 0} charts • ~{assigningSetlist.targetDurationMinutes || 45} min
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">Target Gig:</label>
                <select
                  value={targetGigIdToAssign}
                  onChange={(e) => setTargetGigIdToAssign(e.target.value)}
                  style={{ backgroundColor: "var(--ebb-surface-muted)", borderColor: "var(--ebb-border)" }}
                  className="w-full border rounded-xl px-3 py-2 text-xs text-white font-semibold focus:outline-none focus:border-yellow-400"
                >
                  {gigs.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.date} — {g.title} {g.venue ? `(${g.venue})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <p className="text-[11px] text-slate-400 leading-relaxed">
                Assigning this setlist will link the sequence to the gig&apos;s call sheet and stage view mode. Reusable setlist usage analytics will also increment automatically.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setAssigningSetlist(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isAssigning || !targetGigIdToAssign}
                onClick={handleConfirmAssignToGig}
                className="bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition shadow disabled:opacity-50 cursor-pointer"
              >
                {isAssigning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                <span>Assign Setlist</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}