import { Resend } from "resend";
import { db } from "@/lib/firebase/client";
import { doc, setDoc } from "firebase/firestore";
import { EmailLogSchema, EmailRecipient, EmailTemplateType } from "@/lib/schema/emailLog";

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  templateType?: EmailTemplateType;
  relatedEntityId?: string | null;
  relatedEntityType?: "gig" | "contact" | "invite" | "general";
  senderUid?: string;
  senderName?: string;
  senderEmail?: string;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  mocked: boolean;
  error?: string;
  logId?: string;
}

/**
 * Returns the current runtime deliverability configuration.
 */
export function getDeliverabilityConfig(reqOrigin?: string | null) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const fromEmail = process.env.RESEND_FROM_EMAIL?.trim() || "Eagleburger Band <onboarding@resend.dev>";
  const isEmulator = process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === "true";
  const hasKey = Boolean(apiKey && apiKey.length > 0);
  const isMockMode = isEmulator || !hasKey;

  // Resolve canonical application base URL:
  // 1. Explicitly configured NEXT_PUBLIC_APP_URL (if not default localhost)
  // 2. Caller request origin (e.g. https://beta.eagleburgerband.com)
  // 3. Vercel production domain (VERCEL_PROJECT_PRODUCTION_URL)
  // 4. Vercel deployment preview domain (VERCEL_URL)
  // 5. Localhost fallback
  let appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!appUrl || appUrl === "http://localhost:3000") {
    if (reqOrigin && reqOrigin.startsWith("http")) {
      appUrl = reqOrigin;
    } else if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
      appUrl = `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
    } else if (process.env.VERCEL_URL) {
      appUrl = `https://${process.env.VERCEL_URL}`;
    } else {
      appUrl = "http://localhost:3000";
    }
  }

  return {
    hasKey,
    isMockMode,
    isEmulator,
    fromEmail,
    appUrl,
  };
}

/**
 * Dispatches a transactional email via Resend in production/cloud, or
 * transparently mocks and logs the transmission when running in offline emulator mode.
 */
export async function sendTransactionalEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  const config = getDeliverabilityConfig();
  const recipientList = Array.isArray(options.to) ? options.to : [options.to];
  const logId = `email_${Date.now()}_${Math.random().toString(36).substring(3, 8)}`;

  const recipients: EmailRecipient[] = recipientList.map((em) => ({
    email: em,
    phone: "",
    smsConsent: false,
    channel: "email" as const,
    name: em.split("@")[0],
    status: config.isMockMode ? ("simulated" as const) : ("delivered" as const),
    deliveredAt: new Date().toISOString(),
  }));

  // 1. Mock Mode (Local emulator or missing RESEND_API_KEY)
  if (config.isMockMode) {
    const mockMessageId = `mock_resend_${Date.now()}`;
    console.log("--------------------------------------------------------------------------------");
    console.log(`📬 [MOCK EMAIL DISPATCH] Provider: MOCK (Emulator / No Key)`);
    console.log(`To:       ${recipientList.join(", ")}`);
    console.log(`From:     ${config.fromEmail}`);
    console.log(`Subject:  ${options.subject}`);
    console.log(`Template: ${options.templateType || "custom_broadcast"}`);
    console.log("--------------------------------------------------------------------------------");

    try {
      const logPayload = {
        id: logId,
        channel: "email" as const,
        templateType: options.templateType || "custom_broadcast",
        subject: options.subject,
        htmlBody: options.html,
        plainTextSnippet: options.text || options.subject,
        smsBody: "",
        characterCount: (options.text || options.html).length,
        segmentsCount: 1,
        recipients,
        recipientCount: recipients.length,
        senderUid: options.senderUid || "system",
        senderName: options.senderName || "Eagleburger Band",
        senderEmail: options.senderEmail || config.fromEmail,
        relatedEntityId: options.relatedEntityId ?? null,
        relatedEntityType: options.relatedEntityType || "general",
        status: "simulated" as const,
        provider: "mock" as const,
        providerMessageId: mockMessageId,
        deliveryStatus: "mocked" as const,
        errorMessage: null,
        sentAt: new Date().toISOString(),
      };

      const validatedLog = EmailLogSchema.parse(logPayload);
      await setDoc(doc(db, "email_logs", logId), validatedLog);
    } catch (logErr) {
      console.warn("⚠️ Warning: Could not persist mock email log to Firestore:", logErr);
    }

    return {
      success: true,
      mocked: true,
      messageId: mockMessageId,
      logId,
    };
  }

  // 2. Live Cloud Mode via Resend API
  try {
    const resend = new Resend(process.env.RESEND_API_KEY!);
    const { data, error } = await resend.emails.send({
      from: config.fromEmail,
      to: recipientList,
      subject: options.subject,
      html: options.html,
      text: options.text,
      replyTo: options.replyTo,
    });

    if (error) {
      console.error("❌ Resend API Dispatch Error:", error);
      // Log the failure to Firestore for visibility
      try {
        const failurePayload = {
          id: logId,
          channel: "email" as const,
          templateType: options.templateType || "custom_broadcast",
          subject: options.subject,
          htmlBody: options.html,
          plainTextSnippet: options.text || options.subject,
          smsBody: "",
          characterCount: (options.text || options.html).length,
          segmentsCount: 1,
          recipients: recipients.map((r) => ({ ...r, status: "failed" as const })),
          recipientCount: recipients.length,
          senderUid: options.senderUid || "system",
          senderName: options.senderName || "Eagleburger Band",
          senderEmail: options.senderEmail || config.fromEmail,
          relatedEntityId: options.relatedEntityId ?? null,
          relatedEntityType: options.relatedEntityType || "general",
          status: "queued" as const,
          provider: "resend" as const,
          providerMessageId: null,
          deliveryStatus: "failed" as const,
          errorMessage: error.message || "Failed to dispatch via Resend",
          sentAt: new Date().toISOString(),
        };
        await setDoc(doc(db, "email_logs", logId), EmailLogSchema.parse(failurePayload));
      } catch (logErr) {
        console.warn("⚠️ Warning: Could not record failed email log to Firestore:", logErr);
      }

      return {
        success: false,
        mocked: false,
        error: error.message,
        logId,
      };
    }

    const providerMessageId = data?.id || `resend_${Date.now()}`;

    // Log the successful delivery
    try {
      const successPayload = {
        id: logId,
        channel: "email" as const,
        templateType: options.templateType || "custom_broadcast",
        subject: options.subject,
        htmlBody: options.html,
        plainTextSnippet: options.text || options.subject,
        smsBody: "",
        characterCount: (options.text || options.html).length,
        segmentsCount: 1,
        recipients,
        recipientCount: recipients.length,
        senderUid: options.senderUid || "system",
        senderName: options.senderName || "Eagleburger Band",
        senderEmail: options.senderEmail || config.fromEmail,
        relatedEntityId: options.relatedEntityId ?? null,
        relatedEntityType: options.relatedEntityType || "general",
        status: "delivered" as const,
        provider: "resend" as const,
        providerMessageId,
        deliveryStatus: "sent" as const,
        errorMessage: null,
        sentAt: new Date().toISOString(),
      };
      await setDoc(doc(db, "email_logs", logId), EmailLogSchema.parse(successPayload));
    } catch (logErr) {
      console.warn("⚠️ Warning: Could not record successful email log to Firestore:", logErr);
    }

    return {
      success: true,
      mocked: false,
      messageId: providerMessageId,
      logId,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("❌ Unexpected error in sendTransactionalEmail:", err);
    return {
      success: false,
      mocked: false,
      error: errorMsg,
      logId,
    };
  }
}

