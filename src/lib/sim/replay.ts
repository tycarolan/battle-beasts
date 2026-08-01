/**
 * A whole battle, in a seed and a list of plays.
 *
 * Everything else — every unit's path, every hit, the opponent's every decision
 * — is derived by running the simulation over this record. The opponent is
 * *inside* the simulation, so its choices are reproduced rather than stored;
 * that is what keeps a four-minute battle a few hundred bytes.
 *
 * It is also what keeps server-side validation available later without a
 * rebuild: a result that arrives with its record can be re-run and checked. The
 * client is trusted today because it only ever plays an opponent it cannot cheat
 * out of anything, and that stops being true the moment two people play.
 */

import { REGULAR_TICKS, SUDDEN_DEATH_TICKS } from "./constants";
import { createBattle, type BattleRules, type BattleState, type Play } from "./state";
import { step } from "./tick";

/** A battle, stored. */
export type ReplayRecord = {
  /** The format the battle was produced under. A mismatch means it cannot be replayed. */
  version: number;
  seed: number;
  /** Both decks, in side order. */
  decks: [readonly number[], readonly number[]];
  /** Every play, ordered by tick. */
  plays: readonly Play[];
};

/** The longest a battle can run. */
const MAX_TICKS = REGULAR_TICKS + SUDDEN_DEATH_TICKS;

/**
 * Run a record back, returning the final state.
 *
 * `onTick` is called after every tick, which is how the determinism tests
 * compare two runs at every step rather than only at the end.
 */
export function runReplay(
  record: ReplayRecord,
  rules: BattleRules,
  onTick?: (state: BattleState) => void,
): BattleState {
  const state = createBattle(record.seed, record.decks[0], record.decks[1]);
  const byTick = groupByTick(record.plays);

  // Bounded rather than looping until the battle ends. A record whose plays
  // somehow never end the battle should terminate, not hang the thread it is
  // being validated on.
  for (let tick = 1; tick <= MAX_TICKS && state.phase !== "ended"; tick += 1) {
    step(state, rules, byTick.get(tick) ?? EMPTY);
    onTick?.(state);
  }

  return state;
}

const EMPTY: readonly Play[] = [];

/**
 * Plays indexed by the tick they land on, each list kept in its original order.
 *
 * Grouping up front rather than scanning the list each tick keeps a replay
 * linear in the number of ticks rather than quadratic — which matters because
 * validating a submitted result means running one of these on a server.
 */
function groupByTick(plays: readonly Play[]): Map<number, Play[]> {
  const byTick = new Map<number, Play[]>();
  for (const play of plays) {
    const existing = byTick.get(play.tick);
    if (existing) existing.push(play);
    else byTick.set(play.tick, [play]);
  }
  return byTick;
}
