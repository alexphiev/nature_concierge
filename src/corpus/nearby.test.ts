import { describe, it, expect } from "vitest";
import { distanceKm, nearbyPlaces } from "./nearby";

type TestPlace = { id: string; parentId: string | null; lat: number; lng: number };

const VIEUX_PORT = { lat: 43.2951, lng: 5.374 };
const LA_CIOTAT = { lat: 43.1747, lng: 5.6047 };

describe("distanceKm", () => {
  it("computes the haversine distance between two known points", () => {
    // Task brief cites ≈22.3 km; precise haversine (R=6371) for these
    // coordinates is ≈23.0 km — asserting against the exact formula output.
    const km = distanceKm(VIEUX_PORT, LA_CIOTAT);
    expect(Math.abs(km - 22.99)).toBeLessThanOrEqual(0.5);
  });

  it("returns 0 for identical points", () => {
    expect(distanceKm(VIEUX_PORT, VIEUX_PORT)).toBe(0);
  });
});

describe("nearbyPlaces", () => {
  const place: TestPlace = { id: "p1", parentId: "parent1", lat: 43.2951, lng: 5.374 };

  it("excludes the place itself", () => {
    const result = nearbyPlaces(place, [place]);
    expect(result).toEqual([]);
  });

  it("excludes the parent", () => {
    const parent: TestPlace = { id: "parent1", parentId: null, lat: 43.2, lng: 5.4 };
    const result = nearbyPlaces(place, [parent]);
    expect(result).toEqual([]);
  });

  it("excludes children", () => {
    const child: TestPlace = { id: "c1", parentId: "p1", lat: 43.2, lng: 5.4 };
    const result = nearbyPlaces(place, [child]);
    expect(result).toEqual([]);
  });

  it("excludes siblings (same non-null parentId)", () => {
    const sibling: TestPlace = { id: "s1", parentId: "parent1", lat: 43.2, lng: 5.4 };
    const result = nearbyPlaces(place, [sibling]);
    expect(result).toEqual([]);
  });

  it("includes an unrelated candidate within maxKm, sorted ascending", () => {
    const near: TestPlace = { id: "n1", parentId: null, lat: 43.3, lng: 5.38 };
    const far: TestPlace = { id: "f1", parentId: null, lat: 43.4, lng: 5.6 };
    const result = nearbyPlaces(place, [far, near]);
    expect(result.map((r) => r.place.id)).toEqual(["n1", "f1"]);
    expect(result[0].km).toBeLessThan(result[1].km);
  });

  it("filters out candidates beyond maxKm", () => {
    const tooFar: TestPlace = { id: "tf1", parentId: null, lat: 44.5, lng: 6.9 };
    const result = nearbyPlaces(place, [tooFar], { maxKm: 25 });
    expect(result).toEqual([]);
  });

  it("respects the limit", () => {
    const candidates: TestPlace[] = Array.from({ length: 6 }, (_, i) => ({
      id: `n${i}`,
      parentId: null,
      lat: 43.2951 + i * 0.01,
      lng: 5.374 + i * 0.01,
    }));
    const result = nearbyPlaces(place, candidates, { limit: 4 });
    expect(result).toHaveLength(4);
  });

  it("uses default limit=4 and maxKm=25", () => {
    const candidates: TestPlace[] = Array.from({ length: 6 }, (_, i) => ({
      id: `n${i}`,
      parentId: null,
      lat: 43.2951 + i * 0.01,
      lng: 5.374 + i * 0.01,
    }));
    const result = nearbyPlaces(place, candidates);
    expect(result.length).toBeLessThanOrEqual(4);
  });
});
