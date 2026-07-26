"use client";

import { useState } from "react";

const inputClass = "rounded-[10px] border border-sable/40 bg-calcaire-deep p-3";

export function BlockList({ sourceTypes }: { sourceTypes: readonly string[] }) {
  const [blockKeys, setBlockKeys] = useState<number[]>([0]);
  const [nextKey, setNextKey] = useState(1);

  return (
    <div className="flex flex-col gap-6">
      <input type="hidden" name="blockCount" value={blockKeys.length} />

      {blockKeys.map((key, index) => (
        <fieldset key={key} className="flex flex-col gap-3 rounded-[10px] border border-sable/40 p-4">
          <div className="flex items-center justify-between">
            <legend className="text-sm font-medium text-encre/70">Source {index + 1}</legend>
            {blockKeys.length > 1 && (
              <button
                type="button"
                onClick={() => setBlockKeys((keys) => keys.filter((k) => k !== key))}
                className="text-sm text-encre/50 underline"
              >
                Retirer
              </button>
            )}
          </div>

          <label className="flex flex-col gap-1">
            <span className="text-sm text-encre/70">Indice de source</span>
            <textarea
              name={`block-${index}-sourceHint`}
              rows={2}
              placeholder="email OT Saint-Cyr, 20 juillet 2026 / panneau sur place (photo) / post r/marseille"
              className={inputClass}
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm text-encre/70">Type de source (optionnel)</span>
            <select name={`block-${index}-sourceType`} defaultValue="" className={inputClass}>
              <option value="">— laisser le modèle déduire —</option>
              {sourceTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>

          <p className="text-xs text-encre/50">Texte ou images requis (au moins l&apos;un des deux).</p>

          <label className="flex flex-col gap-1">
            <span className="text-sm text-encre/70">Texte</span>
            <textarea name={`block-${index}-text`} rows={5} className={inputClass} />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm text-encre/70">Images</span>
            <input
              type="file"
              name={`block-${index}-images`}
              multiple
              accept="image/*"
              className={inputClass}
            />
          </label>
        </fieldset>
      ))}

      <button
        type="button"
        onClick={() => {
          setBlockKeys((keys) => [...keys, nextKey]);
          setNextKey((k) => k + 1);
        }}
        className="self-start rounded-[10px] border border-sable/40 px-4 py-2 text-sm"
      >
        Ajouter une source
      </button>
    </div>
  );
}
