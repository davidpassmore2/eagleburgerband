# Stage 44: Public Media, Admin Event Selector Columns & Catalog Member Ratings Implementation Plan

## Problem Statement & Goals
Stage 44 addresses user experience, CMS media customization, admin workflow efficiency, and community engagement across both public and member portal surfaces:
1. **Public Site Header & Footer Enhancements:** Add drop shadow and customizable header background opacity via CMS. Make the public footer description dynamically editable in the CMS.
2. **Testimonial Experience & Privacy:** Resolve HTML entity rendering issues in public testimonials, make name submission mandatory, and introduce a public/private visibility preference toggle with clear acknowledgement wording.
3. **Public Gig Custom Image Headers:** Allow gig managers to attach hero banner images to individual gigs using the CMS resource asset picker, rendering them on the public gig detail page aligned with content width.
4. **Admin Event Selection Workflow Redesign:** Redesign both the Call Sheet Dispatch and Section Attendance Studio from horizontal card rows into responsive 2-column layouts featuring a sticky, searchable vertical event selector on the right.
5. **Member Song Rating & Comments System:** Enable band members to rate tunes in the repertoire catalog on a 1-5 star scale with real-time aggregate score calculation, interactive fixed-width rating controls, and dedicated song comment threads.

---

## Scope & Target Locations

### 1. Zod Schemas & Invariance (`src/lib/schema/`)
- **`siteConfig.ts`**:
  - Add `headerBackgroundOpacity: z.number().min(0).max(100).default(95)` to `SiteNavigationSchema`.
  - Add `footerDescription: z.string().default(DEFAULT_FOOTER_DESCRIPTION)` to `SiteNavigationSchema`.
- **`testimonial.ts`**:
  - Add `visibilityPreference: z.enum(["public", "private"]).default("public")` to `TestimonialSchema`.
- **`gig.ts`**:
  - Add `headerImageUrl: z.string().default("")`.
  - Add `headerImageAlt: z.string().default("")`.
  - Add `headerImageOverlayOpacity: z.number().min(0).max(100).default(60)`.
  - Add `headerImageHeightPreset: z.enum(["compact", "default", "tall"]).default("default")`.
  - Add `headerImageVerticalPosition: z.enum(["top", "center", "bottom"]).default("center")`.
- **`tune.ts`**:
  - Add `ratings: z.record(z.string(), z.number().min(1).max(5)).default({})`.
  - Add `ratingAverage: z.number().min(0).max(5).default(0)`.
  - Add `ratingCount: z.number().min(0).default(0)`.
  - Export pure helper `calculateTuneScore(ratings: Record<string, number>)`.

### 2. Public Site Experience
- **Public Header (`src/components/public/PublicHeaderNav.tsx`)**:
  - Apply drop shadow (`shadow-md`) to navigation bar.
  - Dynamically read `headerBackgroundOpacity` from Firestore `site_navigation/config` to adjust backdrop opacity.
- **Public Footer (`src/components/public/PublicFooter.tsx`)**:
  - Dynamically read and render `footerDescription` from Firestore `site_navigation/config`.
- **Testimonials Page (`src/app/(public)/testimonials/page.tsx`)**:
  - Sanitize and unescape HTML entities using `DOMPurify.sanitize`.
  - Require author name in submission modal.
  - Add public vs. private visibility preference radio/toggle.
  - Update acknowledgement checkbox text to guarantee the band respects visibility preferences.
- **Public Gig Detail (`src/app/(public)/gigs/[id]/page.tsx`)**:
  - Render custom image hero banner matching `max-w-6xl` content width when configured.

### 3. CMS & Admin Portals
- **CMS Pages Studio (`src/app/(portal)/admin/pages/page.tsx`)**:
  - Add header background opacity slider in Global Public Site Nav & Alerts settings.
  - Add footer description textarea in Footer & Social Links tab.
- **Testimonial Moderation (`src/app/(portal)/admin/testimonials/page.tsx`)**:
  - Display public/private visibility badge in moderation table.
- **Gig Manager (`src/app/(portal)/admin/gigs/page.tsx`)**:
  - Add custom header image configuration card with Cloudinary/resource asset picker modal integration.
- **Call Sheet Dispatch (`src/app/(portal)/admin/dispatch/page.tsx`)**:
  - Transform horizontal event row into 12-column layout with sticky right-hand event selector column, search, status filters, and date sorting.
- **Section Attendance Studio (`src/app/(portal)/admin/attendance/page.tsx`)**:
  - Transform horizontal event row into 12-column layout with sticky right-hand event selector column, search, status filters, and date sorting.

### 4. Member Repertoire Library & Song Ratings
- **Star Rating Component (`src/components/portal/StarRating.tsx`)**:
  - Build reusable 1-5 star interactive rating component with fixed-width hover badge to eliminate layout jitter.
- **Tune Comments Modal (`src/components/portal/TuneCommentsModal.tsx`)**:
  - Integrate interactive star rating widget with fixed width card and real-time discussion thread.
- **Library Catalog Page (`src/app/(portal)/portal/library/page.tsx`)**:
  - Display aggregate star score and member rating controls on tune cards.
  - Add sorting options for "Highest Rated (1-5 Stars)" and "Most Rated (Reviews Count)".

---

## Verification Gates
1. `npx tsc --noEmit` exits with 0.
2. `npm run lint` exits with 0.
3. `npm run build` compiles all routes without errors.
