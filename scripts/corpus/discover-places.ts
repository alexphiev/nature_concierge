import { readdir } from "node:fs/promises";
import { join } from "node:path";
import type { PlaceFileInput } from "../../src/corpus/schema";

const PLACES_DIR = join(import.meta.dirname, "..", "..", "src", "corpus", "places");

export async function discoverPlaceFiles(): Promise<PlaceFileInput[]> {
  const entries = await readdir(PLACES_DIR);
  const files = entries.filter((f) => f.endsWith(".ts"));

  const places: PlaceFileInput[] = [];
  for (const file of files) {
    const mod = await import(join(PLACES_DIR, file));
    if (!mod.default) {
      throw new Error(`${file} has no default export (expected export default definePlace({...}))`);
    }
    places.push(mod.default as PlaceFileInput);
  }
  return places;
}
