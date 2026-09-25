"use client";

import { useState } from "react";
import { imageSourceLabel } from "../corpus/image-source";

export function PracticalImages({ urls }: { urls: string[] }) {
  const [zoomedUrl, setZoomedUrl] = useState<string | null>(null);

  if (urls.length === 0) return null;

  return (
    <section aria-label="Documents pratiques" className="mt-16">
      <h2 className="font-display text-2xl">Documents pratiques</h2>
      <p className="mt-1 text-sm text-encre/70">
        Plans, horaires, panneaux — cliquer pour agrandir.
      </p>
      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {urls.slice(0, 3).map((url) => (
          <button
            key={url}
            type="button"
            onClick={() => setZoomedUrl(url)}
            className="group relative aspect-[4/3] overflow-hidden rounded-[10px] border border-sable/40 bg-calcaire-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mediterranee"
          >
            <img
              src={url}
              alt=""
              width={400}
              height={300}
              className="size-full object-cover transition-transform duration-150 group-hover:scale-105"
            />
            <span className="absolute right-2 bottom-2 rounded bg-encre/50 px-2 py-0.5 font-mono text-[0.65rem] text-calcaire">
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
