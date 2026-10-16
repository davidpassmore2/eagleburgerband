# Stage 62: Verification Walkthrough & Testing Guide

This guide walks through verifying the Stage 62 navigation updates: Section Homepages, "What Can I Do in This Section?" overview cards, and 3-to-4 level Hierarchical Portal Breadcrumbs starting with "Portal Home".

---

### Scenario 1: Breadcrumb Hierarchy on Operational Pages

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

### Scenario 2: Sub-Page Breadcrumbs (4 Levels)

1. **Open a Specific Gig Call Sheet:**
   - Go to `/portal/gigs` and click on any upcoming or past gig to open `/portal/gigs/[gigId]`.
2. **Inspect the Breadcrumb:**
   - Verify that the breadcrumb reads:
     `Portal Home` > `Performances & Logistics` > `Gig Calendar & RSVPs` > `[Gig Title or Call Sheet]`
   - Verify that each ancestor is an interactive link, while the final segment is the bold active page title.

---

### Scenario 3: Section Homepage Experience (`/portal/sections/[slug]`)

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

### Scenario 4: All Sections Directory (`/portal/sections`)

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

### Scenario 5: Sidebar Category Links

1. **Open the Portal Sidebar:**
   - Locate the category headers in the sidebar (e.g. `MUSIC & REPERTOIRE`, `PERFORMANCES & LOGISTICS`).
2. **Click on a Category Header:**
   - Click on the category title text in the sidebar.
   - Verify that it navigates directly to that category's section homepage.

