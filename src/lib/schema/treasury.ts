import { z } from "zod";

export const TreasuryConfigSchema = z.object({
  startingBalance: z.number().default(0),
  startingDate: z.string().default(() => new Date().toISOString().split("T")[0]),
  lastUpdated: z.string().default(() => new Date().toISOString()),
  notes: z.string().default("Band Treasury Starting Balance"),
  schemaVersion: z.number().default(1),
});

export type TreasuryConfig = z.infer<typeof TreasuryConfigSchema>;

