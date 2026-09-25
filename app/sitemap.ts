import type { MetadataRoute } from "next";
import { cacheLife, cacheTag } from "next/cache";
import { getActivePlaces, getPlaceFreshness } from "@/src/corpus/queries";
import { SITE_URL } from "@/src/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  "use cache";
  cacheTag("corpus");
  cacheLife("hours");
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
