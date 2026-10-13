"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Cloud,
  Check,
  ExternalLink,
  ShieldAlert,
  Info,
  Key,
  Database,
  Download,
  Loader2,
  Folder,
} from "lucide-react";
import {
  getCloudinaryConfig,
  savePersistentCloudinaryConfig,
  isCloudinaryConfigured,
  fetchPersistentCloudinaryConfig,
  CloudinaryStoredConfig,
} from "@/lib/cloudinary/widget";
import { useAuth } from "@/lib/context/AuthContext";
import { toast } from "@/lib/context/ToastContext";

interface CloudinaryConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigSaved?: () => void;
}

export default function CloudinaryConfigModal({
  isOpen,
  onClose,
  onConfigSaved,
}: CloudinaryConfigModalProps) {
  const { profile, firebaseUser } = useAuth();
  const [config, setConfig] = useState<CloudinaryStoredConfig>(() => getCloudinaryConfig());
  const [cloudName, setCloudName] = useState(config.cloudName);
  const [uploadPreset, setUploadPreset] = useState(config.uploadPreset);
  const [folder, setFolder] = useState(config.folder || "eagleburgerband_media");
  const [isSaving, setIsSaving] = useState(false);

  // Environment variables detected from Next.js runtime
  const envCloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "";
  const envUploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "";
  const hasEnvVars = Boolean(envCloudName && envUploadPreset);

  // Synchronize state asynchronously whenever modal opens
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    fetchPersistentCloudinaryConfig()
      .then((active) => {
        if (!isMounted) return;
        setConfig(active);
        setCloudName(active.cloudName || envCloudName);
        setUploadPreset(active.uploadPreset || envUploadPreset);
        setFolder(active.folder || "eagleburgerband_media");
      })
      .catch((err) => {
        console.warn("Failed to load persistent Cloudinary config:", err);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, envCloudName, envUploadPreset]);

  if (!isOpen) return null;

  const handleUseEnvCredentials = async () => {
    if (!envCloudName || !envUploadPreset) {
      toast.error("No environment variables found in .env.local.");
      return;
    }

    setCloudName(envCloudName);
    setUploadPreset(envUploadPreset);

    setIsSaving(true);
    try {
      const userIdentifier = profile?.email || firebaseUser?.email || "admin";
      await savePersistentCloudinaryConfig(
        { cloudName: envCloudName, uploadPreset: envUploadPreset, folder },
        userIdentifier
      );
      const updated = getCloudinaryConfig();
      setConfig(updated);
      toast.success("Imported & saved environment credentials persistently to Band Database!");
      if (onConfigSaved) onConfigSaved();
    } catch (err) {
      toast.error("Failed to persist credentials: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cloudName.trim() || !uploadPreset.trim()) {
      toast.error("Both Cloud Name and Upload Preset are required.");
      return;
    }

    setIsSaving(true);
    try {
      const userIdentifier = profile?.email || firebaseUser?.email || "admin";
      const res = await savePersistentCloudinaryConfig(
        {
          cloudName: cloudName.trim(),
          uploadPreset: uploadPreset.trim(),
          folder: folder.trim() || "eagleburgerband_media",
        },
        userIdentifier
      );

      const updated = getCloudinaryConfig();
      setConfig(updated);
      toast.success(res.message || "Cloudinary configuration saved persistently to Cloud Firestore!");
      if (onConfigSaved) onConfigSaved();
      onClose();
    } catch (err) {
      toast.error("Failed to save credentials: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsSaving(false);
    }
  };

  const isConfigured = isCloudinaryConfigured();
  const isPersistedInFirestore = config.source === "firestore" || config.isPersisted;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center shrink-0">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase font-bold text-sky-400 flex items-center gap-1.5">
                <Database className="w-3 h-3" />
                Persistent Media Storage Setup
              </span>
              <h3 className="text-xl font-bold text-white font-arvo">
                Cloudinary Integration
              </h3>
            </div>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            Directly upload band photos, flyers, and documents from your computer or phone using Cloudinary with automated WebP compression and CDN delivery. Saved settings persist in Cloud Firestore across all devices.
          </p>

          {/* Configuration Status Card */}
          <div
            className={`p-3.5 rounded-2xl border text-xs flex items-start gap-2.5 ${
              isConfigured
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                : "bg-amber-500/10 border-amber-500/30 text-amber-300"
            }`}
          >
            {isConfigured ? (
              <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="font-bold block">
                  {isConfigured
                    ? "Cloudinary Widget is Active & Ready"
                    : "Cloudinary Configuration Required"}
                </span>
                {isConfigured && (
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-900/80 border border-emerald-500/40 text-emerald-400">
                    {isPersistedInFirestore ? "Persisted in Firestore" : "Active via Env / Local"}
                  </span>
                )}
              </div>
              <span className="text-[11px] opacity-90 block mt-0.5">
                {isConfigured
                  ? isPersistedInFirestore
                    ? `Saved persistently in Firestore (cloud: ${config.cloudName}). All band managers share this configuration.`
                    : hasEnvVars
                    ? `Loaded from environment variables (${envCloudName}). Click below to save persistently to Firestore.`
                    : "Loaded from browser session storage. Save to store permanently in Firestore."
                  : "Provide your Cloud Name and Unsigned Upload Preset to enable direct widget uploads."}
              </span>
            </div>
          </div>

          {/* Environment Variables Sync Card */}
          {hasEnvVars && (!isPersistedInFirestore || config.cloudName !== envCloudName) && (
            <div className="bg-sky-950/40 border border-sky-800/60 rounded-2xl p-3.5 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sky-300 flex items-center gap-1.5">
                  <Cloud className="w-3.5 h-3.5 text-sky-400" /> Environment Variables Detected
                </span>
                <span className="text-[10px] font-mono text-sky-400">.env.local</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Found cloud <code className="text-sky-300 font-mono font-bold">{envCloudName}</code> and preset <code className="text-sky-300 font-mono font-bold">{envUploadPreset}</code> in your environment.
              </p>
              <button
                type="button"
                onClick={handleUseEnvCredentials}
                disabled={isSaving}
                className="w-full py-2 px-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs transition flex items-center justify-center gap-1.5 shadow"
              >
                {isSaving ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5" />
                )}
                <span>Import &amp; Persist Environment Credentials to Database</span>
              </button>
            </div>
          )}

          {/* Quick Setup Instructions */}
          <div className="bg-slate-950 border border-slate-800/80 rounded-2xl p-4 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-300 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-yellow-400" /> 3-Minute Cloudinary Setup
              </span>
              <a
                href="https://cloudinary.com/users/register_free"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-sky-400 hover:text-sky-300 inline-flex items-center gap-1 font-semibold"
              >
                <span>Free Cloudinary Account</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <ol className="list-decimal list-inside space-y-1 text-slate-400 text-[11px] leading-relaxed">
              <li>Log in to your Cloudinary dashboard.</li>
              <li>Note your <strong className="text-white">Cloud Name</strong> from the dashboard header.</li>
              <li>Navigate to <strong className="text-white">Settings &rarr; Upload &rarr; Upload Presets</strong>.</li>
              <li>Create or select a preset and verify Signing Mode is set to <strong className="text-white">Unsigned</strong>.</li>
            </ol>
          </div>

          <form onSubmit={handleSave} className="space-y-3 pt-2">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                <span>Cloud Name *</span>
                <span className="text-[10px] text-slate-500 font-normal">e.g. eagleburgerband</span>
              </label>
              <div className="relative">
                <Cloud className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="your_cloud_name"
                  value={cloudName}
                  onChange={(e) => setCloudName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-yellow-400"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                <span>Unsigned Upload Preset *</span>
                <span className="text-[10px] text-slate-500 font-normal">e.g. eagleburger</span>
              </label>
              <div className="relative">
                <Key className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="unsigned_preset_name"
                  value={uploadPreset}
                  onChange={(e) => setUploadPreset(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-yellow-400"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                <span>Upload Folder</span>
                <span className="text-[10px] text-slate-500 font-normal">Target folder in Cloudinary</span>
              </label>
              <div className="relative">
                <Folder className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="eagleburgerband_media"
                  value={folder}
                  onChange={(e) => setFolder(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-yellow-400"
                />
              </div>
            </div>

            <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl text-[11px] text-slate-400 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-slate-300">
                <Database className="w-3.5 h-3.5 text-yellow-400" />
                <span>Persistent Shared Storage</span>
              </div>
              <p className="text-[10.5px] leading-relaxed text-slate-500">
                Saving will store credentials in Cloud Firestore (<code className="text-yellow-400/80 font-mono">system_config/cloudinary</code>). All band administrators and managers will immediately share access to this media integration.
              </p>
            </div>

            <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white transition"
              >
                Close
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2.5 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-black text-xs uppercase tracking-wider transition flex items-center gap-1.5 shadow disabled:opacity-50"
              >
                {isSaving ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5" />
                )}
                <span>Save Persistently</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
