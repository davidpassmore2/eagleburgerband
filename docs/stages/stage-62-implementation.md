# Stage 62: Universal Portal Section Homepages & Hierarchical Breadcrumbs

## Overview & Scope

Stage 62 establishes a cohesive, hierarchical navigation architecture for the Musician & Management Portal. Portal breadcrumbs now consistently begin with **"Portal Home"**, followed by an interactive link to the active section homepage (e.g. **"Music & Repertoire"**), and concluding with the specific tool or sub-page (e.g. **"Song Catalog"** > **"Details"**).

To support this model, dedicated section homepages were created for each of the 7 core portal categories, complete with role-based tool directories, introductory guides, and structured "What Can I Do in This Section?" information areas ready for future expansion.

---

## 1. Section Model & Metadata Registry

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

## 2. Hierarchical Portal Breadcrumbs

- **File Modified:** [`src/components/portal/PortalBreadcrumb.tsx`](file:///c:/repos/eagleburgerband/src/components/portal/PortalBreadcrumb.tsx)
- **Key Enhancements:**
  - **Always Begins with "Portal Home":** First item is always an interactive link to `/portal` (`Portal Home`).
  - **Section Linking:** Second item links to the specific section homepage (`/portal/sections/[slug]`). When already viewing a section homepage, this item serves as the active title.
  - **Sub-Areas & Tool Pages:** Third item displays the tool name (e.g. `Song Catalog`), and when on deeper routes (e.g. call sheet details, downbeat check-in), provides a link back to the tool parent alongside the active sub-page name.
  - **Clean Root & Index Handling:** Cleanly formats breadcrumbs for `/portal` (`Portal Home`) and `/portal/sections` (`Portal Home` > `Portal Sections`).

---

## 3. Section Homepages & Tools Directory

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

## 4. Sidebar Category Integration

- **File Modified:** [`src/app/(portal)/layout.tsx`](file:///c:/repos/eagleburgerband/src/app/(portal)/layout.tsx)
- **Changes:**
  - Connected category section titles in the sidebar to `getSectionHref(section.id)`, enabling users to click category headers directly to open that section's homepage.

