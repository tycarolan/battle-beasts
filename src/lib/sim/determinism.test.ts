/**
 * The test the whole simulation exists to pass.
 *
 * If these go red, a battle no longer means the same thing on two machines — and
 * every consequence of that (a replay that diverges, a validated result that
 * disagrees with the client, and eventually two players seeing different games)
 * follows from it. This is the gate that keeps real-time play a networking job
 * later rather than a rewrite.
 */

import { describe, expect, it } from "vitest";

import { REGULAR_TICKS, SUDDEN_DEATH_TICKS } from "./constants";
import { fingerprint } from "./fingerprint";
import { runReplay, type ReplayRecord } from "./replay";
import { createRng, nextBelow } from "./rng";
import { createBattle, type BattleRules, type Play } from "./state";
import { step } from "./tick";

/** Costs one through four, so a card's cost is a function of nothing but its id. */
const RULES: BattleRules = { cardCost: (cardId) => (cardId % 4) + 1 };

const DECK_A = [0, 1, 2, 3, 4, 5, 6, 7];
const DECK_B = [7, 6, 5, 4, 3, 2, 1, 0];

/**
 * A plausible battle's worth of plays, generated from a seed of their own.
 *
 * Deliberately not from the battle's generator — these stand in for a person
 * tapping the screen, and the point is that the simulation reproduces whatever
 * arbitrary sequence it is handed.
 */
function generatePlays(seed: number, count: number): Play[] {
  const rng = createRng(seed);
  const plays: Play[] = [];
  for (let i = 0; i < count; i += 1) {
    plays.push({
      tick: 1 + nextBelow(rng, REGULAR_TICKS - 1),
      side: nextBelow(rng, 2) === 0 ? 0 : 1,
      slot: nextBelow(rng, 4),
      x: nextBelow(rng, 18000) / 1000,
      y: nextBelow(rng, 32000) / 1000,
    });
  }
  return plays.sort((a, b) => a.tick - b.tick);
}

function record(seed: number, plays: Play[]): ReplayRecord {
  return { version: 1, seed, decks: [DECK_A, DECK_B], plays };
}

describe("determinism", () => {
  it("produces an identical fingerprint at every tick across two runs", () => {
    const plays = generatePlays(31337, 300);

    const first: number[] = [];
    const second: number[] = [];

    runReplay(record(2026, plays), RULES, (state) => first.push(fingerprint(state)));
    runReplay(record(2026, plays), RULES, (state) => second.push(fingerprint(state)));

    expect(first.length).toBeGreaterThan(0);
    expect(second).toEqual(first);
  });

  it("reports the first tick that diverges rather than only the outcome", () => {
    // Guards the guard: if this test could not tell two different battles apart,
    // the test above would pass for the wrong reason.
    const a: number[] = [];
    const b: number[] = [];

    runReplay(record(1, generatePlays(1, 200)), RULES, (s) => a.push(fingerprint(s)));
    runReplay(record(2, generatePlays(1, 200)), RULES, (s) => b.push(fingerprint(s)));

    const firstDifference = a.findIndex((hash, i) => hash !== b[i]);
    expect(firstDifference).toBeGreaterThanOrEqual(0);
  });

  it("reaches the same final state whether stepped directly or replayed", () => {
    const plays = generatePlays(4242, 250);
    const byTick = new Map<number, Play[]>();
    for (const play of plays) {
      const at = byTick.get(play.tick);
      if (at) at.push(play);
      else byTick.set(play.tick, [play]);
    }

    const direct = createBattle(777, DECK_A, DECK_B);
    for (let tick = 1; tick <= REGULAR_TICKS + SUDDEN_DEATH_TICKS; tick += 1) {
      if (direct.phase === "ended") break;
      step(direct, RULES, byTick.get(tick) ?? []);
    }

    const replayed = runReplay(record(777, plays), RULES);

    expect(fingerprint(replayed)).toBe(fingerprint(direct));
  });

  it("is unaffected by the order plays were submitted within a tick", () => {
    // Plays are applied side 0 then side 1, so two plays landing on the same
    // tick from different sides must resolve the same way whichever arrived
    // first over the wire.
    const shared: Play[] = [
      { tick: 60, side: 1, slot: 0, x: 4, y: 24 },
      { tick: 60, side: 0, slot: 0, x: 4, y: 8 },
    ];
    const reversed = [...shared].reverse();

    const a = runReplay(record(11, shared), RULES);
    const b = runReplay(record(11, reversed), RULES);

    expect(fingerprint(b)).toBe(fingerprint(a));
  });

  it("runs a full battle to a decision without stalling", () => {
    const state = runReplay(record(5, generatePlays(5, 400)), RULES);

    expect(state.phase).toBe("ended");
    expect(state.outcome).not.toBeNull();
    expect(state.tick).toBeLessThanOrEqual(REGULAR_TICKS + SUDDEN_DEATH_TICKS);
  });

  it("draws a battle in which neither side takes a tower", () => {
    // With no units yet, no crown can be scored, so every battle is a draw —
    // and it has to reach that verdict through sudden death rather than by
    // stopping at the end of regular time.
    const state = runReplay(record(3, []), RULES);

    expect(state.outcome?.reason).toBe("draw");
    expect(state.outcome?.winner).toBeNull();
    expect(state.tick).toBe(REGULAR_TICKS + SUDDEN_DEATH_TICKS);
  });

  it("never spends elixir it does not have", () => {
    // A play the simulation cannot afford is dropped, and dropping it must not
    // cycle the deck — cycling on a refused play would be free deck ordering.
    const spam: Play[] = Array.from({ length: 400 }, (_, i) => ({
      tick: i + 1,
      side: 0 as const,
      slot: 0,
      x: 9,
      y: 8,
    }));

    const state = runReplay(record(21, spam), RULES);

    expect(state.sides[0].elixir.amount).toBeGreaterThanOrEqual(0);
    expect([...state.sides[0].hand.slots, ...state.sides[0].hand.queue].sort()).toEqual(
      DECK_A,
    );
  });
});
