import assert from "node:assert/strict";
import test from "node:test";
import { chooseClass, createPlayer, harvest, plant, sellToBren, setScene, wolfLoot } from "./game-store";

test("class pick persists on the player", () => {
  const pilgrim = createPlayer("p1", "Alan", 1);
  assert.equal(pilgrim.classId, null);
  const sworn = chooseClass(pilgrim, "fighter", 2);
  assert.equal(sworn.ok, true);
  assert.equal(sworn.player.classId, "fighter");
  assert.equal(chooseClass(sworn.player, "spiritual", 3).ok, false);
});

test("plant harvest sell to Old Bren pays soft coins", () => {
  let player = chooseClass(createPlayer("p2", "Bren", 1), "spiritual", 2).player;
  const planted = plant(player, 0, "grain", 10);
  assert.equal(planted.ok, true);
  player = planted.player;
  const tooSoon = harvest(player, 0, 11);
  assert.equal(tooSoon.ok, false);
  const ripe = harvest(player, 0, 10 + 4000);
  assert.equal(ripe.ok, true);
  assert.ok(ripe.player.basket.grain >= 1);
  assert.ok(ripe.player.farmSkill >= 1);
  const sold = sellToBren(ripe.player, "grain", 20);
  assert.equal(sold.ok, true);
  assert.ok(sold.player.coins >= 4);
});

test("wolf loot only in the valley and fighter earns more", () => {
  const fighter = chooseClass(createPlayer("p3", "F", 1), "fighter", 2).player;
  assert.equal(wolfLoot(fighter, 3).ok, false);
  const there = setScene(fighter, "valley", 4).player;
  const loot = wolfLoot(there, 5);
  assert.equal(loot.ok, true);
  assert.equal(loot.player.coins, 8);
});
