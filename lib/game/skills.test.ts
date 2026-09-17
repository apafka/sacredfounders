import assert from "node:assert/strict";
import test from "node:test";
import { combatLevel, emptySkills, grantXp, hydrateSkills, levelFromXp } from "./skills";

test("skills level every 50 XP", () => {
  assert.equal(levelFromXp(0), 1);
  assert.equal(levelFromXp(49), 1);
  assert.equal(levelFromXp(50), 2);
  const gained = grantXp(emptySkills(), "farming", 50);
  assert.equal(gained.leveled, true);
  assert.equal(gained.skills.farming.level, 2);
  const attack = grantXp(emptySkills(), "attack", 4);
  assert.equal(attack.skills.attack.xp, 4);
  const defense = grantXp(emptySkills(), "defense", 3);
  assert.equal(defense.skills.defense.xp, 3);
});

test("old combat XP hydrates into Attack; Combat level is Attack/Defense mean", () => {
  const skills = hydrateSkills({ combat: { xp: 50, level: 2 }, farming: { xp: 0, level: 1 } }, { xp: 50, cookSkill: 2 });
  assert.equal(skills.attack.xp, 50);
  assert.equal(skills.attack.level, 2);
  assert.equal(skills.defense.level, 1);
  assert.equal(skills.cooking.xp, 24);
  assert.equal(combatLevel(skills), 1);
  const higher = hydrateSkills({ attack: { xp: 100, level: 3 }, defense: { xp: 50, level: 2 } });
  assert.equal(combatLevel(higher), 2);
});
