"use client";

import { useEffect, useState } from "react";

function photoSrc(slug: string, index: number): string {
  return `/lieux/${slug}/photo?i=${index}`;
}

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

// Each photo is resolved (one Places media call) only when requested, so only
// the current photo and the next one are ever fetched.
export function PhotoCarousel({
  slug,
  attributions,
}: {
  slug: string;
  attributions: (string | null)[];
}) {
  const [index, setIndex] = useState(0);
  const count = attributions.length;
  const attribution = attributions[index];

  useEffect(() => {
    if (index + 1 < count) {
      new Image().src = photoSrc(slug, index + 1);
    }
  }, [slug, index, count]);

  return (
    <>
      <img
        key={index}
        src={photoSrc(slug, index)}
        alt=""
        width={1200}
        height={900}
        className="absolute inset-0 size-full object-cover"
      />

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
      {attribution && (
        <span className="absolute right-3 bottom-3 rounded bg-encre/55 px-2 py-0.5 font-mono text-[0.65rem] text-calcaire">
          Photo : {attribution}
        </span>
      )}
    </>
  );
}
