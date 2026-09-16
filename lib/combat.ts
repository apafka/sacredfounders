import { DIRE_WOLF, WOLF } from "./data/enemies";
import { XP_PER_LEVEL as SKILL_XP_PER_LEVEL, levelFromXp as skillLevelFromXp } from "./game/skills";

export const XP_PER_WOLF = WOLF.xp;
export const XP_PER_ELITE = DIRE_WOLF.xp;
export const XP_PER_LEVEL = SKILL_XP_PER_LEVEL;
export const SWORD_COST = 12;
export const ARMOR_COST = 15;
export const POTION_COST = 5;
export const POTION_HEAL = 10;
export const BASE_STRIKE = WOLF.playerDamage;
export const IRON_BLADE_DAMAGE = 5;
export const SWORD_DAMAGE = IRON_BLADE_DAMAGE;
export const ARMOR_MITIGATION = 1;
export const PACK_HP = WOLF.health;
export const ELITE_HP = DIRE_WOLF.health;
export const PLAYER_MAX_HP = 20;
export const PLAYER_DAMAGE = WOLF.playerDamage;
export const WOLF_DAMAGE = WOLF.damage;
export const WOLF_HP = WOLF.health;
export const DIRE_DAMAGE = DIRE_WOLF.damage;
export const DIRE_HP = DIRE_WOLF.health;
/** Secondary wilderness reset if the pilgrim never goes home. Home-return always resets. */
export const RESPAWN_MS = 120_000;
export const PACK_COUNT = 3;

export type BeastKind = "pack" | "elite";

export function levelFromXp(xp: number): number {
  return skillLevelFromXp(xp);
}

export function xpForKill(kind: BeastKind): number {
  return kind === "elite" ? XP_PER_ELITE : XP_PER_WOLF;
}

export function playerStrikeDamage(hasSword: boolean): number {
  return hasSword ? SWORD_DAMAGE : PLAYER_DAMAGE;
}

export function mitigateDamage(raw: number, hasArmor: boolean): number {
  if (!hasArmor) return Math.max(0, raw);
  return Math.max(1, raw - ARMOR_MITIGATION);
}
