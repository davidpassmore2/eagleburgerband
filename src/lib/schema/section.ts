import { z } from "zod";

export const SectionSchema = z.object({
  schemaVersion: z.number().default(1),
  id: z.string(),
  name: z.string().min(1),
  description: z.string().default(""),
  notes: z.string().default(""),
  instruments: z.array(z.string()).default([]),
  leaderUid: z.string().default(""),
  leaderName: z.string().default(""),
  leaderUids: z.array(z.string()).default([]),
  memberUids: z.array(z.string()).default([]),
  order: z.number().default(0),
  minRecommended: z.number().default(1),
  metadata: z.record(z.string(), z.any()).optional().default({}),
  createdAt: z.string().default(() => new Date().toISOString()),
  updatedAt: z.string().default(() => new Date().toISOString()),
});

export type Section = z.infer<typeof SectionSchema>;

export const DEFAULT_SECTION_INSTRUMENTS: Record<string, string[]> = {
  percussion: ["Snare Drum", "Bass Drum", "Cymbals", "Quad / Tenor Drums", "Auxiliary Percussion"],
  sousaphones: ["Sousaphone", "Tuba", "Helicon"],
  trombones: ["Tenor Trombone", "Bass Trombone", "Valve Trombone"],
  trumpets: ["Bb Trumpet", "Flugelhorn", "Piccolo Trumpet", "Cornet"],
  saxophones: ["Alto Saxophone", "Tenor Saxophone", "Baritone Saxophone", "Soprano Saxophone", "Clarinet"],
  auxiliary: ["Tambourine", "Cowbell", "Shaker", "Megaphone", "Banner"],
};