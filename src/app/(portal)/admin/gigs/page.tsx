"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { 
  collection, 
  onSnapshot, 
  setDoc, 
  deleteDoc, 
  doc 
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/lib/context/AuthContext";
import { canManageGigs, canManageSetlists } from "@/lib/auth/permissions";
import { User } from "@/lib/schema/user";
import { SetlistTuneItem, isReusableSetlistTemplate } from "@/lib/schema/setlist";
import { toast } from "@/lib/context/ToastContext";
import PortalBreadcrumb from "@/components/portal/PortalBreadcrumb";
import { 
  Calendar, 
  MapPin, 
  DollarSign, 
  Plus, 
  Trash2, 
  ExternalLink, 
  Loader2, 
  ShieldAlert, 
  X, 
  Check,
  Navigation,
  Edit3,
  ListMusic,
  Heart,
  Landmark,
  Globe,
  EyeOff,
  Search,
  ArrowUp,
  ArrowDown,
  ImageIcon,
  FolderOpen,
  MoveVertical,
  Mail,
  Send,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import DatePicker from "@/components/ui/DatePicker";
import TimePicker from "@/components/ui/TimePicker";
import GigSetlistAssignmentModal from "@/components/portal/GigSetlistAssignmentModal";
import ResourceAssetPickerModal from "@/components/cms/ResourceAssetPickerModal";
import { ResourceAsset } from "@/lib/schema/resource";
import { GigCompensationType } from "@/lib/schema/gig";

interface GigItem {
  id: string;
  slug: string;
  date: string;
  status: "confirmed" | "draft" | "completed" | "cancelled";
  setlistId?: string;
  setlistName?: string;
  setlistTitle?: string;
  setlist?: SetlistTuneItem[] | unknown[];
  publicDetails?: {
    title: string;
    venue: string;
    venueAddress?: string;
    description?: string;
    showExternalDirections?: boolean;
    isPublic?: boolean;
    eventUrl?: string;
    facebookEventUrl?: string;
    headerImageUrl?: string;
    headerImageAlt?: string;
    headerImageOverlayOpacity?: number;
    headerImageHeightPreset?: "compact" | "standard" | "cinematic";
    headerImageVerticalPosition?: number;
  };
  internalLogistics?: {
    title: string;
    callTime: string;
    downbeat: string;
    attire?: string;
    compensation?: number;
    compensationType?: GigCompensationType;
    parkingNotes?: string;
    setlistId?: string;
    setlistName?: string;
    setlistTitle?: string;
  };
  financials?: {
    totalFee?: number;
    compensationType?: GigCompensationType;
    settlementType?: string;
    bandFundCut?: number;
    fixedPerformerAmount?: number;
    payouts?: Record<string, unknown>;
    notes?: string;
  };
  rsvpSummary?: {
    attendingCount: number;
    declinedCount: number;
  };
}

interface SetlistDocData {
  id: string;
  name?: string;
  title?: string;
  category?: string;
  isTemplate?: boolean;
  tunes?: SetlistTuneItem[];
  items?: SetlistTuneItem[];
  assignedGigIds?: string[];
  usageCount?: number;
  lastUsedDate?: string;
  [key: string]: unknown;
}

export default function GigsAdminStudioPage() {
  const { profile, loading: authLoading } = useAuth();
  const [gigs, setGigs] = useState<GigItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [editingGig, setEditingGig] = useState<GigItem | null>(null);
  const [managingSetlistGig, setManagingSetlistGig] = useState<GigItem | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [setlistMap, setSetlistMap] = useState<Record<string, { name: string; category: string; tuneCount: number }>>({});
  const [fullSetlists, setFullSetlists] = useState<Record<string, SetlistDocData>>({});

  // Search, Status Filter & Sorting
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "upcoming" | "completed">("all");
  const [sortDirection, setSortDirection] = useState<"desc" | "asc">("desc");

  const [formData, setFormData] = useState({
    title: "",
    date: "",
    status: "draft" as GigItem["status"],
    venue: "",
    venueAddress: "",
    showExternalDirections: true,
    isPublic: false,
    eventUrl: "",
    headerImageUrl: "",
    headerImageAlt: "",
    headerImageHeightPreset: "standard" as "compact" | "standard" | "cinematic",
    headerImageVerticalPosition: 50,
    headerImageOverlayOpacity: 0,
    callTime: "5:00 PM",
    downbeat: "6:00 PM",
    attire: "Eagleburger Yellows & Black",
    compensation: 50,
    compensationType: "individual" as GigCompensationType,
    totalFee: 0,
    description: "",
    dispatchAvailability: false,
  });

  const [editFormData, setEditFormData] = useState({
    title: "",
    date: "",
    status: "draft" as GigItem["status"],
    venue: "",
    venueAddress: "",
    showExternalDirections: true,
    isPublic: true,
    eventUrl: "",
    headerImageUrl: "",
    headerImageAlt: "",
    headerImageHeightPreset: "standard" as "compact" | "standard" | "cinematic",
    headerImageVerticalPosition: 50,
    headerImageOverlayOpacity: 0,
    callTime: "5:00 PM",
    downbeat: "6:00 PM",
    attire: "Eagleburger Yellows & Black",
    compensation: 50,
    compensationType: "individual" as GigCompensationType,
    totalFee: 0,
    description: "",
    setlistId: "",
  });

  const [dispatchingConfirmationId, setDispatchingConfirmationId] = useState<string | null>(null);

  const [isAssetPickerOpen, setIsAssetPickerOpen] = useState(false);
  const [assetPickerTarget, setAssetPickerTarget] = useState<"create" | "edit">("create");

  const handleSelectAsset = (asset: ResourceAsset) => {
    if (assetPickerTarget === "create") {
      setFormData((prev) => ({
        ...prev,
        headerImageUrl: asset.url,
        headerImageAlt: asset.altText || asset.name,
      }));
    } else {
      setEditFormData((prev) => ({
        ...prev,
        headerImageUrl: asset.url,
        headerImageAlt: asset.altText || asset.name,
      }));
    }
    setIsAssetPickerOpen(false);
    toast.success(`Selected "${asset.name}" as gig header image.`);
  };

  // Lock body scroll when edit modal or setlist modal is open
  useEffect(() => {
    if (editingGig || managingSetlistGig) {
      const orig = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = orig;
      };
    }
  }, [editingGig, managingSetlistGig]);

  useEffect(() => {
    if (authLoading) return;

    const unsub = onSnapshot(
      collection(db, "gigs"),
      (snap) => {
        const list: GigItem[] = [];
        snap.forEach((d) => list.push({ id: d.id, ...d.data() } as GigItem));
        list.sort((a, b) => b.date.localeCompare(a.date));
        setGigs(list);
        setLoading(false);
      },
      (err) => {
        console.error("Gigs listener error:", err);
        setLoading(false);
      }
    );

    const unsubSetlists = onSnapshot(
      collection(db, "setlists"),
      (snap) => {
        const map: Record<string, { name: string; category: string; tuneCount: number }> = {};
        const full: Record<string, SetlistDocData> = {};
        snap.forEach((d) => {
          const data = d.data();
          if (isReusableSetlistTemplate(d.id, data)) {
            const tunes = data.tunes || data.items || [];
            map[d.id] = {
              name: data.name || data.title || "Untitled",
              category: data.category || "parade",
              tuneCount: Array.isArray(tunes) ? tunes.length : 0,
            };
            full[d.id] = { id: d.id, ...data };
          }
        });
        setSetlistMap(map);
        setFullSetlists(full);
      },
      (err) => console.warn("Notice: setlists fetch note:", err)
    );

    return () => {
      unsub();
      unsubSetlists();
    };
  }, [authLoading]);

  // Derived filtered & sorted gigs
  const { filteredGigs, counts } = useMemo(() => {
    const todayStr = new Date().toISOString().split("T")[0];
    const q = searchQuery.trim().toLowerCase();

    // Calculate base counts across all gigs
    let upcomingCount = 0;
    let completedCount = 0;

    for (const g of gigs) {
      const isCompleted = g.status === "completed" || (Boolean(g.date) && g.date < todayStr);
      if (isCompleted) {
        completedCount++;
      } else {
        upcomingCount++;
      }
    }

    const filtered = gigs.filter((g) => {
      // 1. Status Filter
      const isCompleted = g.status === "completed" || (Boolean(g.date) && g.date < todayStr);
      if (statusFilter === "upcoming" && isCompleted) return false;
      if (statusFilter === "completed" && !isCompleted) return false;

      // 2. Search Query (Title, Venue, City, Address, Setlist, Date)
      if (q) {
        const title = (g.publicDetails?.title || g.internalLogistics?.title || "").toLowerCase();
        const venue = (g.publicDetails?.venue || "").toLowerCase();
        const venueAddr = (g.publicDetails?.venueAddress || "").toLowerCase();
        const date = (g.date || "").toLowerCase();
        const setlistName = (
          g.setlistName ||
          g.setlistTitle ||
          g.internalLogistics?.setlistName ||
          g.internalLogistics?.setlistTitle ||
          (g.setlistId && setlistMap[g.setlistId]?.name) ||
          ""
        ).toLowerCase();

        const match =
          title.includes(q) ||
          venue.includes(q) ||
          venueAddr.includes(q) ||
          date.includes(q) ||
          setlistName.includes(q);

        if (!match) return false;
      }

      return true;
    });

    // 3. Date Sorting
    filtered.sort((a, b) => {
      const dateA = a.date || "";
      const dateB = b.date || "";
      if (sortDirection === "asc") {
        return dateA.localeCompare(dateB);
      }
      return dateB.localeCompare(dateA);
    });

    return {
      filteredGigs: filtered,
      counts: {
        all: gigs.length,
        upcoming: upcomingCount,
        completed: completedCount,
      },
    };
  }, [gigs, searchQuery, statusFilter, sortDirection, setlistMap]);

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-400 gap-2 text-xs">
        <Loader2 className="w-4 h-4 animate-spin text-yellow-400" />
        Loading band performances...
      </div>
    );
  }

  if (!canManageGigs(profile as unknown as User) && !canManageSetlists(profile as unknown as User)) {
    return (
      <div className="p-8 text-rose-400 text-xs font-semibold flex items-center gap-2">
        <ShieldAlert className="w-4 h-4" />
        Gig Manager, Setlist Manager, or Admin privileges required to access the Gig Management Studio.
      </div>
    );
  }

  const handleCreateGig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.date) return;

    setIsSaving(true);
    try {
      const gigId = `gig_${formData.date}_${formData.title.toLowerCase().replace(/[^a-z0-9]/g, "_")}`;
      const slug = `${formData.date}-${formData.title.toLowerCase().replace(/[^a-z0-9]/g, "-")}`;

      const finalCompensation = formData.compensationType === "individual" ? (Number(formData.compensation) || 0) : 0;
      const finalTotalFee = formData.compensationType === "band_fund"
        ? (Number(formData.totalFee) || 0)
        : formData.compensationType === "individual"
        ? (Number(formData.totalFee) || 0)
        : 0;

      const payload: Record<string, unknown> = {
        id: gigId,
        slug,
        date: formData.date,
        status: formData.status,
        setlistId: null,
        setlistName: "",
        setlistTitle: "",
        publicDetails: {
          title: formData.title.trim(),
          venue: formData.venue.trim(),
          venueAddress: formData.venueAddress.trim(),
          description: formData.description.trim(),
          showExternalDirections: formData.showExternalDirections,
          isPublic: formData.isPublic,
          eventUrl: formData.eventUrl.trim(),
          headerImageUrl: formData.headerImageUrl.trim(),
          headerImageAlt: formData.headerImageAlt.trim(),
          headerImageHeightPreset: formData.headerImageHeightPreset,
          headerImageVerticalPosition: formData.headerImageVerticalPosition,
          headerImageOverlayOpacity: formData.headerImageOverlayOpacity,
        },
        internalLogistics: {
          title: formData.title.trim(),
          callTime: formData.callTime.trim(),
          downbeat: formData.downbeat.trim(),
          attire: formData.attire.trim(),
          compensation: finalCompensation,
          compensationType: formData.compensationType,
          setlistId: null,
          setlistName: "",
          setlistTitle: "",
        },
        financials: {
          totalFee: finalTotalFee,
          compensationType: formData.compensationType,
          settlementType: formData.compensationType === "individual" ? "equal_split" : formData.compensationType,
          bandFundCut: formData.compensationType === "band_fund" ? finalTotalFee : 0,
          fixedPerformerAmount: finalCompensation,
          payouts: {},
          notes: "",
        },
        rsvpSummary: { attendingCount: 0, declinedCount: 0 },
        setlist: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await setDoc(doc(db, "gigs", gigId), payload, { merge: true });

      // Initialize empty live stage view document for the new gig
      await setDoc(
        doc(db, "setlists", gigId),
        {
          gigId,
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

      // Dispatch initial availability request email if requested
      if (formData.dispatchAvailability) {
        try {
          const dispRes = await fetch("/api/email/gig-availability", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              gigId,
              gigTitle: formData.title.trim(),
              date: formData.date,
              callTime: formData.callTime || "TBD",
              downbeat: formData.downbeat || "TBD",
              venue: formData.venue.trim(),
              address: formData.venueAddress.trim() || formData.venue.trim(),
              notes: formData.description.trim(),
              actorUid: profile?.uid,
            }),
          });
          const dispData = await dispRes.json();
          if (dispRes.ok && dispData.success) {
            const count = dispData.recipientCount || 0;
            const boCount = dispData.blackedOutCount || 0;
            const hiCount = dispData.hiatusCount || 0;
            toast.success(
              `Performance created! Availability dispatch sent to ${count} musician(s) (${boCount} blacked out, ${hiCount} on hiatus skipped).`
            );
          } else {
            toast.success(`Performance "${formData.title.trim()}" created!`);
          }
        } catch (dispErr) {
          console.warn("Notice: availability dispatch post gig creation:", dispErr);
          toast.success(`Performance "${formData.title.trim()}" created!`);
        }
      } else {
        toast.success(`Performance "${formData.title.trim()}" created!`);
      }

      setIsCreating(false);
      setFormData({
        title: "",
        date: "",
        status: "draft",
        venue: "",
        venueAddress: "",
        showExternalDirections: true,
        isPublic: false,
        eventUrl: "",
        headerImageUrl: "",
        headerImageAlt: "",
        headerImageHeightPreset: "standard",
        headerImageVerticalPosition: 50,
        headerImageOverlayOpacity: 0,
        callTime: "5:00 PM",
        downbeat: "6:00 PM",
        attire: "Eagleburger Yellows & Black",
        compensation: 50,
        compensationType: "individual",
        totalFee: 0,
        description: "",
        dispatchAvailability: false,
      });
    } catch (err) {
      toast.error("Failed to create gig: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleNavigation = async (gigId: string, currentVal: boolean | undefined) => {
    try {
      const gigRef = doc(db, "gigs", gigId);
      await setDoc(
        gigRef,
        {
          publicDetails: {
            showExternalDirections: currentVal === false ? true : false,
          },
        },
        { merge: true }
      );
      toast.success("Navigation setting updated.");
    } catch (err) {
      toast.error("Failed to update navigation setting: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleTogglePublicVisibility = async (gigId: string, currentVal: boolean | undefined) => {
    try {
      const gigRef = doc(db, "gigs", gigId);
      const isCurrentlyPublic = currentVal !== false;
      const nextVal = !isCurrentlyPublic;
      await setDoc(
        gigRef,
        {
          publicDetails: {
            isPublic: nextVal,
          },
        },
        { merge: true }
      );
      toast.success(nextVal ? "Gig published to public site." : "Gig marked private (hidden from public site).");
    } catch (err) {
      toast.error("Failed to update gig visibility: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleOpenEdit = (gig: GigItem) => {
    setEditingGig(gig);
    const compType: GigCompensationType =
      gig.internalLogistics?.compensationType ||
      (gig.financials?.compensationType as GigCompensationType) ||
      ((Number(gig.internalLogistics?.compensation) || 0) > 0 ? "individual" : "community");

    setEditFormData({
      title: gig.publicDetails?.title || gig.id,
      date: gig.date || "",
      status: gig.status || "draft",
      venue: gig.publicDetails?.venue || "",
      venueAddress: gig.publicDetails?.venueAddress || "",
      showExternalDirections: gig.publicDetails?.showExternalDirections !== false,
      isPublic: gig.publicDetails?.isPublic !== false,
      eventUrl: gig.publicDetails?.eventUrl || gig.publicDetails?.facebookEventUrl || "",
      headerImageUrl: gig.publicDetails?.headerImageUrl || "",
      headerImageAlt: gig.publicDetails?.headerImageAlt || "",
      headerImageHeightPreset: gig.publicDetails?.headerImageHeightPreset || "standard",
      headerImageVerticalPosition: gig.publicDetails?.headerImageVerticalPosition ?? 50,
      headerImageOverlayOpacity: gig.publicDetails?.headerImageOverlayOpacity ?? 0,
      callTime: gig.internalLogistics?.callTime || "5:00 PM",
      downbeat: gig.internalLogistics?.downbeat || "6:00 PM",
      attire: gig.internalLogistics?.attire || "Eagleburger Yellows & Black",
      compensation: gig.internalLogistics?.compensation ?? (compType === "individual" ? 50 : 0),
      compensationType: compType,
      totalFee: gig.financials?.totalFee ?? 0,
      description: gig.publicDetails?.description || "",
      setlistId: gig.setlistId || gig.internalLogistics?.setlistId || "",
    });
  };

  const handleUpdateGig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGig) return;

    setIsSaving(true);
    try {
      const selectedTemplate = editFormData.setlistId ? fullSetlists[editFormData.setlistId] : null;
      const initialTunes = selectedTemplate
        ? (selectedTemplate.tunes || selectedTemplate.items || [])
        : (editingGig.setlist || []);

      const assignedTitle = selectedTemplate
        ? (selectedTemplate.name || selectedTemplate.title || "")
        : editFormData.setlistId && setlistMap[editFormData.setlistId]
          ? setlistMap[editFormData.setlistId].name
          : editFormData.setlistId
            ? (editingGig.setlistName || editingGig.setlistTitle || editingGig.internalLogistics?.setlistName || "")
            : null;

      const finalCompensation = editFormData.compensationType === "individual" ? (Number(editFormData.compensation) || 0) : 0;
      const finalTotalFee = editFormData.compensationType === "band_fund"
        ? (Number(editFormData.totalFee) || 0)
        : editFormData.compensationType === "individual"
        ? (Number(editFormData.totalFee) || 0)
        : 0;

      const updateData: Record<string, unknown> = {
        date: editFormData.date,
        status: editFormData.status,
        setlistId: editFormData.setlistId || null,
        setlistName: assignedTitle,
        setlistTitle: assignedTitle,
        publicDetails: {
          ...(editingGig.publicDetails || {}),
          title: editFormData.title.trim(),
          venue: editFormData.venue.trim(),
          venueAddress: editFormData.venueAddress.trim(),
          description: editFormData.description.trim(),
          showExternalDirections: editFormData.showExternalDirections,
          isPublic: editFormData.isPublic,
          eventUrl: editFormData.eventUrl.trim(),
          facebookEventUrl: editFormData.eventUrl.trim(),
          headerImageUrl: editFormData.headerImageUrl.trim(),
          headerImageAlt: editFormData.headerImageAlt.trim(),
          headerImageHeightPreset: editFormData.headerImageHeightPreset,
          headerImageVerticalPosition: editFormData.headerImageVerticalPosition,
          headerImageOverlayOpacity: editFormData.headerImageOverlayOpacity,
        },
        internalLogistics: {
          title: editFormData.title.trim(),
          callTime: editFormData.callTime.trim(),
          downbeat: editFormData.downbeat.trim(),
          attire: editFormData.attire.trim(),
          compensation: finalCompensation,
          compensationType: editFormData.compensationType,
          setlistId: editFormData.setlistId || null,
          setlistName: assignedTitle,
          setlistTitle: assignedTitle,
        },
        financials: {
          ...(editingGig.financials || {}),
          totalFee: finalTotalFee || editingGig.financials?.totalFee || 0,
          compensationType: editFormData.compensationType,
          settlementType: editFormData.compensationType === "individual" ? (editingGig.financials?.settlementType || "equal_split") : editFormData.compensationType,
          bandFundCut: editFormData.compensationType === "band_fund" ? finalTotalFee : (editingGig.financials?.bandFundCut || 0),
          fixedPerformerAmount: finalCompensation,
        },
        updatedAt: new Date().toISOString(),
      };

      if (selectedTemplate) {
        updateData.setlist = initialTunes;
      } else if (!editFormData.setlistId && (editingGig.setlistId || editingGig.internalLogistics?.setlistId)) {
        updateData.setlist = [];
      }

      await setDoc(doc(db, "gigs", editingGig.id), updateData, { merge: true });

      const prevSetlistId = editingGig.setlistId || editingGig.internalLogistics?.setlistId;
      if (editFormData.setlistId && selectedTemplate && editFormData.setlistId !== prevSetlistId) {
        // If switching from a previous template, unlink gig from previous template
        if (prevSetlistId && prevSetlistId !== editFormData.setlistId && fullSetlists[prevSetlistId]) {
          const currentAssigned = fullSetlists[prevSetlistId].assignedGigIds || [];
          const updatedAssigned = currentAssigned.filter((gid) => gid !== editingGig.id);
          await setDoc(
            doc(db, "setlists", prevSetlistId),
            { assignedGigIds: updatedAssigned, updatedAt: new Date().toISOString() },
            { merge: true }
          );
        }

        await setDoc(
          doc(db, "setlists", editingGig.id),
          {
            gigId: editingGig.id,
            isTemplate: false,
            templateId: editFormData.setlistId,
            templateName: assignedTitle,
            name: assignedTitle,
            title: assignedTitle,
            tunes: initialTunes,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );

        const currentAssigned = selectedTemplate.assignedGigIds || [];
        const updatedAssigned = currentAssigned.includes(editingGig.id) ? currentAssigned : [...currentAssigned, editingGig.id];
        await setDoc(
          doc(db, "setlists", editFormData.setlistId),
          {
            assignedGigIds: updatedAssigned,
            usageCount: (selectedTemplate.usageCount || 0) + 1,
            lastUsedDate: editFormData.date,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      } else if (!editFormData.setlistId && prevSetlistId) {
        // Clear live stage view document
        await setDoc(
          doc(db, "setlists", editingGig.id),
          {
            gigId: editingGig.id,
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

        // Unlink previous template
        if (fullSetlists[prevSetlistId]) {
          const currentAssigned = fullSetlists[prevSetlistId].assignedGigIds || [];
          const updatedAssigned = currentAssigned.filter((gid) => gid !== editingGig.id);
          await setDoc(
            doc(db, "setlists", prevSetlistId),
            { assignedGigIds: updatedAssigned, updatedAt: new Date().toISOString() },
            { merge: true }
          );
        }
      }

      // Automated Dispatch Rule Enforcement:
      // Trigger 2: When a gig is confirmed (transition into confirmed), notify members it's happening.
      const isNowConfirmed = editFormData.status === "confirmed";
      const wasConfirmed = editingGig.status === "confirmed";
      const isNowCancelled = editFormData.status === "cancelled";

      if (isNowConfirmed && !wasConfirmed) {
        try {
          const confRes = await fetch("/api/email/gig-confirmation", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              gigId: editingGig.id,
              gigTitle: editFormData.title.trim(),
              date: editFormData.date,
              callTime: editFormData.callTime || "TBD",
              downbeat: editFormData.downbeat || "TBD",
              venue: editFormData.venue.trim(),
              address: editFormData.venueAddress.trim() || editFormData.venue.trim(),
              attire: editFormData.attire.trim(),
              notes: editFormData.description.trim(),
              actorUid: profile?.uid,
            }),
          });
          const confData = await confRes.json();
          if (confRes.ok && confData.success) {
            const count = confData.recipientCount || 0;
            const hiCount = confData.hiatusCount || 0;
            if (count > 0) {
              toast.success(
                `Gig confirmed! Confirmation dispatch sent to ${count} musician(s)${
                  hiCount > 0 ? ` (${hiCount} on hiatus skipped)` : ""
                }.`
              );
            }
          }
        } catch (confErr) {
          console.warn("Notice: confirmation dispatch post gig update:", confErr);
        }
      }

      // Trigger 3: If a confirmed gig is canceled, notify members it's not happening.
      if (wasConfirmed && isNowCancelled) {
        try {
          const cancelRes = await fetch("/api/email/gig-cancellation", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              gigId: editingGig.id,
              gigTitle: editFormData.title.trim(),
              date: editFormData.date,
              callTime: editFormData.callTime || "TBD",
              venue: editFormData.venue.trim(),
              reason: editFormData.description.trim() || "The performance has been called off.",
              actorUid: profile?.uid,
            }),
          });
          const cancelData = await cancelRes.json();
          if (cancelRes.ok && cancelData.success) {
            const count = cancelData.recipientCount || 0;
            if (count > 0) {
              toast.info(`Gig cancelled: Cancellation notice dispatched to ${count} active musician(s).`);
            }
          }
        } catch (cancelErr) {
          console.warn("Notice: cancellation dispatch post gig update:", cancelErr);
        }
      }

      setEditingGig(null);
      toast.success("Performance details updated successfully!");
    } catch (err) {
      toast.error("Failed to update gig: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDispatchConfirmationNow = async (gig: GigItem) => {
    setDispatchingConfirmationId(gig.id);
    try {
      const gigTitle = gig.internalLogistics?.title || gig.publicDetails?.title || "Gig";
      const res = await fetch("/api/email/gig-confirmation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gigId: gig.id,
          gigTitle,
          date: gig.date,
          callTime: gig.internalLogistics?.callTime || "TBD",
          downbeat: gig.internalLogistics?.downbeat || "TBD",
          venue: gig.publicDetails?.venue || "",
          address: gig.publicDetails?.venueAddress || gig.publicDetails?.venue || "",
          attire: gig.internalLogistics?.attire || "",
          notes: gig.publicDetails?.description || gig.internalLogistics?.parkingNotes || "",
          actorUid: profile?.uid,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to dispatch confirmation emails");
      }
      if (data.recipientCount > 0) {
        toast.success(
          `Confirmation email sent to ${data.recipientCount} confirmed attendee(s) marked 'in'!${
            data.hiatusCount > 0 ? ` (${data.hiatusCount} on hiatus skipped)` : ""
          }`
        );
      } else {
        toast.info(data.message || "No confirmed attendees marked 'in' to dispatch.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setDispatchingConfirmationId(null);
    }
  };

  const handleDeleteGig = async (id: string, title: string) => {
    if (!confirm(`Delete performance "${title}" and all its call sheets?`)) return;
    try {
      const targetGig = gigs.find((g) => g.id === id);
      const wasConfirmed = targetGig?.status === "confirmed";

      await deleteDoc(doc(db, "gigs", id));

      // Trigger 3: If deleting a confirmed gig, notify members so they know it's called off
      if (wasConfirmed && targetGig) {
        try {
          await fetch("/api/email/gig-cancellation", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              gigId: id,
              gigTitle: targetGig.publicDetails?.title || title,
              date: targetGig.date || "",
              venue: targetGig.publicDetails?.venue || "",
              reason: "Performance has been removed from the calendar.",
              actorUid: profile?.uid,
            }),
          });
        } catch (cErr) {
          console.warn("Notice: cancellation dispatch on delete:", cErr);
        }
      }

      toast.success(`Performance "${title}" deleted.`);
    } catch (err) {
      toast.error("Failed to delete gig: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleRemoveGigSetlist = async (gigItem: GigItem) => {
    const gigTitle = gigItem.publicDetails?.title || gigItem.id;
    if (!confirm(`Remove the setlist from "${gigTitle}" and start fresh with an empty setlist?`)) {
      return;
    }

    try {
      // 1. Clear setlist in gigs/{gigId}
      await setDoc(
        doc(db, "gigs", gigItem.id),
        {
          setlistId: null,
          setlistName: "",
          setlistTitle: "",
          setlist: [],
          internalLogistics: {
            setlistId: null,
            setlistName: "",
            setlistTitle: "",
          },
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      // 2. Empty live stage view setlist document
      await setDoc(
        doc(db, "setlists", gigItem.id),
        {
          gigId: gigItem.id,
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

      // 3. Unlink from previous reusable template if assigned
      const prevTemplateId = gigItem.setlistId || gigItem.internalLogistics?.setlistId;
      if (prevTemplateId && fullSetlists[prevTemplateId]) {
        const currentAssigned = fullSetlists[prevTemplateId].assignedGigIds || [];
        const updatedAssigned = currentAssigned.filter((gid) => gid !== gigItem.id);
        await setDoc(
          doc(db, "setlists", prevTemplateId),
          {
            assignedGigIds: updatedAssigned,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      }

      toast.success(`Setlist removed from "${gigTitle}".`);
    } catch (err) {
      toast.error("Failed to remove setlist: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-xl">
        <div className="space-y-1">
          <PortalBreadcrumb className="mb-2" />
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-yellow-400 bg-slate-950 px-2.5 py-0.5 rounded border border-slate-800">
              Admin Studio
            </span>
            <span className="text-xs font-mono text-slate-400">
              {gigs.length} Performance(s)
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Gig Studio</h1>
          <p className="text-xs text-slate-400">
            Publish call sheets, assign logistics, set compensation, and track musician attendance.
          </p>
        </div>

        {!isCreating && (
          <button
            type="button"
            onClick={() => setIsCreating(true)}
            className="bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition shadow shrink-0"
          >
            <Plus className="w-4 h-4" /> Create New Gig
          </button>
        )}
      </div>

      {isCreating && (
        <form
          onSubmit={handleCreateGig}
          className="bg-slate-900 border border-yellow-400/30 rounded-2xl p-5 space-y-4 shadow-xl"
        >
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-yellow-400" /> New Performance Call Sheet
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
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">Gig Title *</label>
              <input
                type="text"
                required
                placeholder="e.g. Penn Avenue Porchfest Finale"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400"
              />
            </div>

            <div>
              <DatePicker
                label="Date"
                required
                value={formData.date}
                onChange={(date) => setFormData({ ...formData, date })}
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as GigItem["status"] })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400"
              >
                <option value="draft">Draft (Unpublished)</option>
                <option value="confirmed">Confirmed & Dispatched</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 flex items-start gap-2.5">
            <ListMusic className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
            <div className="text-xs text-slate-400 leading-relaxed">
              <span className="text-slate-200 font-semibold block mb-0.5">Empty Setlist on Creation</span>
              Every new gig starts with an empty setlist. After creating, use the gig card to assign a saved library setlist or build a unique setlist for this gig.
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">Venue Name</label>
              <input
                type="text"
                placeholder="e.g. 43rd & Butler Street Stage"
                value={formData.venue}
                onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">Venue Address / Intersection</label>
              <input
                type="text"
                placeholder="e.g. 43rd & Butler, Pittsburgh, PA"
                value={formData.venueAddress}
                onChange={(e) => setFormData({ ...formData, venueAddress: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-300 block mb-1">
              Event Link (External URL)
            </label>
            <input
              type="url"
              placeholder="e.g. https://facebook.com/events/... or https://eventbrite.com/..."
              value={formData.eventUrl}
              onChange={(e) => setFormData({ ...formData, eventUrl: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400"
            />
            <span className="text-[10px] text-slate-500 mt-1 block">
              Optional external page for the event. If left empty, no event link button is displayed on the public site.
            </span>
          </div>

          {/* Custom Image Header Banner Selection */}
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-yellow-400 shrink-0" />
                <div>
                  <span className="text-xs font-semibold text-slate-200 block">
                    Custom Image Header (Optional)
                  </span>
                  <span className="text-[10px] text-slate-400 block">
                    Displays across the top of this gig&apos;s public page, aligning with content width.
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setAssetPickerTarget("create");
                  setIsAssetPickerOpen(true);
                }}
                className="px-2.5 py-1.5 bg-yellow-400/10 hover:bg-yellow-400/20 text-yellow-400 border border-yellow-400/30 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shrink-0"
                title="Choose from Resource Library"
              >
                <FolderOpen className="w-3.5 h-3.5" />
                <span>Resource Library</span>
              </button>
            </div>

            <div className="flex gap-2">
              <input
                type="url"
                placeholder="https://... or select from Resource Library"
                value={formData.headerImageUrl}
                onChange={(e) => setFormData({ ...formData, headerImageUrl: e.target.value })}
                className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400 font-mono"
              />
              {formData.headerImageUrl && (
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, headerImageUrl: "", headerImageAlt: "" })}
                  className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-rose-400 border border-slate-800 rounded-lg text-xs font-semibold transition flex items-center gap-1"
                  title="Remove Header Image"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {formData.headerImageUrl && (
              <div className="space-y-3 pt-2 border-t border-slate-800/80">
                {/* Live Preview Thumbnail */}
                <div 
                  className={`relative w-full rounded-xl overflow-hidden border border-slate-800 bg-slate-900 ${
                    formData.headerImageHeightPreset === "compact"
                      ? "h-28"
                      : formData.headerImageHeightPreset === "cinematic"
                      ? "h-44"
                      : "h-36"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={formData.headerImageUrl}
                    alt={formData.headerImageAlt || "Header Preview"}
                    className="w-full h-full object-cover"
                    style={{ objectPosition: `center ${formData.headerImageVerticalPosition}%` }}
                  />
                  {formData.headerImageOverlayOpacity > 0 && (
                    <div
                      className="absolute inset-0"
                      style={{ backgroundColor: `rgba(2, 6, 23, ${formData.headerImageOverlayOpacity / 100})` }}
                    />
                  )}
                  <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-slate-950/80 text-[10px] font-mono text-slate-300 border border-slate-800">
                    Live Banner Preview
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                      Image Alt Text / Caption
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Band marching at Millvale Days"
                      value={formData.headerImageAlt}
                      onChange={(e) => setFormData({ ...formData, headerImageAlt: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                      Height Preset
                    </label>
                    <div className="grid grid-cols-3 gap-1">
                      {[
                        { id: "compact", label: "Compact" },
                        { id: "standard", label: "Standard" },
                        { id: "cinematic", label: "Cinematic" },
                      ].map((preset) => (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => setFormData({ ...formData, headerImageHeightPreset: preset.id as "compact" | "standard" | "cinematic" })}
                          className={`py-1 px-1.5 rounded text-[11px] font-semibold border transition ${
                            formData.headerImageHeightPreset === preset.id
                              ? "bg-yellow-400 text-slate-950 border-yellow-400 font-bold"
                              : "bg-slate-900 text-slate-400 border-slate-800 hover:text-white"
                          }`}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Vertical Focal Point & Overlay */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                      <span>Focal Position</span>
                      <span className="text-yellow-400 font-mono">{formData.headerImageVerticalPosition}%</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {[
                        { label: "Top", pos: 0, icon: ArrowUp },
                        { label: "Center", pos: 50, icon: MoveVertical },
                        { label: "Bottom", pos: 100, icon: ArrowDown },
                      ].map((btn) => (
                        <button
                          key={btn.label}
                          type="button"
                          onClick={() => setFormData({ ...formData, headerImageVerticalPosition: btn.pos })}
                          className={`flex-1 py-1 px-1 rounded text-[10px] font-bold border transition flex items-center justify-center gap-1 ${
                            formData.headerImageVerticalPosition === btn.pos
                              ? "bg-yellow-400 text-slate-950 border-yellow-400"
                              : "bg-slate-900 text-slate-400 border-slate-800 hover:text-white"
                          }`}
                        >
                          <btn.icon className="w-3 h-3" />
                          <span>{btn.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                      <span>Dark Tint Overlay</span>
                      <span className="text-yellow-400 font-mono">{formData.headerImageOverlayOpacity}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={90}
                      step={5}
                      value={formData.headerImageOverlayOpacity}
                      onChange={(e) => setFormData({ ...formData, headerImageOverlayOpacity: parseInt(e.target.value, 10) || 0 })}
                      className="w-full accent-yellow-400 cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Public Site Visibility Toggle */}
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Globe className="w-4 h-4 text-sky-400 shrink-0" />
                <div>
                  <span className="text-xs font-semibold text-slate-200 block">
                    Public Site Visibility
                  </span>
                  <span className="text-[11px] text-slate-400 block">
                    Display on public schedule (/gigs) & calendar
                  </span>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={formData.isPublic}
                  onChange={(e) => setFormData({ ...formData, isPublic: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-sky-500"></div>
              </label>
            </div>

            {/* 1-Click External Navigation */}
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Navigation className="w-4 h-4 text-yellow-400 shrink-0" />
                <div>
                  <span className="text-xs font-semibold text-slate-200 block">
                    1-Click Navigation
                  </span>
                  <span className="text-[11px] text-slate-400 block">
                    Show Google/Apple Maps buttons on event map
                  </span>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={formData.showExternalDirections}
                  onChange={(e) => setFormData({ ...formData, showExternalDirections: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-yellow-400"></div>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <TimePicker
                label="Call Time"
                value={formData.callTime}
                onChange={(callTime) => setFormData({ ...formData, callTime })}
              />
            </div>
            <div>
              <TimePicker
                label="Downbeat"
                value={formData.downbeat}
                onChange={(downbeat) => setFormData({ ...formData, downbeat })}
              />
            </div>
          </div>

          <div className="space-y-3 p-3.5 rounded-xl bg-slate-950/70 border border-slate-800">
            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1.5 uppercase tracking-wider">
                Compensation Model
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, compensationType: "community", compensation: 0, totalFee: 0 })}
                  className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition border ${
                    formData.compensationType === "community"
                      ? "bg-sky-500/20 text-sky-300 border-sky-500/40 shadow-sm"
                      : "bg-slate-900 text-slate-400 border-slate-800 hover:text-white"
                  }`}
                >
                  <Heart className="w-3.5 h-3.5" />
                  <span>Community</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, compensationType: "band_fund", compensation: 0 })}
                  className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition border ${
                    formData.compensationType === "band_fund"
                      ? "bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm"
                      : "bg-slate-900 text-slate-400 border-slate-800 hover:text-white"
                  }`}
                >
                  <Landmark className="w-3.5 h-3.5" />
                  <span>Band Fund</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({
                    ...formData,
                    compensationType: "individual",
                    compensation: formData.compensation > 0 ? formData.compensation : 50
                  })}
                  className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition border ${
                    formData.compensationType === "individual"
                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm"
                      : "bg-slate-900 text-slate-400 border-slate-800 hover:text-white"
                  }`}
                >
                  <DollarSign className="w-3.5 h-3.5" />
                  <span>Individual</span>
                </button>
              </div>
            </div>

            {formData.compensationType === "community" && (
              <div className="p-2.5 rounded-lg bg-sky-500/10 border border-sky-500/20 text-[11px] text-sky-300 flex items-center gap-2">
                <Heart className="w-4 h-4 shrink-0 text-sky-400" />
                <span>
                  <strong>Community / Volunteer:</strong> $0 client intake, $0 musician payout. Band members volunteer for civic festivals and community celebrations.
                </span>
              </div>
            )}

            {formData.compensationType === "band_fund" && (
              <div className="space-y-2 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <div className="text-[11px] text-amber-300 flex items-center gap-2">
                  <Landmark className="w-4 h-4 shrink-0 text-amber-400" />
                  <span>
                    <strong>100% to Band Fund:</strong> All client fee revenue is directed to the band treasury to fund gear, recording, and tours ($0 individual payout).
                  </span>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">Total Client Fee ($)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 1500"
                    value={formData.totalFee || ""}
                    onChange={(e) => setFormData({ ...formData, totalFee: parseInt(e.target.value, 10) || 0 })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-yellow-400"
                  />
                </div>
              </div>
            )}

            {formData.compensationType === "individual" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">Musician Payout ($ per musician)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 50"
                    value={formData.compensation}
                    onChange={(e) => setFormData({ ...formData, compensation: parseInt(e.target.value, 10) || 0 })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-yellow-400"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">Total Client Fee ($ optional)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 1000"
                    value={formData.totalFee || ""}
                    onChange={(e) => setFormData({ ...formData, totalFee: parseInt(e.target.value, 10) || 0 })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-yellow-400"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Manual Availability Dispatch Option (Defaults to false) */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 flex items-start justify-between gap-3">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-purple-400" />
                Dispatch Availability Request to Members Now (Manual)
              </span>
              <span className="text-[11px] text-slate-400 block leading-relaxed">
                Automatic availability requests are only dispatched when public leads are converted to gigs. Check this box if you want to notify musicians immediately upon creating this draft gig.
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-0.5">
              <input
                type="checkbox"
                checked={formData.dispatchAvailability}
                onChange={(e) => setFormData({ ...formData, dispatchAvailability: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-500"></div>
            </label>
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
              {isSaving ? "Saving..." : "Create Performance"}
            </button>
          </div>
        </form>
      )}

      {/* Edit Gig Modal */}
      {editingGig && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-hidden">
          <form
            onSubmit={handleUpdateGig}
            className="bg-slate-900 border border-yellow-400/40 rounded-3xl shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
          >
            {/* Modal Header (Pinned at Top) */}
            <div className="flex items-center justify-between border-b border-slate-800 p-4 sm:p-5 bg-slate-950/60 shrink-0">
              <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-yellow-400" /> Edit Performance: {editingGig.publicDetails?.title || editingGig.internalLogistics?.title || editingGig.id}
              </h2>
              <button
                type="button"
                onClick={() => setEditingGig(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                aria-label="Close edit modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 [scrollbar-width:thin] [scrollbar-color:rgba(148,163,184,0.3)_transparent] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-700/80 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-yellow-400/60">

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">Gig Title *</label>
                <input
                  type="text"
                  required
                  value={editFormData.title}
                  onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400"
                />
              </div>

              <div>
                <DatePicker
                  label="Date"
                  required
                  value={editFormData.date}
                  onChange={(date) => setEditFormData({ ...editFormData, date })}
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">Status</label>
                <select
                  value={editFormData.status}
                  onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value as GigItem["status"] })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400"
                >
                  <option value="draft">Draft (Unpublished)</option>
                  <option value="confirmed">Confirmed & Dispatched</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">Assigned Setlist</label>
                <select
                  value={editFormData.setlistId}
                  onChange={(e) => setEditFormData({ ...editFormData, setlistId: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400"
                >
                  <option value="">No setlist assigned</option>
                  {editFormData.setlistId && !setlistMap[editFormData.setlistId] && (
                    <option value={editFormData.setlistId}>
                      {editingGig?.setlistName || editingGig?.setlistTitle || editingGig?.internalLogistics?.setlistName || "Currently Assigned Setlist"}
                    </option>
                  )}
                  {Object.entries(setlistMap).map(([id, sl]) => (
                    <option key={id} value={id}>
                      {sl.name} ({sl.tuneCount} charts)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">Venue Name</label>
                <input
                  type="text"
                  placeholder="e.g. 43rd & Butler Street Stage"
                  value={editFormData.venue}
                  onChange={(e) => setEditFormData({ ...editFormData, venue: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">Venue Address / Intersection</label>
                <input
                  type="text"
                  placeholder="e.g. 43rd & Butler, Pittsburgh, PA"
                  value={editFormData.venueAddress}
                  onChange={(e) => setEditFormData({ ...editFormData, venueAddress: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                Event Link (External URL)
              </label>
              <input
                type="url"
                placeholder="e.g. https://facebook.com/events/... or https://eventbrite.com/..."
                value={editFormData.eventUrl}
                onChange={(e) => setEditFormData({ ...editFormData, eventUrl: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">
                Optional external page for the event. If left empty, no event link button is displayed on the public site.
              </span>
            </div>

            {/* Custom Image Header Banner Selection */}
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-yellow-400 shrink-0" />
                  <div>
                    <span className="text-xs font-semibold text-slate-200 block">
                      Custom Image Header (Optional)
                    </span>
                    <span className="text-[10px] text-slate-400 block">
                      Displays across the top of this gig&apos;s public page, aligning with content width.
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setAssetPickerTarget("edit");
                    setIsAssetPickerOpen(true);
                  }}
                  className="px-2.5 py-1.5 bg-yellow-400/10 hover:bg-yellow-400/20 text-yellow-400 border border-yellow-400/30 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shrink-0"
                  title="Choose from Resource Library"
                >
                  <FolderOpen className="w-3.5 h-3.5" />
                  <span>Resource Library</span>
                </button>
              </div>

              <div className="flex gap-2">
                <input
                  type="url"
                  placeholder="https://... or select from Resource Library"
                  value={editFormData.headerImageUrl}
                  onChange={(e) => setEditFormData({ ...editFormData, headerImageUrl: e.target.value })}
                  className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400 font-mono"
                />
                {editFormData.headerImageUrl && (
                  <button
                    type="button"
                    onClick={() => setEditFormData({ ...editFormData, headerImageUrl: "", headerImageAlt: "" })}
                    className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-rose-400 border border-slate-800 rounded-lg text-xs font-semibold transition flex items-center gap-1"
                    title="Remove Header Image"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {editFormData.headerImageUrl && (
                <div className="space-y-3 pt-2 border-t border-slate-800/80">
                  {/* Live Preview Thumbnail */}
                  <div 
                    className={`relative w-full rounded-xl overflow-hidden border border-slate-800 bg-slate-900 ${
                      editFormData.headerImageHeightPreset === "compact"
                        ? "h-28"
                        : editFormData.headerImageHeightPreset === "cinematic"
                        ? "h-44"
                        : "h-36"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={editFormData.headerImageUrl}
                      alt={editFormData.headerImageAlt || "Header Preview"}
                      className="w-full h-full object-cover"
                      style={{ objectPosition: `center ${editFormData.headerImageVerticalPosition}%` }}
                    />
                    {editFormData.headerImageOverlayOpacity > 0 && (
                      <div
                        className="absolute inset-0"
                        style={{ backgroundColor: `rgba(2, 6, 23, ${editFormData.headerImageOverlayOpacity / 100})` }}
                      />
                    )}
                    <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-slate-950/80 text-[10px] font-mono text-slate-300 border border-slate-800">
                      Live Banner Preview
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                        Image Alt Text / Caption
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Band marching at Millvale Days"
                        value={editFormData.headerImageAlt}
                        onChange={(e) => setEditFormData({ ...editFormData, headerImageAlt: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                        Height Preset
                      </label>
                      <div className="grid grid-cols-3 gap-1">
                        {[
                          { id: "compact", label: "Compact" },
                          { id: "standard", label: "Standard" },
                          { id: "cinematic", label: "Cinematic" },
                        ].map((preset) => (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() => setEditFormData({ ...editFormData, headerImageHeightPreset: preset.id as "compact" | "standard" | "cinematic" })}
                            className={`py-1 px-1.5 rounded text-[11px] font-semibold border transition ${
                              editFormData.headerImageHeightPreset === preset.id
                                ? "bg-yellow-400 text-slate-950 border-yellow-400 font-bold"
                                : "bg-slate-900 text-slate-400 border-slate-800 hover:text-white"
                            }`}
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Vertical Focal Point & Overlay */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                        <span>Focal Position</span>
                        <span className="text-yellow-400 font-mono">{editFormData.headerImageVerticalPosition}%</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {[
                          { label: "Top", pos: 0, icon: ArrowUp },
                          { label: "Center", pos: 50, icon: MoveVertical },
                          { label: "Bottom", pos: 100, icon: ArrowDown },
                        ].map((btn) => (
                          <button
                            key={btn.label}
                            type="button"
                            onClick={() => setEditFormData({ ...editFormData, headerImageVerticalPosition: btn.pos })}
                            className={`flex-1 py-1 px-1 rounded text-[10px] font-bold border transition flex items-center justify-center gap-1 ${
                              editFormData.headerImageVerticalPosition === btn.pos
                                ? "bg-yellow-400 text-slate-950 border-yellow-400"
                                : "bg-slate-900 text-slate-400 border-slate-800 hover:text-white"
                            }`}
                          >
                            <btn.icon className="w-3 h-3" />
                            <span>{btn.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                        <span>Dark Tint Overlay</span>
                        <span className="text-yellow-400 font-mono">{editFormData.headerImageOverlayOpacity}%</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={90}
                        step={5}
                        value={editFormData.headerImageOverlayOpacity}
                        onChange={(e) => setEditFormData({ ...editFormData, headerImageOverlayOpacity: parseInt(e.target.value, 10) || 0 })}
                        className="w-full accent-yellow-400 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Public Site Visibility Toggle */}
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Globe className="w-4 h-4 text-sky-400 shrink-0" />
                <div>
                  <span className="text-xs font-semibold text-slate-200 block">
                    Public Site Visibility
                  </span>
                  <span className="text-[11px] text-slate-400 block">
                    Display on public schedule (/gigs) & calendar
                  </span>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={editFormData.isPublic}
                  onChange={(e) => setEditFormData({ ...editFormData, isPublic: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-sky-500"></div>
              </label>
            </div>

            {/* 1-Click Navigation Toggle in Edit Modal */}
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Navigation className="w-4 h-4 text-yellow-400 shrink-0" />
                <div>
                  <span className="text-xs font-semibold text-slate-200 block">
                    1-Click External Navigation
                  </span>
                  <span className="text-[11px] text-slate-400 block">
                    Show Google/Apple Maps buttons on event map
                  </span>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={editFormData.showExternalDirections}
                  onChange={(e) => setEditFormData({ ...editFormData, showExternalDirections: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-yellow-400"></div>
              </label>
            </div>
          </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <TimePicker
                  label="Call Time"
                  value={editFormData.callTime}
                  onChange={(callTime) => setEditFormData({ ...editFormData, callTime })}
                />
              </div>
              <div>
                <TimePicker
                  label="Downbeat"
                  value={editFormData.downbeat}
                  onChange={(downbeat) => setEditFormData({ ...editFormData, downbeat })}
                />
              </div>
            </div>

            <div className="space-y-3 p-3.5 rounded-xl bg-slate-950/70 border border-slate-800">
              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1.5 uppercase tracking-wider">
                  Compensation Model
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditFormData({ ...editFormData, compensationType: "community", compensation: 0, totalFee: 0 })}
                    className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition border ${
                      editFormData.compensationType === "community"
                        ? "bg-sky-500/20 text-sky-300 border-sky-500/40 shadow-sm"
                        : "bg-slate-900 text-slate-400 border-slate-800 hover:text-white"
                    }`}
                  >
                    <Heart className="w-3.5 h-3.5" />
                    <span>Community</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditFormData({ ...editFormData, compensationType: "band_fund", compensation: 0 })}
                    className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition border ${
                      editFormData.compensationType === "band_fund"
                        ? "bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm"
                        : "bg-slate-900 text-slate-400 border-slate-800 hover:text-white"
                    }`}
                  >
                    <Landmark className="w-3.5 h-3.5" />
                    <span>Band Fund</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditFormData({
                      ...editFormData,
                      compensationType: "individual",
                      compensation: editFormData.compensation > 0 ? editFormData.compensation : 50
                    })}
                    className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition border ${
                      editFormData.compensationType === "individual"
                        ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm"
                        : "bg-slate-900 text-slate-400 border-slate-800 hover:text-white"
                    }`}
                  >
                    <DollarSign className="w-3.5 h-3.5" />
                    <span>Individual</span>
                  </button>
                </div>
              </div>

              {editFormData.compensationType === "community" && (
                <div className="p-2.5 rounded-lg bg-sky-500/10 border border-sky-500/20 text-[11px] text-sky-300 flex items-center gap-2">
                  <Heart className="w-4 h-4 shrink-0 text-sky-400" />
                  <span>
                    <strong>Community / Volunteer:</strong> $0 client intake, $0 musician payout. Band members volunteer for civic festivals and community celebrations.
                  </span>
                </div>
              )}

              {editFormData.compensationType === "band_fund" && (
                <div className="space-y-2 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <div className="text-[11px] text-amber-300 flex items-center gap-2">
                    <Landmark className="w-4 h-4 shrink-0 text-amber-400" />
                    <span>
                      <strong>100% to Band Fund:</strong> All client fee revenue is directed to the band treasury to fund gear, recording, and tours ($0 individual payout).
                    </span>
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-300 block mb-1">Total Client Fee ($)</label>
                    <input
                      type="number"
                      min="0"
                      placeholder="e.g. 1500"
                      value={editFormData.totalFee || ""}
                      onChange={(e) => setEditFormData({ ...editFormData, totalFee: parseInt(e.target.value, 10) || 0 })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-yellow-400"
                    />
                  </div>
                </div>
              )}

              {editFormData.compensationType === "individual" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-300 block mb-1">Musician Payout ($ per musician)</label>
                    <input
                      type="number"
                      min="0"
                      placeholder="e.g. 50"
                      value={editFormData.compensation}
                      onChange={(e) => setEditFormData({ ...editFormData, compensation: parseInt(e.target.value, 10) || 0 })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-yellow-400"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-300 block mb-1">Total Client Fee ($ optional)</label>
                    <input
                      type="number"
                      min="0"
                      placeholder="e.g. 1000"
                      value={editFormData.totalFee || ""}
                      onChange={(e) => setEditFormData({ ...editFormData, totalFee: parseInt(e.target.value, 10) || 0 })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-yellow-400"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Automated Dispatch Indicators & Controls */}
            {editingGig.status !== "confirmed" && editFormData.status === "confirmed" && (
              <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-xl p-3.5 space-y-1.5">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="text-xs font-bold text-emerald-200">
                    Automatic Confirmation Dispatch on Save
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Saving this performance as <strong>Confirmed</strong> will automatically dispatch an official confirmation email to active musicians so they know the gig is happening.
                </p>
              </div>
            )}

            {editingGig.status === "confirmed" && editFormData.status === "confirmed" && (
              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      Confirmed Performance — Edits Saved Without Auto-Dispatch
                    </span>
                    <span className="text-[11px] text-slate-400 block leading-relaxed">
                      Routine edits to times, locations, or notes do not blast musicians automatically. To dispatch call sheet revisions, use the manual button below or Dispatch Studio.
                    </span>
                  </div>
                  <button
                    type="button"
                    disabled={Boolean(dispatchingConfirmationId)}
                    onClick={() => handleDispatchConfirmationNow(editingGig)}
                    className="text-[11px] text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1 bg-emerald-500/10 hover:bg-emerald-500/20 px-3 py-1.5 rounded-lg border border-emerald-500/30 transition disabled:opacity-50 shrink-0 self-start sm:self-auto cursor-pointer"
                  >
                    {dispatchingConfirmationId === editingGig.id ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Send className="w-3 h-3" />
                    )}
                    <span>Dispatch Update Now (Manual)</span>
                  </button>
                </div>
              </div>
            )}

            {editingGig.status === "confirmed" && editFormData.status === "cancelled" && (
              <div className="bg-rose-950/40 border border-rose-500/40 rounded-xl p-3.5 space-y-1.5">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span className="text-xs font-bold text-rose-200">
                    Automatic Cancellation Notice on Save
                  </span>
                </div>
                <p className="text-[11px] text-rose-200/80 leading-relaxed">
                  Saving this performance as <strong>Cancelled</strong> will automatically dispatch a cancellation alert to committed musicians so they know the performance is called off.
                </p>
              </div>
            )}
          </div>

          {/* Modal Footer (Pinned at Bottom) */}
            <div className="flex justify-end gap-2.5 p-4 border-t border-slate-800 bg-slate-950/80 shrink-0">
              <button
                type="button"
                onClick={() => setEditingGig(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold px-5 py-2 rounded-xl text-xs flex items-center gap-1.5 transition disabled:opacity-50 shadow-md cursor-pointer"
              >
                {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                {isSaving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search, Filter & Sort Ribbon */}
      <div 
        style={{ backgroundColor: "var(--ebb-surface)", borderColor: "var(--ebb-border)" }}
        className="border rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-3 shadow-md"
      >
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search gigs, venues, setlists, dates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ backgroundColor: "var(--ebb-surface-muted)", borderColor: "var(--ebb-border)" }}
            className="w-full border rounded-xl pl-9 pr-8 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400 font-medium"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filters and Sort Controls */}
        <div className="flex items-center gap-2 flex-wrap w-full md:w-auto justify-between md:justify-end">
          {/* Status Filter Pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => setStatusFilter("all")}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                statusFilter === "all"
                  ? "bg-yellow-400 text-slate-950 shadow-sm"
                  : "text-slate-400 hover:text-white bg-slate-800/50"
              }`}
            >
              All ({counts.all})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("upcoming")}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                statusFilter === "upcoming"
                  ? "bg-yellow-400 text-slate-950 shadow-sm"
                  : "text-slate-400 hover:text-white bg-slate-800/50"
              }`}
            >
              Upcoming ({counts.upcoming})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("completed")}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                statusFilter === "completed"
                  ? "bg-yellow-400 text-slate-950 shadow-sm"
                  : "text-slate-400 hover:text-white bg-slate-800/50"
              }`}
            >
              Completed ({counts.completed})
            </button>
          </div>

          {/* Date Sort Toggle Button */}
          <div className="flex items-center gap-1.5 border-l border-slate-800 pl-2">
            <button
              type="button"
              onClick={() => setSortDirection((prev) => (prev === "desc" ? "asc" : "desc"))}
              title={`Sorting by date ${sortDirection === "desc" ? "Descending (Newest first)" : "Ascending (Oldest first)"}. Click to toggle.`}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold text-slate-300 hover:text-white bg-slate-800/70 hover:bg-slate-700 border border-slate-700/80 transition cursor-pointer"
            >
              {sortDirection === "desc" ? (
                <ArrowDown className="w-3.5 h-3.5 text-yellow-400" />
              ) : (
                <ArrowUp className="w-3.5 h-3.5 text-yellow-400" />
              )}
              <span>Date {sortDirection === "desc" ? "Desc (Newest)" : "Asc (Oldest)"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Gig Grid or Empty State */}
      {filteredGigs.length === 0 ? (
        <div 
          style={{ backgroundColor: "var(--ebb-surface)", borderColor: "var(--ebb-border)" }}
          className="border rounded-3xl p-12 text-center space-y-3"
        >
          <Calendar className="w-10 h-10 text-slate-500 mx-auto" />
          <h3 className="text-base font-bold text-white">No performances found</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            {searchQuery || statusFilter !== "all"
              ? "No gigs match your current search or status filter. Try clearing filters or altering search keywords."
              : "No performances exist yet. Create a new gig call sheet to get started."}
          </p>
          {(searchQuery || statusFilter !== "all") && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setStatusFilter("all");
              }}
              className="bg-slate-800 hover:bg-slate-700 text-yellow-400 text-xs font-bold px-3.5 py-1.5 rounded-xl transition border border-slate-700 cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredGigs.map((g) => (
          <div
            key={g.id}
            className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 space-y-4 shadow transition flex flex-col justify-between"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className={`text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                    g.status === "confirmed"
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                      : g.status === "completed"
                      ? "bg-slate-800 text-slate-400 border-slate-700"
                      : "bg-yellow-500/10 text-yellow-400 border-yellow-500/30"
                  }`}>
                    {g.status}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleTogglePublicVisibility(g.id, g.publicDetails?.isPublic)}
                    title={
                      g.publicDetails?.isPublic !== false
                        ? "Publicly visible on eagleburgerband.com. Click to make private."
                        : "Private internal-only gig. Click to make publicly visible."
                    }
                    className={`text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded border transition flex items-center gap-1 ${
                      g.publicDetails?.isPublic !== false
                        ? "bg-sky-500/10 text-sky-400 border-sky-500/30 hover:bg-sky-500/20"
                        : "bg-rose-500/10 text-rose-400 border-rose-500/30 hover:bg-rose-500/20"
                    }`}
                  >
                    {g.publicDetails?.isPublic !== false ? (
                      <>
                        <Globe className="w-3 h-3 text-sky-400" />
                        <span>Public</span>
                      </>
                    ) : (
                      <>
                        <EyeOff className="w-3 h-3 text-rose-400" />
                        <span>Private</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(g)}
                    className="text-slate-500 hover:text-yellow-400 p-1 rounded transition"
                    title="Edit performance details & map navigation"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteGig(g.id, g.publicDetails?.title || g.id)}
                    className="text-slate-500 hover:text-rose-400 p-1 rounded transition"
                    title="Delete gig"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {g.publicDetails?.headerImageUrl && (
                <div className="relative w-full h-24 rounded-xl overflow-hidden border border-slate-800 bg-slate-950 mb-1">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={g.publicDetails.headerImageUrl}
                    alt={g.publicDetails.headerImageAlt || g.publicDetails.title || "Header"}
                    className="w-full h-full object-cover"
                    style={{ objectPosition: `center ${g.publicDetails.headerImageVerticalPosition ?? 50}%` }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent pointer-events-none" />
                  <span className="absolute bottom-1.5 left-2 px-1.5 py-0.5 rounded bg-slate-950/80 text-[9px] font-mono font-bold text-yellow-400 border border-slate-800 flex items-center gap-1 backdrop-blur-sm">
                    <ImageIcon className="w-2.5 h-2.5" />
                    <span>Header Banner</span>
                  </span>
                </div>
              )}

              <h2 className="text-base font-bold text-white truncate">
                {g.publicDetails?.title || g.id}
              </h2>

              <div className="space-y-1 text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
                  <span>{g.date}</span>
                </div>
                {g.publicDetails?.venue && (
                  <div className="flex items-center gap-2 truncate">
                    <MapPin className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
                    <span className="truncate">{g.publicDetails.venue}</span>
                  </div>
                )}
                {(() => {
                  const compType =
                    g.internalLogistics?.compensationType ||
                    g.financials?.compensationType ||
                    ((Number(g.internalLogistics?.compensation) || 0) > 0 ? "individual" : "community");

                  if (compType === "community") {
                    return (
                      <div className="pt-1">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/20">
                          <Heart className="w-3 h-3 text-sky-400" />
                          <span>Community (Volunteer / $0 intake)</span>
                        </span>
                      </div>
                    );
                  }
                  if (compType === "band_fund") {
                    const fee = g.financials?.totalFee || g.financials?.bandFundCut || 0;
                    return (
                      <div className="pt-1">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          <Landmark className="w-3 h-3 text-amber-400" />
                          <span>100% to Band Fund {fee > 0 ? `($${fee} fee)` : ""}</span>
                        </span>
                      </div>
                    );
                  }
                  const payout = g.internalLogistics?.compensation || g.financials?.fixedPerformerAmount || 0;
                  return (
                    <div className="pt-1">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <DollarSign className="w-3 h-3 text-emerald-400" />
                        <span>Individual (${payout} / musician)</span>
                      </span>
                    </div>
                  );
                })()}
              </div>

              {/* Performance Setlist Strip */}
              {(() => {
                const effectiveId = g.setlistId || g.internalLogistics?.setlistId;
                const mappedTemplate = effectiveId && setlistMap[effectiveId] ? setlistMap[effectiveId] : null;
                const rawTitle =
                  g.setlistName ||
                  g.setlistTitle ||
                  g.internalLogistics?.setlistName ||
                  g.internalLogistics?.setlistTitle ||
                  (mappedTemplate ? mappedTemplate.name : "");

                // Check for grouped set name (legacy seed) if rawTitle not found
                const groupedSetName =
                  !rawTitle &&
                  Array.isArray(g.setlist) &&
                  g.setlist.length > 0 &&
                  typeof g.setlist[0] === "object" &&
                  g.setlist[0] !== null &&
                  "setName" in g.setlist[0]
                    ? (g.setlist[0] as { setName?: string }).setName
                    : "";

                const finalTitle = rawTitle || groupedSetName;
                const tuneCount = mappedTemplate
                  ? mappedTemplate.tuneCount
                  : Array.isArray(g.setlist)
                    ? g.setlist.length > 0 && typeof g.setlist[0] === "object" && g.setlist[0] !== null && "items" in g.setlist[0]
                      ? (g.setlist as Array<{ items?: unknown[] }>).reduce((acc, grp) => acc + (grp.items?.length || 0), 0)
                      : g.setlist.length
                    : 0;

                const hasSetlist = Boolean(finalTitle || tuneCount > 0);
                const isLibraryTemplate = Boolean(
                  effectiveId &&
                  (mappedTemplate || (fullSetlists[effectiveId] && isReusableSetlistTemplate(effectiveId, fullSetlists[effectiveId])))
                );

                return (
                  <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3 flex items-center justify-between gap-2">
                    <div className="min-w-0 flex items-center gap-2.5">
                      <div
                        className={`p-2 rounded-lg shrink-0 ${
                          hasSetlist
                            ? "bg-yellow-400/10 border border-yellow-400/20 text-yellow-400"
                            : "bg-slate-900 border border-slate-800 text-slate-500"
                        }`}
                      >
                        <ListMusic className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] uppercase font-mono text-slate-500 font-bold block">
                            Performance Setlist
                          </span>
                          {hasSetlist && (
                            <span
                              className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                                isLibraryTemplate
                                  ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                                  : "bg-sky-500/10 text-sky-400 border-sky-500/20"
                              }`}
                            >
                              {isLibraryTemplate ? "Library Saved" : "Gig-Unique"}
                            </span>
                          )}
                        </div>
                        <div className="text-xs font-bold truncate">
                          {hasSetlist ? (
                            <span className="flex items-center gap-1.5 truncate">
                              <span className="truncate text-yellow-400 font-extrabold text-sm">
                                {finalTitle || "Unique Gig Setlist"}
                              </span>
                              <span className="text-[10px] font-mono text-slate-400 shrink-0">
                                ({tuneCount} {tuneCount === 1 ? "chart" : "charts"})
                              </span>
                            </span>
                          ) : (
                            <span className="text-slate-500 italic font-normal">
                              Empty setlist (no charts assigned)
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {hasSetlist && (
                        <button
                          type="button"
                          onClick={() => handleRemoveGigSetlist(g)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition shrink-0"
                          title="Remove setlist and start fresh"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setManagingSetlistGig(g)}
                        className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition shrink-0 flex items-center gap-1 border ${
                          hasSetlist
                            ? "bg-yellow-400/10 hover:bg-yellow-400/20 text-yellow-400 border-yellow-400/20"
                            : "bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-extrabold border-transparent shadow"
                        }`}
                        title={hasSetlist ? "Change or edit setlist" : "Assign saved setlist or build unique setlist"}
                      >
                        {hasSetlist ? (
                          <>
                            <ListMusic className="w-3.5 h-3.5" />
                            <span>Manage</span>
                          </>
                        ) : (
                          <>
                            <Plus className="w-3.5 h-3.5" />
                            <span>Assign</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })()}

              {/* Quick Toggles: Public Visibility & 1-Click Navigation */}
              <div className="space-y-1.5 pt-2 border-t border-slate-800/60">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] text-slate-400 flex items-center gap-1.5">
                    <Globe className="w-3 h-3 text-sky-400 shrink-0" />
                    Public Visibility:
                  </span>
                  <button
                    type="button"
                    onClick={() => handleTogglePublicVisibility(g.id, g.publicDetails?.isPublic)}
                    title={
                      g.publicDetails?.isPublic !== false
                        ? "Gig is published to public site schedule. Click to hide (make private)."
                        : "Gig is hidden from public site schedule. Click to publish."
                    }
                    className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border transition flex items-center gap-1 ${
                      g.publicDetails?.isPublic !== false
                        ? "bg-sky-500/10 text-sky-400 border-sky-500/30 hover:bg-sky-500/20"
                        : "bg-rose-500/10 text-rose-400 border-rose-500/30 hover:bg-rose-500/20"
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${g.publicDetails?.isPublic !== false ? "bg-sky-400" : "bg-rose-400"}`}></span>
                    {g.publicDetails?.isPublic !== false ? "PUBLIC" : "PRIVATE"}
                  </button>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] text-slate-400 flex items-center gap-1.5">
                    <Navigation className="w-3 h-3 text-yellow-400 shrink-0" />
                    1-Click Navigation:
                  </span>
                  <button
                    type="button"
                    onClick={() => handleToggleNavigation(g.id, g.publicDetails?.showExternalDirections)}
                    title={
                      g.publicDetails?.showExternalDirections !== false
                        ? "Directions buttons visible on public map. Click to toggle OFF."
                        : "Directions buttons hidden on public map. Click to toggle ON."
                    }
                    className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border transition flex items-center gap-1 ${
                      g.publicDetails?.showExternalDirections !== false
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20"
                        : "bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700"
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${g.publicDetails?.showExternalDirections !== false ? "bg-emerald-400" : "bg-slate-500"}`}></span>
                    {g.publicDetails?.showExternalDirections !== false ? "ENABLED" : "DISABLED"}
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
              {g.publicDetails?.isPublic !== false ? (
                <Link
                  href={`/gigs/${g.id}`}
                  target="_blank"
                  className="text-xs font-semibold text-slate-400 hover:text-white flex items-center gap-1 transition"
                  title="View public event landing page"
                >
                  <span>Public Page</span>
                  <ExternalLink className="w-3 h-3 text-slate-500" />
                </Link>
              ) : (
                <span
                  className="text-xs font-medium text-slate-500 flex items-center gap-1"
                  title="Gig is marked private - not published on public site"
                >
                  <EyeOff className="w-3 h-3 text-rose-400/70" />
                  <span>Private Gig</span>
                </span>
              )}
              <div className="flex items-center gap-2">
                {g.status === "confirmed" && (
                  <button
                    type="button"
                    disabled={dispatchingConfirmationId === g.id}
                    onClick={() => handleDispatchConfirmationNow(g)}
                    title="Send confirmation dispatch email to attending members"
                    className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 bg-emerald-500/10 hover:bg-emerald-500/20 px-2 py-1 rounded-lg border border-emerald-500/20 transition disabled:opacity-50 cursor-pointer"
                  >
                    {dispatchingConfirmationId === g.id ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Send className="w-3 h-3" />
                    )}
                    <span>Dispatch Confirmed</span>
                  </button>
                )}
                <Link
                  href={`/portal/gigs/${g.id}`}
                  className="text-xs font-bold text-yellow-400 hover:text-yellow-300 flex items-center gap-1"
                >
                  <span>Call Sheet</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
            </div>
          </div>
        ))}
        </div>
      )}

      {/* Gig Setlist Assignment & Creation Modal */}
      {managingSetlistGig && (
        <GigSetlistAssignmentModal
          gig={managingSetlistGig}
          isOpen={true}
          onClose={() => setManagingSetlistGig(null)}
          onSaved={() => setManagingSetlistGig(null)}
        />
      )}

      {/* Resource Asset Picker Modal */}
      <ResourceAssetPickerModal
        isOpen={isAssetPickerOpen}
        onClose={() => setIsAssetPickerOpen(false)}
        onSelectAsset={handleSelectAsset}
        filterCategory="header"
        title="Choose Gig Header Image"
        subtitle="Select a header banner image from the band's resource library for this gig."
      />
    </div>
  );
}