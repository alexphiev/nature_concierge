import Link from "next/link";
import { SITE_NAME } from "../../site";
import { HeartIcon, LogoIcon } from "../landing/icons";
import { ABOUT_HREF, ACTIVE_LINK, CONTAINER, FOCUS_RING, GUIDE_HREF, TIPEEE_HREF } from "../landing/shared";
import { MobileMenu } from "./MobileMenu";

export function SiteHeader({ guideActive = false }: { guideActive?: boolean }) {
  return (
    <header className="relative h-15 border-b border-[#E4DACA] bg-[#F5EFE4] font-landing-body leading-[normal] text-[#1D2A2E] md:h-20">
      <div className={`${CONTAINER} flex h-full items-center justify-between`}>
        <Link
          href="/"
          className={`flex items-center gap-2 text-[#1D2A2E] md:gap-2.5 ${FOCUS_RING}`}
        >
          <span className="flex size-7.5 items-center justify-center rounded-full bg-[#0E4B5A] text-white md:size-8.5">
            <LogoIcon className="size-4 md:size-4.5" />
          </span>
          <span className="font-landing-display text-[17px] font-semibold md:text-[21px]">
            {SITE_NAME}
          </span>
        </Link>
        <nav
          aria-label="Navigation principale"
          className="flex items-center gap-8 text-[16px] font-medium"
        >
          <Link
            href={GUIDE_HREF}
            aria-current={guideActive ? "page" : undefined}
            className={`hidden md:block ${guideActive ? ACTIVE_LINK : "text-[#1D2A2E]"} ${FOCUS_RING}`}
          >
            Tous les lieux
          </Link>
          <Link href={ABOUT_HREF} className={`hidden text-[#1D2A2E] md:block ${FOCUS_RING}`}>
            À propos
          </Link>
          <a
            href={TIPEEE_HREF}
            className={`hidden items-center gap-1.5 font-semibold text-[#A34A25] md:flex ${FOCUS_RING}`}
          >
            <HeartIcon className="size-4.25" />
            Soutenir
          </a>
          <MobileMenu guideActive={guideActive} />
        </nav>
      </div>
    </header>
  );
}
