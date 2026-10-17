"use server";

import { getPlaceBySlug } from "@/src/corpus/queries";
import { TipInputSchema } from "@/src/contributions/schema";
import { readFormValues } from "@/src/contributions/form-values";
import { submitContribution, type FormState } from "@/src/contributions/submit";

export async function submitTip(
  slug: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const values = readFormValues(formData, ["claimType", "text", "name", "commune", "email", "consent"]);
  const rawTheme = formData.get("claimType");
  const parsed = TipInputSchema.safeParse({
    claimType: typeof rawTheme === "string" && rawTheme ? rawTheme : undefined,
    text: formData.get("text"),
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0]);
      fieldErrors[key] ??=
        key === "text"
          ? "Votre astuce doit faire entre 10 et 500 caractères."
          : "Choisissez un thème dans la liste.";
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
    },
    formData,
    formPath: `/lieux/${slug}/astuce`,
    next: `/lieux/${slug}`,
  });
  return { ...result, values };
}
