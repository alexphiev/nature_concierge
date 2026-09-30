import { CONTAINER, FOCUS_RING, PROPOSE_PLACE_HREF, SHARE_TIP_HREF } from "./shared";

export function HelpSection() {
  return (
    <div className={`${CONTAINER} pb-10 md:pb-24`}>
      <section className="flex flex-col gap-3.5 rounded-3xl bg-[#FBE9DD] px-5 py-7 md:flex-row md:items-center md:justify-between md:gap-12 md:rounded-[28px] md:px-14 md:py-11">
        <div className="flex flex-col gap-1.5 md:max-w-[680px]">
          <h2 className="font-landing-display text-[26px] font-semibold md:text-[32px]">
            Un coin ou une astuce qui manque ?
          </h2>
          <p className="text-[16px] leading-normal text-[#4A3A31] md:text-[17px] md:leading-[1.55]">
            Chaque conseil du guide vient de quelqu’un d’ici. Partagez le vôtre : je vais vérifier
            sur place avant de l’ajouter.
          </p>
        </div>
        <div className="flex flex-col gap-2.5 pt-1 md:shrink-0 md:flex-row md:gap-3 md:pt-0">
          <a
            href={PROPOSE_PLACE_HREF}
            className={`flex h-12.5 items-center justify-center gap-2 rounded-full bg-[#A34A25] text-[16px] font-semibold text-white md:h-13 md:px-5.5 ${FOCUS_RING}`}
          >
            Proposer un lieu
          </a>
          <a
            href={SHARE_TIP_HREF}
            className={`flex h-[53px] items-center justify-center gap-2 rounded-full border-[1.5px] border-[#A34A25] text-[16px] font-semibold text-[#A34A25] md:h-[55px] md:px-5.5 ${FOCUS_RING}`}
          >
            Partager une astuce
          </a>
        </div>
      </section>
    </div>
  );
}
