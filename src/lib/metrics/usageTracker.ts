import { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  writeBatch, 
  onSnapshot 
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { 
  PortalMetricEvent, 
  PortalMetricEventSchema, 
  PortalMetricsConfig,
  PortalMetricsConfigSchema,
  DEFAULT_PORTAL_METRICS_CONFIG 
} from "@/lib/schema/metrics";
import { WORKSPACE_TOOLS, WorkspaceTool } from "@/lib/portal/workspaceRegistry";

// In-memory cache for fast sync checks
let cachedConfig: PortalMetricsConfig = { ...DEFAULT_PORTAL_METRICS_CONFIG };
let configListenerInitialized = false;

export function initMetricsConfigListener(): () => void {
  if (configListenerInitialized || typeof window === "undefined") {
    return () => {};
  }
  configListenerInitialized = true;

  const unsub = onSnapshot(
    doc(db, "portal_metrics_config", "global"),
    (snapshot) => {
      if (snapshot.exists()) {
        const parsed = PortalMetricsConfigSchema.safeParse(snapshot.data());
        if (parsed.success) {
          cachedConfig = parsed.data;
        }
      }
    },
    (err) => {
      console.warn("Metrics config listener error:", err);
    }
  );

  return unsub;
}

export function isMetricsCaptureActive(): boolean {
  return cachedConfig.captureEnabled;
}

export function findToolByPath(pathname: string): WorkspaceTool | undefined {
  if (!pathname) return undefined;
  // Exact match first
  const exact = WORKSPACE_TOOLS.find((t) => t.href === pathname);
  if (exact) return exact;

  // Prefix match (longest matching href)
  const matching = WORKSPACE_TOOLS
    .filter((t) => pathname.startsWith(t.href) && t.href !== "/portal")
    .sort((a, b) => b.href.length - a.href.length);

  return matching[0];
}

export function isAdminOnlyTool(tool?: WorkspaceTool): boolean {
  if (!tool) return false;
  if (tool.id === "portal-usage" || tool.id === "admin-log" || tool.id === "users") {
    return true;
  }
  return tool.requiredRoles.length === 1 && tool.requiredRoles[0] === "admin";
}

export function isAdminOnlyRoute(pathname?: string): boolean {
  if (!pathname) return false;
  const cleanPath = pathname.split("?")[0].split("#")[0].replace(/\/+$/, "") || "/";
  if (
    cleanPath === "/admin" ||
    cleanPath.startsWith("/admin/analytics/usage") ||
    cleanPath.startsWith("/admin/audit-log") ||
    cleanPath.startsWith("/admin/users")
  ) {
    return true;
  }
  const tool = findToolByPath(cleanPath);
  if (tool && isAdminOnlyTool(tool)) {
    return true;
  }
  return false;
}

// Client-side debounce to prevent duplicate route view triggers on fast re-renders
const recentViewCache = new Map<string, number>();

export interface RecordRouteViewParams {
  pathname: string;
  user: {
    uid: string;
    displayName?: string | null;
    email?: string | null;
    roles?: readonly string[] | string[];
  };
}

export async function recordRouteView(params: RecordRouteViewParams): Promise<void> {
  if (typeof window === "undefined" || !params.user?.uid) return;
  if (!cachedConfig.captureEnabled) return;
  if (isAdminOnlyRoute(params.pathname)) return;

  const cacheKey = `${params.user.uid}:${params.pathname}`;
  const now = Date.now();
  const lastLogged = recentViewCache.get(cacheKey);

  // Debounce duplicate route views within 4 seconds
  if (lastLogged && now - lastLogged < 4000) {
    return;
  }
  recentViewCache.set(cacheKey, now);

  const tool = findToolByPath(params.pathname);
  const toolTitle = tool ? tool.title : formatPathnameToTitle(params.pathname);
  const toolId = tool ? tool.id : (params.pathname.replace(/^\/(portal|admin)\/?/, "").replace(/\//g, "-") || "portal-home");
  const category = tool ? tool.category : (params.pathname.startsWith("/admin") ? "Business & Admin" : "General");
  const primaryRole = (params.user.roles && params.user.roles[0]) || "member";

  const eventId = `view_${now}_${Math.random().toString(36).substring(2, 7)}`;
  const nowIso = new Date().toISOString();

  const payload: PortalMetricEvent = {
    id: eventId,
    type: "route_view",
    pathname: params.pathname,
    toolId,
    toolTitle,
    category,
    action: "view",
    details: `Viewed ${toolTitle}`,
    userId: params.user.uid,
    userName: params.user.displayName || "Musician",
    userEmail: params.user.email || "",
    userRole: primaryRole,
    timestamp: nowIso,
    dateKey: nowIso.slice(0, 10),
    metadata: {},
  };

  try {
    const validated = PortalMetricEventSchema.parse(payload);
    await setDoc(doc(db, "portal_metrics_events", eventId), validated);
  } catch (err) {
    console.error("Failed to record route view metric:", err);
  }
}

export interface RecordInteractionParams {
  action: string;
  details?: string;
  pathname?: string;
  toolId?: string;
  toolTitle?: string;
  user: {
    uid: string;
    displayName?: string | null;
    email?: string | null;
    roles?: readonly string[] | string[];
  };
  metadata?: Record<string, unknown>;
}

export async function recordInteraction(params: RecordInteractionParams): Promise<void> {
  if (typeof window === "undefined" || !params.user?.uid) return;
  if (!cachedConfig.captureEnabled) return;

  const currentPath = params.pathname || (typeof window !== "undefined" ? window.location.pathname : "");
  if (isAdminOnlyRoute(currentPath)) return;
  if (params.toolId && (params.toolId === "portal-usage" || params.toolId === "admin-log" || params.toolId === "users")) return;

  const tool = findToolByPath(currentPath);
  if (isAdminOnlyTool(tool)) return;

  const toolTitle = params.toolTitle || (tool ? tool.title : formatPathnameToTitle(currentPath));
  const toolId = params.toolId || (tool ? tool.id : (currentPath.replace(/^\/(portal|admin)\/?/, "").replace(/\//g, "-") || "interaction"));
  const category = tool ? tool.category : (currentPath.startsWith("/admin") ? "Business & Admin" : "General");
  const primaryRole = (params.user.roles && params.user.roles[0]) || "member";

  const now = Date.now();
  const eventId = `inter_${now}_${Math.random().toString(36).substring(2, 7)}`;
  const nowIso = new Date().toISOString();

  const payload: PortalMetricEvent = {
    id: eventId,
    type: "interaction",
    pathname: currentPath,
    toolId,
    toolTitle,
    category,
    action: params.action,
    details: params.details || `Performed ${params.action}`,
    userId: params.user.uid,
    userName: params.user.displayName || "Musician",
    userEmail: params.user.email || "",
    userRole: primaryRole,
    timestamp: nowIso,
    dateKey: nowIso.slice(0, 10),
    metadata: params.metadata || {},
  };

  try {
    const validated = PortalMetricEventSchema.parse(payload);
    await setDoc(doc(db, "portal_metrics_events", eventId), validated);
  } catch (err) {
    console.error("Failed to record interaction metric:", err);
  }
}

/**
 * Dispatch an interaction event from any UI component without prop drilling user profile.
 * The PortalUsageTracker component listens to this and logs the event with current user context.
 */
export function dispatchPortalInteraction(action: string, details?: string, metadata?: Record<string, unknown>): void {
  if (typeof window === "undefined") return;
  const currentPath = window.location.pathname;
  if (isAdminOnlyRoute(currentPath)) return;

  window.dispatchEvent(
    new CustomEvent("ebb-portal-interaction", {
      detail: { action, details, pathname: currentPath, metadata },
    })
  );
}

export async function setMetricsCaptureEnabled(enabled: boolean): Promise<void> {
  const updated: Partial<PortalMetricsConfig> = {
    captureEnabled: enabled,
    updatedAt: new Date().toISOString(),
  };
  cachedConfig = { ...cachedConfig, ...updated };
  await setDoc(doc(db, "portal_metrics_config", "global"), updated, { merge: true });
}

export async function resetPortalMetrics(adminUser: { uid: string; displayName?: string | null }): Promise<void> {
  const resetIso = new Date().toISOString();
  const configUpdate: PortalMetricsConfig = {
    captureEnabled: cachedConfig.captureEnabled,
    lastResetAt: resetIso,
    resetByUid: adminUser.uid,
    resetByName: adminUser.displayName || "Administrator",
    updatedAt: resetIso,
  };
  cachedConfig = configUpdate;

  // 1. Immediately update config with reset timestamp so client queries drop older metrics instantly
  await setDoc(doc(db, "portal_metrics_config", "global"), configUpdate, { merge: true });

  // 2. Batch purge events from Firestore collection
  try {
    const snapshot = await getDocs(collection(db, "portal_metrics_events"));
    if (snapshot.empty) return;

    const batches: ReturnType<typeof writeBatch>[] = [];
    let currentBatch = writeBatch(db);
    let count = 0;

    snapshot.docs.forEach((docSnap) => {
      currentBatch.delete(docSnap.ref);
      count++;
      if (count === 400) {
        batches.push(currentBatch);
        currentBatch = writeBatch(db);
        count = 0;
      }
    });

    if (count > 0) {
      batches.push(currentBatch);
    }

    await Promise.all(batches.map((b) => b.commit()));
  } catch (err) {
    console.error("Error purging metrics events collection:", err);
  }
}

function formatPathnameToTitle(pathname: string): string {
  if (!pathname || pathname === "/") return "Home";
  const segments = pathname.split("/").filter(Boolean);
  const last = segments[segments.length - 1] || "";
  return last
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

