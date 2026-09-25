import { describe, it, expect } from "vitest";
import { parisDateString, parisToday } from "./paris-date";

describe("parisDateString", () => {
  it("returns the Paris calendar date for a time just after Paris midnight (CEST)", () => {
    expect(parisDateString(new Date("2026-07-21T22:30:00Z"))).toBe("2026-07-22");
  });

  it("returns the Paris calendar date for a time just before Paris midnight (CEST)", () => {
    expect(parisDateString(new Date("2026-07-21T21:59:00Z"))).toBe("2026-07-21");
  });

  it("returns the Paris calendar date in winter (CET, UTC+1)", () => {
    expect(parisDateString(new Date("2026-01-15T23:30:00Z"))).toBe("2026-01-16");
  });
});

describe("parisToday", () => {
  it("returns a UTC-midnight Date for the Paris calendar day", () => {
    expect(parisToday(new Date("2026-07-21T22:30:00Z")).toISOString()).toBe(
      "2026-07-22T00:00:00.000Z",
    );
  });
});
