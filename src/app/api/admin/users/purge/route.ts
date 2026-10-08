import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { deleteAuthUser } from "@/lib/firebase/admin";
import { doc, getDoc, deleteDoc, collection, query, where, getDocs, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { AdminLogSchema } from "@/lib/schema/adminLog";

const PurgeRequestSchema = z.object({
  targetUid: z.string().min(1, "Target UID is required"),
  actorUid: z.string().min(1, "Actor UID is required"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = PurgeRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid purge payload", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { targetUid, actorUid } = parsed.data;

    // 1. Guard against self-purge
    if (targetUid === actorUid) {
      return NextResponse.json(
        { error: "Administrators cannot purge their own account." },
        { status: 403 }
      );
    }

    // 2. Verify actor is an admin in Firestore
    const actorDoc = await getDoc(doc(db, "users", actorUid));
    if (!actorDoc.exists()) {
      return NextResponse.json({ error: "Actor profile not found." }, { status: 401 });
    }

    const actorData = actorDoc.data();
    const actorRoles: string[] = Array.isArray(actorData.roles) ? actorData.roles : [];
    const isActorAdmin = actorRoles.includes("admin") || actorData.role === "admin";

    if (!isActorAdmin) {
      return NextResponse.json(
        { error: "Unauthorized: Administrator clearance required to purge member records." },
        { status: 403 }
      );
    }

    // 3. Fetch target user details before deletion (for audit log)
    const targetDoc = await getDoc(doc(db, "users", targetUid));
    const targetData = targetDoc.exists() ? targetDoc.data() : null;
    const targetName = targetData?.displayName || targetData?.email || targetUid;
    const targetEmail = targetData?.email || "";

    // 4. Delete user from Firebase Authentication
    const authResult = await deleteAuthUser(targetUid);

    // 5. Delete user profile document from Firestore
    await deleteDoc(doc(db, "users", targetUid));

    // 6. Delete or revoke any associated invites
    try {
      const invitesQuery = query(
        collection(db, "invites"),
        where("claimedByUid", "==", targetUid)
      );
      const invitesSnap = await getDocs(invitesQuery);
      for (const d of invitesSnap.docs) {
        await deleteDoc(d.ref);
      }
    } catch (e) {
      console.warn("Could not clean up user invites during purge:", e);
    }

    // 7. Write immutable Admin Audit Log
    try {
      const logId = `admin_log_${Date.now()}_${Math.random().toString(36).substring(3, 8)}`;
      const logPayload = {
        id: logId,
        action: "member_purged",
        category: "personnel",
        actorUid,
        actorName: actorData.displayName || actorData.email || "Administrator",
        actorEmail: actorData.email || "",
        targetId: targetUid,
        targetName,
        description: `CRITICAL: Administrator ${actorData.displayName || actorData.email} PERMANENTLY REMOVED AND PURGED member record and Firebase Auth credentials for ${targetName} (${targetEmail || targetUid}).`,
        metadata: {
          purgedUid: targetUid,
          purgedEmail: targetEmail,
          authAccountDeleted: authResult.success,
          authError: authResult.error || null,
        },
        timestamp: new Date().toISOString(),
      };

      const validatedLog = AdminLogSchema.parse(logPayload);
      await setDoc(doc(db, "admin_logs", logId), validatedLog);
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

