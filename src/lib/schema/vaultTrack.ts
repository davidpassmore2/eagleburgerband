import { z } from "zod";

export const VaultTrackTypeEnum = z.enum([
  "full_mix",
  "brass_stem",
  "drum_line",
  "reference_recording",
]);
export type VaultTrackType = z.infer<typeof VaultTrackTypeEnum>;

export const VaultTrackSchema = z.object({
  id: z.string(),
  songTitle: z.string().default(""),
  title: z.string().default(""),
  trackType: VaultTrackTypeEnum.default("full_mix"),
  audioUrl: z.string().default(""),
  tempoBpm: z.number().default(120),
  sectionTags: z.array(z.string()).default(["All"]),
  notes: z.string().default(""),
  uploadedAt: z.string().default(""),
});

export type VaultTrack = z.infer<typeof VaultTrackSchema>;

