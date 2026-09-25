import { cacheLife, cacheTag } from "next/cache";
import { prisma } from "./db";
import { parisToday } from "./paris-date";
import type { Place, Claim, SignalZone, PlaceImage } from "../../prisma/generated/client";

export async function getActivePlaces(): Promise<Place[]> {
  "use cache";
  cacheTag("corpus");
  cacheLife("corpus");
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

export async function getGoverningAuthorities(): Promise<string[]> {
  const rows = await prisma.place.findMany({
    where: { governingAuthority: { not: null } },
    select: { governingAuthority: true },
    distinct: ["governingAuthority"],
    orderBy: { governingAuthority: "asc" },
  });
  return rows.map((r) => r.governingAuthority as string);
}

export async function getSignalZones(): Promise<SignalZone[]> {
  return prisma.signalZone.findMany({
    where: { active: true },
    orderBy: { label: "asc" },
  });
}

type PublicClaim = Claim & { alternativePlace: Pick<Place, "slug" | "name"> | null };

export type PlaceWithPublicClaims = Place & {
  claims: PublicClaim[];
  parent: (Pick<Place, "id" | "slug" | "name" | "status"> & { claims: PublicClaim[] }) | null;
  children: Place[];
  images: PlaceImage[];
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
      },
      images: { orderBy: { order: "asc" } },
    },
  }) as Promise<PlaceWithPublicClaims | null>;
}

const zonePlaceInclude = {
  signalZone: {
    include: { signalSource: { select: { provider: true } } },
  },
} as const;

// Spots inherit their parent's signal zone unless they have one of their own.
async function findZonePlace(placeId: string) {
  const own = await prisma.zonePlace.findFirst({
    where: { placeId },
    include: zonePlaceInclude,
  });
  if (own) return own;

  const place = await prisma.place.findFirst({
    where: { id: placeId },
    select: { parentId: true },
  });
  if (!place?.parentId) return null;

  return prisma.zonePlace.findFirst({
    where: { placeId: place.parentId },
    include: zonePlaceInclude,
  });
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
  const zonePlace = await findZonePlace(placeId);

  if (!zonePlace) return null;

  // Every StatusLog row's forDate is "the day the status applies to" (see
  // app/admin/statut/actions.ts's forDateFor, which writes forDate = tomorrow
  // for FIRE_ACCESS since the admin confirms each evening off a map already
  // published for the next day). By the time that day arrives, the row that
  // governs it has forDate === that day, so the read side always targets
  // today exactly, for every signal type — never an offset applied again at
  // read time, and never "earliest date >= today" (which can silently fall
  // forward onto a different day's row).
  const forDate = parisToday();

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

export type TodayStatusCounts = {
  closed: number;
  total: number;
  latestConfirmedAt: Date;
} | null;

export async function getTodayStatusCounts(): Promise<TodayStatusCounts> {
  const forDate = parisToday();

  const statusLogs = await prisma.statusLog.findMany({
    where: { forDate },
    select: { value: true, confirmedAt: true },
  });

  if (statusLogs.length === 0) return null;

  const closed = statusLogs.filter(
    (log) => log.value === "rouge" || log.value === "extreme",
  ).length;

  const latestConfirmedAt = statusLogs.reduce(
    (latest, log) => (log.confirmedAt > latest ? log.confirmedAt : latest),
    statusLogs[0].confirmedAt,
  );

  return { closed, total: statusLogs.length, latestConfirmedAt };
}

export type CoverageCounts = {
  placeCount: number;
  claimCount: number;
};

export async function getCoverageCounts(): Promise<CoverageCounts> {
  "use cache";
  cacheTag("corpus");
  cacheLife("corpus");
  const [placeCount, claimCount] = await Promise.all([
    prisma.place.count({ where: { status: "ACTIVE" } }),
    prisma.claim.count({ where: { isPublic: true, status: "PUBLISHED" } }),
  ]);

  return { placeCount, claimCount };
}

export async function getPlaceFreshness(placeId: string): Promise<Date> {
  const zonePlace = await findZonePlace(placeId);

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
