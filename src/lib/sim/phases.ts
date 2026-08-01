/**
 * The phases of a tick that move and fight.
 *
 * Each one is a pure pass over the battle state, and each is written so that its
 * result does not depend on the order the entity list happens to be in. Where
 * order genuinely matters — separation, and tie-breaks between equal targets —
 * it is resolved by entity id, which is stable, rather than by array position,
 * which is not.
 */

import {
  ARENA_HEIGHT,
  RIVER_HALF_WIDTH,
  RIVER_Y,
  nearestBridgeX,
} from "../arena";
import { TICKS_PER_SECOND } from "./constants";
import { canTarget, type Entity, type Projectile } from "./entities";
import { direction, distanceSquared } from "./math";
import type { BattleState, Side } from "./state";

/** Damage waiting to be applied, keyed by entity id. */
export type DamageBuffer = Map<number, number>;

/**
 * Phase — target acquisition.
 *
 * A unit keeps its target until that target dies or leaves its sight, which is
 * what stops a unit standing between two enemies from flickering between them
 * every tick. When it has no target it takes the nearest it may legally shoot,
 * broken by lower entity id so two equidistant enemies always resolve the same
 * way.
 */
export function acquireTargets(state: BattleState): void {
  const byId = new Map(state.entities.map((e) => [e.id, e]));

  for (const entity of state.entities) {
    if (entity.deploying > 0 || entity.hp <= 0) continue;
    if (entity.kind === "tower" && entity.dormant) continue;

    const current = entity.targetId === null ? undefined : byId.get(entity.targetId);
    if (current && current.hp > 0 && canTarget(entity, current)) {
      if (distanceSquared(entity, current) <= entity.stats.sight * entity.stats.sight) {
        continue;
      }
    }

    entity.targetId = null;
    let best: Entity | null = null;
    let bestDistance = Infinity;

    for (const candidate of state.entities) {
      if (!canTarget(entity, candidate)) continue;
      const d = distanceSquared(entity, candidate);
      if (d > entity.stats.sight * entity.stats.sight) continue;
      if (d < bestDistance || (d === bestDistance && best !== null && candidate.id < best.id)) {
        best = candidate;
        bestDistance = d;
      }
    }

    if (best) entity.targetId = best.id;
  }
}

/**
 * Phase — movement.
 *
 * Every unit's intent is computed from the same snapshot of positions and
 * written afterwards, so no unit's move depends on whether its neighbour has
 * already moved this tick.
 *
 * A unit walks toward whatever it is shooting at, or, having nothing to shoot,
 * toward the enemy tower it is advancing on. A ground unit that has to cross the
 * river routes through the nearer bridge first — which is the whole reason lanes
 * exist and the reason a bridge is a place worth defending.
 */
export function moveEntities(state: BattleState): void {
  const byId = new Map(state.entities.map((e) => [e.id, e]));
  const moves: { entity: Entity; x: number; y: number }[] = [];

  for (const entity of state.entities) {
    if (entity.deploying > 0 || entity.hp <= 0) continue;
    if (entity.stats.speed === 0) continue;

    const goal = goalFor(entity, state, byId);
    if (!goal) continue;

    // Already in range of what it wants — stop and shoot.
    const reach = entity.stats.range + goalRadius(entity, byId);
    if (entity.targetId !== null && distanceSquared(entity, goal) <= reach * reach) {
      continue;
    }

    const waypoint = routeThrough(entity, goal);
    const step = entity.stats.speed / TICKS_PER_SECOND;
    const heading = direction(entity, waypoint);
    moves.push({
      entity,
      x: entity.x + heading.x * step,
      y: entity.y + heading.y * step,
    });
  }

  for (const move of moves) {
    move.entity.x = move.x;
    move.entity.y = move.y;
  }
}

/**
 * Phase — separation.
 *
 * Nothing else stops two ground units standing in the same place, and in an
 * arena this wide with three-tile bridges, units converging on a bridge mouth is
 * the ordinary case rather than an edge case. Movement computed from a single
 * snapshot guarantees the overlap rather than avoiding it, so it has to be
 * relaxed out afterwards.
 *
 * Runs a **fixed** two passes rather than iterating until it settles. A loop
 * that runs until convergence runs a different number of times on a different
 * machine, and that difference is a desync. Two passes leaves a little overlap
 * and that is the correct trade.
 */
export function separateEntities(state: BattleState): void {
  const movable = state.entities.filter(
    (e) => e.hp > 0 && e.deploying === 0 && e.kind === "troop" && !e.stats.flies,
  );
  movable.sort((a, b) => a.id - b.id);

  for (let pass = 0; pass < 2; pass += 1) {
    const pushes = new Map<number, { x: number; y: number }>();

    for (let i = 0; i < movable.length; i += 1) {
      for (let j = i + 1; j < movable.length; j += 1) {
        const a = movable[i];
        const b = movable[j];
        const minimum = a.stats.radius + b.stats.radius;
        const d2 = distanceSquared(a, b);
        if (d2 >= minimum * minimum || d2 === 0) continue;

        const d = Math.sqrt(d2);
        const overlap = (minimum - d) / 2;
        const away = direction(a, b);

        addPush(pushes, a.id, -away.x * overlap, -away.y * overlap);
        addPush(pushes, b.id, away.x * overlap, away.y * overlap);
      }
    }

    for (const entity of movable) {
      const push = pushes.get(entity.id);
      if (!push) continue;
      entity.x += push.x;
      entity.y += push.y;
    }
  }
}

function addPush(
  pushes: Map<number, { x: number; y: number }>,
  id: number,
  x: number,
  y: number,
): void {
  const existing = pushes.get(id);
  if (existing) {
    existing.x += x;
    existing.y += y;
  } else {
    pushes.set(id, { x, y });
  }
}

/**
 * Phase — projectiles advance, and land.
 *
 * A projectile is bound to the thing it was fired at. If that thing is already
 * dead when it lands, the damage is simply lost — which makes overkill real, and
 * makes firing into a dying swarm a genuine mistake rather than a free hit.
 */
export function advanceProjectiles(state: BattleState, damage: DamageBuffer): void {
  const byId = new Map(state.entities.map((e) => [e.id, e]));
  const surviving: Projectile[] = [];

  for (const shot of state.projectiles) {
    shot.remaining -= 1;
    if (shot.remaining > 0) {
      surviving.push(shot);
      continue;
    }

    const target = byId.get(shot.targetId);
    if (!target || target.hp <= 0) continue;

    applyHit(state, damage, shot.side, target, shot.damage, shot.splash, shot.targets);
  }

  state.projectiles = surviving;
}

/**
 * Phase — attacks resolve, committing damage rather than applying it.
 *
 * Nothing here reduces any hitpoints. Everything lands in the buffer and is
 * applied in one go afterwards, so two units that kill each other on the same
 * tick both die instead of whichever the loop reached first surviving.
 */
export function resolveAttacks(state: BattleState, damage: DamageBuffer): void {
  const byId = new Map(state.entities.map((e) => [e.id, e]));

  for (const entity of state.entities) {
    if (entity.hp <= 0) continue;

    if (entity.deploying > 0) {
      entity.deploying -= 1;
      continue;
    }
    if (entity.cooldown > 0) {
      entity.cooldown -= 1;
      continue;
    }
    if (entity.targetId === null) continue;
    if (entity.kind === "tower" && entity.dormant) continue;

    const target = byId.get(entity.targetId);
    if (!target || target.hp <= 0) continue;

    const reach = entity.stats.range + target.stats.radius;
    if (distanceSquared(entity, target) > reach * reach) continue;

    entity.cooldown = entity.stats.hitSpeed;

    if (entity.stats.travel > 0) {
      state.projectiles.push({
        id: state.nextEntityId++,
        side: entity.side,
        targetId: target.id,
        x: entity.x,
        y: entity.y,
        damage: entity.stats.damage,
        splash: entity.stats.splash,
        targets: entity.stats.targets,
        remaining: entity.stats.travel,
      });
    } else {
      applyHit(
        state,
        damage,
        entity.side,
        target,
        entity.stats.damage,
        entity.stats.splash,
        entity.stats.targets,
      );
    }
  }
}

/** Commit a hit — and its splash — into the buffer. */
function applyHit(
  state: BattleState,
  damage: DamageBuffer,
  side: Side,
  target: Entity,
  amount: number,
  splash: number,
  targets: Entity["stats"]["targets"],
): void {
  commit(damage, target.id, amount);
  if (splash <= 0) return;

  for (const other of state.entities) {
    if (other.id === target.id) continue;
    if (other.side === side) continue;
    if (other.hp <= 0 || other.deploying > 0) continue;
    if (targets === "ground" && other.stats.flies) continue;
    if (targets === "air" && !other.stats.flies) continue;
    if (distanceSquared(other, target) > splash * splash) continue;
    commit(damage, other.id, amount);
  }
}

function commit(damage: DamageBuffer, id: number, amount: number): void {
  damage.set(id, (damage.get(id) ?? 0) + amount);
}

/** Phase — the buffer is applied, all at once. */
export function applyDamage(state: BattleState, damage: DamageBuffer): void {
  for (const entity of state.entities) {
    const taken = damage.get(entity.id);
    if (taken) entity.hp -= taken;

    // A king wakes the moment it is hurt, or when one of its own princess
    // towers has already fallen.
    if (entity.kind === "tower" && entity.towerKind === "king" && entity.dormant) {
      if (taken) entity.dormant = false;
    }
  }
}

/**
 * Phase — deaths, expiries, and crowns.
 *
 * A tower falling is the only event that scores, and it is also what opens a
 * lane for deployment and what wakes a king.
 */
export function collectDeaths(state: BattleState): void {
  for (const entity of state.entities) {
    if (entity.lifetime > 0) entity.lifetime -= 1;
  }

  const dead = state.entities.filter(
    (e) => e.hp <= 0 || (e.lifetime === 0 && e.kind === "building"),
  );
  if (dead.length === 0) return;

  for (const entity of dead) {
    if (entity.kind !== "tower") continue;

    const scorer: Side = entity.side === 0 ? 1 : 0;
    state.sides[scorer].crowns += entity.towerKind === "king" ? 3 : 1;

    if (entity.towerKind === "princess" && entity.lane) {
      state.sides[scorer].openedLanes.push(entity.lane);
      // Losing a princess tower wakes that side's king.
      for (const other of state.entities) {
        if (other.side === entity.side && other.towerKind === "king") {
          other.dormant = false;
        }
      }
    }
  }

  const deadIds = new Set(dead.map((e) => e.id));
  state.entities = state.entities.filter((e) => !deadIds.has(e.id));
  state.projectiles = state.projectiles.filter((p) => !deadIds.has(p.targetId));
}

/** Where an entity is trying to get to. */
function goalFor(
  entity: Entity,
  state: BattleState,
  byId: Map<number, Entity>,
): { x: number; y: number } | null {
  if (entity.targetId !== null) {
    const target = byId.get(entity.targetId);
    if (target && target.hp > 0) return target;
  }
  return nearestEnemyTower(entity, state);
}

function goalRadius(entity: Entity, byId: Map<number, Entity>): number {
  if (entity.targetId === null) return 0;
  return byId.get(entity.targetId)?.stats.radius ?? 0;
}

/** The enemy tower an advancing unit heads for — nearest by distance, ties by id. */
function nearestEnemyTower(entity: Entity, state: BattleState): Entity | null {
  let best: Entity | null = null;
  let bestDistance = Infinity;

  for (const candidate of state.entities) {
    if (candidate.side === entity.side || candidate.kind !== "tower") continue;
    if (candidate.hp <= 0) continue;
    if (candidate.towerKind === "king" && candidate.dormant) continue;

    const d = distanceSquared(entity, candidate);
    if (d < bestDistance || (d === bestDistance && best !== null && candidate.id < best.id)) {
      best = candidate;
      bestDistance = d;
    }
  }

  // Every princess tower down and the king still asleep cannot happen — a
  // princess falling wakes it — but a unit with nowhere to go must not crash.
  if (!best) {
    for (const candidate of state.entities) {
      if (candidate.side !== entity.side && candidate.kind === "tower" && candidate.hp > 0) {
        return candidate;
      }
    }
  }

  return best;
}

/**
 * The next point to walk toward, routing a ground unit via a bridge.
 *
 * A flyer ignores all of this. A ground unit that needs to cross aims at the
 * mouth of the nearer bridge until it is on the bridge, and only then at its
 * actual goal — which is what makes the two crossings chokepoints rather than
 * decoration.
 */
function routeThrough(entity: Entity, goal: { x: number; y: number }): { x: number; y: number } {
  if (entity.stats.flies) return goal;

  const entitySide = entity.y > RIVER_Y ? 1 : -1;
  const goalSide = goal.y > RIVER_Y ? 1 : -1;
  if (entitySide === goalSide) return goal;

  const bridge = nearestBridgeX(entity.x);
  const crossing = RIVER_Y + entitySide * (RIVER_HALF_WIDTH + 0.5);

  // Aim for the near mouth of the bridge until lined up with it, then across.
  if (Math.abs(entity.x - bridge) > 0.35) {
    return { x: bridge, y: clampToArena(crossing) };
  }
  return { x: bridge, y: clampToArena(RIVER_Y - entitySide * (RIVER_HALF_WIDTH + 0.5)) };
}

function clampToArena(y: number): number {
  if (y < 0) return 0;
  if (y > ARENA_HEIGHT) return ARENA_HEIGHT;
  return y;
}
