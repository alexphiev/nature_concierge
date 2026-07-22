import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getActivePlaces,
  getPlaceBySlug,
  getTodayStatus,
} from "@/src/corpus/queries";
import { StatusBlock } from "@/src/components/StatusBlock";
import { ClaimList } from "@/src/components/ClaimList";
import { WhatsAppCTA } from "@/src/components/WhatsAppCTA";
import { AlternativeCallout } from "@/src/components/AlternativeCallout";

export const revalidate = 900;

export async function generateStaticParams() {
  const places = await getActivePlaces();
  return places.map((place) => ({ slug: place.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const place = await getPlaceBySlug(slug);
  if (!place) return {};

  return {
    title: `${place.name} : ouvert aujourd'hui ? Accès, parking, affluence — ${place.commune}`,
    description:
      place.claims[0]?.claimText ??
      `Statut du jour, accès et conseils pour ${place.name}.`,
  };
}

export default async function PlaceDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const place = await getPlaceBySlug(slug);

  if (!place) notFound();

  const statusLog = await getTodayStatus(place.id);

  return (
    <main className="mx-auto flex max-w-[720px] flex-col gap-8 px-4 py-12">
      <StatusBlock statusLog={statusLog} officialInfoUrl={place.officialInfoUrl} />

      <div>
        <h1 className="font-display text-3xl">{place.name}</h1>
        <p className="text-sm text-encre/70">{place.commune}</p>
        {place.description && <p className="mt-3">{place.description}</p>}
      </div>

      <ClaimList claims={place.claims} />

      <WhatsAppCTA placeName={place.name} />

      <AlternativeCallout claims={place.claims} />
    </main>
  );
}
