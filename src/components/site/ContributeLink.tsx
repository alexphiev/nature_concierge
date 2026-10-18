"use client";

import Link from "next/link";
import { Suspense } from "react";
import { usePathname } from "next/navigation";
import { CONTRIBUTE_HREF, FOCUS_RING } from "../landing/shared";

function isContributePath(pathname: string): boolean {
  return pathname === CONTRIBUTE_HREF || pathname.startsWith(`${CONTRIBUTE_HREF}/`);
}

function ContributeLinkInner({ className, activeClassName, onClick }: Props) {
  const active = isContributePath(usePathname());
  return (
    <Link
      href={CONTRIBUTE_HREF}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={`${className} ${active ? activeClassName : ""} ${FOCUS_RING}`}
    >
      Contribuer
    </Link>
  );
}

type Props = { className: string; activeClassName: string; onClick?: () => void };

// usePathname suspends while prerendering: the inactive link is the static fallback.
export function ContributeLink(props: Props) {
  return (
    <Suspense
      fallback={
        <Link
          href={CONTRIBUTE_HREF}
          onClick={props.onClick}
          className={`${props.className} ${FOCUS_RING}`}
        >
          Contribuer
        </Link>
      }
    >
      <ContributeLinkInner {...props} />
    </Suspense>
  );
}
