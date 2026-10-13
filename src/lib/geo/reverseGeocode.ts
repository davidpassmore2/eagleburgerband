export interface ReverseGeocodeResult {
  name?: string;
  streetAddress: string;
  neighborhood: string;
  city: string;
  state: string;
  postcode: string;
  fullAddress: string;
}

/**
 * Free Reverse Geocoding Utility using OpenStreetMap Nominatim via cached proxy route.
 * Normalizes latitude and longitude coordinates into structured street address, neighborhood, and city.
 * Does not require any API keys.
 */
export async function reverseGeocodeCoordinates(
  lat: number,
  lng: number
): Promise<ReverseGeocodeResult | null> {
  try {
    const res = await fetch(`/api/geo/reverse?lat=${lat}&lng=${lng}`);
    if (!res.ok) return null;
    return (await res.json()) as ReverseGeocodeResult;
  } catch (err) {
    console.warn("Reverse geocode request failed:", err);
    return null;
  }
}

