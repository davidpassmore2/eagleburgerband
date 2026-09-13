// src/lib/schema/generalInquiry.ts
import { z } from "zod";

export const GeneralInquiryCategoryEnum = z.enum([
  "general",
  "press",
  "community",
  "merch",
  "other",
]);

export const GeneralInquiryStatusEnum = z.enum([
  "new",
  "in_progress",
  "resolved",
  "archived",
]);

export const GeneralInquirySchema = z.object({
  id: z.string().default(""),
  name: z.string().default(""),
  email: z.string().default(""),
  phone: z.string().default(""),
  category: GeneralInquiryCategoryEnum.default("general"),
  subject: z.string().default(""),
  message: z.string().default(""),
  status: GeneralInquiryStatusEnum.default("new"),
  assignedToUid: z.string().default(""),
  internalNotes: z.string().default(""),
  schemaVersion: z.number().default(1),
  createdAt: z.string().default(() => new Date().toISOString()),
  updatedAt: z.string().default(() => new Date().toISOString()),
});

export type GeneralInquiry = z.infer<typeof GeneralInquirySchema>;
export type GeneralInquiryCategory = z.infer<typeof GeneralInquiryCategoryEnum>;
export type GeneralInquiryStatus = z.infer<typeof GeneralInquiryStatusEnum>;

export const GeneralInquiryInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Full name must be at least 2 characters")
    .max(100, "Full name cannot exceed 100 characters"),
  email: z
    .string()
    .trim()
    .email("Please enter a valid email address"),
  phone: z
    .string()
    .trim()
    .max(25, "Phone number cannot exceed 25 characters")
    .optional()
    .default(""),
  category: GeneralInquiryCategoryEnum.default("general"),
  subject: z
    .string()
    .trim()
    .min(3, "Subject must be at least 3 characters")
    .max(150, "Subject cannot exceed 150 characters"),
  message: z
    .string()
    .trim()
    .min(10, "Message must be at least 10 characters")
    .max(2000, "Message cannot exceed 2000 characters"),
});

export type GeneralInquiryInput = z.infer<typeof GeneralInquiryInputSchema>;

