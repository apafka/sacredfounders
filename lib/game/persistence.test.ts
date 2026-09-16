import assert from "node:assert/strict";
import test from "node:test";
import { createPlayer } from "../game-store";
import { createMemoryPersistence, mergeSession, toSnapshot } from "./persistence";

test("GamePersistence round-trips gold, inventory, skills, crops, and position", () => {
  const persist = createMemoryPersistence();
  let player = createPlayer("keep", "Ada", 1);
  player = { ...player, coins: 6, hasArmor: true, position: { x: 40, y: 80 }, plots: [{ id: 0, crop: "grain", plantedAt: 10 }, ...player.plots.slice(1)] };
  persist.save(toSnapshot(player, 20));
  const loaded = persist.load("keep");
  assert.ok(loaded);
  assert.equal(loaded.player.coins, 6);
  assert.equal(loaded.player.hasArmor, true);
  assert.equal(loaded.player.encounters.length, 4);
  assert.deepEqual(loaded.player.position, { x: 40, y: 80 });
  assert.equal(loaded.player.plots[0].crop, "grain");
  assert.equal(loaded.player.brenDemand.kind, "bread");
  assert.equal(loaded.player.livingBakery, true);
  const cookie = createPlayer("keep", "Ada", 1);
  const merged = mergeSession(cookie, loaded);
  assert.equal(merged.coins, 6);
  assert.equal(merged.id, "keep");
  assert.equal(persist.load("other"), null);
});
