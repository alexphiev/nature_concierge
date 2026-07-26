import type { Metadata } from "next";
import { connection } from "next/server";
import { getAllPlaces } from "@/src/corpus/queries";
import { SourceTypeSchema } from "@/src/corpus/schema";
import { BlockList } from "./BlockList";
import { createCapture } from "./actions";

export const metadata: Metadata = {
  title: "Nouvelle capture — Admin — Nature Concierge",
  robots: { index: false, follow: false },
};

const inputClass = "rounded-[10px] border border-sable/40 bg-calcaire-deep p-3";

export default async function AdminIngestPage() {
  await connection();

  const places = await getAllPlaces();
  const sourceTypes = SourceTypeSchema.options;

  return (
    <main className="flex flex-col gap-6">
      <h1 className="font-display text-2xl">Nouvelle capture</h1>

      <form action={createCapture} className="flex flex-col gap-6">
        <label className="flex flex-col gap-1">
          <span className="text-sm text-encre/70">Lieu</span>
          <div className="flex items-center gap-3">
            <select name="placeId" required className={inputClass}>
              <option value="">— choisir un lieu —</option>
              {places.map((place) => (
                <option key={place.id} value={place.id}>
                  {place.name} ({place.commune})
                </option>
              ))}
            </select>
            <a href="/admin/places/new" target="_blank" className="text-sm text-mediterranee underline">
              créer un lieu
            </a>
          </div>
        </label>

        <BlockList sourceTypes={sourceTypes} />

        <button
          type="submit"
          className="flex w-full items-center justify-center gap-2 rounded-[10px] bg-mediterranee px-5 py-3 text-white sm:w-auto"
        >
          Lancer l&apos;extraction
        </button>
      </form>
    </main>
  );
}
