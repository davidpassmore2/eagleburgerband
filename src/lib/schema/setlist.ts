// src/lib/schema/setlist.ts
import { z } from "zod";

export const SetlistTuneItemSchema = z.object({
  id: z.string().default(() => Math.random().toString(36).substring(2, 9)),
  songId: z.string().default(""),
  tuneId: z.string().default(""), // backward-compat with tuneId
  title: z.string().default("Untitled Chart"),
  artist: z.string().default(""),
  keySignature: z.string().default("Bb"),
  tempoBpm: z.number().default(120),
  notes: z.string().default(""),
  customNotes: z.string().default(""), // backward-compat with customNotes
  driveLink: z.string().default(""),
  transitionType: z.enum(["standard_pause", "direct_segue", "drum_roll", "vamp"]).default("standard_pause"),
});

export const SetlistItemSchema = SetlistTuneItemSchema;

export type SetlistItem = z.infer<typeof SetlistItemSchema>;
export type SetlistTuneItem = z.infer<typeof SetlistTuneItemSchema>;

export const SetlistCategoryEnum = z.enum([
  "parade",
  "festival",
  "street_revelry",
  "ceremony",
  "concert",
  "custom",
]);
export type SetlistCategory = z.infer<typeof SetlistCategoryEnum>;

export const SetlistSchema = z.object({
  id: z.string(),
  name: z.string().default("Untitled Setlist"),
  title: z.string().default(""), // backward-compat with title
  description: z.string().default(""),
  category: SetlistCategoryEnum.default("parade"),
  tunes: z.array(SetlistTuneItemSchema).default([]),
  items: z.array(SetlistTuneItemSchema).default([]), // backward-compat with items
  targetDurationMinutes: z.number().default(45),
  tags: z.array(z.string()).default([]),
  assignedGigIds: z.array(z.string()).default([]),
  usageCount: z.number().default(0),
  lastUsedDate: z.string().nullable().default(null),
  isTemplate: z.boolean().default(true),
  templateId: z.string().optional(),
  templateName: z.string().optional(),
  gigId: z.string().default(""),
  createdByUid: z.string().default(""),
  createdByName: z.string().default(""),
  createdAt: z.string().default(() => new Date().toISOString()),
  updatedAt: z.string().default(() => new Date().toISOString()),
});

export type Setlist = z.infer<typeof SetlistSchema>;

/**
 * Helper to identify whether a Firestore document in the "setlists" collection
 * represents a master reusable setlist template vs. a gig-specific live stage document.
 * Gig stage documents have a non-empty gigId or start with "gig_" and must not be loaded
 * as reusable templates to prevent duplication in selection pickers.
 */
export function isReusableSetlistTemplate(
  id: string,
  data?: Record<string, unknown> | null
): boolean {
  if (!data) return false;
  if (data.isTemplate === false) return false;
  if (typeof data.gigId === "string" && data.gigId.trim().length > 0) return false;
  if (id.startsWith("gig_") || id.startsWith("gig-")) return false;
  const name = typeof data.name === "string" ? data.name.trim() : "";
  const title = typeof data.title === "string" ? data.title.trim() : "";
  if (!name && !title) return false;
  return true;
}

/**
 * Checks whether a setlist title is already in use by another reusable template (case-insensitive).
 */
export function isDuplicateSetlistTitle(
  title: string,
  existingSetlists: { id: string; name?: string; title?: string }[],
  excludeId?: string
): boolean {
  const normalized = title.trim().toLowerCase();
  if (!normalized) return false;
  return existingSetlists.some((s) => {
    if (excludeId && s.id === excludeId) return false;
    const existingName = (s.name || s.title || "").trim().toLowerCase();
    return existingName === normalized;
  });
}


