import type { Metadata } from "next";
import { Suspense } from "react";
import { getActivePlaces } from "@/src/corpus/queries";
import { getGooglePlaceDetails } from "@/src/corpus/google-places";
import { PlaceCard } from "@/src/components/PlaceCard";
import { LiveStatusPill, StatusPillFallback } from "@/src/components/LiveStatus";
import { SITE_URL, BASE_OPEN_GRAPH } from "@/src/site";

export const metadata: Metadata = {
  title: "Les lieux",
  description:
    "Calanques, plages, massifs et sentiers entre Marseille et Bandol, avec leur statut du jour.",
  alternates: { canonical: "/lieux" },
  openGraph: { ...BASE_OPEN_GRAPH, url: "/lieux" },
};

export default async function PlacesIndexPage() {
  const activePlaces = await getActivePlaces();
  const activeIds = new Set(activePlaces.map((p) => p.id));
  // Spots are listed on their parent's page, unless the parent isn't public.
  const places = activePlaces.filter((p) => !p.parentId || !activeIds.has(p.parentId));

  const cards = await Promise.all(
    places.map(async (place) => {
      const googleDetails = await getGooglePlaceDetails(place.googlePlaceId);
      return { place, photo: googleDetails?.photo ?? null };
    }),
  );

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: places.map((place, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: `${SITE_URL}/lieux/${place.slug}`,
      name: place.name,
    })),
  };

  return (
    <main className="mx-auto flex max-w-[1040px] flex-col gap-6 px-4 py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <p className="text-sm text-encre/70">
        Couverture actuelle : littoral Marseille–Bandol et Sainte-Baume.
        D&apos;autres lieux arrivent.
      </p>
      <h1 className="font-display text-3xl">Les lieux</h1>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map(({ place, photo }) => (
          <PlaceCard
            key={place.id}
            place={place}
            photo={photo}
            status={
              <Suspense fallback={<StatusPillFallback variant="card" />}>
                <LiveStatusPill placeId={place.id} variant="card" />
              </Suspense>
            }
          />
        ))}
      </div>
    </main>
  );
}
