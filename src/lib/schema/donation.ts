import { z } from "zod";

export const DonationCategoryEnum = z.enum([
  "arts_music",
  "community_aid",
  "youth_education",
  "hunger_relief",
  "environment",
  "other",
]);

export type DonationCategory = z.infer<typeof DonationCategoryEnum>;

export const DonationSchema = z.object({
  id: z.string().default(() => crypto.randomUUID()),
  organizationName: z.string().min(1, "Organization name is required"),
  causeDescription: z.string().default(""),
  websiteUrl: z.string().default(""),
  category: DonationCategoryEnum.default("community_aid"),
  amount: z.number().default(0), // Internal only: excluded from public views
  dateDonated: z.string().default(() => new Date().toISOString().split("T")[0]),
  fiscalYear: z.string().default("2026"),
  isPublic: z.boolean().default(true),
  publicImpactNote: z.string().default(""),
  notes: z.string().default(""), // Internal notes / check references
  createdAt: z.string().default(() => new Date().toISOString()),
  updatedAt: z.string().default(() => new Date().toISOString()),
});

export type Donation = z.infer<typeof DonationSchema>;

// Public Beneficiary presentation type (strictly omits internal amount and notes)
export const PublicBeneficiarySchema = DonationSchema.omit({
  amount: true,
  notes: true,
});

export type PublicBeneficiary = z.infer<typeof PublicBeneficiarySchema>;

