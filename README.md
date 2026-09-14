# Eagleburger Band Web Platform & Musician Operations Portal

The official web platform and internal operations hub for Pittsburgh's premier street brass, percussion, and revelry powerhouse: **The Eagleburger Band**.

Built with [Next.js 16 (Turbopack)](https://nextjs.org), React 19, TypeScript, Tailwind CSS, and local offline [Firebase Emulators](https://firebase.google.com).

---

## 🚀 Quickstart for Developers

For a complete onboarding walkthrough, see the **[Developer Onboarding Guide](docs/DEVELOPER_ONBOARDING.md)**.

### 1. Prerequisites
- **Node.js** `v20.x` or higher
- **Java JRE/JDK** (version 11+ required for local Firebase Firestore/Storage emulators)
- **Git**

### 2. Clone & Install
```bash
git clone <repository-url>
cd eagleburgerband
git checkout next-trunk
npm install
```

### 3. Start Local Firebase Emulators (Terminal 1)
```bash
npm run emulators
```
- Emulators UI available at **[http://localhost:4000](http://localhost:4000)** (Auth: `9099`, Firestore: `8080`, Storage: `9199`).

### 4. Seed Local Database (Terminal 2)
```bash
npm run seed
```
- Populates sections, roster, gigs, tunes, booking leads, giving records, and the financial ledger.
- Seeds canonical Super Admin: `davidpassmore@gmail.com` / `admin39`.

### 5. Start Development Server (Terminal 2 or 3)
```bash
npm run dev
```
- Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 📖 Key Documentation

| Document | Description |
| :--- | :--- |
| **[Developer Onboarding](docs/DEVELOPER_ONBOARDING.md)** | Step-by-step setup for Firebase Emulators, Antigravity IDE, seed engine & testing |
| **[Project Rules (AGENTS.md)](AGENTS.md)** | Mandatory architectural guardrails (Next.js conventions, branch model, schema safety) |
| **[Stages Index (docs/stages/)](docs/stages/README.md)** | Chronological implementation plans and walkthroughs for Stages 01 through 35 |
| **[Architecture Overview](docs/ARCHITECTURE.md)** | System components, data pipelines, and progressive web app capabilities |

---

## 🛠️ Project Guardrails

1. **Branching Model:** Feature branches branch off and merge into `next-trunk` (e.g., `feature/stage-36`).
2. **Schema Invariance:** Never mutate Firestore directly without defining or updating the corresponding Zod schema in `src/lib/schema/` with safe `.default()` values.
3. **Role-Based Access Control (RBAC):** Portal routes and operations respect permissions (`admin`, `web_manager`, `gig_manager`, `catalog_manager`, `community_manager`, `treasurer`, `section_leader`, `member`, `guest`).
4. **Sanitization:** Raw HTML/Markdown must pass through `isomorphic-dompurify` or `rehype-sanitize`.

---

## 🧪 Verification Commands

Always run these quality gates before opening a pull request into `next-trunk`:

```bash
npx tsc --noEmit    # TypeScript type validation (0 errors required)
npm run lint         # ESLint standards check
npm run build        # Production build verification
```
