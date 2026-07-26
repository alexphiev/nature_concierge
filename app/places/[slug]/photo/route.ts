import { getPlaceBySlug } from "@/src/corpus/queries";
import { getGooglePlaceDetails } from "@/src/corpus/google-places";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
): Promise<Response> {
  const { slug } = await params;
  const place = await getPlaceBySlug(slug);

  if (!place) {
    return new Response(null, { status: 404 });
  }

  const details = await getGooglePlaceDetails(place.googlePlaceId);

  if (!details?.photo) {
    return new Response(null, { status: 404 });
  }

  return Response.redirect(details.photo.mediaUrl, 307);
}
