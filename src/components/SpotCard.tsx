import Link from "next/link";
import type { Place } from "../../prisma/generated/client";
import type { GooglePlacePhoto } from "../corpus/google-places";

const STRIPES =
  "repeating-linear-gradient(135deg, transparent, transparent 12px, color-mix(in srgb, var(--pin) 6%, transparent) 12px, color-mix(in srgb, var(--pin) 6%, transparent) 13px)";

export function SpotCard({
  spot,
  status,
  photo,
}: {
  spot: Place;
  status: React.ReactNode;
  photo: GooglePlacePhoto | null;
}) {
  return (
    <Link
      href={`/lieux/${spot.slug}`}
      className="flex items-center gap-3.5 rounded-[14px] border border-sable/50 p-3 transition-colors hover:border-mediterranee focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mediterranee"
    >
      <div
        className="size-22 shrink-0 overflow-hidden rounded-[10px] bg-calcaire-deep"
        style={photo ? undefined : { backgroundImage: STRIPES }}
      >
        {photo && (
          <img
            src={`/lieux/${spot.slug}/photo`}
            alt=""
            width={176}
            height={176}
            className="size-full object-cover"
          />
        )}
      </div>
      <div className="flex min-w-0 flex-col gap-1">
        <span className="leading-snug font-semibold">{spot.name}</span>
        {spot.description && (
          <span className="line-clamp-1 text-[0.8125rem] text-encre/70">{spot.description}</span>
        )}
        {status}
      </div>
    </Link>
  );
}
