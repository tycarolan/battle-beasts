/**
 * Turning a design into pixels, once.
 *
 * Re-tracing forty animals' worth of vector paths sixty times a second is the
 * obvious way to build this and the wrong one — path filling is expensive and
 * nothing about a beast changes between frames. So every design is rasterised
 * once per side per size into its own small canvas, and the frame loop does
 * nothing but blit.
 *
 * The cache is keyed on the rounded pixel size, so a device that resizes gets
 * one fresh raster per beast rather than one per frame. Sizes are snapped to
 * even numbers to keep that set small — a sprite drawn at 27 versus 28 pixels is
 * not a distinction anyone can see.
 */

import { designFor, type Design, type Layer } from "./beasts";
import { paletteFor, type SidePalette } from "./palette";

/** Something we can draw into and then draw from. */
type Raster = HTMLCanvasElement | OffscreenCanvas;

const cache = new Map<string, Raster>();

/**
 * A rasterised beast, ready to blit.
 *
 * `size` is the sprite's full height in device pixels. The design's own `fill`
 * decides how much of that the animal actually occupies, which is what keeps a
 * rhino visibly larger than a grub without either design being redrawn.
 */
export function spriteFor(cardId: number, side: 0 | 1, size: number): Raster | null {
  const design = designFor(cardId);
  if (!design) return null;

  const snapped = Math.max(8, Math.round(size / 2) * 2);
  const key = `${cardId}:${side}:${snapped}`;

  const existing = cache.get(key);
  if (existing) return existing;

  const raster = rasterise(design, paletteFor(side), snapped);
  if (raster) cache.set(key, raster);
  return raster;
}

/** Paint one design at one size. */
function rasterise(design: Design, palette: SidePalette, size: number): Raster | null {
  const canvas = createRaster(size, size);
  const ctx = canvas.getContext("2d") as CanvasRenderingContext2D | null;
  if (!ctx) return null;

  // Designs are authored in a 100×100 box. Scale into the raster, and inset a
  // little so a stroked edge cannot clip against the bitmap's border.
  const inset = size * 0.04;
  const scale = ((size - inset * 2) / 100) * design.fill;
  const offsetX = (size - 100 * scale) / 2;
  const offsetY = size - inset - 100 * scale;

  ctx.save();
  ctx.translate(offsetX, offsetY);
  ctx.scale(scale, scale);
  ctx.lineJoin = "round";

  // An outline pass first: every path stroked heavily in near-black, so the
  // fills land on top of a dark rim. This is the single change that makes a
  // beast separate from the turf — without it a mid-blue animal on a dark blue
  // field is a smudge, however good the drawing underneath is.
  ctx.strokeStyle = palette.outline;
  ctx.lineCap = "round";
  for (const shape of design.shapes) {
    ctx.lineWidth = (shape.stroke ?? 0) + 9;
    ctx.stroke(new Path2D(shape.d));
  }

  for (const shape of design.shapes) {
    const colour = colourFor(shape.layer, palette);
    const path = new Path2D(shape.d);

    if (shape.stroke) {
      ctx.strokeStyle = colour;
      ctx.lineWidth = shape.stroke;
      ctx.lineCap = shape.butt ? "butt" : "round";
      ctx.stroke(path);
    } else {
      ctx.fillStyle = colour;
      ctx.fill(path);
    }
  }

  ctx.restore();
  return canvas;
}

function colourFor(layer: Layer, palette: SidePalette): string {
  switch (layer) {
    case "dark":
      return palette.dark;
    case "base":
      return palette.base;
    case "light":
      return palette.light;
    case "detail":
      return palette.detail;
    case "accent":
      return palette.accent;
  }
}

function createRaster(width: number, height: number): Raster {
  if (typeof OffscreenCanvas !== "undefined") {
    return new OffscreenCanvas(width, height);
  }
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

/**
 * Draw a design straight to a context at an arbitrary box, bypassing the cache.
 *
 * For the card faces, which are drawn once on a state change rather than per
 * frame, and which want a size the field never asks for.
 */
export function paintDesign(
  ctx: CanvasRenderingContext2D,
  cardId: number,
  side: 0 | 1,
  x: number,
  y: number,
  size: number,
): void {
  const design = designFor(cardId);
  if (!design) return;

  const palette = paletteFor(side);
  const scale = (size / 100) * design.fill;

  ctx.save();
  ctx.translate(x + (size - 100 * scale) / 2, y + size - 100 * scale);
  ctx.scale(scale, scale);
  ctx.lineJoin = "round";

  for (const shape of design.shapes) {
    const colour = colourFor(shape.layer, palette);
    const path = new Path2D(shape.d);
    if (shape.stroke) {
      ctx.strokeStyle = colour;
      ctx.lineWidth = shape.stroke;
      ctx.lineCap = shape.butt ? "butt" : "round";
      ctx.stroke(path);
    } else {
      ctx.fillStyle = colour;
      ctx.fill(path);
    }
  }

  ctx.restore();
}

/** Drop every rasterised sprite. Called when the canvas scale changes. */
export function clearSpriteCache(): void {
  cache.clear();
}
