import { initializeApp } from "firebase/app";
import { 
  getFirestore, 
  connectFirestoreEmulator, 
  doc, 
  setDoc, 
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
  // 1. Band Sections (With Designated Section Leaders)
  // ==========================================
  const sections = [
    { 
      id: "percussion", 
      name: "Drumline & Percussion", 
      order: 1, 
      minRecommended: 3,
      leaderUid: "T4qj4iyXePw2ZMvdzvZq644u9OiX", // David Passmore Jr.
      leaderName: "David Passmore Jr.",
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
      uid: "T4qj4iyXePw2ZMvdzvZq644u9OiX",
      email: "manager@eagleburger.org",
      displayName: "David Passmore Jr.",
      roles: ["admin", "gig_manager", "catalog_manager", "web_manager", "treasurer", "section_leader"],
      role: "admin",
      status: "active",
      sectionId: "percussion",
      instruments: ["Snare Drum"],
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
      voters: ["T4qj4iyXePw2ZMvdzvZq644u9OiX", "user_fetkovich_john", "user_rubin_jonathan", "user_tbone_mike"],
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
      authorUid: "T4qj4iyXePw2ZMvdzvZq644u9OiX",
      authorName: "David Passmore Jr.",
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
  console.log(`✅ Seeded ${inquiries.length} client booking inquiries.`);
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

  console.log("🎉 Complete emulator seed finished! All collections and sections populated.");
  process.exit(0);
}

runSeed().catch((err) => {
  console.error("❌ Seeding failed:", err);
  process.exit(1);
});