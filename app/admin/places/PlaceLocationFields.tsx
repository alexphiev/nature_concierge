"use client";

import { useEffect, useRef, useState } from "react";
import type { CommuneSuggestion } from "@/src/corpus/geo";
import type { SignalZone } from "../../../prisma/generated/client";

const inputClass = "rounded-[10px] border border-sable/40 bg-calcaire-deep p-3";

export function PlaceLocationFields({
  defaultName,
  defaultCommune,
  defaultDepartement,
  defaultLat,
  defaultLng,
  defaultGooglePlaceId,
  zones,
  selectedZoneIds,
}: {
  defaultName?: string;
  defaultCommune?: string;
  defaultDepartement?: string;
  defaultLat?: number;
  defaultLng?: number;
  defaultGooglePlaceId?: string | null;
  zones: Pick<SignalZone, "id" | "label" | "departement">[];
  selectedZoneIds: string[];
}) {
  const [name, setName] = useState(defaultName ?? "");
  const [commune, setCommune] = useState(defaultCommune ?? "");
  const [departement, setDepartement] = useState(defaultDepartement ?? "");
  const [lat, setLat] = useState(defaultLat != null ? String(defaultLat) : "");
  const [lng, setLng] = useState(defaultLng != null ? String(defaultLng) : "");
  const [googlePlaceId, setGooglePlaceId] = useState(defaultGooglePlaceId ?? "");

  const [suggestions, setSuggestions] = useState<CommuneSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [geocodeError, setGeocodeError] = useState(false);

  const canSuggest = commune.trim().length >= 2;
  const departementZones = zones.filter((z) => z.departement === departement);

  useEffect(() => {
    if (!canSuggest) return;
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      fetch(`/api/geo/communes?q=${encodeURIComponent(commune)}`, { signal: controller.signal })
        .then((r) => r.json())
        .then((data) => setSuggestions(data.communes ?? []))
        .catch(() => {});
    }, 250);
    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [commune, canSuggest]);

  function selectCommune(suggestion: CommuneSuggestion) {
    setCommune(suggestion.name);
    setDepartement(suggestion.depcode);
    setShowSuggestions(false);
  }

  async function runGeocode() {
    if (!name.trim() || !commune.trim()) return;
    setGeocoding(true);
    setGeocodeError(false);
    try {
      const res = await fetch(
        `/api/geo/geocode?name=${encodeURIComponent(name)}&commune=${encodeURIComponent(commune)}`,
      );
      const data = await res.json();
      if (data.result) {
        setLat(String(data.result.lat));
        setLng(String(data.result.lng));
        if (data.result.placeId) setGooglePlaceId(data.result.placeId);
      } else {
        setGeocodeError(true);
      }
    } catch {
      setGeocodeError(true);
    } finally {
      setGeocoding(false);
    }
  }

  const suggestionsRef = useRef<HTMLDivElement>(null);

  return (
    <>
      <label className="flex flex-col gap-1">
        <span className="text-sm text-encre/70">Nom</span>
        <input
          type="text"
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={runGeocode}
          required
          className={inputClass}
        />
      </label>

      <label className="relative flex flex-col gap-1">
        <span className="text-sm text-encre/70">Commune</span>
        <input
          type="text"
          name="commune"
          value={commune}
          onChange={(e) => {
            setCommune(e.target.value);
            setDepartement("");
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => {
            setTimeout(() => setShowSuggestions(false), 150);
            if (!departement) {
              const exact = suggestions.find(
                (s) => s.name.toLowerCase() === commune.trim().toLowerCase(),
              );
              if (exact) selectCommune(exact);
            }
            runGeocode();
          }}
          autoComplete="off"
          required
          className={inputClass}
        />
        {showSuggestions && canSuggest && suggestions.length > 0 && (
          <div
            ref={suggestionsRef}
            className="absolute top-full z-10 mt-1 w-full rounded-[10px] border border-sable/40 bg-calcaire-deep shadow-md"
          >
            {suggestions.map((s) => (
              <button
                key={s.postcode + s.name}
                type="button"
                onMouseDown={() => selectCommune(s)}
                className="block w-full px-3 py-2 text-left text-sm hover:bg-sable/20"
              >
                {s.name} ({s.postcode})
              </button>
            ))}
          </div>
        )}
      </label>

      <input type="hidden" name="departement" value={departement} />

      <div className="flex gap-4">
        <label className="flex flex-1 flex-col gap-1">
          <span className="text-sm text-encre/70">Latitude</span>
          <input
            type="number"
            step="any"
            name="lat"
            value={lat}
            onChange={(e) => setLat(e.target.value)}
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
            value={lng}
            onChange={(e) => setLng(e.target.value)}
            required
            className={inputClass}
          />
        </label>
      </div>

      {geocoding && <p className="text-xs text-encre/60">Recherche des coordonnées…</p>}
      {geocodeError && (
        <p className="text-xs text-amber-700">
          Coordonnées introuvables automatiquement — merci de les renseigner manuellement.
        </p>
      )}

      <label className="flex flex-col gap-1">
        <span className="text-sm text-encre/70">
          Identifiant Google Places (rempli automatiquement lors de la recherche des coordonnées)
        </span>
        <input
          type="text"
          name="googlePlaceId"
          value={googlePlaceId}
          onChange={(e) => setGooglePlaceId(e.target.value)}
          placeholder="ChIJ..."
          className={inputClass}
        />
      </label>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm text-encre/70">
          Zones de signal{departement ? ` (département ${departement})` : ""}
        </legend>
        {!departement ? (
          <p className="text-sm text-encre/70">
            Sélectionnez la commune dans la liste pour afficher ses zones.
          </p>
        ) : departementZones.length === 0 ? (
          <p className="text-sm text-encre/70">Aucune zone active pour ce département.</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {departementZones.map((zone) => (
              <li key={zone.id}>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="zoneIds"
                    value={zone.id}
                    defaultChecked={selectedZoneIds.includes(zone.id)}
                  />
                  <span className="text-sm">{zone.label}</span>
                </label>
              </li>
            ))}
          </ul>
        )}
      </fieldset>
    </>
  );
}
