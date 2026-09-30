import type { Metadata } from "next";
import { getActivePlaces } from "@/src/corpus/queries";
import { resolveCoverPhoto } from "@/src/corpus/place-photos";
import type { PlaceWithCover } from "@/src/corpus/queries";
import { SearchHero } from "@/src/components/landing/SearchHero";
import { GuideSection, type GuideCard } from "@/src/components/landing/GuideSection";
import { HelpSection } from "@/src/components/landing/HelpSection";
import { SITE_URL, SITE_NAME, BASE_OPEN_GRAPH } from "@/src/site";

const DESCRIPTION =
  "Décrivez votre sortie, je vous dis où aller. Avec les conseils vérifiés des gens d’ici.";

export const metadata: Metadata = {
  title: { absolute: "Guide Nature de La Ciotat — calanques, criques et sentiers" },
  description: DESCRIPTION,
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

async function withCover(place: PlaceWithCover): Promise<GuideCard> {
  return { place, cover: await resolveCoverPhoto(place) };
}

export default async function LandingPage() {
  const places = await getActivePlaces();
  const cards = await Promise.all(places.slice(0, CARD_COUNT).map(withCover));

  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <SearchHero />
      <GuideSection cards={cards} placeCount={places.length} />
      <HelpSection />
    </main>
  );
}
