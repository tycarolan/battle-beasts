/**
 * A short hash of a battle state, used to prove two runs agree.
 *
 * The determinism tests run a battle twice and compare fingerprints at every
 * tick. Comparing hashes rather than whole states means a divergence is caught
 * on the tick it happens rather than at the end, which is the difference between
 * "the replay came out wrong" and "the replay came out wrong at tick 1,483, in
 * side 1's elixir".
 *
 * FNV-1a, over every number in the state in a fixed order. It is not a
 * cryptographic hash and does not need to be — it needs to be cheap, stable
 * across engines, and to change when anything in the state changes.
 */

import type { BattleState } from "./state";

const FNV_OFFSET_BASIS = 0x811c9dc5;
const FNV_PRIME = 0x01000193;

/** A hash accumulator. */
type Hash = number;

function mix(hash: Hash, value: number): Hash {
  // Integer values only. A fractional value is folded through its bit pattern
  // rather than truncated, so two positions a thousandth of a tile apart hash
  // differently — which is the whole point of a fingerprint.
  const bits = Number.isInteger(value) ? value | 0 : bitsOf(value);
  let h = hash ^ (bits & 0xff);
  h = Math.imul(h, FNV_PRIME);
  h = h ^ ((bits >>> 8) & 0xff);
  h = Math.imul(h, FNV_PRIME);
  h = h ^ ((bits >>> 16) & 0xff);
  h = Math.imul(h, FNV_PRIME);
  h = h ^ ((bits >>> 24) & 0xff);
  h = Math.imul(h, FNV_PRIME);
  return h >>> 0;
}

/**
 * A float's bit pattern, folded to 32 bits.
 *
 * Reads the double's two halves and combines them, so the low bits of the
 * mantissa — exactly where a determinism bug first shows — reach the hash.
 */
const scratch = new DataView(new ArrayBuffer(8));
function bitsOf(value: number): number {
  scratch.setFloat64(0, value);
  return scratch.getUint32(0) ^ scratch.getUint32(4);
}

/**
 * The fingerprint of a battle state.
 *
 * The traversal order is fixed and must stay fixed: it is only meaningful
 * compared against another fingerprint produced by the same traversal.
 */
export function fingerprint(state: BattleState): number {
  let h: Hash = FNV_OFFSET_BASIS;
  h = mix(h, state.version);
  h = mix(h, state.tick);
  h = mix(h, state.phase.length);
  h = mix(h, state.rng.seed);

  for (const side of state.sides) {
    h = mix(h, side.elixir.amount);
    h = mix(h, side.elixir.progress);
    h = mix(h, side.crowns);
    for (const card of side.hand.slots) h = mix(h, card);
    for (const card of side.hand.queue) h = mix(h, card);
  }

  // Entities in id order rather than array order, so a reordering of the array
  // that does not change the battle does not change the fingerprint either.
  const ordered = [...state.entities].sort((a, b) => a.id - b.id);
  h = mix(h, ordered.length);
  for (const entity of ordered) {
    h = mix(h, entity.id);
    h = mix(h, entity.x);
    h = mix(h, entity.y);
    h = mix(h, entity.hp);
    h = mix(h, entity.targetId ?? -1);
    h = mix(h, entity.cooldown);
    h = mix(h, entity.deploying);
  }

  const shots = [...state.projectiles].sort((a, b) => a.id - b.id);
  h = mix(h, shots.length);
  for (const shot of shots) {
    h = mix(h, shot.id);
    h = mix(h, shot.targetId);
    h = mix(h, shot.remaining);
  }

  h = mix(h, state.outcome === null ? 0 : 1);
  if (state.outcome) {
    h = mix(h, state.outcome.winner === null ? -1 : state.outcome.winner);
    h = mix(h, state.outcome.endedOnTick);
  }

  return h;
}
