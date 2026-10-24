import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import { getActivePlaces, getPlaceBySlug } from "@/src/corpus/queries";
import { getGooglePlaceDetails, googleMapsUrl } from "@/src/corpus/google-places";
import { MIN_GALLERY_PHOTOS, buildGallerySlides, resolveCoverPhoto } from "@/src/corpus/place-photos";
import { ContributionBanner } from "@/src/components/contribute/ContributionBanner";
import { PendingContributions } from "@/src/components/contribute/PendingContributions";
import { ClaimList } from "@/src/components/ClaimList";
import { PracticalInfoList } from "@/src/components/PracticalInfoList";
import { PlaceNeedsCard } from "@/src/components/contribute/PlaceNeedsCard";
import { placeNeeds } from "@/src/corpus/place-needs";
import { ContributeCard } from "@/src/components/contribute/ContributeCard";
import { ContributeBar } from "@/src/components/contribute/ContributeBar";
import { AlternativeCallout } from "@/src/components/AlternativeCallout";
import { TYPE_LABELS } from "@/src/components/PlaceCard";
import { PlaceGallery } from "@/src/components/PlaceGallery";
import { SpotCard } from "@/src/components/SpotCard";
import { ExpandableText } from "@/src/components/ExpandableText";
import { PracticalImages } from "@/src/components/PracticalImages";
import { SITE_URL, BASE_OPEN_GRAPH } from "@/src/site";
import { placeTitle, placeDescription, buildPlaceJsonLd } from "@/src/seo/place-jsonld";
import { nearbyPlaces } from "@/src/corpus/nearby";
import { placeContributorCount } from "@/src/corpus/community";
import { countLabel } from "@/src/corpus/count-label";

const kmFormatter = new Intl.NumberFormat("fr-FR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

export async function generateStaticParams() {
  const places = await getActivePlaces();
  const params = places.map((place) => ({ slug: place.slug }));
  // cacheComponents rejects an empty list; the placeholder resolves to notFound().
  return params.length > 0 ? params : [{ slug: "_" }];
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
      ...BASE_OPEN_GRAPH,
      title,
      description,
      url: `/lieux/${slug}`,
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

  const [googleDetails, spotCards, activePlaces] = await Promise.all([
    place.photos.length < MIN_GALLERY_PHOTOS ? getGooglePlaceDetails(place.googlePlaceId) : null,
    Promise.all(
      place.children.map(async (spot) => ({ spot, cover: await resolveCoverPhoto(spot) })),
    ),
    getActivePlaces(),
  ]);

  const nearby = nearbyPlaces(place, activePlaces);

  const mapsUrl = googleMapsUrl(place);
  const slides = buildGallerySlides({
    slug: place.slug,
    uploaded: place.photos,
    googleAttributions: googleDetails?.photo ? googleDetails.photoAttributions : [],
  });
  const contributorCount = placeContributorCount(place.claims);
  const practicalInfos = place.claims.filter((claim) => claim.kind === "PRACTICAL_INFO");
  const localTips = place.claims.filter((claim) => claim.kind === "LOCAL_TIP");
  const parentPracticalInfos = parent?.claims.filter((claim) => claim.kind === "PRACTICAL_INFO") ?? [];
  const parentLocalTips = parent?.claims.filter((claim) => claim.kind === "LOCAL_TIP") ?? [];
  const needs = placeNeeds({ claims: place.claims, ownPhotoCount: place.photos.length });
  const correctHref = (id: string) => `/lieux/${slug}/corriger/${id}`;
  // Empty place: the questions come first. Otherwise, after what is already known.
  const needsCard = <PlaceNeedsCard slug={slug} placeName={place.name} needs={needs} />;
  const metaItems = [
    practicalInfos.length > 0 &&
      countLabel(practicalInfos.length, "info pratique", "infos pratiques"),
    localTips.length > 0 && countLabel(localTips.length, "conseil vécu", "conseils vécus"),
    contributorCount >= 2 && `${contributorCount} contributeurs`,
    spotCards.length > 0 && `${spotCards.length} spot${spotCards.length > 1 ? "s" : ""}`,
    place.governingAuthority && `Géré par ${place.governingAuthority}`,
    place.proposedBy && `Lieu proposé par ${place.proposedBy.name}`,
  ].filter((item): item is string => Boolean(item));

  const jsonLd = buildPlaceJsonLd({
    place,
    parent,
    url: `${SITE_URL}/lieux/${slug}`,
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
        className="flex flex-wrap gap-2 text-[13px] text-encre/65"
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
          <p className="font-semibold text-xs tracking-widest text-pin uppercase">
            {typeLabel} · {place.commune} ({place.departement})
          </p>
          <h1 className="font-display text-4xl leading-[1.02] font-semibold tracking-tight text-balance md:text-[3.25rem]">
            {place.name}
          </h1>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-encre/75">
            {metaItems.map((item, index) => (
              <span key={item} className="flex items-center gap-3">
                {index > 0 && <span aria-hidden>·</span>}
                {item}
              </span>
            ))}
          </div>
        </div>
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
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
        <PlaceGallery slides={slides} addPhotosHref={`/lieux/${slug}/photos`} />
      </div>

      <div className="mt-10 grid grid-cols-1 gap-10 md:mt-12 md:grid-cols-[minmax(0,1fr)_360px] md:items-start md:gap-16">
        <div className="flex flex-col divide-y divide-sable/40 [&>*]:py-9 [&>*:empty]:hidden [&>*:first-child]:pt-0 [&>*:last-child]:pb-0">
          {place.description && (
            <section aria-label="À propos" className="flex flex-col gap-3">
              <h2 className={SECTION_TITLE}>À propos</h2>
              <ExpandableText text={place.description} />
            </section>
          )}

          <div className="flex flex-col gap-6">
            <Suspense fallback={null}>
              <ContributionBanner />
              <PendingContributions placeIds={[place.id, ...place.children.map((c) => c.id)]} />
            </Suspense>
            {place.claims.length === 0 && needsCard}
          </div>

          <PracticalInfoList
            claims={practicalInfos}
            addHref={`/lieux/${slug}/info`}
            correctHref={correctHref}
          />

          <ClaimList
            claims={localTips}
            addTipHref={`/lieux/${slug}/astuce`}
            correctHref={correctHref}
          />

          {place.claims.length > 0 && needsCard}

          {parent && (
            <PracticalInfoList
              claims={parentPracticalInfos}
              title={`Infos pratiques pour tout ${parent.name}`}
              correctHref={correctHref}
            />
          )}

          {parent && (
            <ClaimList
              claims={parentLocalTips}
              title={`Conseils pour tout ${parent.name}`}
              correctHref={correctHref}
            />
          )}

          {spotCards.length > 0 && (
            <section aria-label={`Les spots de ${place.name}`} className="flex flex-col gap-5">
              <h2 className={SECTION_TITLE}>
                {spotCards.length > 1 ? `Les ${spotCards.length} spots` : "Le spot"}
              </h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {spotCards.map(({ spot, cover }) => (
                  <SpotCard
                    key={spot.id}
                    spot={spot}
                    cover={cover}
                  />
                ))}
              </div>
            </section>
          )}

          {nearby.length > 0 && (
            <section aria-label="À proximité" className="flex flex-col gap-5">
              <h2 className={SECTION_TITLE}>À proximité</h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {nearby.map(({ place: nearbyPlace, km }) => (
                  <Link
                    key={nearbyPlace.id}
                    href={`/lieux/${nearbyPlace.slug}`}
                    className="flex flex-col gap-1 rounded-[14px] border border-sable/50 p-3 transition-colors hover:border-mediterranee focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mediterranee"
                  >
                    <span className="leading-snug font-semibold">{nearbyPlace.name}</span>
                    <span className="text-[0.8125rem] text-encre/70">
                      {TYPE_LABELS[nearbyPlace.type] ?? nearbyPlace.type} · {nearbyPlace.commune} ·
                      à {kmFormatter.format(km)} km
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          <PracticalImages images={place.images} />
        </div>

        <aside className="order-first flex flex-col gap-5 md:sticky md:top-6 md:order-none">
          <div className="flex flex-col gap-5 rounded-[18px] border border-sable/55 bg-[#FFFCF6] p-6 shadow-[0_8px_28px_rgba(28,43,51,0.08)]">
            <div className="hidden md:block">
              <ContributeCard slug={slug} />
            </div>
            <div className="flex justify-center gap-5 text-sm">
              {place.officialInfoUrl && (
                <a
                  href={place.officialInfoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-mediterranee underline underline-offset-2"
                >
                  Site ↗
                </a>
              )}
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-mediterranee underline underline-offset-2"
              >
                Google Maps ↗
              </a>
              <Link
                href={`/lieux/${slug}/corriger`}
                className="text-mediterranee underline underline-offset-2 md:hidden"
              >
                Signaler une erreur
              </Link>
            </div>
          </div>
          <AlternativeCallout claims={[...place.claims, ...(parent?.claims ?? [])]} />
        </aside>
      </div>

      <ContributeBar slug={slug} />
    </main>
  );
}
