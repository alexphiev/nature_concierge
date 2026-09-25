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
  }

  revalidatePath("/admin/statut", "page");
}
