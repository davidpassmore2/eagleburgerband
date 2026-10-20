# Stage 64: Public Polish, Cloudinary Upload Resilience, Repertoire List Layout & Setlist Navigation

## Overview & Scope

Stage 64 delivers comprehensive public website refinements, media engine hardening, catalog workstation modernization, and portal navigation alignment for the Eagleburger Band web application.

Key deliverables include:
1. **Admin Gig Dispatch Labeling**: Clarifying call sheet communication with explicit "Dispatch to Confirmed" actions.
2. **Cloudinary Upload Resilience**: Hardening CMS asset and banner image uploading with robust unsigned preset configurations and fallback handling.
3. **Public Page Spacing & Typography Polish**: Eliminating double-rendered CTA banners, removing artificial gradient lines from header banners, retaining crisp border boundaries, and unifying top padding across all public routes.
4. **Overlay Typography Drop Shadows**: Introducing a configurable toggle in the CMS Page Banner Manager and HeroSection component for subtle text shadows on hero imagery.
5. **Song Catalog Single-Line Scannable List Layout**: Redesigning the Song Catalog from multi-column grid cards to a single-line, highly scannable list view with aligned metadata badges.
6. **Setlist Studio & Song Suggestion Navigation Unification**: Relocating Setlist Studio to "Music & Repertoire" and linking the "+ Add New Song" button directly to Suggestion Triage with an active submission form.

---

## 1. Admin Gig Dispatch Workflow Alignment

### Target Files: [`src/app/(portal)/admin/gigs/page.tsx`](file:///c:/repos/eagleburgerband/src/app/(portal)/admin/gigs/page.tsx)
- Replaced ambiguous "Call Sheet" button label with explicit **"Dispatch to Confirmed"** on confirmed gig cards.
- Directly indicates to gig managers that clicking will trigger automated email and SMS call sheet dispatches to all confirmed musicians for that performance.

---

## 2. Cloudinary Media Upload Resilience

### Target Files: [`src/components/cms/CloudinaryUploadWidget.tsx`](file:///c:/repos/eagleburgerband/src/components/cms/CloudinaryUploadWidget.tsx), [`src/app/api/cloudinary/upload/route.ts`](file:///c:/repos/eagleburgerband/src/app/api/cloudinary/upload/route.ts)
- Addressed failures where Cloudinary unsigned upload presets were misconfigured or rejecting direct client uploads.
- Added automatic fallback to server-assisted or verified unauthenticated presets (`eagleburger_unsigned`, `ml_default`).
- Added robust error surfacing to toast alerts so administrators immediately know if environment keys or presets need adjustment.

---

## 3. Public System Pages Layout & Vertical Rhythm

### Target Files: [`src/app/(public)/gigs/page.tsx`](file:///c:/repos/eagleburgerband/src/app/(public)/gigs/page.tsx), [`src/components/public/HeroSection.tsx`](file:///c:/repos/eagleburgerband/src/components/public/HeroSection.tsx), [`src/app/(public)/layout.tsx`](file:///c:/repos/eagleburgerband/src/app/(public)/layout.tsx)
1. **Deduplication of CTA Banner**:
   - Resolved an issue on `/gigs` where the Call-To-Action banner was rendered both from dynamic CMS sections and a hardcoded component. Scoped section rendering to prevent double output.
2. **Header Banner Image Boundary Refinement**:
   - Removed the artificial gradient line overlay from banner images that was introducing visual artifacts across public pages.
   - Preserved the clean, modern `border-b border-slate-800` divider line separating hero imagery from page content.
3. **Consistent Vertical Rhythm**:
   - Established unified `first:pt-8 first:sm:pt-12` padding across public system routes (`/gigs`, `/book`, `/join`, `/giving`, `/contact`, `/testimonials`), resolving awkward whitespace jumps below header banners.
4. **Filter Control Spacing on `/gigs`**:
   - Balanced top and bottom padding around the Upcoming / Past gig toggle controls for seamless alignment with gig cards.

---

## 4. Configurable Typography Drop Shadows

### Target Files: [`src/lib/schema/pageBanner.ts`](file:///c:/repos/eagleburgerband/src/lib/schema/pageBanner.ts), [`src/components/cms/HeroSection.tsx`](file:///c:/repos/eagleburgerband/src/components/cms/HeroSection.tsx), [`src/app/(portal)/admin/banners/page.tsx`](file:///c:/repos/eagleburgerband/src/app/(portal)/admin/banners/page.tsx)
- Extended the CMS Page Banner schema with `textShadow?: boolean` (defaulting safely to `false` per Schema Invariance Rule 2).
- Added an intuitive toggle switch in the Banner Manager Studio.
- When enabled, applies a tasteful, high-contrast drop shadow (`drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]`) to title and subtitle overlay typography, ensuring legibility against bright or busy photographic backgrounds.

---

## 5. Song Catalog Single-Line Scannable List Layout

### Target Files: [`src/app/(portal)/portal/library/page.tsx`](file:///c:/repos/eagleburgerband/src/app/(portal)/portal/library/page.tsx)
- Transformed the catalog layout from a 2-column grid to a single-card-per-line list view.
- Engineered a structured, horizontal row containing:
  - Song title and composer/artist attribution.
  - BPM tempo badge (`120 BPM`).
  - Musical key indicator (`Bb Major`).
  - Arranger badge and genre tags.
  - Star rating and community score.
  - Quick action controls (Audio Reference player, PDF Charts, Edit/Delete modal triggers for catalog managers).
- Significantly improves sorting intuitiveness and scannability when filtering large repertoires.

---

## 6. Setlist Studio & Suggestion Triage Navigation Unification

### Target Files:
- [`src/lib/portal/workspaceRegistry.ts`](file:///c:/repos/eagleburgerband/src/lib/portal/workspaceRegistry.ts)
- [`src/lib/portal/portalSections.ts`](file:///c:/repos/eagleburgerband/src/lib/portal/portalSections.ts)
- [`src/app/(portal)/portal/library/page.tsx`](file:///c:/repos/eagleburgerband/src/app/(portal)/portal/library/page.tsx)
- [`src/app/(portal)/admin/suggestions/page.tsx`](file:///c:/repos/eagleburgerband/src/app/(portal)/admin/suggestions/page.tsx)

### Architectural Changes:
1. **Workspace Tool Relocation**:
   - Moved `setlists` from `category: "Performances & Logistics"` to `category: "Music & Repertoire"` directly alongside the Song Catalog and Rehearsal Vault.
   - Updated `portalSections.ts` to document setlist curation in the Music & Repertoire section hub.
   - Dynamic breadcrumb resolution automatically updates breadcrumbs on `/admin/setlists` to `Portal Home > Music & Repertoire > Setlist Studio`.
2. **Song Catalog Add Action**:
   - Updated the **`+ Add New Song`** button in the Song Catalog to route to `/admin/suggestions?category=tune_request&action=new`, upholding band governance where all new tunes enter via triage and voting.
   - Added a sibling **`Song Suggestions`** button linking to `/admin/suggestions?category=tune_request` for browsing existing tune requests.
3. **Suggestion Triage Query Param Synchronization**:
   - In `SuggestionTriagePage`, added `useSearchParams()` support:
     - Detects `category=tune_request` to pre-select the Tune Request tab and initialize the form category.
     - Detects `action=new` to automatically open the submission form (`isCreating = true`).
   - Wrapped the entire workstation in `<Suspense>` for Next.js App Router boundary compliance.

---

## 7. Verification & Type Safety

- Executed `npx tsc --noEmit`: Confirmed **0 errors** across all TypeScript files.
- Verified Next.js client-side Suspense boundaries on all search-parameter-dependent routes.

