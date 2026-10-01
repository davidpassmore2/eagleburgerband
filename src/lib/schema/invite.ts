import { z } from "zod";
import { RoleEnum } from "./user";

export const InviteStatusEnum = z.enum(["pending", "claimed", "expired", "revoked"]);
export type InviteStatus = z.infer<typeof InviteStatusEnum>;

export const InviteSchema = z.object({
  token: z.string(),
  email: z.string(),
  displayName: z.string().default(""),
  sectionId: z.string().nullable().default(null),
  roles: z.array(RoleEnum).default(["member"]),
  status: InviteStatusEnum.default("pending"),
  createdAt: z.string().default(""),
  claimedAt: z.string().nullable().default(null),
  claimedByUid: z.string().nullable().default(null),
});

export type Invite = z.infer<typeof InviteSchema>;

