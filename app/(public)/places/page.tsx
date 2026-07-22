import type { Metadata } from "next";
import { getActivePlaces } from "@/src/corpus/queries";
import { PlaceCard } from "@/src/components/PlaceCard";

export const metadata: Metadata = {
  title: "Les lieux — Nature Concierge",
  description:
    "Calanques, plages, massifs et sentiers entre Marseille et Bandol, avec leur statut du jour.",
};

export default async function PlacesIndexPage() {
  const places = await getActivePlaces();

  return (
    <main className="mx-auto flex max-w-[1040px] flex-col gap-6 px-4 py-12">
      <p className="text-sm text-encre/70">
        Couverture actuelle : littoral Marseille–Bandol et Sainte-Baume.
        D&apos;autres lieux arrivent.
      </p>
      <h1 className="font-display text-3xl">Les lieux</h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {places.map((place) => (
          <PlaceCard key={place.id} place={place} />
        ))}
      </div>
    </main>
  );
}
