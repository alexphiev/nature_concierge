import { Suspense } from "react";
import Link from "next/link";
import { SITE_NAME } from "../../site";
import { LogoIcon } from "../landing/icons";
import { CONTAINER, FOCUS_RING } from "../landing/shared";
import { SiteNav, SiteNavView } from "./SiteNav";

export function SiteHeader() {
  return (
    <header className="relative h-15 border-b border-[#E4DACA] font-landing-body leading-[normal] text-[#1D2A2E] md:h-20">
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
        <Suspense fallback={<SiteNavView pathname="" />}>
          <SiteNav />
        </Suspense>
      </div>
    </header>
  );
}
