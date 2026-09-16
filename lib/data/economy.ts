/**
 * Living bakery economy (V1, opinionated).
 *
 * Growth (ms): grain 45s, root 50s, herb 40s. Each harvest returns 1 seed.
 *
 * Bren buy prices (gold / unit):
 *   wheat  2
 *   root   3
 *   herb   5
 *   bread  4   (also eat-sink; demand pays better than a stall sale)
 *   fish   3   (creek stub, unchanged)
 *
 * Craft: 1 wheat → 1 bread. Grain is consumed (creation ≈ destruction).
 *
 * Heal:
 *   bread   +6 HP   snack, not a rest
 *   potion  +10 HP
 *   bed     full HP (20)
 *
 * Bren demand (DeterministicBrain, no LLM):
 *   3 bread → +18 gold (12 market + 6 neighbor bonus) and +15 Farming XP
 *   3 wheat → +10 gold (6 market + 4 neighbor bonus) and +10 Farming XP
 */
export const BREAD_HEAL = 6;
export const BAKE_WHEAT_COST = 1;
export const BREN_DEMAND_QTY = 3;
export const BREN_BREAD_REWARD_GOLD = 18;
export const BREN_GRAIN_REWARD_GOLD = 10;
export const BREN_BREAD_REWARD_XP = 15;
export const BREN_GRAIN_REWARD_XP = 10;

export const BREN_PRICES = {
  grain: 2,
  root: 3,
  herb: 5,
  fish: 3,
  loaf: 4,
} as const;
