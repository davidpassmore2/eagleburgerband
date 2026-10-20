# Stage 64 Walkthrough: Public Polish, Cloudinary Upload Resilience, Repertoire List Layout & Setlist Navigation

## Purpose
This walkthrough validates the user interface refinements, media engine hardening, song catalog single-line layout, and navigation updates delivered in Stage 64.

---

### Scenario 1: Admin Gig Dispatch Action Label
1. **Navigate to Gig Management Studio:**
   - Go to `/admin/gigs`.
2. **Locate a Confirmed Gig Card:**
   - In the gig cards list, find any gig marked as `confirmed`.
3. **Verify Action Button:**
   - Confirm the dispatch action button displays the clear label: **"Dispatch to Confirmed"**.
   - Verify clicking the button opens the call sheet dispatch confirmation workflow.

---

### Scenario 2: Public System Pages Spacing & Header Boundaries
1. **Navigate to the Public Gigs Page:**
   - Open `/gigs` in a browser or preview window.
2. **Verify Hero Header & Boundary Line:**
   - Verify the header banner image has a clean bottom border (`border-b border-slate-800`).
   - Confirm there are no artificial overlay gradient lines obscuring the bottom of the photo.
3. **Verify First-Section Spacing & Single CTA Banner:**
   - Check the vertical spacing below the header: the Upcoming / Past filter controls render with balanced top and bottom padding (`pt-8 sm:pt-12`).
   - Scroll to the bottom of the page: verify the booking CTA banner appears **only once**, with no duplicate rendering.
4. **Spot-Check Additional Public Routes:**
   - Navigate to `/book`, `/join`, `/testimonials`, and `/giving`.
   - Confirm consistent top spacing and visual rhythm across all routes.

---

### Scenario 3: Page Banner Typography Drop Shadow Toggle
1. **Navigate to Page Banner Manager:**
   - Go to `/admin/banners` or CMS Page Studio (`/admin/pages`).
2. **Edit a Page Banner:**
   - Open any banner configuration panel (e.g. Home or Gigs).
   - Locate the **"Overlay Drop Shadow"** toggle switch.
3. **Toggle and Save:**
   - Turn the drop shadow toggle ON.
   - Save the banner and preview the page.
   - Verify the headline and subtitle overlay typography render with an elegant, legible drop shadow against the background imagery.

---

### Scenario 4: Song Catalog Single-Line Scannable List Layout
1. **Navigate to the Song Catalog:**
   - Go to `/portal/library`.
2. **Inspect Song Presentation:**
   - Verify each song is presented as a **single horizontal line** (one card per row), rather than a multi-column grid.
   - Confirm aligned badges across all rows:
     - Song title & composer/original artist
     - BPM badge (e.g., `120 BPM`)
     - Key signature badge (e.g., `Bb Major`)
     - Arranger & genre tags
     - Rating & star score
     - Action buttons (Audio preview, Charts, Edit/Delete for managers)
3. **Test Sorting & Filtering:**
   - Filter by status (`Active`, `Rehearsing`, `Archived`) or search by title.
   - Verify sorting and scanning are intuitive and effortless in the single-line format.

---

### Scenario 5: Setlist Studio Relocation under Music & Repertoire
1. **Check Sidebar Navigation & Workspace Registry:**
   - Look at the portal sidebar or `/portal/sections/music-repertoire`.
   - Verify **"Setlist Studio"** is grouped directly under **"Music & Repertoire"**.
2. **Verify Hierarchical Breadcrumbs:**
   - Open `/admin/setlists`.
   - Confirm the breadcrumb displays:
     `Portal Home > Music & Repertoire > Setlist Studio`
   - Click the `Music & Repertoire` breadcrumb link and verify it navigates cleanly to `/portal/sections/music-repertoire`.

---

### Scenario 6: "+ Add New Song" Routes to Suggestion Triage with Active Form
1. **Navigate to Song Catalog:**
   - Open `/portal/library`.
2. **Locate the Header Action Buttons:**
   - Verify two buttons appear next to the search bar:
     - **"Song Suggestions"** (slate button with Lightbulb icon)
     - **"+ Add New Song"** (vibrant yellow button with Plus icon)
3. **Click "+ Add New Song":**
   - Click the **"+ Add New Song"** button.
   - Verify you are navigated directly to:
     `/admin/suggestions?category=tune_request&action=new`
4. **Verify Form State on Suggestion Triage:**
   - Confirm the **"Tune Request"** tab is pre-selected.
   - Confirm the **"Submit Suggestion / Request"** form modal is automatically active and open.
   - Confirm the category dropdown inside the form is defaulted to `Tune Request (Reviewed by Catalog Manager)`.
5. **Verify "Song Suggestions" Button:**
   - Return to `/portal/library` and click **"Song Suggestions"**.
   - Verify it navigates to `/admin/suggestions?category=tune_request` displaying the queue without opening the submission modal.

