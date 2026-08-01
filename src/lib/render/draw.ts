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
import { towerSprite } from "./towers";
import type { Viewport } from "./field";

export { fitViewport, toTiles, paintField, type Viewport } from "./field";

/** Positions from the previous tick, so movement can be smoothed between them. */
export type Trail = Map<number, { x: number; y: number }>;

/**
 * Paint one frame over an already-blitted field.
 *
 * `alpha` is how far between the last simulation tick and the next this frame
 * sits, and `time` is seconds of wall clock since the loop started. Both are
 * passed in rather than measured here, and neither travels back into the
 * simulation — `time` in particular exists only so that animation has something
 * continuous to run on, and a machine that passed a constant would still resolve
 * the identical battle with everything standing perfectly still.
 */
export function draw(
  ctx: CanvasRenderingContext2D,
  state: BattleState,
  view: Viewport,
  previous: Trail,
  alpha: number,
  time: number,
  showDeployZone: boolean,
  feedback?: Feedback,
): void {
  const tx = (x: number) => view.offsetX + x * view.scale;
  const ty = (y: number) => view.offsetY + y * view.scale;

  if (showDeployZone) paintDeployZone(ctx, state, view);

  for (const entity of state.entities) {
    if (entity.kind === "tower") drawTower(ctx, entity, tx, ty, view.scale);
  }

  // Positions of everything, so a unit can be drawn leaning toward what it is
  // hitting and a shot can be drawn travelling toward what it was fired at.
  const positions = new Map(
    state.entities.map((e) => [e.id, smooth(e, previous, alpha)] as const),
  );

  // Sorted by depth so a unit nearer the bottom of the screen overlaps one
  // behind it, which is what stops a crowd reading as a flat scatter.
  const units = state.entities
    .filter((e) => e.kind !== "tower")
    .map((e) => ({
      entity: e,
      at: positions.get(e.id) ?? { x: e.x, y: e.y },
      moving: movedLastTick(e, previous),
    }))
    .sort((a, b) => a.at.y - b.at.y);

  for (const { entity, at, moving } of units) {
    drawUnit(ctx, entity, at, positions, moving, time, tx, ty, view.scale);
  }

  drawProjectiles(ctx, state, positions, feedback, tx, ty, view.scale);

  if (feedback) drawFeedback(ctx, feedback, tx, ty, view.scale);
}

/**
 * Shots, drawn in flight.
 *
 * The simulation does not move a projectile: it fires one, counts down, and
 * applies the damage where the target is standing when the count reaches zero.
 * That is the right model — a shot bound to its target is what makes overkill
 * real — but drawn literally it puts a dot on the archer for the whole flight
 * and then nothing at all, which reads as a bug rather than as an arrow.
 *
 * So the flight is the renderer's, interpolated from where the shot was fired to
 * wherever its target is now. The arrival is the simulation's and lands on the
 * same tick either way.
 */
function drawProjectiles(
  ctx: CanvasRenderingContext2D,
  state: BattleState,
  positions: Map<number, { x: number; y: number }>,
  feedback: Feedback | undefined,
  tx: (x: number) => number,
  ty: (y: number) => number,
  scale: number,
): void {
  for (const shot of state.projectiles) {
    const palette = paletteFor(shot.side);
    const launch = feedback?.shotLaunch(shot.id);
    const target = positions.get(shot.targetId);

    let x = shot.x;
    let y = shot.y;
    let dx = 0;
    let dy = 0;

    if (launch && target && launch.travel > 0) {
      const progress = Math.max(0, Math.min(1, 1 - shot.remaining / launch.travel));
      x = launch.x + (target.x - launch.x) * progress;
      y = launch.y + (target.y - launch.y) * progress;
      dx = target.x - launch.x;
      dy = target.y - launch.y;
    }

    const px = tx(x);
    const py = ty(y) - scale * 0.35;
    const r = Math.max(1.6, scale * 0.12);

    // A short tail behind the shot, along its own line of travel. Four steps is
    // enough to read as motion and few enough to stay cheap when a tower and
    // half a roster are all firing at once.
    const length = Math.sqrt(dx * dx + dy * dy);
    if (length > 0.001) {
      const ux = (dx / length) * scale * 0.22;
      const uy = (dy / length) * scale * 0.22;
      for (let i = 1; i <= 4; i += 1) {
        ctx.globalAlpha = 0.3 * (1 - i / 5);
        ctx.fillStyle = palette.accent;
        ctx.beginPath();
        ctx.arc(px - ux * i, py - uy * i, r * (1 - i * 0.16), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    ctx.fillStyle = "rgba(255, 212, 121, 0.26)";
    ctx.beginPath();
    ctx.arc(px, py, r * 2.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = palette.accent;
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Whether an entity actually changed position on the last tick. */
function movedLastTick(entity: Entity, previous: Trail): boolean {
  const was = previous.get(entity.id);
  if (!was) return false;
  return Math.abs(entity.x - was.x) + Math.abs(entity.y - was.y) > 0.0005;
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
 * A tower: a cached masonry sprite, the ground it claims, and its hitpoints.
 *
 * The structure itself is built in `towers.ts` and blitted whole. What is left
 * here is the part that changes during a battle — the territory glow, which
 * fades as the tower does, and the health bar.
 */
function drawTower(
  ctx: CanvasRenderingContext2D,
  tower: Entity,
  tx: (x: number) => number,
  ty: (y: number) => number,
  scale: number,
): void {
  const palette = paletteFor(tower.side);
  const footprint = tower.stats.radius * 2 * scale;
  const cx = tx(tower.x);
  const cy = ty(tower.y);

  // The ground a tower holds, in its own colour. Faint enough to be territory
  // rather than decoration, and it dims with the tower's hitpoints so a keep
  // about to fall is already losing its grip on the field.
  if (!tower.dormant) {
    const health = tower.hp / tower.maxHp;
    const reach = footprint * 1.35;
    const glow = ctx.createRadialGradient(cx, cy, footprint * 0.1, cx, cy, reach);
    glow.addColorStop(0, palette.base);
    glow.addColorStop(1, "rgba(0,0,0,0)");
    ctx.save();
    ctx.globalAlpha = 0.07 + health * 0.05;
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.ellipse(cx, cy, reach, reach * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  const sprite = towerSprite(
    tower.towerKind ?? "princess",
    tower.side,
    footprint,
    tower.dormant,
  );
  if (!sprite) return;

  const top = cy - sprite.groundY;
  ctx.drawImage(
    sprite.raster as CanvasImageSource,
    cx - sprite.width / 2,
    top,
    sprite.width,
    sprite.height,
  );

  healthBar(
    ctx,
    cx,
    top + sprite.crownY - scale * 0.34,
    footprint * 0.62,
    tower.hp / tower.maxHp,
    scale,
  );
}

/**
 * A unit.
 *
 * A cached sprite, a soft ground shadow, and two marks that carry the only two
 * facts you must be able to read instantly: whether it is still landing, and
 * whether it will walk straight past your defenders.
 *
 * ## Why it moves at all
 *
 * A sprite sliding across turf at a constant offset reads as a token being
 * pushed, not as an animal walking. Three motions fix that, and all three are
 * computed here from state the renderer is only reading: a two-beat bounce while
 * the thing is actually covering ground, a hover for anything airborne, and a
 * lunge on the frames just after a hit lands. None of them is stored, none is
 * fed back, and a renderer that skipped all three would resolve every battle
 * identically — which is the test any animation here has to pass.
 */
function drawUnit(
  ctx: CanvasRenderingContext2D,
  unit: Entity,
  at: { x: number; y: number },
  positions: Map<number, { x: number; y: number }>,
  moving: boolean,
  time: number,
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

  // Every unit gets its own place in the cycle, so four grubs dropped together
  // do not march in lockstep. The golden angle spreads consecutive ids about as
  // far apart as a counter can.
  const phase = unit.id * 2.399963;

  let bounce = 0;
  if (unit.deploying > 0) {
    bounce = 0;
  } else if (flying) {
    // A slow full sine — a flyer rides above its shadow rather than pushing off
    // anything, so unlike a walker it may sink below its resting height.
    bounce = Math.sin(time * 2.4 + phase) * size * 0.055;
  } else if (moving) {
    // Rectified, so the body only ever rises: a walk cycle pushes off the
    // ground twice per stride and never sinks through it.
    bounce = -Math.abs(Math.sin(time * 6.5 + phase)) * size * 0.05;
  } else {
    bounce = Math.sin(time * 1.8 + phase) * size * 0.012;
  }

  // The lunge. `cooldown` is reloaded to the full hit speed the instant a blow
  // lands and counts down from there, so the top of that range is the swing.
  let lungeX = 0;
  let lungeY = 0;
  const hitSpeed = unit.stats.hitSpeed;
  if (hitSpeed > 0 && unit.targetId !== null && unit.deploying === 0) {
    const since = 1 - unit.cooldown / hitSpeed;
    if (since >= 0 && since < 0.24) {
      const swing = Math.sin((since / 0.24) * Math.PI);
      const target = positions.get(unit.targetId);
      if (target) {
        const dx = target.x - at.x;
        const dy = target.y - at.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        if (length > 0.001) {
          lungeX = (dx / length) * swing * size * 0.15;
          lungeY = (dy / length) * swing * size * 0.15;
        }
      }
    }
  }

  ctx.save();
  if (unit.deploying > 0) ctx.globalAlpha = 0.45;

  // Shadow. A flyer's is smaller and further away, which is what sells height.
  // It stays on the ground while the body moves, because a shadow that bounced
  // with the walk would cancel the bounce out.
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

  const bodyX = px + lungeX;
  const bodyY = py - size + size * 0.12 - lift + bounce + lungeY;

  const sprite = spriteFor(unit.cardId, unit.side, size);
  if (sprite) {
    ctx.drawImage(sprite as CanvasImageSource, bodyX - size / 2, bodyY, size, size);
  } else {
    ctx.fillStyle = palette.base;
    ctx.beginPath();
    ctx.arc(bodyX, py - size * 0.4, size * 0.32, 0, Math.PI * 2);
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

  // Held clear of the walk cycle rather than riding on it. A bar that bobbed
  // with the body would be the one thing on screen you have to read precisely
  // and the one thing that never holds still.
  if (unit.hp < unit.maxHp) {
    healthBar(ctx, px, py - size - lift + size * 0.01, size * 0.78, unit.hp / unit.maxHp, scale);
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
