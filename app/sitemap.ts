import type { MetadataRoute } from "next";
import { getActivePlaces, getPlaceFreshness } from "@/src/corpus/queries";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const places = await getActivePlaces();

  const placeEntries = await Promise.all(
    places.map(async (place) => ({
      url: `${SITE_URL}/lieux/${place.slug}`,
      lastModified: await getPlaceFreshness(place.id),
    })),
  );

  return [
    { url: SITE_URL, lastModified: new Date() },
    { url: `${SITE_URL}/lieux`, lastModified: new Date() },
    ...placeEntries,
  ];
}
