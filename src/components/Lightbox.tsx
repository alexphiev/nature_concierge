"use client";

import { useEffect } from "react";
import type { DisplayPhoto } from "../corpus/place-photos";
import { PhotoImage } from "./PhotoImage";

function Chevron({ direction }: { direction: "left" | "right" }) {
  return (
    <svg
      aria-hidden
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={direction === "left" ? "m15 6-6 6 6 6" : "m9 6 6 6-6 6"} />
    </svg>
  );
}

const NAV_BUTTON =
  "absolute top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-calcaire/90 text-encre shadow-md transition-colors hover:bg-calcaire focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-calcaire";

export function Lightbox({
  slides,
  index,
  onIndexChange,
  onClose,
}: {
  slides: DisplayPhoto[];
  index: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
}) {
  const count = slides.length;
  const credit = slides[index]?.credit;

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && index > 0) onIndexChange(index - 1);
      if (e.key === "ArrowRight" && index < count - 1) onIndexChange(index + 1);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [index, count, onIndexChange, onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-encre/90 p-4 md:p-10"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative flex size-full max-h-full max-w-full items-center justify-center"
      >
        <PhotoImage
          key={slides[index].src}
          photo={slides[index]}
          sizes="100vw"
          fit="contain"
          preload
        />

        {index > 0 && (
          <button
            type="button"
            onClick={() => onIndexChange(index - 1)}
            aria-label="Photo précédente"
            className={`${NAV_BUTTON} left-2 md:left-4`}
          >
            <Chevron direction="left" />
          </button>
        )}
        {index < count - 1 && (
          <button
            type="button"
            onClick={() => onIndexChange(index + 1)}
            aria-label="Photo suivante"
            className={`${NAV_BUTTON} right-2 md:right-4`}
          >
            <Chevron direction="right" />
          </button>
        )}

        {count > 1 && (
          <span
            aria-live="polite"
            className="absolute bottom-3 left-3 rounded-full bg-encre/60 px-2.5 py-0.5 font-mono text-[0.7rem] text-calcaire"
          >
            {index + 1} / {count}
          </span>
        )}
        {credit && (
          <span className="absolute right-3 bottom-3 rounded bg-encre/55 px-2 py-0.5 font-mono text-[0.65rem] text-calcaire">
            Photo : {credit}
          </span>
        )}
      </div>

      <button
        type="button"
        onClick={onClose}
        aria-label="Fermer"
        className="absolute top-4 right-4 rounded-full bg-calcaire/90 px-3 py-1.5 text-sm text-encre"
      >
        Fermer
      </button>
    </div>
  );
}
