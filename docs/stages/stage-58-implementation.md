# Stage 58: Route Burst Bubble Dynamics, Member Portal Layout Reconciliation & Portal Page RBAC Matrix

## Overview & Scope

Stage 58 delivers key enhancements across platform interactivity, member portal UX consolidation, and administrative RBAC transparency:
1. **Kinetic Route-Change Burst & Special Effects Physics:**
   - Engineered responsive route-change detection for the public website and admin theme preview, producing an animated burst of buoyant bubbles on navigation that naturally subsides to ambient frequency.
   - Refined bubble variability physics, randomized lifecycles with pop bursts, expansion scale factors, and aerodynamic mouse deflection with poke-to-pop touch capability while maintaining 100% click-through accessibility.
2. **Member Portal Dashboard Reconciliation (`/portal`):**
   - Reconciled duplicate Member Standing and Season Analytics cards on the Member Portal home screen.
   - Prioritized and enriched `MemberAnalyticsCard.tsx` with integrated expense reimbursement stats, removing the redundant 3-card standalone strip.
   - Restructured layout hierarchy so that the **Upcoming Performance Schedule** is the 3rd section on the page, immediately following the Next Performance hero banner.
3. **Portal Pages & Role Access Matrix on User & Role Studio (`/admin/users`):**
   - Built a comprehensive, high-density audit directory and simulator in `PortalPageAccessMatrix.tsx` and integrated it as a top-level tab in User & Role Studio (`/admin/users`).
   - Maps all 40 registered portal workspace tools (plus `/portal` Member Dashboard and `/admin` Admin Hub) across 7 functional categories to their authorized RBAC roles.
   - Interactive Role Access Simulator allowing administrators to filter by any of the 12 system roles to instantly preview accessible routes, role clearance percentages, and descriptions.
   - Dual view modes (Table Matrix and Card Grid), live search, one-click URL copy, and direct workspace launch links.

---

## 1. Route Burst Bubble Dynamics & Interactive Physics

- **Files Modified:**
  - [`src/components/public/PublicBubbleOverlay.tsx`](file:///c:/repos/eagleburgerband/src/components/public/PublicBubbleOverlay.tsx)
  - [`src/app/(portal)/admin/theme/page.tsx`](file:///c:/repos/eagleburgerband/src/app/(portal)/admin/theme/page.tsx)
- **Key Enhancements:**
  - Added Next.js `usePathname()` route-change monitoring.
  - When the pathname transitions, `burstMultiplier` elevates to ~4.5x with rapid vertical ascent, smoothly decaying over a 3.5-second easing curve back to baseline ambient frequency.
  - Integrated "Simulate Route Burst" interactive trigger button into the Special Effects tab of `/admin/theme` for live tuning.
  - Maintained complete pointer event passthrough (`pointer-events-none` on overlay container with selective non-blocking hit-testing) to ensure zero interference with links, buttons, and form inputs.

---

## 2. Member Portal Layout Reconciliation

- **Files Modified:**
  - [`src/app/(portal)/portal/page.tsx`](file:///c:/repos/eagleburgerband/src/app/(portal)/portal/page.tsx)
  - [`src/components/portal/MemberAnalyticsCard.tsx`](file:///c:/repos/eagleburgerband/src/components/portal/MemberAnalyticsCard.tsx)
- **Consolidation Details:**
  - Removed the redundant 3-card metric strip (`Season Attendance Quorum`, `Gigs Performed`, `Active Reimbursements`) that duplicated analytics displayed in `MemberAnalyticsCard`.
  - Reconciled metrics into `MemberAnalyticsCard`: attendance percentage, season gig count, personal tune bookmarks count, and pending expense reimbursement claims with direct jump links to `/portal/reimbursements`.
  - Re-ordered dashboard sections so that the **Upcoming Performance Schedule** is element #3 directly after the **Next Performance** hero card, putting immediate performance commitments front-and-center for musicians.

---

## 3. Portal Pages & Role Access Matrix

- **New Component:**
  - [`src/components/portal/PortalPageAccessMatrix.tsx`](file:///c:/repos/eagleburgerband/src/components/portal/PortalPageAccessMatrix.tsx)
- **Files Modified:**
  - [`src/app/(portal)/admin/users/page.tsx`](file:///c:/repos/eagleburgerband/src/app/(portal)/admin/users/page.tsx)
- **Features Implemented:**
  - **Studio Tab Navigation:** Cleanly toggles between "User Accounts & Roles" (performer directory and role assignment controls) and "Portal Pages & Access Matrix" (system-wide route audit).
  - **Comprehensive Route Catalog:** Full directory covering all 40 registered tools in `WORKSPACE_TOOLS` plus root dashboard hubs across 7 canonical categories:
    - *Help, Guides & Docs*
    - *Performances & Logistics*
    - *Personnel & Attendance*
    - *Music & Repertoire*
    - *Website & Intake*
    - *Finance*
    - *Business & Admin*
  - **Interactive Role Simulator:** Filter buttons for all 12 system roles (`admin`, `web_manager`, `gig_manager`, `catalog_manager`, `setlist_manager`, `community_manager`, `treasurer`, `section_leader`, `membership_manager`, `asset_manager`, `member`, `guest`). Selecting a role reveals its briefing card, highlights matching access badges, and calculates portal clearance coverage.
  - **Clearance Scope Badges:** Color-coded classification for *Admin Exclusive* (amber), *Role Delegated* (blue), and *All Band Members* (emerald).
  - **Inherited Access Transparency:** Highlights `+admin (universal)` inheritance on member and manager routes, reminding administrators that executive clearance spans all portal features.
  - **Dual Views & Quick Tools:** Table Matrix view for compact audits, Card Grid view for visual browsing, instant URL copying with toast confirmations, and direct links to test any route.

---

## Verification & Build Status

- **TypeScript Typecheck:** `npx tsc --noEmit` passed with 0 errors.
- **Project Rule Compliance:**
  - Rule 1: Feature branch `feature/stage-58` branched from `next-trunk`.
  - Rule 2: Schema invariance preserved; no unvalidated Firestore mutations.
  - Rule 3: RBAC guardrails reinforced with complete route visibility matrix.
  - Rule 4: Sanitization intact with DOMPurify.

