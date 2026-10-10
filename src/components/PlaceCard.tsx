import Link from "next/link";
import type { Place } from "../../prisma/generated/client";
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

const CLAIM_TYPE_LABELS: Record<string, string> = {
  ACCESS: "Accès",
  CROWDING: "Affluence",
  SUITABILITY: "Pour qui",
  TIP: "Astuce",
  AVOID: "À éviter",
  ALTERNATIVE: "Alternative",
  DECODING: "Décryptage",
  ACTIVITY: "Activités",
  PRACTICAL: "Infos pratiques",
  SAFETY: "Sécurité",
  NATURE: "Faune & flore",
};

export function PlaceCard({
  place,
  cover,
}: {
  place: Place;
  cover: DisplayPhoto | null;
}) {
  const hookClaim = null as { claimType: string; claimText: string } | null; // see note below — Task 5 does not add a hook-claim query; left null for now.

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
        {hookClaim && (
          <p className="mt-3 flex gap-2 border-t border-sable/35 pt-3 text-sm text-encre/80">
            <span className="shrink-0 pt-0.5 font-mono text-[0.65rem] uppercase tracking-wide text-pin">
              {CLAIM_TYPE_LABELS[hookClaim.claimType]}
            </span>
            {hookClaim.claimText}
          </p>
        )}
      </div>
    </Link>
  );
}
