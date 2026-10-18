export function leafPlaces<T extends { id: string; parentId: string | null }>(places: T[]): T[] {
  const parentIds = new Set(places.map((p) => p.parentId).filter((id) => id !== null));
  return places.filter((p) => !parentIds.has(p.id));
}
