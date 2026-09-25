import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getActivePlaces, getPlaceBySlug } from "@/src/corpus/queries";
import { getGooglePlaceDetails, googleMapsUrl } from "@/src/corpus/google-places";
import {
  LiveStatusBlock,
  LiveStatusPill,
  StatusBlockFallback,
  StatusPillFallback,
} from "@/src/components/LiveStatus";
import { ClaimList } from "@/src/components/ClaimList";
import { WhatsAppBar, WhatsAppCTA } from "@/src/components/WhatsAppCTA";
import { AlternativeCallout } from "@/src/components/AlternativeCallout";
import { TYPE_LABELS } from "@/src/components/PlaceCard";
import { PlaceGallery } from "@/src/components/PlaceGallery";
import { SpotCard } from "@/src/components/SpotCard";
import { ExpandableText } from "@/src/components/ExpandableText";
import { PracticalImages } from "@/src/components/PracticalImages";
import { SITE_URL } from "@/src/site";
import { placeTitle, placeDescription, buildPlaceJsonLd } from "@/src/seo/place-jsonld";

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

  const title = placeTitle(place);
  const description = placeDescription(place);

  return {
    title: { absolute: title },
    description,
    alternates: { canonical: `/lieux/${slug}` },
    openGraph: {
      title,
      description,
      url: `/lieux/${slug}`,
      type: "website",
    },
  };
}

const SECTION_TITLE = "font-display text-[1.625rem] leading-tight font-semibold";

export default async function PlaceDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const place = await getPlaceBySlug(slug);

  if (!place) notFound();

  const parent = place.parent?.status === "ACTIVE" ? place.parent : null;
  const typeLabel = TYPE_LABELS[place.type] ?? place.type;

  const [googleDetails, spotCards] = await Promise.all([
    getGooglePlaceDetails(place.googlePlaceId),
    Promise.all(
      place.children.map(async (spot) => {
        const spotDetails = await getGooglePlaceDetails(spot.googlePlaceId);
        return { spot, photo: spotDetails?.photo ?? null };
      }),
    ),
  ]);

  const mapsUrl = googleMapsUrl(`${place.name}, ${place.commune}`, place.googlePlaceId);
  const galleryTiles = spotCards
    .filter(({ photo }) => photo)
    .map(({ spot }) => ({ slug: spot.slug, name: spot.name }));

  const metaItems = [
    spotCards.length > 0 && `${spotCards.length} spot${spotCards.length > 1 ? "s" : ""}`,
    place.governingAuthority && `Géré par ${place.governingAuthority}`,
  ].filter((item): item is string => Boolean(item));

  const photoUrl = googleDetails?.photo ? `${SITE_URL}/lieux/${slug}/photo` : null;
  const jsonLd = buildPlaceJsonLd({
    place,
    parent,
    url: `${SITE_URL}/lieux/${slug}`,
    photoUrl,
  });

  return (
    <main className="mx-auto w-full max-w-[1120px] px-4 pt-7 md:px-6 md:pb-20">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />

      <nav
        aria-label="Fil d'Ariane"
        className="flex flex-wrap gap-2 font-mono text-xs tracking-wide text-encre/65"
      >
        <Link href="/lieux" className="underline decoration-dotted underline-offset-2">
          Les lieux
        </Link>
        {parent && (
          <>
            <span aria-hidden>/</span>
            <Link
              href={`/lieux/${parent.slug}`}
              className="underline decoration-dotted underline-offset-2"
            >
              {parent.name}
            </Link>
          </>
        )}
        <span aria-hidden>/</span>
        <span aria-current="page" className="text-encre">
          {place.name}
        </span>
      </nav>

      <header className="mt-6 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-3">
          <p className="font-mono text-xs tracking-widest text-pin uppercase">
            {typeLabel} · {place.commune} ({place.departement})
          </p>
          <h1 className="font-display text-4xl leading-[1.02] font-semibold tracking-tight text-balance md:text-[3.25rem]">
            {place.name}
          </h1>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-encre/75">
            <Suspense fallback={<StatusPillFallback />}>
              <LiveStatusPill placeId={place.id} />
            </Suspense>
            {metaItems.map((item) => (
              <span key={item} className="flex items-center gap-3">
                <span aria-hidden>·</span>
                {item}
              </span>
            ))}
          </div>
        </div>
        <a
          href={mapsUrl}
          className="inline-flex items-center gap-2 self-start rounded-[10px] border border-sable/70 px-4 py-2.5 text-sm font-medium whitespace-nowrap text-encre transition-colors hover:border-mediterranee hover:text-mediterranee md:self-auto"
        >
          <svg
            aria-hidden
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" />
            <circle cx="12" cy="9.5" r="2.5" />
          </svg>
          Itinéraire Google Maps
        </a>
      </header>

      <div className="mt-7">
        <PlaceGallery
          slug={place.slug}
          typeLabel={typeLabel}
          photo={googleDetails?.photo ?? null}
          photoAttributions={googleDetails?.photoAttributions ?? []}
          tiles={galleryTiles}
        />
      </div>

      <div className="mt-10 grid grid-cols-1 gap-10 md:mt-12 md:grid-cols-[minmax(0,1fr)_360px] md:items-start md:gap-16">
        <div className="flex flex-col divide-y divide-sable/40 [&>*]:py-9 [&>*:first-child]:pt-0 [&>*:last-child]:pb-0">
          {place.description && (
            <section aria-label="À propos" className="flex flex-col gap-3">
              <h2 className={SECTION_TITLE}>À propos</h2>
              <ExpandableText text={place.description} />
            </section>
          )}

          <ClaimList claims={place.claims} />

          {parent && (
            <ClaimList claims={parent.claims} title={`Valable pour tout ${parent.name}`} />
          )}

          {spotCards.length > 0 && (
            <section aria-label={`Les spots de ${place.name}`} className="flex flex-col gap-5">
              <h2 className={SECTION_TITLE}>
                {spotCards.length > 1 ? `Les ${spotCards.length} spots` : "Le spot"}
              </h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {spotCards.map(({ spot, photo }) => (
                  <SpotCard
                    key={spot.id}
                    spot={spot}
                    photo={photo}
                    status={
                      <Suspense fallback={<StatusPillFallback variant="bare" />}>
                        <LiveStatusPill placeId={spot.id} variant="bare" />
                      </Suspense>
                    }
                  />
                ))}
              </div>
            </section>
          )}

          <PracticalImages urls={place.images.map((img) => img.url)} />
        </div>

        <aside className="order-first flex flex-col gap-5 md:sticky md:top-6 md:order-none">
          <div className="flex flex-col gap-5 rounded-[18px] border border-sable/55 bg-[#FFFCF6] p-6 shadow-[0_8px_28px_rgba(28,43,51,0.08)]">
            <Suspense fallback={<StatusBlockFallback />}>
              <LiveStatusBlock placeId={place.id} officialInfoUrl={place.officialInfoUrl} />
            </Suspense>
            <div className="hidden border-t border-sable/45 pt-5 md:block">
              <WhatsAppCTA placeName={place.name} />
            </div>
            <div className="flex justify-center gap-5 text-sm">
              {place.officialInfoUrl && (
                <a href={place.officialInfoUrl} className="text-mediterranee underline underline-offset-2">
                  Carte officielle ↗
                </a>
              )}
              <a href={mapsUrl} className="text-mediterranee underline underline-offset-2">
                Google Maps ↗
              </a>
            </div>
          </div>
          <AlternativeCallout claims={[...place.claims, ...(parent?.claims ?? [])]} />
        </aside>
      </div>

      <WhatsAppBar placeName={place.name} />
    </main>
  );
}
