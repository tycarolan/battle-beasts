/**
 * The opponent.
 *
 * ## What it is
 *
 * A policy, not a search. Each time it thinks, it looks at what is coming, picks
 * the card in its hand that best answers it, and places that card somewhere
 * sensible relative to its own tower. It plays no better than that, and the
 * point is that it plays *legibly* — when it loses a tower you should be able to
 * see what it did wrong.
 *
 * ## Why it holds no randomness
 *
 * Its decisions are a pure function of the battle state, so a replay reproduces
 * them without storing them. That is what keeps a four-minute battle a few
 * hundred bytes, and it is why the opponent is inside the simulation rather than
 * driving it from outside.
 *
 * ## The three difficulty axes
 *
 * Reaction delay, elixir discipline, and card level. They are independent on
 * purpose: an easy opponent is slow *and* wasteful, and turning either one up
 * alone produces a recognisably different kind of opponent rather than simply a
 * harder one.
 */

import { RIVER_Y } from "../arena";
import { cardById, type TroopDefinition } from "../units/roster";
import type { Entity } from "../sim/entities";
import type { BattleState, Play, Side } from "../sim/state";

/** How one opponent behaves. */
export type Opponent = {
  name: string;
  /** One line, and it has to be produced by the numbers below rather than decorate them. */
  temperament: string;
  /** Ticks between the threat appearing and the answer being played. */
  reactionDelay: number;
  /** It will not spend below this unless it is defending. */
  elixirFloor: number;
  /** Elixir at which it starts a push of its own. */
  pushAt: number;
  /** Ticks between decisions. Longer means it misses windows. */
  thinkEvery: number;
  /** What level its cards are. */
  level: number;
};

/** The four, easiest first. */
export const OPPONENTS: readonly Opponent[] = [
  {
    name: "Tumbler",
    temperament: "Answers late and overspends, then has nothing left when it matters.",
    reactionDelay: 26,
    elixirFloor: 0,
    pushAt: 9,
    thinkEvery: 14,
    level: 1,
  },
  {
    name: "Bracken",
    temperament: "Defends soundly but commits to a push it cannot pay for.",
    reactionDelay: 18,
    elixirFloor: 1,
    pushAt: 8,
    thinkEvery: 10,
    level: 1,
  },
  {
    name: "Vesper",
    temperament: "Holds elixir, answers cheaply, and punishes a bad push.",
    reactionDelay: 12,
    elixirFloor: 3,
    pushAt: 8,
    thinkEvery: 8,
    level: 2,
  },
  {
    name: "Coil",
    temperament: "Answers almost immediately and never wastes a card.",
    reactionDelay: 8,
    elixirFloor: 4,
    pushAt: 7,
    thinkEvery: 6,
    level: 3,
  },
];

/**
 * What the opponent wants to do on this tick, if anything.
 *
 * Returns a play to be queued `reactionDelay` ticks from now — the delay is what
 * makes it beatable and what makes it read as a person rather than a reflex.
 */
export function decide(
  state: BattleState,
  side: Side,
  opponent: Opponent,
): Play | null {
  if (state.tick % opponent.thinkEvery !== 0) return null;

  const me = state.sides[side];
  const threats = incomingThreats(state, side);

  if (threats.length > 0) {
    const answer = chooseAnswer(state, side, threats);
    if (answer) return answer;
    return null;
  }

  // Nothing to answer. Build a push once there is enough to pay for one.
  if (me.elixir.amount < opponent.pushAt) return null;
  return startPush(state, side, opponent);
}

/** Enemy units that have crossed into this side's half. */
function incomingThreats(state: BattleState, side: Side): Entity[] {
  return state.entities.filter((entity) => {
    if (entity.side === side || entity.kind === "tower") return false;
    if (entity.hp <= 0) return false;
    return side === 0 ? entity.y > RIVER_Y : entity.y < RIVER_Y;
  });
}

/**
 * Pick a card to answer what is coming, and where to put it.
 *
 * The scoring is deliberately shallow: can it hit the threat at all, does it
 * splash a group, and what does it cost. A deeper evaluation would play better
 * and read worse — an opponent that always finds the perfect answer is not more
 * fun to lose to, it is just opaque.
 */
function chooseAnswer(state: BattleState, side: Side, threats: Entity[]): Play | null {
  const me = state.sides[side];
  const lead = threats[0];
  const anyFlying = threats.some((threat) => threat.stats.flies);
  const grouped = threats.length > 2;

  let bestSlot = -1;
  let bestScore = -Infinity;

  for (let slot = 0; slot < me.hand.slots.length; slot += 1) {
    const cardId = me.hand.slots[slot];
    const card = cardById(cardId);
    if (card.cost > me.elixir.amount) continue;

    let score = 0;

    if (card.kind === "spell") {
      // Worth it against a real cluster, wasteful against one big unit.
      score = grouped ? 6 : -4;
    } else {
      const troop = card as TroopDefinition;
      const canHit =
        troop.targets === "both" ||
        (troop.targets === "ground" && !anyFlying) ||
        (troop.targets === "air" && anyFlying);
      if (!canHit) continue;

      score = 4;
      if (anyFlying && troop.targets !== "ground") score += 4;
      if (grouped && troop.splash > 0) score += 5;
      if (!grouped && troop.count === 1) score += 2;
    }

    // Cheaper is better, all else equal — the elixir trade is the whole game.
    score -= card.cost;

    if (score > bestScore) {
      bestScore = score;
      bestSlot = slot;
    }
  }

  if (bestSlot < 0 || bestScore <= 0) return null;

  return {
    tick: state.tick,
    side,
    slot: bestSlot,
    ...defensivePlacement(side, lead),
  };
}

/**
 * Where a defensive card goes.
 *
 * Between the threat and the tower, pulled back a little so the unit meets it
 * under the tower's cover rather than out in the open. Placement is most of what
 * separates a good player from a bad one in this genre, and a bot that places
 * well but decides plainly feels much better than the reverse.
 */
function defensivePlacement(side: Side, threat: Entity): { x: number; y: number } {
  const towardOwnEnd = side === 0 ? 1 : -1;
  return {
    x: clampX(threat.x),
    y: clampY(threat.y + towardOwnEnd * 2.5, side),
  };
}

/** Start something of its own, behind its own tower so it gathers before it crosses. */
function startPush(state: BattleState, side: Side, opponent: Opponent): Play | null {
  const me = state.sides[side];

  let bestSlot = -1;
  let bestCost = -1;

  for (let slot = 0; slot < me.hand.slots.length; slot += 1) {
    const card = cardById(me.hand.slots[slot]);
    if (card.kind === "spell") continue;
    if (card.cost > me.elixir.amount - opponent.elixirFloor) continue;
    // The most expensive thing it can afford — a push wants a body that survives.
    if (card.cost > bestCost) {
      bestCost = card.cost;
      bestSlot = slot;
    }
  }

  if (bestSlot < 0) return null;

  // Alternate lanes by tick so it does not always attack the same side.
  const lane = Math.floor(state.tick / 600) % 2 === 0 ? 4.5 : 13.5;

  return {
    tick: state.tick,
    side,
    slot: bestSlot,
    x: lane,
    y: side === 0 ? 22 : 10,
  };
}

function clampX(x: number): number {
  if (x < 1) return 1;
  if (x > 17) return 17;
  return x;
}

function clampY(y: number, side: Side): number {
  const low = side === 0 ? RIVER_Y + 1.5 : 1;
  const high = side === 0 ? 31 : RIVER_Y - 1.5;
  if (y < low) return low;
  if (y > high) return high;
  return y;
}
