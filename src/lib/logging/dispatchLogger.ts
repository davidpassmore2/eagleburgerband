import { addDoc, collection } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { DispatchSchema, DispatchRecord } from "@/lib/schema/dispatch";
import { logAdminAction } from "@/lib/logging/adminLogger";

export interface LogDispatchExecutionParams {
  gigId?: string | null;
  subject: string;
  dispatchType: "availability_request" | "gig_confirmation" | "gig_cancellation" | "call_sheet" | "broadcast" | "invite";
  recipientCount: number;
  actorUid?: string;
  actorName?: string;
  actorEmail?: string;
  uniformBrief?: string;
  callTimeBrief?: string;
  logisticsBrief?: string;
  details?: Record<string, unknown>;
}

/**
 * Persists comprehensive dispatch audit logs:
 * 1. To `gigs/${gigId}/dispatches` if a gigId is present, for call sheet and dispatch telemetry.
 * 2. To `admin_logs` for band-wide operational auditability.
 */
export async function logDispatchExecution(params: LogDispatchExecutionParams): Promise<void> {
  const sentAt = new Date().toISOString();
  const actorName = params.actorName || "Eagleburger Band Operations";

  // 1. If gigId is present, record in gigs/${gigId}/dispatches
  if (params.gigId) {
    try {
      const dispatchRecord: DispatchRecord = {
        gigId: params.gigId,
        sentAt,
        sentByName: actorName,
        subject: params.subject,
        uniformBrief: params.uniformBrief || "",
        callTimeBrief: params.callTimeBrief || "",
        logisticsBrief: params.logisticsBrief || "",
        recipientCount: params.recipientCount,
      };
      const validated = DispatchSchema.parse(dispatchRecord);
      await addDoc(collection(db, "gigs", params.gigId, "dispatches"), validated);
    } catch (dispErr) {
      console.warn("Notice: Could not write to gigs subcollection dispatches:", dispErr);
    }
  }

  // 2. Write to admin_logs
  try {
    await logAdminAction({
      action: "broadcast_dispatched",
      category: "logistics",
      actor: {
        uid: params.actorUid || "system",
        displayName: actorName,
        email: params.actorEmail || null,
      },
      targetId: params.gigId || null,
      targetName: params.subject,
      description: `Dispatched ${params.dispatchType} (${params.subject}) to ${params.recipientCount} recipient(s).`,
      metadata: {
        gigId: params.gigId || null,
        dispatchType: params.dispatchType,
        recipientCount: params.recipientCount,
        subject: params.subject,
        ...params.details,
      },
    });
  } catch (adminErr) {
    console.warn("Notice: Could not write admin log for dispatch:", adminErr);
  }
}

