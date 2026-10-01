import { z } from "zod";

export const BlackoutDateSchema = z.object({
  id: z.string(),
  uid: z.string(),
  userName: z.string().default("Musician"),
  startDate: z.string(),
  endDate: z.string(),
  reason: z.string().default(""),
  createdAt: z.string().default(""),
});

export type BlackoutDate = z.infer<typeof BlackoutDateSchema>;

