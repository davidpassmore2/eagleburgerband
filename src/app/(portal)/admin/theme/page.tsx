"use client";

import React, { useEffect, useState } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/lib/context/AuthContext";
import { canManageTheme } from "@/lib/auth/permissions";
import { Palette, ShieldAlert, Check, RefreshCw } from "lucide-react";
import { bandConfig } from "@/band.config";

interface ThemeSettings {
  primary: string;
  background: string;
  surface: string;
  accent: string;
  mutedText: string;
}

export default function ThemeAdminPage() {
  const { profile, loading: authLoading } = useAuth();
  const [theme, setTheme] = useState<ThemeSettings>({
    primary: bandConfig.defaultTheme.primary,
    background: bandConfig.defaultTheme.background,
    surface: bandConfig.defaultTheme.surface,
    accent: bandConfig.defaultTheme.accent,
    mutedText: bandConfig.defaultTheme.mutedText,
  });
  const [savedStatus, setSavedStatus] = useState(false);

  useEffect(() => {
    async function loadTheme() {
      try {
        const snap = await getDoc(doc(db, "settings", "theme"));
        if (snap.exists()) {
          const data = snap.data() as Partial<ThemeSettings>;
          setTheme((prev) => ({
            primary: data.primary || prev.primary,
            background: data.background || prev.background,
            surface: data.surface || prev.surface,
            accent: data.accent || prev.accent,
            mutedText: data.mutedText || prev.mutedText,
          }));
        }
      } catch (err) {
        console.error("Failed to load theme settings:", err);
      }
    }
    loadTheme();
  }, []);

  if (authLoading) {
    return <div className="p-8 text-slate-400">Checking credentials...</div>;
  }

  if (!canManageTheme(profile)) {
    return (
      <div className="p-8 text-amber-400 flex items-center gap-3">
        <ShieldAlert className="w-6 h-6 shrink-0" />
        <span>Web Manager or Administrator clearance required to configure theme colors.</span>
      </div>
    );
  }

  const handleSave = async () => {
    try {
      await setDoc(doc(db, "settings", "theme"), {
        ...theme,
        updatedAt: new Date().toISOString(),
      });
      setSavedStatus(true);
      setTimeout(() => setSavedStatus(false), 2500);
    } catch (err) {
      console.error("Failed to persist theme settings:", err);
    }
  };

  const handleResetDefaults = () => {
    setTheme({
      primary: bandConfig.defaultTheme.primary,
      background: bandConfig.defaultTheme.background,
      surface: bandConfig.defaultTheme.surface,
      accent: bandConfig.defaultTheme.accent,
      mutedText: bandConfig.defaultTheme.mutedText,
    });
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Palette className="text-yellow-400 w-6 h-6" /> Dynamic Theme Customizer
          </h1>
          <p className="text-slate-400 text-sm">
            Adjust brand palette hex codes across both the public website and musician portal.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs font-medium transition"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Reset Defaults
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-1.5 px-4 py-2 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold rounded text-xs transition shadow"
          >
            <Check className="w-4 h-4" /> Save Theme
          </button>
        </div>
      </div>

      {savedStatus && (
        <div className="p-3 bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 rounded text-xs">
          Theme colors successfully saved to Firestore!
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Controls Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300 border-b border-slate-800 pb-2">
            Color Palette Controls
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">
                Primary Brand (Gold / Yellow)
              </label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={theme.primary}
                  onChange={(e) => setTheme({ ...theme, primary: e.target.value })}
                  className="h-8 w-12 rounded border border-slate-700 bg-transparent cursor-pointer"
                />
                <input
                  type="text"
                  value={theme.primary}
                  onChange={(e) => setTheme({ ...theme, primary: e.target.value })}
                  className="flex-1 bg-slate-950 border border-slate-700 rounded px-2 text-xs font-mono text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">
                Accent / Attention Color
              </label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={theme.accent}
                  onChange={(e) => setTheme({ ...theme, accent: e.target.value })}
                  className="h-8 w-12 rounded border border-slate-700 bg-transparent cursor-pointer"
                />
                <input
                  type="text"
                  value={theme.accent}
                  onChange={(e) => setTheme({ ...theme, accent: e.target.value })}
                  className="flex-1 bg-slate-950 border border-slate-700 rounded px-2 text-xs font-mono text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">
                Background Canvas
              </label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={theme.background}
                  onChange={(e) => setTheme({ ...theme, background: e.target.value })}
                  className="h-8 w-12 rounded border border-slate-700 bg-transparent cursor-pointer"
                />
                <input
                  type="text"
                  value={theme.background}
                  onChange={(e) => setTheme({ ...theme, background: e.target.value })}
                  className="flex-1 bg-slate-950 border border-slate-700 rounded px-2 text-xs font-mono text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">
                Surface / Card Panels
              </label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={theme.surface}
                  onChange={(e) => setTheme({ ...theme, surface: e.target.value })}
                  className="h-8 w-12 rounded border border-slate-700 bg-transparent cursor-pointer"
                />
                <input
                  type="text"
                  value={theme.surface}
                  onChange={(e) => setTheme({ ...theme, surface: e.target.value })}
                  className="flex-1 bg-slate-950 border border-slate-700 rounded px-2 text-xs font-mono text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">
                Muted Typography
              </label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={theme.mutedText}
                  onChange={(e) => setTheme({ ...theme, mutedText: e.target.value })}
                  className="h-8 w-12 rounded border border-slate-700 bg-transparent cursor-pointer"
                />
                <input
                  type="text"
                  value={theme.mutedText}
                  onChange={(e) => setTheme({ ...theme, mutedText: e.target.value })}
                  className="flex-1 bg-slate-950 border border-slate-700 rounded px-2 text-xs font-mono text-white"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Live Interactive Preview */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300 border-b border-slate-800 pb-2">
              Live Preview
            </h2>

            <div
              style={{ backgroundColor: theme.background }}
              className="p-5 rounded-lg border border-slate-800 space-y-4 transition-colors"
            >
              <div
                style={{ backgroundColor: theme.surface }}
                className="p-4 rounded-lg border border-slate-700/60 shadow-inner space-y-2 transition-colors"
              >
                <div style={{ color: theme.primary }} className="font-black text-base transition-colors">
                  Eagleburger Brass Live
                </div>
                <div style={{ color: theme.mutedText }} className="text-xs leading-relaxed transition-colors">
                  High-energy mobile brass performance. Live theme tokens rendered dynamically.
                </div>
                <div className="pt-2 flex gap-2">
                  <button
                    type="button"
                    style={{ backgroundColor: theme.primary, color: theme.background }}
                    className="px-3 py-1.5 text-xs font-bold rounded transition-colors"
                  >
                    Primary Action
                  </button>
                  <button
                    type="button"
                    style={{ backgroundColor: theme.accent, color: "#ffffff" }}
                    className="px-3 py-1.5 text-xs font-bold rounded transition-colors"
                  >
                    Accent Accent
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-800">
            Saving updates Firestore document <code className="text-yellow-400 font-mono">settings/theme</code>.
          </div>
        </div>
      </div>
    </div>
  );
}