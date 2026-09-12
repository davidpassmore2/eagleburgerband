// src/lib/schema/suggestion.ts
import { z } from "zod";

export const SuggestionCategoryEnum = z.enum([
  "tune_request",
  "gig_outreach",
  "website_request",
  "general_feedback",
  // Legacy categories for backwards compatibility
  "gig_opportunity",
  "rehearsal_format",
  "gear_uniform",
  "general",
]);

export const SuggestionStatusEnum = z.enum([
  "submitted",
  "under_review",
  "accepted",
  "declined",
  "implemented",
  // Legacy aliases
  "pitched",
  "in_review",
  "approved",
  "shelved",
]);

export const SuggestionSchema = z.object({
  id: z.string(),
  authorUid: z.string().default(""),
  authorName: z.string().default("Musician"),
  category: SuggestionCategoryEnum.default("general_feedback"),
  title: z.string().min(1, "Title is required"),
  description: z.string().default(""),
  status: SuggestionStatusEnum.default("submitted"),
  upvoteUids: z.array(z.string()).default([]),
  downvoteUids: z.array(z.string()).default([]),
  originalArtist: z.string().default(""),
  referenceUrl: z.string().default(""),
  targetRole: z.string().default(""),
  adminNotes: z.string().default(""),
  reviewedByUid: z.string().nullable().default(null),
  reviewedByName: z.string().nullable().default(null),
  reviewedAt: z.string().nullable().default(null),
  createdAt: z.string().default(() => new Date().toISOString()),
  updatedAt: z.string().default(() => new Date().toISOString()),
});

export type SuggestionCategory = z.infer<typeof SuggestionCategoryEnum>;
export type SuggestionStatus = z.infer<typeof SuggestionStatusEnum>;
export type Suggestion = z.infer<typeof SuggestionSchema>;