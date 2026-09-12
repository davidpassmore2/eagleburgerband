import { z } from "zod";

export const LeadStatusEnum = z.enum([
  "new",
  "reviewing",
  "contacted",
  "quoted",
  "converted",
  "declined",
]);

export const LeadSchema = z.object({
  id: z.string().default(""),
  clientName: z.string().default(""),
  organization: z.string().default(""),
  email: z.string().default(""),
  phone: z.string().default(""),
  eventTitle: z.string().default(""),
  eventType: z.string().default("Community Parade & Festival"),
  date: z.string().default(""),
  startTime: z.string().default(""),
  venue: z.string().default(""),
  venueAddress: z.string().default(""),
  budget: z.number().nullable().default(null),
  message: z.string().default(""),
  status: LeadStatusEnum.default("new"),
  notes: z.string().default(""),
  schemaVersion: z.number().default(1),
  createdAt: z.string().default(() => new Date().toISOString()),
  updatedAt: z.string().default(() => new Date().toISOString()),
});

export type Lead = z.infer<typeof LeadSchema>;
export type LeadStatus = z.infer<typeof LeadStatusEnum>;

export const BookingInputSchema = z.object({
  clientName: z
    .string()
    .trim()
    .min(2, "Full name must be at least 2 characters")
    .max(100, "Full name cannot exceed 100 characters"),
  organization: z
    .string()
    .trim()
    .max(120, "Organization name cannot exceed 120 characters")
    .default(""),
  email: z
    .string()
    .trim()
    .email("Please enter a valid email address (e.g. name@example.com)"),
  phone: z
    .string()
    .trim()
    .min(7, "Phone number must be at least 7 digits")
    .max(25, "Phone number cannot exceed 25 characters")
    .regex(
      /^[\d\s\-\+\(\)\.extEXT]+$/,
      "Please enter a valid phone number (digits, spaces, dashes, parentheses)"
    ),
  eventTitle: z
    .string()
    .trim()
    .min(2, "Event title must be at least 2 characters")
    .max(150, "Event title cannot exceed 150 characters"),
  eventType: z.string().min(1, "Please select an event format"),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Please select a valid event date (YYYY-MM-DD)")
    .refine((dateStr) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const selected = new Date(dateStr + "T00:00:00");
      return !isNaN(selected.getTime()) && selected >= today;
    }, "Event date cannot be in the past"),
  startTime: z
    .string()
    .trim()
    .max(50, "Start time string cannot exceed 50 characters")
    .default(""),
  venue: z
    .string()
    .trim()
    .min(2, "Venue or route name must be at least 2 characters")
    .max(200, "Venue name cannot exceed 200 characters"),
  venueAddress: z
    .string()
    .trim()
    .max(250, "Venue address cannot exceed 250 characters")
    .default(""),
  budget: z
    .union([
      z
        .number()
        .min(0, "Budget cannot be negative")
        .max(1000000, "Budget cannot exceed $1,000,000"),
      z.null(),
      z.undefined(),
    ])
    .optional(),
  message: z
    .string()
    .trim()
    .max(2000, "Notes cannot exceed 2,000 characters")
    .default(""),
});

export type BookingInput = z.infer<typeof BookingInputSchema>;

