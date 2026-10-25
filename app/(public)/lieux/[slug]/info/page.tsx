import type { Metadata } from "next";
import { TipPage } from "@/src/components/contribute/TipPage";
import { getActivePlaces, getPlaceBySlug } from "@/src/corpus/queries";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const places = await getActivePlaces();
  const params = places.map((place) => ({ slug: place.slug }));
  // cacheComponents rejects an empty list; the placeholder resolves to notFound().
  return params.length > 0 ? params : [{ slug: "_" }];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const place = await getPlaceBySlug(slug);
  if (!place) return {};
  return {
    title: `Ajouter une info pratique — ${place.name}`,
    robots: { index: false },
  };
}

export default async function PracticalInfoPage({ params }: Props) {
  const { slug } = await params;
  return <TipPage slug={slug} kind="PRACTICAL_INFO" />;
}
