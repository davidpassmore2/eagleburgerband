import { z } from "zod";

export const PortalMetricTypeEnum = z.enum(["route_view", "interaction"]);
export type PortalMetricType = z.infer<typeof PortalMetricTypeEnum>;

export const PortalMetricEventSchema = z.object({
  id: z.string(),
  type: PortalMetricTypeEnum.default("route_view"),
  pathname: z.string().default(""),
  toolId: z.string().default(""),
  toolTitle: z.string().default(""),
  category: z.string().default("General"),
  action: z.string().default("view"),
  details: z.string().default(""),
  userId: z.string().default(""),
  userName: z.string().default("Anonymous Member"),
  userEmail: z.string().default(""),
  userRole: z.string().default("member"),
  timestamp: z.string().default(() => new Date().toISOString()),
  dateKey: z.string().default(() => new Date().toISOString().slice(0, 10)),
  metadata: z.record(z.string(), z.unknown()).default({}),
});

export type PortalMetricEvent = z.infer<typeof PortalMetricEventSchema>;

export const PortalMetricsConfigSchema = z.object({
  captureEnabled: z.boolean().default(true),
  lastResetAt: z.string().nullable().default(null),
  resetByUid: z.string().nullable().default(null),
  resetByName: z.string().nullable().default(null),
  updatedAt: z.string().default(() => new Date().toISOString()),
});

export type PortalMetricsConfig = z.infer<typeof PortalMetricsConfigSchema>;

export const DEFAULT_PORTAL_METRICS_CONFIG: PortalMetricsConfig = {
  captureEnabled: true,
  lastResetAt: null,
  resetByUid: null,
  resetByName: null,
  updatedAt: new Date().toISOString(),
};

