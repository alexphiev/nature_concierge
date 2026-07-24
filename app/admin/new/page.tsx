import { connection } from "next/server";
import { getActivePlaces } from "@/src/corpus/queries";
import { submitCapture } from "./actions";

export default async function AdminNewCapturePage() {
  await connection();

  const places = await getActivePlaces();

  return (
    <main className="flex flex-col gap-6">
      <h1 className="font-display text-2xl">Nouvelle capture</h1>
      <form action={submitCapture} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-sm text-encre/70">Texte (email, message, observation…)</span>
          <textarea
            name="text"
            rows={8}
            className="rounded-[10px] border border-sable/40 bg-calcaire-deep p-3"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm text-encre/70">Images (panneau, document, capture d'écran)</span>
          <input
            type="file"
            name="images"
            accept="image/*"
            multiple
            className="rounded-[10px] border border-sable/40 bg-calcaire-deep p-3"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm text-encre/70">Lieu concerné (si connu)</span>
          <select
            name="placeSlug"
            className="rounded-[10px] border border-sable/40 bg-calcaire-deep p-3"
          >
            <option value="">— Nouveau lieu ou non déterminé —</option>
            {places.map((place) => (
              <option key={place.id} value={place.slug}>
                {place.name}
              </option>
            ))}
          </select>
        </label>

        <button
          type="submit"
          className="flex w-full items-center justify-center gap-2 rounded-[10px] bg-mediterranee px-5 py-3 text-white sm:w-auto"
        >
          Extraire
        </button>
      </form>
    </main>
  );
}
