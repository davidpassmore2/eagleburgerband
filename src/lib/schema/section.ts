import { z } from "zod";

export const SectionSchema = z.object({
  schemaVersion: z.number().default(1),
  id: z.string(),
  name: z.string().min(1),
  description: z.string().default(""),
  instruments: z.array(z.string()).default([]),
  leaderUids: z.array(z.string()).default([]),
  memberUids: z.array(z.string()).default([]),
  order: z.number().default(0),
  metadata: z.record(z.string(), z.any()).optional().default({}),
  createdAt: z.string().default(() => new Date().toISOString()),
  updatedAt: z.string().default(() => new Date().toISOString()),
});

export type Section = z.infer<typeof SectionSchema>;