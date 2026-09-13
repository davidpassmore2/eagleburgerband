# Stage 33: Member Portal PWA Optimization & Installation Suite Implementation Plan

## Overview
Stage 33 focuses specifically on tailoring and optimizing the Progressive Web App (PWA) experience for the **authenticated member-side portal** (`/portal/*`):
1. **PWA Manifest Calibration**: Configured `start_url` to `/portal`, set `scope: "/"`, added quick member shortcuts for gigs, library, and availability, and updated application branding to "Eagleburger Band Member Portal".
2. **Apple & Viewport Metadata**: Added `manifest: "/manifest.webmanifest"`, `appleWebApp` meta tags, and exported standard theme color and viewport definitions in Next.js root layout.
3. **PWA Assets Generation**: Generated official high-resolution PNG icons in `public/` (`icon-192.png`, `icon-512.png`, `icon-512-maskable.png`, and `apple-touch-icon.png`) to satisfy browser installability audits.
4. **Member Portal Installation Triggers & Standalone Detection**:
   - Built a shared `pwaStore` to coordinate `beforeinstallprompt` and standalone mode detection without React state-in-effect pitfalls.
   - Mounted `PortalPwaCard` on the **Musician Portal Overview** (`/portal`) and **Musician Profile** (`/portal/profile`), providing members with direct 1-click install capabilities and an interactive installation modal for iOS, Android, and Desktop.

---

## Technical Architecture

### 1. PWA Manifest & Metadata Route ([`src/app/manifest.ts`](file:///c:/repos/eagleburgerband/src/app/manifest.ts))
- **Scope & Start URL**:
  - `start_url: "/portal"`: App opens directly to the authenticated musician dashboard upon launch.
  - `scope: "/"`: Broad scope guarantees that session expiration redirects to `/login` and return journeys happen within the standalone PWA window without kicking users into a regular browser tab.
- **Member App Shortcuts**:
  - `/portal/gigs`: Jump directly to upcoming performances and call sheets.
  - `/portal/library`: Jump directly to repertoire charts and setlists.
  - `/portal/availability`: Jump directly to the blackout availability calendar.

### 2. Apple Web App & Viewport Exports ([`src/app/layout.tsx`](file:///c:/repos/eagleburgerband/src/app/layout.tsx))
- **`viewport` export**: Provides `themeColor: "#0B0F19"`, `width: "device-width"`, and `initialScale: 1`.
- **`metadata.appleWebApp`**: Configured `capable: true`, `statusBarStyle: "black-translucent"`, and `title: "Eagleburger Portal"`.
- **`metadata.icons`**: Linked `icon-192.png`, `icon-512.png`, and `apple-touch-icon.png`.

### 3. PWA Assets ([`public/`](file:///c:/repos/eagleburgerband/public))
- `icon-192.png`: 192x192 PNG for Android/Desktop app icons.
- `icon-512.png`: 512x512 PNG for high-density app stores and splash screens.
- `icon-512-maskable.png`: 512x512 PNG with safe-zone padding and `#0B0F19` background for adaptive Android launcher icons.
- `apple-touch-icon.png`: 180x180 PNG for iOS home screen bookmarks.

### 4. Shared PWA Store & Components
- **`src/lib/pwa/pwaStore.ts`**:
  - Captures `beforeinstallprompt` event and manages deferred prompt lifecycle.
  - Exposes `getStandaloneSnapshot()` and `getIOSSnapshot()` for hydration-safe `useSyncExternalStore` hooks.
- **`src/components/portal/PortalPwaCard.tsx`**:
  - Displays standalone confirmation when already installed or running as a PWA.
  - Displays 1-click install or step-by-step modal guide for iOS Safari, Android Chrome, and Desktop browsers.
- **`src/components/common/PwaInstallBanner.tsx`**:
  - Connected to shared `pwaStore` and storage-based dismissal subscription.

