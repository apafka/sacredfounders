import { BOAR, DIRE_WOLF, FOREST_SPIDER, WOLF } from "./data/enemies";
import { BREAD_HEAL } from "./data/economy";
import { XP_PER_LEVEL as SKILL_XP_PER_LEVEL, levelFromXp as skillLevelFromXp } from "./game/skills";

export const XP_PER_WOLF = WOLF.xp;
export const XP_PER_ELITE = DIRE_WOLF.xp;
export const XP_PER_BOAR = BOAR.xp;
export const XP_PER_SPIDER = FOREST_SPIDER.xp;
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
export const BOAR_DAMAGE = BOAR.damage;
export const BOAR_HP = BOAR.health;
export const SPIDER_DAMAGE = FOREST_SPIDER.damage;
export const SPIDER_HP = FOREST_SPIDER.health;
/** Dead wilderness foes return after 30s while the pilgrim stays in the valley. Home-return always resets. */
export const RESPAWN_MS = 30_000;
export const PACK_COUNT = 4;

export type BeastKind = "pack" | "elite";

export function levelFromXp(xp: number): number {
  return skillLevelFromXp(xp);
}

export function xpForKill(kind: BeastKind): number {
  return kind === "elite" ? XP_PER_ELITE : XP_PER_WOLF;
}

/** +1 strike every 2 Attack levels. Blade replaces the unarmed 3 with 5, then skill still stacks. */
export function playerStrikeDamage(hasSword: boolean, attackLevel = 1): number {
  const skill = Math.floor(Math.max(1, attackLevel - 1) / 2);
  return (hasSword ? SWORD_DAMAGE : PLAYER_DAMAGE) + skill;
}

/** Armor −1; +1 mitigation every 3 Defense levels. Hits that land still deal at least 1. */
export function mitigateDamage(raw: number, hasArmor: boolean, defenseLevel = 1): number {
  if (raw <= 0) return 0;
  const skill = Math.floor(Math.max(1, defenseLevel - 1) / 3);
  const cut = (hasArmor ? ARMOR_MITIGATION : 0) + skill;
  return Math.max(1, raw - cut);
}

/** Cooking +1 bread heal every 2 levels (level 1 = 6 HP). */
export function breadHealAmount(cookingLevel = 1): number {
  return BREAD_HEAL + Math.floor(Math.max(1, cookingLevel - 1) / 2);
}
