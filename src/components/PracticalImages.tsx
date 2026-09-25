"use client";

import { useState } from "react";
import { imageSourceLabel } from "../corpus/image-source";

export function PracticalImages({ urls }: { urls: string[] }) {
  const [zoomedUrl, setZoomedUrl] = useState<string | null>(null);

  if (urls.length === 0) return null;

  return (
    <section aria-label="Documents pratiques">
      <h2 className="font-display text-[1.625rem] leading-tight font-semibold">Documents pratiques</h2>
      <p className="mt-1 text-sm text-encre/70">
        Plans, horaires, panneaux — cliquer pour agrandir.
      </p>
      <div className="mt-5 grid grid-cols-3 gap-3">
        {urls.slice(0, 3).map((url) => (
          <button
            key={url}
            type="button"
            onClick={() => setZoomedUrl(url)}
            className="group flex min-w-0 flex-col gap-2 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mediterranee"
          >
            <span className="block aspect-[4/3] w-full overflow-hidden rounded-xl border border-sable/40 bg-calcaire-deep">
              <img
                src={url}
                alt=""
                width={400}
                height={300}
                className="size-full object-cover transition-transform duration-150 group-hover:scale-105"
              />
            </span>
            <span className="truncate font-mono text-[0.6875rem] text-encre/65">
              Source : {imageSourceLabel(url)}
            </span>
          </button>
        ))}
      </div>

      {zoomedUrl && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setZoomedUrl(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-encre/85 p-6"
        >
          <img
            src={zoomedUrl}
            alt=""
            className="max-h-full max-w-full rounded-[10px] object-contain"
          />
          <span className="absolute right-4 bottom-4 rounded bg-encre/60 px-2.5 py-1 font-mono text-xs text-calcaire">
            Source : {imageSourceLabel(zoomedUrl)}
          </span>
          <button
            type="button"
            onClick={() => setZoomedUrl(null)}
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
