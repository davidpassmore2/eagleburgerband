"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/lib/context/AuthContext";
import { canManageIntegrations } from "@/lib/auth/permissions";
import AccessDenied from "@/components/portal/AccessDenied";
import PortalBreadcrumb from "@/components/portal/PortalBreadcrumb";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import {
  DEFAULT_MIGRATION_CHECKLIST,
  MigrationChecklistItem,
  SystemIntegrationsConfig,
  SystemIntegrationsConfigSchema,
} from "@/lib/schema/integrationConfig";
import {
  KeyRound,
  RefreshCw,
  Copy,
  Check,
  Eye,
  EyeOff,
  Send,
  Cloud,
  Flame,
  ShieldCheck,
  Bell,
  Calendar,
  CheckCircle2,
  XCircle,
  FileCode,
  Download,
  ListChecks,
  Activity,
  Zap,
} from "lucide-react";
import { authedFetch } from "@/lib/firebase/authedFetch";

interface StatusResponse {
  environment: {
    detected: "development" | "beta" | "production";
    nodeEnv: string;
    vercelEnv: string;
    timestamp: string;
  };
  services: {
    firebaseClient: {
      isEmulator: boolean;
      projectId: string;
      authDomain: string;
      storageBucket: string;
      messagingSenderId: string;
      hasApiKey: boolean;
      apiKeyMasked: string;
      hasAppId: boolean;
      appIdMasked: string;
    };
    firebaseAdmin: {
      configured: boolean;
      clientEmail: string;
      projectId: string;
      projectMatch: boolean;
      hasPrivateKey: boolean;
      errorDetail: string;
    };
    resend: {
      hasKey: boolean;
      apiKeyMasked: string;
      fromEmail: string;
      appUrl: string;
      isMockMode: boolean;
      isEmulator: boolean;
      mode: string;
    };
    cloudinary: {
      hasCloudName: boolean;
      cloudName: string;
      hasUploadPreset: boolean;
      uploadPreset: string;
      configured: boolean;
    };
    webhooks: {
      hasSlack: boolean;
      slackMasked: string;
      hasDiscord: boolean;
      discordMasked: string;
      configured: boolean;
    };
  };
}

export default function IntegrationsStudioPage() {
  const { profile, loading: authLoading, firebaseUser } = useAuth();
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [activeTab, setActiveTab] = useState<"matrix" | "env" | "checklist">("matrix");
  const [envPreset, setEnvPreset] = useState<"active" | "dev" | "beta" | "prod">("active");
  const [revealSecrets, setRevealSecrets] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Test action states
  const [testingService, setTestingService] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ service: string; success: boolean; message: string } | null>(null);
  const [customTestEmail, setCustomTestEmail] = useState("");

  // Firestore Migration Checklist
  const [checklist, setChecklist] = useState<MigrationChecklistItem[]>(DEFAULT_MIGRATION_CHECKLIST);

  // 1. Fetch live diagnostic status
  const fetchStatus = async () => {
    setLoadingStatus(true);
    try {
      const res = await authedFetch("/api/admin/integrations/status");
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      }
    } catch (err) {
      console.error("Failed to fetch integration diagnostics:", err);
    } finally {
      setLoadingStatus(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    authedFetch("/api/admin/integrations/status")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load status");
        return res.json();
      })
      .then((data) => {
        if (!ignore) {
          setStatus(data);
          setLoadingStatus(false);
        }
      })
      .catch((err) => {
        if (!ignore) {
          console.error("Failed to load diagnostics:", err);
          setLoadingStatus(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, []);

  // 2. Subscribe to Firestore Migration Checklist
  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, "system_config", "integrations"),
      (snap) => {
        if (snap.exists()) {
          const parsed = SystemIntegrationsConfigSchema.safeParse(snap.data());
          if (parsed.success && parsed.data.checklist?.length) {
            setChecklist(parsed.data.checklist);
          }
        }
      },
      (err) => {
        console.warn("Checklist snapshot listener error:", err);
      }
    );
    return () => unsub();
  }, []);

  // 3. Checklist toggle handler
  const handleToggleChecklistItem = async (itemId: string) => {
    const updated = checklist.map((item) => {
      if (item.id === itemId) {
        const next = !item.completed;
        return {
          ...item,
          completed: next,
          completedAt: next ? new Date().toISOString() : null,
          completedBy: next ? profile?.displayName || firebaseUser?.displayName || "Admin" : null,
        };
      }
      return item;
    });

    setChecklist(updated);

    try {
      const payload: SystemIntegrationsConfig = {
        schemaVersion: 1,
        updatedAt: new Date().toISOString(),
        updatedBy: profile?.displayName || firebaseUser?.displayName || "Admin",
        notes: "",
        checklist: updated,
        customWebhookUrl: "",
      };
      await setDoc(doc(db, "system_config", "integrations"), payload);
    } catch (err) {
      console.error("Failed to update checklist in Firestore:", err);
    }
  };

  // 4. Test service trigger
  const runTest = async (action: string, payload: Record<string, string> = {}) => {
    try {
      setTestingService(action);
      setTestResult(null);

      const res = await authedFetch("/api/admin/integrations/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...payload }),
      });

      const data = await res.json();
      setTestResult({
        service: action,
        success: data.success,
        message: data.message || data.error || "Completed",
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setTestResult({
        service: action,
        success: false,
        message: msg,
      });
    } finally {
      setTestingService(null);
    }
  };

  // 5. Copy helper
  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  // Generated .env content based on selected preset
  const envText = useMemo(() => {
    if (envPreset === "dev") {
      return `# ==============================================================================
# Eagleburger Band - Local Dev Environment (Offline Emulators)
# ==============================================================================

NEXT_PUBLIC_FIREBASE_API_KEY=local-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=localhost
NEXT_PUBLIC_FIREBASE_PROJECT_ID=eagleburger-band-dev
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=eagleburger-band-dev.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

NEXT_PUBLIC_USE_FIREBASE_EMULATOR=true

NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=

FIREBASE_SERVICE_ACCOUNT_KEY=

RESEND_API_KEY=
RESEND_FROM_EMAIL="Eagleburger Band <onboarding@resend.dev>"
NEXT_PUBLIC_APP_URL="http://localhost:3000"`;
    }

    if (envPreset === "beta") {
      return `# ==============================================================================
# Eagleburger Band - Beta / Staging Environment Configuration
# ==============================================================================

NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyBCam5uvZAVeIllmOGrxuZ7ZbEdRH_SdEw
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=eagleburger-band-beta.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=eagleburger-band-beta
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=eagleburger-band-beta.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=291468487856
NEXT_PUBLIC_FIREBASE_APP_ID=1:291468487856:web:d973cd03e3630f112edf75

NEXT_PUBLIC_USE_FIREBASE_EMULATOR=false

NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=zb1aouqg
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=eagleburger

FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account","project_id":"eagleburger-band-beta","client_email":"firebase-adminsdk-...@eagleburger-band-beta.iam.gserviceaccount.com","private_key":"..."}'

RESEND_API_KEY=re_beta_...YOUR_BETA_RESEND_KEY...
RESEND_FROM_EMAIL="Eagleburger Band <manager@eagleburgerband.com>"
NEXT_PUBLIC_APP_URL="https://beta.eagleburgerband.com"`;
    }

    if (envPreset === "prod") {
      return `# ==============================================================================
# Eagleburger Band - Production Live Environment Configuration
# Deploy to Vercel Project Settings > Environment Variables
# ==============================================================================

NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...YOUR_PROD_API_KEY...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=eagleburger-band.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=eagleburger-band
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=eagleburger-band.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...YOUR_PROD_SENDER_ID...
NEXT_PUBLIC_FIREBASE_APP_ID=1:...YOUR_PROD_APP_ID...

NEXT_PUBLIC_USE_FIREBASE_EMULATOR=false

NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=eagleburger
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=eagleburger-prod

FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account","project_id":"eagleburger-band","client_email":"...","private_key":"..."}'

RESEND_API_KEY=re_prod_...YOUR_PROD_RESEND_KEY...
RESEND_FROM_EMAIL="Eagleburger Band <manager@eagleburgerband.com>"
NEXT_PUBLIC_APP_URL="https://eagleburgerband.com"

# Optional Leadership Incident Dispatches
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...`;
    }

    // Active Runtime
    const s = status?.services;
    const apiKey = s?.firebaseClient?.apiKeyMasked || "AIzaSy...configured...";
    const resendKey = s?.resend?.apiKeyMasked || "re_...configured...";

    return `# ==============================================================================
# Active Runtime Configuration (.env.local)
# Detected Environment: ${(status?.environment?.detected || "unknown").toUpperCase()}
# ==============================================================================

NEXT_PUBLIC_FIREBASE_API_KEY=${apiKey}
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=${s?.firebaseClient?.authDomain || ""}
NEXT_PUBLIC_FIREBASE_PROJECT_ID=${s?.firebaseClient?.projectId || ""}
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=${s?.firebaseClient?.storageBucket || ""}
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=${s?.firebaseClient?.messagingSenderId || ""}
NEXT_PUBLIC_FIREBASE_APP_ID=${s?.firebaseClient?.appIdMasked || ""}

NEXT_PUBLIC_USE_FIREBASE_EMULATOR=${s?.firebaseClient?.isEmulator ? "true" : "false"}

NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=${s?.cloudinary?.cloudName || ""}
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=${s?.cloudinary?.uploadPreset || ""}

# Firebase Admin SDK (${s?.firebaseAdmin?.configured ? "Configured" : "Missing"})
FIREBASE_SERVICE_ACCOUNT_KEY=${revealSecrets ? "'{...}'" : s?.firebaseAdmin?.configured ? "'••••••••'" : ""}

RESEND_API_KEY=${resendKey}
RESEND_FROM_EMAIL="${s?.resend?.fromEmail || ""}"
NEXT_PUBLIC_APP_URL="${s?.resend?.appUrl || ""}"

SLACK_WEBHOOK_URL=${s?.webhooks?.slackMasked || ""}
DISCORD_WEBHOOK_URL=${s?.webhooks?.discordMasked || ""}`;
  }, [envPreset, status, revealSecrets]);

  // Download helper
  const handleDownloadEnv = () => {
    const blob = new Blob([envText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = envPreset === "active" ? ".env.local" : `.env.${envPreset}`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-400 text-xs font-mono">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-yellow-400 animate-ping" />
          <span>Verifying administrator credentials...</span>
        </div>
      </div>
    );
  }

  if (!canManageIntegrations(profile)) {
    return (
      <AccessDenied
        title="Admin Integrations Access Required"
        message="Only band administrators can audit credentials, manage third-party service tokens, and review environment secrets."
      />
    );
  }

  const completedChecklistCount = checklist.filter((i) => i.completed).length;
  const checklistPercent = Math.round((completedChecklistCount / checklist.length) * 100);

  const detectedEnv = status?.environment?.detected || "development";

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20">
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
              <KeyRound className="w-3.5 h-3.5" />
              <span>Admin Operations</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Environment &amp; Integrations Studio
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 max-w-2xl leading-relaxed">
              Audit live third-party service tokens, inspect runtime environment variables, test transactional deliverability, and guide the production migration workflow.
            </p>
          </div>

          {/* Environment Status Pill & Refresh */}
          <div className="flex items-center gap-3 shrink-0">
            <div
              style={{
                backgroundColor: "var(--ebb-surface-muted)",
                borderColor: "var(--ebb-border)",
              }}
              className="px-4 py-3 rounded-2xl border flex items-center gap-3"
            >
              <div
                className={`w-3 h-3 rounded-full animate-pulse ${
                  detectedEnv === "production"
                    ? "bg-emerald-400"
                    : detectedEnv === "beta"
                    ? "bg-purple-400"
                    : "bg-amber-400"
                }`}
              />
              <div>
                <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                  Detected Target
                </div>
                <div className="text-sm font-black text-white uppercase tracking-tight">
                  {detectedEnv}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={fetchStatus}
              disabled={loadingStatus}
              title="Refresh live environment status"
              className="p-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loadingStatus ? "animate-spin text-yellow-400" : ""}`} />
            </button>
          </div>
        </div>

        {/* Studio Sub-Navigation Tabs */}
        <div
          style={{ borderColor: "var(--ebb-border)" }}
          className="mt-6 pt-6 border-t flex flex-wrap items-center justify-between gap-4"
        >
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("matrix")}
              style={{
                backgroundColor: activeTab === "matrix" ? "var(--ebb-primary)" : "var(--ebb-surface-muted)",
                color: activeTab === "matrix" ? "#020617" : "#94a3b8",
                borderColor: activeTab === "matrix" ? "var(--ebb-primary)" : "var(--ebb-border)",
              }}
              className="px-3.5 py-1.5 rounded-xl border text-xs font-bold transition flex items-center gap-1.5"
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Service Health Matrix</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("env")}
              style={{
                backgroundColor: activeTab === "env" ? "var(--ebb-primary)" : "var(--ebb-surface-muted)",
                color: activeTab === "env" ? "#020617" : "#94a3b8",
                borderColor: activeTab === "env" ? "var(--ebb-primary)" : "var(--ebb-border)",
              }}
              className="px-3.5 py-1.5 rounded-xl border text-xs font-bold transition flex items-center gap-1.5"
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>Live .env Inspector &amp; Exporter</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("checklist")}
              style={{
                backgroundColor: activeTab === "checklist" ? "var(--ebb-primary)" : "var(--ebb-surface-muted)",
                color: activeTab === "checklist" ? "#020617" : "#94a3b8",
                borderColor: activeTab === "checklist" ? "var(--ebb-primary)" : "var(--ebb-border)",
              }}
              className="px-3.5 py-1.5 rounded-xl border text-xs font-bold transition flex items-center gap-1.5"
            >
              <ListChecks className="w-3.5 h-3.5" />
              <span>Production Migration Checklist ({checklistPercent}%)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Global Diagnostic Toast Feedback */}
      {testResult && (
        <div
          style={{
            backgroundColor: testResult.success ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)",
            borderColor: testResult.success ? "rgba(16, 185, 129, 0.4)" : "rgba(239, 68, 68, 0.4)",
            color: testResult.success ? "#34d399" : "#f87171",
          }}
          className="p-4 rounded-2xl border text-xs font-semibold flex items-center justify-between shadow-lg animate-in fade-in"
        >
          <div className="flex items-center gap-2.5">
            {testResult.success ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <XCircle className="w-5 h-5 text-red-400 shrink-0" />
            )}
            <div>
              <span className="font-bold uppercase tracking-wider text-[11px] block text-white">
                {testResult.service.replace("test_", "")} Diagnostic Result
              </span>
              <span>{testResult.message}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setTestResult(null)}
            className="text-xs opacity-70 hover:opacity-100 px-2 py-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: SERVICE HEALTH MATRIX */}
      {/* ========================================================================= */}
      {activeTab === "matrix" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* 1. Firebase Client SDK */}
            <div
              style={{
                backgroundColor: "var(--ebb-surface)",
                borderColor: "var(--ebb-border)",
              }}
              className="p-5 rounded-2xl border space-y-4 shadow-xs"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
                    <Flame className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white">Firebase Client SDK</h3>
                    <span className="text-[10px] text-slate-400 font-mono">Web Auth &amp; Firestore</span>
                  </div>
                </div>
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                    status?.services?.firebaseClient?.isEmulator
                      ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                      : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                  }`}
                >
                  {status?.services?.firebaseClient?.isEmulator ? "Offline Emulator" : "Connected (Cloud)"}
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center py-1 border-b border-slate-800">
                  <span className="text-slate-400">Project ID</span>
                  <span className="font-mono text-white text-[11px]">
                    {status?.services?.firebaseClient?.projectId || "None"}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-800">
                  <span className="text-slate-400">Auth Domain</span>
                  <span className="font-mono text-slate-300 text-[11px] truncate max-w-[160px]">
                    {status?.services?.firebaseClient?.authDomain || "None"}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-800">
                  <span className="text-slate-400">API Key</span>
                  <span className="font-mono text-slate-300 text-[11px]">
                    {status?.services?.firebaseClient?.apiKeyMasked || "local-api-key"}
                  </span>
                </div>
              </div>

              <div className="pt-1">
                <span className="text-[11px] text-slate-400 leading-snug block">
                  Powering client-side user sessions, real-time collection subscriptions, and offline stage caching.
                </span>
              </div>
            </div>

            {/* 2. Firebase Admin SDK */}
            <div
              style={{
                backgroundColor: "var(--ebb-surface)",
                borderColor: "var(--ebb-border)",
              }}
              className="p-5 rounded-2xl border space-y-4 shadow-xs"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center border border-sky-500/20">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white">Firebase Admin SDK</h3>
                    <span className="text-[10px] text-slate-400 font-mono">Privileged Server Operations</span>
                  </div>
                </div>
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                    status?.services?.firebaseAdmin?.configured
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                      : "bg-red-500/10 text-red-400 border-red-500/20"
                  }`}
                >
                  {status?.services?.firebaseAdmin?.configured ? "Key Configured" : "Missing Service Key"}
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center py-1 border-b border-slate-800">
                  <span className="text-slate-400">Service Account</span>
                  <span className="font-mono text-slate-300 text-[10px] truncate max-w-[160px]" title={status?.services?.firebaseAdmin?.clientEmail}>
                    {status?.services?.firebaseAdmin?.clientEmail || "Not detected"}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-800">
                  <span className="text-slate-400">Project Match</span>
                  <span className={`font-mono text-[11px] ${status?.services?.firebaseAdmin?.projectMatch ? "text-emerald-400" : "text-amber-400"}`}>
                    {status?.services?.firebaseAdmin?.projectMatch ? "✓ Aligned" : "⚠ Divergent"}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-800">
                  <span className="text-slate-400">Private Key</span>
                  <span className="font-mono text-slate-300 text-[11px]">
                    {status?.services?.firebaseAdmin?.hasPrivateKey ? "Loaded (PKCS#8)" : "Missing"}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => runTest("test_admin_sdk")}
                disabled={testingService === "test_admin_sdk"}
                className="w-full py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 transition border border-slate-700 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Zap className="w-3.5 h-3.5 text-sky-400" />
                <span>{testingService === "test_admin_sdk" ? "Verifying..." : "Verify Service Credentials"}</span>
              </button>
            </div>

            {/* 3. Resend Transactional Email */}
            <div
              style={{
                backgroundColor: "var(--ebb-surface)",
                borderColor: "var(--ebb-border)",
              }}
              className="p-5 rounded-2xl border space-y-4 shadow-xs"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center border border-purple-500/20">
                    <Send className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white">Resend Email Deliverability</h3>
                    <span className="text-[10px] text-slate-400 font-mono">Dispatches &amp; Broadcasts</span>
                  </div>
                </div>
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                    status?.services?.resend?.hasKey && !status?.services?.resend?.isEmulator
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                      : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                  }`}
                >
                  {status?.services?.resend?.isEmulator ? "Simulated Mode" : status?.services?.resend?.hasKey ? "Live Deliverability" : "Mocked"}
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center py-1 border-b border-slate-800">
                  <span className="text-slate-400">API Key</span>
                  <span className="font-mono text-slate-300 text-[11px]">
                    {status?.services?.resend?.apiKeyMasked || "None (Mocks to Log)"}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-800">
                  <span className="text-slate-400">From Address</span>
                  <span className="font-mono text-slate-300 text-[10px] truncate max-w-[160px]">
                    {status?.services?.resend?.fromEmail}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-800">
                  <span className="text-slate-400">App URL</span>
                  <span className="font-mono text-slate-300 text-[10px] truncate max-w-[160px]">
                    {status?.services?.resend?.appUrl}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="email"
                  placeholder="Recipient (optional)"
                  value={customTestEmail}
                  onChange={(e) => setCustomTestEmail(e.target.value)}
                  className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none placeholder-slate-600"
                />
                <button
                  type="button"
                  onClick={() => runTest("test_email", { recipientEmail: customTestEmail })}
                  disabled={testingService === "test_email"}
                  className="py-1.5 px-3 rounded-xl text-xs font-bold bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 border border-purple-500/30 transition flex items-center gap-1 cursor-pointer disabled:opacity-50 shrink-0"
                >
                  <Send className="w-3 h-3" />
                  <span>{testingService === "test_email" ? "Sending..." : "Test Send"}</span>
                </button>
              </div>
            </div>

            {/* 4. Cloudinary Media Storage */}
            <div
              style={{
                backgroundColor: "var(--ebb-surface)",
                borderColor: "var(--ebb-border)",
              }}
              className="p-5 rounded-2xl border space-y-4 shadow-xs"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20">
                    <Cloud className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white">Cloudinary Asset Storage</h3>
                    <span className="text-[10px] text-slate-400 font-mono">Public CMS &amp; Photos</span>
                  </div>
                </div>
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                    status?.services?.cloudinary?.configured
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                      : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                  }`}
                >
                  {status?.services?.cloudinary?.configured ? "Configured" : "Unset"}
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center py-1 border-b border-slate-800">
                  <span className="text-slate-400">Cloud Name</span>
                  <span className="font-mono text-white text-[11px]">
                    {status?.services?.cloudinary?.cloudName || "None"}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-800">
                  <span className="text-slate-400">Upload Preset</span>
                  <span className="font-mono text-slate-300 text-[11px]">
                    {status?.services?.cloudinary?.uploadPreset || "None"}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-800">
                  <span className="text-slate-400">Widget Mode</span>
                  <span className="font-mono text-slate-300 text-[11px]">Unsigned Client Upload</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => runTest("test_cloudinary")}
                disabled={testingService === "test_cloudinary"}
                className="w-full py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 transition border border-slate-700 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Cloud className="w-3.5 h-3.5 text-blue-400" />
                <span>{testingService === "test_cloudinary" ? "Checking..." : "Verify Cloud Preset"}</span>
              </button>
            </div>

            {/* 5. Alert Webhooks (Slack/Discord) */}
            <div
              style={{
                backgroundColor: "var(--ebb-surface)",
                borderColor: "var(--ebb-border)",
              }}
              className="p-5 rounded-2xl border space-y-4 shadow-xs"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                    <Bell className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white">Operations Webhooks</h3>
                    <span className="text-[10px] text-slate-400 font-mono">Slack / Discord Notifications</span>
                  </div>
                </div>
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                    status?.services?.webhooks?.configured
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                      : "bg-slate-800 text-slate-400 border-slate-700"
                  }`}
                >
                  {status?.services?.webhooks?.configured ? "Active" : "Optional"}
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center py-1 border-b border-slate-800">
                  <span className="text-slate-400">Slack Webhook</span>
                  <span className="font-mono text-slate-300 text-[10px] truncate max-w-[150px]">
                    {status?.services?.webhooks?.slackMasked || "None"}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-800">
                  <span className="text-slate-400">Discord Webhook</span>
                  <span className="font-mono text-slate-300 text-[10px] truncate max-w-[150px]">
                    {status?.services?.webhooks?.discordMasked || "None"}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-800">
                  <span className="text-slate-400">Trigger Scope</span>
                  <span className="font-mono text-slate-300 text-[11px]">Gig Logistics Updates</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => runTest("test_webhook")}
                disabled={testingService === "test_webhook"}
                className="w-full py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 transition border border-slate-700 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Bell className="w-3.5 h-3.5 text-emerald-400" />
                <span>{testingService === "test_webhook" ? "Pinging..." : "Test Webhook Ping"}</span>
              </button>
            </div>

            {/* 6. Calendar & Webcal Subscriptions */}
            <div
              style={{
                backgroundColor: "var(--ebb-surface)",
                borderColor: "var(--ebb-border)",
              }}
              className="p-5 rounded-2xl border space-y-4 shadow-xs"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white">Live Calendar Feed</h3>
                    <span className="text-[10px] text-slate-400 font-mono">Tokenized iCal / Webcal</span>
                  </div>
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                  Active
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center py-1 border-b border-slate-800">
                  <span className="text-slate-400">Endpoint</span>
                  <span className="font-mono text-slate-300 text-[11px]">/api/calendar/[token]</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-800">
                  <span className="text-slate-400">Feed Modes</span>
                  <span className="font-mono text-slate-300 text-[11px]">?mode=mine | ?mode=all</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-800">
                  <span className="text-slate-400">Security</span>
                  <span className="font-mono text-slate-300 text-[11px]">Per-User Cryptographic Token</span>
                </div>
              </div>

              <div className="pt-1">
                <span className="text-[11px] text-slate-400 leading-snug block">
                  Musicians subscribe once in Apple Calendar or Google Calendar; attendance status is re-evaluated dynamically on fetch.
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: LIVE .ENV INSPECTOR & EXPORTER */}
      {/* ========================================================================= */}
      {activeTab === "env" && (
        <div className="space-y-4">
          {/* Top Control Bar */}
          <div
            style={{
              backgroundColor: "var(--ebb-surface)",
              borderColor: "var(--ebb-border)",
            }}
            className="p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            {/* Presets Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <button
                type="button"
                onClick={() => setEnvPreset("active")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition shrink-0 ${
                  envPreset === "active"
                    ? "bg-yellow-400 text-slate-950 border-yellow-400"
                    : "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700"
                }`}
              >
                Active Runtime (.env.local)
              </button>
              <button
                type="button"
                onClick={() => setEnvPreset("dev")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition shrink-0 ${
                  envPreset === "dev"
                    ? "bg-amber-400 text-slate-950 border-amber-400"
                    : "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700"
                }`}
              >
                Local Dev (.env.dev)
              </button>
              <button
                type="button"
                onClick={() => setEnvPreset("beta")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition shrink-0 ${
                  envPreset === "beta"
                    ? "bg-purple-400 text-slate-950 border-purple-400"
                    : "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700"
                }`}
              >
                Beta / Staging (.env.beta)
              </button>
              <button
                type="button"
                onClick={() => setEnvPreset("prod")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition shrink-0 ${
                  envPreset === "prod"
                    ? "bg-emerald-400 text-slate-950 border-emerald-400"
                    : "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700"
                }`}
              >
                Production Live (.env.prod)
              </button>
            </div>

            {/* Actions: Reveal & Copy */}
            <div className="flex items-center gap-2 shrink-0">
              {envPreset === "active" && (
                <button
                  type="button"
                  onClick={() => setRevealSecrets(!revealSecrets)}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 text-slate-300 hover:text-white border border-slate-700 flex items-center gap-1.5 transition cursor-pointer"
                >
                  {revealSecrets ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>{revealSecrets ? "Mask Secrets" : "Reveal Secrets"}</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleDownloadEnv}
                title="Download as file"
                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 text-slate-300 hover:text-white border border-slate-700 flex items-center gap-1.5 transition cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download</span>
              </button>

              <button
                type="button"
                onClick={() => copyToClipboard(envText, "env_block")}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-yellow-400 hover:bg-yellow-300 text-slate-950 flex items-center gap-1.5 transition cursor-pointer shadow-sm"
              >
                {copiedKey === "env_block" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey === "env_block" ? "Copied!" : "Copy .env Block"}</span>
              </button>
            </div>
          </div>

          {/* Formatted Code Block Display */}
          <div className="bg-slate-950 border border-slate-800 rounded-3xl p-5 sm:p-6 overflow-x-auto shadow-2xl relative font-mono text-xs text-slate-300 leading-relaxed [scrollbar-width:thin]">
            <pre className="whitespace-pre-wrap break-all">{envText}</pre>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: PRODUCTION MIGRATION CHECKLIST */}
      {/* ========================================================================= */}
      {activeTab === "checklist" && (
        <div className="space-y-6">
          {/* Progress Header Card */}
          <div
            style={{
              backgroundColor: "var(--ebb-surface)",
              borderColor: "var(--ebb-border)",
            }}
            className="p-6 rounded-3xl border space-y-4"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-white">Production Migration Readiness</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Complete these essential operational requirements to prepare the Eagleburger Band platform for production launch.
                </p>
              </div>
              <div className="text-right">
                <span className="text-2xl font-black text-amber-400">{checklistPercent}%</span>
                <span className="text-xs text-slate-400 block">
                  {completedChecklistCount} of {checklist.length} Completed
                </span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden">
              <div
                style={{ width: `${checklistPercent}%` }}
                className="h-full bg-gradient-to-r from-yellow-400 to-emerald-400 transition-all duration-500 rounded-full"
              />
            </div>
          </div>

          {/* Checklist Items */}
          <div className="space-y-3">
            {checklist.map((item) => (
              <div
                key={item.id}
                style={{
                  backgroundColor: "var(--ebb-surface)",
                  borderColor: item.completed ? "rgba(16, 185, 129, 0.3)" : "var(--ebb-border)",
                }}
                className={`p-4 sm:p-5 rounded-2xl border flex items-start justify-between gap-4 transition ${
                  item.completed ? "bg-emerald-950/10" : ""
                }`}
              >
                <div className="flex items-start gap-3.5 min-w-0">
                  <button
                    type="button"
                    onClick={() => handleToggleChecklistItem(item.id)}
                    className={`w-6 h-6 rounded-lg border flex items-center justify-center shrink-0 mt-0.5 transition cursor-pointer ${
                      item.completed
                        ? "bg-emerald-500 border-emerald-500 text-slate-950 font-bold"
                        : "bg-slate-800 border-slate-700 text-transparent hover:border-slate-500"
                    }`}
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <div className="min-w-0">
                    <h3
                      className={`text-xs sm:text-sm font-bold ${
                        item.completed ? "text-slate-300 line-through opacity-80" : "text-white"
                      }`}
                    >
                      {item.title}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">{item.description}</p>
                    {item.completed && item.completedAt && (
                      <span className="text-[10px] text-emerald-400/80 mt-1.5 block font-mono">
                        Completed on {new Date(item.completedAt).toLocaleDateString()} by {item.completedBy || "Admin"}
                      </span>
                    )}
                  </div>
                </div>

                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 border border-slate-700 shrink-0">
                  {item.category}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
