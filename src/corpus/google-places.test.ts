import { describe, it, expect, vi, beforeEach } from "vitest";

const { fetchMock } = vi.hoisted(() => ({ fetchMock: vi.fn() }));

vi.stubGlobal("fetch", fetchMock);

import { getGooglePlaceDetails, getGooglePlacePhoto, googleMapsUrl } from "./google-places";

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubEnv("GOOGLE_PLACES_API_KEY", "test-key-123");
});

describe("getGooglePlaceDetails", () => {
  it("returns null immediately when googlePlaceId is null, without calling fetch", async () => {
    const result = await getGooglePlaceDetails(null);

    expect(result).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("calls Place Details (New) with the correct URL, headers, and cache revalidate window", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ photos: [] }),
    });

    await getGooglePlaceDetails("ChIJexample123");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://places.googleapis.com/v1/places/ChIJexample123",
      expect.objectContaining({
        headers: expect.objectContaining({
          "X-Goog-Api-Key": "test-key-123",
          "X-Goog-FieldMask": "photos",
        }),
        next: { revalidate: 604800 },
      }),
    );
  });

  it("returns a null photo and no attributions when photos is empty", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ photos: [] }),
    });

    const result = await getGooglePlaceDetails("ChIJexample123");

    expect(result).toEqual({ photo: null, photoAttributions: [] });
  });

  it("calls the media endpoint with skipHttpRedirect=true and returns the public photoUri, not a key-bearing URL", async () => {
    fetchMock.mockImplementation(async (url: string) => {
      if (!url.includes("/media")) {
        return {
          ok: true,
          json: async () => ({
            photos: [
              {
                name: "places/ChIJexample123/photos/abc123",
                widthPx: 4032,
                heightPx: 3024,
                authorAttributions: [{ displayName: "Jean D." }],
              },
            ],
          }),
        };
      }
      return {
        ok: true,
        json: async () => ({
          photoUri: "https://lh3.googleusercontent.com/place-photos/abc123=s4800-w1200",
        }),
      };
    });

    const result = await getGooglePlaceDetails("ChIJexample123");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://places.googleapis.com/v1/places/ChIJexample123/photos/abc123/media?key=test-key-123&maxWidthPx=1200&skipHttpRedirect=true",
      expect.objectContaining({ next: { revalidate: 604800 } }),
    );
    expect(result?.photo).toEqual({
      photoUri: "https://lh3.googleusercontent.com/place-photos/abc123=s4800-w1200",
      attribution: "Jean D.",
    });
    // The key must never appear in the value handed to callers/the browser.
    expect(result?.photo?.photoUri).not.toContain("test-key-123");
  });

  it("returns null attribution when authorAttributions is empty", async () => {
    fetchMock.mockImplementation(async (url: string) => {
      if (!url.includes("/media")) {
        return {
          ok: true,
          json: async () => ({
            photos: [
              {
                name: "places/ChIJexample123/photos/abc123",
                authorAttributions: [],
              },
            ],
          }),
        };
      }
      return {
        ok: true,
        json: async () => ({
          photoUri: "https://lh3.googleusercontent.com/place-photos/abc123=s4800-w1200",
        }),
      };
    });

    const result = await getGooglePlaceDetails("ChIJexample123");

    expect(result?.photo?.attribution).toBeNull();
  });

  it("returns null when the Details response is not ok", async () => {
    fetchMock.mockResolvedValue({ ok: false, json: async () => ({}) });

    const result = await getGooglePlaceDetails("ChIJexample123");

    expect(result).toBeNull();
  });

  it("returns null when fetch itself throws (network error)", async () => {
    fetchMock.mockRejectedValue(new Error("network down"));

    const result = await getGooglePlaceDetails("ChIJexample123");

    expect(result).toBeNull();
  });

  it("returns null photo when the media endpoint fails, without throwing", async () => {
    fetchMock.mockImplementation(async (url: string) => {
      if (!url.includes("/media")) {
        return {
          ok: true,
          json: async () => ({
            photos: [{ name: "places/ChIJexample123/photos/abc123" }],
          }),
        };
      }
      return { ok: false, json: async () => ({}) };
    });

    const result = await getGooglePlaceDetails("ChIJexample123");

    expect(result?.photo).toBeNull();
  });

  it("returns null photo when the media endpoint response has no photoUri", async () => {
    fetchMock.mockImplementation(async (url: string) => {
      if (!url.includes("/media")) {
        return {
          ok: true,
          json: async () => ({
            photos: [{ name: "places/ChIJexample123/photos/abc123" }],
          }),
        };
      }
      return { ok: true, json: async () => ({}) };
    });

    const result = await getGooglePlaceDetails("ChIJexample123");

    expect(result?.photo).toBeNull();
  });
});

function mockDetailsWithPhotos(names: string[]) {
  fetchMock.mockImplementation(async (url: string) => {
    if (!url.includes("/media")) {
      return {
        ok: true,
        json: async () => ({
          photos: names.map((name, i) => ({
            name: `places/ChIJexample123/photos/${name}`,
            authorAttributions: i === 0 ? [{ displayName: "Jean D." }] : [],
          })),
        }),
      };
    }
    const photoName = url.split("/photos/")[1].split("/media")[0];
    return { ok: true, json: async () => ({ photoUri: `https://lh3.googleusercontent.com/${photoName}` }) };
  });
}

describe("getGooglePlaceDetails photoAttributions", () => {
  it("lists one attribution per photo while resolving only the first photo's media", async () => {
    mockDetailsWithPhotos(["a", "b", "c"]);

    const result = await getGooglePlaceDetails("ChIJexample123");

    expect(result?.photoAttributions).toEqual(["Jean D.", null, null]);
    const mediaCalls = fetchMock.mock.calls.filter(([url]) => String(url).includes("/media"));
    expect(mediaCalls).toHaveLength(1);
  });
});

describe("getGooglePlacePhoto", () => {
  it("returns null without calling fetch when googlePlaceId is null", async () => {
    expect(await getGooglePlacePhoto(null, 0)).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("resolves only the photo at the requested index", async () => {
    mockDetailsWithPhotos(["a", "b", "c"]);

    const result = await getGooglePlacePhoto("ChIJexample123", 2);

    expect(result).toEqual({ photoUri: "https://lh3.googleusercontent.com/c", attribution: null });
    const mediaCalls = fetchMock.mock.calls.filter(([url]) => String(url).includes("/media"));
    expect(mediaCalls).toHaveLength(1);
    expect(String(mediaCalls[0][0])).toContain("/photos/c/media");
  });

  it("returns null when the index is past the last photo", async () => {
    mockDetailsWithPhotos(["a"]);

    expect(await getGooglePlacePhoto("ChIJexample123", 3)).toBeNull();
  });
});

describe("googleMapsUrl", () => {
  it("targets the exact place when a googlePlaceId is known", () => {
    expect(googleMapsUrl("Calanque du Mugel, La Ciotat", "ChIJabc")).toBe(
      "https://www.google.com/maps/search/?api=1&query=Calanque+du+Mugel%2C+La+Ciotat&query_place_id=ChIJabc",
    );
  });

  it("falls back to a text search without a googlePlaceId", () => {
    expect(googleMapsUrl("Port d'Alon, Saint-Cyr-sur-Mer", null)).toBe(
      "https://www.google.com/maps/search/?api=1&query=Port+d%27Alon%2C+Saint-Cyr-sur-Mer",
    );
  });
});
