"use client";

import { useRef, useState } from "react";
import { PLACE_PHOTO_TYPES } from "@/src/storage/photo-types";
import { compressPhoto } from "./compress-photo";

export type PhotoItem =
  | { kind: "saved"; id: string; src: string; credit: string }
  | { kind: "pending"; tempId: string; blob: Blob; src: string; credit: string };

const inputClass = "min-w-0 rounded-[10px] border border-sable/40 bg-calcaire-deep p-3";
const smallButton =
  "rounded-[10px] border border-sable/40 px-3 py-1.5 text-sm text-encre/70 disabled:opacity-40";

function itemKey(item: PhotoItem): string {
  return item.kind === "saved" ? item.id : item.tempId;
}

export function PlacePhotoFields({
  items,
  onChange,
}: {
  items: PhotoItem[];
  onChange: (items: PhotoItem[]) => void;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [preparing, setPreparing] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  async function addFiles(files: FileList) {
    setPreparing(true);
    const added: PhotoItem[] = [];
    const failed: string[] = [];
    for (const file of Array.from(files)) {
      try {
        const blob = await compressPhoto(file);
        added.push({
          kind: "pending",
          tempId: crypto.randomUUID(),
          blob,
          src: URL.createObjectURL(blob),
          credit: "",
        });
      } catch (e) {
        failed.push(`« ${file.name} » : ${e instanceof Error ? e.message : "illisible"}`);
      }
    }
    setErrors(failed);
    setPreparing(false);
    if (fileInput.current) fileInput.current.value = "";
    onChange([...items, ...added]);
  }

  // Saved photos always precede pending ones: pending photos are appended on upload.
  function canSwap(a: number, b: number): boolean {
    return b >= 0 && b < items.length && items[a].kind === items[b].kind;
  }

  function swap(a: number, b: number) {
    const next = [...items];
    [next[a], next[b]] = [next[b], next[a]];
    onChange(next);
  }

  function remove(index: number) {
    const item = items[index];
    if (item.kind === "pending") URL.revokeObjectURL(item.src);
    onChange(items.filter((_, i) => i !== index));
  }

  function setCredit(index: number, credit: string) {
    onChange(items.map((item, i) => (i === index ? { ...item, credit } : item)));
  }

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-sm text-encre/70">
        Photos du lieu — affichées en premier sur la page publique. Les photos Google
        complètent jusqu&apos;à 5.
      </legend>

      {items.map((item, index) => (
        <div key={itemKey(item)} className="flex flex-wrap items-center gap-2">
          <img src={item.src} alt="" className="h-15 w-20 rounded-[8px] object-cover" />
          {item.kind === "saved" && <input type="hidden" name="photoIds" value={item.id} />}
          <input
            type="text"
            name={item.kind === "saved" ? "photoCredits" : undefined}
            value={item.credit}
            onChange={(e) => setCredit(index, e.target.value)}
            placeholder="Crédit (optionnel)"
            className={`flex-1 ${inputClass}`}
          />
          {item.kind === "pending" && (
            <span className="font-mono text-xs text-encre/60">à envoyer</span>
          )}
          <button
            type="button"
            onClick={() => swap(index, index - 1)}
            disabled={!canSwap(index, index - 1)}
            aria-label="Monter"
            className={smallButton}
          >
            ↑
          </button>
          <button
            type="button"
            onClick={() => swap(index, index + 1)}
            disabled={!canSwap(index, index + 1)}
            aria-label="Descendre"
            className={smallButton}
          >
            ↓
          </button>
          <button type="button" onClick={() => remove(index)} className={smallButton}>
            Retirer
          </button>
        </div>
      ))}

      <label className="self-start rounded-[10px] border border-sable/40 px-3 py-1.5 text-sm text-mediterranee">
        {preparing ? "Préparation…" : "+ Ajouter des photos"}
        <input
          ref={fileInput}
          type="file"
          accept={PLACE_PHOTO_TYPES.join(",")}
          multiple
          disabled={preparing}
          onChange={(e) => e.target.files && addFiles(e.target.files)}
          className="sr-only"
        />
      </label>
      {errors.map((error) => (
        <p key={error} className="text-sm text-statut-rouge">
          {error}
        </p>
      ))}
    </fieldset>
  );
}
