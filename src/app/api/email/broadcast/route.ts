import { NextRequest, NextResponse } from "next/server";
import { SendBroadcastEmailSchema } from "@/lib/schema/email";
import { wrapInBrandedEmailHtml } from "@/lib/email/templates";
import { sendTransactionalEmail } from "@/lib/email/resend";
import { logDispatchExecution } from "@/lib/logging/dispatchLogger";
import { requireCaller } from "@/lib/auth/serverAuth";
import { EmailTemplateType } from "@/lib/schema/emailLog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const caller = await requireCaller(
      req,
      ["community_manager", "gig_manager"],
      "Unauthorized: Administrator or communications manager clearance required to broadcast."
    );
    if (caller instanceof NextResponse) return caller;

    const body = await req.json();
    const parsed = SendBroadcastEmailSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid broadcast email payload", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const {
      subject,
      htmlBody,
      recipientEmails,
      templateType,
      relatedEntityId,
      relatedEntityType,
    } = parsed.data;

    const senderUid = caller.uid;
    const senderName = caller.displayName || "Eagleburger Administrator";
    const senderEmail = caller.email;

    // 2. Wrap the HTML in the band's branded design
    const brandedHtml = wrapInBrandedEmailHtml(htmlBody, subject);
    const plainText = htmlBody.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

    // 3. Dispatch transactional email
    const result = await sendTransactionalEmail({
      to: recipientEmails,
      subject,
      html: brandedHtml,
      text: plainText,
      templateType: (templateType as EmailTemplateType) || "custom_broadcast",
      relatedEntityId: relatedEntityId ?? null,
      relatedEntityType: relatedEntityType || "general",
      senderUid: senderUid || "system",
      senderName: senderName || "Eagleburger Band",
      senderEmail: senderEmail || undefined,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to dispatch broadcast emails" },
        { status: 502 }
      );
    }

    // Universal logging to gigs subcollection (if gigId) and admin_logs
    await logDispatchExecution({
      gigId: relatedEntityId && relatedEntityType === "gig" ? relatedEntityId : null,
      subject,
      dispatchType: "broadcast",
      recipientCount: recipientEmails.length,
      actorUid: senderUid,
      actorName: senderName,
      actorEmail: senderEmail,
      details: {
        templateType,
        relatedEntityId,
        relatedEntityType,
        logId: result.logId,
        mocked: result.mocked,
      },
    });

    return NextResponse.json({
      success: true,
      recipientCount: recipientEmails.length,
      mocked: result.mocked,
      messageId: result.messageId,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Broadcast email dispatch error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

