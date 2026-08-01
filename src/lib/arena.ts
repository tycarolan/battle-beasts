/**
 * The battlefield: its dimensions, its river, and where the towers stand.
 *
 * All distances are in tiles. Pixels appear only in the renderer, and the
 * simulation never learns how big the screen is.
 *
 * The coordinate system runs `x` across the arena and `y` along it. **Side 0
 * defends the high-`y` end and attacks toward low `y`; side 1 does the reverse.**
 * That is the only asymmetry between the two sides, and every other rule is
 * written in terms of "toward the enemy" so neither side is special-cased.
 */

import { ARENA_HEIGHT, ARENA_WIDTH } from "./sim/constants";
import type { Side } from "./sim/state";

export { ARENA_HEIGHT, ARENA_WIDTH };

/** The river's centre line. */
export const RIVER_Y = ARENA_HEIGHT / 2;

/** How far the river reaches either side of its centre. Ground units cannot enter it. */
export const RIVER_HALF_WIDTH = 1;

/** Centres of the two bridges. */
export const BRIDGE_X = [3.5, 14.5] as const;

/** How wide a bridge is. Ground units cross inside this band and nowhere else. */
export const BRIDGE_WIDTH = 3;

/** Where a tower stands, and which side owns it. */
export type TowerPlacement = {
  side: Side;
  kind: "princess" | "king";
  x: number;
  y: number;
  /** Which half of the arena this tower guards, for deploy-zone expansion. `null` for a king. */
  lane: "left" | "right" | null;
};

/**
 * Every tower's starting position.
 *
 * Princess towers sit forward and to each side; the king sits centred behind
 * them. The distance from a princess tower to the river is the single most
 * load-bearing number on this map — it decides whether a unit dropped at the
 * bridge can be answered before it connects.
 */
export const TOWER_PLACEMENTS: readonly TowerPlacement[] = [
  { side: 0, kind: "princess", x: 4.5, y: 25, lane: "left" },
  { side: 0, kind: "princess", x: 13.5, y: 25, lane: "right" },
  { side: 0, kind: "king", x: 9, y: 29, lane: null },
  { side: 1, kind: "princess", x: 4.5, y: 7, lane: "left" },
  { side: 1, kind: "princess", x: 13.5, y: 7, lane: "right" },
  { side: 1, kind: "king", x: 9, y: 3, lane: null },
];

/** Which way `side` advances along `y`. */
export function forwardSign(side: Side): number {
  return side === 0 ? -1 : 1;
}

/** The `y` a side's own half begins at, measured from the river. */
export function ownHalfStart(side: Side): number {
  return side === 0 ? RIVER_Y + RIVER_HALF_WIDTH : 0;
}

/** The `y` a side's own half ends at. */
export function ownHalfEnd(side: Side): number {
  return side === 0 ? ARENA_HEIGHT : RIVER_Y - RIVER_HALF_WIDTH;
}

/**
 * Whether `side` may deploy at a point.
 *
 * A side's own half is always legal. Taking an enemy princess tower opens the
 * matching half of the enemy's side for the rest of the battle — which is what
 * turns a tower trade into map control rather than only a crown.
 */
export function canDeployAt(
  side: Side,
  x: number,
  y: number,
  openedLanes: readonly ("left" | "right")[],
): boolean {
  if (x < 0 || x > ARENA_WIDTH || y < 0 || y > ARENA_HEIGHT) return false;

  const inOwnHalf = y >= ownHalfStart(side) && y <= ownHalfEnd(side);
  if (inOwnHalf) return true;

  const half = x < ARENA_WIDTH / 2 ? "left" : "right";
  if (!openedLanes.includes(half)) return false;

  // The opened half of the enemy's side, stopping at the river as the near edge.
  return side === 0 ? y <= RIVER_Y - RIVER_HALF_WIDTH : y >= RIVER_Y + RIVER_HALF_WIDTH;
}

/** Whether a point is inside the river, where ground units cannot walk. */
export function inRiver(x: number, y: number): boolean {
  if (y < RIVER_Y - RIVER_HALF_WIDTH || y > RIVER_Y + RIVER_HALF_WIDTH) return false;
  return !onBridge(x);
}

/** Whether an `x` lies within a bridge's width. */
export function onBridge(x: number): boolean {
  return BRIDGE_X.some((bridge) => Math.abs(x - bridge) <= BRIDGE_WIDTH / 2);
}

/** The centre of whichever bridge is nearer to `x`. Ties go to the left bridge, deterministically. */
export function nearestBridgeX(x: number): number {
  const [left, right] = BRIDGE_X;
  return Math.abs(x - left) <= Math.abs(x - right) ? left : right;
}
