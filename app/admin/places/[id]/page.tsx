import type { Metadata } from "next";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { prisma } from "@/src/corpus/db";
import { getAllPlaces, getGoverningAuthorities, getSignalZones } from "@/src/corpus/queries";
import { PlaceForm } from "../PlaceForm";
import { updatePlace } from "../actions";

export const metadata: Metadata = {
  title: "Modifier le lieu — Admin — Nature Concierge",
  robots: { index: false, follow: false },
};

export default async function AdminEditPlacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await connection();

  const { id } = await params;

  const place = await prisma.place.findUnique({ where: { id } });
  if (!place) notFound();

  const [zones, zonePlaces, places, governingAuthorities] = await Promise.all([
    getSignalZones(),
    prisma.zonePlace.findMany({ where: { placeId: id }, select: { signalZoneId: true } }),
    getAllPlaces(),
    getGoverningAuthorities(),
  ]);
  const selectedZoneIds = new Set(zonePlaces.map((zp) => zp.signalZoneId));
  const parentOptions = places.filter((p) => !p.parentId && p.id !== id);
  const hasChildren = places.some((p) => p.parentId === id);

  return (
    <main className="flex flex-col gap-6">
      <h1 className="font-display text-2xl">Modifier {place.name}</h1>
      <PlaceForm
        action={updatePlace.bind(null, place.id)}
        place={place}
        zones={zones}
        selectedZoneIds={selectedZoneIds}
        parentOptions={parentOptions}
        hasChildren={hasChildren}
        governingAuthorities={governingAuthorities}
      />
    </main>
  );
}
