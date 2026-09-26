"use client";

import { useState } from "react";

const inputClass = "min-w-0 rounded-[10px] border border-sable/40 bg-calcaire-deep p-3";

type ImageRow = { url: string; source: string };

export function PlaceImageFields({
  defaultImages,
}: {
  defaultImages: { url: string; source: string | null }[];
}) {
  const [rows, setRows] = useState<ImageRow[]>(
    defaultImages.length > 0
      ? defaultImages.map((img) => ({ url: img.url, source: img.source ?? "" }))
      : [{ url: "", source: "" }],
  );

  function setRow(index: number, patch: Partial<ImageRow>) {
    setRows(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-sm text-encre/70">
        Images pratiques (plans, horaires, faune...) — la source est affichée sur l&apos;image
        si renseignée. Les photos du lieu restent gérées via Google Places.
      </legend>
      <div className="flex flex-col gap-2">
        {rows.map((row, index) => (
          <div key={index} className="flex flex-wrap gap-2">
            <input
              type="url"
              name="imageUrls"
              value={row.url}
              onChange={(e) => setRow(index, { url: e.target.value })}
              placeholder="https://..."
              className={`flex-1 ${inputClass}`}
            />
            <input
              type="text"
              name="imageSources"
              value={row.source}
              onChange={(e) => setRow(index, { source: e.target.value })}
              placeholder="Source (optionnel)"
              className={`flex-1 ${inputClass}`}
            />
            <button
              type="button"
              onClick={() => setRows(rows.filter((_, i) => i !== index))}
              disabled={rows.length === 1}
              className="rounded-[10px] border border-sable/40 px-3 text-sm text-encre/70 disabled:opacity-40"
            >
              Retirer
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => setRows([...rows, { url: "", source: "" }])}
        className="self-start rounded-[10px] border border-sable/40 px-3 py-1.5 text-sm text-mediterranee"
      >
        + Ajouter un lien
      </button>
    </fieldset>
  );
}
