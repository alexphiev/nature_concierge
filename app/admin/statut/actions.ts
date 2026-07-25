"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/src/corpus/db";

function forDateFor(signalType: string): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  if (signalType === "FIRE_ACCESS") {
    d.setDate(d.getDate() + 1);
  }
  return d;
}

export async function saveStatus(formData: FormData): Promise<void> {
  const zoneIds = new Set<string>();
  for (const key of formData.keys()) {
    const match = key.match(/^zone-(.+)-value$/);
    if (match) zoneIds.add(match[1]);
  }

  for (const zoneId of zoneIds) {
    const value = formData.get(`zone-${zoneId}-value`);
    const signalType = formData.get(`zone-${zoneId}-signalType`);
    const detail = formData.get(`zone-${zoneId}-detail`);

    if (typeof value !== "string" || value.length === 0) continue;
    if (typeof signalType !== "string") continue;

    const forDate = forDateFor(signalType);

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
      include: { place: { select: { slug: true } } },
    });
    for (const zp of zonePlaces) {
      revalidatePath(`/places/${zp.place.slug}`, "page");
    }
  }
}
