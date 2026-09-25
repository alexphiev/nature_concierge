import { BulbIcon, ChatIcon, PinPlusIcon, PlusIcon } from "./icons";
import { ASK_HREF, CONTAINER, FOCUS_RING, PROPOSE_PLACE_HREF, SHARE_TIP_HREF } from "./shared";

export function HelpSection() {
  return (
    <div
      className={`${CONTAINER} flex flex-col gap-4 pb-10 md:gap-6 md:pb-24 lg:grid lg:grid-cols-[7fr_5fr]`}
    >
      <section className="flex flex-col gap-4.5 rounded-3xl bg-[#0E4B5A] px-5 py-7 text-white md:gap-6 md:rounded-[28px] md:p-12">
        <div className="flex flex-col gap-4.5 md:gap-2.5">
          <h2 className="font-landing-display text-[28px] leading-[1.15] font-semibold md:text-[36px] md:leading-[normal]">
            Besoin d’un plan sur mesure ?
          </h2>
          <p className="max-w-[560px] text-[16px] leading-normal text-[#D6E6E8] md:text-[17px] md:leading-[1.55]">
            Dites-moi qui vient, quand, et vos contraintes. Je vous réponds avec un lieu, l’heure
            à viser, où vous garer et un plan B. C’est gratuit.
          </p>
        </div>
        <div className="flex flex-col gap-4.5 md:gap-3">
          <p className="max-w-[300px] self-end rounded-[16px_16px_4px_16px] bg-[#1F6474] px-3.5 py-3 text-[15px] leading-[1.45] md:max-w-[440px] md:rounded-[18px_18px_4px_18px] md:px-4.5 md:py-3.5 md:text-[16px] md:leading-normal">
            Dimanche avec les enfants (3 et 6 ans), on est vers Saint-Cyr, il annonce du mistral.
            Une idée ?
          </p>
          <p className="max-w-[316px] self-start rounded-[16px_16px_16px_4px] bg-[#FFFDF8] px-3.5 py-3 text-[15px] leading-[1.45] text-[#1D2A2E] md:max-w-[540px] md:rounded-[18px_18px_18px_4px] md:px-4.5 md:py-3.5 md:text-[16px] md:leading-normal">
            Évitez Port d’Alon dimanche : le parking sature vers 10h30 et la calanque prend le
            mistral de face. Allez plutôt à la Madrague, abritée, sentier court, faisable avec un
            3 ans. Visez avant 10h, et regardez la carte de la préfecture la veille après 18h.
          </p>
          <p className="text-[13px] text-[#A9C7CC]">Un vrai échange, raccourci.</p>
        </div>
        <a
          href={ASK_HREF}
          className="flex h-13.5 items-center justify-center gap-2.5 rounded-full bg-[#FFFDF8] text-[17px] font-bold text-[#0E4B5A] md:h-14 md:self-start md:px-6.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          <ChatIcon className="size-5" />
          Écrire sur WhatsApp
        </a>
      </section>

      <section className="flex flex-col gap-3.5 rounded-3xl bg-[#FBE9DD] px-5 py-7 md:gap-5 md:rounded-[28px] md:p-12">
        <div className="hidden size-13 items-center justify-center rounded-full bg-[#A34A25] text-white md:flex">
          <PinPlusIcon className="size-6" />
        </div>
        <h2 className="font-landing-display text-[28px] font-semibold md:text-[36px]">
          Un coin qui manque ?
        </h2>
        <p className="text-[16px] leading-normal text-[#4A3A31] md:text-[17px] md:leading-[1.55]">
          Un lieu que vous aimez, une astuce d’accès, une info qui a changé : dites-le-moi.
          J’irai voir avant de l’ajouter.
        </p>
        <div className="flex flex-col gap-2.5 pt-1 md:gap-3 md:pt-2">
          <a
            href={PROPOSE_PLACE_HREF}
            className={`flex h-12.5 items-center justify-center gap-2 rounded-full bg-[#A34A25] text-[16px] font-semibold text-white md:h-13 ${FOCUS_RING}`}
          >
            <PlusIcon className="size-4.5" />
            Proposer un lieu
          </a>
          <a
            href={SHARE_TIP_HREF}
            className={`flex h-[53px] items-center justify-center gap-2 rounded-full border-[1.5px] border-[#A34A25] text-[16px] font-semibold text-[#A34A25] md:h-[55px] ${FOCUS_RING}`}
          >
            <BulbIcon className="size-4.5" />
            Partager une astuce
          </a>
        </div>
      </section>
    </div>
  );
}
