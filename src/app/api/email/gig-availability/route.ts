import { NextRequest, NextResponse } from "next/server";
import { SendGigAvailabilityEmailSchema } from "@/lib/schema/email";
import { renderGigAvailabilityRequestEmail } from "@/lib/email/templates";
import { sendTransactionalEmail, getDeliverabilityConfig } from "@/lib/email/resend";
import { resolveGigAvailabilityRecipients } from "@/lib/portal/gigDispatchEngine";
import { logDispatchExecution } from "@/lib/logging/dispatchLogger";
import { requireCaller } from "@/lib/auth/serverAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const caller = await requireCaller(
      req,
      ["gig_manager", "web_manager"],
      "Unauthorized: Gig coordinator or administrator clearance required to dispatch availability requests."
    );
    if (caller instanceof NextResponse) return caller;

    const body = await req.json();
    const parsed = SendGigAvailabilityEmailSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid gig availability payload", details: parsed.error.format() },
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
      notes,
      recipientEmails: explicitEmails,
    } = parsed.data;

    const actorUid = caller.uid;
    const actorName = caller.displayName || "Eagleburger Gig Operations";
    const actorEmail = caller.email || undefined;

    // 2. Resolve recipients applying blackout dates & hiatus exclusions
    let targetEmails: string[] = [];
    let blackedOutCount = 0;
    let hiatusCount = 0;

    if (explicitEmails && explicitEmails.length > 0) {
      targetEmails = explicitEmails;
    } else {
      const resolution = await resolveGigAvailabilityRecipients(date);
      targetEmails = resolution.eligibleRecipients.map((r) => r.email);
      blackedOutCount = resolution.excludedBlackoutCount;
      hiatusCount = resolution.excludedHiatusCount;
    }

    if (targetEmails.length === 0) {
      return NextResponse.json({
        success: true,
        recipientCount: 0,
        blackedOutCount,
        hiatusCount,
        message: "No eligible recipients found. All active members may be on hiatus or have this date blacked out.",
      });
    }

    const origin = req.headers.get("origin") || req.nextUrl?.origin;
    const config = getDeliverabilityConfig(origin);

    // 3. Render availability request HTML
    const { subject, html, text } = renderGigAvailabilityRequestEmail({
      gigId,
      gigTitle,
      date,
      callTime,
      downbeat,
      venue,
      address,
      notes,
      appUrl: config.appUrl,
    });

    // 4. Send transactional emails
    const result = await sendTransactionalEmail({
      to: targetEmails,
      subject,
      html,
      text,
      templateType: "rsvp_request",
      relatedEntityId: gigId,
      relatedEntityType: "gig",
      senderUid: actorUid || "system",
      senderName: actorName,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to dispatch availability request emails" },
        { status: 502 }
      );
    }

    // Universal logging: write to gigs/${gigId}/dispatches and admin_logs
    await logDispatchExecution({
      gigId,
      subject,
      dispatchType: "availability_request",
      recipientCount: targetEmails.length,
      actorUid,
      actorName,
      actorEmail,
      callTimeBrief: callTime,
      logisticsBrief: venue,
      details: {
        gigTitle,
        date,
        blackedOutCount,
        hiatusCount,
        logId: result.logId,
        mocked: result.mocked,
      },
    });

    return NextResponse.json({
      success: true,
      recipientCount: targetEmails.length,
      blackedOutCount,
      hiatusCount,
      mocked: result.mocked,
      logId: result.logId,
    });
  } catch (err) {
    console.error("API /api/email/gig-availability error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}

