/**
 * What a battle looks like when things are landing.
 *
 * A field where units silently lose numbers off a bar reads as dead, however
 * well the units themselves are drawn. Hits need to register, deaths need to
 * leave something behind, and that is what this holds.
 *
 * **None of it is simulation state.** These effects are derived by watching
 * hitpoints fall and entities disappear between frames, and they live in the
 * renderer where a machine that drew them differently — or not at all — would
 * still resolve the identical battle. That boundary is the whole reason this is
 * a separate module rather than a field on an entity.
 */

import type { BattleState } from "../sim/state";

/** A short-lived mark on the field. */
type Effect = {
  x: number;
  y: number;
  /** Seconds remaining. */
  life: number;
  /** Seconds it started with. */
  span: number;
  kind: "hit" | "death";
  side: 0 | 1;
  /** How big the thing was, in tiles, so a bear's death is not a grub's. */
  scale: number;
};

/**
 * Watches a battle and remembers what just happened to it.
 *
 * Holds the previous frame's hitpoints so a drop can be spotted without the
 * simulation having to announce one.
 */
export class Feedback {
  private lastHp = new Map<number, number>();
  private lastSeen = new Map<number, { x: number; y: number; side: 0 | 1; scale: number }>();
  private effects: Effect[] = [];

  /** Compare against the previous look and record anything worth drawing. */
  observe(state: BattleState): void {
    const alive = new Set<number>();

    for (const entity of state.entities) {
      alive.add(entity.id);
      const before = this.lastHp.get(entity.id);
      const size = entity.kind === "tower" ? 2.4 : Math.max(0.8, entity.stats.radius * 2.2);

      if (before !== undefined && entity.hp < before) {
        this.effects.push({
          x: entity.x,
          y: entity.y,
          life: 0.18,
          span: 0.18,
          kind: "hit",
          side: entity.side,
          scale: size,
        });
      }

      this.lastHp.set(entity.id, entity.hp);
      this.lastSeen.set(entity.id, { x: entity.x, y: entity.y, side: entity.side, scale: size });
    }

    // Anything that was here last look and is not here now died.
    for (const [id, seen] of this.lastSeen) {
      if (alive.has(id)) continue;
      this.effects.push({
        x: seen.x,
        y: seen.y,
        life: 0.42,
        span: 0.42,
        kind: "death",
        side: seen.side,
        scale: seen.scale,
      });
      this.lastSeen.delete(id);
      this.lastHp.delete(id);
    }
  }

  /** Age everything by a frame and drop what has expired. */
  age(seconds: number): void {
    for (const effect of this.effects) effect.life -= seconds;
    this.effects = this.effects.filter((e) => e.life > 0);
  }

  /** Everything currently worth drawing. */
  active(): readonly Effect[] {
    return this.effects;
  }

  /** Forget everything. For starting a fresh battle. */
  reset(): void {
    this.lastHp.clear();
    this.lastSeen.clear();
    this.effects = [];
  }
}

/** Paint the marks. */
export function drawFeedback(
  ctx: CanvasRenderingContext2D,
  feedback: Feedback,
  tx: (x: number) => number,
  ty: (y: number) => number,
  scale: number,
): void {
  for (const effect of feedback.active()) {
    const t = effect.life / effect.span;
    const px = tx(effect.x);
    const py = ty(effect.y);

    if (effect.kind === "hit") {
      // A quick pale bloom at the point of contact. Short enough that a fast
      // hitter reads as a flicker rather than a glow.
      ctx.save();
      ctx.globalAlpha = t * 0.75;
      ctx.fillStyle = "#fff4d6";
      ctx.beginPath();
      ctx.arc(px, py - scale * 0.3, effect.scale * scale * 0.3 * (1.25 - t * 0.35), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else {
      // A ring opening outward and a dark puff where the body was, so a death
      // has a location rather than just an absence.
      ctx.save();
      ctx.globalAlpha = t * 0.55;
      ctx.strokeStyle = effect.side === 0 ? "#a9e4fb" : "#ffab93";
      ctx.lineWidth = Math.max(1.4, scale * 0.09) * t;
      ctx.beginPath();
      ctx.ellipse(
        px,
        py,
        effect.scale * scale * (0.4 + (1 - t) * 0.7),
        effect.scale * scale * (0.16 + (1 - t) * 0.3),
        0,
        0,
        Math.PI * 2,
      );
      ctx.stroke();

      ctx.globalAlpha = t * 0.4;
      ctx.fillStyle = "#0a0f14";
      ctx.beginPath();
      ctx.ellipse(px, py, effect.scale * scale * 0.3 * t, effect.scale * scale * 0.14 * t, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
}
