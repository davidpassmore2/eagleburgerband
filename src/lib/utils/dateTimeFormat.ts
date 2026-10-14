/**
 * Standard Date & Time Formatting Utilities for Eagleburger Band
 * Enforces 12-hour non-military time format with AM/PM and Eastern Standard Time (EST/EDT) context.
 */

export const TIMEZONE_EST = "America/New_York";

/**
 * Converts military/24-hour time strings (e.g., "19:00", "09:30", "19:00:00")
 * into 12-hour non-military time (e.g., "7:00 PM", "9:30 AM").
 * Optionally appends EST/EDT timezone indicator.
 */
export function formatNonMilitaryTime(
  timeStr?: string,
  includeTimezone = false
): string {
  if (!timeStr || !timeStr.trim()) return "TBD";

  const raw = timeStr.trim();

  // If already non-military (contains AM or PM), return formatted
  if (/am|pm/i.test(raw)) {
    return includeTimezone ? `${raw} EST` : raw;
  }

  // Match HH:mm or HH:mm:ss
  const parts = raw.split(":");
  if (parts.length >= 2) {
    const hours = parseInt(parts[0], 10);
    const minutes = parts[1].padStart(2, "0");

    if (!isNaN(hours)) {
      const ampm = hours >= 12 ? "PM" : "AM";
      const h12 = hours % 12 || 12;
      const formatted = `${h12}:${minutes} ${ampm}`;
      return includeTimezone ? `${formatted} EST` : formatted;
    }
  }

  return raw;
}

/**
 * Formats a start and end time range in 12-hour non-military format.
 * e.g., ("19:00", "21:00", true) => "7:00 PM – 9:00 PM EST"
 */
export function formatTimeRange(
  startTime?: string,
  endTime?: string,
  includeTimezone = true
): string {
  if (!startTime && !endTime) return "Time TBD";
  if (!endTime) return formatNonMilitaryTime(startTime, includeTimezone);

  const startFormatted = formatNonMilitaryTime(startTime, false);
  const endFormatted = formatNonMilitaryTime(endTime, false);

  const range = `${startFormatted} – ${endFormatted}`;
  return includeTimezone ? `${range} EST` : range;
}

/**
 * Formats a date string (YYYY-MM-DD or ISO) into friendly non-military date.
 * Avoids UTC day rollover by anchoring in Eastern Time (America/New_York).
 * e.g. "2026-10-20" => "Tuesday, October 20, 2026"
 */
export function formatFriendlyDate(
  dateStr?: string,
  options: {
    includeDayOfWeek?: boolean;
    includeYear?: boolean;
    shortMonth?: boolean;
  } = {}
): string {
  if (!dateStr || !dateStr.trim()) return "Date TBD";

  const {
    includeDayOfWeek = true,
    includeYear = true,
    shortMonth = false,
  } = options;

  // Extract YYYY-MM-DD
  const cleanDate = dateStr.split("T")[0].trim();
  const parts = cleanDate.split("-");

  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // 0-indexed
    const day = parseInt(parts[2], 10);

    // Anchor at noon local to avoid any timezone boundary drift
    const d = new Date(year, month, day, 12, 0, 0);

    const weekday = includeDayOfWeek
      ? d.toLocaleDateString("en-US", { weekday: "long", timeZone: TIMEZONE_EST }) + ", "
      : "";

    const monthFormat = shortMonth ? "short" : "long";
    const monthName = d.toLocaleDateString("en-US", { month: monthFormat, timeZone: TIMEZONE_EST });
    const yearPart = includeYear ? `, ${year}` : "";

    return `${weekday}${monthName} ${day}${yearPart}`;
  }

  // Fallback for other date strings
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      weekday: includeDayOfWeek ? "long" : undefined,
      month: shortMonth ? "short" : "long",
      day: "numeric",
      year: includeYear ? "numeric" : undefined,
      timeZone: TIMEZONE_EST,
    });
  } catch {
    return dateStr;
  }
}

/**
 * Formats a timestamp (e.g., comment or audit log createdAt) in Eastern Time with 12-hour AM/PM.
 * e.g. "7:14 PM EST &bull; Oct 13"
 */
export function formatEasternTimestamp(isoString: string): string {
  try {
    const d = new Date(isoString);
    const time = d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: TIMEZONE_EST,
    });
    const date = d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      timeZone: TIMEZONE_EST,
    });
    return `${time} EST (${date})`;
  } catch {
    return isoString;
  }
}

/**
 * Returns today's date formatted as YYYY-MM-DD.
 */
export function getTodayDateString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Determines whether an event (gig, rehearsal, etc.) has already concluded or is in the past.
 * If dateStr < todayStr, returns true.
 * If dateStr === todayStr and endTime is provided, returns true if current time is past endTime.
 */
export function isEventInPast(
  dateStr?: string | null,
  endTime?: string | null
): boolean {
  if (!dateStr) return false;
  const normDate = dateStr.split("T")[0].trim();
  if (!normDate) return false;

  const todayStr = getTodayDateString();

  if (normDate < todayStr) return true;
  if (normDate > todayStr) return false;

  // Event is today: check if optional endTime has passed
  if (endTime && endTime.trim() && endTime.trim().toUpperCase() !== "TBD") {
    const raw = endTime.trim();
    const timeMatch = raw.match(/(\d+):(\d+)(?::(\d+))?\s*(AM|PM)?/i);
    if (timeMatch) {
      let h = parseInt(timeMatch[1], 10);
      const m = parseInt(timeMatch[2], 10);
      const meridian = timeMatch[4]?.toUpperCase();
      if (meridian === "PM" && h < 12) h += 12;
      if (meridian === "AM" && h === 12) h = 0;

      const now = new Date();
      const endDateTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m);
      if (now > endDateTime) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Determines whether a gig is considered in the past (completed status or past date).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isGigInPast(gig?: any): boolean {
  if (!gig) return false;
  if (gig.status === "completed") return true;
  const rawLogistics = gig.internalLogistics as { endTime?: string } | undefined;
  const endTime =
    typeof rawLogistics?.endTime === "string"
      ? rawLogistics.endTime
      : undefined;
  return isEventInPast(gig.date, endTime);
}


