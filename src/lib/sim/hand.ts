/**
 * The four cards in hand, the one waiting behind them, and the cycle that
 * connects them.
 *
 * This is the whole of the game's card mechanic and it is deliberately tiny: a
 * deck of eight, four of them in hand, and playing one sends it to the back of a
 * queue of four. Which means that after the first four plays the order is
 * entirely determined, and a player who is paying attention knows exactly what
 * is coming and when — that determinism is the skill in it, not a side effect.
 */

import { nextBelow, type Rng } from "./rng";

/** Cards held in hand at once. */
export const HAND_SIZE = 4;

/** Cards in a deck. */
export const DECK_SIZE = 8;

/**
 * A side's cards mid-battle.
 *
 * The played card goes to the back of {@link queue} and the front of the queue
 * takes its place *in the slot it vacated*, which is why the hand is a fixed
 * four slots rather than a list — a card appearing in the slot the last one left
 * is what makes a hand learnable by muscle memory.
 */
export type Hand = {
  /** The four playable slots, each holding a card id. */
  slots: number[];
  /** The four cards waiting, in order. `queue[0]` is the one shown as next. */
  queue: number[];
};

/**
 * Deal a deck into a hand.
 *
 * The shuffle draws from the battle's own generator, so the opening hand is part
 * of what a seed determines — two battles from one seed open identically.
 */
export function createHand(deck: readonly number[], rng: Rng): Hand {
  const shuffled = shuffle(deck, rng);
  return {
    slots: shuffled.slice(0, HAND_SIZE),
    queue: shuffled.slice(HAND_SIZE),
  };
}

/** The card currently shown as next up. */
export function nextCard(hand: Hand): number {
  return hand.queue[0];
}

/**
 * Play the card in `slot`, cycling it to the back.
 *
 * Returns the card that was played, or `null` if the slot is not one of the
 * four — a guard rather than a throw, because this runs inside a tick and a
 * malformed play should cost the play, not the battle.
 */
export function playFromSlot(hand: Hand, slot: number): number | null {
  if (!Number.isInteger(slot) || slot < 0 || slot >= HAND_SIZE) return null;
  const played = hand.slots[slot];
  hand.slots[slot] = hand.queue[0];
  hand.queue = hand.queue.slice(1);
  hand.queue.push(played);
  return played;
}

/**
 * Fisher-Yates, drawing from the battle's generator.
 *
 * Written out rather than taken from a library because the exact sequence of
 * generator calls is part of the battle format — a library that changed its
 * iteration direction in a minor release would silently invalidate every stored
 * replay.
 */
function shuffle(deck: readonly number[], rng: Rng): number[] {
  const cards = [...deck];
  for (let i = cards.length - 1; i > 0; i -= 1) {
    const j = nextBelow(rng, i + 1);
    const swap = cards[i];
    cards[i] = cards[j];
    cards[j] = swap;
  }
  return cards;
}
