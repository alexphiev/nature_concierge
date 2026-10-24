import Link from "next/link";
import type { PlaceNeeds } from "@/src/corpus/place-needs";
import { TIP_KIND_COPY } from "@/src/contributions/schema";

const KIND_TAGS = { LOCAL_TIP: "Conseil", PRACTICAL_INFO: "Info pratique" } as const;

// Asks visitors precise questions on places with few claims, instead of an
// empty section.
export function PlaceNeedsCard({
  slug,
  placeName,
  needs,
}: {
  slug: string;
  placeName: string;
  needs: PlaceNeeds;
}) {
  if (needs.questions.length === 0) return null;
  const isEmpty = needs.practicalCount + needs.tipCount === 0;

  return (
    <section
      aria-labelledby="besoins-titre"
      className="flex flex-col gap-4 rounded-[18px] border border-[#EBC9B2] bg-[#FBEFE6] p-5 sm:p-6"
    >
      <div className="flex flex-col gap-1.5">
        <h2 id="besoins-titre" className="font-display text-[1.375rem] leading-tight font-semibold">
          {isEmpty ? "Cette fiche attend ses premiers habitués" : "Ce qu’on aimerait encore savoir"}
        </h2>
        <p className="leading-relaxed text-encre/80">
          {isEmpty
            ? `On connaît ${placeName}, pas encore ses secrets. Si vous y êtes déjà allé, une réponse courte suffit à aider le prochain visiteur.`
            : "Vous y êtes déjà allé ? Une réponse courte suffit."}
        </p>
      </div>
      <ul className="flex flex-col gap-2">
        {needs.questions.map((need) => (
          <li key={`${need.kind}-${need.theme}`}>
            <Link
              href={`/lieux/${slug}/${TIP_KIND_COPY[need.kind].path}?theme=${need.theme}`}
              className="flex min-h-12 items-center gap-3 rounded-xl border border-[#EBC9B2] bg-white/70 px-4 py-2.5 transition-colors hover:border-[#A34A25] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mediterranee"
            >
              <span className="flex min-w-0 flex-1 flex-col items-start gap-1">
                <span className="rounded-full bg-[#F3DCCB] px-2 py-px text-[0.6875rem] font-semibold tracking-wide text-[#8A3D1E] uppercase">
                  {KIND_TAGS[need.kind]}
                </span>
                <span className="font-medium">{need.question}</span>
              </span>
              <span aria-hidden className="text-[#A34A25]">
                →
              </span>
            </Link>
          </li>
        ))}
      </ul>
      {needs.wantsPhotos && (
        <p className="text-sm text-encre/75">
          Des photos à vous de ce lieu ?{" "}
          <Link
            href={`/lieux/${slug}/photos`}
            className="font-semibold text-mediterranee underline underline-offset-2"
          >
            Partagez-les
          </Link>
        </p>
      )}
    </section>
  );
}
