import { CoffeeIcon, Monogram } from "./icons";
import { ACCESS_MAP_HREF, COFFEE_HREF, CONTAINER, FOCUS_RING, STORY_HREF } from "./shared";

const LINK = `text-[15px] font-semibold text-[#0E4B5A] hover:text-[#0A3843] ${FOCUS_RING}`;

export function LandingFooter() {
  return (
    <footer className="grow bg-[#EAE2D3]">
      <div className={`${CONTAINER} flex flex-col gap-5 py-8 md:gap-8 md:py-12`}>
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between md:gap-12">
          <div className="flex items-center gap-3.5 md:max-w-[640px] md:gap-4.5">
            <Monogram className="size-16 border-2 border-[#FFFDF8] text-[26px] md:size-19 md:text-[30px]" />
            <div className="flex flex-col gap-1.5">
              <p className="text-[15px] leading-[1.45] text-[#3E4A4B] md:text-[16px] md:leading-normal">
                <strong className="text-[#1D2A2E]">Un guide tenu par Alexandre</strong>, habitant
                de La Ciotat depuis 2025. Rien à vendre, pas de compte
                <span className="hidden md:inline"> à créer</span>.
              </p>
              <a href={STORY_HREF} className={`hidden self-start md:block ${LINK}`}>
                L’histoire du projet
              </a>
            </div>
          </div>
          <div className="flex flex-col gap-1 md:hidden">
            <a href={STORY_HREF} className={`flex h-11 items-center self-start ${LINK}`}>
              L’histoire du projet
            </a>
            <a href={COFFEE_HREF} className={`flex h-11 items-center gap-2 self-start ${LINK}`}>
              <CoffeeIcon className="size-4.5" />
              Le guide vous a servi ? Offrir un café
            </a>
          </div>
          <div className="hidden shrink-0 items-center gap-4 md:flex">
            <span className="text-[15px] text-[#3E4A4B]">Le guide vous a servi ?</span>
            <a
              href={COFFEE_HREF}
              className={`flex h-[51px] items-center gap-2 rounded-full border-[1.5px] border-[#1D2A2E] px-5 text-[15px] font-semibold text-[#1D2A2E] ${FOCUS_RING}`}
            >
              <CoffeeIcon className="size-4.5" />
              Offrir un café
            </a>
          </div>
        </div>
        <p className="border-t border-[#D5CAB6] pt-4 text-[13px] leading-normal text-[#5B6663] md:pt-5 md:text-[14px]">
          En été, l’accès aux massifs dépend du risque incendie, décidé chaque veille par la
          préfecture. Vérifiez avant de partir :{" "}
          <a
            href={ACCESS_MAP_HREF}
            className={`font-semibold text-[#0E4B5A] hover:text-[#0A3843] ${FOCUS_RING}`}
          >
            carte des accès
          </a>
          .
        </p>
      </div>
    </footer>
  );
}
