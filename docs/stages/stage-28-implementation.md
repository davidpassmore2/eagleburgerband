# Stage 28 Implementation Plan: Repertoire Rating Scores, Inline Comment Drawers & Admin Action Audit Log

**Stage Number:** 28  
**Branch:** `feature/stage-28`  
**Status:** Completed & Verified

---

## 1. Objective & Scope
Upgrades chart library with upvote/downvote scoring, inline discussion drawers, and comprehensive admin audit logging.

Built net score voting and expandable `CommentsStream` drawers under each chart in `/admin/tunes`. Implemented `/admin/audit-log` and `adminLogger` tracking admin actions with timestamps.

---

## 2. Key Architecture & Design Decisions
- **Modularity:** Isolated feature domain with decoupled components and scoped state management.
- **Schema Invariance:** Follows project rules in `AGENTS.md` with Zod schema definitions and safe `.default()` values.
- **RBAC Guardrails:** Restricts sensitive operations to authorized band roles.
- **Data Integrity:** Employs atomic operations to avoid concurrency issues.

---

## 3. Targeted Code & File Manifest
- [`src/app/(portal)/admin/tunes/page.tsx`](file:///c:/repos/eagleburgerband/src/app/(portal)/admin/tunes/page.tsx)
- [`src/app/(portal)/admin/audit-log/page.tsx`](file:///c:/repos/eagleburgerband/src/app/(portal)/admin/audit-log/page.tsx)
- [`src/components/portal/CommentsStream.tsx`](file:///c:/repos/eagleburgerband/src/components/portal/CommentsStream.tsx)
- [`src/lib/logging/adminLogger.ts`](file:///c:/repos/eagleburgerband/src/lib/logging/adminLogger.ts)
- [`src/lib/schema/adminLog.ts`](file:///c:/repos/eagleburgerband/src/lib/schema/adminLog.ts)

---

## 4. Verification Plan
- **Type Checking:** Verify clean compilation via TypeScript (`npx tsc --noEmit`).
- **Linting:** Confirm compliance with ESLint rules (`npm run lint`).
- **Functional Validation:** Atomic voting operations, real-time comment streams, and admin audit log persistence verified.
