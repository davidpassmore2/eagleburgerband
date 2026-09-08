// src/lib/schema/tune.ts
import { z } from "zod";

export const TuneLifecycleEnum = z.enum([
  "concept",
  "in_rehearsal",
  "active_rotation",
  "archived",
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
  originalArtist: z.string().default(""),
  arranger: z.string().default(""),
  key: z.string().default(""),
  tempoBpm: z.number().default(120),
  timeSignature: z.string().default("4/4"),
  durationSeconds: z.number().default(180),
  lifecycleStatus: TuneLifecycleEnum.default("active_rotation"),
  notes: z.string().default(""),
  chartAttachments: z.array(ChartAttachmentSchema).default([]),
  audioReferenceUrl: z.string().default(""),
  createdAt: z.string().default(() => new Date().toISOString()),
  updatedAt: z.string().default(() => new Date().toISOString()),
});

export type Tune = z.infer<typeof TuneSchema>;
export type ChartAttachment = z.infer<typeof ChartAttachmentSchema>;