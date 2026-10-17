"use server";

import { prisma } from "@/src/corpus/db";
import { getPlaceBySlug } from "@/src/corpus/queries";
import { CorrectionInputSchema } from "@/src/contributions/schema";
import { submitContribution, type FormState } from "@/src/contributions/submit";

export async function submitCorrection(
  slug: string,
  claimId: string | null,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const field = (key: string) => {
    const v = formData.get(key);
    return typeof v === "string" ? v : "";
  };
  const values = Object.fromEntries(
    ["correctionKind", "text", "name", "commune", "email", "consent"].map((k) => [k, field(k)]),
  );
  const rawKind = formData.get("correctionKind");
  const parsed = CorrectionInputSchema.safeParse({
    correctionKind: typeof rawKind === "string" && rawKind ? rawKind : undefined,
    text: formData.get("text"),
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0]);
      fieldErrors[key] ??=
        key === "text"
          ? "Votre message doit faire entre 10 et 1000 caractères."
          : "Choisissez une option dans la liste.";
    }
    return { fieldErrors, values };
  }

  const place = await getPlaceBySlug(slug);
  if (!place) return { error: "Ce lieu n'est plus disponible.", values };

  if (claimId) {
    const claim = await prisma.claim.findFirst({
      where: {
        id: claimId,
        status: "PUBLISHED",
        isPublic: true,
        placeId: { in: place.parent ? [place.id, place.parent.id] : [place.id] },
      },
      select: { id: true },
    });
    if (!claim) return { error: "Ce conseil n'est plus en ligne.", values };
  }

  const result = await submitContribution({
    data: {
      type: "CORRECTION",
      placeId: place.id,
      claimId: claimId ?? undefined,
      correctionKind: parsed.data.correctionKind,
      text: parsed.data.text,
    },
    formData,
    formPath: claimId ? `/lieux/${slug}/corriger/${claimId}` : `/lieux/${slug}/corriger`,
    next: `/lieux/${slug}`,
  });
  return { ...result, values };
}
