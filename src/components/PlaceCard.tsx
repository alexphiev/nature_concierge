import Link from "next/link";
import type { Place } from "../../prisma/generated/client";
import { countLabel } from "../corpus/count-label";
import type { PlaceWithCover } from "../corpus/queries";
import type { DisplayPhoto } from "../corpus/place-photos";
import { PhotoImage } from "./PhotoImage";

export const TYPE_LABELS: Record<Place["type"], string> = {
  CALANQUE: "Calanque",
  PLAGE: "Plage",
  MASSIF: "Massif",
  SENTIER: "Sentier",
  SOMMET: "Sommet",
  SITE: "Site",
  ISLAND: "Île",
  SCENIC_ROAD: "Route touristique",
};

export function PlaceCard({
  place,
  cover,
}: {
  place: PlaceWithCover;
  cover: DisplayPhoto | null;
}) {
  return (
    <Link
      href={`/lieux/${place.slug}`}
      className="block overflow-hidden rounded-[14px] border border-sable/45 bg-calcaire transition-[transform,box-shadow,border-color] duration-150 hover:-translate-y-0.5 hover:border-mediterranee hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mediterranee"
    >
      <div
        className="relative flex aspect-[4/3] items-end bg-calcaire-deep p-3.5"
        style={
          !cover
            ? {
                backgroundImage:
                  "repeating-linear-gradient(135deg, transparent, transparent 12px, color-mix(in srgb, var(--pin) 6%, transparent) 12px, color-mix(in srgb, var(--pin) 6%, transparent) 13px)",
              }
            : undefined
        }
      >
        {cover && (
          <PhotoImage
            photo={cover}
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          />
        )}
        {cover && (
          <div className="absolute inset-0 bg-gradient-to-t from-encre/30 to-transparent to-55%" />
        )}
        <span className="relative rounded-full border border-sable/50 bg-calcaire/90 px-2.5 py-0.5 font-mono text-[0.7rem] uppercase tracking-wide text-pin">
          {TYPE_LABELS[place.type]}
        </span>
      </div>

      <div className="p-4.5">
        <h2 className="font-display text-xl leading-tight">{place.name}</h2>
        <p className="mt-1 text-sm text-encre/70">
          {place.commune} · {place.departement}
        </p>
        {place._count.claims > 0 ? (
          <p className="mt-3 border-t border-sable/35 pt-3 font-mono text-[0.7rem] uppercase tracking-wide text-pin">
            {countLabel(place._count.claims, "conseil", "conseils")}
          </p>
        ) : (
          <p className="mt-3 border-t border-sable/35 pt-3">
            <span className="rounded-full border border-sable/50 px-2.5 py-0.5 font-mono text-[0.7rem] uppercase tracking-wide text-encre/70">
              À compléter
            </span>
          </p>
        )}
      </div>
    </Link>
  );
}
