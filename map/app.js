// 1. Initialize map
const map = L.map("map");

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

// Helper: Reveal UI once location resolution finishes
function revealMap() {
  const loader = document.getElementById("initial-loader");
  const mapElement = document.getElementById("map");
  const formElement = document.getElementById("search-form");

  if (loader) loader.classList.add("hidden");
  mapElement.classList.add("ready");
  formElement.classList.add("ready");

  // Recalculate container dimensions in case Leaflet rendered while hidden
  map.invalidateSize();
}

// Helper: Remove the initial GPS home marker and accuracy ring
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
  measureCtx.font = "15px sans-serif";
  const textWidth = measureCtx.measureText(text || "").width;
  const computedWidth = Math.ceil(textWidth + 160);

  const minWidth = 400;
  const maxWidth = Math.floor(window.innerWidth * 0.85);
  const targetWidth = Math.min(Math.max(computedWidth, minWidth), maxWidth);

  form.style.width = `${targetWidth}px`;
}

// Helper: Place/move marker, update popup, URL, input, and cleanup initial marker
function setLocationMarker(lat, lon, label, panTo = true) {
  removeInitialLocation();

  if (searchMarker) {
    map.removeLayer(searchMarker);
  }

  const shareUrl = `${window.location.origin}${window.location.pathname}#${lat.toFixed(5)},${lon.toFixed(5)}`;

  const popupContent = document.createElement("div");
  popupContent.className = "share-popup";
  popupContent.innerHTML = `
    <div class="popup-address"><strong>${label}</strong></div>
    <div class="popup-actions">
      <button type="button" class="btn-action copy-addr-btn">📄 Copy Address</button>
      <button type="button" class="btn-action copy-link-btn">🔗 Copy Direct Link</button>
    </div>
  `;

  const copyAddrBtn = popupContent.querySelector(".copy-addr-btn");
  copyAddrBtn.addEventListener("click", () => {
    navigator.clipboard.writeText(label).then(() => {
      copyAddrBtn.innerText = "✅ Address Copied!";
      setTimeout(() => (copyAddrBtn.innerText = "📄 Copy Address"), 2000);
    });
  });

  const copyLinkBtn = popupContent.querySelector(".copy-link-btn");
  copyLinkBtn.addEventListener("click", () => {
    navigator.clipboard.writeText(shareUrl).then(() => {
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
  window.history.replaceState(null, "", `#${lat.toFixed(5)},${lon.toFixed(5)}`);
}

// 3. Click-on-Map Listener (Reverse Geocoding)
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

// 4. Input & Clear Controls
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

// 5. Search Form Submission
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

    map.flyTo([lat, lon], 16, { duration: 1.5 });
    setLocationMarker(lat, lon, first.display_name, false);
  } catch (error) {
    console.error("Geocoding error:", error);
    alert("Unable to search address.");
  }
});

// 6. Initial Load Handling
const hash = window.location.hash.replace("#", "");
const [hashLat, hashLon] = hash.split(",").map(Number);

if (!isNaN(hashLat) && !isNaN(hashLon)) {
  // Shared URL loaded: center the map, look up address, and reveal
  map.setView([hashLat, hashLon], 16);

  fetch(
    `https://nominatim.openstreetmap.org/reverse?format=json&lat=${hashLat}&lon=${hashLon}`,
  )
    .then((res) => res.json())
    .then((data) => {
      const derivedAddress =
        data && data.display_name
          ? data.display_name
          : `${hashLat.toFixed(5)}, ${hashLon.toFixed(5)}`;
      setLocationMarker(hashLat, hashLon, derivedAddress, false);
    })
    .catch((err) => {
      console.warn("Reverse geocoding initial hash failed:", err);
      setLocationMarker(
        hashLat,
        hashLon,
        `${hashLat.toFixed(5)}, ${hashLon.toFixed(5)}`,
        false,
      );
    })
    .finally(() => {
      revealMap();
    });
} else {
  // GPS mode: locate user before revealing map
  map.locate({ setView: true, maxZoom: 16 });

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
    // Fallback: Default to world view if GPS is denied or unavailable
    map.setView([20, 0], 2);
    revealMap();
  });
}
