// src/lib/schema/suggestion.ts
import { z } from "zod";

export const SuggestionCategoryEnum = z.enum([
  "tune_request",
  "rehearsal_format",
  "gig_opportunity",
  "gear_uniform",
  "general",
]);

export const SuggestionStatusEnum = z.enum([
  "submitted",
  "under_review",
  "accepted",
  "declined",
  "implemented",
]);

export const SuggestionSchema = z.object({
  id: z.string(),
  authorUid: z.string(),
  authorName: z.string(),
  category: SuggestionCategoryEnum.default("general"),
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  status: SuggestionStatusEnum.default("submitted"),
  upvoteUids: z.array(z.string()).default([]),
  adminNotes: z.string().default(""),
  createdAt: z.string().default(() => new Date().toISOString()),
  updatedAt: z.string().default(() => new Date().toISOString()),
});

export type Suggestion = z.infer<typeof SuggestionSchema>;