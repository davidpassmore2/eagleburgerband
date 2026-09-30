# Stage 37: Complete Portal Structural Consolidation & Data Architecture Refactor

## Overview
Stage 37 delivers a comprehensive, holistic architectural refactor across the entire Eagleburger Band portal. It eliminates legacy route duplication across all 6 portal categories, unifies conflicting database collections around typed canonical schemas (`tunes`), bridges manager capabilities into clean role-aware member views, modernizes retired routes with client-side redirects, ensures resilient setlist data cascades for live stage teleprompters, and guarantees full navigation parity so that every band member (`admin`, `manager`, `member`, `guest`) has direct access to their essential operational tools.

---

## 1. Background & Duplication Audit
Over 36 developmental stages, feature branches introduced prototypes, parallel administrative consoles, and member views that accumulated redundancy and data collection fragmentation:

| Category | Redundant / Fragmented Routes | Issues Identified | Resolution |
| :--- | :--- | :--- | :--- |
| **Music & Repertoire** | `/portal/library`<br>`/admin/catalog`<br>`/admin/tunes`<br>`/admin/vault` | 3 overlapping chart pages; split writes between untyped `songs` and typed `tunes`; duplicate audio vault managers. | Unified Repertoire Catalog (`/portal/library`) with dual member/manager capabilities; unified Rehearsal Vault (`/portal/vault`); canonical `tunes` collection; client redirects for retired routes. |
| **Performances & Logistics** | `/portal/gigs`<br>`/portal/availability`<br>`/portal/perform/[gigId]`<br>`/portal/checkin`<br>`/admin/call-sheets` | Member gigs and availability omitted from workspace registry; stage teleprompter linked back to restricted `/admin/setlists`; missing index routes (404s). | Registered `/portal/gigs` and `/portal/availability` in `workspaceRegistry`; teleprompter back-link to `/portal/gigs/[gigId]` with fallback setlist cascade; added index redirects for `/portal/checkin` and `/portal/perform`. |
| **Website & Intake** | `/portal/inquiries`<br>`/admin/inquiries` | Two parallel implementations of booking inquiry pipelines (283 lines vs 377 lines). | Canonicalized `/admin/inquiries`; replaced `/portal/inquiries` with client redirect; updated dashboard links. |
| **Personnel & Attendance** | `/portal/roster`<br>`/portal/section`<br>`/portal/section/manage`<br>`/admin/assets`<br>`/admin/inventory` | Member directory omitted from registry; legacy `/portal/section` overlapped `/admin/attendance`; orphaned `/portal/section/manage`; server-side redirect at `/admin/assets`. | Registered `/portal/roster` in `workspaceRegistry`; redirected `/portal/section` &rarr; `/admin/attendance`; redirected `/portal/section/manage` &rarr; `/admin/sections`; modernized `/admin/assets` client redirect to `/admin/inventory`. |
| **Finance** | `/admin/ledger`<br>`/admin/finance` | Orphaned 496-line `/admin/ledger` prototype from early stages superseded by master `/admin/finance` studio and `GigFinanceModal`. | Redirected `/admin/ledger` &rarr; `/admin/finance`. |
| **Business & Admin** | `/admin/crm`<br>`/admin/moderation`<br>`/portal/help` | Server-side redirect stubs without user feedback; guest users excluded from band handbook. | Modernized `/admin/crm` &rarr; `/admin/contacts` and `/admin/moderation` &rarr; `/admin/comments` client redirects; expanded `/portal/help` to `["member", "guest"]`. |

---

## 2. Architecture & Implementation Details

### Part 1: Schema Invariance & Database Unification (`tunes`)
1. **Schema Extension (`src/lib/schema/tune.ts`)**:
   - Added `"review"` to `TuneStatusEnum` (`["active", "review", "archived", "suggested"]`).
   - Extended `TuneSchema` with standard arrangement fields using safe `.default()` values (`artist`, `originalArtist`, `keySignature`, `tempoBpm`, `tempo`, `meter`, `timeSignature`, `driveLink`, `audioSampleUrl`, `chartContactUid`, `chartContactName`, `tags`).
2. **Collection Unification Across Consumers**:
   - Migrated all queries from `songs` to canonical `tunes` in:
     - [`src/app/(portal)/admin/setlists/page.tsx`](file:///c:/repos/eagleburgerband/src/app/(portal)/admin/setlists/page.tsx)
     - [`src/components/portal/GigSetlistAssignmentModal.tsx`](file:///c:/repos/eagleburgerband/src/components/portal/GigSetlistAssignmentModal.tsx)
     - [`src/components/portal/SetlistBuilderModal.tsx`](file:///c:/repos/eagleburgerband/src/components/portal/SetlistBuilderModal.tsx)
     - [`src/app/(portal)/admin/analytics/catalog/page.tsx`](file:///c:/repos/eagleburgerband/src/app/(portal)/admin/analytics/catalog/page.tsx)

### Part 2: Unified Repertoire Catalog & Audio Vault
- **Unified Repertoire Catalog (`/portal/library`)**:
  - Musician View: Filter tabs (`All`, `Active Rotation`, `In Repertoire`, `Rehearsal/Review`, `Heavy Rotation`, `In Vault >90 Days`, `Unperformed`), tag filter, Google Drive sheet music link buttons, inline reference audio preview player, thumbs-up/down reaction scores, and rehearsal discussion drawer ([`TuneCommentsModal`](file:///c:/repos/eagleburgerband/src/components/portal/TuneCommentsModal.tsx)).
  - Manager View (`canManageCatalog` / `isAdmin`): Prominent **"+ Add New Chart"** button, full arrangement creation/edit modal with roster lead assignment picker, inline metadata editor, and chart deletion.
  - Dual-Write Backward Compatibility: Automatically maintains `songs` doc mirroring on mutation for any external integrations while maintaining `tunes` as the single canonical source of truth.
- **Unified Rehearsal Audio Vault (`/portal/vault`)**:
  - Multi-track stem audio player with speed controls (0.75x–1.25x), track switching, and visual metronome.
  - Role-gated manager stem track upload modal and stem deletion capability.

### Part 3: Performances & Logistics Consolidation
- **Workspace Registry Expansion**:
  - Added `member-gigs` ("Performance Calendar & RSVPs" &rarr; `/portal/gigs`) for `["member", "guest"]`.
  - Added `availability` ("Musician Availability & Blackouts" &rarr; `/portal/availability`) for `["member", "guest"]`.
- **On-Stage Teleprompter Enhancements (`/portal/perform/[gigId]`)**:
  - Replaced restricted `/admin/setlists` back-link with direct navigation back to the gig's call sheet (`/portal/gigs/${gigId}`).
  - Built resilient fallback setlist resolution cascade:
    1. Primary: Stage setlist document (`setlists/${gigId}`).
    2. Fallback 1: Embedded setlist on the gig document (`gig.setlist`).
    3. Fallback 2: Assigned reusable master template (`setlists/${gig.setlistId}`).
- **Index Routes**:
  - Added `/portal/checkin/page.tsx` redirecting to `/admin/checkin`.
  - Added `/portal/perform/page.tsx` redirecting to `/portal/gigs`.

### Part 4: Personnel, Finance & Business Admin Modernization
- **Personnel & Attendance**:
  - Added `directory` ("Member Directory & Roster" &rarr; `/portal/roster`) to `workspaceRegistry.ts` for `["member", "guest"]`.
  - Redirected `/portal/section` &rarr; `/admin/attendance`.
  - Redirected `/portal/section/manage` &rarr; `/admin/sections`.
  - Modernized `/admin/assets` &rarr; `/admin/inventory`.
- **Finance**:
  - Redirected `/admin/ledger` &rarr; `/admin/finance`.
- **Business & Admin**:
  - Modernized `/admin/crm` &rarr; `/admin/contacts`.
  - Modernized `/admin/moderation` &rarr; `/admin/comments`.
  - Expanded `/portal/help` access in `workspaceRegistry.ts` to `["member", "guest"]`.
- **Catch-All Navigation Cleanliness**:
  - Updated `/admin/[...catchAll]` catalog link to `/portal/library`.
  - Updated `/portal/[...catchAll]` section dispatch link to `/admin/attendance`.
  - Updated `/portal/page.tsx` dashboard links from `/portal/inquiries` &rarr; `/admin/inquiries` and `/admin/tunes` &rarr; `/portal/library`.

---

### Part 5: Complete Client-Side Redirect Matrix

| Source Path | Canonical Destination | Description |
| :--- | :--- | :--- |
| `/admin/catalog` | `/portal/library` | Retired legacy catalog page |
| `/admin/tunes` | `/portal/library` | Retired secondary tune manager |
| `/admin/vault` | `/portal/vault` | Retired admin audio vault |
| `/admin/call-sheets` | `/admin/dispatch` | Standardized call sheet alias |
| `/portal/inquiries` | `/admin/inquiries` | Consolidated booking intake pipeline |
| `/portal/section` | `/admin/attendance` | Retired legacy section attendance |
| `/portal/section/manage` | `/admin/sections` | Redirected orphaned section manage |
| `/admin/assets` | `/admin/inventory` | Standardized equipment alias |
| `/admin/ledger` | `/admin/finance` | Retired legacy ledger prototype |
| `/admin/crm` | `/admin/contacts` | Standardized CRM alias |
| `/admin/moderation` | `/admin/comments` | Standardized moderation alias |
| `/portal/checkin` | `/admin/checkin` | Index route for check-in kiosk selector |
| `/portal/perform` | `/portal/gigs` | Index route for stage teleprompter |

---

## 3. Verification & Compliance
- **Zero TypeScript Errors**: Verified via `npx tsc --noEmit` (exit code 0).
- **Zero ESLint Errors/Warnings**: Verified via `npm run lint` (exit code 0, 0 errors, 0 warnings).
- **RBAC Guardrails**: Strict permissions gating across all manager operations via `hasRole` and `hasAnyRole`.
- **Schema Invariance**: All `Tune` schema properties have safe `.default()` values.
