// src/lib/schema/tune.ts
import { z } from "zod";

export const TuneLifecycleEnum = z.enum([
  "concept",
  "in_rehearsal",
  "active_rotation",
  "in_repertoire",
  "archived",
]);

export const TuneStatusEnum = z.enum([
  "active",
  "in_repertoire",
  "in_rehearsal",
  "archived",
  "review",
]);

export const ChartAttachmentSchema = z.object({
  sectionId: z.string(),
  partName: z.string(),
  fileUrl: z.string(),
  key: z.string().default(""),
});

export const TuneSchema = z.object({
  id: z.string(),
  title: z.string().min(1, "Title is required"),
  artist: z.string().default(""),
  originalArtist: z.string().default(""),
  arranger: z.string().default(""),
  key: z.string().default(""),
  keySignature: z.string().default(""),
  tempoBpm: z.number().default(120),
  tempo: z.string().default(""),
  meter: z.string().default("4/4"),
  timeSignature: z.string().default("4/4"),
  durationSeconds: z.number().default(180),
  lifecycleStatus: TuneLifecycleEnum.default("active_rotation"),
  status: TuneStatusEnum.default("active"),
  notes: z.string().default(""),
  driveLink: z.string().default(""),
  audioSampleUrl: z.string().default(""),
  audioReferenceUrl: z.string().default(""),
  chartContactUid: z.string().default(""),
  chartContactName: z.string().default(""),
  tags: z.array(z.string()).default([]),
  chartAttachments: z.array(ChartAttachmentSchema).default([]),
  upvoteUids: z.array(z.string()).default([]),
  downvoteUids: z.array(z.string()).default([]),
  ratings: z.record(z.string(), z.number().min(1).max(5)).default({}),
  ratingAverage: z.number().default(0),
  ratingCount: z.number().default(0),
  createdAt: z.string().default(() => new Date().toISOString()),
  updatedAt: z.string().default(() => new Date().toISOString()),
});

export type Tune = z.infer<typeof TuneSchema>;
export type TuneStatus = z.infer<typeof TuneStatusEnum>;
export type ChartAttachment = z.infer<typeof ChartAttachmentSchema>;

/**
 * Calculates average rating (1-5 stars) and count from member votes.
 */
export function calculateTuneScore(ratings: Record<string, number> = {}): {
  average: number;
  count: number;
} {
  const values = Object.values(ratings).filter(
    (v) => typeof v === "number" && v >= 1 && v <= 5
  );
  if (values.length === 0) {
    return { average: 0, count: 0 };
  }
  const sum = values.reduce((acc, curr) => acc + curr, 0);
  const average = Math.round((sum / values.length) * 10) / 10;
  return { average, count: values.length };
}