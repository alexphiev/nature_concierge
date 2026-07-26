export type GooglePlacePhoto = {
  mediaUrl: string;
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

  const photo: GooglePlacePhoto | null = firstPhoto
    ? {
        mediaUrl: `https://places.googleapis.com/v1/${firstPhoto.name}/media?key=${apiKey}&maxWidthPx=1200`,
        attribution: firstPhoto.authorAttributions?.[0]?.displayName ?? null,
      }
    : null;

  return {
    photo,
    googleMapsUri: data.googleMapsUri ?? null,
  };
}
