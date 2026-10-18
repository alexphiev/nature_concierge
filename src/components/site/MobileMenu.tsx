"use client";

import { Suspense, useEffect, useEffectEvent, useId, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { CloseIcon, HeartIcon, MenuIcon } from "../landing/icons";
import { NavLink } from "./NavLink";
import {
  ABOUT_HREF,
  ACCOUNT_HREF,
  CONTAINER,
  CONTRIBUTE_HREF,
  FOCUS_RING,
  GUIDE_HREF,
  TIPEEE_HREF,
} from "../landing/shared";

const PANEL_ROW = "flex min-h-13 items-center border-l-4 pl-3";
const PANEL_INACTIVE = "border-transparent text-[#1D2A2E]";
const PANEL_ACTIVE = "border-[#0E4B5A] bg-[#E8F0F1] font-bold text-[#0E4B5A]";

const ROWS = [
  { href: GUIDE_HREF, label: "Tous les lieux", match: [GUIDE_HREF] },
  { href: CONTRIBUTE_HREF, label: "Contribuer", match: [CONTRIBUTE_HREF] },
  { href: ABOUT_HREF, label: "À propos", match: [ABOUT_HREF] },
  { href: ACCOUNT_HREF, label: "Mon compte", match: [ACCOUNT_HREF, "/connexion"] },
];

// usePathname suspends while prerendering: isolating it behind its own Suspense
// keeps the menu button and panel in the static shell, rendered once.
function CloseOnRouteChange({ onChange }: { onChange: () => void }) {
  const pathname = usePathname();
  const onRouteChange = useEffectEvent(onChange);
  useEffect(() => {
    onRouteChange();
  }, [pathname]);
  return null;
}

export function MobileMenu() {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);

  function close() {
    setOpen(false);
    buttonRef.current?.focus();
  }

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setOpen(false);
      buttonRef.current?.focus();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <>
      <Suspense>
        <CloseOnRouteChange onChange={() => setOpen(false)} />
      </Suspense>
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? "Fermer le menu" : "Menu"}
        onClick={() => setOpen(!open)}
        className={`-mr-2.5 flex size-11 items-center justify-center text-[#1D2A2E] md:hidden ${FOCUS_RING}`}
      >
        {open ? <CloseIcon className="size-6" /> : <MenuIcon className="size-6" />}
      </button>
      <div
        id={panelId}
        hidden={!open}
        className="absolute inset-x-0 top-full z-50 border-b border-[#E4DACA] bg-[#FFFDF8] md:hidden"
      >
        <div className={`${CONTAINER} flex flex-col gap-4 pt-2 pb-5`}>
          <ul className="flex flex-col divide-y divide-[#E4DACA] text-[17px] font-medium">
            {ROWS.map((row) => (
              <li key={row.href}>
                <NavLink
                  {...row}
                  onClick={close}
                  className={PANEL_ROW}
                  inactiveClassName={PANEL_INACTIVE}
                  activeClassName={PANEL_ACTIVE}
                />
              </li>
            ))}
          </ul>
          <a
            href={TIPEEE_HREF}
            onClick={close}
            className={`flex h-13.5 items-center justify-center gap-2.5 rounded-full bg-[#A34A25] text-[17px] font-semibold text-white ${FOCUS_RING}`}
          >
            <HeartIcon className="size-5" />
            Soutenir sur Tipeee
          </a>
        </div>
      </div>
    </>
  );
}
