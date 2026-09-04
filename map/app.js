// 1. Initialize map
const map = L.map("map").setView([0, 0], 2);

// 2. Add tile layer
L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
}).addTo(map);

// 3. User Geolocation (Initial marker)
map.locate({ setView: true, maxZoom: 16 });

map.on("locationfound", (e) => {
  L.marker(e.latlng)
    .addTo(map)
    .bindPopup(`You are within ${Math.round(e.accuracy)} meters of this point`)
    .openPopup();
  L.circle(e.latlng, e.accuracy).addTo(map);
});

map.on("locationerror", (e) => {
  console.warn("Geolocation skipped or denied:", e.message);
});

// 4. Address Search via Nominatim Geocoding
let searchMarker = null;

const form = document.getElementById("search-form");
const input = document.getElementById("address-input");

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

    const firstResult = results[0];
    const lat = parseFloat(firstResult.lat);
    const lon = parseFloat(firstResult.lon);

    // Remove previous search marker if one already exists
    if (searchMarker) {
      map.removeLayer(searchMarker);
    }

    // Place new marker and fly map to coordinates
    searchMarker = L.marker([lat, lon])
      .addTo(map)
      .bindPopup(`<strong>${firstResult.display_name}</strong>`)
      .openPopup();

    map.flyTo([lat, lon], 16, { duration: 1.5 });
  } catch (error) {
    console.error("Geocoding error:", error);
    alert("Unable to search address. Check your network connection.");
  }
});
