// src/lib/schema/audition.ts
import { z } from "zod";

export const AuditionStatusEnum = z.enum([
  "new",
  "under_review",
  "invited_to_rehearsal",
  "accepted",
  "declined",
  "archived",
]);

export const AuditionSchema = z.object({
  id: z.string().default(""),
  name: z.string().default(""),
  email: z.string().default(""),
  phone: z.string().default(""),
  primaryInstrument: z.string().default(""),
  targetSectionId: z.string().default(""), // e.g. "percussion", "sousaphones", "trombones", "trumpets", "saxophones", "auxiliary"
  secondaryInstruments: z.string().default(""),
  experienceLevel: z.string().default(""), // e.g. "High School / College Marching", "Community Band", "Professional / Semi-Pro", "Self-Taught"
  sampleLinks: z.string().default(""), // URLs to video or audio clips
  availability: z.string().default(""), // e.g. "Weeknights and weekend parades"
  bioNotes: z.string().default(""), // why they want to join, musical background
  status: AuditionStatusEnum.default("new"),
  assignedLeaderUid: z.string().default(""),
  reviewerNotes: z.string().default(""),
  schemaVersion: z.number().default(1),
  createdAt: z.string().default(() => new Date().toISOString()),
  updatedAt: z.string().default(() => new Date().toISOString()),
});

export type Audition = z.infer<typeof AuditionSchema>;
export type AuditionStatus = z.infer<typeof AuditionStatusEnum>;

export const AuditionInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Full name must be at least 2 characters")
    .max(100, "Full name cannot exceed 100 characters"),
  email: z
    .string()
    .trim()
    .email("Please enter a valid email address"),
  phone: z
    .string()
    .trim()
    .min(7, "Phone number must be at least 7 digits")
    .max(25, "Phone number cannot exceed 25 characters")
    .regex(
      /^[\d\s\-\+\(\)\.extEXT]+$/,
      "Please enter a valid phone number"
    ),
  primaryInstrument: z
    .string()
    .trim()
    .min(2, "Please specify your primary instrument")
    .max(80, "Instrument name cannot exceed 80 characters"),
  targetSectionId: z
    .string()
    .trim()
    .default(""),
  secondaryInstruments: z
    .string()
    .trim()
    .max(150, "Secondary instruments cannot exceed 150 characters")
    .default(""),
  experienceLevel: z
    .string()
    .trim()
    .min(1, "Please select or describe your experience level"),
  sampleLinks: z
    .string()
    .trim()
    .max(500, "Links cannot exceed 500 characters")
    .default(""),
  availability: z
    .string()
    .trim()
    .max(200, "Availability description cannot exceed 200 characters")
    .default(""),
  bioNotes: z
    .string()
    .trim()
    .min(10, "Please share a brief note about yourself and why you would like to join (min 10 characters)")
    .max(1500, "Note cannot exceed 1500 characters"),
});

export type AuditionInput = z.infer<typeof AuditionInputSchema>;

