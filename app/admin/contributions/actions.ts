"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { assertAdmin } from "@/src/admin/assert-admin";
import { prisma } from "@/src/corpus/db";
import { NOTE_MAX_LENGTH, TipInputSchema } from "@/src/contributions/schema";
import { sendEmail } from "@/src/email/send";
import {
  contributionRejectedEmail,
  correctionAcceptedEmail,
  placeAcceptedEmail,
  photosPublishedEmail,
  tipPublishedEmail,
} from "@/src/email/templates";
import { uniquePlaceSlug } from "@/src/corpus/slug";
import { z } from "zod";
import { Prisma } from "../../../prisma/generated/client";
import { deletePlacePhotos } from "@/src/storage/place-photos";
import { SITE_URL } from "@/src/site";

function readNote(formData: FormData): string | null {
  return String(formData.get("note") ?? "").trim().slice(0, NOTE_MAX_LENGTH) || null;
}

function failWith(code: string, contributionId: string): never {
  redirect(`/admin/contributions?erreur=${code}#c-${contributionId}`);
}

async function notify(to: string, content: { subject: string; text: string }): Promise<void> {
  try {
    await sendEmail({ to, ...content });
  } catch (e) {
    console.error("Failed to send contribution email", e);
  }
}

export async function publishTip(contributionId: string, formData: FormData): Promise<void> {
  await assertAdmin();
  const contribution = await prisma.contribution.findUnique({
    where: { id: contributionId },
    include: { user: true, place: true },
  });
  if (
    !contribution ||
    contribution.type !== "TIP" ||
    contribution.status !== "PENDING" ||
    !contribution.place
  ) {
    return;
  }

  const parsed = TipInputSchema.safeParse({
    text: formData.get("text"),
    claimType: formData.get("claimType"),
  });
  if (!parsed.success) {
    failWith(parsed.error.issues[0]?.path[0] === "claimType" ? "theme" : "texte", contribution.id);
  }
  const note = readNote(formData);
  const now = new Date();

  const published = await prisma.$transaction(async (tx) => {
    const claimed = await tx.contribution.updateMany({
      where: { id: contribution.id, status: "PENDING", type: "TIP" },
      data: { status: "APPROVED", reviewedAt: now, reviewNote: note },
    });
    if (claimed.count === 0) return false;
    const source = await tx.source.create({
      data: {
        type: "contribution",
        urlOrRef: contribution.id,
        dateCollected: contribution.createdAt,
        reliability: 2,
      },
    });
    await tx.claim.create({
      data: {
        claimText: parsed.data.text,
        claimType: parsed.data.claimType,
        placeId: contribution.place!.id,
        sourceId: source.id,
        conditions: [],
        audience: [],
        verdict: "GO",
        verification: "LOCAL_TESTIMONY",
        decayClass: "SEASONAL",
        isPublic: true,
        status: "PUBLISHED",
        verifiedOn: now,
        authorId: contribution.userId,
      },
    });
    return true;
  });
  if (!published) return;

  updateTag("corpus");
  if (contribution.user) {
    await notify(
      contribution.user.email,
      tipPublishedEmail({
        placeName: contribution.place.name,
        placeUrl: `${SITE_URL}/lieux/${contribution.place.slug}`,
        note,
      }),
    );
  }
  revalidatePath("/admin/contributions");
}

async function loadPending(contributionId: string, type: "CORRECTION" | "PLACE") {
  const contribution = await prisma.contribution.findUnique({
    where: { id: contributionId },
    include: { user: true, place: true, claim: true },
  });
  if (!contribution || contribution.type !== type || contribution.status !== "PENDING") {
    return null;
  }
  return contribution;
}

class ClaimGoneError extends Error {}

async function resolveCorrection(
  contributionId: string,
  formData: FormData,
  mode: "apply" | "retire" | "acknowledge",
): Promise<void> {
  await assertAdmin();
  const contribution = await loadPending(contributionId, "CORRECTION");
  if (!contribution || !contribution.place) return;
  if (mode !== "acknowledge" && contribution.claim?.status !== "PUBLISHED") {
    failWith("conseil", contribution.id);
  }

  let newText: string | null = null;
  if (mode === "apply") {
    const parsed = z.string().trim().min(10).max(500).safeParse(formData.get("text"));
    if (!parsed.success) failWith("texte", contribution.id);
    newText = parsed.data;
  }
  const note = readNote(formData);
  const now = new Date();

  const resolved = await prisma.$transaction(async (tx) => {
    const claimed = await tx.contribution.updateMany({
      where: { id: contribution.id, status: "PENDING", type: "CORRECTION" },
      data: { status: "APPROVED", reviewedAt: now, reviewNote: note },
    });
    if (claimed.count === 0) return false;
    if (mode === "acknowledge") return true;
    const changed = await tx.claim.updateMany({
      where: { id: contribution.claim!.id, status: "PUBLISHED" },
      data:
        mode === "apply" ? { claimText: newText!, verifiedOn: now } : { status: "RETIRED" },
    });
    if (changed.count === 0) throw new ClaimGoneError();
    return true;
  }).catch((e: unknown) => {
    if (e instanceof ClaimGoneError) return false;
    throw e;
  });
  if (!resolved) return;

  updateTag("corpus");
  if (contribution.user) {
    await notify(
      contribution.user.email,
      correctionAcceptedEmail({
        placeName: contribution.place.name,
        placeUrl: `${SITE_URL}/lieux/${contribution.place.slug}`,
        updated: mode !== "acknowledge",
        note,
      }),
    );
  }
  revalidatePath("/admin/contributions");
}

export async function applyCorrection(contributionId: string, formData: FormData): Promise<void> {
  await resolveCorrection(contributionId, formData, "apply");
}

export async function retireCorrectedClaim(
  contributionId: string,
  formData: FormData,
): Promise<void> {
  await resolveCorrection(contributionId, formData, "retire");
}

export async function acknowledgeCorrection(
  contributionId: string,
  formData: FormData,
): Promise<void> {
  await resolveCorrection(contributionId, formData, "acknowledge");
}

export async function createPlaceDraft(contributionId: string, formData: FormData): Promise<void> {
  await assertAdmin();
  const contribution = await loadPending(contributionId, "PLACE");
  if (!contribution || !contribution.placeName || !contribution.placeCommune) return;

  const note = readNote(formData);
  const description =
    (contribution.text ?? "") +
    (contribution.locationHint ? `\n\nComment le trouver : ${contribution.locationHint}` : "");

  const attempt = async () => {
    const slug = await uniquePlaceSlug(contribution.placeName!);
    return prisma.$transaction(async (tx) => {
      const claimed = await tx.contribution.updateMany({
        where: { id: contribution.id, status: "PENDING", type: "PLACE" },
        data: { status: "APPROVED", reviewedAt: new Date(), reviewNote: note },
      });
      if (claimed.count === 0) return null;
      const place = await tx.place.create({
        data: {
          slug,
          name: contribution.placeName!,
          commune: contribution.placeCommune!,
          departement: "13",
          lat: 43.1748,
          lng: 5.6047,
          type: "SITE",
          status: "DRAFT",
          description,
          proposedById: contribution.userId,
        },
      });
      return place.id;
    });
  };

  let placeId: string | null;
  try {
    placeId = await attempt();
  } catch (error) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")) {
      throw error;
    }
    placeId = await attempt();
  }
  if (!placeId) return;

  updateTag("corpus");
  if (contribution.user) {
    await notify(
      contribution.user.email,
      placeAcceptedEmail({ placeName: contribution.placeName, note }),
    );
  }
  revalidatePath("/admin/contributions");
  redirect(`/admin/places/${placeId}`);
}

export async function publishPhotos(contributionId: string, formData: FormData): Promise<void> {
  await assertAdmin();
  const contribution = await prisma.contribution.findUnique({
    where: { id: contributionId },
    include: { user: true, place: true, photos: true },
  });
  if (
    !contribution ||
    contribution.type !== "PHOTOS" ||
    contribution.status !== "PENDING" ||
    !contribution.place
  ) {
    return;
  }

  const keepIds = new Set(formData.getAll("keep").map(String));
  const kept = contribution.photos
    .filter((p) => keepIds.has(p.id))
    .sort((a, b) => a.order - b.order);
  if (kept.length === 0) failWith("photos", contribution.id);
  const dropped = contribution.photos.filter((p) => !keepIds.has(p.id));
  const note = readNote(formData);
  const placeId = contribution.place.id;

  const published = await prisma.$transaction(async (tx) => {
    const claimed = await tx.contribution.updateMany({
      where: { id: contribution.id, status: "PENDING", type: "PHOTOS" },
      data: { status: "APPROVED", reviewedAt: new Date(), reviewNote: note },
    });
    if (claimed.count === 0) return false;
    const last = await tx.placePhoto.aggregate({ where: { placeId }, _max: { order: true } });
    const start = (last._max.order ?? -1) + 1;
    await tx.placePhoto.createMany({
      data: kept.map((p, i) => ({
        placeId,
        key: p.key,
        credit: contribution.user?.name ?? null,
        order: start + i,
      })),
    });
    await tx.contributionPhoto.deleteMany({
      where: { id: { in: dropped.map((p) => p.id) } },
    });
    return true;
  });
  if (!published) return;

  updateTag("corpus");
  if (dropped.length > 0) {
    try {
      await deletePlacePhotos(dropped.map((p) => p.key));
    } catch (e) {
      console.error("Failed to delete unkept contribution photo objects", e);
    }
  }
  if (contribution.user) {
    await notify(
      contribution.user.email,
      photosPublishedEmail({
        placeName: contribution.place.name,
        placeUrl: `${SITE_URL}/lieux/${contribution.place.slug}`,
        count: kept.length,
        note,
      }),
    );
  }
  revalidatePath("/admin/contributions");
}

export async function rejectContribution(
  contributionId: string,
  formData: FormData,
): Promise<void> {
  await assertAdmin();
  const contribution = await prisma.contribution.findUnique({
    where: { id: contributionId },
    include: { user: true, photos: true },
  });
  if (!contribution || contribution.status !== "PENDING") return;

  const note = readNote(formData);
  const rejected = await prisma.contribution.updateMany({
    where: { id: contribution.id, status: "PENDING" },
    data: { status: "REJECTED", reviewNote: note, reviewedAt: new Date() },
  });
  if (rejected.count === 0) return;

  if (contribution.photos.length > 0) {
    try {
      await deletePlacePhotos(contribution.photos.map((p) => p.key));
      await prisma.contributionPhoto.deleteMany({ where: { contributionId: contribution.id } });
    } catch (e) {
      console.error("Failed to delete contribution photo objects", e);
    }
  }

  if (contribution.user) {
    await notify(contribution.user.email, contributionRejectedEmail({ note }));
  }
  revalidatePath("/admin/contributions");
}
