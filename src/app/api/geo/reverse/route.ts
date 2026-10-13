import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const QuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
});

// Lightweight in-memory cache to respect OSM rate limits (max 1 req/sec) and optimize repeated queries
const cache = new Map<string, { data: NormalizedAddress; timestamp: number }>();
const CACHE_TTL_MS = 1000 * 60 * 60; // 1 hour

export interface NormalizedAddress {
  name?: string;
  streetAddress: string;
  neighborhood: string;
  city: string;
  state: string;
  postcode: string;
  fullAddress: string;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const parsed = QuerySchema.safeParse({
      lat: searchParams.get("lat"),
      lng: searchParams.get("lng"),
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid coordinates", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { lat, lng } = parsed.data;
    // Cache key rounded to ~10 meters (4 decimals)
    const cacheKey = `${lat.toFixed(4)},${lng.toFixed(4)}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return NextResponse.json(cached.data);
    }

    // Call OpenStreetMap Nominatim Free Reverse Geocoding API (no API key required)
    const osmUrl = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=jsonv2`;

    const res = await fetch(osmUrl, {
      headers: {
        "User-Agent": "EagleburgerBandPortal/1.0 (contact@eagleburgerband.com)",
        Accept: "application/json",
      },
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: "Failed to reverse geocode via OpenStreetMap" },
        { status: res.status }
      );
    }

    const data = await res.json();
    const addr = data.address || {};

    const road = addr.road || addr.pedestrian || addr.cycleway || addr.path || "";
    const houseNumber = addr.house_number || "";
    const streetAddress = houseNumber ? `${houseNumber} ${road}`.trim() : road;
    const neighborhood = addr.neighbourhood || addr.suburb || addr.quarter || "";
    const city = addr.city || addr.town || addr.borough || addr.village || "Pittsburgh";
    const state = addr.state || "PA";
    const postcode = addr.postcode || "";

    const normalized: NormalizedAddress = {
      name: data.name || "",
      streetAddress: streetAddress || road,
      neighborhood,
      city: `${city}, ${state}${postcode ? ` ${postcode}` : ""}`.trim(),
      state,
      postcode,
      fullAddress: data.display_name || "",
    };

    cache.set(cacheKey, { data: normalized, timestamp: Date.now() });

    return NextResponse.json(normalized);
  } catch (err) {
    console.error("GET /api/geo/reverse error:", err);
    return NextResponse.json(
      { error: "Internal geocoding error", message: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

