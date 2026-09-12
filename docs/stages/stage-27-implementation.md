# Stage 27 Implementation Plan: Email & SMS Broadcast Suite, Musician Profile & Account Deactivation

**Stage Number:** 27  
**Branch:** `feature/stage-27`  
**Status:** Completed & Verified

---

## 1. Objective & Scope
Adds broadcast communication suite, member self-deactivation, and profile preferences.

Created `/admin/notifications` for targeted email/SMS announcements, `/portal/profile` for musician contact preferences, and self-service band departure workflows.

---

## 2. Key Architecture & Design Decisions
- **Modularity:** Isolated feature domain with decoupled components and scoped state management.
- **Schema Invariance:** Follows project rules in `AGENTS.md` with Zod schema definitions and safe `.default()` values.
- **RBAC Guardrails:** Restricts sensitive operations to authorized band roles.
- **Data Integrity:** Employs atomic operations to avoid concurrency issues.

---

## 3. Targeted Code & File Manifest
- [`src/app/(portal)/admin/notifications/page.tsx`](file:///c:/repos/eagleburgerband/src/app/(portal)/admin/notifications/page.tsx)
- [`src/app/(portal)/portal/profile/page.tsx`](file:///c:/repos/eagleburgerband/src/app/(portal)/portal/profile/page.tsx)
- [`src/lib/email/templates.ts`](file:///c:/repos/eagleburgerband/src/lib/email/templates.ts)
- [`src/lib/schema/emailLog.ts`](file:///c:/repos/eagleburgerband/src/lib/schema/emailLog.ts)

---

## 4. Verification Plan
- **Type Checking:** Verify clean compilation via TypeScript (`npx tsc --noEmit`).
- **Linting:** Confirm compliance with ESLint rules (`npm run lint`).
- **Functional Validation:** Notification composition, template rendering, and member deactivation flows tested.
