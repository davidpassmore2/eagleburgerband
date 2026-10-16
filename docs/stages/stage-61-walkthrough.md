# Stage 61: Verification Walkthrough & Testing Guide

This guide walks through verifying the Stage 61 features: CMS Studio Modernization for Public System Pages, Smart Form Wrappers (`audition_form`, `contact_form`), Dynamic Section Rendering, Section Homepages (`/portal/sections/[slug]`), and 3-to-4 level Hierarchical Portal Breadcrumbs starting with "Portal Home".

---

### Scenario 1: Audition Form Section in CMS Pages Studio (`/admin/pages`)

1. **Navigate to Pages Studio:**
   - Log in as an administrator or web manager and open `/admin/pages`.
2. **Select the "Join the Band" Page:**
   - Click on the `join` page in the system pages list.
   - Verify that the sections list auto-hydrates if previously empty, showing default sections including an **Audition Form** (`audition_form`) section.
3. **Customize Audition Form Section:**
   - In the section editor for the Audition Form, update:
     - **Headline**: e.g. "Come Play With Us!"
     - **Subheadline**: e.g. "We rehearse weekly and welcome brass, woodwinds, and percussionists."
     - **Badge Text**: e.g. "Auditions Open"
     - **Button Text**: e.g. "Send My Audition Request"
   - Click **Save Page**.
4. **Verify on Public Site:**
   - Navigate to `/join`.
   - Verify that the custom headline, subheadline, badge, and button label are rendered.
   - Submit a test audition to verify that validation, honeypot protection, and Firestore writes to `audition_submissions` work seamlessly.

---

### Scenario 2: Contact Form Section in CMS Pages Studio (`/admin/pages`)

1. **Select the "Contact" Page:**
   - In `/admin/pages`, switch to the `contact` page.
   - Verify that the sections list contains a **Contact Form** (`contact_form`) section and Quick Path cards.
2. **Customize Contact Form Section:**
   - In the section editor for the Contact Form, update:
     - **Headline**: e.g. "Connect With The Band"
     - **Subheadline**: e.g. "Send us an inquiry or reach out about performances."
     - **Badge Text**: e.g. "Direct Contact"
     - **Button Text**: e.g. "Submit Inquiries"
   - Click **Save Page**.
3. **Verify on Public Site:**
   - Navigate to `/contact`.
   - Verify that the custom copy and button text appear on the contact form.
   - Submit a test inquiry and ensure the confirmation banner displays and the document is saved to `contact_submissions`.

---

### Scenario 3: Section Reordering & Fallback Protections

1. **Reorder Sections on `/join` or `/contact`:**
   - In `/admin/pages`, use the **Move Up / Move Down** controls on the `join` or `contact` page sections.
   - Click **Save Page**.
   - Check the corresponding public URL and verify that the sections render in the updated sequence.
2. **Test Fallback Guards:**
   - In `/admin/pages`, delete the form section from `join` or `book` and save.
   - Open `/join` or `/book` in the browser.
   - Verify that the route cleanly falls back to the default code-level form wrapper, ensuring visitors never hit a broken page or missing contact channel.

---

### Scenario 4: All Public System Pages Dynamic Verification

1. **Verify `/book`:**
   - Confirm CMS sections are rendered from `pageData.sections`, including the `booking_form`.
2. **Verify `/gigs`:**
   - Confirm public gig listings render at the top, followed by any dynamic CMS sections configured in `/admin/pages`.
3. **Verify `/giving`:**
   - Confirm sponsor & donation highlights render cleanly without React children array errors.
4. **Verify `/testimonials`:**
   - Confirm testimonials catalog renders alongside any custom CMS banner or narrative blocks.

---

### Scenario 5: Breadcrumb Hierarchy on Operational Pages

1. **Navigate to the Music Library:**
   - Log into the portal and open `/portal/library`.
2. **Inspect the Breadcrumb:**
   - Verify that the breadcrumb at the top reads:
     `Portal Home` > `Music & Repertoire` > `Song Catalog`
   - Verify that clicking `Portal Home` navigates back to `/portal`.
   - Verify that clicking `Music & Repertoire` navigates to `/portal/sections/music-repertoire`.
3. **Navigate to an Admin Tool (e.g. `/admin/gigs`):**
   - Open `/admin/gigs`.
   - Verify that the breadcrumb reads:
     `Portal Home` > `Performances & Logistics` > `Gig Management Studio`
   - Click `Performances & Logistics` and verify it loads the section homepage at `/portal/sections/performances-logistics`.

---

### Scenario 6: Sub-Page Breadcrumbs (4 Levels)

1. **Open a Specific Gig Call Sheet:**
   - Go to `/portal/gigs` and click on any upcoming or past gig to open `/portal/gigs/[gigId]`.
2. **Inspect the Breadcrumb:**
   - Verify that the breadcrumb reads:
     `Portal Home` > `Performances & Logistics` > `Gig Calendar & RSVPs` > `[Gig Title or Call Sheet]`
   - Verify that each ancestor is an interactive link, while the final segment is the bold active page title.

---

### Scenario 7: Section Homepage Experience (`/portal/sections/[slug]`)

1. **Visit a Section Homepage directly:**
   - Navigate to `/portal/sections/music-repertoire` (or click "Music & Repertoire" from the sidebar or breadcrumb).
2. **Inspect Breadcrumb on Section Page:**
   - Verify that the breadcrumb reads:
     `Portal Home` > `Music & Repertoire`
   - `Music & Repertoire` is displayed as the active page (no extra trailing links).
3. **Review "What Can I Do in This Section?":**
   - Verify that the 3 overview highlight cards are rendered cleanly:
     - Access Song Catalog & Sheet Music
     - Listen to the Rehearsal Vault
     - Suggest & Vote on Tunes
4. **Review Available Tools:**
   - Verify that the operational tool cards appear based on your user's permissions:
     - Song Catalog (`/portal/library`)
     - Rehearsal Vault (`/portal/vault`)
     - Suggestion Triage & Voting (`/admin/suggestions`)
     - Repertoire Analytics (`/admin/analytics/catalog` - if manager/admin)
   - Click on any tool card and ensure it navigates directly to that tool.

---

### Scenario 8: All Sections Directory (`/portal/sections`)

1. **Open the Sections Index:**
   - Navigate to `/portal/sections`.
2. **Verify All 7 Sections:**
   - Verify that all 7 core sections are displayed with their icons, badges, descriptions, and available tool counts:
     1. Help, Guides & Docs
     2. Performances & Logistics
     3. Personnel & Attendance
     4. Music & Repertoire
     5. Website & Intake
     6. Finance
     7. Business & Admin
   - Click any section card to navigate to its dedicated homepage.

---

### Scenario 9: Sidebar Category Links

1. **Open the Portal Sidebar:**
   - Locate the category headers in the sidebar (e.g. `MUSIC & REPERTOIRE`, `PERFORMANCES & LOGISTICS`).
2. **Click on a Category Header:**
   - Click on the category title text in the sidebar.
   - Verify that it navigates directly to that category's section homepage.
