import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { deleteAuthUser } from "@/lib/firebase/admin";
import { deleteDocument, findDocuments, getDocument, setDocument } from "@/lib/firebase/serverFirestore";
import { requireCaller } from "@/lib/auth/serverAuth";
import { buildAdminLog } from "@/lib/logging/adminLogger";

const PurgeRequestSchema = z.object({
  targetUid: z.string().min(1, "Target UID is required").regex(/^[^/]+$/, "Invalid target UID"),
});

export async function POST(req: NextRequest) {
  try {
    const caller = await requireCaller(
      req,
      ["admin"],
      "Unauthorized: Administrator clearance required to purge member records."
    );
    if (caller instanceof NextResponse) return caller;

    const body = await req.json();
    const parsed = PurgeRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid purge payload", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { targetUid } = parsed.data;

    // 1. Guard against self-purge
    if (targetUid === caller.uid) {
      return NextResponse.json(
        { error: "Administrators cannot purge their own account." },
        { status: 403 }
      );
    }

    // 2. Fetch target user details before deletion (for audit log)
    const targetData = (await getDocument(`users/${targetUid}`))?.data ?? null;
    const targetName = String(targetData?.displayName || targetData?.email || targetUid);
    const targetEmail = String(targetData?.email || "");

    // 3. Delete user profile document from Firestore
    await deleteDocument(`users/${targetUid}`);

    // 4. Delete or revoke any associated invites
    try {
      for (const invite of await findDocuments("invites", "claimedByUid", targetUid)) {
        await deleteDocument(invite.path);
      }
    } catch (e) {
      console.warn("Could not clean up user invites during purge:", e);
    }

    // 5. Delete user from Firebase Authentication
    const authResult = await deleteAuthUser(targetUid);

    // 6. Write immutable Admin Audit Log
    try {
      const actorName = caller.displayName || caller.email || "Administrator";
      const adminLog = buildAdminLog({
        action: "member_purged",
        category: "personnel",
        actor: { uid: caller.uid, displayName: actorName, email: caller.email },
        targetId: targetUid,
        targetName,
        description: `CRITICAL: Administrator ${actorName} PERMANENTLY REMOVED AND PURGED member record and Firebase Auth credentials for ${targetName} (${targetEmail || targetUid}).`,
        metadata: {
          purgedUid: targetUid,
          purgedEmail: targetEmail,
          authAccountDeleted: authResult.success,
          authError: authResult.error || null,
        },
      });
      await setDocument(`admin_logs/${adminLog.id}`, adminLog);
    } catch (e) {
      console.warn("Failed to record purge audit log:", e);
    }

    return NextResponse.json({
      success: true,
      authDeleted: authResult.success,
      warning: authResult.success ? undefined : authResult.error,
      message: `User ${targetName} was permanently removed and purged from Firebase.`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Purge user error:", err);
    return NextResponse.json(
      { error: "Failed to purge user: " + message },
      { status: 500 }
    );
  }
}
