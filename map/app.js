/**
 * ============================================================================
 * Eagleburger Mapping Thingy - Application Logic (app.js)
 * ============================================================================
 *
 * Description:
 * A full-screen, responsive Leaflet.js and OpenStreetMap web map application
 * designed for forward/reverse geocoding, precise address resolution, and
 * seamless location sharing without requiring server-side rewrite rules.
 *
 * Core Features:
 * 1. Leaflet & Tile Engine:
 *    - Renders OpenStreetMap base tiles with customizable zoom bounds (1-19).
 *    - Custom markers for current GPS location (Home icon) and search pins.
 *
 * 2. Hash-Based Path Routing & State Persistence:
 *    - Formats URLs as `/#/{lat}/{lon}/{zoom}` (e.g., `/#/40.44062/-79.99589/16`).
 *    - Runs entirely client-side, bypassing server 404 rewrite requirements.
 *    - Live-syncs zoom and coordinates to the URL hash on user pan/zoom/click.
 *
 * 3. Geocoding Services (Nominatim / OpenStreetMap):
 *    - Forward Geocoding: Searches text addresses or POIs from the input bar.
 *    - Reverse Geocoding: Resolves point clicks or GPS coordinates into
 *      structured, multi-line address cards (Title, Street, City, State/Zip, Country).
 *
 * 4. Dynamic Search & UI Controls:
 *    - Auto-resizing search bar utilizing HTML5 canvas text metrics (Solway font).
 *    - Floating map control widget featuring Zoom In/Out buttons, a vertical
 *      HTML5 range slider, Zoom Reset, and a "Locate Me" GPS trigger.
 *
 * 5. Embed Mode (?embed=true):
 *    - When the `?embed=true` query parameter is present, all floating UI
 *      controls (search bar, zoom slider) are suppressed.
 *    - Fixes the viewport to zoom level 16 with the address popup pre-opened.
 *    - Includes an in-popup toggle to generate embed-ready links (zoom 17).
 *
 * 6. Asynchronous State & Loading Overlay:
 *    - Displays an animated loader during cold start, GPS discovery, and all
 *      in-flight geocoding operations to prevent layout shift or visual flashes.
 * ============================================================================
 */

const DEFAULT_ZOOM = 16;
const EMBED_ZOOM = 17;

// Check for ?embed=true or ?embed=1 in the query string
const urlParams = new URLSearchParams(window.location.search);
const isEmbedded = ["true", "1"].includes(
  (urlParams.get("embed") || "").toLowerCase(),
);

if (isEmbedded) {
  document.body.classList.add("embedded");
}

// 1. Initialize map (disable Leaflet's default zoom control to use our custom widget)
const map = L.map("map", { zoomControl: false });

// 2. Add OpenStreetMap tile layer
const tiles = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
}).addTo(map);

// Define Home Icon using Material Symbols inside Leaflet divIcon
const homeIcon = L.divIcon({
  className: "custom-home-icon",
  html: `
    <div style="
      background-color: #0078d4;
      width: 38px;
      height: 38px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 6px rgba(0,0,0,0.35);
      border: 2px solid #ffffff;
      color: #ffffff;
    ">
      <span class="material-symbols-outlined" style="font-size: 22px;">home</span>
    </div>
  `,
  iconSize: [38, 38],
  iconAnchor: [19, 19],
  popupAnchor: [0, -22],
});

let initialMarker = null;
let searchMarker = null;
let userCoordinates = null;
let currentCoords = null; // Stores currently pinned {lat, lon}

const zoomSlider = document.getElementById("zoom-slider");
const loader = document.getElementById("initial-loader");
const loaderText = loader ? loader.querySelector("p") : null;

// --- Loading Overlay Controls ---
function showLoader(message = "Locating...") {
  if (loader) {
    if (loaderText) loaderText.textContent = message;
    loader.classList.remove("hidden");
  }
}

function hideLoader() {
  if (loader) {
    loader.classList.add("hidden");
  }
}

// Helper: Reveal UI once location resolution finishes
function revealMap() {
  const mapElement = document.getElementById("map");
  const formElement = document.getElementById("search-form");

  hideLoader();
  mapElement.classList.add("ready");
  if (!isEmbedded) {
    formElement.classList.add("ready");
  }
  map.invalidateSize();
  syncSliderWithMap();
}

// Helper: Build hash path URL with optional embed toggle and explicit zoom
function buildHashUrl(lat, lon, zoom, forceEmbed = false) {
  const cleanLat = lat.toFixed(5);
  const cleanLon = lon.toFixed(5);
  const cleanZoom = Math.round(zoom);
  const searchPart = forceEmbed ? "?embed=true" : "";
  const base = `${window.location.origin}${window.location.pathname}${searchPart}`;
  return `${base}#/${cleanLat}/${cleanLon}/${cleanZoom}`;
}

function removeInitialLocation() {
  if (initialMarker) {
    map.removeLayer(initialMarker);
    initialMarker = null;
  }
}

function syncSliderWithMap() {
  if (zoomSlider) {
    zoomSlider.value = Math.round(map.getZoom());
  }
}

// Dynamic Search Bar Resizer using Solway font metrics
const measureCanvas = document.createElement("canvas");
const measureCtx = measureCanvas.getContext("2d");

function autoResizeSearch(text) {
  if (isEmbedded) return;
  measureCtx.font = '15px "Solway", serif';
  const textWidth = measureCtx.measureText(text || "").width;
  const computedWidth = Math.ceil(textWidth + 160);

  const minWidth = 400;
  const maxWidth = Math.floor(window.innerWidth * 0.85);
  const targetWidth = Math.min(Math.max(computedWidth, minWidth), maxWidth);

  form.style.width = `${targetWidth}px`;
}

// Helper: Formats the Nominatim response object into the required layout
function formatNominatimAddress(data, fallbackLabel) {
  if (!data || !data.address) {
    return {
      html: `<div>${fallbackLabel}</div>`,
      plainText: fallbackLabel,
      singleLine: fallbackLabel,
    };
  }

  const addr = data.address;

  // 1. {title, if found}
  let title = data.name || "";
  if (
    title === addr.road ||
    title === addr.house_number ||
    title === addr.postcode
  ) {
    title = "";
  }

  // 2. {street number} {street name}
  const streetParts = [];
  if (addr.house_number) streetParts.push(addr.house_number);
  const road = addr.road || addr.pedestrian || addr.footway || addr.path || "";
  if (road) streetParts.push(road);
  const streetLine = streetParts.join(" ");

  // 3. {neighborhood, if found}, {city}
  const neighborhood = addr.neighbourhood || addr.suburb || addr.quarter || "";
  const city =
    addr.city ||
    addr.town ||
    addr.village ||
    addr.municipality ||
    addr.hamlet ||
    "";
  let neighborhoodCityLine = "";
  if (neighborhood && city) {
    neighborhoodCityLine = `${neighborhood}, ${city}`;
  } else if (city) {
    neighborhoodCityLine = city;
  } else if (neighborhood) {
    neighborhoodCityLine = neighborhood;
  }

  // 4. {county}, {state code}, {zip code}
  const stateVal =
    (addr["ISO3166-2-lvl4"] ? addr["ISO3166-2-lvl4"].split("-")[1] : null) ||
    addr.state_code ||
    addr.state ||
    "";

  let countyStateZipLine = "";
  const parts = [];
  if (addr.county) parts.push(addr.county);
  if (stateVal) parts.push(stateVal);

  if (parts.length > 0 && addr.postcode) {
    countyStateZipLine = `${parts.join(", ")}, ${addr.postcode}`;
  } else if (parts.length > 0) {
    countyStateZipLine = parts.join(", ");
  } else if (addr.postcode) {
    countyStateZipLine = addr.postcode;
  }

  // 5. {country code}
  const countryCode = (addr.country_code || "").toUpperCase();

  const lines = [
    title,
    streetLine,
    neighborhoodCityLine,
    countyStateZipLine,
    countryCode,
  ].filter((line) => line.trim().length > 0);

  if (lines.length === 0) {
    return {
      html: `<div>${data.display_name || fallbackLabel}</div>`,
      plainText: data.display_name || fallbackLabel,
      singleLine: data.display_name || fallbackLabel,
    };
  }

  return {
    html: lines
      .map((line, idx) => {
        if (idx === 0 && title) {
          return `<div class="popup-title"><strong>${line}</strong></div>`;
        }
        return `<div class="popup-line">${line}</div>`;
      })
      .join(""),
    plainText: lines.join("\n"),
    singleLine: lines.join(", "),
  };
}

// Helper: Factory to create standard popup DOM with embed toggle
function createPopupContent(addressHtml, copyText, lat, lon) {
  const container = document.createElement("div");
  container.className = "share-popup";
  container.innerHTML = `
    <div class="popup-address">${addressHtml}</div>
    <div class="popup-actions">
      <button type="button" class="btn-action copy-addr-btn">
        <span class="material-symbols-outlined">content_copy</span>
        <span>Copy Address</span>
      </button>
      <div class="popup-share-row">
        <button type="button" class="btn-action copy-link-btn">
          <span class="material-symbols-outlined">link</span>
          <span>Copy Direct Link</span>
        </button>
        <label class="embed-toggle-label" title="Generate embed link with zoom 17 and hidden controls">
          <input type="checkbox" class="embed-checkbox" ${isEmbedded ? "checked" : ""} />
          <span>Embed</span>
        </label>
      </div>
    </div>
  `;

  // Copy Address
  const copyAddrBtn = container.querySelector(".copy-addr-btn");
  copyAddrBtn.addEventListener("click", () => {
    navigator.clipboard.writeText(copyText).then(() => {
      copyAddrBtn.innerHTML = `
        <span class="material-symbols-outlined">check</span>
        <span>Address Copied!</span>
      `;
      setTimeout(() => {
        copyAddrBtn.innerHTML = `
          <span class="material-symbols-outlined">content_copy</span>
          <span>Copy Address</span>
        `;
      }, 2000);
    });
  });

  // Copy Direct Link (reads the embed checkbox state)
  const copyLinkBtn = container.querySelector(".copy-link-btn");
  const embedCheckbox = container.querySelector(".embed-checkbox");

  copyLinkBtn.addEventListener("click", () => {
    const shouldEmbed = embedCheckbox.checked;
    const targetZoom = shouldEmbed ? EMBED_ZOOM : map.getZoom();
    const liveUrl = buildHashUrl(lat, lon, targetZoom, shouldEmbed);

    navigator.clipboard.writeText(liveUrl).then(() => {
      copyLinkBtn.innerHTML = `
        <span class="material-symbols-outlined">check</span>
        <span>${shouldEmbed ? "Embed Link Copied!" : "Link Copied!"}</span>
      `;
      setTimeout(() => {
        copyLinkBtn.innerHTML = `
          <span class="material-symbols-outlined">link</span>
          <span>Copy Direct Link</span>
        `;
      }, 2000);
    });
  });

  return container;
}

// Helper: Place/move marker, update popup, hash URL, and search input
function setLocationMarker(lat, lon, formattedData, targetZoom = null) {
  removeInitialLocation();

  if (searchMarker) {
    map.removeLayer(searchMarker);
  }

  currentCoords = { lat, lon };
  const zoomLevel = isEmbedded
    ? DEFAULT_ZOOM
    : targetZoom !== null
      ? targetZoom
      : map.getZoom() || DEFAULT_ZOOM;
  const shareUrl = buildHashUrl(lat, lon, zoomLevel, isEmbedded);

  const addressHtml =
    typeof formattedData === "object"
      ? formattedData.html
      : `<div>${formattedData}</div>`;
  const copyText =
    typeof formattedData === "object" ? formattedData.plainText : formattedData;
  const inputBarText =
    typeof formattedData === "object"
      ? formattedData.singleLine
      : formattedData;

  const popupContent = createPopupContent(addressHtml, copyText, lat, lon);

  searchMarker = L.marker([lat, lon]).addTo(map).bindPopup(popupContent);

  searchMarker.on("click", () => {
    if (!isEmbedded) {
      const maxZoom = map.getMaxZoom();
      map.flyTo([lat, lon], maxZoom, { duration: 1.0 });
    }
    searchMarker.openPopup();
  });

  if (targetZoom !== null && !isEmbedded) {
    map.flyTo([lat, lon], targetZoom, { duration: 1.0 });
  }

  // Always keep popup open
  searchMarker.openPopup();

  if (!isEmbedded) {
    input.value = inputBarText;
    autoResizeSearch(inputBarText);
    clearBtn.style.display = "block";
  }

  window.history.replaceState(null, "", shareUrl);
}

// Keep zoom updated in hash URL and update the slider thumb
map.on("zoomend", () => {
  syncSliderWithMap();
  if (currentCoords) {
    const liveUrl = buildHashUrl(
      currentCoords.lat,
      currentCoords.lon,
      map.getZoom(),
      isEmbedded,
    );
    window.history.replaceState(null, "", liveUrl);
  }
});

// Helper: Go to GPS Location and Update Everything
function navigateToCurrentLocation(lat, lon) {
  showLoader("Finding your address...");
  const maxZoom = isEmbedded ? DEFAULT_ZOOM : map.getMaxZoom();
  const fallback = `${lat.toFixed(5)}, ${lon.toFixed(5)}`;

  if (searchMarker) {
    map.removeLayer(searchMarker);
    searchMarker = null;
  }
  removeInitialLocation();

  currentCoords = { lat, lon };

  initialMarker = L.marker([lat, lon], { icon: homeIcon }).addTo(map);

  map.flyTo([lat, lon], maxZoom, { duration: 1.2 });
  window.history.replaceState(
    null,
    "",
    buildHashUrl(lat, lon, maxZoom, isEmbedded),
  );
  if (!isEmbedded) clearBtn.style.display = "block";

  fetch(
    `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1`,
  )
    .then((res) => res.json())
    .then((data) => {
      const formatted = formatNominatimAddress(data, fallback);
      if (!isEmbedded) {
        input.value = formatted.singleLine;
        autoResizeSearch(formatted.singleLine);
      }

      const popupContent = createPopupContent(
        formatted.html,
        formatted.plainText,
        lat,
        lon,
      );
      initialMarker.bindPopup(popupContent).openPopup();
    })
    .catch((err) => {
      console.warn("Reverse geocoding current location failed:", err);
      if (!isEmbedded) {
        input.value = fallback;
        autoResizeSearch(fallback);
      }
      initialMarker
        .bindPopup(`<strong>Your Location</strong><br>${fallback}`)
        .openPopup();
    })
    .finally(() => {
      hideLoader();
    });
}

// 3. Zoom Controls & Slider Handlers
if (!isEmbedded) {
  document
    .getElementById("zoom-in-btn")
    .addEventListener("click", () => map.zoomIn());
  document
    .getElementById("zoom-out-btn")
    .addEventListener("click", () => map.zoomOut());

  zoomSlider.addEventListener("input", (e) => {
    map.setZoom(parseInt(e.target.value, 10));
  });

  document.getElementById("zoom-reset-btn").addEventListener("click", () => {
    if (currentCoords) {
      map.setView([currentCoords.lat, currentCoords.lon], DEFAULT_ZOOM);
    } else if (userCoordinates) {
      map.setView(userCoordinates.latlng, DEFAULT_ZOOM);
    } else {
      map.setZoom(DEFAULT_ZOOM);
    }
  });

  document.getElementById("locate-btn").addEventListener("click", () => {
    if (userCoordinates) {
      navigateToCurrentLocation(
        userCoordinates.latlng.lat,
        userCoordinates.latlng.lng,
      );
    } else {
      showLoader("Acquiring GPS signal...");
      map.locate({ setView: false, maxZoom: map.getMaxZoom() });
      map.once("locationfound", (e) => {
        userCoordinates = e;
        navigateToCurrentLocation(e.latlng.lat, e.latlng.lng);
      });
      map.once("locationerror", (err) => {
        hideLoader();
        alert(`Unable to retrieve your current location: ${err.message}`);
      });
    }
  });
}

// 4. Click-on-Map Listener
map.on("click", async (e) => {
  if (isEmbedded) return;

  const { lat, lng } = e.latlng;
  const maxZoom = map.getMaxZoom();
  const fallbackLabel = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;

  showLoader("Resolving address...");
  setLocationMarker(lat, lng, fallbackLabel, maxZoom);

  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    const formatted = formatNominatimAddress(data, fallbackLabel);
    setLocationMarker(lat, lng, formatted, null);
  } catch (err) {
    console.warn("Reverse geocoding failed; keeping coordinates:", err);
  } finally {
    hideLoader();
  }
});

// 5. Input & Clear Controls
const form = document.getElementById("search-form");
const input = document.getElementById("address-input");
const clearBtn = document.getElementById("clear-btn");

if (!isEmbedded) {
  input.addEventListener("input", () => {
    const val = input.value;
    clearBtn.style.display = val.trim().length > 0 ? "block" : "none";
    autoResizeSearch(val);
  });

  clearBtn.addEventListener("click", () => {
    input.value = "";
    clearBtn.style.display = "none";
    autoResizeSearch("");

    if (searchMarker) {
      map.removeLayer(searchMarker);
      searchMarker = null;
    }
    currentCoords = null;

    window.history.replaceState(null, "", window.location.pathname);

    if (userCoordinates && !initialMarker) {
      initialMarker = L.marker(userCoordinates.latlng, { icon: homeIcon })
        .addTo(map)
        .bindPopup(`Your Location`);
      map.panTo(userCoordinates.latlng);
    }

    input.focus();
  });

  window.addEventListener("resize", () => {
    autoResizeSearch(input.value);
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const query = input.value.trim();
    if (!query) return;

    showLoader("Searching address...");
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&addressdetails=1`;

    try {
      const response = await fetch(url);
      const results = await response.json();

      if (!results || results.length === 0) {
        hideLoader();
        alert("Address not found. Please try a more specific search.");
        return;
      }

      const first = results[0];
      const lat = parseFloat(first.lat);
      const lon = parseFloat(first.lon);

      const formatted = formatNominatimAddress(first, first.display_name);
      setLocationMarker(lat, lon, formatted, DEFAULT_ZOOM);
    } catch (error) {
      console.error("Geocoding error:", error);
      alert("Unable to search address.");
    } finally {
      hideLoader();
    }
  });
}

// 6. Initial Load Handling
function parseHashParams() {
  const rawHash = window.location.hash.replace(/^#\/?/, "");
  const parts = rawHash.split("/").filter(Boolean);

  if (parts.length >= 2) {
    const lat = parseFloat(parts[0]);
    const lon = parseFloat(parts[1]);
    const zoom = isEmbedded
      ? DEFAULT_ZOOM
      : parseInt(parts[2], 10) || DEFAULT_ZOOM;
    if (!isNaN(lat) && !isNaN(lon)) {
      return { lat, lon, zoom };
    }
  }
  return null;
}

const initialSettings = parseHashParams();

if (initialSettings) {
  showLoader("Loading shared map...");
  map.setView(
    [initialSettings.lat, initialSettings.lon],
    isEmbedded ? DEFAULT_ZOOM : initialSettings.zoom,
  );

  const fallback = `${initialSettings.lat.toFixed(5)}, ${initialSettings.lon.toFixed(5)}`;
  setLocationMarker(initialSettings.lat, initialSettings.lon, fallback, null);

  fetch(
    `https://nominatim.openstreetmap.org/reverse?format=json&lat=${initialSettings.lat}&lon=${initialSettings.lon}&addressdetails=1`,
  )
    .then((res) => res.json())
    .then((data) => {
      const formatted = formatNominatimAddress(data, fallback);
      setLocationMarker(
        initialSettings.lat,
        initialSettings.lon,
        formatted,
        null,
      );
    })
    .catch((err) => {
      console.warn("Reverse geocoding initial hash failed:", err);
      setLocationMarker(
        initialSettings.lat,
        initialSettings.lon,
        fallback,
        null,
      );
    })
    .finally(() => {
      revealMap();
    });
} else {
  showLoader("Locating...");
  map.locate({ setView: true, maxZoom: DEFAULT_ZOOM });

  map.on("locationfound", (e) => {
    userCoordinates = e;
    initialMarker = L.marker(e.latlng, { icon: homeIcon })
      .addTo(map)
      .bindPopup(`Your Location`)
      .openPopup();
    revealMap();
  });

  map.on("locationerror", (e) => {
    console.warn("Geolocation error:", e.message);
    map.setView([20, 0], 2);
    revealMap();
  });
}
