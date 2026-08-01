import { describe, expect, it } from "vitest";

import { DECK_SIZE, HAND_SIZE, createHand, nextCard, playFromSlot } from "./hand";
import { createRng } from "./rng";

const DECK = [0, 1, 2, 3, 4, 5, 6, 7];

describe("hand", () => {
  it("deals four to hand and four to the queue", () => {
    const hand = createHand(DECK, createRng(1));
    expect(hand.slots).toHaveLength(HAND_SIZE);
    expect(hand.queue).toHaveLength(DECK_SIZE - HAND_SIZE);
  });

  it("deals every card exactly once", () => {
    const hand = createHand(DECK, createRng(9));
    expect([...hand.slots, ...hand.queue].sort()).toEqual(DECK);
  });

  it("deals the same opening hand from the same seed", () => {
    const a = createHand(DECK, createRng(42));
    const b = createHand(DECK, createRng(42));
    expect(a).toEqual(b);
  });

  it("puts the next card into the slot the played card left", () => {
    const hand = createHand(DECK, createRng(3));
    const incoming = nextCard(hand);

    const played = playFromSlot(hand, 2);

    expect(hand.slots[2]).toBe(incoming);
    expect(hand.queue[hand.queue.length - 1]).toBe(played);
  });

  it("returns a card to hand after exactly four further plays", () => {
    // The whole skill of the cycle rests on this: once a card is played it is
    // four plays away, every time, with no randomness left in it.
    const hand = createHand(DECK, createRng(11));
    const played = playFromSlot(hand, 0);

    // Four, because a played card enters a queue of four and has to walk the
    // whole of it. This is the "four-card cycle" the whole deck-building
    // decision turns on: the four cheapest cards are the fastest route back to
    // any one of them.
    for (let i = 0; i < 4; i += 1) {
      expect(hand.slots).not.toContain(played);
      playFromSlot(hand, 0);
    }

    expect(hand.slots).toContain(played);
  });

  it("keeps all eight cards in circulation forever", () => {
    const hand = createHand(DECK, createRng(5));
    for (let i = 0; i < 500; i += 1) {
      playFromSlot(hand, i % HAND_SIZE);
      expect([...hand.slots, ...hand.queue].sort()).toEqual(DECK);
    }
  });

  it("refuses a slot outside the hand without disturbing the cycle", () => {
    const hand = createHand(DECK, createRng(8));
    const before = structuredClone(hand);

    expect(playFromSlot(hand, -1)).toBeNull();
    expect(playFromSlot(hand, HAND_SIZE)).toBeNull();
    expect(playFromSlot(hand, 1.5)).toBeNull();

    expect(hand).toEqual(before);
  });

  it("shows the card that will actually arrive next", () => {
    const hand = createHand(DECK, createRng(77));
    for (let i = 0; i < 40; i += 1) {
      const slot = i % HAND_SIZE;
      const expected = nextCard(hand);
      playFromSlot(hand, slot);
      expect(hand.slots[slot]).toBe(expected);
    }
  });
});
