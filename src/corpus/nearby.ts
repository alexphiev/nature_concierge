const EARTH_RADIUS_KM = 6371;

export function distanceKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;

  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function nearbyPlaces<
  T extends { id: string; parentId: string | null; lat: number; lng: number },
>(place: T, candidates: T[], { limit = 4, maxKm = 25 } = {}): { place: T; km: number }[] {
  return candidates
    .filter((candidate) => candidate.id !== place.id)
    .filter((candidate) => candidate.id !== place.parentId)
    .filter((candidate) => candidate.parentId !== place.id)
    .filter((candidate) => !(place.parentId !== null && candidate.parentId === place.parentId))
    .map((candidate) => ({ place: candidate, km: distanceKm(place, candidate) }))
    .filter(({ km }) => km <= maxKm)
    .sort((a, b) => a.km - b.km)
    .slice(0, limit);
}
