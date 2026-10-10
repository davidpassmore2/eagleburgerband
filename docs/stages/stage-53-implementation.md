# Stage 53: Universal Navigation Breadcrumbs, Section Instrument Catalogs & Apparel Fulfillment

## Overview & Scope

Stage 53 delivers three major feature tracks to the Eagleburger Band platform:
1. **Universal Portal Breadcrumbs:** Standardized hierarchical breadcrumb navigation across all 38+ member portal and admin workstation routes, strictly aligned with category grouping and link text from the navigation bar.
2. **Section Instrument Catalogs & Dual Member Names:** Instrument catalog management within band sections, enabling members to pick active gig instruments, plus dual-name support (Display Name vs. Legal/Real Name).
3. **Member Shirt Sizes & Apparel Fulfillment Studio:** Band apparel preference collection (`XS` through `XXL`), column sorting across administrative tables, and a dedicated Community Manager fulfillment dashboard with real-time analytics and CSV export.

---

## 1. Universal Portal Breadcrumb Architecture

### Alignment with Workspace Registry
- Every portal breadcrumb strictly reflects the category grouping and link text defined in the primary workspace registry (`src/lib/portal/workspaceRegistry.ts`).
- Section labels match sidebar headers exactly:
  - `Help, Guides & Docs`
  - `Performances & Logistics`
  - `Personnel & Attendance`
  - `Music & Repertoire`
  - `Website & Intake`
  - `Finance`
  - `Business & Admin`
- Breadcrumb page links match sidebar tool titles (e.g. `My Profile & SMS Settings`, `Performance Calendar & RSVPs`, `Gig Management Studio`, `Repertoire Catalog`, `CMS Page Studio`, etc.).

### Hierarchical Breadcrumb Component (`PortalBreadcrumb`)
- Implemented [`src/components/portal/PortalBreadcrumb.tsx`](file:///c:/repos/eagleburgerband/src/components/portal/PortalBreadcrumb.tsx).
- Dynamically resolves the active section, parent link, and page label based on `usePathname()` matched against `WORKSPACE_TOOLS`.
- Supports nested sub-route levels (e.g. `Performances & Logistics > Performance Calendar & RSVPs > [Gig Title]`) with clickable parent links.
- Allows explicit override props (`section`, `pageTitle`, `pageHref`, `subPage`) when needed.
- Integrated across all active portal and admin workstation routes, replacing legacy custom implementations.

---

## 2. Section Instrument Catalogs & Dual Member Names

### Dual Names (Real Name vs. Display Name)
- **Schema Invariance:** Added `realName: z.string().default("")` and `selectedInstrument: z.string().default("")` to [`UserSchema`](file:///c:/repos/eagleburgerband/src/lib/schema/user.ts).
- **Profile Management:** Members can edit both their **Display Name** (used across all portal views) and their **Real / Legal Name** in [`/portal/profile`](file:///c:/repos/eagleburgerband/src/app/(portal)/portal/profile/page.tsx).
- **Ensemble Context:** Roster, directory, and admin user views display the member's real name parenthetically when different from their display name.

### Section Instrument Catalogs & Active Gig Selection
- **Section Schema:** Extended [`SectionSchema`](file:///c:/repos/eagleburgerband/src/lib/schema/section.ts) with `instruments: z.array(z.string()).default([])`.
- **Section Studio (`/admin/sections`):**
  - Section managers and admins can create, curate, and remove instruments within each section's catalog.
  - One-click presets for standard brass band sections (Trumpets, Trombones, Saxophones, Tubas/Low Brass, Percussion, Flutes/Woodwinds).
- **Active Gig Instrument Switching:**
  - Members can select their active instrument from their section catalog directly in their profile at any time.
  - Accommodates members who alternate instruments (e.g. Tenor Sax vs. Bari Sax, Cornet vs. Flugelhorn, Snare vs. Bass Drum) between gigs.

---

## 3. Member Shirt Sizes & Apparel Fulfillment Studio

### Member Apparel Preference
- **Schema & Types:** Defined `SHIRT_SIZES = ["XS", "S", "M", "L", "XL", "XXL"] as const` and added `shirtSize: z.string().default("")` to [`UserSchema`](file:///c:/repos/eagleburgerband/src/lib/schema/user.ts).
- **Profile Selector:** Interactive pill selectors in [`/portal/profile`](file:///c:/repos/eagleburgerband/src/app/(portal)/portal/profile/page.tsx) with toggle, clear option, dirty-state comparison, and atomic Firestore updates.

### Column Sorting
- Added interactive sort-by column headers with ascending/descending toggles and visual indicators (`ArrowUp`, `ArrowDown`, `ArrowUpDown`) to:
  - [`/admin/roster`](file:///c:/repos/eagleburgerband/src/app/(portal)/admin/roster/page.tsx) (Member Name, Assigned Section, Status, Invitation Recipient, Timeline).
  - [`/admin/shirt-sizes`](file:///c:/repos/eagleburgerband/src/app/(portal)/admin/shirt-sizes/page.tsx) (Member Name, Shirt Size, Assigned Section, Status).

### Community Manager Management Screen (`/admin/shirt-sizes`)
- **RBAC Guardrails:** Guarded by `canManageShirtSizes(user)` (`admin` and `community_manager` roles), registered in `WORKSPACE_TOOLS` under `"Personnel & Attendance"`.
- **Top Metrics Breakdown:** Real-time summary cards displaying counts and percentages of the ensemble for each size (`XS`, `S`, `M`, `L`, `XL`, `XXL`, and `Unspecified/Needs Size`), with instant filter clicking.
- **Search & Filters:** Search by name, real name, email, or section, with status toggle (`Active Only` vs. `All Statuses`).
- **CSV Fulfillment Export:**
  - Prominent download button generating a clean CSV file with `Member Name,Shirt Size`.
  - Includes a bottom summary breakdown cell formatted specifically for merchandise ordering:
    ```csv
    Member Name,Shirt Size
    Gina Grotelueschen,M
    Joelle Levitt Killebrew,L
    ...
    Total Summary,"XS: 1 | S: 2 | M: 3 | L: 2 | XL: 1 | XXL: 0 | Unspecified: 0 (Total: 9)"
    ```

---

## Stage 53 Verification Checklist

- [x] Universal `PortalBreadcrumb` component deployed across all 38+ portal and admin pages.
- [x] Breadcrumb section and link labels strictly match `workspaceRegistry.ts`.
- [x] `realName` and `selectedInstrument` added to `UserSchema` with safe defaults.
- [x] `instruments` catalog added to `SectionSchema` with safe defaults and preset catalogs.
- [x] Section managers can curate section instruments in `/admin/sections`.
- [x] Members can select their active instrument and edit real/display names in `/portal/profile`.
- [x] `shirtSize` field added to `UserSchema` and `SHIRT_SIZES` validated (`XS`, `S`, `M`, `L`, `XL`, `XXL`).
- [x] Interactive shirt size selector integrated into member profile with dirty-state handling.
- [x] Column header sorting implemented on admin roster and shirt size tables.
- [x] `/admin/shirt-sizes` created with RBAC guardrails (`admin`, `community_manager`).
- [x] Top metric cards calculating real-time apparel breakdowns.
- [x] CSV export generated with two-column member data and a bottom summary breakdown cell.
- [x] TypeScript compilation verified clean (`npx tsc --noEmit` exited with 0 errors).
- [x] ESLint verified clean with 0 errors and 0 warnings.
