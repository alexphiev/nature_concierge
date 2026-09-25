import { describe, it, expect } from "vitest";
import { placeTitle, placeDescription, buildPlaceJsonLd } from "./place-jsonld";
import type { PlaceWithPublicClaims } from "../corpus/queries";

function makePlace(overrides: Partial<PlaceWithPublicClaims> = {}): PlaceWithPublicClaims {
  return {
    id: "place-1",
    slug: "calanque-du-mugel",
    name: "Calanque du Mugel",
    commune: "La Ciotat",
    departement: "13",
    lat: 43.1234,
    lng: 5.6123,
    type: "CALANQUE",
    governingAuthority: null,
    officialInfoUrl: null,
    description: null,
    demandRank: 1,
    zapef: false,
    googlePlaceId: null,
    status: "ACTIVE",
    createdAt: new Date(),
    updatedAt: new Date(),
    parentId: null,
    claims: [],
    parent: null,
    children: [],
    images: [],
    ...overrides,
  } as PlaceWithPublicClaims;
}

function makeClaim(
  claimType: PlaceWithPublicClaims["claims"][number]["claimType"],
  claimText: string,
  overrides: Partial<PlaceWithPublicClaims["claims"][number]> = {},
): PlaceWithPublicClaims["claims"][number] {
  return {
    id: `claim-${claimType}-${claimText.slice(0, 8)}`,
    placeId: "place-1",
    claimText,
    claimType,
    conditions: [],
    audience: [],
    verdict: "OK",
    alternativePlaceId: null,
    alternativePlace: null,
    sourceId: "source-1",
    verification: "VERIFIED",
    decayClass: "STABLE",
    verifiedOn: new Date(),
    isPublic: true,
    status: "PUBLISHED",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as PlaceWithPublicClaims["claims"][number];
}

describe("placeTitle", () => {
  it("formats name, commune and the standard suffix", () => {
    const place = makePlace({ name: "Calanque du Mugel", commune: "La Ciotat" });
    expect(placeTitle(place)).toBe(
      "Calanque du Mugel (La Ciotat) : ouvert aujourd'hui ? Accès, parking",
    );
  });
});

describe("placeDescription", () => {
  it("uses place.description when present", () => {
    const place = makePlace({ description: "Une crique tranquille au bout du sentier." });
    expect(placeDescription(place)).toBe("Une crique tranquille au bout du sentier.");
  });

  it("falls back to the first public claim text when no description", () => {
    const place = makePlace({
      description: null,
      claims: [makeClaim("ACCESS", "Parking payant, arrivez avant 9h.")],
    });
    expect(placeDescription(place)).toBe("Parking payant, arrivez avant 9h.");
  });

  it("falls back to the generic sentence when no description and no claims", () => {
    const place = makePlace({ name: "Calanque du Mugel", description: null, claims: [] });
    expect(placeDescription(place)).toBe(
      "Statut du jour, accès et conseils pour Calanque du Mugel.",
    );
  });

  it("collapses whitespace", () => {
    const place = makePlace({ description: "Une   crique \n tranquille." });
    expect(placeDescription(place)).toBe("Une crique tranquille.");
  });

  it("truncates to 155 chars at a word boundary with a trailing ellipsis", () => {
    const long =
      "Cette calanque est magnifique et offre un panorama exceptionnel sur la mer Méditerranée, avec des falaises blanches, une eau turquoise et un sentier accessible depuis le parking principal du village.";
    const place = makePlace({ description: long });
    const result = placeDescription(place);
    expect(result.length).toBeLessThanOrEqual(155);
    expect(result.endsWith("…")).toBe(true);
    expect(result.endsWith(" …")).toBe(false);
    expect(long.startsWith(result.slice(0, -1).trimEnd())).toBe(true);
  });

  it("does not truncate a description at or under 155 chars", () => {
    const exact155 = "a".repeat(155);
    const place = makePlace({ description: exact155 });
    expect(placeDescription(place)).toBe(exact155);
  });
});

describe("buildPlaceJsonLd", () => {
  const baseUrl = "http://localhost:3000/lieux/calanque-du-mugel";

  it("includes @context and @graph", () => {
    const place = makePlace();
    const result = buildPlaceJsonLd({ place, parent: null, url: baseUrl, photoUrl: null });
    expect(result["@context"]).toBe("https://schema.org");
    expect(Array.isArray(result["@graph"])).toBe(true);
  });

  it("builds a TouristAttraction node with the expected fields", () => {
    const place = makePlace({
      name: "Calanque du Mugel",
      commune: "La Ciotat",
      lat: 43.1234,
      lng: 5.6123,
      description: "Une crique tranquille.",
    });
    const result = buildPlaceJsonLd({ place, parent: null, url: baseUrl, photoUrl: null });
    const graph = result["@graph"] as Array<Record<string, unknown>>;
    const attraction = graph.find((n) => n["@type"] === "TouristAttraction");
    expect(attraction).toBeDefined();
    expect(attraction!["@id"]).toBe(`${baseUrl}#lieu`);
    expect(attraction!.name).toBe("Calanque du Mugel");
    expect(attraction!.description).toBe("Une crique tranquille.");
    expect(attraction!.url).toBe(baseUrl);
    expect(attraction!.geo).toEqual({
      "@type": "GeoCoordinates",
      latitude: 43.1234,
      longitude: 5.6123,
    });
    expect(attraction!.address).toEqual({
      "@type": "PostalAddress",
      addressLocality: "La Ciotat",
      addressCountry: "FR",
    });
    expect(attraction!.containedInPlace).toEqual({
      "@type": "City",
      name: "La Ciotat",
    });
    expect("image" in attraction!).toBe(false);
  });

  it("uses parent for containedInPlace when a parent is provided", () => {
    const place = makePlace();
    const parent = {
      id: "place-parent",
      slug: "massif-du-mugel",
      name: "Massif du Mugel",
      status: "ACTIVE",
      claims: [],
    } as PlaceWithPublicClaims["parent"];
    const result = buildPlaceJsonLd({ place, parent, url: baseUrl, photoUrl: null });
    const graph = result["@graph"] as Array<Record<string, unknown>>;
    const attraction = graph.find((n) => n["@type"] === "TouristAttraction");
    expect(attraction!.containedInPlace).toEqual({
      "@type": "TouristAttraction",
      name: "Massif du Mugel",
      url: "http://localhost:3000/lieux/massif-du-mugel",
    });
  });

  it("includes image when photoUrl is provided", () => {
    const place = makePlace();
    const result = buildPlaceJsonLd({
      place,
      parent: null,
      url: baseUrl,
      photoUrl: "http://localhost:3000/lieux/calanque-du-mugel/photo",
    });
    const graph = result["@graph"] as Array<Record<string, unknown>>;
    const attraction = graph.find((n) => n["@type"] === "TouristAttraction");
    expect(attraction!.image).toBe("http://localhost:3000/lieux/calanque-du-mugel/photo");
  });

  it("omits image key entirely when photoUrl is null", () => {
    const place = makePlace();
    const result = buildPlaceJsonLd({ place, parent: null, url: baseUrl, photoUrl: null });
    const graph = result["@graph"] as Array<Record<string, unknown>>;
    const attraction = graph.find((n) => n["@type"] === "TouristAttraction");
    expect(Object.keys(attraction!)).not.toContain("image");
  });

  it("builds a BreadcrumbList without a parent", () => {
    const place = makePlace({ name: "Calanque du Mugel" });
    const result = buildPlaceJsonLd({ place, parent: null, url: baseUrl, photoUrl: null });
    const graph = result["@graph"] as Array<Record<string, unknown>>;
    const breadcrumb = graph.find((n) => n["@type"] === "BreadcrumbList");
    expect(breadcrumb).toBeDefined();
    const items = breadcrumb!.itemListElement as Array<Record<string, unknown>>;
    expect(items).toEqual([
      { "@type": "ListItem", position: 1, name: "Accueil", item: "http://localhost:3000" },
      {
        "@type": "ListItem",
        position: 2,
        name: "Les lieux",
        item: "http://localhost:3000/lieux",
      },
      {
        "@type": "ListItem",
        position: 3,
        name: "Calanque du Mugel",
        item: baseUrl,
      },
    ]);
  });

  it("builds a BreadcrumbList with a parent inserted before the place", () => {
    const place = makePlace({ name: "Anse du Sec" });
    const parent = {
      id: "place-parent",
      slug: "calanque-du-mugel",
      name: "Calanque du Mugel",
      status: "ACTIVE",
      claims: [],
    } as PlaceWithPublicClaims["parent"];
    const result = buildPlaceJsonLd({ place, parent, url: baseUrl, photoUrl: null });
    const graph = result["@graph"] as Array<Record<string, unknown>>;
    const breadcrumb = graph.find((n) => n["@type"] === "BreadcrumbList");
    const items = breadcrumb!.itemListElement as Array<Record<string, unknown>>;
    expect(items).toEqual([
      { "@type": "ListItem", position: 1, name: "Accueil", item: "http://localhost:3000" },
      {
        "@type": "ListItem",
        position: 2,
        name: "Les lieux",
        item: "http://localhost:3000/lieux",
      },
      {
        "@type": "ListItem",
        position: 3,
        name: "Calanque du Mugel",
        item: "http://localhost:3000/lieux/calanque-du-mugel",
      },
      { "@type": "ListItem", position: 4, name: "Anse du Sec", item: baseUrl },
    ]);
  });

  it("omits FAQPage when the place has zero public claims", () => {
    const place = makePlace({ claims: [] });
    const result = buildPlaceJsonLd({ place, parent: null, url: baseUrl, photoUrl: null });
    const graph = result["@graph"] as Array<Record<string, unknown>>;
    expect(graph.find((n) => n["@type"] === "FAQPage")).toBeUndefined();
  });

  it("groups FAQ questions by claim type in THEME_ORDER, joining texts per type", () => {
    const place = makePlace({
      name: "Calanque du Mugel",
      claims: [
        makeClaim("AVOID", "Évitez le week-end."),
        makeClaim("ACCESS", "Garez-vous au parking du village."),
        makeClaim("ACCESS", "Comptez 20 minutes de marche."),
        makeClaim("TIP", "Venez tôt le matin."),
      ],
    });
    const result = buildPlaceJsonLd({ place, parent: null, url: baseUrl, photoUrl: null });
    const graph = result["@graph"] as Array<Record<string, unknown>>;
    const faq = graph.find((n) => n["@type"] === "FAQPage");
    expect(faq).toBeDefined();
    const entities = faq!.mainEntity as Array<Record<string, unknown>>;
    expect(entities.map((q) => q.name)).toEqual([
      "Comment accéder à Calanque du Mugel ?",
      "Quels conseils pour visiter Calanque du Mugel ?",
      "Que faut-il éviter à Calanque du Mugel ?",
    ]);
    const accessEntity = entities[0];
    expect(accessEntity.acceptedAnswer).toEqual({
      "@type": "Answer",
      text: "Garez-vous au parking du village. Comptez 20 minutes de marche.",
    });
  });

  it("never includes daily status fields", () => {
    const place = makePlace({ claims: [makeClaim("ACCESS", "Ouvert toute l'année.")] });
    const result = buildPlaceJsonLd({ place, parent: null, url: baseUrl, photoUrl: null });
    const serialized = JSON.stringify(result);
    expect(serialized).not.toMatch(/status|verdict|ouvert aujourd|fermé aujourd/i);
  });
});
