import type { Metadata } from "next";
import { connection } from "next/server";
import Link from "next/link";
import { prisma } from "@/src/corpus/db";
import { getAllPlaces } from "@/src/corpus/queries";

export const metadata: Metadata = {
  title: "Lieux — Admin — Nature Concierge",
  robots: { index: false, follow: false },
};

const PLACE_STATUS_STYLE: Record<string, string> = {
  DRAFT: "text-statut-inconnu bg-statut-inconnu/15",
  ACTIVE: "text-statut-vert bg-statut-vert/15",
  RETIRED: "text-statut-rouge bg-statut-rouge/15",
};

function PlaceStatusPill({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[0.7rem] uppercase tracking-wide ${PLACE_STATUS_STYLE[status] ?? "text-statut-inconnu bg-statut-inconnu/15"}`}
    >
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
}

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
          className="rounded-[10px] bg-mediterranee px-5 py-3 text-white transition-colors hover:bg-mediterranee-deep"
        >
          Nouveau lieu
        </Link>
      </div>

      {places.length === 0 ? (
        <p className="text-sm text-encre/70">Aucun lieu.</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-sable/45 bg-calcaire-deep">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-sable/40 text-left font-mono text-xs tracking-wide text-encre/70 uppercase">
                <th className="p-3">Nom</th>
                <th className="p-3">Commune</th>
                <th className="p-3">Département</th>
                <th className="p-3">Statut</th>
                <th className="p-3">Rang</th>
                <th className="p-3">Claims publiés</th>
              </tr>
            </thead>
            <tbody>
              {places.map((place) => (
                <tr
                  key={place.id}
                  className="border-b border-sable/20 last:border-b-0 hover:bg-calcaire/60"
                >
                  <td className="p-3">
                    <Link
                      href={`/admin/places/${place.id}`}
                      className="text-mediterranee underline hover:no-underline"
                    >
                      {place.name}
                    </Link>
                  </td>
                  <td className="p-3">{place.commune}</td>
                  <td className="p-3">{place.departement}</td>
                  <td className="p-3">
                    <PlaceStatusPill status={place.status} />
                  </td>
                  <td className="p-3">{place.demandRank}</td>
                  <td className="p-3">{claimCountByPlaceId.get(place.id) ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
