# Stage 36: Walkthrough & Verification

## Purpose
Verify the two major feature sets delivered in Stage 36:
1. **Portal Theme Dual Mode (Light & Dark)** & User Preference Persistence
2. **`setlist_manager` Role, Reusable Setlists, Gig Assignment & Circulation Analytics**

---

## Part 1: Portal Theme Dual Mode & Persistence

### 1. Dual-Mode Palettes
Each of the 5 atmospheric portal color schemes provides high-contrast, accessible light and dark palettes:
- **Eagleburger Gold**:
  - *Dark*: Ambient `#0a0802`, Surface `#151105`, Text `#fefce8`, Accent `#facc15`
  - *Light*: Ambient `#fefce8`, Surface `#ffffff`, Text `#1c1917`, Accent `#b45309`
- **Neon Parade**:
  - *Dark*: Ambient `#040817`, Surface `#091126`, Text `#f0f9ff`, Accent `#38bdf8`
  - *Light*: Ambient `#f0f9ff`, Surface `#ffffff`, Text `#0f172a`, Accent `#0284c7`
- **Sousa Crimson**:
  - *Dark*: Ambient `#0f0307`, Surface `#1c070e`, Text `#fff1f2`, Accent `#f43f5e`
  - *Light*: Ambient `#fff1f2`, Surface `#ffffff`, Text `#1c1917`, Accent `#be123c`
- **Emerald Groove**:
  - *Dark*: Ambient `#02140d`, Surface `#072618`, Text `#ecfdf5`, Accent `#10b981`
  - *Light*: Ambient `#ecfdf5`, Surface `#ffffff`, Text `#064e3b`, Accent `#047857`
- **Monongahela Steel**:
  - *Dark*: Ambient `#090a0f`, Surface `#13161c`, Text `#ffffff`, Accent `#e2e8f0`
  - *Light*: Ambient `#f8fafc`, Surface `#ffffff`, Text `#0f172a`, Accent `#334155`

### 2. Testing the Dual-Mode Chooser
1. Click the **Theme** button in the bottom pinned sidebar card.
2. In the modal, toggle between **Dark** (Moon icon) and **Light** (Sun icon).
3. Confirm the entire portal layout, sidebar, headers, and cards transition instantaneously.
4. Verify the preview swatches update in real time.
5. Reload the browser to confirm the mode preference persists via `localStorage` and the Firestore `users/{uid}` record (`portalThemeMode: "light"` or `"dark"`).

---

## Part 2: Setlist Manager Role, Reusable Setlists & Circulation Analytics

### 1. Role Emulation & Access Control
1. Open the **Role Emulation Banner** at the top of the portal.
2. Select the new **Setlist Manager** preset (`ListMusic` icon).
3. Verify access to:
   - **Setlist Studio** (`/admin/setlists`)
   - **Repertoire & Setlist Analytics** (`/admin/analytics/catalog`)
4. Confirm non-permitted administrative tools (e.g., Financial Ledger or Broadcast Suite) remain restricted.

### 2. Testing Reusable Setlist Library (`/admin/setlists`)
1. In the **Reusable Setlist Library** tab, observe the 4-card metric strip (Total Reusable Setlists, Gig Deployments, Top Reused Setlist, Charts in Circulation).
2. Filter setlists by category pills: `Parade`, `Festival`, `Party`, `Acoustic`, `Stage`.
3. Click **+ New Setlist** to launch the interactive Setlist Editor Modal:
   - Enter a setlist name, category, and target duration.
   - Search the music catalog in the right panel and add charts.
   - Set custom keys, tempo BPMs, performance notes, and toggle the `Segue` transition badge.
   - Test Title Uniqueness: Enter the name of an existing setlist (e.g. `30-Minute Street Parade Block`). Notice the red border highlight, error callout `"A setlist with this title already exists in the reusable library. Please choose a unique title."`, and disabled "Save to Library" button. Change to a unique title to enable saving.
   - Click **Save to Library**; verify it appears in the library with its tune chips.
4. Test setlist duplication via the **Duplicate** button: verify it creates `(Copy)`, and duplicating again produces `(Copy 2)` without colliding.

### 3. Testing 1-Click Gig Assignment & Stage View Sync
1. On any reusable setlist card, click **Assign to Gig**.
2. Select an upcoming gig from the dropdown and click **Assign Setlist to Gig**.
3. Confirm the setlist's circulation count increments (e.g., `1x` -> `2x`), and the gig title appears in the setlist's assignment badges.
4. Switch to the **Gig Setlist Sequences** tab, select the assigned gig, and verify the sequence loaded accurately.
5. Click **Stage Mode** (`/portal/perform/[gigId]`) to verify the gig's active stage view renders the setlist tunes.

### 4. Testing Setlist Usage Analytics (`/admin/analytics/catalog`)
1. Navigate to `/admin/analytics/catalog`.
2. Notice the two top tabs: **Repertoire Health & Rotation** and **Setlist Circulation & Reuse**.
3. Click **Setlist Circulation & Reuse**:
   - Inspect the 4 KPI cards: Master Setlists, Total Reuses / Deployments, Top Reused Setlist, and Avg Charts / Setlist.
   - Filter by category (`Parade`, `Festival`, `Party`, etc.) or search by name.
   - Check the utilization table: tune counts, estimated duration, times reused badge (`Nx`), last deployed gig date/title, and assigned gig chips.
   - Click **Manage** on any row to jump directly back to `/admin/setlists`.

### 5. Testing Gig Management Setlist Integration (`/admin/gigs` & `/portal/gigs/[gigId]`)
1. Navigate to **Gig Management Studio** (`/admin/gigs`) as an Admin, Gig Manager, or Setlist Manager.
2. Click **Create New Gig**:
   - Notice the informative note explaining that every newly created gig begins with an empty setlist.
   - Enter a title, date, venue, and click **Create Performance Call Sheet**.
   - Verify the newly created gig card appears with `Empty setlist (no charts assigned)` and a prominent yellow `+ Assign Setlist` button.
3. On the gig card, click **Assign Setlist** to open the **Gig Setlist Assignment Modal**:
   - **Tab 1: Use Saved Setlist**: Search templates, filter by category, review tune preview chips, and click **Assign to Gig** (or **Customize Copy**).
   - **Tab 2: Build Unique Setlist**: Build a custom tune sequence directly from the catalog with tempo, key signature, notes, and segue cues. You can optionally check **Save as Reusable Setlist for Future Gigs** to register it in the master library.
   - Click **Save & Assign to Gig**.
4. Inspect the updated gig card item in the list:
   - Verify the **Performance Setlist** strip displays the setlist name in prominent bold yellow font (`text-sm font-extrabold text-yellow-400`).
   - Verify the badge pill correctly shows `[Library Saved]` (amber) or `[Gig-Unique]` (sky), alongside the chart count `(X charts)`.
   - Notice the direct `Remove` (`Trash2`) button and `Manage` (`ListMusic`) button.
5. Test Setlist Removal & Reset:
   - Click the `Remove` (`Trash2`) icon on the gig card item. Confirm the prompt to remove the setlist and start fresh.
   - Verify the gig card immediately transitions to `Empty setlist (no charts assigned)` with the yellow `+ Assign Setlist` action.
   - Verify in `doc(db, "setlists", gigId)` that `tunes` is cleared to `[]`, and the gig is unlinked from the master template.
   - Reopen the assignment modal and confirm you can freely choose between **Use Saved Setlist** or **Build Unique Setlist**.
6. **Verify No Duplication**: Assign a setlist to multiple gigs and reopen the selection modal on `/admin/gigs` or in `GigSetlistAssignmentModal`. Verify each master setlist appears exactly once, confirming per-gig live stage view documents (`doc(db, "setlists", gigId)`) are cleanly segregated from reusable templates.
7. Navigate to the gig call sheet at `/portal/gigs/[gigId]`:
   - Inspect the **Repertoire Setlist** card header: verify the assigned setlist title pill (e.g. `[● 30-Minute Street Parade Block]`) is prominently rendered alongside the tune count.
   - Click **Stage View** to launch the live performance view (`/portal/perform/[gigId]`).
   - For authorized managers (`canManageGigs` or `canManageSetlists`), test the **Manage Setlist** button or the empty state **+ Assign or Create Setlist** callout to assign, change, or remove setlists directly.

---

## Technical Verification Summary
- **TypeScript**: `npx tsc --noEmit` passed with 0 errors.
- **ESLint**: `npm run lint` passed with 0 errors and 0 warnings.
- **Schema Invariance**: All new schema fields (`portalThemeMode`, `usageCount`, `tunes`, `isTemplate`) include safe default values.
- **Emulator Seed**: Full regression seed via `npm run seed` verified, pre-populating:
  - 4 Master Setlist Templates in library (`Parade`, `Festival`, `Party`, `Ceremony`).
  - 3 Gigs using Saved Library Setlists (`gig_st_patricks_2026`, `gig_millvale_days_2026`, `gig_three_rivers_arts_2026`).
  - 2 Gigs with Unique Setlists (`gig_mattress_factory_2026`, `gig_lawrenceville_porchfest_2026`).
  - 1 Gig with an Empty Setlist default (`gig_bloomfield_2028`).
  - Atomically synchronized stage view documents across all gigs (`setlists/{gigId}`).
