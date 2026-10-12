# Stage 55: Scoped Brand & Theme Studio & Backend Security Lockdown

## Overview & Scope

Stage 55 delivers two major advancements to the Eagleburger Band platform:
1. **Scoped Brand & Theme Customization Studio:** Comprehensive administrative control over independent Public Website and Musician Portal color palettes, custom theme preset libraries, brand identity assets, and independent aesthetic tones (featuring slab serifs like Arvo and Rokkitt, modern sans like Poppins, and classic book serifs).
2. **Backend & Firestore Security Lockdown (PR #2):** Elimination of the catch-all rule in `firestore.rules` in favor of strict, collection-specific rules with user record verification, restricted profile self-updates, invite role enforcement, and server-side route caller validation via verified Firebase ID tokens and a service-account REST client.

---

## 1. Scoped Brand & Theme Studio (`/admin/theme`)

### Tab 1: Public Website Scheme
- **Custom Theme Generator & Presets Library:** Managers can select from signature presets (Eagleburger Gold, Crimson Fanfare, Emerald Groove, Monongahela Steel), create new custom theme variations (`+ Create Theme`), rename presets, customize palettes, and delete custom schemes (default Eagleburger Gold is protected).
- **8-Token Palette Customization:** Full color control over Primary, Accent, Logo Tint, Ambient Background, Surface, Muted Surface, Border, and Text.
- **CSS Mask Logo Tinting:** The canonical silhouette logo asset supports dynamic hex color tinting via CSS `mask-image` and WebKit masks, allowing the brand mark to match any theme without generating new image assets.
- **Factory Defaults Reset:** Ability to restore any built-in preset to original factory values.
- **Live Simulator:** Reactive right-column preview rendering marketing hero banners, event badges, and CTA buttons in the exact active public palette tokens.

### Tab 2: Musician Portal Scheme
- **Portal Scheme Presets & Generation:** Allows administrators to generate and edit portal color presets made available to all musicians in their personal preferences modal (`PortalThemeModal`).
- **Ensemble Default Setting:** Designate any portal scheme as the organizational baseline for all musicians who have not explicitly chosen a personal theme.
- **Real-Time Member Preference Sync:** Connected directly to `ThemeContext.tsx` and Firestore `users/{uid}`, persisting member preferences while adhering to the new restrictive Firestore security rules.
- **Live Simulator:** Displays internal operational cards, repertoire update priorities, and rehearsal notices styled with active portal tokens.

### Tab 3: Brand Identity & Visual Polish
- **Core Ensemble Identity & Assets:**
  - Official Ensemble Name (`bandName`)
  - Band Monogram (`monogram`, formatted uppercase, e.g. `EBB`)
  - Active Marching Season (`activeSeason`)
  - Logo Asset URI (`logoUrl`) and Favicon URI (`faviconUrl`)
  - Contextual link directing managers to `/admin/pages` for social channels and public text.
- **Independent Public vs. Portal Aesthetic Tone:**
  - Independent scopes (`publicTypography` & `publicVisualPolish` vs. `portalTypography` & `portalVisualPolish`).
  - Public marketing tone can emphasize bold slab serifs, heavy uppercase tracking, and atmospheric glow, while the musician portal remains cleanly focused on high-density legibility and subdued finishes.
- **Expanded Typography Library:**
  - **Heading Fonts:** **Arvo** (Geometric Slab Serif), **Rokkitt** (Heavy Vintage Industrial Slab), **Montserrat** (Classic Street Brass), **Oswald** (Condensed Impact), **Bebas Neue** (Tall Display), **Inter** (Clean Precision), and **Cinzel** (Regal Ceremonial Serif).
  - **Body Copy Fonts:** **Poppins** (Geometric & Friendly), **Inter** (High Legibility Default), **Roboto** (Everyday Sans), **Space Grotesk** (Tech Groove), **Merriweather** (Warm Editorial Book Serif), and **Lora** (Contemporary Flowing Literary Serif).
  - **Letter Tracking:** Normal (0), Wide (+0.05em), and Wider (+0.10em).
  - **Uppercase Transform:** Dedicated toggle to force uppercase heading styling per scope.
- **Visual Polish & Atmosphere:**
  - **Corner Radius Profiles:** Sharp (2px/4px Brutalist), Modern (12px/16px Balanced), and Pill / Soft (28px+ Organic Curves).
  - **Accent Glow Intensity:** None (Flat), Subtle (Soft ambient halo), and Vivid (High-voltage punch).
  - **Atmospheric Background Textures:** Solid Carbon, Dot Grid Matrix, Vignette Spotlight, and Brass Mesh Aura.
- **Dual-Scope Live Brand Specimen Simulator:**
  - Reactive preview switcher (`[ Public Fan Tone Preview ]` vs. `[ Portal Tone Preview ]`).
  - Dynamic monogram badge reflecting active corner geometry, glow, and primary color.
  - Live typography specimens for display headlines and body copy.
  - Micro-preview cards showcasing active surface textures, borders, and token breakdown specs.

---

## 2. Dynamic CSS Variables & Global Font Loading

### Theme Context (`src/lib/context/ThemeContext.tsx`)
- `getScopedStyles(scope)` dynamically maps active scoped tokens to CSS variables:
  - `--ebb-primary`, `--ebb-primary-text`, `--ebb-accent`, `--ebb-logo-color`
  - `--ebb-background`, `--ebb-surface`, `--ebb-surface-muted`, `--ebb-border`, `--ebb-text`
  - `--ebb-font-heading`, `--ebb-font-body`, `--ebb-tracking-heading`, `--ebb-transform-heading`
  - `--ebb-radius`, `--ebb-glow-intensity`

### Global CSS Integration (`src/app/globals.css`)
- `.public-site` headings (`h1`, `h2`, `h3`, `h4`, `.public-title`) dynamically bind to `var(--ebb-font-heading, var(--font-arvo, serif))`.
- `.public-site` body text and input fields dynamically bind to `var(--ebb-font-body, var(--font-poppins, sans-serif))`.
- Heading tracking and uppercase transforms bind to `--ebb-tracking-heading` and `--ebb-transform-heading`.

### Universal Font Loading
- Google Fonts stylesheet pre-loaded in [`src/app/(public)/layout.tsx`](file:///c:/repos/eagleburgerband/src/app/(public)/layout.tsx) and the admin theme simulator for all 11 typography options.

---

## 3. Backend & Firestore Security Lockdown (PR #2)

### Granular Firestore Security Rules (`firestore.rules`)
- **Removal of Catch-All:** The permissive catch-all rule was removed; every collection has an explicit security rule block.
- **User Document Security (`users/{userId}`):**
  - Members can edit their own profiles but are strictly barred from modifying `roles`, `role`, `uid`, or `claimedInviteToken`.
  - Self-status transitions are restricted to allowed states (`active`, `hiatus`, `inactive`).
  - Section leaders can only edit section membership and instrument assignments.
  - Admins and membership managers have full roster editing permissions.
- **Invite Claims Hardening (`invites/{token}`):**
  - Enforces that role claims match the invite's designated roles.
  - Invites with elevated permissions require a verified email address from the caller.
- **Theme & Navigation Rules:**
  - `theme`: Public read allowed (`allow read: if true;`), write restricted to authenticated members with manager UI gating.
  - `navigation_config`, `portal_metrics_config`, `system_config`: Member read allowed, write restricted strictly to `isAdmin()`.

### Server-Side Route Verification & Admin Client
- **Caller Token Verification (`src/lib/auth/serverAuth.ts`):** Server routes (`/api/email/*`, `/api/admin/*`, `/api/calendar/*`, webhooks) verify incoming Firebase ID tokens and validate caller roles before executing privileged operations.
- **Server Firestore Client (`src/lib/firebase/serverFirestore.ts`):** Secure server-side Firestore operations executed through a dedicated service-account REST client.
- **Safe Account Purge:** `/api/admin/users/purge` cleanses Firestore user documents and records before deleting the Auth account.
- **Seed Script Lockdown:** Updated emulator seeding script to authenticate using the emulator owner token.

---

## 4. Verification & Testing

- **TypeScript Compilation:** `npx tsc --noEmit` verified with **0 errors**.
- **Schema Validation:** All schemas in `src/lib/schema/theme.ts` enforce safe `.default()` values in compliance with **Rule 2 (Schema Invariance)**.
- **RBAC & Permissions:** Admin Theme Studio strictly gated by `canManageTheme(profile)`.
- **Git Tree Cleanliness:** All feature changes merged into `next-trunk`.

