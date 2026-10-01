// src/lib/schema/notification.ts
import { z } from "zod";

export const NotificationCategoryEnum = z.enum([
  "gig_alert",
  "logistics_change",
  "rehearsal_notice",
  "broadcast",
  "suggestion_activity",
  "system",
]);

export type NotificationCategory = z.infer<typeof NotificationCategoryEnum>;

export const NotificationPriorityEnum = z.enum(["low", "normal", "urgent"]);
export type NotificationPriority = z.infer<typeof NotificationPriorityEnum>;

export const NotificationSchema = z.object({
  id: z.string(),
  recipientUid: z.string().default("all"), // specific user UID, or "all", or "section:<sectionId>", or "role:<role>"
  title: z.string().min(1, "Notification title is required"),
  message: z.string().min(1, "Notification message is required"),
  category: NotificationCategoryEnum.default("broadcast"),
  priority: NotificationPriorityEnum.default("normal"),
  readUids: z.array(z.string()).default([]), // UIDs of users who have read/dismissed
  actionUrl: z.string().default(""), // Optional URL to direct the user (e.g. /portal/gigs/gig_123)
  actionLabel: z.string().default(""), // e.g. "View Call Sheet"
  createdByUid: z.string().default(""),
  createdByName: z.string().default("Band Dispatch"),
  metadata: z.record(z.string(), z.any()).default({}),
  createdAt: z.string().default(() => new Date().toISOString()),
  updatedAt: z.string().default(() => new Date().toISOString()),
});

export type AppNotification = z.infer<typeof NotificationSchema>;

export const NotificationPreferencesSchema = z.object({
  gigAlerts: z.boolean().default(true),
  logisticsChanges: z.boolean().default(true),
  rehearsalNotices: z.boolean().default(true),
  broadcasts: z.boolean().default(true),
  suggestionActivity: z.boolean().default(true),
  emailDigest: z.boolean().default(false),
  smsEmergencyOnly: z.boolean().default(true),
  updatedAt: z.string().default(() => new Date().toISOString()),
});

export type NotificationPreferences = z.infer<typeof NotificationPreferencesSchema>;
