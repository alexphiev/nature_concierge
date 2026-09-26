import { placePhotoUrl } from "../storage/place-photos";
import { getGooglePlaceDetails } from "./google-places";

export const MIN_GALLERY_PHOTOS = 5;

// `uploaded` photos are served from Neon Object Storage through next/image;
// the others point at the /lieux/[slug]/photo redirect to Google.
export type DisplayPhoto = { src: string; credit: string | null; uploaded: boolean };

export type UploadedPhoto = { key: string; credit: string | null };

function uploadedPhoto(photo: UploadedPhoto): DisplayPhoto {
  return { src: placePhotoUrl(photo.key), credit: photo.credit, uploaded: true };
}

function googlePhoto(slug: string, index: number, credit: string | null): DisplayPhoto {
  const src = index === 0 ? `/lieux/${slug}/photo` : `/lieux/${slug}/photo?i=${index}`;
  return { src, credit, uploaded: false };
}

export function buildGallerySlides({
  slug,
  uploaded,
  googleAttributions,
}: {
  slug: string;
  uploaded: UploadedPhoto[];
  googleAttributions: (string | null)[];
}): DisplayPhoto[] {
  const slides = uploaded.map(uploadedPhoto);
  const googleCount = Math.min(Math.max(MIN_GALLERY_PHOTOS - slides.length, 0), googleAttributions.length);
  for (let index = 0; index < googleCount; index++) {
    slides.push(googlePhoto(slug, index, googleAttributions[index]));
  }
  return slides;
}

export async function resolveCoverPhoto(place: {
  slug: string;
  googlePlaceId: string | null;
  photos: UploadedPhoto[];
}): Promise<DisplayPhoto | null> {
  if (place.photos[0]) return uploadedPhoto(place.photos[0]);

  const details = await getGooglePlaceDetails(place.googlePlaceId);
  return details?.photo ? googlePhoto(place.slug, 0, details.photo.attribution) : null;
}
