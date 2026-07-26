import { prisma } from "./db";
import type { Place, Claim, SignalZone } from "../../prisma/generated/client";

export async function getActivePlaces(): Promise<Place[]> {
  return prisma.place.findMany({
    where: { status: "ACTIVE" },
    orderBy: { demandRank: "asc" },
  });
}

export async function getAllPlaces(): Promise<Place[]> {
  return prisma.place.findMany({
    orderBy: { demandRank: "asc" },
  });
}

export async function getSignalZones(): Promise<SignalZone[]> {
  return prisma.signalZone.findMany({
    where: { active: true },
    orderBy: { label: "asc" },
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

export type ResolvedStatus = {
  zoneValue: string;
  displayValue: "vert" | "jaune" | "orange" | "rouge" | "extreme";
  isOpen: boolean;
  restricted: boolean;
  detail: string | null;
  confirmedAt: Date;
  zoneLabel: string;
  provider: string;
} | null;

export async function resolvePlaceStatus(
  placeId: string,
): Promise<ResolvedStatus> {
  const zonePlace = await prisma.zonePlace.findFirst({
    where: { placeId },
    include: {
      signalZone: {
        include: { signalSource: { select: { provider: true } } },
      },
    },
  });

  if (!zonePlace) return null;

  // Every StatusLog row's forDate is "the day the status applies to" (see
  // app/admin/statut/actions.ts's forDateFor, which writes forDate = tomorrow
  // for FIRE_ACCESS since the admin confirms each evening off a map already
  // published for the next day). By the time that day arrives, the row that
  // governs it has forDate === that day, so the read side always targets
  // today exactly, for every signal type — never an offset applied again at
  // read time, and never "earliest date >= today" (which can silently fall
  // forward onto a different day's row).
  const forDate = new Date(new Date().setHours(0, 0, 0, 0));

  const statusLog = await prisma.statusLog.findFirst({
    where: {
      signalZoneId: zonePlace.signalZone.id,
      forDate,
    },
    select: { value: true, detail: true, confirmedAt: true },
  });

  if (!statusLog) return null;

  const place = await prisma.place.findFirst({
    where: { id: placeId },
    select: { zapef: true },
  });

  const displayValue = statusLog.value as NonNullable<ResolvedStatus>["displayValue"];

  let isOpen: boolean;
  let restricted = false;

  if (displayValue === "extreme") {
    isOpen = false;
  } else if (displayValue === "rouge") {
    isOpen = place?.zapef === true;
    restricted = isOpen;
  } else {
    isOpen = true;
  }

  return {
    zoneValue: statusLog.value,
    displayValue,
    isOpen,
    restricted,
    detail: statusLog.detail,
    confirmedAt: statusLog.confirmedAt,
    zoneLabel: zonePlace.signalZone.label,
    provider: zonePlace.signalZone.signalSource.provider,
  };
}

export async function getPlaceFreshness(placeId: string): Promise<Date> {
  const zonePlace = await prisma.zonePlace.findFirst({
    where: { placeId },
    select: { signalZoneId: true },
  });

  const [latestClaim, latestStatusLog] = await Promise.all([
    prisma.claim.findFirst({
      where: { placeId, isPublic: true, status: "PUBLISHED" },
      orderBy: { updatedAt: "desc" },
      select: { updatedAt: true },
    }),
    zonePlace
      ? prisma.statusLog.findFirst({
          where: { signalZoneId: zonePlace.signalZoneId },
          orderBy: { confirmedAt: "desc" },
          select: { confirmedAt: true },
        })
      : Promise.resolve(null),
  ]);

  const candidates = [latestClaim?.updatedAt, latestStatusLog?.confirmedAt].filter(
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
