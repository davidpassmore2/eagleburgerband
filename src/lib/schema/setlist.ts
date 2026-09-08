// src/lib/schema/setlist.ts
import { z } from "zod";

export const SetlistItemSchema = z.object({
  tuneId: z.string(),
  customNotes: z.string().default(""),
  transitionType: z.enum(["standard_pause", "direct_segue", "drum_roll", "vamp"]).default("standard_pause"),
});

export const SetlistSchema = z.object({
  id: z.string(),
  title: z.string().min(1, "Setlist title required"),
  description: z.string().default(""),
  gigId: z.string().default(""),
  items: z.array(SetlistItemSchema).default([]),
  targetDurationMinutes: z.number().default(45),
  createdAt: z.string().default(() => new Date().toISOString()),
  updatedAt: z.string().default(() => new Date().toISOString()),
});

export type Setlist = z.infer<typeof SetlistSchema>;
export type SetlistItem = z.infer<typeof SetlistItemSchema>;