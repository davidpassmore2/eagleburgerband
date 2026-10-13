# Stage 57: Architectural Hardening, Song Catalog Alignment & Interactive Bubble Physics

## Overview & Scope

Stage 57 focused on three primary areas:
1. **Architectural Review & Security Hardening (Recommendations 1–5):**
   - Completed deep platform audit across all 35 Zod schemas, 40 portal routes, 18 API routes, and Firestore security rules.
   - Closed critical Rule 4 HTML sanitization gaps in email simulation previews with DOMPurify.
   - Created `SystemConfigSchema` to enforce Rule 2 schema invariance on `system_config`.
   - Instituted centralized defense-in-depth route guards in `src/app/(portal)/layout.tsx` enforcing Rule 3 across all 38+ portal tools.
   - Replaced redundant real-time listeners on static public announcements with `getDoc` to optimize connection overhead.
   - Created reusable `<ConfirmModal>` component to phase out native `window.confirm()`.
2. **Repertoire to Song Catalog Terminology Alignment:**
   - Re-aligned user-facing navigation, page headers, breadcrumbs, and search interfaces from "Repertoire" to "Song Catalog".
   - Maintained "Tunes" as the canonical underlying entity model for arrangement parts, charts, and audio links.
3. **Public Website Special Effects Studio & Interactive Bubble Physics:**
   - Introduced the "Special Effects" tab in `/admin/theme` under the Brand & Palette Customizer.
   - Extended `ThemeSchema` with `specialEffects` (toggle, opacity, density, variability).
   - Engineered `PublicBubbleOverlay.tsx` with Shadow DOM isolation, custom variability algorithms, organic lifecycles with pop bursts, dynamic scaling growth, and aerodynamic mouse deflection with poke-to-pop physics while preserving 100% non-blocking click-through capability.

---

## 1. Architectural Scan & Security Hardening

### Rule 4 Compliance: Email Preview Sanitization
- **Files Modified:** [`src/app/(portal)/admin/notifications/page.tsx`](file:///c:/repos/eagleburgerband/src/app/(portal)/admin/notifications/page.tsx)
- Replaced un-sanitized `dangerouslySetInnerHTML={{ __html: simulatedHtmlBody }}` call sites with `sanitizeHtml(simulatedHtmlBody)` via `isomorphic-dompurify`.
- Prevents stored/reflected XSS when composing broadcast templates or viewing historical dispatch logs.

### Rule 2 Compliance: System Configuration Schema
- **New File:** [`src/lib/schema/systemConfig.ts`](file:///c:/repos/eagleburgerband/src/lib/schema/systemConfig.ts)
- Defined `CloudinaryConfigSchema`, `SystemIntegrationsConfigSchema`, and `SystemConfigDocSchema` with safe `.default()` values.
- Updated [`src/lib/cloudinary/widget.ts`](file:///c:/repos/eagleburgerband/src/lib/cloudinary/widget.ts) to validate config data against the schema prior to writing or reading Firestore documents.

### Rule 3 Defense-in-Depth: Centralized Portal Route Interception
- **Files Modified:** [`src/app/(portal)/layout.tsx`](file:///c:/repos/eagleburgerband/src/app/(portal)/layout.tsx)
- Added route guard evaluation matching requested `pathname` against `ALL_WORKSPACE_TOOLS[].requiredRoles`.
- Unauthenticated or unauthorized deep-link attempts immediately render an `<AccessDenied>` banner rather than exposing internal administration UI or relying solely on Firestore rejection.

### Performance: Announcement Banner Listener Hygiene
- **Files Modified:** [`src/components/public/PublicAnnouncementBanner.tsx`](file:///c:/repos/eagleburgerband/src/components/public/PublicAnnouncementBanner.tsx)
- Replaced visitor-level `onSnapshot` subscription with a one-time `getDoc` read on `site_navigation/config`, drastically reducing active WebSocket listener counts during public traffic spikes.

### Modal Abstraction: Reusable Confirmation Dialog
- **New File:** [`src/components/portal/ConfirmModal.tsx`](file:///c:/repos/eagleburgerband/src/components/portal/ConfirmModal.tsx)
- Accessible, non-blocking modal dialog to replace synchronous `window.confirm()` calls across management tables.

---

## 2. Repertoire to Song Catalog Terminology Alignment

- Audited and updated the Musician Portal navigation sidebar, workspace registry (`WORKSPACE_TOOLS`), admin route layouts, and page headers:
  - Replaced legacy labels ("Repertoire Catalog", "Repertoire Studio") with **"Song Catalog"**.
  - Verified underlying entity models: "Tunes" remains canonical for individual arrangements, audio vault records, and sheet music parts, while "Song Catalog" provides an intuitive, recognizable umbrella term for band members and managers.
  - Inspected the Styles dropdown filters, confirming dynamic derivation from active repertoire genre tags.

---

## 3. Special Effects Studio & Themed Bubble Generator

### Schema Definition (`src/lib/schema/theme.ts`)
```ts
export const SpecialEffectsSchema = z.object({
  enabled: z.boolean().default(false),
  opacity: z.number().min(0).max(100).default(40),
  density: z.number().min(1).max(100).default(30),
  variability: z.number().min(0).max(100).default(50),
});
```

### Brand Customizer Integration (`src/app/(portal)/admin/theme/page.tsx`)
- Added **Special Effects** tab featuring:
  - Active toggle switch.
  - Sliders for **Effect Opacity** (0% to 100%), **Bubble Density** (spawn interval scaled from 120ms to 900ms), and **Variability** (variance in speed, size, and sway).
  - Live preview simulator box allowing real-time testing of bubble physics alongside the palette tokens before saving to Firestore.

### Kinetic Physics Engine (`src/components/public/PublicBubbleOverlay.tsx`)
1. **Shadow DOM Isolation:** Injected via Shadow DOM to prevent any CSS rule leakage into or out of public page components.
2. **Three-Tier Coordinate Decoupling:**
   - `.bubble-mover`: Vertical ascent and sinusoidal swaying arcs (`@keyframes floatUp`).
   - `.bubble-deflector`: Dynamic mouse repulsion and wake velocity draft via CSS variables `--mouse-nudge-x` / `--mouse-nudge-y` with spring overshoot easing (`cubic-bezier(0.18, 0.89, 0.32, 1.25)`).
   - `.bubble-body`: Spherical gradient styling, growth expansion (`@keyframes bubbleGrow`), and pop bursts (`@keyframes bubblePop`).
3. **Interactive Mouse Aerodynamics:**
   - **Poke-to-Pop:** Direct contact within the bubble core radius triggers an instant pop burst.
   - **Aerodynamic Deflection:** Proximity repulsion pushes bubbles away from the cursor trajectory with non-linear power falloff.
   - **Slipstream Wake Draft:** Cursor momentum transfers directional velocity draft to passing bubbles.
   - **Smooth Restitution:** Resets nudges back to 0px smoothly when the cursor moves away.
4. **Non-Blocking Click-Through:** Guaranteed pass-through with `pointer-events: none` across all bubble nodes and RAF event throttling with zero React re-renders.
5. **Route-Change Burst Dynamics:**
   - Detects Next.js route transitions (`usePathname()`) and fires an instantaneous celebratory cluster volley.
   - Spawns at a spiked rate (accelerating up to ~4.5&times; baseline frequency with buoyant upward zip).
   - Gracefully eases and dwindles down over 3.2 seconds using a non-linear decay schedule (`(1 - t)^2.2`) back to the ambient baseline interval without remounting the DOM overlay.

---

## Verification & Build Status

- **Type Safety:** Clean compilation with `npx tsc --noEmit` (0 errors).
- **Security Check:** Verified HTML sanitization in notifications and central portal RBAC route guard.
- **Git Commits:**
  - `3a0c0ac` — Harden portal security and RBAC
  - `09b949d` — Rename repertoire UI to Song Catalog
  - `9cd28cc` — Add themed public bubble effects
  - `768c455` — Add bubble variability controls
  - `6b5042c` — Add organic bubble lifecycles and pop bursts
  - `cb9aef9` — Add pointer interaction and deflector for bubbles

