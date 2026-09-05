const DEFAULT_ZOOM = 16;

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
let initialCircle = null;
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
  formElement.classList.add("ready");
  map.invalidateSize();
  syncSliderWithMap();
}

// Helper: Build hash path URL: {origin}{pathname}#/{lat}/{lon}/{zoom}
function buildHashUrl(lat, lon, zoom) {
  const cleanLat = lat.toFixed(5);
  const cleanLon = lon.toFixed(5);
  const cleanZoom = Math.round(zoom);
  const base = `${window.location.origin}${window.location.pathname}`;
  return `${base}#/${cleanLat}/${cleanLon}/${cleanZoom}`;
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

function syncSliderWithMap() {
  if (zoomSlider) {
    zoomSlider.value = Math.round(map.getZoom());
  }
}

// Dynamic Search Bar Resizer using Solway font metrics
const measureCanvas = document.createElement("canvas");
const measureCtx = measureCanvas.getContext("2d");

function autoResizeSearch(text) {
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

// Helper: Place/move marker, update popup, hash URL, and search input
function setLocationMarker(lat, lon, formattedData, targetZoom = null) {
  removeInitialLocation();

  if (searchMarker) {
    map.removeLayer(searchMarker);
  }

  currentCoords = { lat, lon };
  const zoomLevel =
    targetZoom !== null ? targetZoom : map.getZoom() || DEFAULT_ZOOM;
  const shareUrl = buildHashUrl(lat, lon, zoomLevel);

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

  const popupContent = document.createElement("div");
  popupContent.className = "share-popup";
  popupContent.innerHTML = `
    <div class="popup-address">${addressHtml}</div>
    <div class="popup-actions">
      <button type="button" class="btn-action copy-addr-btn">
        <span class="material-symbols-outlined">content_copy</span>
        <span>Copy Address</span>
      </button>
      <button type="button" class="btn-action copy-link-btn">
        <span class="material-symbols-outlined">link</span>
        <span>Copy Direct Link</span>
      </button>
    </div>
  `;

  popupContent.querySelector(".copy-addr-btn").addEventListener("click", () => {
    navigator.clipboard.writeText(copyText).then(() => {
      const btn = popupContent.querySelector(".copy-addr-btn");
      btn.innerHTML = `
        <span class="material-symbols-outlined">check</span>
        <span>Address Copied!</span>
      `;
      setTimeout(() => {
        btn.innerHTML = `
          <span class="material-symbols-outlined">content_copy</span>
          <span>Copy Address</span>
        `;
      }, 2000);
    });
  });

  popupContent.querySelector(".copy-link-btn").addEventListener("click", () => {
    const liveUrl = buildHashUrl(lat, lon, map.getZoom());
    navigator.clipboard.writeText(liveUrl).then(() => {
      const btn = popupContent.querySelector(".copy-link-btn");
      btn.innerHTML = `
        <span class="material-symbols-outlined">check</span>
        <span>Link Copied!</span>
      `;
      setTimeout(() => {
        btn.innerHTML = `
          <span class="material-symbols-outlined">link</span>
          <span>Copy Direct Link</span>
        `;
      }, 2000);
    });
  });

  searchMarker = L.marker([lat, lon]).addTo(map).bindPopup(popupContent);

  searchMarker.on("click", () => {
    const maxZoom = map.getMaxZoom();
    map.flyTo([lat, lon], maxZoom, { duration: 1.0 });
    searchMarker.openPopup();
  });

  if (targetZoom !== null) {
    map.flyTo([lat, lon], targetZoom, { duration: 1.0 });
  }

  searchMarker.openPopup();

  input.value = inputBarText;
  autoResizeSearch(inputBarText);
  clearBtn.style.display = "block";

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
    );
    window.history.replaceState(null, "", liveUrl);
  }
});

// Helper: Go to GPS Location and Update Everything
function navigateToCurrentLocation(lat, lon, accuracy) {
  showLoader("Finding your address...");
  const maxZoom = map.getMaxZoom();
  const fallback = `${lat.toFixed(5)}, ${lon.toFixed(5)}`;

  if (searchMarker) {
    map.removeLayer(searchMarker);
    searchMarker = null;
  }
  removeInitialLocation();

  currentCoords = { lat, lon };

  initialMarker = L.marker([lat, lon], { icon: homeIcon }).addTo(map);
  if (accuracy) {
    initialCircle = L.circle([lat, lon], accuracy).addTo(map);
  }

  map.flyTo([lat, lon], maxZoom, { duration: 1.2 });
  window.history.replaceState(null, "", buildHashUrl(lat, lon, maxZoom));
  clearBtn.style.display = "block";

  fetch(
    `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1`,
  )
    .then((res) => res.json())
    .then((data) => {
      const formatted = formatNominatimAddress(data, fallback);
      input.value = formatted.singleLine;
      autoResizeSearch(formatted.singleLine);

      const popupContent = document.createElement("div");
      popupContent.className = "share-popup";
      popupContent.innerHTML = `
        <div class="popup-address">${formatted.html}</div>
        <div class="popup-actions">
          <button type="button" class="btn-action copy-addr-btn">
            <span class="material-symbols-outlined">content_copy</span>
            <span>Copy Address</span>
          </button>
          <button type="button" class="btn-action copy-link-btn">
            <span class="material-symbols-outlined">link</span>
            <span>Copy Direct Link</span>
          </button>
        </div>
      `;

      popupContent
        .querySelector(".copy-addr-btn")
        .addEventListener("click", (e) => {
          navigator.clipboard.writeText(formatted.plainText).then(() => {
            e.currentTarget.innerHTML = `
            <span class="material-symbols-outlined">check</span>
            <span>Address Copied!</span>
          `;
            setTimeout(() => {
              e.currentTarget.innerHTML = `
              <span class="material-symbols-outlined">content_copy</span>
              <span>Copy Address</span>
            `;
            }, 2000);
          });
        });

      popupContent
        .querySelector(".copy-link-btn")
        .addEventListener("click", (e) => {
          const liveUrl = buildHashUrl(lat, lon, map.getZoom());
          navigator.clipboard.writeText(liveUrl).then(() => {
            e.currentTarget.innerHTML = `
            <span class="material-symbols-outlined">check</span>
            <span>Link Copied!</span>
          `;
            setTimeout(() => {
              e.currentTarget.innerHTML = `
              <span class="material-symbols-outlined">link</span>
              <span>Copy Direct Link</span>
            `;
            }, 2000);
          });
        });

      initialMarker.bindPopup(popupContent).openPopup();
    })
    .catch((err) => {
      console.warn("Reverse geocoding current location failed:", err);
      input.value = fallback;
      autoResizeSearch(fallback);
      initialMarker
        .bindPopup(`<strong>Your Location</strong><br>${fallback}`)
        .openPopup();
    })
    .finally(() => {
      hideLoader();
    });
}

// 3. Zoom Controls & Slider Handlers
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
      userCoordinates.accuracy,
    );
  } else {
    showLoader("Acquiring GPS signal...");
    map.locate({ setView: false, maxZoom: map.getMaxZoom() });
    map.once("locationfound", (e) => {
      userCoordinates = e;
      navigateToCurrentLocation(e.latlng.lat, e.latlng.lng, e.accuracy);
    });
    map.once("locationerror", (err) => {
      hideLoader();
      alert(`Unable to retrieve your current location: ${err.message}`);
    });
  }
});

// 4. Click-on-Map Listener
map.on("click", async (e) => {
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

// 7. Initial Load Handling
function parseHashParams() {
  const rawHash = window.location.hash.replace(/^#\/?/, "");
  const parts = rawHash.split("/").filter(Boolean);

  if (parts.length >= 3) {
    const lat = parseFloat(parts[0]);
    const lon = parseFloat(parts[1]);
    const zoom = parseInt(parts[2], 10);
    if (!isNaN(lat) && !isNaN(lon) && !isNaN(zoom)) {
      return { lat, lon, zoom };
    }
  }
  return null;
}

const initialSettings = parseHashParams();

if (initialSettings) {
  showLoader("Loading shared map...");
  map.setView([initialSettings.lat, initialSettings.lon], initialSettings.zoom);

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
