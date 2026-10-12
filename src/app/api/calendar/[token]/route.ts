import { NextRequest, NextResponse } from "next/server";
import type { DocumentData } from "firebase/firestore";
import { findDocuments, listDocuments } from "@/lib/firebase/serverFirestore";
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
    const matchingUsers = await findDocuments("users", "calendarToken", token);

    if (matchingUsers.length === 0) {
      console.warn(`[Calendar API] No user found with token: ${token}`);
      return new NextResponse(`Calendar feed not found for token: ${token}`, { status: 404 });
    }

    const userDoc = matchingUsers[0];
    const userData: DocumentData = userDoc.data;
    const uid = userDoc.id;
    const performerName = userData.displayName || userData.name || "Performer";

    const mode = req.nextUrl.searchParams.get("mode") || "mine";
    const origin = req.nextUrl.origin || "https://eagleburgerband.com";

    // 2. Fetch all gigs
    const gigs = await listDocuments("gigs");
    const eventsIcal: string[] = [];

    for (const gigDoc of gigs) {
      const gigData: DocumentData = gigDoc.data;
      const gigId = gigDoc.id;

      // Skip cancelled or archived gigs if any
      if (gigData.status === "cancelled" || gigData.status === "archived") {
        continue;
      }

      // Check attendance if in "mine" mode
      if (mode === "mine") {
        const rsvps = await listDocuments(`gigs/${gigId}/rsvps`);
        let isAttending = false;

        rsvps.forEach((r) => {
          const status = r.data.status;
          if (r.id === uid && (status === "attending" || status === "probable")) {
            isAttending = true;
          }
        });

        if (!isAttending) continue;
      }

      const title = gigData.internalLogistics?.title || gigData.publicDetails?.title || "Eagleburger Gig";
      const dateStr = gigData.date;
      const callTime = gigData.internalLogistics?.callTime || "TBD";
      const downbeat = gigData.internalLogistics?.downbeat || "TBD";
      const location = gigData.internalLogistics?.unloadingAddress || gigData.publicDetails?.venueAddress || "Pittsburgh, PA";
      const attire = gigData.internalLogistics?.attire || "Eagleburger Yellows & Black";
      const notes = gigData.internalLogistics?.parkingNotes || "";
      const portalUrl = `${origin}/portal/gigs/${gigId}`;

      const start = parseDateTime(dateStr, callTime !== "TBD" ? callTime : downbeat);
      const end = new Date(start.getTime() + 3 * 60 * 60 * 1000);

      const description = [
        `CALL SHEET: ${title}`,
        `Call Time: ${callTime}`,
        `Downbeat: ${downbeat}`,
        `Uniform: ${attire}`,
        notes ? `Parking/Logistics: ${notes}` : "",
        `Call Sheet Details: ${portalUrl}`,
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
        `URL:${portalUrl}`,
        "STATUS:CONFIRMED",
        "END:VEVENT",
      ].join("\r\n");

      eventsIcal.push(eventBlock);
    }

    const calName = mode === "all" ? "Eagleburger Band - Full Schedule" : `Eagleburger - ${performerName}`;

    const icalData = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Eagleburger Band//Gig Dispatch System//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      `X-WR-CALNAME:${calName}`,
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