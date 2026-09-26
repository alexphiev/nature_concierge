"use client";

import { useState } from "react";

type PracticalImage = { url: string; source: string | null };

export function PracticalImages({ images }: { images: PracticalImage[] }) {
  const [zoomed, setZoomed] = useState<PracticalImage | null>(null);

  if (images.length === 0) return null;

  return (
    <section aria-label="Documents pratiques">
      <h2 className="font-display text-[1.625rem] leading-tight font-semibold">Documents pratiques</h2>
      <p className="mt-1 text-sm text-encre/70">
        Plans, horaires, panneaux — cliquer pour agrandir.
      </p>
      <div className="mt-5 grid grid-cols-3 gap-3">
        {images.slice(0, 3).map((image) => (
          <button
            key={image.url}
            type="button"
            onClick={() => setZoomed(image)}
            className="group min-w-0 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mediterranee"
          >
            <span className="relative block aspect-[4/3] w-full overflow-hidden rounded-xl border border-sable/40 bg-calcaire-deep">
              <img
                src={image.url}
                alt=""
                width={400}
                height={300}
                className="size-full object-cover transition-transform duration-150 group-hover:scale-105"
              />
              {image.source && (
                <span className="absolute right-2 bottom-2 max-w-[calc(100%-1rem)] truncate rounded bg-encre/55 px-2 py-0.5 font-mono text-[0.65rem] text-calcaire">
                  Source : {image.source}
                </span>
              )}
            </span>
          </button>
        ))}
      </div>

      {zoomed && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setZoomed(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-encre/85 p-6"
        >
          <img
            src={zoomed.url}
            alt=""
            className="max-h-full max-w-full rounded-[10px] object-contain"
          />
          {zoomed.source && (
            <span className="absolute right-4 bottom-4 rounded bg-encre/60 px-2.5 py-1 font-mono text-xs text-calcaire">
              Source : {zoomed.source}
            </span>
          )}
          <button
            type="button"
            onClick={() => setZoomed(null)}
            aria-label="Fermer"
            className="absolute top-4 right-4 rounded-full bg-calcaire/90 px-3 py-1.5 text-sm text-encre"
          >
            Fermer
          </button>
        </div>
      )}
    </section>
  );
}
