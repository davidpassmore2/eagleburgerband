import { z } from "zod";

export const MigrationChecklistItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().default(""),
  category: z.enum(["firebase", "resend", "cloudinary", "webhooks", "vercel", "domain"]).default("firebase"),
  completed: z.boolean().default(false),
  completedAt: z.string().nullable().default(null),
  completedBy: z.string().nullable().default(null),
});

export type MigrationChecklistItem = z.infer<typeof MigrationChecklistItemSchema>;

export const DEFAULT_MIGRATION_CHECKLIST: MigrationChecklistItem[] = [
  {
    id: "firebase_prod_project",
    title: "Create Production Firebase Project",
    description: "Provision `eagleburger-band` in Google Cloud / Firebase Console with Web Client App and Authentication providers.",
    category: "firebase",
    completed: false,
    completedAt: null,
    completedBy: null,
  },
  {
    id: "firebase_prod_firestore",
    title: "Deploy Production Firestore & Security Rules",
    description: "Initialize Cloud Firestore in production region, deploy `firestore.rules`, and run seed scripts or migrate beta data.",
    category: "firebase",
    completed: false,
    completedAt: null,
    completedBy: null,
  },
  {
    id: "firebase_prod_admin_sdk",
    title: "Generate Production Service Account Key",
    description: "Download private key JSON for `FIREBASE_SERVICE_ACCOUNT_KEY` from Service Accounts console for privileged server actions.",
    category: "firebase",
    completed: false,
    completedAt: null,
    completedBy: null,
  },
  {
    id: "resend_prod_domain",
    title: "Verify Production Email Domain in Resend",
    description: "Add eagleburgerband.com to Resend, configure DNS records (MX, SPF, DKIM), and obtain production `RESEND_API_KEY`.",
    category: "resend",
    completed: false,
    completedAt: null,
    completedBy: null,
  },
  {
    id: "cloudinary_prod_preset",
    title: "Configure Production Cloudinary Preset",
    description: "Establish production Cloudinary unsigned preset or dedicated upload cloud for high-resolution public photo assets.",
    category: "cloudinary",
    completed: false,
    completedAt: null,
    completedBy: null,
  },
  {
    id: "webhooks_leadership_alerts",
    title: "Configure Leadership Webhook Endpoints",
    description: "Add `SLACK_WEBHOOK_URL` or `DISCORD_WEBHOOK_URL` for instant gig change dispatches to leadership channels.",
    category: "webhooks",
    completed: false,
    completedAt: null,
    completedBy: null,
  },
  {
    id: "vercel_prod_env",
    title: "Populate Vercel Production Environment Variables",
    description: "Configure all production keys in Vercel Project Settings > Environment Variables for the Production branch.",
    category: "vercel",
    completed: false,
    completedAt: null,
    completedBy: null,
  },
  {
    id: "custom_domain_ssl",
    title: "Finalize Custom Domain & SSL Cutover",
    description: "Map apex domain (eagleburgerband.com) to production hosting with valid SSL certificate and verified HTTPS redirect.",
    category: "domain",
    completed: false,
    completedAt: null,
    completedBy: null,
  },
];

export const CloudinaryConfigSchema = z.object({
  cloudName: z.string().default(""),
  uploadPreset: z.string().default(""),
  folder: z.string().default("eagleburgerband_media"),
  enabled: z.boolean().default(true),
  source: z.enum(["env", "firestore", "local", "unconfigured"]).default("unconfigured"),
  updatedAt: z.string().default(() => new Date().toISOString()),
  updatedBy: z.string().default("system"),
});

export type CloudinaryConfig = z.infer<typeof CloudinaryConfigSchema>;

export const DEFAULT_CLOUDINARY_CONFIG: CloudinaryConfig = {
  cloudName: "",
  uploadPreset: "",
  folder: "eagleburgerband_media",
  enabled: true,
  source: "unconfigured",
  updatedAt: new Date().toISOString(),
  updatedBy: "system",
};

export const SystemIntegrationsConfigSchema = z.object({
  schemaVersion: z.number().default(1),
  updatedAt: z.string().default(() => new Date().toISOString()),
  updatedBy: z.string().default("system"),
  notes: z.string().default(""),
  checklist: z.array(MigrationChecklistItemSchema).default(() => DEFAULT_MIGRATION_CHECKLIST),
  customWebhookUrl: z.string().default(""),
  cloudinary: CloudinaryConfigSchema.default(() => ({
    ...DEFAULT_CLOUDINARY_CONFIG,
    updatedAt: new Date().toISOString(),
  })),
});

export type SystemIntegrationsConfig = z.infer<typeof SystemIntegrationsConfigSchema>;

