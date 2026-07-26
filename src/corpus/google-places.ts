export type GooglePlacePhoto = {
  // A genuinely public lh3.googleusercontent.com URL with its own embedded
  // token — NOT the places.googleapis.com media endpoint, which requires
  // GOOGLE_PLACES_API_KEY as a query param. Safe to send to the browser.
  photoUri: string;
  attribution: string | null;
};

export type GooglePlaceDetails = {
  photo: GooglePlacePhoto | null;
  googleMapsUri: string | null;
};

type PlaceDetailsResponse = {
  photos?: {
    name: string;
    authorAttributions?: { displayName?: string }[];
  }[];
  googleMapsUri?: string;
};

type PhotoMediaResponse = {
  photoUri?: string;
};

export async function getGooglePlaceDetails(
  googlePlaceId: string | null,
): Promise<GooglePlaceDetails | null> {
  if (!googlePlaceId) return null;

  const apiKey = process.env.GOOGLE_PLACES_API_KEY ?? "";

  let response: Response;
  try {
    response = await fetch(
      `https://places.googleapis.com/v1/places/${googlePlaceId}`,
      {
        headers: {
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask": "photos,googleMapsUri",
        },
        next: { revalidate: 604800 },
      },
    );
  } catch {
    return null;
  }

  if (!response.ok) return null;

  const data = (await response.json()) as PlaceDetailsResponse;
  const firstPhoto = data.photos?.[0];

  const photo = firstPhoto
    ? await resolvePhotoUri(firstPhoto.name, apiKey, firstPhoto.authorAttributions)
    : null;

  return {
    photo,
    googleMapsUri: data.googleMapsUri ?? null,
  };
}

async function resolvePhotoUri(
  photoName: string,
  apiKey: string,
  authorAttributions?: { displayName?: string }[],
): Promise<GooglePlacePhoto | null> {
  let mediaResponse: Response;
  try {
    mediaResponse = await fetch(
      `https://places.googleapis.com/v1/${photoName}/media?key=${apiKey}&maxWidthPx=1200&skipHttpRedirect=true`,
      { next: { revalidate: 604800 } },
    );
  } catch {
    return null;
  }

  if (!mediaResponse.ok) return null;

  const mediaData = (await mediaResponse.json()) as PhotoMediaResponse;
  if (!mediaData.photoUri) return null;

  return {
    photoUri: mediaData.photoUri,
    attribution: authorAttributions?.[0]?.displayName ?? null,
  };
}
