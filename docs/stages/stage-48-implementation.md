# Stage 48: Automated Email Deliverability, Resend Integration & Transactional Communications Suite

## Problem Statement & Goals

The Eagleburger Band web application features rich user management, roster invitations, gig dispatching, and booking inquiries. However, transactional communications currently rely on manual copy-pasting of links or simulation logs:
1. **Roster Invitations:** In `/admin/roster`, administrators can generate onboarding tokens, but cannot dispatch an official invitation email directly to the musician with one click.
2. **Broadcasts & Call Sheets:** In `/admin/notifications` and `/admin/dispatch`, sending an announcement or logistics briefing writes an entry to `email_logs`, but does not transmit an actual email to recipient inboxes.
3. **Public Booking Inquiries:** In `/book`, event planners submit details that write to Firestore (`inquiries`), but neither the client receives an automated confirmation receipt nor does the band management receive an instant email notification.
4. **Deliverability Visibility:** Administrators have asked how to verify email deliverability and configure domain reputation (SPF/DKIM) for the band's communications.

**Stage 48 delivers an end-to-end transactional email system powered by [Resend](https://resend.com):**
* Direct, reliable email delivery on Vercel serverless with zero CommonJS/ESM bundling conflicts.
* Branded, high-contrast, responsive HTML email templates tailored to the Eagleburger aesthetic (gold, black, white).
* Real-time delivery logging in Cloud Firestore with provider message tracking and error diagnostics.
* Graceful fallback in local emulator development (mock delivery logging without requiring a live API key).

---

## Technical Scope & Architecture

```
                  ┌────────────────────────────────────────────────────────┐
                  │                 Next.js App / Portal                   │
                  │  /admin/roster  │  /admin/dispatch  │  /book  │  /admin  │
                  └──────────────┬─────────────────────────┬───────────────┘
                                 │                         │
                                 ▼                         ▼
                  ┌────────────────────────┐    ┌────────────────────────┐
                  │  POST /api/email/...   │    │  Firestore Client      │
                  │  (Serverless Routes)   │    │  (Direct Inquiries)    │
                  └──────────────┬─────────┘    └────────────────────────┘
                                 │
                                 ▼
                  ┌────────────────────────────────────────────────────────┐
                  │             Resend Dispatch Engine                     │
                  │             (src/lib/email/resend.ts)                  │
                  │                                                        │
                  │   * RESEND_API_KEY check                               │
                  │   * HTML Template Rendering                            │
                  │   * Local Emulator Mock Fallback                       │
                  └──────────────┬─────────────────────────┬───────────────┘
                                 │                         │
                     (Live Cloud)│             (Local Dev) │
                                 ▼                         ▼
                  ┌────────────────────────┐    ┌────────────────────────┐
                  │      Resend API        │    │    Console / Mock      │
                  │  (smtp/rest dispatch)  │    │    Preview Logger      │
                  └──────────────┬─────────┘    └────────────────────────┘
                                 │
                                 ▼
                  ┌────────────────────────────────────────────────────────┐
                  │            Firestore: email_logs                       │
                  │  * status: sent / failed                               │
                  │  * providerMessageId: resend_msg_...                   │
                  │  * deliveryTimestamp                                   │
                  └────────────────────────────────────────────────────────┘
```

### 1. Provider & Environment Configuration
* **Provider:** [Resend](https://resend.com) (`npm install resend`).
* **Environment Variables:**
  * `RESEND_API_KEY`: API key from the Resend Dashboard (e.g. `re_...`).
  * `RESEND_FROM_EMAIL`: Configurable sender identity (default: `Eagleburger Band <onboarding@resend.dev>` for initial testing, transitioning to verified domain `Eagleburger Band <manager@eagleburgerband.org>` or `info@eagleburgerband.com`).
  * `NEXT_PUBLIC_APP_URL`: Base URL for links (e.g. `https://beta.eagleburgerband.com` in production, or `http://localhost:3000` locally).

### 2. Schema Hardening (`src/lib/schema/email.ts`)
* Define type-safe Zod schemas for all outbound email requests:
  * `SendInviteEmailSchema`: `recipientEmail`, `musicianName`, `sectionName`, `instruments`, `token`, `notes`.
  * `SendCallSheetEmailSchema`: `gigId`, `gigTitle`, `date`, `callTime`, `downbeat`, `venue`, `address`, `attire`, `notes`, `setlistUrl`, `recipientEmails`.
  * `SendBookingReceiptSchema`: `clientName`, `clientEmail`, `eventTitle`, `date`, `venue`, `budget`, `message`.
  * `SendBroadcastEmailSchema`: `subject`, `htmlBody`, `recipientEmails`, `channel`.
* Update `EmailLogSchema` in `src/lib/schema/emailLog.ts` to include:
  * `provider`: `"resend" | "mock"`
  * `providerMessageId`: `z.string().nullable().default(null)`
  * `deliveryStatus`: `"queued" | "sent" | "delivered" | "failed" | "mocked"`
  * `errorMessage`: `z.string().nullable().default(null)`

### 3. Core Email Dispatcher (`src/lib/email/resend.ts`)
* Implements unified `sendTransactionalEmail()`:
  * Reads `RESEND_API_KEY` from the environment.
  * If in local emulator mode (`NEXT_PUBLIC_USE_FIREBASE_EMULATOR="true"`) or `RESEND_API_KEY` is not configured:
    * Logs email contents, subject, and recipient cleanly to stdout.
    * Returns simulated success `{ success: true, mocked: true, messageId: "mock_..." }`.
  * In live/production mode:
    * Instantiates `new Resend(apiKey)`.
    * Calls `resend.emails.send({ from, to, subject, html, text })`.
    * Returns provider message ID or captures detailed rejection errors.
  * Writes/updates audit log in Firestore `email_logs`.

### 4. Responsive HTML Templates (`src/lib/email/templates/`)
Create standalone, mobile-responsive HTML generators featuring the Eagleburger Band dark-and-gold aesthetic:
1. **`renderInviteEmail()`:**
   * Bold gold banner: "Official Musician Invitation".
   * Personal welcome to `{musicianName}`.
   * Designated Section and Instruments callout box.
   * Large primary CTA button: **"Claim Your Spot & Activate Account"** pointing to `${appUrl}/claim?token=${token}`.
   * Administrative onboarding notes.
2. **`renderCallSheetEmail()`:**
   * Gig title, performance date, and call time banner.
   * Downbeat, venue address, unloading directions, and attire code.
   * Repertoire and setlist links directly into `/portal/perform/{gigId}`.
   * RSVP status reminder button.
3. **`renderBookingClientReceipt()`:**
   * Client confirmation: "We received your booking inquiry for {eventTitle}!".
   * Event summary (Date, Time, Location).
   * What to expect next from band management.
4. **`renderBookingDirectorAlert()`:**
   * High-priority notification to band managers (`manager@eagleburgerband.org`).
   * Full client contact info (Name, Organization, Email, Phone).
   * Event specifics, estimated budget, and client notes.
   * Direct one-click link to review lead in `/admin/inquiries`.

### 5. API Routes Suite (`src/app/api/email/`)
* **`POST /api/email/invite`**:
  * Verifies caller is authenticated and has `admin` role.
  * Fetches invite document from `invites/{token}`.
  * Renders `renderInviteEmail` and dispatches via Resend.
  * Updates `invites/{token}` with `lastEmailSentAt: ISOString`.
* **`POST /api/email/call-sheet`**:
  * Verifies caller has `gig_manager` or `admin` role.
  * Fetches gig logistics and attendee emails from `gigs/{gigId}/rsvps`.
  * Dispatches individualized or batched call sheet emails.
* **`POST /api/email/broadcast`**:
  * Connected to `/admin/notifications`.
  * Dispatches custom broadcast messages to selected audiences (all members, section, or gig attendees).
* **`POST /api/email/booking-receipt`**:
  * Called upon public booking form submission on `/book`.
  * Sends client receipt to `formData.email` and director alert to management.

### 6. UI Integration & Deliverability Dashboard
* **Admin Roster (`/admin/roster`):**
  * In "Member Invitations" tab and modal, add **"Send Invitation Email"** action with instant feedback.
  * Displays "Last Sent" timestamp on invitation rows.
* **Admin Notifications (`/admin/notifications`):**
  * Wire the composer form directly to `/api/email/broadcast`.
  * Add **Deliverability Health Banner**:
    * Displays Resend API configuration status (Connected / Mock / Missing Key).
    * Shows verified sending domain advice (SPF, DKIM, DMARC guidelines for custom domains).
* **Gig Dispatch (`/admin/dispatch`):**
  * In the gig call sheet drawer, add **"Email Call Sheet to Attendees"** button with confirmation modal.
* **Public Booking Form (`/book`):**
  * Triggers automated email receipt and director notification upon submission.

---

## Detailed Step-by-Step Implementation Plan

### Step 1: Install Resend & Configure Environment
- Run `npm install resend`.
- Add `RESEND_API_KEY` and `RESEND_FROM_EMAIL` to `.env.example`, `.env.dev`, and `.env.beta`.
- Update `package.json` dependencies.

### Step 2: Define Email Schemas
- Create `src/lib/schema/email.ts` with validation schemas for all email payloads.
- Update `src/lib/schema/invite.ts` to include `lastEmailSentAt: z.string().nullable().default(null)`.
- Update `src/lib/schema/emailLog.ts` with provider tracking and delivery status fields.

### Step 3: Implement Resend Engine & Templates
- Create `src/lib/email/resend.ts` with live Resend sending and emulator mock fallback.
- Create `src/lib/email/templates/invite.ts`.
- Create `src/lib/email/templates/callSheet.ts`.
- Create `src/lib/email/templates/booking.ts`.
- Create `src/lib/email/templates/broadcast.ts`.

### Step 4: Build Server API Routes
- Create `src/app/api/email/invite/route.ts`.
- Create `src/app/api/email/call-sheet/route.ts`.
- Create `src/app/api/email/broadcast/route.ts`.
- Create `src/app/api/email/booking-receipt/route.ts`.

### Step 5: Integrate UI Workflows
- Update `src/app/(portal)/admin/roster/page.tsx` with email dispatch actions and timestamps.
- Update `src/app/(portal)/admin/notifications/page.tsx` to execute live broadcasts and render deliverability status.
- Update `src/app/(portal)/admin/dispatch/page.tsx` with call sheet email dispatch.
- Update `src/components/public/BookingFormSection.tsx` to trigger booking receipts.

### Step 6: Verification & UAT Testing
- Test offline in local emulator mode: verify mock logs format cleanly without API key errors.
- Test in beta cloud: configure test Resend API key and verify real email delivery to test inboxes.
- Run `npx tsc --noEmit` and `npm run build` to confirm 0 type errors and successful Next.js compilation.
- Produce `docs/stages/stage-48-walkthrough.md`.

