import { describe, it, expect, vi, beforeEach } from "vitest";

const { getPlaceBySlugMock, getGooglePlacePhotoMock } = vi.hoisted(() => ({
  getPlaceBySlugMock: vi.fn(),
  getGooglePlacePhotoMock: vi.fn(),
}));

vi.mock("@/src/corpus/queries", () => ({
  getPlaceBySlug: getPlaceBySlugMock,
}));

vi.mock("@/src/corpus/google-places", () => ({
  getGooglePlacePhoto: getGooglePlacePhotoMock,
}));

import { GET } from "./route";

beforeEach(() => {
  getPlaceBySlugMock.mockReset();
  getGooglePlacePhotoMock.mockReset();
});

function makeContext(slug: string) {
  return { params: Promise.resolve({ slug }) };
}

describe("GET /places/[slug]/photo", () => {
  it("redirects to the public photoUri when a photo exists", async () => {
    getPlaceBySlugMock.mockResolvedValue({ id: "place-1", googlePlaceId: "ChIJexample" });
    getGooglePlacePhotoMock.mockResolvedValue({
      photoUri: "https://lh3.googleusercontent.com/place-photos/abc123=s4800-w1200",
      attribution: null,
    });

    const response = await GET(new Request("http://localhost/places/port-d-alon/photo"), makeContext("port-d-alon"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://lh3.googleusercontent.com/place-photos/abc123=s4800-w1200",
    );
    expect(response.headers.get("cache-control")).toBe("public, max-age=3600, s-maxage=86400");
  });

  it("does not mark 404s as cacheable", async () => {
    getPlaceBySlugMock.mockResolvedValue(null);

    const response = await GET(new Request("http://localhost/places/x/photo"), makeContext("x"));

    expect(response.headers.get("cache-control")).toBeNull();
  });

  it("returns 404 when the place has no photo", async () => {
    getPlaceBySlugMock.mockResolvedValue({ id: "place-1", googlePlaceId: "ChIJexample" });
    getGooglePlacePhotoMock.mockResolvedValue(null);

    const response = await GET(new Request("http://localhost/places/port-d-alon/photo"), makeContext("port-d-alon"));

    expect(response.status).toBe(404);
  });

  it("returns 404 when the place doesn't exist", async () => {
    getPlaceBySlugMock.mockResolvedValue(null);

    const response = await GET(new Request("http://localhost/places/does-not-exist/photo"), makeContext("does-not-exist"));

    expect(response.status).toBe(404);
    expect(getGooglePlacePhotoMock).not.toHaveBeenCalled();
  });

  it("returns 404 when the place has no googlePlaceId", async () => {
    getPlaceBySlugMock.mockResolvedValue({ id: "place-1", googlePlaceId: null });
    getGooglePlacePhotoMock.mockResolvedValue(null);

    const response = await GET(new Request("http://localhost/places/port-d-alon/photo"), makeContext("port-d-alon"));

    expect(response.status).toBe(404);
  });

  it("defaults to the first photo when no index is given", async () => {
    getPlaceBySlugMock.mockResolvedValue({ id: "place-1", googlePlaceId: "ChIJexample" });
    getGooglePlacePhotoMock.mockResolvedValue({ photoUri: "https://lh3.googleusercontent.com/a", attribution: null });

    await GET(new Request("http://localhost/places/port-d-alon/photo"), makeContext("port-d-alon"));

    expect(getGooglePlacePhotoMock).toHaveBeenCalledWith("ChIJexample", 0);
  });

  it("resolves the photo at the ?i= index", async () => {
    getPlaceBySlugMock.mockResolvedValue({ id: "place-1", googlePlaceId: "ChIJexample" });
    getGooglePlacePhotoMock.mockResolvedValue({ photoUri: "https://lh3.googleusercontent.com/c", attribution: null });

    const response = await GET(new Request("http://localhost/places/port-d-alon/photo?i=2"), makeContext("port-d-alon"));

    expect(getGooglePlacePhotoMock).toHaveBeenCalledWith("ChIJexample", 2);
    expect(response.headers.get("location")).toBe("https://lh3.googleusercontent.com/c");
  });

  it.each(["-1", "10", "1.5", "abc"])("returns 404 for an invalid index (%s) without any lookup", async (i) => {
    const response = await GET(new Request(`http://localhost/places/port-d-alon/photo?i=${i}`), makeContext("port-d-alon"));

    expect(response.status).toBe(404);
    expect(getPlaceBySlugMock).not.toHaveBeenCalled();
    expect(getGooglePlacePhotoMock).not.toHaveBeenCalled();
  });
});
