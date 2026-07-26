import { describe, it, expect, vi, beforeEach } from "vitest";

const { fetchMock } = vi.hoisted(() => ({ fetchMock: vi.fn() }));

vi.stubGlobal("fetch", fetchMock);

import { getGooglePlaceDetails } from "./google-places";

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
      json: async () => ({ photos: [], googleMapsUri: "https://maps.google.com/?cid=123" }),
    });

    await getGooglePlaceDetails("ChIJexample123");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://places.googleapis.com/v1/places/ChIJexample123",
      expect.objectContaining({
        headers: expect.objectContaining({
          "X-Goog-Api-Key": "test-key-123",
          "X-Goog-FieldMask": "photos,googleMapsUri",
        }),
        next: { revalidate: 604800 },
      }),
    );
  });

  it("returns googleMapsUri and a null photo when photos is empty", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ photos: [], googleMapsUri: "https://maps.google.com/?cid=123" }),
    });

    const result = await getGooglePlaceDetails("ChIJexample123");

    expect(result).toEqual({ photo: null, googleMapsUri: "https://maps.google.com/?cid=123" });
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
            googleMapsUri: "https://maps.google.com/?cid=123",
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
            googleMapsUri: null,
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
            googleMapsUri: null,
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
            googleMapsUri: null,
          }),
        };
      }
      return { ok: true, json: async () => ({}) };
    });

    const result = await getGooglePlaceDetails("ChIJexample123");

    expect(result?.photo).toBeNull();
  });
});
