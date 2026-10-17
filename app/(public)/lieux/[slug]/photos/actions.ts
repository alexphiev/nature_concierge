"use server";

import { getPlaceBySlug } from "@/src/corpus/queries";
import { readFormValues } from "@/src/contributions/form-values";
import type { ContributionPhotoUpload } from "@/src/contributions/service";
import { submitContribution, type FormState } from "@/src/contributions/submit";
import {
  CONTRIBUTION_PHOTO_MAX_BYTES,
  CONTRIBUTION_PHOTOS_MAX,
  CONTRIBUTION_PHOTOS_TOTAL_MAX_BYTES,
  isPlacePhotoType,
  sniffPlacePhotoType,
} from "@/src/storage/photo-types";

const BAD_FORMAT = "Format non supporté (JPEG, PNG ou WebP).";
const TOO_HEAVY = "Photos trop lourdes, réessayez avec moins de photos.";

export async function submitPhotos(
  slug: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const values = readFormValues(formData, ["name", "commune", "email", "consent"]);
  const photoError = (message: string): FormState => ({ fieldErrors: { photos: message }, values });

  const files = formData.getAll("photos");
  if (files.length < 1 || files.length > CONTRIBUTION_PHOTOS_MAX) {
    return photoError("Ajoutez entre 1 et 6 photos.");
  }
  const valid: File[] = [];
  let total = 0;
  for (const file of files) {
    if (!(file instanceof File) || !isPlacePhotoType(file.type)) return photoError(BAD_FORMAT);
    if (file.size > CONTRIBUTION_PHOTO_MAX_BYTES) return photoError(TOO_HEAVY);
    total += file.size;
    valid.push(file);
  }
  if (total > CONTRIBUTION_PHOTOS_TOTAL_MAX_BYTES) return photoError(TOO_HEAVY);

  const photos: ContributionPhotoUpload[] = [];
  for (const file of valid) {
    const body = new Uint8Array(await file.arrayBuffer());
    const type = sniffPlacePhotoType(body);
    if (!type) return photoError(BAD_FORMAT);
    photos.push({ body, type });
  }

  if (formData.get("photosConsent") !== "on") {
    return {
      fieldErrors: { photosConsent: "Merci de confirmer que vous avez pris ces photos." },
      values,
    };
  }

  const place = await getPlaceBySlug(slug);
  if (!place) return { error: "Ce lieu n'est plus disponible.", values };

  const result = await submitContribution({
    data: { type: "PHOTOS", placeId: place.id, photosConsentAt: new Date() },
    photos,
    formData,
    formPath: `/lieux/${slug}/photos`,
    next: `/lieux/${slug}`,
  });
  return { ...result, values };
}
