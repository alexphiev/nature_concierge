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

type PublicClaim = Claim & { alternativePlace: Pick<Place, "slug" | "name"> | null };

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

export type ResolvedStatus = {
  status: "open" | "closed" | "unknown";
  cause: string | null;
  sourceUrl: string;
  sourceLabel: string | null;
  checkedAt: Date | null;
} | null;

// Spots inherit their parent's status unless they have one of their own.
export async function resolvePlaceStatus(
  placeId: string,
): Promise<ResolvedStatus> {
  const rows = await prisma.$queryRaw<NonNullable<ResolvedStatus>[]>`
    SELECT
      s.status,
      s.cause,
      s.source_url AS "sourceUrl",
      s.source_label AS "sourceLabel",
      s.checked_at AS "checkedAt"
    FROM "Place" p
    JOIN place_current_status s ON s.place_id IN (p.id, p."parentId")
    WHERE p.id = ${placeId}
    ORDER BY (s.place_id = p.id) DESC
    LIMIT 1
  `;

  return rows[0] ?? null;
}

export async function getPlaceFreshness(placeId: string): Promise<Date> {
  const [latestClaim, status] = await Promise.all([
    prisma.claim.findFirst({
      where: { placeId, isPublic: true, status: "PUBLISHED" },
      orderBy: { updatedAt: "desc" },
      select: { updatedAt: true },
    }),
    resolvePlaceStatus(placeId),
  ]);

  const candidates = [latestClaim?.updatedAt, status?.checkedAt].filter(
    (d): d is Date => d != null,
  );

  if (candidates.length > 0) {
    return candidates.reduce((latest, d) => (d > latest ? d : latest));
  }

  const place = await prisma.place.findFirst({
    where: { id: placeId },
    select: { updatedAt: true },
  });

  return place?.updatedAt ?? new Date();
}
