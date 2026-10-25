import { db } from "./db";

export function milesBetween(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 3958.8;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export const normalizeZip = (zip: string) => zip.trim().slice(0, 5);

/**
 * Resolves a US ZIP code to its centroid. Results are cached in the ZipGeo table;
 * misses are looked up from the free zippopotam.us API.
 */
export async function geocodeZip(rawZip: string): Promise<{ lat: number; lng: number } | null> {
  const zip = normalizeZip(rawZip);
  if (!/^\d{5}$/.test(zip)) return null;
  const cached = await db.zipGeo.findUnique({ where: { zip } });
  if (cached) return { lat: cached.lat, lng: cached.lng };
  try {
    const res = await fetch(`https://api.zippopotam.us/us/${zip}`, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      places?: { latitude: string; longitude: string; "place name": string; "state abbreviation": string }[];
    };
    const place = data.places?.[0];
    if (!place) return null;
    const row = {
      zip,
      lat: parseFloat(place.latitude),
      lng: parseFloat(place.longitude),
      city: place["place name"],
      state: place["state abbreviation"],
    };
    await db.zipGeo.upsert({ where: { zip }, update: row, create: row });
    return { lat: row.lat, lng: row.lng };
  } catch {
    return null;
  }
}

/** True when a sidekick covers a location, either by explicit ZIP list or by radius from their base. */
export function coversLocation(
  sk: { serviceZips: string[]; baseLat: number | null; baseLng: number | null; serviceRadiusMiles: number },
  zip: string,
  point: { lat: number; lng: number } | null,
) {
  if (sk.serviceZips.includes(normalizeZip(zip))) return true;
  if (point && sk.baseLat != null && sk.baseLng != null) {
    return milesBetween(point, { lat: sk.baseLat, lng: sk.baseLng }) <= sk.serviceRadiusMiles;
  }
  return false;
}
