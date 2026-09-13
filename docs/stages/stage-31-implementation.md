# Stage 31: Member Multi-Platform Authentication Hub & Dedicated Login Suite

Comprehensive technical design and execution plan to upgrade member authentication from single-provider (Google) into a full-featured, multi-platform authentication hub with a dedicated branded login page, passwordless magic links, Apple/Microsoft/GitHub OAuth, email/password registration, smart return redirects, and roster invite auto-linking.

---

## 1. User Review Required

> [!IMPORTANT]
> **Firebase Authentication Configuration in Production**:
> - In local development and emulators, all OAuth providers (`google.com`, `apple.com`, `microsoft.com`, `github.com`), Email/Password, and Email Link (Magic Link) work out of the box via Firebase Auth Emulator (`localhost:9099`).
> - In live production Firebase, administrators must enable the corresponding Sign-in Providers in the Firebase Console (Authentication > Sign-in method) and supply the respective client IDs and secrets (e.g., Apple Developer Services ID, Microsoft Azure Entra App ID, GitHub OAuth App).

> [!NOTE]
> **Magic Link Action Code Settings**:
> - The passwordless email link will direct users back to `${origin}/login?email=${email}&magic=true`. When detected on page load, `AuthContext` completes the sign-in and smoothly navigates the user to their target redirect destination.

---

## 2. Proposed Changes

### A. Authentication Core & State Management Layer

#### [MODIFY] [`src/lib/context/AuthContext.tsx`](file:///c:/repos/eagleburgerband/src/lib/context/AuthContext.tsx)
Expand `AuthContextValue` and `AuthProvider` with the full multi-platform suite:
1. **OAuth Providers**:
   - `signInWithGoogle`: Refined popup with fallback to redirect.
   - `signInWithApple`: `OAuthProvider("apple.com")` with scopes `name` and `email`.
   - `signInWithMicrosoft`: `OAuthProvider("microsoft.com")` with tenant options.
   - `signInWithGithub`: `GithubAuthProvider` with public email scope.
2. **Email & Password Suite**:
   - `signInWithPassword(email, password)`: `signInWithEmailAndPassword(auth, email, password)`.
   - `signUpWithPassword(email, password, displayName)`: `createUserWithEmailAndPassword(auth, email, password)` followed by `updateProfile(user, { displayName })`.
   - `sendPasswordReset(email)`: `sendPasswordResetEmail(auth, email)` with user-friendly error formatting.
3. **Passwordless Magic Link Suite**:
   - `sendMagicLink(email, redirectUrl?)`: Dispatches `sendSignInLinkToEmail(auth, email, actionCodeSettings)` and persists `emailForSignIn` in `localStorage`.
   - `signInWithMagicLink(email, href)`: Validates `isSignInWithEmailLink(auth, href)` and calls `signInWithEmailLink(auth, email, href)`.
   - `isMagicLink(href)`: Helper returning boolean.
4. **Roster & Invite Auto-Matching on First Sign-In**:
   - When a new Firebase user authenticates and no document exists in `users/${user.uid}`:
     - Search the `invites` collection for a pending invite with `email == user.email.toLowerCase()`.
     - If matched, automatically populate `displayName`, `sectionId`, and `roles` from the invite, and update the invite status to `"claimed"` with timestamp and `claimedByUid`.
     - If no invite is found, generate default `member` profile with their auth display name and email.
5. **Provider Metadata Detection**:
   - Store and expose `authProviderId` (e.g., `"google.com"`, `"apple.com"`, `"microsoft.com"`, `"github.com"`, `"password"`) to display appropriate provider badges in the portal.

---

### B. Dedicated Public Login Hub & Redirects

#### [NEW] [`src/app/(public)/login/page.tsx`](file:///c:/repos/eagleburgerband/src/app/(public)/login/page.tsx)
A dedicated, high-impact login hub accessible at `/login`:
1. **Eagleburger Visual Identity**:
   - Deep slate/brass gold styling, band crest, and subtitle *"Musician & Crew Portal"*.
2. **Fast Social Sign-In Grid**:
   - High-contrast branded buttons for **Google**, **Apple**, **Microsoft**, and **GitHub** with official SVG icons and accessible hover states.
3. **Email Sign-In Tabs**:
   - **Magic Link Tab**:
     - Single email input with "Send Magic Link" button.
     - Confirmation banner when link is dispatched.
     - Automatic detection: If the page loads with an email sign-in link in the URL, automatically executes the sign-in with loading spinner and redirects.
   - **Password Tab**:
     - Toggle between **Sign In** and **Create Account**.
     - Inputs for Email, Password (with eye toggle for show/hide), and Display Name (for registration).
     - "Forgot Password?" trigger opening an inline password reset card with instant email dispatch.
4. **Smart Redirect Handling**:
   - Reads `?redirect=/portal/...` query parameter (defaulting to `/portal`).
   - Seamlessly pushes authenticated users to their requested destination.
5. **Dev Persona Fast Switcher**:
   - In development mode (or toggleable), displays a quick-sign-in drawer with 1-click persona buttons:
     - *Band Administrator* (`manager@eagleburger.org`)
     - *Gig Manager*
     - *Catalog Manager*
     - *Section Leader (Percussion)*
     - *Member Musician*

#### [NEW] [`src/app/(portal)/portal/login/page.tsx`](file:///c:/repos/eagleburgerband/src/app/(portal)/portal/login/page.tsx)
Convenience redirect route forwarding directly to `/login`, preserving any incoming query parameters (`?redirect=...`).

---

### C. Portal Route Guarding & Shell Enhancements

#### [MODIFY] [`src/app/(portal)/layout.tsx`](file:///c:/repos/eagleburgerband/src/app/(portal)/layout.tsx)
1. **Auth Gate & Return Redirect**:
   - If an unauthenticated user loads any portal or admin route (`/portal/*`, `/admin/*`), seamlessly redirect to `/login?redirect=${encodeURIComponent(pathname)}` with return path preservation.
2. **Provider Badge in Sidebar**:
   - Display the member's sign-in provider icon (Google, Apple, Microsoft, GitHub, or Email badge) next to their name and avatar.
3. **Clean Sign-Out Button**:
   - Unified `Sign Out` button with tooltip and confirmation.

#### [MODIFY] [`src/components/public/PublicHeaderNav.tsx`](file:///c:/repos/eagleburgerband/src/components/public/PublicHeaderNav.tsx)
1. **Dynamic Navigation CTA**:
   - If user is logged out: Renders `"Member Sign In"` button with `LogIn` icon pointing to `/login`.
   - If user is logged in: Renders `"Musician Portal"` badge button with user display name or section pill pointing to `/portal`.

#### [MODIFY] [`src/components/public/PublicFooter.tsx`](file:///c:/repos/eagleburgerband/src/components/public/PublicFooter.tsx)
1. Updates the Musician Portal footer link to point to `/login` when logged out and `/portal` when logged in.

---

## 3. Verification Plan

### Automated Quality Checks
- `npx tsc --noEmit`: Strict TypeScript validation across all auth methods, props, and schemas.
- `npm run lint`: ESLint check ensuring zero lint errors or unused variables.
- `npm run build`: Next.js 16 (Turbopack) production build validating that all 50+ routes generate and compile cleanly.

### Manual & Interactive Verification
1. **Multi-Platform Provider Verification**:
   - Test Google, Apple, Microsoft, and GitHub OAuth sign-in triggers and popups.
2. **Email & Password Flow**:
   - Test member registration, standard email sign-in, and "Forgot Password" reset email dispatch.
3. **Passwordless Magic Link**:
   - Test sending sign-in link, local storage email caching, and incoming link completion.
4. **Smart Redirect**:
   - Navigate directly to `/admin/gigs` while logged out -> verify redirection to `/login?redirect=%2Fadmin%2Fgigs`.
   - Log in -> verify immediate return to `/admin/gigs`.
5. **Roster Invite Auto-Match**:
   - Create a test invite in `/admin/roster` -> sign in with that email -> verify section and roles are claimed and applied automatically.
