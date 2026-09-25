import type { Claim } from "../../prisma/generated/client";
import type { PlaceWithPublicClaims } from "../corpus/queries";
import { SITE_URL } from "../site";

const MAX_DESCRIPTION_LENGTH = 155;

const THEME_ORDER: Claim["claimType"][] = [
  "ACCESS",
  "CROWDING",
  "SUITABILITY",
  "TIP",
  "AVOID",
  "ALTERNATIVE",
  "DECODING",
];

const FAQ_QUESTIONS: Record<Claim["claimType"], (name: string) => string> = {
  ACCESS: (name) => `Comment accéder à ${name} ?`,
  CROWDING: (name) => `Y a-t-il du monde à ${name} ?`,
  SUITABILITY: (name) => `${name}, c'est pour qui ?`,
  TIP: (name) => `Quels conseils pour visiter ${name} ?`,
  AVOID: (name) => `Que faut-il éviter à ${name} ?`,
  ALTERNATIVE: (name) => `Quelle alternative à ${name} ?`,
  DECODING: (name) => `Comment comprendre les règles d'accès à ${name} ?`,
};

export function placeTitle(place: Pick<PlaceWithPublicClaims, "name" | "commune">): string {
  return `${place.name} (${place.commune}) : ouvert aujourd'hui ? Accès, parking`;
}

export function placeDescription(
  place: Pick<PlaceWithPublicClaims, "name" | "description" | "claims">,
): string {
  const raw =
    place.description ??
    place.claims[0]?.claimText ??
    `Statut du jour, accès et conseils pour ${place.name}.`;

  const collapsed = raw.replace(/\s+/g, " ").trim();
  if (collapsed.length <= MAX_DESCRIPTION_LENGTH) return collapsed;

  const truncated = collapsed.slice(0, MAX_DESCRIPTION_LENGTH - 1);
  const atWordBoundary = truncated.slice(0, truncated.lastIndexOf(" "));
  return `${atWordBoundary}…`;
}

type ParentForJsonLd = PlaceWithPublicClaims["parent"];

export function buildPlaceJsonLd({
  place,
  parent,
  url,
}: {
  place: PlaceWithPublicClaims;
  parent: ParentForJsonLd;
  url: string;
}) {
  const touristAttraction = {
    "@type": "TouristAttraction",
    "@id": `${url}#lieu`,
    name: place.name,
    description: placeDescription(place),
    url,
    geo: {
      "@type": "GeoCoordinates",
      latitude: place.lat,
      longitude: place.lng,
    },
    address: {
      "@type": "PostalAddress",
      addressLocality: place.commune,
      addressCountry: "FR",
    },
    containedInPlace: parent
      ? {
          "@type": "TouristAttraction",
          name: parent.name,
          url: `${SITE_URL}/lieux/${parent.slug}`,
        }
      : { "@type": "City", name: place.commune },
  };

  const breadcrumbItems = [
    { "@type": "ListItem", position: 1, name: "Accueil", item: SITE_URL },
    { "@type": "ListItem", position: 2, name: "Les lieux", item: `${SITE_URL}/lieux` },
    ...(parent
      ? [
          {
            "@type": "ListItem",
            position: 3,
            name: parent.name,
            item: `${SITE_URL}/lieux/${parent.slug}`,
          },
        ]
      : []),
    {
      "@type": "ListItem",
      position: parent ? 4 : 3,
      name: place.name,
      item: url,
    },
  ];

  const breadcrumbList = {
    "@type": "BreadcrumbList",
    itemListElement: breadcrumbItems,
  };

  const claimsByType = new Map<Claim["claimType"], string[]>();
  for (const claim of place.claims) {
    const texts = claimsByType.get(claim.claimType) ?? [];
    texts.push(claim.claimText);
    claimsByType.set(claim.claimType, texts);
  }

  const faqPage =
    place.claims.length > 0
      ? {
          "@type": "FAQPage",
          mainEntity: THEME_ORDER.filter((type) => claimsByType.has(type)).map((type) => ({
            "@type": "Question",
            name: FAQ_QUESTIONS[type](place.name),
            acceptedAnswer: {
              "@type": "Answer",
              text: claimsByType.get(type)!.join(" "),
            },
          })),
        }
      : null;

  return {
    "@context": "https://schema.org",
    "@graph": [touristAttraction, breadcrumbList, ...(faqPage ? [faqPage] : [])],
  };
}
