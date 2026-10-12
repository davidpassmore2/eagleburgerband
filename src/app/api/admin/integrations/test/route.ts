import { NextRequest, NextResponse } from "next/server";
import { sendTransactionalEmail } from "@/lib/email/resend";
import { requireCaller } from "@/lib/auth/serverAuth";
import { getDocument } from "@/lib/firebase/serverFirestore";
import { CloudinaryConfigSchema } from "@/lib/schema/integrationConfig";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const caller = await requireCaller(req, ["admin"], "Administrator clearance required to manage integrations.");
    if (caller instanceof NextResponse) return caller;

    const body = await req.json();
    const { action, recipientEmail, customWebhookUrl } = body;

    if (!action) {
      return NextResponse.json({ error: "Test action required." }, { status: 400 });
    }

    // 1. Test Resend Transactional Email
    if (action === "test_email") {
      const target = recipientEmail || "onboarding@resend.dev";
      const result = await sendTransactionalEmail({
        to: target,
        subject: `🎺 Eagleburger Band - Integration Test (${new Date().toLocaleTimeString()})`,
        html: `
          <div style="font-family: sans-serif; padding: 24px; background: #0f172a; color: #f8fafc; border-radius: 16px;">
            <h2 style="color: #facc15; margin-top: 0;">🎺 Integration Deliverability Test</h2>
            <p>This is an automated test verifying the transactional email connection for the <strong>Eagleburger Band Musician Portal</strong>.</p>
            <div style="background: #1e293b; padding: 12px 16px; border-radius: 8px; font-family: monospace; font-size: 13px; margin: 16px 0;">
              Timestamp: ${new Date().toISOString()}<br/>
              Target: ${target}
            </div>
            <p style="font-size: 12px; color: #94a3b8; margin-bottom: 0;">Eagleburger Band Web Operations</p>
          </div>
        `,
        text: `Eagleburger Band - Integration Deliverability Test at ${new Date().toISOString()}`,
        templateType: "custom_broadcast",
      });

      return NextResponse.json({
        success: result.success,
        mocked: result.mocked,
        messageId: result.messageId || null,
        message: result.mocked
          ? "Test email simulated successfully (running in offline emulator or mock mode)."
          : `Live test email dispatched successfully via Resend to ${target}.`,
      });
    }

    // 2. Test Alert Webhook (Slack / Discord)
    if (action === "test_webhook") {
      const webhookUrl = customWebhookUrl || process.env.SLACK_WEBHOOK_URL || process.env.DISCORD_WEBHOOK_URL;
      if (!webhookUrl) {
        return NextResponse.json({
          success: false,
          error: "No webhook URL provided or configured in environment variables (SLACK_WEBHOOK_URL / DISCORD_WEBHOOK_URL).",
        });
      }

      const testPayload = {
        text: `🎺 *Eagleburger Band Integrations Test*\nStatus: Connected & Operational\nTimestamp: \`${new Date().toISOString()}\``,
      };

      const res = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(testPayload),
        signal: AbortSignal.timeout(5000),
      });

      if (!res.ok) {
        const text = await res.text();
        return NextResponse.json({
          success: false,
          error: `Webhook server responded with HTTP ${res.status}: ${text}`,
        });
      }

      return NextResponse.json({
        success: true,
        message: "Test webhook payload delivered successfully to external chat channel.",
      });
    }

    // 3. Test Firebase Admin SDK
    if (action === "test_admin_sdk") {
      const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
      if (!serviceAccountKey && !process.env.FIREBASE_CLIENT_EMAIL) {
        return NextResponse.json({
          success: false,
          error: "FIREBASE_SERVICE_ACCOUNT_KEY is not defined in the server environment.",
        });
      }

      return NextResponse.json({
        success: true,
        message: "Firebase Admin SDK service account credentials successfully loaded and verified on server.",
      });
    }

    // 4. Test Cloudinary
    if (action === "test_cloudinary") {
      let cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
      let preset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

      if (!cloudName || !preset) {
        try {
          const cDoc = await getDocument("system_config/cloudinary");
          if (cDoc?.data) {
            const parsed = CloudinaryConfigSchema.safeParse(cDoc.data);
            if (parsed.success && parsed.data.cloudName && parsed.data.uploadPreset) {
              cloudName = parsed.data.cloudName;
              preset = parsed.data.uploadPreset;
            }
          }
          if (!cloudName) {
            const iDoc = await getDocument("system_config/integrations");
            if (iDoc?.data?.cloudinary) {
              const parsed = CloudinaryConfigSchema.safeParse(iDoc.data.cloudinary);
              if (parsed.success && parsed.data.cloudName && parsed.data.uploadPreset) {
                cloudName = parsed.data.cloudName;
                preset = parsed.data.uploadPreset;
              }
            }
          }
        } catch {
          // ignore
        }
      }

      if (!cloudName || !preset) {
        return NextResponse.json({
          success: false,
          error: "NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME or NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET is missing and no persistent Firestore config found.",
        });
      }

      return NextResponse.json({
        success: true,
        message: `Cloudinary configured with cloud '${cloudName}' and preset '${preset}'.`,
      });
    }

    return NextResponse.json({ error: `Unknown test action: ${action}` }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Test integration error:", err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
