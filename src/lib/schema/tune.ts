import { z } from "zod";

export const TunePhaseEnum = z.enum([
  "proposed",
  "in_development",
  "in_catalog",
  "retired",
]);

export const TuneSchema = z.object({
  schemaVersion: z.number().default(1),
  id: z.string(),
  title: z.string().min(1),
  composer: z.string().default(""),
  arranger: z.string().default(""),
  key: z.string().default(""),
  tempoBpm: z.number().default(120),
  phase: TunePhaseEnum.default("proposed"),
  pitchNotes: z.string().default(""),
  submittedByUid: z.string(),
  submittedByName: z.string(),
  driveLinks: z
    .object({
      folderUrl: z.string().default(""),
      leadSheetUrl: z.string().default(""),
      partsFolderUrl: z.string().default(""),
    })
    .default({ folderUrl: "", leadSheetUrl: "", partsFolderUrl: "" }),
  referenceAudioUrl: z.string().default(""),
  metrics: z
    .object({
      averageRating: z.number().default(0),
      ratingCount: z.number().default(0),
      commentCount: z.number().default(0),
      setlistCount: z.number().default(0),
      lastPerformedDate: z.string().nullable().default(null),
    })
    .default({ averageRating: 0, ratingCount: 0, commentCount: 0, setlistCount: 0, lastPerformedDate: null }),
  metadata: z.record(z.string(), z.any()).optional().default({}),
  createdAt: z.string().default(() => new Date().toISOString()),
  updatedAt: z.string().default(() => new Date().toISOString()),
});

export type Tune = z.infer<typeof TuneSchema>;