/**
 * Elixir: what everything costs, and the only thing either side is ever short of.
 */

import {
  DOUBLE_ELIXIR_FROM_TICK,
  MAX_ELIXIR,
  STARTING_ELIXIR,
  TICKS_PER_ELIXIR,
} from "./constants";

/**
 * One side's elixir.
 *
 * Held as a whole amount plus a tick counter rather than as a fraction, so that
 * regeneration is integer arithmetic with nothing to round. The partial bar a
 * player sees is `progress / TICKS_PER_ELIXIR`, derived at render time — the
 * simulation itself never holds a fractional elixir.
 */
export type Elixir = {
  /** Whole elixir available to spend, never above {@link MAX_ELIXIR}. */
  amount: number;
  /** Ticks accumulated toward the next whole elixir. */
  progress: number;
};

/** A side's elixir at the start of a battle. */
export function createElixir(): Elixir {
  return { amount: STARTING_ELIXIR, progress: 0 };
}

/**
 * How fast elixir accrues on a given tick, as a multiple of the base rate.
 *
 * Doubles for the last minute of regular time and stays doubled through sudden
 * death — which falls out of the single comparison below, since every sudden
 * death tick is past the threshold anyway.
 */
export function elixirRateAtTick(tick: number): number {
  return tick >= DOUBLE_ELIXIR_FROM_TICK ? 2 : 1;
}

/**
 * Accrue one tick's worth of elixir, in place.
 *
 * At the cap the counter keeps running and the whole elixir it produces is
 * discarded, which is what makes sitting on ten elixir a real cost rather than a
 * safe place to wait. The loop rather than an `if` handles the double rate
 * landing two thresholds in one tick, which cannot happen at the current
 * constants but would silently drop elixir if the rate ever rose again.
 */
export function accrueElixir(elixir: Elixir, rate: number): void {
  elixir.progress += rate;
  while (elixir.progress >= TICKS_PER_ELIXIR) {
    elixir.progress -= TICKS_PER_ELIXIR;
    if (elixir.amount < MAX_ELIXIR) elixir.amount += 1;
  }
}

/** Whether `cost` can be paid right now. */
export function canAfford(elixir: Elixir, cost: number): boolean {
  return elixir.amount >= cost;
}

/**
 * Pay `cost`, returning whether it was paid.
 *
 * Refuses rather than going negative. A play that cannot be afforded is not a
 * play, and the caller is expected to have checked — but a simulation that
 * silently allowed a negative balance would desync against one that did not.
 */
export function spendElixir(elixir: Elixir, cost: number): boolean {
  if (!canAfford(elixir, cost)) return false;
  elixir.amount -= cost;
  return true;
}
