import Link from "next/link";
import type { Claim, Place } from "../../prisma/generated/client";

export function AlternativeCallout({
  claims,
}: {
  claims: (Claim & { alternativePlace: Pick<Place, "slug" | "name"> | null })[];
}) {
  const alternatives = claims.filter(
    (c) => c.verdict === "ALTERNATIVE" && c.alternativePlace,
  );

  if (alternatives.length === 0) return null;

  return (
    <section aria-label="Alternatives" className="flex flex-col gap-2">
      {alternatives.map((claim) => (
        <p key={claim.id}>
          Si c&apos;est fermé ou saturé →{" "}
          <Link
            href={`/places/${claim.alternativePlace!.slug}`}
            className="text-mediterranee underline"
          >
            {claim.alternativePlace!.name}
          </Link>
        </p>
      ))}
    </section>
  );
}
