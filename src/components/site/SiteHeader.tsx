import Link from "next/link";
import { SITE_NAME } from "../../site";
import { ChatIcon, LogoIcon } from "../landing/icons";
import {
  ABOUT_HREF,
  ACTIVE_LINK,
  ASK_HREF,
  CONTAINER,
  FOCUS_RING,
  GUIDE_HREF,
  PROPOSE_PLACE_HREF,
} from "../landing/shared";
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
            Le guide
          </Link>
          <a href={PROPOSE_PLACE_HREF} className={`hidden text-[#1D2A2E] lg:block ${FOCUS_RING}`}>
            Proposer un lieu
          </a>
          <Link href={ABOUT_HREF} className={`hidden text-[#1D2A2E] md:block ${FOCUS_RING}`}>
            À propos
          </Link>
          <a
            href={ASK_HREF}
            className={`hidden h-11 items-center gap-2 rounded-full bg-[#0E4B5A] px-4.5 font-semibold text-white md:flex ${FOCUS_RING}`}
          >
            <ChatIcon className="size-4.5" />
            WhatsApp
          </a>
          <MobileMenu guideActive={guideActive} />
        </nav>
      </div>
    </header>
  );
}
