import { z } from "zod";

export const GigStatusEnum = z.enum([
  "lead",
  "tentative",
  "confirmed",
  "completed",
  "cancelled",
  "archived",
]);

export const GigCompensationTypeEnum = z.enum([
  "community",   // No band fund intake, volunteer / community civic performance
  "band_fund",   // 100% of gig intake goes directly to band fund ($0 member payout)
  "individual",  // Intake divided among participating members
]);
export type GigCompensationType = z.infer<typeof GigCompensationTypeEnum>;

export const PublicDetailsSchema = z.object({
  title: z.string().default(""),
  venue: z.string().default(""),
  address: z.string().default(""),
  venueAddress: z.string().default(""),
  coordinates: z
    .object({
      lat: z.number().default(40.4406),
      lng: z.number().default(-79.9959),
    })
    .default(() => ({ lat: 40.4406, lng: -79.9959 })),
  city: z.string().default("Pittsburgh, PA"),
  description: z.string().default(""),
  admission: z.string().default("Free"),
  facebookEventUrl: z.string().default(""),
  ticketUrl: z.string().default(""),
  isPublic: z.boolean().default(true),
  showExternalDirections: z.boolean().default(true),
});

export const InternalLogisticsSchema = z.object({
  title: z.string().default(""),
  callTime: z.string().default("18:00"),
  downbeat: z.string().default("19:00"),
  unloadingAddress: z.string().default(""),
  parkingInstructions: z.string().default(""),
  parkingNotes: z.string().default(""),
  attire: z.string().default(""),
  payPerMusician: z.number().default(0),
  compensation: z.number().default(0),
  compensationType: GigCompensationTypeEnum.default("community"),
  setlistId: z.string().default(""),
  setlistName: z.string().default(""),
  setlistTitle: z.string().default(""),
  description: z.string().default(""),
});

export const PerformerPayoutRecordSchema = z.object({
  uid: z.string(),
  displayName: z.string().default("Musician"),
  amount: z.number().default(0),
  paymentStatus: z.enum(["unpaid", "paid"]).default("unpaid"),
  paymentMethod: z.enum(["venmo", "cash", "bank_transfer", "other"]).default("venmo"),
  paidAt: z.string().nullable().default(null),
});
export type PerformerPayoutRecord = z.infer<typeof PerformerPayoutRecordSchema>;

export const GigFinancialsSchema = z.object({
  totalFee: z.number().default(0),
  compensationType: GigCompensationTypeEnum.default("community"),
  settlementType: z.enum([
    "community",
    "band_fund",
    "individual",
    "equal_split",
    "fixed_guarantee"
  ]).default("community"),
  bandFundCut: z.number().default(0),
  fixedPerformerAmount: z.number().default(0),
  payouts: z.record(z.string(), PerformerPayoutRecordSchema).default({}),
  notes: z.string().default(""),
});
export type GigFinancials = z.infer<typeof GigFinancialsSchema>;

export const GigSchema = z.object({
  id: z.string(),
  date: z.string(),
  status: GigStatusEnum.default("confirmed"),
  setlistId: z.string().default(""),
  setlistName: z.string().default(""),
  setlistTitle: z.string().default(""),
  publicDetails: PublicDetailsSchema.default(() => ({
    title: "",
    venue: "",
    address: "",
    venueAddress: "",
    coordinates: { lat: 40.4406, lng: -79.9959 },
    city: "Pittsburgh, PA",
    description: "",
    admission: "Free",
    facebookEventUrl: "",
    ticketUrl: "",
    isPublic: true,
    showExternalDirections: true,
  })),
  internalLogistics: InternalLogisticsSchema.default(() => ({
    title: "",
    callTime: "18:00",
    downbeat: "19:00",
    unloadingAddress: "",
    parkingInstructions: "",
    parkingNotes: "",
    attire: "",
    payPerMusician: 0,
    compensation: 0,
    compensationType: "community" as const,
    setlistId: "",
    setlistName: "",
    setlistTitle: "",
    description: "",
  })),
  financials: GigFinancialsSchema.default(() => ({
    totalFee: 0,
    compensationType: "community" as const,
    settlementType: "community" as const,
    bandFundCut: 0,
    fixedPerformerAmount: 0,
    payouts: {},
    notes: "",
  })),
  schemaVersion: z.number().default(1),
  createdAt: z.string().default(() => new Date().toISOString()),
  updatedAt: z.string().default(() => new Date().toISOString()),
});

export type Gig = z.infer<typeof GigSchema>;