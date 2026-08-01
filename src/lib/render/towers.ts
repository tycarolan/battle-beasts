/**
 * Towers, drawn as masonry.
 *
 * Six of these hold most of the screen for the whole battle, which makes them
 * the one thing on the field that cannot afford to be a coloured block. They are
 * also the only structures, so they carry the arena's entire sense of scale: if
 * a tower reads as a building, the beasts walking past it read as animals, and
 * if it reads as a rectangle they read as counters on a board.
 *
 * ## What makes it read as stone
 *
 * Four things, in order of how much they buy:
 *
 * 1. **Taper.** The shaft is narrower at the top than the bottom. Nothing else
 *    on this list matters if the silhouette is a rectangle.
 * 2. **An overhanging parapet.** The break between the shaft and the top is what
 *    turns a shape into a structure, and the shadow it casts down the shaft is
 *    what makes the overhang legible rather than merely wider.
 * 3. **Courses.** Horizontal mortar lines with staggered vertical joints. The
 *    stagger is the whole trick — an aligned grid reads as tile, and a wall that
 *    reads as tile reads as texture rather than as blocks.
 * 4. **Light from two directions at once.** Sides lit from the left, top faces
 *    lit from above. Real masonry does this and a single gradient cannot.
 *
 * ## Why it is cached
 *
 * A tower changes only when its hitpoints do, and hitpoints are drawn separately
 * on top. So the structure itself is rasterised once per side, kind, size and
 * dormancy — a handful of bitmaps for a whole battle — and the frame loop blits.
 * That is what lets a tower afford courses and joints at all: they are drawn
 * before the first frame, not sixty times a second.
 *
 * Nothing here reads or writes simulation state beyond what it is handed.
 */

import { FIELD, paletteFor, type SidePalette } from "./palette";

/** Something we can draw into and then draw from. */
type Raster = HTMLCanvasElement | OffscreenCanvas;

/** A rasterised tower, and the two anchors a caller needs to place it. */
export type TowerSprite = {
  raster: Raster;
  width: number;
  height: number;
  /**
   * The row in the raster that lines up with the tower's footprint centre.
   *
   * Towers are drawn upward from their base, so the raster cannot simply be
   * centred on the entity — the sprite is mostly above the point it stands on.
   */
  groundY: number;
  /** The topmost drawn row, so a health bar can sit above the crenellations. */
  crownY: number;
};

const cache = new Map<string, TowerSprite>();

/** Drop every rasterised tower. Called when the canvas scale changes. */
export function clearTowerCache(): void {
  cache.clear();
}

/**
 * A tower, ready to blit.
 *
 * `footprint` is the diameter of the tower's collision circle in device pixels.
 * Everything else is proportional to it, so the whole structure scales with the
 * arena and no measurement here is in absolute pixels.
 */
export function towerSprite(
  kind: "princess" | "king",
  side: 0 | 1,
  footprint: number,
  dormant: boolean,
): TowerSprite | null {
  const w = Math.max(12, Math.round(footprint / 2) * 2);
  const key = `${kind}:${side}:${w}:${dormant ? "d" : "a"}`;

  const existing = cache.get(key);
  if (existing) return existing;

  const sprite = rasterise(kind, paletteFor(side), w, dormant);
  if (sprite) cache.set(key, sprite);
  return sprite;
}

/**
 * Every proportion the tower is built from, all in multiples of the footprint.
 *
 * ## The height budget, which is not a style choice
 *
 * A tower is drawn upward from the ground it stands on, and the king stands
 * three tiles from its end of the arena. Its whole structure therefore has to
 * fit inside those three tiles or it renders off the top of the field — so the
 * totals below are a constraint the arena imposes, not a look. Everything sums
 * to under one footprint diameter of height for that reason.
 *
 * Which leaves width, not height, to say king. It is a fifth wider than a
 * princess tower, carries five merlons against four, and flies a gold crown
 * instead of a pale diamond. Three cues that cost no vertical room at all.
 *
 * ## Why the stone is narrower than the footprint
 *
 * Drawn at its full collision diameter, a tower under that height budget comes
 * out wider than it is tall, which is a gatehouse rather than a tower — and no
 * amount of masonry detail rescues a silhouette that is the wrong shape. So the
 * drawn width is about three quarters of the footprint, exactly as a beast's
 * drawn height is decoupled from its collision radius and for the same reason:
 * how much room a body occupies and how big it looks are separate questions.
 * The footprint still decides what can be hit; this only decides what is seen.
 */
function geometry(kind: "princess" | "king", w: number) {
  const king = kind === "king";
  return {
    plinthWidth: w * 0.9,
    plinthHeight: w * 0.1,
    shaftBottom: w * 0.74,
    shaftTop: w * 0.62,
    // The king's shaft is shorter than a princess tower's *as a fraction*, and
    // still taller in absolute terms because its footprint is a fifth wider.
    // The budget above is what forces that: the king's own health bar has to
    // fit between its crown and the end of the arena.
    shaftHeight: king ? w * 0.52 : w * 0.56,
    parapetWidth: w * 0.86,
    parapetHeight: king ? w * 0.14 : w * 0.13,
    merlonHeight: king ? w * 0.14 : w * 0.13,
    merlons: king ? 5 : 4,
    /** How far the base sits below the footprint centre, so the tower grounds. */
    drop: w * 0.34,
    /** Room above the crenellations, for the king's crown. */
    headroom: king ? w * 0.19 : w * 0.06,
    /** How far the crown reaches above the crenellations. Zero for a princess. */
    crownRise: king ? w * 0.15 : 0,
    /** Room below the base, for the footprint shadow. */
    underroom: w * 0.22,
  };
}

function rasterise(
  kind: "princess" | "king",
  palette: SidePalette,
  w: number,
  dormant: boolean,
): TowerSprite | null {
  const g = geometry(kind, w);
  const structure = g.plinthHeight + g.shaftHeight + g.parapetHeight + g.merlonHeight;

  const width = Math.ceil(w * 1.36);
  const height = Math.ceil(structure + g.headroom + g.underroom);
  const cx = width / 2;
  const baseY = g.headroom + structure;
  const groundY = baseY - g.drop;
  // The topmost drawn row, crown included — a health bar hung off the
  // crenellations would sit straight through a king's crown.
  const crownY = g.headroom - g.crownRise;

  const canvas = createRaster(width, height);
  const ctx = canvas.getContext("2d") as CanvasRenderingContext2D | null;
  if (!ctx) return null;

  ctx.lineJoin = "round";

  paintFootprint(ctx, cx, baseY, w);

  const shaftBottomY = baseY - g.plinthHeight;
  const shaftTopY = shaftBottomY - g.shaftHeight;
  const parapetTopY = shaftTopY - g.parapetHeight;

  paintPlinth(ctx, cx, baseY, g);
  paintShaft(ctx, cx, shaftBottomY, shaftTopY, g, w);
  paintBanner(ctx, cx, shaftTopY, palette, kind, g, w);
  paintParapet(ctx, cx, shaftTopY, parapetTopY, g);
  paintMerlons(ctx, cx, parapetTopY, g);
  if (kind === "king") paintCrown(ctx, cx, parapetTopY - g.merlonHeight, g, palette, w);

  // A dormant king is present but not participating, and the difference has to
  // be visible at a glance without the tower disappearing — a king you cannot
  // see is a king you forget is the thing that ends the battle. Darkening only
  // the pixels already drawn keeps its silhouette exactly as sharp as an awake
  // tower's while draining the light out of it.
  if (dormant) {
    ctx.save();
    ctx.globalCompositeOperation = "source-atop";
    ctx.fillStyle = "rgba(8, 11, 16, 0.52)";
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }

  return { raster: canvas, width, height, groundY, crownY };
}

/** The shadow the tower sits in, which is what stops it floating on the turf. */
function paintFootprint(ctx: CanvasRenderingContext2D, cx: number, baseY: number, w: number): void {
  const shade = ctx.createRadialGradient(cx, baseY, w * 0.05, cx, baseY, w * 0.6);
  shade.addColorStop(0, "rgba(0,0,0,0.6)");
  shade.addColorStop(1, "rgba(0,0,0,0)");
  ctx.save();
  ctx.translate(cx, baseY);
  ctx.scale(1, 0.32);
  ctx.translate(-cx, -baseY);
  ctx.fillStyle = shade;
  ctx.beginPath();
  ctx.arc(cx, baseY, w * 0.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** The base course: wider than the shaft, and the only part that meets the ground. */
function paintPlinth(
  ctx: CanvasRenderingContext2D,
  cx: number,
  baseY: number,
  g: ReturnType<typeof geometry>,
): void {
  const bottom = g.plinthWidth;
  const top = g.plinthWidth * 0.93;
  const topY = baseY - g.plinthHeight;

  const face = ctx.createLinearGradient(cx - bottom / 2, 0, cx + bottom / 2, 0);
  face.addColorStop(0, FIELD.stone);
  face.addColorStop(0.5, FIELD.stoneDark);
  face.addColorStop(1, "#1a1f28");
  ctx.fillStyle = face;
  trapezoid(ctx, cx, topY, top, baseY, bottom);
  ctx.fill();

  // The lit top surface, which is what says the plinth is a step rather than a
  // painted band.
  ctx.fillStyle = FIELD.stone;
  ctx.fillRect(cx - top / 2, topY, top, Math.max(1, g.plinthHeight * 0.16));
}

/** The body, with its courses. */
function paintShaft(
  ctx: CanvasRenderingContext2D,
  cx: number,
  bottomY: number,
  topY: number,
  g: ReturnType<typeof geometry>,
  w: number,
): void {
  ctx.save();
  trapezoid(ctx, cx, topY, g.shaftTop, bottomY, g.shaftBottom);
  ctx.clip();

  const face = ctx.createLinearGradient(cx - g.shaftBottom / 2, 0, cx + g.shaftBottom / 2, 0);
  face.addColorStop(0, FIELD.stoneLit);
  face.addColorStop(0.42, FIELD.stone);
  face.addColorStop(1, FIELD.stoneDark);
  ctx.fillStyle = face;
  ctx.fillRect(cx - g.shaftBottom, topY, g.shaftBottom * 2, bottomY - topY);

  paintCourses(ctx, cx, bottomY, topY, g, w);
  paintSlits(ctx, cx, topY, w);

  // The parapet's shadow, thrown down the top of the shaft. Drawn inside the
  // clip so it stops exactly at the taper rather than at a rectangle's edge.
  const cast = ctx.createLinearGradient(0, topY, 0, topY + w * 0.26);
  cast.addColorStop(0, "rgba(0,0,0,0.5)");
  cast.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = cast;
  ctx.fillRect(cx - g.shaftBottom, topY, g.shaftBottom * 2, w * 0.26);

  ctx.restore();

  // A dark edge down the shaded side, so the taper is visible against dark turf.
  ctx.strokeStyle = "rgba(0,0,0,0.4)";
  ctx.lineWidth = Math.max(1, w * 0.02);
  ctx.beginPath();
  ctx.moveTo(cx + g.shaftTop / 2, topY);
  ctx.lineTo(cx + g.shaftBottom / 2, bottomY);
  ctx.stroke();
}

/**
 * Horizontal courses with staggered vertical joints.
 *
 * The stagger is the point. Joints that line up read as tiling, and tiling reads
 * as a texture laid over a shape; offsetting every other course is what makes
 * the same number of lines read as stacked blocks instead.
 */
function paintCourses(
  ctx: CanvasRenderingContext2D,
  cx: number,
  bottomY: number,
  topY: number,
  g: ReturnType<typeof geometry>,
  w: number,
): void {
  const courseHeight = w * 0.115;
  const blockWidth = w * 0.26;
  const line = Math.max(1, w * 0.016);

  ctx.strokeStyle = FIELD.mortar;
  ctx.lineWidth = line;

  let row = 0;
  for (let y = bottomY - courseHeight; y > topY; y -= courseHeight) {
    ctx.beginPath();
    ctx.moveTo(cx - g.shaftBottom, y);
    ctx.lineTo(cx + g.shaftBottom, y);
    ctx.stroke();

    // A hairline of light on the block below each joint — the top face of the
    // course catching the same overhead light the parapet does.
    ctx.strokeStyle = "rgba(255,255,255,0.05)";
    ctx.beginPath();
    ctx.moveTo(cx - g.shaftBottom, y + line);
    ctx.lineTo(cx + g.shaftBottom, y + line);
    ctx.stroke();
    ctx.strokeStyle = FIELD.mortar;

    const offset = row % 2 === 0 ? 0 : blockWidth / 2;
    for (let x = cx - g.shaftBottom + offset; x < cx + g.shaftBottom; x += blockWidth) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y + courseHeight);
      ctx.stroke();
    }
    row += 1;
  }
}

/** Two arrow slits. The only openings, and the only true black on the structure. */
function paintSlits(ctx: CanvasRenderingContext2D, cx: number, topY: number, w: number): void {
  const slitWidth = Math.max(1.5, w * 0.05);
  const slitHeight = w * 0.15;
  const y = topY + w * 0.16;

  for (const dx of [-w * 0.16, w * 0.16]) {
    ctx.fillStyle = "#0b0e14";
    ctx.beginPath();
    ctx.roundRect(cx + dx - slitWidth / 2, y, slitWidth, slitHeight, slitWidth / 2);
    ctx.fill();
    // A lit sill under each, so the opening reads as cut into a thickness.
    ctx.fillStyle = "rgba(255,255,255,0.09)";
    ctx.fillRect(cx + dx - slitWidth / 2, y + slitHeight, slitWidth, Math.max(1, w * 0.02));
  }
}

/** The overhanging band the crenellations stand on. */
function paintParapet(
  ctx: CanvasRenderingContext2D,
  cx: number,
  bottomY: number,
  topY: number,
  g: ReturnType<typeof geometry>,
): void {
  const width = g.parapetWidth;
  const left = cx - width / 2;

  const face = ctx.createLinearGradient(left, 0, left + width, 0);
  face.addColorStop(0, FIELD.stoneLit);
  face.addColorStop(0.45, FIELD.stone);
  face.addColorStop(1, FIELD.stoneDark);
  ctx.fillStyle = face;
  ctx.fillRect(left, topY, width, bottomY - topY);

  // The underside of the overhang, in shadow because it faces the ground.
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.fillRect(left, bottomY - (bottomY - topY) * 0.22, width, (bottomY - topY) * 0.22);

  // The top face, lit from above.
  ctx.fillStyle = FIELD.stoneTop;
  ctx.fillRect(left, topY, width, Math.max(1, (bottomY - topY) * 0.17));
}

/** Crenellations, with the gaps between them left open to the dark. */
function paintMerlons(
  ctx: CanvasRenderingContext2D,
  cx: number,
  parapetTopY: number,
  g: ReturnType<typeof geometry>,
): void {
  const span = g.parapetWidth;
  const left = cx - span / 2;
  const merlonWidth = span / (g.merlons * 2 - 1);
  const height = g.merlonHeight;

  for (let i = 0; i < g.merlons; i += 1) {
    const x = left + i * merlonWidth * 2;
    const face = ctx.createLinearGradient(x, 0, x + merlonWidth, 0);
    face.addColorStop(0, FIELD.stone);
    face.addColorStop(1, FIELD.stoneDark);
    ctx.fillStyle = face;
    ctx.fillRect(x, parapetTopY - height, merlonWidth, height);

    ctx.fillStyle = FIELD.stoneTop;
    ctx.fillRect(x, parapetTopY - height, merlonWidth, Math.max(1, height * 0.22));
  }
}

/**
 * The banner, and the only place a side's colour appears on a tower.
 *
 * It hangs on the shaft rather than colouring the stone, because two armies
 * built the same keep and only the flag over it differs — and because a
 * saturated shape on grey reads as ownership from further away than a tinted
 * structure does.
 */
function paintBanner(
  ctx: CanvasRenderingContext2D,
  cx: number,
  shaftTopY: number,
  palette: SidePalette,
  kind: "princess" | "king",
  g: ReturnType<typeof geometry>,
  w: number,
): void {
  const width = w * 0.3;
  // Hangs most of the shaft but never reaches the plinth, so the stone it is
  // pinned to stays visible under it.
  const height = g.shaftHeight * 0.66;
  const top = shaftTopY + w * 0.04;
  const left = cx - width / 2;
  const notch = height * 0.2;

  ctx.save();

  ctx.beginPath();
  ctx.moveTo(left, top);
  ctx.lineTo(left + width, top);
  ctx.lineTo(left + width, top + height - notch);
  ctx.lineTo(cx, top + height);
  ctx.lineTo(left, top + height - notch);
  ctx.closePath();

  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.save();
  ctx.translate(w * 0.035, w * 0.03);
  ctx.fill();
  ctx.restore();

  const cloth = ctx.createLinearGradient(left, 0, left + width, 0);
  cloth.addColorStop(0, palette.base);
  cloth.addColorStop(0.55, palette.dark);
  cloth.addColorStop(1, palette.detail);
  ctx.fillStyle = cloth;
  ctx.fill();

  // A fold down the middle. One is enough to say cloth; more says corrugation.
  ctx.strokeStyle = "rgba(0,0,0,0.22)";
  ctx.lineWidth = Math.max(1, w * 0.02);
  ctx.beginPath();
  ctx.moveTo(cx + width * 0.14, top);
  ctx.lineTo(cx + width * 0.14, top + height - notch * 0.6);
  ctx.stroke();

  ctx.fillStyle = kind === "king" ? palette.accent : palette.light;
  const m = width * 0.19;
  const my = top + height * 0.38;
  ctx.beginPath();
  ctx.moveTo(cx, my - m);
  ctx.lineTo(cx + m, my);
  ctx.lineTo(cx, my + m);
  ctx.lineTo(cx - m, my);
  ctx.closePath();
  ctx.fill();

  ctx.restore();

  // The rail it hangs from, drawn last so it sits over the cloth.
  ctx.fillStyle = FIELD.stoneTop;
  ctx.fillRect(left - w * 0.04, top - w * 0.035, width + w * 0.08, Math.max(1.5, w * 0.045));
}

/**
 * The king's crown.
 *
 * The thing that ends the battle should not be told apart from its neighbours by
 * size alone — at a glance, across a phone screen, a fifth of a tile of extra
 * height is not a distinction.
 */
function paintCrown(
  ctx: CanvasRenderingContext2D,
  cx: number,
  merlonTopY: number,
  g: ReturnType<typeof geometry>,
  palette: SidePalette,
  w: number,
): void {
  const width = w * 0.36;
  // Overlaps the crenellations rather than floating above them, which keeps the
  // king inside the height the arena leaves it.
  const overlap = w * 0.06;
  const bottom = merlonTopY + overlap;
  const height = g.crownRise + overlap;
  const left = cx - width / 2;

  // Three points with deep notches between them. Shallower notches turn into a
  // trapezoid at the size this is actually seen at, and a trapezoid is a hat.
  ctx.beginPath();
  ctx.moveTo(left, bottom);
  ctx.lineTo(left, bottom - height * 0.44);
  ctx.lineTo(left + width * 0.2, bottom - height);
  ctx.lineTo(left + width * 0.35, bottom - height * 0.42);
  ctx.lineTo(cx, bottom - height);
  ctx.lineTo(left + width * 0.65, bottom - height * 0.42);
  ctx.lineTo(left + width * 0.8, bottom - height);
  ctx.lineTo(left + width, bottom - height * 0.44);
  ctx.lineTo(left + width, bottom);
  ctx.closePath();

  ctx.fillStyle = palette.accent;
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.5)";
  ctx.lineWidth = Math.max(1, w * 0.02);
  ctx.lineJoin = "miter";
  ctx.stroke();

  // The band, which is what separates the points from each other.
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.fillRect(left, bottom - height * 0.2, width, height * 0.17);
}

/** A four-cornered shape wider at the bottom than the top. */
function trapezoid(
  ctx: CanvasRenderingContext2D,
  cx: number,
  topY: number,
  topWidth: number,
  bottomY: number,
  bottomWidth: number,
): void {
  ctx.beginPath();
  ctx.moveTo(cx - topWidth / 2, topY);
  ctx.lineTo(cx + topWidth / 2, topY);
  ctx.lineTo(cx + bottomWidth / 2, bottomY);
  ctx.lineTo(cx - bottomWidth / 2, bottomY);
  ctx.closePath();
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
