const ICAL_URL =
  "https://www.gig-o-matic.com/band/calfeed/e614ea71-a66c-4687-a3fa-499689cd29db";
const SIX_MONTHS_MS = 183 * 24 * 60 * 60 * 1000;
const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

// ── iCal parser ─────────────────────────────────────────────────────

function parseIcal(text) {
  // Unfold continuation lines (RFC 5545 §3.1)
  text = text.replace(/\r\n[ \t]/g, "");

  const events = [];
  let inEvent = false;
  let current = {};

  for (const line of text.split(/\r?\n/)) {
    if (line.trim() === "BEGIN:VEVENT") { inEvent = true; current = {}; continue; }
    if (line.trim() === "END:VEVENT") { inEvent = false; events.push(current); continue; }
    if (!inEvent || !line.includes(":")) continue;

    const sepIdx = line.indexOf(":");
    const key = line.slice(0, sepIdx).split(";")[0].toUpperCase();
    current[key] = line.slice(sepIdx + 1);
  }
  return events;
}

function parseDt(value) {
  // Strip VALUE=DATE: or VALUE=DATE-TIME: prefix
  value = value.replace(/^VALUE=DATE(?:-TIME)?:/i, "").trim();

  if (/^\d{8}$/.test(value)) {
    // All-day: 20260802
    return new Date(
      Date.UTC(+value.slice(0, 4), +value.slice(4, 6) - 1, +value.slice(6, 8))
    );
  }
  if (/^\d{8}T\d{6}Z?$/.test(value)) {
    const y = +value.slice(0, 4), m = +value.slice(4, 6) - 1, d = +value.slice(6, 8);
    const h = +value.slice(9, 11), mi = +value.slice(11, 13), s = +value.slice(13, 15);
    return new Date(Date.UTC(y, m, d, h, mi, s));
  }
  return null;
}

function unescape(val) {
  return (val || "")
    .replace(/\\n/g, "\n")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\");
}

function cleanDescription(desc) {
  if (!desc) return "";
  return desc
    .replace(/^(Unconfirmed|Confirmed)\s*/i, "")
    .replace(/\s*Gig-o-matic:\s*https?:\/\/\S+\s*$/i, "")
    .replace(/\n*Location:\s*[^\n]+/gi, "")
    .trim();
}

// ── Build gig list from parsed events ───────────────────────────────

function buildGigs(events) {
  const now = new Date();
  const cutoff = new Date(now.getTime() + ONE_YEAR_MS);
  const eastern = { timeZone: "America/New_York" };

  const gigs = [];

  for (const ev of events) {
    const dt = parseDt(ev.DTSTART || "");
    if (!dt || dt < now || dt > cutoff) continue;

    let title = unescape(ev.SUMMARY || "").trim();
    title = title.replace(/\s*-\s*Eagleburger Band\s*$/i, "");
    if (!title) continue;

    const dateStr = dt.toLocaleDateString("en-US", {
      ...eastern, weekday: "long", month: "long", day: "numeric", year: "numeric",
    });

    // Format time in Eastern; skip if midnight (all-day event)
    const h = +dt.toLocaleString("en-US", { ...eastern, hour: "numeric", hour12: false });
    const m = +dt.toLocaleString("en-US", { ...eastern, minute: "numeric" });
    let timeStr = "";
    if (h !== 0 || m !== 0) {
      timeStr = dt.toLocaleTimeString("en-US", {
        ...eastern, hour: "numeric", minute: "2-digit",
      });
    }

    const location = unescape(ev.LOCATION || "").trim();
    const description = cleanDescription(unescape(ev.DESCRIPTION || ""));
    const url = (ev.URL || "").trim();

    gigs.push({ dt, title, dateStr, timeStr, location, description, url });
  }

  gigs.sort((a, b) => a.dt - b.dt);
  return gigs;
}

// ── Render ──────────────────────────────────────────────────────────

function renderGigs(gigs, listElementId) {
  const list = document.getElementById(listElementId);
  list.innerHTML = "";

  if (gigs.length === 0) {
    list.innerHTML =
      "<li class='list-group-item'>No upcoming gigs at this time. <a href='/contact'>Book us!</a></li>";
    return;
  }

  for (const gig of gigs) {
    let dateLine = `<span class="gig-date">${gig.dateStr}</span>`;
    if (gig.timeStr) {
      dateLine += ` <span class="gig-date">@ ${gig.timeStr}</span>`;
    }

  let locationHTML = "";
  if (gig.location) {
    // Check if the location string matches common Google Maps URL formats
    const isGoogleMapsUrl = /(https?:\/\/)?(www\.)?(google\.com\/maps|goo\.gl\/maps|maps\.app\.goo\.gl)/i.test(gig.location);

    if (isGoogleMapsUrl) {
      // If it's a URL, create a hyperlink with the text "map link"
      locationHTML = `<div class="gig-location text-muted fst-italic">map link: <a href="${gig.location}" target="_blank" rel="noopener noreferrer"><span class="material-symbols-outlined">location_on</span></a></div>`;
    } else {
      // If it's not a URL, display the text normally
      locationHTML = `<div class="gig-location text-muted fst-italic">${gig.location}</div>`;
    }
  }

    let titleHTML = "";
    if (gig.url) {
      titleHTML = `<div class="gig-title fw-bold fs-5">${gig.title}</div>`;
      //titleHTML = `<a href="${gig.url}" target="_blank" class="gig-title fw-bold fs-5 text-decoration-none">${gig.title}</a>`;
    } 
    // else {
    //   titleHTML = `<div class="gig-title fw-bold fs-5">${gig.title}</div>`;
    // }

    const item = document.createElement("li");
    item.className = "list-group-item py-4 mb-3 border shadow-sm";
    item.innerHTML = `
      <div class="mb-2">
        <div class="gig-title fw-bold fs-5">${titleHTML}</div>
        <div class="text-muted">${dateLine}</div>
        ${locationHTML}
      </div>
      ${gig.description ? `<p class="mb-0">${gig.description}</p>` : ""}
    `;
    list.appendChild(item);
  }
}

// ── Public API ──────────────────────────────────────────────────────

export function loadGigs(icalUrl, listElementId) {
  fetch(icalUrl)
    .then((r) => {
      if (!r.ok) throw new Error("Network response was not ok");
      return r.text();
    })
    .then((text) => {
      const events = parseIcal(text);
      const gigs = buildGigs(events);
      renderGigs(gigs, listElementId);
    })
    .catch((err) => {
      console.error("Failed to load gigs:", err);
      const list = document.getElementById(listElementId);
      list.innerHTML =
        "<li class='list-group-item text-danger'>Unable to load gigs.</li>";
    });
}
