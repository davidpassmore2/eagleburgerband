# Stage 58: Route Burst Dynamics, Member Portal Layout & Portal Pages RBAC Matrix Walkthrough

## Feature Walkthrough & Verification Guide

This guide walks through verifying the newly implemented route-change bubble burst dynamics, consolidated Member Portal layout hierarchy, and the new Portal Pages & Role Access Matrix on User & Role Studio.

---

### Scenario 1: Route-Change Bubble Burst Dynamics

1. **Verify on the Public Website:**
   - Ensure the bubble effect is active in `/admin/theme` under **Special Effects**.
   - Navigate to the public website home page (`/`). Observe the ambient bubble flow.
   - Click on navigation links to switch pages (e.g. click **Shows & Gigs**, then **Band Story**, then **Song Catalog**).
   - Observe that upon every route transition, bubble spawn frequency immediately surges with rapid vertical velocity, then smoothly eases back to ambient speed over ~3.5 seconds.
2. **Verify in the Admin Theme Simulator:**
   - Navigate to `/admin/theme` and click the **Special Effects** tab.
   - Click the **Simulate Route Burst** button inside the live simulator panel.
   - Observe the instant bubble generation spike within the preview canvas.

---

### Scenario 2: Member Portal Home Layout & Reconciled Analytics

1. **Navigate to Member Portal Home:**
   - Go to `/portal`.
2. **Inspect Page Hierarchy:**
   - Element #1: Header & Welcome banner.
   - Element #2: **Next Performance** hero card.
   - Element #3: **Upcoming Performance Schedule** (RSVP list for upcoming gigs, moved up to immediately follow the next performance banner).
3. **Verify Reconciled Member Season Analytics:**
   - Observe the **Member Season Analytics & Standing** card:
     - Confirms attendance standing percentage, season gig count, personal tune bookmarks count, and pending reimbursement submissions.
     - Confirms removal of the redundant standalone 3-card metric strip.
     - Clicking the reimbursement badge navigates directly to `/portal/reimbursements`.

---

### Scenario 3: Portal Pages & Role Access Matrix (`/admin/users`)

1. **Navigate to User & Role Studio:**
   - Log in as an administrator and go to `/admin/users`.
2. **Switch Studio Tabs:**
   - Observe the two top-level navigation tabs:
     - **User Accounts & Roles** (displays count of registered band accounts).
     - **Portal Pages & Access Matrix** (marked with *Audit* badge).
   - Click on **Portal Pages & Access Matrix**.
3. **Review Summary & Clearance KPI Strip:**
   - Verify KPI cards:
     - Total Routes (42 routes across 7 categories).
     - Member Clearances (accessible to performing members and guests).
     - Role Delegated (accessible to managers and section leaders).
     - Admin Exclusive (restricted solely to system administrators).
4. **Test the Interactive Role Access Simulator:**
   - Click on different role pills in the simulator bar:
     - Click **`gig_manager`**: Displays the *Gig Operations Manager* card. Confirms that only gig-related workspaces (Gig Studio, Setlists, Downbeat Check-In, Call Sheet Dispatch, Inquiries, CRM) are displayed.
     - Click **`community_manager`**: Displays the *Community & PR Manager* card. Confirms access to Comment Moderation, Testimonials, Contact Inbox, and Shirt Sizes.
     - Click **`member`**: Filters to the 13 core member tools (Home, Calendar, Vault, Roster, Profile, Attendance, Reimbursements, etc.).
     - Click **`admin`**: Confirms universal clearance across 100% of portal tools.
   - Click **Reset Role Filter (Show All)** to restore the unfiltered directory.
5. **Test Search and Category Filters:**
   - Enter search terms such as `moderation`, `reimbursement`, `catalog`, or `admin/finance`.
   - Verify that results filter instantaneously.
   - Click category filter pills (e.g. *Finance*, *Music & Repertoire*) to view grouped tools.
6. **Test Table vs. Card View Modes:**
   - Toggle between **Table** and **Cards** view.
   - In Table view, test the **Copy Path** button (verifying clipboard toast) and the external jump link to open the page.

---

### Scenario 4: Stage Changelog Verification

1. **Navigate to Stage Changelog:**
   - In the musician portal, navigate to `/portal/changelog` under *Help, Guides & Docs*.
2. **Verify Stage 58 Entry:**
   - Confirm that **Stage 58** appears at the top of the changelog with title: *"Route Burst Bubble Dynamics, Member Portal Layout Reconciliation & Portal Page RBAC Matrix"*.
   - Verify listed accomplishments matching platform updates.

