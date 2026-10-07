# Stage 43: Official Brand Logo Integration Implementation Plan

## Problem Statement
The public website header, public footer, member portal sidebar, and mobile portal header previously used placeholder music note icons (`<Music2>`) or a plain text badge (`[EBB]`). The user requested replacing these with the official circular Eagleburger Band logo file (`media_1790893374318.png`).

## Scope & Target Locations
1. **Asset Ingestion:**
   - Store user-provided logo PNG in `public/images/eagleburger-logo.png` and `public/images/logo.png`.
2. **Public Navigation Header (`src/components/public/PublicHeaderNav.tsx`):**
   - Replace `<Music2>` placeholder inside the brand link with `/images/eagleburger-logo.png`.
   - Maintain brand styling with dark backdrop and yellow accent ring border.
3. **Portal Layout (`src/app/(portal)/layout.tsx`):**
   - Replace the `[EBB]` text badge in the desktop sidebar header with `/images/eagleburger-logo.png`.
   - Replace the `[EBB]` text badge in the mobile header with `/images/eagleburger-logo.png`.
4. **Public Footer (`src/components/public/PublicFooter.tsx`):**
   - Replace `<Music2>` placeholder with `/images/eagleburger-logo.png`.
5. **CMS Page Studio (`src/app/(portal)/admin/pages/page.tsx`):**
   - Replace simulated preview header's `<Music2>` placeholder with `/images/eagleburger-logo.png`.

## Verification Gates
- `npx tsc --noEmit`
- `npm run lint`
- `npm run build`
