# Stage 36: Portal Theme Dual Mode, Setlist Manager Role, Reusable Setlists & Usage Analytics

## Overview
Stage 36 delivers two core feature sets to the Eagleburger Band platform:
1. **Portal Theme Dual Mode (Light & Dark) & User Preference Persistence**: Native Light and Dark mode options across all 5 atmospheric portal themes with real-time toggle capabilities and persistent user preferences stored directly on each musician's profile in Firestore.
2. **Setlist Manager Role, Reusable Setlists & Circulation Analytics**: A dedicated RBAC role (`setlist_manager`), rich reusable setlists with categorization, individual tune sequence parameters (tempos, key signatures, performance notes, segue markers), 1-click gig assignment with stage view synchronization, and circulation analytics tracking setlist reuse across gigs.

---

## Part 1: Portal Theme Dual Mode & Preference Persistence

### 1. Dual-Mode Theme Tokens
Explicit, high-contrast, accessible light and dark mode tokens for all 5 portal color schemes:
- `eagleburger-gold` (Signature Street Brass)
- `neon-parade` (Electric Night Navy & Cyan)
- `sousa-crimson` (Parade Regalia Bordeaux)
- `emerald-groove` (Bayou Second Line Mint)
- `monongahela-steel` (Pittsburgh Industrial Platinum)

### 2. Schema Invariance & Type Safety
- Added `PortalThemeModeSchema = z.enum(["dark", "light"])` to [`src/lib/schema/theme.ts`](file:///c:/repos/eagleburgerband/src/lib/schema/theme.ts).
- Added `portalThemeMode: PortalThemeModeSchema.default("dark")` to `UserSchema` in [`src/lib/schema/user.ts`](file:///c:/repos/eagleburgerband/src/lib/schema/user.ts).

### 3. Reactive Theme State & Storage Synchronization
- Updated [`src/lib/context/ThemeContext.tsx`](file:///c:/repos/eagleburgerband/src/lib/context/ThemeContext.tsx) to manage `activePortalMode` and `activePortalSchemeId`.
- Precedence order: `UI Override > Firestore User Profile > localStorage > "dark"`.
- Synchronized preferences across `localStorage` (`ebb_portal_theme_scheme`, `ebb_portal_theme_mode`) using `useSyncExternalStore` for SSR hydration safety.
- Added automatic Firestore synchronization to `users/{uid}` via `setMemberPortalTheme` and `setMemberPortalMode`.

### 4. Interactive Segmented Mode Chooser
- Updated [`src/components/portal/PortalThemeModal.tsx`](file:///c:/repos/eagleburgerband/src/components/portal/PortalThemeModal.tsx) with a prominent Light/Dark segmented control featuring Moon and Sun icons.
- Live color swatch previews and scheme preview cards update dynamically when toggling between dark and light modes.
- Added visual "Saved" badge feedback upon updating preferences.

### 5. Atmospheric CSS Scoping & Layout Support
- Updated [`src/app/(portal)/layout.tsx`](file:///c:/repos/eagleburgerband/src/app/(portal)/layout.tsx) with `data-ebb-mode={activePortalMode}` on the portal root.
- Added tailored portal light mode CSS rules in [`src/app/globals.css`](file:///c:/repos/eagleburgerband/src/app/globals.css) ensuring optimal text contrast, surface styling, and well backgrounds across all portal workspaces.

---

## Part 2: Setlist Manager Role, Reusable Setlists & Usage Analytics

### 1. Dedicated `setlist_manager` Role & RBAC System
- **User Schema**: Added `"setlist_manager"` to `RoleEnum` in [`src/lib/schema/user.ts`](file:///c:/repos/eagleburgerband/src/lib/schema/user.ts).
- **Permissions**: Defined in [`src/lib/auth/permissions.ts`](file:///c:/repos/eagleburgerband/src/lib/auth/permissions.ts):
  - `canManageSetlists(user)`: Authorizes `admin`, `setlist_manager`, `catalog_manager`, and `gig_manager`.
  - `canViewRepertoireAnalytics(user)`: Authorizes `admin`, `catalog_manager`, `setlist_manager`, and `gig_manager`.
- **Super Admin Roles**: Added `setlist_manager` to `SUPER_ADMIN_ROLES` in [`src/lib/context/AuthContext.tsx`](file:///c:/repos/eagleburgerband/src/lib/context/AuthContext.tsx).
- **Workspace Registry**: Registered `setlist_manager` for Setlist Studio (`/admin/setlists`) and Catalog Analytics (`/admin/analytics/catalog`) in [`src/lib/portal/workspaceRegistry.ts`](file:///c:/repos/eagleburgerband/src/lib/portal/workspaceRegistry.ts).
- **Role Emulation**: Added `setlist_manager` preset to [`RoleEmulationModal.tsx`](file:///c:/repos/eagleburgerband/src/components/portal/RoleEmulationModal.tsx) and [`RoleEmulationBanner.tsx`](file:///c:/repos/eagleburgerband/src/components/portal/RoleEmulationBanner.tsx).
- **Roster Administration**: Added `setlist_manager` to the role assigner in [`src/app/(portal)/admin/roster/page.tsx`](file:///c:/repos/eagleburgerband/src/app/(portal)/admin/roster/page.tsx).

### 2. Setlist Schema & Invariance
- Extended [`src/lib/schema/setlist.ts`](file:///c:/repos/eagleburgerband/src/lib/schema/setlist.ts) with `SetlistTuneItemSchema` and `SetlistCategoryEnum`:
  - `name`: Master setlist name.
  - `category`: `"parade"`, `"festival"`, `"stage"`, `"party"`, `"acoustic"`, `"other"`.
  - `targetDurationMinutes`: Estimated set duration.
  - `isTemplate`: Distinguishes reusable master templates from single-gig instances.
  - `usageCount`: Cumulative gig deployments.
  - `assignedGigIds`: Array of gig IDs where this setlist has been deployed.
  - `lastUsedDate`: ISO date string of most recent gig deployment.
  - `tunes`: Sequenced tune items with `keySignature`, `tempoBpm`, `durationSeconds`, `performanceNote`, and `segueIntoNext` transition markers.
  - Maintained complete backward compatibility for legacy `title` and `items` fields.

### 3. Repertoire Analytics Engine
- Extended [`src/lib/repertoire/analytics.ts`](file:///c:/repos/eagleburgerband/src/lib/repertoire/analytics.ts):
  - Defined `SetlistUsageStat` type.
  - Exported `buildSetlistUsageAnalytics(setlists, gigs)`: cross-references reusable setlists against all gigs, matching by `setlistId`, `internalLogistics.setlistId`, or `assignedGigIds`, computing real-time `usageCount`, `lastUsedDate`, `lastUsedGigTitle`, and ordered assignment lists.

### 4. Admin Setlist Studio (`/admin/setlists`)
- Rebuilt [`src/app/(portal)/admin/setlists/page.tsx`](file:///c:/repos/eagleburgerband/src/app/(portal)/admin/setlists/page.tsx):
  - **4-Card KPI Banner**: Reusable setlists, total gig deployments, top reused setlist, and charts in circulation.
  - **Tab 1: Reusable Setlist Library**: Filter by category, search by name/tags, tune counts, target duration, circulation badges (`3x deployed`), and assigned gig tags. Actions include **Assign to Gig**, **Edit in Sequencer**, **Duplicate**, and **Delete**.
  - **Tab 2: Gig Setlist Sequences**: Active gig selector, 1-click **Load from Reusable Setlist**, interactive drag/arrow reordering, **Save Sequence as Reusable Setlist**, and direct launch into mobile Stage Mode (`/portal/perform/[gigId]`).
  - **Interactive Setlist Editor Modal**: Full catalog search, tempo/key configuration, segue markers, and performance notes.
  - **Assign Setlist to Gig Modal**: 1-click deployment linking the setlist to the gig call sheet and stage view, automatically incrementing setlist circulation counts and history.

### 5. Catalog & Setlist Analytics Dashboard (`/admin/analytics/catalog`)
- Extended [`src/app/(portal)/admin/analytics/catalog/page.tsx`](file:///c:/repos/eagleburgerband/src/app/(portal)/admin/analytics/catalog/page.tsx) with a dual-tab interface:
  - **Repertoire Health & Rotation**: Chart velocity, heavy rotation, dormant charts, and next-tune transition pairings.
  - **Setlist Circulation & Reuse**: 4 KPI cards (Master Setlists, Total Gig Deployments, Top Reused Setlist, Avg Charts/Setlist), category filters, and an exhaustive utilization table tracking tune count, estimated duration, times reused, last deployed gig, and direct links to Setlist Studio.

### 6. Seed Engine & Emulator Hygiene
- Updated [`scripts/seed.ts`](file:///c:/repos/eagleburgerband/scripts/seed.ts):
  - Added `setlist_manager` role to `superAdminUid` and `Band Director`.
  - Seeded 4 rich reusable setlist templates in Setlist Studio library: `30-Minute Street Parade Block` (parade), `90-Minute Festival Showcase` (festival), `Beer Garden & Porchfest Set` (party), and `Ceremonial Brass Fanfare & Civic March` (ceremony).
  - Seeded diverse gig setlist scenarios:
    - **Saved Library Setlists**: `gig_st_patricks_2026` and `gig_millvale_days_2026` (linked to `30-Minute Street Parade Block`, demonstrating multi-gig reuse analytics), plus `gig_three_rivers_arts_2026` (linked to `90-Minute Festival Showcase`).
    - **Gig-Unique Setlists**: `gig_mattress_factory_2026` (`Garden Party Double-Bill Unique Set`, 4 custom charts with segue and solo cues) and `gig_lawrenceville_porchfest_2026` (`Lawrenceville Porch Crawl Acoustic Set`, 3 porch crawl charts).
    - **Empty Default State**: `gig_bloomfield_2028` (`setlistId: null`, `setlist: []`, displaying the `+ Assign Setlist` action on `/admin/gigs`).
  - Synchronized live stage view documents (`doc(db, "setlists", gigId)`) across all seeded gigs with `isTemplate: false` ensuring immediate stage view availability and zero template deduplication leakage.

### 7. Gig Management Setlist Integration (`/admin/gigs` & `/portal/gigs/[gigId]`)
- **Single-Setlist Architecture & Invariance**:
  - Each gig strictly has exactly one performance setlist (either linked to a reusable master template or tailored as a gig-unique sequence).
  - Added `setlistId`, `setlistName`, and `setlistTitle` to both root `GigSchema` and `InternalLogisticsSchema` with safe `.default("")` values ensuring schema invariance.
- **Empty Setlist Default on Gig Creation**:
  - Gigs created via the "Create New Gig" drawer on `/admin/gigs` always initialize with an empty setlist (`setlist: []`, `setlistId: null`, `setlistName: ""`, `setlistTitle: ""`).
  - An empty live stage view document is atomically created at `doc(db, "setlists", gigId)` with `tunes: []` and `isTemplate: false`.
  - The obsolete "Assign Setlist" dropdown in the creation drawer has been replaced with an informative, user-friendly card explaining that every new gig starts with an empty setlist, ready to be assigned from the library or built uniquely.
- **Unified Setlist Assignment Modal** ([`src/components/portal/GigSetlistAssignmentModal.tsx`](file:///c:/repos/eagleburgerband/src/components/portal/GigSetlistAssignmentModal.tsx)):
  - **Currently Assigned Banner**: Displays the active assigned setlist title and status badge at the top of Tab 1. Includes a 1-click **Remove Setlist** action to reset the gig to an empty setlist.
  - **Tab 1: Use Saved Setlist**: Search and filter by category across master reusable templates, preview tune sequences and usage counts, and 1-click "Assign to Gig" (syncs gig document, stage view document `doc(db, "setlists", gigId)`, and updates template `usageCount` and `assignedGigIds`). If changing from a previous template, automatically unlinks the gig from the prior template.
  - **Tab 2: Build Unique Setlist**: Full sequencer with live catalog picker, BPM, key signatures, performance notes, direct segue cues, and a "Save as Reusable Setlist for Future Gigs" toggle with category and target duration settings. Includes top bar actions to "Remove from Gig" or "Clear Charts (Start Fresh)".
  - **Persistent Dual Sync**: Writes both `setlistId` and `setlistName` / `setlistTitle` directly to the gig document using `setDoc(..., { merge: true })` ensuring atomic persistence.
- **Admin Gig Studio Card Item Display** ([`src/app/(portal)/admin/gigs/page.tsx`](file:///c:/repos/eagleburgerband/src/app/(portal)/admin/gigs/page.tsx)):
  - **Performance Setlist Strip**: Prominently renders the assigned setlist title in bold yellow (`text-sm font-extrabold text-yellow-400`), chart count, and a type pill badge (`[Library Saved]` or `[Gig-Unique]`).
  - **1-Click Removal Action**: When a setlist is assigned, a direct `Remove` (`Trash2`) button on the gig card prompts confirmation and atomically resets the gig's setlist and stage view document while unlinking from prior master templates.
  - **Quick Manage / Assign**: A prominent button opens `GigSetlistAssignmentModal` (labeled "Manage" if a setlist is present, or "+ Assign Setlist" in high-contrast yellow if empty).
  - Accessible to both `gig_manager` and `setlist_manager` roles.
- **Musician Call Sheet & Details** ([`src/app/(portal)/portal/gigs/[gigId]/page.tsx`](file:///c:/repos/eagleburgerband/src/app/(portal)/portal/gigs/[gigId]/page.tsx)):
  - Prominent "Repertoire Setlist" card rendering the assigned setlist title badge (e.g. `[● 30-Minute Street Parade Block]`) directly in the section header.
  - Dedicated tune block supporting both flat tune sequences and legacy grouped sets with tempo, key signature, notes, and segue cues.
  - Quick action to open mobile Stage View (`/portal/perform/[gigId]`).
  - "Manage Setlist" button and empty state "+ Assign or Create Setlist" action for managers.

### 8. Setlist Template Partitioning & Selection Deduplication
- **Root Cause**: Firestore's `setlists` collection stores two document types: reusable master templates (`isTemplate: true`, `gigId: ""`) and per-gig live stage view documents (`isTemplate: false`, `gigId: gigId`). Previously, missing explicit `isTemplate: false` flags on stage view snapshots combined with loose listener filtering (`data.isTemplate !== false`) caused live stage snapshots to be loaded as reusable templates, creating N+1 duplicate entries in selection dropdowns and modals for every gig deployment.
- **Deduplication Helper (`isReusableSetlistTemplate`)**: Added to [`src/lib/schema/setlist.ts`](file:///c:/repos/eagleburgerband/src/lib/schema/setlist.ts) to strictly validate that a document is a reusable template by verifying `isTemplate !== false`, document ID does not start with `gig_`, document has no `gigId`, and has a valid title/name.
- **Clean Partitioning Across All Queries**:
  - [`GigSetlistAssignmentModal.tsx`](file:///c:/repos/eagleburgerband/src/components/portal/GigSetlistAssignmentModal.tsx): Filtered Tab 1 cards with `isReusableSetlistTemplate` and deduplicated by document ID.
  - [`src/app/(portal)/admin/gigs/page.tsx`](file:///c:/repos/eagleburgerband/src/app/(portal)/admin/gigs/page.tsx): Filtered `setlistMap` and `fullSetlists` with `isReusableSetlistTemplate`.
  - [`src/app/(portal)/admin/setlists/page.tsx`](file:///c:/repos/eagleburgerband/src/app/(portal)/admin/setlists/page.tsx): Filtered Setlist Studio library list with `isReusableSetlistTemplate` and deduplicated by ID.
  - [`src/app/(portal)/admin/analytics/catalog/page.tsx`](file:///c:/repos/eagleburgerband/src/app/(portal)/admin/analytics/catalog/page.tsx): Filtered Setlist Usage Analytics with `isReusableSetlistTemplate` and deduplicated by ID.
- **Stage Document Write Guards**: Enforced `isTemplate: false` and `gigId: gigId` on all stage view documents written to `doc(db, "setlists", gigId)` across all assignment, removal, and save handlers.

### 9. Reusable Setlist Title Uniqueness Guardrails
- **Title Collision Validator (`isDuplicateSetlistTitle`)**: Defined in [`src/lib/schema/setlist.ts`](file:///c:/repos/eagleburgerband/src/lib/schema/setlist.ts) to perform case-insensitive and whitespace-normalized validation across existing templates (supporting an `excludeId` parameter when renaming an existing document).
- **Interactive UI Feedback & Disabled Actions**:
  - **Setlist Studio Editor Modal** ([`src/app/(portal)/admin/setlists/page.tsx`](file:///c:/repos/eagleburgerband/src/app/(portal)/admin/setlists/page.tsx)):
    - Reactively checks `isDuplicateEditorTitle`. Highlights title input in `border-rose-500` and displays inline error message `"A setlist with this title already exists in the reusable library. Please choose a unique title."`.
    - Disables "Save to Library" button until a unique title is provided.
    - Prevents duplicates on `handleSaveEditor`, `handleSaveGigAsReusableSetlist`, and automatically appends incremented copy suffixes (`(Copy)`, `(Copy 2)`, etc.) in `handleDuplicateSetlist`.
  - **Gig Setlist Assignment Modal** ([`src/components/portal/GigSetlistAssignmentModal.tsx`](file:///c:/repos/eagleburgerband/src/components/portal/GigSetlistAssignmentModal.tsx)):
    - Reactively checks `isDuplicateCreateTitle` when "Save as Reusable Setlist for Future Gigs" is checked.
    - Renders an inline warning beneath the Title input and disables "Save & Assign to Gig" button.
    - Safely increments clone title suffixes (`(Gig Name)`, `(Gig Name 2)`) when customizing a copy from Tab 1.
    - Throws blocking alerts in `handleSaveAndAssignNew` if a title conflict is attempted.

---

## Verification & Quality Assurance
- **TypeScript**: `npx tsc --noEmit` passes with 0 errors.
- **ESLint**: `npm run lint` passes with 0 errors and 0 warnings.
- **Schema Invariance**: Safe defaults across all new schema fields (`portalThemeMode: "dark"`, `usageCount: 0`, `isTemplate: true`, `tunes: []`).
- **RBAC Guardrails**: Strict permission checks across all modified portal views and components (`canManageGigs`, `canManageSetlists`).


