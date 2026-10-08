# Stage 49 Walkthrough: Portal Experience Polish, Manager Task Queue, Strict Invite-Only Auth & Roster Migration Suite

## Executive Summary

Stage 49 brings the Eagleburger Band platform to production readiness by addressing user experience feedback, refining operational leadership workflows, securing access control for beta onboarding, and delivering complete ensemble roster portability between environments.

Key accomplishments in Stage 49:
1. **Flicker-Free Portal & UI Polish:** Eliminated initial state flashes across public announcement banners and musician overview RSVPs by introducing strict loading gates and parallelized `Promise.all` document lookups. Elevated brand typography with Arvo font stacks and redesigned the Musician Portal overview page to highlight immediate action items.
2. **Real-Time Manager Task Queue:** Delivered a unified, role-scoped command center in `useManagerTaskQueue` and `ManagerNotificationBell` that monitors 7 Firestore collections in real time, mounted via a fixed-position React Portal to permanently eliminate clipping.
3. **Beta Testing Guide:** Outlined concise testing scripts for onboarding musicians via Google and email/password under sender `manager@eagleburgerband.com`.
4. **Option C (Strict Invite-Only Authentication):** Eliminated direct public registrations on `/login`. Enforced server/context-level guards in `AuthContext` to immediately reject and sign out uninvited visitors while seamlessly provisioning members with active pending invitations.
5. **Polished Forgot Password Workflow:** Added pre-flight account existence checks, translated Firebase error diagnostics, dedicated reset forms, and a confirmation view with a 30-second cooldown timer.
6. **Cloudinary Media Ingestion Wiring:** Documented and verified configuration of the Cloudinary Upload Widget for the Resource Library and CMS.
7. **Band Roster Import & Export Suite:** Built a full CSV and JSON import/export engine with RFC-4180 parsing, live validation diffs, existing member merging, and automatic invitation provisioning for seamless beta-to-production ensemble migration.

---

## Detailed Walkthrough by Feature Area

### 1. Portal Overview Polish & Flash Elimination

#### Problem
- On route transitions, users briefly observed flashes of disabled public announcement banners and default "Action Needed" RSVP state before Firestore listeners loaded.
- The overview dashboard placed action cards below upcoming performances.

#### Solution
- **Announcement Banner (`PublicAnnouncementBanner.tsx`):** Initialized `banner` state to `null` with an explicit `isLoaded: false` flag. Banner markup only renders once Firestore confirms active announcements exist.
- **RSVP Fetching & Layout (`portal/page.tsx`):**
  - Replaced sequential `getDocs` loop with parallelized `Promise.all` calling direct `getDoc` on `gigs/{id}/rsvps/{uid}`.
  - Reordered sections:
    1. Welcome Header (changed from "Welcome back" to "Welcome")
    2. **Action Needed** (immediate callout with Rose branding if RSVPs are missing)
    3. **Next Performance** (next confirmed gig details)
    4. **Portal Tools & Quick Actions**
    5. **PortalPwaCard** (relocated to the bottom)
- **Portal Layout Typography (`(portal)/layout.tsx`):**
  - Updated category headers and band identity to use `var(--font-arvo), serif` with dynamic active accent colors (`var(--ebb-primary)`).

---

### 2. Manager Task Queue & Notification Bell

#### Architecture
The task queue acts as a reactive aggregator across the band's administrative collections:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      useManagerTaskQueue Hook                           │
│  (comments, inquiries, suggestions, contact_messages, reimbursements,  │
│                   auditions, users, unread dispatches)                  │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    ManagerNotificationBell                              │
│   * Dynamic live counter badge                                          │
│   * React Portal (createPortal -> document.body)                       │
│   * Dynamic button coordinate tracking (getBoundingClientRect)          │
│   * Unclipped fixed positioning (z-[100])                               │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
                   Mounted in 3 Portal Layout Locations:
     1. Desktop Sidebar Header │ 2. Mobile Header │ 3. Unpinned Strip
```

#### Task Queue Categories
| Category | Clearance Required | Firestore Target |
|---|---|---|
| **Flagged Comments** | `admin` | `comments` where `status == "flagged"` |
| **Gig Inquiries** | `canManageGigs` | `inquiries` where `status == "pending"` |
| **Song Pitches** | `canManageMusic` | `suggestions` where `status == "pending"` |
| **Contact Messages** | `canManageCommunications` | `contact_messages` where `status == "unread"` |
| **Expense Reimbursements** | `canManageFinances` | `reimbursements` where `status == "pending"` |
| **Audition Submissions** | `canManageRoster` | `auditions` where `status == "pending"` |
| **Pending Users** | `canManageRoster` | `users` where `status == "pending"` |

---

### 3. Option C — Strict Invite-Only Authentication

#### Login Page Interface (`/login`)
- Removed the `passwordMode === "signup"` toggle and name input field.
- Added a high-contrast **Membership by Invitation Only** callout box:
  - Explains accounts cannot be directly created.
  - Informs invited musicians to click the link in their invitation email.
  - Directs prospective musicians to [Auditions & Join (`/join`)](file:///c:/repos/eagleburgerband/src/app/(public)/join/page.tsx).

#### Auth Guardrails (`AuthContext.tsx`)
```ts
// onAuthStateChanged fallback when user document does not exist:
if (inviteMatchedProfile) {
  // Verified new member claiming their pending invite
  await setDoc(userRef, inviteMatchedProfile, { merge: true });
  setRawProfile(inviteMatchedProfile);
} else {
  // Option C: Strict invite-only rejection
  console.warn(`[Auth] Blocked uninvited sign-in attempt for ${user.email} (${user.uid}).`);
  setEmulatedRoles(null);
  await firebaseSignOut(auth);
  setRawProfile(null);
  setFirebaseUser(null);
  setAuthNotice("No active membership or invitation found for this account. Access is strictly by invitation only.");
  setLoading(false);
  return;
}
```

#### Passwordless Magic Link & Social Guard
- `sendMagicLink` now pre-checks `users` and `invites`. Uninvited email addresses receive an immediate error without triggering email dispatches.
- `handleSocialSignIn` suppresses optimistic redirects, allowing `AuthContext` to intercept and display rejection notices inline.

---

### 4. Enhanced Forgot Password Experience

- **Account Pre-Check:** Prevents enumeration issues by validating against `users` and `invites`. If an invite exists, the user is reminded to claim their onboarding invite instead.
- **Dedicated Request Form:** Clear instructions, envelope input icon, and animated submission state.
- **Dedicated Confirmation Screen:**
  - Displays target email address in gold bolding.
  - Provides a 3-point checklist (check spam folder, 1-hour expiration).
  - Offers a **Return to Sign In** button to jump straight back into the login form.
  - Provides a **Resend Link** button with a live **30-second countdown cooldown timer** to prevent email spam.

---

### 5. Band Roster Import & Export Suite

#### Export Flow
1. Navigate to **Band Roster & Invitations** (`/admin/roster`).
2. Click **Download Roster** (`Download` icon).
3. Choose format:
   - **CSV Spreadsheet:** Formatted with headers (`Name,Email,Section,Section ID,Instruments,Roles,Phone,Status,UID,Payout Method,Venmo Handle,PayPal Email,Zelle ID,Notes`).
   - **Full JSON Package:** Structured database snapshot with metadata and member objects.
4. File downloads automatically with date slug: `eagleburger-roster-YYYY-MM-DD.csv` / `.json`.

#### Import Flow (Beta to Production Migration)
1. In `/admin/roster`, click **Upload / Import** (`Upload` icon).
2. Drop or browse a `.csv` or `.json` file, or paste raw content.
3. Pre-Flight Verification Screen shows:
   - Total rows detected
   - New members (+N) vs existing members (N)
   - Invalid rows with specific error tags
   - 50-item preview table with resolved section badges and action tags ("New Member" / "Update")
4. Configurable Migration Options:
   - **Update existing members:** Merges contact and section info without overwriting IDs.
   - **Auto-generate pending invitations:** Creates matching `invites` in Firestore (`status: "pending"`). This allows imported beta musicians to immediately log into Production without administrative delay.
5. Click **Import Members**: Real-time progress bar tracks batch execution and displays a completion summary.

---

## Verification & Validation

| Test / Check | Tool / Method | Result |
|---|---|---|
| **TypeScript Type Checking** | `npx tsc --noEmit` | **0 errors** across all components, schemas, and pages |
| **Schema Invariance** | `src/lib/schema/user.ts` | Added `createdAt` with safe `.default()` |
| **RBAC Security** | Route guards & clearances | Protected by `canManageRoster`, `canManageGigs`, etc. |
| **Git Working Tree** | `git status` | Clean working tree; committed on `feature/stage-50` |

---

## Conclusion

Stage 49 successfully completes all planned UX refinements, security guardrails, task queue automation, and data migration tooling. The Eagleburger Band platform is fully prepared for beta tester onboarding and production cutover.

