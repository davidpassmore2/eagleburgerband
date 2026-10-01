# Stage 39 — Member Experience, Public Site Polish & Architectural Review

## Overview

Stage 39 is a multi-workstream milestone covering five parallel tracks. The architectural review (E) runs first and informs implementation priorities across the other tracks.

---

## Workstreams

### A — Member Communication & Notifications Hub
**Goal:** Give members an in-app notification feed and preference controls.

**Planned work:**
- Member-facing notification inbox (`/portal/notifications`)
- Notification preference toggles (opt-in/out by category: gig alerts, logistics changes, rehearsal notices, suggestions activity)
- Tie into existing logistics-alert webhook and dispatch system
- Admin: ability to broadcast a band-wide notification
- Schema: `NotificationSchema`, `NotificationPreferencesSchema` in `src/lib/schema/`

---

### B — Rehearsal & Attendance System
**Goal:** Close the gap between admin attendance tracking and member self-service.

**Planned work:**
- Member self-check-in for rehearsals (QR or PIN-based)
- Member-facing attendance history / streak tracker (`/portal/attendance`)
- Section leader view of their section's attendance
- Admin dashboard improvements: attendance heat maps, absence patterns
- Schema: review/harden `AttendanceSchema` if not already solid

---

### C — Tunes Catalog: `songs` → `tunes` Collection Consolidation
**Goal:** Eliminate the dual-write technical debt documented in Stage 38.

**Planned work:**
- Audit all reads from the `songs` Firestore collection across the codebase
- Migrate all reads to the canonical `tunes` collection
- Remove the dual-write (`songs` + `tunes`) from `portal/library/page.tsx`
- Update seed data: remove any `songs`-only documents
- Add a one-time migration note to `DEVELOPER_ONBOARDING.md`

---

### D — Public Site Enhancement Pass
**Goal:** Polish the public-facing site for discoverability and UX quality.

**Planned work:**
- SEO metadata / Open Graph tags on all public routes (`/`, `/gigs`, `/book`, `/join`, `/contact`, `/giving`)
- Gig listing improvements (event type, venue, public-facing compensation label)
- Contact / booking form UX review (validation, confirmation feedback)
- Accessibility audit (semantic HTML, ARIA, focus states)
- Performance: image optimization, above-the-fold loading

---

### E — Architectural Review & Refactoring Recommendations
**Goal:** Identify structural debt, redundancy, and opportunities for consolidation across the full codebase.

**Review areas:**
1. **Schema coverage** — Are all Firestore collections backed by a Zod schema in `src/lib/schema/`? Are `.default()` values consistently applied?
2. **Auth / RBAC consistency** — Are permission checks (`canManageCatalog`, `isAdmin`, etc.) applied uniformly? Any unguarded routes?
3. **Component duplication** — Repeated UI patterns that should be extracted into shared components
4. **Data fetching patterns** — Mix of `onSnapshot`, `getDocs`, `getDoc` — identify where real-time subscriptions are unnecessary overhead
5. **Dead code** — Unused imports, unreachable branches, orphaned collections
6. **Collection audit** — Inventory every Firestore collection referenced in the codebase vs. what's defined in `scripts/seed.ts`
7. **Route coverage** — Verify every workspace entry in `workspaceRegistry.ts` has a real route; verify every route has the correct RBAC guard
8. **Error handling** — Inconsistent use of `alert()` vs. proper toast/error UI
9. **Type safety gaps** — `any` types, unvalidated `d.data()` spreads, missing interface definitions

**Deliverable:** `docs/stages/stage-39-arch-review.md` — annotated findings with priority ratings (🔴 Critical / 🟡 Medium / 🟢 Low) and specific refactoring recommendations.

---

## Quality Gates (apply after each workstream)

| Gate | Command |
|------|---------|
| TypeScript | `npx tsc --noEmit` |
| Lint | `npm run lint` |
| Build | `npm run build` |

## Status

| Workstream | Status |
|-----------|--------|
| E — Architectural Review | ✅ Completed ([Report](./stage-39-arch-review.md)) |
| C — Catalog Consolidation | ✅ Completed |
| A — Notifications Hub | ✅ Completed |
| B — Rehearsal & Attendance | ✅ Completed |
| D — Public Site Polish | 🔄 In Progress |

