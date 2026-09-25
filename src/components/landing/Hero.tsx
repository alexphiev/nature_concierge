import type { Place } from "../../../prisma/generated/client";
import type { GooglePlacePhoto } from "../../corpus/google-places";
import { ChatIcon, Monogram } from "./icons";
import { ASK_HREF, CONTAINER, FOCUS_RING } from "./shared";

export const HERO_DESCRIPTION =
  "Calanques, criques et sentiers : les lieux, les accès, les bons horaires. Avec les conseils des gens d’ici.";

export type HeroPhoto = { place: Place; photo: GooglePlacePhoto };

const TRANSPARENT_PIXEL =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

export function Hero({ heroPhoto }: { heroPhoto: HeroPhoto | null }) {
  const attribution = heroPhoto?.photo.attribution;
  const showAttribution = !!attribution && attribution !== heroPhoto?.place.name;

  return (
    <section
      className={`${CONTAINER} grid pt-7 pb-8 md:gap-12 md:pt-18 md:pb-16 lg:grid-cols-2 lg:items-center lg:gap-18`}
    >
      <div className="flex flex-col gap-4 md:gap-6">
        <p className="text-[12px] font-bold tracking-[0.08em] text-[#A34A25] uppercase md:text-[14px]">
          La Ciotat et alentours · Guide gratuit
        </p>
        <h1 className="font-landing-display text-[38px] leading-[1.08] font-semibold tracking-[-0.01em] md:text-[64px] md:leading-[1.05]">
          Où aller en nature autour de La Ciotat ?
        </h1>
        <p className="max-w-[540px] text-[17px] leading-normal text-[#3E4A4B] md:text-[20px] md:leading-[1.55]">
          {HERO_DESCRIPTION}
        </p>
        <div className="flex items-center gap-3 pt-1 md:hidden">
          <Monogram className="size-13 border-2 border-[#FFFDF8] text-[20px]" />
          <p className="text-[14px] leading-[1.45] text-[#3E4A4B]">
            <strong className="text-[#1D2A2E]">Alexandre, habitant de La Ciotat.</strong> Une
            question ? Je réponds moi-même, gratuitement.
          </p>
        </div>
        <div className="flex items-center gap-3 md:pt-2">
          <a
            href={ASK_HREF}
            className={`flex h-13.5 grow items-center justify-center gap-2.5 rounded-full bg-[#0E4B5A] text-[17px] font-semibold text-white md:h-14 md:grow-0 md:px-6.5 ${FOCUS_RING}`}
          >
            <ChatIcon className="size-5" />
            Demander conseil sur WhatsApp
          </a>
          <a
            href="#guide"
            className={`hidden h-[59px] items-center gap-2 rounded-full border-[1.5px] border-[#C9BCA6] px-5.5 text-[17px] font-semibold text-[#1D2A2E] md:flex ${FOCUS_RING}`}
          >
            Voir le guide
          </a>
        </div>
        <div className="hidden items-center gap-3.5 pt-2 md:flex">
          <Monogram className="size-14 border-2 border-[#FFFDF8] text-[22px]" />
          <p className="text-[15px] leading-[1.45] text-[#3E4A4B]">
            <strong className="text-[#1D2A2E]">Alexandre, habitant de La Ciotat.</strong>
            <br />
            Je réponds moi-même, gratuitement, en général dans la journée.
          </p>
        </div>
      </div>
      <div className="relative hidden h-[360px] items-end overflow-hidden rounded-3xl bg-[#CFDCD9] p-5 md:flex lg:h-[460px]">
        {heroPhoto && (
          <>
            <picture>
              <source media="(min-width: 768px)" srcSet={`/lieux/${heroPhoto.place.slug}/photo`} />
              {/* Transparent fallback: the hero image is hidden on mobile, so don't download it there. */}
              <img
                src={TRANSPARENT_PIXEL}
                alt=""
                width={1200}
                height={900}
                fetchPriority="high"
                className="absolute inset-0 size-full object-cover"
              />
            </picture>
            <span className="relative rounded-[14px] bg-[#FFFDF8] px-3 py-1.5 text-[13px] font-semibold text-[#34494C]">
              {heroPhoto.place.name}
              {showAttribution && ` · Photo : ${attribution}`}
            </span>
          </>
        )}
      </div>
    </section>
  );
}
