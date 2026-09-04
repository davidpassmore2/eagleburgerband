// 1. Initialize map with a default fallback view
const map = L.map('map').setView([0, 0], 2);

// 2. Load OpenStreetMap raster tiles
L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
  maxZoom: 20,
  subdomains: 'abcd',
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
}).addTo(map);

// 3. Request user location
map.locate({ setView: true, maxZoom: 16 });

function onLocationFound(e) {
  // Add a marker and open popup at user coordinates
  L.marker(e.latlng)
    .addTo(map)
    .bindPopup(`You are within ${Math.round(e.accuracy)} meters of this point`)
    .openPopup();

  // Draw accuracy circle
  L.circle(e.latlng, e.accuracy).addTo(map);
}

function onLocationError(e) {
  alert(`Unable to retrieve location: ${e.message}`);
}

map.on('locationfound', onLocationFound);
map.on('locationerror', onLocationError);