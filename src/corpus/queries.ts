import { cacheLife, cacheTag } from "next/cache";
import { prisma } from "./db";
import type { Place, Claim, PlaceImage, PlacePhoto } from "../../prisma/generated/client";

// `photos` only holds the cover (first photo), enough for cards.
export type PlaceWithCover = Place & { photos: PlacePhoto[] };

const coverPhotoInclude = { orderBy: { order: "asc" }, take: 1 } as const;

export async function getActivePlaces(): Promise<PlaceWithCover[]> {
  "use cache";
  cacheTag("corpus");
  cacheLife("corpus");
  return prisma.place.findMany({
    where: { status: "ACTIVE" },
    orderBy: { demandRank: "asc" },
    include: { photos: coverPhotoInclude },
  });
}

export type SearchCorpusPlace = PlaceWithCover & { claims: Pick<Claim, "id" | "claimText">[] };

export async function getSearchCorpus(): Promise<SearchCorpusPlace[]> {
  "use cache";
  cacheTag("corpus");
  cacheLife("corpus");
  return prisma.place.findMany({
    where: { status: "ACTIVE" },
    orderBy: { demandRank: "asc" },
    include: {
      photos: coverPhotoInclude,
      claims: {
        where: { isPublic: true, status: "PUBLISHED" },
        orderBy: { createdAt: "asc" },
        select: { id: true, claimText: true },
      },
    },
  });
}

export async function getAllPlaces(): Promise<Place[]> {
  return prisma.place.findMany({
    orderBy: { demandRank: "asc" },
  });
}

export async function getGoverningAuthorities(): Promise<string[]> {
  const rows = await prisma.place.findMany({
    where: { governingAuthority: { not: null } },
    select: { governingAuthority: true },
    distinct: ["governingAuthority"],
    orderBy: { governingAuthority: "asc" },
  });
  return rows.map((r) => r.governingAuthority as string);
}

export type PublicClaim = Claim & {
  alternativePlace: Pick<Place, "slug" | "name"> | null;
  author: { name: string; commune: string | null } | null;
};

export type PlaceWithPublicClaims = Place & {
  claims: PublicClaim[];
  parent: (Pick<Place, "id" | "slug" | "name" | "status"> & { claims: PublicClaim[] }) | null;
  children: PlaceWithCover[];
  images: PlaceImage[];
  photos: PlacePhoto[];
};

const publicClaimsInclude = {
  where: { isPublic: true, status: "PUBLISHED" },
  include: {
    alternativePlace: { select: { slug: true, name: true } },
    author: { select: { name: true, commune: true } },
  },
} as const;

export async function getPlaceBySlug(
  slug: string,
): Promise<PlaceWithPublicClaims | null> {
  "use cache";
  cacheTag("corpus");
  cacheLife("corpus");
  return prisma.place.findFirst({
    where: { slug, status: "ACTIVE" },
    include: {
      claims: publicClaimsInclude,
      parent: {
        select: { id: true, slug: true, name: true, status: true, claims: publicClaimsInclude },
      },
      children: {
        where: { status: "ACTIVE" },
        orderBy: { demandRank: "asc" },
        include: { photos: coverPhotoInclude },
      },
      images: { orderBy: { order: "asc" } },
      photos: { orderBy: { order: "asc" } },
    },
  }) as Promise<PlaceWithPublicClaims | null>;
}

export async function getPlaceFreshness(placeId: string): Promise<Date> {
  const latestClaim = await prisma.claim.findFirst({
    where: { placeId, isPublic: true, status: "PUBLISHED" },
    orderBy: { updatedAt: "desc" },
    select: { updatedAt: true },
  });

  if (latestClaim) return latestClaim.updatedAt;

  const place = await prisma.place.findFirst({
    where: { id: placeId },
    select: { updatedAt: true },
  });

  return place?.updatedAt ?? new Date();
}
