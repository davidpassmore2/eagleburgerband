import { z } from "zod";

export const AdminActionTypeEnum = z.enum([
  "member_deactivated",
  "member_reactivated",
  "member_purged",
  "member_self_deactivated",
  "role_updated",
  "section_assigned",
  "status_updated",
  "treasury_transaction",
  "gig_settlement",
  "broadcast_dispatched",
  "system_config",
]);

export const AdminLogCategoryEnum = z.enum([
  "personnel",
  "finance",
  "logistics",
  "system",
]);

export const AdminLogSchema = z.object({
  id: z.string(),
  action: AdminActionTypeEnum.default("system_config"),
  category: AdminLogCategoryEnum.default("personnel"),
  actorUid:z.string().default(""),
  actorName: z.string().default("Administrator"),
  actorEmail: z.string().default(""),
  targetId: z.string().nullable().default(null),
  targetName: z.string().nullable().default(null),
  description: z.string().min(1),
  metadata: z.record(z.string(), z.unknown()).default({}),
  timestamp: z.string().default(() => new Date().toISOString()),
});

export type AdminActionType = z.infer<typeof AdminActionTypeEnum>;
export type AdminLogCategory = z.infer<typeof AdminLogCategoryEnum>;
export type AdminLog = z.infer<typeof AdminLogSchema>;
