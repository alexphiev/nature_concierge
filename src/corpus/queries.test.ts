import { describe, it, expect, vi, beforeEach } from "vitest";

const { findManyPlaceMock, findFirstPlaceMock, findFirstStatusLogMock } =
  vi.hoisted(() => ({
    findManyPlaceMock: vi.fn(),
    findFirstPlaceMock: vi.fn(),
    findFirstStatusLogMock: vi.fn(),
  }));

vi.mock("./db", () => ({
  prisma: {
    place: {
      findMany: findManyPlaceMock,
      findFirst: findFirstPlaceMock,
    },
    statusLog: {
      findFirst: findFirstStatusLogMock,
    },
  },
}));

import { getActivePlaces, getPlaceBySlug, getTodayStatus } from "./queries";

beforeEach(() => {
  findManyPlaceMock.mockReset();
  findFirstPlaceMock.mockReset();
  findFirstStatusLogMock.mockReset();
});

describe("getActivePlaces", () => {
  it("queries ACTIVE places ordered by demandRank ascending", async () => {
    findManyPlaceMock.mockResolvedValue([{ slug: "port-d-alon" }]);

    const result = await getActivePlaces();

    expect(findManyPlaceMock).toHaveBeenCalledWith({
      where: { status: "ACTIVE" },
      orderBy: { demandRank: "asc" },
    });
    expect(result).toEqual([{ slug: "port-d-alon" }]);
  });
});

describe("getPlaceBySlug", () => {
  it("queries an ACTIVE place by slug with only public+published claims", async () => {
    findFirstPlaceMock.mockResolvedValue({
      slug: "port-d-alon",
      claims: [{ claimText: "hook claim" }],
    });

    const result = await getPlaceBySlug("port-d-alon");

    expect(findFirstPlaceMock).toHaveBeenCalledWith({
      where: { slug: "port-d-alon", status: "ACTIVE" },
      include: {
        claims: {
          where: { isPublic: true, status: "PUBLISHED" },
        },
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

describe("getTodayStatus", () => {
  it("queries the most recent StatusLog for today or later for the place", async () => {
    findFirstStatusLogMock.mockResolvedValue({ value: "vert" });

    const result = await getTodayStatus("place-id-1");

    expect(findFirstStatusLogMock).toHaveBeenCalledWith({
      where: {
        placeId: "place-id-1",
        forDate: { gte: expect.any(Date) },
      },
      orderBy: { forDate: "asc" },
    });
    expect(result).toEqual({ value: "vert" });
  });

  it("returns null when no StatusLog row exists (unverified state)", async () => {
    findFirstStatusLogMock.mockResolvedValue(null);

    const result = await getTodayStatus("place-id-1");

    expect(result).toBeNull();
  });
});
