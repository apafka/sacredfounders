import {
  ARMOR_COST,
  PLAYER_DAMAGE,
  PLAYER_MAX_HP,
  POTION_COST,
  POTION_HEAL,
  SWORD_COST,
  SWORD_DAMAGE,
  breadHealAmount,
  playerStrikeDamage,
  type BeastKind,
} from "./combat";
import { CROPS } from "./data/crops";
import { dropLabel, enemyDefinition } from "./data/enemies";
import {
  BAKE_WHEAT_COST,
  BREN_BREAD_REWARD_GOLD,
  BREN_BREAD_REWARD_XP,
  BREN_DEMAND_QTY,
  BREN_GRAIN_REWARD_GOLD,
  BREN_GRAIN_REWARD_XP,
  BREN_PRICES,
} from "./data/economy";
import { BREN, type ShopSku } from "./data/npcs";
import { TWO_PELTS, hydrateQuest, openingQuest } from "./data/quests";
import type { ItemId } from "./data/items";
import { plotReady } from "./crops";
import { addItem, countItem, emptyInventory, removeItem } from "./game/inventory";
import { demandItem } from "./game/npc";
import {
  ATTACK_XP_PER_HIT,
  COOKING_XP_PER_BAKE,
  DEFENSE_XP_PER_HIT,
  combatLevel,
  emptySkills,
  grantXp,
  hydrateSkills,
} from "./game/skills";
import {
  allEncountersDown,
  ensureEncounters,
  freshEncounters,
  mirrorWolf,
  reviveTimedEncounters,
} from "./game/wilderness";
import type { BrenDemand, ClassId, CropId, EncounterSave, GoodsId, PlayerState } from "./types";
import { GOODS_IDS } from "./types";

export type Result = { player: PlayerState; ok: boolean; message: string };

const emptyBasket = (): Record<GoodsId, number> => ({
  grain: 0,
  root: 0,
  herb: 0,
  fish: 0,
  loaf: 0,
});

const GOOD_ITEM: Record<Exclude<GoodsId, "fish">, ItemId> = {
  grain: "wheat",
  root: "root",
  herb: "herb",
  loaf: "bread",
};

export function sessionWallet(playerId: string): string {
  const hex = Array.from(playerId.replace(/-/g, ""))
    .map((ch) => ch.charCodeAt(0).toString(16).slice(-2))
    .join("")
    .padEnd(40, "a");
  return `0x${hex.slice(0, 40)}`;
}

function log(player: PlayerState, text: string, now: number): PlayerState {
  return { ...player, log: [{ at: now, text }, ...player.log].slice(0, 12) };
}

function withMirrors(player: PlayerState): PlayerState {
  const seeds = {
    grain: countItem(player.inventory, "wheat_seed"),
    root: countItem(player.inventory, "root_seed"),
    herb: countItem(player.inventory, "herb_seed"),
  };
  const basket = {
    ...player.basket,
    grain: countItem(player.inventory, "wheat"),
    root: countItem(player.inventory, "root"),
    herb: countItem(player.inventory, "herb"),
    loaf: countItem(player.inventory, "bread"),
  };
  return {
    ...player,
    seeds,
    basket,
    farmSkill: player.skills.farming.level,
    cookSkill: player.skills.cooking.level,
    xp: player.skills.attack.xp,
    level: combatLevel(player.skills),
    strikeDamage: playerStrikeDamage(player.hasSword, player.skills.attack.level),
  };
}

function starterInventory(): PlayerState["inventory"] {
  let inventory = emptyInventory();
  inventory = addItem(inventory, "wheat_seed", 1) ?? inventory;
  inventory = addItem(inventory, "root_seed", 1) ?? inventory;
  inventory = addItem(inventory, "herb_seed", 1) ?? inventory;
  return inventory;
}

export function openingBrenDemand(): BrenDemand {
  return { kind: "bread", qty: BREN_DEMAND_QTY, fulfilledAt: null };
}

export function nextBrenDemand(prev: BrenDemand | null | undefined): BrenDemand {
  if (!prev) return openingBrenDemand();
  const kind = prev.kind === "bread" ? "grain" : "bread";
  return { kind, qty: BREN_DEMAND_QTY, fulfilledAt: null };
}

export function createPlayer(id: string, name: string, now = Date.now()): PlayerState {
  const inventory = starterInventory();
  return withMirrors({
    id,
    name: name.trim().slice(0, 24) || "Pilgrim",
    classId: null,
    scene: "hearth",
    coins: 0,
    health: PLAYER_MAX_HP,
    maxHealth: PLAYER_MAX_HP,
    farmSkill: 1,
    fishSkill: 0,
    cookSkill: 1,
    harvests: 0,
    wolves: 0,
    xp: 0,
    level: 1,
    hasSword: false,
    hasArmor: false,
    strikeDamage: PLAYER_DAMAGE,
    lastFishAt: 0,
    seeds: { grain: 1, root: 1, herb: 1 },
    basket: emptyBasket(),
    inventory,
    skills: emptySkills(),
    plots: Array.from({ length: 3 }, (_, plotId) => ({ id: plotId, crop: null, plantedAt: null })),
    position: null,
    encounters: freshEncounters(),
    wolf: mirrorWolf(freshEncounters()),
    wildernessWipedAt: null,
    brenDemand: openingBrenDemand(),
    quest: openingQuest(),
    livingBakery: true,
    whisper: "The fire kept. The garden is yours. The door waits whenever you do.",
    log: [{ at: now, text: "You wake at the hearth. This is home." }],
    walletAddress: sessionWallet(id),
    enteredAt: now,
  });
}

export function chooseClass(player: PlayerState, classId: ClassId, now = Date.now()): Result {
  if (player.classId) return { player, ok: false, message: "You already chose a path." };
  if (classId !== "fighter" && classId !== "spiritual") {
    return { player, ok: false, message: "Unknown path." };
  }
  const label = classId === "fighter" ? "Fighter" : "Spiritual";
  return {
    player: log({ ...player, classId }, `${label} path noted — the hearth does not judge.`, now),
    ok: true,
    message: `${label} path taken.`,
  };
}

export function plant(player: PlayerState, plotId: number, crop: CropId, now = Date.now()): Result {
  const plot = player.plots[plotId];
  if (!plot || plot.crop) return { player, ok: false, message: "That bed is not free." };
  const def = CROPS[crop];
  if (!def) return { player, ok: false, message: "Unknown crop." };
  const nextInv = removeItem(player.inventory, def.seedItem, 1);
  if (!nextInv) return { player, ok: false, message: `No ${def.name.toLowerCase()} seed.` };
  const plots = player.plots.map((p) => (p.id === plotId ? { ...p, crop, plantedAt: now } : p));
  const next = withMirrors(
    log({ ...player, plots, inventory: nextInv }, `You press a ${def.name.toLowerCase()} seed into the soil.`, now),
  );
  return { player: next, ok: true, message: `Planted ${def.name}.` };
}

export function harvest(player: PlayerState, plotId: number, now = Date.now()): Result {
  const plot = player.plots[plotId];
  if (!plot?.crop || plot.plantedAt == null) return { player, ok: false, message: "Nothing to harvest." };
  if (!plotReady(plot.plantedAt, plot.crop, player.skills.farming.xp, now)) {
    return { player, ok: false, message: "Still growing." };
  }
  const def = CROPS[plot.crop];
  const plots = player.plots.map((p) => (p.id === plotId ? { ...p, crop: null, plantedAt: null } : p));
  let nextInv = addItem(player.inventory, def.harvestItem, def.harvestAmount);
  if (!nextInv) return { player, ok: false, message: "Inventory is full." };
  const seedBack = addItem(nextInv, def.seedItem, def.seedReturn);
  if (seedBack) nextInv = seedBack;
  const gained = grantXp(player.skills, "farming", def.xp);
  const next = withMirrors(
    log(
      {
        ...player,
        plots,
        inventory: nextInv,
        skills: gained.skills,
        harvests: player.harvests + 1,
      },
      `${def.name} in hand. +${def.xp} Farming XP${gained.leveled ? `. Farming ${gained.skills.farming.level}.` : "."}`,
      now,
    ),
  );
  return {
    player: next,
    ok: true,
    message: gained.leveled
      ? `Harvested ${def.name}. Farming ${gained.skills.farming.level}.`
      : `Harvested ${def.name}.`,
  };
}

export function sellToBren(player: PlayerState, good: GoodsId, now = Date.now()): Result {
  if (good === "grain") return sellWheat(player, 0, now);
  if (good === "fish") {
    if (player.basket.fish < 1) return { player, ok: false, message: "No fish in the basket." };
    const price = BREN_PRICES.fish;
    const basket = { ...player.basket, fish: player.basket.fish - 1 };
    const coins = player.coins + price;
    return {
      player: withMirrors(log({ ...player, basket, coins }, `Sold fish to Old Bren for ${price} gold.`, now)),
      ok: true,
      message: `+${price} Gold`,
    };
  }
  const item = GOOD_ITEM[good];
  const have = countItem(player.inventory, item);
  if (have < 1) return { player, ok: false, message: `No ${item} to sell.` };
  const nextInv = removeItem(player.inventory, item, have);
  if (!nextInv) return { player, ok: false, message: `No ${item} to sell.` };
  const price = BREN_PRICES[good];
  const gold = have * price;
  const next = withMirrors(
    log(
      { ...player, inventory: nextInv, coins: player.coins + gold, whisper: BREN.thanks },
      `Old Bren takes ${have} ${item}. +${gold} Gold.`,
      now,
    ),
  );
  return { player: next, ok: true, message: `+${gold} Gold` };
}

export function sellWheat(player: PlayerState, qty = 0, now = Date.now()): Result {
  const have = countItem(player.inventory, "wheat");
  const amount = qty > 0 ? Math.min(qty, have) : have;
  if (amount < 1) return { player, ok: false, message: BREN.emptyHands };
  const nextInv = removeItem(player.inventory, "wheat", amount);
  if (!nextInv) return { player, ok: false, message: BREN.emptyHands };
  const gold = amount * BREN.buyPrice;
  const next = withMirrors(
    log(
      {
        ...player,
        inventory: nextInv,
        coins: player.coins + gold,
        whisper: BREN.thanks,
      },
      `Old Bren takes ${amount} wheat. +${gold} Gold.`,
      now,
    ),
  );
  return { player: next, ok: true, message: `+${gold} Gold` };
}

export function fishCreek(player: PlayerState, rng = Math.random, now = Date.now()): Result {
  if (player.scene !== "hearth") return { player, ok: false, message: "The creek is by the hearth." };
  if (player.lastFishAt > 0 && now - player.lastFishAt < 2500) {
    return { player, ok: false, message: "The water stills. Wait a breath." };
  }
  const extra = rng() < 0.22 ? 1 : 0;
  const amount = 1 + extra;
  const basket = { ...player.basket, fish: player.basket.fish + amount };
  const fishSkill = player.fishSkill + 1;
  return {
    player: log(
      { ...player, basket, fishSkill, lastFishAt: now },
      `You pull ${amount} fish from the creek.`,
      now,
    ),
    ok: true,
    message: `Caught ${amount} fish.`,
  };
}

/** 1 wheat → 1 bread. Grain is spent. */
export function bakeBread(player: PlayerState, now = Date.now()): Result {
  if (player.scene !== "hearth") return { player, ok: false, message: "The oven is at the hearth." };
  if (countItem(player.inventory, "wheat") < BAKE_WHEAT_COST) {
    return { player, ok: false, message: "Need wheat for bread." };
  }
  const spent = removeItem(player.inventory, "wheat", BAKE_WHEAT_COST);
  if (!spent) return { player, ok: false, message: "Need wheat for bread." };
  const nextInv = addItem(spent, "bread", 1);
  if (!nextInv) return { player, ok: false, message: "Inventory is full." };
  const gained = grantXp(player.skills, "cooking", COOKING_XP_PER_BAKE);
  const next = withMirrors(
    log(
      {
        ...player,
        inventory: nextInv,
        skills: gained.skills,
        whisper: BREN.bake,
      },
      `Wheat in, bread out. +${COOKING_XP_PER_BAKE} Cooking XP${gained.leveled ? `. Cooking ${gained.skills.cooking.level}.` : "."}`,
      now,
    ),
  );
  return {
    player: next,
    ok: true,
    message: gained.leveled ? `Baked bread. Cooking ${gained.skills.cooking.level}.` : "Baked bread.",
  };
}

/** @deprecated Use bakeBread. Kept for the old cook action. */
export function cookLoaf(player: PlayerState, now = Date.now()): Result {
  return bakeBread(player, now);
}

export function eatBread(player: PlayerState, now = Date.now()): Result {
  if (player.health >= player.maxHealth) return { player, ok: false, message: "You are already whole." };
  const nextInv = removeItem(player.inventory, "bread", 1);
  if (!nextInv) return { player, ok: false, message: "No bread." };
  const healed = Math.min(breadHealAmount(player.skills.cooking.level), player.maxHealth - player.health);
  const next = withMirrors(
    log(
      { ...player, inventory: nextInv, health: player.health + healed },
      `The loaf is warm. +${healed} HP.`,
      now,
    ),
  );
  return { player: next, ok: true, message: `+${healed} HP · bread` };
}

export function refreshBrenDemand(player: PlayerState, now = Date.now()): Result {
  const demand = player.brenDemand;
  if (demand && demand.fulfilledAt == null) {
    return { player, ok: true, message: "" };
  }
  const nextDemand = nextBrenDemand(demand);
  const line = nextDemand.kind === "bread" ? BREN.demandBread : BREN.demandGrain;
  return {
    player: withMirrors(log({ ...player, brenDemand: nextDemand, whisper: line }, line, now)),
    ok: true,
    message: line,
  };
}

export function fulfillBrenDemand(player: PlayerState, now = Date.now()): Result {
  const current = player.brenDemand && player.brenDemand.fulfilledAt == null ? player.brenDemand : null;
  if (!current) return { player, ok: false, message: "Bren is not asking for anything." };
  const item = demandItem(current.kind);
  const have = countItem(player.inventory, item);
  if (have < current.qty) {
    const line = current.kind === "bread" ? BREN.demandBread : BREN.demandGrain;
    return { player: { ...player, whisper: line }, ok: false, message: line };
  }
  const nextInv = removeItem(player.inventory, item, current.qty);
  if (!nextInv) return { player, ok: false, message: "Nothing to hand over." };
  const gold = current.kind === "bread" ? BREN_BREAD_REWARD_GOLD : BREN_GRAIN_REWARD_GOLD;
  const xp = current.kind === "bread" ? BREN_BREAD_REWARD_XP : BREN_GRAIN_REWARD_XP;
  const gained = grantXp(player.skills, "farming", xp);
  const thanks = current.kind === "bread" ? BREN.demandThanksBread : BREN.demandThanksGrain;
  const next = withMirrors(
    log(
      {
        ...player,
        inventory: nextInv,
        coins: player.coins + gold,
        skills: gained.skills,
        brenDemand: { ...current, fulfilledAt: now },
        whisper: thanks,
      },
      `${thanks} +${gold} Gold. +${xp} Farming XP${gained.leveled ? `. Farming ${gained.skills.farming.level}.` : "."}`,
      now,
    ),
  );
  return {
    player: next,
    ok: true,
    message: `+${gold} Gold · Bren is fed`,
  };
}

export function setScene(player: PlayerState, scene: PlayerState["scene"], now = Date.now()): Result {
  let next: PlayerState = { ...player, scene, position: null };
  if (player.scene === "valley" && scene === "hearth") {
    next = respawnWilderness(next);
    return {
      player: log(next, "The hearth takes you back. The valley will not stay empty.", now),
      ok: true,
      message: "The hearth takes you back.",
    };
  }
  const text = scene === "valley" ? "The path leans toward the trees." : "The hearth takes you back.";
  return {
    player: log(next, text, now),
    ok: true,
    message: text,
  };
}

export function respawnWilderness(player: PlayerState): PlayerState {
  const encounters = freshEncounters();
  return {
    ...player,
    encounters,
    wolf: mirrorWolf(encounters),
    wildernessWipedAt: null,
  };
}

export function maybeTimerRespawn(player: PlayerState, now = Date.now()): Result {
  if (player.scene !== "valley") return { player, ok: false, message: "The valley is through the door." };
  const encounters = player.encounters.length ? player.encounters : ensureEncounters(null, player.wolf);
  const { encounters: nextEncounters, revived } = reviveTimedEncounters(encounters, now);
  if (revived.length === 0) {
    return { player, ok: false, message: "The woods still hold their dead." };
  }
  const next = withEncounters({ ...player }, nextEncounters, now);
  const line = revived.length === 1 ? "A shape answers again from the trees." : "The pack answers again from the trees.";
  return { player: log(next, line, now), ok: true, message: line };
}

export function restAtBed(player: PlayerState, now = Date.now()): Result {
  if (player.scene !== "hearth") return { player, ok: false, message: "Your bed is at the hearth." };
  if (player.health >= player.maxHealth) {
    return {
      player: log({ ...player, whisper: "The bed knows you are already whole." }, "You lie down. You are already rested.", now),
      ok: true,
      message: "Already rested.",
    };
  }
  const healed = player.maxHealth - player.health;
  return {
    player: log(
      { ...player, health: player.maxHealth, whisper: "Sleep takes the ache." },
      `You rest. +${healed} HP.`,
      now,
    ),
    ok: true,
    message: `+${healed} HP · rested`,
  };
}

function grantGear(player: PlayerState, itemId: ItemId): PlayerState | null {
  if (countItem(player.inventory, itemId) > 0) return player;
  const nextInv = addItem(player.inventory, itemId, 1);
  if (!nextInv) return null;
  return { ...player, inventory: nextInv };
}

export function buyFromBren(player: PlayerState, sku: ShopSku, now = Date.now()): Result {
  if (sku === "potion") return buyPotion(player, now);
  if (sku === "sword") return buySword(player, now);
  if (sku === "armor") return buyArmor(player, now);
  return { player, ok: false, message: "Bren shakes his head." };
}

export function buyPotion(player: PlayerState, now = Date.now()): Result {
  if (player.coins < POTION_COST) return { player, ok: false, message: `Old Bren asks ${POTION_COST} gold.` };
  const nextInv = addItem(player.inventory, "health_potion", 1);
  if (!nextInv) return { player, ok: false, message: "Inventory is full." };
  const next = withMirrors(
    log(
      { ...player, inventory: nextInv, coins: player.coins - POTION_COST, whisper: BREN.shop },
      `A potion for ${POTION_COST} gold.`,
      now,
    ),
  );
  return { player: next, ok: true, message: `+Health Potion · −${POTION_COST} Gold` };
}

export function buySword(player: PlayerState, now = Date.now()): Result {
  if (player.hasSword) return { player, ok: false, message: "You already carry a blade." };
  if (player.coins < SWORD_COST) return { player, ok: false, message: `Old Bren asks ${SWORD_COST} gold.` };
  const geared = grantGear({ ...player, coins: player.coins - SWORD_COST, hasSword: true, strikeDamage: SWORD_DAMAGE }, "iron_blade");
  if (!geared) return { player, ok: false, message: "Inventory is full." };
  return {
    player: withMirrors(log(geared, `A blade for ${SWORD_COST} gold. Your strike hits harder.`, now)),
    ok: true,
    message: `+Iron Blade · −${SWORD_COST} Gold`,
  };
}

export function buyArmor(player: PlayerState, now = Date.now()): Result {
  if (player.hasArmor) return { player, ok: false, message: "You already wear a hide coat." };
  if (player.coins < ARMOR_COST) return { player, ok: false, message: `Old Bren asks ${ARMOR_COST} gold.` };
  const geared = grantGear({ ...player, coins: player.coins - ARMOR_COST, hasArmor: true }, "hide_armor");
  if (!geared) return { player, ok: false, message: "Inventory is full." };
  return {
    player: withMirrors(log(geared, `Hide armor for ${ARMOR_COST} gold. Bites land softer.`, now)),
    ok: true,
    message: `+Hide Armor · −${ARMOR_COST} Gold`,
  };
}

export function usePotion(player: PlayerState, now = Date.now()): Result {
  if (player.health >= player.maxHealth) return { player, ok: false, message: "You are already whole." };
  const nextInv = removeItem(player.inventory, "health_potion", 1);
  if (!nextInv) return { player, ok: false, message: "No potion." };
  const healed = Math.min(POTION_HEAL, player.maxHealth - player.health);
  const next = withMirrors(
    log(
      { ...player, inventory: nextInv, health: player.health + healed },
      `The potion bites warm. +${healed} HP.`,
      now,
    ),
  );
  return { player: next, ok: true, message: `+${healed} HP` };
}

function withEncounters(player: PlayerState, encounters: EncounterSave[], now = Date.now()): PlayerState {
  return {
    ...player,
    encounters,
    wolf: mirrorWolf(encounters),
    wildernessWipedAt: allEncountersDown(encounters) ? (player.wildernessWipedAt ?? now) : null,
  };
}

export function enemyFalls(player: PlayerState, encounterId: string, now = Date.now()): Result {
  if (player.scene !== "valley") return { player, ok: false, message: "The pack is through the door." };
  const encounters = player.encounters.length ? player.encounters : ensureEncounters(null, player.wolf);
  const index = encounters.findIndex((item) => item.id === encounterId);
  if (index < 0) return { player, ok: false, message: "Nothing there to fall." };
  const target = encounters[index];
  if (!target.alive && target.lootDropped) {
    return { player: withEncounters(player, encounters), ok: true, message: "Already still." };
  }
  const kind = target.kind;
  const nextEncounters = encounters.map((item, i) =>
    i === index ? { ...item, alive: false, hp: 0, lootDropped: true, diedAt: now } : item,
  );
  const def = enemyDefinition(kind);
  const gained = target.alive ? grantXp(player.skills, "attack", def.xp) : { skills: player.skills, leveled: false };
  const next = withMirrors(
    withEncounters(
      {
        ...player,
        skills: gained.skills,
        wolves: player.wolves + (target.alive ? 1 : 0),
      },
      nextEncounters,
      now,
    ),
  );
  return {
    player: log(
      next,
      `${def.name} falls. ${dropLabel(kind)} in the grass. +${def.xp} Attack XP${gained.leveled ? `. Attack ${gained.skills.attack.level}.` : "."}`,
      now,
    ),
    ok: true,
    message: `${def.name} falls.`,
  };
}

export function wolfFalls(player: PlayerState, now = Date.now()): Result {
  const id = player.encounters[0]?.id ?? "wolf-near";
  return enemyFalls(player, id, now);
}

export function pickupLoot(player: PlayerState, encounterId: string, now = Date.now()): Result {
  const encounters = player.encounters.length ? player.encounters : ensureEncounters(null, player.wolf);
  const index = encounters.findIndex((item) => item.id === encounterId);
  if (index < 0) return { player, ok: false, message: "No pelt on the ground." };
  const target = encounters[index];
  if (target.lootTaken) return { player, ok: false, message: "That prize is already yours." };
  if (target.alive || !target.lootDropped) return { player, ok: false, message: "No pelt on the ground." };
  const drop = enemyDefinition(target.kind).drops[0];
  if (!drop) return { player, ok: false, message: "Nothing to take." };
  const nextInv = addItem(player.inventory, drop.itemId, drop.qty);
  if (!nextInv) return { player, ok: false, message: "Inventory is full." };
  const nextEncounters = encounters.map((item, i) => (i === index ? { ...item, lootDropped: false, lootTaken: true } : item));
  const label = dropLabel(target.kind);
  const next = withMirrors(
    log(
      withEncounters({ ...player, inventory: nextInv }, nextEncounters, now),
      `${label} acquired.`,
      now,
    ),
  );
  return { player: next, ok: true, message: `${label} acquired.` };
}

export function recordStrike(player: PlayerState, now = Date.now()): Result {
  if (player.scene !== "valley") return { player, ok: false, message: "" };
  const gained = grantXp(player.skills, "attack", ATTACK_XP_PER_HIT);
  const next = withMirrors({ ...player, skills: gained.skills });
  if (!gained.leveled) return { player: next, ok: true, message: "" };
  return {
    player: log(next, `Attack ${gained.skills.attack.level}.`, now),
    ok: true,
    message: `Attack ${gained.skills.attack.level}.`,
  };
}

export function recordWound(player: PlayerState, now = Date.now()): Result {
  if (player.scene !== "valley") return { player, ok: false, message: "" };
  const gained = grantXp(player.skills, "defense", DEFENSE_XP_PER_HIT);
  const next = withMirrors({ ...player, skills: gained.skills });
  if (!gained.leveled) return { player: next, ok: true, message: "" };
  return {
    player: log(next, `Defense ${gained.skills.defense.level}.`, now),
    ok: true,
    message: `Defense ${gained.skills.defense.level}.`,
  };
}

export function acceptQuest(player: PlayerState, now = Date.now()): Result {
  const quest = hydrateQuest(player.quest);
  if (quest.status === "complete") return { player, ok: false, message: "Bren already has his pelts." };
  if (quest.status === "active") {
    return { player: { ...player, whisper: TWO_PELTS.active }, ok: true, message: TWO_PELTS.active };
  }
  const next = withMirrors(
    log(
      { ...player, quest: { ...quest, status: "active" }, whisper: TWO_PELTS.offer },
      TWO_PELTS.offer,
      now,
    ),
  );
  return { player: next, ok: true, message: TWO_PELTS.offer };
}

export function turnInQuest(player: PlayerState, now = Date.now()): Result {
  const quest = hydrateQuest(player.quest);
  if (quest.status === "complete") return { player, ok: false, message: "Bren already has his pelts." };
  if (quest.status !== "active") return { player, ok: false, message: TWO_PELTS.offer };
  const have = countItem(player.inventory, TWO_PELTS.itemId);
  if (have < TWO_PELTS.need) {
    return { player: { ...player, whisper: TWO_PELTS.active }, ok: false, message: TWO_PELTS.active };
  }
  const nextInv = removeItem(player.inventory, TWO_PELTS.itemId, TWO_PELTS.need);
  if (!nextInv) return { player, ok: false, message: TWO_PELTS.active };
  const gained = grantXp(player.skills, "attack", TWO_PELTS.attackXp);
  const next = withMirrors(
    log(
      {
        ...player,
        inventory: nextInv,
        coins: player.coins + TWO_PELTS.gold,
        skills: gained.skills,
        quest: { ...quest, status: "complete", delivered: TWO_PELTS.need, completedAt: now },
        whisper: TWO_PELTS.thanks,
      },
      `${TWO_PELTS.thanks} +${TWO_PELTS.gold} Gold. +${TWO_PELTS.attackXp} Attack XP${gained.leveled ? `. Attack ${gained.skills.attack.level}.` : "."}`,
      now,
    ),
  );
  return { player: next, ok: true, message: `+${TWO_PELTS.gold} Gold · Bren has his pelts` };
}

export function pickupPelt(player: PlayerState, now = Date.now()): Result {
  const dropped = player.encounters.find((item) => item.lootDropped && !item.lootTaken);
  const id = dropped?.id ?? player.encounters[0]?.id ?? "wolf-near";
  return pickupLoot(player, id, now);
}

/** Legacy name: a kill no longer pays gold. It leaves a pelt. */
export function wolfLoot(player: PlayerState, _kind: BeastKind = "pack", now = Date.now()): Result {
  return wolfFalls(player, now);
}

export function setHealth(player: PlayerState, health: number): PlayerState {
  return { ...player, health: Math.max(0, Math.min(player.maxHealth, health)) };
}

export function setPosition(player: PlayerState, x: number, y: number): PlayerState {
  return { ...player, position: { x, y } };
}

export function basketTotal(player: PlayerState): number {
  return GOODS_IDS.reduce((sum, id) => sum + player.basket[id], 0);
}

function pushItem(inventory: PlayerState["inventory"], itemId: ItemId, qty: number) {
  if (qty < 1) return inventory;
  return addItem(inventory, itemId, qty) ?? inventory;
}

export function hydratePlayer(raw: PlayerState): PlayerState {
  let inventory = raw.inventory?.length
    ? raw.inventory
    : addItem(
        addItem(emptyInventory(), "wheat_seed", Math.max(0, raw.seeds?.grain ?? 0)) ?? [],
        "wheat",
        Math.max(0, raw.basket?.grain ?? 0),
      ) ?? [];
  if (countItem(inventory, "root") === 0) inventory = pushItem(inventory, "root", raw.basket?.root ?? 0);
  if (countItem(inventory, "herb") === 0) inventory = pushItem(inventory, "herb", raw.basket?.herb ?? 0);
  if (countItem(inventory, "bread") === 0) inventory = pushItem(inventory, "bread", raw.basket?.loaf ?? 0);
  if (countItem(inventory, "root_seed") === 0) inventory = pushItem(inventory, "root_seed", raw.seeds?.root ?? 0);
  if (countItem(inventory, "herb_seed") === 0) inventory = pushItem(inventory, "herb_seed", raw.seeds?.herb ?? 0);
  const livingBakery = Boolean(raw.livingBakery);
  if (!livingBakery) {
    if (countItem(inventory, "root_seed") === 0) inventory = pushItem(inventory, "root_seed", 1);
    if (countItem(inventory, "herb_seed") === 0) inventory = pushItem(inventory, "herb_seed", 1);
  }
  const plots =
    raw.plots?.length >= 3
      ? raw.plots.slice(0, 3).map((plot, id) => ({ id, crop: plot.crop, plantedAt: plot.plantedAt }))
      : Array.from({ length: 3 }, (_, id) => ({ id, crop: null, plantedAt: null }));
  const skills = hydrateSkills(raw.skills, raw);
  const hasSword = Boolean(raw.hasSword) || countItem(inventory, "iron_blade") > 0;
  const hasArmor = Boolean(raw.hasArmor) || countItem(inventory, "hide_armor") > 0;
  const encounters = ensureEncounters(raw.encounters, raw.wolf);
  const brenDemand =
    raw.brenDemand && (raw.brenDemand.kind === "bread" || raw.brenDemand.kind === "grain")
      ? {
          kind: raw.brenDemand.kind,
          qty: raw.brenDemand.qty || BREN_DEMAND_QTY,
          fulfilledAt: raw.brenDemand.fulfilledAt ?? null,
        }
      : openingBrenDemand();
  return withMirrors({
    ...raw,
    health: raw.health ?? PLAYER_MAX_HP,
    maxHealth: raw.maxHealth ?? PLAYER_MAX_HP,
    hasSword,
    hasArmor,
    strikeDamage: playerStrikeDamage(hasSword, skills.attack.level),
    inventory,
    skills,
    plots,
    position: raw.position ?? null,
    encounters,
    wolf: mirrorWolf(encounters),
    wildernessWipedAt: raw.wildernessWipedAt ?? null,
    brenDemand,
    quest: hydrateQuest(raw.quest),
    livingBakery: true,
    seeds: {
      grain: raw.seeds?.grain ?? 0,
      root: raw.seeds?.root ?? 0,
      herb: raw.seeds?.herb ?? 0,
    },
    basket: {
      grain: raw.basket?.grain ?? 0,
      root: raw.basket?.root ?? 0,
      herb: raw.basket?.herb ?? 0,
      fish: raw.basket?.fish ?? 0,
      loaf: raw.basket?.loaf ?? 0,
    },
  });
}
