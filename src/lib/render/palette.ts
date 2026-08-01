/**
 * Colour, for both armies and for the ground they fight on.
 *
 * Side identity is carried by hue alone and it has to survive being twenty
 * pixels tall, so the two armies sit on opposite sides of the wheel — a cold
 * blue against a warm red — rather than on two shades of the same family. Every
 * other colour on the field is desaturated so that nothing competes with the one
 * distinction the game cannot afford to blur.
 */

/** The four tones a beast is painted from, plus its one bright accent. */
export type SidePalette = {
  dark: string;
  base: string;
  light: string;
  detail: string;
  accent: string;
  /** Used for the ground shadow beneath a unit. */
  shadow: string;
  /**
   * The rim drawn behind every shape.
   *
   * Tinted toward the side's own hue rather than pure black, so the outline
   * still says which army this is when a unit is small enough that the fills
   * are only a few pixels across.
   */
  outline: string;
};

/** Yours. */
export const YOU: SidePalette = {
  dark: "#2f83b4",
  base: "#5cbde8",
  light: "#a9e4fb",
  detail: "#06111a",
  accent: "#ffd479",
  shadow: "rgba(4, 10, 16, 0.5)",
  outline: "#071620",
};

/** Theirs. */
export const THEM: SidePalette = {
  dark: "#ad4032",
  base: "#ee6d55",
  light: "#ffab93",
  detail: "#1a0806",
  accent: "#ffd479",
  shadow: "rgba(16, 4, 4, 0.5)",
  outline: "#1c0906",
};

/** The arena. */
export const FIELD = {
  /** Beyond the arena's edge. */
  surround: "#0a0c11",
  /** The turf, and the faint band that separates the two halves of it. */
  turfNear: "#2a3a33",
  turfFar: "#22302b",
  turfLine: "#2f4038",
  /** Water, its lit surface, and the darker line where it meets the bank. */
  water: "#16324f",
  waterLit: "#22496e",
  bank: "#101d24",
  /** Timber. */
  bridge: "#3a2b1d",
  bridgePlank: "#4a3826",
  bridgeRail: "#2a1e14",
  /** Structure common to both sides' towers. */
  stoneDark: "#232935",
  stone: "#333b4a",
  stoneLit: "#414b5d",
  /** Health. */
  hp: "#79d17f",
  hpHurt: "#e0c15e",
  hpLow: "#e0705e",
  hpTrack: "rgba(6, 10, 16, 0.7)",
  /** A legal place to drop something. */
  legal: "rgba(94, 200, 242, 0.07)",
  legalEdge: "rgba(94, 200, 242, 0.22)",
} as const;

/** Whichever palette belongs to a side. */
export function paletteFor(side: 0 | 1): SidePalette {
  return side === 0 ? YOU : THEM;
}
