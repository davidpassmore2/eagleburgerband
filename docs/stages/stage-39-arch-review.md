# Stage 39 — Architectural Review: Eagleburger Band Portal

> **Reviewed:** 2026-10-01 | Next.js 16.3.4 (Turbopack, App Router) · Firebase Firestore Client SDK · Zod Schemas · RBAC via `permissions.ts`

---

## Executive Summary

- 🔴 **`alert()` is the only error-feedback mechanism** across ~55 call sites in 21 files. There is no app-wide toast/snackbar system; one page (`admin/setlists`) has a hand-rolled local `toastMessage` state. This is a widespread UX regression pattern.
- 🔴 **`vault_tracks` is a live Firestore collection with no Zod schema.** The `VaultTrack` type is defined only as a local interface inside `portal/vault/page.tsx`, and the stored field `songTitle` is a legacy naming pattern inconsistent with the `title` field used throughout the `tunes` domain.
- 🔴 **`inventory`, `invites`, `gig_ledgers`, `gigs/{id}/dispatches`, `gigs/{id}/checkins`, `users/{id}/blackouts`, and `gigs/{id}/rsvps` are all read/written in app code with no Zod schema coverage.** Any schema-invariant mutation is unvalidated for these collections.
- 🔴 **`admin/inventory` uses the wrong RBAC guard** — `canManageSections() || canManageGigs()` is called instead of `canManageAssets()`. A `section_leader` or `gig_manager` can access inventory management despite not being in the workspaceRegistry for that route.
- 🟡 **14 page components contain inline `fixed inset-0` modal overlays** rather than using centralized modal components. A shared `<ConfirmDialog>` and `<AccessDenied>` component would eliminate the most repeated patterns.

---

## Section 1: Schema Coverage

### Schema Files & Collections

| Schema File | Collection(s) Covered |
|---|---|
| `adminLog.ts` | `admin_logs` |
| `audition.ts` | `auditions` |
| `comment.ts` | `comments` |
| `contact.ts` | `contacts` |
| `donation.ts` | `donations` |
| `emailLog.ts` | `email_logs` |
| `generalInquiry.ts` | `contact_messages` |
| `gig.ts` | `gigs` |
| `lead.ts` | `booking_leads` / `inquiries` |
| `page.ts` | `content_pages` |
| `reimbursement.ts` | `reimbursements` |
| `section.ts` | `sections` |
| `setlist.ts` | `setlists` |
| `siteConfig.ts` | `settings/main_nav` (navigation config doc) |
| `suggestion.ts` | `suggestions` |
| `testimonial.ts` | `testimonials` |
| `theme.ts` | `theme` |
| `transaction.ts` | `transactions` |
| `treasury.ts` | `settings` (doc `treasury`) |
| `tune.ts` | `tunes` |
| `user.ts` | `users` |

### Missing Schema Coverage

🔴 **`vault_tracks`** — Read/written in `portal/vault/page.tsx`. No schema exists. The stored field `songTitle` is inconsistent with the `title` field used throughout the `tunes` domain. A `VaultTrackSchema` is needed.

🔴 **`inventory`** — Read/written in `admin/inventory/page.tsx`. No schema. The page defines a local `InventoryItem` interface only.

🔴 **`invites`** — Written via `setDoc(doc(db, "invites", token), ...)` in `admin/roster/page.tsx`. No schema.

🔴 **`gig_ledgers`** — Listed in the collection scan. No schema found.

🟡 **`gigs/{gigId}/dispatches`** (subcollection) — Written via `addDoc(collection(db, "gigs", selectedGigId, "dispatches"), payload)` in `admin/notifications/page.tsx`. No schema.

🟡 **`users/{uid}/blackouts`** (subcollection) — Written in `portal/availability/page.tsx`. No schema.

🟡 **`gigs/{gigId}/checkins`** — Read/written in `admin/checkin/page.tsx`. No schema.

🟡 **`gigs/{gigId}/rsvps`** — Read extensively across multiple pages. No dedicated schema; typed only via local interfaces.

### Default Values on Optional Fields

Overall schema quality is **high**. Most optional fields include `.default()`. Notable exceptions:

🟡 **`ContactSchema`** — `createdAt` and `updatedAt` are `z.string().optional()` (no `.default()`). On parse, these will be `undefined` rather than a timestamp, making sort operations unsafe.

🟢 **`SetlistSchema`** — `templateId` and `templateName` are `.optional()` without `.default()`. These are genuinely nullable by design.

---

## Section 2: Auth / RBAC Consistency

### Permissions Module

`src/lib/auth/permissions.ts` defines 15 guard functions covering all recognized roles: `admin`, `web_manager`, `gig_manager`, `catalog_manager`, `setlist_manager`, `community_manager`, `treasurer`, `section_leader`, `membership_manager`, `asset_manager`, `member`, `guest`. The `hasRole()` function automatically grants all roles to `admin` — correct and consistent.

### Layout-Level RBAC

`src/app/(portal)/layout.tsx` calls `hasAnyRole(profile, requiredRoles)` at the layout level to gate entire route groups. This is a good first line of defense.

### Portal Route RBAC Status

| Route | Registry `requiredRoles` | Component Guard | Status |
|---|---|---|---|
| `/admin/gigs` | `admin, gig_manager` | `canManageGigs()` | ✅ |
| `/admin/setlists` | `admin, setlist_manager, gig_manager, catalog_manager` | `canManageSetlists()` | ✅ |
| `/admin/checkin` | `admin, gig_manager, section_leader` | `canManageGigs() OR canManageSections()` | ✅ |
| `/admin/dispatch` | `admin, gig_manager` | `canManageGigs()` | ✅ |
| `/admin/notifications` | `admin, gig_manager, membership_manager, community_manager, section_leader` | `canDispatchBroadcasts()` | ✅ |
| `/admin/roster` | `admin, membership_manager` | `canManageRoster()` | ✅ |
| `/admin/sections` | `admin, section_leader, membership_manager` | `canManageSections()` | ✅ |
| `/admin/attendance` | `admin, section_leader` | `canManageGigs() OR canManageSections()` | ⚠️ Registry `section_leader` only; guard is broader |
| `/admin/inventory` | `admin, asset_manager` | `canManageSections() OR canManageGigs()` | 🔴 **WRONG GUARD** |
| `/admin/users` | `admin` | `isAdmin()` | ✅ |
| `/admin/finance` | `admin, treasurer` | `canManageFinances()` | ✅ |
| `/admin/giving` | `admin, treasurer` | `canManageGiving()` | ✅ |
| `/admin/audit-log` | `admin` | `isAdmin()` | ✅ |
| `/admin/comments` | `admin` | `canManageContent()` | 🔴 **GUARD BROADER THAN REGISTRY** |
| `/admin/pages` | `admin, web_manager` | `canManageContent()` | ✅ |
| `/admin/theme` | `admin, web_manager` | `canManageTheme()` | ✅ |
| `/admin/analytics/catalog` | `admin, catalog_manager, setlist_manager` | `canViewRepertoireAnalytics()` | 🟡 Guard fires after data is already fetched |
| `/admin/testimonials` | `admin, web_manager, community_manager` | `canManageTestimonials()` | ✅ |
| `/admin/suggestions` | all roles including `member` | `canReviewSuggestion()` per action | ✅ |

### Key RBAC Findings

🔴 **`admin/inventory` uses wrong guard** — `canManageSections() || canManageGigs()` is used instead of `canManageAssets()`. A `section_leader` or `gig_manager` can access inventory management but is NOT listed in the workspaceRegistry for that route. This is a privilege escalation gap.
- **File:** `src/app/(portal)/admin/inventory/page.tsx` ~line 139
- **Fix:** Replace with `canManageAssets(userProfile)`

🔴 **`admin/comments` guard is broader than registry** — Registry restricts to `admin` only, but `canManageContent()` also grants access to `web_manager` and `community_manager`. Logical inconsistency between the two layers.
- **File:** `src/app/(portal)/admin/comments/page.tsx` ~line 46
- **Fix:** Either update registry to `["admin", "web_manager", "community_manager"]` or change guard to `isAdmin(profile)`

🟡 **`admin/analytics/catalog` data fetches run before auth check** — Three `onSnapshot` subscriptions start before confirming the user has the right role. While Firestore security rules provide server-side enforcement, the client unnecessarily subscribes before confirming permission.
- **Fix:** Short-circuit the `useEffect` with `if (!canViewRepertoireAnalytics(profile)) return;`

🟡 **`portal/vault` — no hard auth gate for reads** — `canManage` controls write UI only. Any authenticated Firebase user who manually navigates to `/portal/vault` sees all vault tracks.

---

## Section 3: Component Duplication

### Dedicated Modal Components in `src/components/portal/`

`CalendarSubscribeModal`, `CommentsStream`, `EditGigLogisticsModal`, `GigFinanceModal`, `GigSetlistAssignmentModal`, `InstrumentationAuditDrawer`, `LogisticsChangeModal`, `MemberAnalyticsCard`, `PortalDayEventsModal`, `PortalLoadingOverlay`, `PortalMonthCalendar`, `PortalPwaCard`, `PortalThemeModal`, `RoleEmulationBanner`, `RoleEmulationModal`, `SetlistBuilderModal`, `TuneCommentsModal`

### Inline Modals Inside Page Files

🟡 14 page files contain `fixed inset-0` inline modal overlays that bypass the component library:

| File | Inline Modal Count |
|---|---|
| `admin/finance/page.tsx` | 4 |
| `admin/notifications/page.tsx` | 2 |
| `admin/setlists/page.tsx` | 2 |
| `portal/reimbursements/page.tsx` | 2 |
| `admin/gigs/page.tsx` | 1 |
| `admin/giving/page.tsx` | 1 |
| `admin/pages/page.tsx` | 1 |
| `admin/roster/page.tsx` | 1 |
| `admin/suggestions/page.tsx` | 1 |
| `admin/testimonials/page.tsx` | 1 |
| `admin/users/page.tsx` | 1 |
| `portal/library/page.tsx` | 1 |
| `portal/profile/page.tsx` | 1 |
| `portal/vault/page.tsx` | 1 |

### Repeated UI Patterns to Extract

🟡 **Confirmation dialog pattern** — `fixed inset-0 bg-black/60` overlay + card with Cancel + destructive action button appears in **at least 7 pages**. Should be a shared `<ConfirmDialog>` component.

🟡 **Access-denied block** — `<ShieldAlert>` + permission message pattern appears in **12+ admin pages**. Should be a shared `<AccessDenied>` component.

🟢 **Status badges** — Status badge rendering with ad-hoc `className` ternaries for gig, reimbursement, and suggestion statuses. A shared `<StatusBadge status={...} />` would reduce duplication.

---

## Section 4: Data Fetching Patterns

### Unnecessary `onSnapshot` (Real-time) Listeners

🔴 **`PublicHeaderNav.tsx`, `PublicFooter.tsx`, `PublicAnnouncementBanner.tsx`** — All three public layout components use `onSnapshot` for `theme/config` or `settings/main_nav`. These are read-once, rarely-changing config docs. Real-time listeners create unnecessary Firestore read costs on every public page load for anonymous visitors.
- **Fix:** Replace with `getDoc()` or Next.js server component with `cache: 'force-cache'`

🟡 **`admin/analytics/catalog/page.tsx`** — Opens THREE simultaneous `onSnapshot` streams (`tunes`, `gigs`, `setlists`) for an analytics page that has no need for real-time updates. All three should be `getDocs()` calls run once on mount.

🟡 **`admin/notifications/page.tsx`** — Subscribes to `users`, `contacts`, `gigs`, and `email_logs` via `onSnapshot`. For a broadcast compose screen, `users` and `contacts` are static recipient lists. Only `email_logs` benefits from live updates.

🟡 **`admin/sections/page.tsx`** — Two separate `onSnapshot` listeners for `users` and `sections` independently. Could be batched.

### `getDocs` Issues

🟡 **`CalendarSubscribeModal.tsx`** — `getDocs` inside the modal open handler iterates all gigs and their RSVP subcollections to find the user's attended gigs. This is O(n×m) reads and will become expensive with a large gig history.

🟡 **`portal/gigs/[gigId]/page.tsx`** — Loads the full RSVP subcollection on every gig navigation. Consider `getDoc(doc(db, "gigs", gigId, "rsvps", uid))` to load only the user's own RSVP.

---

## Section 5: Dead Code & Orphaned References

### `songs` Collection

🟡 **`songs` is seeded but never read by the app** — `scripts/seed.ts` writes to both `songs` and `tunes` collections. No `collection(db, "songs")` reads were found in any `src/` file. The seed should be updated to write only to `tunes`, and the `songs` collection can be retired.

### Legacy Field Names

🟡 **`songTitle` is a live field in `vault_tracks`** — Used in `portal/vault/page.tsx` in ~10 places. Inconsistent with `title` used throughout `tunes`. No schema enforces this.

🟢 **`pitchNotes`, `submittedByUid`, `voters`, `votesCount`** — No references found anywhere in `src/`. Fully retired.

🟢 **No `TODO`, `FIXME`, `HACK`, or `XXX` comments** found in any `src/` file. Codebase is clean of inline debt markers.

---

## Section 6: Collection Audit

| Collection | Has Zod Schema | Seeded | Read in App | Write in App |
|---|---|---|---|---|
| `users` | ✅ | ✅ | ✅ | ✅ |
| `sections` | ✅ | ✅ | ✅ | ✅ |
| `tunes` | ✅ | ✅ | ✅ | ✅ |
| `songs` | ✅ (same as tune.ts) | ✅ | ❌ | ❌ |
| `gigs` | ✅ | ✅ | ✅ | ✅ |
| `gigs/{id}/rsvps` | ❌ | ✅ | ✅ | ✅ |
| `gigs/{id}/checkins` | ❌ | ❌ | ✅ | ✅ |
| `gigs/{id}/dispatches` | ❌ | ❌ | ❌ | ✅ |
| `setlists` | ✅ | ✅ | ✅ | ✅ |
| `suggestions` | ✅ | ✅ | ✅ | ✅ |
| `comments` | ✅ | ✅ | ✅ | ✅ |
| `contacts` | ✅ | ✅ | ✅ | ✅ |
| `auditions` | ✅ | ✅ | ✅ | ✅ |
| `booking_leads` | ✅ | ✅ | ✅ | ✅ |
| `inquiries` | ✅ | ✅ | ✅ | ✅ |
| `testimonials` | ✅ | ✅ | ✅ | ✅ |
| `donations` | ✅ | ✅ | ✅ | ✅ |
| `reimbursements` | ✅ | ✅ | ✅ | ✅ |
| `transactions` | ✅ | ✅ | ✅ | ✅ |
| `email_logs` | ✅ | ❌ | ✅ | ✅ |
| `admin_logs` | ✅ | ❌ | ✅ | ✅ |
| `content_pages` | ✅ | ✅ | ✅ | ✅ |
| `theme` | ✅ | ✅ | ✅ | ✅ |
| `settings` | ✅ (treasury.ts, partial) | ✅ | ✅ | ✅ |
| `inventory` | ❌ **Missing** | ❌ | ✅ | ✅ |
| `vault_tracks` | ❌ **Missing** | ❌ | ✅ | ✅ |
| `invites` | ❌ **Missing** | ❌ | ✅ | ✅ |
| `gig_ledgers` | ❌ **Missing** | ❌ | ✅ | ❌ |
| `users/{id}/blackouts` | ❌ **Missing** | ❌ | ✅ | ✅ |

**Summary:** 21/29 tracked collections/subcollections have Zod schemas. **8 are unschematized.**

---

## Section 7: Route Coverage

### workspaceRegistry vs. Actual Page Files

All 33 `href` values in `workspaceRegistry.ts` map to actual pages. No broken registry links detected.

### Page Files Without Registry Entry (Expected)

`portal/checkin/[gigId]`, `portal/gigs/[gigId]`, `portal/perform/[gigId]`, `portal/section/`, `portal/section/manage/` — all are sub-routes accessed from their parent page, not directly navigable from the sidebar. This is expected and correct.

No orphaned pages found.

---

## Section 8: Error Handling — `alert()` Usage

🔴 `alert()` is used for **all** user-facing error feedback. No app-wide toast system exists.

| File | `alert()` Count |
|---|---|
| `admin/setlists/page.tsx` | 11 |
| `admin/suggestions/page.tsx` | 8 |
| `portal/vault/page.tsx` | 5 |
| `GigSetlistAssignmentModal.tsx` | 5 |
| `portal/library/page.tsx` | 4 |
| `admin/users/page.tsx` | 4 |
| `admin/testimonials/page.tsx` | 3 |
| `portal/gigs/[gigId]/page.tsx` | 3 |
| `portal/perform/[gigId]/page.tsx` | 3 |
| `portal/availability/page.tsx` | 2 |
| `portal/checkin/[gigId]/page.tsx` | 2 |
| `portal/profile/page.tsx` | 2 |
| `admin/pages/page.tsx` | 1 |
| `admin/theme/page.tsx` | 1 |
| `CalendarSubscribeModal.tsx` | 1 |
| `CommentsStream.tsx` | 1 |
| `EditGigLogisticsModal.tsx` | 1 |
| `GigFinanceModal.tsx` | 1 |
| `LogisticsChangeModal.tsx` | 1 |
| `portal/gigs/page.tsx` | 1 |
| `SetlistBuilderModal.tsx` | 1 |

**Total: ~55 `alert()` call sites across 21 files.**

The only existing toast-like implementation is a hand-rolled local state in `admin/setlists/page.tsx` (`toastMessage` / `showToast`) — not reusable.

**Recommendation:** Install `sonner`, add `<Toaster />` to the portal layout, and replace all `alert()` calls with `toast.success()` / `toast.error()`.

---

## Section 9: Type Safety Gaps

### `: any` Annotations

Only **one** found in `src/`:
- `portal/perform/[gigId]/page.tsx` line 33: `function normalizeTune(t: any): SetlistEntry`

🟢 Type annotation discipline is excellent overall.

### Untyped `d.data()` Spreads (~65+ instances)

🟡 The pattern `{ id: d.id, ...d.data() } as SomeType` bypasses Zod validation. If a Firestore document has a missing or differently-shaped field, the app silently receives a malformed object.

**Correct pattern (used in `admin/comments`, `admin/audit-log`):**
```ts
const parsed = CommentSchema.safeParse({ id: d.id, ...d.data() });
if (parsed.success) list.push(parsed.data);
```

**Files with the most raw casts:**

| File | Est. Raw Casts |
|---|---|
| `admin/finance/page.tsx` | ~6 |
| `admin/roster/page.tsx` | ~5 |
| `admin/notifications/page.tsx` | ~5 |
| `portal/perform/[gigId]/page.tsx` | ~4 |
| `admin/sections/page.tsx` | ~3 (includes `as unknown as User`) |

🔴 `as unknown as User` in `admin/sections/page.tsx` — double-cast type escape hatch; entirely unvalidated.

---

## Refactoring Priorities

| # | Item | Impact | Effort | Priority |
|---|---|---|---|---|
| 1 | **Replace all `alert()` with toast system** — install `sonner`, add `<Toaster>` to portal layout, sweep 21 files | High — UX regression | Medium | 🔴 Immediate |
| 2 | **Fix `admin/inventory` RBAC guard** — `canManageSections()` → `canManageAssets()` | High — privilege escalation | Low | 🔴 Immediate |
| 3 | **Create `VaultTrackSchema`** and migrate `vault_tracks` to use `title` instead of `songTitle` | High — schema invariant | Low | 🔴 Immediate |
| 4 | **Create schemas for `inventory`, `invites`, `rsvps`, `checkins`** — 4 live collections with no Zod coverage | High — write safety | Medium | 🔴 Next sprint |
| 5 | **Reconcile `admin/comments` registry vs. guard** — pick one role set and align both layers | Medium — security inconsistency | Low | 🟡 Next sprint |
| 6 | **Replace `onSnapshot` in public layout components** with `getDoc` + cache | Medium — Firestore cost | Low | 🟡 Next sprint |
| 7 | **Replace `onSnapshot` in analytics/catalog page** with `getDocs` | Medium — unnecessary read cost | Low | 🟡 Next sprint |
| 8 | **Extract `<ConfirmDialog>` and `<AccessDenied>` shared components** | Medium — maintainability | Medium | 🟡 Next sprint |
| 9 | **Migrate raw `d.data() as X` spreads to Zod `safeParse`** — start with `finance`, `roster`, `notifications` | Medium — runtime safety | High | 🟡 Ongoing |
| 10 | **Remove dual-write to `songs` in `scripts/seed.ts`** and retire legacy collection | Low — dead code | Low | 🟢 Housekeeping |
