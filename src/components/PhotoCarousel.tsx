"use client";

import { useState } from "react";
import type { DisplayPhoto } from "../corpus/place-photos";
import { PhotoImage } from "./PhotoImage";

const GALLERY_SIZES = "(min-width: 768px) 66vw, 100vw";

function Chevron({ direction }: { direction: "left" | "right" }) {
  return (
    <svg
      aria-hidden
      width="18"
      height="18"
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
  "absolute top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-calcaire/90 text-encre shadow-md transition-colors hover:bg-calcaire focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-calcaire";

// Each Google photo is still resolved only when requested; the current and
// next slide are loaded.
export function PhotoCarousel({ slides }: { slides: DisplayPhoto[] }) {
  const [index, setIndex] = useState(0);
  const count = slides.length;
  const credit = slides[index].credit;

  return (
    <>
      <PhotoImage key={slides[index].src} photo={slides[index]} sizes={GALLERY_SIZES} preload={index === 0} />
      {slides[index + 1] && (
        <div aria-hidden className="invisible">
          <PhotoImage key={slides[index + 1].src} photo={slides[index + 1]} sizes={GALLERY_SIZES} />
        </div>
      )}

      {index > 0 && (
        <button
          type="button"
          onClick={() => setIndex(index - 1)}
          aria-label="Photo précédente"
          className={`${NAV_BUTTON} left-3`}
        >
          <Chevron direction="left" />
        </button>
      )}
      {index < count - 1 && (
        <button
          type="button"
          onClick={() => setIndex(index + 1)}
          aria-label="Photo suivante"
          className={`${NAV_BUTTON} right-3`}
        >
          <Chevron direction="right" />
        </button>
      )}

      <span
        aria-live="polite"
        className="absolute bottom-3 left-3 rounded-full bg-encre/60 px-2.5 py-0.5 font-mono text-[0.7rem] text-calcaire"
      >
        {index + 1} / {count}
      </span>
      {credit && (
        <span className="absolute right-3 bottom-3 rounded bg-encre/55 px-2 py-0.5 font-mono text-[0.65rem] text-calcaire">
          Photo : {credit}
        </span>
      )}
    </>
  );
}
