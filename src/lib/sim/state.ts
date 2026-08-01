/**
 * The battle state, and the line between what is inside it and what is not.
 *
 * ## The test for whether something belongs in here
 *
 * **If two machines running the same battle must agree on it, it is state. If
 * only the person looking at the screen cares, it is not.**
 *
 * Inside: the tick, the generator's position, elixir, hands, crowns, and every
 * entity and projectile on the field. Outside: interpolated positions, animation
 * frames, the camera, sounds, which card is highlighted, and anything measured
 * in pixels or in wall-clock milliseconds.
 *
 * Getting this boundary wrong is the ordinary way a deterministic simulation
 * stops being one, and it goes wrong in one direction far more often than the
 * other: something visual is put in state "just for now", it gets read by a
 * rule, and the rule now depends on the frame rate.
 */

import { cardCost as rosterCardCost } from "../units/roster";
import { REGULAR_TICKS, SIM_VERSION, SUDDEN_DEATH_TICKS } from "./constants";
import { createElixir, type Elixir } from "./elixir";
import { createHand, type Hand } from "./hand";
import { createTowers, type Entity, type Projectile } from "./entities";
import { createRng, type Rng } from "./rng";

/** Which player. Fixed indices rather than names, because they index into arrays that must stay ordered. */
export type Side = 0 | 1;

/** Where a battle is in its life. */
export type BattlePhase = "regular" | "suddenDeath" | "ended";

/**
 * How a battle finished.
 *
 * `winner` is `null` for a draw, which is a real outcome rather than an error —
 * a battle where neither side takes a tower in four minutes is a draw and is
 * meant to be.
 */
export type BattleOutcome = {
  winner: Side | null;
  reason: "crowns" | "kingTower" | "suddenDeath" | "draw";
  endedOnTick: number;
};

/** One side's half of the battle. */
export type SideState = {
  elixir: Elixir;
  hand: Hand;
  /** Towers taken from the opponent. Three ends the battle immediately. */
  crowns: number;
  /** Enemy halves opened for deployment by taking the princess tower that guarded them. */
  openedLanes: ("left" | "right")[];
  /** Card levels, by card id. */
  levels: Record<number, number>;
};

/** Everything two machines have to agree on. */
export type BattleState = {
  /** The format this battle was produced under. See `SIM_VERSION`. */
  version: number;
  tick: number;
  phase: BattlePhase;
  rng: Rng;
  sides: [SideState, SideState];
  entities: Entity[];
  projectiles: Projectile[];
  /** Hands out ids to entities and projectiles. Part of state, so replays agree on them. */
  nextEntityId: number;
  outcome: BattleOutcome | null;
};

/**
 * The rules a battle is played under.
 *
 * Deliberately *not* part of {@link BattleState}: it holds functions, it is the
 * same for every battle at a given version, and putting it in state would make
 * the state unserialisable. It is passed to each step instead.
 */
export type BattleRules = {
  /** What a card costs to play. */
  cardCost(cardId: number): number;
};

/** The ordinary rules: costs come from the roster. */
export const DEFAULT_RULES: BattleRules = { cardCost: rosterCardCost };

/** A card played, at a moment, in a place. The only input a battle ever takes. */
export type Play = {
  tick: number;
  side: Side;
  /** Which of the four hand slots, not which card — the slot is what a player actually touches. */
  slot: number;
  /** Where, in tiles. */
  x: number;
  y: number;
};

/** Every card at level 1, which is where a new player starts. */
function level1(deck: readonly number[]): Record<number, number> {
  const levels: Record<number, number> = {};
  for (const card of deck) levels[card] = 1;
  return levels;
}

/**
 * A battle at tick zero.
 *
 * Both sides are dealt from the same generator, one after the other, so the
 * order of those two calls is part of the format — swapping them changes every
 * opening hand in every stored replay.
 */
export function createBattle(
  seed: number,
  deckA: readonly number[],
  deckB: readonly number[],
): BattleState {
  const rng = createRng(seed);
  let nextId = 0;
  const nextEntityId = () => nextId++;
  const entities = createTowers(nextEntityId);

  return {
    version: SIM_VERSION,
    tick: 0,
    phase: "regular",
    rng,
    sides: [
      {
        elixir: createElixir(),
        hand: createHand(deckA, rng),
        crowns: 0,
        openedLanes: [],
        levels: level1(deckA),
      },
      {
        elixir: createElixir(),
        hand: createHand(deckB, rng),
        crowns: 0,
        openedLanes: [],
        levels: level1(deckB),
      },
    ],
    entities,
    projectiles: [],
    nextEntityId: nextId,
    outcome: null,
  };
}

/** Whether the battle has finished. */
export function isOver(state: BattleState): boolean {
  return state.phase === "ended";
}

/** Ticks remaining in the current period, for display. Never read by a rule. */
export function ticksRemaining(state: BattleState): number {
  if (state.phase === "ended") return 0;
  if (state.phase === "regular") return REGULAR_TICKS - state.tick;
  return REGULAR_TICKS + SUDDEN_DEATH_TICKS - state.tick;
}
