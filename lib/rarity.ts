export function rollHarvestBonus(farmSkill: number, rng = Math.random): number {
  if (rng() < Math.min(0.4, farmSkill * 0.03)) return 1;
  return 0;
}
