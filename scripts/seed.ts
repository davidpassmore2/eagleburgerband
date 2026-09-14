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
      roles: ["admin", "web_manager", "gig_manager", "catalog_manager", "community_manager", "treasurer", "section_leader", "member"],
      role: "admin",
      status: "active",
      sectionId: "percussion",
      instruments: ["Snare Drum", "Percussion"],
      phone: "412-555-0101",
      createdAt: new Date().toISOString(),
    },
    {
      uid: "jkkJnLRU03IxB2gbyG5lolVghGsD",
      email: "director@eagleburgerband.com",
      displayName: "Band Director",
      roles: ["admin", "gig_manager", "catalog_manager"],
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
      roles: ["member", "section_leader", "community_manager"],
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
  // 3. Tunes & Repertoire (Syncs to both 'songs' and 'tunes')
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
    // Write to both 'songs' and 'tunes' to satisfy both catalog collections
    await setDoc(doc(db, "songs", t.id), t, { merge: true });
    await setDoc(doc(db, "tunes", t.id), t, { merge: true });
  }
  console.log(`✅ Seeded ${tunes.length} tunes into both 'songs' and 'tunes' collections.`);

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
      submittedByUid: "user_killebrew_joelle",
      submittedByName: "Joelle Levitt Killebrew",
      songTitle: "Cissy Strut",
      originalArtist: "The Meters",
      pitchNotes: "New Orleans funk groove that would fit our brass unisons perfectly.",
      spotifyOrYoutubeUrl: "https://www.youtube.com/watch?v=4_iC0MyIykM",
      votesCount: 6,
      voters: [superAdminUid, "user_fetkovich_john", "user_rubin_jonathan", "user_tbone_mike"],
      status: "approved",
      createdAt: new Date().toISOString(),
    },
    {
      id: "sug_spanish_flea",
      submittedByUid: "user_ward_kristin",
      submittedByName: "Kristin Ward",
      songTitle: "Spanish Flea",
      originalArtist: "Herb Alpert & Tijuana Brass",
      pitchNotes: "Short, high-tempo, nostalgic parade stroll tune.",
      spotifyOrYoutubeUrl: "https://www.youtube.com/watch?v=mML2fPec7xU",
      votesCount: 4,
      voters: ["user_ward_kristin", "user_bari_sarah"],
      status: "under_review",
      createdAt: new Date().toISOString(),
    },
    {
      id: "sug_superstition",
      submittedByUid: "user_fetkovich_john",
      submittedByName: "John Fetkovich",
      songTitle: "Superstition",
      originalArtist: "Stevie Wonder",
      pitchNotes: "The drum groove is iconic and our sousaphones would kill the bassline.",
      spotifyOrYoutubeUrl: "https://www.youtube.com/watch?v=0CFuCYNx-1g",
      votesCount: 5,
      voters: [superAdminUid, "user_rubin_jonathan", "user_killebrew_joelle"],
      status: "approved",
      createdAt: new Date().toISOString(),
    },
    {
      id: "sug_feel_so_good",
      submittedByUid: "user_ward_kristin",
      submittedByName: "Kristin Ward",
      songTitle: "Feels So Good",
      originalArtist: "Chuck Mangione",
      pitchNotes: "Flugelhorn / trumpet melody feature for outdoor festivals.",
      spotifyOrYoutubeUrl: "https://www.youtube.com/watch?v=FPTk51k2iQk",
      votesCount: 3,
      voters: ["user_ward_kristin", "user_killebrew_joelle"],
      status: "under_review",
      createdAt: new Date().toISOString(),
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
  // 7. Theme Configuration Document
  // ==========================================
  // Note: Full v2 scoped theme configuration is seeded in Section 11 below.

  // ==========================================
  // 8. Master Setlist Templates
  // ==========================================
  const setlistTemplates = [
    {
      id: "template_parade_short",
      name: "30-Minute Street Parade Block",
      songCount: 4,
      tags: ["Parade", "Street Beat", "Compact"],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "template_festival_long",
      name: "90-Minute Festival Showcase",
      songCount: 10,
      tags: ["Festival", "Stage", "Extended"],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "template_beer_garden",
      name: "Beer Garden & Porchfest Set",
      songCount: 6,
      tags: ["Acoustic", "Casual", "Outdoor"],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  for (const sl of setlistTemplates) {
    await setDoc(doc(db, "setlists", sl.id), sl, { merge: true });
  }
  console.log(`✅ Seeded ${setlistTemplates.length} setlist templates.`);

  // ==========================================
  // 9. Gigs, Call Sheets, RSVPs & Dispatch History
  // ==========================================
  const gigs = [
    {
      id: "gig_mattress_factory_2026",
      slug: "2026-09-25-mattress-factory-garden-party",
      date: "2026-09-25",
      status: "confirmed",
      publicDetails: {
        title: "Mattress Factory Garden Party",
        venue: "Mattress Factory Museum Garden",
        venueAddress: "500 Sampsonia Way, Pittsburgh, PA 15212",
        description: "Special double-bill outdoor performance featuring Eagleburger Band and The Honk Committee from Buffalo.",
      },
      internalLogistics: {
        title: "Mattress Factory Garden Party",
        callTime: "5:45 PM",
        downbeat: "6:45 PM",
        attire: "Eagleburger Yellows & Festive Black",
        unloadingAddress: "500 Sampsonia Way (Rear Alley Gate), Pittsburgh, PA",
        parkingNotes: "Band vehicle parking permits provided for Monterey St lot.",
        compensation: 65,
        description: "Co-billing with The Honk Committee. 45 min alternating sets in courtyard.",
      },
      setlist: [
        {
          id: "set-1",
          setName: "Courtyard Set 1",
          items: [
            { id: "item-1-1", title: "Iron City Funk", artist: "Traditional", keySignature: "Eb Major" },
            { id: "item-1-2", title: "Bloomfield Bounce", artist: "Eagleburger Band", keySignature: "Bb Major" },
            { id: "item-1-3", title: "Ghost Town Ska", artist: "The Specials", keySignature: "C Minor" },
            { id: "item-1-4", title: "Renegade", artist: "Styx", keySignature: "G Minor" },
          ],
        },
      ],
      financials: {
        totalFee: 1400,
        settlementType: "equal_split",
        bandFundCut: 200,
        payouts: {},
        notes: "Joint fee with visiting band; sound system supplied by venue.",
      },
      rsvpSummary: {
        attendingCount: 8,
        declinedCount: 1,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "gig_bloomfield_2028",
      slug: "2028-11-05-bloomfield-street-carnival",
      date: "2028-11-05",
      status: "draft",
      publicDetails: {
        title: "Bloomfield Street Carnival",
        venue: "Liberty & 45th",
        venueAddress: "Penn & 45th, Pittsburgh, PA 15224",
        description: "Annual neighborhood street festival and parade performance.",
      },
      internalLogistics: {
        title: "Bloomfield Street Carnival",
        callTime: "5:30 PM",
        downbeat: "6:30 PM",
        attire: "Eagleburger Yellows & Black",
        unloadingAddress: "Penn & 45th, Pittsburgh, PA 15224",
        parkingNotes: "Street parking on adjacent residential avenues.",
        compensation: 44,
        description: "Official marching block & open plaza jam.",
      },
      setlist: [
        {
          id: "set-1",
          setName: "Parade Stroll",
          items: [
            { id: "item-2-1", title: "Bloomfield Bounce", artist: "Eagleburger Band", keySignature: "Bb Major" },
            { id: "item-2-2", title: "Foxburg River Reel", artist: "Traditional", keySignature: "G Major" },
            { id: "item-2-3", title: "Clarion River Walk", artist: "Traditional", keySignature: "F Major" },
          ],
        },
      ],
      financials: {
        totalFee: 800,
        settlementType: "equal_split",
        bandFundCut: 100,
        payouts: {},
        notes: "Deposit pending invoice confirmation.",
      },
      rsvpSummary: {
        attendingCount: 7,
        declinedCount: 0,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "gig_st_patricks_2026",
      slug: "2026-03-14-st-patricks-parade-downtown",
      date: "2026-03-14",
      status: "completed",
      publicDetails: {
        title: "Downtown Pittsburgh St. Patrick's Parade",
        venue: "Downtown Pittsburgh / Grant St & Boulevard of the Allies",
        venueAddress: "Grant St & Liberty Ave, Pittsburgh, PA 15219",
        description: "Annual Pittsburgh St. Patrick's Parade march down Grant Street and Boulevard of the Allies.",
      },
      internalLogistics: {
        title: "Downtown Pittsburgh St. Patrick's Parade",
        callTime: "8:30 AM",
        downbeat: "10:00 AM",
        attire: "Eagleburger Greens, Yellows & Black Layers",
        unloadingAddress: "10th St & Penn Ave (Staging Division 3), Pittsburgh, PA",
        parkingNotes: "Subsidized parking at Grant Street Transportation Center garage.",
        compensation: 200,
        description: "Official Division 3 street lead unit. Continuous mobile street cadence.",
      },
      setlist: [
        {
          id: "set-1",
          setName: "Parade March Block",
          items: [
            { id: "item-stp-1", title: "Clarion River Walk", artist: "Traditional", keySignature: "F Major" },
            { id: "item-stp-2", title: "Bloomfield Bounce", artist: "Eagleburger Band", keySignature: "Bb Major" },
            { id: "item-stp-3", title: "Foxburg River Reel", artist: "Traditional", keySignature: "G Major" },
            { id: "item-stp-4", title: "Renegade", artist: "Styx", keySignature: "G Minor" },
          ],
        },
      ],
      financials: {
        totalFee: 3500,
        settlementType: "equal_split",
        bandFundCut: 500,
        payouts: {},
        notes: "Parade committee check settled and disbursed to 8 participating musicians.",
      },
      rsvpSummary: {
        attendingCount: 8,
        declinedCount: 0,
      },
      createdAt: "2026-02-01T12:00:00.000Z",
      updatedAt: "2026-03-15T10:00:00.000Z",
    },
    {
      id: "gig_lawrenceville_porchfest_2026",
      slug: "2026-05-16-lawrenceville-porchfest",
      date: "2026-05-16",
      status: "completed",
      publicDetails: {
        title: "Lawrenceville Porchfest Stomp",
        venue: "Arsenal Park & Butler St Porches",
        venueAddress: "40th & Butler St, Pittsburgh, PA 15201",
        description: "Acoustic street tour jumping between neighborhood porch stoops and finishing in Arsenal Park.",
      },
      internalLogistics: {
        title: "Lawrenceville Porchfest Stomp",
        callTime: "1:00 PM",
        downbeat: "2:00 PM",
        attire: "Casual Eagleburger Merch / Yellow T-Shirts",
        unloadingAddress: "40th & Penn Ave, Pittsburgh, PA",
        parkingNotes: "Neighborhood street parking; carpool recommended.",
        compensation: 75,
        description: "Mobile acoustic sets. Audience following the brass parade down 43rd St.",
      },
      setlist: [
        {
          id: "set-1",
          setName: "Porch Crawl Set",
          items: [
            { id: "item-lpf-1", title: "Iron City Funk", artist: "Traditional", keySignature: "Eb Major" },
            { id: "item-lpf-2", title: "Ghost Town Ska", artist: "The Specials", keySignature: "C Minor" },
            { id: "item-lpf-3", title: "Bloomfield Bounce", artist: "Eagleburger Band", keySignature: "Bb Major" },
          ],
        },
      ],
      financials: {
        totalFee: 1200,
        settlementType: "equal_split",
        bandFundCut: 200,
        payouts: {},
        notes: "Porchfest community sponsorship fee + street tip collection.",
      },
      rsvpSummary: {
        attendingCount: 8,
        declinedCount: 0,
      },
      createdAt: "2026-04-01T12:00:00.000Z",
      updatedAt: "2026-05-17T09:00:00.000Z",
    },
    {
      id: "gig_three_rivers_arts_2026",
      slug: "2026-06-06-three-rivers-arts-festival",
      date: "2026-06-06",
      status: "confirmed",
      publicDetails: {
        title: "Three Rivers Arts Festival Pop-Up Showcase",
        venue: "Point State Park Lawn & Stanwix Plaza",
        venueAddress: "601 Commonwealth Pl, Pittsburgh, PA 15222",
        description: "High-decibel acoustic brass fanfare navigating the artisan market pathways and lawn lawns.",
      },
      internalLogistics: {
        title: "Three Rivers Arts Festival Pop-Up Showcase",
        callTime: "3:30 PM",
        downbeat: "4:30 PM",
        attire: "Eagleburger Black & Yellows",
        unloadingAddress: "Commonwealth Pl Loading Zone, Pittsburgh, PA",
        parkingNotes: "Vendor load pass provided for Stanwix Street staging area.",
        compensation: 120,
        description: "Two 40-minute mobile pop-up sets across the festival footprint.",
      },
      setlist: [
        {
          id: "set-1",
          setName: "Festival Main Deck",
          items: [
            { id: "item-traf-1", title: "Iron City Funk", artist: "Traditional", keySignature: "Eb Major" },
            { id: "item-traf-2", title: "Renegade", artist: "Styx", keySignature: "G Minor" },
            { id: "item-traf-3", title: "Ghost Town Ska", artist: "The Specials", keySignature: "C Minor" },
            { id: "item-traf-4", title: "Bridge Burner Breakdown", artist: "Eagleburger Band", keySignature: "D Minor" },
          ],
        },
      ],
      financials: {
        totalFee: 2200,
        settlementType: "equal_split",
        bandFundCut: 400,
        payouts: {},
        notes: "Pittsburgh Cultural Trust festival contract confirmed.",
      },
      rsvpSummary: {
        attendingCount: 8,
        declinedCount: 0,
      },
      createdAt: "2026-04-15T12:00:00.000Z",
      updatedAt: "2026-05-01T12:00:00.000Z",
    },
    {
      id: "gig_millvale_days_2026",
      slug: "2026-10-10-millvale-days-street-parade",
      date: "2026-10-10",
      status: "confirmed",
      publicDetails: {
        title: "Millvale Days Grand Street Parade",
        venue: "Grant Avenue Historic District",
        venueAddress: "Grant Ave & North Ave, Millvale, PA 15209",
        description: "Headlining the annual Millvale Days parade and post-parade street party.",
      },
      internalLogistics: {
        title: "Millvale Days Grand Street Parade",
        callTime: "10:00 AM",
        downbeat: "11:00 AM",
        attire: "Eagleburger Yellows & Festive Street Attire",
        unloadingAddress: "Sedgwick St staging zone, Millvale, PA",
        parkingNotes: "Permit zone in municipal lot off Lincoln Ave.",
        compensation: 85,
        description: "1.2 mile street parade followed by 20-minute standing plaza blowout.",
      },
      setlist: [
        {
          id: "set-1",
          setName: "Parade & Plaza Stomp",
          items: [
            { id: "item-mvd-1", title: "Bloomfield Bounce", artist: "Eagleburger Band", keySignature: "Bb Major" },
            { id: "item-mvd-2", title: "Clarion River Walk", artist: "Traditional", keySignature: "F Major" },
            { id: "item-mvd-3", title: "Renegade", artist: "Styx", keySignature: "G Minor" },
          ],
        },
      ],
      financials: {
        totalFee: 1500,
        settlementType: "equal_split",
        bandFundCut: 250,
        payouts: {},
        notes: "Millvale Community Association grant contract.",
      },
      rsvpSummary: {
        attendingCount: 8,
        declinedCount: 0,
      },
      createdAt: "2026-05-10T12:00:00.000Z",
      updatedAt: "2026-05-20T12:00:00.000Z",
    },
  ];

  for (const g of gigs) {
    await setDoc(doc(db, "gigs", g.id), g, { merge: true });

    for (let i = 0; i < users.length; i++) {
      const musician = users[i];
      let rsvpStatus: "attending" | "declined" | "tentative" = "attending";
      if (i === 6) rsvpStatus = "declined";
      if (i === 7 && g.status !== "completed") rsvpStatus = "tentative";

      const rsvpDocRef = doc(db, "gigs", g.id, "rsvps", musician.uid);
      await setDoc(
        rsvpDocRef,
        {
          uid: musician.uid,
          displayName: musician.displayName,
          email: musician.email,
          sectionId: musician.sectionId,
          instruments: musician.instruments,
          status: rsvpStatus,
          notes: rsvpStatus === "declined" ? "Gig conflict" : "",
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    }

    const auditRef = doc(collection(db, "gigs", g.id, "dispatch_history"));
    await setDoc(auditRef, {
      type: "logistics_init",
      message: `Call sheet initialized for ${g.publicDetails.title}.`,
      initiatedBy: "System Seed",
      dispatchedAt: new Date().toISOString(),
    });
  }
  console.log(`✅ Seeded ${gigs.length} gigs across calendar with RSVPs and dispatch logs.`);

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
  // 12. Headless CMS Content Pages (Home)
  // ==========================================
  const homePage = {
    id: "home",
    slug: "home",
    title: "Home",
    description: "Official Website of the Eagleburger Band",
    isPublished: true,
    schemaVersion: 1,
    updatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    sections: [
      {
        id: "sec_hero",
        type: "hero",
        order: 1,
        hero: {
          headline: "Pittsburgh's High-Energy Street Brass & Drum Powerhouse",
          subheadline: "Unstoppable brass, infectious percussion grooves, and high-stepping street revelry.",
          ctaText: "Book the Band",
          ctaHref: "/book",
          secondaryCtaText: "Upcoming Shows",
          secondaryCtaHref: "/gigs",
          badgeText: "Acoustic Brass & Drums",
          backgroundImageUrl: "",
        },
      },
      {
        id: "sec_media",
        type: "media_highlight",
        order: 2,
        mediaHighlight: {
          title: "Live on the March",
          description: "Watch the Eagleburger Band bring the energy to the streets at the Greenfield Holiday Parade.",
          mediaType: "youtube",
          url: "https://www.youtube.com/watch?v=v0x-fut30wE",
          caption: "Greenfield Holiday Parade Performance — Brass & Battery in Full Stride",
        },
      },
      {
        id: "sec_features",
        type: "features",
        order: 3,
        features: {
          title: "Why Event Organizers Choose Eagleburger",
          subtitle: "100% mobile acoustic performance that electrifies crowds anywhere.",
          items: [
            {
              icon: "Zap",
              title: "100% Mobile & Acoustic",
              description: "No stage, cables, generators, or PA systems required. We play while marching, dancing, and mingling directly with crowds.",
            },
            {
              icon: "Music",
              title: "Massive Brass & Drumline Sound",
              description: "Sousaphones, trombones, trumpets, saxophones, and marching drums delivering high-decibel acoustic excitement.",
            },
            {
              icon: "Calendar",
              title: "Parades, Festivals & Celebrations",
              description: "Civic parades, street festivals, beer gardens, wedding send-offs, and community block parties across Western PA.",
            },
          ],
        },
      },
      {
        id: "sec_gig_feed",
        type: "gig_feed_preview",
        order: 4,
        gigFeedPreview: {
          title: "Upcoming Performances",
          maxItems: 3,
          ctaText: "View Full Performance Schedule",
          ctaHref: "/gigs",
        },
      },
    ],
  };

  await setDoc(doc(db, "content_pages", "home"), homePage, { merge: true });
  console.log("✅ Seeded content_pages/home with Greenfield Holiday Parade media highlight.");

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
  // 19. Super Admin Confirmation
  // ==========================================
  console.log(`ℹ️ Confirmed canonical Super Admin: davidpassmore@gmail.com (UID: ${superAdminUid})`);

  console.log("🎉 Complete emulator seed finished! All collections and sections populated.");
  process.exit(0);
}

runSeed().catch((err) => {
  console.error("❌ Seeding failed:", err);
  process.exit(1);
});