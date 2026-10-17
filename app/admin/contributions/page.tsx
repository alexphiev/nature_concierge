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

export default async function AdminContributionsPage() {
  await connection();
  const contributions = await prisma.contribution.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
    include: { user: true, place: true, claim: true, photos: { orderBy: { order: "asc" } } },
  });

  if (contributions.length === 0) {
    return <p className="text-sm text-encre/60">Aucune contribution à relire.</p>;
  }

  return (
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
              <li key={c.id} className={cardClass}>
                <ReviewHeader c={c} />
                {c.text && <p className="whitespace-pre-wrap text-sm">{c.text}</p>}
                <RejectForm id={c.id} />
              </li>
            );
        }
      })}
    </ul>
  );
}
