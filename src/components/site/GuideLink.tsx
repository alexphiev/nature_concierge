"use client";

import Link from "next/link";
import { Suspense } from "react";
import { usePathname } from "next/navigation";
import { FOCUS_RING, GUIDE_HREF } from "../landing/shared";

type Props = { className: string; activeClassName: string; onClick?: () => void };

function GuideLinkInner({ className, activeClassName, onClick }: Props) {
  const pathname = usePathname();
  const active = pathname === GUIDE_HREF || pathname.startsWith(`${GUIDE_HREF}/`);
  return (
    <Link
      href={GUIDE_HREF}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={`${className} ${active ? activeClassName : "text-[#1D2A2E]"} ${FOCUS_RING}`}
    >
      Tous les lieux
    </Link>
  );
}

// usePathname suspends while prerendering: the inactive link is the static fallback.
export function GuideLink(props: Props) {
  return (
    <Suspense
      fallback={
        <Link
          href={GUIDE_HREF}
          onClick={props.onClick}
          className={`${props.className} text-[#1D2A2E] ${FOCUS_RING}`}
        >
          Tous les lieux
        </Link>
      }
    >
      <GuideLinkInner {...props} />
    </Suspense>
  );
}
