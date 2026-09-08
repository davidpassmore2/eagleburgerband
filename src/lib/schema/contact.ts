import { z } from "zod";

export const ContactMetricsSchema = z.object({
  gigsOffered: z.number().default(0),
  gigsAccepted: z.number().default(0),
  totalCompensation: z.number().default(0),
});

export const ContactSchema = z.object({
  id: z.string().default(""),
  schemaVersion: z.number().default(1),
  name: z.string().min(1, "Contact name is required"),
  organization: z.string().optional().default(""),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional().default(""),
  notes: z.string().optional().default(""),
  totalGigsBooked: z.number().optional().default(0),
  metrics: ContactMetricsSchema.optional().default({
    gigsOffered: 0,
    gigsAccepted: 0,
    totalCompensation: 0,
  }),
  metadata: z.record(z.string(), z.any()).optional().default({}),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export type Contact = z.infer<typeof ContactSchema>;
export type ContactMetrics = z.infer<typeof ContactMetricsSchema>;