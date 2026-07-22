import { prisma } from "./db";
import type { Place, Claim, StatusLog } from "../../prisma/generated/client";

export async function getActivePlaces(): Promise<Place[]> {
  return prisma.place.findMany({
    where: { status: "ACTIVE" },
    orderBy: { demandRank: "asc" },
  });
}

export type PlaceWithPublicClaims = Place & {
  claims: (Claim & { alternativePlace: Pick<Place, "slug" | "name"> | null })[];
};

export async function getPlaceBySlug(
  slug: string,
): Promise<PlaceWithPublicClaims | null> {
  return prisma.place.findFirst({
    where: { slug, status: "ACTIVE" },
    include: {
      claims: {
        where: { isPublic: true, status: "PUBLISHED" },
        include: {
          alternativePlace: { select: { slug: true, name: true } },
        },
      },
    },
  }) as Promise<PlaceWithPublicClaims | null>;
}

export async function getTodayStatus(
  placeId: string,
): Promise<(StatusLog & { signalSource: { provider: string } }) | null> {
  const startOfToday = new Date(new Date().setHours(0, 0, 0, 0));

  return prisma.statusLog.findFirst({
    where: {
      placeId,
      forDate: { gte: startOfToday },
    },
    orderBy: { forDate: "asc" },
    include: {
      signalSource: { select: { provider: true } },
    },
  });
}

export async function getPlaceFreshness(placeId: string): Promise<Date> {
  const [latestClaim, latestStatusLog] = await Promise.all([
    prisma.claim.findFirst({
      where: { placeId, isPublic: true, status: "PUBLISHED" },
      orderBy: { updatedAt: "desc" },
      select: { updatedAt: true },
    }),
    prisma.statusLog.findFirst({
      where: { placeId },
      orderBy: { checkedAt: "desc" },
      select: { checkedAt: true },
    }),
  ]);

  const candidates = [latestClaim?.updatedAt, latestStatusLog?.checkedAt].filter(
    (d): d is Date => d !== undefined,
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
