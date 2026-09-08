// scripts/seed.ts
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";

import { initializeApp } from "firebase/app";
import { getFirestore, connectFirestoreEmulator, doc, setDoc } from "firebase/firestore";

const app = initializeApp({
  projectId: "eagleburger-band-dev",
  apiKey: "fake-api-key",
});

const db = getFirestore(app);
connectFirestoreEmulator(db, "127.0.0.1", 8080);

async function runSeed() {
  console.log("🌱 Starting local database seed...");

  // 1. Admin User
  await setDoc(doc(db, "users", "user_admin_01"), {
    uid: "user_admin_01",
    email: "director@eagleburgerband.com",
    displayName: "Alex Bass",
    roles: ["admin", "web_manager", "gig_manager", "catalog_manager", "section_leader"],
    sectionId: "sec_low_brass",
    instruments: ["Sousaphone", "Trombone"],
    onboardingStatus: "completed",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  console.log("✔ Seeded Admin User (Alex Bass)");

  // 2. Sections
  await setDoc(doc(db, "sections", "sec_low_brass"), {
    id: "sec_low_brass",
    name: "Low Brass",
    description: "Sousaphones, Trombones, Euphoniums, and Baritones holding down the low end.",
    leaderUid: "user_admin_01",
    order: 1,
  });

  await setDoc(doc(db, "sections", "sec_trumpets"), {
    id: "sec_trumpets",
    name: "Trumpets",
    description: "High brass lead lines and fanfares.",
    leaderUid: "user_admin_01",
    order: 2,
  });
  console.log("✔ Seeded sections");

  // 3. Active Performance
  await setDoc(doc(db, "gigs", "gig_mattress_factory_2026"), {
    id: "gig_mattress_factory_2026",
    date: "2026-09-25",
    status: "confirmed",
    publicDetails: {
      title: "Mattress Factory Garden Party",
      venue: "Mattress Factory Museum Garden",
      city: "Pittsburgh, PA",
      description: "Annual outdoor garden performance featuring Eagleburger Band and special guests.",
      admission: "Free / Museum Admission",
      facebookEventUrl: "https://facebook.com/events/eagleburger-mf",
      ticketUrl: "https://mattress.org/events",
    },
    internalLogistics: {
      title: "Mattress Factory Garden Gig",
      callTime: "17:30",
      downbeat: "18:30",
      unloadingAddress: "500 Sampsonia Way (Garden Gate)",
      parkingInstructions: "Unload at garden gate, then park along Jacksonia or Arch St.",
      attire: "Band Yellows & Black Pants",
      payPerMusician: 75,
      setlistId: "set_garden_party_2026",
      description: "Joint set with Buffalo guests. 2 x 45-minute street brass sets.",
    },
    schemaVersion: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  console.log("✔ Seeded sample gig");

  // 4. RSVP
  await setDoc(doc(db, "gigs/gig_mattress_factory_2026/rsvps", "user_admin_01"), {
    status: "attending",
    sectionId: "sec_low_brass",
    updatedAt: new Date().toISOString(),
  });

  // 5. CRM Client Contact
  await setDoc(doc(db, "contacts", "contact_mf_events"), {
    id: "contact_mf_events",
    name: "Caitlin Sparks",
    organization: "Mattress Factory Museum",
    email: "events@mattress.org",
    phone: "(412) 231-3169",
    notes: "Coordinates Northside garden and courtyard parties. Net-30 invoice via museum accounts payable.",
    totalGigsBooked: 3,
    lastContactedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  });
  console.log("✔ Seeded client contact");

  // 6. Inbound Lead
  await setDoc(doc(db, "inquiries", "lead_bloomfield_fest"), {
    id: "lead_bloomfield_fest",
    contactName: "Marco Rossi",
    organization: "Little Italy Days / Bloomfield",
    email: "mrossi@bloomfieldpgh.org",
    phone: "(412) 555-0182",
    eventDate: "2026-10-10",
    eventTitle: "Bloomfield Street Brass Parade",
    venue: "Liberty Avenue",
    estimatedBudget: 800,
    notes: "45-minute roving brass performance starting at Cedarville and marching down Liberty Ave.",
    status: "new",
    createdAt: new Date().toISOString(),
  });
  console.log("✔ Seeded booking lead");

  console.log("✨ All records committed successfully!");
  process.exit(0);
}

runSeed().catch((err) => {
  console.error("❌ Seeding failed:", err);
  process.exit(1);
});