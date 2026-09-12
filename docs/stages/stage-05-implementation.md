# Stage 05 Implementation Plan: Repertoire Catalog & Setlist Studio

**Stage Number:** 05  
**Branch:** `feature/05-catalog-and-setlists`  
**Status:** Completed & Verified

---

## 1. Objective & Scope
Implements catalog administration, chart library management, and setlist builder tooling.

Created `/admin/catalog` and `/admin/setlists` for arrangers and librarians to manage charts, concert keys, difficulty, and gig setlist configurations.

---

## 2. Key Architecture & Design Decisions
- **Modularity:** Isolated feature domain with decoupled components and scoped state management.
- **Schema Invariance:** Follows project rules in `AGENTS.md` with Zod schema definitions and safe `.default()` values.
- **RBAC Guardrails:** Restricts sensitive operations to authorized band roles.
- **Data Integrity:** Employs atomic operations to avoid concurrency issues.

---

## 3. Targeted Code & File Manifest
- [`src/app/(portal)/admin/catalog/page.tsx`](file:///c:/repos/eagleburgerband/src/app/(portal)/admin/catalog/page.tsx)
- [`src/app/(portal)/admin/setlists/page.tsx`](file:///c:/repos/eagleburgerband/src/app/(portal)/admin/setlists/page.tsx)
- [`src/lib/schema/tune.ts`](file:///c:/repos/eagleburgerband/src/lib/schema/tune.ts)
- [`src/lib/schema/setlist.ts`](file:///c:/repos/eagleburgerband/src/lib/schema/setlist.ts)

---

## 4. Verification Plan
- **Type Checking:** Verify clean compilation via TypeScript (`npx tsc --noEmit`).
- **Linting:** Confirm compliance with ESLint rules (`npm run lint`).
- **Functional Validation:** Tune creation, setlist ordering, and Firestore real-time listeners verified.
