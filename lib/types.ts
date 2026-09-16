import type { ItemId } from "./data/items";
import type { EncounterKind } from "./data/enemies";
import type { SkillId, SkillState } from "./game/skills";
import type { InventorySlot } from "./game/inventory";

export const CROP_IDS = ["grain", "root", "herb"] as const;
export type CropId = (typeof CROP_IDS)[number];
export const GOODS_IDS = ["grain", "root", "herb", "fish", "loaf"] as const;
export type GoodsId = (typeof GOODS_IDS)[number];
export type ClassId = "fighter" | "spiritual";
export type Scene = "hearth" | "valley";

export type Plot = {
  id: number;
  crop: CropId | null;
  plantedAt: number | null;
};

export type LogEntry = { at: number; text: string };

export type WolfSave = {
  alive: boolean;
  hp: number;
  peltDropped: boolean;
  peltTaken: boolean;
};

export type EncounterSave = {
  id: string;
  kind: EncounterKind;
  alive: boolean;
  hp: number;
  lootDropped: boolean;
  lootTaken: boolean;
};

export type PlayerState = {
  id: string;
  name: string;
  classId: ClassId | null;
  scene: Scene;
  coins: number;
  health: number;
  maxHealth: number;
  farmSkill: number;
  fishSkill: number;
  cookSkill: number;
  harvests: number;
  wolves: number;
  xp: number;
  level: number;
  hasSword: boolean;
  hasArmor: boolean;
  strikeDamage: number;
  lastFishAt: number;
  seeds: Record<CropId, number>;
  basket: Record<GoodsId, number>;
  inventory: InventorySlot[];
  skills: Record<SkillId, SkillState>;
  plots: Plot[];
  position: { x: number; y: number } | null;
  wolf: WolfSave;
  encounters: EncounterSave[];
  wildernessWipedAt: number | null;
  whisper: string;
  log: LogEntry[];
  walletAddress: string;
  enteredAt: number;
};

/** Baker pays 2 gold per wheat. Three sheaves → +6 Gold. */
export const BREN_PRICES: Record<GoodsId, number> = {
  grain: 2,
  root: 2,
  herb: 3,
  fish: 3,
  loaf: 4,
};

export const GROW_MS: Record<CropId, number> = {
  grain: 45_000,
  root: 50_000,
  herb: 40_000,
};

export const CROP_META: Record<CropId, { name: string; mark: string }> = {
  grain: { name: "Wheat", mark: "W" },
  root: { name: "Root", mark: "R" },
  herb: { name: "Herb", mark: "H" },
};

export const GOODS_META: Record<GoodsId, { name: string; mark: string }> = {
  ...CROP_META,
  fish: { name: "Fish", mark: "F" },
  loaf: { name: "Loaf", mark: "L" },
};

export type { ItemId, InventorySlot, SkillId, SkillState, EncounterKind };
