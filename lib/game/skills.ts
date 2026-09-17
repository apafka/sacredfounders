export const SKILL_IDS = ["attack", "defense", "farming", "cooking"] as const;
export type SkillId = (typeof SKILL_IDS)[number];

export type SkillState = { xp: number; level: number };

/** RuneScape-lite: every 50 XP is a level. Level 1 starts at 0 XP. */
export const XP_PER_LEVEL = 50;

/** Successful player strike. */
export const ATTACK_XP_PER_HIT = 4;
/** Incoming hit that actually dealt damage. */
export const DEFENSE_XP_PER_HIT = 3;
/** One wheat → one bread. */
export const COOKING_XP_PER_BAKE = 12;

export function levelFromXp(xp: number): number {
  return 1 + Math.floor(Math.max(0, xp) / XP_PER_LEVEL);
}

export function xpProgress(xp: number): { level: number; into: number; need: number; ratio: number } {
  const level = levelFromXp(xp);
  const into = Math.max(0, xp) % XP_PER_LEVEL;
  return { level, into, need: XP_PER_LEVEL, ratio: into / XP_PER_LEVEL };
}

export function emptySkills(): Record<SkillId, SkillState> {
  return {
    attack: { xp: 0, level: 1 },
    defense: { xp: 0, level: 1 },
    farming: { xp: 0, level: 1 },
    cooking: { xp: 0, level: 1 },
  };
}

/** Combat level is the mean of Attack and Defense, floored. */
export function combatLevel(skills: Record<SkillId, SkillState>): number {
  return Math.max(1, Math.floor((skills.attack.level + skills.defense.level) / 2));
}

export function normalizeSkill(raw?: SkillState | null, xp = 0): SkillState {
  const value = Math.max(0, raw?.xp ?? xp);
  return { xp: value, level: levelFromXp(value) };
}

export function hydrateSkills(
  raw?: Partial<Record<string, SkillState>> | null,
  legacy?: { xp?: number; level?: number; cookSkill?: number },
): Record<SkillId, SkillState> {
  const combat = raw?.combat;
  const attackXp = raw?.attack?.xp ?? combat?.xp ?? legacy?.xp ?? 0;
  const cookingXp = raw?.cooking?.xp ?? (legacy?.cookSkill ?? 0) * COOKING_XP_PER_BAKE;
  return {
    attack: normalizeSkill(raw?.attack, attackXp),
    defense: normalizeSkill(raw?.defense, 0),
    farming: normalizeSkill(raw?.farming, 0),
    cooking: normalizeSkill(raw?.cooking, cookingXp),
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
