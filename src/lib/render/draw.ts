/**
 * Drawing a battle.
 *
 * Holds no rules. It reads a state and paints it, and could be deleted without
 * changing a single outcome — which is the property that keeps the simulation
 * honest, because anything the renderer is allowed to decide is something two
 * machines could decide differently.
 *
 * Three layers, cheapest first: the field, blitted from a bitmap painted once;
 * the towers, which are few; and the units, each a cached sprite blitted with a
 * shadow. Nothing here traces a vector path per frame.
 */

import {
  ARENA_HEIGHT,
  ARENA_WIDTH,
  RIVER_HALF_WIDTH,
  RIVER_Y,
} from "../arena";
import type { Entity } from "../sim/entities";
import type { BattleState } from "../sim/state";
import { FIELD, paletteFor } from "./palette";
import { designFor } from "./beasts";
import { drawFeedback, type Feedback } from "./feedback";
import { spriteFor } from "./sprites";
import type { Viewport } from "./field";

export { fitViewport, toTiles, paintField, type Viewport } from "./field";

/** Positions from the previous tick, so movement can be smoothed between them. */
export type Trail = Map<number, { x: number; y: number }>;

/**
 * Paint one frame over an already-blitted field.
 *
 * `alpha` is how far between the last simulation tick and the next this frame
 * sits. It is passed in rather than measured here, and it never travels back
 * into the simulation.
 */
export function draw(
  ctx: CanvasRenderingContext2D,
  state: BattleState,
  view: Viewport,
  previous: Trail,
  alpha: number,
  showDeployZone: boolean,
  feedback?: Feedback,
): void {
  const tx = (x: number) => view.offsetX + x * view.scale;
  const ty = (y: number) => view.offsetY + y * view.scale;

  if (showDeployZone) paintDeployZone(ctx, state, view);

  for (const entity of state.entities) {
    if (entity.kind === "tower") drawTower(ctx, entity, tx, ty, view.scale);
  }

  // Sorted by depth so a unit nearer the bottom of the screen overlaps one
  // behind it, which is what stops a crowd reading as a flat scatter.
  const units = state.entities
    .filter((e) => e.kind !== "tower")
    .map((e) => ({ entity: e, at: smooth(e, previous, alpha) }))
    .sort((a, b) => a.at.y - b.at.y);

  for (const { entity, at } of units) drawUnit(ctx, entity, at, tx, ty, view.scale);

  for (const shot of state.projectiles) {
    const palette = paletteFor(shot.side);
    const r = Math.max(1.6, view.scale * 0.13);
    ctx.fillStyle = palette.accent;
    ctx.beginPath();
    ctx.arc(tx(shot.x), ty(shot.y), r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255, 212, 121, 0.28)";
    ctx.beginPath();
    ctx.arc(tx(shot.x), ty(shot.y), r * 2.1, 0, Math.PI * 2);
    ctx.fill();
  }

  if (feedback) drawFeedback(ctx, feedback, tx, ty, view.scale);
}

/** Where to draw something, between where it was and where it is. */
function smooth(entity: Entity, previous: Trail, alpha: number): { x: number; y: number } {
  const was = previous.get(entity.id);
  if (!was) return { x: entity.x, y: entity.y };
  return {
    x: was.x + (entity.x - was.x) * alpha,
    y: was.y + (entity.y - was.y) * alpha,
  };
}

/** The half of the arena a tap would land in, shown only while a card is held. */
function paintDeployZone(ctx: CanvasRenderingContext2D, state: BattleState, view: Viewport): void {
  const tx = (x: number) => view.offsetX + x * view.scale;
  const ty = (y: number) => view.offsetY + y * view.scale;
  const top = RIVER_Y + RIVER_HALF_WIDTH;

  ctx.fillStyle = FIELD.legal;
  ctx.fillRect(tx(0), ty(top), ARENA_WIDTH * view.scale, (ARENA_HEIGHT - top) * view.scale);

  ctx.strokeStyle = FIELD.legalEdge;
  ctx.lineWidth = Math.max(1, view.scale * 0.08);
  ctx.setLineDash([view.scale * 0.6, view.scale * 0.4]);
  ctx.beginPath();
  ctx.moveTo(tx(0), ty(top));
  ctx.lineTo(tx(ARENA_WIDTH), ty(top));
  ctx.stroke();
  ctx.setLineDash([]);

  // The far half opens lane by lane as enemy towers fall.
  for (const lane of state.sides[0].openedLanes) {
    const left = lane === "left" ? 0 : ARENA_WIDTH / 2;
    ctx.fillStyle = FIELD.legal;
    ctx.fillRect(
      tx(left),
      ty(0),
      (ARENA_WIDTH / 2) * view.scale,
      (RIVER_Y - RIVER_HALF_WIDTH) * view.scale,
    );
  }
}

/**
 * A tower.
 *
 * Drawn as a stone keep rather than a coloured block: a shadowed base, a lit
 * face, crenellations along the top, and the owner's colour carried on a banner
 * band so that the structure reads as masonry and the side reads as a side.
 */
function drawTower(
  ctx: CanvasRenderingContext2D,
  tower: Entity,
  tx: (x: number) => number,
  ty: (y: number) => number,
  scale: number,
): void {
  const palette = paletteFor(tower.side);
  const half = tower.stats.radius * scale;
  const cx = tx(tower.x);
  const cy = ty(tower.y);
  const left = cx - half;
  const top = cy - half;
  const size = half * 2;

  ctx.save();
  if (tower.dormant) ctx.globalAlpha = 0.5;

  // Footprint shadow.
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.beginPath();
  ctx.ellipse(cx, cy + half * 0.92, half * 1.05, half * 0.34, 0, 0, Math.PI * 2);
  ctx.fill();

  // Body, lit from the left.
  const stone = ctx.createLinearGradient(left, 0, left + size, 0);
  stone.addColorStop(0, FIELD.stoneLit);
  stone.addColorStop(0.55, FIELD.stone);
  stone.addColorStop(1, FIELD.stoneDark);
  ctx.fillStyle = stone;
  ctx.fillRect(left, top + size * 0.18, size, size * 0.82);

  // Crenellations.
  const merlons = 4;
  const merlonWidth = size / (merlons * 2 - 1);
  ctx.fillStyle = FIELD.stone;
  for (let i = 0; i < merlons; i += 1) {
    ctx.fillRect(left + i * merlonWidth * 2, top, merlonWidth, size * 0.26);
  }

  // The owner's band.
  ctx.fillStyle = palette.base;
  ctx.fillRect(left, top + size * 0.44, size, size * 0.17);
  ctx.fillStyle = palette.dark;
  ctx.fillRect(left, top + size * 0.575, size, size * 0.04);

  // A king carries a mark, so the thing that ends the battle is never ambiguous.
  if (tower.towerKind === "king") {
    ctx.fillStyle = palette.light;
    const m = size * 0.17;
    ctx.beginPath();
    ctx.moveTo(cx, cy + size * 0.08 - m);
    ctx.lineTo(cx + m, cy + size * 0.08);
    ctx.lineTo(cx, cy + size * 0.08 + m);
    ctx.lineTo(cx - m, cy + size * 0.08);
    ctx.closePath();
    ctx.fill();
  }

  ctx.restore();

  healthBar(ctx, cx, top - scale * 0.42, size * 0.86, tower.hp / tower.maxHp, scale);
}

/**
 * A unit.
 *
 * A cached sprite, a soft ground shadow, and two marks that carry the only two
 * facts you must be able to read instantly: whether it is still landing, and
 * whether it will walk straight past your defenders.
 */
function drawUnit(
  ctx: CanvasRenderingContext2D,
  unit: Entity,
  at: { x: number; y: number },
  tx: (x: number) => number,
  ty: (y: number) => number,
  scale: number,
): void {
  const palette = paletteFor(unit.side);
  const px = tx(at.x);
  const py = ty(at.y);

  // Sized from the design's own drawn height, not from the collision radius.
  // The two are different questions: how much room a body takes up, and how big
  // it needs to look. Deriving one from the other made every unit a dot.
  const design = designFor(unit.cardId);
  const size = Math.max(20, (design?.tall ?? 1.6) * 1.25 * scale);
  const flying = unit.stats.flies;
  const lift = flying ? size * 0.3 : 0;

  ctx.save();
  if (unit.deploying > 0) ctx.globalAlpha = 0.45;

  // Shadow. A flyer's is smaller and further away, which is what sells height.
  ctx.fillStyle = palette.shadow;
  ctx.beginPath();
  ctx.ellipse(
    px,
    py + size * 0.06,
    size * (flying ? 0.22 : 0.34),
    size * (flying ? 0.08 : 0.14),
    0,
    0,
    Math.PI * 2,
  );
  ctx.fill();

  const sprite = spriteFor(unit.cardId, unit.side, size);
  if (sprite) {
    ctx.drawImage(sprite as CanvasImageSource, px - size / 2, py - size + size * 0.12 - lift, size, size);
  } else {
    ctx.fillStyle = palette.base;
    ctx.beginPath();
    ctx.arc(px, py - size * 0.4, size * 0.32, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();

  // Walks past your troops. This is the single most important thing to read on
  // the field, so it is a mark on the ground rather than an outline on the body
  // — an outline disappears against a busy sprite, a ring on bare turf does not.
  if (unit.stats.targets === "buildings" && unit.deploying === 0) {
    ctx.save();
    ctx.strokeStyle = palette.light;
    ctx.globalAlpha = 0.85;
    ctx.lineWidth = Math.max(1.2, scale * 0.07);
    ctx.setLineDash([scale * 0.22, scale * 0.18]);
    ctx.beginPath();
    ctx.ellipse(px, py + size * 0.06, size * 0.42, size * 0.17, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // A landing unit shows a ring closing in, so the deploy delay is something you
  // can time rather than something you learn by dying to it.
  if (unit.deploying > 0) {
    const progress = 1 - unit.deploying / 20;
    ctx.save();
    ctx.strokeStyle = palette.light;
    ctx.globalAlpha = 0.7;
    ctx.lineWidth = Math.max(1.2, scale * 0.06);
    ctx.beginPath();
    ctx.arc(px, py - size * 0.3, size * 0.6 * (1 - progress) + size * 0.2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  if (unit.hp < unit.maxHp) {
    healthBar(ctx, px, py - size - lift + size * 0.06, size * 0.78, unit.hp / unit.maxHp, scale);
  }
}

/**
 * A health bar.
 *
 * Three bands rather than two: full, hurt, nearly gone. The middle one is what
 * tells you a trade is going your way while it is still going.
 */
function healthBar(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  width: number,
  fraction: number,
  scale: number,
): void {
  const clamped = Math.max(0, Math.min(1, fraction));
  const height = Math.max(3, scale * 0.13);
  const left = cx - width / 2;
  const radius = height / 2;

  // A dark trough with a rounded cap, so the bar reads as an object sitting on
  // the field rather than as a rectangle painted over it.
  ctx.fillStyle = FIELD.hpTrack;
  roundedBar(ctx, left - 1, cy - 1, width + 2, height + 2, radius + 1);

  if (clamped > 0) {
    ctx.fillStyle = clamped > 0.6 ? FIELD.hp : clamped > 0.28 ? FIELD.hpHurt : FIELD.hpLow;
    roundedBar(ctx, left, cy, Math.max(width * clamped, height), height, radius);
  }
}

function roundedBar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  const r = Math.min(radius, height / 2, width / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.arcTo(x + width, y, x + width, y + r, r);
  ctx.lineTo(x + width, y + height - r);
  ctx.arcTo(x + width, y + height, x + width - r, y + height, r);
  ctx.lineTo(x + r, y + height);
  ctx.arcTo(x, y + height, x, y + height - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
  ctx.fill();
}
