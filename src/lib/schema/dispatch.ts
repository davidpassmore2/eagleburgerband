import { z } from "zod";

export const DispatchSchema = z.object({
  id: z.string().optional(),
  gigId: z.string(),
  sentAt: z.string().default(""),
  sentByName: z.string().default("Band Manager"),
  subject: z.string().default(""),
  uniformBrief: z.string().default(""),
  callTimeBrief: z.string().default(""),
  logisticsBrief: z.string().default(""),
  recipientCount: z.number().default(0),
});

export type DispatchRecord = z.infer<typeof DispatchSchema>;

