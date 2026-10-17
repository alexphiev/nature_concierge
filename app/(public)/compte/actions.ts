"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { refresh, updateTag } from "next/cache";
import { auth } from "@/src/auth/auth";
import { getSessionUser } from "@/src/auth/session";
import { CommuneSchema, DisplayNameSchema } from "@/src/contributions/schema";
import type { FormState } from "@/src/contributions/submit";
import { prisma } from "@/src/corpus/db";
import { deletePlacePhotos } from "@/src/storage/place-photos";

function field(formData: FormData, key: string): string {
  const v = formData.get(key);
  return typeof v === "string" ? v : "";
}

export async function updateAccount(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await getSessionUser();
  if (!user) redirect("/compte");

  const values = { name: field(formData, "name"), commune: field(formData, "commune") };
  const name = DisplayNameSchema.safeParse(values.name);
  const commune = CommuneSchema.safeParse(values.commune);
  const fieldErrors: Record<string, string> = {};
  if (!name.success) fieldErrors.name = "Choisissez un nom de 2 à 40 caractères.";
  if (!commune.success) fieldErrors.commune = "La commune doit faire entre 2 et 80 caractères.";
  if (!name.success || !commune.success) return { fieldErrors, values };

  await prisma.user.update({
    where: { id: user.id },
    data: { name: name.data, commune: commune.data },
  });
  const [claims, places] = await Promise.all([
    prisma.claim.count({ where: { authorId: user.id } }),
    prisma.place.count({ where: { proposedById: user.id } }),
  ]);
  if (claims > 0 || places > 0) updateTag("corpus");
  else refresh();
  return { values: { ...values, saved: "1" } };
}

export async function signOutAction(): Promise<void> {
  await auth.api.signOut({ headers: await headers() });
  redirect("/");
}

export async function deleteAccount(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await getSessionUser();
  if (!user) redirect("/compte");

  if (field(formData, "confirm") !== "on") {
    return { fieldErrors: { confirm: "Cochez la case pour confirmer la suppression." } };
  }

  const photos = await prisma.contributionPhoto.findMany({
    where: {
      contribution: {
        OR: [
          { userId: user.id, status: { not: "APPROVED" } },
          { status: "UNCONFIRMED", pendingEmail: user.email },
        ],
      },
    },
    select: { key: true },
  });

  await auth.api.signOut({ headers: await headers() });

  await prisma.$transaction([
    prisma.claim.updateMany({ where: { authorId: user.id }, data: { authorDeleted: true } }),
    prisma.contribution.deleteMany({ where: { status: "UNCONFIRMED", pendingEmail: user.email } }),
    prisma.user.delete({ where: { id: user.id } }),
  ]);

  try {
    await deletePlacePhotos(photos.map((p) => p.key));
  } catch (error) {
    console.error("[account] photo cleanup failed", error);
  }
  updateTag("corpus");
  redirect("/");
}
