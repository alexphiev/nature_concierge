"use server";

import { revalidatePath, updateTag } from "next/cache";
import { assertAdmin } from "@/src/admin/assert-admin";
import { prisma } from "@/src/corpus/db";
import { TipInputSchema } from "@/src/contributions/schema";
import { sendEmail } from "@/src/email/send";
import { contributionRejectedEmail, tipPublishedEmail } from "@/src/email/templates";
import { deletePlacePhotos } from "@/src/storage/place-photos";
import { SITE_URL } from "@/src/site";

function readNote(formData: FormData): string | null {
  return String(formData.get("note") ?? "").trim() || null;
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
  if (!parsed.success) return;
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
