// 1. Initialize map
const map = L.map('map').setView([0, 0], 2);

// 2. Add tile layer
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

let searchMarker = null;

// Helper: Place marker and build share popup
function setLocationMarker(lat, lon, label) {
  if (searchMarker) {
    map.removeLayer(searchMarker);
  }

  const shareUrl = `${window.location.origin}${window.location.pathname}#${lat.toFixed(5)},${lon.toFixed(5)}`;

  const popupContent = document.createElement('div');
  popupContent.className = 'share-popup';
  popupContent.innerHTML = `
    <strong>${label}</strong>
    <div style="margin-top: 8px;">
      <button type="button" class="copy-link-btn">📋 Copy Direct Link</button>
    </div>
  `;

  const copyBtn = popupContent.querySelector('.copy-link-btn');
  copyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(shareUrl).then(() => {
      copyBtn.innerText = '✅ Link Copied!';
      setTimeout(() => (copyBtn.innerText = '📋 Copy Direct Link'), 2000);
    });
  });

  searchMarker = L.marker([lat, lon])
    .addTo(map)
    .bindPopup(popupContent)
    .openPopup();

  map.flyTo([lat, lon], 16, { duration: 1.5 });
  window.history.replaceState(null, '', `#${lat.toFixed(5)},${lon.toFixed(5)}`);
  
  // Show clear button when a location is mapped
  clearBtn.style.display = 'block';
}

// 3. Search & Clear Controls
const form = document.getElementById('search-form');
const input = document.getElementById('address-input');
const clearBtn = document.getElementById('clear-btn');

// Toggle clear button visibility as the user types
input.addEventListener('input', () => {
  clearBtn.style.display = input.value.trim().length > 0 ? 'block' : 'none';
});

// Clear button logic
clearBtn.addEventListener('click', () => {
  input.value = '';
  clearBtn.style.display = 'none';

  // Remove marker if present
  if (searchMarker) {
    map.removeLayer(searchMarker);
    searchMarker = null;
  }

  // Remove coordinates from the URL
  window.history.replaceState(null, '', window.location.pathname);
  input.focus();
});

// Search submission
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const query = input.value.trim();
  if (!query) return;

  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`;

  try {
    const response = await fetch(url);
    const results = await response.json();

    if (!results || results.length === 0) {
      alert('Address not found. Please try a more specific search.');
      return;
    }

    const first = results[0];
    setLocationMarker(parseFloat(first.lat), parseFloat(first.lon), first.display_name);

  } catch (error) {
    console.error('Geocoding error:', error);
    alert('Unable to search address.');
  }
});

// 4. Initial load handling
const hash = window.location.hash.replace('#', '');
const [hashLat, hashLon] = hash.split(',').map(Number);

if (!isNaN(hashLat) && !isNaN(hashLon)) {
  setLocationMarker(hashLat, hashLon, 'Shared Location');
} else {
  map.locate({ setView: true, maxZoom: 16 });

  map.on('locationfound', (e) => {
    L.marker(e.latlng)
      .addTo(map)
      .bindPopup(`You are within ${Math.round(e.accuracy)} meters of this point`)
      .openPopup();
    L.circle(e.latlng, e.accuracy).addTo(map);
  });
}