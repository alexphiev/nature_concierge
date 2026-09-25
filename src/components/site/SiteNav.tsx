"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChatIcon, CloseIcon, MenuIcon } from "../landing/icons";
import { ABOUT_HREF, ASK_HREF, CONTAINER, FOCUS_RING, PROPOSE_PLACE_HREF } from "../landing/shared";

const GUIDE_HREF = "/lieux";
const ACTIVE = "text-[#0E4B5A] underline decoration-2 underline-offset-8";
const PANEL_ROW = `flex min-h-13 items-center ${FOCUS_RING}`;

export function SiteNav() {
  return <SiteNavView pathname={usePathname()} />;
}

export function SiteNavView({ pathname }: { pathname: string }) {
  // Remembering the pathname the menu was opened on closes it on route change.
  const [openedOn, setOpenedOn] = useState<string | null>(null);
  const open = openedOn === pathname;
  const panelId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const guideActive = pathname === GUIDE_HREF || pathname.startsWith(`${GUIDE_HREF}/`);
  const close = () => setOpenedOn(null);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setOpenedOn(null);
      buttonRef.current?.focus();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <nav className="flex items-center gap-8 text-[16px] font-medium">
      <Link
        href={GUIDE_HREF}
        aria-current={guideActive ? "page" : undefined}
        className={`hidden md:block ${guideActive ? ACTIVE : "text-[#1D2A2E]"} ${FOCUS_RING}`}
      >
        Le guide
      </Link>
      <a href={PROPOSE_PLACE_HREF} className={`hidden text-[#1D2A2E] lg:block ${FOCUS_RING}`}>
        Proposer un lieu
      </a>
      <a href={ABOUT_HREF} className={`hidden text-[#1D2A2E] md:block ${FOCUS_RING}`}>
        À propos
      </a>
      <a
        href={ASK_HREF}
        className={`hidden h-11 items-center gap-2 rounded-full bg-[#0E4B5A] px-4.5 font-semibold text-white md:flex ${FOCUS_RING}`}
      >
        <ChatIcon className="size-4.5" />
        WhatsApp
      </a>
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? "Fermer le menu" : "Menu"}
        onClick={() => setOpenedOn(open ? null : pathname)}
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
            <li>
              <Link
                href={GUIDE_HREF}
                onClick={close}
                aria-current={guideActive ? "page" : undefined}
                className={`${PANEL_ROW} ${guideActive ? ACTIVE : "text-[#1D2A2E]"}`}
              >
                Le guide
              </Link>
            </li>
            <li>
              <a href={PROPOSE_PLACE_HREF} onClick={close} className={`${PANEL_ROW} text-[#1D2A2E]`}>
                Proposer un lieu
              </a>
            </li>
            <li>
              <a href={ABOUT_HREF} onClick={close} className={`${PANEL_ROW} text-[#1D2A2E]`}>
                À propos
              </a>
            </li>
          </ul>
          <a
            href={ASK_HREF}
            onClick={close}
            className={`flex h-13.5 items-center justify-center gap-2.5 rounded-full bg-[#0E4B5A] text-[17px] font-semibold text-white ${FOCUS_RING}`}
          >
            <ChatIcon className="size-5" />
            Demander conseil sur WhatsApp
          </a>
        </div>
      </div>
    </nav>
  );
}
