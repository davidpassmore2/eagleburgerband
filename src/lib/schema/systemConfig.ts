import { z } from "zod";
import { 
  CloudinaryConfigSchema, 
  SystemIntegrationsConfigSchema,
  DEFAULT_CLOUDINARY_CONFIG,
  DEFAULT_MIGRATION_CHECKLIST,
  type CloudinaryConfig,
  type SystemIntegrationsConfig,
} from "./integrationConfig";

export { 
  CloudinaryConfigSchema, 
  SystemIntegrationsConfigSchema,
  DEFAULT_CLOUDINARY_CONFIG,
  DEFAULT_MIGRATION_CHECKLIST,
  type CloudinaryConfig,
  type SystemIntegrationsConfig,
};

/**
 * Zod Schema for the `system_config` collection root docs in Cloud Firestore.
 * Supports:
 * - doc(db, "system_config", "cloudinary") -> CloudinaryConfigSchema
 * - doc(db, "system_config", "integrations") -> SystemIntegrationsConfigSchema
 */
export const SystemConfigDocumentSchema = z.union([
  CloudinaryConfigSchema,
  SystemIntegrationsConfigSchema,
]);

export type SystemConfigDocument = z.infer<typeof SystemConfigDocumentSchema>;

