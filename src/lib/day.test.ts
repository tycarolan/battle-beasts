import { describe, expect, it } from "vitest";

import { dayNumber, msUntilRollover } from "./day";

describe("dayNumber", () => {
  it("is the same all through one local calendar day", () => {
    const morning = new Date(2026, 5, 14, 7, 30);
    const evening = new Date(2026, 5, 14, 23, 59);
    expect(dayNumber(evening)).toBe(dayNumber(morning));
  });

  it("advances by exactly one across local midnight", () => {
    const before = dayNumber(new Date(2026, 5, 14, 12));
    const after = dayNumber(new Date(2026, 5, 15, 12));
    expect(after - before).toBe(1);
  });

  it("carries across the end of a month", () => {
    const last = dayNumber(new Date(2026, 5, 30, 12));
    const next = dayNumber(new Date(2026, 6, 1, 12));
    expect(next - last).toBe(1);
  });

  it("carries across the end of a year", () => {
    const last = dayNumber(new Date(2026, 11, 31, 12));
    const next = dayNumber(new Date(2027, 0, 1, 12));
    expect(next - last).toBe(1);
  });

  it("stays inside the range the ledger accepts", () => {
    const day = dayNumber(new Date(2030, 0, 1, 12));
    expect(day).toBeGreaterThanOrEqual(1);
    expect(day).toBeLessThanOrEqual(100_000);
  });
});

describe("msUntilRollover", () => {
  it("counts down to the next local midnight", () => {
    const oneHourBefore = new Date(2026, 5, 14, 23, 0, 0);
    expect(msUntilRollover(oneHourBefore)).toBe(60 * 60 * 1000);
  });

  it("is a whole day at local midnight itself", () => {
    expect(msUntilRollover(new Date(2026, 5, 14, 0, 0, 0))).toBe(86_400_000);
  });
});
