# Stage 53: Universal Portal Breadcrumb Architecture

## Overview & Scope

Stage 53 introduces a standardized, universal breadcrumb navigation system across every route in the Eagleburger Band Musician Portal and Administrative Studios:

1. **Section Text & Link Text Alignment:**
   - Every portal breadcrumb strictly reflects the category grouping and link text defined in the primary workspace navigation bar (`src/lib/portal/workspaceRegistry.ts`).
   - Breadcrumb section labels directly match the sidebar section titles:
     - `Help, Guides & Docs`
     - `Performances & Logistics`
     - `Personnel & Attendance`
     - `Music & Repertoire`
     - `Website & Intake`
     - `Finance`
     - `Business & Admin`
   - Breadcrumb page links directly match the sidebar tool titles (e.g. `My Profile & SMS Settings`, `Performance Calendar & RSVPs`, `Gig Management Studio`, `Repertoire Catalog`, `CMS Page Studio`, etc.).

2. **Hierarchical Breadcrumb Component (`PortalBreadcrumb`):**
   - Implemented [`src/components/portal/PortalBreadcrumb.tsx`](file:///c:/repos/eagleburgerband/src/components/portal/PortalBreadcrumb.tsx).
   - Dynamically resolves the active section, parent link, and page label based on `usePathname()` matched against `WORKSPACE_TOOLS`.
   - Supports sub-route levels (e.g. `Performances & Logistics > Performance Calendar & RSVPs > [Gig Title]`) with clickable parent links.
   - Allows explicit override props (`section`, `pageTitle`, `pageHref`, `subPage`) when needed.
   - Styled consistently with `text-xs text-slate-400 hover:text-amber-400`, subtle `ChevronRight` separators, and highlighted terminal text.

3. **Universal Route Coverage:**
   - Integrated `<PortalBreadcrumb className="mb-2" />` across all active portal and admin workstation routes:
     - **Help, Guides & Docs:**
       - `/portal/help` (`Help, Guides & Docs > Help & Guides`)
       - `/portal/status-matrix` (`Help, Guides & Docs > Status Matrix & Lifecycle Guide`)
     - **Performances & Logistics:**
       - `/portal/gigs` (`Performances & Logistics > Performance Calendar & RSVPs`)
       - `/portal/gigs/[gigId]` (`Performances & Logistics > Performance Calendar & RSVPs > [Gig Title]`)
       - `/portal/availability` (`Performances & Logistics > Musician Availability & Blackouts`)
       - `/admin/gigs` (`Performances & Logistics > Gig Management Studio`)
       - `/admin/setlists` (`Performances & Logistics > Setlist Studio`)
       - `/admin/checkin` (`Performances & Logistics > Downbeat Check-In`)
       - `/admin/dispatch` (`Performances & Logistics > Call Sheet Dispatch`)
       - `/admin/notifications` (`Performances & Logistics > Email & Broadcast Suite`)
     - **Personnel & Attendance:**
       - `/portal/profile` (`Personnel & Attendance > My Profile & SMS Settings`)
       - `/portal/roster` (`Personnel & Attendance > Member Directory & Roster`)
       - `/portal/notifications` (`Personnel & Attendance > Notifications & Inbox`)
       - `/portal/checkin` (`Personnel & Attendance > My Attendance & Check-In`)
       - `/portal/checkin/[gigId]` (`Personnel & Attendance > My Attendance & Check-In > [Gig Title]`)
       - `/admin/sections` (`Personnel & Attendance > Band Sections`)
       - `/admin/roster` (`Personnel & Attendance > Band Roster & Invites`)
       - `/admin/attendance` (`Personnel & Attendance > Section Attendance`)
       - `/admin/inventory` (`Personnel & Attendance > Equipment & Assets`)
       - `/admin/users` (`Personnel & Attendance > User & Role Studio`)
     - **Music & Repertoire:**
       - `/portal/library` (`Music & Repertoire > Repertoire Catalog`)
       - `/portal/vault` (`Music & Repertoire > Rehearsal Vault`)
       - `/admin/analytics/catalog` (`Music & Repertoire > Repertoire Analytics`)
       - `/admin/suggestions` (`Music & Repertoire > Suggestion Triage & Voting`)
     - **Website & Intake:**
       - `/admin/pages` (`Website & Intake > CMS Page Studio`)
       - `/admin/resources` (`Website & Intake > Media & Resource Library`)
       - `/admin/theme` (`Website & Intake > Brand & Palette`)
       - `/admin/inquiries` (`Website & Intake > Booking Leads`)
       - `/admin/testimonials` (`Website & Intake > Testimonials & Reviews Studio`)
       - `/admin/contact-inbox` (`Website & Intake > General Contact Inbox`)
       - `/admin/auditions` (`Website & Intake > Musician Applications & Auditions`)
     - **Finance:**
       - `/admin/finance` (`Finance > Financial Ledger`)
       - `/portal/reimbursements` (`Finance > Expense Reimbursements`)
       - `/admin/giving` (`Finance > Charitable Giving & Donations`)
     - **Business & Admin:**
       - `/admin` (`Business & Admin > Admin Command Center`)
       - `/admin/contacts` (`Business & Admin > Client CRM & Contacts`)
       - `/admin/comments` (`Business & Admin > Comment Moderation`)
       - `/admin/audit-log` (`Business & Admin > Admin Action Audit Log`)
       - `/admin/analytics/usage` (`Business & Admin > Portal Usage Metrics`)

---

## Execution Checklist & Status

- [x] Created `src/components/portal/PortalBreadcrumb.tsx` with dynamic category and link text resolution.
- [x] Integrated breadcrumbs on all member portal routes.
- [x] Integrated breadcrumbs on dynamic child routes (`/portal/gigs/[gigId]`, `/portal/checkin/[gigId]`).
- [x] Integrated breadcrumbs on all administrative studio routes.
- [x] Replaced legacy/custom breadcrumbs (`/portal/status-matrix`, `/admin/analytics/usage`, `/portal/profile`).
- [x] Clean compiler verification (`npx tsc --noEmit` exited with 0 errors).

