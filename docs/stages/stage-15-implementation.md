# Stage 15 Implementation Plan: Section Leader Instrumentation Audit Drawer

**Stage Number:** 15  
**Branch:** `feature/15-section-leader-instrument-audit`  
**Status:** Completed & Verified

---

## 1. Objective & Scope
Equips section leaders with real-time brass and drumline section headcounts per gig.

Created `InstrumentationAuditDrawer` showing confirmed attendance, gaps in horn lines or battery, and quick-dispatch outreach buttons.

---

## 2. Key Architecture & Design Decisions
- **Modularity:** Isolated feature domain with decoupled components and scoped state management.
- **Schema Invariance:** Follows project rules in `AGENTS.md` with Zod schema definitions and safe `.default()` values.
- **RBAC Guardrails:** Restricts sensitive operations to authorized band roles.
- **Data Integrity:** Employs atomic operations to avoid concurrency issues.

---

## 3. Targeted Code & File Manifest
- [`src/components/portal/InstrumentationAuditDrawer.tsx`](file:///c:/repos/eagleburgerband/src/components/portal/InstrumentationAuditDrawer.tsx)
- [`src/app/(portal)/admin/gigs/page.tsx`](file:///c:/repos/eagleburgerband/src/app/(portal)/admin/gigs/page.tsx)

---

## 4. Verification Plan
- **Type Checking:** Verify clean compilation via TypeScript (`npx tsc --noEmit`).
- **Linting:** Confirm compliance with ESLint rules (`npm run lint`).
- **Functional Validation:** Section counts, minimum instrumentation warnings, and drawer animations verified.
