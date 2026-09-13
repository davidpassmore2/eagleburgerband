"use client";

import React, { useEffect, useRef, useState, useSyncExternalStore } from "react";
import "leaflet/dist/leaflet.css";
import { MapPin, Navigation, ExternalLink, Check, Copy } from "lucide-react";

interface EventVenueMapProps {
  venue: string;
  address?: string;
  city: string;
  coordinates?: { lat: number; lng: number };
  showExternalDirections?: boolean;
  className?: string;
}

// Known Pittsburgh landmark and neighborhood coordinate mapping to provide accurate pins if specific coords weren't set
const KNOWN_PITTSBURGH_VENUES: Record<string, [number, number]> = {
  "mattress factory": [40.4572, -80.0125],
  "sampsonia": [40.4572, -80.0125],
  "mexican war streets": [40.4566, -80.0094],
  "allegheny": [40.4566, -80.0094],
  "north side": [40.4533, -80.0076],
  "pnc park": [40.4469, -80.0057],
  "acrisure": [40.4468, -80.0158],
  "point state park": [40.4417, -80.0076],
  "market square": [40.4404, -80.0026],
  "highmark stadium": [40.4357, -80.0079],
  "station square": [40.4344, -80.0033],
  "south side": [40.4287, -79.9868],
  "carson": [40.4287, -79.9868],
  "strip district": [40.4514, -79.9837],
  "penn ave": [40.4650, -79.9540],
  "45th": [40.4650, -79.9540],
  "43rd": [40.4705, -79.9602],
  "butler": [40.4705, -79.9602],
  "lawrenceville": [40.4705, -79.9602],
  "bloomfield": [40.4633, -79.9482],
  "liberty": [40.4610, -79.9490],
  "cedarville": [40.4610, -79.9490],
  "garfield": [40.4650, -79.9420],
  "east liberty": [40.4623, -79.9255],
  "highland park": [40.4735, -79.9140],
  "shadyside": [40.4518, -79.9338],
  "oakland": [40.4444, -79.9532],
  "schenley": [40.4435, -79.9525],
  "carnegie mellon": [40.4432, -79.9428],
  "cmu": [40.4432, -79.9428],
  "pitt": [40.4444, -79.9532],
  "squirrel hill": [40.4381, -79.9231],
  "dormont": [40.3953, -80.0384],
  "mt lebanon": [40.3734, -80.0520],
  "millvale": [40.4812, -79.9751],
  "grant ave": [40.4812, -79.9751],
  "north ave": [40.4812, -79.9751],
  "porchfest": [40.4650, -79.9540],
};

export default function EventVenueMap({
  venue,
  address,
  city,
  coordinates,
  showExternalDirections = true,
  className = "",
}: EventVenueMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<unknown>(null);
  const [copied, setCopied] = useState(false);
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  // Determine latitude & longitude using location clues and landmark dictionary
  const locationClues = `${venue || ""} ${address || ""} ${city || ""}`.toLowerCase();
  let resolvedLat = coordinates?.lat || 40.4406;
  let resolvedLng = coordinates?.lng || -79.9959;

  let hasExactCoords = Boolean(
    coordinates &&
    !(coordinates.lat === 40.4406 && coordinates.lng === -79.9959)
  );

  if (!hasExactCoords) {
    for (const [key, coords] of Object.entries(KNOWN_PITTSBURGH_VENUES)) {
      if (locationClues.includes(key)) {
        resolvedLat = coords[0];
        resolvedLng = coords[1];
        hasExactCoords = true;
        break;
      }
    }
  }

  useEffect(() => {
    if (!mounted || !mapContainerRef.current) return;

    let isCancelled = false;
    let timer1: ReturnType<typeof setTimeout> | undefined;
    let timer2: ReturnType<typeof setTimeout> | undefined;
    let timer3: ReturnType<typeof setTimeout> | undefined;

    // Dynamically import Leaflet on client
    import("leaflet").then((L) => {
      if (isCancelled || !mapContainerRef.current) return;

      // Clean up previous map instance if any
      if (mapInstanceRef.current) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (mapInstanceRef.current as any).remove();
        mapInstanceRef.current = null;
      }

      // Initialize Leaflet Map
      const map = L.map(mapContainerRef.current, {
        center: [resolvedLat, resolvedLng],
        zoom: 15,
        scrollWheelZoom: false,
      });

      mapInstanceRef.current = map;

      // Add OpenStreetMap Tile Layer
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      // Custom Yellow/Brass SVG Pin Marker
      const customPin = L.divIcon({
        className: "leaflet-custom-marker-pin",
        html: `
          <div style="
            display: flex;
            align-items: center;
            justify-content: center;
            width: 38px;
            height: 38px;
            background: #facc15;
            border: 3px solid #020617;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            box-shadow: 0 4px 14px rgba(0, 0, 0, 0.4);
            cursor: pointer;
          ">
            <div style="
              width: 14px;
              height: 14px;
              background: #020617;
              border-radius: 50%;
              transform: rotate(45deg);
            "></div>
          </div>
        `,
        iconSize: [38, 38],
        iconAnchor: [19, 38],
        popupAnchor: [0, -38],
      });

      // Marker and Popup
      const marker = L.marker([resolvedLat, resolvedLng], { icon: customPin }).addTo(map);
      marker.bindPopup(
        `
        <div style="font-family: sans-serif; padding: 4px; max-width: 220px;">
          <strong style="font-size: 13px; color: #0f172a; display: block; margin-bottom: 2px;">${venue}</strong>
          <span style="font-size: 11px; color: #475569; display: block;">${address ? address + ", " : ""}${city}</span>
        </div>
        `
      );

      // Invalidate size in stages to ensure container dimensions are calculated and tiles align
      timer1 = setTimeout(() => {
        if (!isCancelled && mapInstanceRef.current) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (mapInstanceRef.current as any).invalidateSize();
        }
      }, 100);

      timer2 = setTimeout(() => {
        if (!isCancelled && mapInstanceRef.current) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (mapInstanceRef.current as any).invalidateSize();
        }
      }, 400);

      timer3 = setTimeout(() => {
        if (!isCancelled && mapInstanceRef.current) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (mapInstanceRef.current as any).invalidateSize();
        }
      }, 1000);

      // Nominatim background lookup if no exact match
      if (!hasExactCoords && (address || venue)) {
        const queryStr = address ? `${address}, ${city}` : `${venue}, ${city}`;
        fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(queryStr)}&limit=1`, {
          headers: { "Accept-Language": "en" },
        })
          .then((res) => res.json())
          .then((results) => {
            if (!isCancelled && results && results.length > 0 && mapInstanceRef.current) {
              const lat = parseFloat(results[0].lat);
              const lon = parseFloat(results[0].lon);
              if (!isNaN(lat) && !isNaN(lon)) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const m = mapInstanceRef.current as any;
                m.setView([lat, lon], 15);
                marker.setLatLng([lat, lon]);
                m.invalidateSize();
              }
            }
          })
          .catch(() => {
            // Non-blocking fallback
          });
      }
    });

    const handleResize = () => {
      if (mapInstanceRef.current) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (mapInstanceRef.current as any).invalidateSize();
      }
    };
    window.addEventListener("resize", handleResize);

    return () => {
      isCancelled = true;
      if (timer1) clearTimeout(timer1);
      if (timer2) clearTimeout(timer2);
      if (timer3) clearTimeout(timer3);
      window.removeEventListener("resize", handleResize);
      if (mapInstanceRef.current) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (mapInstanceRef.current as any).remove();
        mapInstanceRef.current = null;
      }
    };
  }, [mounted, resolvedLat, resolvedLng, venue, address, city, hasExactCoords]);

  const fullSearchAddress = [venue, address, city].filter(Boolean).join(", ");
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullSearchAddress)}`;
  const appleMapsUrl = `https://maps.apple.com/?q=${encodeURIComponent(fullSearchAddress)}`;

  const handleCopyAddress = () => {
    navigator.clipboard.writeText(fullSearchAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div
      className={`bg-slate-900/80 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl ${className}`}
    >
      {/* Map Header Card */}
      <div className="p-5 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-950/60">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-yellow-400/10 border border-yellow-400/30 text-yellow-400 flex items-center justify-center shrink-0 mt-0.5">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-yellow-400">
              OpenStreetMap Venue Location
            </span>
            <h4 className="text-base font-black text-white uppercase tracking-tight">
              {venue}
            </h4>
            <p className="text-xs text-slate-400 font-medium">
              {address ? `${address}, ` : ""}{city}
            </p>
          </div>
        </div>

        {/* Copy Address Quick Action */}
        <button
          type="button"
          onClick={handleCopyAddress}
          className="inline-flex items-center gap-1.5 self-start sm:self-center px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400">Copied to Clipboard!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5 text-slate-400" />
              <span>Copy Address</span>
            </>
          )}
        </button>
      </div>

      {/* Leaflet Map Canvas */}
      <div className="relative w-full h-72 sm:h-80 bg-slate-950">
        {!mounted && (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-slate-500 font-mono animate-pulse">
            Initializing OpenStreetMap...
          </div>
        )}
        <div ref={mapContainerRef} className="w-full h-full z-10" />
      </div>

      {/* Toggleable 1-Click External Navigation Directions */}
      {showExternalDirections && (
        <div className="p-4 sm:p-5 bg-slate-950/80 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
            <Navigation className="w-4 h-4 text-yellow-400 shrink-0" />
            <span>1-Click Navigation:</span>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-black px-4 py-2 rounded-xl text-xs uppercase tracking-wider transition shadow-md shadow-yellow-400/10"
            >
              <span>Open in Google Maps</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>

            <a
              href={appleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white font-bold px-4 py-2 rounded-xl text-xs uppercase tracking-wider transition"
            >
              <span>Open in Apple Maps</span>
              <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

