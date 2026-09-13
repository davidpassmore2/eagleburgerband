import { z } from "zod";

export const TransactionTypeEnum = z.enum(["income", "expense", "payout"]);

export const ExpenseCategoryEnum = z.enum([
  "food_beverage",
  "travel_fuel",
  "gear_repairs",
  "rehearsal_space",
  "merchandise",
  "admin_software",
  "sheet_music",
  "uniforms_attire",
  "charitable_giving",
  "other",
]);

export const IncomeCategoryEnum = z.enum([
  "gig_fee",
  "merch_sales",
  "tips_donations",
  "sponsorship",
  "other",
]);

export const TransactionCategoryEnum = z.enum([
  "food_beverage",
  "travel_fuel",
  "gear_repairs",
  "rehearsal_space",
  "merchandise",
  "admin_software",
  "sheet_music",
  "uniforms_attire",
  "charitable_giving",
  "gig_fee",
  "merch_sales",
  "tips_donations",
  "sponsorship",
  "musician_payout",
  "other",
]);

export const TransactionSchema = z.object({
  id: z.string(),
  type: TransactionTypeEnum.default("expense"),
  category: TransactionCategoryEnum.default("other"),
  amount: z.number().nonnegative().default(0),
  description: z.string().default(""),
  date: z.string().default(() => new Date().toISOString().split("T")[0]),
  gigId: z.string().nullable().default(null),
  gigTitle: z.string().nullable().default(null),
  recordedBy: z.string().default("Treasurer"),
  notes: z.string().nullable().default(null),
  schemaVersion: z.number().default(1),
  createdAt: z.string().default(() => new Date().toISOString()),
});

export type Transaction = z.infer<typeof TransactionSchema>;
export type TransactionType = z.infer<typeof TransactionTypeEnum>;
export type ExpenseCategory = z.infer<typeof ExpenseCategoryEnum>;
export type IncomeCategory = z.infer<typeof IncomeCategoryEnum>;
export type TransactionCategory = z.infer<typeof TransactionCategoryEnum>;

