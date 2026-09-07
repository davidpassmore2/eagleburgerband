import { z } from "zod";

export const GigSchema = z.object({
  schemaVersion: z.number().default(1),
  id: z.string(),
  status: z.enum(["draft", "confirmed", "cancelled"]).default("draft"),
  isPubliclyVisible: z.boolean().default(false),
  origin: z.enum(["direct_entry", "inquiry_conversion"]).default("direct_entry"),
  originInquiryId: z.string().nullable().default(null),
  contactId: z.string().nullable().default(null),
  date: z.string(), // YYYY-MM-DD

  publicDetails: z
    .object({
      title: z.string().min(1),
      venue: z.string().default(""),
      venueAddress: z.string().default(""),
      city: z.string().default("Pittsburgh, PA"),
      startTime: z.string().default(""),
      endTime: z.string().default(""),
      ticketUrl: z.string().nullable().default(null),
      externalAlbumUrl: z.string().nullable().default(null),
      description: z.string().default(""),
    })
    .passthrough(),

  internalLogistics: z
    .object({
      title: z.string().default(""),
      callTime: z.string().default(""),
      downbeat: z.string().default(""),
      attire: z.string().default(""),
      unloadingAddress: z.string().default(""),
      parkingNotes: z.string().default(""),
      compensation: z.number().default(0),
      paymentType: z.enum(["band_fund", "split", "volunteer"]).default("band_fund"),
      setlistId: z.string().nullable().default(null),
      description: z.string().default(""),
    })
    .passthrough(),

  rsvpSummary: z
    .object({
      attendingCount: z.number().default(0),
      declinedCount: z.number().default(0),
    })
    .default({ attendingCount: 0, declinedCount: 0 }),

  metadata: z.record(z.string(), z.any()).optional().default({}),
  createdAt: z.string().default(() => new Date().toISOString()),
  updatedAt: z.string().default(() => new Date().toISOString()),
});

export type Gig = z.infer<typeof GigSchema>;