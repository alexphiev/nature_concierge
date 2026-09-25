import { getPlaceBySlug } from "@/src/corpus/queries";
import { getGooglePlacePhoto } from "@/src/corpus/google-places";

// Places Details returns at most 10 photos.
const MAX_PHOTO_INDEX = 9;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
): Promise<Response> {
  const index = Number(new URL(request.url).searchParams.get("i") ?? 0);
  if (!Number.isInteger(index) || index < 0 || index > MAX_PHOTO_INDEX) {
    return new Response(null, { status: 404 });
  }

  const { slug } = await params;
  const place = await getPlaceBySlug(slug);

  if (!place) {
    return new Response(null, { status: 404 });
  }

  const photo = await getGooglePlacePhoto(place.googlePlaceId, index);

  if (!photo) {
    return new Response(null, { status: 404 });
  }

  // photoUri is a genuinely public lh3.googleusercontent.com URL with its
  // own embedded token — it never contains GOOGLE_PLACES_API_KEY, so
  // redirecting the browser straight to it is safe.
  return new Response(null, {
    status: 307,
    headers: {
      Location: photo.photoUri,
      // Lets the CDN answer repeat views without running this handler (DB
      // lookup) again; kept well under the 7-day server cache of the URI.
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
