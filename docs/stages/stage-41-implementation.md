# Stage 41 — Full Architectural Sweep: RBAC Alignment, Subcollection Schemas & Type Safety Hardening

## Overview
Stage 41 executes the remaining architectural initiatives identified in the Stage 39 Architectural Review (`docs/stages/stage-39-arch-review.md`). It addresses RBAC consistency between the portal workspace registry and page-level guards, introduces Zod schemas for the critical subcollections `gigs/{gigId}/checkins` and `gigs/{gigId}/rsvps`, eliminates untyped `d.data()` spreads across core admin workflows, and synchronizes the seed engine (`scripts/seed.ts`) with modern schema structures.

---

## Workstreams

### Workstream 1: RBAC Alignment & Subcollection Schema Hardening
- **RBAC Reconciliation:**
  - `admin/comments`: Aligned workspace registry (`admin, community_manager, web_manager`) and page-level guard (`canManageContent(profile)`). Integrated `<AccessDenied>`.
  - `admin/attendance`: Aligned workspace registry (`admin, section_leader, gig_manager, membership_manager`) with page-level guard (`canManageSections(profile) || canManageGigs(profile)`). Integrated `<AccessDenied>`.
- **Subcollection Zod Schemas:**
  - Authored `src/lib/schema/checkin.ts`: Exports `GigCheckinSchema`, `CheckInMethodEnum`, `CheckInStatusEnum`.
  - Authored `src/lib/schema/rsvp.ts`: Exports `GigRsvpSchema`, `RsvpStatusEnum`.
- **Wire Subcollection Validation:**
  - Updated `portal/checkin/[gigId]/page.tsx` with `CheckInSchema.safeParse`.
  - Updated `admin/checkin/page.tsx` with `GigSchema.safeParse` and clean permission checks.
  - Updated `admin/attendance/page.tsx` with `GigRsvpSchema.safeParse`.
  - Updated `portal/gigs/[gigId]/page.tsx` with `GigRsvpSchema.safeParse` and `GigRsvpSchema.parse()` on writes.

---

### Workstream 2: Runtime Type Safety & Untyped Spread Elimination
- **Default Timestamp Hardening:**
  - Updated `src/lib/schema/contact.ts` so `createdAt` and `updatedAt` default safely to ISO date strings.
- **Eliminate Double-Casts & Unsafe Spreads:**
  - `admin/sections/page.tsx`: Replaced `as unknown as User` with `UserSchema.safeParse()`, validated sections with `SectionSchema.safeParse()`, and added `<AccessDenied>`.
  - `admin/finance/page.tsx`: Validated treasury config, transactions, and reimbursements through their respective Zod schemas (`safeParse`), replaced double-cast, and added `<AccessDenied>`.
  - `admin/roster/page.tsx`: Validated users and sections with document ID fallback via schema `safeParse()`, and added `<AccessDenied>`.
  - `admin/notifications/page.tsx`: Validated email logs through `EmailLogSchema.safeParse()` and added `<AccessDenied>`.
  - `portal/perform/[gigId]/page.tsx`: Replaced `: any` in `normalizeTune` with type-safe `Record<string, unknown>`, removing eslint suppression.

---

### Workstream 3: Seed Script Synchronization & Repertoire Cleanup
- **Audit & Upgrade `scripts/seed.ts`:**
  - Added Section 19: Rehearsal Vault audio tracks seeded with `VaultTrackSchema.parse()`.
  - Added Section 20: Band equipment and inventory items seeded with `InventoryItemSchema.parse()`.
  - Added Section 21: Pending member onboarding invites seeded with `InviteSchema.parse()`.
  - Validated gig RSVPs via `GigRsvpSchema.parse()` and day-of kiosk check-ins via `CheckInSchema.parse()`.

---

## Quality Gates

| Gate | Command | Result |
|---|---|---|
| TypeScript | `npx tsc --noEmit` | ✅ 0 errors |
| Lint | `npm run lint` | ✅ 0 errors, 0 warnings |
| Build | `npm run build` | ✅ 62 routes compiled successfully (Turbopack) |

## Status

| Workstream | Status |
|---|---|
| 1 — RBAC Alignment & Subcollection Schemas | ✅ Completed |
| 2 — Runtime Type Safety & Spread Elimination | ✅ Completed |
| 3 — Seed Synchronization & Cleanup | ✅ Completed |
