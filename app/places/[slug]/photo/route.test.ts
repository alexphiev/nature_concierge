import { describe, it, expect, vi, beforeEach } from "vitest";

const { getPlaceBySlugMock, getGooglePlaceDetailsMock } = vi.hoisted(() => ({
  getPlaceBySlugMock: vi.fn(),
  getGooglePlaceDetailsMock: vi.fn(),
}));

vi.mock("@/src/corpus/queries", () => ({
  getPlaceBySlug: getPlaceBySlugMock,
}));

vi.mock("@/src/corpus/google-places", () => ({
  getGooglePlaceDetails: getGooglePlaceDetailsMock,
}));

import { GET } from "./route";

beforeEach(() => {
  getPlaceBySlugMock.mockReset();
  getGooglePlaceDetailsMock.mockReset();
});

function makeContext(slug: string) {
  return { params: Promise.resolve({ slug }) };
}

describe("GET /places/[slug]/photo", () => {
  it("redirects to the public photoUri when a photo exists", async () => {
    getPlaceBySlugMock.mockResolvedValue({ id: "place-1", googlePlaceId: "ChIJexample" });
    getGooglePlaceDetailsMock.mockResolvedValue({
      photo: {
        photoUri: "https://lh3.googleusercontent.com/place-photos/abc123=s4800-w1200",
        attribution: null,
      },
      googleMapsUri: null,
    });

    const response = await GET(new Request("http://localhost/places/port-d-alon/photo"), makeContext("port-d-alon"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://lh3.googleusercontent.com/place-photos/abc123=s4800-w1200",
    );
  });

  it("returns 404 when the place has no photo", async () => {
    getPlaceBySlugMock.mockResolvedValue({ id: "place-1", googlePlaceId: "ChIJexample" });
    getGooglePlaceDetailsMock.mockResolvedValue({ photo: null, googleMapsUri: null });

    const response = await GET(new Request("http://localhost/places/port-d-alon/photo"), makeContext("port-d-alon"));

    expect(response.status).toBe(404);
  });

  it("returns 404 when the place doesn't exist", async () => {
    getPlaceBySlugMock.mockResolvedValue(null);

    const response = await GET(new Request("http://localhost/places/does-not-exist/photo"), makeContext("does-not-exist"));

    expect(response.status).toBe(404);
    expect(getGooglePlaceDetailsMock).not.toHaveBeenCalled();
  });

  it("returns 404 when the place has no googlePlaceId", async () => {
    getPlaceBySlugMock.mockResolvedValue({ id: "place-1", googlePlaceId: null });
    getGooglePlaceDetailsMock.mockResolvedValue(null);

    const response = await GET(new Request("http://localhost/places/port-d-alon/photo"), makeContext("port-d-alon"));

    expect(response.status).toBe(404);
  });
});
