import Link from "next/link";
import { FOCUS_RING, PROPOSE_PLACE_FORM_HREF } from "@/src/components/landing/shared";
import { countLabel } from "@/src/corpus/count-label";
import { FIRST_TIP_WELCOME } from "@/src/corpus/place-needs";
import type { PlaceWithCover } from "@/src/corpus/queries";

const SECONDARY_LINK = `inline-flex h-11 items-center rounded-full border-[1.5px] border-[#0E4B5A] px-4 text-[15px] font-semibold text-[#0E4B5A] hover:bg-[#0E4B5A]/8 ${FOCUS_RING}`;

export function PlacePicker({ places }: { places: PlaceWithCover[] }) {
  return (
    <section id="astuce" aria-labelledby="astuce-titre" className="scroll-mt-6">
      <h2
        id="astuce-titre"
        className="font-landing-display text-[28px] leading-[1.15] font-semibold md:text-[36px]"
      >
        Choisissez un lieu
      </h2>
      <ul className="mt-6 divide-y divide-[#E4DACA] rounded-[14px] border border-[#E4DACA] bg-[#FFFDF8]">
        {places.map((place) => (
          <li
            key={place.id}
            className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between md:px-6"
          >
            <div className="min-w-0">
              <p className="font-semibold wrap-break-word">{place.name}</p>
              <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[14px] text-[#5B6663]">
                <span>{place.commune}</span>
                {place._count.claims > 0 && (
                  <>
                    <span aria-hidden>·</span>
                    <span>{countLabel(place._count.claims, "conseil", "conseils")}</span>
                  </>
                )}
                {place._count.claims === 0 && (
                  <span className="rounded-full bg-[#F3DCCB] px-2.5 py-0.5 text-[13px] font-semibold text-[#8A3D1E]">
                    {FIRST_TIP_WELCOME}
                  </span>
                )}
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <Link
                href={`/lieux/${place.slug}/astuce`}
                className={`inline-flex h-11 items-center rounded-full bg-[#0E4B5A] px-4 text-[15px] font-semibold text-white hover:bg-[#0A3843] ${FOCUS_RING}`}
              >
                Conseil
              </Link>
              <Link href={`/lieux/${place.slug}/info`} className={SECONDARY_LINK}>
                Info pratique
              </Link>
              <Link href={`/lieux/${place.slug}/photos`} className={SECONDARY_LINK}>
                Photos
              </Link>
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-5 text-[16px]">
        Le lieu n’est pas dans la liste ?{" "}
        <Link
          href={PROPOSE_PLACE_FORM_HREF}
          className={`font-semibold text-[#0E4B5A] underline underline-offset-4 ${FOCUS_RING}`}
        >
          Proposez-le
        </Link>
      </p>
    </section>
  );
}
