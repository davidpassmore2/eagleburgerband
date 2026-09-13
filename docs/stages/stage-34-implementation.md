# Stage 34: Portal Workspace Taxonomy Unification & Help Center Knowledge Base Overhaul

## Overview
Stage 34 restructures the categorization, navigation taxonomy, and documentation architecture across the Eagleburger Band platform:
1. **Unified Category Taxonomy**: Consolidates CMS and intake tools (`pages`, `brand`, `inquiries`, `testimonials`, `contact-inbox`, `auditions`) under the single dedicated category **"Website & Intake"**. Consolidates financial management tools (`finance`, `reimbursements`, `giving`) under **"Finance"**.
2. **Navigation & Registry Realignment**: Updates `workspaceRegistry.ts`, the portal navigation shell (`layout.tsx`), and the administrative tools directory (`admin/page.tsx`) to adopt the new categories and order.
3. **Comprehensive Knowledge Base Overhaul**: Overhauls [`src/app/(portal)/portal/help/page.tsx`](file:///c:/repos/eagleburgerband/src/app/(portal)/portal/help/page.tsx) with route documentation for all recently introduced workspaces (including Live Performance Stage View, Musician Check-In, Member PWA, Admin Check-In, Reimbursements, Testimonials, Auditions, Contact Inbox, and Audit Log), dynamic icon rendering via `getRouteIcon`, dynamic workspace count tracking, and 1:1 category filtering.

---

## Technical Architecture & Changes

### 1. Workspace Registry ([`src/lib/portal/workspaceRegistry.ts`](file:///c:/repos/eagleburgerband/src/lib/portal/workspaceRegistry.ts))
- **`ToolCategory` Type**: Updated from `"Business & Public Web"` to `"Website & Intake"` and `"Finance"`.
- **Category Reassignments**:
  - `pages`: Reassigned from `"Business & Public Web"` to `"Website & Intake"`.
  - `brand`: Reassigned from `"Business & Public Web"` to `"Website & Intake"`.
  - `inquiries`: Reassigned from `"Business & Public Web"` to `"Website & Intake"`.
  - `testimonials`: Reassigned to `"Website & Intake"`.
  - `contact-inbox`: Reassigned to `"Website & Intake"`.
  - `auditions`: Reassigned to `"Website & Intake"`.
  - `finance`: Reassigned from `"Business & Public Web"` to `"Finance"`.
  - `reimbursements`: Reassigned to `"Finance"`.
  - `giving`: Reassigned to `"Finance"`.

### 2. Portal Layout Navigation Shell ([`src/app/(portal)/layout.tsx`](file:///c:/repos/eagleburgerband/src/app/(portal)/layout.tsx))
- **`CATEGORY_ORDER`**: Updated array sequence to:
  ```ts
  const CATEGORY_ORDER: ToolCategory[] = [
    "Musician Essentials",
    "Performances & Logistics",
    "Personnel & Attendance",
    "Music & Repertoire",
    "Website & Intake",
    "Finance",
    "Business & Admin",
  ];
  ```

### 3. Admin Tools Directory ([`src/app/(portal)/admin/page.tsx`](file:///c:/repos/eagleburgerband/src/app/(portal)/admin/page.tsx))
- **`CATEGORIES`**: Replaced `"Business & Public Web"` with distinct `"Website & Intake"` and `"Finance"` category sections, complete with corresponding icons (`Globe` and `DollarSign`), titles, and descriptions.

### 4. Help Documentation Center ([`src/app/(portal)/portal/help/page.tsx`](file:///c:/repos/eagleburgerband/src/app/(portal)/portal/help/page.tsx))
- **Taxonomy Alignment**:
  - `HelpCategory` type and route doc categories updated to include `"Website & Intake"` and `"Finance"`.
  - Replaced filter pill buttons to cleanly map to the new categories.
- **Dynamic Feature Routing & Icons**:
  - Added `getRouteIcon(iconName: string)` helper mapping 30+ Lucide icons dynamically to route cards.
  - Replaced hardcoded `Compass` card icons with `{getRouteIcon(route.iconName)}`.
  - Updated workspace stat banner from static "23" to `{ROUTE_DOCS.length}` dynamic count.
- **Comprehensive Workspace Documentation**:
  - Added full route documentation for:
    - `portal-perform` (`/portal/perform/[gigId]`): Live Performance Stage View.
    - `portal-checkin` (`/portal/checkin/[gigId]`): Downbeat Geo/PIN Musician Check-In.
    - `portal-pwa` (`/portal/profile`): Member Portal PWA & Offline Access.
    - `admin-checkin` (`/admin/checkin`): Downbeat Check-In Operations.
    - `admin-pages` (`/admin/pages`): Headless CMS Page Builder.
    - `admin-brand` (`/admin/theme`): Portal & Public Brand Customizer.
    - `admin-inquiries` (`/admin/inquiries`): Booking Inquiries & CRM Intake.
    - `admin-testimonials` (`/admin/testimonials`): Client Reviews & Testimonials Studio.
    - `admin-contact-inbox` (`/admin/contact-inbox`): General Contact & Audience Messages.
    - `admin-auditions` (`/admin/auditions`): Musician Auditions & Section Pipeline.
    - `admin-finance` (`/admin/finance`): Treasury, Ledger & Musician Payouts.
    - `admin-reimbursements` (`/portal/reimbursements`): Musician Expense Reimbursement Claims.
    - `admin-giving` (`/admin/giving`): Patron Giving & Sponsorship Management.
    - `admin-audit-log` (`/admin/audit-log`): Administrative Security & Audit Log.

