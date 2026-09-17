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
  breadHealAmount,
  mitigateDamage,
  playerStrikeDamage,
} from "./combat";
import { BREAD_HEAL, BREN_BREAD_REWARD_GOLD, BREN_GRAIN_REWARD_GOLD } from "./data/economy";
import {
  acceptQuest,
  bakeBread,
  buyFromBren,
  chooseClass,
  createPlayer,
  eatBread,
  enemyFalls,
  fulfillBrenDemand,
  harvest,
  hydratePlayer,
  maybeTimerRespawn,
  pickupLoot,
  pickupPelt,
  plant,
  recordStrike,
  recordWound,
  refreshBrenDemand,
  restAtBed,
  sellToBren,
  sellWheat,
  setScene,
  turnInQuest,
  usePotion,
  wolfFalls,
} from "./game-store";
import { addItem, countItem } from "./game/inventory";
import { GROW_MS } from "./types";

test("new pilgrim wakes at the hearth with one seed of each crop", () => {
  const pilgrim = createPlayer("p1", "Alan", 1);
  assert.equal(pilgrim.scene, "hearth");
  assert.equal(pilgrim.coins, 0);
  assert.equal(pilgrim.plots.length, 3);
  assert.equal(countItem(pilgrim.inventory, "wheat_seed"), 1);
  assert.equal(countItem(pilgrim.inventory, "root_seed"), 1);
  assert.equal(countItem(pilgrim.inventory, "herb_seed"), 1);
  assert.equal(pilgrim.brenDemand.kind, "bread");
  assert.equal(pilgrim.brenDemand.qty, 3);
  assert.equal(plant(pilgrim, 0, "grain", 2).ok, true);
});

test("class pick is optional and still persists if taken", () => {
  const pilgrim = createPlayer("p1b", "Alan", 1);
  const sworn = chooseClass(pilgrim, "fighter", 2);
  assert.equal(sworn.ok, true);
  assert.equal(sworn.player.classId, "fighter");
  assert.equal(chooseClass(sworn.player, "spiritual", 3).ok, false);
});

test("three crops grow on distinct clocks, return seeds, and grant Farming XP", () => {
  let player = createPlayer("p-crops", "Bren", 1);
  assert.equal(plant(player, 0, "grain", 10).ok, true);
  player = plant(player, 0, "grain", 10).player;
  player = plant(player, 1, "root", 10).player;
  player = plant(player, 2, "herb", 10).player;
  assert.equal(harvest(player, 0, 11).ok, false);
  assert.equal(harvest(player, 2, 10 + GROW_MS.herb - 1).ok, false);
  player = harvest(player, 2, 10 + GROW_MS.herb).player;
  assert.equal(countItem(player.inventory, "herb"), 1);
  assert.equal(countItem(player.inventory, "herb_seed"), 1);
  player = harvest(player, 0, 10 + GROW_MS.grain).player;
  player = harvest(player, 1, 10 + GROW_MS.root).player;
  assert.equal(countItem(player.inventory, "wheat"), 1);
  assert.equal(countItem(player.inventory, "root"), 1);
  assert.equal(countItem(player.inventory, "wheat_seed"), 1);
  assert.equal(countItem(player.inventory, "root_seed"), 1);
  assert.ok(player.skills.farming.xp >= 18 + 16 + 20);
});

test("plant grow harvest sell three wheat for +6 gold and farming XP", () => {
  let player = createPlayer("p2", "Bren", 1);
  for (let round = 0; round < 3; round += 1) {
    const now = 10 + round * (GROW_MS.grain + 5);
    const planted = plant(player, 0, "grain", now);
    assert.equal(planted.ok, true);
    player = planted.player;
    const ripe = harvest(player, 0, now + GROW_MS.grain);
    assert.equal(ripe.ok, true);
    player = ripe.player;
  }
  assert.equal(countItem(player.inventory, "wheat"), 3);
  assert.equal(countItem(player.inventory, "wheat_seed"), 1);
  assert.ok(player.skills.farming.xp >= 18 * 3);
  const sold = sellWheat(player, 0, 20);
  assert.equal(sold.ok, true);
  assert.equal(sold.player.coins, 6);
  assert.equal(sold.message, "+6 Gold");
  assert.equal(countItem(sold.player.inventory, "wheat"), 0);
});

test("roots and herbs sell at different prices", () => {
  let player = createPlayer("p-sell", "Alan", 1);
  player = plant(player, 1, "root", 1).player;
  player = plant(player, 2, "herb", 1).player;
  player = harvest(player, 1, 1 + GROW_MS.root).player;
  player = harvest(player, 2, 1 + GROW_MS.herb).player;
  const root = sellToBren(player, "root", 90);
  assert.equal(root.ok, true);
  assert.equal(root.player.coins, 3);
  const herb = sellToBren(root.player, "herb", 91);
  assert.equal(herb.ok, true);
  assert.equal(herb.player.coins, 8);
});

test("baking consumes wheat; eating bread heals less than a potion and is not a bed rest", () => {
  let player = createPlayer("p-bread", "Alan", 1);
  player = plant(player, 0, "grain", 1).player;
  player = harvest(player, 0, 1 + GROW_MS.grain).player;
  const baked = bakeBread(player, 50);
  assert.equal(baked.ok, true);
  assert.equal(countItem(baked.player.inventory, "wheat"), 0);
  assert.equal(countItem(baked.player.inventory, "bread"), 1);
  assert.equal(baked.player.skills.cooking.xp, 12);
  const full = eatBread(baked.player, 51);
  assert.equal(full.ok, false);
  const hurt = eatBread({ ...baked.player, health: 8 }, 52);
  assert.equal(hurt.ok, true);
  assert.equal(hurt.player.health, 8 + BREAD_HEAL);
  assert.equal(hurt.message, `+${BREAD_HEAL} HP · bread`);
  assert.equal(countItem(hurt.player.inventory, "bread"), 0);
  assert.notEqual(BREAD_HEAL, POTION_HEAL);
  assert.ok(BREAD_HEAL < PLAYER_MAX_HP);
});

test("Bren pays a neighbor bonus when three loaves arrive", () => {
  let player = createPlayer("p-demand", "Alan", 1);
  let inv = player.inventory;
  inv = addItem(inv, "bread", 3) ?? inv;
  player = { ...player, inventory: inv };
  const done = fulfillBrenDemand(player, 8);
  assert.equal(done.ok, true);
  assert.equal(done.player.coins, BREN_BREAD_REWARD_GOLD);
  assert.equal(countItem(done.player.inventory, "bread"), 0);
  assert.ok(done.player.brenDemand.fulfilledAt);
  assert.equal(fulfillBrenDemand(done.player, 9).ok, false);
  const next = refreshBrenDemand(done.player, 10);
  assert.equal(next.player.brenDemand.kind, "grain");
  assert.equal(next.player.brenDemand.fulfilledAt, null);
});

test("grain demand consumes wheat and pays the grain reward", () => {
  let player = createPlayer("p-grain-d", "Alan", 1);
  player = {
    ...player,
    brenDemand: { kind: "grain", qty: 3, fulfilledAt: null },
  };
  let inv = addItem(player.inventory, "wheat", 3) ?? player.inventory;
  player = { ...player, inventory: inv };
  const done = fulfillBrenDemand(player, 4);
  assert.equal(done.ok, true);
  assert.equal(done.player.coins, BREN_GRAIN_REWARD_GOLD);
  assert.equal(countItem(done.player.inventory, "wheat"), 0);
});

test("a mixed garden round pays toward the blade and armor", () => {
  let player = createPlayer("p2b", "Alan", 1);
  function farmRound(now: number) {
    player = plant(player, 0, "grain", now).player;
    player = plant(player, 1, "root", now).player;
    player = plant(player, 2, "herb", now).player;
    const ripe = now + GROW_MS.root;
    player = harvest(player, 0, ripe).player;
    player = harvest(player, 1, ripe).player;
    player = harvest(player, 2, ripe).player;
    player = sellToBren(player, "grain", ripe + 1).player;
    player = sellToBren(player, "root", ripe + 2).player;
    player = sellToBren(player, "herb", ripe + 3).player;
  }
  farmRound(10);
  assert.equal(player.coins, 10);
  const potion = buyFromBren(player, "potion", 20);
  assert.equal(potion.ok, true);
  player = potion.player;
  farmRound(80);
  const blade = buyFromBren(player, "sword", 90);
  assert.equal(blade.ok, true);
  assert.equal(blade.player.hasSword, true);
  player = blade.player;
  farmRound(160);
  farmRound(240);
  const coat = buyFromBren(player, "armor", 250);
  assert.equal(coat.ok, true);
  assert.equal(coat.player.hasArmor, true);
  assert.equal(countItem(coat.player.inventory, "health_potion"), 1);
});

test("old wheat-only saves gain a root and herb seed once", () => {
  const raw = createPlayer("old", "Ada", 1);
  const loaded = hydratePlayer({
    ...raw,
    livingBakery: false,
    inventory: addItem([], "wheat_seed", 3) ?? [],
  });
  assert.equal(countItem(loaded.inventory, "wheat_seed"), 3);
  assert.equal(countItem(loaded.inventory, "root_seed"), 1);
  assert.equal(countItem(loaded.inventory, "herb_seed"), 1);
  assert.equal(loaded.livingBakery, true);
});

test("wolf leaves a pelt; the kill grants Attack XP, not gold", () => {
  const pilgrim = createPlayer("p3", "F", 1);
  assert.equal(wolfFalls(pilgrim, 3).ok, false);
  const there = setScene(pilgrim, "valley", 4).player;
  const down = wolfFalls(there, 5);
  assert.equal(down.ok, true);
  assert.equal(down.player.coins, 0);
  assert.equal(down.player.wolf.peltDropped, true);
  assert.equal(down.player.skills.attack.xp, 25);
  const loot = pickupPelt(down.player, 6);
  assert.equal(loot.ok, true);
  assert.equal(countItem(loot.player.inventory, "wolf_pelt"), 1);
  assert.equal(loot.player.skills.attack.xp, 25);
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
  assert.equal(back.encounters.length, 7);
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

test("dire wolf drops hide; the kill grants more Attack XP than a pack wolf", () => {
  let player = setScene(createPlayer("p7", "Alan", 1), "valley", 2).player;
  const down = enemyFalls(player, "dire", 3);
  assert.equal(down.ok, true);
  assert.equal(down.player.skills.attack.xp, 60);
  const loot = pickupLoot(down.player, "dire", 4);
  assert.equal(loot.ok, true);
  assert.equal(countItem(loot.player.inventory, "dire_hide"), 1);
  assert.equal(loot.player.skills.attack.xp, 60);
});

test("dead wilderness foes respawn after 30s while the pilgrim stays", () => {
  let player = setScene(createPlayer("p8", "Alan", 1), "valley", 2).player;
  player = enemyFalls(player, "wolf-near", 3).player;
  assert.equal(player.encounters.find((item) => item.id === "wolf-near")?.alive, false);
  assert.equal(player.encounters.find((item) => item.id === "dire")?.alive, true);
  assert.equal(maybeTimerRespawn(player, 3 + 1_000).ok, false);
  const later = maybeTimerRespawn(player, 3 + RESPAWN_MS);
  assert.equal(later.ok, true);
  assert.equal(later.player.encounters.find((item) => item.id === "wolf-near")?.alive, true);
  assert.equal(later.player.encounters.find((item) => item.id === "dire")?.alive, true);
});

test("armor knocks a point off incoming bites; sword raises strike; skills still stack", () => {
  assert.equal(playerStrikeDamage(false), PLAYER_DAMAGE);
  assert.equal(playerStrikeDamage(true), SWORD_DAMAGE);
  assert.equal(playerStrikeDamage(false, 3), PLAYER_DAMAGE + 1);
  assert.equal(mitigateDamage(2, false), 2);
  assert.equal(mitigateDamage(2, true), 1);
  assert.equal(mitigateDamage(4, true), 3);
  assert.equal(mitigateDamage(4, false, 4), 3);
  assert.equal(breadHealAmount(1), BREAD_HEAL);
  assert.equal(breadHealAmount(3), BREAD_HEAL + 1);
});

test("strikes grant Attack XP and wounds grant Defense XP", () => {
  let player = setScene(createPlayer("p-xp", "Alan", 1), "valley", 2).player;
  player = recordStrike(player, 3).player;
  player = recordWound(player, 4).player;
  assert.equal(player.skills.attack.xp, 4);
  assert.equal(player.skills.defense.xp, 3);
});

test("Two Pelts for Bren can be accepted, progressed, and turned in", () => {
  let player = createPlayer("p-quest", "Alan", 1);
  assert.equal(player.quest.status, "available");
  const accepted = acceptQuest(player, 2);
  assert.equal(accepted.ok, true);
  assert.equal(accepted.player.quest.status, "active");
  assert.equal(turnInQuest(accepted.player, 3).ok, false);
  let inv = addItem(accepted.player.inventory, "wolf_pelt", 2) ?? accepted.player.inventory;
  player = { ...accepted.player, inventory: inv };
  const done = turnInQuest(player, 4);
  assert.equal(done.ok, true);
  assert.equal(done.player.quest.status, "complete");
  assert.equal(done.player.coins, 12);
  assert.equal(countItem(done.player.inventory, "wolf_pelt"), 0);
  assert.equal(done.player.skills.attack.xp, 40);
  assert.equal(turnInQuest(done.player, 5).ok, false);
});

test("boar and spider drop their own trophies", () => {
  let player = setScene(createPlayer("p-bestiary", "Alan", 1), "valley", 2).player;
  player = enemyFalls(player, "boar-west", 3).player;
  player = pickupLoot(player, "boar-west", 4).player;
  assert.equal(countItem(player.inventory, "boar_tusk"), 1);
  player = enemyFalls(player, "spider-east", 5).player;
  player = pickupLoot(player, "spider-east", 6).player;
  assert.equal(countItem(player.inventory, "spider_silk"), 1);
});

