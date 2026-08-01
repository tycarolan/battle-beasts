import { describe, expect, it } from "vitest";

import {
  DOUBLE_ELIXIR_FROM_TICK,
  MAX_ELIXIR,
  STARTING_ELIXIR,
  TICKS_PER_ELIXIR,
  TICKS_PER_SECOND,
} from "./constants";
import {
  accrueElixir,
  canAfford,
  createElixir,
  elixirRateAtTick,
  spendElixir,
} from "./elixir";

/** Run `ticks` ticks at `rate`, returning the elixir held afterwards. */
function after(ticks: number, rate: number) {
  const elixir = createElixir();
  for (let i = 0; i < ticks; i += 1) accrueElixir(elixir, rate);
  return elixir;
}

describe("elixir", () => {
  it("starts a battle at five", () => {
    expect(createElixir().amount).toBe(STARTING_ELIXIR);
  });

  it("takes 2.8 seconds to make one at the single rate", () => {
    expect(TICKS_PER_ELIXIR / TICKS_PER_SECOND).toBe(2.8);

    const justBefore = after(TICKS_PER_ELIXIR - 1, 1);
    const justAfter = after(TICKS_PER_ELIXIR, 1);

    expect(justBefore.amount).toBe(STARTING_ELIXIR);
    expect(justAfter.amount).toBe(STARTING_ELIXIR + 1);
  });

  it("makes elixir exactly twice as fast at the double rate", () => {
    const single = after(TICKS_PER_ELIXIR * 4, 1);
    const double = after(TICKS_PER_ELIXIR * 2, 2);
    expect(double.amount).toBe(single.amount);
  });

  it("holds no more than ten", () => {
    const elixir = after(TICKS_PER_ELIXIR * 20, 1);
    expect(elixir.amount).toBe(MAX_ELIXIR);
  });

  it("keeps regenerating at the cap and throws the overflow away", () => {
    // Sitting on ten has to cost something, or holding elixir would be free.
    const elixir = createElixir();
    for (let i = 0; i < TICKS_PER_ELIXIR * 20; i += 1) accrueElixir(elixir, 1);

    expect(elixir.amount).toBe(MAX_ELIXIR);

    // The counter is still running rather than parked.
    const progressAtCap = elixir.progress;
    accrueElixir(elixir, 1);
    expect(elixir.progress).not.toBe(progressAtCap);
  });

  it("never holds a fractional amount", () => {
    const elixir = createElixir();
    for (let i = 0; i < 1000; i += 1) {
      accrueElixir(elixir, i % 3 === 0 ? 2 : 1);
      expect(Number.isInteger(elixir.amount)).toBe(true);
      expect(Number.isInteger(elixir.progress)).toBe(true);
    }
  });

  it("runs single rate for two minutes and double after", () => {
    expect(elixirRateAtTick(0)).toBe(1);
    expect(elixirRateAtTick(DOUBLE_ELIXIR_FROM_TICK - 1)).toBe(1);
    expect(elixirRateAtTick(DOUBLE_ELIXIR_FROM_TICK)).toBe(2);
  });

  it("stays doubled through sudden death", () => {
    expect(elixirRateAtTick(DOUBLE_ELIXIR_FROM_TICK + 10_000)).toBe(2);
  });

  it("refuses to spend more than is held", () => {
    const elixir = createElixir();
    expect(canAfford(elixir, STARTING_ELIXIR + 1)).toBe(false);
    expect(spendElixir(elixir, STARTING_ELIXIR + 1)).toBe(false);
    expect(elixir.amount).toBe(STARTING_ELIXIR);
  });

  it("spends what it can", () => {
    const elixir = createElixir();
    expect(spendElixir(elixir, 3)).toBe(true);
    expect(elixir.amount).toBe(STARTING_ELIXIR - 3);
  });
});
