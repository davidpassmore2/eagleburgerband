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
  dateDonated: z.string().default(() => new Date().toISOString().split("T")[0]), // Date gift was given/awarded
  dateSubmitted: z.string().default(() => new Date().toISOString().split("T")[0]), // Date gift was submitted/recorded
  fiscalYear: z.string().default("2026"),
  status: DonationStatusEnum.default("completed"),
  isPublic: z.boolean().default(true),
  showAmountPublicly: z.boolean().default(false),
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
  ratings: z.record(z.string(), z.number().min(1).max(10)).default({}),
  ratingAverage: z.number().default(0),
  ratingCount: z.number().default(0),
  giftsGivenCount: z.number().int().min(0).default(0),
  createdAt: z.string().default(() => new Date().toISOString()),
  updatedAt: z.string().default(() => new Date().toISOString()),
});

export type Donation = z.infer<typeof DonationSchema>;

/**
 * Calculates average priority score (1-10) and total vote count from member ratings.
 */
export function calculateDonationPriorityScore(ratings: Record<string, number> = {}): {
  average: number;
  count: number;
} {
  const values = Object.values(ratings).filter(
    (v) => typeof v === "number" && v >= 1 && v <= 10
  );
  if (values.length === 0) {
    return { average: 0, count: 0 };
  }
  const sum = values.reduce((acc, curr) => acc + curr, 0);
  const average = Math.round((sum / values.length) * 10) / 10;
  return { average, count: values.length };
}

// Public Beneficiary presentation type (strictly omits internal amounts, review, ratings, and member attribution fields)
export const PublicBeneficiarySchema = DonationSchema.omit({
  notes: true,
  publicImpactNote: true,
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
  ratings: true,
  ratingAverage: true,
  ratingCount: true,
});

export type PublicBeneficiary = z.infer<typeof PublicBeneficiarySchema>;

