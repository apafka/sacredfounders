import assert from "node:assert/strict";
import test from "node:test";
import { chooseClass, createPlayer, harvest, pickupPelt, plant, sellWheat, setScene, wolfFalls } from "./game-store";
import { countItem } from "./game/inventory";
import { GROW_MS } from "./types";

test("new pilgrim wakes at the hearth with three seeds and no class wall", () => {
  const pilgrim = createPlayer("p1", "Alan", 1);
  assert.equal(pilgrim.scene, "hearth");
  assert.equal(pilgrim.coins, 0);
  assert.equal(pilgrim.plots.length, 3);
  assert.equal(countItem(pilgrim.inventory, "wheat_seed"), 3);
  assert.equal(pilgrim.skills.farming.level, 1);
  assert.equal(pilgrim.skills.combat.level, 1);
  assert.equal(plant(pilgrim, 0, "grain", 2).ok, true);
});

test("class pick is optional and still persists if taken", () => {
  const pilgrim = createPlayer("p1b", "Alan", 1);
  const sworn = chooseClass(pilgrim, "fighter", 2);
  assert.equal(sworn.ok, true);
  assert.equal(sworn.player.classId, "fighter");
  assert.equal(chooseClass(sworn.player, "spiritual", 3).ok, false);
});

test("plant grow harvest sell three wheat for +6 gold and farming XP", () => {
  let player = createPlayer("p2", "Bren", 1);
  for (let id = 0; id < 3; id += 1) {
    const planted = plant(player, id, "grain", 10);
    assert.equal(planted.ok, true);
    player = planted.player;
  }
  assert.equal(countItem(player.inventory, "wheat_seed"), 0);
  assert.equal(harvest(player, 0, 11).ok, false);
  for (let id = 0; id < 3; id += 1) {
    const ripe = harvest(player, id, 10 + GROW_MS.grain);
    assert.equal(ripe.ok, true);
    player = ripe.player;
  }
  assert.equal(countItem(player.inventory, "wheat"), 3);
  assert.ok(player.skills.farming.xp >= 18 * 3);
  const sold = sellWheat(player, 0, 20);
  assert.equal(sold.ok, true);
  assert.equal(sold.player.coins, 6);
  assert.equal(sold.message, "+6 Gold");
  assert.equal(countItem(sold.player.inventory, "wheat"), 0);
});

test("wolf leaves a pelt; pickup grants combat XP not gold", () => {
  const pilgrim = createPlayer("p3", "F", 1);
  assert.equal(wolfFalls(pilgrim, 3).ok, false);
  const there = setScene(pilgrim, "valley", 4).player;
  const down = wolfFalls(there, 5);
  assert.equal(down.ok, true);
  assert.equal(down.player.coins, 0);
  assert.equal(down.player.wolf.peltDropped, true);
  const loot = pickupPelt(down.player, 6);
  assert.equal(loot.ok, true);
  assert.equal(countItem(loot.player.inventory, "wolf_pelt"), 1);
  assert.equal(loot.player.skills.combat.xp, 25);
  assert.equal(loot.player.coins, 0);
  assert.equal(pickupPelt(loot.player, 7).ok, false);
});
