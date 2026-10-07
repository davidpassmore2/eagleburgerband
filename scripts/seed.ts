import { initializeApp } from "firebase/app";
import { 
  getFirestore, 
  connectFirestoreEmulator, 
  doc, 
  setDoc, 
  deleteDoc,
  getDocs,
  collection 
} from "firebase/firestore";
import { VaultTrackSchema } from "../src/lib/schema/vaultTrack";
import { InventoryItemSchema } from "../src/lib/schema/inventory";
import { InviteSchema } from "../src/lib/schema/invite";
import { GigRsvpSchema } from "../src/lib/schema/rsvp";
import { CheckInSchema } from "../src/lib/schema/checkin";
import { ContentPageSchema, DEFAULT_SYSTEM_PAGES_LIST } from "../src/lib/schema/page";
import { ResourceAssetSchema, DEFAULT_RESOURCES } from "../src/lib/schema/resource";
import { SiteNavigationSchema, DEFAULT_ANNOUNCEMENT_BANNER } from "../src/lib/schema/siteConfig";
import { GigSchema, PerformerPayoutRecord } from "../src/lib/schema/gig";
import { generateGigSlug } from "../src/lib/utils/slug";
import { PortalMetricEventSchema, PortalMetricsConfigSchema } from "../src/lib/schema/metrics";

const localApp = initializeApp({
  projectId: "eagleburger-band-dev",
  apiKey: "fake-api-key-for-emulator"
}, "seed-emulator-runner");

const db = getFirestore(localApp);

connectFirestoreEmulator(db, "127.0.0.1", 8080);

async function runSeed() {
  console.log("🌱 Connecting directly to local Firestore emulator (127.0.0.1:8080)...");

  // ==========================================
  // 0. Super Admin Account Resolution & Hygiene
  // ==========================================
  let superAdminUid = "iFlz1Htyk3PTEold26gYqIvHQciu";
  try {
    const authRes = await fetch("http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-api-key-for-emulator", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "davidpassmore@gmail.com",
        password: "admin39",
        displayName: "David Passmore",
        returnSecureToken: true,
      }),
    });
    if (authRes.ok) {
      const data = await authRes.json() as { localId?: string };
      if (data.localId) superAdminUid = data.localId;
      console.log(`✅ Seeded Super Admin Auth user: davidpassmore@gmail.com (${superAdminUid})`);
    } else {
      const loginRes = await fetch("http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=fake-api-key-for-emulator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "davidpassmore@gmail.com",
          password: "admin39",
          returnSecureToken: true,
        }),
      });
      if (loginRes.ok) {
        const loginData = await loginRes.json() as { localId?: string };
        if (loginData.localId) superAdminUid = loginData.localId;
        console.log(`ℹ️ Super Admin Auth account confirmed: davidpassmore@gmail.com (${superAdminUid})`);
      }
    }
  } catch (authErr) {
    console.warn("⚠️ Auth emulator note:", authErr);
  }

  // Purge any stale or non-superadmin David Passmore user records
  try {
    const existingUsersSnap = await getDocs(collection(db, "users"));
    for (const userDoc of existingUsersSnap.docs) {
      const userData = userDoc.data();
      const isDavidName = (userData.displayName || "").toLowerCase().includes("david passmore");
      const isSuperAdminEmail = (userData.email || "").toLowerCase() === "davidpassmore@gmail.com";

      if ((isDavidName && !isSuperAdminEmail) || (isSuperAdminEmail && userDoc.id !== superAdminUid) || userDoc.id === "T4qj4iyXePw2ZMvdzvZq644u9OiX") {
        await deleteDoc(doc(db, "users", userDoc.id));
        console.log(`🗑️ Removed non-superadmin user: ${userDoc.id} (${userData.displayName} / ${userData.email})`);
      }
    }
  } catch (purgeErr) {
    console.warn("⚠️ User purge note:", purgeErr);
  }

  // ==========================================
  // 1. Band Sections (With Designated Section Leaders)
  // ==========================================
  const sections = [
    { 
      id: "percussion", 
      name: "Drumline & Percussion", 
      order: 1, 
      minRecommended: 3,
      leaderUid: superAdminUid, // David Passmore (Super Admin)
      leaderName: "David Passmore",
      notes: "Carries groove tempo, battery cymbals, bass drums, and snares."
    },
    { 
      id: "sousaphones", 
      name: "Sousaphones & Tubas", 
      order: 2, 
      minRecommended: 2,
      leaderUid: "user_rubin_jonathan", // Jonathan Rubin
      leaderName: "Jonathan Rubin",
      notes: "Bass line foundation; acoustic low end."
    },
    { 
      id: "trombones", 
      name: "Trombones", 
      order: 3, 
      minRecommended: 3,
      leaderUid: "user_tbone_mike", // Mike Kowalski
      leaderName: "Mike Kowalski",
      notes: "Tenor & bass slides, mid-range punch."
    },
    { 
      id: "trumpets", 
      name: "Trumpets", 
      order: 4, 
      minRecommended: 4,
      leaderUid: "user_ward_kristin", // Kristin Ward
      leaderName: "Kristin Ward",
      notes: "Lead melodies, fanfare blasts, high brass harmony."
    },
    { 
      id: "saxophones", 
      name: "Saxophones & Woodwinds", 
      order: 5, 
      minRecommended: 3,
      leaderUid: "user_killebrew_joelle", // Joelle Levitt Killebrew
      leaderName: "Joelle Levitt Killebrew",
      notes: "Alto, tenor, and baritone horns."
    },
    { 
      id: "auxiliary", 
      name: "Auxiliary & Visuals", 
      order: 6, 
      minRecommended: 1,
      leaderUid: "user_aux_megan",
      leaderName: "Megan Ortiz",
      notes: "Tambourines, shakers, banners, and crowd hype."
    },
  ];

  for (const s of sections) {
    await setDoc(doc(db, "sections", s.id), s, { merge: true });
  }
  console.log(`✅ Seeded ${sections.length} band sections with assigned section leaders.`);

  // ==========================================
  // 2. Band Roster & Musician Profiles
  // ==========================================
  const users = [
    {
      uid: superAdminUid,
      email: "davidpassmore@gmail.com",
      displayName: "David Passmore",
      roles: ["admin", "web_manager", "gig_manager", "catalog_manager", "setlist_manager", "community_manager", "treasurer", "section_leader", "member"],
      role: "admin",
      status: "active",
      sectionId: "percussion",
      instruments: ["Snare Drum", "Percussion"],
      phone: "412-555-0101",
      portalThemeSchemeId: "eagleburger-gold",
      portalThemeMode: "dark",
      createdAt: new Date().toISOString(),
    },
    {
      uid: "jkkJnLRU03IxB2gbyG5lolVghGsD",
      email: "director@eagleburgerband.com",
      displayName: "Band Director",
      roles: ["admin", "gig_manager", "catalog_manager", "setlist_manager"],
      role: "admin",
      status: "active",
      sectionId: "percussion",
      instruments: ["Conductor", "Percussion"],
      phone: "412-555-0102",
      createdAt: new Date().toISOString(),
    },
    {
      uid: "user_fetkovich_john",
      email: "john.fetkovich@eagleburger.org",
      displayName: "John Fetkovich",
      roles: ["member"],
      role: "member",
      status: "active",
      sectionId: "percussion",
      instruments: ["Bass Drum", "Cymbals"],
      phone: "412-555-0103",
      createdAt: new Date().toISOString(),
    },
    {
      uid: "user_rubin_jonathan",
      email: "jonathan.rubin@eagleburger.org",
      displayName: "Jonathan Rubin",
      roles: ["member", "section_leader"],
      role: "member",
      status: "active",
      sectionId: "sousaphones",
      instruments: ["Sousaphone"],
      phone: "412-555-0104",
      createdAt: new Date().toISOString(),
    },
    {
      uid: "user_killebrew_joelle",
      email: "joelle.killebrew@eagleburger.org",
      displayName: "Joelle Levitt Killebrew",
      roles: ["member", "section_leader", "community_manager", "setlist_manager"],
      role: "member",
      status: "active",
      sectionId: "saxophones",
      instruments: ["Alto Sax", "Tenor Sax"],
      phone: "412-555-0105",
      createdAt: new Date().toISOString(),
    },
    {
      uid: "user_ward_kristin",
      email: "kristin.ward@eagleburger.org",
      displayName: "Kristin Ward",
      roles: ["member", "section_leader"],
      role: "member",
      status: "active",
      sectionId: "trumpets",
      instruments: ["Trumpet (Bb)"],
      phone: "412-555-0106",
      createdAt: new Date().toISOString(),
    },
    {
      uid: "user_tbone_mike",
      email: "mike.tbone@eagleburger.org",
      displayName: "Mike Kowalski",
      roles: ["member", "section_leader"],
      role: "member",
      status: "active",
      sectionId: "trombones",
      instruments: ["Tenor Trombone"],
      phone: "412-555-0107",
      createdAt: new Date().toISOString(),
    },
    {
      uid: "user_bari_sarah",
      email: "sarah.bari@eagleburger.org",
      displayName: "Sarah Jenkins",
      roles: ["member"],
      role: "member",
      status: "active",
      sectionId: "saxophones",
      instruments: ["Baritone Sax"],
      phone: "412-555-0108",
      createdAt: new Date().toISOString(),
    },
    {
      uid: "user_tbone_lead",
      email: "dan.brass@eagleburger.org",
      displayName: "Dan Gallagher",
      roles: ["member"],
      role: "member",
      status: "active",
      sectionId: "trombones",
      instruments: ["Bass Trombone"],
      phone: "412-555-0109",
      createdAt: new Date().toISOString(),
    },
    {
      uid: "user_aux_megan",
      email: "megan.aux@eagleburger.org",
      displayName: "Megan Ortiz",
      roles: ["member", "section_leader"],
      role: "member",
      status: "active",
      sectionId: "auxiliary",
      instruments: ["Tambourine", "Agogo Bells"],
      phone: "412-555-0110",
      createdAt: new Date().toISOString(),
    },
  ];

  for (const u of users) {
    await setDoc(doc(db, "users", u.uid), u, { merge: true });
  }
  console.log(`✅ Seeded ${users.length} roster musicians with roles & contact phones.`);

  // ==========================================
  // 3. Tunes & Repertoire (Canonical 'tunes' collection)
  // ==========================================
  const tunes = [
    {
      id: "song_renegade",
      title: "Renegade",
      artist: "Styx",
      arranger: "Eagleburger Arrangers",
      keySignature: "G Minor",
      tempoBpm: 128,
      status: "active",
      audioSampleUrl: "https://example.com/audio/renegade.mp3",
      driveLink: "https://drive.google.com/renegade-charts",
      tags: ["Rock", "Styx", "Encore", "Crowd Favorite"],
      notes: "Snare rolls drive into heavy downbeat brass riff.",
      updatedAt: new Date().toISOString(),
    },
    {
      id: "song_bloomfield_bounce",
      title: "Bloomfield Bounce",
      artist: "Eagleburger Band",
      arranger: "Eagleburger",
      keySignature: "Bb Major",
      tempoBpm: 140,
      status: "active",
      audioSampleUrl: "https://example.com/audio/bounce.mp3",
      driveLink: "https://drive.google.com/bloomfield-bounce",
      tags: ["Street Beat", "Parade", "Original"],
      notes: "Fast marching street stomp.",
      updatedAt: new Date().toISOString(),
    },
    {
      id: "song_river_groove",
      title: "Clarion River Walk",
      artist: "Traditional",
      arranger: "Eagleburger",
      keySignature: "F Major",
      tempoBpm: 116,
      status: "active",
      audioSampleUrl: "https://example.com/audio/clarion.mp3",
      driveLink: "https://drive.google.com/clarion-river",
      tags: ["Slow Jam", "New Orleans", "Second Line"],
      notes: "Heavy sousaphone groove with trombone trading solos.",
      updatedAt: new Date().toISOString(),
    },
    {
      id: "song_iron_city",
      title: "Iron City Funk",
      artist: "Traditional",
      arranger: "Eagleburger",
      keySignature: "Eb Major",
      tempoBpm: 122,
      status: "active",
      audioSampleUrl: "",
      driveLink: "https://drive.google.com/iron-city",
      tags: ["Funk", "Crowd Favorite", "Opener"],
      notes: "Main stage opener with horn section unisons.",
      updatedAt: new Date().toISOString(),
    },
    {
      id: "song_ghost_town",
      title: "Ghost Town Ska",
      artist: "The Specials",
      arranger: "Eagleburger Arrangers",
      keySignature: "C Minor",
      tempoBpm: 126,
      status: "active",
      audioSampleUrl: "",
      driveLink: "https://drive.google.com/ghost-town",
      tags: ["Ska", "Crowd Favorite"],
      notes: "Skank percussion accent on upbeat.",
      updatedAt: new Date().toISOString(),
    },
    {
      id: "song_foxburg_reel",
      title: "Foxburg River Reel",
      artist: "Traditional",
      arranger: "Eagleburger",
      keySignature: "G Major",
      tempoBpm: 136,
      status: "active",
      audioSampleUrl: "",
      driveLink: "https://drive.google.com/foxburg-reel",
      tags: ["Folk", "Parade"],
      notes: "Accordion or woodwind feature breakdown.",
      updatedAt: new Date().toISOString(),
    },
    {
      id: "song_bridge_burner",
      title: "Bridge Burner Breakdown",
      artist: "Eagleburger Band",
      arranger: "Eagleburger",
      keySignature: "D Minor",
      tempoBpm: 144,
      status: "review",
      audioSampleUrl: "",
      driveLink: "https://drive.google.com/bridge-burner",
      tags: ["High Energy", "Drum Solo"],
      notes: "Percussion feature section at letter C.",
      updatedAt: new Date().toISOString(),
    },
    {
      id: "song_superstition",
      title: "Superstition",
      artist: "Stevie Wonder",
      arranger: "Eagleburger Arrangers",
      keySignature: "Eb Minor",
      tempoBpm: 100,
      status: "active",
      audioSampleUrl: "",
      driveLink: "https://drive.google.com/superstition-charts",
      tags: ["Funk", "Classic", "Crowd Favorite"],
      notes: "Heavy sousaphone clavinet riff emulation.",
      updatedAt: new Date().toISOString(),
    },
    {
      id: "song_ghostbusters",
      title: "Ghostbusters Theme",
      artist: "Ray Parker Jr.",
      arranger: "Eagleburger",
      keySignature: "B Minor",
      tempoBpm: 116,
      status: "active",
      audioSampleUrl: "",
      driveLink: "https://drive.google.com/ghostbusters-charts",
      tags: ["Pop", "Parade", "Halloween"],
      notes: "Crowd call-and-response horn punches.",
      updatedAt: new Date().toISOString(),
    },
  ];

  for (const t of tunes) {
    // Write to canonical 'tunes' collection
    await setDoc(doc(db, "tunes", t.id), t, { merge: true });
  }
  console.log(`✅ Seeded ${tunes.length} tunes into canonical 'tunes' collection.`);

  // ==========================================
  // 4. Contacts Directory (Organizers, Venues, Media, Tech)
  // ==========================================
  const contacts = [
    {
      id: "contact_mattress_factory",
      name: "Sarah DeLuca",
      organization: "Mattress Factory Museum",
      role: "Events & Programming Curator",
      email: "sdeluca@mattress.org",
      phone: "412-555-7890",
      notes: "Point of contact for Garden Party series. Preferred stage load-in via rear alley.",
      tags: ["Venue", "Pittsburgh", "North Side"],
      createdAt: new Date().toISOString(),
    },
    {
      id: "contact_millvale_days",
      name: "Megan Kelly",
      organization: "Millvale Community Association",
      role: "Parade Coordinator",
      email: "megan@millvaledays.org",
      phone: "412-555-0144",
      notes: "Coordinates annual autumn parade marshaling and check-in.",
      tags: ["Community", "Festival", "Parade"],
      createdAt: new Date().toISOString(),
    },
    {
      id: "contact_allegheny_grille",
      name: "Mark Henderson",
      organization: "Allegheny Grille / Foxburg Festivals",
      role: "General Manager",
      email: "mhenderson@foxburginn.com",
      phone: "724-555-4321",
      notes: "Riverside lawn sound stage organizer.",
      tags: ["Venue", "Foxburg", "Riverside"],
      createdAt: new Date().toISOString(),
    },
    {
      id: "contact_pgh_marathon",
      name: "Marcus Vance",
      organization: "Pittsburgh Marathon Spirit Stations",
      role: "Cheer Station Director",
      email: "cheer@pittsburghmarathon.com",
      phone: "412-555-0182",
      notes: "Coordinates Bloomfield mile 11 corner placement and logistics permits.",
      tags: ["Athletic", "Spirit Zone"],
      createdAt: new Date().toISOString(),
    },
    {
      id: "contact_sound_tech",
      name: "Alex Ramirez",
      organization: "Three Rivers Sound Co.",
      role: "Audio Lead & Rigging",
      email: "alex@3riverssound.com",
      phone: "412-555-9011",
      notes: "Primary horn and drum mic vendor when outdoor PA is required.",
      tags: ["Vendor", "Audio", "Production"],
      createdAt: new Date().toISOString(),
    },
    {
      id: "contact_strip_district",
      name: "Anthony Rossi",
      organization: "Strip District Merchants Association",
      role: "Night Market Coordinator",
      email: "arossi@stripdistrict.org",
      phone: "412-555-0299",
      notes: "Coordinates evening street market road closures and permits.",
      tags: ["Market", "Strip District", "Festival"],
      createdAt: new Date().toISOString(),
    },
    {
      id: "contact_mansions_fifth",
      name: "Elena Rostova",
      organization: "Mansions on Fifth",
      role: "Event & Private Dining Director",
      email: "elena.rostova@gmail.com",
      phone: "412-555-0673",
      notes: "Contact for Shadyside historic venue courtyard and ballroom events.",
      tags: ["Venue", "Weddings", "Shadyside"],
      createdAt: new Date().toISOString(),
    },
    {
      id: "contact_cultural_trust",
      name: "Darnell Washington",
      organization: "Pittsburgh Cultural Trust",
      role: "Public Programming Associate",
      email: "dwashington@trustarts.org",
      phone: "412-555-0755",
      notes: "Downtown outdoor stages and Three Rivers Arts Festival curator.",
      tags: ["Arts", "Downtown", "Festival"],
      createdAt: new Date().toISOString(),
    },
  ];

  for (const c of contacts) {
    await setDoc(doc(db, "contacts", c.id), c, { merge: true });
  }
  console.log(`✅ Seeded ${contacts.length} industry & venue contacts.`);

  // ==========================================
  // 5. Suggestions (Roster Song / Repertoire Pitches)
  // ==========================================
  const suggestions = [
    {
      id: "sug_brass_chameleon",
      authorUid: "user_killebrew_joelle",
      authorName: "Joelle Levitt Killebrew",
      title: "Cissy Strut",
      originalArtist: "The Meters",
      description: "New Orleans funk groove that would fit our brass unisons perfectly.",
      referenceUrl: "https://www.youtube.com/watch?v=4_iC0MyIykM",
      category: "tune_request",
      status: "approved",
      upvoteUids: [superAdminUid, "user_fetkovich_john", "user_rubin_jonathan", "user_tbone_mike"],
      downvoteUids: [],
      targetRole: "",
      adminNotes: "",
      reviewedByUid: null,
      reviewedByName: null,
      reviewedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "sug_spanish_flea",
      authorUid: "user_ward_kristin",
      authorName: "Kristin Ward",
      title: "Spanish Flea",
      originalArtist: "Herb Alpert & Tijuana Brass",
      description: "Short, high-tempo, nostalgic parade stroll tune.",
      referenceUrl: "https://www.youtube.com/watch?v=mML2fPec7xU",
      category: "tune_request",
      status: "under_review",
      upvoteUids: ["user_ward_kristin", "user_bari_sarah"],
      downvoteUids: [],
      targetRole: "",
      adminNotes: "",
      reviewedByUid: null,
      reviewedByName: null,
      reviewedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "sug_superstition",
      authorUid: "user_fetkovich_john",
      authorName: "John Fetkovich",
      title: "Superstition",
      originalArtist: "Stevie Wonder",
      description: "The drum groove is iconic and our sousaphones would kill the bassline.",
      referenceUrl: "https://www.youtube.com/watch?v=0CFuCYNx-1g",
      category: "tune_request",
      status: "approved",
      upvoteUids: [superAdminUid, "user_rubin_jonathan", "user_killebrew_joelle"],
      downvoteUids: [],
      targetRole: "",
      adminNotes: "",
      reviewedByUid: null,
      reviewedByName: null,
      reviewedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "sug_feel_so_good",
      authorUid: "user_ward_kristin",
      authorName: "Kristin Ward",
      title: "Feels So Good",
      originalArtist: "Chuck Mangione",
      description: "Flugelhorn / trumpet melody feature for outdoor festivals.",
      referenceUrl: "https://www.youtube.com/watch?v=FPTk51k2iQk",
      category: "tune_request",
      status: "under_review",
      upvoteUids: ["user_ward_kristin", "user_killebrew_joelle"],
      downvoteUids: [],
      targetRole: "",
      adminNotes: "",
      reviewedByUid: null,
      reviewedByName: null,
      reviewedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  for (const sug of suggestions) {
    await setDoc(doc(db, "suggestions", sug.id), sug, { merge: true });
  }
  console.log(`✅ Seeded ${suggestions.length} repertoire song suggestions.`);

  // ==========================================
  // 6. Comments & Internal Discussion Feed
  // ==========================================
  const comments = [
    {
      id: "comment_mf_gear",
      targetType: "gig",
      targetId: "gig_mattress_factory_2026",
      authorUid: superAdminUid,
      authorName: "David Passmore",
      text: "Reminder: load-in is via the courtyard rear gate on Sampsonia Way. Look for the band permit in the driveway.",
      createdAt: new Date().toISOString(),
    },
    {
      id: "comment_drum_heads",
      targetType: "section",
      targetId: "percussion",
      authorUid: "user_fetkovich_john",
      authorName: "John Fetkovich",
      text: "New bass drum mallets and harness pins are packed in the master hardware duffel.",
      createdAt: new Date().toISOString(),
    },
  ];

  for (const cm of comments) {
    await setDoc(doc(db, "comments", cm.id), cm, { merge: true });
  }
  console.log(`✅ Seeded ${comments.length} discussion comments.`);

  // ==========================================
  // 6B. In-App Member Notifications
  // ==========================================
  const notifications = [
    {
      id: "notif_gig_mattress_factory",
      recipientUid: "all",
      title: "Call Times Confirmed: Mattress Factory Garden Party",
      message: "Call time is set for 1:30 PM at the museum courtyard. Full sound check begins at 1:45 PM sharp.",
      category: "gig_alert",
      priority: "normal",
      readUids: [superAdminUid],
      actionUrl: "/portal/gigs/gig_mattress_factory_2026",
      actionLabel: "View Call Sheet",
      createdByUid: superAdminUid,
      createdByName: "David Passmore (Gig Manager)",
      metadata: { gigId: "gig_mattress_factory_2026" },
      createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
      updatedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    },
    {
      id: "notif_logistics_st_patricks",
      recipientUid: "all",
      title: "Logistics Shift: St. Patrick's Parade Staging Line",
      message: "Float and marching formation line-up shifted to Division 4 on Liberty Avenue. Sousaphones report to step-off point by 9:15 AM.",
      category: "logistics_change",
      priority: "urgent",
      readUids: [],
      actionUrl: "/portal/gigs/gig_st_patricks_2026",
      actionLabel: "Review Staging Map",
      createdByUid: superAdminUid,
      createdByName: "Band Dispatch",
      metadata: { gigId: "gig_st_patricks_2026" },
      createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
      updatedAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    },
    {
      id: "notif_rehearsal_brass",
      recipientUid: "all",
      title: "Rehearsal Check-In: Bloomfield Parklet Rehearsal",
      message: "Full ensemble outdoor rehearsal this Thursday at 6:30 PM. Focus on 'Superstition' cadence transitions and street strolling routines.",
      category: "rehearsal_notice",
      priority: "normal",
      readUids: [superAdminUid],
      actionUrl: "/portal/availability",
      actionLabel: "Submit Availability",
      createdByUid: "user_fetkovich_john",
      createdByName: "John Fetkovich (Section Leader)",
      metadata: {},
      createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
      updatedAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    },
    {
      id: "notif_suggestion_promoted",
      recipientUid: "all",
      title: "Chart Added to Repertoire: 'Cissy Strut'",
      message: "Joelle's proposal for 'Cissy Strut' has been approved and charted by the catalog team! Charts are now active in the Repertoire Studio.",
      category: "suggestion_activity",
      priority: "low",
      readUids: [],
      actionUrl: "/portal/library",
      actionLabel: "Open Music Library",
      createdByUid: superAdminUid,
      createdByName: "Catalog Manager",
      metadata: { songId: "song_cissy_strut" },
      createdAt: new Date(Date.now() - 3600000 * 48).toISOString(),
      updatedAt: new Date(Date.now() - 3600000 * 48).toISOString(),
    },
  ];

  for (const n of notifications) {
    await setDoc(doc(db, "notifications", n.id), n, { merge: true });
  }
  console.log(`✅ Seeded ${notifications.length} in-app member notifications.`);

  // ==========================================
  // 7. Theme Configuration Document
  // ==========================================
  // Note: Full v2 scoped theme configuration is seeded in Section 11 below.

  // ==========================================
  // 8. Master Setlist Templates (Reusable Library)
  // ==========================================
  const setlistTemplates = [
    {
      id: "template_parade_short",
      name: "30-Minute Street Parade Block",
      title: "30-Minute Street Parade Block",
      category: "parade",
      description: "Fast-moving mobile street sequence with tight transitions and high crowd energy.",
      targetDurationMinutes: 30,
      isTemplate: true,
      usageCount: 2,
      lastUsedDate: "2026-10-10",
      assignedGigIds: ["gig_holiday_parade_2025", "gig_st_patricks_2026", "gig_pittsburgh_pride_2026", "gig_millvale_days_2026", "gig_pgh_10_miler_2026", "gig_greenfield_parade_2026", "gig_st_patricks_2027"],
      tags: ["Parade", "Street Beat", "Compact", "High Energy"],
      tunes: [
        {
          id: "t-parade-1",
          tuneId: "song_bloomfield_bounce",
          songId: "song_bloomfield_bounce",
          title: "Bloomfield Bounce",
          artist: "Eagleburger Band",
          keySignature: "Bb Major",
          tempoBpm: 140,
          durationSeconds: 240,
          performanceNote: "Drumline sets street cadence early; sousaphone walks into head riff.",
          segueIntoNext: true,
        },
        {
          id: "t-parade-2",
          tuneId: "song_iron_city",
          songId: "song_iron_city",
          title: "Iron City Funk",
          artist: "Traditional",
          keySignature: "Eb Major",
          tempoBpm: 122,
          durationSeconds: 260,
          performanceNote: "Direct pickup out of Bloomfield drum cadence.",
          segueIntoNext: false,
        },
        {
          id: "t-parade-3",
          tuneId: "song_ghost_town",
          songId: "song_ghost_town",
          title: "Ghost Town Ska",
          artist: "The Specials",
          keySignature: "C Minor",
          tempoBpm: 126,
          durationSeconds: 280,
          performanceNote: "Skank rhythm on upbeats; trumpet solo at bar 32.",
          segueIntoNext: false,
        },
        {
          id: "t-parade-4",
          tuneId: "song_renegade",
          songId: "song_renegade",
          title: "Renegade",
          artist: "Styx",
          keySignature: "G Minor",
          tempoBpm: 128,
          durationSeconds: 300,
          performanceNote: "Crowd anthem finish! Big brass swell on downbeat.",
          segueIntoNext: false,
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "template_festival_long",
      name: "90-Minute Festival Showcase",
      title: "90-Minute Festival Showcase",
      category: "festival",
      description: "Full-length two-set festival blowout with solo features, sousaphone spotlights, and encores.",
      targetDurationMinutes: 90,
      isTemplate: true,
      usageCount: 1,
      lastUsedDate: "2026-06-06",
      assignedGigIds: ["gig_first_night_2025", "gig_three_rivers_arts_2026", "gig_deutschtown_music_fest_2026", "gig_strip_district_nye_2026"],
      tags: ["Festival", "Stage", "Extended", "Showcase"],
      tunes: [
        {
          id: "t-fest-1",
          tuneId: "song_iron_city",
          songId: "song_iron_city",
          title: "Iron City Funk",
          artist: "Traditional",
          keySignature: "Eb Major",
          tempoBpm: 122,
          durationSeconds: 300,
          performanceNote: "Extended opener featuring trombone unisons.",
          segueIntoNext: false,
        },
        {
          id: "t-fest-2",
          tuneId: "song_superstition",
          songId: "song_superstition",
          title: "Superstition",
          artist: "Stevie Wonder",
          keySignature: "Eb Minor",
          tempoBpm: 100,
          durationSeconds: 290,
          performanceNote: "Heavy clavinet sousaphone groove with tenor saxophone solos.",
          segueIntoNext: false,
        },
        {
          id: "t-fest-3",
          tuneId: "song_river_groove",
          songId: "song_river_groove",
          title: "Clarion River Walk",
          artist: "Traditional",
          keySignature: "F Major",
          tempoBpm: 116,
          durationSeconds: 320,
          performanceNote: "Sousaphone solo feature and crowd call-and-response.",
          segueIntoNext: true,
        },
        {
          id: "t-fest-4",
          tuneId: "song_bloomfield_bounce",
          songId: "song_bloomfield_bounce",
          title: "Bloomfield Bounce",
          artist: "Eagleburger Band",
          keySignature: "Bb Major",
          tempoBpm: 140,
          durationSeconds: 270,
          performanceNote: "Double-time cadence transition into high energy.",
          segueIntoNext: false,
        },
        {
          id: "t-fest-5",
          tuneId: "song_ghost_town",
          songId: "song_ghost_town",
          title: "Ghost Town Ska",
          artist: "The Specials",
          keySignature: "C Minor",
          tempoBpm: 126,
          durationSeconds: 310,
          performanceNote: "Full ensemble shout chorus on the outro.",
          segueIntoNext: false,
        },
        {
          id: "t-fest-6",
          tuneId: "song_bridge_burner",
          songId: "song_bridge_burner",
          title: "Bridge Burner Breakdown",
          artist: "Eagleburger Band",
          keySignature: "D Minor",
          tempoBpm: 144,
          durationSeconds: 330,
          performanceNote: "Percussion battery solo feature at letter C.",
          segueIntoNext: true,
        },
        {
          id: "t-fest-7",
          tuneId: "song_renegade",
          songId: "song_renegade",
          title: "Renegade",
          artist: "Styx",
          keySignature: "G Minor",
          tempoBpm: 128,
          durationSeconds: 360,
          performanceNote: "Main showcase closer and band bows.",
          segueIntoNext: false,
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "template_beer_garden",
      name: "Beer Garden & Porchfest Set",
      title: "Beer Garden & Porchfest Set",
      category: "party",
      description: "Acoustic-friendly, laid back outdoor courtyard set suitable for casual gatherings.",
      targetDurationMinutes: 45,
      isTemplate: true,
      usageCount: 0,
      lastUsedDate: "",
      assignedGigIds: [],
      tags: ["Acoustic", "Casual", "Outdoor", "Porchfest"],
      tunes: [
        {
          id: "t-bg-1",
          tuneId: "song_river_groove",
          songId: "song_river_groove",
          title: "Clarion River Walk",
          artist: "Traditional",
          keySignature: "F Major",
          tempoBpm: 116,
          durationSeconds: 280,
          performanceNote: "Laid-back acoustic bounce.",
          segueIntoNext: false,
        },
        {
          id: "t-bg-2",
          tuneId: "song_ghost_town",
          songId: "song_ghost_town",
          title: "Ghost Town Ska",
          artist: "The Specials",
          keySignature: "C Minor",
          tempoBpm: 126,
          durationSeconds: 270,
          performanceNote: "Keep volume contained for courtyard acoustics.",
          segueIntoNext: false,
        },
        {
          id: "t-bg-3",
          tuneId: "song_bloomfield_bounce",
          songId: "song_bloomfield_bounce",
          title: "Bloomfield Bounce",
          artist: "Eagleburger Band",
          keySignature: "Bb Major",
          tempoBpm: 140,
          durationSeconds: 240,
          performanceNote: "Lively acoustic finale.",
          segueIntoNext: false,
        },
        {
          id: "t-bg-4",
          tuneId: "song_foxburg_reel",
          songId: "song_foxburg_reel",
          title: "Foxburg River Reel",
          artist: "Traditional",
          keySignature: "G Major",
          tempoBpm: 136,
          durationSeconds: 250,
          performanceNote: "Upbeat Celtic march reel feature.",
          segueIntoNext: false,
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "template_ceremonial_fanfare",
      name: "Ceremonial Brass Fanfare & Civic March",
      title: "Ceremonial Brass Fanfare & Civic March",
      category: "ceremony",
      description: "Regal procession fanfares and high-stately brass marches for civic inaugurations and dedications.",
      targetDurationMinutes: 35,
      isTemplate: true,
      usageCount: 0,
      lastUsedDate: "",
      assignedGigIds: [],
      tags: ["Civic", "Ceremony", "Procession", "Formal"],
      tunes: [
        {
          id: "t-cer-1",
          tuneId: "song_foxburg_reel",
          songId: "song_foxburg_reel",
          title: "Foxburg River Reel",
          artist: "Traditional",
          keySignature: "G Major",
          tempoBpm: 136,
          durationSeconds: 240,
          performanceNote: "Stately processional tempo.",
          segueIntoNext: false,
        },
        {
          id: "t-cer-2",
          tuneId: "song_river_groove",
          songId: "song_river_groove",
          title: "Clarion River Walk",
          artist: "Traditional",
          keySignature: "F Major",
          tempoBpm: 116,
          durationSeconds: 290,
          performanceNote: "Solemn, resonant low brass unisons.",
          segueIntoNext: false,
        },
        {
          id: "t-cer-3",
          tuneId: "song_ghostbusters",
          songId: "song_ghostbusters",
          title: "Ghostbusters Theme",
          artist: "Ray Parker Jr.",
          keySignature: "B Minor",
          tempoBpm: 116,
          durationSeconds: 260,
          performanceNote: "Celebratory fanfare recessional.",
          segueIntoNext: false,
        },
        {
          id: "t-cer-4",
          tuneId: "song_bloomfield_bounce",
          songId: "song_bloomfield_bounce",
          title: "Bloomfield Bounce",
          artist: "Eagleburger Band",
          keySignature: "Bb Major",
          tempoBpm: 140,
          durationSeconds: 240,
          performanceNote: "Joyful celebratory crowd recessional.",
          segueIntoNext: false,
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  for (const sl of setlistTemplates) {
    await setDoc(doc(db, "setlists", sl.id), sl, { merge: true });
  }
  console.log(`✅ Seeded ${setlistTemplates.length} setlist templates into Setlist Studio library.`);

  // ==========================================
  // 9. Gigs, Call Sheets, RSVPs & Dispatch History
  // (Utilizes schema validation, automatic slug generation, and attendance helpers)
  // ==========================================
  const paradeTemplateTunes = setlistTemplates[0].tunes;
  const festivalTemplateTunes = setlistTemplates[1].tunes;
  const beerGardenTemplateTunes = setlistTemplates[2].tunes;
  const ceremonialTemplateTunes = setlistTemplates[3].tunes;

  interface SeedGigInput {
    id: string;
    date: string;
    status: "lead" | "tentative" | "confirmed" | "completed" | "cancelled" | "archived";
    title: string;
    venue: string;
    venueAddress: string;
    coordinates?: { lat: number; lng: number };
    city?: string;
    description: string;
    admission?: string;
    callTime?: string;
    downbeat?: string;
    attire?: string;
    unloadingAddress?: string;
    parkingNotes?: string;
    compensation?: number;
    compensationType?: "community" | "band_fund" | "individual";
    totalFee?: number;
    setlistId?: string | null;
    setlistName?: string;
    setlistTitle?: string;
    setlist?: Array<{
      id: string;
      tuneId: string;
      songId: string;
      title: string;
      artist: string;
      keySignature: string;
      tempoBpm: number;
      durationSeconds: number;
      performanceNote: string;
      segueIntoNext: boolean;
    }>;
    createdAt?: string;
    updatedAt?: string;
  }

  async function seedGigWithAttendance(
    gigInput: SeedGigInput,
    rosterUsers: typeof users
  ) {
    const slug = generateGigSlug(gigInput.date, gigInput.title);
    const compType = gigInput.compensationType || "community";
    const compAmount = gigInput.compensation || 0;
    const totalFee = gigInput.totalFee ?? (compType === "individual" ? compAmount * rosterUsers.length : compAmount);

    const payouts: Record<string, PerformerPayoutRecord> = {};
    if (compType === "individual" && compAmount > 0) {
      rosterUsers.forEach((m, idx) => {
        if (idx < 8) {
          payouts[m.uid] = {
            uid: m.uid,
            displayName: m.displayName,
            amount: compAmount,
            paymentStatus: gigInput.status === "completed" ? "paid" : "unpaid",
            paymentMethod: idx % 2 === 0 ? "venmo" : "bank_transfer",
            paidAt: gigInput.status === "completed" ? `${gigInput.date}T22:30:00.000Z` : null,
          };
        }
      });
    }

    const gigPayload = GigSchema.parse({
      id: gigInput.id,
      date: gigInput.date,
      status: gigInput.status,
      setlistId: gigInput.setlistId || "",
      setlistName: gigInput.setlistName || "",
      setlistTitle: gigInput.setlistTitle || gigInput.setlistName || "",
      publicDetails: {
        title: gigInput.title,
        venue: gigInput.venue,
        address: gigInput.venueAddress,
        venueAddress: gigInput.venueAddress,
        coordinates: gigInput.coordinates || { lat: 40.4406, lng: -79.9959 },
        city: gigInput.city || "Pittsburgh, PA",
        description: gigInput.description,
        admission: gigInput.admission || "Free",
        eventUrl: `https://facebook.com/events/${gigInput.id}`,
        facebookEventUrl: `https://facebook.com/events/${gigInput.id}`,
        ticketUrl: "",
        isPublic: gigInput.status !== "lead" && gigInput.status !== "archived",
        showExternalDirections: true,
      },
      internalLogistics: {
        title: gigInput.title,
        callTime: gigInput.callTime || "18:00",
        downbeat: gigInput.downbeat || "19:00",
        unloadingAddress: gigInput.unloadingAddress || gigInput.venueAddress,
        parkingInstructions: gigInput.parkingNotes || "Street and band vehicle parking available nearby.",
        parkingNotes: gigInput.parkingNotes || "Street and band vehicle parking available nearby.",
        attire: gigInput.attire || "Eagleburger Yellows & Festive Black",
        payPerMusician: compType === "individual" ? compAmount : 0,
        compensation: compAmount,
        compensationType: compType,
        setlistId: gigInput.setlistId || "",
        setlistName: gigInput.setlistName || "",
        setlistTitle: gigInput.setlistTitle || gigInput.setlistName || "",
        description: gigInput.description,
      },
      financials: {
        totalFee: totalFee,
        compensationType: compType,
        settlementType: compType,
        bandFundCut: compType === "band_fund" ? compAmount : 0,
        fixedPerformerAmount: compType === "individual" ? compAmount : 0,
        payouts: payouts,
        notes:
          compType === "community"
            ? "Community civic/volunteer performance."
            : compType === "band_fund"
            ? "Proceeds deposited directly to band treasury fund."
            : "Performance fee distributed among participating roster members.",
      },
      schemaVersion: 1,
      createdAt: gigInput.createdAt || "2026-01-01T12:00:00.000Z",
      updatedAt: gigInput.updatedAt || new Date().toISOString(),
    });

    await setDoc(
      doc(db, "gigs", gigInput.id),
      {
        ...gigPayload,
        slug,
        setlistId: gigInput.setlistId || null,
        rsvpSummary: {
          attendingCount: gigInput.status === "completed" ? 8 : gigInput.status === "confirmed" ? 8 : 4,
          declinedCount: gigInput.status === "completed" ? 1 : 1,
        },
      },
      { merge: true }
    );

    await setDoc(
      doc(db, "setlists", gigInput.id),
      {
        gigId: gigInput.id,
        isTemplate: false,
        templateId: gigInput.setlistId || null,
        templateName: gigInput.setlistName || "",
        name: gigInput.setlistName || gigInput.title,
        title: gigInput.setlistTitle || gigInput.setlistName || gigInput.title,
        tunes: gigInput.setlist || [],
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    for (let i = 0; i < rosterUsers.length; i++) {
      const musician = rosterUsers[i];
      let rsvpStatus: "attending" | "declined" | "tentative" = "attending";
      if (gigInput.status === "lead") {
        rsvpStatus = i < 4 ? "attending" : "tentative";
      } else {
        if (i === 6) rsvpStatus = "declined";
        if (i === 7 && gigInput.status !== "completed") rsvpStatus = "tentative";
      }

      const rsvpDocRef = doc(db, "gigs", gigInput.id, "rsvps", musician.uid);
      const rsvpPayload = GigRsvpSchema.parse({
        gigId: gigInput.id,
        uid: musician.uid,
        displayName: musician.displayName,
        sectionId: musician.sectionId || "",
        status: rsvpStatus,
        notes: rsvpStatus === "declined" ? "Schedule conflict with other band/work" : "",
        updatedAt: new Date().toISOString(),
      });
      await setDoc(rsvpDocRef, rsvpPayload, { merge: true });

      if (rsvpStatus === "attending" && (gigInput.status === "confirmed" || gigInput.status === "completed")) {
        const checkinStatus = i === 5 ? "late" : "checked_in";
        const checkinPayload = CheckInSchema.parse({
          uid: musician.uid,
          gigId: gigInput.id,
          displayName: musician.displayName,
          section: musician.sectionId || "General",
          status: checkinStatus,
          checkInMethod: "self_kiosk",
          checkInTime: gigInput.callTime || "17:45",
          notes: checkinStatus === "late" ? "Arrived 10 minutes past call time" : "Checked in on time via self kiosk",
          updatedAt: new Date().toISOString(),
        });
        await setDoc(doc(db, "gigs", gigInput.id, "checkins", musician.uid), checkinPayload, { merge: true });
      }
    }

    const auditRef = doc(collection(db, "gigs", gigInput.id, "dispatch_history"));
    await setDoc(auditRef, {
      type: "logistics_init",
      message: `Call sheet initialized for ${gigInput.title}.`,
      initiatedBy: "System Seed",
      dispatchedAt: gigInput.createdAt || new Date().toISOString(),
    });
  }

  const gigs: SeedGigInput[] = [
    // --- PAST GIGS (Completed) ---
    {
      id: "gig_bloomfield_halloween_2025",
      date: "2025-10-25",
      status: "completed",
      title: "Bloomfield Halloween Spooky Promenade",
      venue: "Liberty Avenue Business District",
      venueAddress: "4700 Liberty Ave, Pittsburgh, PA 15224",
      coordinates: { lat: 40.4619, lng: -79.9489 },
      city: "Pittsburgh, PA (Bloomfield)",
      description: "Annual costumed night march down Liberty Ave playing Ghostbusters and spooky second-line street grooves.",
      callTime: "6:00 PM",
      downbeat: "7:00 PM",
      attire: "Costumes or Festive Spooky Yellow/Black",
      unloadingAddress: "4700 Liberty Ave (behind church parking lot)",
      parkingNotes: "Free street parking along Cedarville and Friendship Ave.",
      compensation: 0,
      compensationType: "community",
      totalFee: 0,
      setlist: [
        {
          id: "bf-hallow-1",
          tuneId: "song_ghostbusters",
          songId: "song_ghostbusters",
          title: "Ghostbusters Theme",
          artist: "Ray Parker Jr.",
          keySignature: "B Minor",
          tempoBpm: 116,
          durationSeconds: 260,
          performanceNote: "Crowd call-and-response opener.",
          segueIntoNext: false,
        },
        {
          id: "bf-hallow-2",
          tuneId: "song_ghost_town",
          songId: "song_ghost_town",
          title: "Ghost Town Ska",
          artist: "The Specials",
          keySignature: "C Minor",
          tempoBpm: 126,
          durationSeconds: 280,
          performanceNote: "Skank groove along trolley tracks.",
          segueIntoNext: true,
        },
        {
          id: "bf-hallow-3",
          tuneId: "song_bloomfield_bounce",
          songId: "song_bloomfield_bounce",
          title: "Bloomfield Bounce",
          artist: "Eagleburger Band",
          keySignature: "Bb Major",
          tempoBpm: 140,
          durationSeconds: 240,
          performanceNote: "High speed hometown march.",
          segueIntoNext: false,
        },
        {
          id: "bf-hallow-4",
          tuneId: "song_renegade",
          songId: "song_renegade",
          title: "Renegade",
          artist: "Styx",
          keySignature: "G Minor",
          tempoBpm: 128,
          durationSeconds: 300,
          performanceNote: "Massive singalong finale at Liberty & Gross St.",
          segueIntoNext: false,
        },
      ],
      createdAt: "2025-09-15T12:00:00.000Z",
    },
    {
      id: "gig_holiday_parade_2025",
      date: "2025-11-29",
      status: "completed",
      title: "Greenfield Holiday Parade 2025",
      venue: "Beechwood Boulevard & Murray Ave",
      venueAddress: "Murray Ave & Beechwood Blvd, Pittsburgh, PA 15217",
      coordinates: { lat: 40.4262, lng: -79.9328 },
      city: "Pittsburgh, PA (Greenfield)",
      description: "Historic winter marching parade through Greenfield neighborhood. High crowd density and brass excitement in freezing temperatures.",
      callTime: "1:00 PM",
      downbeat: "2:00 PM",
      attire: "Winter Layered Band Yellows & Beanies",
      unloadingAddress: "Beechwood Blvd assembly area",
      parkingNotes: "Greenfield School lower lot parking pass.",
      compensation: 450,
      compensationType: "band_fund",
      totalFee: 450,
      setlistId: "template_parade_short",
      setlistName: "30-Minute Street Parade Block",
      setlist: paradeTemplateTunes,
      createdAt: "2025-10-10T12:00:00.000Z",
    },
    {
      id: "gig_first_night_2025",
      date: "2025-12-31",
      status: "completed",
      title: "Highmark First Night Pittsburgh 2025",
      venue: "Cultural District Outdoor Plaza",
      venueAddress: "7th St & Penn Ave, Pittsburgh, PA 15222",
      coordinates: { lat: 40.4433, lng: -80.0007 },
      city: "Pittsburgh, PA (Downtown)",
      description: "New Year's Eve street celebration in the heart of the Cultural District. Outdoor fire pit performances leading to midnight ball rise.",
      callTime: "8:30 PM",
      downbeat: "9:30 PM",
      attire: "Formal Black & Gold with Thermal Undershirts",
      unloadingAddress: "Penn Ave & 7th St (Stage loading zone)",
      parkingNotes: "Theater Square Garage reserved band parking.",
      compensation: 120,
      compensationType: "individual",
      totalFee: 1200,
      setlistId: "template_festival_long",
      setlistName: "90-Minute Festival Showcase",
      setlist: festivalTemplateTunes,
      createdAt: "2025-11-01T12:00:00.000Z",
    },
    {
      id: "gig_mardi_gras_2026",
      date: "2026-02-17",
      status: "completed",
      title: "South Side Fat Tuesday Brass Crawl",
      venue: "East Carson Street Corridor",
      venueAddress: "1500 E Carson St, Pittsburgh, PA 15203",
      coordinates: { lat: 40.4287, lng: -79.9839 },
      city: "Pittsburgh, PA (South Side)",
      description: "Acoustic second-line march through participating venues on East Carson. Throwing beads and blowing unamplified brass funk.",
      callTime: "6:30 PM",
      downbeat: "7:30 PM",
      attire: "Mardi Gras Purple, Green & Eagleburger Yellow",
      unloadingAddress: "1500 E Carson St (South Side Works lot)",
      parkingNotes: "Municipal parking lot at 18th & Carson.",
      compensation: 80,
      compensationType: "individual",
      totalFee: 800,
      setlistId: "template_beer_garden",
      setlistName: "Beer Garden & Porchfest Set",
      setlist: beerGardenTemplateTunes,
      createdAt: "2026-01-10T12:00:00.000Z",
    },
    {
      id: "gig_st_patricks_2026",
      date: "2026-03-14",
      status: "completed",
      title: "Pittsburgh St. Patrick's Day Parade 2026",
      venue: "Downtown Pittsburgh Parade Route",
      venueAddress: "Grant St & Boulevard of the Allies, Pittsburgh, PA 15219",
      coordinates: { lat: 40.4374, lng: -79.9984 },
      city: "Pittsburgh, PA (Downtown)",
      description: "One of the nation's largest St. Patrick's Day parades. 1.4 mile marching route performing for over 200,000 spectators along Grant St.",
      callTime: "8:45 AM",
      downbeat: "10:00 AM",
      attire: "Parade Yellows with Green Accents",
      unloadingAddress: "Liberty Ave staging zone (Division 3)",
      parkingNotes: "Greyhound station garage validation.",
      compensation: 600,
      compensationType: "band_fund",
      totalFee: 600,
      setlistId: "template_parade_short",
      setlistName: "30-Minute Street Parade Block",
      setlist: paradeTemplateTunes,
      createdAt: "2026-01-15T12:00:00.000Z",
    },
    {
      id: "gig_bloomfield_mayfest_2026",
      date: "2026-05-02",
      status: "completed",
      title: "Bloomfield Mayfest Street Fair",
      venue: "Liberty Green & 44th Street",
      venueAddress: "4400 Liberty Ave, Pittsburgh, PA 15224",
      coordinates: { lat: 40.4635, lng: -79.9515 },
      city: "Pittsburgh, PA (Bloomfield)",
      description: "Spring neighborhood festival with food trucks, artisan booths, and roving street brass pop-ups.",
      callTime: "12:15 PM",
      downbeat: "1:00 PM",
      attire: "Casual Eagleburger Yellow T-Shirts",
      unloadingAddress: "4400 Liberty Ave (festival check-in)",
      parkingNotes: "West Penn Hospital parking garage passes provided.",
      compensation: 500,
      compensationType: "band_fund",
      totalFee: 500,
      setlistId: "template_beer_garden",
      setlistName: "Beer Garden & Porchfest Set",
      setlist: beerGardenTemplateTunes,
      createdAt: "2026-03-01T12:00:00.000Z",
    },
    {
      id: "gig_lawrenceville_porchfest_2026",
      date: "2026-05-16",
      status: "completed",
      title: "Lawrenceville Porchfest 2026",
      venue: "44th Street & Butler St Community Porch",
      venueAddress: "220 44th St, Pittsburgh, PA 15201",
      coordinates: { lat: 40.4704, lng: -79.9577 },
      city: "Pittsburgh, PA (Lawrenceville)",
      description: "Acoustic neighborhood porch set. Over 300 spectators packed into front yard and sidewalk for high-energy unamplified funk.",
      callTime: "1:15 PM",
      downbeat: "2:00 PM",
      attire: "Eagleburger Casual / Band Polos",
      unloadingAddress: "44th St between Butler and Plummer",
      parkingNotes: "Street parking on Plummer St or 43rd St.",
      compensation: 0,
      compensationType: "community",
      totalFee: 0,
      setlistId: "template_beer_garden",
      setlistName: "Beer Garden & Porchfest Set",
      setlist: beerGardenTemplateTunes,
      createdAt: "2026-03-10T12:00:00.000Z",
    },
    {
      id: "gig_three_rivers_arts_2026",
      date: "2026-06-06",
      status: "completed",
      title: "Dollar Bank Three Rivers Arts Festival",
      venue: "Point State Park / Stanwix Stage",
      venueAddress: "Point State Park, Pittsburgh, PA 15222",
      coordinates: { lat: 40.4417, lng: -80.0076 },
      city: "Pittsburgh, PA (Downtown)",
      description: "90-minute headline outdoor evening set under the fountain at the Point for the annual 10-day regional arts festival.",
      callTime: "6:00 PM",
      downbeat: "7:00 PM",
      attire: "Sharp Eagleburger Yellow Tops & Dark Slacks",
      unloadingAddress: "Commonwealth Place artist entrance gate",
      parkingNotes: "Gateway Center Garage band passes.",
      compensation: 150,
      compensationType: "individual",
      totalFee: 1500,
      setlistId: "template_festival_long",
      setlistName: "90-Minute Festival Showcase",
      setlist: festivalTemplateTunes,
      createdAt: "2026-04-01T12:00:00.000Z",
    },
    {
      id: "gig_pittsburgh_pride_2026",
      date: "2026-06-27",
      status: "completed",
      title: "Pittsburgh Pride Revolution Parade & Concert",
      venue: "Andy Warhol Bridge to North Shore",
      venueAddress: "7th St Bridge, Pittsburgh, PA 15212",
      coordinates: { lat: 40.4475, lng: -80.0022 },
      city: "Pittsburgh, PA (North Shore)",
      description: "Marching across the Andy Warhol 7th St Bridge leading the parade procession into the North Shore riverfront festival.",
      callTime: "11:00 AM",
      downbeat: "12:00 PM",
      attire: "Rainbow Accents & Festive Band Yellows",
      unloadingAddress: "Downtown assembly on Fort Duquesne Blvd",
      parkingNotes: "North Shore Gold Lot 1A passes.",
      compensation: 750,
      compensationType: "band_fund",
      totalFee: 750,
      setlistId: "template_parade_short",
      setlistName: "30-Minute Street Parade Block",
      setlist: paradeTemplateTunes,
      createdAt: "2026-04-15T12:00:00.000Z",
    },
    {
      id: "gig_deutschtown_music_fest_2026",
      date: "2026-07-11",
      status: "completed",
      title: "Deutschtown Music Festival Mainstage",
      venue: "East Ohio Street & Middle St Stage",
      venueAddress: "500 E Ohio St, Pittsburgh, PA 15212",
      coordinates: { lat: 40.4533, lng: -80.0004 },
      city: "Pittsburgh, PA (Historic Deutschtown)",
      description: "Peak Saturday festival performance at Western PA's premier grassroots music festival. Crowd sing-alongs on Renegade and Superstition.",
      callTime: "4:30 PM",
      downbeat: "5:30 PM",
      attire: "Summer Band Yellows",
      unloadingAddress: "Middle St artist load-in behind main stage",
      parkingNotes: "Allegheny Center garage parking passes.",
      compensation: 90,
      compensationType: "individual",
      totalFee: 900,
      setlistId: "template_festival_long",
      setlistName: "90-Minute Festival Showcase",
      setlist: festivalTemplateTunes,
      createdAt: "2026-05-01T12:00:00.000Z",
    },
    {
      id: "gig_shadyside_arts_2026",
      date: "2026-08-22",
      status: "completed",
      title: "The Art Festival on Walnut Street",
      venue: "Walnut Street Pedestrian Mall",
      venueAddress: "5500 Walnut St, Pittsburgh, PA 15232",
      coordinates: { lat: 40.4514, lng: -79.9332 },
      city: "Pittsburgh, PA (Shadyside)",
      description: "Mobile street marching sets weaving through art galleries, craft stalls, and sidewalk cafes on Walnut Street.",
      callTime: "1:30 PM",
      downbeat: "2:30 PM",
      attire: "Band Polos & Khakis",
      unloadingAddress: "Bellefonte & Walnut St intersection",
      parkingNotes: "Ivy Street Garage reserved artist passes.",
      compensation: 650,
      compensationType: "band_fund",
      totalFee: 650,
      setlistId: "template_beer_garden",
      setlistName: "Beer Garden & Porchfest Set",
      setlist: beerGardenTemplateTunes,
      createdAt: "2026-06-15T12:00:00.000Z",
    },
    {
      id: "gig_mattress_factory_2026",
      date: "2026-09-25",
      status: "completed",
      title: "Mattress Factory Garden Party",
      venue: "Mattress Factory Museum Garden",
      venueAddress: "500 Sampsonia Way, Pittsburgh, PA 15212",
      coordinates: { lat: 40.4571, lng: -80.0125 },
      city: "Pittsburgh, PA (North Side)",
      description: "Special double-bill outdoor performance featuring Eagleburger Band and The Honk Committee from Buffalo in the museum courtyard.",
      callTime: "5:45 PM",
      downbeat: "6:45 PM",
      attire: "Eagleburger Yellows & Festive Black",
      unloadingAddress: "500 Sampsonia Way (Rear Alley Gate)",
      parkingNotes: "Monterey St lot permits provided.",
      compensation: 65,
      compensationType: "individual",
      totalFee: 650,
      setlist: [
        {
          id: "mf-tune-1",
          tuneId: "song_iron_city",
          songId: "song_iron_city",
          title: "Iron City Funk",
          artist: "Traditional",
          keySignature: "Eb Major",
          tempoBpm: 122,
          durationSeconds: 260,
          performanceNote: "Opener with horn section fanfares.",
          segueIntoNext: false,
        },
        {
          id: "mf-tune-2",
          tuneId: "song_superstition",
          songId: "song_superstition",
          title: "Superstition",
          artist: "Stevie Wonder",
          keySignature: "Eb Minor",
          tempoBpm: 100,
          durationSeconds: 290,
          performanceNote: "Heavy clavinet sousaphone groove.",
          segueIntoNext: false,
        },
        {
          id: "mf-tune-3",
          tuneId: "song_river_groove",
          songId: "song_river_groove",
          title: "Clarion River Walk",
          artist: "Traditional",
          keySignature: "F Major",
          tempoBpm: 116,
          durationSeconds: 320,
          performanceNote: "Sousaphone solo feature.",
          segueIntoNext: true,
        },
        {
          id: "mf-tune-4",
          tuneId: "song_bloomfield_bounce",
          songId: "song_bloomfield_bounce",
          title: "Bloomfield Bounce",
          artist: "Eagleburger Band",
          keySignature: "Bb Major",
          tempoBpm: 140,
          durationSeconds: 270,
          performanceNote: "Fast transition into dance cadence.",
          segueIntoNext: false,
        },
        {
          id: "mf-tune-5",
          tuneId: "song_renegade",
          songId: "song_renegade",
          title: "Renegade",
          artist: "Styx",
          keySignature: "G Minor",
          tempoBpm: 128,
          durationSeconds: 360,
          performanceNote: "Encore closer with crowd singing.",
          segueIntoNext: false,
        },
      ],
      createdAt: "2026-07-20T12:00:00.000Z",
    },

    // --- FUTURE GIGS (Upcoming & Scheduled) ---
    {
      id: "gig_millvale_days_2026",
      date: "2026-10-10",
      status: "confirmed",
      title: "Millvale Days Community Parade & Concert",
      venue: "Grant Ave Street Stage",
      venueAddress: "216 Grant Ave, Millvale, PA 15209",
      coordinates: { lat: 40.4788, lng: -79.9749 },
      city: "Millvale, PA",
      description: "Headline evening street parade and courtyard concert for the 85th annual Millvale Days celebration.",
      callTime: "4:30 PM",
      downbeat: "5:30 PM",
      attire: "Full Band Yellow Uniforms",
      unloadingAddress: "Sedgwick St & Grant Ave staging area",
      parkingNotes: "Millvale Borough municipal lot parking passes.",
      compensation: 500,
      compensationType: "band_fund",
      totalFee: 500,
      setlistId: "template_parade_short",
      setlistName: "30-Minute Street Parade Block",
      setlist: paradeTemplateTunes,
      createdAt: "2026-05-10T12:00:00.000Z",
    },
    {
      id: "gig_southside_zombie_walk_2026",
      date: "2026-10-24",
      status: "confirmed",
      title: "South Side Halloween Spooky Brass Promenade",
      venue: "18th & East Carson Street Plaza",
      venueAddress: "1800 E Carson St, Pittsburgh, PA 15203",
      coordinates: { lat: 40.4287, lng: -79.9806 },
      city: "Pittsburgh, PA (South Side)",
      description: "High-stepping costumed street brass march through South Side entertainment district. Ghostbusters theme and scary brass riffs.",
      callTime: "6:00 PM",
      downbeat: "7:00 PM",
      attire: "Costumes or Festive Spooky Yellow/Black",
      unloadingAddress: "1800 E Carson St (behind municipal lot)",
      parkingNotes: "18th St municipal lot parking vouchers.",
      compensation: 70,
      compensationType: "individual",
      totalFee: 700,
      setlist: [
        {
          id: "ss-spooky-1",
          tuneId: "song_ghostbusters",
          songId: "song_ghostbusters",
          title: "Ghostbusters Theme",
          artist: "Ray Parker Jr.",
          keySignature: "B Minor",
          tempoBpm: 116,
          durationSeconds: 260,
          performanceNote: "Crowd anthem opener on Carson St.",
          segueIntoNext: false,
        },
        {
          id: "ss-spooky-2",
          tuneId: "song_ghost_town",
          songId: "song_ghost_town",
          title: "Ghost Town Ska",
          artist: "The Specials",
          keySignature: "C Minor",
          tempoBpm: 126,
          durationSeconds: 280,
          performanceNote: "Ska rhythm for street dance.",
          segueIntoNext: true,
        },
        {
          id: "ss-spooky-3",
          tuneId: "song_bloomfield_bounce",
          songId: "song_bloomfield_bounce",
          title: "Bloomfield Bounce",
          artist: "Eagleburger Band",
          keySignature: "Bb Major",
          tempoBpm: 140,
          durationSeconds: 240,
          performanceNote: "March cadence pickup.",
          segueIntoNext: false,
        },
        {
          id: "ss-spooky-4",
          tuneId: "song_renegade",
          songId: "song_renegade",
          title: "Renegade",
          artist: "Styx",
          keySignature: "G Minor",
          tempoBpm: 128,
          durationSeconds: 300,
          performanceNote: "Big brass finish.",
          segueIntoNext: false,
        },
      ],
      createdAt: "2026-08-01T12:00:00.000Z",
    },
    {
      id: "gig_pgh_10_miler_2026",
      date: "2026-11-01",
      status: "confirmed",
      title: "EQT Pittsburgh 10 Miler Brass Cheer Station",
      venue: "West End Overlook Runner Course",
      venueAddress: "Marlow St & Fairview Ave, Pittsburgh, PA 15220",
      coordinates: { lat: 40.4468, lng: -80.0354 },
      city: "Pittsburgh, PA (West End)",
      description: "High-energy acoustic cheer station powering runners up the steep climb through the West End.",
      callTime: "7:15 AM",
      downbeat: "8:00 AM",
      attire: "Warm Layers, Band Jackets & Yellow Beanies",
      unloadingAddress: "Elliott West End Overlook pavilion area",
      parkingNotes: "Overlook park lot passes provided by P3R.",
      compensation: 350,
      compensationType: "band_fund",
      totalFee: 350,
      setlistId: "template_parade_short",
      setlistName: "30-Minute Street Parade Block",
      setlist: paradeTemplateTunes,
      createdAt: "2026-08-15T12:00:00.000Z",
    },
    {
      id: "gig_greenfield_parade_2026",
      date: "2026-11-28",
      status: "confirmed",
      title: "Greenfield Holiday Parade 2026",
      venue: "Murray Ave & Beechwood Blvd",
      venueAddress: "Murray Ave & Beechwood Blvd, Pittsburgh, PA 15217",
      coordinates: { lat: 40.4262, lng: -79.9328 },
      city: "Pittsburgh, PA (Greenfield)",
      description: "Our beloved annual holiday tradition! Leading the parade unit down Murray Avenue to Greenfield school grounds.",
      callTime: "1:00 PM",
      downbeat: "2:00 PM",
      attire: "Winter Layered Band Yellows, Santa Hats & Beanies",
      unloadingAddress: "Beechwood Blvd staging area",
      parkingNotes: "Greenfield School lower lot parking pass.",
      compensation: 500,
      compensationType: "band_fund",
      totalFee: 500,
      setlistId: "template_parade_short",
      setlistName: "30-Minute Street Parade Block",
      setlist: paradeTemplateTunes,
      createdAt: "2026-09-01T12:00:00.000Z",
    },
    {
      id: "gig_strip_district_nye_2026",
      date: "2026-12-31",
      status: "confirmed",
      title: "Strip District NYE Brass & Brewery Bash",
      venue: "24th Street Warehouse Brewery",
      venueAddress: "2400 Smallman St, Pittsburgh, PA 15222",
      coordinates: { lat: 40.4532, lng: -79.9829 },
      city: "Pittsburgh, PA (Strip District)",
      description: "Ticketed New Year's Eve warehouse party. Two high-octane 45-minute sets leading into the midnight toast.",
      callTime: "9:00 PM",
      downbeat: "10:15 PM",
      attire: "Formal Black with Gold Bowties & Band Yellow",
      unloadingAddress: "2400 Smallman St (brewery bay door)",
      parkingNotes: "Reserved parking in brewery rear compound.",
      compensation: 160,
      compensationType: "individual",
      totalFee: 1600,
      setlistId: "template_festival_long",
      setlistName: "90-Minute Festival Showcase",
      setlist: festivalTemplateTunes,
      createdAt: "2026-09-10T12:00:00.000Z",
    },
    {
      id: "gig_mardi_gras_carson_2027",
      date: "2027-02-09",
      status: "confirmed",
      title: "South Side Fat Tuesday 2027 Brass Crawl",
      venue: "East Carson Street Corridor",
      venueAddress: "1600 E Carson St, Pittsburgh, PA 15203",
      coordinates: { lat: 40.4287, lng: -79.9825 },
      city: "Pittsburgh, PA (South Side)",
      description: "Second line procession celebrating Fat Tuesday 2027 across South Side music pubs and restaurants.",
      callTime: "6:30 PM",
      downbeat: "7:30 PM",
      attire: "Mardi Gras Beads & Eagleburger Yellow",
      unloadingAddress: "1600 E Carson St (municipal lot)",
      parkingNotes: "Municipal parking lot at 18th & Carson.",
      compensation: 90,
      compensationType: "individual",
      totalFee: 900,
      setlistId: "template_beer_garden",
      setlistName: "Beer Garden & Porchfest Set",
      setlist: beerGardenTemplateTunes,
      createdAt: "2026-09-15T12:00:00.000Z",
    },
    {
      id: "gig_st_patricks_2027",
      date: "2027-03-13",
      status: "confirmed",
      title: "Pittsburgh St. Patrick's Day Parade 2027",
      venue: "Grant St & Boulevard of the Allies",
      venueAddress: "Grant St & Blvd of the Allies, Pittsburgh, PA 15219",
      coordinates: { lat: 40.4374, lng: -79.9984 },
      city: "Pittsburgh, PA (Downtown)",
      description: "Annual St. Patrick's Day parade marching appearance through downtown Pittsburgh.",
      callTime: "8:45 AM",
      downbeat: "10:00 AM",
      attire: "Parade Yellows with Green Accents",
      unloadingAddress: "Liberty Ave staging zone (Division 3)",
      parkingNotes: "Greyhound station garage validation.",
      compensation: 650,
      compensationType: "band_fund",
      totalFee: 650,
      setlistId: "template_parade_short",
      setlistName: "30-Minute Street Parade Block",
      setlist: paradeTemplateTunes,
      createdAt: "2026-09-20T12:00:00.000Z",
    },
    {
      id: "gig_pittsburgh_marathon_2027",
      date: "2027-05-02",
      status: "tentative",
      title: "DICK'S Pittsburgh Marathon Mile 11 Rock Station",
      venue: "Birmingham Bridge / South Side Works",
      venueAddress: "2700 E Carson St, Pittsburgh, PA 15203",
      coordinates: { lat: 40.4281, lng: -79.9672 },
      city: "Pittsburgh, PA (South Side)",
      description: "Acoustic brass cheer band powering runners through mile 11 as they cross under the Birmingham Bridge.",
      callTime: "7:30 AM",
      downbeat: "8:15 AM",
      attire: "Athletic Band Gear & Yellow T-Shirts",
      unloadingAddress: "2700 E Carson St (South Side Works garage)",
      parkingNotes: "South Side Works parking pass provided by P3R.",
      compensation: 400,
      compensationType: "band_fund",
      totalFee: 400,
      setlistId: "template_parade_short",
      setlistName: "30-Minute Street Parade Block",
      setlist: paradeTemplateTunes,
      createdAt: "2026-09-25T12:00:00.000Z",
    },
    {
      id: "gig_three_rivers_regatta_2027",
      date: "2027-07-03",
      status: "lead",
      title: "Three Rivers Regatta Fourth of July Fanfare",
      venue: "Point State Park Great Lawn",
      venueAddress: "101 Commonwealth Pl, Pittsburgh, PA 15222",
      coordinates: { lat: 40.4419, lng: -80.0071 },
      city: "Pittsburgh, PA (Downtown)",
      description: "Inquiry from Three Rivers Regatta committee for holiday weekend riverfront fanfare and roving brass sets.",
      callTime: "2:00 PM",
      downbeat: "3:00 PM",
      attire: "Patriotic Yellows & Summer Whites",
      unloadingAddress: "Point State Park service entrance",
      parkingNotes: "State park permits.",
      compensation: 120,
      compensationType: "individual",
      totalFee: 1200,
      setlistId: "template_ceremonial_fanfare",
      setlistName: "Ceremonial Brass Fanfare & Civic March",
      setlist: ceremonialTemplateTunes,
      createdAt: "2026-09-30T12:00:00.000Z",
    },
    {
      id: "gig_bloomfield_2028",
      date: "2028-11-05",
      status: "lead",
      title: "Bloomfield Halloween Zombie March 2028",
      venue: "Liberty Avenue",
      venueAddress: "4700 Liberty Ave, Pittsburgh, PA 15224",
      coordinates: { lat: 40.4619, lng: -79.9489 },
      city: "Pittsburgh, PA (Bloomfield)",
      description: "Long-range planned future zombie street parade through Little Italy.",
      callTime: "6:30 PM",
      downbeat: "7:30 PM",
      attire: "Zombie Brass Costumes",
      unloadingAddress: "4700 Liberty Ave",
      parkingNotes: "Street parking.",
      compensation: 0,
      compensationType: "community",
      totalFee: 0,
      setlist: [],
      createdAt: "2026-08-01T12:00:00.000Z",
    },
  ];

  for (const g of gigs) {
    await seedGigWithAttendance(g, users);
  }
  console.log(`✅ Seeded ${gigs.length} gigs across calendar with RSVPs, check-ins, payouts, and dispatch logs.`);

  // ==========================================
  // 10. Client Booking Inquiries
  // ==========================================
  const inquiries = [
    {
      id: "inq_millvale_days_2026",
      clientName: "Megan Kelly",
      organization: "Millvale Community Association",
      email: "megan@millvaledays.org",
      phone: "412-555-0144",
      eventTitle: "Millvale Days Grand Street Parade",
      eventType: "Community Parade & Festival",
      date: "2026-10-10",
      startTime: "11:00 AM",
      venue: "Grant Avenue",
      venueAddress: "Grant Ave & North Ave, Millvale, PA 15209",
      budget: 1500,
      message: "We would love to have Eagleburger lead the parade kick-off again this fall! Approximately 1.2 mile street route.",
      status: "pending",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "inq_pgh_half_marathon_2027",
      clientName: "Marcus Vance",
      organization: "Pittsburgh Marathon Spirit Stations",
      email: "cheer@pittsburghmarathon.com",
      phone: "412-555-0182",
      eventTitle: "Marathon Mile 11 Spirit Zone",
      eventType: "Street Cheering Station",
      date: "2027-05-02",
      startTime: "7:30 AM",
      venue: "Bloomfield Mile 11 Corner",
      venueAddress: "Liberty Ave & Cedarville St, Pittsburgh, PA",
      budget: 900,
      message: "High-energy brass requested to motivate runners ascending the hill into Bloomfield!",
      status: "contacted",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "inq_strip_district_blockparty",
      clientName: "Anthony Rossi",
      organization: "Strip District Merchants Association",
      email: "arossi@stripdistrict.org",
      phone: "412-555-0299",
      eventTitle: "Penn Avenue Fall Night Market Kick-Off",
      eventType: "Outdoor Street Festival",
      date: "2026-09-18",
      startTime: "6:00 PM",
      venue: "Penn Avenue (18th to 22nd St)",
      venueAddress: "Penn Ave & 21st St, Pittsburgh, PA 15222",
      budget: 1800,
      message: "Looking for mobile acoustic horn band to parade through the food market and artisan vendor plazas for 90 minutes.",
      status: "reviewed",
      createdAt: new Date(Date.now() - 6 * 86400000).toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "inq_shady_side_brass_wedding",
      clientName: "Elena Rostova",
      organization: "Private Wedding / Event Logistics",
      email: "elena.rostova@gmail.com",
      phone: "412-555-0673",
      eventTitle: "Surprise Brass Second-Line Wedding Send-Off",
      eventType: "Wedding Reception",
      date: "2026-10-17",
      startTime: "8:45 PM",
      venue: "Mansions on Fifth",
      venueAddress: "5105 Fifth Ave, Pittsburgh, PA 15232",
      budget: 1400,
      message: "Secret surprise 30-minute brass explosion leading guests from the chapel garden terrace into the grand ballroom!",
      status: "confirmed",
      createdAt: new Date(Date.now() - 4 * 86400000).toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "inq_southside_works_fallfest",
      clientName: "Chloe Bennett",
      organization: "SouthSide Works Riverfront Commons",
      email: "cbennett@southsideworks.com",
      phone: "412-555-0841",
      eventTitle: "SouthSide Works Riverfront Stomp",
      eventType: "Beer Garden & Food Truck Rally",
      date: "2026-10-24",
      startTime: "2:00 PM",
      venue: "SouthSide Works Town Square & Riverfront Park",
      venueAddress: "27th & Sidney St, Pittsburgh, PA 15203",
      budget: 2000,
      message: "Inquiring about brass & drum corps sets across the outdoor beer garden and grass amphitheater.",
      status: "pending",
      createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  for (const inq of inquiries) {
    await setDoc(doc(db, "inquiries", inq.id), inq, { merge: true });
    // Mirror to booking_leads for unified schema
    await setDoc(doc(db, "booking_leads", inq.id), {
      ...inq,
      status: inq.status === "pending" ? "new" : inq.status,
      notes: "Seeded test inquiry",
      schemaVersion: 1,
    }, { merge: true });
  }
  console.log(`✅ Seeded ${inquiries.length} client booking inquiries & booking_leads.`);

  // ==========================================
  // 11. Theme & Dynamic Brand Config (v2 Scoped)
  // ==========================================
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
      primaryColor: "#facc15",
      accentColor: "#f59e0b",
      backgroundColor: "#020617",
      surfaceColor: "#0f172a",
      textColor: "#f8fafc",
      tagline: "Pittsburgh's Premier Street Brass & Battery Powerhouse",
    },
    portal: {
      primaryColor: "#facc15",
      accentColor: "#0f172a",
      backgroundColor: "#020617",
      surfaceColor: "#0f172a",
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
  console.log("✅ Seeded theme/config with v2 scoped public & portal themes.");

  // ==========================================
  // 12. Headless CMS Content Pages & Studio
  // ==========================================
  for (const sysPage of DEFAULT_SYSTEM_PAGES_LIST) {
    const validatedPage = ContentPageSchema.parse(sysPage);
    await setDoc(doc(db, "content_pages", validatedPage.id), validatedPage, { merge: true });
    console.log(`✅ Seeded content_pages/${sysPage.id} (${sysPage.title}).`);
  }

  // ==========================================
  // 13. Charitable Donations & Giving
  // ==========================================
  const sampleDonations = [
    {
      id: "donation_pgh_food_bank",
      organizationName: "Greater Pittsburgh Community Food Bank",
      causeDescription: "Mobilizing community food resources across 11 Southwestern Pennsylvania counties to eradicate hunger and food insecurity.",
      websiteUrl: "https://pittsburghfoodbank.org",
      category: "hunger_relief",
      amount: 500,
      dateDonated: "2026-05-15",
      fiscalYear: "2026",
      isPublic: true,
      publicImpactNote: "Sponsored regional nutritious meal distributions and emergency food pantry kits.",
      notes: "Check #1102 approved during spring executive session.",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "donation_band_together",
      organizationName: "Band Together Pittsburgh",
      causeDescription: "Enriching the lives of individuals on the autism spectrum through dynamic musical programs, open mics, and drum workshops.",
      websiteUrl: "https://bandtogetherpgh.org",
      category: "arts_music",
      amount: 750,
      dateDonated: "2026-04-10",
      fiscalYear: "2026",
      isPublic: true,
      publicImpactNote: "Providing adaptive percussion instruments and specialized community clinic supplies.",
      notes: "Direct wire from festival tip proceeds match.",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "donation_girls_write",
      organizationName: "Girls Write Pittsburgh",
      causeDescription: "Empowering teen girls and gender-expansive youth through creative self-expression, literary arts mentorship, and writing programs.",
      websiteUrl: "https://girlswritepgh.org",
      category: "youth_education",
      amount: 350,
      dateDonated: "2026-03-25",
      fiscalYear: "2026",
      isPublic: true,
      publicImpactNote: "Underwriting creative writing workshop supplies and youth poetry anthologies.",
      notes: "Check #1098.",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "donation_wp_conservancy",
      organizationName: "Western Pennsylvania Conservancy",
      causeDescription: "Protecting regional natural landscapes, caring for rivers, planting community flower gardens, and preserving Fallingwater.",
      websiteUrl: "https://waterlandlife.org",
      category: "environment",
      amount: 400,
      dateDonated: "2026-02-18",
      fiscalYear: "2026",
      isPublic: true,
      publicImpactNote: "Funding Pittsburgh neighborhood community flower garden plantings and urban trees.",
      notes: "Annual Earth Month green space contribution.",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "donation_aami_pgh",
      organizationName: "Afro American Music Institute",
      causeDescription: "Preserving and promoting African American musical heritage through youth instrumental education in Pittsburgh's Homewood neighborhood.",
      websiteUrl: "https://afroamericanmusic.org",
      category: "arts_music",
      amount: 600,
      dateDonated: "2026-01-20",
      fiscalYear: "2026",
      isPublic: true,
      publicImpactNote: "Providing youth brass and percussion lesson scholarships.",
      notes: "Martin Luther King Jr. Day commemorative donation.",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "donation_internal_relief",
      organizationName: "Pittsburgh Community Musician Relief",
      causeDescription: "Emergency micro-grants for local freelance performers and street artists facing sudden hardship.",
      websiteUrl: "https://eagleburgerband.com",
      category: "community_aid",
      amount: 300,
      dateDonated: "2025-11-12",
      fiscalYear: "2025",
      isPublic: false, // Internal confidential record
      publicImpactNote: "",
      notes: "Internal discretion grant; withheld from public showcase.",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  for (const d of sampleDonations) {
    await setDoc(doc(db, "donations", d.id), d, { merge: true });
  }
  console.log(`✅ Seeded ${sampleDonations.length} charitable donations into 'donations' collection.`);

  // ==========================================
  // 14. Band Treasury Settings & Financial Ledger
  // ==========================================
  const treasurySettings = {
    startingBalance: 15000,
    startingDate: "2026-01-01",
    lastUpdated: new Date().toISOString(),
    notes: "2026 Season Reserve Fund & Band Operating Balance",
    schemaVersion: 1,
  };
  await setDoc(doc(db, "settings", "treasury"), treasurySettings, { merge: true });
  console.log("✅ Seeded settings/treasury with $15,000.00 starting baseline.");

  const sampleTransactions = [
    // Income
    {
      id: "tx_inc_st_pats_2026",
      type: "income",
      category: "gig_fee",
      amount: 3500,
      description: "Downtown St. Patrick's Day Parade Performance Fee",
      date: "2026-03-14",
      gigId: "gig_st_patricks_2026",
      gigTitle: "Downtown Pittsburgh St. Patrick's Parade",
      recordedBy: "David Passmore",
      notes: "Official parade committee wire settled.",
      schemaVersion: 1,
      createdAt: "2026-03-14T18:00:00.000Z",
    },
    {
      id: "tx_inc_millvale_sponsorship",
      type: "income",
      category: "sponsorship",
      amount: 2000,
      description: "Millvale Days Civic Arts Partnership Grant",
      date: "2026-04-05",
      gigId: "gig_millvale_days_2026",
      gigTitle: "Millvale Days Grand Street Parade",
      recordedBy: "David Passmore",
      notes: "Community cultural council sponsorship grant disbursed.",
      schemaVersion: 1,
      createdAt: "2026-04-05T12:00:00.000Z",
    },
    {
      id: "tx_inc_mattress_factory_deposit",
      type: "income",
      category: "gig_fee",
      amount: 700,
      description: "Garden Party 50% Booking Deposit",
      date: "2026-04-22",
      gigId: "gig_mattress_factory_2026",
      gigTitle: "Mattress Factory Garden Party",
      recordedBy: "David Passmore",
      notes: "Contract advance deposit received.",
      schemaVersion: 1,
      createdAt: "2026-04-22T14:30:00.000Z",
    },
    {
      id: "tx_inc_merch_spring",
      type: "income",
      category: "merch_sales",
      amount: 1850,
      description: "Spring Brass & Battery Merch Sales (Hoodies, T-Shirts & Patches)",
      date: "2026-05-02",
      gigId: null,
      gigTitle: null,
      recordedBy: "David Passmore",
      notes: "Online shop + in-person merch pop-up batch deposit.",
      schemaVersion: 1,
      createdAt: "2026-05-02T19:00:00.000Z",
    },
    {
      id: "tx_inc_porchfest_tips",
      type: "income",
      category: "tips_donations",
      amount: 1240,
      description: "Lawrenceville Porchfest Street Tip Bucket & QR Codes",
      date: "2026-05-18",
      gigId: "gig_lawrenceville_porchfest_2026",
      gigTitle: "Lawrenceville Porchfest Stomp",
      recordedBy: "David Passmore",
      notes: "Cash tips counted and deposited to operating checking.",
      schemaVersion: 1,
      createdAt: "2026-05-18T10:00:00.000Z",
    },
    {
      id: "tx_inc_corporate_gala",
      type: "income",
      category: "gig_fee",
      amount: 4200,
      description: "Robotics Industry Summit Welcoming Fanfare & Second Line",
      date: "2026-06-12",
      gigId: null,
      gigTitle: "Robotics Industry Gala",
      recordedBy: "David Passmore",
      notes: "Corporate private gala booking fee.",
      schemaVersion: 1,
      createdAt: "2026-06-12T22:00:00.000Z",
    },
    {
      id: "tx_inc_arts_council_grant",
      type: "income",
      category: "sponsorship",
      amount: 2500,
      description: "Allegheny Regional Asset District Music Micro-Grant",
      date: "2026-07-01",
      gigId: null,
      gigTitle: null,
      recordedBy: "David Passmore",
      notes: "Operating support micro-grant for mobile acoustics.",
      schemaVersion: 1,
      createdAt: "2026-07-01T09:00:00.000Z",
    },
    // Operating Expenses
    {
      id: "tx_exp_drumheads",
      type: "expense",
      category: "gear_repairs",
      amount: 420,
      description: "Remo Marching Snare Batter Heads & Kevlar Tuning Keys",
      date: "2026-02-10",
      gigId: null,
      gigTitle: null,
      recordedBy: "David Passmore",
      notes: "Drumline equipment refresh prior to spring parade season.",
      schemaVersion: 1,
      createdAt: "2026-02-10T11:00:00.000Z",
    },
    {
      id: "tx_exp_sheet_music",
      type: "expense",
      category: "sheet_music",
      amount: 265,
      description: "Custom Brass Arranging & Copyright Clearances",
      date: "2026-02-28",
      gigId: null,
      gigTitle: null,
      recordedBy: "David Passmore",
      notes: "Arrangements for Renegade and Ghost Town Ska.",
      schemaVersion: 1,
      createdAt: "2026-02-28T15:00:00.000Z",
    },
    {
      id: "tx_exp_rehearsal_hall",
      type: "expense",
      category: "rehearsal_space",
      amount: 600,
      description: "Q1 Bloomfield Community Center Rehearsal Space Rental",
      date: "2026-03-31",
      gigId: null,
      gigTitle: null,
      recordedBy: "David Passmore",
      notes: "Quarterly gym rental for full battery and brass drills.",
      schemaVersion: 1,
      createdAt: "2026-03-31T17:00:00.000Z",
    },
    {
      id: "tx_exp_van_fuel",
      type: "expense",
      category: "travel_fuel",
      amount: 185,
      description: "Van Fuel & Highway Tolls - Foxburg Festival Run",
      date: "2026-04-14",
      gigId: null,
      gigTitle: null,
      recordedBy: "David Passmore",
      notes: "Equipment van transport reimbursement.",
      schemaVersion: 1,
      createdAt: "2026-04-14T20:00:00.000Z",
    },
    {
      id: "tx_exp_merch_restock",
      type: "expense",
      category: "merchandise",
      amount: 950,
      description: "Screenprinted Windbreaker & Embroidered Patch Restock",
      date: "2026-04-28",
      gigId: null,
      gigTitle: null,
      recordedBy: "David Passmore",
      notes: "Direct manufacturing order from Commonwealth Press.",
      schemaVersion: 1,
      createdAt: "2026-04-28T13:00:00.000Z",
    },
    {
      id: "tx_exp_web_software",
      type: "expense",
      category: "admin_software",
      amount: 120,
      description: "Band Portal Domain & Cloud Infrastructure Subscription",
      date: "2026-05-01",
      gigId: null,
      gigTitle: null,
      recordedBy: "David Passmore",
      notes: "Annual DNS, SSL, and database hosting charges.",
      schemaVersion: 1,
      createdAt: "2026-05-01T08:00:00.000Z",
    },
    {
      id: "tx_exp_water_snacks",
      type: "expense",
      category: "food_beverage",
      amount: 95,
      description: "Electrolytes, Fruit & Cold Water for Parade Staging",
      date: "2026-05-25",
      gigId: null,
      gigTitle: null,
      recordedBy: "David Passmore",
      notes: "Hydration station supplies for marching musicians.",
      schemaVersion: 1,
      createdAt: "2026-05-25T11:30:00.000Z",
    },
    // Musician Payouts
    {
      id: "tx_payout_st_pats",
      type: "payout",
      category: "musician_payout",
      amount: 1600,
      description: "Musician Performance Payouts - St. Patrick's Parade (8 @ $200)",
      date: "2026-03-16",
      gigId: "gig_st_patricks_2026",
      gigTitle: "Downtown Pittsburgh St. Patrick's Parade",
      recordedBy: "David Passmore",
      notes: "Settled via Venmo batch dispatch to active roster performers.",
      schemaVersion: 1,
      createdAt: "2026-03-16T14:00:00.000Z",
    },
    {
      id: "tx_payout_gala",
      type: "payout",
      category: "musician_payout",
      amount: 2000,
      description: "Musician Performance Payouts - Corporate Gala (10 @ $200)",
      date: "2026-06-15",
      gigId: null,
      gigTitle: "Robotics Industry Gala",
      recordedBy: "David Passmore",
      notes: "Even split disbursement for private performance.",
      schemaVersion: 1,
      createdAt: "2026-06-15T16:00:00.000Z",
    },
  ];

  for (const tx of sampleTransactions) {
    await setDoc(doc(db, "transactions", tx.id), tx, { merge: true });
  }
  console.log(`✅ Seeded ${sampleTransactions.length} financial transactions into 'transactions' collection.`);

  // ==========================================
  // 15. Member Expense Reimbursements
  // ==========================================
  const sampleReimbursements = [
    {
      id: "reimb_snare_straps",
      applicantUid: superAdminUid,
      applicantName: "David Passmore",
      applicantEmail: "davidpassmore@gmail.com",
      applicantSectionId: "percussion",
      amount: 85.50,
      description: "Heavy-duty padded marching snare slings and carabiner mounts",
      category: "gear_repairs",
      expenseDate: "2026-03-08",
      gigId: "gig_st_patricks_2026",
      gigTitle: "Downtown Pittsburgh St. Patrick's Parade",
      receiptUrl: "https://example.com/receipts/drum-slings.pdf",
      receiptNote: "Purchased at Volkwein's Music, receipt on file.",
      paymentMethod: "venmo",
      paymentHandle: "@David-Passmore-Band",
      status: "paid",
      reviewNotes: "Essential equipment replacement approved.",
      reviewedByUid: "jkkJnLRU03IxB2gbyG5lolVghGsD",
      reviewedByName: "Band Director",
      reviewedAt: "2026-03-09T14:00:00.000Z",
      paidAt: "2026-03-10T11:00:00.000Z",
      transactionId: "tx_exp_drumheads",
      payoutReference: "VENMO-TX-994821",
      schemaVersion: 1,
      createdAt: "2026-03-08T16:00:00.000Z",
      updatedAt: "2026-03-10T11:00:00.000Z",
    },
    {
      id: "reimb_parade_hydration",
      applicantUid: "user_ward_kristin",
      applicantName: "Kristin Ward",
      applicantEmail: "kristin.ward@eagleburger.org",
      applicantSectionId: "trumpets",
      amount: 48.25,
      description: "Bottled electrolyte water & energy fruit chews for warm-up zone",
      category: "food_beverage",
      expenseDate: "2026-05-24",
      gigId: null,
      gigTitle: null,
      receiptUrl: "https://example.com/receipts/costco-hydration.jpg",
      receiptNote: "Costco run for band coolers.",
      paymentMethod: "venmo",
      paymentHandle: "@kristin-ward-horns",
      status: "approved",
      reviewNotes: "Approved by Treasurer; queued for next batch disbursement.",
      reviewedByUid: superAdminUid,
      reviewedByName: "David Passmore",
      reviewedAt: "2026-05-26T10:00:00.000Z",
      paidAt: null,
      transactionId: null,
      payoutReference: "",
      schemaVersion: 1,
      createdAt: "2026-05-25T09:00:00.000Z",
      updatedAt: "2026-05-26T10:00:00.000Z",
    },
    {
      id: "reimb_trailer_hitch",
      applicantUid: "user_fetkovich_john",
      applicantName: "John Fetkovich",
      applicantEmail: "john.fetkovich@eagleburger.org",
      applicantSectionId: "percussion",
      amount: 112.00,
      description: "U-Haul trailer hitch ball mount and 4-way flat wiring harness adapter",
      category: "travel_fuel",
      expenseDate: "2026-06-01",
      gigId: null,
      gigTitle: null,
      receiptUrl: "https://example.com/receipts/uhaul-hitch.pdf",
      receiptNote: "Needed to tow percussion battery trailer.",
      paymentMethod: "zelle",
      paymentHandle: "john.fetkovich@eagleburger.org",
      status: "submitted",
      reviewNotes: "",
      reviewedByUid: null,
      reviewedByName: null,
      reviewedAt: null,
      paidAt: null,
      transactionId: null,
      payoutReference: "",
      schemaVersion: 1,
      createdAt: "2026-06-01T17:00:00.000Z",
      updatedAt: "2026-06-01T17:00:00.000Z",
    },
    {
      id: "reimb_horn_valve_oil",
      applicantUid: "user_tbone_mike",
      applicantName: "Mike Kowalski",
      applicantEmail: "mike.tbone@eagleburger.org",
      applicantSectionId: "trombones",
      amount: 34.00,
      description: "Bulk Trombotine slide cream and fast synthetic valve oil bottles",
      category: "gear_repairs",
      expenseDate: "2026-06-05",
      gigId: null,
      gigTitle: null,
      receiptUrl: "https://example.com/receipts/woodwind-brasswind.pdf",
      receiptNote: "Placed in band emergency repair field kit.",
      paymentMethod: "venmo",
      paymentHandle: "@mike-kowalski-tbone",
      status: "submitted",
      reviewNotes: "",
      reviewedByUid: null,
      reviewedByName: null,
      reviewedAt: null,
      paidAt: null,
      transactionId: null,
      payoutReference: "",
      schemaVersion: 1,
      createdAt: "2026-06-05T13:30:00.000Z",
      updatedAt: "2026-06-05T13:30:00.000Z",
    },
  ];

  for (const r of sampleReimbursements) {
    await setDoc(doc(db, "reimbursements", r.id), r, { merge: true });
  }
  console.log(`✅ Seeded ${sampleReimbursements.length} member reimbursements into 'reimbursements' collection.`);

  // ==========================================
  // 16. Testimonials & Client Reviews
  // ==========================================
  const sampleTestimonials = [
    {
      id: "test_bloomfield_parade",
      authorName: "Sarah M.",
      roleOrEvent: "Parade Coordinator",
      organization: "Bloomfield Little Italy Days",
      email: "sarah.m@pittsburghfestivals.org",
      quote: "The Eagleburger Band brought unmatched energy to our parade! Thousands of people were dancing on the sidewalks as the brass line roared down Liberty Ave.",
      rating: 5,
      eventDate: "2025-08-16",
      tag: "Parade",
      permissionToPublish: true,
      status: "featured",
      notes: "Headline quote for homepage highlight.",
      schemaVersion: 1,
      createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "test_art_festival",
      authorName: "Marcus Vance",
      roleOrEvent: "Art Festival Director",
      organization: "Three Rivers Arts Gathering",
      email: "marcus@artsfestpa.com",
      quote: "Completely acoustic and mobile. They marched directly through the vendor plazas and blew everyone away. We are booking them again immediately.",
      rating: 5,
      eventDate: "2025-06-07",
      tag: "Festival",
      permissionToPublish: true,
      status: "approved",
      notes: "Verified by gig manager.",
      schemaVersion: 1,
      createdAt: new Date(Date.now() - 20 * 86400000).toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "test_wedding_party",
      authorName: "Emily & Jason K.",
      roleOrEvent: "Newlyweds",
      organization: "Private Wedding Reception",
      email: "emily.k@gmail.com",
      quote: "Eagleburger crashed our cocktail hour as a surprise second-line brass entrance. Our guests are still talking about it months later!",
      rating: 5,
      eventDate: "2025-09-20",
      tag: "Wedding",
      permissionToPublish: true,
      status: "approved",
      notes: "Permission confirmed via email.",
      schemaVersion: 1,
      createdAt: new Date(Date.now() - 10 * 86400000).toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "test_pending_fan",
      authorName: "Tyler Higgins",
      roleOrEvent: "Fan / Spectator",
      organization: "South Side St. Patrick's Parade",
      email: "tyler.higgins@gmail.com",
      quote: "Best drumline grooves in Pittsburgh. The sousaphone bass line could shake a building. Loved every second.",
      rating: 5,
      eventDate: "2026-03-14",
      tag: "Parade",
      permissionToPublish: true,
      status: "pending",
      notes: "Submitted from public form; awaiting review.",
      schemaVersion: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  for (const t of sampleTestimonials) {
    await setDoc(doc(db, "testimonials", t.id), t, { merge: true });
  }
  console.log(`✅ Seeded ${sampleTestimonials.length} testimonials into 'testimonials' collection.`);

  // ==========================================
  // 17. Musician Applications & Auditions
  // ==========================================
  const sampleAuditions = [
    {
      id: "aud_trom_carlos",
      name: "Carlos Rivera",
      email: "carlos.rivera.trombone@gmail.com",
      phone: "412-555-0819",
      primaryInstrument: "Tenor Trombone",
      targetSectionId: "trombones",
      secondaryInstruments: "Bass Trombone",
      experienceLevel: "Community Band / Brass Band",
      sampleLinks: "https://www.youtube.com/watch?v=sample1",
      availability: "Available for Tuesday rehearsals and weekend parades",
      bioNotes: "Played 4 years in college marching band. Relocated to Lawrenceville last year and eager to march with a street brass unit!",
      status: "invited_to_rehearsal",
      assignedLeaderUid: "user_tbone_mike",
      reviewerNotes: "Great sound on video clip. Invited to upcoming Tuesday sectional.",
      schemaVersion: 1,
      createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "aud_per_maya",
      name: "Maya Patel",
      email: "maya.patel.drums@gmail.com",
      phone: "412-555-0432",
      primaryInstrument: "Snare Drum",
      targetSectionId: "percussion",
      secondaryInstruments: "Tenor Quads, Bass Drum",
      experienceLevel: "High School / College Marching",
      sampleLinks: "https://www.youtube.com/watch?v=sample2",
      availability: "Evenings and weekends",
      bioNotes: "DCI drum corps experience (2022). Looking for a fun, high-energy acoustic drumline ensemble in Pittsburgh.",
      status: "new",
      assignedLeaderUid: superAdminUid,
      reviewerNotes: "",
      schemaVersion: 1,
      createdAt: new Date(Date.now() - 1 * 86400000).toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "aud_sousa_greg",
      name: "Greg Thornton",
      email: "greg.thornton@gmail.com",
      phone: "724-555-0188",
      primaryInstrument: "Sousaphone",
      targetSectionId: "sousaphones",
      secondaryInstruments: "Concert Tuba",
      experienceLevel: "Semi-Pro / Professional",
      sampleLinks: "",
      availability: "Full weekend availability",
      bioNotes: "Seasoned low brass player with own silver fiberglass sousaphone. Love New Orleans funk and Balkan street grooves.",
      status: "under_review",
      assignedLeaderUid: "user_rubin_jonathan",
      reviewerNotes: "Owns horn, very solid tone. Jonathan reviewing.",
      schemaVersion: 1,
      createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  for (const a of sampleAuditions) {
    await setDoc(doc(db, "auditions", a.id), a, { merge: true });
  }
  console.log(`✅ Seeded ${sampleAuditions.length} musician audition applications into 'auditions' collection.`);

  // ==========================================
  // 18. General Contact Messages
  // ==========================================
  const sampleContactMessages = [
    {
      id: "msg_press_tribune",
      name: "Rachel Stern",
      email: "rstern@triblive.com",
      phone: "412-555-0922",
      category: "press",
      subject: "Trib Total Media Feature Article on Pittsburgh Street Bands",
      message: "Hi! I am working on a culture feature covering grassroots mobile brass ensembles in Western PA. Would love to interview your band director or gig coordinator for a 15-minute phone chat this week.",
      status: "in_progress",
      assignedToUid: "",
      internalNotes: "David Passmore replied with contact details. Phone interview slated for Thursday.",
      schemaVersion: 1,
      createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "msg_comm_greensburg",
      name: "Hannah Brooks",
      email: "hbrooks@greensburgpa.gov",
      phone: "724-555-0371",
      category: "community",
      subject: "Partnership for Greensburg Summer Solstice Stroll",
      message: "Our parks & recreation committee is planning our annual Solstice Stroll in June. We would love to know if Eagleburger Band participates in municipal community outreach partnerships.",
      status: "new",
      assignedToUid: "",
      internalNotes: "",
      schemaVersion: 1,
      createdAt: new Date(Date.now() - 1 * 86400000).toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "msg_merch_fan",
      name: "Evan O'Connor",
      email: "evan.oc@gmail.com",
      phone: "",
      category: "merch",
      subject: "Brass & Battery Hoodies restock?",
      message: "Saw your band members wearing the yellow & black Eagleburger windbreakers at Greenfield parade. Are those available for public purchase?",
      status: "resolved",
      assignedToUid: "",
      internalNotes: "Directed to online fan merch store link.",
      schemaVersion: 1,
      createdAt: new Date(Date.now() - 8 * 86400000).toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  for (const m of sampleContactMessages) {
    await setDoc(doc(db, "contact_messages", m.id), m, { merge: true });
  }
  console.log(`✅ Seeded ${sampleContactMessages.length} contact messages into 'contact_messages' collection.`);

  // ==========================================
  // 19. Rehearsal Vault Audio Tracks
  // ==========================================
  const vaultTracks = [
    {
      id: "vt_bloomfield_rehearsal",
      title: "Bloomfield Bounce (Full Ensemble Take 2)",
      composer: "Eagleburger Band",
      arranger: "David Passmore",
      audioUrl: "https://storage.googleapis.com/eagleburgerband-media/vault/bloomfield_take2.mp3",
      fileType: "rehearsal" as const,
      durationSeconds: 242,
      recordedDate: "2026-09-18",
      tuneId: "song_bloomfield_bounce",
      tags: ["Rehearsal", "Take 2", "Street Beat"],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "vt_renegade_stadium",
      title: "Renegade (Live at Polish Hill Park)",
      composer: "Styx",
      arranger: "David Passmore",
      audioUrl: "https://storage.googleapis.com/eagleburgerband-media/vault/renegade_polish_hill.mp3",
      fileType: "recording" as const,
      durationSeconds: 308,
      recordedDate: "2026-08-22",
      tuneId: "song_renegade",
      tags: ["Live", "Outdoor", "Crowd Reaction"],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "vt_iron_city_stems",
      title: "Iron City Funk (Drumline + Sousaphone Stem)",
      composer: "Traditional",
      arranger: "Eagleburger Percussion",
      audioUrl: "https://storage.googleapis.com/eagleburgerband-media/vault/iron_city_rhythm_stem.mp3",
      fileType: "stem" as const,
      durationSeconds: 260,
      recordedDate: "2026-09-10",
      tuneId: "song_iron_city",
      tags: ["Rhythm Section", "Practice Track", "Stem"],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  for (const vt of vaultTracks) {
    const validated = VaultTrackSchema.parse(vt);
    await setDoc(doc(db, "vault_tracks", vt.id), validated, { merge: true });
  }
  console.log(`✅ Seeded ${vaultTracks.length} tracks into 'vault_tracks' collection.`);

  // ==========================================
  // 20. Band Equipment & Inventory
  // ==========================================
  const inventoryItems = [
    {
      id: "asset_sousa_conn",
      name: "Conn 20K Brass Sousaphone",
      category: "instrument" as const,
      condition: "good" as const,
      serialNumber: "CN-20K-88129",
      assignedToUid: users[0]?.uid || "",
      assignedToName: users[0]?.displayName || "Section Leader",
      locationNotes: "Lawrenceville Band Locker #1 - Heavy-gauge brass body. New valve felt installed Sept 2026.",
      updatedAt: new Date().toISOString(),
    },
    {
      id: "asset_snare_pearl",
      name: "Pearl Championship Carbon Marching Snare (14x12)",
      category: "instrument" as const,
      condition: "excellent" as const,
      serialNumber: "PRL-CS-4401",
      assignedToUid: users[1]?.uid || "",
      assignedToName: users[1]?.displayName || "Drummer",
      locationNotes: "Mobile Equipment Trailer - High-tension Kevlar head, yellow & black glitter wrap.",
      updatedAt: new Date().toISOString(),
    },
    {
      id: "asset_parade_banner",
      name: "Official Eagleburger Street Banner (8ft Weatherproof)",
      category: "banner_merch" as const,
      condition: "good" as const,
      serialNumber: "EBB-BAN-01",
      assignedToUid: "",
      assignedToName: "Unassigned",
      locationNotes: "Trailer Front Storage - Includes 2 aluminum parade carry poles with brass finials.",
      updatedAt: new Date().toISOString(),
    },
    {
      id: "asset_pa_system",
      name: "Bose S1 Pro Portable Street PA + Wireless Mic Kit",
      category: "audio_pa" as const,
      condition: "excellent" as const,
      serialNumber: "BSE-S1-9021",
      assignedToUid: superAdminUid,
      assignedToName: "David Passmore",
      locationNotes: "Sound Tech Gear Bag - Battery-powered mobile megaphone / announcement rig.",
      updatedAt: new Date().toISOString(),
    },
    {
      id: "asset_drum_harness",
      name: "Randall May Ergonomic Bass Drum Harness",
      category: "harness" as const,
      condition: "good" as const,
      serialNumber: "RM-BH-104",
      assignedToUid: "",
      assignedToName: "Unassigned",
      locationNotes: "Trailer Hardware Bin - Padded shoulder support with safety latch.",
      updatedAt: new Date().toISOString(),
    },
  ];

  for (const item of inventoryItems) {
    const validated = InventoryItemSchema.parse(item);
    await setDoc(doc(db, "inventory", item.id), validated, { merge: true });
  }
  console.log(`✅ Seeded ${inventoryItems.length} equipment items into 'inventory' collection.`);

  // ==========================================
  // 21. Pending Member Invites
  // ==========================================
  const sampleInvites = [
    {
      token: "inv_tbone_audition_2026",
      email: "guest_trombonist@yahoo.com",
      name: "Jordan Vance",
      section: "Trombone",
      roles: ["member" as const],
      status: "pending" as const,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 14 * 86400000).toISOString(),
      createdByUid: superAdminUid,
    },
    {
      token: "inv_trumpet_lead_2026",
      email: "lead_trumpet_pgh@gmail.com",
      name: "Taylor Ross",
      section: "Trumpet",
      roles: ["member" as const],
      status: "pending" as const,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 14 * 86400000).toISOString(),
      createdByUid: superAdminUid,
    },
  ];

  for (const inv of sampleInvites) {
    const validated = InviteSchema.parse(inv);
    await setDoc(doc(db, "invites", inv.token), validated, { merge: true });
  }
  console.log(`✅ Seeded ${sampleInvites.length} pending onboarding invites into 'invites' collection.`);

  // ==========================================
  // 23. Content Resource Assets (Images, Documents, Media)
  // ==========================================
  for (const res of DEFAULT_RESOURCES) {
    const validated = ResourceAssetSchema.parse(res);
    await setDoc(doc(db, "resources", res.id), validated, { merge: true });
  }
  console.log(`✅ Seeded ${DEFAULT_RESOURCES.length} content resource assets into 'resources' collection.`);

  // ==========================================
  // 24. Site Navigation & Global Announcement
  // ==========================================
  const defaultSiteNav = SiteNavigationSchema.parse({
    id: "config",
    announcementBanner: DEFAULT_ANNOUNCEMENT_BANNER,
  });
  await setDoc(doc(db, "site_navigation", "config"), defaultSiteNav, { merge: true });
  console.log("✅ Seeded site navigation & active global announcement banner into 'site_navigation/config'.");

  // ==========================================
  // 25. Portal Usage Metrics Telemetry (Config & Events)
  // ==========================================
  const defaultMetricsConfig = PortalMetricsConfigSchema.parse({
    captureEnabled: true,
    lastResetAt: null,
    resetByUid: null,
    resetByName: null,
    updatedAt: new Date().toISOString(),
  });
  await setDoc(doc(db, "portal_metrics_config", "global"), defaultMetricsConfig, { merge: true });

  const sampleMusicians = [
    { uid: superAdminUid, name: "David Passmore", email: "davidpassmore@gmail.com", role: "admin" },
    { uid: "seed-user-john", name: "John Fetkovich", email: "john.fetkovich@eagleburger.org", role: "gig_manager" },
    { uid: "seed-user-joelle", name: "Joelle Killebrew", email: "joelle.killebrew@eagleburger.org", role: "catalog_manager" },
    { uid: "seed-user-sarah", name: "Sarah Bari", email: "sarah.bari@eagleburger.org", role: "section_leader" },
    { uid: "seed-user-dan", name: "Dan Brass", email: "dan.brass@eagleburger.org", role: "member" },
    { uid: "seed-user-megan", name: "Megan Aux", email: "megan.aux@eagleburger.org", role: "member" },
  ];

  const activeToolList = [
    { id: "member-gigs", title: "Performance Calendar & RSVPs", path: "/portal/gigs", cat: "Performances & Logistics" },
    { id: "library", title: "Repertoire Catalog", path: "/portal/library", cat: "Music & Repertoire" },
    { id: "availability", title: "Musician Availability & Blackouts", path: "/portal/availability", cat: "Performances & Logistics" },
    { id: "call-sheets", title: "Call Sheet Dispatch", path: "/admin/dispatch", cat: "Performances & Logistics" },
    { id: "setlists", title: "Setlist Studio", path: "/admin/setlists", cat: "Performances & Logistics" },
    { id: "suggestions", title: "Suggestion Triage & Voting", path: "/admin/suggestions", cat: "Music & Repertoire" },
    { id: "checkin", title: "Downbeat Check-In", path: "/admin/checkin", cat: "Performances & Logistics" },
    { id: "reimbursements", title: "Expense Reimbursements", path: "/portal/reimbursements", cat: "Finance" },
    { id: "pages", title: "CMS Page Studio", path: "/admin/pages", cat: "Website & Intake" },
  ];

  const nowMs = Date.now();
  let eventIndex = 0;

  // Generate realistic events distributed over the last 28 days
  for (let daysAgo = 28; daysAgo >= 0; daysAgo--) {
    const targetDate = new Date(nowMs - daysAgo * 86400000);
    const dateKey = targetDate.toISOString().slice(0, 10);
    // Skew activity towards weekends and mid-week rehearsals (Wed, Sat, Sun)
    const dayOfWeek = targetDate.getDay();
    const isHighActivityDay = dayOfWeek === 0 || dayOfWeek === 3 || dayOfWeek === 6;
    const viewsCount = isHighActivityDay ? 4 + (daysAgo % 4) : (daysAgo % 3 === 0 ? 2 : 1);

    for (let v = 0; v < viewsCount; v++) {
      const musician = sampleMusicians[(daysAgo + v) % sampleMusicians.length];
      const tool = activeToolList[(daysAgo * 2 + v) % activeToolList.length];
      const eventTimestamp = new Date(targetDate.getTime() + (v * 3600000) + 36000000).toISOString();
      const eventId = `seed_view_${eventIndex++}_${dateKey}`;

      const viewPayload = PortalMetricEventSchema.parse({
        id: eventId,
        type: "route_view",
        pathname: tool.path,
        toolId: tool.id,
        toolTitle: tool.title,
        category: tool.cat,
        action: "view",
        details: `Viewed ${tool.title}`,
        userId: musician.uid,
        userName: musician.name,
        userEmail: musician.email,
        userRole: musician.role,
        timestamp: eventTimestamp,
        dateKey,
      });
      await setDoc(doc(db, "portal_metrics_events", eventId), viewPayload);

      // On some days, also generate an interaction / change
      if (v % 2 === 0) {
        const interId = `seed_inter_${eventIndex++}_${dateKey}`;
        const actions = [
          { act: "rsvp_update", det: "Submitted RSVP (Attending)" },
          { act: "rate_tune", det: "Rated song in Repertoire Catalog" },
          { act: "post_comment", det: "Posted feedback comment" },
          { act: "add_blackout", det: "Submitted blackout date range" },
          { act: "vote_suggestion", det: "Voted on song suggestion" },
        ];
        const selectedAction = actions[(daysAgo + v) % actions.length];

        const interPayload = PortalMetricEventSchema.parse({
          id: interId,
          type: "interaction",
          pathname: tool.path,
          toolId: tool.id,
          toolTitle: tool.title,
          category: tool.cat,
          action: selectedAction.act,
          details: selectedAction.det,
          userId: musician.uid,
          userName: musician.name,
          userEmail: musician.email,
          userRole: musician.role,
          timestamp: new Date(new Date(eventTimestamp).getTime() + 120000).toISOString(),
          dateKey,
        });
        await setDoc(doc(db, "portal_metrics_events", interId), interPayload);
      }
    }
  }
  console.log(`✅ Seeded portal metrics config and ${eventIndex} telemetry events (views & interactions).`);

  // ==========================================
  // 26. Super Admin Confirmation
  // ==========================================
  console.log(`ℹ️ Confirmed canonical Super Admin: davidpassmore@gmail.com (UID: ${superAdminUid})`);

  console.log("🎉 Complete emulator seed finished! All collections and sections populated.");
  process.exit(0);
}

runSeed().catch((err) => {
  console.error("❌ Seeding failed:", err);
  process.exit(1);
});