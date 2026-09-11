// src/lib/schema/emailLog.ts
import { z } from "zod";

export const EmailTemplateTypeEnum = z.enum([
  "member_invite",
  "contact_thank_you",
  "gig_details",
  "rsvp_request",
  "gig_update",
  "custom_broadcast",
]);

export const BroadcastChannelEnum = z.enum(["email", "sms", "both"]);

export const EmailRecipientSchema = z.object({
  email: z.string().default(""),
  phone: z.string().default(""),
  smsConsent: z.boolean().default(false),
  channel: BroadcastChannelEnum.default("email"),
  name: z.string().default(""),
  uid: z.string().optional(),
  contactId: z.string().optional(),
  status: z.enum(["delivered", "sent", "failed", "simulated", "opted_out", "missing_phone"]).default("delivered"),
  deliveredAt: z.string().default(() => new Date().toISOString()),
});

export const EmailLogSchema = z.object({
  id: z.string(),
  channel: BroadcastChannelEnum.default("email"),
  templateType: EmailTemplateTypeEnum.default("custom_broadcast"),
  subject: z.string().min(1, "Subject is required"),
  htmlBody: z.string().default(""),
  plainTextSnippet: z.string().default(""),
  smsBody: z.string().default(""),
  characterCount: z.number().default(0),
  segmentsCount: z.number().default(1),
  recipients: z.array(EmailRecipientSchema).default([]),
  recipientCount: z.number().default(0),
  senderUid: z.string().default(""),
  senderName: z.string().default(""),
  senderEmail: z.string().default(""),
  relatedEntityId: z.string().nullable().default(null),
  relatedEntityType: z.enum(["gig", "contact", "invite", "general"]).default("general"),
  status: z.enum(["delivered", "simulated", "queued"]).default("delivered"),
  sentAt: z.string().default(() => new Date().toISOString()),
});

export type BroadcastChannel = z.infer<typeof BroadcastChannelEnum>;
export type EmailTemplateType = z.infer<typeof EmailTemplateTypeEnum>;
export type EmailRecipient = z.infer<typeof EmailRecipientSchema>;
export type EmailLog = z.infer<typeof EmailLogSchema>;
