/**
 * Everything that stands on the field: fighters, fixtures, towers, and shots in
 * flight.
 *
 * Towers and troops share one shape deliberately. A tower is a fixture that
 * cannot move and does not expire, and a defensive building is a fixture that
 * does — but all three take damage, acquire targets and shoot, so giving them
 * one representation means the combat phases are written once instead of three
 * times, and a rule cannot drift between them.
 */

import { TOWER_PLACEMENTS } from "../arena";
import { atLevel, cardById, type Targeting, type TroopDefinition } from "../units/roster";
import type { Side } from "./state";

/** Resolved combat numbers, after levelling. */
export type Stats = {
  damage: number;
  hitSpeed: number;
  windup: number;
  travel: number;
  /** Tiles per second. Zero for anything that does not move. */
  speed: number;
  range: number;
  sight: number;
  targets: Targeting;
  flies: boolean;
  splash: number;
  radius: number;
};

/** What an entity is, which decides how it is targeted and whether it moves. */
export type EntityKind = "troop" | "building" | "tower";

/** One thing on the field. */
export type Entity = {
  id: number;
  side: Side;
  kind: EntityKind;
  /** The card that produced it, or -1 for a tower. */
  cardId: number;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  stats: Stats;
  /** Who it is currently shooting, or null. */
  targetId: number | null;
  /** Ticks until it may hit again. */
  cooldown: number;
  /** Ticks until it becomes active. A deploying unit cannot act and cannot be hurt. */
  deploying: number;
  /** Ticks until it expires on its own, or -1 for permanent. */
  lifetime: number;
  /** Princess or king, for a tower. */
  towerKind: "princess" | "king" | null;
  /** Which half a princess tower guards. */
  lane: "left" | "right" | null;
  /** A king tower does not fight until woken. */
  dormant: boolean;
};

/** A shot on its way to something. */
export type Projectile = {
  id: number;
  side: Side;
  /** What it was fired at. A projectile is bound to its target, so overkill is real. */
  targetId: number;
  x: number;
  y: number;
  damage: number;
  splash: number;
  targets: Targeting;
  /** Ticks until impact. */
  remaining: number;
};

/** Princess tower stats. Fixed for both sides, and never levelled. */
export const PRINCESS_TOWER = {
  hitpoints: 2900,
  damage: 110,
  hitSpeed: 16,
  windup: 10,
  travel: 4,
  range: 7.5,
  sight: 7.5,
  radius: 1.5,
} as const;

/** King tower stats. Tougher, slower, and asleep until something wakes it. */
export const KING_TOWER = {
  hitpoints: 4200,
  damage: 130,
  hitSpeed: 20,
  windup: 10,
  travel: 4,
  range: 7,
  sight: 7,
  radius: 1.8,
} as const;

/** Every tower, at the start of a battle. */
export function createTowers(nextId: () => number): Entity[] {
  return TOWER_PLACEMENTS.map((placement) => {
    const base = placement.kind === "king" ? KING_TOWER : PRINCESS_TOWER;
    return {
      id: nextId(),
      side: placement.side,
      kind: "tower" as const,
      cardId: -1,
      x: placement.x,
      y: placement.y,
      hp: base.hitpoints,
      maxHp: base.hitpoints,
      stats: {
        damage: base.damage,
        hitSpeed: base.hitSpeed,
        windup: base.windup,
        travel: base.travel,
        speed: 0,
        range: base.range,
        sight: base.sight,
        targets: "both",
        flies: false,
        splash: 0,
        radius: base.radius,
      },
      targetId: null,
      cooldown: 0,
      deploying: 0,
      lifetime: -1,
      towerKind: placement.kind,
      lane: placement.lane,
      dormant: placement.kind === "king",
    };
  });
}

/**
 * The bodies a card puts on the field.
 *
 * A multi-unit card spreads its bodies around the tapped point in a fixed
 * pattern rather than a random one. Randomness here would be one more thing the
 * replay has to reproduce for no gain — a fixed rosette is just as readable and
 * costs the generator nothing.
 */
export function spawnFromCard(
  cardId: number,
  side: Side,
  x: number,
  y: number,
  level: number,
  nextId: () => number,
): Entity[] {
  const card = cardById(cardId);
  if (card.kind === "spell") return [];

  const troop = card as TroopDefinition;
  const bodies: Entity[] = [];

  for (let i = 0; i < troop.count; i += 1) {
    const offset = rosette(i, troop.count);
    bodies.push({
      id: nextId(),
      side,
      kind: card.kind === "building" ? "building" : "troop",
      cardId,
      x: x + offset.x,
      y: y + offset.y,
      hp: atLevel(troop.hitpoints, level),
      maxHp: atLevel(troop.hitpoints, level),
      stats: {
        damage: atLevel(troop.damage, level),
        hitSpeed: troop.hitSpeed,
        windup: troop.windup,
        travel: troop.travel,
        speed: troop.speed,
        range: troop.range,
        sight: troop.sight,
        targets: troop.targets,
        flies: troop.flies,
        splash: troop.splash,
        radius: troop.radius,
      },
      targetId: null,
      cooldown: 0,
      deploying: troop.deployTime,
      lifetime: card.kind === "building" ? card.lifetime : -1,
      towerKind: null,
      lane: null,
      dormant: false,
    });
  }

  return bodies;
}

/** Where the `index`th of `count` bodies stands, relative to the tapped point. */
function rosette(index: number, count: number): { x: number; y: number } {
  if (count === 1) return { x: 0, y: 0 };
  // A fixed ring. Hand-written rather than trigonometric, because the
  // simulation is not allowed to call sin or cos — see math.ts.
  const ring = [
    { x: 0, y: -0.7 },
    { x: 0.7, y: 0 },
    { x: 0, y: 0.7 },
    { x: -0.7, y: 0 },
    { x: 0.5, y: -0.5 },
    { x: 0.5, y: 0.5 },
  ];
  return ring[index % ring.length];
}

/** Whether `attacker` is allowed to shoot `victim`. */
export function canTarget(attacker: Entity, victim: Entity): boolean {
  if (victim.side === attacker.side) return false;
  if (victim.deploying > 0) return false;
  if (victim.hp <= 0) return false;

  // A dormant king is not a legal target while its princess towers stand,
  // otherwise a unit would walk past a live tower to hit a sleeping one.
  if (victim.kind === "tower" && victim.towerKind === "king" && victim.dormant) {
    return false;
  }

  switch (attacker.stats.targets) {
    case "buildings":
      return victim.kind === "tower" || victim.kind === "building";
    case "ground":
      return !victim.stats.flies;
    case "air":
      return victim.stats.flies;
    case "both":
      return true;
  }
}
