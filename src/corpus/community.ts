import { cacheLife, cacheTag } from "next/cache";
import { countLabel } from "./count-label";
import { prisma } from "./db";

const contributorClaimWhere = {
  isPublic: true,
  status: "PUBLISHED",
  authorId: { not: null },
  place: { status: "ACTIVE" },
} as const;

export function placeContributorCount(
  claims: { authorId: string | null; authorDeleted: boolean }[],
): number {
  return new Set(claims.map((c) => (c.authorDeleted ? "deleted" : c.authorId))).size;
}

export async function getCommunityStats(): Promise<{
  tipCount: number;
  contributorCount: number;
}> {
  "use cache";
  cacheTag("corpus");
  cacheLife("corpus");
  const [tipCount, approvedUsers] = await Promise.all([
    prisma.claim.count({
      where: { isPublic: true, status: "PUBLISHED", place: { status: "ACTIVE" } },
    }),
    prisma.user.count({ where: { contributions: { some: { status: "APPROVED" } } } }),
  ]);
  return { tipCount, contributorCount: 1 + approvedUsers };
}

export async function getRecentContributorTips(limit: number): Promise<
  {
    id: string;
    text: string;
    authorName: string;
    authorCommune: string | null;
    place: { slug: string; name: string };
  }[]
> {
  "use cache";
  cacheTag("corpus");
  cacheLife("corpus");
  const claims = await prisma.claim.findMany({
    where: contributorClaimWhere,
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      claimText: true,
      author: { select: { name: true, commune: true } },
      place: { select: { slug: true, name: true } },
    },
  });
  return claims.flatMap((c) =>
    c.author
      ? [
          {
            id: c.id,
            text: c.claimText,
            authorName: c.author.name,
            authorCommune: c.author.commune,
            place: c.place,
          },
        ]
      : [],
  );
}

export async function getContributorTipCount(): Promise<number> {
  "use cache";
  cacheTag("corpus");
  cacheLife("corpus");
  return prisma.claim.count({ where: contributorClaimWhere });
}

export async function getContributors(): Promise<{ name: string; commune: string | null }[]> {
  "use cache";
  cacheTag("corpus");
  cacheLife("corpus");
  return prisma.user.findMany({
    where: {
      name: { not: "" },
      contributions: { some: { status: "APPROVED" } },
    },
    orderBy: { name: "asc" },
    select: { name: true, commune: true },
  });
}

// Until the guide has this many contributors, the footer says it is only starting.
export const EARLY_DAYS_CONTRIBUTORS = 10;

// Honest footer line: what the guide holds and how many people wrote it.
export function communityLine({
  tipCount,
  contributorCount,
}: {
  tipCount: number;
  contributorCount: number;
}): { lead: string | null; counts: string } | null {
  if (tipCount === 0) return null;
  const counts = `${countLabel(tipCount, "conseil", "conseils")}, ${countLabel(
    contributorCount,
    "contributeur local",
    "contributeurs locaux",
  )}`;
  return {
    lead: contributorCount < EARLY_DAYS_CONTRIBUTORS ? "Ce n’est que le début :" : null,
    counts,
  };
}
