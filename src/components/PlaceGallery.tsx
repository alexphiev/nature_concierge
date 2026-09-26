"use client";

import { useState } from "react";
import type { DisplayPhoto } from "../corpus/place-photos";
import { PhotoImage } from "./PhotoImage";
import { PhotoCarousel } from "./PhotoCarousel";
import { Lightbox } from "./Lightbox";

const STRIPES =
  "repeating-linear-gradient(135deg, transparent, transparent 14px, color-mix(in srgb, var(--pin) 7%, transparent) 14px, color-mix(in srgb, var(--pin) 7%, transparent) 15px)";

// side.length -> grid-template-columns/rows for the small squares.
const SIDE_LAYOUTS: Record<number, string> = {
  1: "md:grid-cols-1 md:grid-rows-1",
  2: "md:grid-cols-1 md:grid-rows-2",
  3: "md:grid-cols-2 md:grid-rows-2",
  4: "md:grid-cols-2 md:grid-rows-2",
};

export function PlaceGallery({ typeLabel, slides }: { typeLabel: string; slides: DisplayPhoto[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const side = slides.slice(1, 5);

  return (
    <>
      {/* Mobile: swipeable carousel, one photo at a time. */}
      <div
        className="relative flex aspect-[4/3] items-end overflow-hidden rounded-[18px] bg-calcaire-deep p-4 md:hidden"
        style={slides.length > 0 ? undefined : { backgroundImage: STRIPES }}
      >
        {slides.length > 0 ? (
          <PhotoCarousel slides={slides} />
        ) : (
          <span className="relative font-mono text-xs tracking-wide text-encre/60 uppercase">
            {typeLabel} · photo à venir
          </span>
        )}
      </div>

      {/* Desktop: 1 main square + up to 4 small squares, opening a lightbox. */}
      <div className="hidden gap-2 md:grid md:h-[448px] md:grid-cols-[2fr_1fr]">
        <button
          type="button"
          onClick={() => slides.length > 0 && setOpenIndex(0)}
          disabled={slides.length === 0}
          className="relative aspect-square overflow-hidden rounded-[18px] bg-calcaire-deep"
          style={slides.length > 0 ? undefined : { backgroundImage: STRIPES }}
        >
          {slides.length > 0 ? (
            <PhotoImage photo={slides[0]} sizes="(min-width: 768px) 66vw, 0px" preload />
          ) : (
            <span className="absolute inset-0 flex items-center justify-center font-mono text-xs tracking-wide text-encre/60 uppercase">
              {typeLabel} · photo à venir
            </span>
          )}
          {slides[0]?.credit && (
            <span className="absolute right-3 bottom-3 rounded bg-encre/55 px-2 py-0.5 font-mono text-[0.65rem] text-calcaire">
              Photo : {slides[0].credit}
            </span>
          )}
        </button>

        {side.length > 0 && (
          <div className={`grid gap-2 ${SIDE_LAYOUTS[side.length]}`}>
            {side.map((slide, i) => (
              <button
                key={slide.src}
                type="button"
                onClick={() => setOpenIndex(i + 1)}
                className="group relative aspect-square overflow-hidden rounded-[18px] bg-calcaire-deep"
              >
                <PhotoImage
                  photo={slide}
                  sizes="(min-width: 768px) 17vw, 0px"
                  className="transition-transform duration-300 group-hover:scale-[1.03]"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {openIndex !== null && (
        <Lightbox slides={slides} index={openIndex} onIndexChange={setOpenIndex} onClose={() => setOpenIndex(null)} />
      )}
    </>
  );
}
