import type { Metadata } from "next";
import type { Place } from "../../prisma/generated/client";
import { getActivePlaces } from "@/src/corpus/queries";
import { getGooglePlaceDetails } from "@/src/corpus/google-places";
import { Hero, HERO_DESCRIPTION, type HeroPhoto } from "@/src/components/landing/Hero";
import { GuideSection, type GuideCard } from "@/src/components/landing/GuideSection";
import { HelpSection } from "@/src/components/landing/HelpSection";
import { SITE_URL, SITE_NAME, BASE_OPEN_GRAPH } from "@/src/site";

export const metadata: Metadata = {
  title: { absolute: "Guide Nature de La Ciotat — calanques, criques et sentiers" },
  description: HERO_DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: { ...BASE_OPEN_GRAPH, url: "/" },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      name: SITE_NAME,
      url: SITE_URL,
      inLanguage: "fr-FR",
    },
    {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
      areaServed: "Littoral Marseille–Bandol, ouest Var, Sainte-Baume",
    },
  ],
};

const CARD_COUNT = 8;

async function withPhoto(place: Place): Promise<GuideCard> {
  const details = await getGooglePlaceDetails(place.googlePlaceId);
  return { place, photo: details?.photo ?? null };
}

async function findHeroPhoto(cards: GuideCard[], rest: Place[]): Promise<HeroPhoto | null> {
  const fromCards = cards.find((card): card is HeroPhoto => card.photo !== null);
  if (fromCards) return fromCards;

  for (const place of rest) {
    const card = await withPhoto(place);
    if (card.photo) return { place, photo: card.photo };
  }
  return null;
}

export default async function LandingPage() {
  const places = await getActivePlaces();
  const cards = await Promise.all(places.slice(0, CARD_COUNT).map(withPhoto));
  const heroPhoto = await findHeroPhoto(cards, places.slice(CARD_COUNT));

  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <Hero heroPhoto={heroPhoto} />
      <GuideSection cards={cards} placeCount={places.length} />
      <HelpSection />
    </main>
  );
}
