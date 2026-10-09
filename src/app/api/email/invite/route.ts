import { NextRequest, NextResponse } from "next/server";
import { SendInviteEmailSchema } from "@/lib/schema/email";
import { renderInviteEmail } from "@/lib/email/templates";
import { sendTransactionalEmail, getDeliverabilityConfig } from "@/lib/email/resend";
import { logDispatchExecution } from "@/lib/logging/dispatchLogger";
import { db } from "@/lib/firebase/client";
import { doc, getDoc, updateDoc } from "firebase/firestore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = SendInviteEmailSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid invitation email payload", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { token, recipientEmail, musicianName, sectionName, instruments, notes, actorUid } = parsed.data;

    // 1. RBAC Guard: If actorUid is supplied, verify administrator or membership manager privileges
    if (actorUid) {
      const actorDoc = await getDoc(doc(db, "users", actorUid));
      if (!actorDoc.exists()) {
        return NextResponse.json({ error: "Actor profile not found." }, { status: 401 });
      }
      const actorData = actorDoc.data();
      const roles: string[] = Array.isArray(actorData.roles) ? actorData.roles : [];
      const hasPerm = roles.includes("admin") || roles.includes("membership_manager") || actorData.role === "admin";
      if (!hasPerm) {
        return NextResponse.json(
          { error: "Unauthorized: Administrator clearance required to dispatch invitations." },
          { status: 403 }
        );
      }
    }

    // 2. Fetch or verify the invite document
    const inviteRef = doc(db, "invites", token);
    const inviteSnap = await getDoc(inviteRef);
    if (!inviteSnap.exists()) {
      return NextResponse.json(
        { error: "Invite token record not found in system." },
        { status: 404 }
      );
    }

    const origin = req.headers.get("origin") || req.nextUrl?.origin;
    const config = getDeliverabilityConfig(origin);

    // 3. Render branded HTML template
    const { subject, html, text } = renderInviteEmail({
      musicianName,
      sectionName,
      instruments,
      notes,
      token,
      appUrl: config.appUrl,
    });

    // 4. Dispatch transactional email
    const result = await sendTransactionalEmail({
      to: recipientEmail,
      subject,
      html,
      text,
      templateType: "member_invite",
      relatedEntityId: token,
      relatedEntityType: "invite",
      senderUid: actorUid || "system",
      senderName: "Eagleburger Band Personnel",
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to dispatch invitation email via provider" },
        { status: 502 }
      );
    }

    // 5. Update lastEmailSentAt timestamp on the invite document
    const nowIso = new Date().toISOString();
    try {
      await updateDoc(inviteRef, { lastEmailSentAt: nowIso });
    } catch (updateErr) {
      console.warn("Could not update lastEmailSentAt on invite:", updateErr);
    }

    // Universal logging: record invite dispatch in admin_logs
    await logDispatchExecution({
      subject,
      dispatchType: "invite",
      recipientCount: 1,
      actorUid,
      actorName: "Eagleburger Band Personnel",
      details: {
        token,
        recipientEmail,
        musicianName,
        sectionName,
        logId: result.logId,
        mocked: result.mocked,
      },
    });

    return NextResponse.json({
      success: true,
      mocked: result.mocked,
      messageId: result.messageId,
      lastEmailSentAt: nowIso,
      recipientEmail,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Invite email dispatch error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

