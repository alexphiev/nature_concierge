import type { ContributionType, Prisma } from "../../prisma/generated/client";
import { prisma } from "@/src/corpus/db";
import type { SessionUser } from "@/src/auth/session";
import { sendEmail } from "@/src/email/send";
import { adminNewContributionEmail } from "@/src/email/templates";
import { deletePlacePhotos } from "@/src/storage/place-photos";
import { CONTRIBUTION_TYPE_LABELS } from "./schema";

export type ContributionData = Pick<
  Prisma.ContributionUncheckedCreateInput,
  | "type"
  | "placeId"
  | "claimId"
  | "text"
  | "claimType"
  | "correctionKind"
  | "placeName"
  | "placeCommune"
  | "locationHint"
  | "photosConsentAt"
>;

export const MAX_AWAITING_REVIEW = 10;

const UNCONFIRMED_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const CAP_ERROR = `Vous avez déjà ${MAX_AWAITING_REVIEW} contributions en relecture. Merci de patienter un peu.`;

async function notifyAdmin(contribution: {
  type: ContributionType;
  placeId: string | null;
  placeName: string | null;
}): Promise<void> {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) return;
  try {
    let placeName = contribution.placeName;
    if (contribution.placeId) {
      const place = await prisma.place.findUnique({
        where: { id: contribution.placeId },
        select: { name: true },
      });
      placeName = place?.name ?? placeName;
    }
    const { subject, text } = adminNewContributionEmail({
      typeLabel: CONTRIBUTION_TYPE_LABELS[contribution.type],
      placeName: placeName ?? "—",
    });
    await sendEmail({ to: adminEmail, subject, text });
  } catch (error) {
    console.error("[contributions] admin notification failed", error);
  }
}

export async function createPendingContribution(
  userId: string,
  data: ContributionData,
): Promise<{ id: string } | { error: string }> {
  const count = await prisma.contribution.count({ where: { userId, status: "PENDING" } });
  if (count >= MAX_AWAITING_REVIEW) return { error: CAP_ERROR };
  const created = await prisma.contribution.create({
    data: { ...data, userId, status: "PENDING" },
    select: { id: true, type: true, placeId: true, placeName: true },
  });
  await notifyAdmin(created);
  return { id: created.id };
}

async function purgeStaleUnconfirmed(): Promise<void> {
  const stale = await prisma.contribution.findMany({
    where: { status: "UNCONFIRMED", createdAt: { lt: new Date(Date.now() - UNCONFIRMED_TTL_MS) } },
    select: { id: true, photos: { select: { key: true } } },
  });
  if (stale.length === 0) return;
  await deletePlacePhotos(stale.flatMap((c) => c.photos.map((p) => p.key)));
  await prisma.contribution.deleteMany({ where: { id: { in: stale.map((c) => c.id) } } });
}

export async function createUnconfirmedContribution(
  identity: { email: string; name: string; commune: string | null },
  data: ContributionData,
): Promise<{ id: string } | { error: string }> {
  await purgeStaleUnconfirmed();
  const count = await prisma.contribution.count({
    where: { status: "UNCONFIRMED", pendingEmail: identity.email },
  });
  if (count >= MAX_AWAITING_REVIEW) return { error: CAP_ERROR };
  const created = await prisma.contribution.create({
    data: {
      ...data,
      status: "UNCONFIRMED",
      userId: null,
      pendingEmail: identity.email,
      pendingName: identity.name,
      pendingCommune: identity.commune,
    },
    select: { id: true },
  });
  return { id: created.id };
}

export async function findLatestUnconfirmed(
  email: string,
): Promise<{ pendingName: string | null } | null> {
  return prisma.contribution.findFirst({
    where: { status: "UNCONFIRMED", pendingEmail: email },
    orderBy: { createdAt: "desc" },
    select: { pendingName: true },
  });
}

export async function attachUnconfirmedContributions(user: SessionUser): Promise<number> {
  const attached = await prisma.$transaction(async (tx) => {
    const rows = await tx.contribution.findMany({
      where: { status: "UNCONFIRMED", pendingEmail: user.email },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        type: true,
        placeId: true,
        placeName: true,
        pendingName: true,
        pendingCommune: true,
      },
    });
    if (rows.length === 0) return rows;
    const profile: { name?: string; commune?: string } = {};
    if (!user.name.trim() && rows[0].pendingName) profile.name = rows[0].pendingName;
    if (!user.commune && rows[0].pendingCommune) profile.commune = rows[0].pendingCommune;
    if (profile.name || profile.commune) {
      await tx.user.update({ where: { id: user.id }, data: profile });
    }
    await tx.contribution.updateMany({
      where: { id: { in: rows.map((r) => r.id) } },
      data: {
        userId: user.id,
        status: "PENDING",
        pendingEmail: null,
        pendingName: null,
        pendingCommune: null,
      },
    });
    return rows;
  });
  await Promise.all(attached.map(notifyAdmin));
  return attached.length;
}

export type PendingItem = {
  id: string;
  type: ContributionType;
  text: string | null;
  createdAt: Date;
  photoKeys: string[];
};

export async function getPendingContributions(
  userId: string,
  placeIds: string[],
): Promise<PendingItem[]> {
  const rows = await prisma.contribution.findMany({
    where: { userId, status: "PENDING", placeId: { in: placeIds } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      type: true,
      text: true,
      createdAt: true,
      photos: { orderBy: { order: "asc" }, select: { key: true } },
    },
  });
  return rows.map(({ photos, ...rest }) => ({ ...rest, photoKeys: photos.map((p) => p.key) }));
}
