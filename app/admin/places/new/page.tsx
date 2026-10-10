import type { Metadata } from "next";
import { connection } from "next/server";
import { getAllPlaces, getGoverningAuthorities } from "@/src/corpus/queries";
import { PlaceForm } from "../PlaceForm";
import { createPlace } from "../actions";

export const metadata: Metadata = {
  title: "Nouveau lieu — Admin",
  robots: { index: false, follow: false },
};

export default async function AdminNewPlacePage() {
  await connection();

  const [places, governingAuthorities] = await Promise.all([
    getAllPlaces(),
    getGoverningAuthorities(),
  ]);
  const parentOptions = places.filter((p) => !p.parentId);

  return (
    <main className="flex flex-col gap-6">
      <h1 className="font-display text-2xl">Nouveau lieu</h1>
      <PlaceForm
        action={createPlace}
        parentOptions={parentOptions}
        governingAuthorities={governingAuthorities}
      />
    </main>
  );
}
