/**
 * The ground, the water, and the two ways across.
 *
 * None of this changes for the length of a battle, so it is painted once into
 * its own bitmap and blitted as a single image each frame. That is the whole
 * reason the field can afford to have any texture at all: turf flecks and bridge
 * planks cost nothing per frame when they were drawn before the first one.
 *
 * Redrawn only when the canvas is resized.
 */

import {
  ARENA_HEIGHT,
  ARENA_WIDTH,
  BRIDGE_WIDTH,
  BRIDGE_X,
  RIVER_HALF_WIDTH,
  RIVER_Y,
} from "../arena";
import { FIELD } from "./palette";

/** How the arena maps onto the canvas. */
export type Viewport = {
  /** Pixels per tile. */
  scale: number;
  offsetX: number;
  offsetY: number;
};

/** Fit the arena into a canvas, preserving its proportions. */
export function fitViewport(width: number, height: number): Viewport {
  const scale = Math.min(width / ARENA_WIDTH, height / ARENA_HEIGHT);
  return {
    scale,
    offsetX: (width - ARENA_WIDTH * scale) / 2,
    offsetY: (height - ARENA_HEIGHT * scale) / 2,
  };
}

/** Canvas point to arena tile. */
export function toTiles(view: Viewport, px: number, py: number): { x: number; y: number } {
  return {
    x: (px - view.offsetX) / view.scale,
    y: (py - view.offsetY) / view.scale,
  };
}

/**
 * Paint the field.
 *
 * Takes the whole canvas, including the surround outside the arena's bounds, so
 * the caller never has to clear separately.
 */
export function paintField(
  ctx: CanvasRenderingContext2D,
  view: Viewport,
  width: number,
  height: number,
): void {
  const { scale } = view;
  const tx = (x: number) => view.offsetX + x * scale;
  const ty = (y: number) => view.offsetY + y * scale;

  ctx.fillStyle = FIELD.surround;
  ctx.fillRect(0, 0, width, height);

  // Turf, slightly darker on the far half so the arena reads as having depth
  // rather than as a flat rectangle.
  const turf = ctx.createLinearGradient(0, ty(0), 0, ty(ARENA_HEIGHT));
  turf.addColorStop(0, FIELD.turfFar);
  turf.addColorStop(0.5, FIELD.turfLine);
  turf.addColorStop(1, FIELD.turfNear);
  ctx.fillStyle = turf;
  ctx.fillRect(tx(0), ty(0), ARENA_WIDTH * scale, ARENA_HEIGHT * scale);

  paintTurfTexture(ctx, view);
  paintScatter(ctx, view);
  paintLaneSeam(ctx, view);
  paintRiver(ctx, view);
  for (const bridge of BRIDGE_X) paintBridge(ctx, view, bridge);

  paintVignette(ctx, view);

  // A hairline around the playfield, so the arena has an edge rather than
  // bleeding into the surround.
  ctx.strokeStyle = "rgba(255,255,255,0.05)";
  ctx.lineWidth = 1;
  ctx.strokeRect(tx(0) + 0.5, ty(0) + 0.5, ARENA_WIDTH * scale - 1, ARENA_HEIGHT * scale - 1);
}

/**
 * Flecks of lighter and darker turf.
 *
 * Deterministic by position rather than random: this is drawn once and never
 * animates, and a fixed pattern means a resize produces the same field rather
 * than a subtly different one.
 */
function paintTurfTexture(ctx: CanvasRenderingContext2D, view: Viewport): void {
  const { scale } = view;
  const tx = (x: number) => view.offsetX + x * scale;
  const ty = (y: number) => view.offsetY + y * scale;

  ctx.save();
  for (let row = 0; row < ARENA_HEIGHT; row += 1) {
    for (let col = 0; col < ARENA_WIDTH; col += 1) {
      // A cheap hash of the tile, so the speckle is stable and unpatterned.
      const h = (row * 73856093) ^ (col * 19349663);
      const n = (h >>> 8) & 0xff;
      if (n > 176) {
        ctx.fillStyle = "rgba(190,225,170,0.045)";
      } else if (n < 56) {
        ctx.fillStyle = "rgba(0,0,0,0.09)";
      } else {
        continue;
      }
      const jx = ((h >>> 3) & 0x7) / 8;
      const jy = ((h >>> 6) & 0x7) / 8;
      ctx.fillRect(tx(col + jx), ty(row + jy), scale * 0.34, scale * 0.34);
    }
  }
  ctx.restore();
}

/**
 * Tufts and stones.
 *
 * The field was a void before these — correct, and lifeless. They sit only in
 * the dead zones a unit never walks through, so nothing decorative can ever be
 * mistaken for something that fights.
 */
function paintScatter(ctx: CanvasRenderingContext2D, view: Viewport): void {
  const { scale } = view;
  const tx = (x: number) => view.offsetX + x * scale;
  const ty = (y: number) => view.offsetY + y * scale;

  // Hand-placed rather than scattered by a generator: a handful of considered
  // positions reads better than a hundred random ones, and it costs nothing.
  const tufts: [number, number][] = [
    [1.4, 4.5], [16.6, 5.2], [2.1, 11.8], [15.7, 12.4],
    [1.2, 20.2], [16.9, 19.6], [2.4, 27.4], [15.4, 28.1],
    [8.9, 13.2], [9.2, 18.9],
  ];
  for (const [x, y] of tufts) {
    ctx.strokeStyle = "rgba(150,200,140,0.13)";
    ctx.lineWidth = Math.max(1, scale * 0.08);
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(tx(x), ty(y));
    ctx.lineTo(tx(x - 0.18), ty(y - 0.42));
    ctx.moveTo(tx(x), ty(y));
    ctx.lineTo(tx(x + 0.05), ty(y - 0.52));
    ctx.moveTo(tx(x), ty(y));
    ctx.lineTo(tx(x + 0.24), ty(y - 0.36));
    ctx.stroke();
  }

  const stones: [number, number, number][] = [
    [3.2, 8.4, 0.3], [14.4, 23.6, 0.34], [6.1, 30.1, 0.24], [12.2, 2.2, 0.28],
  ];
  for (const [x, y, r] of stones) {
    ctx.fillStyle = "rgba(0,0,0,0.22)";
    ctx.beginPath();
    ctx.ellipse(tx(x), ty(y) + scale * 0.08, r * scale, r * scale * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(140,150,160,0.16)";
    ctx.beginPath();
    ctx.ellipse(tx(x), ty(y), r * scale, r * scale * 0.66, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** A soft darkening at the edges, so the eye settles on the middle of the field. */
function paintVignette(ctx: CanvasRenderingContext2D, view: Viewport): void {
  const { scale } = view;
  const tx = (x: number) => view.offsetX + x * scale;
  const ty = (y: number) => view.offsetY + y * scale;
  const w = ARENA_WIDTH * scale;
  const h = ARENA_HEIGHT * scale;

  const shade = ctx.createRadialGradient(
    tx(ARENA_WIDTH / 2), ty(ARENA_HEIGHT / 2), Math.min(w, h) * 0.28,
    tx(ARENA_WIDTH / 2), ty(ARENA_HEIGHT / 2), Math.max(w, h) * 0.62,
  );
  shade.addColorStop(0, "rgba(0,0,0,0)");
  shade.addColorStop(1, "rgba(0,0,0,0.38)");
  ctx.fillStyle = shade;
  ctx.fillRect(tx(0), ty(0), w, h);
}

/** The faint seam down the middle, which is what makes the two lanes legible. */
function paintLaneSeam(ctx: CanvasRenderingContext2D, view: Viewport): void {
  const { scale } = view;
  const tx = (x: number) => view.offsetX + x * scale;
  const ty = (y: number) => view.offsetY + y * scale;

  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.035)";
  ctx.lineWidth = Math.max(1, scale * 0.06);
  ctx.setLineDash([scale * 0.5, scale * 0.7]);
  ctx.beginPath();
  ctx.moveTo(tx(ARENA_WIDTH / 2), ty(0));
  ctx.lineTo(tx(ARENA_WIDTH / 2), ty(ARENA_HEIGHT));
  ctx.stroke();
  ctx.restore();
}

/** Water, with a lit surface band and darker banks. */
function paintRiver(ctx: CanvasRenderingContext2D, view: Viewport): void {
  const { scale } = view;
  const tx = (x: number) => view.offsetX + x * scale;
  const ty = (y: number) => view.offsetY + y * scale;

  const top = ty(RIVER_Y - RIVER_HALF_WIDTH);
  const depth = RIVER_HALF_WIDTH * 2 * scale;

  const water = ctx.createLinearGradient(0, top, 0, top + depth);
  water.addColorStop(0, FIELD.bank);
  water.addColorStop(0.22, FIELD.water);
  water.addColorStop(0.5, FIELD.waterLit);
  water.addColorStop(0.78, FIELD.water);
  water.addColorStop(1, FIELD.bank);
  ctx.fillStyle = water;
  ctx.fillRect(tx(0), top, ARENA_WIDTH * scale, depth);

  // A few horizontal glints, so the water reads as a surface.
  ctx.save();
  ctx.strokeStyle = "rgba(150, 200, 255, 0.10)";
  ctx.lineWidth = Math.max(1, scale * 0.05);
  for (let i = 0; i < 7; i += 1) {
    const x = 1 + i * 2.4;
    const y = RIVER_Y - 0.45 + ((i * 7) % 5) * 0.22;
    ctx.beginPath();
    ctx.moveTo(tx(x), ty(y));
    ctx.lineTo(tx(x + 1.3), ty(y));
    ctx.stroke();
  }
  ctx.restore();
}

/** One timber bridge, with planks and rails. */
function paintBridge(ctx: CanvasRenderingContext2D, view: Viewport, centre: number): void {
  const { scale } = view;
  const tx = (x: number) => view.offsetX + x * scale;
  const ty = (y: number) => view.offsetY + y * scale;

  const left = centre - BRIDGE_WIDTH / 2;
  // Overhangs the water onto both banks, which is what makes it look built
  // rather than painted on.
  const top = RIVER_Y - RIVER_HALF_WIDTH - 0.15;
  const bottom = RIVER_Y + RIVER_HALF_WIDTH + 0.15;

  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.fillRect(tx(left) + scale * 0.1, ty(top) + scale * 0.12, BRIDGE_WIDTH * scale, (bottom - top) * scale);

  ctx.fillStyle = FIELD.bridge;
  ctx.fillRect(tx(left), ty(top), BRIDGE_WIDTH * scale, (bottom - top) * scale);

  ctx.fillStyle = FIELD.bridgePlank;
  const planks = 9;
  const plankHeight = ((bottom - top) * scale) / planks;
  for (let i = 0; i < planks; i += 1) {
    if (i % 2 === 1) continue;
    ctx.fillRect(tx(left), ty(top) + i * plankHeight, BRIDGE_WIDTH * scale, plankHeight * 0.72);
  }

  ctx.fillStyle = FIELD.bridgeRail;
  const rail = Math.max(1.5, scale * 0.14);
  ctx.fillRect(tx(left) - rail / 2, ty(top), rail, (bottom - top) * scale);
  ctx.fillRect(tx(left + BRIDGE_WIDTH) - rail / 2, ty(top), rail, (bottom - top) * scale);
}
