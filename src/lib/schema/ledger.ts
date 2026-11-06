import { z } from "zod";

export const DistributionRecordSchema = z.object({
  uid: z.string().default(""),
  amount: z.number().default(0),
  paidStatus: z.enum(["unpaid", "paid", "cash", "venmo", "check"]).default("unpaid"),
  paidAt: z.string().nullable().default(null),
});
export type DistributionRecord = z.infer<typeof DistributionRecordSchema>;

export const GigLedgerSchema = z.object({
  id: z.string().default(""),
  gigId: z.string().default(""),
  gigTitle: z.string().default(""),
  date: z.string().default(""),
  totalPool: z.number().default(0),
  distributions: z.array(DistributionRecordSchema).default([]),
  settlementModel: z.string().default("equal_split"),
  notes: z.string().default(""),
  createdAt: z.string().default(() => new Date().toISOString()),
  updatedAt: z.string().default(() => new Date().toISOString()),
});
export type GigLedger = z.infer<typeof GigLedgerSchema>;
