import { NextRequest, NextResponse } from "next/server";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { formatIcalDate, parseDateTime, escapeIcalText } from "@/lib/calendar/ical";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ token: string }> | { token: string } }
) {
  // Support both Promise params (Next.js 15+) and plain params
  const resolvedParams = await Promise.resolve(context.params);
  const token = resolvedParams?.token;

  if (!token) {
    return new NextResponse("Calendar token required.", { status: 400 });
  }

  try {
    // 1. Locate user by calendar token
    const usersQuery = query(collection(db, "users"), where("calendarToken", "==", token));
    const userSnap = await getDocs(usersQuery);

    if (userSnap.empty) {
      console.warn(`[Calendar API] No user found with token: ${token}`);
      return new NextResponse(`Calendar feed not found for token: ${token}`, { status: 404 });
    }

    const userDoc = userSnap.docs[0];
    const userData = userDoc.data();
    const uid = userDoc.id;
    const performerName = userData.displayName || userData.name || "Performer";

    // 2. Fetch all gigs
    const gigsSnap = await getDocs(collection(db, "gigs"));
    const eventsIcal: string[] = [];

    for (const gigDoc of gigsSnap.docs) {
      const gigData = gigDoc.data();
      const gigId = gigDoc.id;

      // Check attendance
      const rsvpsSnap = await getDocs(collection(db, "gigs", gigId, "rsvps"));
      let isAttending = false;

      rsvpsSnap.forEach((r) => {
        if (r.id === uid && r.data().status === "attending") {
          isAttending = true;
        }
      });

      if (!isAttending) continue;

      const title = gigData.internalLogistics?.title || gigData.publicDetails?.title || "Eagleburger Gig";
      const dateStr = gigData.date;
      const callTime = gigData.internalLogistics?.callTime || "TBD";
      const downbeat = gigData.internalLogistics?.downbeat || "TBD";
      const location = gigData.internalLogistics?.unloadingAddress || gigData.publicDetails?.venueAddress || "Pittsburgh, PA";
      const attire = gigData.internalLogistics?.attire || "Eagleburger Yellows & Black";
      const notes = gigData.internalLogistics?.parkingNotes || "";

      const start = parseDateTime(dateStr, callTime !== "TBD" ? callTime : downbeat);
      const end = new Date(start.getTime() + 3 * 60 * 60 * 1000);

      const description = [
        `CALL SHEET: ${title}`,
        `Call Time: ${callTime}`,
        `Downbeat: ${downbeat}`,
        `Uniform: ${attire}`,
        notes ? `Parking/Logistics: ${notes}` : "",
      ]
        .filter(Boolean)
        .join("\n");

      const eventBlock = [
        "BEGIN:VEVENT",
        `UID:${gigId}-${uid}@eagleburger.org`,
        `DTSTAMP:${formatIcalDate(new Date())}`,
        `DTSTART:${formatIcalDate(start)}`,
        `DTEND:${formatIcalDate(end)}`,
        `SUMMARY:${escapeIcalText(title)}`,
        `LOCATION:${escapeIcalText(location)}`,
        `DESCRIPTION:${escapeIcalText(description)}`,
        "STATUS:CONFIRMED",
        "END:VEVENT",
      ].join("\r\n");

      eventsIcal.push(eventBlock);
    }

    const icalData = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Eagleburger Band//Gig Dispatch System//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      `X-WR-CALNAME:Eagleburger - ${performerName}`,
      "X-WR-TIMEZONE:America/New_York",
      ...eventsIcal,
      "END:VCALENDAR",
    ].join("\r\n");

    return new NextResponse(icalData, {
      status: 200,
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `attachment; filename="eagleburger-${performerName.toLowerCase().replace(/\s+/g, "-")}.ics"`,
        "Cache-Control": "no-cache, no-store, max-age=0, must-revalidate",
      },
    });
  } catch (err) {
    console.error("[Calendar API] Generation failed:", err);
    return new NextResponse("Server error building calendar.", { status: 500 });
  }
}