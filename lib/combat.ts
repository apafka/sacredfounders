export const XP_PER_WOLF = 15;
export const XP_PER_ELITE = 40;
export const XP_PER_LEVEL = 50;
export const SWORD_COST = 12;
export const BASE_STRIKE = 1;
export const IRON_BLADE_DAMAGE = 2;
export const PACK_HP = 3;
export const ELITE_HP = 8;
export const PLAYER_MAX_HP = 3;
export const RESPAWN_MS = 25_000;
export const PACK_COUNT = 3;

export type BeastKind = "pack" | "elite";

export function levelFromXp(xp: number): number {
  return 1 + Math.floor(Math.max(0, xp) / XP_PER_LEVEL);
}

export function xpForKill(kind: BeastKind): number {
  return kind === "elite" ? XP_PER_ELITE : XP_PER_WOLF;
}
