import type { Place, SignalZone } from "../../../prisma/generated/client";
import { PlaceLocationFields } from "./PlaceLocationFields";

const PLACE_TYPES = ["CALANQUE", "PLAGE", "MASSIF", "SENTIER", "SOMMET", "SITE", "ISLAND", "SCENIC_ROAD"] as const;
const PLACE_STATUSES = ["DRAFT", "ACTIVE", "RETIRED"] as const;

const inputClass = "rounded-[10px] border border-sable/40 bg-calcaire-deep p-3";

export function PlaceForm({
  action,
  place,
  zones,
  selectedZoneIds,
  parentOptions,
  hasChildren = false,
}: {
  action: (formData: FormData) => Promise<void>;
  place?: Place;
  zones: SignalZone[];
  selectedZoneIds?: Set<string>;
  parentOptions: Pick<Place, "id" | "name" | "commune">[];
  hasChildren?: boolean;
}) {
  return (
    <form action={action} className="flex flex-col gap-4">
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
          defaultValue={place?.governingAuthority ?? ""}
          className={inputClass}
        />
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

      <button
        type="submit"
        className="flex w-full items-center justify-center gap-2 rounded-[10px] bg-mediterranee px-5 py-3 text-white sm:w-auto"
      >
        Enregistrer
      </button>
    </form>
  );
}
