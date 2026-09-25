import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getActivePlaces,
  getPlaceBySlug,
  resolvePlaceStatus,
} from "@/src/corpus/queries";
import { getGooglePlaceDetails } from "@/src/corpus/google-places";
import { StatusBlock } from "@/src/components/StatusBlock";
import { ClaimList } from "@/src/components/ClaimList";
import { WhatsAppCTA } from "@/src/components/WhatsAppCTA";
import { AlternativeCallout } from "@/src/components/AlternativeCallout";
import { PlaceCard } from "@/src/components/PlaceCard";
import { PracticalImages } from "@/src/components/PracticalImages";

export const revalidate = 900;

export async function generateStaticParams() {
  const places = await getActivePlaces();
  return places.map((place) => ({ slug: place.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const place = await getPlaceBySlug(slug);
  if (!place) return {};

  return {
    title: `${place.name} : ouvert aujourd'hui ? Accès, parking, affluence — ${place.commune}`,
    description:
      place.claims[0]?.claimText ??
      `Statut du jour, accès et conseils pour ${place.name}.`,
  };
}

export default async function PlaceDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const place = await getPlaceBySlug(slug);

  if (!place) notFound();

  const parent = place.parent?.status === "ACTIVE" ? place.parent : null;

  const [status, googleDetails, spotCards] = await Promise.all([
    resolvePlaceStatus(place.id),
    getGooglePlaceDetails(place.googlePlaceId),
    Promise.all(
      place.children.map(async (spot) => {
        const [spotStatus, spotDetails] = await Promise.all([
          resolvePlaceStatus(spot.id),
          getGooglePlaceDetails(spot.googlePlaceId),
        ]);
        return { spot, status: spotStatus, photo: spotDetails?.photo ?? null };
      }),
    ),
  ]);

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Place",
        name: place.name,
        geo: {
          "@type": "GeoCoordinates",
          latitude: place.lat,
          longitude: place.lng,
        },
        containedInPlace: parent
          ? { "@type": "Place", name: parent.name }
          : { "@type": "AdministrativeArea", name: place.commune },
      },
      place.claims.length > 0 && {
        "@type": "FAQPage",
        mainEntity: place.claims.slice(0, 3).map((claim) => ({
          "@type": "Question",
          name: `${claim.claimText.split(".")[0]} ?`,
          acceptedAnswer: {
            "@type": "Answer",
            text: claim.claimText,
          },
        })),
      },
    ].filter(Boolean),
  };

  return (
    <main className="mx-auto max-w-[1100px] px-4 pt-7 pb-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <p className="font-mono text-xs tracking-wide text-encre/60">
        <Link href="/places" className="underline decoration-dotted underline-offset-2">
          ← Les lieux
        </Link>
        {parent && (
          <>
            {" / "}
            <Link
              href={`/places/${parent.slug}`}
              className="underline decoration-dotted underline-offset-2"
            >
              {parent.name}
            </Link>
          </>
        )}
      </p>

      <div className="mt-5 grid grid-cols-1 items-end gap-10 md:grid-cols-[1.15fr_0.85fr]">
        <div
          className="relative flex aspect-[16/10] items-end overflow-hidden rounded-2xl border border-sable/40 bg-calcaire-deep p-5"
          style={
            !googleDetails?.photo
              ? {
                  backgroundImage:
                    "repeating-linear-gradient(135deg, transparent, transparent 14px, color-mix(in srgb, var(--pin) 7%, transparent) 14px, color-mix(in srgb, var(--pin) 7%, transparent) 15px)",
                }
              : undefined
          }
        >
          {googleDetails?.photo && (
            <>
              <img
                src={`/places/${place.slug}/photo`}
                alt=""
                width={1200}
                height={750}
                className="absolute inset-0 size-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-encre/35 to-transparent to-60%" />
              {googleDetails.photo.attribution && (
                <span className="absolute right-3 bottom-3 rounded bg-encre/50 px-2 py-0.5 font-mono text-[0.65rem] text-calcaire">
                  Photo : {googleDetails.photo.attribution}
                </span>
              )}
            </>
          )}
          {!googleDetails?.photo && (
            <span className="relative font-mono text-xs tracking-wide text-calcaire/90 uppercase">
              {place.type} · photo à venir
            </span>
          )}
        </div>

        <div className="pb-1">
          <p className="mb-2.5 flex items-center gap-2 font-mono text-xs tracking-wide text-pin uppercase before:size-1.25 before:rounded-full before:bg-pin before:content-['']">
            {place.commune} · {place.departement}
          </p>
          <h1 className="font-display text-4xl leading-[1.05] text-balance">
            {place.name}
          </h1>
          {place.description && (
            <p className="mt-2.5 max-w-[52ch] text-encre/80">{place.description}</p>
          )}
        </div>
      </div>

      <div className="mt-9">
        <StatusBlock
          status={status}
          officialInfoUrl={place.officialInfoUrl}
          googleMapsUri={googleDetails?.googleMapsUri ?? null}
        />
      </div>

      <div className="mt-14 grid grid-cols-1 gap-12 md:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-12">
          <ClaimList claims={place.claims} />
          {parent && (
            <ClaimList claims={parent.claims} title={`Valable pour tout ${parent.name}`} />
          )}
        </div>

        <aside>
          <WhatsAppCTA placeName={place.name} />
          <AlternativeCallout claims={[...place.claims, ...(parent?.claims ?? [])]} />
        </aside>
      </div>

      {spotCards.length > 0 && (
        <section aria-label={`Les spots de ${place.name}`} className="mt-16">
          <h2 className="font-display text-2xl">Les spots de {place.name}</h2>
          <div className="mt-5 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {spotCards.map(({ spot, status: spotStatus, photo }) => (
              <PlaceCard key={spot.id} place={spot} status={spotStatus} photo={photo} />
            ))}
          </div>
        </section>
      )}

      <PracticalImages urls={place.images.map((img) => img.url)} />
    </main>
  );
}
