import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  findManyPlaceMock,
  findFirstPlaceMock,
  findFirstStatusLogMock,
  findFirstClaimMock,
} = vi.hoisted(() => ({
  findManyPlaceMock: vi.fn(),
  findFirstPlaceMock: vi.fn(),
  findFirstStatusLogMock: vi.fn(),
  findFirstClaimMock: vi.fn(),
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
    claim: {
      findFirst: findFirstClaimMock,
    },
  },
}));

import {
  getActivePlaces,
  getPlaceBySlug,
  getTodayStatus,
  getPlaceFreshness,
} from "./queries";

beforeEach(() => {
  findManyPlaceMock.mockReset();
  findFirstPlaceMock.mockReset();
  findFirstStatusLogMock.mockReset();
  findFirstClaimMock.mockReset();
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
          include: {
            alternativePlace: { select: { slug: true, name: true } },
          },
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
    findFirstStatusLogMock.mockResolvedValue({
      value: "vert",
      signalSource: { provider: "Préfecture du Var" },
    });

    const result = await getTodayStatus("place-id-1");

    expect(findFirstStatusLogMock).toHaveBeenCalledWith({
      where: {
        placeId: "place-id-1",
        forDate: { gte: expect.any(Date) },
      },
      orderBy: { forDate: "asc" },
      include: {
        signalSource: { select: { provider: true } },
      },
    });
    expect(result).toEqual({
      value: "vert",
      signalSource: { provider: "Préfecture du Var" },
    });
  });

  it("returns null when no StatusLog row exists (unverified state)", async () => {
    findFirstStatusLogMock.mockResolvedValue(null);

    const result = await getTodayStatus("place-id-1");

    expect(result).toBeNull();
  });
});

describe("getPlaceFreshness", () => {
  it("returns the most recent of latest claim.updatedAt and latest StatusLog.checkedAt", async () => {
    findFirstClaimMock.mockResolvedValue({
      updatedAt: new Date("2026-07-20T10:00:00Z"),
    });
    findFirstStatusLogMock.mockResolvedValue({
      checkedAt: new Date("2026-07-21T18:00:00Z"),
    });

    const result = await getPlaceFreshness("place-id-1");

    expect(findFirstClaimMock).toHaveBeenCalledWith({
      where: { placeId: "place-id-1", isPublic: true, status: "PUBLISHED" },
      orderBy: { updatedAt: "desc" },
      select: { updatedAt: true },
    });
    expect(result).toEqual(new Date("2026-07-21T18:00:00Z"));
  });

  it("returns the claim date when it is more recent than the status log date", async () => {
    findFirstClaimMock.mockResolvedValue({
      updatedAt: new Date("2026-07-21T10:00:00Z"),
    });
    findFirstStatusLogMock.mockResolvedValue({
      checkedAt: new Date("2026-07-19T18:00:00Z"),
    });

    const result = await getPlaceFreshness("place-id-1");

    expect(result).toEqual(new Date("2026-07-21T10:00:00Z"));
  });

  it("falls back to the place's own updatedAt when no claims or status logs exist", async () => {
    findFirstClaimMock.mockResolvedValue(null);
    findFirstStatusLogMock.mockResolvedValue(null);
    findFirstPlaceMock.mockResolvedValue({
      updatedAt: new Date("2026-07-01T00:00:00Z"),
    });

    const result = await getPlaceFreshness("place-id-1");

    expect(findFirstPlaceMock).toHaveBeenCalledWith({
      where: { id: "place-id-1" },
      select: { updatedAt: true },
    });
    expect(result).toEqual(new Date("2026-07-01T00:00:00Z"));
  });
});
