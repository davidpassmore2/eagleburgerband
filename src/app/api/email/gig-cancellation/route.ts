import { NextRequest, NextResponse } from "next/server";
import { SendGigCancellationEmailSchema } from "@/lib/schema/email";
import { renderGigCancellationEmail } from "@/lib/email/templates";
import { sendTransactionalEmail, getDeliverabilityConfig } from "@/lib/email/resend";
import { resolveGigConfirmedRecipients, resolveGigAvailabilityRecipients } from "@/lib/portal/gigDispatchEngine";
import { logDispatchExecution } from "@/lib/logging/dispatchLogger";
import { db } from "@/lib/firebase/client";
import { doc, getDoc } from "firebase/firestore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = SendGigCancellationEmailSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid gig cancellation payload", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const {
      gigId,
      gigTitle,
      date,
      callTime,
      venue,
      reason,
      recipientEmails: explicitEmails,
      actorUid,
    } = parsed.data;

    let actorName = "Eagleburger Gig Operations";
    let actorEmail: string | undefined;

    // 1. RBAC Guard: Verify gig coordinator, manager, or admin clearance
    if (actorUid) {
      const actorDoc = await getDoc(doc(db, "users", actorUid));
      if (!actorDoc.exists()) {
        return NextResponse.json({ error: "Actor profile not found." }, { status: 401 });
      }
      const actorData = actorDoc.data();
      actorName = actorData.displayName || actorName;
      actorEmail = actorData.email;
      const roles: string[] = Array.isArray(actorData.roles) ? actorData.roles : [];
      const hasPerm =
        roles.includes("admin") ||
        roles.includes("gig_manager") ||
        roles.includes("web_manager") ||
        actorData.role === "admin";

      if (!hasPerm) {
        return NextResponse.json(
          { error: "Unauthorized: Gig coordinator or administrator clearance required to dispatch cancellation notices." },
          { status: 403 }
        );
      }
    }

    // 2. Resolve target recipients:
    // First priority: musicians who RSVP'd attending (in) or probable for this gig.
    // Fallback: If no RSVPs exist yet, resolve all active band members for this date.
    let targetEmails: string[] = [];

    if (explicitEmails && explicitEmails.length > 0) {
      targetEmails = explicitEmails;
    } else {
      const confirmedResolution = await resolveGigConfirmedRecipients(gigId);
      if (confirmedResolution.confirmedRecipients.length > 0) {
        targetEmails = confirmedResolution.confirmedRecipients.map((r) => r.email);
      } else {
        const availResolution = await resolveGigAvailabilityRecipients(date);
        targetEmails = availResolution.eligibleRecipients.map((r) => r.email);
      }
    }

    if (targetEmails.length === 0) {
      return NextResponse.json({
        success: true,
        recipientCount: 0,
        message: "No committed or eligible attendees to notify for cancellation.",
      });
    }

    const origin = req.headers.get("origin") || req.nextUrl?.origin;
    const config = getDeliverabilityConfig(origin);

    // 3. Render cancellation email template
    const { subject, html, text } = renderGigCancellationEmail({
      gigId,
      gigTitle,
      date,
      callTime,
      venue,
      reason,
      appUrl: config.appUrl,
    });

    // 4. Dispatch transactional cancellation email
    const result = await sendTransactionalEmail({
      to: targetEmails,
      subject,
      html,
      text,
      templateType: "gig_cancellation",
      relatedEntityId: gigId,
      relatedEntityType: "gig",
      senderUid: actorUid || "system",
      senderName: actorName,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to dispatch cancellation emails" },
        { status: 502 }
      );
    }

    // 5. Universal logging to gigs subcollection and admin_logs
    await logDispatchExecution({
      gigId,
      subject,
      dispatchType: "gig_cancellation",
      recipientCount: targetEmails.length,
      actorUid,
      actorName,
      actorEmail,
      logisticsBrief: venue,
      callTimeBrief: callTime,
      details: {
        gigTitle,
        date,
        reason,
        logId: result.logId,
        mocked: result.mocked,
      },
    });

    return NextResponse.json({
      success: true,
      recipientCount: targetEmails.length,
      mocked: result.mocked,
      logId: result.logId,
    });
  } catch (err) {
    console.error("API /api/email/gig-cancellation error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}

