/**
 * The arithmetic the simulation is allowed to use.
 *
 * ## Why this module exists
 *
 * The simulation has to produce bit-identical results on every device, because
 * a battle is stored as a seed and a list of plays and replayed from them — and
 * later, because two machines will have to agree on one in real time.
 *
 * Plain IEEE 754 doubles are safe for that. Addition, subtraction,
 * multiplication, division and square root are all exactly specified by the
 * standard and produce identical results on every conforming engine, on x64 and
 * on arm64 alike. The classic desync stories come from C and C++, where excess
 * x87 precision and fast-math compiler flags break that guarantee; neither
 * applies here.
 *
 * What is *not* safe is the transcendental family — `sin`, `cos`, `tan`,
 * `atan2`, `pow`, `exp`, `log`. The standard does not require them to be
 * correctly rounded, so two engines may legitimately disagree in the last bit,
 * and one bit of disagreement in a direction vector becomes a unit standing in a
 * different place a hundred ticks later.
 *
 * So the rule is: **the simulation does its geometry through this module, and
 * never reaches for `Math` directly.** Everything here is built from the safe
 * operations. Movement is expressed as a normalised offset rather than an angle
 * precisely so that no angle ever has to be taken.
 */

/** A position or an offset, in tiles. */
export type Vec = {
  x: number;
  y: number;
};

/** Squared distance between two points. Preferred for comparisons — it needs no square root. */
export function distanceSquared(a: Vec, b: Vec): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

/**
 * Distance between two points, in tiles.
 *
 * Only for the cases that genuinely need a length — a range check compares
 * squares instead, which is both faster and one operation further from any
 * rounding at all.
 */
export function distance(a: Vec, b: Vec): number {
  return Math.sqrt(distanceSquared(a, b));
}

/** Whether `b` is within `range` tiles of `a`, compared as squares so no root is taken. */
export function withinRange(a: Vec, b: Vec, range: number): boolean {
  return distanceSquared(a, b) <= range * range;
}

/**
 * The unit-length offset pointing from `from` toward `to`.
 *
 * This is how every direction in the simulation is expressed. Storing a
 * normalised offset rather than an angle means no trigonometry is ever needed to
 * turn a heading back into movement, which is what keeps the whole simulation
 * inside the exactly-specified operations.
 *
 * Two coincident points have no direction to give, and returning a zero offset
 * rather than dividing by zero keeps a stacked pair of units stationary instead
 * of sending them to infinity.
 */
export function direction(from: Vec, to: Vec): Vec {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0) return { x: 0, y: 0 };
  const length = Math.sqrt(lengthSquared);
  return { x: dx / length, y: dy / length };
}

/** `value` held between `low` and `high` inclusive. */
export function clamp(value: number, low: number, high: number): number {
  if (value < low) return low;
  if (value > high) return high;
  return value;
}
