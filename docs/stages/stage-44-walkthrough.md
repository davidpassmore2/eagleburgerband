# Stage 44: Public Media, Admin Event Selector Columns & Catalog Member Ratings Walkthrough

## Summary of Completed Work
Stage 44 delivers visual polish to the public website, enhanced privacy and CMS controls, streamlined event management workflows in Call Sheet Dispatch and Section Attendance, and a member 1-5 star song rating and commenting feature in the member portal library catalog.

---

## 1. Schema Enhancements & Zod Invariance
All schema modifications were introduced in `src/lib/schema/` with safe `.default()` values to guarantee schema invariance across existing Firestore documents.

- **`src/lib/schema/siteConfig.ts`**:
  - `headerBackgroundOpacity`: Number clamped `0..100` with default `95`.
  - `footerDescription`: Dynamic string default set to `DEFAULT_FOOTER_DESCRIPTION`.
- **`src/lib/schema/testimonial.ts`**:
  - `visibilityPreference`: Enum (`"public" | "private"`) with default `"public"`.
- **`src/lib/schema/gig.ts`**:
  - `headerImageUrl`: URL string default `""`.
  - `headerImageAlt`: String default `""`.
  - `headerImageOverlayOpacity`: Number clamped `0..100` with default `60`.
  - `headerImageHeightPreset`: Enum (`"compact" | "default" | "tall"`) with default `"default"`.
  - `headerImageVerticalPosition`: Enum (`"top" | "center" | "bottom"`) with default `"center"`.
- **`src/lib/schema/tune.ts`**:
  - `ratings`: Map of `userId -> score (1..5)` with default `{}`.
  - `ratingAverage`: Float clamped `0..5` with default `0`.
  - `ratingCount`: Integer with default `0`.
  - `calculateTuneScore(ratings)`: Pure helper function computing rounded average and total review count.

---

## 2. Public Header & Footer Improvements
- **Public Header Navigation (`src/components/public/PublicHeaderNav.tsx`)**:
  - Applied subtle elevation shadow (`shadow-md`).
  - Fetched and applied dynamic `headerBackgroundOpacity` from `site_navigation/config`, allowing CMS managers to dial in background transparency.
- **Public Footer (`src/components/public/PublicFooter.tsx`)**:
  - Replaced the static footer paragraph with `footerDescription` pulled dynamically from `site_navigation/config`.
- **CMS Page Studio (`src/app/(portal)/admin/pages/page.tsx`)**:
  - Added background opacity slider under the Header Navigation tab.
  - Added dynamic footer description textarea in the Footer & Social Links tab with real-time editing and persistence.

---

## 3. Testimonials Experience & Privacy Controls
- **Public Testimonials Page (`src/app/(public)/testimonials/page.tsx`)**:
  - Fixed HTML entity rendering (`&bull;`, etc.) using `DOMPurify.sanitize`.
  - Made submitter name required during testimonial submission.
  - Added a Public vs. Private visibility preference radio group:
    - **Public:** Submitter name and quote may appear on the public website.
    - **Private:** Quote is for band leadership / internal eyes only.
  - Updated the acknowledgement checkbox text: *"I confirm this is a genuine testimonial and understand the Eagleburger Band will respect my selected visibility preference."*
- **Admin Moderation (`src/app/(portal)/admin/testimonials/page.tsx`)**:
  - Added a visible badge indicating whether a submission was marked **Public** or **Private** by the author.

---

## 4. Public Gigs Custom Image Headers
- **CMS Gig Manager (`src/app/(portal)/admin/gigs/page.tsx`)**:
  - Added a custom image header picker section to the gig edit modal.
  - Integrated with the existing Resource Asset Picker modal to allow seamless selection of Cloudinary or uploaded images.
  - Added controls for image alt text, height preset (`compact`, `default`, `tall`), vertical position (`top`, `center`, `bottom`), and overlay opacity.
- **Public Gig Detail (`src/app/(public)/gigs/[id]/page.tsx`)**:
  - Renders custom gig banner hero images matching the content width (`max-w-6xl`), maintaining consistency with the public site design system.

---

## 5. Vertical Event Selector Columns for Dispatch & Attendance Studios
Previously, both the Call Sheet Dispatch and Section Attendance studio pages rendered event selections as a horizontal row of cards. As the calendar expanded, horizontal scrolling hindered discovery and fast switching.

- **Call Sheet Dispatch (`src/app/(portal)/admin/dispatch/page.tsx`)**:
  - Re-architected into a 12-column responsive layout:
    - Left column (`lg:col-span-8`): Active event dispatch workspace, call sheet generator, and notification controls.
    - Right column (`lg:col-span-4`): Sticky vertical event selector with live text search, date order sorting, status filter pills (`All`, `Upcoming`, `Past`), and visual indicators for unfinalized call sheets.
- **Section Attendance Studio (`src/app/(portal)/admin/attendance/page.tsx`)**:
  - Re-architected into a 12-column responsive layout:
    - Left column (`lg:col-span-8`): Selected event roster, section check-ins, and quorum health tracker.
    - Right column (`lg:col-span-4`): Sticky vertical event selector with live search, filters, and status badges.
  - Carefully ordered React hooks (`useMemo`, `useState`) prior to permission/loading early returns to ensure unconditional hook execution.

---

## 6. Member 1-5 Star Song Rating & Comments System
To facilitate repertoire feedback separate from setlist suggestions, band members can now directly rate and comment on tunes within the member library catalog.

- **Interactive Star Rating Component (`src/components/portal/StarRating.tsx`)**:
  - Accessible, responsive 5-star rating widget supporting interactive clicks, keyboard navigation, hover preview, and read-only displays.
  - Implemented fixed-width hover badge container (`w-[58px]`) to ensure no visual layout jitter occurs when hovering between rating stars.
- **Tune Comments Modal (`src/components/portal/TuneCommentsModal.tsx`)**:
  - Combined comments and member rating studio: members can rate the song directly at the top of the modal with fixed-width card stability (`sm:w-[215px]`) and leave comments or feedback.
- **Member Library Catalog (`src/app/(portal)/portal/library/page.tsx`)**:
  - Added aggregate 1-5 star score display (`★ 4.8 (12)`) to all song cards and table rows.
  - Embedded the interactive `StarRating` widget directly on song cards for one-click member rating updates.
  - Added new catalog sort options:
    - **Highest Rated (1-5 Stars)**
    - **Most Rated (Reviews Count)**
  - Direct access to tune discussion threads via the comment action button.

---

## 7. Verification Results
- **TypeScript:** `npx tsc --noEmit` passed with 0 errors.
- **ESLint:** `npm run lint` passed with 0 warnings.
- **Production Build:** `npm run build` compiled all 63 static and dynamic routes cleanly.
