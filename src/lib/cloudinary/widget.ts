/**
 * Cloudinary Upload Widget integration for Eagleburger Band Media Management.
 * Dynamically loads the widget script and handles asset uploads.
 */

import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { authedFetch } from "@/lib/firebase/authedFetch";
import {
  CloudinaryConfig,
  CloudinaryConfigSchema,
} from "@/lib/schema/integrationConfig";

export interface CloudinaryUploadResultInfo {
  secure_url: string;
  url: string;
  public_id: string;
  asset_id?: string;
  version?: number;
  width?: number;
  height?: number;
  format?: string;
  bytes?: number;
  resource_type?: "image" | "raw" | "video" | string;
  created_at?: string;
  tags?: string[];
  original_filename?: string;
  thumbnail_url?: string;
  [key: string]: unknown;
}

export interface CloudinaryWidgetOptions {
  cloudName?: string;
  uploadPreset?: string;
  folder?: string;
  sources?: Array<"local" | "url" | "camera" | "dropbox" | "google_drive" | "unsplash">;
  multiple?: boolean;
  maxFiles?: number;
  maxFileSize?: number; // bytes
  resourceType?: "auto" | "image" | "raw" | "video";
  clientAllowedFormats?: string[];
}

declare global {
  interface Window {
    cloudinary?: {
      createUploadWidget: (
        options: Record<string, unknown>,
        callback: (error: unknown, result: { event: string; info: CloudinaryUploadResultInfo }) => void
      ) => {
        open: () => void;
        close: () => void;
        destroy: () => void;
      };
    };
  }
}

const WIDGET_SCRIPT_URL = "https://upload-widget.cloudinary.com/global/all.js";

/**
 * Loads the Cloudinary Upload Widget script into the document if not already loaded.
 */
export function loadCloudinaryScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      return reject(new Error("Cannot load Cloudinary widget in server environment"));
    }

    if (window.cloudinary) {
      return resolve();
    }

    const existingScript = document.querySelector(`script[src="${WIDGET_SCRIPT_URL}"]`);
    if (existingScript) {
      existingScript.addEventListener("load", () => resolve());
      existingScript.addEventListener("error", (e) => reject(e));
      return;
    }

    const script = document.createElement("script");
    script.src = WIDGET_SCRIPT_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = (err) => reject(err);
    document.body.appendChild(script);
  });
}

export interface CloudinaryStoredConfig {
  cloudName: string;
  uploadPreset: string;
  folder?: string;
  source: "firestore" | "env" | "local" | "unconfigured";
  isPersisted?: boolean;
}

let cachedCloudinaryConfig: CloudinaryStoredConfig | null = null;

/**
 * Sets runtime cached Cloudinary config (e.g. from Firestore listener or API response).
 */
export function setCachedCloudinaryConfig(config: Partial<CloudinaryStoredConfig>): void {
  const current = getCloudinaryConfig();
  cachedCloudinaryConfig = {
    cloudName: config.cloudName !== undefined ? config.cloudName : current.cloudName,
    uploadPreset: config.uploadPreset !== undefined ? config.uploadPreset : current.uploadPreset,
    folder: config.folder || current.folder || "eagleburgerband_media",
    source: config.source || "firestore",
    isPersisted: config.isPersisted !== undefined ? config.isPersisted : true,
  };
}

/**
 * Returns whether Cloudinary credentials are configured in env, Firestore, or browser storage.
 */
export function isCloudinaryConfigured(): boolean {
  const config = getCloudinaryConfig();
  return Boolean(config.cloudName && config.uploadPreset);
}

/**
 * Gets Cloudinary credentials with priority:
 * 1. Runtime cache (hydrated from Firestore)
 * 2. Environment variables (.env.local)
 * 3. Browser localStorage fallback
 */
export function getCloudinaryConfig(): CloudinaryStoredConfig {
  // 1. Cached in memory (e.g. hydrated from Firestore or API)
  if (cachedCloudinaryConfig && cachedCloudinaryConfig.cloudName && cachedCloudinaryConfig.uploadPreset) {
    return cachedCloudinaryConfig;
  }

  // 2. Client environment variables
  const envCloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "";
  const envPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "";
  if (envCloud && envPreset) {
    return {
      cloudName: envCloud,
      uploadPreset: envPreset,
      folder: "eagleburgerband_media",
      source: "env",
      isPersisted: false,
    };
  }

  // 3. LocalStorage fallback
  if (typeof window !== "undefined") {
    const localCloud = localStorage.getItem("eb_cloudinary_cloud_name") || "";
    const localPreset = localStorage.getItem("eb_cloudinary_preset") || "";
    if (localCloud || localPreset) {
      return {
        cloudName: localCloud || envCloud,
        uploadPreset: localPreset || envPreset,
        folder: "eagleburgerband_media",
        source: "local",
        isPersisted: false,
      };
    }
  }

  return {
    cloudName: envCloud,
    uploadPreset: envPreset,
    folder: "eagleburgerband_media",
    source: "unconfigured",
    isPersisted: false,
  };
}

/**
 * Saves Cloudinary credentials to browser storage (useful for local fallback).
 */
export function setLocalCloudinaryConfig(cloudName: string, uploadPreset: string): void {
  if (typeof window !== "undefined") {
    if (cloudName) {
      localStorage.setItem("eb_cloudinary_cloud_name", cloudName);
    } else {
      localStorage.removeItem("eb_cloudinary_cloud_name");
    }

    if (uploadPreset) {
      localStorage.setItem("eb_cloudinary_preset", uploadPreset);
    } else {
      localStorage.removeItem("eb_cloudinary_preset");
    }
  }
}

/**
 * Saves Cloudinary credentials persistently to Cloud Firestore (system_config)
 * and updates localStorage & runtime cache so all portal users share the configuration.
 */
export async function savePersistentCloudinaryConfig(
  config: { cloudName: string; uploadPreset: string; folder?: string },
  userEmail?: string
): Promise<{ success: boolean; message?: string }> {
  const cleanCloud = config.cloudName.trim();
  const cleanPreset = config.uploadPreset.trim();
  const cleanFolder = (config.folder || "eagleburgerband_media").trim();

  // 1. Update local storage & runtime cache immediately
  setLocalCloudinaryConfig(cleanCloud, cleanPreset);
  setCachedCloudinaryConfig({
    cloudName: cleanCloud,
    uploadPreset: cleanPreset,
    folder: cleanFolder,
    source: "firestore",
    isPersisted: true,
  });

  // 2. Try Firestore Client SDK setDoc
  let clientSaved = false;
  try {
    const payload = CloudinaryConfigSchema.parse({
      cloudName: cleanCloud,
      uploadPreset: cleanPreset,
      folder: cleanFolder,
      enabled: true,
      source: "firestore",
      updatedAt: new Date().toISOString(),
      updatedBy: userEmail || "portal_user",
    });

    await setDoc(doc(db, "system_config", "cloudinary"), payload, { merge: true });
    await setDoc(doc(db, "system_config", "integrations"), { cloudinary: payload }, { merge: true });
    clientSaved = true;
  } catch (err) {
    console.warn("Client Firestore write to system_config failed (will try server API):", err);
  }

  // 3. Call server API to ensure server-side persistence & bypass any restrictive client rules
  try {
    const res = await authedFetch("/api/admin/integrations/cloudinary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cloudName: cleanCloud,
        uploadPreset: cleanPreset,
        folder: cleanFolder,
      }),
    });
    if (res.ok) {
      return { success: true, message: "Persisted to Cloud Firestore." };
    }
  } catch (err) {
    console.warn("API route write failed:", err);
  }

  if (clientSaved) {
    return { success: true, message: "Persisted to Cloud Firestore via client." };
  }

  return { success: true, message: "Saved to browser storage." };
}

/**
 * Checks if environment variables exist, and syncs them into persistent Firestore storage.
 */
export async function syncEnvCloudinaryConfigToFirestore(userEmail?: string): Promise<boolean> {
  const envCloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "";
  const envPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "";

  if (!envCloud || !envPreset) return false;

  try {
    await savePersistentCloudinaryConfig(
      { cloudName: envCloud, uploadPreset: envPreset },
      userEmail || "env_sync"
    );
    return true;
  } catch {
    return false;
  }
}

/**
 * Fetches the active Cloudinary configuration from Firestore or the server API,
 * ensuring client cache is hydrated.
 */
export async function fetchPersistentCloudinaryConfig(): Promise<CloudinaryStoredConfig> {
  // Try client Firestore read first (fast)
  try {
    const snap = await getDoc(doc(db, "system_config", "cloudinary"));
    if (snap.exists()) {
      const parsed = CloudinaryConfigSchema.safeParse(snap.data());
      if (parsed.success && parsed.data.cloudName && parsed.data.uploadPreset) {
        setCachedCloudinaryConfig({
          cloudName: parsed.data.cloudName,
          uploadPreset: parsed.data.uploadPreset,
          folder: parsed.data.folder,
          source: "firestore",
          isPersisted: true,
        });
        return getCloudinaryConfig();
      }
    }
  } catch (err) {
    console.warn("Could not read system_config/cloudinary client-side:", err);
  }

  // Fallback to API route
  try {
    const res = await authedFetch("/api/admin/integrations/cloudinary");
    if (res.ok) {
      const data = await res.json();
      if (data?.config?.cloudName && data?.config?.uploadPreset) {
        setCachedCloudinaryConfig({
          cloudName: data.config.cloudName,
          uploadPreset: data.config.uploadPreset,
          folder: data.config.folder,
          source: data.isPersisted ? "firestore" : data.config.source || "env",
          isPersisted: data.isPersisted,
        });
        return getCloudinaryConfig();
      }
    }
  } catch (err) {
    console.warn("Could not fetch cloudinary config from API:", err);
  }

  return getCloudinaryConfig();
}

/**
 * Formats byte count into human-readable size string.
 */
export function formatBytes(bytes?: number): string {
  if (!bytes || bytes <= 0) return "";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Opens the Cloudinary Upload Widget and invokes callbacks on completion.
 */
export async function openCloudinaryUploadWidget({
  options = {},
  onSuccess,
  onError,
  onClose,
}: {
  options?: CloudinaryWidgetOptions;
  onSuccess: (info: CloudinaryUploadResultInfo) => void;
  onError?: (error: unknown) => void;
  onClose?: () => void;
}): Promise<void> {
  await loadCloudinaryScript();

  if (!window.cloudinary) {
    throw new Error("Failed to initialize Cloudinary Upload Widget.");
  }

  const currentConfig = getCloudinaryConfig();
  const cloudName = options.cloudName || currentConfig.cloudName;
  const uploadPreset = options.uploadPreset || currentConfig.uploadPreset;

  if (!cloudName || !uploadPreset) {
    throw new Error(
      "Cloudinary credentials missing. Please set NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME and NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET in your environment or credentials configuration."
    );
  }

  const widgetConfig = {
    cloudName,
    uploadPreset,
    folder: options.folder || "eagleburgerband_media",
    sources: options.sources || ["local", "url", "camera", "unsplash"],
    multiple: options.multiple ?? false,
    maxFiles: options.maxFiles ?? 1,
    maxFileSize: options.maxFileSize || 20 * 1024 * 1024, // 20MB limit
    resourceType: options.resourceType || "auto",
    styles: {
      palette: {
        window: "#0f172a", // Slate-900
        windowBorder: "#1e293b", // Slate-800
        tabIcon: "#facc15", // Yellow-400
        menuIcons: "#facc15",
        textDark: "#020617",
        textLight: "#f8fafc",
        link: "#facc15",
        action: "#facc15",
        inactiveTabIcon: "#94a3b8",
        error: "#f43f5e",
        inProgress: "#38bdf8",
        complete: "#22c55e",
        sourceBg: "#020617",
      },
      fonts: {
        default: null,
        "'Poppins', sans-serif": {
          url: "https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap",
          active: true,
        },
      },
    },
    ...options,
  };

  const widget = window.cloudinary.createUploadWidget(widgetConfig, (error, result) => {
    if (error) {
      if (onError) onError(error);
      return;
    }

    if (result && result.event === "success") {
      onSuccess(result.info);
    } else if (result && result.event === "close") {
      if (onClose) onClose();
    }
  });

  widget.open();
}
