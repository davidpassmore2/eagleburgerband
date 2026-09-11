"use client";

import React, { useEffect, useState } from "react";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/lib/context/AuthContext";
import { canManageTheme } from "@/lib/auth/permissions";
import { User } from "@/lib/schema/user";
import { ThemeConfig, ThemeSchema, ThemeScopeConfig, PORTAL_COLOR_SCHEMES } from "@/lib/schema/theme";
import { 
  Save, 
  Check, 
  Loader2, 
  ShieldAlert, 
  Sparkles,
  RefreshCw,
  Globe,
  LayoutDashboard,
  Building2,
  Compass,
  Send,
  Video,
  Camera,
  Share2,
  Palette
} from "lucide-react";

const DEFAULT_THEME: ThemeConfig = ThemeSchema.parse({});

type TabType = "public" | "portal" | "identity";

export default function ThemeCustomizerPage() {
  const { profile, loading: authLoading } = useAuth();
  const [theme, setTheme] = useState<ThemeConfig>(DEFAULT_THEME);
  const [activeTab, setActiveTab] = useState<TabType>("public");
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (authLoading) return;

    const unsub = onSnapshot(
      doc(db, "theme", "config"),
      (snap) => {
        if (snap.exists()) {
          const parsed = ThemeSchema.safeParse(snap.data());
          if (parsed.success) {
            setTheme(parsed.data);
          } else {
            console.warn("Theme parsing issue, using defaults:", parsed.error);
            setTheme({ ...DEFAULT_THEME, ...snap.data() } as ThemeConfig);
          }
        }
        setLoading(false);
      },
      (err) => {
        console.error("Theme listener error:", err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [authLoading]);

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-400 gap-2 text-xs">
        <Loader2 className="w-4 h-4 animate-spin text-yellow-400" />
        Loading brand palette & theme studio...
      </div>
    );
  }

  if (!canManageTheme(profile as unknown as User)) {
    return (
      <div className="p-8 text-rose-400 text-xs font-semibold flex items-center gap-2">
        <ShieldAlert className="w-4 h-4" />
        Web Manager or Admin privileges required to customize brand & palette.
      </div>
    );
  }

  const updatePublicScope = (patch: Partial<ThemeScopeConfig>) => {
    setTheme((prev) => ({
      ...prev,
      public: { ...prev.public, ...patch },
    }));
  };

  const updatePortalScope = (patch: Partial<ThemeScopeConfig>) => {
    setTheme((prev) => ({
      ...prev,
      portal: { ...prev.portal, ...patch },
    }));
  };

  const resetScope = (scope: TabType) => {
    if (scope === "public") {
      setTheme((prev) => ({ ...prev, public: DEFAULT_THEME.public }));
    } else if (scope === "portal") {
      setTheme((prev) => ({ ...prev, portal: DEFAULT_THEME.portal }));
    } else {
      setTheme((prev) => ({
        ...prev,
        bandName: DEFAULT_THEME.bandName,
        logoUrl: DEFAULT_THEME.logoUrl,
        activeSeason: DEFAULT_THEME.activeSeason,
        socialLinks: DEFAULT_THEME.socialLinks,
      }));
    }
  };

  const handleSaveTheme = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSavedSuccess(false);

    try {
      const payloadToValidate = {
        ...theme,
        // Sync legacy flat fields for backwards compatibility
        primaryColor: theme.public.primaryColor,
        accentColor: theme.public.accentColor,
        subheading: theme.public.tagline,
        schemaVersion: 2,
        updatedAt: new Date().toISOString(),
      };

      const validated = ThemeSchema.parse(payloadToValidate);
      await setDoc(doc(db, "theme", "config"), validated, { merge: true });

      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      alert("Failed to save theme settings: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-yellow-400 bg-slate-950 px-2.5 py-0.5 rounded border border-slate-800">
              Brand & Theme Studio
            </span>
            <span className="text-xs font-mono text-slate-400">
              v2 Scoped Schemas
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Brand & Palette Customizer</h1>
          <p className="text-xs text-slate-400">
            Define independent style schemes for the Public Fan Site and Musician Portal, alongside global ensemble identity tokens.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSaveTheme}
            disabled={isSaving}
            className="bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 transition disabled:opacity-50 shadow-md"
          >
            {isSaving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : savedSuccess ? (
              <Check className="w-3.5 h-3.5 text-emerald-950" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            <span>{isSaving ? "Saving..." : savedSuccess ? "Settings Saved!" : "Save Brand Settings"}</span>
          </button>
        </div>
      </div>

      {/* Scope Navigation Tabs */}
      <div className="flex border-b border-slate-800 gap-2">
        <button
          type="button"
          onClick={() => setActiveTab("public")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition ${
            activeTab === "public"
              ? "border-yellow-400 text-yellow-400 bg-slate-900/50 rounded-t-xl"
              : "border-transparent text-slate-400 hover:text-white"
          }`}
        >
          <Globe className="w-4 h-4" />
          <span>Public Website Scheme</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("portal")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition ${
            activeTab === "portal"
              ? "border-yellow-400 text-yellow-400 bg-slate-900/50 rounded-t-xl"
              : "border-transparent text-slate-400 hover:text-white"
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          <span>Musician Portal Scheme</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("identity")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition ${
            activeTab === "identity"
              ? "border-yellow-400 text-yellow-400 bg-slate-900/50 rounded-t-xl"
              : "border-transparent text-slate-400 hover:text-white"
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Ensemble Identity & Socials</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Tab-Dependent Customizer Form */}
        <div className="lg:col-span-7 space-y-4">
          {activeTab === "public" && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h2 className="text-sm font-bold text-white flex items-center gap-2">
                    <Globe className="w-4 h-4 text-yellow-400" /> Public Site Styling
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    Controls colors and marketing copy displayed to fans, clients, and parade organizers.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => resetScope("public")}
                  className="text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1 transition"
                >
                  <RefreshCw className="w-3 h-3" /> Defaults
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                    Public Marketing Tagline / Hero Subheading
                  </label>
                  <input
                    type="text"
                    value={theme.public.tagline}
                    onChange={(e) => updatePublicScope({ tagline: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                      Primary Brand Gold (Hex)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={theme.public.primaryColor}
                        onChange={(e) => updatePublicScope({ primaryColor: e.target.value })}
                        className="w-8 h-8 rounded border border-slate-800 bg-slate-950 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={theme.public.primaryColor}
                        onChange={(e) => updatePublicScope({ primaryColor: e.target.value })}
                        className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-yellow-400"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                      Accent / Highlight (Hex)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={theme.public.accentColor}
                        onChange={(e) => updatePublicScope({ accentColor: e.target.value })}
                        className="w-8 h-8 rounded border border-slate-800 bg-slate-950 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={theme.public.accentColor}
                        onChange={(e) => updatePublicScope({ accentColor: e.target.value })}
                        className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-yellow-400"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                      Site Background (Hex)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={theme.public.backgroundColor}
                        onChange={(e) => updatePublicScope({ backgroundColor: e.target.value })}
                        className="w-8 h-8 rounded border border-slate-800 bg-slate-950 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={theme.public.backgroundColor}
                        onChange={(e) => updatePublicScope({ backgroundColor: e.target.value })}
                        className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-yellow-400"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                      Card / Surface Background (Hex)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={theme.public.surfaceColor}
                        onChange={(e) => updatePublicScope({ surfaceColor: e.target.value })}
                        className="w-8 h-8 rounded border border-slate-800 bg-slate-950 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={theme.public.surfaceColor}
                        onChange={(e) => updatePublicScope({ surfaceColor: e.target.value })}
                        className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-yellow-400"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "portal" && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h2 className="text-sm font-bold text-white flex items-center gap-2">
                    <LayoutDashboard className="w-4 h-4 text-yellow-400" /> Musician Portal Styling
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    Controls tactical UI highlights, sidebar accents, and operational subheadings for band members.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => resetScope("portal")}
                  className="text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1 transition"
                >
                  <RefreshCw className="w-3 h-3" /> Defaults
                </button>
              </div>

              <div className="space-y-4">
                {/* 5 Harmonious Scheme Presets */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                      <Palette className="w-3.5 h-3.5 text-yellow-400" />
                      Ensemble Default Color Schemes
                    </label>
                    <span className="text-[10px] text-slate-500 font-mono">
                      5 harmonious presets
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {PORTAL_COLOR_SCHEMES.map((scheme) => {
                      const isSelected = theme.portal.schemeId === scheme.id;
                      return (
                        <button
                          key={scheme.id}
                          type="button"
                          onClick={() => {
                            updatePortalScope({
                              schemeId: scheme.id,
                              primaryColor: scheme.primaryColor,
                              accentColor: scheme.accentColor,
                              backgroundColor: scheme.backgroundColor,
                              surfaceColor: scheme.surfaceColor,
                              mutedSurfaceColor: scheme.mutedSurfaceColor,
                              borderColor: scheme.borderColor,
                              textColor: scheme.textColor,
                              tagline: scheme.tagline,
                            });
                          }}
                          className={`text-left p-3 rounded-xl border transition-all relative group ${
                            isSelected
                              ? "border-yellow-400 bg-slate-950/80 shadow-md ring-1 ring-yellow-400/40"
                              : "border-slate-800 bg-slate-950/40 hover:border-slate-700 hover:bg-slate-950/70"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs font-bold text-white group-hover:text-yellow-400 transition-colors">
                              {scheme.name}
                            </span>
                            {isSelected ? (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-yellow-400 text-slate-950 font-mono">
                                Active Default
                              </span>
                            ) : (
                              <span className="text-[9px] text-slate-500 opacity-0 group-hover:opacity-100 transition font-mono">
                                Apply Preset
                              </span>
                            )}
                          </div>

                          {/* 4-dot swatch row */}
                          <div className="flex items-center gap-1.5 mb-1.5">
                            {scheme.previewSwatches.map((color, idx) => (
                              <span
                                key={idx}
                                className="w-3 h-3 rounded-full border border-slate-700 shadow-sm"
                                style={{ backgroundColor: color }}
                                title={color}
                              />
                            ))}
                            <span className="text-[9px] text-slate-400 font-mono ml-1">
                              {scheme.primaryColor}
                            </span>
                          </div>

                          <p className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed">
                            {scheme.description}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                    Portal Operational Subheading
                  </label>
                  <input
                    type="text"
                    value={theme.portal.tagline}
                    onChange={(e) => updatePortalScope({ tagline: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                      Tool Highlight / Active Accent (Hex)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={theme.portal.primaryColor}
                        onChange={(e) => updatePortalScope({ primaryColor: e.target.value })}
                        className="w-8 h-8 rounded border border-slate-800 bg-slate-950 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={theme.portal.primaryColor}
                        onChange={(e) => updatePortalScope({ primaryColor: e.target.value })}
                        className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-yellow-400"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                      Secondary Accent / Badge Tint (Hex)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={theme.portal.accentColor}
                        onChange={(e) => updatePortalScope({ accentColor: e.target.value })}
                        className="w-8 h-8 rounded border border-slate-800 bg-slate-950 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={theme.portal.accentColor}
                        onChange={(e) => updatePortalScope({ accentColor: e.target.value })}
                        className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-yellow-400"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                      Ambient Workspace Background (Hex)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={theme.portal.backgroundColor}
                        onChange={(e) => updatePortalScope({ backgroundColor: e.target.value })}
                        className="w-8 h-8 rounded border border-slate-800 bg-slate-950 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={theme.portal.backgroundColor}
                        onChange={(e) => updatePortalScope({ backgroundColor: e.target.value })}
                        className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-yellow-400"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                      Card & Sidebar Surface (Hex)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={theme.portal.surfaceColor}
                        onChange={(e) => updatePortalScope({ surfaceColor: e.target.value })}
                        className="w-8 h-8 rounded border border-slate-800 bg-slate-950 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={theme.portal.surfaceColor}
                        onChange={(e) => updatePortalScope({ surfaceColor: e.target.value })}
                        className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-yellow-400"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                      Inner Well / Search Input Surface (Hex)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={theme.portal.mutedSurfaceColor || "#1e1808"}
                        onChange={(e) => updatePortalScope({ mutedSurfaceColor: e.target.value })}
                        className="w-8 h-8 rounded border border-slate-800 bg-slate-950 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={theme.portal.mutedSurfaceColor || "#1e1808"}
                        onChange={(e) => updatePortalScope({ mutedSurfaceColor: e.target.value })}
                        className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-yellow-400"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                      Card & Divider Border Tint (Hex)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={theme.portal.borderColor || "#382c0f"}
                        onChange={(e) => updatePortalScope({ borderColor: e.target.value })}
                        className="w-8 h-8 rounded border border-slate-800 bg-slate-950 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={theme.portal.borderColor || "#382c0f"}
                        onChange={(e) => updatePortalScope({ borderColor: e.target.value })}
                        className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-yellow-400"
                      />
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                      High-Contrast Text Color (Hex)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={theme.portal.textColor || "#fefce8"}
                        onChange={(e) => updatePortalScope({ textColor: e.target.value })}
                        className="w-8 h-8 rounded border border-slate-800 bg-slate-950 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={theme.portal.textColor || "#fefce8"}
                        onChange={(e) => updatePortalScope({ textColor: e.target.value })}
                        className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-yellow-400"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "identity" && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h2 className="text-sm font-bold text-white flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-yellow-400" /> Ensemble Brand Identity & Socials
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    Official ensemble naming, active marching season, logo asset paths, and canonical social media accounts.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => resetScope("identity")}
                  className="text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1 transition"
                >
                  <RefreshCw className="w-3 h-3" /> Defaults
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                    Official Ensemble Name
                  </label>
                  <input
                    type="text"
                    required
                    value={theme.bandName}
                    onChange={(e) => setTheme({ ...theme, bandName: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                      Active Calendar Season
                    </label>
                    <input
                      type="text"
                      value={theme.activeSeason}
                      onChange={(e) => setTheme({ ...theme, activeSeason: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                      Logo Asset URI
                    </label>
                    <input
                      type="text"
                      value={theme.logoUrl}
                      onChange={(e) => setTheme({ ...theme, logoUrl: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400"
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800/80 space-y-3">
                  <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400">
                    Social Media Channels
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5 mb-1">
                      <Video className="w-3.5 h-3.5 text-red-400" /> YouTube Channel / Video Reel
                    </label>
                    <input
                      type="url"
                      value={theme.socialLinks.youtube}
                      onChange={(e) =>
                        setTheme({
                          ...theme,
                          socialLinks: { ...theme.socialLinks, youtube: e.target.value },
                        })
                      }
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5 mb-1">
                      <Camera className="w-3.5 h-3.5 text-pink-400" /> Instagram Handle / Profile
                    </label>
                    <input
                      type="url"
                      value={theme.socialLinks.instagram}
                      onChange={(e) =>
                        setTheme({
                          ...theme,
                          socialLinks: { ...theme.socialLinks, instagram: e.target.value },
                        })
                      }
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5 mb-1">
                      <Share2 className="w-3.5 h-3.5 text-blue-400" /> Facebook Page
                    </label>
                    <input
                      type="url"
                      value={theme.socialLinks.facebook}
                      onChange={(e) =>
                        setTheme({
                          ...theme,
                          socialLinks: { ...theme.socialLinks, facebook: e.target.value },
                        })
                      }
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Context-Aware Live Preview Simulator */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-yellow-400" />
                {activeTab === "public"
                  ? "Public Site Live Preview"
                  : activeTab === "portal"
                  ? "Musician Portal Live Preview"
                  : "Brand Identity Overview"}
              </span>
              <span className="text-[10px] font-mono text-slate-500">Live Simulator</span>
            </div>

            {/* Simulated Preview Box */}
            {activeTab === "public" && (
              <div
                className="p-5 rounded-xl space-y-4 border transition-colors shadow-inner"
                style={{
                  backgroundColor: theme.public.backgroundColor,
                  borderColor: theme.public.accentColor + "40",
                  color: theme.public.textColor,
                }}
              >
                {/* Public Header Mock */}
                <div
                  className="p-3 rounded-xl flex items-center justify-between border shadow-sm"
                  style={{
                    backgroundColor: theme.public.surfaceColor,
                    borderColor: theme.public.primaryColor + "30",
                  }}
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-8 h-8 rounded-lg font-black flex items-center justify-center text-xs shadow"
                      style={{
                        backgroundColor: theme.public.primaryColor,
                        color: "#020617",
                      }}
                    >
                      EBB
                    </div>
                    <div>
                      <div className="text-xs font-extrabold uppercase tracking-tight">
                        {theme.bandName}
                      </div>
                      <div
                        className="text-[10px] font-semibold uppercase tracking-wider"
                        style={{ color: theme.public.primaryColor }}
                      >
                        Pittsburgh Brass & Battery
                      </div>
                    </div>
                  </div>

                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded border"
                    style={{
                      borderColor: theme.public.primaryColor,
                      color: theme.public.primaryColor,
                    }}
                  >
                    Book
                  </span>
                </div>

                {/* Public Hero Mock */}
                <div className="space-y-2 py-2">
                  <span
                    className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded"
                    style={{
                      backgroundColor: theme.public.primaryColor + "20",
                      color: theme.public.primaryColor,
                    }}
                  >
                    {theme.activeSeason}
                  </span>
                  <h3 className="text-base font-black leading-tight">
                    {theme.public.tagline}
                  </h3>
                </div>

                {/* Public Booking Banner Mock */}
                <div
                  className="p-3 rounded-xl flex items-center justify-between"
                  style={{
                    backgroundColor: theme.public.surfaceColor,
                    borderLeft: `4px solid ${theme.public.primaryColor}`,
                  }}
                >
                  <div className="text-[11px] font-semibold">Available for Parades & Festivals</div>
                  <button
                    type="button"
                    className="text-[10px] font-bold px-2.5 py-1 rounded shadow"
                    style={{
                      backgroundColor: theme.public.primaryColor,
                      color: "#020617",
                    }}
                  >
                    Get a Quote
                  </button>
                </div>
              </div>
            )}

            {activeTab === "portal" && (
              <div
                className="p-5 rounded-xl space-y-4 border transition-colors shadow-inner"
                style={{
                  backgroundColor: theme.portal.backgroundColor,
                  borderColor: theme.portal.borderColor || theme.portal.accentColor + "40",
                  color: theme.portal.textColor,
                }}
              >
                {/* Portal Sidebar Segment Mock */}
                <div
                  className="p-4 rounded-xl space-y-3 border shadow-sm"
                  style={{
                    backgroundColor: theme.portal.surfaceColor,
                    borderColor: theme.portal.borderColor || theme.portal.accentColor + "50",
                  }}
                >
                  <div 
                    className="flex items-center gap-2 pb-2 border-b"
                    style={{ borderColor: theme.portal.borderColor || "#334155" }}
                  >
                    <div
                      className="font-black px-2 py-0.5 rounded text-[10px] tracking-wider shadow-sm"
                      style={{
                        backgroundColor: theme.portal.primaryColor,
                        color: "#020617",
                      }}
                    >
                      EBB
                    </div>
                    <div>
                      <div className="text-xs font-bold" style={{ color: theme.portal.textColor }}>
                        {theme.bandName}
                      </div>
                      <div className="text-[10px] opacity-75">Musician Portal</div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="text-[9px] font-mono uppercase font-bold opacity-60">
                      Performances & Logistics
                    </div>

                    <div
                      className="flex items-center gap-2 px-2.5 py-1.5 rounded text-xs font-bold shadow-sm"
                      style={{
                        backgroundColor: theme.portal.primaryColor,
                        color: "#020617",
                      }}
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Call Sheet Dispatch</span>
                    </div>

                    <div className="flex items-center gap-2 px-2.5 py-1.5 rounded text-xs opacity-75 hover:opacity-100 transition">
                      <Compass className="w-3.5 h-3.5" />
                      <span>Gig Central RSVPs</span>
                    </div>
                  </div>
                </div>

                {/* Harmonious Inner Well Card Mock */}
                <div
                  className="p-3.5 rounded-xl border space-y-2 shadow-sm"
                  style={{
                    backgroundColor: theme.portal.mutedSurfaceColor || "#1e1808",
                    borderColor: theme.portal.borderColor || "#382c0f",
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold" style={{ color: theme.portal.textColor }}>
                      Next Rehearsal RSVP
                    </span>
                    <span
                      className="text-[9px] font-mono font-bold px-2 py-0.5 rounded border"
                      style={{
                        backgroundColor: `${theme.portal.primaryColor}20`,
                        borderColor: `${theme.portal.primaryColor}50`,
                        color: theme.portal.primaryColor,
                      }}
                    >
                      Confirmed (18 / 22)
                    </span>
                  </div>
                  <p className="text-[10px] opacity-70 leading-relaxed">
                    Wednesday 7:00 PM @ Rehearsal Hall — Street parade run-through with full brass & battery.
                  </p>
                </div>

                {/* Tactical Alert Mock */}
                <div
                  className="p-3 rounded-xl text-xs space-y-1 border shadow-sm"
                  style={{
                    backgroundColor: theme.portal.surfaceColor,
                    borderColor: theme.portal.borderColor || "#382c0f",
                    borderLeft: `4px solid ${theme.portal.primaryColor}`,
                  }}
                >
                  <div className="font-bold" style={{ color: theme.portal.textColor }}>
                    {theme.portal.tagline}
                  </div>
                  <div className="text-[10px] opacity-70 font-mono">
                    Active season: {theme.activeSeason}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "identity" && (
              <div className="bg-slate-950 border border-slate-800 p-5 rounded-xl space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-yellow-400 text-slate-950 font-black text-lg flex items-center justify-center shadow">
                    EBB
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-white">{theme.bandName}</h3>
                    <div className="text-xs text-yellow-400 font-mono">{theme.activeSeason}</div>
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-800 text-xs text-slate-300">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Logo Asset:</span>
                    <span className="font-mono text-[11px] text-slate-400">{theme.logoUrl}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Schema Version:</span>
                    <span className="font-mono text-[11px] text-emerald-400">v2 (Scoped)</span>
                  </div>
                </div>

                <div className="pt-2 flex items-center gap-2">
                  {theme.socialLinks.youtube && (
                    <a
                      href={theme.socialLinks.youtube}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-lg bg-slate-900 text-red-400 border border-slate-800 hover:border-red-400/50 transition"
                      title="YouTube"
                    >
                      <Video className="w-4 h-4" />
                    </a>
                  )}
                  {theme.socialLinks.instagram && (
                    <a
                      href={theme.socialLinks.instagram}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-lg bg-slate-900 text-pink-400 border border-slate-800 hover:border-pink-400/50 transition"
                      title="Instagram"
                    >
                      <Camera className="w-4 h-4" />
                    </a>
                  )}
                  {theme.socialLinks.facebook && (
                    <a
                      href={theme.socialLinks.facebook}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-lg bg-slate-900 text-blue-400 border border-slate-800 hover:border-blue-400/50 transition"
                      title="Facebook"
                    >
                      <Share2 className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>
            )}

            <div className="text-[11px] text-slate-500 flex items-center gap-1.5 pt-1">
              <Sparkles className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
              <span>
                Theme adjustments synchronize in real-time to connected Firebase sessions.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}