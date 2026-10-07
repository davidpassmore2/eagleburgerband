/**
 * Cloudinary Upload Widget integration for Eagleburger Band Media Management.
 * Dynamically loads the widget script and handles asset uploads.
 */

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

/**
 * Returns whether Cloudinary credentials are configured in env or browser storage.
 */
export function isCloudinaryConfigured(): boolean {
  const config = getCloudinaryConfig();
  return Boolean(config.cloudName && config.uploadPreset);
}

/**
 * Gets Cloudinary credentials from environment variables with localStorage fallback.
 */
export function getCloudinaryConfig(): { cloudName: string; uploadPreset: string } {
  let cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "";
  let uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "";

  if (typeof window !== "undefined") {
    if (!cloudName) {
      cloudName = localStorage.getItem("eb_cloudinary_cloud_name") || "";
    }
    if (!uploadPreset) {
      uploadPreset = localStorage.getItem("eb_cloudinary_preset") || "";
    }
  }

  return { cloudName, uploadPreset };
}

/**
 * Saves Cloudinary credentials to browser storage (useful for local testing without restart).
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
