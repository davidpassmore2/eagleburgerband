import { NextRequest, NextResponse } from "next/server";
import { getDeliverabilityConfig } from "@/lib/email/resend";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function maskSecret(val?: string | null, keepStart = 4, keepEnd = 4): string {
  if (!val || val.trim().length === 0) return "";
  const str = val.trim();
  if (str.length <= keepStart + keepEnd) return "••••••••";
  return `${str.substring(0, keepStart)}••••••••${str.substring(str.length - keepEnd)}`;
}

export async function GET(req: NextRequest) {
  try {
    const origin = req.headers.get("origin") || req.nextUrl?.origin;
    const deliverability = getDeliverabilityConfig(origin);

    // 1. Environment Detection
    const nodeEnv = process.env.NODE_ENV || "development";
    const vercelEnv = process.env.VERCEL_ENV || "local";
    const isEmulator = process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === "true";
    const rawProjectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "";

    let detectedEnvironment: "development" | "beta" | "production" = "development";
    if (vercelEnv === "production" || rawProjectId === "eagleburger-band") {
      detectedEnvironment = "production";
    } else if (rawProjectId.includes("beta") || vercelEnv === "preview") {
      detectedEnvironment = "beta";
    } else if (isEmulator || rawProjectId.includes("dev")) {
      detectedEnvironment = "development";
    }

    // 2. Firebase Client SDK
    const clientApiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "";
    const clientAppId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "";
    const firebaseClient = {
      isEmulator,
      projectId: rawProjectId,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
      hasApiKey: Boolean(clientApiKey && clientApiKey !== "local-api-key"),
      apiKeyMasked: maskSecret(clientApiKey, 6, 4),
      hasAppId: Boolean(clientAppId),
      appIdMasked: maskSecret(clientAppId, 4, 4),
    };

    // 3. Firebase Admin SDK
    let adminSdkConfigured = false;
    let adminClientEmail = "";
    let adminProjectId = "";
    let adminErrorDetail = "";
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

    if (serviceAccountKey) {
      try {
        let raw = serviceAccountKey.trim();
        if ((raw.startsWith("'") && raw.endsWith("'")) || (raw.startsWith('"') && raw.endsWith('"'))) {
          raw = raw.slice(1, -1).trim();
        }
        if (!raw.startsWith("{") && /^[A-Za-z0-9+/=]+$/.test(raw)) {
          raw = Buffer.from(raw, "base64").toString("utf-8").trim();
        }
        const parsed = JSON.parse(raw);
        if (parsed.client_email) {
          adminSdkConfigured = true;
          adminClientEmail = parsed.client_email;
          adminProjectId = parsed.project_id || "";
        }
      } catch (e: unknown) {
        adminErrorDetail = e instanceof Error ? e.message : "Failed to parse JSON";
      }
    } else if (process.env.FIREBASE_CLIENT_EMAIL) {
      adminSdkConfigured = true;
      adminClientEmail = process.env.FIREBASE_CLIENT_EMAIL;
      adminProjectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "";
    }

    const firebaseAdmin = {
      configured: adminSdkConfigured,
      clientEmail: adminClientEmail,
      projectId: adminProjectId,
      projectMatch: Boolean(adminProjectId && adminProjectId === rawProjectId),
      hasPrivateKey: Boolean(serviceAccountKey || process.env.FIREBASE_PRIVATE_KEY),
      errorDetail: adminErrorDetail,
    };

    // 4. Resend Transactional Email
    const resendApiKey = process.env.RESEND_API_KEY || "";
    const resend = {
      hasKey: deliverability.hasKey,
      apiKeyMasked: maskSecret(resendApiKey, 4, 4),
      fromEmail: deliverability.fromEmail,
      appUrl: deliverability.appUrl,
      isMockMode: deliverability.isMockMode,
      isEmulator: deliverability.isEmulator,
      mode: deliverability.isEmulator
        ? "Mocked (Offline Emulator)"
        : !deliverability.hasKey
        ? "Mocked (Missing API Key)"
        : "Live Production/Beta Deliverability",
    };

    // 5. Cloudinary Storage
    const cloudinaryCloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "";
    const cloudinaryPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "";
    const cloudinary = {
      hasCloudName: Boolean(cloudinaryCloud),
      cloudName: cloudinaryCloud,
      hasUploadPreset: Boolean(cloudinaryPreset),
      uploadPreset: cloudinaryPreset,
      configured: Boolean(cloudinaryCloud && cloudinaryPreset),
    };

    // 6. Alert Webhooks (Slack/Discord)
    const slackUrl = process.env.SLACK_WEBHOOK_URL || "";
    const discordUrl = process.env.DISCORD_WEBHOOK_URL || "";
    const webhooks = {
      hasSlack: Boolean(slackUrl),
      slackMasked: maskSecret(slackUrl, 12, 6),
      hasDiscord: Boolean(discordUrl),
      discordMasked: maskSecret(discordUrl, 12, 6),
      configured: Boolean(slackUrl || discordUrl),
    };

    return NextResponse.json({
      environment: {
        detected: detectedEnvironment,
        nodeEnv,
        vercelEnv,
        timestamp: new Date().toISOString(),
      },
      services: {
        firebaseClient,
        firebaseAdmin,
        resend,
        cloudinary,
        webhooks,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Integrations status error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

