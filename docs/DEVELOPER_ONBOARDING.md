# Developer Onboarding Guide: Eagleburger Band

Welcome to the Eagleburger Band engineering team! This guide will walk you through setting up your local environment, running the **Firebase Emulator Suite**, configuring the **Antigravity AI IDE**, and following the team's development workflows.

---

## 1. Architecture Quick Overview

- **Frontend & App Framework:** [Next.js 16 (Turbopack)](https://nextjs.org), React 19, TypeScript
- **Styling & UI:** Tailwind CSS, Lucide Icons, Radix UI primitives
- **Backend & Database:** Local [Firebase Suite](https://firebase.google.com) (Firestore, Authentication, Storage) running 100% offline via emulators
- **Data Contracts & Schema:** Contract-First Zod validation with safe `.default()` values in `src/lib/schema/`
- **Application Model:** Progressive Web App (PWA) with install prompts and offline chart caching
- **AI-Assisted Pair Programming:** Codified project rules in [`AGENTS.md`](../AGENTS.md) and [`CLAUDE.md`](../CLAUDE.md) for Antigravity, Cursor, and Claude Code

---

## 2. System Prerequisites

Before starting, ensure your workstation has the following installed:

1. **Node.js**: `v20.x` or higher (`node -v`)
2. **npm**: `v10.x` or higher (`npm -v`)
3. **Java Runtime Environment (JRE/JDK)**: Version 11 or higher (`java -version`)
   > [!IMPORTANT]
   > The Firebase Emulator Suite runs Cloud Firestore and Cloud Storage as lightweight local Java processes. If `java` is not installed on your system path, the emulators will fail to start.
   > - **macOS (Homebrew):** `brew install openjdk@17`
   > - **Windows (Winget / Chocolatey):** `winget install Microsoft.OpenJDK.17`
   > - **Ubuntu/Debian:** `sudo apt install openjdk-17-jre`
4. **Git**: (`git --version`)
5. **Antigravity IDE** *(Recommended)*: Download and install the Antigravity pair programming editor.

---

## 3. Repository Setup

Clone the repository and check out the active trunk branch:

```bash
# Clone the repository
git clone <repository-url>
cd eagleburgerband

# Switch to the primary trunk branch
git checkout next-trunk

# Install npm dependencies
npm install
```

> [!NOTE]
> All feature work branches off and merges back into `next-trunk`. Do NOT branch off or merge directly into `master`.

---

## 4. Firebase Local Emulator Suite Setup

This project is configured to run **100% locally** without requiring cloud access, billing, or real Google API credentials.

### Starting the Emulators

In your primary terminal, run:

```bash
npm run emulators
```

This launches the local Firebase Emulators defined in [`firebase.json`](../firebase.json):

| Service | Port | Endpoint / Purpose |
| :--- | :--- | :--- |
| **Emulator Web UI** | `4000` | [http://localhost:4000](http://localhost:4000) — Visual database & auth viewer |
| **Cloud Firestore** | `8080` | `http://localhost:8080` — Document database |
| **Authentication** | `9099` | `http://localhost:9099` — User accounts & token issuer |
| **Cloud Storage** | `9199` | `http://localhost:9199` — File & receipt uploads |

Keep this terminal tab running while developing.

### Populating Seed Data (`npm run seed`)

Once the emulators are up, open a second terminal and run the database seed script:

```bash
npm run seed
```

This populates your local Firestore and Auth emulators with:
- **6 Band Sections:** Drumline/Percussion, Sousaphones, Trombones, Trumpets, Saxophones, Auxiliary.
- **10 Roster Musician Profiles:** With roles, section assignments, and instruments.
- **Tunes & Repertoire Catalog:** Active songs, BPMs, arrangement links, and setlist templates.
- **Calendar Gigs & Call Sheets:** Confirmed, draft, and completed shows with call times, musician RSVPs, and dispatch logs.
- **Client Inquiries & Booking Leads:** Lead pipeline ready for triage.
- **Charitable Giving & Donations:** Grassroots non-profit contributions.
- **Financial Ledger & Treasury:** Generous \$15,000 opening balance, 16 realistic transactions, and member reimbursements (Net Treasury: ~+\$21,855 in the green).
- **Canonical Super Admin Account:**
  - **Email:** `davidpassmore@gmail.com`
  - **Password:** `admin39`

You can inspect all seeded collections live in your browser at **[http://localhost:4000/firestore](http://localhost:4000/firestore)**.

---

## 5. Antigravity IDE Setup & Best Practices

Antigravity is an agentic AI pair programming environment designed for deep reasoning, automated verification, and proactive coding assistance.

### Opening the Project in Antigravity

1. Launch the **Antigravity** desktop app.
2. Select **Open Folder** and choose the `eagleburgerband` root repository directory.
3. Antigravity automatically detects:
   - Workspace rules defined in [`AGENTS.md`](../AGENTS.md)
   - Cross-agent instructions in [`CLAUDE.md`](../CLAUDE.md)
   - Architectural and stage documentation in [`docs/stages/`](./stages/README.md)

### Key Antigravity Slash Commands

Antigravity supports slash commands in the chat interface to speed up development workflows:

- `/goal`: Directs the agent to autonomously pursue a long-running, multi-step feature or refactor from start to finish without pausing prematurely.
- `/grill-me`: Triggers an interactive interview where Antigravity asks you targeted questions to nail down edge cases and UX requirements before drafting code.
- `/boost`: Activates deep thinking and multi-perspective reasoning for complex architectural decisions.
- `/schedule`: Schedules background timers or recurring health-checks during active sessions.
- `/learn`: Directs the agent to record a project pattern or custom instruction for future sessions.

### Project Guardrails for AI & Human Developers

When pairing with Antigravity (or writing code yourself), always respect the four core rules:

1. **Branch Model:** Feature branches branch off and merge into `next-trunk` (e.g. `git checkout -b feature/stage-36 next-trunk`).
2. **Schema Invariance:** Never mutate Firestore documents without defining or updating the corresponding Zod schema in `src/lib/schema/` with safe `.default()` values.
3. **RBAC Guardrails:** Portal routes and operations must respect role permissions (`admin`, `web_manager`, `gig_manager`, `catalog_manager`, `community_manager`, `treasurer`, `section_leader`, `member`, `guest`).
4. **Sanitization:** Raw HTML/Markdown must pass through `isomorphic-dompurify` or `rehype-sanitize`. Never use un-sanitized `dangerouslySetInnerHTML`.

---

## 6. Daily Development Flow

Once your environment is set up, your standard daily dev cycle is simple:

```bash
# 1. Start Firebase Emulators (Terminal 1)
npm run emulators

# 2. Start Next.js Development Server (Terminal 2)
npm run dev
```

Visit the app at **[http://localhost:3000](http://localhost:3000)**:
- **Public Site:** [http://localhost:3000](http://localhost:3000) (Home, Shows, Booking, Community Giving)
- **Musician Portal:** [http://localhost:3000/portal](http://localhost:3000/portal)
- **Admin Command:** [http://localhost:3000/admin](http://localhost:3000/admin) (Gigs, Roster, Finance Ledger, CMS Studio)

### Sign In Credentials for Local Testing

| Role | Email | Password | Access Level |
| :--- | :--- | :--- | :--- |
| **Super Admin** | `davidpassmore@gmail.com` | `admin39` | All admin studios, financial ledger, user management |
| **Band Director** | `director@eagleburgerband.com` | *(Any password / magic link)* | Admin, Gig Manager, Catalog Manager |
| **Section Leader** | `kristin.ward@eagleburger.org` | *(Any password / magic link)* | Trumpet section lead, call sheets, suggestions |
| **Musician Member** | `john.fetkovich@eagleburger.org` | *(Any password / magic link)* | Member portal, personal RSVPs, charts, reimbursements |

*(In the emulator environment, email links and new accounts can be tested without an external email provider).*

---

## 7. Pre-Merge Quality Verification

Before committing changes or opening a pull request into `next-trunk`, run the automated validation suite:

```bash
# 1. Type Safety Check (Zero errors required)
npx tsc --noEmit

# 2. ESLint Standards Check
npm run lint

# 3. Production Build Smoke Test
npm run build
```

---

## 8. Historical Documentation

For deep context on how any feature or collection was designed, browse the stage documents in [`docs/stages/`](./stages/README.md). Each completed stage includes:
- **`stage-XX-implementation.md`**: Initial architecture, schema designs, and route layouts.
- **`stage-XX-walkthrough.md`**: Verified accomplishments, code changes, and test outcomes.
