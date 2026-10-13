# Stage 57 — Deep Architectural Scan & System Health Report

> **Reviewed:** 2026-10-12 | Next.js 16.3.4 (Turbopack, App Router) · Firebase Firestore Client/Server SDK · Zod Schemas · Granular RBAC · DOMPurify Sanitization

---

## Executive Summary

Following the completion of Stages 40 through 56, PR #2 (Security Lockdown), and PR #3 (Data Access Lockdown), a deep architectural audit was conducted across the Eagleburger Band platform.

The audit examined all **35 Zod schemas** (`src/lib/schema/`), **40 portal & admin route components** (`src/app/(portal)/`), **18 server API routes** (`src/app/api/`), the **Firestore security ruleset** (`firestore.rules`), client listeners, and UI components.

### Audit Scorecard:
- 🟢 **Error Handling Modernization (100%):** Zero (`0`) occurrences of `alert()` remain across the codebase. All error reporting and operational feedback have successfully migrated to `ToastContext` (`useToast()`).
- 🟢 **Firestore Security Rules Coverage (100%):** Every active collection and subcollection queried in application code has an explicit security rule block in `firestore.rules`.
- 🟢 **Type Safety & Build Cleanliness (99%):** `npx tsc --noEmit` compiles cleanly with zero errors. `: any` casts are isolated to ~10 instances, primarily third-party Leaflet map dynamic scripts.
- 🔴 **Rule 4 Gap (HTML Sanitization):** Three call sites in `admin/notifications/page.tsx` render email broadcast simulation previews via `dangerouslySetInnerHTML` without passing through `DOMPurify` / `sanitizeHtml`.
- 🟡 **Rule 2 Gap (Schema Invariance):** The newly added `system_config` collection (`system_config/cloudinary`, `system_config/integrations`) lacks a dedicated Zod schema in `src/lib/schema/` with safe `.default()` values.
- 🟡 **Rule 3 Defense-in-Depth (Centralized Portal Route Guard):** While `src/app/(portal)/layout.tsx` filters sidebar menu links according to user roles, it does not centrally intercept direct deep-link URL navigation against `WORKSPACE_TOOLS[].requiredRoles`.

---

## Section 1: Schema Coverage & Invariance (Rule 2)

### Covered Collections & Schemas
The repository maintains 35 dedicated Zod schemas covering 31 distinct collections and subcollections:

| Collection / Subcollection | Zod Schema File | Primary Schema |
|---|---|---|
| `admin_logs` | `src/lib/schema/adminLog.ts` | `AdminLogSchema` |
| `auditions` | `src/lib/schema/audition.ts` | `AuditionSchema` |
| `booking_leads` / `inquiries` | `src/lib/schema/lead.ts`, `generalInquiry.ts` | `LeadSchema`, `GeneralInquirySchema` |
| `comments` | `src/lib/schema/comment.ts` | `CommentSchema` |
| `contacts` / `contact_messages` | `src/lib/schema/contact.ts` | `ContactSchema` |
| `content_pages` | `src/lib/schema/page.ts` | `ContentPageSchema` |
| `donations` | `src/lib/schema/donation.ts` | `DonationSchema` |
| `email_logs` | `src/lib/schema/emailLog.ts` | `EmailLogSchema` |
| `gigs` | `src/lib/schema/gig.ts` | `GigSchema` |
| `gigs/{id}/rsvps` | `src/lib/schema/rsvp.ts` | `GigRsvpSchema` |
| `gigs/{id}/checkins` | `src/lib/schema/checkin.ts` | `GigCheckinSchema` |
| `gigs/{id}/dispatches` | `src/lib/schema/dispatch.ts` | `DispatchRecordSchema` |
| `inventory` | `src/lib/schema/inventory.ts` | `InventoryItemSchema` |
| `invites` | `src/lib/schema/invite.ts` | `InviteSchema` |
| `navigation_config` | `src/lib/schema/sidebarNavigation.ts` | `SidebarConfigSchema` |
| `notifications` | `src/lib/schema/notification.ts` | `NotificationSchema` |
| `portal_metrics_config` & `events` | `src/lib/schema/metrics.ts` | `PortalMetricsConfigSchema` |
| `reimbursements` | `src/lib/schema/reimbursement.ts` | `ReimbursementSchema` |
| `resources` | `src/lib/schema/resource.ts` | `ResourceAssetSchema` |
| `sections` | `src/lib/schema/section.ts` | `SectionSchema` |
| `setlists` | `src/lib/schema/setlist.ts` | `SetlistSchema` |
| `settings/treasury` | `src/lib/schema/treasury.ts` | `TreasuryConfigSchema` |
| `site_navigation` | `src/lib/schema/siteConfig.ts` | `SiteNavigationSchema` |
| `suggestions` | `src/lib/schema/suggestion.ts` | `SuggestionSchema` |
| `testimonials` | `src/lib/schema/testimonial.ts` | `TestimonialSchema` |
| `theme` | `src/lib/schema/theme.ts` | `ThemeSchema` |
| `transactions` | `src/lib/schema/transaction.ts` | `TransactionSchema` |
| `tunes` | `src/lib/schema/tune.ts` | `TuneSchema` |
| `users` | `src/lib/schema/user.ts` | `UserSchema` |
| `users/{id}/blackouts` | `src/lib/schema/blackout.ts` | `BlackoutSchema` |
| `vault_tracks` | `src/lib/schema/vaultTrack.ts` | `VaultTrackSchema` |

### Missing Schemas (Rule 2 Compliance)
1. 🟡 **`system_config` Collection**:
   - Written in `src/lib/cloudinary/widget.ts` and `src/app/api/admin/integrations/cloudinary/route.ts`.
   - Currently written as untyped objects without Zod schema parse/validation.
   - **Recommendation:** Create `src/lib/schema/systemConfig.ts` defining `SystemConfigSchema` and `CloudinaryConfigSchema` with safe `.default()` values.
2. 🟢 **`notification_logs` Collection**:
   - Written in `src/app/(portal)/admin/notifications/page.tsx:579` as an ad-hoc audit backup.
   - **Recommendation:** Validate through `EmailLogSchema` or extract a dedicated `NotificationLogSchema`.

---

## Section 2: Auth & RBAC Consistency across 38+ Routes (Rule 3)

### Portal Route Guard Analysis
- **Sidebar Filtering:** `src/app/(portal)/layout.tsx` reliably filters sidebar navigation items according to `tool.requiredRoles`.
- **Direct Navigation Gap:** When an authenticated member manually navigates to an unpermitted URL (e.g. `/admin/gigs` or `/admin/finance` as a `guest` or regular `member`), `layout.tsx` does not evaluate the requested `pathname` against the workspace registry.
- While individual pages like `/admin/analytics/usage` and `/admin/notifications` implement dedicated component guards (`isAdmin()`, `canDispatchBroadcasts()`), several management screens rely entirely on the Firestore security rules rejecting mutations.
- **Recommendation:** Add a centralized route-guard interceptor in `src/app/(portal)/layout.tsx`:
  ```tsx
  const currentTool = ALL_WORKSPACE_TOOLS.find(t => t.href === pathname);
  if (currentTool && !currentTool.requiredRoles.some(role => hasRole(profile, role))) {
    return <AccessDenied requiredRoles={currentTool.requiredRoles} />;
  }
  ```
  This creates an impenetrable defense-in-depth barrier across all 38+ portal tools simultaneously.

### Server API Route Token Verification
- All management API routes under `src/app/api/admin/` and `src/app/api/email/` enforce caller authentication via `requireCaller(req, requiredRoles, ...)` in `src/lib/auth/serverAuth.ts`.
- Public API routes (`/api/calendar/*`, `/api/public/*`, `/api/email/booking-receipt`) are intentionally unauthenticated to support calendar sync feeds and public booking forms.

---

## Section 3: Sanitization & XSS Security (Rule 4)

### Rule 4 Compliance Scan
Project Rule 4 stipulates: *"Raw HTML/Markdown must pass through `isomorphic-dompurify` or `rehype-sanitize`. Never use un-sanitized `dangerouslySetInnerHTML`."*

- **Public CMS Renderers:** Fully compliant. All dynamic markdown and rich-text bodies pass through `sanitizeHtml()` in `src/components/cms/PublicSectionRenderer.tsx`.
- 🔴 **Vulnerability in Admin Notifications:**
  - `src/app/(portal)/admin/notifications/page.tsx:1460`: `dangerouslySetInnerHTML={{ __html: simulatedHtmlBody }}`
  - `src/app/(portal)/admin/notifications/page.tsx:1764`: `dangerouslySetInnerHTML={{ __html: inspectingLog.htmlBody }}`
  - `src/app/(portal)/admin/notifications/page.tsx:1843`: `dangerouslySetInnerHTML={{ __html: simulatedHtmlBody }}`
- **Recommendation:** Wrap all notification email preview HTML in `sanitizeHtml(...)` using `isomorphic-dompurify`.

---

## Section 4: Error Handling & UX Modals

- **`alert()` Audit:** **Zero (`0`) remaining instances**. All user alerts have successfully migrated to `ToastContext`.
- **`confirm()` Audit:** **27 remaining call sites** using native browser `confirm()` or `window.confirm()`.
  - While non-blocking alerts are solved, synchronous browser dialogs disrupt keyboard navigation and mobile viewports.
  - **Recommendation:** Create a reusable, accessible `<ConfirmationModal>` (or `useConfirm()` dialog hook) and replace `window.confirm()` across admin delete flows.

---

## Section 5: Data Fetching & Real-Time Listener Hygiene

- **Listener Hygiene:** All `onSnapshot` subscriptions in `admin/gigs`, `admin/analytics/usage`, `portal/page.tsx`, and `PublicAnnouncementBanner.tsx` include proper `unsub()` cleanup functions in their `useEffect` teardown.
- **Cost & Performance Optimization:**
  - `PublicAnnouncementBanner.tsx` runs an active real-time `onSnapshot` listener on `site_navigation/config` on every public visitor's session.
  - Since announcements change infrequently, converting this to a one-time `getDoc` (matching `PublicHeaderNav.tsx` and `PublicFooter.tsx`) will eliminate redundant concurrent connection overhead during traffic surges.

---

## Section 6: Actionable Recommendations Roadmap for Stage 57+

| Priority | Area | Action Item | Target Files |
|:---|:---|:---|:---|
| 🔴 **High** | **Rule 4 Security** | Sanitize notification email preview HTML with `DOMPurify` | `src/app/(portal)/admin/notifications/page.tsx` |
| 🟡 **Medium** | **Rule 2 Schema** | Create `SystemConfigSchema` covering `system_config/cloudinary` | `src/lib/schema/systemConfig.ts`, `src/lib/cloudinary/widget.ts` |
| 🟡 **Medium** | **Rule 3 RBAC** | Add layout-level URL interception against `WORKSPACE_TOOLS` | `src/app/(portal)/layout.tsx` |
| 🟢 **Low** | **Performance** | Switch `PublicAnnouncementBanner` from `onSnapshot` to `getDoc` | `src/components/public/PublicAnnouncementBanner.tsx` |
| 🟢 **Low** | **UX Polish** | Replace remaining 27 `window.confirm()` calls with `ConfirmModal` | `src/components/portal/ConfirmModal.tsx`, `admin/*` |
