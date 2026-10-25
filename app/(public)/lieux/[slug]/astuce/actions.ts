"use server";

import type { ClaimKind } from "../../../../../prisma/generated/client";
import { getPlaceBySlug } from "@/src/corpus/queries";
import { TIP_KIND_COPY, TipInputSchema } from "@/src/contributions/schema";
import { readFormValues } from "@/src/contributions/form-values";
import { submitContribution, type FormState } from "@/src/contributions/submit";

const FIELD_ERRORS: Record<string, string> = {
  text: "Votre texte doit faire entre 10 et 500 caractères.",
  claimType: "Choisissez un thème dans la liste.",
  sourceHint: "La source doit faire moins de 300 caractères.",
};

export async function submitTip(
  slug: string,
  kind: ClaimKind,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const values = readFormValues(formData, [
    "claimType",
    "text",
    "sourceHint",
    "name",
    "commune",
    "email",
    "consent",
  ]);
  const rawTheme = formData.get("claimType");
  const rawSource = formData.get("sourceHint");
  const parsed = TipInputSchema.safeParse({
    kind,
    claimType: typeof rawTheme === "string" && rawTheme ? rawTheme : undefined,
    text: formData.get("text"),
    sourceHint: typeof rawSource === "string" ? rawSource : undefined,
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0]);
      fieldErrors[key] ??= FIELD_ERRORS[key] ?? "Valeur invalide.";
    }
    return { fieldErrors, values };
  }

  const place = await getPlaceBySlug(slug);
  if (!place) return { error: "Ce lieu n'est plus disponible.", values };

  const result = await submitContribution({
    data: {
      type: "TIP",
      placeId: place.id,
      text: parsed.data.text,
      claimType: parsed.data.claimType,
      claimKind: parsed.data.kind,
      sourceHint: parsed.data.sourceHint,
    },
    formData,
    formPath: `/lieux/${slug}/${TIP_KIND_COPY[parsed.data.kind].path}`,
    next: `/lieux/${slug}`,
  });
  return { ...result, values };
}
