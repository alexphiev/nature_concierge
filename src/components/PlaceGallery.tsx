"use client";

import Link from "next/link";
import { useState } from "react";
import type { DisplayPhoto } from "../corpus/place-photos";
import { PhotoImage } from "./PhotoImage";
import { PhotoCarousel } from "./PhotoCarousel";
import { Lightbox } from "./Lightbox";

const STRIPES =
  "repeating-linear-gradient(135deg, transparent, transparent 14px, color-mix(in srgb, var(--pin) 7%, transparent) 14px, color-mix(in srgb, var(--pin) 7%, transparent) 15px)";

// side.length -> the outer grid's column/row template, so the main cell's
// row-span always fills the same fixed md:h-[448px] as the side squares.
// 3 side items get their own 1x3 column (not the 2fr/1fr/1fr split used by
// 4, which would auto-place a gap in the last cell).
const LAYOUTS: Record<number, { grid: string; main: string }> = {
  0: { grid: "", main: "" },
  1: { grid: "md:grid-cols-[2fr_1fr]", main: "" },
  2: { grid: "md:grid-cols-[2fr_1fr] md:grid-rows-2", main: "md:row-span-2" },
  3: { grid: "md:grid-cols-[2fr_1fr] md:grid-rows-3", main: "md:row-span-3" },
  4: { grid: "md:grid-cols-[2fr_1fr_1fr] md:grid-rows-2", main: "md:row-span-2" },
};

const ADD_LINK = "text-mediterranee underline underline-offset-2";

export function PlaceGallery({
  slides,
  addPhotosHref,
}: {
  slides: DisplayPhoto[];
  addPhotosHref: string;
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const side = slides.slice(1, 5);
  const layout = LAYOUTS[side.length];

  if (slides.length === 0) {
    return (
      <div
        className="flex aspect-[4/3] flex-col items-center justify-center gap-2 rounded-[18px] bg-calcaire-deep p-6 text-center md:aspect-auto md:h-[448px]"
        style={{ backgroundImage: STRIPES }}
      >
        <p className="text-encre/75">Pas encore de photo de ce lieu. Vous en avez ?</p>
        <Link href={addPhotosHref} className={ADD_LINK}>
          Ajouter vos photos
        </Link>
      </div>
    );
  }

  return (
    <>
      {/* Mobile: swipeable carousel, one photo at a time. */}
      <div className="relative flex aspect-[4/3] items-end overflow-hidden rounded-[18px] bg-calcaire-deep p-4 md:hidden">
        <PhotoCarousel slides={slides} />
      </div>

      {/* Desktop: 1 main square + up to 4 small squares, opening a lightbox. */}
      <div className={`hidden gap-2 md:grid md:h-[448px] ${layout.grid}`}>
        <button
          type="button"
          onClick={() => setOpenIndex(0)}
          className={`relative overflow-hidden rounded-[18px] bg-calcaire-deep ${layout.main}`}
        >
          <PhotoImage photo={slides[0]} sizes="(min-width: 768px) 66vw, 0px" preload />
          {slides[0].credit && (
            <span className="absolute right-3 bottom-3 rounded bg-encre/55 px-2 py-0.5 font-mono text-[0.65rem] text-calcaire">
              Photo : {slides[0].credit}
            </span>
          )}
        </button>

        {side.map((slide, i) => (
          <button
            key={slide.src}
            type="button"
            onClick={() => setOpenIndex(i + 1)}
            className="group relative hidden overflow-hidden rounded-[18px] bg-calcaire-deep md:block"
          >
            <PhotoImage
              photo={slide}
              sizes="(min-width: 768px) 17vw, 0px"
              className="transition-transform duration-300 group-hover:scale-[1.03]"
            />
          </button>
        ))}
      </div>

      <p className="mt-3 text-sm">
        <Link href={addPhotosHref} className={ADD_LINK}>
          Ajouter vos photos
        </Link>
      </p>

      {openIndex !== null && (
        <Lightbox slides={slides} index={openIndex} onIndexChange={setOpenIndex} onClose={() => setOpenIndex(null)} />
      )}
    </>
  );
}
