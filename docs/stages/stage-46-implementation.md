# Stage 46: Multi-Environment Architecture & Cloud Beta Migration Implementation Plan

## Problem Statement & Goals
As the Eagleburger Band platform approaches member acceptance testing and cutover, a structured multi-environment architecture is required to graduate features reliably:
1. **Multi-Environment Strategy:**
   - **`dev`**: Local offline development using Firebase Local Emulators (ports 8080, 9099). Rapid, cost-free, offline development with mock accounts and seed resets.
   - **`beta`**: Dedicated live Google Firebase Cloud project (`eagleburger-band-beta`) configured for user acceptance testing (UAT) with real band members on web/mobile browsers.
   - **`prod`**: Future production environment (`eagleburger-band`) for public traffic and live band operations.
2. **Flexible Client SDK Emulator Toggling:**
   - Allow runtime environment configuration via `.env.local` or `.env.beta` with `NEXT_PUBLIC_USE_FIREBASE_EMULATOR=false` to seamlessly connect the Next.js app to cloud Firebase without emulator fallbacks.
   - Graceful fallback for omitted services (such as Firebase Cloud Storage, since sheet music uses Google Drive and visual media uses Cloudinary).
3. **Automated Cloud Beta Seeding:**
   - Build an automated, schema-validated provisioning script (`scripts/seed-beta.ts` / `npm run seed:beta`) capable of authenticating as the Super Admin against the live cloud Firebase instance and safely seeding baseline collections.
4. **Environment Aliasing:**
   - Maintain multi-project targets in `.firebaserc` (`default` for dev, `beta` for staging/acceptance).

---

## Scope & Target Locations

### 1. Environment & Project Files
- **[`.firebaserc`](file:///c:/repos/eagleburgerband/.firebaserc)**:
  - Add `"beta": "eagleburger-band-beta"` alias alongside `"default": "eagleburger-band-dev"`.
- **[`.env.beta`](file:///c:/repos/eagleburgerband/.env.beta)**:
  - Configure beta API keys, project ID, auth domain, messaging sender ID, app ID, and `NEXT_PUBLIC_USE_FIREBASE_EMULATOR=false`.
- **[`.env.example`](file:///c:/repos/eagleburgerband/.env.example)**:
  - Document all multi-environment variables, messaging sender IDs, app IDs, and emulator control flags.

### 2. Client SDK Initialization (`src/lib/firebase/client.ts`)
- Update emulator detection logic to respect `NEXT_PUBLIC_USE_FIREBASE_EMULATOR=false` explicitly.
- Safeguard storage emulator initialization to prevent runtime crashes if Cloud Storage is unconfigured or unused.

### 3. Automated Cloud Beta Provisioning Script (`scripts/seed-beta.ts`)
- Command: `npm run seed:beta` or `npm run seed:beta -- <password>`.
- Authenticates securely via `signInWithEmailAndPassword` as `davidpassmore@gmail.com`.
- Populates validated baseline Firestore collections:
  - `users`: Super Admin profile with all 9 administrative roles and `schemaVersion: 1`.
  - `sections`: 6 core band sections (Drumline, Sousaphones, Trombones, Trumpets, Saxophones, Auxiliary) with designated section leaders.
  - `theme/config`: v2 scoped theme configuration (Gold & Charcoal theme, active season).
  - `site_navigation/config`: Global navigation schema and active banner.
  - `content_pages`: 7 baseline system CMS pages (`DEFAULT_SYSTEM_PAGES_LIST`).
  - `resources`: 8 default media and branding assets (`DEFAULT_RESOURCES`).
  - `portal_metrics_config/global`: Usage metrics telemetry configuration.
  - `tunes`: 9 canonical repertoire charts.
  - `setlists`: 3 master templates (Parade, Festival, Beer Garden) plus gig-specific stage setlists.
  - `gigs`: 3 initial verification gigs (1 completed and 2 upcoming) with call sheets, setlists, and an RSVP for the Super Admin.

### 4. Package Scripts (`package.json`)
- Add `"seed:beta": "tsx --env-file=.env.beta scripts/seed-beta.ts"`.

