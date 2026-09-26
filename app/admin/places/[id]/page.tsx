import type { Metadata } from "next";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/src/corpus/db";
import { getAllPlaces, getGoverningAuthorities, getSignalZones } from "@/src/corpus/queries";
import { placePhotoUrl } from "@/src/storage/place-photos";
import { PlaceForm } from "../PlaceForm";
import { updatePlace } from "../actions";

export const metadata: Metadata = {
  title: "Modifier le lieu — Admin",
  robots: { index: false, follow: false },
};

export default async function AdminEditPlacePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erreur?: string }>;
}) {
  await connection();

  const { id } = await params;
  const { erreur } = await searchParams;

  const place = await prisma.place.findUnique({ where: { id } });
  if (!place) notFound();

  const [zones, zonePlaces, places, governingAuthorities, images, photos] = await Promise.all([
    getSignalZones(),
    prisma.zonePlace.findMany({ where: { placeId: id }, select: { signalZoneId: true } }),
    getAllPlaces(),
    getGoverningAuthorities(),
    prisma.placeImage.findMany({ where: { placeId: id }, orderBy: { order: "asc" } }),
    prisma.placePhoto.findMany({ where: { placeId: id }, orderBy: { order: "asc" } }),
  ]);
  const selectedZoneIds = new Set(zonePlaces.map((zp) => zp.signalZoneId));
  const parentOptions = places.filter((p) => !p.parentId && p.id !== id);
  const hasChildren = places.some((p) => p.parentId === id);

  return (
    <main className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-display text-2xl">Modifier {place.name}</h1>
        {place.status === "ACTIVE" && (
          <Link
            href={`/lieux/${place.slug}`}
            target="_blank"
            className="rounded-[10px] border border-sable/40 px-4 py-2 text-sm text-encre/70 transition-colors hover:border-mediterranee hover:text-mediterranee"
          >
            Voir la page publique ↗
          </Link>
        )}
      </div>
      {erreur === "photos" && (
        <p className="rounded-[10px] border border-statut-rouge/40 p-3 text-sm text-statut-rouge">
          Le lieu a été créé, mais certaines photos n&apos;ont pas pu être envoyées. Ajoutez-les à
          nouveau ci-dessous.
        </p>
      )}
      <PlaceForm
        action={updatePlace.bind(null, place.id)}
        place={place}
        zones={zones}
        selectedZoneIds={selectedZoneIds}
        parentOptions={parentOptions}
        hasChildren={hasChildren}
        governingAuthorities={governingAuthorities}
        imageUrls={images.map((img) => img.url)}
        photos={photos.map((p) => ({ id: p.id, src: placePhotoUrl(p.key), credit: p.credit }))}
      />
    </main>
  );
}
