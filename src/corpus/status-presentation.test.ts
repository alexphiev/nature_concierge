import { describe, it, expect } from "vitest";
import { presentStatus, sourceName } from "./status-presentation";
import type { ResolvedStatus } from "./queries";

function makeStatus(
  overrides: Partial<NonNullable<ResolvedStatus>>,
): NonNullable<ResolvedStatus> {
  return {
    status: "open",
    cause: null,
    sourceUrl: "https://www.example.fr/acces",
    sourceLabel: null,
    checkedAt: new Date(),
    ...overrides,
  };
}

describe("presentStatus", () => {
  it("shows green Ouvert for open", () => {
    expect(presentStatus(makeStatus({ status: "open" }))).toEqual({ colorTone: "vert", verdict: "Ouvert" });
  });

  it("shows red Fermé for closed", () => {
    expect(presentStatus(makeStatus({ status: "closed" }))).toEqual({ colorTone: "rouge", verdict: "Fermé" });
  });

  it("shows toneless Statut inconnu for unknown and for no status", () => {
    const unknown = { colorTone: null, verdict: "Statut inconnu" };

    expect(presentStatus(makeStatus({ status: "unknown" }))).toEqual(unknown);
    expect(presentStatus(null)).toEqual(unknown);
  });
});

describe("sourceName", () => {
  it("uses the label when present, the URL host otherwise", () => {
    expect(sourceName(makeStatus({ sourceLabel: "Site officiel" }))).toBe("Site officiel");
    expect(sourceName(makeStatus({ sourceLabel: null }))).toBe("example.fr");
  });
});
