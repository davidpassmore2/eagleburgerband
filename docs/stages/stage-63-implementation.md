# Stage 63: Discussion Stream Comment Likes & Member Tooltips

## Overview & Scope

Stage 63 introduces peer engagement and social feedback within the Eagleburger Band Portal discussion stream (`CommentsStream.tsx`). Musicians and band leadership can "like" comments posted across tunes, gigs, general announcements, and member suggestions. Hovering over the like button displays a dynamic floating tooltip showing the complete list of member names who liked the comment. Clicking a previously liked comment removes the member's like and immediately removes their name from the tooltip list.

---

## 1. Schema & Data Invariance (Rule 2 Compliance)

### Schema Updates ([`src/lib/schema/comment.ts`](file:///c:/repos/eagleburgerband/src/lib/schema/comment.ts))

* **`CommentLikeItemSchema`**:
  ```typescript
  export const CommentLikeItemSchema = z.object({
    uid: z.string(),
    name: z.string(),
    likedAt: z.string().optional(),
  });
  export type CommentLikeItem = z.infer<typeof CommentLikeItemSchema>;
  ```
* **`CommentSchema` Extensions**:
  * `likes`: Preprocessed array of user IDs (`string[]`) with safe `.default([])`. Enables instantaneous membership checks (`likes.includes(currentUid)`) and atomic `addsOrRemovesOnlyMe` security validation.
  * `likedBy`: Preprocessed array of `CommentLikeItem` objects (`Array<{ uid: string, name: string, likedAt?: string }>`) with safe `.default([])`. Preprocessor handles legacy record maps and object variations gracefully without failing parsing.

---

## 2. Firestore Security Rules Hardening

### Delegated to `firestore-rules-author` ([`firestore.rules`](file:///c:/repos/eagleburgerband/firestore.rules#L264-L277))

```rules
    match /comments/{commentId} {
      allow read: if isMember();
      allow create: if isMember() && request.resource.data.authorUid == request.auth.uid;
      allow update: if canManageContent()
        || (isMember()
            && changedKeys().hasOnly(['isFlagged', 'flagReason', 'flaggedByUid', 'updatedAt'])
            && request.resource.data.isFlagged == true
            && request.resource.data.flaggedByUid == request.auth.uid)
        || (isMember()
            && changedKeys().hasOnly(['likes', 'likedBy', 'updatedAt'])
            && addsOrRemovesOnlyMe('likes'));
      allow delete: if canManageContent()
        || (isMember() && resource.data.get('authorUid', '') == request.auth.uid);
    }
```

* **Restricted Key Scope**: Non-moderator members can only mutate `likes`, `likedBy`, and `updatedAt`.
* **Identity Integrity**: `addsOrRemovesOnlyMe('likes')` strictly limits array changes to the calling user's own `request.auth.uid`, preventing members from altering or forging other users' reactions.
* **Content Immutability**: Comment text, author attribution, and pinned status remain strictly unmodifiable by regular users.

---

## 3. UI/UX Component Implementation ([`src/components/portal/CommentsStream.tsx`](file:///c:/repos/eagleburgerband/src/components/portal/CommentsStream.tsx))

1. **Like Action Button**:
   * Uses `ThumbsUp` icon from `lucide-react`.
   * Unliked state: subtle slate styling (`bg-slate-900/60 text-slate-400 border-slate-800/80 hover:bg-slate-800`).
   * Liked state: vibrant gold accent (`bg-amber-400/15 text-amber-300 border-amber-400/35 hover:bg-amber-400/25`) with a filled thumb icon.
   * Real-time like counter showing total distinct likes.

2. **Interactive Hover Tooltip**:
   * Positioned directly above the like button with backdrop blur (`bg-slate-900/95 backdrop-blur-md`).
   * Header: Shows total count (`X Members Liked` or `Like this comment`).
   * Member List: Lists every member who liked with gold bullet points. Identifies the active user with a gold `(You)` badge.
   * Empty State: Prompts `"Be the first to like this comment!"` when no likes exist yet.
   * Native accessibility `title` attribute backup for mobile/touch screens.

3. **Toggle (Like / Unlike) Workflow**:
   * If not liked: Adds `currentUid` to `likes` and `{ uid, name, likedAt }` to `likedBy`.
   * If already liked: Filters out `currentUid` from both `likes` and `likedBy`.
   * The list of names in the hover tooltip reflects the change immediately.
   * Concurrency & Pending guard: `likePendingIds` prevents duplicate rapid-click requests.

---

## 4. "My Availability & Blackouts" Member-Centric Redesign

### Overview
The availability hub was previously titled "Musician Availability" with coordinator-oriented copy. In Stage 63, the entire section was aligned to focus directly on the individual member: **"My Availability & Blackouts"**, providing musicians with personal ownership of their schedule, blackout windows, conflict detection, and hiatus mode.

### Modified Files & Architectural Updates
1. **Workspace Registry & Navigation** ([`src/lib/portal/workspaceRegistry.ts`](file:///c:/repos/eagleburgerband/src/lib/portal/workspaceRegistry.ts)):
   - Renamed item title to `"My Availability & Blackouts"` (`/portal/availability`).
   - Retained member and guest access under `Performances & Logistics`.
2. **Section Overview & Directory** ([`src/lib/portal/portalSections.ts`](file:///c:/repos/eagleburgerband/src/lib/portal/portalSections.ts)):
   - Updated overview item to `"My Availability & Blackouts"` with member-first description: *"Manage your personal schedule, log blackout dates, and toggle hiatus mode so leadership knows your availability."*
3. **PWA Web App Manifest** ([`src/app/manifest.ts`](file:///c:/repos/eagleburgerband/src/app/manifest.ts)):
   - Updated shortcut to `name: "My Availability & Blackouts"`, `short_name: "My Availability"`, and `description: "Manage your personal availability and blackout dates"`.
4. **Portal Dashboard Quick Links** ([`src/app/(portal)/portal/page.tsx`](file:///c:/repos/eagleburgerband/src/app/(portal)/portal/page.tsx)):
   - Aligned the Availability dashboard quick action card to `"My Availability & Blackouts"`.
5. **Status Matrix & Help Center Documentation** ([`src/app/(portal)/portal/status-matrix/page.tsx`](file:///c:/repos/eagleburgerband/src/app/(portal)/portal/status-matrix/page.tsx), [`src/app/(portal)/portal/help/page.tsx`](file:///c:/repos/eagleburgerband/src/app/(portal)/portal/help/page.tsx)):
   - Updated operational cross-references and user guides to `"My Availability & Blackouts"`.
6. **Availability Page Component** ([`src/app/(portal)/portal/availability/page.tsx`](file:///c:/repos/eagleburgerband/src/app/(portal)/portal/availability/page.tsx)):
   - Renamed component to `MyAvailabilityPage()`.
   - Updated page header with badge `Personal Schedule & Leave` and member-centric subtitle.
   - Introduced a 4-card **Personal Schedule Telemetry Grid**:
     - *My Dispatch Status*: Shows active dispatch readiness vs. hiatus state with live toggle indicator.
     - *My Blackout Windows*: Live count of the member's scheduled blackout ranges.
     - *Gig Conflicts*: Live count of blackout windows colliding with scheduled band performances.
     - *Band Performances*: Live count of scheduled gigs in the season.
   - Refactored form actions to `"Log My Blackout Range"`, conflict notices to *"Logging this blackout will notify section leaders on the roster of your absence and suppress automated dispatches."*, list headers to `"My Scheduled Blackout Dates"`, and dialogs to `"Remove My Blackout Period?"`.
7. **Seed Database Configuration** ([`scripts/seed.ts`](file:///c:/repos/eagleburgerband/scripts/seed.ts)):
   - Updated default navigation configuration seed data to `"My Availability & Blackouts"`.

---

## 5. Band Rehearsals Hub Redesign & Admin Recurrence Guardrails

### Overview
The Band Rehearsals Hub (`/portal/rehearsals`) was updated to align with the member-centric workflow, secure operational configuration, and elevate calendar visuals:

### Enhancements
1. **Tab Structure Alignment**:
   - Tab 1: **"My RSVPs"** (formerly *"Rehearsal Schedule & RSVPs"*) — Direct member focus on rehearsal calls, personal attendance plans, and section roster breakdowns.
   - Tab 2: **"Rehearsal Locations"** (formerly *"Locations & Map Pins"*) — Dedicated venue directory with Leaflet interactive map pins, parking instructions, and acoustic notes.
   - Tab 3: **"All-Member Blackout Calendar"** — Preserved title; maps member unavailabilities against rehearsal dates.
   - Tab 4: **"Recurrence"** (formerly *"Weekly Recurring Settings"*) — Configures weekly downbeat days, default start/end times, default venue, and standard rehearsal agendas.
2. **Role-Based Access Control (Admin-Only Recurrence Guard)**:
   - Evaluates `isAdmin(profile)`.
   - The **"Recurrence"** navigation tab is hidden from non-admin musicians, preventing unauthorized access.
   - The tab content block itself (`activeTab === "settings" && isAdmin(profile)`) strictly rejects non-admin rendering, ensuring complete UI/component-level RBAC protection (Rule 3).
3. **Pleasing Monthly Calendar Redesign ([`src/components/portal/RehearsalBlackoutCalendar.tsx`](file:///c:/repos/eagleburgerband/src/components/portal/RehearsalBlackoutCalendar.tsx))**:
   - Replaced basic border layout with the modern, theme-aware calendar system established in `PortalMonthCalendar.tsx` (`/portal/gigs`).
   - Features custom month and year `<select>` jump controls with dynamic year bounds.
   - Displays a clean `Today` quick reset button, previous/next chevron navigation, and weekday abbreviation rows.
   - Expanded grid cells (`min-h-[5.5rem] sm:min-h-[6.5rem]`) with day-number styling, active "Today" gold ring highlights, and high-visibility activity badges:
     - Gold badges for scheduled band rehearsals (with time and crossed-out cancelled styling).
     - Amber palm-tree badges displaying the count of musicians unavailable on that date, plus member name preview chips.
   - 3-card monthly KPI summary strip below the calendar displaying rehearsals in the active month, rehearsals with blackout conflicts, and total registered blackouts.

---

## 6. Verification & Testing

* **TypeScript Compilation**: `npx tsc --noEmit` verified clean with `0` errors.
* **Next.js Production Build**: `npm run build` compiled 82 static and dynamic pages with 0 prerendering issues.

