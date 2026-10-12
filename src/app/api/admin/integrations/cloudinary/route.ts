import { NextRequest, NextResponse } from "next/server";
import { requireCaller } from "@/lib/auth/serverAuth";
import { getDocument, setDocument } from "@/lib/firebase/serverFirestore";
import {
  CloudinaryConfigSchema,
  CloudinaryConfig,
  SystemIntegrationsConfigSchema,
} from "@/lib/schema/integrationConfig";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const caller = await requireCaller(
      req,
      ["admin", "web_manager"],
      "Administrator or Web Manager clearance required to view Cloudinary integration."
    );
    if (caller instanceof NextResponse) return caller;

    // 1. Read from Firestore
    let firestoreConfig: CloudinaryConfig | null = null;
    try {
      const directDoc = await getDocument("system_config/cloudinary");
      if (directDoc?.data) {
        const parsed = CloudinaryConfigSchema.safeParse(directDoc.data);
        if (parsed.success && parsed.data.cloudName) {
          firestoreConfig = parsed.data;
        }
      }

      if (!firestoreConfig) {
        const integrationsDoc = await getDocument("system_config/integrations");
        if (integrationsDoc?.data?.cloudinary) {
          const parsed = CloudinaryConfigSchema.safeParse(integrationsDoc.data.cloudinary);
          if (parsed.success && parsed.data.cloudName) {
            firestoreConfig = parsed.data;
          }
        }
      }
    } catch (err) {
      console.warn("Could not read Firestore Cloudinary config:", err);
    }

    // 2. Read from Environment Variables
    const envCloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "";
    const envUploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "";
    const hasEnvVars = Boolean(envCloudName && envUploadPreset);

    // 3. Resolve Effective Config
    let effectiveConfig: CloudinaryConfig;
    if (firestoreConfig && firestoreConfig.cloudName && firestoreConfig.uploadPreset) {
      effectiveConfig = {
        ...firestoreConfig,
        source: "firestore",
      };
    } else if (hasEnvVars) {
      effectiveConfig = {
        cloudName: envCloudName,
        uploadPreset: envUploadPreset,
        folder: "eagleburgerband_media",
        enabled: true,
        source: "env",
        updatedAt: new Date().toISOString(),
        updatedBy: "environment",
      };
    } else {
      effectiveConfig = {
        cloudName: "",
        uploadPreset: "",
        folder: "eagleburgerband_media",
        enabled: false,
        source: "unconfigured",
        updatedAt: new Date().toISOString(),
        updatedBy: "system",
      };
    }

    return NextResponse.json({
      success: true,
      config: effectiveConfig,
      isPersisted: Boolean(firestoreConfig?.cloudName && firestoreConfig?.uploadPreset),
      env: {
        hasEnvVars,
        cloudName: envCloudName,
        uploadPreset: envUploadPreset,
      },
      firestore: firestoreConfig,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("GET /api/admin/integrations/cloudinary error:", err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const caller = await requireCaller(
      req,
      ["admin", "web_manager"],
      "Administrator or Web Manager clearance required to update Cloudinary integration."
    );
    if (caller instanceof NextResponse) return caller;

    const body = await req.json();
    const cloudName = String(body.cloudName || "").trim();
    const uploadPreset = String(body.uploadPreset || "").trim();
    const folder = String(body.folder || "eagleburgerband_media").trim();

    if (!cloudName || !uploadPreset) {
      return NextResponse.json(
        { success: false, error: "Both cloudName and uploadPreset are required." },
        { status: 400 }
      );
    }

    const payload: CloudinaryConfig = CloudinaryConfigSchema.parse({
      cloudName,
      uploadPreset,
      folder,
      enabled: true,
      source: "firestore",
      updatedAt: new Date().toISOString(),
      updatedBy: caller.email || caller.displayName || "admin",
    });

    // 1. Save directly to system_config/cloudinary
    await setDocument("system_config/cloudinary", payload as unknown as Record<string, unknown>);

    // 2. Also patch system_config/integrations for unified system overview
    try {
      const integrationsDoc = await getDocument("system_config/integrations");
      const currentIntegrations = integrationsDoc?.data
        ? SystemIntegrationsConfigSchema.parse(integrationsDoc.data)
        : SystemIntegrationsConfigSchema.parse({});

      const updatedIntegrations = {
        ...currentIntegrations,
        cloudinary: payload,
        updatedAt: new Date().toISOString(),
        updatedBy: caller.email || caller.displayName || "admin",
      };

      await setDocument("system_config/integrations", updatedIntegrations as unknown as Record<string, unknown>);
    } catch (err) {
      console.warn("Could not patch system_config/integrations:", err);
    }

    return NextResponse.json({
      success: true,
      message: "Cloudinary configuration saved persistently to Firestore.",
      config: payload,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("POST /api/admin/integrations/cloudinary error:", err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

