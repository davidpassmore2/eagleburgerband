import { NextRequest, NextResponse } from "next/server";
import { SendGigConfirmationEmailSchema } from "@/lib/schema/email";
import { renderGigConfirmedEmail } from "@/lib/email/templates";
import { sendTransactionalEmail, getDeliverabilityConfig } from "@/lib/email/resend";
import { resolveGigConfirmedRecipients } from "@/lib/portal/gigDispatchEngine";
import { db } from "@/lib/firebase/client";
import { doc, getDoc } from "firebase/firestore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = SendGigConfirmationEmailSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid gig confirmation payload", details: parsed.error.format() },
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
      recipientEmails: explicitEmails,
      actorUid,
    } = parsed.data;

    // 1. RBAC Guard: Verify gig coordinator or admin role
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
          { error: "Unauthorized: Gig coordinator or administrator clearance required to dispatch confirmation emails." },
          { status: 403 }
        );
      }
    }

    // 2. Resolve confirmed attendees marked "in" or "probable", excluding members on hiatus
    let targetEmails: string[] = [];
    let hiatusCount = 0;

    if (explicitEmails && explicitEmails.length > 0) {
      targetEmails = explicitEmails;
    } else {
      const resolution = await resolveGigConfirmedRecipients(gigId);
      targetEmails = resolution.confirmedRecipients.map((r) => r.email);
      hiatusCount = resolution.excludedHiatusCount;
    }

    if (targetEmails.length === 0) {
      return NextResponse.json({
        success: true,
        recipientCount: 0,
        hiatusCount,
        message: "No confirmed attendees marked 'in' or 'probable' to dispatch. Mark musicians attending or probable to send confirmation.",
      });
    }

    const origin = req.headers.get("origin") || req.nextUrl?.origin;
    const config = getDeliverabilityConfig(origin);

    // 3. Render branded confirmation email
    const { subject, html, text } = renderGigConfirmedEmail({
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

    // 4. Dispatch transactional email to confirmed attendees
    const result = await sendTransactionalEmail({
      to: targetEmails,
      subject,
      html,
      text,
      templateType: "gig_details",
      relatedEntityId: gigId,
      relatedEntityType: "gig",
      senderUid: actorUid || "system",
      senderName: "Eagleburger Gig Operations",
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to dispatch confirmation emails" },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      recipientCount: targetEmails.length,
      hiatusCount,
      mocked: result.mocked,
      logId: result.logId,
    });
  } catch (err) {
    console.error("API /api/email/gig-confirmation error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}

