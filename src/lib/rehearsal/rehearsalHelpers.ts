import { RehearsalConfig, RehearsalRsvp } from "@/lib/schema/rehearsal";
import { BlackoutDate } from "@/lib/schema/blackout";

export interface UpcomingRehearsalDate {
  dateStr: string; // YYYY-MM-DD
  formattedDate: string; // e.g. "Tuesday, Oct 20"
  time: string; // e.g. "7:00 PM"
  isToday: boolean;
  dayName: string;
}

/**
 * Calculates upcoming rehearsal dates matching the weekly recurring schedule
 */
export function getUpcomingRehearsalDates(
  config: RehearsalConfig,
  count = 8
): UpcomingRehearsalDate[] {
  const dates: UpcomingRehearsalDate[] = [];
  const targetDay = config.dayOfWeek; // 0=Sun .. 6=Sat

  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];

  // Start scanning from today
  const cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  while (dates.length < count) {
    if (cursor.getDay() === targetDay) {
      const yyyy = cursor.getFullYear();
      const mm = String(cursor.getMonth() + 1).padStart(2, "0");
      const dd = String(cursor.getDate()).padStart(2, "0");
      const dateStr = `${yyyy}-${mm}-${dd}`;

      // If it's today, check if rehearsal already passed
      let skipToday = false;
      if (dateStr === todayStr && config.endTime) {
        const [endH, endM] = config.endTime.split(":").map(Number);
        const endDateTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), endH || 21, endM || 0);
        if (now > endDateTime) {
          skipToday = true;
        }
      }

      if (!skipToday) {
        const dayName = cursor.toLocaleDateString("en-US", { weekday: "long" });
        const monthDay = cursor.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        const formattedDate = `${dayName}, ${monthDay}`;

        // Format 24h start time to 12h AM/PM
        let timeFormatted = config.startTime;
        try {
          const [h, m] = config.startTime.split(":");
          const hour = parseInt(h, 10);
          const ampm = hour >= 12 ? "PM" : "AM";
          const h12 = hour % 12 || 12;
          timeFormatted = `${h12}:${m} ${ampm}`;
        } catch {
          // fallback to raw
        }

        dates.push({
          dateStr,
          formattedDate,
          time: timeFormatted,
          isToday: dateStr === todayStr,
          dayName,
        });
      }
    }

    cursor.setDate(cursor.getDate() + 1);
  }

  return dates;
}

/**
 * Calculates attendance statistics, projected headcount, and section breakdowns
 */
export function getRehearsalAttendanceStats(rsvps: RehearsalRsvp[], targetQuorum = 14) {
  let attending = 0;
  let probable = 0;
  let tentative = 0;
  let declined = 0;

  const sectionBreakdown: Record<
    string,
    { attending: string[]; probable: string[]; tentative: string[]; declined: string[] }
  > = {};

  rsvps.forEach((r) => {
    const sec = r.sectionName || "General";
    if (!sectionBreakdown[sec]) {
      sectionBreakdown[sec] = { attending: [], probable: [], tentative: [], declined: [] };
    }

    if (r.status === "attending") {
      attending++;
      sectionBreakdown[sec].attending.push(r.displayName);
    } else if (r.status === "probable") {
      probable++;
      sectionBreakdown[sec].probable.push(r.displayName);
    } else if (r.status === "tentative") {
      tentative++;
      sectionBreakdown[sec].tentative.push(r.displayName);
    } else if (r.status === "declined") {
      declined++;
      sectionBreakdown[sec].declined.push(r.displayName);
    }
  });

  // Projected headcount formula: 100% attending + 75% probable + 30% tentative
  const projectedHeadcount = Math.round(attending + probable * 0.75 + tentative * 0.3);
  const quorumPercentage = Math.min(100, Math.round((projectedHeadcount / targetQuorum) * 100));

  return {
    totalRsvps: rsvps.length,
    attending,
    probable,
    tentative,
    declined,
    projectedHeadcount,
    targetQuorum,
    quorumPercentage,
    isQuorumMet: projectedHeadcount >= targetQuorum,
    sectionBreakdown,
  };
}

/**
 * Filters blackouts that overlap with a specific date
 */
export function getBlackoutsForDate(
  dateStr: string,
  blackouts: BlackoutDate[]
): BlackoutDate[] {
  const normDate = dateStr.trim();
  return blackouts.filter((bo) => {
    const start = (bo.startDate || "").split("T")[0].trim();
    const end = (bo.endDate || bo.startDate || "").split("T")[0].trim();
    return start && normDate >= start && normDate <= end;
  });
}

