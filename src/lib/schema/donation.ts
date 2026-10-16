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

export const DonationStatusEnum = z.enum([
  "suggested",
  "approved",
  "completed",
  "archived",
]);

export type DonationStatus = z.infer<typeof DonationStatusEnum>;

export const DonationSchema = z.object({
  id: z.string().default(() => crypto.randomUUID()),
  organizationName: z.string().min(1, "Organization name is required"),
  causeDescription: z.string().default(""),
  websiteUrl: z.string().default(""),
  category: DonationCategoryEnum.default("community_aid"),
  amount: z.number().default(0), // Internal only: excluded from public views
  targetAmount: z.number().default(0), // Suggested donation target
  dateDonated: z.string().default(() => new Date().toISOString().split("T")[0]),
  fiscalYear: z.string().default("2026"),
  status: DonationStatusEnum.default("completed"),
  isPublic: z.boolean().default(true),
  publicImpactNote: z.string().default(""),
  notes: z.string().default(""), // Internal notes / check references
  suggestedByUid: z.string().nullable().default(null),
  suggestedByName: z.string().default(""),
  submittedByUid: z.string().nullable().default(null),
  submittedByName: z.string().default(""),
  submittedOnBehalf: z.boolean().default(false),
  rationale: z.string().default(""),
  reviewedByUid: z.string().nullable().default(null),
  reviewedByName: z.string().nullable().default(null),
  reviewedAt: z.string().nullable().default(null),
  createdAt: z.string().default(() => new Date().toISOString()),
  updatedAt: z.string().default(() => new Date().toISOString()),
});

export type Donation = z.infer<typeof DonationSchema>;

// Public Beneficiary presentation type (strictly omits internal amounts, review, and member attribution fields)
export const PublicBeneficiarySchema = DonationSchema.omit({
  amount: true,
  notes: true,
  targetAmount: true,
  status: true,
  suggestedByUid: true,
  suggestedByName: true,
  submittedByUid: true,
  submittedByName: true,
  submittedOnBehalf: true,
  rationale: true,
  reviewedByUid: true,
  reviewedByName: true,
  reviewedAt: true,
});

export type PublicBeneficiary = z.infer<typeof PublicBeneficiarySchema>;

