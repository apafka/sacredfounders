import assert from "node:assert/strict";
import test from "node:test";
import {
  ARMOR_COST,
  PLAYER_DAMAGE,
  PLAYER_MAX_HP,
  POTION_COST,
  POTION_HEAL,
  RESPAWN_MS,
  SWORD_COST,
  SWORD_DAMAGE,
  mitigateDamage,
  playerStrikeDamage,
} from "./combat";
import {
  buyFromBren,
  chooseClass,
  createPlayer,
  enemyFalls,
  harvest,
  maybeTimerRespawn,
  pickupLoot,
  pickupPelt,
  plant,
  restAtBed,
  sellWheat,
  setScene,
  usePotion,
  wolfFalls,
} from "./game-store";
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
  assert.equal(countItem(player.inventory, "wheat_seed"), 3);
  assert.ok(player.skills.farming.xp >= 18 * 3);
  const sold = sellWheat(player, 0, 20);
  assert.equal(sold.ok, true);
  assert.equal(sold.player.coins, 6);
  assert.equal(sold.message, "+6 Gold");
  assert.equal(countItem(sold.player.inventory, "wheat"), 0);
});

test("a second garden round pays for the blade; a third covers armor", () => {
  let player = createPlayer("p2b", "Alan", 1);
  function farmRound(now: number) {
    for (let id = 0; id < 3; id += 1) {
      const planted = plant(player, id, "grain", now);
      assert.equal(planted.ok, true);
      player = planted.player;
    }
    for (let id = 0; id < 3; id += 1) {
      const ripe = harvest(player, id, now + GROW_MS.grain);
      assert.equal(ripe.ok, true);
      player = ripe.player;
    }
    const sold = sellWheat(player, 0, now + GROW_MS.grain + 1);
    assert.equal(sold.ok, true);
    player = sold.player;
  }
  farmRound(10);
  assert.equal(player.coins, 6);
  const potion = buyFromBren(player, "potion", 20);
  assert.equal(potion.ok, true);
  player = potion.player;
  farmRound(30);
  assert.equal(player.coins, 7);
  farmRound(50);
  const blade = buyFromBren(player, "sword", 70);
  assert.equal(blade.ok, true);
  assert.equal(blade.player.hasSword, true);
  player = blade.player;
  farmRound(80);
  farmRound(100);
  farmRound(120);
  const coat = buyFromBren(player, "armor", 140);
  assert.equal(coat.ok, true);
  assert.equal(coat.player.hasArmor, true);
  assert.equal(countItem(coat.player.inventory, "health_potion"), 1);
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

test("going home respawns every wilderness encounter", () => {
  let player = setScene(createPlayer("p4", "Alan", 1), "valley", 2).player;
  player = enemyFalls(player, "wolf-near", 3).player;
  player = enemyFalls(player, "dire", 4).player;
  assert.equal(player.encounters.find((item) => item.id === "wolf-near")?.alive, false);
  assert.equal(player.encounters.find((item) => item.id === "dire")?.alive, false);
  const home = setScene(player, "hearth", 5);
  assert.equal(home.ok, true);
  assert.ok(home.player.encounters.every((item) => item.alive && item.hp > 0 && !item.lootDropped));
  const back = setScene(home.player, "valley", 6).player;
  assert.ok(back.encounters.every((item) => item.alive));
  assert.equal(back.encounters.length, 4);
});

test("bed restores full health with feedback, and does little when already whole", () => {
  const full = restAtBed(createPlayer("p5", "Alan", 1), 2);
  assert.equal(full.ok, true);
  assert.equal(full.message, "Already rested.");
  const hurt = restAtBed({ ...createPlayer("p5b", "Alan", 1), health: 7 }, 3);
  assert.equal(hurt.ok, true);
  assert.equal(hurt.player.health, PLAYER_MAX_HP);
  assert.equal(hurt.message, `+${PLAYER_MAX_HP - 7} HP · rested`);
});

test("Old Bren sells potion, sword, and armor for gold and they persist", () => {
  let player = { ...createPlayer("p6", "Alan", 1), coins: 40 };
  const potion = buyFromBren(player, "potion", 2);
  assert.equal(potion.ok, true);
  assert.equal(potion.player.coins, 35);
  assert.equal(countItem(potion.player.inventory, "health_potion"), 1);
  const blade = buyFromBren(potion.player, "sword", 3);
  assert.equal(blade.ok, true);
  assert.equal(blade.player.hasSword, true);
  assert.equal(blade.player.strikeDamage, SWORD_DAMAGE);
  assert.equal(countItem(blade.player.inventory, "iron_blade"), 1);
  const coat = buyFromBren(blade.player, "armor", 4);
  assert.equal(coat.ok, true);
  assert.equal(coat.player.hasArmor, true);
  assert.equal(coat.player.coins, 40 - POTION_COST - SWORD_COST - ARMOR_COST);
  assert.equal(buyFromBren(coat.player, "sword", 5).ok, false);
  const sip = usePotion({ ...coat.player, health: 6 }, 6);
  assert.equal(sip.ok, true);
  assert.equal(sip.player.health, 6 + POTION_HEAL);
  assert.equal(countItem(sip.player.inventory, "health_potion"), 0);
});

test("dire wolf drops hide and more combat XP than a pack wolf", () => {
  let player = setScene(createPlayer("p7", "Alan", 1), "valley", 2).player;
  const down = enemyFalls(player, "dire", 3);
  assert.equal(down.ok, true);
  const loot = pickupLoot(down.player, "dire", 4);
  assert.equal(loot.ok, true);
  assert.equal(countItem(loot.player.inventory, "dire_hide"), 1);
  assert.equal(loot.player.skills.combat.xp, 60);
});

test("timer respawn is secondary to going home", () => {
  let player = setScene(createPlayer("p8", "Alan", 1), "valley", 2).player;
  for (const enc of player.encounters) {
    player = enemyFalls(player, enc.id, 3).player;
  }
  assert.ok(player.wildernessWipedAt);
  assert.equal(maybeTimerRespawn(player, (player.wildernessWipedAt ?? 0) + 1_000).ok, false);
  const later = maybeTimerRespawn(player, (player.wildernessWipedAt ?? 0) + RESPAWN_MS);
  assert.equal(later.ok, true);
  assert.ok(later.player.encounters.every((item) => item.alive && item.hp > 0));
});

test("armor knocks a point off incoming bites; sword raises strike", () => {
  assert.equal(playerStrikeDamage(false), PLAYER_DAMAGE);
  assert.equal(playerStrikeDamage(true), SWORD_DAMAGE);
  assert.equal(mitigateDamage(2, false), 2);
  assert.equal(mitigateDamage(2, true), 1);
  assert.equal(mitigateDamage(4, true), 3);
});

