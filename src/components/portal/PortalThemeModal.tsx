"use client";

import React, { useEffect, useState } from "react";
import { useTheme } from "@/lib/context/ThemeContext";
import { PortalColorScheme, PortalThemeMode } from "@/lib/schema/theme";
import { 
  Palette, 
  X, 
  Check, 
  CheckCircle2, 
  Laptop,
  CheckCheck,
  Sun,
  Moon,
  Sparkles
} from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function PortalThemeModal({ isOpen, onClose }: Props) {
  const { 
    activePortalSchemeId,
    activePortalMode,
    activePortalScheme, 
    availablePortalSchemes, 
    setMemberPortalTheme,
    setMemberPortalMode,
  } = useTheme();

  const [savingSchemeId, setSavingSchemeId] = useState<string | null>(null);
  const [isTogglingMode, setIsTogglingMode] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSelectScheme = async (scheme: PortalColorScheme) => {
    if (scheme.id === activePortalSchemeId) return;
    setSavingSchemeId(scheme.id);
    try {
      await setMemberPortalTheme(scheme.id, activePortalMode);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2000);
    } finally {
      setSavingSchemeId(null);
    }
  };

  const handleToggleMode = async (mode: PortalThemeMode) => {
    if (mode === activePortalMode) return;
    setIsTogglingMode(true);
    try {
      await setMemberPortalMode(mode);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2000);
    } finally {
      setIsTogglingMode(false);
    }
  };

  const isLight = activePortalMode === "light";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        role="dialog"
        aria-modal="true"
        aria-labelledby="portal-theme-title"
        style={{
          backgroundColor: activePortalScheme.surfaceColor,
          borderColor: activePortalScheme.borderColor,
          color: activePortalScheme.textColor,
        }}
        className="border rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden transition-colors duration-300"
      >
        {/* Header */}
        <div 
          style={{
            backgroundColor: activePortalScheme.backgroundColor,
            borderColor: activePortalScheme.borderColor,
          }}
          className="p-5 sm:p-6 border-b flex items-start justify-between gap-4 shrink-0 transition-colors duration-300"
        >
          <div className="flex items-center gap-3">
            <div 
              style={{
                backgroundColor: activePortalScheme.mutedSurfaceColor,
                borderColor: activePortalScheme.borderColor,
                color: activePortalScheme.primaryColor,
              }}
              className="w-10 h-10 rounded-2xl border flex items-center justify-center shrink-0 shadow-sm"
            >
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 
                  id="portal-theme-title" 
                  style={{ color: activePortalScheme.textColor }}
                  className="text-base sm:text-lg font-black uppercase tracking-tight"
                >
                  Portal Appearance & Harmony
                </h2>
                {justSaved && (
                  <span className="bg-emerald-500/20 text-emerald-500 dark:text-emerald-400 border border-emerald-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 animate-in fade-in">
                    <CheckCheck className="w-3 h-3" /> Saved
                  </span>
                )}
              </div>
              <p 
                style={{ color: isLight ? "#64748b" : "#94a3b8" }}
                className="text-xs mt-0.5 leading-relaxed"
              >
                Choose an atmospheric scheme and toggle between light or dark mode. Preferences persist to your musician profile.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ color: isLight ? "#64748b" : "#94a3b8" }}
            className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer"
            aria-label="Close theme selector"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Switcher Banner */}
        <div 
          style={{
            backgroundColor: activePortalScheme.mutedSurfaceColor,
            borderColor: activePortalScheme.borderColor,
          }}
          className="px-6 py-3.5 border-b flex flex-wrap items-center justify-between gap-3 shrink-0 transition-colors duration-300"
        >
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" style={{ color: activePortalScheme.primaryColor }} />
            <span 
              style={{ color: activePortalScheme.textColor }}
              className="text-xs font-bold"
            >
              Display Mode: <span className="capitalize">{activePortalMode} Mode</span>
            </span>
          </div>

          {/* Segmented Light/Dark Switcher */}
          <div 
            style={{
              backgroundColor: isLight ? "#f1f5f9" : "#090d16",
              borderColor: activePortalScheme.borderColor,
            }}
            className="inline-flex items-center p-1 rounded-2xl border gap-1 shadow-inner"
            role="radiogroup"
            aria-label="Theme mode"
          >
            <button
              type="button"
              role="radio"
              aria-checked={activePortalMode === "dark"}
              onClick={() => handleToggleMode("dark")}
              disabled={isTogglingMode}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activePortalMode === "dark"
                  ? "bg-slate-800 text-yellow-400 shadow-md border border-slate-700"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Moon className="w-3.5 h-3.5" />
              <span>Dark</span>
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={activePortalMode === "light"}
              onClick={() => handleToggleMode("light")}
              disabled={isTogglingMode}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activePortalMode === "light"
                  ? "bg-white text-slate-900 shadow-md border border-slate-200"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Sun className="w-3.5 h-3.5 text-amber-500" />
              <span>Light</span>
            </button>
          </div>
        </div>

        {/* Scheme List */}
        <div className="p-6 overflow-y-auto space-y-3.5 flex-1 [scrollbar-width:thin]">
          <div 
            style={{ color: isLight ? "#64748b" : "#94a3b8" }}
            className="text-[11px] font-mono uppercase tracking-wider font-bold px-1"
          >
            Atmospheric Palettes ({availablePortalSchemes.length} Available in {isLight ? "Light" : "Dark"} Mode)
          </div>

          <div className="grid grid-cols-1 gap-3">
            {availablePortalSchemes.map((scheme) => {
              const isSelected = scheme.id === activePortalSchemeId;
              const isSaving = savingSchemeId === scheme.id;
              const schemeTokens = scheme.modes[activePortalMode] || scheme.modes.dark;

              return (
                <button
                  key={scheme.id}
                  type="button"
                  onClick={() => handleSelectScheme(scheme)}
                  style={{
                    backgroundColor: isSelected 
                      ? schemeTokens.surfaceColor 
                      : (isLight ? "#ffffff" : `${schemeTokens.surfaceColor}d0`),
                    borderColor: isSelected ? schemeTokens.primaryColor : schemeTokens.borderColor,
                    color: schemeTokens.textColor,
                  }}
                  className={`w-full text-left p-4 rounded-2xl border transition-all relative group flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 cursor-pointer ${
                    isSelected
                      ? "shadow-lg ring-2 ring-offset-1"
                      : "hover:border-slate-400 dark:hover:border-slate-500 hover:opacity-100 opacity-95"
                  }`}
                >
                  {/* Left: Scheme Info & Swatches */}
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2.5">
                      {/* Swatch dots for current mode */}
                      <div className="flex items-center -space-x-1 shrink-0">
                        {schemeTokens.previewSwatches.map((color, i) => (
                          <div
                            key={i}
                            className="w-4 h-4 rounded-full border border-slate-400 dark:border-slate-950 shadow-sm"
                            style={{ backgroundColor: color }}
                            title={`Color swatch ${i + 1}: ${color}`}
                          />
                        ))}
                      </div>

                      <span 
                        style={{ color: schemeTokens.textColor }}
                        className="font-extrabold text-sm group-hover:opacity-85 transition"
                      >
                        {scheme.name}
                      </span>

                      {isSelected && (
                        <span 
                          style={{
                            backgroundColor: `${schemeTokens.primaryColor}20`,
                            borderColor: `${schemeTokens.primaryColor}50`,
                            color: schemeTokens.primaryColor,
                          }}
                          className="border text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-xs"
                        >
                          <CheckCircle2 className="w-3 h-3" /> Active
                        </span>
                      )}
                    </div>

                    <p 
                      style={{ color: isLight ? "#475569" : "#cbd5e1" }}
                      className="text-xs leading-relaxed"
                    >
                      {scheme.description}
                    </p>

                    <div 
                      style={{ color: isLight ? "#64748b" : "#94a3b8" }}
                      className="text-[10px] font-mono flex flex-wrap items-center gap-3"
                    >
                      <span>Ambient: <code className="font-semibold">{schemeTokens.backgroundColor}</code></span>
                      <span>Surface: <code className="font-semibold">{schemeTokens.surfaceColor}</code></span>
                      <span>Accent: <code className="font-semibold">{schemeTokens.primaryColor}</code></span>
                    </div>
                  </div>

                  {/* Right: Selection Action State */}
                  <div className="shrink-0 self-end sm:self-center">
                    {isSelected ? (
                      <div 
                        style={{ 
                          backgroundColor: schemeTokens.primaryColor,
                          color: (scheme.id === "monongahela-steel" && !isLight) || (scheme.id === "eagleburger-gold" && !isLight)
                            ? "#0f172a" 
                            : "#ffffff"
                        }}
                        className="w-8 h-8 rounded-xl flex items-center justify-center font-bold shadow-md"
                      >
                        <Check className="w-4 h-4 stroke-[3]" />
                      </div>
                    ) : (
                      <div 
                        style={{
                          borderColor: schemeTokens.borderColor,
                          backgroundColor: schemeTokens.mutedSurfaceColor,
                          color: schemeTokens.textColor,
                        }}
                        className="px-3.5 py-1.5 rounded-xl border text-xs font-semibold transition group-hover:border-slate-400 group-hover:shadow-sm"
                      >
                        {isSaving ? "Applying..." : "Select"}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div 
          style={{
            backgroundColor: activePortalScheme.backgroundColor,
            borderColor: activePortalScheme.borderColor,
          }}
          className="p-4 px-6 border-t flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 text-xs transition-colors duration-300"
        >
          <div 
            style={{ color: isLight ? "#64748b" : "#94a3b8" }}
            className="flex items-center gap-2"
          >
            <Laptop className="w-3.5 h-3.5" style={{ color: activePortalScheme.primaryColor }} />
            <span>Harmonious backgrounds and surfaces apply across all 23 portal workspaces.</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{ 
              backgroundColor: activePortalScheme.primaryColor,
              color: (activePortalScheme.id === "monongahela-steel" && !isLight) || (activePortalScheme.id === "eagleburger-gold" && !isLight)
                ? "#0f172a" 
                : "#ffffff"
            }}
            className="w-full sm:w-auto px-5 py-2 rounded-xl font-bold transition shadow hover:opacity-90 cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

