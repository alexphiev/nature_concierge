import type { Metadata } from "next";
import { connection } from "next/server";
import { getSignalZones } from "@/src/corpus/queries";
import { PlaceForm } from "../PlaceForm";
import { createPlace } from "../actions";

export const metadata: Metadata = {
  title: "Nouveau lieu — Admin — Nature Concierge",
  robots: { index: false, follow: false },
};

export default async function AdminNewPlacePage() {
  await connection();

  const zones = await getSignalZones();

  return (
    <main className="flex flex-col gap-6">
      <h1 className="font-display text-2xl">Nouveau lieu</h1>
      <PlaceForm action={createPlace} zones={zones} />
    </main>
  );
}
