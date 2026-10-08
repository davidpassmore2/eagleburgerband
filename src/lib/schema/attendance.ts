// src/lib/schema/attendance.ts
import { z } from "zod";

export const CheckInStatusEnum = z.enum(["checked_in", "late", "no_show", "excused"]);
export type CheckInStatus = z.infer<typeof CheckInStatusEnum>;

export const CheckInMethodEnum = z.enum(["self_kiosk", "section_leader", "admin", "pin", "auto"]);
export type CheckInMethod = z.infer<typeof CheckInMethodEnum>;

export const CheckInSchema = z.object({
  uid: z.string(),
  gigId: z.string(),
  displayName: z.string().default("Band Member"),
  section: z.string().default("General"),
  status: CheckInStatusEnum.default("checked_in"),
  checkInTime: z.string().default(() => new Date().toISOString()),
  isSub: z.boolean().default(false),
  subbingFor: z.string().default(""),
  notes: z.string().default(""),
  checkInMethod: CheckInMethodEnum.default("self_kiosk"),
  updatedAt: z.string().default(() => new Date().toISOString()),
});

export type CheckInRecord = z.infer<typeof CheckInSchema>;

export const RsvpStatusEnum = z.enum(["attending", "probable", "tentative", "declined"]);
export type RsvpStatus = z.infer<typeof RsvpStatusEnum>;

export const RsvpSchema = z.object({
  gigId: z.string(),
  uid: z.string(),
  displayName: z.string().default("Band Member"),
  sectionId: z.string().default(""),
  status: RsvpStatusEnum.default("tentative"),
  notes: z.string().default(""),
  updatedAt: z.string().default(() => new Date().toISOString()),
});

export type RsvpRecord = z.infer<typeof RsvpSchema>;
