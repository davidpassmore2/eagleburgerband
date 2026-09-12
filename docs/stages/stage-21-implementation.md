# Stage 21 Implementation Plan: Rehearsal Vault & Blackout Availability Calendar

**Stage Number:** 21  
**Branch:** `feature/stage-21`  
**Status:** Completed & Verified

---

## 1. Objective & Scope
Introduces member rehearsal audio/video vault and musician date-range blackout management.

Created `/portal/vault` for reference rehearsal audio and `/portal/availability` with date-range picker for musician vacation/blackout periods.

---

## 2. Key Architecture & Design Decisions
- **Modularity:** Isolated feature domain with decoupled components and scoped state management.
- **Schema Invariance:** Follows project rules in `AGENTS.md` with Zod schema definitions and safe `.default()` values.
- **RBAC Guardrails:** Restricts sensitive operations to authorized band roles.
- **Data Integrity:** Employs atomic operations to avoid concurrency issues.

---

## 3. Targeted Code & File Manifest
- [`src/app/(portal)/portal/vault/page.tsx`](file:///c:/repos/eagleburgerband/src/app/(portal)/portal/vault/page.tsx)
- [`src/app/(portal)/portal/availability/page.tsx`](file:///c:/repos/eagleburgerband/src/app/(portal)/portal/availability/page.tsx)
- [`src/components/ui/DateRangePicker.tsx`](file:///c:/repos/eagleburgerband/src/components/ui/DateRangePicker.tsx)

---

## 4. Verification Plan
- **Type Checking:** Verify clean compilation via TypeScript (`npx tsc --noEmit`).
- **Linting:** Confirm compliance with ESLint rules (`npm run lint`).
- **Functional Validation:** Rehearsal recording playback and blackout date-range conflict detection verified.
