import { z } from "zod";

export const GigStatusEnum = z.enum([
  "lead",
  "tentative",
  "confirmed",
  "completed",
  "cancelled",
  "archived",
]);

export const PublicDetailsSchema = z.object({
  title: z.string().default(""),
  venue: z.string().default(""),
  city: z.string().default("Pittsburgh, PA"),
  description: z.string().default(""),
  admission: z.string().default("Free"),
  facebookEventUrl: z.string().default(""),
  ticketUrl: z.string().default(""),
  isPublic: z.boolean().default(true),
});

export const InternalLogisticsSchema = z.object({
  title: z.string().default(""),
  callTime: z.string().default("18:00"),
  downbeat: z.string().default("19:00"),
  unloadingAddress: z.string().default(""),
  parkingInstructions: z.string().default(""),
  attire: z.string().default(""),
  payPerMusician: z.number().default(0),
  setlistId: z.string().default(""),
  description: z.string().default(""),
});

export const GigSchema = z.object({
  id: z.string(),
  date: z.string(),
  status: GigStatusEnum.default("confirmed"),
  publicDetails: PublicDetailsSchema.default(() => ({
    title: "",
    venue: "",
    city: "Pittsburgh, PA",
    description: "",
    admission: "Free",
    facebookEventUrl: "",
    ticketUrl: "",
    isPublic: true,
  })),
  internalLogistics: InternalLogisticsSchema.default(() => ({
    title: "",
    callTime: "18:00",
    downbeat: "19:00",
    unloadingAddress: "",
    parkingInstructions: "",
    attire: "",
    payPerMusician: 0,
    setlistId: "",
    description: "",
  })),
  schemaVersion: z.number().default(1),
  createdAt: z.string().default(() => new Date().toISOString()),
  updatedAt: z.string().default(() => new Date().toISOString()),
});

export type Gig = z.infer<typeof GigSchema>;