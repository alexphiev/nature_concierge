"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Place, SignalZone } from "../../../prisma/generated/client";
import { PlaceLocationFields } from "./PlaceLocationFields";
import { PlaceImageFields } from "./PlaceImageFields";
import { uploadPlacePhoto } from "./actions";
import { PlacePhotoFields, type PhotoItem } from "./PlacePhotoFields";

const PLACE_TYPES = ["CALANQUE", "PLAGE", "MASSIF", "SENTIER", "SOMMET", "SITE", "ISLAND", "SCENIC_ROAD"] as const;
const PLACE_STATUSES = ["DRAFT", "ACTIVE", "RETIRED"] as const;

const inputClass = "w-full min-w-0 rounded-[10px] border border-sable/40 bg-calcaire-deep p-3";

export function PlaceForm({
  action,
  place,
  zones,
  selectedZoneIds,
  parentOptions,
  hasChildren = false,
  governingAuthorities,
  imageUrls = [],
  photos = [],
}: {
  action: (formData: FormData) => Promise<{ id: string } | { error: string }>;
  place?: Place;
  zones: SignalZone[];
  selectedZoneIds?: Set<string>;
  parentOptions: Pick<Place, "id" | "name" | "commune">[];
  hasChildren?: boolean;
  governingAuthorities: string[];
  imageUrls?: string[];
  photos?: { id: string; src: string; credit: string | null }[];
}) {
  const router = useRouter();
  const [photoItems, setPhotoItems] = useState<PhotoItem[]>(
    photos.map((p) => ({ kind: "saved", id: p.id, src: p.src, credit: p.credit ?? "" })),
  );
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preparingPhotos, setPreparingPhotos] = useState(false);
  const [isPending, startTransition] = useTransition();

  // onSubmit instead of <form action>: React resets uncontrolled fields after a
  // form action, which would wipe the admin's edits when saving fails.
  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setError(null);

    startTransition(async () => {
      let placeId: string;
      try {
        const result = await action(formData);
        if ("error" in result) {
          setError(result.error);
          return;
        }
        placeId = result.id;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Enregistrement impossible");
        return;
      }

      const pending = photoItems.filter((item) => item.kind === "pending");
      for (const [index, photo] of pending.entries()) {
        setProgress(`Envoi photo ${index + 1}/${pending.length}…`);
        const data = new FormData();
        data.set("file", photo.blob);
        data.set("credit", photo.credit);
        try {
          const result = await uploadPlacePhoto(placeId, data);
          if ("error" in result) {
            setProgress(null);
            if (!place) {
              router.push(`/admin/places/${placeId}?erreur=photos`);
            } else {
              setError("L'envoi d'une photo a échoué. Enregistrez à nouveau pour réessayer.");
            }
            return;
          }
          URL.revokeObjectURL(photo.src);
          setPhotoItems((prev) =>
            prev.map((item) =>
              item === photo
                ? { kind: "saved", id: result.id, src: result.src, credit: photo.credit }
                : item,
            ),
          );
        } catch {
          setProgress(null);
          if (!place) {
            router.push(`/admin/places/${placeId}?erreur=photos`);
          } else {
            setError("L'envoi d'une photo a échoué. Enregistrez à nouveau pour réessayer.");
          }
          return;
        }
      }

      setProgress(null);
      router.push("/admin/places");
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {hasChildren ? (
        <p className="text-sm text-encre/70">
          Ce lieu a des spots : il ne peut pas lui-même avoir de lieu parent.
        </p>
      ) : (
        <label className="flex flex-col gap-1">
          <span className="text-sm text-encre/70">
            Lieu parent (optionnel — si c&apos;est un spot d&apos;un lieu plus large)
          </span>
          <select name="parentId" defaultValue={place?.parentId ?? ""} className={inputClass}>
            <option value="">— aucun (lieu principal) —</option>
            {parentOptions.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.commune})
              </option>
            ))}
          </select>
        </label>
      )}

      <PlaceLocationFields
        defaultName={place?.name}
        defaultCommune={place?.commune}
        defaultDepartement={place?.departement}
        defaultLat={place?.lat}
        defaultLng={place?.lng}
        defaultGooglePlaceId={place?.googlePlaceId}
        zones={zones.map(({ id, label, departement }) => ({ id, label, departement }))}
        selectedZoneIds={[...(selectedZoneIds ?? [])]}
      />

      <label className="flex flex-col gap-1">
        <span className="text-sm text-encre/70">Slug (laisser vide pour auto-génération à la création)</span>
        <input type="text" name="slug" defaultValue={place?.slug} className={inputClass} />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm text-encre/70">Type</span>
        <select name="type" defaultValue={place?.type ?? PLACE_TYPES[0]} className={inputClass}>
          {PLACE_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm text-encre/70">Autorité gestionnaire</span>
        <input
          type="text"
          name="governingAuthority"
          list="governingAuthority-options"
          defaultValue={place?.governingAuthority ?? ""}
          className={inputClass}
        />
        <datalist id="governingAuthority-options">
          {governingAuthorities.map((authority) => (
            <option key={authority} value={authority} />
          ))}
        </datalist>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm text-encre/70">URL info officielle</span>
        <input
          type="text"
          name="officialInfoUrl"
          defaultValue={place?.officialInfoUrl ?? ""}
          className={inputClass}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm text-encre/70">Description</span>
        <textarea
          name="description"
          rows={4}
          defaultValue={place?.description ?? ""}
          className={inputClass}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm text-encre/70">Rang de demande</span>
        <input
          type="number"
          name="demandRank"
          defaultValue={place?.demandRank ?? 999}
          className={inputClass}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm text-encre/70">Statut</span>
        <select name="status" defaultValue={place?.status ?? "DRAFT"} className={inputClass}>
          {PLACE_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </label>

      <label className="flex items-center gap-2">
        <input type="checkbox" name="zapef" defaultChecked={place?.zapef ?? false} />
        <span className="text-sm text-encre/70">ZAPEF (accessible même en rouge)</span>
      </label>

      <PlacePhotoFields
        items={photoItems}
        onChange={setPhotoItems}
        onPreparingChange={setPreparingPhotos}
        disabled={isPending}
      />
      <PlaceImageFields defaultUrls={imageUrls} />

      {error && <p className="text-sm text-statut-rouge">{error}</p>}
      <button
        type="submit"
        disabled={isPending || preparingPhotos}
        className="flex w-full items-center justify-center gap-2 rounded-[10px] bg-mediterranee px-5 py-3 text-white disabled:opacity-60 sm:w-auto"
      >
        {progress ?? (isPending ? "Enregistrement…" : "Enregistrer")}
      </button>
    </form>
  );
}
