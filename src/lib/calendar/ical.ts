/**
 * Format a Date object or ISO string into iCalendar UTC timestamp: YYYYMMDDTHHMMSSZ
 */
export function formatIcalDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/**
 * Parse date and optional time string (e.g. "2026-09-25", "18:30" or "6:30 PM") into Date
 */
export function parseDateTime(dateStr: string, timeStr?: string): Date {
  const [yearStr, monthStr, dayStr] = dateStr.split("-");
  const year = Number(yearStr) || new Date().getFullYear();
  const month = (Number(monthStr) || 1) - 1;
  const day = Number(dayStr) || 1;

  const d = new Date(year, month, day);

  if (!timeStr || timeStr.toUpperCase() === "TBD") {
    d.setHours(18, 0, 0, 0); // Default to 6:00 PM if unspecified
    return d;
  }

  // Handle 12-hour AM/PM formats
  const match12 = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (match12 && match12[1] && match12[2]) {
    let hours = parseInt(match12[1], 10);
    const minutes = parseInt(match12[2], 10);
    const meridiem = match12[3]?.toUpperCase();

    if (meridiem === "PM" && hours < 12) hours += 12;
    if (meridiem === "AM" && hours === 12) hours = 0;

    d.setHours(hours, minutes, 0, 0);
    return d;
  }

  return d;
}

/**
 * Escape plain text for iCalendar standards
 */
export function escapeIcalText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}