export type CommuneSuggestion = {
  name: string;
  postcode: string;
  depcode: string;
};

type BanMunicipalityFeature = {
  properties: {
    city: string;
    postcode: string;
    depcode: string;
  };
};

type BanSearchResponse = {
  features: BanMunicipalityFeature[];
};

// Base Adresse Nationale — official French government address API,
// free, no API key required. https://api.gouv.fr/documentation/api-adresse
export async function searchCommunes(query: string): Promise<CommuneSuggestion[]> {
  if (query.trim().length < 2) return [];

  let response: Response;
  try {
    response = await fetch(
      `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(query)}&type=municipality&limit=5`,
    );
  } catch {
    return [];
  }

  if (!response.ok) return [];

  const data = (await response.json()) as BanSearchResponse;
  return data.features.map((f) => ({
    name: f.properties.city,
    postcode: f.properties.postcode,
    depcode: f.properties.depcode,
  }));
}

export type GeocodeResult = {
  lat: number;
  lng: number;
  placeId: string | null;
};

type GoogleGeocodeResponse = {
  status: string;
  results: {
    place_id?: string;
    geometry: { location: { lat: number; lng: number } };
  }[];
};

// Google Geocoding API — reuses GOOGLE_PLACES_API_KEY. Billed beyond a small
// free tier, so this is only called on explicit user action (blur), not
// on every keystroke.
export async function geocodePlace(
  name: string,
  commune: string,
): Promise<GeocodeResult | null> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY ?? "";
  const address = `${name}, ${commune}, France`;

  let response: Response;
  try {
    response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`,
    );
  } catch {
    return null;
  }

  if (!response.ok) {
    console.error("[geocodePlace] HTTP error", response.status, await response.text());
    return null;
  }

  const data = (await response.json()) as GoogleGeocodeResponse;
  console.log("[geocodePlace] response", JSON.stringify(data));
  if (data.status !== "OK" || data.results.length === 0) return null;

  const { lat, lng } = data.results[0].geometry.location;
  return { lat, lng, placeId: data.results[0].place_id ?? null };
}
