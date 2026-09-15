import assert from "node:assert/strict";
import test from "node:test";
import { emptySkills, grantXp, levelFromXp } from "./skills";

test("skills level every 50 XP", () => {
  assert.equal(levelFromXp(0), 1);
  assert.equal(levelFromXp(49), 1);
  assert.equal(levelFromXp(50), 2);
  const gained = grantXp(emptySkills(), "farming", 50);
  assert.equal(gained.leveled, true);
  assert.equal(gained.skills.farming.level, 2);
});
