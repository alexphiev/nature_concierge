import Link from "next/link";
import { SITE_NAME } from "../../site";
import { ChatIcon, LogoIcon } from "./icons";
import { ABOUT_HREF, ASK_HREF, CONTAINER, FOCUS_RING, PROPOSE_PLACE_HREF } from "./shared";

export function LandingHeader() {
  return (
    <header className="h-15 border-b border-[#E4DACA] md:h-20">
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
        <nav className="flex items-center gap-8 text-[16px] font-medium">
          <a href="#guide" className={`hidden text-[#1D2A2E] lg:block ${FOCUS_RING}`}>
            Le guide
          </a>
          <a href={PROPOSE_PLACE_HREF} className={`hidden text-[#1D2A2E] lg:block ${FOCUS_RING}`}>
            Proposer un lieu
          </a>
          <a
            href={ABOUT_HREF}
            className={`flex h-11 items-center text-[15px] font-semibold text-[#0E4B5A] hover:text-[#0A3843] md:h-auto md:text-[16px] md:font-medium md:text-[#1D2A2E] md:hover:text-[#1D2A2E] ${FOCUS_RING}`}
          >
            À propos
          </a>
          <a
            href={ASK_HREF}
            className={`hidden h-11 items-center gap-2 rounded-full bg-[#0E4B5A] px-4.5 font-semibold text-white md:flex ${FOCUS_RING}`}
          >
            <ChatIcon className="size-4.5" />
            WhatsApp
          </a>
        </nav>
      </div>
    </header>
  );
}
