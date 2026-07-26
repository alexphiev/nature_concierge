import type { Place, SignalZone } from "../../../prisma/generated/client";

const PLACE_TYPES = ["CALANQUE", "PLAGE", "MASSIF", "SENTIER", "SOMMET", "SITE"] as const;
const PLACE_STATUSES = ["DRAFT", "ACTIVE", "RETIRED"] as const;
const DEPARTEMENTS = ["13", "83"] as const;

const inputClass = "rounded-[10px] border border-sable/40 bg-calcaire-deep p-3";

export function PlaceForm({
  action,
  place,
  zones,
  selectedZoneIds,
}: {
  action: (formData: FormData) => Promise<void>;
  place?: Place;
  zones: SignalZone[];
  selectedZoneIds?: Set<string>;
}) {
  return (
    <form action={action} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1">
        <span className="text-sm text-encre/70">Nom</span>
        <input type="text" name="name" defaultValue={place?.name} required className={inputClass} />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm text-encre/70">Slug (laisser vide pour auto-génération à la création)</span>
        <input type="text" name="slug" defaultValue={place?.slug} className={inputClass} />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm text-encre/70">Commune</span>
        <input type="text" name="commune" defaultValue={place?.commune} required className={inputClass} />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm text-encre/70">Département</span>
        <select name="departement" defaultValue={place?.departement ?? "83"} className={inputClass}>
          {DEPARTEMENTS.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </label>

      <div className="flex gap-4">
        <label className="flex flex-1 flex-col gap-1">
          <span className="text-sm text-encre/70">Latitude</span>
          <input
            type="number"
            step="any"
            name="lat"
            defaultValue={place?.lat}
            required
            className={inputClass}
          />
        </label>

        <label className="flex flex-1 flex-col gap-1">
          <span className="text-sm text-encre/70">Longitude</span>
          <input
            type="number"
            step="any"
            name="lng"
            defaultValue={place?.lng}
            required
            className={inputClass}
          />
        </label>
      </div>

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
        <span className="text-sm text-encre/70">
          Identifiant Google Places (optionnel)
        </span>
        <input
          type="text"
          name="googlePlaceId"
          defaultValue={place?.googlePlaceId ?? ""}
          placeholder="ChIJ..."
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

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm text-encre/70">Zones de signal</legend>
        {zones.length === 0 ? (
          <p className="text-sm text-encre/70">Aucune zone active.</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {zones.map((zone) => (
              <li key={zone.id}>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="zoneIds"
                    value={zone.id}
                    defaultChecked={selectedZoneIds?.has(zone.id) ?? false}
                  />
                  <span className="text-sm">{zone.label}</span>
                </label>
              </li>
            ))}
          </ul>
        )}
      </fieldset>

      <button
        type="submit"
        className="flex w-full items-center justify-center gap-2 rounded-[10px] bg-mediterranee px-5 py-3 text-white sm:w-auto"
      >
        Enregistrer
      </button>
    </form>
  );
}
