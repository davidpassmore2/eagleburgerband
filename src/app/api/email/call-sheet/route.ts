import { NextRequest, NextResponse } from "next/server";
import { SendCallSheetEmailSchema } from "@/lib/schema/email";
import { renderCallSheetEmail } from "@/lib/email/templates";
import { sendTransactionalEmail, getDeliverabilityConfig } from "@/lib/email/resend";
import { logDispatchExecution } from "@/lib/logging/dispatchLogger";
import { requireCaller } from "@/lib/auth/serverAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const caller = await requireCaller(
      req,
      ["gig_manager", "web_manager"],
      "Unauthorized: Gig coordinator or administrator clearance required to dispatch call sheets."
    );
    if (caller instanceof NextResponse) return caller;

    const body = await req.json();
    const parsed = SendCallSheetEmailSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid call sheet payload", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const {
      gigId,
      gigTitle,
      date,
      callTime,
      downbeat,
      venue,
      address,
      attire,
      notes,
      setlistUrl,
      recipientEmails,
    } = parsed.data;

    const actorUid = caller.uid;
    const actorName = caller.displayName || "Eagleburger Gig Operations";
    const actorEmail = caller.email || undefined;

    const origin = req.headers.get("origin") || req.nextUrl?.origin;
    const config = getDeliverabilityConfig(origin);

    // 2. Render branded call sheet HTML
    const { subject, html, text } = renderCallSheetEmail({
      gigId,
      gigTitle,
      date,
      callTime,
      downbeat,
      venue,
      address,
      attire,
      notes,
      setlistUrl,
      appUrl: config.appUrl,
    });

    // 3. Dispatch transactional email to recipients
    const result = await sendTransactionalEmail({
      to: recipientEmails,
      subject,
      html,
      text,
      templateType: "gig_details",
      relatedEntityId: gigId,
      relatedEntityType: "gig",
      senderUid: actorUid || "system",
      senderName: actorName,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to dispatch call sheet emails" },
        { status: 502 }
      );
    }

    // 4. Universal logging: write to gigs/${gigId}/dispatches and admin_logs
    await logDispatchExecution({
      gigId,
      subject,
      dispatchType: "call_sheet",
      recipientCount: recipientEmails.length,
      actorUid,
      actorName,
      actorEmail,
      uniformBrief: attire,
      callTimeBrief: callTime,
      logisticsBrief: venue,
      details: {
        gigTitle,
        date,
        downbeat,
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
    console.error("Call sheet email dispatch error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

