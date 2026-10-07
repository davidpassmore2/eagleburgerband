import { initializeApp } from "firebase/app";
import { 
  getFirestore, 
  doc, 
  setDoc,
  collection
} from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import * as fs from "node:fs";
import * as path from "node:path";
import * as readline from "node:readline";

import { ContentPageSchema, DEFAULT_SYSTEM_PAGES_LIST } from "../src/lib/schema/page";
import { ResourceAssetSchema, DEFAULT_RESOURCES } from "../src/lib/schema/resource";
import { SiteNavigationSchema, DEFAULT_ANNOUNCEMENT_BANNER } from "../src/lib/schema/siteConfig";
import { PortalMetricsConfigSchema } from "../src/lib/schema/metrics";
import { SectionSchema } from "../src/lib/schema/section";
import { TuneSchema } from "../src/lib/schema/tune";
import { SetlistSchema } from "../src/lib/schema/setlist";
import { GigSchema } from "../src/lib/schema/gig";
import { GigRsvpSchema } from "../src/lib/schema/rsvp";
import { generateGigSlug } from "../src/lib/utils/slug";

// ==============================================================================
// 1. Environment & Firebase Beta Configuration
// ==============================================================================

function loadEnvFile(filePath: string) {
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx !== -1) {
        const key = trimmed.slice(0, eqIdx).trim();
        const val = trimmed.slice(eqIdx + 1).trim();
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}

// Load .env.beta if not already loaded in process.env
loadEnvFile(path.resolve(process.cwd(), ".env.beta"));

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyBCam5uvZAVeIllmOGrxuZ7ZbEdRH_SdEw",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "eagleburger-band-beta.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "eagleburger-band-beta",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "eagleburger-band-beta.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "291468487856",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:291468487856:web:d973cd03e3630f112edf75",
};

const app = initializeApp(firebaseConfig, "seed-beta-runner");
const auth = getAuth(app);
const db = getFirestore(app);

// ==============================================================================
// 2. Interactive CLI Helper for Password
// ==============================================================================

async function getAdminPassword(): Promise<string> {
  // Check CLI argument first: `npm run seed:beta -- <password>`
  if (process.argv[2]) {
    return process.argv[2].trim();
  }

  // Check environment variable
  if (process.env.BETA_ADMIN_PASSWORD) {
    return process.env.BETA_ADMIN_PASSWORD.trim();
  }

  // Prompt interactively if TTY is open
  if (process.stdin.isTTY) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    return new Promise((resolve) => {
      rl.question("🔑 Enter password for Super Admin (davidpassmore@gmail.com): ", (answer) => {
        rl.close();
        resolve(answer.trim());
      });
    });
  }

  throw new Error(
    "Missing admin password. Provide it via command line: 'npm run seed:beta -- <password>' or set BETA_ADMIN_PASSWORD in your environment."
  );
}

// ==============================================================================
// 3. Main Seed Execution
// ==============================================================================

async function runBetaSeed() {
  console.log("\n========================================================");
  console.log("🎺 EAGLEBURGER BAND — BETA CLOUD SEED SCRIPT");
  console.log("========================================================");
  console.log(`🌐 Target Project ID: ${firebaseConfig.projectId}`);
  console.log(`🔗 Auth Domain:       ${firebaseConfig.authDomain}`);

  const adminEmail = "davidpassmore@gmail.com";
  const password = await getAdminPassword();

  if (!password) {
    console.error("❌ Password cannot be empty.");
    process.exit(1);
  }

  console.log(`\n🔐 Authenticating as ${adminEmail}...`);
  let superAdminUid: string;
  try {
    const userCredential = await signInWithEmailAndPassword(auth, adminEmail, password);
    superAdminUid = userCredential.user.uid;
    console.log(`✅ Authenticated successfully! Super Admin UID: ${superAdminUid}`);
  } catch (err: unknown) {
    const e = err as { code?: string; message?: string };
    console.error(`❌ Authentication failed (${e.code || "unknown"}): ${e.message}`);
    process.exit(1);
  }

  // ----------------------------------------------------
  // Step 1: Ensure Super Admin Profile in Firestore
  // ----------------------------------------------------
  console.log("\n👤 Step 1/9: Verifying Super Admin profile in 'users'...");
  const adminProfile = {
    schemaVersion: 1,
    uid: superAdminUid,
    email: adminEmail,
    displayName: "David Passmore",
    roles: [
      "admin",
      "web_manager",
      "gig_manager",
      "catalog_manager",
      "setlist_manager",
      "community_manager",
      "treasurer",
      "section_leader",
      "member",
    ],
    role: "admin",
    status: "active",
    sectionId: "percussion",
    instruments: ["Snare Drum", "Percussion"],
    phone: "412-555-0101",
    portalThemeSchemeId: "eagleburger-gold",
    portalThemeMode: "dark",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await setDoc(doc(db, "users", superAdminUid), adminProfile, { merge: true });
  console.log(`✅ Super Admin profile updated at users/${superAdminUid}`);

  // ----------------------------------------------------
  // Step 2: Band Sections
  // ----------------------------------------------------
  console.log("\n🥁 Step 2/9: Seeding band sections...");
  const sectionsData = [
    {
      id: "percussion",
      name: "Drumline & Percussion",
      order: 1,
      minRecommended: 3,
      leaderUid: superAdminUid,
      leaderName: "David Passmore",
      leaderUids: [superAdminUid],
      notes: "Carries groove tempo, battery cymbals, bass drums, and snares.",
      instruments: ["Snare Drum", "Bass Drum", "Cymbals", "Tenors"],
    },
    {
      id: "sousaphones",
      name: "Sousaphones & Tubas",
      order: 2,
      minRecommended: 2,
      leaderUid: "",
      leaderName: "Jonathan Rubin",
      notes: "Bass line foundation; acoustic low end.",
      instruments: ["Sousaphone", "Tuba"],
    },
    {
      id: "trombones",
      name: "Trombones",
      order: 3,
      minRecommended: 3,
      leaderUid: "",
      leaderName: "Mike Kowalski",
      notes: "Tenor & bass slides, mid-range punch.",
      instruments: ["Tenor Trombone", "Bass Trombone"],
    },
    {
      id: "trumpets",
      name: "Trumpets",
      order: 4,
      minRecommended: 4,
      leaderUid: "",
      leaderName: "Kristin Ward",
      notes: "Lead melodies, fanfare blasts, high brass harmony.",
      instruments: ["Trumpet (Bb)"],
    },
    {
      id: "saxophones",
      name: "Saxophones & Woodwinds",
      order: 5,
      minRecommended: 3,
      leaderUid: "",
      leaderName: "Joelle Levitt Killebrew",
      notes: "Alto, tenor, and baritone horns.",
      instruments: ["Alto Sax", "Tenor Sax", "Baritone Sax", "Clarinet"],
    },
    {
      id: "auxiliary",
      name: "Auxiliary & Visuals",
      order: 6,
      minRecommended: 1,
      leaderUid: "",
      leaderName: "Megan Ortiz",
      notes: "Tambourines, shakers, banners, and crowd hype.",
      instruments: ["Tambourine", "Cowbell", "Megaphone", "Banner"],
    },
  ];

  for (const s of sectionsData) {
    const validated = SectionSchema.parse(s);
    await setDoc(doc(db, "sections", s.id), validated, { merge: true });
  }
  console.log(`✅ Seeded ${sectionsData.length} sections into 'sections' collection.`);

  // ----------------------------------------------------
  // Step 3: Dynamic Theme & Brand Configuration
  // ----------------------------------------------------
  console.log("\n🎨 Step 3/9: Seeding theme & brand configuration...");
  const themeConfig = {
    bandName: "Eagleburger Band",
    logoUrl: "/ebb-logo.png",
    activeSeason: "2026 Season",
    socialLinks: {
      youtube: "https://www.youtube.com/watch?v=v0x-fut30wE",
      instagram: "https://www.instagram.com/eagleburgerband",
      facebook: "https://www.facebook.com/col.eagleburger",
    },
    public: {
      schemeId: "eagleburger-gold",
      primaryColor: "#facc15",
      accentColor: "#f59e0b",
      backgroundColor: "#020617",
      surfaceColor: "#0f172a",
      mutedSurfaceColor: "#1e293b",
      borderColor: "#334155",
      textColor: "#f8fafc",
      tagline: "Pittsburgh's Premier Street Brass & Battery Powerhouse",
    },
    portal: {
      schemeId: "eagleburger-gold",
      primaryColor: "#facc15",
      accentColor: "#0f172a",
      backgroundColor: "#020617",
      surfaceColor: "#0f172a",
      mutedSurfaceColor: "#1e293b",
      borderColor: "#334155",
      textColor: "#f8fafc",
      tagline: "Musician Operations & Repertoire Command Center",
    },
    primaryColor: "#facc15",
    accentColor: "#0f172a",
    subheading: "Pittsburgh's mobile brass, percussion, and street revelry powerhouse.",
    schemaVersion: 2,
    updatedAt: new Date().toISOString(),
  };
  await setDoc(doc(db, "theme", "config"), themeConfig, { merge: true });
  console.log("✅ Seeded theme/config with v2 scoped brand themes.");

  // ----------------------------------------------------
  // Step 4: Site Navigation & Global Banner
  // ----------------------------------------------------
  console.log("\n🧭 Step 4/9: Seeding site navigation...");
  const siteNav = SiteNavigationSchema.parse({
    id: "config",
    announcementBanner: DEFAULT_ANNOUNCEMENT_BANNER,
  });
  await setDoc(doc(db, "site_navigation", "config"), siteNav, { merge: true });
  console.log("✅ Seeded site_navigation/config.");

  // ----------------------------------------------------
  // Step 5: Headless CMS Content Pages
  // ----------------------------------------------------
  console.log("\n📄 Step 5/9: Seeding headless CMS content pages...");
  for (const page of DEFAULT_SYSTEM_PAGES_LIST) {
    const validated = ContentPageSchema.parse(page);
    await setDoc(doc(db, "content_pages", validated.id), validated, { merge: true });
  }
  console.log(`✅ Seeded ${DEFAULT_SYSTEM_PAGES_LIST.length} system content pages into 'content_pages'.`);

  // ----------------------------------------------------
  // Step 6: Content Resource Assets
  // ----------------------------------------------------
  console.log("\n📦 Step 6/9: Seeding media resources...");
  for (const res of DEFAULT_RESOURCES) {
    const validated = ResourceAssetSchema.parse(res);
    await setDoc(doc(db, "resources", res.id), validated, { merge: true });
  }
  console.log(`✅ Seeded ${DEFAULT_RESOURCES.length} media resources into 'resources'.`);

  // ----------------------------------------------------
  // Step 7: Portal Usage Metrics Telemetry
  // ----------------------------------------------------
  console.log("\n📊 Step 7/9: Seeding portal metrics config...");
  const metricsConfig = PortalMetricsConfigSchema.parse({
    captureEnabled: true,
    lastResetAt: null,
    resetByUid: null,
    resetByName: null,
    updatedAt: new Date().toISOString(),
  });
  await setDoc(doc(db, "portal_metrics_config", "global"), metricsConfig, { merge: true });
  console.log("✅ Seeded portal_metrics_config/global.");

  // ----------------------------------------------------
  // Step 8: Core Repertoire Tunes
  // ----------------------------------------------------
  console.log("\n🎼 Step 8/9: Seeding tunes & repertoire...");
  const tunesData = [
    {
      id: "song_renegade",
      title: "Renegade",
      artist: "Styx",
      arranger: "Eagleburger Arrangers",
      keySignature: "G Minor",
      tempoBpm: 128,
      status: "active" as const,
      lifecycleStatus: "active_rotation" as const,
      driveLink: "https://drive.google.com/renegade-charts",
      tags: ["Rock", "Styx", "Encore", "Crowd Favorite"],
      notes: "Snare rolls drive into heavy downbeat brass riff.",
    },
    {
      id: "song_bloomfield_bounce",
      title: "Bloomfield Bounce",
      artist: "Eagleburger Band",
      arranger: "Eagleburger",
      keySignature: "Bb Major",
      tempoBpm: 140,
      status: "active" as const,
      lifecycleStatus: "active_rotation" as const,
      driveLink: "https://drive.google.com/bloomfield-bounce",
      tags: ["Street Beat", "Parade", "Original"],
      notes: "Fast marching street stomp.",
    },
    {
      id: "song_river_groove",
      title: "Clarion River Walk",
      artist: "Traditional",
      arranger: "Eagleburger",
      keySignature: "F Major",
      tempoBpm: 116,
      status: "active" as const,
      lifecycleStatus: "active_rotation" as const,
      driveLink: "https://drive.google.com/clarion-river",
      tags: ["Slow Jam", "New Orleans", "Second Line"],
      notes: "Heavy sousaphone groove with trombone trading solos.",
    },
    {
      id: "song_iron_city",
      title: "Iron City Funk",
      artist: "Traditional",
      arranger: "Eagleburger",
      keySignature: "Eb Major",
      tempoBpm: 122,
      status: "active" as const,
      lifecycleStatus: "active_rotation" as const,
      driveLink: "https://drive.google.com/iron-city",
      tags: ["Funk", "Crowd Favorite", "Opener"],
      notes: "Main stage opener with horn section unisons.",
    },
    {
      id: "song_ghost_town",
      title: "Ghost Town Ska",
      artist: "The Specials",
      arranger: "Eagleburger Arrangers",
      keySignature: "C Minor",
      tempoBpm: 126,
      status: "active" as const,
      lifecycleStatus: "active_rotation" as const,
      driveLink: "https://drive.google.com/ghost-town",
      tags: ["Ska", "Crowd Favorite"],
      notes: "Skank percussion accent on upbeat.",
    },
    {
      id: "song_foxburg_reel",
      title: "Foxburg River Reel",
      artist: "Traditional",
      arranger: "Eagleburger",
      keySignature: "G Major",
      tempoBpm: 136,
      status: "active" as const,
      lifecycleStatus: "in_repertoire" as const,
      driveLink: "https://drive.google.com/foxburg-reel",
      tags: ["Folk", "Parade"],
      notes: "Woodwind feature breakdown.",
    },
    {
      id: "song_bridge_burner",
      title: "Bridge Burner Breakdown",
      artist: "Eagleburger Band",
      arranger: "Eagleburger",
      keySignature: "D Minor",
      tempoBpm: 144,
      status: "review" as const,
      lifecycleStatus: "in_rehearsal" as const,
      driveLink: "https://drive.google.com/bridge-burner",
      tags: ["High Energy", "Drum Solo"],
      notes: "Percussion feature section at letter C.",
    },
    {
      id: "song_superstition",
      title: "Superstition",
      artist: "Stevie Wonder",
      arranger: "Eagleburger Arrangers",
      keySignature: "Eb Minor",
      tempoBpm: 100,
      status: "active" as const,
      lifecycleStatus: "active_rotation" as const,
      driveLink: "https://drive.google.com/superstition-charts",
      tags: ["Funk", "Classic", "Crowd Favorite"],
      notes: "Heavy sousaphone clavinet riff emulation.",
    },
    {
      id: "song_ghostbusters",
      title: "Ghostbusters Theme",
      artist: "Ray Parker Jr.",
      arranger: "Eagleburger",
      keySignature: "B Minor",
      tempoBpm: 116,
      status: "active" as const,
      lifecycleStatus: "active_rotation" as const,
      driveLink: "https://drive.google.com/ghostbusters-charts",
      tags: ["Pop", "Parade", "Halloween"],
      notes: "Crowd call-and-response horn punches.",
    },
  ];

  for (const t of tunesData) {
    const validated = TuneSchema.parse(t);
    await setDoc(doc(db, "tunes", t.id), validated, { merge: true });
  }
  console.log(`✅ Seeded ${tunesData.length} tunes into 'tunes' collection.`);

  // ----------------------------------------------------
  // Step 9: Reusable Setlist Templates & Sample Gigs
  // ----------------------------------------------------
  console.log("\n📅 Step 9/9: Seeding setlist templates and test gigs...");
  const paradeTunes = [
    {
      id: "t-parade-1",
      tuneId: "song_bloomfield_bounce",
      songId: "song_bloomfield_bounce",
      title: "Bloomfield Bounce",
      artist: "Eagleburger Band",
      keySignature: "Bb Major",
      tempoBpm: 140,
      notes: "Drumline sets street cadence early.",
      transitionType: "direct_segue" as const,
    },
    {
      id: "t-parade-2",
      tuneId: "song_iron_city",
      songId: "song_iron_city",
      title: "Iron City Funk",
      artist: "Traditional",
      keySignature: "Eb Major",
      tempoBpm: 122,
      notes: "Direct pickup out of drum cadence.",
      transitionType: "standard_pause" as const,
    },
    {
      id: "t-parade-3",
      tuneId: "song_ghost_town",
      songId: "song_ghost_town",
      title: "Ghost Town Ska",
      artist: "The Specials",
      keySignature: "C Minor",
      tempoBpm: 126,
      notes: "Skank rhythm on upbeats.",
      transitionType: "standard_pause" as const,
    },
    {
      id: "t-parade-4",
      tuneId: "song_renegade",
      songId: "song_renegade",
      title: "Renegade",
      artist: "Styx",
      keySignature: "G Minor",
      tempoBpm: 128,
      notes: "Crowd anthem finish! Big brass swell on downbeat.",
      transitionType: "standard_pause" as const,
    },
  ];

  const templatesData = [
    {
      id: "template_parade_short",
      name: "30-Minute Street Parade Block",
      title: "30-Minute Street Parade Block",
      category: "parade" as const,
      description: "Fast-moving mobile street sequence with tight transitions and high crowd energy.",
      targetDurationMinutes: 30,
      isTemplate: true,
      usageCount: 2,
      lastUsedDate: "2026-10-10",
      assignedGigIds: ["gig_millvale_days_2026"],
      tags: ["Parade", "Street Beat", "Compact", "High Energy"],
      tunes: paradeTunes,
      createdByUid: superAdminUid,
      createdByName: "David Passmore",
    },
    {
      id: "template_festival_long",
      name: "90-Minute Festival Showcase",
      title: "90-Minute Festival Showcase",
      category: "festival" as const,
      description: "Full-length two-set festival blowout with solo features, sousaphone spotlights, and encores.",
      targetDurationMinutes: 90,
      isTemplate: true,
      usageCount: 1,
      lastUsedDate: "2026-09-25",
      assignedGigIds: ["gig_mattress_factory_2026"],
      tags: ["Festival", "Stage", "Extended", "Showcase"],
      tunes: paradeTunes,
      createdByUid: superAdminUid,
      createdByName: "David Passmore",
    },
    {
      id: "template_beer_garden",
      name: "Beer Garden & Porchfest Set",
      title: "Beer Garden & Porchfest Set",
      category: "street_revelry" as const,
      description: "Acoustic-friendly, laid back outdoor courtyard set suitable for casual gatherings.",
      targetDurationMinutes: 45,
      isTemplate: true,
      usageCount: 0,
      lastUsedDate: null,
      assignedGigIds: [],
      tags: ["Acoustic", "Casual", "Outdoor", "Porchfest"],
      tunes: paradeTunes.slice(0, 3),
      createdByUid: superAdminUid,
      createdByName: "David Passmore",
    },
  ];

  for (const tpl of templatesData) {
    const validated = SetlistSchema.parse(tpl);
    await setDoc(doc(db, "setlists", tpl.id), validated, { merge: true });
  }
  console.log(`✅ Seeded ${templatesData.length} master setlist templates into 'setlists'.`);

  // Test Gigs for Beta Verification
  const gigsToSeed = [
    {
      id: "gig_mattress_factory_2026",
      date: "2026-09-25",
      status: "completed" as const,
      title: "Mattress Factory Garden Party",
      venue: "Mattress Factory Museum Garden",
      venueAddress: "500 Sampsonia Way, Pittsburgh, PA 15212",
      city: "Pittsburgh, PA (North Side)",
      description: "Special double-bill outdoor performance featuring Eagleburger Band in the museum courtyard.",
      callTime: "5:45 PM",
      downbeat: "6:45 PM",
      attire: "Eagleburger Yellows & Festive Black",
      unloadingAddress: "500 Sampsonia Way (Rear Alley Gate)",
      parkingNotes: "Monterey St lot permits provided.",
      compensation: 65,
      compensationType: "individual" as const,
      totalFee: 650,
      setlistId: "template_festival_long",
      setlistName: "90-Minute Festival Showcase",
    },
    {
      id: "gig_millvale_days_2026",
      date: "2026-10-10",
      status: "confirmed" as const,
      title: "Millvale Days Community Parade & Concert",
      venue: "Grant Ave Street Stage",
      venueAddress: "216 Grant Ave, Millvale, PA 15209",
      city: "Millvale, PA",
      description: "Headline evening street parade and courtyard concert for the 85th annual Millvale Days celebration.",
      callTime: "4:30 PM",
      downbeat: "5:30 PM",
      attire: "Full Band Yellow Uniforms",
      unloadingAddress: "Sedgwick St & Grant Ave staging area",
      parkingNotes: "Millvale Borough municipal lot parking passes.",
      compensation: 500,
      compensationType: "band_fund" as const,
      totalFee: 500,
      setlistId: "template_parade_short",
      setlistName: "30-Minute Street Parade Block",
    },
    {
      id: "gig_southside_zombie_walk_2026",
      date: "2026-10-24",
      status: "confirmed" as const,
      title: "South Side Halloween Spooky Brass Promenade",
      venue: "18th & East Carson Street Plaza",
      venueAddress: "1800 E Carson St, Pittsburgh, PA 15203",
      city: "Pittsburgh, PA (South Side)",
      description: "Costumed street brass march through South Side entertainment district. Ghostbusters theme and scary brass riffs.",
      callTime: "6:00 PM",
      downbeat: "7:00 PM",
      attire: "Costumes or Festive Spooky Yellow/Black",
      unloadingAddress: "1800 E Carson St (behind municipal lot)",
      parkingNotes: "18th St municipal lot parking vouchers.",
      compensation: 70,
      compensationType: "individual" as const,
      totalFee: 700,
      setlistId: "template_parade_short",
      setlistName: "30-Minute Street Parade Block",
    },
  ];

  for (const gig of gigsToSeed) {
    const slug = generateGigSlug(gig.date, gig.title);

    const gigPayload = GigSchema.parse({
      id: gig.id,
      slug,
      title: gig.title,
      date: gig.date,
      time: gig.downbeat,
      status: gig.status,
      venue: gig.venue,
      venueAddress: gig.venueAddress,
      city: gig.city,
      description: gig.description,
      setlistId: gig.setlistId,
      logistics: {
        callTime: gig.callTime,
        downbeat: gig.downbeat,
        attire: gig.attire,
        unloadingAddress: gig.unloadingAddress,
        parkingNotes: gig.parkingNotes,
        setlistTitle: gig.setlistName,
        description: gig.description,
      },
      financials: {
        totalFee: gig.totalFee,
        compensationType: gig.compensationType,
        settlementType: gig.compensationType,
        bandFundCut: gig.compensationType === "band_fund" ? gig.totalFee : 0,
        fixedPerformerAmount: gig.compensationType === "individual" ? gig.compensation : 0,
        payouts: {},
        notes: gig.compensationType === "band_fund" ? "Band treasury deposit" : "Per-member payout",
      },
      schemaVersion: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    await setDoc(doc(db, "gigs", gig.id), gigPayload, { merge: true });

    // Seed setlist copy for the gig
    await setDoc(
      doc(db, "setlists", gig.id),
      {
        id: gig.id,
        gigId: gig.id,
        isTemplate: false,
        templateId: gig.setlistId,
        templateName: gig.setlistName,
        name: gig.setlistName,
        title: gig.setlistName,
        category: "parade",
        tunes: paradeTunes,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    // Seed Super Admin's RSVP for testing
    const rsvpPayload = GigRsvpSchema.parse({
      gigId: gig.id,
      uid: superAdminUid,
      displayName: "David Passmore",
      sectionId: "percussion",
      status: "attending",
      notes: "Bringing snare drum and parade harness.",
      updatedAt: new Date().toISOString(),
    });
    await setDoc(doc(db, "gigs", gig.id, "rsvps", superAdminUid), rsvpPayload, { merge: true });

    // Seed initial dispatch history entry
    const auditRef = doc(collection(db, "gigs", gig.id, "dispatch_history"));
    await setDoc(auditRef, {
      type: "logistics_init",
      message: `Call sheet initialized for ${gig.title}.`,
      initiatedBy: "Beta Seed Script",
      dispatchedAt: new Date().toISOString(),
    });

    console.log(`✅ Seeded gig: gigs/${gig.id} (${gig.title})`);
  }

  console.log("\n========================================================");
  console.log("🎉 SUCCESS! EAGLEBURGER BAND BETA DATABASE FULLY SEEDED");
  console.log("========================================================");
  console.log(`📁 Collections Populated:`);
  console.log(`   - users (${superAdminUid} as Super Admin)`);
  console.log(`   - sections (${sectionsData.length} core band sections)`);
  console.log(`   - theme/config (v2 public & portal brand colors/theme)`);
  console.log(`   - site_navigation/config (header links & banner)`);
  console.log(`   - content_pages (${DEFAULT_SYSTEM_PAGES_LIST.length} system pages)`);
  console.log(`   - resources (${DEFAULT_RESOURCES.length} media assets)`);
  console.log(`   - portal_metrics_config/global (usage metrics capture)`);
  console.log(`   - tunes (${tunesData.length} core repertoire charts)`);
  console.log(`   - setlists (${templatesData.length} templates + ${gigsToSeed.length} gig setlists)`);
  console.log(`   - gigs (${gigsToSeed.length} gigs with RSVPs & dispatch history)`);
  console.log("========================================================\n");
  process.exit(0);
}

runBetaSeed().catch((err) => {
  console.error("💥 Fatal seed error:", err);
  process.exit(1);
});

