import Link from "next/link";
import type { Place } from "../../prisma/generated/client";
import type { ResolvedStatus } from "../corpus/queries";
import type { GooglePlacePhoto } from "../corpus/google-places";

const TYPE_LABELS: Record<Place["type"], string> = {
  CALANQUE: "Calanque",
  PLAGE: "Plage",
  MASSIF: "Massif",
  SENTIER: "Sentier",
  SOMMET: "Sommet",
  SITE: "Site",
};

const CLAIM_TYPE_LABELS: Record<string, string> = {
  ACCESS: "Accès",
  CROWDING: "Affluence",
  SUITABILITY: "Pour qui",
  TIP: "Astuce",
  AVOID: "À éviter",
  ALTERNATIVE: "Alternative",
  DECODING: "Décryptage",
};

function StatusPill({ status }: { status: ResolvedStatus }) {
  if (!status) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-statut-inconnu/60 bg-calcaire/85 px-2.5 py-1 font-mono text-[0.7rem] uppercase tracking-wide text-statut-inconnu backdrop-blur-sm">
        <span aria-hidden className="size-1.5 rounded-full bg-current" />
        Non vérifié
      </span>
    );
  }

  const colorClass = !status.isOpen
    ? "text-statut-rouge bg-statut-rouge/15"
    : status.restricted
      ? "text-statut-orange bg-statut-orange/15"
      : "text-statut-vert bg-statut-vert/15";

  const label = !status.isOpen
    ? "Fermé"
    : status.restricted
      ? "Ouvert — restreint"
      : "Ouvert";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[0.7rem] uppercase tracking-wide backdrop-blur-sm ${colorClass}`}
    >
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}

export function PlaceCard({
  place,
  status,
  photo,
}: {
  place: Place;
  status: ResolvedStatus;
  photo: GooglePlacePhoto | null;
}) {
  const hookClaim = null as
    | { claimType: string; claimText: string }
    | null; // see note below — Task 5 does not add a hook-claim query; left null for now.

  return (
    <Link
      href={`/places/${place.slug}`}
      className="block overflow-hidden rounded-[14px] border border-sable/45 bg-calcaire transition-[transform,box-shadow,border-color] duration-150 hover:-translate-y-0.5 hover:border-mediterranee hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mediterranee"
    >
      <div
        className="relative flex aspect-[4/3] items-end bg-calcaire-deep p-3.5"
        style={
          !photo
            ? {
                backgroundImage:
                  "repeating-linear-gradient(135deg, transparent, transparent 12px, color-mix(in srgb, var(--pin) 6%, transparent) 12px, color-mix(in srgb, var(--pin) 6%, transparent) 13px)",
              }
            : undefined
        }
      >
        {photo && (
          <img
            src={`/places/${place.slug}/photo`}
            alt=""
            width={800}
            height={600}
            className="absolute inset-0 size-full object-cover"
          />
        )}
        {photo && (
          <div className="absolute inset-0 bg-gradient-to-t from-encre/30 to-transparent to-55%" />
        )}
        <span className="relative rounded-full border border-sable/50 bg-calcaire/90 px-2.5 py-0.5 font-mono text-[0.7rem] uppercase tracking-wide text-pin">
          {TYPE_LABELS[place.type]}
        </span>
        <div className="absolute top-3 right-3">
          <StatusPill status={status} />
        </div>
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
