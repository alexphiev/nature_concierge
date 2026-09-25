import { ImageResponse } from "next/og";
import { notFound } from "next/navigation";
import { getActivePlaces, getPlaceBySlug } from "@/src/corpus/queries";
import { TYPE_LABELS } from "@/src/components/PlaceCard";
import { SITE_NAME } from "@/src/site";

export const alt = SITE_NAME;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export async function generateStaticParams() {
  const places = await getActivePlaces();
  return places.map((place) => ({ slug: place.slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const place = await getPlaceBySlug(slug);
  if (!place) notFound();

  const typeLabel = TYPE_LABELS[place.type] ?? place.type;

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          width: "100%",
          height: "100%",
          padding: 64,
          background: "#FAF7F0",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div
            style={{
              display: "flex",
              fontSize: 26,
              letterSpacing: 2,
              textTransform: "uppercase",
              color: "#4A6B4D",
            }}
          >
            {typeLabel} · {place.commune} ({place.departement})
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 68,
              fontWeight: 600,
              lineHeight: 1.1,
              color: "#1C2B33",
            }}
          >
            {place.name}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ display: "flex", fontSize: 28, fontWeight: 600, color: "#0F4C5C" }}>
            {SITE_NAME}
          </div>
          <div style={{ display: "flex", fontSize: 20, color: "#0F4C5C" }}>
            Statut du jour, accès, conseils vérifiés
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
