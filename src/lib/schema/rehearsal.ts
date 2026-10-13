import { z } from "zod";
import { RsvpStatusEnum } from "./attendance";

export { RsvpStatusEnum };
export type { RsvpStatus } from "./attendance";

/**
 * Rehearsal Comment Schema for practice session discussions and location tips
 */
export const RehearsalCommentSchema = z.object({
  id: z.string().default(() => Math.random().toString(36).substring(2, 9)),
  authorUid: z.string(),
  authorName: z.string().default("Band Member"),
  text: z.string().min(1, "Comment cannot be empty"),
  createdAt: z.string().default(() => new Date().toISOString()),
});

export type RehearsalComment = z.infer<typeof RehearsalCommentSchema>;

/**
 * Saved Rehearsal Location Schema with Leaflet coordinates and location-specific comments
 */
export const RehearsalLocationSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Location name is required"),
  address: z.string().default(""),
  city: z.string().default("Pittsburgh, PA"),
  lat: z.number().default(40.4533),
  lng: z.number().default(-80.0076),
  parkingNotes: z.string().default(""),
  accessNotes: z.string().default(""),
  isDefault: z.boolean().default(false),
  comments: z.array(RehearsalCommentSchema).default([]),
  createdBy: z.string().default(""),
  createdAt: z.string().default(() => new Date().toISOString()),
  updatedAt: z.string().default(() => new Date().toISOString()),
});

export type RehearsalLocation = z.infer<typeof RehearsalLocationSchema>;

/**
 * Weekly Recurring Rehearsal Schedule Settings Schema
 */
export const RehearsalConfigSchema = z.object({
  dayOfWeek: z.number().min(0).max(6).default(2), // 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
  dayName: z.string().default("Tuesday"),
  startTime: z.string().default("19:00"),
  endTime: z.string().default("21:00"),
  durationMinutes: z.number().default(120),
  defaultLocationId: z.string().default(""),
  defaultLocationName: z.string().default("Allegheny Commons Rehearsal Grounds"),
  defaultLocationAddress: z.string().default("Arch St & W Ohio St, Pittsburgh, PA 15212"),
  defaultLat: z.number().default(40.4533),
  defaultLng: z.number().default(-80.0076),
  agendaNotes: z
    .string()
    .default("Bring instrument, stands, and repertoire binder. Warm-ups start 15 min prior to downbeat."),
  isActive: z.boolean().default(true),
  updatedAt: z.string().default(() => new Date().toISOString()),
  updatedBy: z.string().default(""),
});

export type RehearsalConfig = z.infer<typeof RehearsalConfigSchema>;

/**
 * Member Attendance Plan (RSVP) Schema for Rehearsals
 */
export const RehearsalRsvpSchema = z.object({
  rehearsalId: z.string(),
  uid: z.string(),
  displayName: z.string().default("Band Member"),
  sectionId: z.string().default(""),
  sectionName: z.string().default(""),
  instrument: z.string().default(""),
  status: RsvpStatusEnum.default("tentative"),
  notes: z.string().default(""),
  updatedAt: z.string().default(() => new Date().toISOString()),
});

export type RehearsalRsvp = z.infer<typeof RehearsalRsvpSchema>;

/**
 * Specific Rehearsal Session Schema (individual practice date)
 */
export const RehearsalSessionSchema = z.object({
  id: z.string(), // Usually 'rehearsal_YYYY-MM-DD' or UUID
  date: z.string(), // YYYY-MM-DD
  startTime: z.string().default("19:00"),
  endTime: z.string().default("21:00"),
  title: z.string().default("Weekly Band Rehearsal"),
  locationId: z.string().default(""),
  locationName: z.string().default("Allegheny Commons Rehearsal Grounds"),
  locationAddress: z.string().default("Arch St & W Ohio St, Pittsburgh, PA 15212"),
  lat: z.number().default(40.4533),
  lng: z.number().default(-80.0076),
  locationNotes: z.string().default(""),
  isCancelled: z.boolean().default(false),
  cancellationReason: z.string().default(""),
  cancelledBy: z.string().default(""),
  cancelledAt: z.string().default(""),
  agenda: z.string().default(""),
  comments: z.array(RehearsalCommentSchema).default([]),
  createdAt: z.string().default(() => new Date().toISOString()),
  updatedAt: z.string().default(() => new Date().toISOString()),
});

export type RehearsalSession = z.infer<typeof RehearsalSessionSchema>;

