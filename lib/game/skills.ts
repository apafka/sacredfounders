export const SKILL_IDS = ["farming", "combat"] as const;
export type SkillId = (typeof SKILL_IDS)[number];

export type SkillState = { xp: number; level: number };

export const XP_PER_LEVEL = 50;

export function levelFromXp(xp: number): number {
  return 1 + Math.floor(Math.max(0, xp) / XP_PER_LEVEL);
}

export function emptySkills(): Record<SkillId, SkillState> {
  return {
    farming: { xp: 0, level: 1 },
    combat: { xp: 0, level: 1 },
  };
}

export function grantXp(
  skills: Record<SkillId, SkillState>,
  id: SkillId,
  amount: number,
): { skills: Record<SkillId, SkillState>; leveled: boolean } {
  const current = skills[id] ?? { xp: 0, level: 1 };
  const xp = current.xp + Math.max(0, amount);
  const level = levelFromXp(xp);
  return {
    skills: { ...skills, [id]: { xp, level } },
    leveled: level > current.level,
  };
}
