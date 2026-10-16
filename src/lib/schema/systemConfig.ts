import { z } from "zod";
import { 
  CloudinaryConfigSchema, 
  SystemIntegrationsConfigSchema,
  DEFAULT_CLOUDINARY_CONFIG,
  DEFAULT_MIGRATION_CHECKLIST,
  type CloudinaryConfig,
  type SystemIntegrationsConfig,
} from "./integrationConfig";
import {
  AuthProvidersConfigSchema,
  DEFAULT_AUTH_PROVIDERS_CONFIG,
  type AuthProvidersConfig,
} from "./authProvidersConfig";

export { 
  CloudinaryConfigSchema, 
  SystemIntegrationsConfigSchema,
  AuthProvidersConfigSchema,
  DEFAULT_CLOUDINARY_CONFIG,
  DEFAULT_MIGRATION_CHECKLIST,
  DEFAULT_AUTH_PROVIDERS_CONFIG,
  type CloudinaryConfig,
  type SystemIntegrationsConfig,
  type AuthProvidersConfig,
};

/**
 * Zod Schema for the `system_config` collection root docs in Cloud Firestore.
 * Supports:
 * - doc(db, "system_config", "cloudinary") -> CloudinaryConfigSchema
 * - doc(db, "system_config", "integrations") -> SystemIntegrationsConfigSchema
 * - doc(db, "system_config", "auth_providers") -> AuthProvidersConfigSchema
 */
export const SystemConfigDocumentSchema = z.union([
  CloudinaryConfigSchema,
  SystemIntegrationsConfigSchema,
  AuthProvidersConfigSchema,
]);

export type SystemConfigDocument = z.infer<typeof SystemConfigDocumentSchema>;

