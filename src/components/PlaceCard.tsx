import Link from "next/link";
import { StatusChip } from "./StatusChip";
import type { Place } from "../../prisma/generated/client";

const TYPE_LABELS: Record<Place["type"], string> = {
  CALANQUE: "Calanque",
  PLAGE: "Plage",
  MASSIF: "Massif",
  SENTIER: "Sentier",
  SOMMET: "Sommet",
  SITE: "Site",
};

export function PlaceCard({ place }: { place: Place }) {
  return (
    <Link
      href={`/places/${place.slug}`}
      className="block rounded-[10px] border border-sable/40 bg-calcaire-deep p-4 transition-colors duration-150 hover:border-mediterranee focus-visible:outline-2 focus-visible:outline-mediterranee"
    >
      <h2 className="font-display text-xl">{place.name}</h2>
      <p className="text-sm text-encre/70">
        {place.commune} · {TYPE_LABELS[place.type]}
      </p>
      <div className="mt-2">
        <StatusChip value={null} />
      </div>
    </Link>
  );
}
