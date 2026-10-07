"use client";

import React, { useState } from "react";
import {
  X,
  Cloud,
  Check,
  ExternalLink,
  ShieldAlert,
  Info,
  Key,
} from "lucide-react";
import {
  getCloudinaryConfig,
  setLocalCloudinaryConfig,
  isCloudinaryConfigured,
} from "@/lib/cloudinary/widget";
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
  const [cloudName, setCloudName] = useState(() => getCloudinaryConfig().cloudName);
  const [uploadPreset, setUploadPreset] = useState(() => getCloudinaryConfig().uploadPreset);

  const hasEnvVars = Boolean(
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME &&
    process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET
  );

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cloudName.trim() || !uploadPreset.trim()) {
      toast.error("Both Cloud Name and Upload Preset are required.");
      return;
    }

    setLocalCloudinaryConfig(cloudName.trim(), uploadPreset.trim());
    toast.success("Cloudinary configuration updated for this browser!");
    if (onConfigSaved) onConfigSaved();
    onClose();
  };

  const isConfigured = isCloudinaryConfigured();

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
              <span className="text-[10px] font-mono uppercase font-bold text-sky-400">
                Hybrid Storage Setup
              </span>
              <h3 className="text-xl font-bold text-white font-arvo">
                Cloudinary Upload Widget
              </h3>
            </div>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            Directly upload band photos, posters, and media from your computer or phone using Cloudinary&apos;s free tier with automated WebP compression and on-the-fly resizing.
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
            <div>
              <span className="font-bold block">
                {isConfigured
                  ? "Cloudinary Widget is Active & Ready"
                  : "Cloudinary Configuration Required"}
              </span>
              <span className="text-[11px] opacity-90 block mt-0.5">
                {isConfigured
                  ? hasEnvVars
                    ? "Credentials detected via environment variables."
                    : "Credentials configured via browser session storage."
                  : "Provide an Unsigned Upload Preset to enable direct widget uploads."}
              </span>
            </div>
          </div>

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
              <li>Create a free account or log in to your Cloudinary dashboard.</li>
              <li>Note your <strong className="text-white">Cloud Name</strong> from your dashboard.</li>
              <li>Navigate to <strong className="text-white">Settings &rarr; Upload &rarr; Upload Presets</strong>.</li>
              <li>Click <strong className="text-white">Add Upload Preset</strong> and set Signing Mode to <strong className="text-white">Unsigned</strong>.</li>
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
                <span className="text-[10px] text-slate-500 font-normal">e.g. band_public_preset</span>
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

            <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl text-[11px] text-slate-500 space-y-1">
              <p>
                <strong>Permanent Server Setup:</strong> Add these to your project&apos;s <code className="text-yellow-400 font-mono">.env.local</code>:
              </p>
              <pre className="font-mono text-[10px] text-slate-400 bg-slate-900 p-2 rounded border border-slate-800 overflow-x-auto">
{`NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=${cloudName || "your_cloud_name"}
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=${uploadPreset || "your_preset"}`}
              </pre>
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
                className="px-5 py-2.5 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-black text-xs uppercase tracking-wider transition flex items-center gap-1.5 shadow"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Save Credentials</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
