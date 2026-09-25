export type GooglePlacePhoto = {
  // A genuinely public lh3.googleusercontent.com URL with its own embedded
  // token — NOT the places.googleapis.com media endpoint, which requires
  // GOOGLE_PLACES_API_KEY as a query param. Safe to send to the browser.
  photoUri: string;
  attribution: string | null;
};

export type GooglePlaceDetails = {
  photo: GooglePlacePhoto | null;
  // One entry per photo Google returns (up to 10), read from the Details
  // response itself — no media call. Lets callers page through photos and
  // resolve each one only when it's actually shown.
  photoAttributions: (string | null)[];
};

type PlaceDetailsPhoto = {
  name: string;
  authorAttributions?: { displayName?: string }[];
};

type PlaceDetailsResponse = {
  photos?: PlaceDetailsPhoto[];
};

type PhotoMediaResponse = {
  photoUri?: string;
};

function apiKey(): string {
  return process.env.GOOGLE_PLACES_API_KEY ?? "";
}

async function fetchPlaceDetails(googlePlaceId: string): Promise<PlaceDetailsResponse | null> {
  let response: Response;
  try {
    response = await fetch(
      `https://places.googleapis.com/v1/places/${googlePlaceId}`,
      {
        headers: {
          "X-Goog-Api-Key": apiKey(),
          // Keep this to "photos" only: it bills as Place Details Essentials
          // (IDs Only), which is free and unlimited. Adding e.g. googleMapsUri
          // would bill the whole request as Pro.
          "X-Goog-FieldMask": "photos",
        },
        next: { revalidate: 604800 },
      },
    );
  } catch {
    return null;
  }

  if (!response.ok) return null;

  return (await response.json()) as PlaceDetailsResponse;
}

export async function getGooglePlaceDetails(
  googlePlaceId: string | null,
): Promise<GooglePlaceDetails | null> {
  if (!googlePlaceId) return null;

  const data = await fetchPlaceDetails(googlePlaceId);
  if (!data) return null;

  const firstPhoto = data.photos?.[0];
  const photo = firstPhoto ? await resolvePhotoUri(firstPhoto) : null;

  return {
    photo,
    photoAttributions: (data.photos ?? []).map(attributionOf),
  };
}

// Built from a Maps URL (https://developers.google.com/maps/documentation/urls/get-started)
// instead of requesting googleMapsUri from the API, which costs a Pro call.
export function googleMapsUrl(query: string, googlePlaceId: string | null): string {
  const params = new URLSearchParams({ api: "1", query });
  if (googlePlaceId) params.set("query_place_id", googlePlaceId);
  return `https://www.google.com/maps/search/?${params}`;
}

export async function getGooglePlacePhoto(
  googlePlaceId: string | null,
  index: number,
): Promise<GooglePlacePhoto | null> {
  if (!googlePlaceId) return null;

  const data = await fetchPlaceDetails(googlePlaceId);
  const photo = data?.photos?.[index];
  if (!photo) return null;

  return resolvePhotoUri(photo);
}

function attributionOf(photo: PlaceDetailsPhoto): string | null {
  return photo.authorAttributions?.[0]?.displayName ?? null;
}

async function resolvePhotoUri(photo: PlaceDetailsPhoto): Promise<GooglePlacePhoto | null> {
  let mediaResponse: Response;
  try {
    mediaResponse = await fetch(
      `https://places.googleapis.com/v1/${photo.name}/media?key=${apiKey()}&maxWidthPx=1200&skipHttpRedirect=true`,
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
    attribution: attributionOf(photo),
  };
}
