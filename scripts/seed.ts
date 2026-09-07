// scripts/seed.ts
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";

import { initializeApp } from "firebase/app";
import { getFirestore, connectFirestoreEmulator, doc, setDoc } from "firebase/firestore";
import { SectionSchema } from "../src/lib/schema/section";
import { UserSchema } from "../src/lib/schema/user";
import { GigSchema } from "../src/lib/schema/gig";
import { TuneSchema } from "../src/lib/schema/tune";

const app = initializeApp({ projectId: "eagleburger-band-dev" });
const db = getFirestore(app);
connectFirestoreEmulator(db, "127.0.0.1", 8080);

async function seedDatabase() {
  console.log("🌱 Starting local database seed...");

  // 1. Seed Sections
  const sections = [
    SectionSchema.parse({
      id: "sec_low_brass",
      name: "Low Brass",
      description: "Sousaphones, baritones, and bass trombones providing bassline groove.",
      instruments: ["Sousaphone", "Tuba", "Baritone Horn", "Bass Trombone"],
      leaderUids: ["user_admin_01"],
      memberUids: ["user_admin_01"],
      order: 1,
    }),
    SectionSchema.parse({
      id: "sec_trumpets",
      name: "Trumpets",
      description: "Lead melody lines and high brass punch.",
      instruments: ["Trumpet"],
      leaderUids: [],
      memberUids: [],
      order: 2,
    }),
    SectionSchema.parse({
      id: "sec_percussion",
      name: "Battery Percussion",
      description: "Snare, bass drum, and mobile auxiliary percussion.",
      instruments: ["Snare Drum", "Bass Drum", "Cymbals"],
      leaderUids: [],
      memberUids: [],
      order: 3,
    }),
  ];

  for (const s of sections) {
    await setDoc(doc(db, "sections", s.id), s);
  }
  console.log(`✅ Seeded ${sections.length} instrument sections.`);

  // 2. Seed User
  const adminUser = UserSchema.parse({
    uid: "user_admin_01",
    email: "director@eagleburgerband.com",
    displayName: "Alex Bass",
    sectionId: "sec_low_brass",
    instruments: ["Sousaphone"],
    roles: ["admin", "web_manager", "gig_manager", "catalog_manager", "section_leader"],
  });
  await setDoc(doc(db, "users", adminUser.uid), adminUser);
  console.log("✅ Seeded Admin User (Alex Bass).");

  // 3. Seed Sample Gig
  const sampleGig = GigSchema.parse({
    id: "gig_mf_2026",
    status: "confirmed",
    isPubliclyVisible: true,
    date: "2026-09-25",
    publicDetails: {
      title: "Mattress Factory Garden Party",
      venue: "Mattress Factory Museum",
      venueAddress: "500 Sampsonia Way, Pittsburgh, PA 15212",
      startTime: "19:00",
      endTime: "21:30",
      description: "Outdoor street brass show with high energy grooves!",
    },
    internalLogistics: {
      title: "Mattress Factory Show",
      callTime: "17:45",
      downbeat: "19:00",
      attire: "Yellow & Polka dots (Full regalia)",
      unloadingAddress: "Rear alley gate on Sampsonia St",
      parkingNotes: "Free museum employee lot off Arch St.",
      compensation: 1500,
    },
  });
  await setDoc(doc(db, "gigs", sampleGig.id), sampleGig);
  console.log("✅ Seeded sample gig (Mattress Factory).");

  // 4. Seed Sample Tune
  const sampleTune = TuneSchema.parse({
    id: "tune_ghost_town",
    title: "Ghost Town",
    composer: "The Specials",
    phase: "in_catalog",
    submittedByUid: "user_admin_01",
    submittedByName: "Alex Bass",
    tempoBpm: 138,
    key: "C Minor",
    pitchNotes: "Classic ska brass groove.",
  });
  await setDoc(doc(db, "tunes", sampleTune.id), sampleTune);
  console.log("✅ Seeded sample tune (Ghost Town).");

  console.log("✨ Seeding writes dispatched successfully!");
}

seedDatabase()
  .then(() => {
    console.log("⏳ Waiting for emulator writes to flush...");
    setTimeout(() => {
      console.log("Done!");
      process.exit(0);
    }, 1500);
  })
  .catch((err) => {
    console.error("❌ Seeding failed:", err);
    process.exit(1);
  });