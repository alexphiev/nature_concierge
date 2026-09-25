"use client";

import { Suspense, useEffect, useEffectEvent, useId, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChatIcon, CloseIcon, MenuIcon } from "../landing/icons";
import {
  ABOUT_HREF,
  ACTIVE_LINK,
  ASK_HREF,
  CONTAINER,
  FOCUS_RING,
  GUIDE_HREF,
  PROPOSE_PLACE_HREF,
} from "../landing/shared";

const PANEL_ROW = `flex min-h-13 items-center ${FOCUS_RING}`;

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

export function MobileMenu({ guideActive }: { guideActive: boolean }) {
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
            <li>
              <Link
                href={GUIDE_HREF}
                onClick={close}
                aria-current={guideActive ? "page" : undefined}
                className={`${PANEL_ROW} ${guideActive ? ACTIVE_LINK : "text-[#1D2A2E]"}`}
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
    </>
  );
}
