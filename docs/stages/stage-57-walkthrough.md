# Stage 57: Architectural Hardening, Song Catalog & Interactive Bubble Physics Walkthrough

## Feature Walkthrough & Verification Guide

This guide walks through verifying the newly implemented architectural hardening, Song Catalog terminology alignment, and interactive Special Effects Bubble Generator engine.

---

### Scenario 1: Defense-in-Depth Portal Route Interception (Rule 3)

1. **Test Direct URL Navigation with Insufficient Role:**
   - Log into the portal with an account lacking admin privileges (e.g. `member` or `guest`).
   - Manually enter an administrative URL into the browser address bar (e.g., `/admin/finance`, `/admin/notifications`, or `/admin/theme`).
2. **Observe Centrally Enforced Interception:**
   - Verify that rather than rendering the underlying administrative controls or failing silently on Firestore queries, the layout intercepts the navigation and renders the styled `<AccessDenied>` banner with required role guidance.
3. **Test Permitted Navigation:**
   - Log in as an administrator or granted role.
   - Navigate to the same URL; verify that the screen loads normally without interruption.

---

### Scenario 2: Song Catalog Terminology & Dynamic Styles Filter

1. **Verify Musician Portal Navigation:**
   - Open the Musician Portal sidebar.
   - Observe the updated navigation item: **Song Catalog** (formerly "Repertoire Catalog").
2. **Verify Admin Repertoire Studio:**
   - Navigate to `/admin/catalog` or `/admin/tunes`.
   - Confirm headers, search bars, and action links uniformly reference **Song Catalog** for top-level search and **Tunes** for individual chart records.
3. **Verify Styles Dropdown:**
   - Check the **Style** filter dropdown.
   - Confirm it dynamically reflects the genre tags (e.g., Funk, Polka, Brass Rock, Second Line) present in the active tunes collection.

---

### Scenario 3: Special Effects Studio Configuration (`/admin/theme`)

1. **Navigate to the Theme Customizer:**
   - Log in as an admin or web manager and go to `/admin/theme`.
2. **Open the Special Effects Tab:**
   - Click on the newly added **Special Effects** tab (fourth tab alongside Public Scheme, Portal Scheme, and Brand Identity).
3. **Review Generator Controls:**
   - **Active Toggle:** Toggle the effect on/off.
   - **Effect Opacity:** Slide between 0% and 100% to adjust bubble transparency.
   - **Density:** Adjust the spawn rate slider from low density (fewer bubbles, spaced apart) to high density (a steady stream).
   - **Variability:** Adjust from 0% (uniform sizing, straight ascent, synchronized speeds) to 100% (high variance in speed, size, and lateral sway arcs).
4. **Live Simulator Verification:**
   - Observe the live simulator panel on the right.
   - Confirm that the bubbles appear inside the simulator preview and dynamically update in real time as sliders are moved before saving.
5. **Save Configuration:**
   - Click **Save Theme Configuration**.
   - Confirm the success toast notification appears and the values persist to `theme/active`.

---

### Scenario 4: Interactive Bubble Physics & Mouse Influence

1. **Navigate to Public Marketing Website:**
   - Go to any public page (e.g. `/`, `/shows`, `/about`).
   - Ensure the bubble effect is active.
2. **Observe Organic Growth & Lifespan Pops:**
   - Watch newly spawned bubbles:
     - Notice individual bubbles grow in volume (`bubbleGrow`) as they rise through the atmosphere.
     - Observe bubbles reaching their randomized lifespan and bursting in place (`bubblePop` keyframe) with expanding translucent halos before smoothly disappearing.
3. **Test Mouse Proximity Deflection:**
   - Move your cursor near rising bubbles.
   - Observe bubbles deflecting aerodynamically away from the cursor along radial repulsion vectors.
4. **Test Slipstream Wake Draft:**
   - Rapidly flick the mouse through a cluster of bubbles.
   - Observe the directional wind wake pulling or pushing bubbles along the movement path.
5. **Test Poke-to-Pop:**
   - Move your cursor directly into the center of a bubble.
   - Observe the bubble immediately burst into micro-droplets on direct contact.
6. **Verify 100% Click-Through Non-Blocking Behavior:**
   - Click on links, navigation headers, audio player buttons, and event registration forms directly under or through floating bubbles.
   - Confirm that `pointer-events: none` on the Shadow DOM host allows all underlying click events to register immediately without delay.

