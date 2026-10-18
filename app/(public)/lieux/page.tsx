import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ContributionBanner } from "@/src/components/contribute/ContributionBanner";
import { getActivePlaces } from "@/src/corpus/queries";
import { resolveCoverPhoto } from "@/src/corpus/place-photos";
import { PlaceCard } from "@/src/components/PlaceCard";
import { getCommunityStats } from "@/src/corpus/community";
import { countLabel } from "@/src/corpus/count-label";
import { PROPOSE_PLACE_FORM_HREF } from "@/src/components/landing/shared";
import { SITE_URL, BASE_OPEN_GRAPH } from "@/src/site";

export const metadata: Metadata = {
  title: "Les lieux",
  description:
    "Calanques, plages, massifs et sentiers entre Marseille et Bandol.",
  alternates: { canonical: "/lieux" },
  openGraph: { ...BASE_OPEN_GRAPH, url: "/lieux" },
};

export default async function PlacesIndexPage() {
  const activePlaces = await getActivePlaces();
  const activeIds = new Set(activePlaces.map((p) => p.id));
  // Spots are listed on their parent's page, unless the parent isn't public.
  const { placeCount, tipCount, contributorCount } = await getCommunityStats();
  const intro = [
    countLabel(placeCount, "lieu", "lieux"),
    tipCount > 0 &&
      (contributorCount >= 2
        ? `${countLabel(tipCount, "conseil partagé", "conseils partagés")} par ${contributorCount} contributeurs`
        : countLabel(tipCount, "conseil", "conseils")),
  ]
    .filter(Boolean)
    .join(" · ");
  const places = activePlaces.filter((p) => !p.parentId || !activeIds.has(p.parentId));

  const cards = await Promise.all(
    places.map(async (place) => ({ place, cover: await resolveCoverPhoto(place) })),
  );

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: places.map((place, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: `${SITE_URL}/lieux/${place.slug}`,
      name: place.name,
    })),
  };

  return (
    <main className="mx-auto flex max-w-[1040px] flex-col gap-6 px-4 py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <Suspense fallback={null}>
        <ContributionBanner />
      </Suspense>
      <h1 className="font-display text-3xl">Les lieux</h1>
      <div className="flex flex-col gap-1 text-sm text-encre/70">
        <p>{intro}</p>
        <p>
          Couverture actuelle : littoral Marseille–Bandol et Sainte-Baume.
          D&apos;autres lieux arrivent.
        </p>
        <p>
          Un lieu manque ?{" "}
          <Link href={PROPOSE_PLACE_FORM_HREF} className="underline underline-offset-2 hover:text-mediterranee">
            Proposez-le →
          </Link>
        </p>
      </div>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map(({ place, cover }) => (
          <PlaceCard
            key={place.id}
            place={place}
            cover={cover}
          />
        ))}
        <Link
          href={PROPOSE_PLACE_FORM_HREF}
          className="flex min-h-64 items-center justify-center rounded-[14px] border-2 border-dashed border-sable/60 p-6 text-center font-display text-xl text-encre/70 transition-colors hover:border-mediterranee hover:text-mediterranee focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mediterranee"
        >
          Proposer un lieu
        </Link>
      </div>
    </main>
  );
}
