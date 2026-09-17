import type { ItemId } from "./data/items";
import type { EncounterKind } from "./data/enemies";
import type { QuestSave } from "./data/quests";
import type { SkillId, SkillState } from "./game/skills";
import type { InventorySlot } from "./game/inventory";
import { CROP_IDS, CROP_META, GROW_MS, type CropId } from "./data/crops";
import { BREN_PRICES } from "./data/economy";

export { CROP_IDS, CROP_META, GROW_MS, BREN_PRICES };
export type { CropId };

export const GOODS_IDS = ["grain", "root", "herb", "fish", "loaf"] as const;
export type GoodsId = (typeof GOODS_IDS)[number];
export type ClassId = "fighter" | "spiritual";
export type Scene = "hearth" | "valley";

export type BrenDemandKind = "bread" | "grain";

export type BrenDemand = {
  kind: BrenDemandKind;
  qty: number;
  fulfilledAt: number | null;
};

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
  diedAt: number | null;
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
  brenDemand: BrenDemand;
  quest: QuestSave;
  livingBakery: boolean;
  whisper: string;
  log: LogEntry[];
  walletAddress: string;
  enteredAt: number;
};

export const GOODS_META: Record<GoodsId, { name: string; mark: string }> = {
  ...CROP_META,
  fish: { name: "Fish", mark: "F" },
  loaf: { name: "Bread", mark: "L" },
};

export type { ItemId, InventorySlot, SkillId, SkillState, EncounterKind, QuestSave };
