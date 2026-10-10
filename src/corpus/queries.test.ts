import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  findManyPlaceMock,
  findFirstPlaceMock,
  queryRawMock,
  findFirstClaimMock,
  cacheTagMock,
  cacheLifeMock,
} = vi.hoisted(() => ({
  findManyPlaceMock: vi.fn(),
  findFirstPlaceMock: vi.fn(),
  queryRawMock: vi.fn(),
  findFirstClaimMock: vi.fn(),
  cacheTagMock: vi.fn(),
  cacheLifeMock: vi.fn(),
}));

vi.mock("./db", () => ({
  prisma: {
    place: {
      findMany: findManyPlaceMock,
      findFirst: findFirstPlaceMock,
    },
    claim: {
      findFirst: findFirstClaimMock,
    },
    $queryRaw: queryRawMock,
  },
}));

vi.mock("next/cache", () => ({ cacheTag: cacheTagMock, cacheLife: cacheLifeMock }));

import {
  getActivePlaces,
  getPlaceBySlug,
  resolvePlaceStatus,
  getPlaceFreshness,
  getAllPlaces,
} from "./queries";

beforeEach(() => {
  findManyPlaceMock.mockReset();
  findFirstPlaceMock.mockReset();
  queryRawMock.mockReset();
  findFirstClaimMock.mockReset();
  cacheTagMock.mockReset();
  cacheLifeMock.mockReset();
});

describe("getActivePlaces", () => {
  it("queries ACTIVE places ordered by demandRank ascending", async () => {
    findManyPlaceMock.mockResolvedValue([{ slug: "port-d-alon" }]);

    const result = await getActivePlaces();

    expect(findManyPlaceMock).toHaveBeenCalledWith({
      where: { status: "ACTIVE" },
      orderBy: { demandRank: "asc" },
      include: { photos: { orderBy: { order: "asc" }, take: 1 } },
    });
    expect(result).toEqual([{ slug: "port-d-alon" }]);
  });

  it("is cached under the corpus tag", async () => {
    findManyPlaceMock.mockResolvedValue([]);

    await getActivePlaces();

    expect(cacheTagMock).toHaveBeenCalledWith("corpus");
    expect(cacheLifeMock).toHaveBeenCalledWith("corpus");
  });
});

describe("getPlaceBySlug", () => {
  it("queries an ACTIVE place by slug with only public+published claims", async () => {
    findFirstPlaceMock.mockResolvedValue({
      slug: "port-d-alon",
      claims: [{ claimText: "hook claim" }],
    });

    const result = await getPlaceBySlug("port-d-alon");

    const publicClaims = {
      where: { isPublic: true, status: "PUBLISHED" },
      include: {
        alternativePlace: { select: { slug: true, name: true } },
      },
    };
    expect(findFirstPlaceMock).toHaveBeenCalledWith({
      where: { slug: "port-d-alon", status: "ACTIVE" },
      include: {
        claims: publicClaims,
        parent: {
          select: { id: true, slug: true, name: true, status: true, claims: publicClaims },
        },
        children: {
          where: { status: "ACTIVE" },
          orderBy: { demandRank: "asc" },
          include: { photos: { orderBy: { order: "asc" }, take: 1 } },
        },
        images: { orderBy: { order: "asc" } },
        photos: { orderBy: { order: "asc" } },
      },
    });
    expect(result).toEqual({
      slug: "port-d-alon",
      claims: [{ claimText: "hook claim" }],
    });
  });

  it("returns null when no matching place is found", async () => {
    findFirstPlaceMock.mockResolvedValue(null);

    const result = await getPlaceBySlug("does-not-exist");

    expect(result).toBeNull();
  });
});

describe("resolvePlaceStatus", () => {
  it("returns null when neither the place nor its parent has a row in place_current_status", async () => {
    queryRawMock.mockResolvedValue([]);

    const result = await resolvePlaceStatus("place-id-1");

    expect(result).toBeNull();
  });

  it("returns the status row read from the place_current_status view", async () => {
    const row = {
      status: "closed",
      cause: "Massif fermé jusqu'à nouvel ordre",
      sourceUrl: "https://www.example.fr/acces",
      sourceLabel: "Site officiel",
      checkedAt: new Date("2026-07-21T16:00:00.000Z"),
    };
    queryRawMock.mockResolvedValue([row]);

    const result = await resolvePlaceStatus("place-id-1");

    expect(result).toEqual(row);
    expect(queryRawMock).toHaveBeenCalledTimes(1);
    const [strings, placeId] = queryRawMock.mock.calls[0];
    expect(strings.join("?")).toContain("place_current_status");
    expect(placeId).toBe("place-id-1");
  });
});

describe("getPlaceFreshness", () => {
  it("returns the most recent of latest claim.updatedAt and the status checkedAt", async () => {
    findFirstClaimMock.mockResolvedValue({
      updatedAt: new Date("2026-07-20T10:00:00.000Z"),
    });
    queryRawMock.mockResolvedValue([{ checkedAt: new Date("2026-07-21T16:00:00.000Z") }]);

    const result = await getPlaceFreshness("place-id-1");

    expect(findFirstClaimMock).toHaveBeenCalledWith({
      where: { placeId: "place-id-1", isPublic: true, status: "PUBLISHED" },
      orderBy: { updatedAt: "desc" },
      select: { updatedAt: true },
    });
    expect(result).toEqual(new Date("2026-07-21T16:00:00.000Z"));
  });

  it("returns the claim's updatedAt when it is more recent than the status check", async () => {
    findFirstClaimMock.mockResolvedValue({
      updatedAt: new Date("2026-07-22T10:00:00.000Z"),
    });
    queryRawMock.mockResolvedValue([{ checkedAt: new Date("2026-07-21T16:00:00.000Z") }]);

    const result = await getPlaceFreshness("place-id-1");

    expect(result).toEqual(new Date("2026-07-22T10:00:00.000Z"));
  });

  it("ignores a status that was never checked", async () => {
    findFirstClaimMock.mockResolvedValue({
      updatedAt: new Date("2026-07-20T10:00:00.000Z"),
    });
    queryRawMock.mockResolvedValue([{ checkedAt: null }]);

    const result = await getPlaceFreshness("place-id-1");

    expect(result).toEqual(new Date("2026-07-20T10:00:00.000Z"));
  });

  it("falls back to place.updatedAt when there are no claims and no status", async () => {
    findFirstClaimMock.mockResolvedValue(null);
    queryRawMock.mockResolvedValue([]);
    findFirstPlaceMock.mockResolvedValue({
      updatedAt: new Date("2026-07-15T08:00:00.000Z"),
    });

    const result = await getPlaceFreshness("place-id-1");

    expect(result).toEqual(new Date("2026-07-15T08:00:00.000Z"));
  });
});

describe("getAllPlaces", () => {
  it("queries all places regardless of status, ordered by demandRank", async () => {
    findManyPlaceMock.mockResolvedValue([{ slug: "port-d-alon" }]);
    const result = await getAllPlaces();
    expect(findManyPlaceMock).toHaveBeenCalledWith({
      orderBy: { demandRank: "asc" },
    });
    expect(result).toEqual([{ slug: "port-d-alon" }]);
  });
});
