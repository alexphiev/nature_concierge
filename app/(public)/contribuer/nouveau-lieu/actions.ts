"use server";

import { readFormValues } from "@/src/contributions/form-values";
import { PlaceProposalSchema } from "@/src/contributions/schema";
import { submitContribution, type FormState } from "@/src/contributions/submit";

const FIELD_MESSAGES: Record<string, string> = {
  placeName: "Le nom du lieu doit faire entre 2 et 120 caractères.",
  placeCommune: "La commune doit faire entre 2 et 80 caractères.",
  locationHint: "Les indications doivent faire 500 caractères maximum.",
  text: "Votre message doit faire entre 10 et 1000 caractères.",
};

export async function submitPlaceProposal(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const values = readFormValues(formData, [
    "placeName",
    "placeCommune",
    "locationHint",
    "text",
    "name",
    "commune",
    "email",
    "consent",
  ]);
  const parsed = PlaceProposalSchema.safeParse({
    placeName: values.placeName,
    placeCommune: values.placeCommune,
    locationHint: values.locationHint,
    text: values.text,
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0]);
      fieldErrors[key] ??= FIELD_MESSAGES[key] ?? "Valeur invalide.";
    }
    return { fieldErrors, values };
  }

  const result = await submitContribution({
    data: { type: "PLACE", placeId: null, ...parsed.data },
    formData,
    formPath: "/contribuer/nouveau-lieu",
    next: "/lieux",
  });
  return { ...result, values };
}
