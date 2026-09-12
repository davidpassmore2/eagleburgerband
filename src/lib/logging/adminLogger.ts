import { doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import {
  AdminLog,
  AdminLogSchema,
  AdminActionType,
  AdminLogCategory,
} from "@/lib/schema/adminLog";

export interface LogAdminActionParams {
  action: AdminActionType;
  category?: AdminLogCategory;
  actor: {
    uid: string;
    displayName?: string | null;
    email?: string | null;
  };
  targetId?: string | null;
  targetName?: string | null;
  description: string;
  metadata?: Record<string, unknown>;
}

export async function logAdminAction(params: LogAdminActionParams): Promise<string> {
  const logId = `admin_log_${Date.now()}_${Math.random().toString(36).substring(3, 8)}`;

  const payload: AdminLog = {
    id: logId,
    action: params.action,
    category: params.category || "personnel",
    actorUid: params.actor.uid || "",
    actorName: params.actor.displayName || "Administrator",
    actorEmail: params.actor.email || "",
    targetId: params.targetId || null,
    targetName: params.targetName || null,
    description: params.description,
    metadata: params.metadata || {},
    timestamp: new Date().toISOString(),
  };

  try {
    const validated = AdminLogSchema.parse(payload);
    await setDoc(doc(db, "admin_logs", logId), validated);
    return logId;
  } catch (err) {
    console.error("Failed to log admin action:", err);
    return logId;
  }
}
