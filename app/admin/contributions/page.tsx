import type { Metadata } from "next";
import { connection } from "next/server";
import { prisma } from "@/src/corpus/db";
import { CorrectionReview } from "./CorrectionReview";
import { PhotosReview } from "./PhotosReview";
import { PlaceReview } from "./PlaceReview";
import { RejectForm, ReviewHeader, cardClass } from "./ReviewParts";
import { TipReview } from "./TipReview";

export const metadata: Metadata = {
  title: "Contributions — Admin",
  robots: { index: false, follow: false },
};

const ERRORS: Record<string, string> = {
  texte: "Le texte doit faire entre 10 et 500 caractères.",
  theme: "Thème inconnu.",
  photos: "Cochez au moins une photo, ou utilisez « Refuser ».",
  conseil: "Ce conseil n’est plus en ligne.",
};

export default async function AdminContributionsPage({
  searchParams,
}: {
  searchParams: Promise<{ erreur?: string | string[] }>;
}) {
  await connection();
  const { erreur } = await searchParams;
  const errorMessage = typeof erreur === "string" ? ERRORS[erreur] : undefined;
  const contributions = await prisma.contribution.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
    include: { user: true, place: true, claim: true, photos: { orderBy: { order: "asc" } } },
  });

  const banner = errorMessage && (
    <p
      role="alert"
      className="rounded-[10px] border border-sable/40 bg-calcaire-deep p-3 text-sm"
    >
      {errorMessage}
    </p>
  );

  if (contributions.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        {banner}
        <p className="text-sm text-encre/60">Aucune contribution à relire.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {banner}
      <ul className="flex flex-col gap-6">
        {contributions.map((c) => {
          switch (c.type) {
            case "TIP":
              return <TipReview key={c.id} c={c} />;
            case "CORRECTION":
              return <CorrectionReview key={c.id} c={c} />;
            case "PLACE":
              return <PlaceReview key={c.id} c={c} />;
            case "PHOTOS":
              return <PhotosReview key={c.id} c={c} />;
            default:
              return (
                <li key={c.id} id={`c-${c.id}`} className={cardClass}>
                  <ReviewHeader c={c} />
                  {c.text && (
                    <p className="whitespace-pre-wrap text-sm">{c.text}</p>
                  )}
                  <RejectForm id={c.id} />
                </li>
              );
          }
        })}
      </ul>
    </div>
  );
}
