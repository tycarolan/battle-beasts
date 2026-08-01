/**
 * One tick, and the order its phases run in.
 *
 * ## The order is the format
 *
 * A battle is stored as a seed and a list of plays, and replayed by running this
 * function over them. So the sequence below is not an implementation detail that
 * can be tidied later — reordering two phases changes the outcome of every
 * battle ever recorded. A change here is a `SIM_VERSION` bump.
 *
 * ## Why damage is buffered
 *
 * Attacks resolve into a buffer and the buffer is applied afterwards, so two
 * units that kill each other on the same tick both die. Applied immediately,
 * whichever the loop reached first would survive with the other's damage never
 * landing — and "whichever the loop reached first" is exactly the kind of
 * incidental ordering that makes a simulation depend on how its arrays happen to
 * be sorted.
 *
 * ## Why movement and separation read a snapshot
 *
 * Both compute every unit's intent from the same starting positions and write
 * the results afterwards, so no unit's move depends on whether its neighbour has
 * already moved this tick. Separation additionally runs a fixed number of passes
 * rather than iterating until it settles: a loop that runs until convergence
 * runs a different number of times on a different machine, and that difference
 * is a desync.
 */

import { canDeployAt } from "../arena";
import { cardById } from "../units/roster";
import { REGULAR_TICKS, SUDDEN_DEATH_TICKS } from "./constants";
import { accrueElixir, elixirRateAtTick, spendElixir } from "./elixir";
import { spawnFromCard, type Entity } from "./entities";
import { playFromSlot } from "./hand";
import { distanceSquared } from "./math";
import {
  acquireTargets,
  advanceProjectiles,
  applyDamage,
  collectDeaths,
  moveEntities,
  resolveAttacks,
  separateEntities,
  type DamageBuffer,
} from "./phases";
import type { BattleRules, BattleState, Play, Side } from "./state";

/**
 * Advance the battle by exactly one tick.
 *
 * Mutates `state` rather than returning a copy. A battle runs 4,800 ticks and
 * allocating a fresh state for each would dominate the cost of running one at
 * all — and the state is owned by the caller for the whole battle, so there is
 * nothing to share it with.
 */
export function step(
  state: BattleState,
  rules: BattleRules,
  plays: readonly Play[],
): void {
  if (state.phase === "ended") return;

  // 1 — advance.
  state.tick += 1;

  // 2 — elixir.
  const rate = elixirRateAtTick(state.tick);
  accrueElixir(state.sides[0].elixir, rate);
  accrueElixir(state.sides[1].elixir, rate);

  // 3 — plays, lower side first so the result never depends on arrival order.
  const damage: DamageBuffer = new Map();
  applyPlays(state, rules, plays, 0, damage);
  applyPlays(state, rules, plays, 1, damage);

  // 4 — targeting.
  acquireTargets(state);

  // 5 — movement, from a snapshot.
  moveEntities(state);

  // 6 — separation, from a snapshot, fixed passes.
  separateEntities(state);

  // 7 — projectiles advance and land, committing into the buffer.
  advanceProjectiles(state, damage);

  // 8 — attacks resolve, committing into the buffer, applying nothing.
  resolveAttacks(state, damage);

  // 9 — the buffer is applied, all at once.
  applyDamage(state, damage);

  // 10 — deaths, expiries and crowns.
  collectDeaths(state);

  // 11 — victory.
  checkVictory(state);
}

/**
 * Apply one side's plays for this tick.
 *
 * A play that cannot be afforded, names a slot outside the hand, or lands
 * outside the legal deploy zone is dropped rather than throwing. A malformed
 * input should cost that input and nothing else.
 */
function applyPlays(
  state: BattleState,
  rules: BattleRules,
  plays: readonly Play[],
  side: Side,
  damage: DamageBuffer,
): void {
  for (const play of plays) {
    if (play.side !== side) continue;

    const sideState = state.sides[side];
    const cardId = sideState.hand.slots[play.slot];
    if (cardId === undefined) continue;

    if (!canDeployAt(side, play.x, play.y, sideState.openedLanes)) continue;

    // Affordability is checked before the card leaves the hand, so a rejected
    // play does not cycle the deck. Cycling on a failed play would let a player
    // reorder their deck for free.
    if (!spendElixir(sideState.elixir, rules.cardCost(cardId))) continue;

    playFromSlot(sideState.hand, play.slot);

    const level = sideState.levels[cardId] ?? 1;
    const card = cardById(cardId);

    if (card.kind === "spell") {
      castSpell(state, side, cardId, play.x, play.y, level, damage);
      continue;
    }

    const spawned = spawnFromCard(cardId, side, play.x, play.y, level, () => state.nextEntityId++);
    state.entities.push(...spawned);
  }
}

/**
 * A spell lands once, at a point, on everything hostile inside its radius.
 *
 * It commits into the same buffer as every other source of damage, so a spell
 * and a hit landing on the same tick kill together rather than in sequence.
 * Towers take a fraction — a spell chips a tower, it does not win with one.
 */
function castSpell(
  state: BattleState,
  side: Side,
  cardId: number,
  x: number,
  y: number,
  level: number,
  damage: DamageBuffer,
): void {
  const card = cardById(cardId);
  if (card.kind !== "spell") return;

  const amount = Math.round(card.damage * Math.pow(1.05, level - 1));
  const point = { x, y };

  for (const entity of state.entities) {
    if (entity.side === side || entity.hp <= 0 || entity.deploying > 0) continue;
    if (card.targets === "ground" && entity.stats.flies) continue;
    if (card.targets === "air" && !entity.stats.flies) continue;
    if (distanceSquared(entity, point) > card.radius * card.radius) continue;

    const dealt = entity.kind === "tower" ? Math.round(amount * card.towerDamageFactor) : amount;
    damage.set(entity.id, (damage.get(entity.id) ?? 0) + dealt);
  }
}

/**
 * Decide whether the battle is over, and move between periods.
 *
 * A king tower falling ends it immediately at any point. Otherwise regular time
 * ends at {@link REGULAR_TICKS} and more crowns wins; level crowns go to sudden
 * death, where the next tower of any kind decides it — checked every tick, since
 * "the first tower to fall" has to resolve the moment it falls.
 */
function checkVictory(state: BattleState): void {
  const [a, b] = state.sides;

  const kingDown = (side: Side) =>
    !state.entities.some(
      (e: Entity) => e.side === side && e.towerKind === "king" && e.hp > 0,
    );

  if (kingDown(1)) return end(state, 0, "kingTower");
  if (kingDown(0)) return end(state, 1, "kingTower");

  if (state.phase === "suddenDeath" && a.crowns !== b.crowns) {
    return end(state, a.crowns > b.crowns ? 0 : 1, "suddenDeath");
  }

  if (state.phase === "regular" && state.tick >= REGULAR_TICKS) {
    if (a.crowns !== b.crowns) {
      return end(state, a.crowns > b.crowns ? 0 : 1, "crowns");
    }
    state.phase = "suddenDeath";
    return;
  }

  if (
    state.phase === "suddenDeath" &&
    state.tick >= REGULAR_TICKS + SUDDEN_DEATH_TICKS
  ) {
    end(state, null, "draw");
  }
}

function end(
  state: BattleState,
  winner: Side | null,
  reason: "crowns" | "kingTower" | "suddenDeath" | "draw",
): void {
  state.phase = "ended";
  state.outcome = { winner, reason, endedOnTick: state.tick };
}
