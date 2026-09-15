import { PLAYER_DAMAGE, PLAYER_MAX_HP, WOLF_DAMAGE, WOLF_HP } from "../combat";

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
  bounds?: { minX: number; minY: number; maxX: number; maxY: number },
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
      p.hp = Math.max(0, p.hp - WOLF_DAMAGE);
      w.attackCd = WOLF_ATTACK_MS;
      return { player: p, wolf: w, wolfHit: WOLF_DAMAGE };
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

function clampWolf(wolf: Wolf, bounds?: { minX: number; minY: number; maxX: number; maxY: number }): Wolf {
  if (!bounds) return wolf;
  return {
    ...wolf,
    x: Math.max(bounds.minX, Math.min(bounds.maxX, wolf.x)),
    y: Math.max(bounds.minY, Math.min(bounds.maxY, wolf.y)),
  };
}

export { PLAYER_MAX_HP, PLAYER_DAMAGE, WOLF_HP, WOLF_DAMAGE };
