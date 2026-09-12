import { z } from "zod";

export const ReimbursementStatusEnum = z.enum([
  "submitted",
  "approved",
  "rejected",
  "paid",
]);

export const ExpenseCategoryEnum = z.enum([
  "gear_repairs",
  "travel_fuel",
  "food_beverage",
  "rehearsal_space",
  "merchandise",
  "admin_software",
  "sheet_music",
  "uniforms_attire",
  "other",
]);

export const PayoutMethodEnum = z.enum([
  "venmo",
  "paypal",
  "zelle",
  "check",
  "other",
]);

export const ReimbursementSchema = z.object({
  id: z.string(),
  applicantUid: z.string(),
  applicantName: z.string().default("Musician"),
  applicantEmail: z.string().default(""),
  applicantSectionId: z.string().nullable().default(null),
  amount: z.number().positive(),
  description: z.string().min(1),
  category: ExpenseCategoryEnum.default("other"),
  expenseDate: z.string().default(() => new Date().toISOString().split("T")[0]),
  gigId: z.string().nullable().default(null),
  gigTitle: z.string().nullable().default(null),
  receiptUrl: z.string().default(""),
  receiptNote: z.string().default(""),
  paymentMethod: PayoutMethodEnum.default("venmo"),
  paymentHandle: z.string().default(""),
  status: ReimbursementStatusEnum.default("submitted"),
  reviewNotes: z.string().default(""),
  reviewedByUid: z.string().nullable().default(null),
  reviewedByName: z.string().nullable().default(null),
  reviewedAt: z.string().nullable().default(null),
  paidAt: z.string().nullable().default(null),
  transactionId: z.string().nullable().default(null),
  payoutReference: z.string().default(""),
  schemaVersion: z.number().default(1),
  createdAt: z.string().default(() => new Date().toISOString()),
  updatedAt: z.string().default(() => new Date().toISOString()),
});

export type Reimbursement = z.infer<typeof ReimbursementSchema>;
export type ReimbursementStatus = z.infer<typeof ReimbursementStatusEnum>;
export type ExpenseCategory = z.infer<typeof ExpenseCategoryEnum>;
export type PayoutMethod = z.infer<typeof PayoutMethodEnum>;

