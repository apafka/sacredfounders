import { WOLF } from "./data/enemies";
import { XP_PER_LEVEL as SKILL_XP_PER_LEVEL, levelFromXp as skillLevelFromXp } from "./game/skills";

export const XP_PER_WOLF = WOLF.xp;
export const XP_PER_ELITE = WOLF.xp;
export const XP_PER_LEVEL = SKILL_XP_PER_LEVEL;
export const SWORD_COST = 12;
export const BASE_STRIKE = WOLF.playerDamage;
export const IRON_BLADE_DAMAGE = WOLF.playerDamage;
export const PACK_HP = WOLF.health;
export const ELITE_HP = WOLF.health;
export const PLAYER_MAX_HP = 20;
export const PLAYER_DAMAGE = WOLF.playerDamage;
export const WOLF_DAMAGE = WOLF.damage;
export const WOLF_HP = WOLF.health;
export const RESPAWN_MS = 0;
export const PACK_COUNT = 1;

export type BeastKind = "pack" | "elite";

export function levelFromXp(xp: number): number {
  return skillLevelFromXp(xp);
}

export function xpForKill(kind: BeastKind): number {
  return kind === "elite" ? XP_PER_ELITE : XP_PER_WOLF;
}
