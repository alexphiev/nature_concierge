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

  it("builds the correct mediaUrl and attribution from the first photo", async () => {
    fetchMock.mockResolvedValue({
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
    });

    const result = await getGooglePlaceDetails("ChIJexample123");

    expect(result?.photo).toEqual({
      mediaUrl:
        "https://places.googleapis.com/v1/places/ChIJexample123/photos/abc123/media?key=test-key-123&maxWidthPx=1200",
      attribution: "Jean D.",
    });
  });

  it("returns null attribution when authorAttributions is empty", async () => {
    fetchMock.mockResolvedValue({
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
    });

    const result = await getGooglePlaceDetails("ChIJexample123");

    expect(result?.photo?.attribution).toBeNull();
  });

  it("returns null when the fetch response is not ok", async () => {
    fetchMock.mockResolvedValue({ ok: false, json: async () => ({}) });

    const result = await getGooglePlaceDetails("ChIJexample123");

    expect(result).toBeNull();
  });

  it("returns null when fetch itself throws (network error)", async () => {
    fetchMock.mockRejectedValue(new Error("network down"));

    const result = await getGooglePlaceDetails("ChIJexample123");

    expect(result).toBeNull();
  });
});
