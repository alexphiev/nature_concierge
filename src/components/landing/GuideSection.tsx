import Link from "next/link";
import type { Place } from "../../../prisma/generated/client";
import type { DisplayPhoto } from "../../corpus/place-photos";
import { TYPE_LABELS } from "../PlaceCard";
import { PhotoImage } from "../PhotoImage";
import { ArrowIcon, ChevronIcon, PinIcon } from "./icons";
import { CONTAINER, FOCUS_RING } from "./shared";

export type GuideCard = { place: Place; cover: DisplayPhoto | null };

const FILTERS = [
  "Tous",
  "Avec enfants",
  "À l’abri du mistral",
  "Baignade",
  "Accès facile",
  "Sans voiture",
];
const MOBILE_FILTER_COUNT = 4;
const MOBILE_CARD_COUNT = 3;

function placesLabel(count: number): string {
  return `${count} ${count > 1 ? "lieux" : "lieu"}`;
}

export function GuideSection({ cards, placeCount }: { cards: GuideCard[]; placeCount: number }) {
  return (
    <section
      id="guide"
      className={`${CONTAINER} flex flex-col gap-4 pt-2 pb-10 md:gap-7 md:pt-8 md:pb-22`}
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between md:gap-6">
        <div className="flex items-baseline justify-between md:flex-col md:items-stretch md:gap-1.5">
          <h2 className="font-landing-display text-[28px] font-semibold md:text-[40px]">
            Le guide
          </h2>
          <span className="text-[14px] text-[#5B6663] md:hidden">{placesLabel(placeCount)}</span>
          <p className="hidden text-[16px] text-[#5B6663] md:block">
            {placesLabel(placeCount)} pour l’instant, et ça grandit avec vos suggestions.
          </p>
        </div>
        <div className="-my-1 -mr-[max(1rem,env(safe-area-inset-right))] -ml-[max(1rem,env(safe-area-inset-left))] flex gap-2 overflow-x-auto py-1 pr-[max(1rem,env(safe-area-inset-right))] pl-[max(1rem,env(safe-area-inset-left))] whitespace-nowrap [scrollbar-width:none] md:mx-0 md:flex-wrap md:justify-end md:overflow-visible md:px-0 [&::-webkit-scrollbar]:hidden">
          {FILTERS.map((label, index) => {
            const active = index === 0;
            return (
              <button
                key={label}
                type="button"
                aria-pressed={active}
                className={`h-[47px] shrink-0 rounded-full border-[1.5px] px-4 text-[15px] md:px-4.5 ${
                  active
                    ? "border-[#0E4B5A] bg-[#0E4B5A] font-semibold text-white"
                    : "border-[#C9BCA6] bg-[#FFFDF8] font-medium text-[#1D2A2E]"
                } ${index >= MOBILE_FILTER_COUNT ? "hidden md:block" : ""} ${FOCUS_RING}`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <ul role="list" className="flex flex-col gap-3 md:grid md:grid-cols-3 md:gap-6 lg:grid-cols-4">
        {cards.map(({ place, cover }, index) => (
          <li key={place.id} className={index >= MOBILE_CARD_COUNT ? "hidden md:flex" : "flex"}>
            <Link
              href={`/lieux/${place.slug}`}
              className={`flex w-full items-center gap-3.5 rounded-2xl border border-[#E4DACA] bg-[#FFFDF8] p-2.5 text-[#1D2A2E] md:flex-col md:items-stretch md:gap-0 md:overflow-hidden md:rounded-[18px] md:p-0 ${FOCUS_RING}`}
            >
              <div className="relative size-23 shrink-0 overflow-hidden rounded-xl bg-[#D9E4E2] md:h-49 md:w-auto md:rounded-none">
                {cover && (
                  <PhotoImage
                    photo={cover}
                    sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 92px"
                  />
                )}
              </div>
              <div className="flex min-w-0 grow flex-col gap-1.5 md:gap-2 md:px-4.5 md:pt-4 md:pb-5">
                <h3 className="font-landing-display text-[18px] leading-[1.2] font-semibold md:text-[20px]">
                  {place.name}
                </h3>
                <p className="flex items-center gap-1.25 text-[13px] text-[#5B6663] md:gap-1.5 md:text-[14px]">
                  <PinIcon className="size-3.5 md:size-[15px]" />
                  {place.commune}
                </p>
                <div className="flex md:pt-0.5">
                  <span className="rounded-[10px] bg-[#E3EDEB] px-2.25 py-0.75 text-[12px] font-semibold text-[#0E4B5A] md:rounded-xl md:px-2.5 md:py-1 md:text-[13px]">
                    {TYPE_LABELS[place.type]}
                  </span>
                </div>
              </div>
              <ChevronIcon className="size-4.5 text-[#8A948F] md:hidden" />
            </Link>
          </li>
        ))}
      </ul>

      <Link
        href="/lieux"
        className={`mt-1 flex h-[53px] items-center justify-center gap-2 rounded-full border-[1.5px] border-[#C9BCA6] text-[16px] font-semibold text-[#1D2A2E] md:hidden ${FOCUS_RING}`}
      >
        {placeCount > 1 ? `Voir les ${placeCount} lieux` : "Voir le lieu"}
        <ArrowIcon className="size-4.5" />
      </Link>
      <Link
        href="/lieux"
        className={`hidden items-center gap-2 self-center text-[17px] font-semibold text-[#0E4B5A] hover:text-[#0A3843] md:flex ${FOCUS_RING}`}
      >
        Voir tous les lieux et la carte
        <ArrowIcon className="size-4.5" />
      </Link>
    </section>
  );
}
