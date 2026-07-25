import type { Metadata } from "next";
import { connection } from "next/server";
import Link from "next/link";
import { prisma } from "@/src/corpus/db";
import { getAllPlaces } from "@/src/corpus/queries";

export const metadata: Metadata = {
  title: "Lieux — Admin — Nature Concierge",
  robots: { index: false, follow: false },
};

export default async function AdminPlacesPage() {
  await connection();

  const places = await getAllPlaces();

  const claimCounts = await prisma.claim.groupBy({
    by: ["placeId"],
    where: { status: "PUBLISHED" },
    _count: { _all: true },
  });
  const claimCountByPlaceId = new Map(claimCounts.map((c) => [c.placeId, c._count._all]));

  return (
    <main className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-display text-2xl">Lieux</h1>
        <Link
          href="/admin/places/new"
          className="rounded-[10px] bg-mediterranee px-5 py-3 text-white"
        >
          Nouveau lieu
        </Link>
      </div>

      {places.length === 0 ? (
        <p className="text-sm text-encre/70">Aucun lieu.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-sable/40 text-left text-encre/70">
                <th className="p-2">Nom</th>
                <th className="p-2">Commune</th>
                <th className="p-2">Département</th>
                <th className="p-2">Statut</th>
                <th className="p-2">Rang</th>
                <th className="p-2">Claims publiés</th>
              </tr>
            </thead>
            <tbody>
              {places.map((place) => (
                <tr key={place.id} className="border-b border-sable/20">
                  <td className="p-2">
                    <Link href={`/admin/places/${place.id}`} className="text-mediterranee underline">
                      {place.name}
                    </Link>
                  </td>
                  <td className="p-2">{place.commune}</td>
                  <td className="p-2">{place.departement}</td>
                  <td className="p-2">{place.status}</td>
                  <td className="p-2">{place.demandRank}</td>
                  <td className="p-2">{claimCountByPlaceId.get(place.id) ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
