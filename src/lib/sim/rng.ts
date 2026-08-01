/**
 * The battle's only source of randomness.
 *
 * Every unpredictable thing in a battle — deploy scatter for a multi-unit card,
 * a tie-break between two equidistant targets — comes from here, and the
 * generator's state lives inside the battle state rather than in a closure. That
 * is what makes it part of the replay: a battle resumed or re-run from the same
 * seed produces the same numbers in the same order, and the generator's position
 * is visible to the fingerprint that proves it.
 *
 * Nothing anywhere in `sim/` may call `Math.random`. It reads a global the
 * replay cannot capture, so one call is enough to make a battle unreproducible.
 */

/**
 * A generator's position in its sequence.
 *
 * Deliberately mutable and deliberately a struct rather than a closure — it has
 * to be serialisable into a replay and hashable into a fingerprint, and a
 * closure is neither.
 */
export type Rng = {
  /** The generator's current position. A 32-bit unsigned value held in a number. */
  seed: number;
};

/** A generator positioned at the start of the sequence for `seed`. */
export function createRng(seed: number): Rng {
  return { seed: seed >>> 0 };
}

/**
 * The next value in the sequence, as an unsigned 32-bit integer, advancing the
 * generator.
 *
 * This is mulberry32. It is chosen for being entirely integer arithmetic —
 * `Math.imul`, xor, and unsigned shift — which is exactly reproducible on every
 * JavaScript engine and every architecture. A generator built on floating-point
 * multiplication would not be.
 */
export function nextUint32(rng: Rng): number {
  rng.seed = (rng.seed + 0x6d2b79f5) | 0;
  let t = Math.imul(rng.seed ^ (rng.seed >>> 15), 1 | rng.seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return (t ^ (t >>> 14)) >>> 0;
}

/**
 * The next value as a fraction in `[0, 1)`.
 *
 * Dividing by 2^32 is exact in a double — the divisor is a power of two, so the
 * result carries no rounding of its own and stays as reproducible as the integer
 * it came from.
 */
export function nextUnit(rng: Rng): number {
  return nextUint32(rng) / 4294967296;
}

/**
 * The next value as an integer in `[0, bound)`.
 *
 * Scales rather than taking a remainder, because a remainder biases toward the
 * low end of the range whenever `bound` does not divide 2^32 — which for a
 * three-tile bridge or a five-unit target list is every time. The intermediate
 * product stays exact for any `bound` a battle would use: 2^32 × 1000 is far
 * inside the range a double represents exactly.
 */
export function nextBelow(rng: Rng, bound: number): number {
  return Math.floor((nextUint32(rng) * bound) / 4294967296);
}

/**
 * The next value as a fraction in `[-spread, spread)`.
 *
 * The shape deploy scatter wants: a card that places three units puts them
 * around the tapped point rather than on top of each other.
 */
export function nextSpread(rng: Rng, spread: number): number {
  return (nextUnit(rng) * 2 - 1) * spread;
}
