/**
 * What each beast looks like.
 *
 * ## The shape language
 *
 * Every beast is drawn upright and front-facing inside a 100×100 box, as though
 * standing on the ground at the bottom edge. Front-facing rather than in profile
 * because units here move up and down the arena: a profile creature walking
 * toward you sideways reads as a mistake, and rotating art to face travel would
 * need four views of everything.
 *
 * Nothing is mirrored or rotated at draw time. Which side a beast belongs to is
 * carried entirely by colour, which is the one channel that stays readable when
 * the whole animal is twenty pixels tall.
 *
 * ## Layers
 *
 * Each design is a short stack of paths, painted back to front, and each names a
 * role rather than a colour — `dark`, `base`, `light`, `detail`, `accent`. The
 * side's palette supplies the actual values, so one design serves both armies
 * and neither can drift from the other.
 *
 * Keeping the count low per beast is deliberate. These are silhouettes first:
 * at battle size the outline is doing nearly all the work, and a design that
 * needs its interior detail to be recognisable has already failed.
 *
 * ## Why SVG path strings
 *
 * `Path2D` takes SVG path data, so exactly these strings also render in the
 * bestiary sheet. One definition, two surfaces, no chance of the reference art
 * and the game disagreeing.
 */

/** Which colour role a path takes from the side's palette. */
export type Layer = "dark" | "base" | "light" | "detail" | "accent";

/** One painted shape. */
export type Shape = {
  /** SVG path data, in a 100×100 box with the ground at y=100. */
  d: string;
  layer: Layer;
  /** Stroked rather than filled, at this width. */
  stroke?: number;
  /** Rounded ends on a stroke. Default true — these are animals, not diagrams. */
  butt?: boolean;
};

/** A beast's whole appearance. */
export type Design = {
  /** Painted back to front. */
  shapes: Shape[];
  /**
   * How much of the box the design actually fills, as a fraction. Trims the
   * empty margin around a drawing so two designs with different amounts of
   * padding still sit at the same apparent size.
   */
  fill: number;
  /**
   * How tall the beast is drawn, in arena tiles.
   *
   * Deliberately not derived from the collision radius. A grub takes almost no
   * space and still has to be visible; a rhino's bulk is most of what makes it
   * read as a rhino. Tying the two together made every unit a dot — how much
   * room a body occupies and how big it looks are separate questions and the
   * art only cares about the second.
   */
  tall: number;
};

/**
 * The twelve, by card id.
 *
 * Ids match `units/roster.ts` and are permanent — they are stored in decks and
 * replays, so these keys cannot be reordered any more than the roster can.
 */
export const DESIGNS: Record<number, Design> = {
  // 0 — Grubs. One larva; the card puts four on the field.
  0: {
    fill: 0.78,
    tall: 1.15,
    shapes: [
      { d: "M50 92 q-22 0 -22 -16 q0 -18 22 -18 q22 0 22 18 q0 16 -22 16 z", layer: "dark" },
      { d: "M50 86 q-17 0 -17 -13 q0 -15 17 -15 q17 0 17 15 q0 13 -17 13 z", layer: "base" },
      { d: "M50 60 q-13 0 -13 -11 q0 -12 13 -12 q13 0 13 12 q0 11 -13 11 z", layer: "base" },
      { d: "M50 40 q-11 0 -11 -10 q0 -11 11 -11 q11 0 11 11 q0 10 -11 10 z", layer: "light" },
      { d: "M44 26 q-3 -8 2 -11 M56 26 q3 -8 -2 -11", layer: "detail", stroke: 3 },
      { d: "M44 32 a2.6 2.6 0 1 0 0.1 0 z M56 32 a2.6 2.6 0 1 0 0.1 0 z", layer: "detail" },
    ],
  },

  // 1 — Spears. A quill-thrower: crest fanned, arm cocked.
  1: {
    fill: 0.92,
    tall: 1.6,
    shapes: [
      { d: "M50 30 l-26 -18 M50 28 l-16 -24 M50 28 l0 -26 M50 28 l16 -24 M50 30 l26 -18", layer: "dark", stroke: 4 },
      { d: "M50 96 q-16 0 -16 -20 q0 -24 16 -24 q16 0 16 24 q0 20 -16 20 z", layer: "base" },
      { d: "M50 96 q-7 0 -7 -20 q0 -24 7 -24 q7 0 7 24 q0 20 -7 20 z", layer: "light" },
      { d: "M50 54 a15 14 0 1 0 0.1 0 z", layer: "base" },
      { d: "M50 44 a9 8 0 1 0 0.1 0 z", layer: "light" },
      { d: "M44 46 a2.4 2.4 0 1 0 0.1 0 z M56 46 a2.4 2.4 0 1 0 0.1 0 z", layer: "detail" },
      { d: "M78 20 l-8 62", layer: "accent", stroke: 4 },
      { d: "M78 20 l-6 12 12 0 z", layer: "accent" },
      { d: "M66 62 l14 -4", layer: "base", stroke: 7 },
    ],
  },

  // 2 — Brute. A boar: shoulders wider than its head, tusks out.
  2: {
    fill: 1,
    tall: 2.0,
    shapes: [
      { d: "M50 98 q-32 0 -32 -22 q0 -26 32 -26 q32 0 32 26 q0 22 -32 22 z", layer: "dark" },
      { d: "M50 92 q-26 0 -26 -20 q0 -22 26 -22 q26 0 26 22 q0 20 -26 20 z", layer: "base" },
      { d: "M50 74 q-11 0 -11 -12 q0 -14 11 -14 q11 0 11 14 q0 12 -11 12 z", layer: "light" },
      { d: "M50 56 a19 17 0 1 0 0.1 0 z", layer: "base" },
      { d: "M50 62 a10 8 0 1 0 0.1 0 z", layer: "light" },
      { d: "M31 44 l-6 -16 14 8 z M69 44 l6 -16 -14 8 z", layer: "dark" },
      { d: "M42 50 a2.8 2.8 0 1 0 0.1 0 z M58 50 a2.8 2.8 0 1 0 0.1 0 z", layer: "detail" },
      { d: "M40 68 q-10 -2 -12 -12 M60 68 q10 -2 12 -12", layer: "accent", stroke: 5 },
    ],
  },

  // 3 — Bats. Wings wide; the body is almost incidental.
  3: {
    fill: 1,
    tall: 1.7,
    shapes: [
      { d: "M50 56 q-18 -26 -46 -22 q10 12 4 26 q16 -8 22 4 q8 -14 20 -8 z", layer: "base" },
      { d: "M50 56 q18 -26 46 -22 q-10 12 -4 26 q-16 -8 -22 4 q-8 -14 -20 -8 z", layer: "base" },
      { d: "M50 56 q-14 -20 -34 -18 q8 9 3 19 q12 -6 17 3 q6 -10 14 -4 z", layer: "light" },
      { d: "M50 56 q14 -20 34 -18 q-8 9 -3 19 q-12 -6 -17 3 q-6 -10 -14 -4 z", layer: "light" },
      { d: "M50 78 q-12 0 -12 -16 q0 -16 12 -16 q12 0 12 16 q0 16 -12 16 z", layer: "dark" },
      { d: "M42 44 l-4 -14 10 8 z M58 44 l4 -14 -10 8 z", layer: "dark" },
      { d: "M45 56 a2.6 2.6 0 1 0 0.1 0 z M55 56 a2.6 2.6 0 1 0 0.1 0 z", layer: "accent" },
    ],
  },

  // 4 — Hammer. A badger carrying more weight than it should.
  4: {
    fill: 0.96,
    tall: 2.0,
    shapes: [
      { d: "M50 98 q-24 0 -24 -24 q0 -28 24 -28 q24 0 24 28 q0 24 -24 24 z", layer: "dark" },
      { d: "M50 94 q-18 0 -18 -22 q0 -24 18 -24 q18 0 18 24 q0 22 -18 22 z", layer: "base" },
      { d: "M50 94 q-6 0 -6 -22 q0 -24 6 -24 q6 0 6 24 q0 22 -6 22 z", layer: "light" },
      { d: "M50 52 a17 16 0 1 0 0.1 0 z", layer: "base" },
      { d: "M50 52 q-5 0 -5 -14 q0 -3 5 -3 q5 0 5 3 q0 14 -5 14 z", layer: "light" },
      { d: "M42 44 a2.6 2.6 0 1 0 0.1 0 z M58 44 a2.6 2.6 0 1 0 0.1 0 z", layer: "detail" },
      { d: "M28 60 l-14 -22", layer: "base", stroke: 8 },
      { d: "M4 16 l22 0 0 18 -22 0 z", layer: "accent" },
      { d: "M14 34 l4 8", layer: "accent", stroke: 5 },
    ],
  },

  // 5 — Behemoth. A rhinoceros. The horn is the whole read.
  5: {
    fill: 1,
    tall: 2.7,
    shapes: [
      { d: "M50 99 q-38 0 -38 -24 q0 -30 38 -30 q38 0 38 30 q0 24 -38 24 z", layer: "dark" },
      { d: "M50 94 q-31 0 -31 -22 q0 -26 31 -26 q31 0 31 26 q0 22 -31 22 z", layer: "base" },
      { d: "M50 78 q-13 0 -13 -14 q0 -16 13 -16 q13 0 13 16 q0 14 -13 14 z", layer: "light" },
      { d: "M50 54 a22 18 0 1 0 0.1 0 z", layer: "base" },
      { d: "M50 40 q-7 0 -7 -12 q0 -8 7 -8 q7 0 7 8 q0 12 -7 12 z", layer: "light" },
      { d: "M50 6 q-9 20 0 26 q9 -6 0 -26 z", layer: "accent" },
      { d: "M40 52 a3 3 0 1 0 0.1 0 z M60 52 a3 3 0 1 0 0.1 0 z", layer: "detail" },
      { d: "M28 74 l0 14 M50 78 l0 14 M72 74 l0 14", layer: "dark", stroke: 4 },
    ],
  },

  // 6 — Runner. Legs first: everything about it says it will not stop.
  6: {
    fill: 0.95,
    tall: 2.1,
    shapes: [
      { d: "M40 66 l-8 30 M60 66 l8 30", layer: "dark", stroke: 7 },
      { d: "M32 96 l-11 4 M68 96 l11 4", layer: "dark", stroke: 6 },
      { d: "M50 74 q-19 0 -19 -18 q0 -20 19 -20 q19 0 19 20 q0 18 -19 18 z", layer: "base" },
      { d: "M50 70 q-8 0 -8 -15 q0 -17 8 -17 q8 0 8 17 q0 15 -8 15 z", layer: "light" },
      { d: "M50 38 q2 -18 4 -26", layer: "base", stroke: 10 },
      { d: "M56 8 a11 10 0 1 0 0.1 0 z", layer: "base" },
      { d: "M67 12 l14 4 -14 6 z", layer: "accent" },
      { d: "M53 6 a2.6 2.6 0 1 0 0.1 0 z", layer: "detail" },
    ],
  },

  // 7 — Ashcaster. A salamander rearing, with the ember it is about to throw.
  7: {
    fill: 0.94,
    tall: 1.8,
    shapes: [
      { d: "M50 98 q-16 0 -16 -12 q0 -10 16 -10 q16 0 16 10 q0 12 -16 12 z", layer: "dark" },
      { d: "M50 82 q-13 0 -13 -20 q0 -30 13 -30 q13 0 13 30 q0 20 -13 20 z", layer: "base" },
      { d: "M50 80 q-5 0 -5 -19 q0 -28 5 -28 q5 0 5 28 q0 19 -5 19 z", layer: "light" },
      { d: "M50 30 l-8 -16 6 2 2 -12 2 12 6 -2 z", layer: "dark" },
      { d: "M50 36 a13 12 0 1 0 0.1 0 z", layer: "base" },
      { d: "M43 34 a2.6 2.6 0 1 0 0.1 0 z M57 34 a2.6 2.6 0 1 0 0.1 0 z", layer: "detail" },
      { d: "M34 60 q-16 4 -18 16 M66 60 q16 4 18 16", layer: "base", stroke: 6 },
      { d: "M84 74 a10 10 0 1 0 0.1 0 z", layer: "accent" },
      { d: "M84 74 a5 5 0 1 0 0.1 0 z", layer: "light" },
    ],
  },

  // 8 — Skyhulk. A roc: wings that make the bridges irrelevant.
  8: {
    fill: 1,
    tall: 2.6,
    shapes: [
      { d: "M50 50 q-24 -30 -48 -24 q10 14 4 30 q18 -10 24 6 q10 -18 20 -12 z", layer: "dark" },
      { d: "M50 50 q24 -30 48 -24 q-10 14 -4 30 q-18 -10 -24 6 q-10 -18 -20 -12 z", layer: "dark" },
      { d: "M50 50 q-19 -23 -37 -19 q8 11 3 23 q14 -8 19 5 q7 -14 15 -9 z", layer: "base" },
      { d: "M50 50 q19 -23 37 -19 q-8 11 -3 23 q-14 -8 -19 5 q-7 -14 -15 -9 z", layer: "base" },
      { d: "M50 88 q-14 0 -14 -22 q0 -24 14 -24 q14 0 14 24 q0 22 -14 22 z", layer: "base" },
      { d: "M50 86 q-5 0 -5 -21 q0 -22 5 -22 q5 0 5 22 q0 21 -5 21 z", layer: "light" },
      { d: "M50 42 a12 11 0 1 0 0.1 0 z", layer: "light" },
      { d: "M50 50 l0 12 -6 -6 z M50 50 l0 12 6 -6 z", layer: "accent" },
      { d: "M44 38 a2.6 2.6 0 1 0 0.1 0 z M56 38 a2.6 2.6 0 1 0 0.1 0 z", layer: "detail" },
    ],
  },

  // 9 — Ogre. A warbear, rearing. Widest silhouette in the roster, and it should be.
  9: {
    fill: 1,
    tall: 2.9,
    shapes: [
      { d: "M50 99 q-30 0 -30 -26 q0 -32 30 -32 q30 0 30 32 q0 26 -30 26 z", layer: "dark" },
      { d: "M50 94 q-23 0 -23 -24 q0 -28 23 -28 q23 0 23 28 q0 24 -23 24 z", layer: "base" },
      { d: "M50 92 q-9 0 -9 -23 q0 -26 9 -26 q9 0 9 26 q0 23 -9 23 z", layer: "light" },
      { d: "M24 52 q-16 8 -14 28 M76 52 q16 8 14 28", layer: "base", stroke: 12 },
      { d: "M50 40 a19 18 0 1 0 0.1 0 z", layer: "base" },
      { d: "M32 20 a8 8 0 1 0 0.1 0 z M68 20 a8 8 0 1 0 0.1 0 z", layer: "dark" },
      { d: "M50 46 q-8 0 -8 -8 q0 -6 8 -6 q8 0 8 6 q0 8 -8 8 z", layer: "light" },
      { d: "M42 34 a3 3 0 1 0 0.1 0 z M58 34 a3 3 0 1 0 0.1 0 z", layer: "detail" },
      { d: "M50 44 l0 6", layer: "detail", stroke: 3 },
    ],
  },

  // 10 — Nest. A mound that spits. Not a creature, and it should not read as one.
  10: {
    fill: 1,
    tall: 2.3,
    shapes: [
      { d: "M50 99 q-34 0 -34 -10 q0 -6 34 -6 q34 0 34 6 q0 10 -34 10 z", layer: "dark" },
      { d: "M20 90 q-2 -44 14 -66 q7 -10 16 -10 q9 0 16 10 q16 22 14 66 z", layer: "base" },
      { d: "M38 90 q-2 -42 8 -62 q3 -6 4 -6 q1 0 2 4 q-8 24 -6 64 z", layer: "light" },
      { d: "M40 58 a5 5 0 1 0 0.1 0 z M62 70 a5 5 0 1 0 0.1 0 z M52 40 a4 4 0 1 0 0.1 0 z", layer: "detail" },
      { d: "M50 14 l0 -12", layer: "accent", stroke: 5 },
      { d: "M50 2 a4 4 0 1 0 0.1 0 z", layer: "accent" },
    ],
  },

  // 11 — Blast. Never stands on the field; this is its card face and its impact mark.
  11: {
    fill: 1,
    tall: 1.6,
    shapes: [
      { d: "M50 8 l7 24 -14 0 z M50 92 l7 -24 -14 0 z", layer: "accent" },
      { d: "M8 50 l24 -7 0 14 z M92 50 l-24 -7 0 14 z", layer: "accent" },
      { d: "M20 20 l20 11 -9 9 z M80 20 l-20 11 9 9 z", layer: "accent" },
      { d: "M20 80 l20 -11 -9 -9 z M80 80 l-20 -11 9 -9 z", layer: "accent" },
      { d: "M50 50 a22 22 0 1 0 0.1 0 z", layer: "base" },
      { d: "M50 50 a13 13 0 1 0 0.1 0 z", layer: "light" },
    ],
  },
};

/** A design by card id, or `null` for anything without one. */
export function designFor(cardId: number): Design | null {
  return DESIGNS[cardId] ?? null;
}
