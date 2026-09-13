# Stage 32 Walkthrough: Public Submission Forms & Admin Management Studios

## Overview
Stage 32 enhances the Eagleburger Band web platform with dedicated public submission forms and administrative management capabilities for:
1. **Audience & Client Testimonials**
2. **Musician Applications / Auditions (Join the Band)**
3. **General Contact Inquiries & Outreach**
4. **PWA Install Banner & Fixed Responsive Sidebar Navigation**
5. **Super Admin Authentication for David Passmore**
6. **Main Admin Pane Consistent Padding (Pinned & Unpinned Modes)**
7. **Left Admin Navigation Text Wrapping & Clean Responsiveness (No Truncation)**
8. **Intake Category Consolidation**: Dedicated category grouping Booking Leads, Testimonials & Reviews, and General Contact Inbox
9. **Public Homepage Intake Flow Cards**: Three branded interactive cards for Booking, Testimonials, and General Contact (plus Musician Audition CTA)

---

## 1. Zod Schemas & Invariance (Rule 2)
All documents have strict Zod schemas with safe defaults defined in `src/lib/schema/` before any Firestore interaction:
- **`src/lib/schema/testimonial.ts`**:
  - `TestimonialSchema`: `authorName`, `roleOrEvent`, `organization`, `email`, `quote`, `rating`, `eventDate`, `tag`, `permissionToPublish`, `status` (`pending` | `approved` | `featured` | `rejected`), `notes`.
  - `TestimonialInputSchema`: Validates author name, email, rating 1-5, quote 10-1200 chars, and required publication consent.
- **`src/lib/schema/audition.ts`**:
  - `AuditionSchema`: `name`, `email`, `phone`, `primaryInstrument`, `targetSectionId`, `secondaryInstruments`, `experienceLevel`, `sampleLinks`, `availability`, `bioNotes`, `status` (`new` | `under_review` | `invited_to_rehearsal` | `accepted` | `declined` | `archived`), `assignedLeaderUid`, `reviewerNotes`.
  - `AuditionInputSchema`: Validates applicant details, instrument selection, experience, and statement.
- **`src/lib/schema/generalInquiry.ts`**:
  - `GeneralInquirySchema`: `name`, `email`, `phone`, `category` (`general` | `press` | `community` | `merch` | `other`), `subject`, `message`, `status` (`new` | `in_progress` | `resolved` | `archived`), `assignedToUid`, `internalNotes`.
  - `GeneralInquiryInputSchema`: Validates category selection, subject, and message.

---

## 2. Public-Facing Submission Pages
- **`/contact` ([`src/app/(public)/contact/page.tsx`](file:///c:/repos/eagleburgerband/src/app/(public)/contact/page.tsx))**:
  - Branded contact center with category pills (General, Press & Media, Community, Merchandise).
  - Anti-bot honeypot and input sanitization via DOMPurify.
  - Direct routing cards connecting visitors to `/book` for booking inquiries and `/join` for musician auditions.
- **`/join` ([`src/app/(public)/join/page.tsx`](file:///c:/repos/eagleburgerband/src/app/(public)/join/page.tsx))**:
  - Recruitment portal highlighting acoustic street brass and drumline battery culture.
  - Instrument picker, target section selector, experience level selector, and audio/video link submission.
  - Rehearsal and next-steps guidance upon submission.
- **`/testimonials` ([`src/app/(public)/testimonials/page.tsx`](file:///c:/repos/eagleburgerband/src/app/(public)/testimonials/page.tsx))**:
  - Public reviews gallery displaying approved and featured client/audience testimonials with 5-star ratings and event tags.
  - Category tag filtering (Parades, Festivals, Weddings, Private Events).
  - In-page review submission modal with publication consent checkbox.
- **Navigation Updates**:
  - Updated [`PublicFooter.tsx`](file:///c:/repos/eagleburgerband/src/components/public/PublicFooter.tsx) and [`siteConfig.ts`](file:///c:/repos/eagleburgerband/src/lib/schema/siteConfig.ts) to prominently link all three destinations.

---

## 3. Administrative Management Studios
- **`/admin/testimonials` ([`src/app/(portal)/admin/testimonials/page.tsx`](file:///c:/repos/eagleburgerband/src/app/(portal)/admin/testimonials/page.tsx))**:
  - RBAC Clearance: `canManageTestimonials` (`admin`, `web_manager`, `community_manager`).
  - Metrics cards: Total Reviews, Pending Review, Approved & Live, Featured Highlights.
  - Review actions: One-click Approve, Feature, Reject, Edit details (quote, author, tag, notes), and Delete.
- **`/admin/auditions` ([`src/app/(portal)/admin/auditions/page.tsx`](file:///c:/repos/eagleburgerband/src/app/(portal)/admin/auditions/page.tsx))**:
  - RBAC Clearance: `canManageAuditions` (`admin`, `membership_manager`, `gig_manager`, `section_leader`).
  - Metrics cards: Total Applications, New, Invited to Rehearsal, Accepted.
  - Filter by section (Drumline, Sousaphones, Trombones, Trumpets, Saxophones, Auxiliary) and status.
  - Reviewer workflow: Triage status (`new` &rarr; `under_review` &rarr; `invited_to_rehearsal` &rarr; `accepted` / `declined`), log internal reviewer notes, and open video audition samples.
- **`/admin/contact-inbox` ([`src/app/(portal)/admin/contact-inbox/page.tsx`](file:///c:/repos/eagleburgerband/src/app/(portal)/admin/contact-inbox/page.tsx))**:
  - RBAC Clearance: `canManageContactInbox` (`admin`, `web_manager`, `community_manager`, `gig_manager`).
  - Metrics cards: Total Messages, New / Unread, In Progress, Resolved.
  - Category and status filtering, direct `mailto:` reply generator with quote context, internal notes logging, and quick links to Booking Leads (`/admin/inquiries`).

---

## 4. Security Rules & Workspace Registry
- **`firestore.rules`**: Added production-ready security rules for `/testimonials/{id}`, `/auditions/{id}`, and `/contact_messages/{id}` enforcing valid creation schemas and restricting modifications to authenticated managers.
- **`workspaceRegistry.ts`**: Registered tools:
  - `auditions` under *Personnel & Attendance* (`/admin/auditions`)
  - `testimonials` under *Business & Admin* (`/admin/testimonials`)
  - `contact-inbox` under *Business & Admin* (`/admin/contact-inbox`)

---

## 5. Verification Results
- **TypeScript**: `npx tsc --noEmit` &rarr; Passed with 0 errors.
- **ESLint**: `npm run lint` &rarr; Passed with 0 errors, 0 warnings.
- **Next.js Production Build**: `npm run build` &rarr; All 58 routes successfully compiled and prerendered.
- **Database Seeding**: `npm run seed` &rarr; Successfully seeded testimonials, auditions, and contact messages alongside super admin account.
