# Stage 61: CMS Modernization for Public System Pages, Smart Form Wrappers, Portal Section Homepages & Hierarchical Breadcrumbs

## Overview & Scope

Stage 61 modernizes both public site content management and internal portal navigation:
1. **CMS Modernization for Public System Pages:**
   - Transitioned all 7 public pages (`/home`, `/gigs`, `/book`, `/join`, `/testimonials`, `/giving`, and `/contact`) from static/hardcoded markup into fully dynamic CMS-driven experiences managed through Pages Studio (`/admin/pages`).
   - Built smart form wrapper components (`AuditionFormSection`, `ContactFormSection`) preserving 100% of validated form logic, anti-bot honeypots, and Firestore writes while exposing editorial fields (headlines, pitches, badge text, button labels) to CMS editors.
   - Expanded `SectionTypeEnum` to 14 supported section types and populated complete default sections in `DEFAULT_SYSTEM_PAGES`.
   - Engineered safe fallback guards across public routes preventing broken layouts if sections are removed.
2. **Universal Portal Section Homepages & Hierarchical Breadcrumbs:**
   - Redesigned `PortalBreadcrumb` so portal breadcrumbs consistently begin with **"Portal Home"** (`/portal`), followed by an interactive link to the active section homepage (e.g. **"Music & Repertoire"**), and concluding with the specific tool or sub-page.
   - Built dedicated section homepages for each of the 7 core portal categories (`/portal/sections/[slug]`) and an all-sections index (`/portal/sections`), featuring role-filtered tool directories and initial structured "What Can I Do in This Section?" information areas.
   - Connected sidebar category headers directly to their section homepages.

---

## 1. Schema Definitions & Default System Pages

- **File Modified:** [`src/lib/schema/page.ts`](file:///c:/repos/eagleburgerband/src/lib/schema/page.ts)
- **Key Changes:**
  - Added `AuditionFormSectionSchema`:
    ```typescript
    export const AuditionFormSectionSchema = z.object({
      id: z.string().default(() => `audition-form-${Date.now()}`),
      type: z.literal("audition_form"),
      headline: z.string().default("Ready to Join the Sound?"),
      subheadline: z.string().default("Tell us about your background, instruments, and experience..."),
      badgeText: z.string().default("Audition Form"),
      buttonText: z.string().default("Submit Audition Request"),
      compact: z.boolean().default(false),
    });
    ```
  - Added `ContactFormSectionSchema`:
    ```typescript
    export const ContactFormSectionSchema = z.object({
      id: z.string().default(() => `contact-form-${Date.now()}`),
      type: z.literal("contact_form"),
      headline: z.string().default("Send Us a Message"),
      subheadline: z.string().default("Have a question, feedback, or a general inquiry?"),
      badgeText: z.string().default("Get in Touch"),
      buttonText: z.string().default("Send Message"),
    });
    ```
  - Extended `SectionTypeEnum` with `"audition_form"` and `"contact_form"` (14 total section types).
  - Populated default section stacks for `book`, `join`, `contact`, `giving`, `testimonials`, `gigs`, and `home`.

---

## 2. Smart Form Wrappers & Section Renderer

- **Files Created:**
  - [`src/components/public/AuditionFormSection.tsx`](file:///c:/repos/eagleburgerband/src/components/public/AuditionFormSection.tsx)
  - [`src/components/public/ContactFormSection.tsx`](file:///c:/repos/eagleburgerband/src/components/public/ContactFormSection.tsx)
- **Files Modified:**
  - [`src/components/cms/PublicSectionRenderer.tsx`](file:///c:/repos/eagleburgerband/src/components/cms/PublicSectionRenderer.tsx)
- **Capabilities:**
  - Retains client-side validation using Zod (`AuditionSubmissionSchema`, `ContactSubmissionSchema`), anti-bot honeypots (`website_check`), and direct Firestore writes (`audition_submissions`, `contact_submissions`).
  - Supports CMS customization of header text, pitch paragraphs, pill badges, and submission button labels.

---

## 3. Public Routes Refactoring & Fallback Protections

- **Files Modified:**
  - [`src/app/(public)/join/page.tsx`](file:///c:/repos/eagleburgerband/src/app/(public)/join/page.tsx): Refactored from 634 hardcoded lines to dynamic CMS section rendering with fallback to `AuditionFormSection` and audition requirements cards.
  - [`src/app/(public)/contact/page.tsx`](file:///c:/repos/eagleburgerband/src/app/(public)/contact/page.tsx): Refactored to render dynamic CMS sections with fallback to `ContactFormSection` and direct contact channel cards.
  - [`src/app/(public)/book/page.tsx`](file:///c:/repos/eagleburgerband/src/app/(public)/book/page.tsx): Render dynamic CMS sections; fallback to `BookingFormSection` if `booking_form` is not configured in sections.
  - [`src/app/(public)/gigs/page.tsx`](file:///c:/repos/eagleburgerband/src/app/(public)/gigs/page.tsx): Renders custom CMS sections at the bottom with a fallback booking banner.
  - [`src/app/(public)/giving/page.tsx`](file:///c:/repos/eagleburgerband/src/app/(public)/giving/page.tsx): Renders CMS sections cleanly with fallback for sponsor/donor CTAs.
  - [`src/app/(public)/testimonials/page.tsx`](file:///c:/repos/eagleburgerband/src/app/(public)/testimonials/page.tsx): Fixed section mapping loop to allow dynamic CMS sections.

---

## 4. CMS Pages Studio Integration

- **File Modified:** [`src/app/(portal)/admin/pages/page.tsx`](file:///c:/repos/eagleburgerband/src/app/(portal)/admin/pages/page.tsx)
- **Capabilities:**
  - Added `Audition Form` and `Contact Form` to the "Add Section" dropdown with `Music` and `Mail` icons.
  - Implemented field editors for both new form section types.
  - Added automatic default hydration for all system pages if their saved sections list is empty, allowing immediate editing of defaults without manual recreation.

---

## 5. Portal Section Model & Metadata Registry

- **File Created:** [`src/lib/portal/portalSections.ts`](file:///c:/repos/eagleburgerband/src/lib/portal/portalSections.ts)
- **Key Capabilities:**
  - Standardized all 7 core portal sections with consistent URL slugs, Lucide icons, badges, descriptions, and color accents:
    1. **Help, Guides & Docs** (`/portal/sections/help-docs`)
    2. **Performances & Logistics** (`/portal/sections/performances-logistics`)
    3. **Personnel & Attendance** (`/portal/sections/personnel-attendance`)
    4. **Music & Repertoire** (`/portal/sections/music-repertoire`)
    5. **Website & Intake** (`/portal/sections/website-intake`)
    6. **Finance** (`/portal/sections/finance`)
    7. **Business & Admin** (`/portal/sections/business-admin`)
  - Defined initial "What Can I Do in This Section?" action highlights tailored to each category.
  - Provided lookup helpers: `getSectionByCategory()`, `getSectionBySlug()`, and `getSectionHref()`.

---

## 6. Hierarchical Portal Breadcrumbs

- **File Modified:** [`src/components/portal/PortalBreadcrumb.tsx`](file:///c:/repos/eagleburgerband/src/components/portal/PortalBreadcrumb.tsx)
- **Key Enhancements:**
  - **Always Begins with "Portal Home":** First item is always an interactive link to `/portal` (`Portal Home`).
  - **Section Linking:** Second item links to the specific section homepage (`/portal/sections/[slug]`). When already viewing a section homepage, this item serves as the active title.
  - **Sub-Areas & Tool Pages:** Third item displays the tool name (e.g. `Song Catalog`), and when on deeper routes (e.g. call sheet details, downbeat check-in), provides a link back to the tool parent alongside the active sub-page name.
  - **Clean Root & Index Handling:** Cleanly formats breadcrumbs for `/portal` (`Portal Home`) and `/portal/sections` (`Portal Home` > `Portal Sections`).

---

## 7. Section Homepages & Tools Directory

- **Files Created:**
  - [`src/app/(portal)/portal/sections/[slug]/page.tsx`](file:///c:/repos/eagleburgerband/src/app/(portal)/portal/sections/%5Bslug%5D/page.tsx): Server component with `generateStaticParams()` enabling compile-time static site generation for all 7 section paths.
  - [`src/components/portal/PortalSectionView.tsx`](file:///c:/repos/eagleburgerband/src/components/portal/PortalSectionView.tsx): Client view displaying:
    - Section hero banner with icon glow, badge, and live tool counter.
    - **"What Can I Do in This Section?"** structured capability cards.
    - Role-authorized **Tools & Sub-Areas** cards filtered via `hasRole(profile, role)`.
    - Cross-section quick navigation footer.
    - Resilient 404 fallback for unrecognized section slugs.
  - [`src/app/(portal)/portal/sections/page.tsx`](file:///c:/repos/eagleburgerband/src/app/(portal)/portal/sections/page.tsx): Overview directory listing all 7 portal sections with live authorized tool counts.

---

## 8. Sidebar Category Integration

- **File Modified:** [`src/app/(portal)/layout.tsx`](file:///c:/repos/eagleburgerband/src/app/(portal)/layout.tsx)
- **Changes:**
  - Connected category section titles in the sidebar to `getSectionHref(section.id)`, enabling users to click category headers directly to open that section's homepage.
