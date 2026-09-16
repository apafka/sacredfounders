import { PLAYER_DAMAGE, PLAYER_MAX_HP, WOLF_DAMAGE, WOLF_HP } from "../combat";
import { enemyDefinition, type EncounterKind } from "../data/enemies";
import type { PlayerState } from "../types";
import { TILE, VALLEY_ENCOUNTERS, VALLEY_TILES, worldCenter } from "./layout";

export const STRIKE_RANGE = 42;
export const DETECT_RANGE = 118;
export const ATTACK_RANGE = 38;
export const HIT_RANGE = ATTACK_RANGE;
export const PLAYER_SPEED = 128;
export const WOLF_WALK = 46;
export const WANDER_SPEED = 28;
export const PLAYER_ATTACK_MS = 650;
export const WOLF_ATTACK_MS = 1100;
export const WANDER_WAIT_MAX = 1800;

export type Actor = { x: number; y: number; hp: number };

export type WolfMode = "idle" | "wander" | "chase" | "attack" | "dead";

export type Wolf = Actor & {
  maxHp: number;
  mode: WolfMode;
  attackCd: number;
  wanderTx: number;
  wanderTy: number;
  wanderWait: number;
  hitFlash: number;
};

export type Foe = Wolf & {
  id: string;
  kind: EncounterKind;
  spawnX: number;
  spawnY: number;
};

export type Bounds = { minX: number; minY: number; maxX: number; maxY: number };

export function createWolf(x: number, y: number, hp = WOLF_HP): Wolf {
  return {
    x,
    y,
    hp,
    maxHp: hp,
    mode: "idle",
    attackCd: 0,
    wanderTx: x,
    wanderTy: y,
    wanderWait: 400,
    hitFlash: 0,
  };
}

export function createFoe(id: string, kind: EncounterKind, x: number, y: number, hp: number): Foe {
  return { ...createWolf(x, y, hp), id, kind, spawnX: x, spawnY: y };
}

export function spawnWanderBounds(x: number, y: number, radius = 72, mapBounds?: Bounds): Bounds {
  const local: Bounds = {
    minX: x - radius,
    minY: y - radius * 0.75,
    maxX: x + radius,
    maxY: y + radius * 0.75,
  };
  if (!mapBounds) return local;
  return {
    minX: Math.max(mapBounds.minX, local.minX),
    minY: Math.max(mapBounds.minY, local.minY),
    maxX: Math.min(mapBounds.maxX, local.maxX),
    maxY: Math.min(mapBounds.maxY, local.maxY),
  };
}

export function nearestLiving(foes: Foe[], x: number, y: number, range: number): Foe | null {
  let best: Foe | null = null;
  let bestDist = range;
  for (const foe of foes) {
    if (foe.hp <= 0) continue;
    const dist = Math.hypot(foe.x - x, foe.y - y);
    if (dist < bestDist) {
      best = foe;
      bestDist = dist;
    }
  }
  return best;
}

export function tryStrike(player: Actor, wolf: Actor, damage = PLAYER_DAMAGE): Actor | null {
  if (wolf.hp <= 0 || player.hp <= 0) return null;
  if (Math.hypot(player.x - wolf.x, player.y - wolf.y) >= STRIKE_RANGE) return null;
  return { ...wolf, hp: Math.max(0, wolf.hp - damage) };
}

export function tickWolf(
  player: Actor,
  wolf: Wolf,
  dtSec: number,
  rng: () => number = Math.random,
  bounds?: Bounds,
  biteDamage = WOLF_DAMAGE,
): { player: Actor; wolf: Wolf; wolfHit?: number } {
  if (wolf.hp <= 0) {
    return { player, wolf: { ...wolf, hp: 0, mode: "dead" } };
  }
  if (player.hp <= 0) {
    return { player, wolf: { ...wolf, mode: "idle", attackCd: Math.max(0, wolf.attackCd - dtSec * 1000) } };
  }

  const p = { ...player };
  const w: Wolf = { ...wolf, hitFlash: Math.max(0, wolf.hitFlash - dtSec * 1000) };
  const dtMs = dtSec * 1000;
  w.attackCd = Math.max(0, w.attackCd - dtMs);

  const dist = Math.hypot(p.x - w.x, p.y - w.y);

  if (dist <= ATTACK_RANGE) {
    w.mode = "attack";
    if (w.attackCd <= 0) {
      p.hp = Math.max(0, p.hp - biteDamage);
      w.attackCd = WOLF_ATTACK_MS;
      return { player: p, wolf: w, wolfHit: biteDamage };
    }
    return { player: p, wolf: w };
  }

  if (dist <= DETECT_RANGE) {
    w.mode = "chase";
    const step = WOLF_WALK * dtSec;
    w.x += ((p.x - w.x) / dist) * step;
    w.y += ((p.y - w.y) / dist) * step;
    return { player: p, wolf: clampWolf(w, bounds) };
  }

  if (w.wanderWait > 0) {
    w.mode = "idle";
    w.wanderWait -= dtMs;
    return { player: p, wolf: w };
  }

  const toTarget = Math.hypot(w.wanderTx - w.x, w.wanderTy - w.y);
  if (toTarget < 6) {
    w.mode = "idle";
    w.wanderWait = 400 + rng() * WANDER_WAIT_MAX;
    w.wanderTx = w.x + (rng() - 0.5) * 90;
    w.wanderTy = w.y + (rng() - 0.5) * 70;
    return { player: p, wolf: clampWolf(w, bounds) };
  }

  w.mode = "wander";
  w.x += ((w.wanderTx - w.x) / toTarget) * WANDER_SPEED * dtSec;
  w.y += ((w.wanderTy - w.y) / toTarget) * WANDER_SPEED * dtSec;
  return { player: p, wolf: clampWolf(w, bounds) };
}

function clampWolf(wolf: Wolf, bounds?: Bounds): Wolf {
  if (!bounds) return wolf;
  return {
    ...wolf,
    x: Math.max(bounds.minX, Math.min(bounds.maxX, wolf.x)),
    y: Math.max(bounds.minY, Math.min(bounds.maxY, wolf.y)),
  };
}

export { PLAYER_MAX_HP, PLAYER_DAMAGE, WOLF_HP, WOLF_DAMAGE };

export function valleyMapBounds(): Bounds {
  return {
    minX: TILE + 8,
    minY: TILE + 8,
    maxX: TILE * ((VALLEY_TILES[0]?.length ?? 2) - 2),
    maxY: TILE * (VALLEY_TILES.length - 2),
  };
}

export function spawnValleyFoes(player: PlayerState): Foe[] {
  const saves = player.encounters ?? [];
  return VALLEY_ENCOUNTERS.map((spot) => {
    const save = saves.find((item) => item.id === spot.id);
    const def = enemyDefinition(spot.kind);
    const pos = worldCenter(spot.col, spot.row);
    const alive = save ? save.alive : true;
    const foe = createFoe(spot.id, spot.kind, pos.x, pos.y, def.health);
    foe.maxHp = def.health;
    if (!alive) {
      foe.hp = 0;
      foe.mode = "dead";
    } else if (save?.hp) {
      foe.hp = save.hp;
    }
    return foe;
  });
}

export function lootVisible(player: PlayerState, id: string): boolean {
  const save = player.encounters?.find((item) => item.id === id);
  return Boolean(save?.lootDropped && !save.lootTaken);
}

