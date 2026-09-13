// src/lib/schema/testimonial.ts
import { z } from "zod";

export const TestimonialStatusEnum = z.enum([
  "pending",
  "approved",
  "featured",
  "rejected",
]);

export const TestimonialSchema = z.object({
  id: z.string().default(""),
  authorName: z.string().default(""),
  roleOrEvent: z.string().default(""), // e.g. "Parade Coordinator", "Festival Organizer", "Fan"
  organization: z.string().default(""),
  email: z.string().default(""),
  quote: z.string().default(""),
  rating: z.number().min(1).max(5).default(5),
  eventDate: z.string().default(""), // YYYY-MM-DD or descriptive date
  avatarUrl: z.string().default(""),
  tag: z.string().default("Community Event"), // e.g. "Parade", "Festival", "Wedding", "Fan"
  permissionToPublish: z.boolean().default(true),
  status: TestimonialStatusEnum.default("pending"),
  notes: z.string().default(""), // internal reviewer notes
  schemaVersion: z.number().default(1),
  createdAt: z.string().default(() => new Date().toISOString()),
  updatedAt: z.string().default(() => new Date().toISOString()),
});

export type Testimonial = z.infer<typeof TestimonialSchema>;
export type TestimonialStatus = z.infer<typeof TestimonialStatusEnum>;

export const TestimonialInputSchema = z.object({
  authorName: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name cannot exceed 100 characters"),
  roleOrEvent: z
    .string()
    .trim()
    .max(120, "Role or event title cannot exceed 120 characters")
    .default(""),
  organization: z
    .string()
    .trim()
    .max(120, "Organization cannot exceed 120 characters")
    .default(""),
  email: z
    .string()
    .trim()
    .email("Please enter a valid email address"),
  quote: z
    .string()
    .trim()
    .min(10, "Testimonial quote must be at least 10 characters")
    .max(1200, "Testimonial quote cannot exceed 1200 characters"),
  rating: z
    .number()
    .min(1, "Please provide a rating between 1 and 5")
    .max(5, "Rating cannot exceed 5"),
  eventDate: z
    .string()
    .trim()
    .max(50, "Date string cannot exceed 50 characters")
    .default(""),
  tag: z
    .string()
    .trim()
    .max(50, "Tag cannot exceed 50 characters")
    .default("Community Event"),
  permissionToPublish: z
    .boolean()
    .refine((val) => val === true, {
      message: "You must grant permission to publish this testimonial",
    }),
});

export type TestimonialInput = z.infer<typeof TestimonialInputSchema>;

