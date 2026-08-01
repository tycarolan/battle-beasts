import { describe, expect, it } from "vitest";

import { createRng, nextBelow, nextSpread, nextUint32, nextUnit } from "./rng";

describe("rng", () => {
  it("produces the same sequence from the same seed", () => {
    const a = createRng(12345);
    const b = createRng(12345);
    const fromA = Array.from({ length: 200 }, () => nextUint32(a));
    const fromB = Array.from({ length: 200 }, () => nextUint32(b));
    expect(fromA).toEqual(fromB);
  });

  it("produces different sequences from different seeds", () => {
    const a = createRng(1);
    const b = createRng(2);
    expect(nextUint32(a)).not.toBe(nextUint32(b));
  });

  it("stays inside 32 unsigned bits", () => {
    const rng = createRng(99);
    for (let i = 0; i < 1000; i += 1) {
      const value = nextUint32(rng);
      expect(Number.isInteger(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(0xffffffff);
    }
  });

  it("returns unit values in [0, 1)", () => {
    const rng = createRng(7);
    for (let i = 0; i < 1000; i += 1) {
      const value = nextUnit(rng);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it("returns bounded integers inside the bound", () => {
    const rng = createRng(4242);
    for (const bound of [1, 2, 3, 8, 17, 1000]) {
      for (let i = 0; i < 500; i += 1) {
        const value = nextBelow(rng, bound);
        expect(Number.isInteger(value)).toBe(true);
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThan(bound);
      }
    }
  });

  it("covers every value of a small bound", () => {
    // Scaling rather than a remainder is meant to keep the range reachable and
    // roughly even. A bound of three over a thousand draws should land on each
    // value a few hundred times; anything wildly lopsided means the scaling is
    // wrong rather than merely unlucky.
    const rng = createRng(2024);
    const counts = [0, 0, 0];
    for (let i = 0; i < 3000; i += 1) counts[nextBelow(rng, 3)] += 1;
    for (const count of counts) {
      expect(count).toBeGreaterThan(800);
      expect(count).toBeLessThan(1200);
    }
  });

  it("spreads symmetrically around zero", () => {
    const rng = createRng(555);
    let sum = 0;
    for (let i = 0; i < 2000; i += 1) {
      const value = nextSpread(rng, 0.5);
      expect(value).toBeGreaterThanOrEqual(-0.5);
      expect(value).toBeLessThan(0.5);
      sum += value;
    }
    expect(Math.abs(sum / 2000)).toBeLessThan(0.05);
  });

  it("advances the generator it is given rather than a copy", () => {
    const rng = createRng(1);
    const before = rng.seed;
    nextUint32(rng);
    expect(rng.seed).not.toBe(before);
  });
});
