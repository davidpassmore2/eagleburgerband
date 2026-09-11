import { z } from "zod";
import { PortalColorSchemeIdSchema } from "@/lib/schema/theme";

export const RoleEnum = z.enum([
  "admin",
  "web_manager",
  "gig_manager",
  "catalog_manager",
  "community_manager",
  "treasurer",
  "section_leader",
  "membership_manager",
  "asset_manager",
  "member",
  "guest",
]);

export const UserSchema = z.object({
  schemaVersion: z.number().default(1),
  uid: z.string(),
  email: z.string().email(),
  displayName: z.string().min(1),
  sectionId: z.string().nullable().default(null),
  instruments: z.array(z.string()).default([]),
  roles: z.array(RoleEnum).default(["member"]),
  favoriteToolIds: z.array(z.string()).default([]),
  portalThemeSchemeId: PortalColorSchemeIdSchema.default("eagleburger-gold"),
  status: z.enum(["active", "inactive", "pending"]).default("active"),
  phone: z.string().default(""),
  metadata: z.record(z.string(), z.any()).optional().default({}),
  updatedAt: z.string().default(() => new Date().toISOString()),
});

export type User = z.infer<typeof UserSchema>;