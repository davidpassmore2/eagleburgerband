"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/lib/context/AuthContext";
import { canManageNavigation, Role } from "@/lib/auth/permissions";
import { useSidebarNav } from "@/lib/context/SidebarNavContext";
import { ResolvedSidebarSection, SidebarSectionConfig } from "@/lib/schema/sidebarNavigation";
import AccessDenied from "@/components/portal/AccessDenied";
import PortalBreadcrumb from "@/components/portal/PortalBreadcrumb";
import {
  SlidersHorizontal,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
  RotateCcw,
  Save,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Compass,
  LayoutList,
  Sparkles,
  Info,
  Shield,
} from "lucide-react";

export default function SidebarNavigationStudioPage() {
  const { profile, loading: authLoading } = useAuth();
  const { sections: contextSections, loading: navLoading, saveConfig, resetToDefaults } = useSidebarNav();

  // Local draft state for editing before persisting
  const [userEdits, setUserEdits] = useState<ResolvedSidebarSection[] | null>(null);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [previewRole, setPreviewRole] = useState<Role | "all">("all");
  const [activeTab, setActiveTab] = useState<"builder" | "preview">("builder");
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Active working sections: either user edits or context
  const draftSections = useMemo(() => {
    return userEdits ?? contextSections;
  }, [userEdits, contextSections]);

  const hasChanges = userEdits !== null;

  // Stats
  const stats = useMemo(() => {
    const totalSections = draftSections.length;
    const visibleSections = draftSections.filter((s) => s.isVisible).length;
    const totalLinks = draftSections.reduce((acc, s) => acc + s.links.length, 0);
    const visibleLinks = draftSections.reduce(
      (acc, s) => acc + s.links.filter((l) => l.isVisible).length,
      0
    );
    return { totalSections, visibleSections, totalLinks, visibleLinks };
  }, [draftSections]);

  // Auto-dismiss toast
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  if (authLoading || navLoading) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-400 text-xs font-mono">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-yellow-400 animate-ping" />
          <span>Loading Sidebar Navigation Studio...</span>
        </div>
      </div>
    );
  }

  if (!canManageNavigation(profile)) {
    return (
      <AccessDenied
        title="Admin Navigation Access Required"
        message="Only band administrators have permission to reorder and toggle sidebar navigation sections and tools."
      />
    );
  }

  // --- Reordering & Toggling Handlers ---

  const handleToggleSectionVisibility = (sectionIndex: number) => {
    const updated = JSON.parse(JSON.stringify(draftSections)) as ResolvedSidebarSection[];
    updated[sectionIndex] = {
      ...updated[sectionIndex],
      isVisible: !updated[sectionIndex].isVisible,
    };
    setUserEdits(updated);
  };

  const handleMoveSection = (index: number, direction: "up" | "down") => {
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === draftSections.length - 1) return;

    const updated = JSON.parse(JSON.stringify(draftSections)) as ResolvedSidebarSection[];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;

    // Reassign explicit order numbers
    const reordered = updated.map((sec, i) => ({
      ...sec,
      order: i,
    }));
    setUserEdits(reordered);
  };

  const handleToggleLinkVisibility = (sectionIndex: number, linkIndex: number) => {
    const updated = JSON.parse(JSON.stringify(draftSections)) as ResolvedSidebarSection[];
    const section = { ...updated[sectionIndex] };
    const links = [...section.links];
    links[linkIndex] = {
      ...links[linkIndex],
      isVisible: !links[linkIndex].isVisible,
    };
    section.links = links;
    updated[sectionIndex] = section;
    setUserEdits(updated);
  };

  const handleMoveLink = (sectionIndex: number, linkIndex: number, direction: "up" | "down") => {
    const section = draftSections[sectionIndex];
    if (direction === "up" && linkIndex === 0) return;
    if (direction === "down" && linkIndex === section.links.length - 1) return;

    const updated = JSON.parse(JSON.stringify(draftSections)) as ResolvedSidebarSection[];
    const currentSection = { ...updated[sectionIndex] };
    const links = [...currentSection.links];
    const targetIndex = direction === "up" ? linkIndex - 1 : linkIndex + 1;

    const temp = links[linkIndex];
    links[linkIndex] = links[targetIndex];
    links[targetIndex] = temp;

    // Reassign explicit order numbers
    currentSection.links = links.map((l, i) => ({
      ...l,
      order: i,
    }));
    updated[sectionIndex] = currentSection;
    setUserEdits(updated);
  };

  const handleToggleSectionExpand = (sectionId: string) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  };

  const handleExpandAll = (expand: boolean) => {
    if (expand) {
      setCollapsedSections({});
    } else {
      const allCollapsed: Record<string, boolean> = {};
      draftSections.forEach((s) => {
        allCollapsed[s.id] = true;
      });
      setCollapsedSections(allCollapsed);
    }
  };

  const handleSetAllLinksInSection = (sectionIndex: number, visible: boolean) => {
    const updated = JSON.parse(JSON.stringify(draftSections)) as ResolvedSidebarSection[];
    const currentSection = { ...updated[sectionIndex] };
    currentSection.links = currentSection.links.map((l) => ({
      ...l,
      isVisible: visible,
    }));
    updated[sectionIndex] = currentSection;
    setUserEdits(updated);
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const payload: SidebarSectionConfig[] = draftSections.map((sec, secIndex) => ({
        id: sec.id,
        title: sec.title || sec.id,
        order: secIndex,
        isVisible: sec.isVisible,
        links: sec.links.map((link, linkIndex) => ({
          id: link.id,
          title: link.title || link.tool.title,
          order: linkIndex,
          isVisible: link.isVisible,
        })),
      }));

      await saveConfig(payload);
      setUserEdits(null);
      setToastMessage({
        text: "Sidebar navigation successfully updated. Changes are now live for all band members.",
        type: "success",
      });
    } catch (err: unknown) {
      console.error("Failed to save sidebar navigation config:", err);
      setToastMessage({
        text: "Error saving navigation changes. Please try again.",
        type: "error",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDiscard = () => {
    setUserEdits(null);
    setToastMessage({
      text: "Unsaved changes discarded.",
      type: "success",
    });
  };

  const handleResetToDefaults = async () => {
    try {
      setIsSaving(true);
      await resetToDefaults();
      setUserEdits(null);
      setShowResetConfirm(false);
      setToastMessage({
        text: "Navigation reset to system defaults.",
        type: "success",
      });
    } catch (err) {
      console.error("Failed to reset navigation:", err);
      setToastMessage({
        text: "Error resetting navigation.",
        type: "error",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-16">
      <PortalBreadcrumb className="mb-2" />

      {/* Header Banner */}
      <div
        style={{
          backgroundColor: "var(--ebb-surface)",
          borderColor: "var(--ebb-border)",
        }}
        className="rounded-3xl border p-6 md:p-8 relative overflow-hidden shadow-sm"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-yellow-400/10 text-yellow-400 border border-yellow-400/20">
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Admin Studio</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Sidebar Navigation Studio
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 max-w-2xl leading-relaxed">
              Manage the visual hierarchy, display ordering, and visibility of navigation sections and their tools across the Musician Portal sidebar.
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-3 shrink-0">
            <div
              style={{
                backgroundColor: "var(--ebb-surface-muted)",
                borderColor: "var(--ebb-border)",
              }}
              className="px-4 py-3 rounded-2xl border text-center"
            >
              <div className="text-lg font-black text-white">
                {stats.visibleSections} <span className="text-xs font-normal text-slate-400">/ {stats.totalSections}</span>
              </div>
              <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                Sections Visible
              </div>
            </div>

            <div
              style={{
                backgroundColor: "var(--ebb-surface-muted)",
                borderColor: "var(--ebb-border)",
              }}
              className="px-4 py-3 rounded-2xl border text-center"
            >
              <div className="text-lg font-black text-white">
                {stats.visibleLinks} <span className="text-xs font-normal text-slate-400">/ {stats.totalLinks}</span>
              </div>
              <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                Tools Visible
              </div>
            </div>
          </div>
        </div>

        {/* Global Action Toolbar */}
        <div
          style={{ borderColor: "var(--ebb-border)" }}
          className="mt-6 pt-6 border-t flex flex-wrap items-center justify-between gap-4"
        >
          {/* Left View Tabs */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("builder")}
              style={{
                backgroundColor: activeTab === "builder" ? "var(--ebb-primary)" : "var(--ebb-surface-muted)",
                color: activeTab === "builder" ? "#020617" : "#94a3b8",
                borderColor: activeTab === "builder" ? "var(--ebb-primary)" : "var(--ebb-border)",
              }}
              className="px-3.5 py-1.5 rounded-xl border text-xs font-bold transition flex items-center gap-1.5"
            >
              <LayoutList className="w-3.5 h-3.5" />
              <span>Section & Link Builder</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("preview")}
              style={{
                backgroundColor: activeTab === "preview" ? "var(--ebb-primary)" : "var(--ebb-surface-muted)",
                color: activeTab === "preview" ? "#020617" : "#94a3b8",
                borderColor: activeTab === "preview" ? "var(--ebb-primary)" : "var(--ebb-border)",
              }}
              className="px-3.5 py-1.5 rounded-xl border text-xs font-bold transition flex items-center gap-1.5"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Live Sidebar Preview</span>
            </button>
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2.5">
            {hasChanges && (
              <span className="text-[11px] font-semibold text-amber-400 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-400/10 border border-amber-400/30">
                <AlertCircle className="w-3 h-3" />
                <span>Unsaved Changes</span>
              </span>
            )}

            <button
              type="button"
              onClick={handleDiscard}
              disabled={!hasChanges || isSaving}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 border border-slate-700 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              Discard
            </button>

            <button
              type="button"
              onClick={() => setShowResetConfirm(true)}
              disabled={isSaving}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-800/60 border border-slate-700/60 hover:bg-slate-700/60 transition flex items-center gap-1.5"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Defaults</span>
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={!hasChanges || isSaving}
              style={{
                backgroundColor: hasChanges ? "var(--ebb-primary)" : "var(--ebb-surface-muted)",
                color: hasChanges ? "#020617" : "#64748b",
                borderColor: hasChanges ? "var(--ebb-primary)" : "var(--ebb-border)",
              }}
              className="px-4 py-1.5 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? "Saving..." : "Save Navigation"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            backgroundColor: toastMessage.type === "success" ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)",
            borderColor: toastMessage.type === "success" ? "rgba(16, 185, 129, 0.4)" : "rgba(239, 68, 68, 0.4)",
            color: toastMessage.type === "success" ? "#34d399" : "#f87171",
          }}
          className="p-3.5 rounded-2xl border text-xs font-semibold flex items-center justify-between shadow-lg animate-in fade-in"
        >
          <div className="flex items-center gap-2">
            {toastMessage.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            )}
            <span>{toastMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="text-xs opacity-70 hover:opacity-100 px-2 py-0.5"
          >
            ✕
          </button>
        </div>
      )}

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div
            style={{
              backgroundColor: "var(--ebb-surface)",
              borderColor: "var(--ebb-border)",
            }}
            className="max-w-md w-full rounded-3xl border p-6 space-y-4 shadow-2xl"
          >
            <div className="w-10 h-10 rounded-2xl bg-amber-400/20 text-amber-400 flex items-center justify-center">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Reset to System Defaults?</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                This will restore the standard section order (starting with &quot;Help, Guides &amp; Docs&quot;) and make all navigation sections and links visible across the portal.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 border border-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleResetToDefaults}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 transition"
              >
                Yes, Reset All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      {activeTab === "builder" ? (
        <div className="space-y-4">
          {/* Subheader info & Expand/Collapse controls */}
          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <div className="flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-slate-500" />
              <span>Use the arrows to reorder sections and links. Toggle visibility switches to hide or show items.</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleExpandAll(true)}
                className="hover:text-white underline text-[11px]"
              >
                Expand All
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={() => handleExpandAll(false)}
                className="hover:text-white underline text-[11px]"
              >
                Collapse All
              </button>
            </div>
          </div>

          {/* Sections List */}
          <div className="space-y-4">
            {draftSections.map((section, secIndex) => {
              const isExpanded = !collapsedSections[section.id];
              const isFirstSection = secIndex === 0;
              const isLastSection = secIndex === draftSections.length - 1;
              const visibleCount = section.links.filter((l) => l.isVisible).length;
              const totalCount = section.links.length;

              return (
                <div
                  key={section.id}
                  style={{
                    backgroundColor: "var(--ebb-surface)",
                    borderColor: section.isVisible ? "var(--ebb-border)" : "rgba(100, 116, 139, 0.3)",
                  }}
                  className={`rounded-2xl border transition shadow-xs ${
                    !section.isVisible ? "opacity-75 bg-slate-900/40" : ""
                  }`}
                >
                  {/* Section Header Card */}
                  <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {/* Section Order Number Badge */}
                      <div
                        style={{
                          backgroundColor: section.isVisible ? "var(--ebb-primary)" : "var(--ebb-surface-muted)",
                          color: section.isVisible ? "#020617" : "#94a3b8",
                        }}
                        className="w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black shrink-0 border border-black/10"
                      >
                        {secIndex + 1}
                      </div>

                      {/* Section Title & Status */}
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            style={{
                              color: section.isVisible ? "var(--ebb-text)" : "#94a3b8",
                              fontFamily: "var(--font-arvo), serif",
                            }}
                            className="font-arvo font-bold text-sm tracking-tight"
                          >
                            {section.title || section.id}
                          </span>
                          {!section.isVisible && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-500/10 text-red-400 border border-red-500/20">
                              Section Hidden
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                          <span>
                            {visibleCount} of {totalCount} tools visible
                          </span>
                          <span>•</span>
                          <span className="text-slate-500 font-mono text-[10px]">order: {section.order}</span>
                        </div>
                      </div>
                    </div>

                    {/* Section Action Controls */}
                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      {/* Section Reorder Buttons */}
                      <div className="flex items-center border border-slate-700/80 rounded-xl overflow-hidden bg-slate-800/80">
                        <button
                          type="button"
                          onClick={() => handleMoveSection(secIndex, "up")}
                          disabled={isFirstSection}
                          title="Move section up"
                          className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-transparent transition cursor-pointer"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <div className="w-[1px] h-4 bg-slate-700" />
                        <button
                          type="button"
                          onClick={() => handleMoveSection(secIndex, "down")}
                          disabled={isLastSection}
                          title="Move section down"
                          className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-transparent transition cursor-pointer"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Section Visibility Switch */}
                      <button
                        type="button"
                        onClick={() => handleToggleSectionVisibility(secIndex)}
                        title={section.isVisible ? "Hide section in sidebar" : "Show section in sidebar"}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition cursor-pointer ${
                          section.isVisible
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20"
                            : "bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700"
                        }`}
                      >
                        {section.isVisible ? (
                          <>
                            <Eye className="w-3.5 h-3.5" />
                            <span>Visible</span>
                          </>
                        ) : (
                          <>
                            <EyeOff className="w-3.5 h-3.5" />
                            <span>Hidden</span>
                          </>
                        )}
                      </button>

                      {/* Expand / Collapse Chevron */}
                      <button
                        type="button"
                        onClick={() => handleToggleSectionExpand(section.id)}
                        className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                        title={isExpanded ? "Collapse tools" : "Expand tools"}
                      >
                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Links List Under This Section */}
                  {isExpanded && (
                    <div
                      style={{ borderColor: "var(--ebb-border)" }}
                      className="border-t px-4 py-3 bg-slate-950/20 space-y-2 rounded-b-2xl"
                    >
                      {/* Section Links Toolbar */}
                      <div className="flex items-center justify-between pb-1 text-[11px] text-slate-400">
                        <div className="font-semibold text-slate-300">
                          Tools in this section ({section.links.length})
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleSetAllLinksInSection(secIndex, true)}
                            className="hover:text-white underline text-[10px]"
                          >
                            Show All
                          </button>
                          <span>•</span>
                          <button
                            type="button"
                            onClick={() => handleSetAllLinksInSection(secIndex, false)}
                            className="hover:text-white underline text-[10px]"
                          >
                            Hide All
                          </button>
                        </div>
                      </div>

                      {/* Links List */}
                      <div className="space-y-1.5">
                        {section.links.map((link, linkIndex) => {
                          const tool = link.tool;
                          const Icon = tool.icon;
                          const isFirstLink = linkIndex === 0;
                          const isLastLink = linkIndex === section.links.length - 1;

                          return (
                            <div
                              key={link.id}
                              style={{
                                backgroundColor: "var(--ebb-surface-muted)",
                                borderColor: link.isVisible ? "var(--ebb-border)" : "rgba(100, 116, 139, 0.2)",
                              }}
                              className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 transition ${
                                !link.isVisible || !section.isVisible ? "opacity-60" : ""
                              }`}
                            >
                              {/* Left: Link Details */}
                              <div className="flex items-center gap-2.5 min-w-0">
                                <span className="text-[10px] font-mono text-slate-500 w-5 text-right shrink-0">
                                  {secIndex + 1}.{linkIndex + 1}
                                </span>
                                <div
                                  style={{
                                    backgroundColor: "var(--ebb-surface)",
                                    borderColor: "var(--ebb-border)",
                                  }}
                                  className="w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 text-amber-400"
                                >
                                  <Icon className="w-3.5 h-3.5" />
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-semibold text-white truncate">
                                      {link.title || tool.title}
                                    </span>
                                    <span className="text-[10px] text-slate-500 font-mono hidden md:inline">
                                      {tool.href}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1.5 mt-0.5">
                                    <div className="flex flex-wrap gap-1">
                                      {tool.requiredRoles.map((role) => (
                                        <span
                                          key={role}
                                          className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-medium"
                                        >
                                          {role}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Right: Reorder & Visibility Controls */}
                              <div className="flex items-center gap-2 shrink-0">
                                {/* Link Reorder Buttons */}
                                <div className="flex items-center border border-slate-700/80 rounded-lg overflow-hidden bg-slate-800/80">
                                  <button
                                    type="button"
                                    onClick={() => handleMoveLink(secIndex, linkIndex, "up")}
                                    disabled={isFirstLink}
                                    title="Move tool up"
                                    className="p-1 text-slate-300 hover:text-white hover:bg-slate-700 disabled:opacity-20 disabled:hover:bg-transparent transition cursor-pointer"
                                  >
                                    <ArrowUp className="w-3 h-3" />
                                  </button>
                                  <div className="w-[1px] h-3.5 bg-slate-700" />
                                  <button
                                    type="button"
                                    onClick={() => handleMoveLink(secIndex, linkIndex, "down")}
                                    disabled={isLastLink}
                                    title="Move tool down"
                                    className="p-1 text-slate-300 hover:text-white hover:bg-slate-700 disabled:opacity-20 disabled:hover:bg-transparent transition cursor-pointer"
                                  >
                                    <ArrowDown className="w-3 h-3" />
                                  </button>
                                </div>

                                {/* Link Visibility Switch */}
                                <button
                                  type="button"
                                  onClick={() => handleToggleLinkVisibility(secIndex, linkIndex)}
                                  title={link.isVisible ? "Hide tool link" : "Show tool link"}
                                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border flex items-center gap-1 transition cursor-pointer ${
                                    link.isVisible
                                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20"
                                      : "bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700"
                                  }`}
                                >
                                  {link.isVisible ? (
                                    <>
                                      <Eye className="w-3 h-3" />
                                      <span>Visible</span>
                                    </>
                                  ) : (
                                    <>
                                      <EyeOff className="w-3 h-3" />
                                      <span>Hidden</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Live Preview Mode */
        <div className="space-y-4">
          <div
            style={{
              backgroundColor: "var(--ebb-surface)",
              borderColor: "var(--ebb-border)",
            }}
            className="p-4 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span className="font-semibold text-white">Interactive Sidebar Simulation</span>
              <span className="text-slate-400">
                — Verify how the sidebar looks under different role permissions:
              </span>
            </div>

            {/* Role Filter Selector */}
            <div className="flex items-center gap-2">
              <Shield className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={previewRole}
                onChange={(e) => setPreviewRole(e.target.value as Role | "all")}
                style={{
                  backgroundColor: "var(--ebb-surface-muted)",
                  borderColor: "var(--ebb-border)",
                }}
                className="border text-xs text-slate-200 rounded-xl px-3 py-1.5 focus:outline-none"
              >
                <option value="all">Preview as Full Admin (All Tools)</option>
                <option value="member">Preview as Standard Band Member</option>
                <option value="guest">Preview as Guest Musician</option>
                <option value="section_leader">Preview as Section Leader</option>
                <option value="gig_manager">Preview as Gig Manager</option>
                <option value="catalog_manager">Preview as Catalog Manager</option>
                <option value="community_manager">Preview as Community Manager</option>
                <option value="treasurer">Preview as Treasurer</option>
              </select>
            </div>
          </div>

          {/* Simulated Sidebar Card */}
          <div className="max-w-md mx-auto">
            <div
              style={{
                backgroundColor: "var(--ebb-surface)",
                borderColor: "var(--ebb-border)",
                fontFamily: "var(--ebb-font-body, var(--font-poppins, sans-serif))",
              }}
              className="rounded-3xl border p-4 shadow-2xl space-y-4"
            >
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-800">
                <Compass className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Sidebar Preview ({previewRole === "all" ? "Admin" : previewRole})
                </span>
              </div>

              {/* Home Base */}
              <div 
                style={{ fontFamily: "var(--ebb-font-body, var(--font-poppins, sans-serif))" }}
                className="px-3 py-2 rounded-xl text-xs font-semibold bg-yellow-400 text-slate-950 flex items-center gap-2.5 shadow"
              >
                <Compass className="w-4 h-4" />
                <span>Home Base</span>
              </div>

              {/* Rendered Simulated Sections */}
              <div className="space-y-4 pt-1">
                {draftSections.map((section) => {
                  if (!section.isVisible) return null;

                  const visibleAuthorizedLinks = section.links.filter((link) => {
                    if (!link.isVisible) return false;
                    if (previewRole === "all") return true;
                    return link.tool.requiredRoles.includes(previewRole);
                  });

                  if (visibleAuthorizedLinks.length === 0) return null;

                  return (
                    <div key={section.id} className="space-y-1">
                      <div
                        style={{
                          color: "var(--ebb-primary)",
                          fontFamily: "var(--ebb-font-heading, var(--font-arvo), serif)",
                          letterSpacing: "var(--ebb-tracking-heading, 0.05em)",
                          textTransform: "var(--ebb-transform-heading, uppercase)" as React.CSSProperties["textTransform"],
                        }}
                        className="px-3 pt-2 pb-0.5 text-[11px] font-bold"
                      >
                        {section.title || section.id}
                      </div>
                      <div className="space-y-0.5">
                        {visibleAuthorizedLinks.map((link) => {
                          const Icon = link.tool.icon;
                          return (
                            <div
                              key={link.id}
                              style={{ fontFamily: "var(--ebb-font-body, var(--font-poppins, sans-serif))" }}
                              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-slate-300 hover:text-white hover:bg-slate-800/60 transition"
                            >
                              <Icon className="w-4 h-4 text-slate-400 shrink-0" />
                              <span className="truncate">{link.title || link.tool.title}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
