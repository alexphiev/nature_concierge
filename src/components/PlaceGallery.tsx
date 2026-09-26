import Link from "next/link";
import type { DisplayPhoto } from "../corpus/place-photos";
import { PhotoImage } from "./PhotoImage";
import { PhotoCarousel } from "./PhotoCarousel";

const STRIPES =
  "repeating-linear-gradient(135deg, transparent, transparent 14px, color-mix(in srgb, var(--pin) 7%, transparent) 14px, color-mix(in srgb, var(--pin) 7%, transparent) 15px)";

// Side tiles only come in counts that fill the mosaic cleanly.
const LAYOUTS: Record<number, { grid: string; main: string }> = {
  0: { grid: "", main: "" },
  1: { grid: "md:grid-cols-[2fr_1fr]", main: "" },
  2: { grid: "md:grid-cols-[2fr_1fr] md:grid-rows-2", main: "md:row-span-2" },
  4: { grid: "md:grid-cols-[2fr_1fr_1fr] md:grid-rows-2", main: "md:row-span-2" },
};

export type GalleryTile = { slug: string; name: string; cover: DisplayPhoto };

export function PlaceGallery({
  typeLabel,
  slides,
  tiles,
}: {
  typeLabel: string;
  slides: DisplayPhoto[];
  tiles: GalleryTile[];
}) {
  const side = tiles.length >= 4 ? tiles.slice(0, 4) : tiles.length >= 2 ? tiles.slice(0, 2) : tiles;
  const layout = LAYOUTS[side.length];

  return (
    <div className={`grid gap-2 overflow-hidden rounded-[18px] md:h-[448px] ${layout.grid}`}>
      <div
        className={`relative flex aspect-[4/3] items-end bg-calcaire-deep p-4 md:aspect-auto ${layout.main}`}
        style={slides.length > 0 ? undefined : { backgroundImage: STRIPES }}
      >
        {slides.length > 1 ? (
          <PhotoCarousel slides={slides} />
        ) : slides.length === 1 ? (
          <>
            <PhotoImage photo={slides[0]} sizes="(min-width: 768px) 66vw, 100vw" preload />
            {slides[0].credit && (
              <span className="absolute right-3 bottom-3 rounded bg-encre/55 px-2 py-0.5 font-mono text-[0.65rem] text-calcaire">
                Photo : {slides[0].credit}
              </span>
            )}
          </>
        ) : (
          <span className="relative font-mono text-xs tracking-wide text-encre/60 uppercase">
            {typeLabel} · photo à venir
          </span>
        )}
      </div>

      {side.map((tile) => (
        <Link
          key={tile.slug}
          href={`/lieux/${tile.slug}`}
          className="group relative hidden overflow-hidden bg-calcaire-deep md:block"
        >
          <PhotoImage
            photo={tile.cover}
            sizes="(min-width: 768px) 17vw, 0px"
            className="transition-transform duration-300 group-hover:scale-[1.03]"
          />
          <span className="absolute bottom-3 left-3 rounded-full bg-calcaire/90 px-2.5 py-0.5 text-[0.8125rem] font-medium text-encre">
            {tile.name}
          </span>
        </Link>
      ))}
    </div>
  );
}
