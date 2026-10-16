"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/context/AuthContext";
import { hasRole } from "@/lib/auth/permissions";
import AccessDenied from "@/components/portal/AccessDenied";
import PortalBreadcrumb from "@/components/portal/PortalBreadcrumb";
import { useAuthProvidersConfig } from "@/lib/hooks/useAuthProvidersConfig";
import { AuthProvidersConfig } from "@/lib/schema/authProvidersConfig";
import {
  Lock,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Save,
  HelpCircle,
  Copy,
  Check,
  Eye,
  Info,
} from "lucide-react";

export default function AuthProvidersStudioPage() {
  const { profile, isRealAdmin } = useAuth();
  const { config, loading, error, saveConfig } = useAuthProvidersConfig();

  const [formState, setFormState] = useState<AuthProvidersConfig>(config);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [showSetupGuide, setShowSetupGuide] = useState(false);

  // Sync state once loaded from Firestore
  useEffect(() => {
    if (!loading) {
      setFormState(config);
    }
  }, [config, loading]);

  // RBAC Guardrail: Strictly for admins
  const isAdminUser = isRealAdmin || hasRole(profile, "admin");
  if (!loading && !isAdminUser) {
    return (
      <AccessDenied
        message="The Authentication Providers Studio is strictly restricted to Band Administrators."
        actionHref="/admin"
        actionLabel="Return to Business & Admin"
      />
    );
  }

  const redirectUri = "https://eagleburger-band-beta.firebaseapp.com/__/auth/handler";

  const handleCopyRedirectUri = async () => {
    try {
      await navigator.clipboard.writeText(redirectUri);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } catch {
      // Ignore clipboard error
    }
  };

  const handleToggle = (key: keyof Pick<AuthProvidersConfig, "google" | "apple" | "microsoft" | "github" | "magicLink" | "password">) => {
    setSaveStatus(null);
    const updated = {
      ...formState,
      [key]: !formState[key],
    };

    // Safety guardrail: At least one sign-in method must remain enabled
    const totalActive =
      (updated.google ? 1 : 0) +
      (updated.apple ? 1 : 0) +
      (updated.microsoft ? 1 : 0) +
      (updated.github ? 1 : 0) +
      (updated.magicLink ? 1 : 0) +
      (updated.password ? 1 : 0);

    if (totalActive === 0) {
      setSaveStatus({
        type: "error",
        message: "At least one authentication method must remain enabled to prevent musician lockout.",
      });
      return;
    }

    setFormState(updated);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveStatus(null);

    const res = await saveConfig(formState, {
      uid: profile?.uid,
      displayName: profile?.displayName,
      email: profile?.email || undefined,
    });

    setIsSaving(false);
    if (res.success) {
      setSaveStatus({
        type: "success",
        message: "Authentication provider visibility updated successfully. The login screen reflects these changes immediately.",
      });
    } else {
      setSaveStatus({
        type: "error",
        message: res.error || "Failed to save authentication settings.",
      });
    }
  };

  const hasUnsavedChanges =
    formState.google !== config.google ||
    formState.apple !== config.apple ||
    formState.microsoft !== config.microsoft ||
    formState.github !== config.github ||
    formState.magicLink !== config.magicLink ||
    formState.password !== config.password;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Universal Breadcrumb */}
      <PortalBreadcrumb className="mb-2" />

      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-slate-900/60 border border-slate-800/80 p-6 sm:p-8 shadow-2xl backdrop-blur-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center gap-4 sm:gap-5">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-yellow-400/10 border border-yellow-400/30 text-yellow-400 flex items-center justify-center shrink-0 shadow-inner">
              <Lock className="w-7 h-7 sm:w-8 sm:h-8" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-800 text-yellow-400 border border-slate-700 uppercase tracking-wider">
                  Access &amp; Security
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  Admin Only
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-arvo font-bold text-white uppercase tracking-tight">
                Authentication Providers Studio
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
                Control which external OAuth and email authentication methods are active and visible on the musician login screen.
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={isSaving || !hasUnsavedChanges}
            onClick={handleSave}
            className={`inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition shadow-lg cursor-pointer shrink-0 ${
              hasUnsavedChanges
                ? "bg-yellow-400 hover:bg-yellow-300 text-slate-950 shadow-yellow-400/20 hover:scale-102"
                : "bg-slate-800 text-slate-400 border border-slate-700/80 opacity-60 cursor-not-allowed"
            }`}
          >
            {isSaving ? (
              <div className="w-4 h-4 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>{hasUnsavedChanges ? "Save Settings" : "Saved"}</span>
          </button>
        </div>
      </div>

      {/* Save Feedback Banner */}
      {saveStatus && (
        <div
          className={`p-4 rounded-2xl flex items-center gap-3 text-xs font-medium border ${
            saveStatus.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
              : "bg-rose-500/10 border-rose-500/30 text-rose-300"
          }`}
        >
          {saveStatus.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
          )}
          <span>{saveStatus.message}</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-3">
          <Info className="w-5 h-5 shrink-0" />
          <span>Firestore status: Using local defaults ({error}). Writes will synchronize once connected.</span>
        </div>
      )}

      {/* Main Grid: Provider Toggles & Live Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column (2 Cols): Provider Controls */}
        <div className="lg:col-span-2 space-y-6">
          {/* Section A: External Identity Providers (OAuth) */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
            <div>
              <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-yellow-400 flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                <span>External Identity Providers (OAuth)</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Toggle external social sign-in buttons displayed on <code className="text-slate-300">/login</code> and <code className="text-slate-300">/claim</code>.
              </p>
            </div>

            <div className="space-y-4">
              {/* Google */}
              <div className="flex items-start justify-between p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-slate-800/90 border border-slate-700/80 flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
                      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"/>
                      <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
                      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                    </svg>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-white text-sm">Google Sign-In</h3>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        Active &amp; Recommended
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Primary sign-in method for Google accounts and Google Workspace addresses.
                    </p>
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                  <input
                    type="checkbox"
                    checked={formState.google}
                    onChange={() => handleToggle("google")}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yellow-400"></div>
                </label>
              </div>

              {/* Apple */}
              <div className="flex items-start justify-between p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-slate-800/90 border border-slate-700/80 flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5 fill-current text-white" viewBox="0 0 170 170">
                      <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.7-3.04-7.66-7.79-11.89-14.24-5.23-7.98-9.39-16.71-12.47-26.2-3.08-9.48-4.63-18.7-4.63-27.65 0-12.42 3.08-23.01 9.24-31.78 6.16-8.77 14.07-13.29 23.73-13.56 4.48 0 9.41 1.15 14.78 3.44 5.38 2.29 9.17 3.51 11.39 3.65 1.8.14 5.76-1.15 11.89-3.86 6.13-2.71 11.45-3.88 15.96-3.52 11.75.95 21.09 5.51 28.02 13.68-10.45 6.32-15.54 14.88-15.26 25.68.27 8.35 3.52 15.35 9.75 21 6.23 5.66 13.58 8.76 22.06 9.32-2.12 6.32-4.68 12.43-7.67 18.32zM119.22 33.64c0-6.72 2.45-13.08 7.35-19.08 4.9-6 10.9-9.84 18-11.52.54 6.72-1.57 13.08-6.33 19.08-4.76 6-10.76 9.84-18 11.52-.36-.67-.62-1.42-.77-2.25-.16-.83-.25-1.66-.25-2.49z"/>
                    </svg>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-white text-sm">Apple Sign-In</h3>
                      <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                        Apple Developer Setup Required
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Supports Apple IDs, iCloud accounts, and Face ID. Requires Apple Developer Team ID and key in Firebase Console.
                    </p>
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                  <input
                    type="checkbox"
                    checked={formState.apple}
                    onChange={() => handleToggle("apple")}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yellow-400"></div>
                </label>
              </div>

              {/* Microsoft */}
              <div className="flex items-start justify-between p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-slate-800/90 border border-slate-700/80 flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 23 23">
                      <path fill="#f35325" d="M1 1h10v10H1z"/>
                      <path fill="#81bc06" d="M12 1h10v10H12z"/>
                      <path fill="#05a6f0" d="M1 12h10v10H1z"/>
                      <path fill="#ffba08" d="M12 12h10v10H12z"/>
                    </svg>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-white text-sm">Microsoft Sign-In</h3>
                      <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                        Azure App Setup Required
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Supports personal Microsoft accounts (Outlook, Xbox) and institutional Microsoft 365 work accounts.
                    </p>
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                  <input
                    type="checkbox"
                    checked={formState.microsoft}
                    onChange={() => handleToggle("microsoft")}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yellow-400"></div>
                </label>
              </div>

              {/* GitHub */}
              <div className="flex items-start justify-between p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-slate-800/90 border border-slate-700/80 flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5 fill-current text-white" viewBox="0 0 24 24">
                      <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
                    </svg>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-white text-sm">GitHub Sign-In</h3>
                      <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                        OAuth App Setup Required
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Developer and technical staff sign-in via GitHub. Requires GitHub OAuth Client ID and secret.
                    </p>
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                  <input
                    type="checkbox"
                    checked={formState.github}
                    onChange={() => handleToggle("github")}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yellow-400"></div>
                </label>
              </div>
            </div>
          </div>

          {/* Section B: Email Authentication Modes */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
            <div>
              <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-yellow-400 flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                <span>Email Authentication Modes</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Configure email-based authentication mechanisms for musicians who prefer direct email.
              </p>
            </div>

            <div className="space-y-4">
              {/* Magic Link */}
              <div className="flex items-start justify-between p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-white text-sm">1-Click Passwordless Magic Link</h3>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      Active
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Sends a secure 1-click sign-in link to the musician&apos;s email address. Eliminates forgotten passwords.
                  </p>
                </div>

                <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                  <input
                    type="checkbox"
                    checked={formState.magicLink}
                    onChange={() => handleToggle("magicLink")}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yellow-400"></div>
                </label>
              </div>

              {/* Password */}
              <div className="flex items-start justify-between p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-white text-sm">Standard Email &amp; Password</h3>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      Active
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Allows musicians and leadership to sign in with an email and password, with password reset workflows.
                  </p>
                </div>

                <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                  <input
                    type="checkbox"
                    checked={formState.password}
                    onChange={() => handleToggle("password")}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yellow-400"></div>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (1 Col): Live Preview Card & Setup Info */}
        <div className="space-y-6">
          {/* Live Preview Card */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-yellow-400 flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5" />
                <span>Live Login Preview</span>
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                Real-Time Simulation
              </span>
            </div>

            {/* Simulated Login Box */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-4">
              <div className="text-center space-y-1 border-b border-slate-800/60 pb-3">
                <h4 className="font-arvo font-bold text-white text-xs uppercase tracking-tight">
                  Musician &amp; Crew Portal
                </h4>
                <p className="text-[10px] text-slate-400">
                  Simulated view of /login with current toggles
                </p>
              </div>

              {/* Simulated Social Buttons */}
              {(formState.google || formState.apple || formState.microsoft || formState.github) ? (
                <div className="space-y-2">
                  <div className="text-[9px] font-mono text-slate-400 uppercase tracking-wider text-center">
                    Sign in with external account
                  </div>
                  <div className={`grid ${
                    [formState.google, formState.apple, formState.microsoft, formState.github].filter(Boolean).length === 1
                      ? "grid-cols-1"
                      : "grid-cols-2"
                  } gap-2`}>
                    {formState.google && (
                      <div className="py-2 px-2.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 text-[11px] font-medium flex items-center justify-center gap-2">
                        <span>Google</span>
                      </div>
                    )}
                    {formState.apple && (
                      <div className="py-2 px-2.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 text-[11px] font-medium flex items-center justify-center gap-2">
                        <span>Apple</span>
                      </div>
                    )}
                    {formState.microsoft && (
                      <div className="py-2 px-2.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 text-[11px] font-medium flex items-center justify-center gap-2">
                        <span>Microsoft</span>
                      </div>
                    )}
                    {formState.github && (
                      <div className="py-2 px-2.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 text-[11px] font-medium flex items-center justify-center gap-2">
                        <span>GitHub</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-center text-[10px] text-slate-500">
                  External accounts disabled
                </div>
              )}

              {/* Simulated Email Options */}
              <div className="space-y-2 pt-2 border-t border-slate-800/60">
                <div className="text-[9px] font-mono text-slate-400 uppercase tracking-wider text-center">
                  Or continue with email
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <div className={`py-1.5 px-2 rounded-lg text-[10px] font-bold text-center ${
                    formState.magicLink
                      ? "bg-yellow-400 text-slate-950"
                      : "bg-slate-900 text-slate-600 line-through"
                  }`}>
                    Magic Link
                  </div>
                  <div className={`py-1.5 px-2 rounded-lg text-[10px] font-bold text-center ${
                    formState.password
                      ? "bg-slate-800 text-slate-200 border border-slate-700"
                      : "bg-slate-900 text-slate-600 line-through"
                  }`}>
                    Password
                  </div>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 text-center">
              Changes take effect globally on both <code className="text-yellow-400/90">/login</code> and <code className="text-yellow-400/90">/claim</code> once saved.
            </p>
          </div>

          {/* Setup Guide Toggle */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 space-y-4">
            <button
              type="button"
              onClick={() => setShowSetupGuide(!showSetupGuide)}
              className="w-full flex items-center justify-between text-left cursor-pointer"
            >
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-yellow-400" />
                <span>OAuth Setup Instructions</span>
              </span>
              <span className="text-xs text-yellow-400 font-bold">
                {showSetupGuide ? "Hide" : "View"}
              </span>
            </button>

            {showSetupGuide && (
              <div className="space-y-4 pt-2 text-xs text-slate-300 border-t border-slate-800">
                <div>
                  <span className="font-bold text-white block mb-1">
                    Firebase OAuth Callback URL:
                  </span>
                  <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-950 border border-slate-800 font-mono text-[11px] text-yellow-400">
                    <span className="truncate flex-1">{redirectUri}</span>
                    <button
                      type="button"
                      onClick={handleCopyRedirectUri}
                      className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition"
                      title="Copy URL"
                    >
                      {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2 text-[11px] text-slate-400 leading-relaxed">
                  <p>
                    <strong className="text-white">GitHub:</strong> Register an OAuth app at <code className="text-yellow-400">github.com/settings/developers</code> using the callback URL above. Paste Client ID and Secret in Firebase Console.
                  </p>
                  <p>
                    <strong className="text-white">Microsoft:</strong> Register an app in <code className="text-yellow-400">portal.azure.com</code> (multi-tenant + personal). Set the redirect URI above. Paste Application ID and Secret in Firebase Console.
                  </p>
                  <p>
                    <strong className="text-white">Apple:</strong> Requires an Apple Developer Account ($99/yr) to generate a Services ID, Key ID, and private key (.p8).
                  </p>
                </div>

                <div className="pt-2">
                  <a
                    href="https://console.firebase.google.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-yellow-400 hover:underline font-bold"
                  >
                    <span>Open Firebase Console</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

