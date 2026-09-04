const DEFAULT_ZOOM = 16;

// 1. Initialize map (disabled native zoomControl to use custom widget)
const map = L.map("map", { zoomControl: false });

// 2. Add tile layer
L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
}).addTo(map);

// Define Home Icon using inline SVG via Leaflet divIcon
const homeIcon = L.divIcon({
  className: "custom-home-icon",
  html: `
    <div style="
      background-color: #0078d4;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 6px rgba(0,0,0,0.35);
      border: 2px solid #ffffff;
    ">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="#ffffff">
        <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
      </svg>
    </div>
  `,
  iconSize: [36, 36],
  iconAnchor: [18, 18],
  popupAnchor: [0, -20],
});

let initialMarker = null;
let initialCircle = null;
let searchMarker = null;
let userCoordinates = null;
let currentCoords = null; // Stores currently pinned lat/lon

// Helper: Reveal UI once location resolution finishes
function revealMap() {
  const loader = document.getElementById("initial-loader");
  const mapElement = document.getElementById("map");
  const formElement = document.getElementById("search-form");

  if (loader) loader.classList.add("hidden");
  mapElement.classList.add("ready");
  formElement.classList.add("ready");
  map.invalidateSize();
}

function removeInitialLocation() {
  if (initialMarker) {
    map.removeLayer(initialMarker);
    initialMarker = null;
  }
  if (initialCircle) {
    map.removeLayer(initialCircle);
    initialCircle = null;
  }
}

// Dynamic Search Bar Resizer
const measureCanvas = document.createElement("canvas");
const measureCtx = measureCanvas.getContext("2d");

function autoResizeSearch(text) {
  // Use Solway for accurate width measurement
  measureCtx.font = '15px "Solway", serif';
  const textWidth = measureCtx.measureText(text || '').width;
  const computedWidth = Math.ceil(textWidth + 160);

  const minWidth = 400;
  const maxWidth = Math.floor(window.innerWidth * 0.85);
  const targetWidth = Math.min(Math.max(computedWidth, minWidth), maxWidth);

  form.style.width = `${targetWidth}px`;
}

// Generate permalink using query parameters
function buildShareUrl(lat, lon, zoom) {
  const url = new URL(window.location.origin + window.location.pathname);
  url.searchParams.set("lat", lat.toFixed(5));
  url.searchParams.set("lon", lon.toFixed(5));
  url.searchParams.set("zoom", zoom);
  return url.toString();
}

// Helper: Place/move marker, update popup, URL query params, and input
function setLocationMarker(lat, lon, label, panTo = true) {
  removeInitialLocation();

  if (searchMarker) {
    map.removeLayer(searchMarker);
  }

  currentCoords = { lat, lon };
  const currentZoom = map.getZoom() || DEFAULT_ZOOM;
  const shareUrl = buildShareUrl(lat, lon, currentZoom);

  const popupContent = document.createElement("div");
  popupContent.className = "share-popup";
  popupContent.innerHTML = `
    <div class="popup-address"><strong>${label}</strong></div>
    <div class="popup-actions">
      <button type="button" class="btn-action copy-addr-btn">📄 Copy Address</button>
      <button type="button" class="btn-action copy-link-btn">🔗 Copy Direct Link</button>
    </div>
  `;

  // Copy Address
  const copyAddrBtn = popupContent.querySelector(".copy-addr-btn");
  copyAddrBtn.addEventListener("click", () => {
    navigator.clipboard.writeText(label).then(() => {
      copyAddrBtn.innerText = "✅ Address Copied!";
      setTimeout(() => (copyAddrBtn.innerText = "📄 Copy Address"), 2000);
    });
  });

  // Copy Direct Link
  const copyLinkBtn = popupContent.querySelector(".copy-link-btn");
  copyLinkBtn.addEventListener("click", () => {
    // Generate fresh link with live zoom at moment of copy
    const liveUrl = buildShareUrl(lat, lon, map.getZoom());
    navigator.clipboard.writeText(liveUrl).then(() => {
      copyLinkBtn.innerText = "✅ Link Copied!";
      setTimeout(() => (copyLinkBtn.innerText = "🔗 Copy Direct Link"), 2000);
    });
  });

  searchMarker = L.marker([lat, lon])
    .addTo(map)
    .bindPopup(popupContent)
    .openPopup();

  if (panTo) {
    map.panTo([lat, lon]);
  }

  input.value = label;
  autoResizeSearch(label);
  clearBtn.style.display = "block";

  // Sync address bar URL with query params
  window.history.replaceState(null, "", shareUrl);
}

// Keep the URL zoom query parameter up to date when user zooms
map.on("zoomend", () => {
  if (currentCoords) {
    const liveUrl = buildShareUrl(
      currentCoords.lat,
      currentCoords.lon,
      map.getZoom(),
    );
    window.history.replaceState(null, "", liveUrl);
  }
});

// 3. Zoom Controls Utility Handlers
document
  .getElementById("zoom-in-btn")
  .addEventListener("click", () => map.zoomIn());
document
  .getElementById("zoom-out-btn")
  .addEventListener("click", () => map.zoomOut());
document.getElementById("zoom-reset-btn").addEventListener("click", () => {
  if (currentCoords) {
    map.setView([currentCoords.lat, currentCoords.lon], DEFAULT_ZOOM);
  } else if (userCoordinates) {
    map.setView(userCoordinates.latlng, DEFAULT_ZOOM);
  } else {
    map.setZoom(DEFAULT_ZOOM);
  }
});

// 4. Click-on-Map Listener (Reverse Geocoding)
map.on("click", async (e) => {
  const { lat, lng } = e.latlng;
  const fallbackLabel = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;

  setLocationMarker(lat, lng, fallbackLabel, false);

  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    const address = data.display_name || fallbackLabel;
    setLocationMarker(lat, lng, address, false);
  } catch (err) {
    console.warn("Reverse geocoding failed; keeping coordinates:", err);
  }
});

// 5. Input & Clear Controls
const form = document.getElementById("search-form");
const input = document.getElementById("address-input");
const clearBtn = document.getElementById("clear-btn");

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

  // Clear query parameters from URL
  window.history.replaceState(null, "", window.location.pathname);

  if (userCoordinates && !initialMarker) {
    initialMarker = L.marker(userCoordinates.latlng, { icon: homeIcon })
      .addTo(map)
      .bindPopup(
        `Your Location (within ${Math.round(userCoordinates.accuracy)} meters)`,
      );
    initialCircle = L.circle(
      userCoordinates.latlng,
      userCoordinates.accuracy,
    ).addTo(map);
    map.panTo(userCoordinates.latlng);
  }

  input.focus();
});

window.addEventListener("resize", () => {
  autoResizeSearch(input.value);
});

// 6. Search Form Submission
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const query = input.value.trim();
  if (!query) return;

  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`;

  try {
    const response = await fetch(url);
    const results = await response.json();

    if (!results || results.length === 0) {
      alert("Address not found. Please try a more specific search.");
      return;
    }

    const first = results[0];
    const lat = parseFloat(first.lat);
    const lon = parseFloat(first.lon);

    map.flyTo([lat, lon], DEFAULT_ZOOM, { duration: 1.5 });
    setLocationMarker(lat, lon, first.display_name, false);
  } catch (error) {
    console.error("Geocoding error:", error);
    alert("Unable to search address.");
  }
});

// 7. Initial Load Handling: Read Query Parameters
const urlParams = new URLSearchParams(window.location.search);
const qLat = parseFloat(urlParams.get("lat"));
const qLon = parseFloat(urlParams.get("lon"));
const qZoom = parseInt(urlParams.get("zoom"), 10) || DEFAULT_ZOOM;

if (!isNaN(qLat) && !isNaN(qLon)) {
  // Shared Query Parameter URL loaded
  map.setView([qLat, qLon], qZoom);

  fetch(
    `https://nominatim.openstreetmap.org/reverse?format=json&lat=${qLat}&lon=${qLon}`,
  )
    .then((res) => res.json())
    .then((data) => {
      const derivedAddress =
        data && data.display_name
          ? data.display_name
          : `${qLat.toFixed(5)}, ${qLon.toFixed(5)}`;
      setLocationMarker(qLat, qLon, derivedAddress, false);
    })
    .catch((err) => {
      console.warn("Reverse geocoding initial URL failed:", err);
      setLocationMarker(
        qLat,
        qLon,
        `${qLat.toFixed(5)}, ${qLon.toFixed(5)}`,
        false,
      );
    })
    .finally(() => {
      revealMap();
    });
} else {
  // GPS Mode: locate user and assign default zoom
  map.locate({ setView: true, maxZoom: DEFAULT_ZOOM });

  map.on("locationfound", (e) => {
    userCoordinates = e;
    initialMarker = L.marker(e.latlng, { icon: homeIcon })
      .addTo(map)
      .bindPopup(`Your Location (within ${Math.round(e.accuracy)} meters)`)
      .openPopup();
    initialCircle = L.circle(e.latlng, e.accuracy).addTo(map);
    revealMap();
  });

  map.on("locationerror", (e) => {
    console.warn("Geolocation error:", e.message);
    map.setView([20, 0], 2);
    revealMap();
  });
}
