import { describe, it, expect } from "vitest";
import { presentStatus } from "./status-presentation";
import type { ResolvedStatus } from "./queries";

function makeStatus(
  overrides: Partial<NonNullable<ResolvedStatus>>,
): NonNullable<ResolvedStatus> {
  return {
    zoneValue: "vert",
    displayValue: "vert",
    isOpen: true,
    restricted: false,
    detail: null,
    confirmedAt: new Date(),
    zoneLabel: "Zone",
    provider: "Provider",
    ...overrides,
  };
}

describe("presentStatus", () => {
  it("shows green Ouvert for vert (open, not restricted)", () => {
    const result = presentStatus(
      makeStatus({ displayValue: "vert", isOpen: true, restricted: false }),
    );

    expect(result).toEqual({ colorTone: "vert", verdict: "Ouvert" });
  });

  it("shows orange Ouvert for jaune (open, not restricted)", () => {
    const result = presentStatus(
      makeStatus({ displayValue: "jaune", isOpen: true, restricted: false }),
    );

    expect(result).toEqual({ colorTone: "orange", verdict: "Ouvert" });
  });

  it("shows orange Ouvert for orange (open, not restricted)", () => {
    const result = presentStatus(
      makeStatus({ displayValue: "orange", isOpen: true, restricted: false }),
    );

    expect(result).toEqual({ colorTone: "orange", verdict: "Ouvert" });
  });

  it("shows orange restricted verdict for rouge+zapef (open, restricted)", () => {
    const result = presentStatus(
      makeStatus({ displayValue: "rouge", isOpen: true, restricted: true }),
    );

    expect(result).toEqual({
      colorTone: "orange",
      verdict: "Ouvert — accès restreint",
    });
  });

  it("shows red Fermé for rouge+non-zapef (closed)", () => {
    const result = presentStatus(
      makeStatus({ displayValue: "rouge", isOpen: false, restricted: false }),
    );

    expect(result).toEqual({ colorTone: "rouge", verdict: "Fermé" });
  });

  it("shows red Fermé for extreme (closed, regardless of zapef)", () => {
    const result = presentStatus(
      makeStatus({ displayValue: "extreme", isOpen: false, restricted: false }),
    );

    expect(result).toEqual({ colorTone: "rouge", verdict: "Fermé" });
  });
});
