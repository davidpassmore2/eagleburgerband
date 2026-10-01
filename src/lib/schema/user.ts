import { z } from "zod";
import { PortalColorSchemeIdSchema, PortalThemeModeSchema } from "@/lib/schema/theme";
import { NotificationPreferencesSchema } from "@/lib/schema/notification";

export const RoleEnum = z.enum([
  "admin",
  "web_manager",
  "gig_manager",
  "catalog_manager",
  "setlist_manager",
  "community_manager",
  "treasurer",
  "section_leader",
  "membership_manager",
  "asset_manager",
  "member",
  "guest",
]);

export const PayoutPreferencesSchema = z.object({
  preferredMethod: z.enum(["venmo", "paypal", "zelle", "check", "other"]).default("venmo"),
  venmoHandle: z.string().default(""),
  paypalEmail: z.string().default(""),
  zelleIdentifier: z.string().default(""),
  notes: z.string().default(""),
});

export type PayoutPreferences = z.infer<typeof PayoutPreferencesSchema>;

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
  portalThemeMode: PortalThemeModeSchema.default("dark"),
  status: z.enum(["active", "inactive", "pending"]).default("active"),
  phone: z.string().default(""),
  smsConsent: z.boolean().default(false),
  smsConsentUpdatedAt: z.string().default(""),
  payoutPreferences: PayoutPreferencesSchema.default({
    preferredMethod: "venmo",
    venmoHandle: "",
    paypalEmail: "",
    zelleIdentifier: "",
    notes: "",
  }),
  notificationPreferences: NotificationPreferencesSchema.default({
    gigAlerts: true,
    logisticsChanges: true,
    rehearsalNotices: true,
    broadcasts: true,
    suggestionActivity: true,
    emailDigest: false,
    smsEmergencyOnly: true,
    updatedAt: new Date().toISOString(),
  }),

  metadata: z.record(z.string(), z.any()).optional().default({}),
  updatedAt: z.string().default(() => new Date().toISOString()),
});

export type User = z.infer<typeof UserSchema>;