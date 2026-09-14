import { plotReady } from "./crops";
import { rollHarvestBonus } from "./rarity";
import type { ClassId, CropId, PlayerState } from "./types";
import { BREN_PRICES, CROP_IDS } from "./types";

export type Result = { player: PlayerState; ok: boolean; message: string };

const emptyCrops = (): Record<CropId, number> => ({ grain: 0, root: 0, herb: 0 });

export function sessionWallet(playerId: string): string {
  const hex = Array.from(playerId.replace(/-/g, ""))
    .map((ch) => ch.charCodeAt(0).toString(16).slice(-2))
    .join("")
    .padEnd(40, "a");
  return `0x${hex.slice(0, 40)}`;
}

function log(player: PlayerState, text: string, now: number): PlayerState {
  return { ...player, log: [{ at: now, text }, ...player.log].slice(0, 10) };
}

export function createPlayer(id: string, name: string, now = Date.now()): PlayerState {
  return {
    id,
    name: name.trim().slice(0, 24) || "Pilgrim",
    classId: null,
    scene: "hearth",
    coins: 0,
    farmSkill: 0,
    harvests: 0,
    wolves: 0,
    seeds: { grain: 4, root: 4, herb: 4 },
    basket: emptyCrops(),
    plots: Array.from({ length: 6 }, (_, id) => ({ id, crop: null, plantedAt: null })),
    whisper: "Old Bren: baker needs three loaves. Grain would help.",
    log: [{ at: now, text: "You stand at the hearth threshold. Choose how you will walk." }],
    walletAddress: sessionWallet(id),
    enteredAt: now,
  };
}

export function chooseClass(player: PlayerState, classId: ClassId, now = Date.now()): Result {
  if (player.classId) return { player, ok: false, message: "You already chose a path." };
  if (classId !== "fighter" && classId !== "spiritual") {
    return { player, ok: false, message: "Unknown path." };
  }
  const label = classId === "fighter" ? "Fighter" : "Spiritual";
  const extra =
    classId === "fighter"
      ? "The valley door will answer your strike."
      : "The garden and the quiet work will answer you.";
  return {
    player: log({ ...player, classId }, `${label}. ${extra}`, now),
    ok: true,
    message: `${label} path taken.`,
  };
}

export function plant(player: PlayerState, plotId: number, crop: CropId, now = Date.now()): Result {
  if (!player.classId) return { player, ok: false, message: "Choose a path first." };
  const plot = player.plots[plotId];
  if (!plot || plot.crop) return { player, ok: false, message: "That bed is not free." };
  if (player.seeds[crop] < 1) return { player, ok: false, message: `No ${crop} seed.` };
  const plots = player.plots.map((p) => (p.id === plotId ? { ...p, crop, plantedAt: now } : p));
  const seeds = { ...player.seeds, [crop]: player.seeds[crop] - 1 };
  return {
    player: log({ ...player, plots, seeds }, `Planted ${crop} in bed ${plotId + 1}.`, now),
    ok: true,
    message: `Planted ${crop}.`,
  };
}

export function harvest(player: PlayerState, plotId: number, now = Date.now()): Result {
  if (!player.classId) return { player, ok: false, message: "Choose a path first." };
  const plot = player.plots[plotId];
  if (!plot?.crop || plot.plantedAt == null) return { player, ok: false, message: "Nothing to harvest." };
  if (!plotReady(plot.plantedAt, plot.crop, player.farmSkill, now)) {
    return { player, ok: false, message: "Still growing." };
  }
  const crop = plot.crop;
  const bonus = rollHarvestBonus(player.farmSkill);
  const spiritualHerb = player.classId === "spiritual" && crop === "herb" ? 1 : 0;
  const amount = 1 + bonus + spiritualHerb;
  const plots = player.plots.map((p) => (p.id === plotId ? { ...p, crop: null, plantedAt: null } : p));
  const basket = { ...player.basket, [crop]: player.basket[crop] + amount };
  const seeds = { ...player.seeds, [crop]: player.seeds[crop] + 1 };
  const farmSkill = player.farmSkill + 1 + (player.classId === "spiritual" && crop === "herb" ? 1 : 0);
  return {
    player: log(
      { ...player, plots, basket, seeds, farmSkill, harvests: player.harvests + 1 },
      `Harvested ${amount} ${crop}. Farm ${farmSkill}.`,
      now,
    ),
    ok: true,
    message: `Harvested ${amount} ${crop}.`,
  };
}

export function sellToBren(player: PlayerState, crop: CropId, now = Date.now()): Result {
  if (!player.classId) return { player, ok: false, message: "Choose a path first." };
  if (player.basket[crop] < 1) return { player, ok: false, message: `No ${crop} in the basket.` };
  const extra = player.classId === "spiritual" && crop === "herb" ? 1 : 0;
  const price = BREN_PRICES[crop] + extra;
  const basket = { ...player.basket, [crop]: player.basket[crop] - 1 };
  const coins = player.coins + price;
  const whisper =
    crop === "grain"
      ? "Old Bren: that's for the baker. Still wants three loaves' worth."
      : "Old Bren weighs it and nods.";
  return {
    player: log(
      { ...player, basket, coins, whisper },
      `Sold ${crop} to Old Bren for ${price} coins.`,
      now,
    ),
    ok: true,
    message: `Old Bren pays ${price} coins.`,
  };
}

export function setScene(player: PlayerState, scene: PlayerState["scene"], now = Date.now()): Result {
  if (!player.classId) return { player, ok: false, message: "Choose a path first." };
  const text = scene === "valley" ? "You open the door to the valley." : "You return to the hearth.";
  return { player: log({ ...player, scene }, text, now), ok: true, message: text };
}

export function wolfLoot(player: PlayerState, now = Date.now()): Result {
  if (!player.classId) return { player, ok: false, message: "Choose a path first." };
  if (player.scene !== "valley") return { player, ok: false, message: "The wolf is through the door." };
  const extra = player.classId === "fighter" ? 2 : 0;
  const gain = 6 + extra;
  return {
    player: log(
      { ...player, coins: player.coins + gain, wolves: player.wolves + 1 },
      `Wolf falls. ${gain} coins.`,
      now,
    ),
    ok: true,
    message: `+${gain} coins.`,
  };
}

export function basketTotal(player: PlayerState): number {
  return CROP_IDS.reduce((sum, id) => sum + player.basket[id], 0);
}
