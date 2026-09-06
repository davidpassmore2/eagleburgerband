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
    if (line.trim() === "BEGIN:VEVENT") {
      inEvent = true;
      current = {};
      continue;
    }
    if (line.trim() === "END:VEVENT") {
      inEvent = false;
      events.push(current);
      continue;
    }
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
      Date.UTC(+value.slice(0, 4), +value.slice(4, 6) - 1, +value.slice(6, 8)),
    );
  }
  if (/^\d{8}T\d{6}Z?$/.test(value)) {
    const y = +value.slice(0, 4),
      m = +value.slice(4, 6) - 1,
      d = +value.slice(6, 8);
    const h = +value.slice(9, 11),
      mi = +value.slice(11, 13),
      s = +value.slice(13, 15);
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
      ...eastern,
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });

    // Format time in Eastern; skip if midnight (all-day event)
    const h = +dt.toLocaleString("en-US", {
      ...eastern,
      hour: "numeric",
      hour12: false,
    });
    const m = +dt.toLocaleString("en-US", { ...eastern, minute: "numeric" });
    let timeStr = "";
    if (h !== 0 || m !== 0) {
      timeStr = dt.toLocaleTimeString("en-US", {
        ...eastern,
        hour: "numeric",
        minute: "2-digit",
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

// ── Modal & URL Helpers ─────────────────────────────────────────────

function toEmbedUrl(rawUrl) {
  try {
    const parsed = new URL(rawUrl);

    // Google Maps: Append output=embed if it's a standard web link
    if (
      parsed.hostname.includes("google.com") &&
      parsed.pathname.includes("/maps")
    ) {
      parsed.searchParams.set("output", "embed");
      return parsed.toString();
    }

    // OpenStreetMap: Switch view to export/embed
    if (
      parsed.hostname.includes("openstreetmap.org") &&
      !parsed.pathname.includes("embed")
    ) {
      parsed.pathname = "/export/embed.html";
      return parsed.toString();
    }

    return rawUrl;
  } catch {
    return rawUrl;
  }
}

function ensureMapModal() {
  let modal = document.getElementById("mapModal");
  if (modal) return modal;

  // Uses Bootstrap modal classes consistent with the existing list-group styling
  modal = document.createElement("div");
  modal.id = "mapModal";
  modal.className = "modal fade";
  modal.tabIndex = -1;
  modal.setAttribute("aria-hidden", "true");
  modal.innerHTML = `
    <div class="modal-dialog modal-lg modal-dialog-centered">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title" id="mapModalLabel">Event Location</h5>
          <div class="d-flex align-items-center gap-2 ms-auto">
            <a id="mapModalExternalLink" href="#" target="_blank" rel="noopener noreferrer" class="btn btn-sm btn-outline-secondary">
              Open in New Tab
            </a>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
        </div>
        <div class="modal-body p-0" style="height: 480px;">
          <iframe id="mapModalIframe" src="" width="100%" height="100%" style="border:0;" allowfullscreen="" loading="lazy"></iframe>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Clear iframe src when closed to kill background processes/audio
  modal.addEventListener("hidden.bs.modal", () => {
    const iframe = document.getElementById("mapModalIframe");
    if (iframe) iframe.src = "";
  });

  return modal;
}

function openMapModal(rawUrl, title) {
  ensureMapModal();

  const iframe = document.getElementById("mapModalIframe");
  const externalLink = document.getElementById("mapModalExternalLink");
  const modalLabel = document.getElementById("mapModalLabel");

  if (modalLabel && title) {
    modalLabel.textContent = title;
  }

  if (externalLink) {
    externalLink.href = rawUrl;
  }

  if (iframe) {
    iframe.src = toEmbedUrl(rawUrl);
  }

  const modalEl = document.getElementById("mapModal");

  // Trigger Bootstrap modal if available; fallback to manual display if not
  if (window.bootstrap && window.bootstrap.Modal) {
    const bsModal = window.bootstrap.Modal.getOrCreateInstance(modalEl);
    bsModal.show();
  } else {
    modalEl.classList.add("show");
    modalEl.style.display = "block";
    modalEl.removeAttribute("aria-hidden");
  }
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
    gig.textLocation = null;
    gig.extractedUrl = null;

    if (gig.description) {
      // 1. Extract text between ^...^ for the location label
      const locMatch = gig.description.match(/\^([^^]+)\^/);
      if (locMatch) {
        gig.textLocation = locMatch[1];
        gig.description = gig.description.replace(locMatch[0], "").trim();
      }

      // 2. Extract text between ~...~ for the title URL
      const urlMatch = gig.description.match(/~([^~]+)~/);
      if (urlMatch) {
        gig.extractedUrl = urlMatch[1];
        gig.description = gig.description.replace(urlMatch[0], "").trim();
      }
    }

    let dateLine = `<span class="gig-date">${gig.dateStr}</span>`;
    if (gig.timeStr) {
      dateLine += ` <span class="gig-date">@ ${gig.timeStr}</span>`;
    }

    let locationHTML = "";
    if (gig.location) {
      const isUrl = /^https?:\/\//i.test(gig.location);

      if (isUrl) {
        const label =
          gig.textLocation ||
          '<span class="material-symbols-outlined">location_on</span>';
        locationHTML = `<div class="gig-location text-muted fst-italic">
          <button type="button" class="btn btn-link p-0 text-decoration-underline text-muted fst-italic map-modal-btn" data-url="${encodeURI(gig.location)}" data-title="${gig.title}">
            ${label}
          </button>
        </div>`;
      } else {
        locationHTML = `<div class="gig-location text-muted fst-italic">${gig.textLocation || gig.location}</div>`;
      }
    }

    // 3. Only use extractedUrl for the title hyperlink
    let titleHTML = gig.title;
    if (gig.extractedUrl) {
      titleHTML = `<a href="${gig.extractedUrl}" target="_blank" rel="noopener noreferrer" class="text-decoration-none text-reset">${gig.title}</a>`;
    }

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

  // Bind click listener for modal trigger buttons
  list.querySelectorAll(".map-modal-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const rawUrl = decodeURI(btn.getAttribute("data-url"));
      const title = btn.getAttribute("data-title");
      openMapModal(rawUrl, title);
    });
  });
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
