# Stage 45: Portal Usage Metrics Telemetry & Heatmap Analytics Implementation Plan

## Problem Statement & Goals
Stage 45 introduces privacy-first internal portal usage telemetry and visual heatmap analytics for the band operations team:
1. **Usage Telemetry Capture:** Non-blocking telemetry tracking member portal navigation events (`route_view`), actions, active devices, and session duration without tracking sensitive PII or external visitors.
2. **Admin Route Exclusions:** Exclude operational admin surfaces from member engagement stats to ensure analytics reflect genuine musician participation.
3. **Usage Analytics Dashboard:** Dedicated admin visualization studio (`/admin/analytics/usage`) featuring:
   - Total interactions and unique active musician counts.
   - 24-Hour hourly activity timeline.
   - Day-of-week engagement distribution.
   - Interactive calendar heatmap representing 30-day activity intensity.
   - Top most-visited portal workspaces and musician engagement leaderboard.
4. **Telemetry Controls:** Master enable/disable toggle and telemetry data reset capabilities restricted to super administrators.

---

## Scope & Target Locations

### 1. Zod Schemas & Invariance (`src/lib/schema/metrics.ts`)
- `PortalMetricEventSchema`:
  - `id`: unique event document ID.
  - `uid`: musician user ID.
  - `displayName`: member name.
  - `email`: member email.
  - `sectionId`: member section (percussion, sousaphones, etc.).
  - `role`: primary member role.
  - `eventType`: event classification (`route_view`, `action`, etc.).
  - `route`: portal route path.
  - `workspaceId`: workspace identifier.
  - `deviceType`: `desktop`, `tablet`, or `mobile`.
  - `timestamp`: ISO date string.
  - `metadata`: optional flexible key-value properties.
- `PortalMetricsConfigSchema`:
  - `captureEnabled`: master telemetry killswitch.
  - `lastResetAt`: timestamp of last data reset.
  - `resetByUid` / `resetByName`: administrator who triggered reset.
  - `updatedAt`: ISO date string.

### 2. Client Telemetry Tracker (`src/lib/metrics/tracker.ts`)
- Pure client-side tracker that records route changes within `(portal)` routes.
- Filters out `/admin/*` routes to avoid skewing member adoption metrics.
- Enforces rate limiting/debouncing on rapid navigation.

### 3. Usage Analytics Studio (`src/app/(portal)/admin/analytics/usage/page.tsx`)
- Role-based guard (`isAdmin`).
- Real-time listener on `portal_metrics_events` and `portal_metrics_config/global`.
- Interactive analytics charts:
  - Metric summary cards (Total Events, Active Members, Peak Hour, Most Active Workspace).
  - 30-day daily activity calendar heatmap with color-coded intensity cells.
  - Top routes & workspace breakdown.
  - Top contributing musician roster rankings.
  - Telemetry capture status badge and config reset modal.

### 4. Firestore Security Rules (`firestore.rules`)
- `portal_metrics_config/{configId}`:
  - Read: authenticated members (`request.auth != null`).
  - Write: administrators (`isAdmin()`).
- `portal_metrics_events/{eventId}`:
  - Create: authenticated members (`request.auth != null`).
  - Read/Update/Delete: administrators (`isAdmin()`).

