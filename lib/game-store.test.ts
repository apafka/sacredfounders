import assert from "node:assert/strict";
import test from "node:test";
import { buySword, chooseClass, cookLoaf, createPlayer, fishCreek, harvest, plant, sellToBren, setScene, wolfLoot } from "./game-store";
import { IRON_BLADE_DAMAGE, SWORD_COST, XP_PER_ELITE, XP_PER_LEVEL, XP_PER_WOLF } from "./combat";

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

test("wolf loot only in the valley and fighter earns coins plus xp", () => {
  const fighter = chooseClass(createPlayer("p3", "F", 1), "fighter", 2).player;
  assert.equal(wolfLoot(fighter, "pack", 3).ok, false);
  const there = setScene(fighter, "valley", 4).player;
  const loot = wolfLoot(there, "pack", 5);
  assert.equal(loot.ok, true);
  assert.equal(loot.player.coins, 8);
  assert.equal(loot.player.xp, XP_PER_WOLF);
  assert.equal(loot.player.level, 1);
  const elite = wolfLoot(loot.player, "elite", 6);
  assert.equal(elite.player.xp, XP_PER_WOLF + XP_PER_ELITE);
  assert.equal(elite.player.level, 1 + Math.floor((XP_PER_WOLF + XP_PER_ELITE) / XP_PER_LEVEL));
});

test("Old Bren sells an Iron Blade that raises strike damage", () => {
  let player = chooseClass(createPlayer("p5", "Buyer", 1), "fighter", 2).player;
  player = { ...player, coins: SWORD_COST };
  const bought = buySword(player, 3);
  assert.equal(bought.ok, true);
  assert.equal(bought.player.hasSword, true);
  assert.equal(bought.player.strikeDamage, IRON_BLADE_DAMAGE);
  assert.equal(bought.player.coins, 0);
  assert.equal(buySword(bought.player, 4).ok, false);
});

test("fishing and cooking stubs sell to Old Bren", () => {
  let player = chooseClass(createPlayer("p4", "Cook", 1), "spiritual", 2).player;
  const fished = fishCreek(player, () => 1, 100);
  assert.equal(fished.ok, true);
  assert.equal(fished.player.basket.fish, 1);
  assert.equal(fished.player.fishSkill, 1);
  const soldFish = sellToBren(fished.player, "fish", 101);
  assert.equal(soldFish.ok, true);
  assert.equal(soldFish.player.coins, 5);

  player = { ...soldFish.player, basket: { ...soldFish.player.basket, grain: 1 } };
  const loaf = cookLoaf(player, 102);
  assert.equal(loaf.ok, true);
  assert.equal(loaf.player.basket.loaf, 1);
  assert.equal(loaf.player.basket.grain, 0);
  assert.ok(loaf.player.cookSkill >= 2);
  const soldLoaf = sellToBren(loaf.player, "loaf", 103);
  assert.equal(soldLoaf.player.coins, 5 + 8);
});
