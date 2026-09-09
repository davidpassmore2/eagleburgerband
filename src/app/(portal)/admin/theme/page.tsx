"use client";

import React, { useEffect, useState } from "react";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/lib/context/AuthContext";
import { canManageTheme } from "@/lib/auth/permissions";
import { User } from "@/lib/schema/user";
import { 
  Palette, 
  Save, 
  Check, 
  Loader2, 
  ShieldAlert, 
  Sparkles,
  RefreshCw 
} from "lucide-react";

interface ThemeConfig {
  primaryColor: string;
  accentColor: string;
  bandName: string;
  subheading: string;
  logoUrl: string;
  activeSeason: string;
  updatedAt?: string;
}

const DEFAULT_THEME: ThemeConfig = {
  primaryColor: "#facc15", // EBB Yellow
  accentColor: "#0f172a",  // Slate 900
  bandName: "Eagleburger Band",
  subheading: "Brass, percussion, and mobile street revelry.",
  logoUrl: "/ebb-logo.png",
  activeSeason: "2026 Fall Season",
};

export default function ThemeCustomizerPage() {
  const { profile, loading: authLoading } = useAuth();
  const [theme, setTheme] = useState<ThemeConfig>(DEFAULT_THEME);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (authLoading) return;

    const unsub = onSnapshot(
      doc(db, "theme", "config"),
      (snap) => {
        if (snap.exists()) {
          setTheme({ ...DEFAULT_THEME, ...snap.data() } as ThemeConfig);
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
        Loading brand palette...
      </div>
    );
  }

  if (!canManageTheme(profile as unknown as User)) {
    return (
      <div className="p-8 text-rose-400 text-xs font-semibold flex items-center gap-2">
        <ShieldAlert className="w-4 h-4" />
        Web Manager or Admin privileges required to customize portal branding.
      </div>
    );
  }

  const handleSaveTheme = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSavedSuccess(false);

    try {
      await setDoc(doc(db, "theme", "config"), {
        ...theme,
        updatedAt: new Date().toISOString(),
      }, { merge: true });

      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      alert("Failed to save theme settings: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
      {/* Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-yellow-400 bg-slate-950 px-2.5 py-0.5 rounded border border-slate-800">
              Admin Studio
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Brand & Palette</h1>
          <p className="text-xs text-slate-400">
            Customize portal colors, official ensemble title, logo assets, and active season slogans.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Theme Settings Form */}
        <form
          onSubmit={handleSaveTheme}
          className="md:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl"
        >
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

            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                Tagline / Subheading
              </label>
              <input
                type="text"
                value={theme.subheading}
                onChange={(e) => setTheme({ ...theme, subheading: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400"
              />
            </div>

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

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                  Primary Brand Hex
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={theme.primaryColor}
                    onChange={(e) => setTheme({ ...theme, primaryColor: e.target.value })}
                    className="w-8 h-8 rounded border border-slate-800 bg-slate-950 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={theme.primaryColor}
                    onChange={(e) => setTheme({ ...theme, primaryColor: e.target.value })}
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-yellow-400"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                  Accent Hex
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={theme.accentColor}
                    onChange={(e) => setTheme({ ...theme, accentColor: e.target.value })}
                    className="w-8 h-8 rounded border border-slate-800 bg-slate-950 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={theme.accentColor}
                    onChange={(e) => setTheme({ ...theme, accentColor: e.target.value })}
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-yellow-400"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setTheme(DEFAULT_THEME)}
              className="text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1 transition"
            >
              <RefreshCw className="w-3 h-3" /> Reset Defaults
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition disabled:opacity-50"
            >
              {isSaving ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : savedSuccess ? (
                <Check className="w-3.5 h-3.5 text-emerald-950" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              {isSaving ? "Saving..." : savedSuccess ? "Settings Saved!" : "Save Brand Settings"}
            </button>
          </div>
        </form>

        {/* Live Preview Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl flex flex-col justify-between">
          <div className="space-y-3">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 block">
              Live Preview
            </span>
            <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-2">
              <div className="flex items-center gap-2">
                <div
                  className="font-black px-2 py-0.5 rounded text-xs tracking-wider"
                  style={{ backgroundColor: theme.primaryColor, color: "#020617" }}
                >
                  EBB
                </div>
                <div className="font-bold text-xs text-white">{theme.bandName}</div>
              </div>
              <p className="text-[11px] text-slate-400">{theme.subheading}</p>
              <div className="pt-2 text-[10px] font-mono text-yellow-400">
                {theme.activeSeason}
              </div>
            </div>
          </div>

          <div className="text-[11px] text-slate-500 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
            Changes sync instantly to the Musician Portal.
          </div>
        </div>
      </div>
    </div>
  );
}