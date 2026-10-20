import { z } from "zod";
import { BroadcastChannelEnum } from "./emailLog";

export const SendInviteEmailSchema = z.object({
  token: z.string().min(1, "Invite token is required").regex(/^[^/]+$/, "Invalid invite token"),
  recipientEmail: z.string().email("Valid recipient email is required"),
  musicianName: z.string().default(""),
  sectionName: z.string().default(""),
  instruments: z.array(z.string()).default([]),
  notes: z.string().default(""),
  sectionId: z.string().nullable().optional(),
});
export type SendInviteEmailPayload = z.infer<typeof SendInviteEmailSchema>;

export const SendCallSheetEmailSchema = z.object({
  gigId: z.string().min(1, "Gig ID is required"),
  gigTitle: z.string().min(1, "Gig title is required"),
  date: z.string().default("Upcoming Date"),
  callTime: z.string().default("TBD"),
  downbeat: z.string().default("TBD"),
  venue: z.string().default(""),
  address: z.string().default(""),
  attire: z.string().default(""),
  notes: z.string().default(""),
  setlistUrl: z.string().default(""),
  recipientEmails: z.array(z.string().email()).min(1, "At least one recipient email is required"),
});
export type SendCallSheetEmailPayload = z.infer<typeof SendCallSheetEmailSchema>;

export const SendBookingReceiptSchema = z.object({
  clientName: z.string().min(1, "Client name is required"),
  clientEmail: z.string().email("Valid client email is required"),
  eventTitle: z.string().default("Event Booking"),
  date: z.string().default(""),
  venue: z.string().default(""),
  budget: z.union([z.number(), z.string()]).default(""),
  message: z.string().default(""),
  phone: z.string().default(""),
  directorAlertEmail: z.string().email().optional(),
});
export type SendBookingReceiptPayload = z.infer<typeof SendBookingReceiptSchema>;

export const SendBroadcastEmailSchema = z.object({
  subject: z.string().min(1, "Subject is required"),
  htmlBody: z.string().min(1, "HTML body is required"),
  recipientEmails: z.array(z.string().email()).min(1, "At least one recipient is required"),
  channel: BroadcastChannelEnum.default("email"),
  templateType: z.string().default("custom_broadcast"),
  relatedEntityId: z.string().nullable().default(null),
  relatedEntityType: z.enum(["gig", "contact", "invite", "general"]).default("general"),
});
export type SendBroadcastEmailPayload = z.infer<typeof SendBroadcastEmailSchema>;

export const SendGigAvailabilityEmailSchema = z.object({
  gigId: z.string().min(1, "Gig ID is required"),
  gigTitle: z.string().min(1, "Gig title is required"),
  date: z.string().default("Upcoming Date"),
  callTime: z.string().default("TBD"),
  downbeat: z.string().default("TBD"),
  venue: z.string().default(""),
  address: z.string().default(""),
  notes: z.string().default(""),
  recipientEmails: z.array(z.string().email()).default([]),
});
export type SendGigAvailabilityEmailPayload = z.infer<typeof SendGigAvailabilityEmailSchema>;

export const SendGigConfirmationEmailSchema = z.object({
  gigId: z.string().min(1, "Gig ID is required"),
  gigTitle: z.string().min(1, "Gig title is required"),
  date: z.string().default("Upcoming Date"),
  callTime: z.string().default("TBD"),
  downbeat: z.string().default("TBD"),
  venue: z.string().default(""),
  address: z.string().default(""),
  attire: z.string().default(""),
  notes: z.string().default(""),
  setlistUrl: z.string().default(""),
  recipientEmails: z.array(z.string().email()).default([]),
});
export type SendGigConfirmationEmailPayload = z.infer<typeof SendGigConfirmationEmailSchema>;

export const SendGigCancellationEmailSchema = z.object({
  gigId: z.string().min(1, "Gig ID is required"),
  gigTitle: z.string().min(1, "Gig title is required"),
  date: z.string().default("Upcoming Date"),
  callTime: z.string().default("TBD"),
  venue: z.string().default(""),
  reason: z.string().default(""),
  recipientEmails: z.array(z.string().email()).default([]),
});
export type SendGigCancellationEmailPayload = z.infer<typeof SendGigCancellationEmailSchema>;


