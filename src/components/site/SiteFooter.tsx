import Link from "next/link";
import { HeartIcon, Monogram } from "../landing/icons";
import { getCommunityStats } from "@/src/corpus/community";
import { countLabel } from "@/src/corpus/count-label";
import { ABOUT_HREF, ACCESS_MAP_HREF, CONTAINER, CONTRIBUTE_HREF, FOCUS_RING, TIPEEE_HREF } from "../landing/shared";

const LINK = `text-[15px] font-semibold text-[#0E4B5A] hover:text-[#0A3843] ${FOCUS_RING}`;
const TIPEEE_LINK = `text-[15px] font-semibold text-[#A34A25] hover:text-[#8A3D1E] ${FOCUS_RING}`;

const NAV_LINKS = [
  { href: CONTRIBUTE_HREF, label: "Contribuer" },
  { href: ABOUT_HREF, label: "À propos" },
  { href: "/confidentialite", label: "Confidentialité" },
  { href: "/mentions-legales", label: "Mentions légales" },
];

export async function SiteFooter() {
  const { tipCount, contributorCount } = await getCommunityStats();
  const counts = [
    countLabel(tipCount, "conseil", "conseils"),
    ...(contributorCount >= 2 ? [countLabel(contributorCount, "contributeur", "contributeurs")] : []),
  ].join(" · ");

  return (
    <footer className="grow bg-[#EAE2D3] font-landing-body leading-[normal] text-[#1D2A2E]">
      <div className={`${CONTAINER} flex flex-col gap-5 py-8 md:gap-8 md:py-12`}>
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between md:gap-12">
          <div className="flex items-center gap-3.5 md:max-w-[640px] md:gap-4.5">
            <Monogram className="size-16 border-2 border-[#FFFDF8] text-[26px] md:size-19 md:text-[30px]" />
            <div className="flex flex-col gap-1.5">
              <p className="text-[15px] leading-[1.45] text-[#3E4A4B] md:text-[16px] md:leading-normal">
                <strong className="text-[#1D2A2E]">Un guide écrit par les gens d’ici</strong>,
                relu par Alexandre.
              </p>
              <p className="text-[14px] text-[#5B6663]">{counts}</p>
            </div>
          </div>
          <div className="flex flex-col gap-1 md:hidden">
            <a href={TIPEEE_HREF} className={`flex h-11 items-center gap-2 self-start ${TIPEEE_LINK}`}>
              <HeartIcon className="size-4.5" />
              Le guide vous a servi ? Soutenir sur Tipeee
            </a>
          </div>
          <div className="hidden shrink-0 items-center gap-4 md:flex">
            <span className="text-[15px] text-[#3E4A4B]">Le guide vous a servi ?</span>
            <a
              href={TIPEEE_HREF}
              className={`flex h-[51px] items-center gap-2 rounded-full border-[1.5px] border-[#A34A25] px-5 text-[15px] font-semibold text-[#A34A25] ${FOCUS_RING}`}
            >
              <HeartIcon className="size-4.5" />
              Soutenir sur Tipeee
            </a>
          </div>
        </div>
        <nav
          aria-label="Liens du pied de page"
          className="flex flex-wrap gap-x-6 gap-y-1 border-t border-[#D5CAB6] pt-2 md:pt-4"
        >
          {NAV_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className={`flex h-11 items-center ${LINK}`}>
              {link.label}
            </Link>
          ))}
        </nav>
        <p className="text-[13px] leading-normal text-[#5B6663] md:text-[14px]">
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
