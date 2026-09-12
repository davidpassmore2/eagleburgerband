# Stage 23 Implementation Plan: Portal Navigation Shell, Permissions & Workspace Tools Registry

**Stage Number:** 23  
**Branch:** `feature/stage-23`  
**Status:** Completed & Verified

---

## 1. Objective & Scope
Refactors portal navigation into a categorized workspace tool registry with dynamic permission filtering.

Created `workspaceRegistry.ts` organizing 24+ administrative tools into 4 clear categories with strict RBAC visibility guards.

---

## 2. Key Architecture & Design Decisions
- **Modularity:** Isolated feature domain with decoupled components and scoped state management.
- **Schema Invariance:** Follows project rules in `AGENTS.md` with Zod schema definitions and safe `.default()` values.
- **RBAC Guardrails:** Restricts sensitive operations to authorized band roles.
- **Data Integrity:** Employs atomic operations to avoid concurrency issues.

---

## 3. Targeted Code & File Manifest
- [`src/lib/portal/workspaceRegistry.ts`](file:///c:/repos/eagleburgerband/src/lib/portal/workspaceRegistry.ts)
- [`src/app/(portal)/layout.tsx`](file:///c:/repos/eagleburgerband/src/app/(portal)/layout.tsx)

---

## 4. Verification Plan
- **Type Checking:** Verify clean compilation via TypeScript (`npx tsc --noEmit`).
- **Linting:** Confirm compliance with ESLint rules (`npm run lint`).
- **Functional Validation:** Category grouping, role-based tool visibility, and responsive sidebar navigation verified.
