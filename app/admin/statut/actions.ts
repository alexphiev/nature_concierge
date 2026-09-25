"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/src/corpus/db";

export async function saveStatus(formData: FormData): Promise<void> {
  const forDateInput = formData.get("forDate");
  if (typeof forDateInput !== "string" || forDateInput.length === 0) {
    throw new Error("forDate is required");
  }
  const forDate = new Date(`${forDateInput}T00:00:00.000Z`);

  const zoneIds = new Set<string>();
  for (const key of formData.keys()) {
    const match = key.match(/^zone-(.+)-value$/);
    if (match) zoneIds.add(match[1]);
  }

  for (const zoneId of zoneIds) {
    const value = formData.get(`zone-${zoneId}-value`);
    const detail = formData.get(`zone-${zoneId}-detail`);

    if (typeof value !== "string" || value.length === 0) continue;

    await prisma.statusLog.upsert({
      where: { signalZoneId_forDate: { signalZoneId: zoneId, forDate } },
      create: {
        signalZoneId: zoneId,
        forDate,
        value,
        detail: typeof detail === "string" && detail.length > 0 ? detail : null,
      },
      update: {
        value,
        detail: typeof detail === "string" && detail.length > 0 ? detail : null,
        confirmedAt: new Date(),
      },
    });

    const zonePlaces = await prisma.zonePlace.findMany({
      where: { signalZoneId: zoneId },
      include: {
        place: {
          select: {
            slug: true,
            parent: { select: { slug: true } },
            children: { select: { slug: true } },
          },
        },
      },
    });
    for (const zp of zonePlaces) {
      // Spots inherit their parent's zone, and a parent page shows its spots' status.
      const slugs = [zp.place.slug, zp.place.parent?.slug, ...zp.place.children.map((c) => c.slug)];
      for (const slug of slugs) {
        if (slug) revalidatePath(`/lieux/${slug}`, "page");
      }
    }
  }

  revalidatePath("/admin/statut", "page");
}
