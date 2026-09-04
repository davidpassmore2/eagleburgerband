// 1. Initialize map
const map = L.map("map").setView([0, 0], 2);

// 2. Add tile layer
L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
}).addTo(map);

let searchMarker = null;

const form = document.getElementById("search-form");
const input = document.getElementById("address-input");
const clearBtn = document.getElementById("clear-btn");

// Helper: Place/move marker, update popup, URL, and input
function setLocationMarker(lat, lon, label, panTo = true) {
  if (searchMarker) {
    map.removeLayer(searchMarker);
  }

  const shareUrl = `${window.location.origin}${window.location.pathname}#${lat.toFixed(5)},${lon.toFixed(5)}`;

  const popupContent = document.createElement("div");
  popupContent.className = "share-popup";
  popupContent.innerHTML = `
    <strong>${label}</strong>
    <div style="margin-top: 8px;">
      <button type="button" class="copy-link-btn">📋 Copy Direct Link</button>
    </div>
  `;

  const copyBtn = popupContent.querySelector(".copy-link-btn");
  copyBtn.addEventListener("click", () => {
    navigator.clipboard.writeText(shareUrl).then(() => {
      copyBtn.innerText = "✅ Link Copied!";
      setTimeout(() => (copyBtn.innerText = "📋 Copy Direct Link"), 2000);
    });
  });

  searchMarker = L.marker([lat, lon])
    .addTo(map)
    .bindPopup(popupContent)
    .openPopup();

  if (panTo) {
    map.panTo([lat, lon]);
  }

  // Sync input text, clear button, and URL hash
  input.value = label;
  clearBtn.style.display = "block";
  window.history.replaceState(null, "", `#${lat.toFixed(5)},${lon.toFixed(5)}`);
}

// 3. Click-on-Map Listener (Reverse Geocoding)
map.on("click", async (e) => {
  const { lat, lng } = e.latlng;

  // Immediate temporary marker while reverse geocoding completes
  const fallbackLabel = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  setLocationMarker(lat, lng, fallbackLabel, false);

  // Reverse geocode via Nominatim to get readable street address
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
input.addEventListener("input", () => {
  clearBtn.style.display = input.value.trim().length > 0 ? "block" : "none";
});

clearBtn.addEventListener("click", () => {
  input.value = "";
  clearBtn.style.display = "none";

  if (searchMarker) {
    map.removeLayer(searchMarker);
    searchMarker = null;
  }

  window.history.replaceState(null, "", window.location.pathname);
  input.focus();
});

// 5. Search Form Submission (Forward Geocoding)
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
  map.setView([hashLat, hashLon], 16);
  setLocationMarker(
    hashLat,
    hashLon,
    `${hashLat.toFixed(5)}, ${hashLon.toFixed(5)}`,
  );
} else {
  map.locate({ setView: true, maxZoom: 16 });

  map.on("locationfound", (e) => {
    L.marker(e.latlng)
      .addTo(map)
      .bindPopup(
        `You are within ${Math.round(e.accuracy)} meters of this point`,
      )
      .openPopup();
    L.circle(e.latlng, e.accuracy).addTo(map);
  });
}
