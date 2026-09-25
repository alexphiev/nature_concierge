import type { Metadata } from "next";
import { getActivePlaces, resolvePlaceStatus } from "@/src/corpus/queries";
import { getGooglePlaceDetails } from "@/src/corpus/google-places";
import { PlaceCard } from "@/src/components/PlaceCard";

export const metadata: Metadata = {
  title: "Les lieux — Nature Concierge",
  description:
    "Calanques, plages, massifs et sentiers entre Marseille et Bandol, avec leur statut du jour.",
};

export default async function PlacesIndexPage() {
  const activePlaces = await getActivePlaces();
  const activeIds = new Set(activePlaces.map((p) => p.id));
  // Spots are listed on their parent's page, unless the parent isn't public.
  const places = activePlaces.filter((p) => !p.parentId || !activeIds.has(p.parentId));

  const cards = await Promise.all(
    places.map(async (place) => {
      const [status, googleDetails] = await Promise.all([
        resolvePlaceStatus(place.id),
        getGooglePlaceDetails(place.googlePlaceId),
      ]);
      return { place, status, photo: googleDetails?.photo ?? null };
    }),
  );

  return (
    <main className="mx-auto flex max-w-[1040px] flex-col gap-6 px-4 py-12">
      <p className="text-sm text-encre/70">
        Couverture actuelle : littoral Marseille–Bandol et Sainte-Baume.
        D&apos;autres lieux arrivent.
      </p>
      <h1 className="font-display text-3xl">Les lieux</h1>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map(({ place, status, photo }) => (
          <PlaceCard key={place.id} place={place} status={status} photo={photo} />
        ))}
      </div>
    </main>
  );
}
