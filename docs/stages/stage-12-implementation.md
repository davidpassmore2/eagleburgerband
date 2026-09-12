# Stage 12 Implementation Plan: Stage Readiness & Offline Print Toolbar

**Stage Number:** 12  
**Branch:** `feature/12-stage-readiness-offline-print`  
**Status:** Completed & Verified

---

## 1. Objective & Scope
Adds print styling, 1-click clipboard copying, and stage teleprompter view.

Engineered `@media print` optimized CSS stylesheets for gig call sheets and created the `/portal/perform/[gigId]` high-contrast stage teleprompter view.

---

## 2. Key Architecture & Design Decisions
- **Modularity:** Isolated feature domain with decoupled components and scoped state management.
- **Schema Invariance:** Follows project rules in `AGENTS.md` with Zod schema definitions and safe `.default()` values.
- **RBAC Guardrails:** Restricts sensitive operations to authorized band roles.
- **Data Integrity:** Employs atomic operations to avoid concurrency issues.

---

## 3. Targeted Code & File Manifest
- [`src/app/(portal)/portal/perform/[gigId]/page.tsx`](file:///c:/repos/eagleburgerband/src/app/(portal)/portal/perform/[gigId]/page.tsx)
- [`src/app/(portal)/portal/gigs/[gigId]/page.tsx`](file:///c:/repos/eagleburgerband/src/app/(portal)/portal/gigs/[gigId]/page.tsx)

---

## 4. Verification Plan
- **Type Checking:** Verify clean compilation via TypeScript (`npx tsc --noEmit`).
- **Linting:** Confirm compliance with ESLint rules (`npm run lint`).
- **Functional Validation:** Print layout previews and live teleprompter controls verified.
