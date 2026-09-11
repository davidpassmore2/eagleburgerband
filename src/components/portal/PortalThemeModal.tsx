"use client";

import React, { useEffect, useState } from "react";
import { useTheme } from "@/lib/context/ThemeContext";
import { PortalColorScheme } from "@/lib/schema/theme";
import { 
  Palette, 
  X, 
  Check, 
  CheckCircle2, 
  Laptop,
  CheckCheck
} from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function PortalThemeModal({ isOpen, onClose }: Props) {
  const { 
    activePortalSchemeId,
    activePortalScheme, 
    availablePortalSchemes, 
    setMemberPortalTheme 
  } = useTheme();

  const [savingSchemeId, setSavingSchemeId] = useState<string | null>(null);
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
      await setMemberPortalTheme(scheme.id);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2000);
    } finally {
      setSavingSchemeId(null);
    }
  };

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
          className="p-6 border-b flex items-start justify-between gap-4 shrink-0 transition-colors duration-300"
        >
          <div className="flex items-center gap-3">
            <div 
              style={{
                backgroundColor: activePortalScheme.mutedSurfaceColor,
                borderColor: activePortalScheme.borderColor,
                color: activePortalScheme.primaryColor,
              }}
              className="w-10 h-10 rounded-2xl border flex items-center justify-center shrink-0"
            >
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="portal-theme-title" className="text-base sm:text-lg font-black text-white uppercase tracking-tight">
                  Portal Appearance & Harmony
                </h2>
                {justSaved && (
                  <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 animate-in fade-in">
                    <CheckCheck className="w-3 h-3" /> Saved
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Every scheme blends ambient background, card surfaces, borders, and accents into a unified atmospheric palette.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition"
            aria-label="Close theme selector"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scheme List */}
        <div className="p-6 overflow-y-auto space-y-3.5 flex-1 [scrollbar-width:thin]">
          <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-bold px-1">
            Atmospheric Themes (5 Available)
          </div>

          <div className="grid grid-cols-1 gap-3">
            {availablePortalSchemes.map((scheme) => {
              const isSelected = scheme.id === activePortalSchemeId;
              const isSaving = savingSchemeId === scheme.id;

              return (
                <button
                  key={scheme.id}
                  type="button"
                  onClick={() => handleSelectScheme(scheme)}
                  style={{
                    backgroundColor: isSelected ? scheme.surfaceColor : `${scheme.surfaceColor}cc`,
                    borderColor: isSelected ? scheme.primaryColor : scheme.borderColor,
                  }}
                  className={`w-full text-left p-4 rounded-2xl border transition-all relative group flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                    isSelected
                      ? "shadow-xl ring-1"
                      : "hover:border-slate-500 hover:opacity-100 opacity-90"
                  }`}
                >
                  {/* Left: Scheme Info & Swatches */}
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2.5">
                      {/* Swatch dots */}
                      <div className="flex items-center -space-x-1 shrink-0">
                        {scheme.previewSwatches.map((color, i) => (
                          <div
                            key={i}
                            className="w-4 h-4 rounded-full border border-slate-950 shadow-sm"
                            style={{ backgroundColor: color }}
                            title={`Color swatch ${i + 1}: ${color}`}
                          />
                        ))}
                      </div>

                      <span className="font-extrabold text-sm text-white group-hover:text-yellow-300 transition">
                        {scheme.name}
                      </span>

                      {isSelected && (
                        <span 
                          style={{
                            backgroundColor: `${scheme.primaryColor}20`,
                            borderColor: `${scheme.primaryColor}50`,
                            color: scheme.primaryColor,
                          }}
                          className="border text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1"
                        >
                          <CheckCircle2 className="w-3 h-3" /> Active
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed">
                      {scheme.description}
                    </p>

                    <div className="text-[10px] font-mono text-slate-400 flex flex-wrap items-center gap-3">
                      <span>Ambient: <code className="text-slate-200">{scheme.backgroundColor}</code></span>
                      <span>Surface: <code className="text-slate-200">{scheme.surfaceColor}</code></span>
                      <span>Accent: <code className="text-slate-200">{scheme.primaryColor}</code></span>
                    </div>
                  </div>

                  {/* Right: Selection Action State */}
                  <div className="shrink-0 self-end sm:self-center">
                    {isSelected ? (
                      <div 
                        style={{ 
                          backgroundColor: scheme.primaryColor,
                          color: scheme.id === "monongahela-steel" ? "#0f172a" : "#020617"
                        }}
                        className="w-8 h-8 rounded-xl flex items-center justify-center font-bold shadow"
                      >
                        <Check className="w-4 h-4" />
                      </div>
                    ) : (
                      <div 
                        style={{
                          borderColor: scheme.borderColor,
                          backgroundColor: scheme.mutedSurfaceColor,
                          color: scheme.textColor,
                        }}
                        className="px-3.5 py-1.5 rounded-xl border text-xs font-semibold transition group-hover:border-white/40"
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
          <div className="flex items-center gap-2 text-slate-400">
            <Laptop className="w-3.5 h-3.5" style={{ color: activePortalScheme.primaryColor }} />
            <span>Harmonious backgrounds and surfaces apply across all 23 portal workspaces.</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{ 
              backgroundColor: activePortalScheme.primaryColor,
              color: activePortalScheme.id === "monongahela-steel" ? "#0f172a" : "#020617"
            }}
            className="w-full sm:w-auto px-5 py-2 rounded-xl font-bold transition shadow hover:opacity-90"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

