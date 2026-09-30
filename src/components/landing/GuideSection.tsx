import Link from "next/link";
import type { Place } from "../../../prisma/generated/client";
import type { DisplayPhoto } from "../../corpus/place-photos";
import { PhotoImage } from "../PhotoImage";
import { ArrowIcon, ChevronIcon } from "./icons";
import { CONTAINER, FOCUS_RING, GUIDE_HREF } from "./shared";

export type GuideCard = { place: Place; cover: DisplayPhoto | null };

const MOBILE_CARD_COUNT = 3;

function placesLabel(count: number): string {
  return `${count} ${count > 1 ? "lieux" : "lieu"}`;
}

export function GuideSection({ cards, placeCount }: { cards: GuideCard[]; placeCount: number }) {
  return (
    <section id="guide" className={`${CONTAINER} flex flex-col gap-4 pt-8 pb-10 md:gap-7 md:pt-11 md:pb-22`}>
      <div className="flex items-end justify-between gap-6">
        <div className="flex flex-col gap-1">
          <h2 className="font-landing-display text-[24px] font-semibold md:text-[36px]">
            Tous les lieux du guide
          </h2>
          <p className="hidden text-[14px] leading-[1.45] text-[#5B6663] md:block md:max-w-[640px] md:text-[16px]">
            Chaque fiche rassemble les conseils recueillis sur place : accès, parking, horaires,
            vent, avec qui y aller.
          </p>
          <span className="text-[14px] text-[#5B6663] md:hidden">
            {placesLabel(placeCount)}
          </span>
        </div>
        <Link
          href={GUIDE_HREF}
          className={`hidden shrink-0 items-center gap-2 text-[16px] font-semibold text-[#0E4B5A] hover:text-[#0A3843] md:flex ${FOCUS_RING}`}
        >
          Voir la carte
          <ArrowIcon className="size-4.5" />
        </Link>
      </div>

      <ul role="list" className="flex flex-col gap-2.5 md:grid md:grid-cols-3 md:gap-6 lg:grid-cols-4">
        {cards.map(({ place, cover }, index) => (
          <li key={place.id} className={index >= MOBILE_CARD_COUNT ? "hidden md:flex" : "flex"}>
            <Link
              href={`/lieux/${place.slug}`}
              className={`flex w-full items-center gap-3 rounded-2xl border border-[#E4DACA] bg-[#FFFDF8] p-2.5 text-[#1D2A2E] md:flex-col md:items-stretch md:gap-0 md:overflow-hidden md:rounded-[18px] md:p-0 ${FOCUS_RING}`}
            >
              <div className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-[#D9E4E2] md:h-42 md:w-auto md:rounded-none">
                {cover && (
                  <PhotoImage
                    photo={cover}
                    sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 64px"
                  />
                )}
              </div>
              <div className="flex min-w-0 grow flex-col gap-0.5 md:gap-1.5 md:px-4.5 md:pt-3.5 md:pb-4.5">
                <h3 className="font-landing-display text-[17px] leading-[1.2] font-semibold md:text-[19px]">
                  {place.name}
                </h3>
                <p className="text-[13px] text-[#5B6663] md:text-[14px]">{place.commune}</p>
              </div>
              <ChevronIcon className="size-4.5 text-[#8A948F] md:hidden" />
            </Link>
          </li>
        ))}
      </ul>

      <Link
        href={GUIDE_HREF}
        className={`mt-1 flex h-[53px] items-center justify-center gap-2 rounded-full border border-[#C9BCA6] text-[16px] font-semibold text-[#1D2A2E] md:hidden ${FOCUS_RING}`}
      >
        {placeCount > 1 ? `Voir les ${placeCount} lieux` : "Voir le lieu"}
      </Link>
    </section>
  );
}
