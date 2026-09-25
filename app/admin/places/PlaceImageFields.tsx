"use client";

import { useState } from "react";

const inputClass = "min-w-0 rounded-[10px] border border-sable/40 bg-calcaire-deep p-3";

export function PlaceImageFields({ defaultUrls }: { defaultUrls: string[] }) {
  const [urls, setUrls] = useState(defaultUrls.length > 0 ? defaultUrls : [""]);

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-sm text-encre/70">
        Images pratiques (plans, horaires, faune...) — la source (nom de domaine) sera
        affichée en légende. Les photos du lieu restent gérées via Google Places.
      </legend>
      <div className="flex flex-col gap-2">
        {urls.map((url, index) => (
          <div key={index} className="flex gap-2">
            <input
              type="url"
              name="imageUrls"
              value={url}
              onChange={(e) => {
                const next = [...urls];
                next[index] = e.target.value;
                setUrls(next);
              }}
              placeholder="https://..."
              className={`flex-1 ${inputClass}`}
            />
            <button
              type="button"
              onClick={() => setUrls(urls.filter((_, i) => i !== index))}
              disabled={urls.length === 1}
              className="rounded-[10px] border border-sable/40 px-3 text-sm text-encre/70 disabled:opacity-40"
            >
              Retirer
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => setUrls([...urls, ""])}
        className="self-start rounded-[10px] border border-sable/40 px-3 py-1.5 text-sm text-mediterranee"
      >
        + Ajouter un lien
      </button>
    </fieldset>
  );
}
