import { z } from "zod";

export const AuthProvidersConfigSchema = z.object({
  google: z.boolean().default(true),
  apple: z.boolean().default(false),
  microsoft: z.boolean().default(false),
  github: z.boolean().default(false),
  magicLink: z.boolean().default(true),
  password: z.boolean().default(true),
  updatedAt: z.string().default(() => new Date().toISOString()),
  updatedBy: z.string().default("system"),
});

export type AuthProvidersConfig = z.infer<typeof AuthProvidersConfigSchema>;

export const DEFAULT_AUTH_PROVIDERS_CONFIG: AuthProvidersConfig = {
  google: true,
  apple: false,
  microsoft: false,
  github: false,
  magicLink: true,
  password: true,
  updatedAt: new Date().toISOString(),
  updatedBy: "system",
};

