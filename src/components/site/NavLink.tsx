"use client";

import Link from "next/link";
import { Suspense } from "react";
import { usePathname } from "next/navigation";
import { FOCUS_RING } from "../landing/shared";

type Match = string[] | ((pathname: string) => boolean);

type Props = {
  href: string;
  label: string;
  match: Match;
  className?: string;
  inactiveClassName?: string;
  activeClassName: string;
  onClick?: () => void;
};

function isActive(match: Match, pathname: string): boolean {
  if (typeof match === "function") return match(pathname);
  return match.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function NavLinkInner({ match, activeClassName, ...props }: Props) {
  const active = isActive(match, usePathname());
  return (
    <NavAnchor
      {...props}
      activeClassName={activeClassName}
      active={active}
    />
  );
}

function NavAnchor({
  href,
  label,
  className = "",
  inactiveClassName = "",
  activeClassName,
  onClick,
  active = false,
}: Omit<Props, "match"> & { active?: boolean }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={`${className} ${active ? activeClassName : inactiveClassName} ${FOCUS_RING}`}
    >
      {label}
    </Link>
  );
}

// usePathname suspends while prerendering: the inactive link is the static fallback.
export function NavLink(props: Props) {
  const { match: _match, ...anchorProps } = props;
  return (
    <Suspense fallback={<NavAnchor {...anchorProps} />}>
      <NavLinkInner {...props} />
    </Suspense>
  );
}
