import { z } from "zod";

export const LeadStatusEnum = z.enum([
  "new",
  "reviewing",
  "contacted",
  "quoted",
  "converted",
  "declined",
]);

export const LeadSchema = z.object({
  id: z.string().default(""),
  clientName: z.string().default(""),
  organization: z.string().default(""),
  email: z.string().default(""),
  phone: z.string().default(""),
  eventTitle: z.string().default(""),
  eventType: z.string().default("Community Parade & Festival"),
  date: z.string().default(""),
  startTime: z.string().default(""),
  venue: z.string().default(""),
  venueAddress: z.string().default(""),
  budget: z.number().nullable().default(null),
  message: z.string().default(""),
  status: LeadStatusEnum.default("new"),
  notes: z.string().default(""),
  schemaVersion: z.number().default(1),
  createdAt: z.string().default(() => new Date().toISOString()),
  updatedAt: z.string().default(() => new Date().toISOString()),
});

export type Lead = z.infer<typeof LeadSchema>;
export type LeadStatus = z.infer<typeof LeadStatusEnum>;
