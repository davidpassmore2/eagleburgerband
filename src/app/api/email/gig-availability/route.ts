import { NextRequest, NextResponse } from "next/server";
import { SendGigAvailabilityEmailSchema } from "@/lib/schema/email";
import { renderGigAvailabilityRequestEmail } from "@/lib/email/templates";
import { sendTransactionalEmail, getDeliverabilityConfig } from "@/lib/email/resend";
import { resolveGigAvailabilityRecipients } from "@/lib/portal/gigDispatchEngine";
import { db } from "@/lib/firebase/client";
import { doc, getDoc } from "firebase/firestore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
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
      actorUid,
    } = parsed.data;

    // 1. RBAC Guard: Verify gig coordinator, manager, or admin clearance
    if (actorUid) {
      const actorDoc = await getDoc(doc(db, "users", actorUid));
      if (!actorDoc.exists()) {
        return NextResponse.json({ error: "Actor profile not found." }, { status: 401 });
      }
      const actorData = actorDoc.data();
      const roles: string[] = Array.isArray(actorData.roles) ? actorData.roles : [];
      const hasPerm =
        roles.includes("admin") ||
        roles.includes("gig_manager") ||
        roles.includes("web_manager") ||
        actorData.role === "admin";

      if (!hasPerm) {
        return NextResponse.json(
          { error: "Unauthorized: Gig coordinator or administrator clearance required to dispatch availability requests." },
          { status: 403 }
        );
      }
    }

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
      senderName: "Eagleburger Gig Operations",
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to dispatch availability request emails" },
        { status: 502 }
      );
    }

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

