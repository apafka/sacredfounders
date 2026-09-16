import {
  ARMOR_COST,
  PLAYER_DAMAGE,
  PLAYER_MAX_HP,
  POTION_COST,
  POTION_HEAL,
  RESPAWN_MS,
  SWORD_COST,
  SWORD_DAMAGE,
  playerStrikeDamage,
  type BeastKind,
} from "./combat";
import { CROPS } from "./data/crops";
import { enemyDefinition } from "./data/enemies";
import { BREN, type ShopSku } from "./data/npcs";
import type { ItemId } from "./data/items";
import { plotReady } from "./crops";
import { addItem, countItem, emptyInventory, removeItem } from "./game/inventory";
import { emptySkills, grantXp } from "./game/skills";
import {
  allEncountersDown,
  ensureEncounters,
  freshEncounters,
  mirrorWolf,
  shouldTimerRespawn,
} from "./game/wilderness";
import type { ClassId, CropId, EncounterSave, GoodsId, PlayerState } from "./types";
import { BREN_PRICES, GOODS_IDS } from "./types";

export type Result = { player: PlayerState; ok: boolean; message: string };

const emptyBasket = (): Record<GoodsId, number> => ({
  grain: 0,
  root: 0,
  herb: 0,
  fish: 0,
  loaf: 0,
});

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
    root: player.seeds.root,
    herb: player.seeds.herb,
  };
  const basket = {
    ...player.basket,
    grain: countItem(player.inventory, "wheat"),
  };
  return {
    ...player,
    seeds,
    basket,
    farmSkill: player.skills.farming.level,
    xp: player.skills.combat.xp,
    level: player.skills.combat.level,
  };
}

export function createPlayer(id: string, name: string, now = Date.now()): PlayerState {
  const inventory = addItem(emptyInventory(), "wheat_seed", 3) ?? [];
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
    cookSkill: 0,
    harvests: 0,
    wolves: 0,
    xp: 0,
    level: 1,
    hasSword: false,
    hasArmor: false,
    strikeDamage: PLAYER_DAMAGE,
    lastFishAt: 0,
    seeds: { grain: 3, root: 0, herb: 0 },
    basket: emptyBasket(),
    inventory,
    skills: emptySkills(),
    plots: Array.from({ length: 3 }, (_, plotId) => ({ id: plotId, crop: null, plantedAt: null })),
    position: null,
    encounters: freshEncounters(),
    wolf: mirrorWolf(freshEncounters()),
    wildernessWipedAt: null,
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
  if (crop !== "grain") {
    if (player.seeds[crop] < 1) return { player, ok: false, message: `No ${crop} seed.` };
    const plots = player.plots.map((p) => (p.id === plotId ? { ...p, crop, plantedAt: now } : p));
    const seeds = { ...player.seeds, [crop]: player.seeds[crop] - 1 };
    return {
      player: log({ ...player, plots, seeds }, `Planted ${crop} in bed ${plotId + 1}.`, now),
      ok: true,
      message: `Planted ${crop}.`,
    };
  }
  const nextInv = removeItem(player.inventory, "wheat_seed", 1);
  if (!nextInv) return { player, ok: false, message: "No wheat seed." };
  const plots = player.plots.map((p) => (p.id === plotId ? { ...p, crop, plantedAt: now } : p));
  const next = withMirrors(
    log({ ...player, plots, inventory: nextInv }, `You press a seed into the soil.`, now),
  );
  return { player: next, ok: true, message: "Planted wheat." };
}

export function harvest(player: PlayerState, plotId: number, now = Date.now()): Result {
  const plot = player.plots[plotId];
  if (!plot?.crop || plot.plantedAt == null) return { player, ok: false, message: "Nothing to harvest." };
  if (!plotReady(plot.plantedAt, plot.crop, player.skills.farming.xp, now)) {
    return { player, ok: false, message: "Still growing." };
  }
  const crop = plot.crop;
  const plots = player.plots.map((p) => (p.id === plotId ? { ...p, crop: null, plantedAt: null } : p));

  if (crop !== "grain") {
    const basket = { ...player.basket, [crop]: player.basket[crop] + 1 };
    const farmSkill = player.farmSkill + 1;
    return {
      player: log(
        { ...player, plots, basket, farmSkill, harvests: player.harvests + 1 },
        `Harvested ${crop}.`,
        now,
      ),
      ok: true,
      message: `Harvested ${crop}.`,
    };
  }

  const amount = CROPS.grain.harvestAmount;
  let nextInv = addItem(player.inventory, "wheat", amount);
  if (!nextInv) return { player, ok: false, message: "Inventory is full." };
  const seedBack = addItem(nextInv, CROPS.grain.seedItem, CROPS.grain.seedReturn);
  if (seedBack) nextInv = seedBack;
  const gained = grantXp(player.skills, "farming", CROPS.grain.xp);
  const next = withMirrors(
    log(
      {
        ...player,
        plots,
        inventory: nextInv,
        skills: gained.skills,
        harvests: player.harvests + 1,
      },
      `Wheat in hand. +${CROPS.grain.xp} Farming XP${gained.leveled ? `. Farming ${gained.skills.farming.level}.` : "."}`,
      now,
    ),
  );
  return {
    player: next,
    ok: true,
    message: gained.leveled
      ? `Harvested wheat. Farming ${gained.skills.farming.level}.`
      : "Harvested wheat.",
  };
}

export function sellToBren(player: PlayerState, good: GoodsId, now = Date.now()): Result {
  if (good === "grain") {
    return sellWheat(player, 1, now);
  }
  if (player.basket[good] < 1) return { player, ok: false, message: `No ${good} in the basket.` };
  const price = BREN_PRICES[good];
  const basket = { ...player.basket, [good]: player.basket[good] - 1 };
  const coins = player.coins + price;
  return {
    player: log({ ...player, basket, coins }, `Sold ${good} to Old Bren for ${price} gold.`, now),
    ok: true,
    message: `+${price} Gold`,
  };
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

export function cookLoaf(player: PlayerState, now = Date.now()): Result {
  if (player.scene !== "hearth") return { player, ok: false, message: "The kitchen is at the hearth." };
  const fromInv = countItem(player.inventory, "wheat");
  if (fromInv < 1 && player.basket.grain < 1) return { player, ok: false, message: "Need wheat for a loaf." };
  let inventory = player.inventory;
  let basket = { ...player.basket };
  if (fromInv >= 1) {
    inventory = removeItem(inventory, "wheat", 1) ?? inventory;
  } else {
    basket = { ...basket, grain: basket.grain - 1 };
  }
  basket = { ...basket, loaf: basket.loaf + 1 };
  const cookSkill = player.cookSkill + 1;
  return {
    player: withMirrors(
      log({ ...player, inventory, basket, cookSkill }, `You bake a loaf.`, now),
    ),
    ok: true,
    message: "Baked a loaf.",
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
  if (!shouldTimerRespawn(player.wildernessWipedAt, now, RESPAWN_MS)) {
    return { player, ok: false, message: "The woods still hold their dead." };
  }
  const next = log(respawnWilderness(player), "The pack answers again from the trees.", now);
  return { player: next, ok: true, message: "The pack returns." };
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

function withEncounters(player: PlayerState, encounters: EncounterSave[]): PlayerState {
  return {
    ...player,
    encounters,
    wolf: mirrorWolf(encounters),
    wildernessWipedAt: allEncountersDown(encounters) ? (player.wildernessWipedAt ?? Date.now()) : null,
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
    i === index ? { ...item, alive: false, hp: 0, lootDropped: true } : item,
  );
  const name = enemyDefinition(kind).name;
  const next = withEncounters(
    {
      ...player,
      wolves: player.wolves + (target.alive ? 1 : 0),
    },
    nextEncounters,
  );
  return {
    player: log(next, `${name} falls. Something in the grass.`, now),
    ok: true,
    message: `${name} falls.`,
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
  const xp = enemyDefinition(target.kind).xp;
  const gained = grantXp(player.skills, "combat", xp);
  const nextEncounters = encounters.map((item, i) => (i === index ? { ...item, lootDropped: false, lootTaken: true } : item));
  const label = drop.itemId === "dire_hide" ? "Dire Hide" : "Wolf Pelt";
  const next = withMirrors(
    log(
      withEncounters({ ...player, inventory: nextInv, skills: gained.skills }, nextEncounters),
      `${label} acquired. +${xp} Combat XP${gained.leveled ? `. Combat ${gained.skills.combat.level}.` : "."}`,
      now,
    ),
  );
  return { player: next, ok: true, message: `${label} acquired.` };
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

export function hydratePlayer(raw: PlayerState): PlayerState {
  const inventory = raw.inventory?.length
    ? raw.inventory
    : addItem(
        addItem(emptyInventory(), "wheat_seed", Math.max(0, raw.seeds?.grain ?? 0)) ?? [],
        "wheat",
        Math.max(0, raw.basket?.grain ?? 0),
      ) ?? [];
  const plots =
    raw.plots?.length >= 3
      ? raw.plots.slice(0, 3).map((plot, id) => ({ id, crop: plot.crop, plantedAt: plot.plantedAt }))
      : Array.from({ length: 3 }, (_, id) => ({ id, crop: null, plantedAt: null }));
  const skills = raw.skills ?? emptySkills();
  const hasSword = Boolean(raw.hasSword) || countItem(inventory, "iron_blade") > 0;
  const hasArmor = Boolean(raw.hasArmor) || countItem(inventory, "hide_armor") > 0;
  const encounters = ensureEncounters(raw.encounters, raw.wolf);
  return withMirrors({
    ...raw,
    health: raw.health ?? PLAYER_MAX_HP,
    maxHealth: raw.maxHealth ?? PLAYER_MAX_HP,
    hasSword,
    hasArmor,
    strikeDamage: playerStrikeDamage(hasSword),
    inventory,
    skills: {
      farming: skills.farming ?? { xp: 0, level: 1 },
      combat: skills.combat ?? { xp: raw.xp ?? 0, level: raw.level ?? 1 },
    },
    plots,
    position: raw.position ?? null,
    encounters,
    wolf: mirrorWolf(encounters),
    wildernessWipedAt: raw.wildernessWipedAt ?? null,
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
